import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

async function verifyPaystackSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex === signature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) {
      console.error("PAYSTACK_SECRET_KEY not configured");
      return new Response(JSON.stringify({ error: "Not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify webhook signature
    const signature = req.headers.get("x-paystack-signature");
    const body = await req.text();

    if (signature) {
      const isValid = await verifyPaystackSignature(
        body,
        signature,
        PAYSTACK_SECRET_KEY
      );
      if (!isValid) {
        console.error("Invalid webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const event = JSON.parse(body);
    console.log("Paystack webhook event:", event.event);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (event.event === "charge.success") {
      const data = event.data;
      const reference = data.reference;
      const metadata = data.metadata || {};

      // Find and update the payment
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .update({
          status: "completed",
          paid_at: new Date().toISOString(),
          provider_reference: data.id?.toString(),
          metadata: {
            ...metadata,
            paystack_response: {
              id: data.id,
              status: data.status,
              gateway_response: data.gateway_response,
              channel: data.channel,
              fees: data.fees,
            },
          },
        })
        .eq("payment_reference", reference)
        .select()
        .single();

      if (paymentError) {
        console.error("Failed to update payment:", paymentError);
        return new Response(
          JSON.stringify({ error: "Failed to update payment" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Get permit details from payment metadata
      const paymentMetadata = payment.metadata as Record<string, unknown>;
      const permitTypeId = paymentMetadata?.permit_type_id as string;
      const motorbike_id = paymentMetadata?.motorbike_id as string;
      const permitNumber = paymentMetadata?.permit_number as string;

      if (permitTypeId && motorbike_id && permitNumber) {
        // Get permit type for duration
        const { data: permitType } = await supabase
          .from("permit_types")
          .select("duration_days")
          .eq("id", permitTypeId)
          .single();

        const durationDays = permitType?.duration_days || 365;
        const issuedAt = new Date();
        const expiresAt = new Date(issuedAt);
        expiresAt.setDate(expiresAt.getDate() + durationDays);

        // Create the permit
        const { data: permit, error: permitError } = await supabase
          .from("permits")
          .insert({
            permit_number: permitNumber,
            rider_id: payment.rider_id,
            motorbike_id: motorbike_id,
            permit_type_id: permitTypeId,
            county_id: payment.county_id,
            status: "active",
            issued_at: issuedAt.toISOString(),
            expires_at: expiresAt.toISOString(),
            amount_paid: payment.amount,
          })
          .select()
          .single();

        if (permitError) {
          console.error("Failed to create permit:", permitError);
        } else {
          // Update payment with permit_id
          await supabase
            .from("payments")
            .update({ permit_id: permit.id })
            .eq("id", payment.id);

          // Update rider compliance status if they now have an active permit
          await supabase
            .from("riders")
            .update({ compliance_status: "compliant" })
            .eq("id", payment.rider_id);

          console.log("Permit created successfully:", permit.id);
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event.event === "charge.failed") {
      const data = event.data;
      const reference = data.reference;

      await supabase
        .from("payments")
        .update({
          status: "failed",
          metadata: {
            paystack_response: {
              id: data.id,
              status: data.status,
              gateway_response: data.gateway_response,
            },
          },
        })
        .eq("payment_reference", reference);

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Acknowledge other events
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

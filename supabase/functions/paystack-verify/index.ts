import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const reference = url.searchParams.get("reference");

    if (!reference) {
      return new Response(JSON.stringify({ error: "Reference is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "Payment service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      return new Response(
        JSON.stringify({
          success: false,
          error: paystackData.message || "Verification failed",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const transactionData = paystackData.data;

    // Get payment from database (user's RLS - they can only see their own)
    const { data: payment, error: paymentFetchError } = await supabase
      .from("payments")
      .select("*, permits(*)")
      .eq("payment_reference", reference)
      .single();

    if (paymentFetchError || !payment) {
      return new Response(
        JSON.stringify({ error: "Payment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If Paystack says success but our DB still has pending, sync (e.g. webhook missed)
    const isSuccess = transactionData.status === "success";
    let syncedPayment: typeof payment | null = null;
    if (isSuccess && payment.status !== "completed") {
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!serviceRoleKey) {
        console.error("SUPABASE_SERVICE_ROLE_KEY not set - cannot sync payment status");
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              status: transactionData.status,
              amount: transactionData.amount / 100,
              currency: transactionData.currency,
              reference: transactionData.reference,
              gateway_response: transactionData.gateway_response,
              paid_at: transactionData.paid_at,
              channel: transactionData.channel,
              payment: payment,
              synced: false,
              synced_error: "Server configuration error. Contact support.",
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const serviceSupabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        serviceRoleKey
      );
      const metadata = (payment.metadata || {}) as Record<string, unknown>;
      const updatePayload = {
        status: "completed",
        paid_at: new Date().toISOString(),
        provider_reference: transactionData.id?.toString(),
        metadata: {
          ...metadata,
          paystack_response: {
            id: transactionData.id,
            status: transactionData.status,
            gateway_response: transactionData.gateway_response,
            channel: transactionData.channel,
          },
        },
      };
      const { data: updatedPayment, error: updateErr } = await serviceSupabase
        .from("payments")
        .update(updatePayload)
        .eq("id", payment.id)
        .select()
        .single();

      if (updateErr) {
        console.error("Failed to sync payment status:", updateErr);
      } else if (updatedPayment) {
        syncedPayment = updatedPayment;
        const penaltyId = metadata.penalty_id as string | undefined;
        const permitTypeId = metadata.permit_type_id as string | undefined;
        const motorbike_id = metadata.motorbike_id as string | undefined;
        const permitNumber = metadata.permit_number as string | undefined;

        if (penaltyId) {
          await serviceSupabase.from("penalties").update({
            is_paid: true,
            payment_id: updatedPayment.id,
            paid_at: new Date().toISOString(),
          }).eq("id", penaltyId);
          const { data: unpaid } = await serviceSupabase.from("penalties").select("id").eq("rider_id", updatedPayment.rider_id).eq("is_paid", false);
          if (!unpaid?.length) {
            await serviceSupabase.from("riders").update({ compliance_status: "compliant" }).eq("id", updatedPayment.rider_id);
          }
        }
        if (permitTypeId && motorbike_id && permitNumber) {
          const { data: permitType } = await serviceSupabase.from("permit_types").select("duration_days").eq("id", permitTypeId).single();
          const durationDays = permitType?.duration_days || 365;
          const issuedAt = new Date();
          const expiresAt = new Date(issuedAt);
          expiresAt.setDate(expiresAt.getDate() + durationDays);
          const { data: permit, error: permitErr } = await serviceSupabase.from("permits").insert({
            permit_number: permitNumber,
            rider_id: updatedPayment.rider_id,
            motorbike_id,
            permit_type_id: permitTypeId,
            county_id: updatedPayment.county_id,
            status: "active",
            issued_at: issuedAt.toISOString(),
            expires_at: expiresAt.toISOString(),
            amount_paid: updatedPayment.amount,
          }).select().single();
          if (!permitErr && permit) {
            await serviceSupabase.from("payments").update({ permit_id: permit.id }).eq("id", updatedPayment.id);
            await serviceSupabase.from("riders").update({ compliance_status: "compliant" }).eq("id", updatedPayment.rider_id);
          }
        }
      }
    }

    const paymentToReturn = syncedPayment ?? payment;
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          status: transactionData.status,
          amount: transactionData.amount / 100,
          currency: transactionData.currency,
          reference: transactionData.reference,
          gateway_response: transactionData.gateway_response,
          paid_at: transactionData.paid_at,
          channel: transactionData.channel,
          payment: paymentToReturn,
          synced: !!syncedPayment,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error verifying payment:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

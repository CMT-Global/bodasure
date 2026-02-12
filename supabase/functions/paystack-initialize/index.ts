import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InitializeRequest {
  amount: number;
  email: string;
  phone?: string;
  /** Permit payment: required with motorbike_id */
  permit_type_id?: string;
  rider_id: string;
  motorbike_id?: string;
  county_id: string;
  /** Penalty payment: when set, this is a penalty payment */
  penalty_id?: string;
  metadata?: Record<string, unknown>;
  /** Frontend origin for redirect after payment (e.g. https://app.example.com or http://localhost:5173) */
  app_origin?: string;
  /** Optional return path after payment (e.g. /dashboard/payments). If not set, defaults to rider-owner paths. */
  return_path?: string;
}

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

    const body: InitializeRequest = await req.json();
    const {
      amount,
      email,
      phone,
      permit_type_id,
      rider_id,
      motorbike_id,
      county_id,
      penalty_id,
      metadata,
      app_origin,
      return_path: requestedReturnPath,
    } = body;

    const isPenaltyPayment = !!penalty_id;
    const isPermitPayment = !!permit_type_id && !!motorbike_id;

    if (!amount || !email || !rider_id || !county_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    if (!isPenaltyPayment && !isPermitPayment) {
      return new Response(
        JSON.stringify({ error: "Either penalty_id or (permit_type_id and motorbike_id) required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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

    // Generate unique reference
    const reference = `BDS-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const permitNumber = isPermitPayment
      ? `PRM-${county_id.substring(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
      : null;

    const paymentMetadata: Record<string, unknown> = {
      ...metadata,
      email,
      phone: phone || null,
    };
    if (isPenaltyPayment) {
      paymentMetadata.penalty_id = penalty_id;
      paymentMetadata.payment_type = "penalty";
    } else {
      paymentMetadata.permit_type_id = permit_type_id;
      paymentMetadata.motorbike_id = motorbike_id;
      paymentMetadata.permit_number = permitNumber;
    }

    // Create pending payment record
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        amount,
        county_id,
        rider_id,
        status: "pending",
        payment_reference: reference,
        provider: "paystack",
        payment_method: phone ? "mobile_money" : "card",
        description: isPenaltyPayment ? "Penalty payment" : "Permit payment for rider",
        metadata: paymentMetadata,
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Failed to create payment record:", paymentError);
      return new Response(
        JSON.stringify({ error: "Failed to create payment record" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const customFields: Array<{ display_name: string; variable_name: string; value: string }> = [
      { display_name: "Rider ID", variable_name: "rider_id", value: rider_id },
    ];
    if (permitNumber) {
      customFields.push({ display_name: "Permit Number", variable_name: "permit_number", value: permitNumber });
    }
    if (penalty_id) {
      customFields.push({ display_name: "Penalty ID", variable_name: "penalty_id", value: penalty_id });
    }

    // Return path so callback redirects user to the page where they started payment
    const returnPath = requestedReturnPath && requestedReturnPath.startsWith("/")
      ? requestedReturnPath
      : isPenaltyPayment
        ? "/rider-owner/penalties-payments"
        : "/rider-owner/permit-payments";
    const callbackUrl = new URL(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/paystack-callback`
    );
    callbackUrl.searchParams.set("reference", reference);
    callbackUrl.searchParams.set("return_path", returnPath);
    if (app_origin) {
      callbackUrl.searchParams.set("app_origin", app_origin.replace(/\/$/, ""));
    }

    // Initialize Paystack transaction
    const paystackPayload: Record<string, unknown> = {
      email,
      amount: Math.round(amount * 100), // Paystack expects amount in cents/kobo
      reference,
      currency: "KES",
      callback_url: callbackUrl.toString(),
      metadata: {
        payment_id: payment.id,
        rider_id,
        county_id,
        ...(isPenaltyPayment ? { penalty_id } : { permit_type_id, motorbike_id, permit_number: permitNumber }),
        custom_fields: customFields,
      },
    };

    // Add mobile money channel if phone provided
    if (phone) {
      paystackPayload.channels = ["mobile_money"];
      paystackPayload.mobile_money = {
        phone,
        provider: "mpesa",
      };
    }

    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paystackPayload),
      }
    );

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      // Update payment status to failed
      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("id", payment.id);

      const errMsg =
        paystackData.message ||
        (paystackData as { err?: { msg?: string } }).err?.msg ||
        "Paystack could not start the payment. Check your Paystack keys and callback URL.";
      return new Response(
        JSON.stringify({ error: errMsg }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update payment with provider reference
    await supabase
      .from("payments")
      .update({
        provider_reference: paystackData.data.access_code,
      })
      .eq("id", payment.id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          authorization_url: paystackData.data.authorization_url,
          access_code: paystackData.data.access_code,
          reference: paystackData.data.reference,
          payment_id: payment.id,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error initializing payment:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

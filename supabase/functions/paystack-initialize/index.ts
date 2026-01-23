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
  permit_type_id: string;
  rider_id: string;
  motorbike_id: string;
  county_id: string;
  metadata?: Record<string, unknown>;
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
      metadata,
    } = body;

    if (!amount || !email || !permit_type_id || !rider_id || !motorbike_id || !county_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
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

    // Generate permit number
    const permitNumber = `PRM-${county_id.substring(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

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
        description: `Permit payment for rider`,
        metadata: {
          ...metadata,
          permit_type_id,
          motorbike_id,
          permit_number: permitNumber,
          email,
          phone,
        },
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

    // Initialize Paystack transaction
    const paystackPayload: Record<string, unknown> = {
      email,
      amount: Math.round(amount * 100), // Paystack expects amount in cents/kobo
      reference,
      currency: "KES",
      callback_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/paystack-callback?reference=${reference}`,
      metadata: {
        payment_id: payment.id,
        permit_type_id,
        rider_id,
        motorbike_id,
        county_id,
        permit_number: permitNumber,
        custom_fields: [
          {
            display_name: "Rider ID",
            variable_name: "rider_id",
            value: rider_id,
          },
          {
            display_name: "Permit Number",
            variable_name: "permit_number",
            value: permitNumber,
          },
        ],
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

      return new Response(
        JSON.stringify({
          error: paystackData.message || "Failed to initialize payment",
        }),
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

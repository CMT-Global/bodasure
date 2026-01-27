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

interface RevenueShareRule {
  saccoId: string;
  saccoName: string;
  shareType: 'percentage' | 'fixed_per_rider' | 'none';
  percentage?: number;
  fixedAmount?: number;
  period?: 'weekly' | 'monthly' | 'annual';
  activePermitsOnly: boolean;
  complianceThreshold?: number;
  isActive: boolean;
}

async function calculateRevenueShare(supabase: any, payment: any) {
  try {
    // Get county settings for revenue sharing
    const { data: county, error: countyError } = await supabase
      .from("counties")
      .select("settings")
      .eq("id", payment.county_id)
      .single();

    if (countyError || !county) {
      console.log("No county settings found or error:", countyError);
      return;
    }

    const settings = county.settings || {};
    const revenueSharingSettings = settings.revenueSharingSettings || {};
    const rules: RevenueShareRule[] = revenueSharingSettings.rules || [];

    if (rules.length === 0) {
      console.log("No revenue sharing rules configured");
      return;
    }

    // Get rider information
    if (!payment.rider_id) {
      console.log("No rider_id in payment, skipping revenue share");
      return;
    }

    const { data: rider, error: riderError } = await supabase
      .from("riders")
      .select("id, sacco_id, compliance_status")
      .eq("id", payment.rider_id)
      .single();

    if (riderError || !rider || !rider.sacco_id) {
      console.log("No rider or sacco found:", riderError);
      return;
    }

    // Find matching rule for this sacco
    const rule = rules.find(
      (r) => r.saccoId === rider.sacco_id && r.isActive && r.shareType !== 'none'
    );

    if (!rule) {
      console.log("No active revenue sharing rule found for sacco:", rider.sacco_id);
      return;
    }

    // Check if rider has active permit (if required)
    let hasActivePermit = false;
    if (rule.activePermitsOnly) {
      const { data: activePermits } = await supabase
        .from("permits")
        .select("id")
        .eq("rider_id", rider.id)
        .eq("status", "active")
        .gte("expires_at", new Date().toISOString())
        .limit(1);

      hasActivePermit = (activePermits && activePermits.length > 0) || false;

      if (!hasActivePermit) {
        console.log("Rider does not have active permit, skipping revenue share");
        return;
      }
    }

    // Check compliance threshold (if required)
    let complianceThresholdMet = true;
    if (rule.complianceThreshold) {
      // Get all riders in the sacco
      const { data: saccoRiders } = await supabase
        .from("riders")
        .select("id, compliance_status")
        .eq("sacco_id", rider.sacco_id)
        .eq("county_id", payment.county_id);

      if (saccoRiders && saccoRiders.length > 0) {
        const compliantCount = saccoRiders.filter(
          (r: any) => r.compliance_status === 'compliant'
        ).length;
        const complianceRate = (compliantCount / saccoRiders.length) * 100;
        complianceThresholdMet = complianceRate >= rule.complianceThreshold;

        if (!complianceThresholdMet) {
          console.log(
            `Sacco compliance rate ${complianceRate.toFixed(2)}% below threshold ${rule.complianceThreshold}%, skipping revenue share`
          );
          return;
        }
      }
    }

    // Calculate share amount
    let shareAmount = 0;
    let calculatedPercentage: number | null = null;
    let calculatedFixedAmount: number | null = null;

    if (rule.shareType === 'percentage' && rule.percentage) {
      shareAmount = (payment.amount * rule.percentage) / 100;
      calculatedPercentage = rule.percentage;
    } else if (rule.shareType === 'fixed_per_rider' && rule.fixedAmount) {
      // For fixed amount, we need to check the period
      // If period is set, we might need to prorate, but for now, we'll use the fixed amount
      // This could be enhanced to handle period-based calculations
      shareAmount = rule.fixedAmount;
      calculatedFixedAmount = rule.fixedAmount;
    } else {
      console.log("Invalid share type or missing configuration");
      return;
    }

    // Round to 2 decimal places
    shareAmount = Math.round(shareAmount * 100) / 100;

    if (shareAmount <= 0) {
      console.log("Calculated share amount is 0 or negative, skipping");
      return;
    }

    // Get permit_id if available
    let permitId = payment.permit_id || null;

    // Insert revenue share record
    const { data: revenueShare, error: shareError } = await supabase
      .from("revenue_shares")
      .insert({
        county_id: payment.county_id,
        sacco_id: rider.sacco_id,
        payment_id: payment.id,
        rider_id: payment.rider_id,
        permit_id: permitId,
        share_type: rule.shareType,
        base_amount: payment.amount,
        share_amount: shareAmount,
        percentage: calculatedPercentage,
        fixed_amount: calculatedFixedAmount,
        period: rule.period || null,
        rule_config: rule,
        compliance_threshold_met: complianceThresholdMet,
        active_permit_required: rule.activePermitsOnly,
        had_active_permit: hasActivePermit,
        status: 'pending',
      })
      .select()
      .single();

    if (shareError) {
      console.error("Failed to create revenue share:", shareError);
    } else {
      console.log("Revenue share calculated and recorded:", revenueShare.id, "Amount:", shareAmount);
    }
  } catch (error) {
    console.error("Error calculating revenue share:", error);
    // Don't throw - we don't want to fail the payment processing if revenue share calculation fails
  }
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

      // Calculate and record revenue sharing
      await calculateRevenueShare(supabase, payment);

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

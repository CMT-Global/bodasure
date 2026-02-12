import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import axios from "https://esm.sh/axios";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OTP_EXPIRY_MINUTES = 5;
const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;
const LOCKOUT_MINUTES_AFTER_3_ATTEMPTS = 10;

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return "+254" + digits.slice(1);
  if (!digits.startsWith("254")) return "+254" + digits;
  return "+" + digits;
}

function generateOtp(): string {
  let otp = "";
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += Math.floor(Math.random() * 10).toString();
  }
  return otp;
}

async function hashOtp(otp: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(otp + salt);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const phoneRaw = (body.phone ?? "").toString().trim();
    if (!phoneRaw) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const phone = normalizePhone(phoneRaw);
    if (phone.length < 12) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("SMSLEOPARD_API_KEY");
    const apiSecret = Deno.env.get("SMSLEOPARD_API_SECRET_KEY");

    if (!apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({ error: "SMS service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Clean up expired lockouts
    await supabase.from("phone_otp_lockouts").delete().lt("locked_until", new Date().toISOString());

    // 10-minute lockout after 3 failed OTP attempts
    const { data: lockoutRows } = await supabase
      .from("phone_otp_lockouts")
      .select("locked_until")
      .eq("phone", phone)
      .gt("locked_until", new Date().toISOString())
      .limit(1);
    if (lockoutRows?.length) {
      const lockedUntil = new Date(lockoutRows[0].locked_until).getTime();
      const waitMins = Math.ceil((lockedUntil - Date.now()) / 60000);
      return new Response(
        JSON.stringify({
          error: `Too many failed attempts. You can try again after 10 minutes.`,
          retryAfterMinutes: Math.min(waitMins, LOCKOUT_MINUTES_AFTER_3_ATTEMPTS),
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resend cooldown: do not send again for this phone within 1 minute
    const cooldownSince = new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000).toISOString();
    const { data: recentRows } = await supabase
      .from("phone_otps")
      .select("id, created_at")
      .eq("phone", phone)
      .gte("created_at", cooldownSince)
      .order("created_at", { ascending: false })
      .limit(1);
    if (recentRows?.length) {
      return new Response(
        JSON.stringify({
          error: "Please wait 1 minute before requesting a new code.",
          retryAfterSeconds: RESEND_COOLDOWN_SECONDS,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean up expired OTPs (after 5 min they are invalid; remove from DB)
    await supabase.from("phone_otps").delete().lt("expires_at", new Date().toISOString());

    const salt = Deno.env.get("OTP_SALT") || "bodasure-otp-salt";
    const otp = generateOtp();
    const otpHash = await hashOtp(otp, salt);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from("phone_otps").insert({
      phone,
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempts: 0,
    });

    if (insertError) {
      console.error("Failed to store OTP:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to send OTP" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  

    // Sender ID must be one assigned to your SMS Leopard account (set SMSLEOPARD_SENDER_ID in Edge Function secrets)
    const senderId = Deno.env.get("SMSLEOPARD_SENDER_ID");
    if (!senderId?.trim()) {
      return new Response(
        JSON.stringify({
          error:
            "SMS sender ID not configured. Set SMSLEOPARD_SENDER_ID in Edge Function secrets to a sender ID from your SMS Leopard dashboard.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const message = `Your OTP code is ${otp}. Do not share this code with anyone.`;
    const auth = btoa(`${apiKey}:${apiSecret}`);
    const url = "https://api.smsleopard.com/v1/sms/send";
    const payload = {
      source: senderId,
      message,
      destination: [{ number: phone }],
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
      });
      const smsData = response?.data ?? {};
      if (smsData.success === false) {
        const msg = smsData.message || "Failed to send SMS";
        const userMessage = /sender\s*id/i.test(msg)
          ? `Sender ID issue: ${msg}. Set SMSLEOPARD_SENDER_ID in Edge Function secrets to the exact sender ID from your SMS Leopard dashboard (same as in the chatbot).`
          : msg;
        return new Response(
          JSON.stringify({ error: userMessage }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ success: true, message: "OTP sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (err: unknown) {
      const status = axios.isAxiosError(err) ? err.response?.status : 0;
      const resData = axios.isAxiosError(err) ? err.response?.data : undefined;
      const providerMsg =
        (typeof resData === "object" && resData !== null && "message" in resData
          ? (resData as { message?: string }).message
          : null) ||
        (axios.isAxiosError(err) && typeof err.response?.data === "string" ? err.response.data : null) ||
        (err instanceof Error ? err.message : "Unknown error");
      const resText =
        typeof resData === "object" ? JSON.stringify(resData) : String(resData ?? "");
      console.error("SMS Leopard error: status=", status, "senderId=", senderId, "body=", resText);

      const isSenderIdError = status === 404 || (resData && typeof resData === "object" && "message" in resData && /sender\s*id/i.test((resData as { message?: string }).message ?? ""));
      const userMessage =
        status === 401
          ? "Invalid SMS API credentials. Check SMSLEOPARD_API_KEY and SMSLEOPARD_API_SECRET_KEY in Edge Function secrets."
          : status === 402
            ? "SMS account has insufficient balance. Top up at SMS Leopard."
            : isSenderIdError
              ? `Sender ID issue: ${providerMsg} Set SMSLEOPARD_SENDER_ID in Edge Function secrets to the exact sender ID that works in the SMS Leopard chatbot (copy-paste, same spelling and casing).`
              : `Failed to send SMS: ${providerMsg}`;

      return new Response(
        JSON.stringify({ error: userMessage }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (e) {
    console.error("request-otp error:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

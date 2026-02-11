import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PHONE_EMAIL_SUFFIX = "@bodasure.local";
const PHONE_EMAIL_PREFIX = "phone+";
const LOCKOUT_MINUTES_AFTER_3_ATTEMPTS = 10;

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return "+254" + digits.slice(1);
  if (!digits.startsWith("254")) return "+254" + digits;
  return "+" + digits;
}

async function hashOtp(otp: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(otp + salt);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomPassword(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const phoneRaw = (body.phone ?? "").toString().trim();
    const otp = (body.otp ?? "").toString().trim();
    const fullName = (body.full_name ?? "").toString().trim();

    if (!phoneRaw || !otp) {
      return new Response(
        JSON.stringify({ error: "Phone and OTP are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const phone = normalizePhone(phoneRaw);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const salt = Deno.env.get("OTP_SALT") || "bodasure-otp-salt";

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: rows, error: fetchError } = await supabase
      .from("phone_otps")
      .select("id, otp_hash, attempts, expires_at")
      .eq("phone", phone)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError || !rows?.length) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired OTP. Request a new code." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const row = rows[0];
    const maxAttempts = 3;
    if (row.attempts >= maxAttempts) {
      await supabase.from("phone_otps").delete().eq("id", row.id);
      const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES_AFTER_3_ATTEMPTS * 60 * 1000).toISOString();
      await supabase.from("phone_otp_lockouts").upsert({ phone, locked_until: lockedUntil }, { onConflict: "phone" });
      return new Response(
        JSON.stringify({ error: "Maximum 3 attempts exceeded. You can try again after 10 minutes." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const otpHash = await hashOtp(otp, salt);
    if (row.otp_hash !== otpHash) {
      const newAttempts = row.attempts + 1;
      if (newAttempts >= maxAttempts) {
        await supabase.from("phone_otps").delete().eq("id", row.id);
        const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES_AFTER_3_ATTEMPTS * 60 * 1000).toISOString();
        await supabase.from("phone_otp_lockouts").upsert({ phone, locked_until: lockedUntil }, { onConflict: "phone" });
        return new Response(
          JSON.stringify({ error: "Invalid OTP. Maximum 3 attempts exceeded. You can try again after 10 minutes." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      await supabase.from("phone_otps").update({ attempts: newAttempts }).eq("id", row.id);
      return new Response(
        JSON.stringify({ error: `Invalid OTP. ${maxAttempts - newAttempts} attempt(s) left.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verified: delete OTP so it cannot be reused
    await supabase.from("phone_otps").delete().eq("id", row.id);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .limit(1);

    let userId: string;
    let userEmail: string;

    const phoneEmail = PHONE_EMAIL_PREFIX + phone.replace(/\D/g, "") + PHONE_EMAIL_SUFFIX;

    if (profiles?.length) {
      userId = profiles[0].id;
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      userEmail = authUser?.user?.email ?? phoneEmail;
    } else {
      userEmail = phoneEmail;
      const password = randomPassword();
      const displayName = fullName || phone;
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: userEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: displayName, phone },
      });

      if (createError) {
        if (createError.message?.includes("already been registered")) {
          const { data: existing } = await supabase.from("profiles").select("id").eq("email", userEmail).limit(1);
          if (existing?.length) {
            userId = existing[0].id;
            await supabase.from("profiles").update({ phone }).eq("id", userId);
          } else {
            return new Response(
              JSON.stringify({ error: "Account exists but could not sign in. Try email login." }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          console.error("Create user error:", createError);
          return new Response(
            JSON.stringify({ error: "Could not create account" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        userId = createData!.user.id;
        await supabase.from("profiles").update({ phone, full_name: displayName }).eq("id", userId);
      }
    }

    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || Deno.env.get("APP_URL") || "http://localhost:5173";
    const redirectTo = origin.startsWith("http") ? origin : `https://${origin}`;

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: userEmail,
      options: { redirectTo },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("Generate link error:", linkError);
      return new Response(
        JSON.stringify({ error: "Could not complete sign in" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ redirectUrl: linkData.properties.action_link }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("verify-otp error:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

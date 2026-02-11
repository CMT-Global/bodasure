const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const reference =
    url.searchParams.get("reference") || url.searchParams.get("trxref");
  const returnPath = url.searchParams.get("return_path") || "";
  const appOriginParam = url.searchParams.get("app_origin")?.replace(/\/$/, "");

  // Prefer app_origin from callback URL (set by frontend when starting payment) so redirect works
  // even when APP_URL is not set. After payment, Paystack redirects here so referer is paystack.com.
  const appUrl = Deno.env.get("APP_URL")?.replace(/\/$/, "");
  const referer = req.headers.get("referer")?.replace(/\/$/, "");
  const origin = req.headers.get("origin")?.replace(/\/$/, "");
  const fromPaystack =
    referer?.includes("paystack.com") || origin?.includes("paystack.com");
  const baseUrlRaw =
    appOriginParam ||
    (fromPaystack ? (appUrl || "http://localhost:8080") : (appUrl || referer || origin || "http://localhost:8080"));
  const baseUrlNormalized = baseUrlRaw.startsWith("http")
    ? baseUrlRaw
    : `https://${baseUrlRaw}`;
  const path = returnPath.startsWith("/") ? returnPath : `/${returnPath}`;
  const redirectUrl = reference
    ? `${baseUrlNormalized.replace(/\/$/, "")}${path}?payment_reference=${encodeURIComponent(reference)}`
    : `${baseUrlNormalized.replace(/\/$/, "")}${path}`;

  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      Location: redirectUrl,
    },
  });
});

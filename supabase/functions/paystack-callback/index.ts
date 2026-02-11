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

  // After payment, Paystack redirects the browser here, so Referer is checkout.paystack.com.
  // We must redirect to YOUR app, not back to Paystack. So when request is from Paystack, use APP_URL only.
  const appUrl = Deno.env.get("APP_URL")?.replace(/\/$/, "");
  const referer = req.headers.get("referer")?.replace(/\/$/, "");
  const origin = req.headers.get("origin")?.replace(/\/$/, "");
  const fromPaystack =
    referer?.includes("paystack.com") || origin?.includes("paystack.com");
  const baseUrlRaw =
    fromPaystack
      ? (appUrl || "http://localhost:5173")
      : (appUrl || referer || origin || "http://localhost:5173");
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

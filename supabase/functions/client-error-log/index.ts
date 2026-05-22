// Lightweight client-error sink. Receives chunk-load + unhandled errors from
// the browser and prints structured JSON to Edge Function logs so we can
// inspect them via the standard log viewer / supabase--edge_function_logs.
// verify_jwt = false (configured in supabase/config.toml) so anonymous
// visitors can report errors before they sign in.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_STR = 2000;
const clip = (v: unknown) => {
  const s = typeof v === "string" ? v : JSON.stringify(v ?? null);
  return s && s.length > MAX_STR ? s.slice(0, MAX_STR) + "…" : s;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const ua = req.headers.get("user-agent") ?? "unknown";
    const payload = {
      kind: "client-error",
      ts: new Date().toISOString(),
      ip,
      ua,
      type: clip(body?.type),
      message: clip(body?.message),
      stack: clip(body?.stack),
      url: clip(body?.url),
      buildVersion: clip(body?.buildVersion),
      indexHtmlHash: clip(body?.indexHtmlHash),
      failedAsset: clip(body?.failedAsset),
      route: clip(body?.route),
      extra: body?.extra ? clip(body.extra) : undefined,
    };
    // Structured single-line JSON — easy to grep in edge function logs.
    console.log(JSON.stringify(payload));
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("client-error-log failed:", e);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
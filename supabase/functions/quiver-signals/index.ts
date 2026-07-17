// Quiver Quantitative alt-data proxy. Reads optional QUIVER_API_KEY.
// When not configured, returns {configured: false} so the UI can render an
// "add API key" prompt without breaking the page.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const key = Deno.env.get("QUIVER_API_KEY");
  if (!key) {
    return new Response(JSON.stringify({ configured: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const kind = url.searchParams.get("kind") || "congress"; // congress | wsb
    const path =
      kind === "wsb"
        ? "https://api.quiverquant.com/beta/live/wallstreetbets"
        : "https://api.quiverquant.com/beta/live/congresstrading";

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(path, {
      headers: { Authorization: `Token ${key}`, Accept: "application/json" },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) {
      return new Response(JSON.stringify({ configured: true, error: `quiver ${r.status}` }), {
        status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const j = await r.json();
    // Reduce payload
    const items = Array.isArray(j) ? j.slice(0, 20) : (j.rows ?? []).slice(0, 20);
    return new Response(JSON.stringify({ configured: true, kind, items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ configured: true, error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
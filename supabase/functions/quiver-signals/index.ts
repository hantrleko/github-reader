// Quiver Quantitative alt-data proxy. Reads optional QUIVER_API_KEY.
// When not configured, returns {configured: false} so the UI can render an
// "add API key" prompt without breaking the page.
import { corsHeadersFor, getClientIp, checkRateLimit, rateLimitResponse, getCached, setCached } from "../_shared/security.ts";

async function handler(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
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

const CACHE_TTL_SEC = 60;

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`rl:quiver-signals:${ip}`, 60, 60);
  if (!rl.allowed) return rateLimitResponse(corsHeaders, rl.retryAfter);

  const cacheKey = `cache:quiver-signals:${new URL(req.url).searchParams.toString()}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    return new Response(cached, {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
    });
  }

  const resp = await handler(req, corsHeaders);
  if (resp.ok) {
    const body = await resp.clone().text();
    setCached(cacheKey, body, CACHE_TTL_SEC).catch(() => {});
  }
  return resp;
});

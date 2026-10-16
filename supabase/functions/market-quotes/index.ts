// Yahoo Finance v8 chart proxy — fetches historical daily prices for a symbol.
// Public endpoint, no API key required. Returns {symbol, currency, dates[], closes[], returns[]}.
import { corsHeadersFor, getClientIp, checkRateLimit, rateLimitResponse, getCached, setCached } from "../_shared/security.ts";

async function handler(req: Request, corsHeaders: Record<string, string>): Promise<Response> {

  try {
    const url = new URL(req.url);
    const symbol = (url.searchParams.get("symbol") || "AAPL").toUpperCase();
    const range = url.searchParams.get("range") || "5y"; // 1mo,3mo,6mo,1y,2y,5y,10y,max
    const interval = url.searchParams.get("interval") || "1d";

    if (!/^[A-Z0-9.\-^=]{1,15}$/.test(symbol)) {
      return new Response(JSON.stringify({ error: "invalid symbol" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const resp = await fetch(yahooUrl, {
      headers: { "User-Agent": "Mozilla/5.0 LovableLab/1.2" },
      signal: ctrl.signal,
    });
    clearTimeout(t);

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `yahoo ${resp.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const j = await resp.json();
    const result = j?.chart?.result?.[0];
    if (!result) {
      return new Response(JSON.stringify({ error: "no data" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ts: number[] = result.timestamp || [];
    const closesRaw: (number | null)[] = result.indicators?.quote?.[0]?.close || [];
    const dates: string[] = [];
    const closes: number[] = [];
    for (let i = 0; i < ts.length; i++) {
      const c = closesRaw[i];
      if (c == null || !isFinite(c)) continue;
      dates.push(new Date(ts[i] * 1000).toISOString().slice(0, 10));
      closes.push(c);
    }
    const returns: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push(Math.log(closes[i] / closes[i - 1]));
    }

    // Annualised vol from daily log returns
    const mean = returns.reduce((a, b) => a + b, 0) / Math.max(returns.length, 1);
    const variance =
      returns.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(returns.length - 1, 1);
    const annualVol = Math.sqrt(variance * 252);
    const annualReturn = mean * 252;

    return new Response(
      JSON.stringify({
        symbol,
        currency: result.meta?.currency || "USD",
        lastPrice: closes[closes.length - 1] ?? null,
        annualVol,
        annualReturn,
        n: closes.length,
        dates,
        closes,
        returns,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

const CACHE_TTL_SEC = 60;

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`rl:market-quotes:${ip}`, 60, 60);
  if (!rl.allowed) return rateLimitResponse(corsHeaders, rl.retryAfter);

  const cacheKey = `cache:market-quotes:${new URL(req.url).searchParams.toString()}`;
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

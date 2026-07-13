// Yahoo Finance v8 chart proxy with server-side Supabase cache.
// Cache TTL: 20 minutes. Shared across all users — the first request for a
// symbol+range populates the cache; subsequent requests within the TTL window
// return the cached payload without hitting Yahoo Finance.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes

async function readCache(symbol: string, range: string): Promise<unknown | null> {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/market_quotes_cache?symbol=eq.${encodeURIComponent(symbol)}&range=eq.${encodeURIComponent(range)}&select=payload,cached_at`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    if (!resp.ok) return null;
    const rows: { payload: unknown; cached_at: string }[] = await resp.json();
    if (!rows?.length) return null;
    if (Date.now() - new Date(rows[0].cached_at).getTime() > CACHE_TTL_MS) return null;
    return rows[0].payload;
  } catch {
    return null;
  }
}

async function writeCache(symbol: string, range: string, payload: unknown): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/market_quotes_cache`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({ symbol, range, payload, cached_at: new Date().toISOString() }),
    });
  } catch {
    // Cache write failure is non-fatal; the response is still returned to the client.
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const symbol = (url.searchParams.get("symbol") || "AAPL").toUpperCase();
    const range = url.searchParams.get("range") || "5y";
    const interval = url.searchParams.get("interval") || "1d";

    if (!/^[A-Z0-9.\-^=]{1,15}$/.test(symbol)) {
      return new Response(JSON.stringify({ error: "invalid symbol" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache lookup (skip for intraday intervals)
    if (interval === "1d") {
      const cached = await readCache(symbol, range);
      if (cached) {
        return new Response(JSON.stringify(cached), {
          headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
        });
      }
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

    const mean = returns.reduce((a, b) => a + b, 0) / Math.max(returns.length, 1);
    const variance =
      returns.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(returns.length - 1, 1);
    const annualVol = Math.sqrt(variance * 252);
    const annualReturn = mean * 252;

    const payload = {
      symbol,
      currency: result.meta?.currency || "USD",
      lastPrice: closes[closes.length - 1] ?? null,
      annualVol,
      annualReturn,
      n: closes.length,
      dates,
      closes,
      returns,
    };

    // Fire-and-forget cache write for daily data
    if (interval === "1d") {
      writeCache(symbol, range, payload);
    }

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "MISS" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

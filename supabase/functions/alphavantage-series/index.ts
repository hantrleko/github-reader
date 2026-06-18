// Alpha Vantage proxy — equities (TIME_SERIES_DAILY) and FX (FX_DAILY).
// Requires ALPHAVANTAGE_API_KEY. Free tier: 5 req/min, 25 req/day.
// Returns daily close history + annualised vol/return derived from log returns.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const key = Deno.env.get("ALPHAVANTAGE_API_KEY");
    if (!key) return json({ error: "missing ALPHAVANTAGE_API_KEY" }, 500);

    const url = new URL(req.url);
    const kind = (url.searchParams.get("kind") || "equity").trim().toLowerCase();
    const output = url.searchParams.get("output") === "full" ? "full" : "compact";

    let target = "";
    let seriesKey = "";

    if (kind === "equity") {
      const symbol = (url.searchParams.get("symbol") || "AAPL").trim().toUpperCase();
      if (!/^[A-Z0-9.\-]{1,12}$/.test(symbol)) return json({ error: "invalid symbol" }, 400);
      target = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(
        symbol
      )}&outputsize=${output}&apikey=${key}`;
      seriesKey = "Time Series (Daily)";
    } else if (kind === "fx") {
      const from = (url.searchParams.get("from") || "EUR").trim().toUpperCase();
      const to = (url.searchParams.get("to") || "USD").trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to))
        return json({ error: "invalid currency code" }, 400);
      target = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${from}&to_symbol=${to}&outputsize=${output}&apikey=${key}`;
      seriesKey = "Time Series FX (Daily)";
    } else {
      return json({ error: "invalid kind (equity|fx)" }, 400);
    }

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const resp = await fetch(target, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": "LovableLab/1.0" },
    });
    clearTimeout(t);

    if (!resp.ok) return json({ error: `alphavantage upstream ${resp.status}` }, 502);

    const body = await resp.json();

    // Rate-limit / informational responses come back as 200 with these keys.
    if (body?.Note || body?.Information) {
      return json(
        { error: "rate_limited", message: body.Note || body.Information },
        429
      );
    }
    if (body?.["Error Message"]) {
      return json({ error: "invalid_request", message: body["Error Message"] }, 400);
    }

    const raw = body?.[seriesKey] as Record<string, Record<string, string>> | undefined;
    if (!raw || !Object.keys(raw).length) return json({ error: "no data" }, 502);

    // Alpha Vantage returns newest-first; sort ascending by date.
    const sorted = Object.entries(raw).sort(([a], [b]) => (a < b ? -1 : 1));
    const dates: string[] = [];
    const closes: number[] = [];
    for (const [date, ohlc] of sorted) {
      const c = parseFloat(ohlc["4. close"]);
      if (!isFinite(c)) continue;
      dates.push(date);
      closes.push(c);
    }
    if (!closes.length) return json({ error: "no data" }, 502);

    // Annualised vol & return from daily log returns (252 trading days).
    const returns: number[] = [];
    for (let i = 1; i < closes.length; i++) returns.push(Math.log(closes[i] / closes[i - 1]));
    const mean = returns.reduce((a, b) => a + b, 0) / Math.max(returns.length, 1);
    const variance =
      returns.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(returns.length - 1, 1);
    const annualVol = Math.sqrt(variance * 252);
    const annualReturn = mean * 252;

    return json({
      kind,
      symbol:
        kind === "fx"
          ? `${url.searchParams.get("from")?.toUpperCase()}/${url.searchParams.get("to")?.toUpperCase()}`
          : url.searchParams.get("symbol")?.toUpperCase(),
      n: closes.length,
      lastPrice: closes[closes.length - 1] ?? null,
      latestDate: dates[dates.length - 1] ?? null,
      annualVol,
      annualReturn,
      dates,
      closes,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
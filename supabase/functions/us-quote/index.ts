import { corsHeadersFor, getClientIp, checkRateLimit, rateLimitResponse, getCached, setCached } from "../_shared/security.ts";
// V5.2 · US/HK quote + K-line + locally computed technical indicators.
// Source: Yahoo chart v8 (personal-research tier). No API key.
import {
  json, fail, fetchAny, yahooUrls,
  sma, ema, macd, rsi, bollinger, kdj, annualVol,
} from "../_shared/us.ts";

async function handler(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(req.url);
    const symbol = (url.searchParams.get("symbol") || "AAPL").trim().toUpperCase();
    const range = url.searchParams.get("range") || "1y";
    const interval = url.searchParams.get("interval") || "1d";

    const r = await fetchAny(
      yahooUrls(
        `/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`,
      ),
    );
    const j = await r.json();
    const res = j?.chart?.result?.[0];
    if (!res) throw new Error(j?.chart?.error?.description || `no data for ${symbol}`);

    const meta = res.meta || {};
    const ts: number[] = res.timestamp || [];
    const q = res.indicators?.quote?.[0] || {};
    const adj = res.indicators?.adjclose?.[0]?.adjclose;

    const dates: string[] = [];
    const opens: number[] = [];
    const highs: number[] = [];
    const lows: number[] = [];
    const closes: number[] = [];
    const volumes: number[] = [];
    for (let i = 0; i < ts.length; i++) {
      const c = (adj?.[i] ?? q.close?.[i]);
      if (c == null || !isFinite(c)) continue;
      dates.push(new Date(ts[i] * 1000).toISOString().slice(0, 10));
      opens.push(q.open?.[i] ?? c);
      highs.push(q.high?.[i] ?? c);
      lows.push(q.low?.[i] ?? c);
      closes.push(c);
      volumes.push(q.volume?.[i] ?? 0);
    }
    if (!closes.length) throw new Error(`empty series for ${symbol}`);

    const price = meta.regularMarketPrice ?? closes[closes.length - 1];
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? closes[closes.length - 2] ?? price;
    const m = macd(closes);
    const bb = bollinger(closes);
    const kd = kdj(highs, lows, closes);

    return json(corsHeaders, {
      symbol: meta.symbol || symbol,
      name: meta.longName || meta.shortName || meta.symbol || symbol,
      currency: meta.currency || "USD",
      exchange: meta.fullExchangeName || meta.exchangeName || null,
      price,
      prevClose,
      changeAmt: price - prevClose,
      changePct: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
      dayHigh: meta.regularMarketDayHigh ?? null,
      dayLow: meta.regularMarketDayLow ?? null,
      volume: meta.regularMarketVolume ?? volumes[volumes.length - 1] ?? null,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
      annualVol: annualVol(closes),
      n: closes.length,
      dates, opens, highs, lows, closes, volumes,
      indicators: {
        ma5: sma(closes, 5),
        ma20: sma(closes, 20),
        ma60: sma(closes, 60),
        ema12: ema(closes, 12),
        macd: m.dif, signal: m.dea, hist: m.hist,
        rsi14: rsi(closes, 14),
        bollUpper: bb.upper, bollMid: bb.mid, bollLower: bb.lower,
        kdjK: kd.k, kdjD: kd.d, kdjJ: kd.j,
      },
      source: "Yahoo Finance chart v8 · tier C (personal research)",
    });
  } catch (e) {
    return fail(corsHeaders, e);
  }
}

const CACHE_TTL_SEC = 60;

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`rl:us-quote:${ip}`, 60, 60);
  if (!rl.allowed) return rateLimitResponse(corsHeaders, rl.retryAfter);

  const cacheKey = `cache:us-quote:${new URL(req.url).searchParams.toString()}`;
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

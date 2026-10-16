// CoinGecko public API proxy — free, no API key required.
// Market chart: https://api.coingecko.com/api/v3/coins/{id}/market_chart?vs_currency=usd&days=N
// Returns daily price history + annualised vol/return derived from log returns.
import { corsHeadersFor, getClientIp, checkRateLimit, rateLimitResponse, getCached, setCached } from "../_shared/security.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function handler(req: Request, corsHeaders: Record<string, string>): Promise<Response> {

  try {
    const url = new URL(req.url);
    const id = (url.searchParams.get("id") || "bitcoin").trim().toLowerCase();
    const vs = (url.searchParams.get("vs") || "usd").trim().toLowerCase();
    const days = (url.searchParams.get("days") || "365").trim();

    if (!/^[a-z0-9\-]{1,40}$/.test(id)) return json({ error: "invalid id" }, 400);
    if (!/^[a-z]{2,6}$/.test(vs)) return json({ error: "invalid vs currency" }, 400);
    if (!/^(1|7|14|30|90|180|365|max)$/.test(days)) return json({ error: "invalid days" }, 400);

    const interval = days === "1" || days === "7" || days === "14" ? "" : "&interval=daily";
    const target = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
      id
    )}/market_chart?vs_currency=${encodeURIComponent(vs)}&days=${encodeURIComponent(days)}${interval}`;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const resp = await fetch(target, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": "LovableLab/1.0" },
    });
    clearTimeout(t);

    if (!resp.ok) return json({ error: `coingecko upstream ${resp.status}` }, 502);

    const body = await resp.json();
    const rawPrices: [number, number][] = body?.prices ?? [];
    const rawCaps: [number, number][] = body?.market_caps ?? [];
    const rawVols: [number, number][] = body?.total_volumes ?? [];
    if (!rawPrices.length) return json({ error: "no data" }, 502);

    const dates: string[] = [];
    const prices: number[] = [];
    for (const [ts, p] of rawPrices) {
      if (p == null || !isFinite(p)) continue;
      dates.push(new Date(ts).toISOString().slice(0, 10));
      prices.push(p);
    }

    // Annualised vol & return from daily log returns (crypto trades 365 days/yr).
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) returns.push(Math.log(prices[i] / prices[i - 1]));
    const mean = returns.reduce((a, b) => a + b, 0) / Math.max(returns.length, 1);
    const variance =
      returns.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(returns.length - 1, 1);
    const annualVol = Math.sqrt(variance * 365);
    const annualReturn = mean * 365;

    return json({
      id,
      vs,
      n: prices.length,
      lastPrice: prices[prices.length - 1] ?? null,
      latestDate: dates[dates.length - 1] ?? null,
      marketCap: rawCaps.length ? rawCaps[rawCaps.length - 1][1] : null,
      totalVolume: rawVols.length ? rawVols[rawVols.length - 1][1] : null,
      annualVol,
      annualReturn,
      dates,
      prices,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

const CACHE_TTL_SEC = 60;

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`rl:coingecko-series:${ip}`, 60, 60);
  if (!rl.allowed) return rateLimitResponse(corsHeaders, rl.retryAfter);

  const cacheKey = `cache:coingecko-series:${new URL(req.url).searchParams.toString()}`;
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

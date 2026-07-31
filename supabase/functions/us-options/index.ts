// V5.2 · US options chain (Yahoo, auto cookie+crumb) with locally computed
// Black-Scholes Greeks and unusual-flow / 0DTE flags. Tier C — personal research.
import { corsHeaders, json, fail, fetchAny, yahooUrls } from "../_shared/us.ts";

/* ── Black-Scholes Greeks (pure) ── */
const npdf = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
function ncdf(x: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = npdf(x);
  let p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  p = 1 - p;
  return x >= 0 ? p : 1 - p;
}
function greeks(S: number, K: number, T: number, r: number, sigma: number, call: boolean) {
  if (!(S > 0 && K > 0 && T > 0 && sigma > 0)) return { delta: null, gamma: null, vega: null, theta: null };
  const st = sigma * Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / st;
  const d2 = d1 - st;
  const delta = call ? ncdf(d1) : ncdf(d1) - 1;
  const gamma = npdf(d1) / (S * st);
  const vega = (S * npdf(d1) * Math.sqrt(T)) / 100;
  const theta =
    ((-S * npdf(d1) * sigma) / (2 * Math.sqrt(T)) -
      (call ? 1 : -1) * r * K * Math.exp(-r * T) * ncdf(call ? d2 : -d2)) / 365;
  return { delta, gamma, vega, theta };
}

/** Yahoo now gates several endpoints on a cookie + crumb pair. Fetch once. */
async function getCrumb(): Promise<{ cookie: string; crumb: string } | null> {
  try {
    const c = await fetch("https://fc.yahoo.com/", {
      headers: { "User-Agent": "Mozilla/5.0 EFLab/5.2" },
    });
    const cookie = c.headers.get("set-cookie")?.split(";")[0] || "";
    if (!cookie) return null;
    const r = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "User-Agent": "Mozilla/5.0 EFLab/5.2", Cookie: cookie },
    });
    const crumb = (await r.text()).trim();
    if (!crumb || crumb.length > 32) return null;
    return { cookie, crumb };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const symbol = (url.searchParams.get("symbol") || "AAPL").trim().toUpperCase();
    const date = url.searchParams.get("date"); // unix seconds of the expiry
    const rf = parseFloat(url.searchParams.get("r") || "0.042");

    const path = `/v7/finance/options/${encodeURIComponent(symbol)}${date ? `?date=${date}` : ""}`;
    let resp = await fetchAny(yahooUrls(path), {}, 1).catch(() => null);
    if (!resp || !resp.ok) {
      const cr = await getCrumb();
      if (cr) {
        const sep = path.includes("?") ? "&" : "?";
        resp = await fetchAny(yahooUrls(`${path}${sep}crumb=${encodeURIComponent(cr.crumb)}`), {
          headers: { Cookie: cr.cookie },
        });
      }
    }
    if (!resp || !resp.ok) throw new Error(`Yahoo options unavailable (HTTP ${resp?.status ?? "n/a"})`);

    const j = await resp.json();
    const res = j?.optionChain?.result?.[0];
    if (!res) throw new Error(j?.optionChain?.error?.description || `no option chain for ${symbol}`);

    const spot = res.quote?.regularMarketPrice ?? null;
    const expirations: number[] = res.expirationDates || [];
    const chain = res.options?.[0] || {};
    const expiry: number = chain.expirationDate ?? expirations[0] ?? 0;
    const now = Date.now() / 1000;
    const T = Math.max((expiry - now) / (365 * 24 * 3600), 1 / (365 * 24));
    const isZeroDte = expiry > 0 && (expiry - now) / 86400 <= 1;

    const mapLeg = (o: any, call: boolean) => {
      const iv = typeof o.impliedVolatility === "number" ? o.impliedVolatility : 0;
      const g = spot ? greeks(spot, o.strike, T, rf, iv, call) : { delta: null, gamma: null, vega: null, theta: null };
      const vol = o.volume ?? 0;
      const oi = o.openInterest ?? 0;
      return {
        type: call ? "call" : "put",
        strike: o.strike,
        last: o.lastPrice ?? null,
        bid: o.bid ?? null,
        ask: o.ask ?? null,
        iv,
        volume: vol,
        openInterest: oi,
        volOiRatio: oi > 0 ? vol / oi : null,
        unusual: oi > 0 && vol / oi > 1 && vol >= 200,
        inTheMoney: !!o.inTheMoney,
        ...g,
      };
    };

    const calls = (chain.calls || []).map((o: any) => mapLeg(o, true));
    const puts = (chain.puts || []).map((o: any) => mapLeg(o, false));
    const sum = (xs: any[], k: string) => xs.reduce((a, b) => a + (b[k] || 0), 0);
    const putCallVol = sum(calls, "volume") ? sum(puts, "volume") / sum(calls, "volume") : null;
    const putCallOi = sum(calls, "openInterest") ? sum(puts, "openInterest") / sum(calls, "openInterest") : null;

    return json({
      symbol,
      spot,
      expiry,
      expiryDate: expiry ? new Date(expiry * 1000).toISOString().slice(0, 10) : null,
      isZeroDte,
      T,
      r: rf,
      expirations,
      expirationDates: expirations.map((e) => ({ ts: e, date: new Date(e * 1000).toISOString().slice(0, 10) })),
      putCallVol,
      putCallOi,
      unusualCount: [...calls, ...puts].filter((o) => o.unusual).length,
      calls,
      puts,
      source: "Yahoo options v7 (tier C, personal research) · Greeks computed locally (BS)",
    });
  } catch (e) {
    return fail(e);
  }
});
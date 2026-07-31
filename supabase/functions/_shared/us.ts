// Shared helpers for the V5.2 US full-stack data layer.
// Zero-auth public sources: Yahoo (chart / quoteSummary / options), SEC EDGAR.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** SEC requires a declared User-Agent. Keep requests well under 10 req/s. */
export const SEC_UA = "EF Lab research tool (contact: research@eugenefinance.tech)";

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function fail(e: unknown, status = 500) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("us-data error:", msg);
  return json({ error: msg }, status);
}

/**
 * Fetch with host fallback + retry. Overseas endpoints (Yahoo/SEC) sometimes
 * drop TLS without close_notify from Deno Deploy — retry across mirrors.
 */
export async function fetchAny(
  urls: string[],
  init: RequestInit = {},
  attempts = 2,
): Promise<Response> {
  let last: unknown = null;
  for (let a = 0; a < attempts; a++) {
    for (const url of urls) {
      try {
        const r = await fetch(url, {
          ...init,
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) EFLab/5.2",
            Accept: "application/json,text/plain,*/*",
            ...(init.headers || {}),
          },
        });
        if (r.ok) return r;
        // 4xx from the upstream is meaningful — surface it instead of looping.
        if (r.status >= 400 && r.status < 500 && r.status !== 429) return r;
        last = new Error(`HTTP ${r.status} @ ${new URL(url).host}`);
      } catch (e) {
        last = e;
      }
    }
    await new Promise((res) => setTimeout(res, 200 * (a + 1)));
  }
  throw last instanceof Error ? last : new Error("all upstream hosts failed");
}

export const YAHOO_HOSTS = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];

export function yahooUrls(path: string) {
  return YAHOO_HOSTS.map((h) => `https://${h}${path}`);
}

/** Yahoo gates several endpoints on a cookie + crumb pair. Fetch once per isolate. */
let crumbCache: { cookie: string; crumb: string } | null = null;

export async function getYahooCrumb(): Promise<{ cookie: string; crumb: string } | null> {
  if (crumbCache) return crumbCache;
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
    crumbCache = { cookie, crumb };
    return crumbCache;
  } catch {
    return null;
  }
}

/** GET a Yahoo path, retrying once with cookie+crumb when the plain call is rejected. */
export async function yahooGet(path: string): Promise<Response | null> {
  const plain = await fetchAny(yahooUrls(path), {}, 1).catch(() => null);
  if (plain && plain.ok) return plain;
  const cr = await getYahooCrumb();
  if (!cr) return plain;
  const sep = path.includes("?") ? "&" : "?";
  return await fetchAny(
    yahooUrls(`${path}${sep}crumb=${encodeURIComponent(cr.crumb)}`),
    { headers: { Cookie: cr.cookie } },
    1,
  ).catch(() => plain);
}

/* ───────────── technical indicators (pure, no deps) ───────────── */

export function sma(xs: number[], n: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < xs.length; i++) {
    sum += xs[i];
    if (i >= n) sum -= xs[i - n];
    out.push(i >= n - 1 ? sum / n : null);
  }
  return out;
}

export function ema(xs: number[], n: number): number[] {
  const k = 2 / (n + 1);
  const out: number[] = [];
  let prev = xs[0] ?? 0;
  for (let i = 0; i < xs.length; i++) {
    prev = i === 0 ? xs[0] : xs[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function macd(xs: number[], fast = 12, slow = 26, signal = 9) {
  const f = ema(xs, fast);
  const s = ema(xs, slow);
  const dif = f.map((v, i) => v - s[i]);
  const dea = ema(dif, signal);
  const hist = dif.map((v, i) => (v - dea[i]) * 2);
  return { dif, dea, hist };
}

export function rsi(xs: number[], n = 14): (number | null)[] {
  const out: (number | null)[] = [null];
  let avgU = 0;
  let avgD = 0;
  for (let i = 1; i < xs.length; i++) {
    const ch = xs[i] - xs[i - 1];
    const u = Math.max(ch, 0);
    const d = Math.max(-ch, 0);
    if (i <= n) {
      avgU += u / n;
      avgD += d / n;
      out.push(i === n ? 100 - 100 / (1 + avgU / (avgD || 1e-12)) : null);
    } else {
      avgU = (avgU * (n - 1) + u) / n;
      avgD = (avgD * (n - 1) + d) / n;
      out.push(100 - 100 / (1 + avgU / (avgD || 1e-12)));
    }
  }
  return out;
}

export function bollinger(xs: number[], n = 20, k = 2) {
  const mid = sma(xs, n);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < xs.length; i++) {
    const m = mid[i];
    if (m == null) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    const win = xs.slice(i - n + 1, i + 1);
    const v = win.reduce((a, b) => a + (b - m) ** 2, 0) / n;
    const sd = Math.sqrt(v);
    upper.push(m + k * sd);
    lower.push(m - k * sd);
  }
  return { mid, upper, lower };
}

export function kdj(high: number[], low: number[], close: number[], n = 9) {
  const k: number[] = [];
  const d: number[] = [];
  const j: number[] = [];
  let pk = 50;
  let pd = 50;
  for (let i = 0; i < close.length; i++) {
    const s = Math.max(0, i - n + 1);
    const hh = Math.max(...high.slice(s, i + 1));
    const ll = Math.min(...low.slice(s, i + 1));
    const rsv = hh === ll ? 50 : ((close[i] - ll) / (hh - ll)) * 100;
    pk = (2 * pk + rsv) / 3;
    pd = (2 * pd + pk) / 3;
    k.push(pk);
    d.push(pd);
    j.push(3 * pk - 2 * pd);
  }
  return { k, d, j };
}

/** Annualised volatility from a close series (log returns, 252d). */
export function annualVol(closes: number[]) {
  const r: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > 0 && closes[i - 1] > 0) r.push(Math.log(closes[i] / closes[i - 1]));
  }
  if (r.length < 2) return 0;
  const m = r.reduce((a, b) => a + b, 0) / r.length;
  const v = r.reduce((a, b) => a + (b - m) ** 2, 0) / (r.length - 1);
  return Math.sqrt(v * 252);
}

/* ───────────── SEC ticker → CIK ───────────── */

let cikCache: Record<string, { cik: string; title: string }> | null = null;

export async function tickerToCik(ticker: string) {
  const t = ticker.trim().toUpperCase();
  if (!cikCache) {
    const r = await fetchAny(["https://www.sec.gov/files/company_tickers.json"], {
      headers: { "User-Agent": SEC_UA },
    });
    const j = await r.json();
    const map: Record<string, { cik: string; title: string }> = {};
    for (const key of Object.keys(j)) {
      const row = j[key];
      map[String(row.ticker).toUpperCase()] = {
        cik: String(row.cik_str).padStart(10, "0"),
        title: row.title,
      };
    }
    cikCache = map;
  }
  return cikCache[t] ?? null;
}
// ETF lookup — scrapes public metadata from etfdb.com for a single ticker.
// Best-effort: if HTML changes, we return a partial payload with links.
import { corsHeadersFor, getClientIp, checkRateLimit, rateLimitResponse, getCached, setCached } from "../_shared/security.ts";

type EtfInfo = {
  ticker: string;
  name: string | null;
  issuer: string | null;
  expenseRatio: string | null;
  aum: string | null;
  category: string | null;
  ytd: string | null;
  dividendYield: string | null;
  url: string;
};

const cache = new Map<string, { t: number; data: EtfInfo }>();
const TTL_MS = 4 * 60 * 60 * 1000;

function pick(html: string, re: RegExp): string | null {
  const m = html.match(re);
  if (!m) return null;
  return m[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim() || null;
}

async function handler(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(req.url);
    const ticker = (url.searchParams.get("ticker") || "SPY").toUpperCase();
    if (!/^[A-Z0-9.-]{1,10}$/.test(ticker)) {
      return new Response(JSON.stringify({ error: "invalid ticker" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cached = cache.get(ticker);
    if (cached && Date.now() - cached.t < TTL_MS) {
      return new Response(JSON.stringify({ ...cached.data, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const target = `https://etfdb.com/etf/${ticker}/`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    let html = "";
    let ok = false;
    try {
      const r = await fetch(target, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; LovableLab/1.0)",
          "Accept": "text/html,application/xhtml+xml",
        },
        signal: ctrl.signal,
      });
      ok = r.ok;
      if (ok) html = await r.text();
    } catch { /* offline / blocked */ }
    clearTimeout(t);

    const info: EtfInfo = {
      ticker,
      name: pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i),
      issuer: pick(html, /Issuer<\/[^>]+>[\s\S]{0,120}?>([^<]+)</i),
      expenseRatio: pick(html, /Expense Ratio[\s\S]{0,200}?>([\d.]+%)/i),
      aum: pick(html, /(?:Assets Under Management|Total Assets)[\s\S]{0,200}?>(\$[\d.,]+\s*[BMK]?)/i),
      category: pick(html, /ETFdb\.com Category[\s\S]{0,200}?>([^<]+)</i),
      ytd: pick(html, /YTD[\s\S]{0,200}?>([+-]?[\d.]+%)/i),
      dividendYield: pick(html, /Dividend Yield[\s\S]{0,200}?>([\d.]+%)/i),
      url: target,
    };

    if (ok) cache.set(ticker, { t: Date.now(), data: info });
    return new Response(JSON.stringify({ ...info, cached: false, upstreamOk: ok }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
  const rl = await checkRateLimit(`rl:etf-lookup:${ip}`, 60, 60);
  if (!rl.allowed) return rateLimitResponse(corsHeaders, rl.retryAfter);

  const cacheKey = `cache:etf-lookup:${new URL(req.url).searchParams.toString()}`;
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

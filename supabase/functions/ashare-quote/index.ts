// A-share realtime quote (Tencent qt.gtimg.cn) + daily K-line (Eastmoney push2his).
// Public, no-auth CN market data. Zero-parameter defaults to sh600000.
// Response: {code, market, name, price, prevClose, open, high, low, changeAmt,
//   changePct, volume, turnover, dates[], opens[], highs[], lows[], closes[], volumes[]}

import { corsHeadersFor, getClientIp, checkRateLimit, rateLimitResponse, getCached, setCached } from "../_shared/security.ts";

function normalizeSymbol(raw: string) {
  const s = raw.replace(/^(sh|sz|bj)/i, "").replace(/\D/g, "").padStart(6, "0");
  let market: "sh" | "sz" | "bj" = "sz";
  if (/^(60|68|9)/.test(s)) market = "sh";
  else if (/^(4|8)/.test(s)) market = "bj";
  const secid = market === "sh" ? `1.${s}` : `0.${s}`;
  return { code: s, market, secid, tencent: `${market}${s}` };
}

async function fetchTencent(tencent: string) {
  const url = `https://qt.gtimg.cn/q=${tencent}`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 EFLab/5.0", "Referer": "https://gu.qq.com/" },
  });
  // Tencent returns GBK-encoded text; decode explicitly so Chinese names render.
  const buf = new Uint8Array(await resp.arrayBuffer());
  let text: string;
  try {
    text = new TextDecoder("gbk").decode(buf);
  } catch {
    text = new TextDecoder("utf-8").decode(buf);
  }
  // v_sh600000="1~name~code~current~prev~open~vol~..~high~low~..~amt(万)"
  const m = text.match(/="([^"]+)"/);
  if (!m) return null;
  const f = m[1].split("~");
  const num = (i: number) => {
    const v = parseFloat(f[i]);
    return isFinite(v) ? v : null;
  };
  return {
    name: f[1] || "",
    price: num(3),
    prevClose: num(4),
    open: num(5),
    volume: num(6), // 手
    changeAmt: num(31),
    changePct: num(32),
    high: num(33),
    low: num(34),
    turnover: num(37), // 成交额 万元
  };
}

async function fetchKline(secid: string, lmt = 250) {
  // Eastmoney's push2his IPv6 endpoint sometimes drops TLS without close_notify
  // from Deno Deploy. Try several hosts and retry on transient network errors.
  const hosts = [
    "push2his.eastmoney.com",
    "push2.eastmoney.com",
    "63.push2his.eastmoney.com",
    "push2his.eastmoney.com",
  ];
  const path =
    `/api/qt/stock/kline/get?secid=${secid}&klt=101&fqt=1` +
    `&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58` +
    `&end=20500101&lmt=${lmt}`;
  let j: any = null;
  for (const host of hosts) {
    try {
      const resp = await fetch(`https://${host}${path}`, {
        headers: { "User-Agent": "Mozilla/5.0 EFLab/5.0", "Referer": "https://quote.eastmoney.com/" },
      });
      if (!resp.ok) { await resp.body?.cancel(); continue; }
      j = await resp.json();
      if (j?.data?.klines) break;
    } catch (_e) {
      // try next host
    }
  }
  if (!j) return null;
  const rows: string[] = j?.data?.klines || [];
  const dates: string[] = [], opens: number[] = [], closes: number[] = [],
    highs: number[] = [], lows: number[] = [], volumes: number[] = [];
  for (const r of rows) {
    const p = r.split(",");
    // date, open, close, high, low, volume(手), amount(元), amplitude
    dates.push(p[0]);
    opens.push(+p[1]);
    closes.push(+p[2]);
    highs.push(+p[3]);
    lows.push(+p[4]);
    volumes.push(+p[5]);
  }
  return { dates, opens, closes, highs, lows, volumes };
}

async function handler(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(req.url);
    const rawSymbol = url.searchParams.get("symbol") || "sh600000";
    const lmt = Math.min(parseInt(url.searchParams.get("lmt") || "250", 10) || 250, 1000);
    const sym = normalizeSymbol(rawSymbol);
    const [quote, kline] = await Promise.all([fetchTencent(sym.tencent), fetchKline(sym.secid, lmt)]);
    if (!quote && !kline) {
      return new Response(JSON.stringify({ error: "no data" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({ code: sym.code, market: sym.market, ...(quote || {}), ...(kline || {}) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error)?.message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

const CACHE_TTL_SEC = 60;

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`rl:ashare-quote:${ip}`, 60, 60);
  if (!rl.allowed) return rateLimitResponse(corsHeaders, rl.retryAfter);

  const cacheKey = `cache:ashare-quote:${new URL(req.url).searchParams.toString()}`;
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

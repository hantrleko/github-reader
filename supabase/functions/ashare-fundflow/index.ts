// A-share fund-flow K-line (Eastmoney push2 fflow). Daily net inflow decomposed
// into main/small/mid/large/super-large and percentages.

import { corsHeadersFor, getClientIp, checkRateLimit, rateLimitResponse, getCached, setCached } from "../_shared/security.ts";

function normalizeSymbol(raw: string) {
  const s = raw.replace(/^(sh|sz|bj)/i, "").replace(/\D/g, "").padStart(6, "0");
  let market: "sh" | "sz" | "bj" = "sz";
  if (/^(60|68|9)/.test(s)) market = "sh";
  else if (/^(4|8)/.test(s)) market = "bj";
  return { code: s, secid: market === "sh" ? `1.${s}` : `0.${s}` };
}

async function handler(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(req.url);
    const sym = normalizeSymbol(url.searchParams.get("symbol") || "sh600000");
    const lmt = Math.min(parseInt(url.searchParams.get("lmt") || "120", 10) || 120, 500);
    const path =
      `/api/qt/stock/fflow/kline/get` +
      `?secid=${sym.secid}&klt=101` +
      `&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61` +
      `&ut=b2884a393a59ad64002292a3e90d46a5&lmt=${lmt}`;
    const hosts = [
      "https://push2his.eastmoney.com",
      "https://push2.eastmoney.com",
      "https://push2his.eastmoney.com",
    ];
    let j: any = null;
    let lastErr: unknown = null;
    for (const h of hosts) {
      try {
        const resp = await fetch(h + path, {
          headers: { "User-Agent": "Mozilla/5.0 EFLab/5.0", "Referer": "https://data.eastmoney.com/" },
        });
        if (!resp.ok) throw new Error(`eastmoney ${resp.status}`);
        j = await resp.json();
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!j) throw lastErr ?? new Error("fund-flow fetch failed");
    const rows: string[] = j?.data?.klines || [];
    const dates: string[] = [], mainNet: number[] = [], smallNet: number[] = [],
      midNet: number[] = [], largeNet: number[] = [], superNet: number[] = [],
      mainPct: number[] = [];
    for (const r of rows) {
      const p = r.split(",");
      dates.push(p[0]);
      mainNet.push(+p[1]);
      smallNet.push(+p[2]);
      midNet.push(+p[3]);
      largeNet.push(+p[4]);
      superNet.push(+p[5]);
      mainPct.push(+p[6]);
    }
    return new Response(
      JSON.stringify({
        code: sym.code, name: j?.data?.name || "", n: dates.length,
        dates, mainNet, smallNet, midNet, largeNet, superNet, mainPct,
        unit: "元", note: "Net inflow in RMB; main = large + super-large.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error)?.message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

const CACHE_TTL_SEC = 60;

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`rl:ashare-fundflow:${ip}`, 60, 60);
  if (!rl.allowed) return rateLimitResponse(corsHeaders, rl.retryAfter);

  const cacheKey = `cache:ashare-fundflow:${new URL(req.url).searchParams.toString()}`;
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

// Daily Long-Hu Bang (龙虎榜) via Eastmoney datacenter-web JSON API.
// Returns recent trading-day on-list stocks with net-buy amount.

import { corsHeadersFor, getClientIp, checkRateLimit, rateLimitResponse, getCached, setCached } from "../_shared/security.ts";

async function handler(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(req.url);
    const days = Math.min(parseInt(url.searchParams.get("days") || "30", 10) || 30, 120);
    const pageSize = Math.min(parseInt(url.searchParams.get("pageSize") || "50", 10) || 50, 200);
    const start = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

    const cols = [
      "SECURITY_CODE", "SECURITY_NAME_ABBR", "TRADE_DATE", "EXPLAIN",
      "CLOSE_PRICE", "CHANGE_RATE", "TURNOVERRATE", "BILLBOARD_NET_AMT",
      "BILLBOARD_BUY_AMT", "BILLBOARD_SELL_AMT", "ACCUM_AMOUNT",
    ].join(",");
    const filter = encodeURIComponent(`(TRADE_DATE>='${start}')`);
    const api =
      `https://datacenter-web.eastmoney.com/api/data/v1/get` +
      `?sortColumns=TRADE_DATE,BILLBOARD_NET_AMT&sortTypes=-1,-1` +
      `&pageSize=${pageSize}&pageNumber=1&reportName=RPT_DAILYBILLBOARD_DETAILS` +
      `&columns=${cols}&source=WEB&client=WEB&filter=${filter}`;
    const resp = await fetch(api, {
      headers: { "User-Agent": "Mozilla/5.0 EFLab/5.0", "Referer": "https://data.eastmoney.com/" },
    });
    if (!resp.ok) throw new Error(`eastmoney ${resp.status}`);
    const j = await resp.json();
    const raw: any[] = j?.result?.data || [];
    const rows = raw.map((r) => ({
      code: r.SECURITY_CODE,
      name: r.SECURITY_NAME_ABBR,
      date: (r.TRADE_DATE || "").slice(0, 10),
      reason: r.EXPLAIN,
      close: r.CLOSE_PRICE,
      changePct: r.CHANGE_RATE,
      turnover: r.TURNOVERRATE,
      netAmt: r.BILLBOARD_NET_AMT,
      buyAmt: r.BILLBOARD_BUY_AMT,
      sellAmt: r.BILLBOARD_SELL_AMT,
      totalAmt: r.ACCUM_AMOUNT,
    }));
    return new Response(
      JSON.stringify({ n: rows.length, since: start, rows, unit: "RMB" }),
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
  const rl = await checkRateLimit(`rl:ashare-longhu:${ip}`, 60, 60);
  if (!rl.allowed) return rateLimitResponse(corsHeaders, rl.retryAfter);

  const cacheKey = `cache:ashare-longhu:${new URL(req.url).searchParams.toString()}`;
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

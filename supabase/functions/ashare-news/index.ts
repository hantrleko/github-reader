// Cninfo (巨潮) announcements. Optional `code` narrows to one stock.

import { corsHeadersFor, getClientIp, checkRateLimit, rateLimitResponse, getCached, setCached } from "../_shared/security.ts";

function pad6(s: string) {
  return s.replace(/\D/g, "").padStart(6, "0");
}

async function handler(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code") || "";
    const pageSize = Math.min(parseInt(url.searchParams.get("pageSize") || "30", 10) || 30, 100);
    const days = Math.min(parseInt(url.searchParams.get("days") || "30", 10) || 30, 120);

    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

    const params = new URLSearchParams();
    params.set("pageNum", "1");
    params.set("pageSize", String(pageSize));
    params.set("column", "szse");
    params.set("tabName", "fulltext");
    params.set("seDate", `${from}~${to}`);
    params.set("isHLtitle", "true");
    if (code) {
      const c = pad6(code);
      const plate = /^(60|68|9)/.test(c) ? "sh" : "sz";
      params.set("stock", `${c},`);
      params.set("plate", plate);
      params.set("column", plate === "sh" ? "sse" : "szse");
    }

    const resp = await fetch("http://www.cninfo.com.cn/new/hisAnnouncement/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 EFLab/5.0",
        "Referer": "http://www.cninfo.com.cn/new/commonUrl?url=disclosure/list/notice",
      },
      body: params.toString(),
    });
    if (!resp.ok) throw new Error(`cninfo ${resp.status}`);
    const j = await resp.json();
    const raw: any[] = j?.announcements || [];
    const rows = raw.map((r) => ({
      code: r.secCode,
      name: r.secName,
      title: r.announcementTitle,
      date: new Date(r.announcementTime || Date.now()).toISOString().slice(0, 10),
      type: r.adjunctType,
      url: r.adjunctUrl ? `http://static.cninfo.com.cn/${r.adjunctUrl}` : null,
    }));
    return new Response(
      JSON.stringify({ n: rows.length, from, to, rows, source: "cninfo.com.cn" }),
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
  const rl = await checkRateLimit(`rl:ashare-news:${ip}`, 60, 60);
  if (!rl.allowed) return rateLimitResponse(corsHeaders, rl.retryAfter);

  const cacheKey = `cache:ashare-news:${new URL(req.url).searchParams.toString()}`;
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

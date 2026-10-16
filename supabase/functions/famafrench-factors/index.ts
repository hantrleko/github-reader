// Ken French Data Library proxy: F-F 5 Factors monthly.
// Fetches the public CSV ZIP, unzips, parses, returns recent N months of factors.
import { unzipSync, strFromU8 } from "https://esm.sh/fflate@0.8.2";

import { corsHeadersFor, getClientIp, checkRateLimit, rateLimitResponse, getCached, setCached } from "../_shared/security.ts";

const URL_FF5 =
  "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/F-F_Research_Data_5_Factors_2x3_CSV.zip";

async function handler(req: Request, corsHeaders: Record<string, string>): Promise<Response> {

  try {
    const url = new URL(req.url);
    const months = Math.min(parseInt(url.searchParams.get("months") || "120"), 1200);

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const resp = await fetch(URL_FF5, {
      headers: { "User-Agent": "Mozilla/5.0 LovableLab/1.2" },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `kenfrench ${resp.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buf = new Uint8Array(await resp.arrayBuffer());
    const files = unzipSync(buf);
    const csvName = Object.keys(files).find((n) => n.toLowerCase().endsWith(".csv"));
    if (!csvName) {
      return new Response(JSON.stringify({ error: "no csv in zip" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const csv = strFromU8(files[csvName]);

    // Parse: skip header preface, take monthly section until blank line / annual marker
    const lines = csv.split(/\r?\n/);
    const rows: { date: string; mktRf: number; smb: number; hml: number; rmw: number; cma: number; rf: number }[] = [];
    let started = false;
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) {
        if (started) break;
        continue;
      }
      // monthly date is YYYYMM (6 digits)
      const parts = line.split(",").map((s) => s.trim());
      if (parts.length < 7) continue;
      if (!/^\d{6}$/.test(parts[0])) {
        if (started) break; // hit annual section
        continue;
      }
      started = true;
      const ym = parts[0];
      const date = `${ym.slice(0, 4)}-${ym.slice(4, 6)}`;
      const nums = parts.slice(1, 7).map(parseFloat);
      if (nums.some((x) => !isFinite(x))) continue;
      rows.push({
        date,
        mktRf: nums[0] / 100,
        smb: nums[1] / 100,
        hml: nums[2] / 100,
        rmw: nums[3] / 100,
        cma: nums[4] / 100,
        rf: nums[5] / 100,
      });
    }

    const recent = rows.slice(-months);
    return new Response(
      JSON.stringify({
        source: "Ken French Data Library — F-F 5 Factors (Monthly)",
        n: recent.length,
        from: recent[0]?.date,
        to: recent[recent.length - 1]?.date,
        rows: recent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

const CACHE_TTL_SEC = 86400;

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`rl:famafrench-factors:${ip}`, 60, 60);
  if (!rl.allowed) return rateLimitResponse(corsHeaders, rl.retryAfter);

  const cacheKey = `cache:famafrench-factors:${new URL(req.url).searchParams.toString()}`;
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

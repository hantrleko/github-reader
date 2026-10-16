// ECB & BIS open-data proxy — free, no API key required.
// ECB SDMX-JSON v1:  https://data-api.ecb.europa.eu/service/data/{flow}/{key}
// BIS SDMX-JSON v2:  https://stats.bis.org/api/v2/data/dataflow/BIS/{flow}/{version}/{key}
import { corsHeadersFor, getClientIp, checkRateLimit, rateLimitResponse, getCached, setCached } from "../_shared/security.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Point = { date: string; value: number };

/** Parse a single series out of an SDMX-JSON payload (ECB v1 or BIS v2). */
function parseSdmx(root: any): Point[] {
  // BIS wraps everything under `data`; ECB keeps it at the top level.
  const node = root?.data ?? root;
  const dataSet = node?.dataSets?.[0];
  const series = dataSet?.series;
  const obsDim = node?.structure?.dimensions?.observation?.[0];
  const timeVals: { id: string }[] = obsDim?.values ?? [];
  if (!series || !timeVals.length) return [];

  // Take the first (only) series key.
  const firstKey = Object.keys(series)[0];
  const observations = series?.[firstKey]?.observations ?? {};
  const points: Point[] = [];
  for (const [idx, arr] of Object.entries(observations)) {
    const t = timeVals[Number(idx)]?.id;
    const raw = Array.isArray(arr) ? (arr as unknown[])[0] : null;
    const v = raw == null ? null : Number(raw);
    if (t && v != null && isFinite(v)) points.push({ date: t, value: v });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

async function handler(req: Request, corsHeaders: Record<string, string>): Promise<Response> {

  try {
    const url = new URL(req.url);
    const provider = (url.searchParams.get("provider") || "ecb").trim().toLowerCase();
    const flow = (url.searchParams.get("flow") || "").trim().toUpperCase();
    const key = (url.searchParams.get("key") || "").trim().toUpperCase();
    const version = (url.searchParams.get("version") || "1.0").trim();
    const start = url.searchParams.get("start") || "2000-01-01";

    if (provider !== "ecb" && provider !== "bis") return json({ error: "invalid provider" }, 400);
    // SDMX dataflow / series keys use letters, digits, dots and dimension separators.
    if (!/^[A-Z0-9_]{2,40}$/.test(flow)) return json({ error: "invalid flow" }, 400);
    if (!/^[A-Z0-9._:\-+*]{1,80}$/.test(key)) return json({ error: "invalid key" }, 400);
    if (!/^[0-9.]{1,8}$/.test(version)) return json({ error: "invalid version" }, 400);
    const startYear = start.slice(0, 4);
    if (!/^\d{4}$/.test(startYear)) return json({ error: "invalid start" }, 400);

    let target: string;
    let accept: string;
    if (provider === "ecb") {
      target = `https://data-api.ecb.europa.eu/service/data/${encodeURIComponent(flow)}/${encodeURIComponent(
        key
      )}?format=jsondata&startPeriod=${encodeURIComponent(startYear)}-01-01`;
      accept = "application/json";
    } else {
      target = `https://stats.bis.org/api/v2/data/dataflow/BIS/${encodeURIComponent(flow)}/${encodeURIComponent(
        version
      )}/${encodeURIComponent(key)}?startPeriod=${encodeURIComponent(startYear)}`;
      accept = "application/vnd.sdmx.data+json";
    }

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const resp = await fetch(target, { signal: ctrl.signal, headers: { Accept: accept } });
    clearTimeout(t);

    if (!resp.ok) {
      return json({ error: `${provider} upstream ${resp.status}` }, 502);
    }
    const body = await resp.json();
    const points = parseSdmx(body);
    if (!points.length) return json({ error: "no data" }, 502);

    return json({
      provider,
      flow,
      key,
      n: points.length,
      latest: points[points.length - 1].value,
      latestDate: points[points.length - 1].date,
      dates: points.map((p) => p.date),
      values: points.map((p) => p.value),
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

const CACHE_TTL_SEC = 21600;

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`rl:ecb-bis-series:${ip}`, 60, 60);
  if (!rl.allowed) return rateLimitResponse(corsHeaders, rl.retryAfter);

  const cacheKey = `cache:ecb-bis-series:${new URL(req.url).searchParams.toString()}`;
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

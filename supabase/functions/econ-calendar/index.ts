// Economic calendar proxy. Attempts Trading Economics guest endpoint first,
// falls back to a curated static schedule of high-impact US events so the
// panel always renders something useful.
import { corsHeadersFor, getClientIp, checkRateLimit, rateLimitResponse, getCached, setCached } from "../_shared/security.ts";

type Event = {
  date: string;      // ISO
  country: string;
  category: string;
  event: string;
  importance: 1 | 2 | 3;
  actual?: string | null;
  forecast?: string | null;
  previous?: string | null;
  source: "trading-economics" | "curated";
};

// Curated schedule of recurring high-impact US releases (approximate cadence).
// Used as fallback when Trading Economics rate-limits the guest key.
function curatedSchedule(daysAhead = 14): Event[] {
  const out: Event[] = [];
  const today = new Date();
  today.setUTCHours(12, 30, 0, 0);
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() + i);
    const dow = d.getUTCDay();          // 0 Sun ... 6 Sat
    const dom = d.getUTCDate();
    const iso = d.toISOString();
    // Weekly: Initial Jobless Claims every Thursday
    if (dow === 4) {
      out.push({ date: iso, country: "US", category: "Labour", event: "Initial Jobless Claims", importance: 2, source: "curated" });
    }
    // First Friday of month: Nonfarm Payrolls + Unemployment Rate
    if (dow === 5 && dom <= 7) {
      out.push({ date: iso, country: "US", category: "Labour", event: "Nonfarm Payrolls", importance: 3, source: "curated" });
      out.push({ date: iso, country: "US", category: "Labour", event: "Unemployment Rate", importance: 3, source: "curated" });
    }
    // ~10th of month: CPI / Core CPI
    if (dom >= 10 && dom <= 15 && dow >= 1 && dow <= 5) {
      if (!out.find((e) => e.event === "CPI (YoY)" && e.date.slice(0, 7) === iso.slice(0, 7))) {
        out.push({ date: iso, country: "US", category: "Inflation", event: "CPI (YoY)", importance: 3, source: "curated" });
        out.push({ date: iso, country: "US", category: "Inflation", event: "Core CPI (YoY)", importance: 3, source: "curated" });
      }
    }
    // ~end of month: PCE Price Index
    if (dom >= 26 && dom <= 31 && dow >= 1 && dow <= 5) {
      if (!out.find((e) => e.event === "Core PCE (YoY)" && e.date.slice(0, 7) === iso.slice(0, 7))) {
        out.push({ date: iso, country: "US", category: "Inflation", event: "Core PCE (YoY)", importance: 3, source: "curated" });
      }
    }
  }
  return out.slice(0, 40);
}

// simple in-memory cache
let cache: { t: number; data: Event[] } | null = null;
const TTL_MS = 60 * 60 * 1000; // 1h

async function handler(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    if (cache && Date.now() - cache.t < TTL_MS) {
      return new Response(JSON.stringify({ events: cache.data, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const events: Event[] = [];

    // Try TE guest endpoint (very restricted — usually returns limited data).
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const teUrl = "https://api.tradingeconomics.com/calendar/country/united states?c=guest:guest&f=json";
      const r = await fetch(teUrl, { signal: ctrl.signal });
      clearTimeout(t);
      if (r.ok) {
        const rows = await r.json() as Array<Record<string, unknown>>;
        for (const row of rows.slice(0, 60)) {
          const dateStr = String(row.Date || "");
          if (!dateStr) continue;
          events.push({
            date: new Date(dateStr).toISOString(),
            country: String(row.Country || "US"),
            category: String(row.Category || ""),
            event: String(row.Event || ""),
            importance: (Number(row.Importance) || 1) as 1 | 2 | 3,
            actual: (row.Actual as string) ?? null,
            forecast: (row.Forecast as string) ?? null,
            previous: (row.Previous as string) ?? null,
            source: "trading-economics",
          });
        }
      }
    } catch { /* ignore, fall back */ }

    // Always merge curated schedule so the panel is populated.
    const curated = curatedSchedule(14);
    for (const c of curated) {
      const dup = events.find(
        (e) => e.event.toLowerCase() === c.event.toLowerCase() && e.date.slice(0, 10) === c.date.slice(0, 10)
      );
      if (!dup) events.push(c);
    }
    events.sort((a, b) => (a.date < b.date ? -1 : 1));

    cache = { t: Date.now(), data: events };
    return new Response(JSON.stringify({ events, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown", events: curatedSchedule(14) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

const CACHE_TTL_SEC = 21600;

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`rl:econ-calendar:${ip}`, 60, 60);
  if (!rl.allowed) return rateLimitResponse(corsHeaders, rl.retryAfter);

  const cacheKey = `cache:econ-calendar:${new URL(req.url).searchParams.toString()}`;
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

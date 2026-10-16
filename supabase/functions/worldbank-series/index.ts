// World Bank Open Data proxy — free, no API key required.
// Returns annual indicator series for one or more countries.
// Docs: https://datahelpdesk.worldbank.org/knowledgebase/articles/889392
import { corsHeadersFor, getClientIp, checkRateLimit, rateLimitResponse, getCached, setCached } from "../_shared/security.ts";

async function handler(req: Request, corsHeaders: Record<string, string>): Promise<Response> {

  try {
    const url = new URL(req.url);
    const indicator = (url.searchParams.get("indicator") || "NY.GDP.MKTP.CD").trim();
    // Semicolon-separated ISO3 codes, e.g. USA;CHN;JPN
    const countries = (url.searchParams.get("countries") || "USA").trim().toUpperCase();
    const start = url.searchParams.get("start") || "1990";
    const end = url.searchParams.get("end") || new Date().getFullYear().toString();

    // Validate: World Bank indicator codes use letters, digits and dots.
    if (!/^[A-Z0-9.]{2,40}$/i.test(indicator)) {
      return new Response(JSON.stringify({ error: "invalid indicator" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Validate: ISO3 codes separated by semicolons (allow "all").
    if (!/^[A-Z]{2,3}(;[A-Z]{2,3})*$/.test(countries) && countries !== "ALL") {
      return new Response(JSON.stringify({ error: "invalid countries" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/^\d{4}$/.test(start) || !/^\d{4}$/.test(end)) {
      return new Response(JSON.stringify({ error: "invalid date range" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const wbUrl =
      `https://api.worldbank.org/v2/country/${encodeURIComponent(countries)}/indicator/${encodeURIComponent(
        indicator
      )}?format=json&per_page=20000&date=${start}:${end}`;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const resp = await fetch(wbUrl, { signal: ctrl.signal });
    clearTimeout(t);

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `worldbank ${resp.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const j = await resp.json();
    // World Bank returns [meta, observations]; meta may carry a "message" on error.
    if (!Array.isArray(j) || j.length < 2 || !Array.isArray(j[1])) {
      const msg = Array.isArray(j) && j[0]?.message ? JSON.stringify(j[0].message) : "no data";
      return new Response(JSON.stringify({ error: msg }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    type Obs = {
      country: { id: string; value: string };
      countryiso3code: string;
      date: string;
      value: number | null;
    };
    const observations = j[1] as Obs[];

    // Group by country -> { name, points: [{date, value}] } ascending by year.
    const byCountry: Record<
      string,
      { iso3: string; name: string; points: { date: string; value: number }[] }
    > = {};
    for (const o of observations) {
      if (o.value == null || !isFinite(o.value)) continue;
      const iso = o.countryiso3code || o.country?.id || "";
      if (!byCountry[iso]) {
        byCountry[iso] = { iso3: iso, name: o.country?.value || iso, points: [] };
      }
      byCountry[iso].points.push({ date: o.date, value: o.value });
    }
    const series = Object.values(byCountry).map((c) => ({
      ...c,
      points: c.points.sort((a, b) => a.date.localeCompare(b.date)),
    }));

    return new Response(
      JSON.stringify({
        indicator,
        countries: series.map((s) => s.iso3),
        n: observations.length,
        series,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

const CACHE_TTL_SEC = 21600;

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`rl:worldbank-series:${ip}`, 60, 60);
  if (!rl.allowed) return rateLimitResponse(corsHeaders, rl.retryAfter);

  const cacheKey = `cache:worldbank-series:${new URL(req.url).searchParams.toString()}`;
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

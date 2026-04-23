// FRED API proxy for macro data series.
// Common series IDs: DGS1, DGS2, DGS5, DGS10, DGS30 (Treasury yields), CPIAUCSL (CPI), UNRATE.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const apiKey = Deno.env.get("FRED_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "FRED_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const seriesId = (url.searchParams.get("series_id") || "DGS10").toUpperCase();
    const start = url.searchParams.get("start") || "2015-01-01";
    const end = url.searchParams.get("end") || new Date().toISOString().slice(0, 10);

    if (!/^[A-Z0-9]{1,30}$/.test(seriesId)) {
      return new Response(JSON.stringify({ error: "invalid series_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fredUrl =
      `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(
        seriesId
      )}&api_key=${apiKey}&file_type=json&observation_start=${start}&observation_end=${end}`;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const resp = await fetch(fredUrl, { signal: ctrl.signal });
    clearTimeout(t);

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `fred ${resp.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const j = await resp.json();
    const obs: { date: string; value: string }[] = j?.observations || [];
    const dates: string[] = [];
    const values: number[] = [];
    for (const o of obs) {
      const v = parseFloat(o.value);
      if (isFinite(v)) {
        dates.push(o.date);
        values.push(v);
      }
    }

    return new Response(
      JSON.stringify({
        series_id: seriesId,
        n: values.length,
        latest: values[values.length - 1] ?? null,
        latestDate: dates[dates.length - 1] ?? null,
        dates,
        values,
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
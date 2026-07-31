// V5.2 · Free market-wide screener via SEC EDGAR XBRL "frames":
// one GAAP tag, one period, every filer that reported it. Tier S.
import { corsHeaders, json, fail, fetchAny, SEC_UA } from "../_shared/us.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const tag = (url.searchParams.get("tag") || "NetIncomeLoss").replace(/[^A-Za-z0-9]/g, "");
    const unit = (url.searchParams.get("unit") || "USD").replace(/[^A-Za-z/]/g, "");
    const period = (url.searchParams.get("period") || "CY2025Q1I").replace(/[^A-Za-z0-9]/g, "");
    const order = url.searchParams.get("order") === "asc" ? "asc" : "desc";
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10) || 100, 300);

    const r = await fetchAny(
      [`https://data.sec.gov/api/xbrl/frames/us-gaap/${tag}/${unit}/${period}.json`],
      { headers: { "User-Agent": SEC_UA } },
    );
    if (!r.ok) {
      throw new Error(
        `SEC frames returned ${r.status} for ${tag}/${unit}/${period} — try a duration period (CY2025Q1) or an instant one (CY2025Q1I).`,
      );
    }
    const j = await r.json();
    const data: any[] = j?.data || [];
    const sorted = [...data].sort((a, b) => (order === "desc" ? b.val - a.val : a.val - b.val));
    const rows = sorted.slice(0, limit).map((d, i) => ({
      rank: i + 1,
      cik: String(d.cik).padStart(10, "0"),
      entity: d.entityName,
      value: d.val,
      end: d.end,
      form: d.form ?? null,
      url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${String(d.cik).padStart(10, "0")}&type=10-K`,
    }));

    const values = data.map((d) => d.val).filter((v) => isFinite(v));
    const total = values.reduce((a, b) => a + b, 0);

    return json({
      tag, unit, period, order,
      universe: data.length,
      n: rows.length,
      total,
      median: values.length ? [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] : null,
      label: j?.label || tag,
      description: j?.description || null,
      rows,
      source: "SEC EDGAR XBRL frames (tier S · free market-wide screener)",
    });
  } catch (e) {
    return fail(e);
  }
});
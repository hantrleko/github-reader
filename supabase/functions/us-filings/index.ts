import { corsHeadersFor, getClientIp, checkRateLimit, rateLimitResponse, getCached, setCached } from "../_shared/security.ts";
// V5.2 · SEC EDGAR filing stream: per-issuer submissions + market-wide full-text search.
// Tier S — commercial use and redistribution permitted, declared User-Agent required.
import { json, fail, fetchAny, SEC_UA, tickerToCik } from "../_shared/us.ts";

async function handler(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || "issuer";

    if (mode === "fulltext") {
      const q = (url.searchParams.get("q") || "").trim();
      if (!q) throw new Error("q is required for full-text search");
      const forms = url.searchParams.get("forms") || "";
      const qs = new URLSearchParams({ q });
      if (forms) qs.set("forms", forms);
      const r = await fetchAny([`https://efts.sec.gov/LATEST/search-index?${qs}`, `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(q)}`], {
        headers: { "User-Agent": SEC_UA },
      }).catch(() => null) as Response | null;
      let hits: any[] = [];
      if (r && r.ok) {
        const j = await r.json();
        hits = j?.hits?.hits || [];
      } else {
        const r2 = await fetchAny([`https://efts.sec.gov/LATEST/search-index?q=%22${encodeURIComponent(q)}%22`], {
          headers: { "User-Agent": SEC_UA },
        });
        const j2 = await r2.json();
        hits = j2?.hits?.hits || [];
      }
      const rows = hits.slice(0, 60).map((h: any) => {
        const src = h._source || {};
        const [adsh, doc] = String(h._id || "").split(":");
        const cik = (src.ciks?.[0] || "").replace(/^0+/, "");
        const acc = (adsh || "").replace(/-/g, "");
        return {
          accession: adsh || null,
          form: src.root_form || src.file_type || null,
          filedAt: src.file_date || null,
          company: src.display_names?.[0] || null,
          url: cik && acc ? `https://www.sec.gov/Archives/edgar/data/${cik}/${acc}/${doc || ""}` : null,
        };
      });
      return json(corsHeaders, { mode, q, n: rows.length, rows, source: "SEC EDGAR full-text search (tier S)" });
    }

    const symbol = (url.searchParams.get("symbol") || "AAPL").trim().toUpperCase();
    const formFilter = (url.searchParams.get("form") || "").toUpperCase();
    const cikRow = await tickerToCik(symbol);
    if (!cikRow) throw new Error(`no SEC CIK mapping for ${symbol}`);

    const r = await fetchAny([`https://data.sec.gov/submissions/CIK${cikRow.cik}.json`], {
      headers: { "User-Agent": SEC_UA },
    });
    const j = await r.json();
    const rec = j?.filings?.recent || {};
    const cikNum = cikRow.cik.replace(/^0+/, "");
    const rows: any[] = [];
    const total = rec.accessionNumber?.length || 0;
    for (let i = 0; i < total; i++) {
      const form = rec.form[i];
      if (formFilter && !String(form).toUpperCase().startsWith(formFilter)) continue;
      const acc = String(rec.accessionNumber[i]).replace(/-/g, "");
      rows.push({
        form,
        filedAt: rec.filingDate[i],
        reportDate: rec.reportDate?.[i] || null,
        accession: rec.accessionNumber[i],
        primaryDoc: rec.primaryDocument?.[i] || null,
        description: rec.primaryDocDescription?.[i] || null,
        url: `https://www.sec.gov/Archives/edgar/data/${cikNum}/${acc}/${rec.primaryDocument?.[i] || ""}`,
      });
      if (rows.length >= 80) break;
    }

    return json(corsHeaders, {
      mode: "issuer",
      symbol,
      cik: cikRow.cik,
      company: j?.name || cikRow.title,
      sic: j?.sicDescription || null,
      exchange: j?.exchanges?.[0] || null,
      n: rows.length,
      rows,
      source: "SEC EDGAR submissions (tier S)",
    });
  } catch (e) {
    return fail(corsHeaders, e);
  }
});

const CACHE_TTL_SEC = 21600;

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`rl:us-filings:${ip}`, 60, 60);
  if (!rl.allowed) return rateLimitResponse(corsHeaders, rl.retryAfter);

  const cacheKey = `cache:us-filings:${new URL(req.url).searchParams.toString()}`;
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

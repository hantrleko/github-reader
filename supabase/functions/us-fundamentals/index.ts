import { corsHeadersFor, getClientIp, checkRateLimit, rateLimitResponse, getCached, setCached } from "../_shared/security.ts";
// V5.2 · US fundamentals: SEC XBRL companyconcept (tier S) + Yahoo quoteSummary (tier C).
import { json, fail, fetchAny, yahooGet, SEC_UA, tickerToCik } from "../_shared/us.ts";

/** GAAP tags we surface as the "three statements" digest. */
const TAGS: { tag: string; unit: string; label: string; statement: string }[] = [
  { tag: "Revenues", unit: "USD", label: "Revenue", statement: "income" },
  { tag: "RevenueFromContractWithCustomerExcludingAssessedTax", unit: "USD", label: "Revenue (ASC606)", statement: "income" },
  { tag: "GrossProfit", unit: "USD", label: "Gross Profit", statement: "income" },
  { tag: "OperatingIncomeLoss", unit: "USD", label: "Operating Income", statement: "income" },
  { tag: "NetIncomeLoss", unit: "USD", label: "Net Income", statement: "income" },
  { tag: "ResearchAndDevelopmentExpense", unit: "USD", label: "R&D Expense", statement: "income" },
  { tag: "Assets", unit: "USD", label: "Total Assets", statement: "balance" },
  { tag: "Liabilities", unit: "USD", label: "Total Liabilities", statement: "balance" },
  { tag: "StockholdersEquity", unit: "USD", label: "Shareholders' Equity", statement: "balance" },
  { tag: "CashAndCashEquivalentsAtCarryingValue", unit: "USD", label: "Cash & Equivalents", statement: "balance" },
  { tag: "NetCashProvidedByUsedInOperatingActivities", unit: "USD", label: "Operating Cash Flow", statement: "cash" },
  { tag: "NetCashProvidedByUsedInInvestingActivities", unit: "USD", label: "Investing Cash Flow", statement: "cash" },
  { tag: "NetCashProvidedByUsedInFinancingActivities", unit: "USD", label: "Financing Cash Flow", statement: "cash" },
  { tag: "PaymentsToAcquirePropertyPlantAndEquipment", unit: "USD", label: "CapEx", statement: "cash" },
];

type Point = { end: string; fy: number; fp: string; form: string; val: number };

const isInstant = (s: string) => s === "balance";

async function xbrlSeries(cik: string, tag: string, unit: string, statement: string): Promise<Point[]> {
  try {
    const r = await fetchAny(
      [`https://data.sec.gov/api/xbrl/companyconcept/CIK${cik}/us-gaap/${tag}.json`],
      { headers: { "User-Agent": SEC_UA } },
      1,
    );
    if (!r.ok) return [];
    const j = await r.json();
    const rows: any[] = j?.units?.[unit] || [];
    // Annual facts only: 10-K / FY, and for flow items a ~12-month duration.
    const days = (x: any) =>
      x.start ? (Date.parse(x.end) - Date.parse(x.start)) / 86400000 : null;
    let annual = rows.filter(
      (x) =>
        x.form === "10-K" &&
        x.fp === "FY" &&
        (isInstant(statement) ? !x.start : (days(x) ?? 0) > 300),
    );
    if (!annual.length) annual = rows.filter((x) => (isInstant(statement) ? !x.start : (days(x) ?? 0) > 300));
    // Dedupe by period end, keeping the most recently filed restatement.
    const byEnd = new Map<string, any>();
    for (const x of annual) {
      const prev = byEnd.get(x.end);
      if (!prev || (x.filed || "") > (prev.filed || "")) byEnd.set(x.end, x);
    }
    return [...byEnd.values()]
      .sort((a, b) => (a.end < b.end ? -1 : 1))
      .slice(-6)
      .map((x) => ({ end: x.end, fy: x.fy, fp: x.fp, form: x.form, val: x.val }));
  } catch {
    return [];
  }
}

async function yahooSummary(symbol: string) {
  try {
    const modules = "price,summaryDetail,defaultKeyStatistics,financialData";
    const r = await yahooGet(
      `/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`,
    );
    if (!r || !r.ok) return null;
    const j = await r.json();
    const res = j?.quoteSummary?.result?.[0];
    if (!res) return null;
    const raw = (o: any) => (o && typeof o.raw === "number" ? o.raw : null);
    return {
      marketCap: raw(res.price?.marketCap) ?? raw(res.summaryDetail?.marketCap),
      trailingPE: raw(res.summaryDetail?.trailingPE),
      forwardPE: raw(res.summaryDetail?.forwardPE),
      priceToBook: raw(res.defaultKeyStatistics?.priceToBook),
      beta: raw(res.summaryDetail?.beta),
      dividendYield: raw(res.summaryDetail?.dividendYield),
      profitMargins: raw(res.financialData?.profitMargins),
      grossMargins: raw(res.financialData?.grossMargins),
      returnOnEquity: raw(res.financialData?.returnOnEquity),
      debtToEquity: raw(res.financialData?.debtToEquity),
      revenueGrowth: raw(res.financialData?.revenueGrowth),
      targetMeanPrice: raw(res.financialData?.targetMeanPrice),
      recommendationKey: res.financialData?.recommendationKey ?? null,
    };
  } catch {
    return null;
  }
}

async function handler(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(req.url);
    const symbol = (url.searchParams.get("symbol") || "AAPL").trim().toUpperCase();

    const [cikRow, metrics] = await Promise.all([tickerToCik(symbol), yahooSummary(symbol)]);

    let statements: any[] = [];
    if (cikRow) {
      const chunks: typeof TAGS[] = [];
      for (let i = 0; i < TAGS.length; i += 4) chunks.push(TAGS.slice(i, i + 4));
      for (const chunk of chunks) {
        const got = await Promise.all(chunk.map((t) => xbrlSeries(cikRow.cik, t.tag, t.unit, t.statement)));
        chunk.forEach((t, i) => {
          if (got[i].length) statements.push({ ...t, points: got[i] });
        });
        await new Promise((r) => setTimeout(r, 120)); // stay under SEC 10 req/s
      }
      // Drop the ASC606 duplicate when the plain Revenues tag already resolved.
      if (statements.some((s) => s.tag === "Revenues")) {
        statements = statements.filter((s) => s.tag !== "RevenueFromContractWithCustomerExcludingAssessedTax");
      }
    }

    return json(corsHeaders, {
      symbol,
      cik: cikRow?.cik ?? null,
      company: cikRow?.title ?? symbol,
      metrics,
      statements,
      source: "SEC XBRL companyconcept (tier S) + Yahoo quoteSummary (tier C)",
    });
  } catch (e) {
    return fail(corsHeaders, e);
  }
}

const CACHE_TTL_SEC = 21600;

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`rl:us-fundamentals:${ip}`, 60, 60);
  if (!rl.allowed) return rateLimitResponse(corsHeaders, rl.retryAfter);

  const cacheKey = `cache:us-fundamentals:${new URL(req.url).searchParams.toString()}`;
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

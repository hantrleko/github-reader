// V5.2 · US fundamentals: SEC XBRL companyconcept (tier S) + Yahoo quoteSummary (tier C).
import { corsHeaders, json, fail, fetchAny, yahooUrls, SEC_UA, tickerToCik } from "../_shared/us.ts";

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

async function xbrlSeries(cik: string, tag: string, unit: string): Promise<Point[]> {
  try {
    const r = await fetchAny(
      [`https://data.sec.gov/api/xbrl/companyconcept/CIK${cik}/us-gaap/${tag}.json`],
      { headers: { "User-Agent": SEC_UA } },
      1,
    );
    if (!r.ok) return [];
    const j = await r.json();
    const rows = j?.units?.[unit] || [];
    const annual = rows.filter((x: any) => x.form === "10-K" && x.fp === "FY");
    const pick = (annual.length ? annual : rows).slice(-6);
    return pick.map((x: any) => ({ end: x.end, fy: x.fy, fp: x.fp, form: x.form, val: x.val }));
  } catch {
    return [];
  }
}

async function yahooSummary(symbol: string) {
  try {
    const modules = "price,summaryDetail,defaultKeyStatistics,financialData";
    const r = await fetchAny(
      yahooUrls(`/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`),
      {},
      1,
    );
    if (!r.ok) return null;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const symbol = (url.searchParams.get("symbol") || "AAPL").trim().toUpperCase();

    const [cikRow, metrics] = await Promise.all([tickerToCik(symbol), yahooSummary(symbol)]);

    let statements: any[] = [];
    if (cikRow) {
      const chunks: typeof TAGS[] = [];
      for (let i = 0; i < TAGS.length; i += 4) chunks.push(TAGS.slice(i, i + 4));
      for (const chunk of chunks) {
        const got = await Promise.all(chunk.map((t) => xbrlSeries(cikRow.cik, t.tag, t.unit)));
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

    return json({
      symbol,
      cik: cikRow?.cik ?? null,
      company: cikRow?.title ?? symbol,
      metrics,
      statements,
      source: "SEC XBRL companyconcept (tier S) + Yahoo quoteSummary (tier C)",
    });
  } catch (e) {
    return fail(e);
  }
});
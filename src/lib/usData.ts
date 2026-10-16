/**
 * V5.2 · US full-stack market data hooks.
 * All requests are proxied through Lovable Cloud edge functions so the browser
 * never talks to Yahoo / SEC directly (CORS + declared User-Agent handled there).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_URL = "https://oshfqmmhxaaevucfdunk.supabase.co/functions/v1";

async function callFn<T>(name: string, params: Record<string, string | number | undefined>): Promise<T> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  });
  const resp = await fetch(`${FUNCTIONS_URL}/${name}?${qs.toString()}`, {
    headers: { apikey: (supabase as unknown as { supabaseKey?: string }).supabaseKey ?? "" },
  });
  const txt = await resp.text();
  let body: unknown = null;
  try {
    body = JSON.parse(txt);
  } catch {
    /* non-JSON upstream error */
  }
  if (!resp.ok) {
    if (resp.status === 429) {
      const ra = resp.headers.get("Retry-After");
      throw new Error(
        `请求过于频繁，请${ra ? `${ra} 秒后` : "稍后"}再试 / Too many requests, please retry ${ra ? `in ${ra}s` : "later"}.`,
      );
    }
    const msg = (body as { error?: string } | null)?.error || `${name} HTTP ${resp.status}`;
    throw new Error(msg);
  }
  return body as T;
}

const FIVE_MIN = 5 * 60 * 1000;

/* ───────────────────────── types ───────────────────────── */

export type UsQuote = {
  symbol: string;
  name: string;
  currency: string;
  exchange: string | null;
  price: number;
  prevClose: number;
  changeAmt: number;
  changePct: number;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  annualVol: number;
  n: number;
  dates: string[];
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  volumes: number[];
  indicators: {
    ma5: (number | null)[];
    ma20: (number | null)[];
    ma60: (number | null)[];
    ema12: number[];
    macd: number[];
    signal: number[];
    hist: number[];
    rsi14: (number | null)[];
    bollUpper: (number | null)[];
    bollMid: (number | null)[];
    bollLower: (number | null)[];
    kdjK: number[];
    kdjD: number[];
    kdjJ: number[];
  };
  source: string;
};

export type XbrlPoint = { end: string; fy: number; fp: string; form: string; val: number };
export type XbrlSeries = {
  tag: string;
  unit: string;
  label: string;
  statement: "income" | "balance" | "cash";
  points: XbrlPoint[];
};
export type UsFundamentals = {
  symbol: string;
  cik: string | null;
  company: string;
  metrics: Record<string, number | string | null> | null;
  statements: XbrlSeries[];
  source: string;
};

export type FilingRow = {
  form: string;
  filedAt: string;
  reportDate?: string | null;
  accession: string | null;
  primaryDoc?: string | null;
  description?: string | null;
  company?: string | null;
  url: string | null;
};
export type UsFilings = {
  mode: string;
  symbol?: string;
  cik?: string;
  company?: string;
  sic?: string | null;
  exchange?: string | null;
  q?: string;
  n: number;
  rows: FilingRow[];
  source: string;
};

export type OptionLeg = {
  type: "call" | "put";
  strike: number;
  last: number | null;
  bid: number | null;
  ask: number | null;
  iv: number;
  volume: number;
  openInterest: number;
  volOiRatio: number | null;
  unusual: boolean;
  inTheMoney: boolean;
  delta: number | null;
  gamma: number | null;
  vega: number | null;
  theta: number | null;
};
export type UsOptions = {
  symbol: string;
  spot: number | null;
  expiry: number;
  expiryDate: string | null;
  isZeroDte: boolean;
  T: number;
  r: number;
  expirationDates: { ts: number; date: string }[];
  putCallVol: number | null;
  putCallOi: number | null;
  unusualCount: number;
  calls: OptionLeg[];
  puts: OptionLeg[];
  source: string;
};

export type ScreenerRow = {
  rank: number;
  cik: string;
  entity: string;
  value: number;
  end: string;
  url: string;
};
export type UsScreener = {
  tag: string;
  unit: string;
  period: string;
  order: string;
  universe: number;
  n: number;
  total: number;
  median: number | null;
  label: string;
  description: string | null;
  rows: ScreenerRow[];
  source: string;
};

/* ───────────────────────── hooks ───────────────────────── */

export function useUsQuote(symbol: string, range = "1y", interval = "1d", enabled = true) {
  return useQuery({
    queryKey: ["us-quote", symbol, range, interval],
    queryFn: () => callFn<UsQuote>("us-quote", { symbol, range, interval }),
    enabled: enabled && !!symbol,
    staleTime: FIVE_MIN,
    retry: 1,
  });
}

export function useUsFundamentals(symbol: string, enabled = true) {
  return useQuery({
    queryKey: ["us-fundamentals", symbol],
    queryFn: () => callFn<UsFundamentals>("us-fundamentals", { symbol }),
    enabled: enabled && !!symbol,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}

export function useUsFilings(symbol: string, form = "", enabled = true) {
  return useQuery({
    queryKey: ["us-filings", symbol, form],
    queryFn: () => callFn<UsFilings>("us-filings", { symbol, form }),
    enabled: enabled && !!symbol,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useEdgarFullText(q: string, forms = "", enabled = false) {
  return useQuery({
    queryKey: ["us-filings-fts", q, forms],
    queryFn: () => callFn<UsFilings>("us-filings", { mode: "fulltext", q, forms }),
    enabled: enabled && q.trim().length > 1,
    staleTime: 10 * 60 * 1000,
    retry: 0,
  });
}

export function useUsOptions(symbol: string, date?: number, enabled = true) {
  return useQuery({
    queryKey: ["us-options", symbol, date ?? "front"],
    queryFn: () => callFn<UsOptions>("us-options", { symbol, date }),
    enabled: enabled && !!symbol,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}

export function useUsScreener(
  tag: string,
  period: string,
  unit = "USD",
  limit = 100,
  enabled = true,
) {
  return useQuery({
    queryKey: ["us-screener", tag, period, unit, limit],
    queryFn: () => callFn<UsScreener>("us-screener", { tag, period, unit, limit }),
    enabled: enabled && !!tag && !!period,
    staleTime: 60 * 60 * 1000,
    retry: 0,
  });
}

/** Common XBRL tags surfaced in the market-wide screener. */
export const SCREENER_TAGS: { tag: string; label: string; instant: boolean }[] = [
  { tag: "Assets", label: "总资产 Assets", instant: true },
  { tag: "Liabilities", label: "总负债 Liabilities", instant: true },
  { tag: "StockholdersEquity", label: "股东权益 Equity", instant: true },
  { tag: "CashAndCashEquivalentsAtCarryingValue", label: "现金 Cash", instant: true },
  { tag: "NetIncomeLoss", label: "净利润 Net Income", instant: false },
  { tag: "Revenues", label: "营业收入 Revenues", instant: false },
  { tag: "ResearchAndDevelopmentExpense", label: "研发支出 R&D", instant: false },
  { tag: "OperatingIncomeLoss", label: "营业利润 Operating Income", instant: false },
];

/** Human-readable large-number formatter (USD). */
export function fmtUsd(v: number | null | undefined, digits = 2) {
  if (v == null || !Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (a >= 1e12) return `${sign}$${(a / 1e12).toFixed(digits)}T`;
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(digits)}B`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(digits)}M`;
  if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(digits)}K`;
  return `${sign}$${a.toFixed(digits)}`;
}
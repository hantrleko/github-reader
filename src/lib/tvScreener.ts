/**
 * V6.4 · TradingView Screener hooks.
 * Proxies TradingView's public scanner endpoints through a Lovable Cloud
 * edge function so the browser avoids CORS and rate-limit issues.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_URL = "https://oshfqmmhxaaevucfdunk.supabase.co/functions/v1";

export type TvFilter = {
  left: string;
  operation: string;
  right?: string | number | string[] | number[];
};

export type TvScreenerRequest = {
  market: string;
  columns?: string[];
  filters?: TvFilter[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  range?: [number, number];
  search?: string;
};

export type TvScreenerResponse = {
  market: string;
  columns: string[];
  sort: { sortBy: string; sortOrder: string };
  range: [number, number];
  total: number;
  n: number;
  rows: Record<string, unknown>[];
  source: string;
  ts: string;
};

async function callFn<T>(name: string, body: unknown): Promise<T> {
  const resp = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: (supabase as unknown as { supabaseKey?: string }).supabaseKey ?? "",
    },
    body: JSON.stringify(body),
  });
  const txt = await resp.text();
  let data: unknown = null;
  try {
    data = JSON.parse(txt);
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
    const msg = (data as { error?: string } | null)?.error || `${name} HTTP ${resp.status}`;
    throw new Error(msg);
  }
  return data as T;
}

const FIVE_MIN = 5 * 60 * 1000;

export function useTvScreener(req: TvScreenerRequest, enabled = true) {
  return useQuery({
    queryKey: ["tv-screener", req],
    queryFn: () => callFn<TvScreenerResponse>("tv-screener", req),
    enabled: enabled && !!req.market,
    staleTime: FIVE_MIN,
    retry: 1,
  });
}

export const TV_MARKETS = [
  { id: "america", label: "Stocks", desc: "US equities" },
  { id: "forex", label: "FX", desc: "Currency pairs" },
  { id: "crypto", label: "Crypto", desc: "Cryptocurrencies" },
  { id: "bond", label: "Bonds", desc: "Fixed income" },
  { id: "futures", label: "Futures", desc: "Commodity & index futures" },
  { id: "uk", label: "UK", desc: "LSE equities" },
  { id: "germany", label: "Germany", desc: "XETRA" },
  { id: "france", label: "France", desc: "Euronext Paris" },
  { id: "japan", label: "Japan", desc: "TSE" },
  { id: "hongkong", label: "HK", desc: "HKEX" },
  { id: "china", label: "China", desc: "A-share / B-share" },
];

export const TV_PRESETS: Record<string, { label: string; desc: string; columns: string[]; filters: TvFilter[]; sortBy: string }> = {
  "market-cap": {
    label: "Mega Cap",
    desc: "Largest by market cap",
    columns: ["name", "close", "change", "volume", "market_cap_basic", "price_earnings_ttm", "number_of_employees", "sector"],
    filters: [{ left: "market_cap_basic", operation: "nempty" }],
    sortBy: "market_cap_basic",
  },
  gainers: {
    label: "Top Gainers",
    desc: "Highest % change today",
    columns: ["name", "close", "change", "change_from_open", "volume", "relative_volume_10d_calc"],
    filters: [{ left: "change", operation: "egreater", right: 0 }],
    sortBy: "change",
  },
  losers: {
    label: "Top Losers",
    desc: "Lowest % change today",
    columns: ["name", "close", "change", "change_from_open", "volume", "relative_volume_10d_calc"],
    filters: [{ left: "change", operation: "eless", right: 0 }],
    sortBy: "change",
  },
  volume: {
    label: "Volume Leaders",
    desc: "Highest absolute volume",
    columns: ["name", "close", "change", "volume", "relative_volume_10d_calc", "market_cap_basic"],
    filters: [{ left: "volume", operation: "nempty" }],
    sortBy: "volume",
  },
  volatility: {
    label: "High Volatility",
    desc: "Largest 20-day ATR %",
    columns: ["name", "close", "change", "Volatility.D", "average_true_range_percent_20", "market_cap_basic"],
    filters: [{ left: "Volatility.D", operation: "nempty" }],
    sortBy: "Volatility.D",
  },
  value: {
    label: "Value Screen",
    desc: "Low P/E, high dividend yield",
    columns: ["name", "close", "change", "price_earnings_ttm", "dividend_yield_recent", "market_cap_basic"],
    filters: [
      { left: "price_earnings_ttm", operation: "in_range", right: [0.5, 20] },
      { left: "market_cap_basic", operation: "egreater", right: 1e9 },
    ],
    sortBy: "price_earnings_ttm",
  },
  growth: {
    label: "Growth Screen",
    desc: "High revenue / EPS growth",
    columns: ["name", "close", "change", "revenue_growth_yoy", "eps_growth", "market_cap_basic"],
    filters: [{ left: "revenue_growth_yoy", operation: "egreater", right: 0.15 }],
    sortBy: "revenue_growth_yoy",
  },
  crypto: {
    label: "Crypto Top 100",
    desc: "Largest cryptocurrencies",
    columns: ["name", "close", "change", "volume", "market_cap_basic", "relative_volume_10d_calc"],
    filters: [{ left: "market_cap_basic", operation: "nempty" }],
    sortBy: "market_cap_basic",
  },
  forex: {
    label: "FX Majors",
    desc: "Major currency pairs",
    columns: ["name", "close", "change", "bid", "ask", "volume", "recommendation"],
    filters: [{ left: "name", operation: "match", right: "USD" }],
    sortBy: "volume",
  },
};

export const TV_COMMON_COLUMNS = [
  "name", "close", "change", "change_from_open", "open", "high", "low", "volume",
  "market_cap_basic", "price_earnings_ttm", "earnings_per_share_basic_ttm",
  "revenue_growth_yoy", "eps_growth", "dividend_yield_recent",
  "number_of_employees", "sector", "industry", "country",
  "Volatility.D", "average_true_range_percent_20",
  "relative_volume_10d_calc", "recommendation",
  "bid", "ask", "coupon", "yield", "maturity_date",
];

export function fmtCell(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "number") {
    if (Math.abs(v) >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
    if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
    if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
    if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
    return v.toFixed(4);
  }
  return String(v);
}

export function downloadCsv(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const header = cols.join(",");
  const lines = rows.map((r) =>
    cols
      .map((c) => {
        const v = r[c];
        const s = v == null ? "" : String(v);
        return `"${s.replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  const blob = new Blob(["\ufeff" + [header, ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

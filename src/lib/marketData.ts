import { useQuery, useQueries } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_URL = `https://oshfqmmhxaaevucfdunk.supabase.co/functions/v1`;

async function callFn<T>(name: string, params: Record<string, string | number>): Promise<T> {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString();
  const resp = await fetch(`${FUNCTIONS_URL}/${name}?${qs}`, {
    headers: {
      apikey: (supabase as any).supabaseKey ?? "",
    },
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`${name} ${resp.status}: ${txt.slice(0, 120)}`);
  }
  return resp.json();
}

export type QuotesResponse = {
  symbol: string;
  currency: string;
  lastPrice: number | null;
  annualVol: number;
  annualReturn: number;
  n: number;
  dates: string[];
  closes: number[];
  returns: number[];
};

export type FredResponse = {
  series_id: string;
  n: number;
  latest: number | null;
  latestDate: string | null;
  dates: string[];
  values: number[];
};

export type WorldBankSeries = {
  iso3: string;
  name: string;
  points: { date: string; value: number }[];
};
export type WorldBankResponse = {
  indicator: string;
  countries: string[];
  n: number;
  series: WorldBankSeries[];
};

export type FFRow = {
  date: string;
  mktRf: number;
  smb: number;
  hml: number;
  rmw: number;
  cma: number;
  rf: number;
};
export type FFResponse = {
  source: string;
  n: number;
  from: string;
  to: string;
  rows: FFRow[];
};

export type EcbBisResponse = {
  provider: "ecb" | "bis";
  flow: string;
  key: string;
  n: number;
  latest: number | null;
  latestDate: string | null;
  dates: string[];
  values: number[];
};

export type CoinGeckoResponse = {
  id: string;
  vs: string;
  n: number;
  lastPrice: number | null;
  latestDate: string | null;
  marketCap: number | null;
  totalVolume: number | null;
  annualVol: number;
  annualReturn: number;
  dates: string[];
  prices: number[];
};

export type AlphaVantageResponse = {
  kind: "equity" | "fx";
  symbol: string;
  n: number;
  lastPrice: number | null;
  latestDate: string | null;
  annualVol: number;
  annualReturn: number;
  dates: string[];
  closes: number[];
};

const FIVE_MIN = 5 * 60 * 1000;

export function useMarketQuotes(symbol: string, range = "5y", enabled = true) {
  return useQuery({
    queryKey: ["market-quotes", symbol, range],
    queryFn: () => callFn<QuotesResponse>("market-quotes", { symbol, range }),
    enabled: enabled && !!symbol,
    staleTime: FIVE_MIN,
    retry: 1,
  });
}

export function useFredSeries(seriesId: string, start = "2015-01-01", enabled = true) {
  return useQuery({
    queryKey: ["fred", seriesId, start],
    queryFn: () => callFn<FredResponse>("fred-series", { series_id: seriesId, start }),
    enabled: enabled && !!seriesId,
    staleTime: FIVE_MIN,
    retry: 1,
  });
}

export function useWorldBank(
  indicator: string,
  countries: string,
  start = "1990",
  enabled = true
) {
  return useQuery({
    queryKey: ["worldbank", indicator, countries, start],
    queryFn: () =>
      callFn<WorldBankResponse>("worldbank-series", { indicator, countries, start }),
    enabled: enabled && !!indicator && !!countries,
    staleTime: FIVE_MIN,
    retry: 1,
  });
}

export function useFamaFrench(months = 120, enabled = true) {
  return useQuery({
    queryKey: ["ff5", months],
    queryFn: () => callFn<FFResponse>("famafrench-factors", { months }),
    enabled,
    staleTime: FIVE_MIN,
    retry: 1,
  });
}

export function useEcbBisSeries(
  provider: "ecb" | "bis",
  flow: string,
  key: string,
  start = "2000-01-01",
  version = "1.0",
  enabled = true
) {
  return useQuery({
    queryKey: ["ecb-bis", provider, flow, key, start, version],
    queryFn: () =>
      callFn<EcbBisResponse>("ecb-bis-series", { provider, flow, key, start, version }),
    enabled: enabled && !!flow && !!key,
    staleTime: FIVE_MIN,
    retry: 1,
  });
}

export function useCoinGecko(id: string, vs = "usd", days = "365", enabled = true) {
  return useQuery({
    queryKey: ["coingecko", id, vs, days],
    queryFn: () => callFn<CoinGeckoResponse>("coingecko-series", { id, vs, days }),
    enabled: enabled && !!id,
    staleTime: FIVE_MIN,
    retry: 1,
  });
}

export function useAlphaVantage(
  kind: "equity" | "fx",
  params: { symbol?: string; from?: string; to?: string; output?: "compact" | "full" },
  enabled = true
) {
  const query: Record<string, string> = { kind, output: params.output || "compact" };
  if (kind === "equity") query.symbol = params.symbol || "AAPL";
  else {
    query.from = params.from || "EUR";
    query.to = params.to || "USD";
  }
  return useQuery({
    queryKey: ["alphavantage", kind, query.symbol, query.from, query.to, query.output],
    queryFn: () => callFn<AlphaVantageResponse>("alphavantage-series", query),
    enabled: enabled && (kind === "equity" ? !!query.symbol : !!query.from && !!query.to),
    staleTime: FIVE_MIN,
    retry: 1,
  });
}

/**
 * FRED constant-maturity Treasury (CMT) series → a snapshot yield curve.
 * Fetches each maturity's latest observation in parallel and returns the
 * points ready for Nelson-Siegel / Svensson fitting.
 */
export const FRED_CMT_SERIES: { id: string; tau: number; label: string }[] = [
  { id: "DGS1MO", tau: 1 / 12, label: "1M" },
  { id: "DGS3MO", tau: 0.25, label: "3M" },
  { id: "DGS6MO", tau: 0.5, label: "6M" },
  { id: "DGS1", tau: 1, label: "1Y" },
  { id: "DGS2", tau: 2, label: "2Y" },
  { id: "DGS3", tau: 3, label: "3Y" },
  { id: "DGS5", tau: 5, label: "5Y" },
  { id: "DGS7", tau: 7, label: "7Y" },
  { id: "DGS10", tau: 10, label: "10Y" },
  { id: "DGS20", tau: 20, label: "20Y" },
  { id: "DGS30", tau: 30, label: "30Y" },
];

export interface FredCurvePoint {
  tau: number;
  label: string;
  yield: number;
  date: string | null;
}

export function useFredYieldCurve(enabled = true) {
  const start = new Date(Date.now() - 60 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  const results = useQueries({
    queries: FRED_CMT_SERIES.map((s) => ({
      queryKey: ["fred-cmt", s.id, start],
      queryFn: () => callFn<FredResponse>("fred-series", { series_id: s.id, start }),
      enabled,
      staleTime: FIVE_MIN,
      retry: 1,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.every((r) => r.isError);
  const points: FredCurvePoint[] = results
    .map((r, i) => {
      const meta = FRED_CMT_SERIES[i];
      const v = r.data?.latest;
      if (v == null || !Number.isFinite(v)) return null;
      return { tau: meta.tau, label: meta.label, yield: v, date: r.data?.latestDate ?? null };
    })
    .filter((p): p is FredCurvePoint => p !== null);

  const latestDate = points.reduce<string | null>(
    (acc, p) => (p.date && (!acc || p.date > acc) ? p.date : acc),
    null
  );

  return { points, isLoading, isError, latestDate, refetch: () => results.forEach((r) => r.refetch()) };
}
import { useQuery } from "@tanstack/react-query";
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

export function useFamaFrench(months = 120, enabled = true) {
  return useQuery({
    queryKey: ["ff5", months],
    queryFn: () => callFn<FFResponse>("famafrench-factors", { months }),
    enabled,
    staleTime: FIVE_MIN,
    retry: 1,
  });
}
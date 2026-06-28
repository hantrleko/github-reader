/**
 * Unified real-price series loader. Wraps the three free price sources
 * (Yahoo Finance, CoinGecko, Alpha Vantage) behind one hook returning a
 * normalised { dates, prices } series so the Backtest / Calibration labs can
 * switch source without bespoke wiring.
 */
import { useMarketQuotes, useCoinGecko, useAlphaVantage } from "@/lib/marketData";

export type PriceSource = "yahoo" | "coingecko" | "alphavantage";

export interface PriceSeries {
  source: PriceSource;
  symbol: string;
  dates: string[];
  prices: number[];
  currency?: string;
}

export interface PriceSourceMeta {
  id: PriceSource;
  label: string;
  hint: string;
  placeholder: string;
  ranges: { v: string; label: string }[];
  defaultRange: string;
  defaultSymbol: string;
}

export const PRICE_SOURCES: PriceSourceMeta[] = [
  {
    id: "yahoo",
    label: "Yahoo Finance",
    hint: "股票 / ETF / 指数 / 期货,日频收盘",
    placeholder: "AAPL",
    ranges: [
      { v: "1y", label: "1Y" },
      { v: "2y", label: "2Y" },
      { v: "5y", label: "5Y" },
      { v: "10y", label: "10Y" },
    ],
    defaultRange: "5y",
    defaultSymbol: "AAPL",
  },
  {
    id: "coingecko",
    label: "CoinGecko",
    hint: "加密资产历史价格(用币种 id,如 bitcoin)",
    placeholder: "bitcoin",
    ranges: [
      { v: "90", label: "3M" },
      { v: "180", label: "6M" },
      { v: "365", label: "1Y" },
      { v: "max", label: "MAX" },
    ],
    defaultRange: "365",
    defaultSymbol: "bitcoin",
  },
  {
    id: "alphavantage",
    label: "Alpha Vantage",
    hint: "全球股票日线(免费档约 100 个交易日)",
    placeholder: "MSFT",
    ranges: [
      { v: "compact", label: "100D" },
      { v: "full", label: "FULL" },
    ],
    defaultRange: "compact",
    defaultSymbol: "MSFT",
  },
];

export const PRICE_SOURCE_MAP: Record<PriceSource, PriceSourceMeta> =
  Object.fromEntries(PRICE_SOURCES.map((s) => [s.id, s])) as Record<PriceSource, PriceSourceMeta>;

export interface UsePriceSeriesResult {
  series: PriceSeries | null;
  isFetching: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Load a normalised price series. Only the active source actually fires a
 * request (the other hooks stay disabled).
 */
export function usePriceSeries(
  source: PriceSource,
  symbol: string,
  range: string,
  enabled = true
): UsePriceSeriesResult {
  const yahoo = useMarketQuotes(symbol, range, enabled && source === "yahoo");
  const cg = useCoinGecko(symbol, "usd", range, enabled && source === "coingecko");
  const av = useAlphaVantage(
    "equity",
    { symbol, output: range === "full" ? "full" : "compact" },
    enabled && source === "alphavantage"
  );

  let series: PriceSeries | null = null;
  let isFetching = false;
  let error: unknown = null;
  let refetch: () => void = () => {};

  if (source === "yahoo") {
    isFetching = yahoo.isFetching;
    error = yahoo.error;
    refetch = yahoo.refetch;
    if (yahoo.data) {
      series = {
        source, symbol: yahoo.data.symbol, dates: yahoo.data.dates,
        prices: yahoo.data.closes, currency: yahoo.data.currency,
      };
    }
  } else if (source === "coingecko") {
    isFetching = cg.isFetching;
    error = cg.error;
    refetch = cg.refetch;
    if (cg.data) {
      series = {
        source, symbol: cg.data.id, dates: cg.data.dates,
        prices: cg.data.prices, currency: cg.data.vs?.toUpperCase(),
      };
    }
  } else {
    isFetching = av.isFetching;
    error = av.error;
    refetch = av.refetch;
    if (av.data) {
      series = {
        source, symbol: av.data.symbol, dates: av.data.dates,
        prices: av.data.closes,
      };
    }
  }

  return { series, isFetching, error, refetch };
}

/** Daily log returns from a price series. */
export function logReturns(prices: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > 0 && prices[i - 1] > 0) r.push(Math.log(prices[i] / prices[i - 1]));
  }
  return r;
}

/** Deterministic synthetic GBM series for offline / demo fallback. */
export function syntheticSeries(n = 504, mu = 0.08, sigma = 0.25, seed = 7): PriceSeries {
  let s = (seed >>> 0) || 1;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const dt = 1 / 252;
  const prices = [100];
  const dates: string[] = [];
  const start = new Date();
  start.setDate(start.getDate() - n);
  for (let i = 0; i < n; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
    if (i > 0) {
      const ret = (mu - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * gauss();
      prices.push(prices[i - 1] * Math.exp(ret));
    }
  }
  return { source: "yahoo", symbol: "DEMO*", dates, prices };
}
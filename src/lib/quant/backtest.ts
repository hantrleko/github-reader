/**
 * Backtest engine — pure, dependency-free single-asset (+ benchmark) strategy
 * backtester used by the Backtest Lab. All strategies are computed with a
 * one-bar execution lag (signal on day t-1 is applied to day t's return) to
 * avoid look-ahead bias. Returns an equity curve plus a full metric bundle.
 */

export type StrategyId =
  | "buyhold"
  | "sma"
  | "momentum"
  | "meanrev"
  | "voltarget";

export interface BacktestParams {
  /** SMA crossover */
  fast?: number;
  slow?: number;
  /** time-series momentum */
  lookback?: number;
  /** mean reversion z-score */
  window?: number;
  entryZ?: number;
  exitZ?: number;
  /** volatility targeting */
  targetVol?: number; // annualised, decimal
  volWindow?: number;
  maxLeverage?: number;
  /** allow short positions where the strategy supports it */
  allowShort?: boolean;
  /** one-way transaction cost in basis points (charged on |Δposition|) */
  costBps?: number;
  /** one-way slippage in basis points (added to the cost) */
  slippageBps?: number;
}

export interface BacktestMetrics {
  totalReturn: number;
  cagr: number;
  annReturn: number; // arithmetic annualised mean (bus μ)
  annVol: number; // annualised σ (bus sigma)
  sharpe: number;
  sortino: number;
  maxDrawdown: number; // negative number, e.g. -0.32
  calmar: number;
  winRate: number;
  turnover: number; // annualised average |Δposition|
  exposure: number; // fraction of days with a non-zero position
  nDays: number;
  costDrag: number; // gross CAGR − net CAGR (annualised cost bleed)
}

export interface BacktestResult {
  dates: string[];
  equity: number[];
  equityGross: number[];
  benchmark: number[];
  position: number[];
  drawdown: number[];
  metrics: BacktestMetrics;
}

const TRADING_DAYS = 252;

function mean(a: number[]): number {
  if (!a.length) return 0;
  return a.reduce((s, x) => s + x, 0) / a.length;
}

function std(a: number[]): number {
  if (a.length < 2) return 0;
  const m = mean(a);
  const v = a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1);
  return Math.sqrt(v);
}

function simpleReturns(prices: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < prices.length; i++) r.push(prices[i] / prices[i - 1] - 1);
  return r;
}

/** Trailing SMA at index i over `w` prices (returns NaN until enough data). */
function smaAt(prices: number[], i: number, w: number): number {
  if (i + 1 < w) return NaN;
  let s = 0;
  for (let k = i - w + 1; k <= i; k++) s += prices[k];
  return s / w;
}

/**
 * Compute the desired position for each price index (0..N-1).
 * Position is the *target* exposure decided using data up to and including
 * that bar; execution lag is applied later.
 */
export function strategyPositions(
  prices: number[],
  strategy: StrategyId,
  params: BacktestParams
): number[] {
  const n = prices.length;
  const pos = new Array<number>(n).fill(0);
  const shortMul = params.allowShort ? -1 : 0;

  if (strategy === "buyhold") return pos.fill(1);

  if (strategy === "sma") {
    const fast = Math.max(1, Math.round(params.fast ?? 20));
    const slow = Math.max(fast + 1, Math.round(params.slow ?? 60));
    for (let i = 0; i < n; i++) {
      const f = smaAt(prices, i, fast);
      const s = smaAt(prices, i, slow);
      if (Number.isNaN(f) || Number.isNaN(s)) continue;
      pos[i] = f > s ? 1 : shortMul;
    }
    return pos;
  }

  if (strategy === "momentum") {
    const lb = Math.max(2, Math.round(params.lookback ?? 120));
    for (let i = 0; i < n; i++) {
      if (i < lb) continue;
      const r = prices[i] / prices[i - lb] - 1;
      pos[i] = r > 0 ? 1 : shortMul;
    }
    return pos;
  }

  if (strategy === "meanrev") {
    const w = Math.max(5, Math.round(params.window ?? 20));
    const entry = params.entryZ ?? 1.5;
    const exit = params.exitZ ?? 0.5;
    let cur = 0;
    for (let i = 0; i < n; i++) {
      if (i + 1 < w) {
        pos[i] = 0;
        continue;
      }
      const win = prices.slice(i - w + 1, i + 1);
      const m = mean(win);
      const sd = std(win);
      const z = sd > 0 ? (prices[i] - m) / sd : 0;
      if (cur === 0) {
        if (z <= -entry) cur = 1;
        else if (z >= entry) cur = shortMul;
      } else if (Math.abs(z) <= exit) {
        cur = 0;
      }
      pos[i] = cur;
    }
    return pos;
  }

  if (strategy === "voltarget") {
    const w = Math.max(5, Math.round(params.volWindow ?? 20));
    const target = params.targetVol ?? 0.15;
    const maxLev = params.maxLeverage ?? 3;
    const rets = simpleReturns(prices); // length n-1, rets[i] ~ price index i+1
    for (let i = 0; i < n; i++) {
      if (i + 1 < w) continue;
      const win = rets.slice(Math.max(0, i - w), i); // returns up to bar i
      const realized = std(win) * Math.sqrt(TRADING_DAYS);
      pos[i] = realized > 1e-9 ? Math.min(maxLev, target / realized) : 0;
    }
    return pos;
  }

  return pos;
}

/** Maximum drawdown series from an equity curve (values are <= 0). */
function drawdownSeries(equity: number[]): { dd: number[]; maxDD: number } {
  let peak = -Infinity;
  let maxDD = 0;
  const dd: number[] = [];
  for (const e of equity) {
    peak = Math.max(peak, e);
    const d = e / peak - 1;
    dd.push(d);
    maxDD = Math.min(maxDD, d);
  }
  return { dd, maxDD };
}

/**
 * Run a backtest over a price series (closes). `dates` is optional and only
 * used to label the output; it must align 1:1 with `prices` when supplied.
 */
export function runBacktest(
  prices: number[],
  dates: string[] | undefined,
  strategy: StrategyId,
  params: BacktestParams = {}
): BacktestResult {
  const n = prices.length;
  if (n < 3) {
    return {
      dates: dates ?? [],
      equity: [1],
      equityGross: [1],
      benchmark: [1],
      position: [0],
      drawdown: [0],
      metrics: {
        totalReturn: 0, cagr: 0, annReturn: 0, annVol: 0, sharpe: 0,
        sortino: 0, maxDrawdown: 0, calmar: 0, winRate: 0, turnover: 0,
        exposure: 0, nDays: n, costDrag: 0,
      },
    };
  }

  const pos = strategyPositions(prices, strategy, params);
  const rets = simpleReturns(prices); // length n-1; rets[t-1] is return from t-1→t
  const rate = ((params.costBps ?? 0) + (params.slippageBps ?? 0)) / 1e4;

  const equity: number[] = [1];
  const equityGross: number[] = [1];
  const benchmark: number[] = [1];
  const stratRets: number[] = [];
  let turnoverSum = 0;
  let exposedDays = 0;

  for (let t = 1; t < n; t++) {
    const used = pos[t - 1] ?? 0; // execution lag
    const r = rets[t - 1];
    const dPos = Math.abs((pos[t - 1] ?? 0) - (pos[t - 2] ?? 0));
    const tcost = dPos * rate;
    const srGross = used * r;
    const sr = srGross - tcost;
    stratRets.push(sr);
    equity.push(equity[equity.length - 1] * (1 + sr));
    equityGross.push(equityGross[equityGross.length - 1] * (1 + srGross));
    benchmark.push(benchmark[benchmark.length - 1] * (1 + r));
    turnoverSum += Math.abs((pos[t - 1] ?? 0) - (pos[t - 2] ?? 0));
    if (Math.abs(used) > 1e-9) exposedDays++;
  }

  const { dd, maxDD } = drawdownSeries(equity);
  const years = (n - 1) / TRADING_DAYS;
  const last = equity[equity.length - 1];
  const lastGross = equityGross[equityGross.length - 1];
  const totalReturn = last - 1;
  const cagr = years > 0 && last > 0 ? Math.pow(last, 1 / years) - 1 : 0;
  const cagrGross = years > 0 && lastGross > 0 ? Math.pow(lastGross, 1 / years) - 1 : 0;
  const annVol = std(stratRets) * Math.sqrt(TRADING_DAYS);
  const annReturn = mean(stratRets) * TRADING_DAYS;
  const sharpe = annVol > 1e-9 ? annReturn / annVol : 0;
  const downside = stratRets.filter((x) => x < 0);
  const downStd = std(downside) * Math.sqrt(TRADING_DAYS);
  const sortino = downStd > 1e-9 ? annReturn / downStd : 0;
  const nonzero = stratRets.filter((x) => Math.abs(x) > 1e-12);
  const winRate = nonzero.length ? nonzero.filter((x) => x > 0).length / nonzero.length : 0;
  const turnover = (turnoverSum / (n - 1)) * TRADING_DAYS;
  const exposure = exposedDays / (n - 1);
  const calmar = maxDD < -1e-9 ? cagr / Math.abs(maxDD) : 0;

  return {
    dates: dates ?? prices.map((_, i) => String(i)),
    equity,
    equityGross,
    benchmark,
    position: pos,
    drawdown: dd,
    metrics: {
      totalReturn, cagr, annReturn, annVol, sharpe, sortino,
      maxDrawdown: maxDD, calmar, winRate, turnover, exposure, nDays: n,
      costDrag: cagrGross - cagr,
    },
  };
}

/* ───────────────────────── parameter grid scan ───────────────────────── */
export type ScanMetric = "sharpe" | "cagr" | "calmar" | "maxDrawdown" | "annVol" | "sortino";

export interface GridScanOpts {
  xParam: keyof BacktestParams;
  xValues: number[];
  yParam: keyof BacktestParams;
  yValues: number[];
  metric: ScanMetric;
  base?: BacktestParams;
}

export interface GridScanResult {
  xParam: keyof BacktestParams;
  yParam: keyof BacktestParams;
  xValues: number[];
  yValues: number[];
  metric: ScanMetric;
  grid: number[][]; // grid[yi][xi]
  best: { x: number; y: number; value: number };
}

/**
 * Sweep two strategy parameters over a grid and record one performance metric
 * per cell — used to visualise robustness / over-fitting as a heatmap.
 */
export function gridScan(
  prices: number[],
  dates: string[] | undefined,
  strategy: StrategyId,
  opts: GridScanOpts
): GridScanResult {
  const grid: number[][] = [];
  let best = { x: opts.xValues[0], y: opts.yValues[0], value: -Infinity };
  for (const yv of opts.yValues) {
    const row: number[] = [];
    for (const xv of opts.xValues) {
      const p: BacktestParams = { ...(opts.base ?? {}), [opts.xParam]: xv, [opts.yParam]: yv };
      const res = runBacktest(prices, dates, strategy, p);
      const value = res.metrics[opts.metric];
      row.push(value);
      // maxDrawdown is negative: "best" = closest to zero (handled by max since values <= 0)
      if (value > best.value) best = { x: xv, y: yv, value };
    }
    grid.push(row);
  }
  return { xParam: opts.xParam, yParam: opts.yParam, xValues: opts.xValues, yValues: opts.yValues, metric: opts.metric, grid, best };
}

/* ───────────────────────── bootstrap risk cone ───────────────────────── */
export interface BootstrapConeResult {
  /** horizon in bars (x axis) */
  horizon: number[];
  /** percentile bands of terminal equity path, each length = horizon.length */
  p5: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p95: number[];
  /** distribution of terminal wealth across simulations */
  terminal: { p5: number; p50: number; p95: number; probLoss: number };
  nSims: number;
}

/** Mulberry32 deterministic PRNG so results are reproducible & testable. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Block-bootstrap the strategy's daily net returns to build a forward-looking
 * risk cone: resample blocks (preserving short-range autocorrelation), rebuild
 * equity paths and report P5/P25/P50/P75/P95 bands plus terminal stats.
 */
export function bootstrapCone(
  strategyReturns: number[],
  opts: { horizon?: number; nSims?: number; blockSize?: number; seed?: number } = {}
): BootstrapConeResult {
  const horizon = Math.max(10, Math.min(opts.horizon ?? 252, 2520));
  const nSims = Math.max(50, Math.min(opts.nSims ?? 500, 5000));
  const block = Math.max(1, Math.min(opts.blockSize ?? 10, 60));
  const rnd = mulberry32(opts.seed ?? 42);
  const r = strategyReturns.filter((x) => isFinite(x));
  if (r.length < 20) {
    const flat = Array.from({ length: horizon }, () => 1);
    const h = Array.from({ length: horizon }, (_, i) => i + 1);
    return { horizon: h, p5: flat, p25: flat, p50: flat, p75: flat, p95: flat, terminal: { p5: 1, p50: 1, p95: 1, probLoss: 0 }, nSims: 0 };
  }

  // paths[s][t] = equity at t for sim s
  const paths: number[][] = [];
  for (let s = 0; s < nSims; s++) {
    const path: number[] = new Array(horizon);
    let eq = 1;
    let t = 0;
    while (t < horizon) {
      const start = Math.floor(rnd() * r.length);
      for (let b = 0; b < block && t < horizon; b++, t++) {
        eq *= 1 + r[(start + b) % r.length];
        path[t] = eq;
      }
    }
    paths.push(path);
  }

  const q = (arr: number[], p: number): number => {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
    return sorted[idx];
  };

  const h: number[] = [], p5: number[] = [], p25: number[] = [], p50: number[] = [], p75: number[] = [], p95: number[] = [];
  // Sample ~60 points along the horizon to keep the chart light
  const step = Math.max(1, Math.floor(horizon / 60));
  for (let t = step - 1; t < horizon; t += step) {
    const cross = paths.map((p) => p[t]);
    h.push(t + 1);
    p5.push(q(cross, 0.05));
    p25.push(q(cross, 0.25));
    p50.push(q(cross, 0.5));
    p75.push(q(cross, 0.75));
    p95.push(q(cross, 0.95));
  }

  const terminals = paths.map((p) => p[horizon - 1]);
  const probLoss = terminals.filter((x) => x < 1).length / terminals.length;

  return {
    horizon: h, p5, p25, p50, p75, p95,
    terminal: { p5: q(terminals, 0.05), p50: q(terminals, 0.5), p95: q(terminals, 0.95), probLoss },
    nSims,
  };
}

/* ───────────────────────── monthly returns ───────────────────────── */
export interface MonthlyReturnsResult {
  years: number[]; // descending
  /** matrix[yearIdx][month 0..11] = monthly return, or null when missing */
  matrix: (number | null)[][];
}

/**
 * Aggregate an equity curve into a year×month return matrix. `dates` must align
 * 1:1 with `equity`; months are bucketed by the last available equity value.
 */
export function monthlyReturns(dates: string[], equity: number[]): MonthlyReturnsResult {
  if (dates.length !== equity.length || equity.length < 2) return { years: [], matrix: [] };
  // last equity value per (year, month)
  const lastByKey = new Map<string, { e: number; year: number; month: number; order: number }>();
  for (let i = 0; i < dates.length; i++) {
    const d = new Date(dates[i]);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    const key = year + "-" + month;
    lastByKey.set(key, { e: equity[i], year, month, order: year * 12 + month });
  }
  const buckets = [...lastByKey.values()].sort((a, b) => a.order - b.order);
  const yearsSet = new Set<number>();
  const monthRet = new Map<string, number>();
  let prevE = equity[0];
  for (const b of buckets) {
    const ret = prevE > 0 ? b.e / prevE - 1 : 0;
    monthRet.set(b.year + "-" + b.month, ret);
    yearsSet.add(b.year);
    prevE = b.e;
  }
  const years = [...yearsSet].sort((a, b) => b - a);
  const matrix = years.map((y) =>
    Array.from({ length: 12 }, (_, mo) => (monthRet.has(y + "-" + mo) ? (monthRet.get(y + "-" + mo) as number) : null))
  );
  return { years, matrix };
}
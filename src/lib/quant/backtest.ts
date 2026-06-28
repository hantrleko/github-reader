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
}

export interface BacktestResult {
  dates: string[];
  equity: number[];
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
      benchmark: [1],
      position: [0],
      drawdown: [0],
      metrics: {
        totalReturn: 0, cagr: 0, annReturn: 0, annVol: 0, sharpe: 0,
        sortino: 0, maxDrawdown: 0, calmar: 0, winRate: 0, turnover: 0,
        exposure: 0, nDays: n,
      },
    };
  }

  const pos = strategyPositions(prices, strategy, params);
  const rets = simpleReturns(prices); // length n-1; rets[t-1] is return from t-1→t

  const equity: number[] = [1];
  const benchmark: number[] = [1];
  const stratRets: number[] = [];
  let turnoverSum = 0;
  let exposedDays = 0;

  for (let t = 1; t < n; t++) {
    const used = pos[t - 1] ?? 0; // execution lag
    const r = rets[t - 1];
    const sr = used * r;
    stratRets.push(sr);
    equity.push(equity[equity.length - 1] * (1 + sr));
    benchmark.push(benchmark[benchmark.length - 1] * (1 + r));
    turnoverSum += Math.abs((pos[t - 1] ?? 0) - (pos[t - 2] ?? 0));
    if (Math.abs(used) > 1e-9) exposedDays++;
  }

  const { dd, maxDD } = drawdownSeries(equity);
  const years = (n - 1) / TRADING_DAYS;
  const last = equity[equity.length - 1];
  const totalReturn = last - 1;
  const cagr = years > 0 && last > 0 ? Math.pow(last, 1 / years) - 1 : 0;
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
    benchmark,
    position: pos,
    drawdown: dd,
    metrics: {
      totalReturn, cagr, annReturn, annVol, sharpe, sortino,
      maxDrawdown: maxDD, calmar, winRate, turnover, exposure, nDays: n,
    },
  };
}
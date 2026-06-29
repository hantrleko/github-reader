/**
 * Portfolio library — pure, dependency-free multi-asset allocation and
 * backtest engine used by the Backtest Lab's portfolio view.
 *
 * Covers four allocation schemes (equal weight, risk parity / ERC, long-only
 * minimum variance, long-only mean-variance / tangency), a rebalancing
 * backtest with proportional transaction costs, and risk-contribution
 * decomposition (MCR / PCR). All weights are long-only and sum to 1.
 */

const TRADING_DAYS = 252;

export type AllocMethod = "equal" | "riskparity" | "minvar" | "meanvar";
export type RebalanceFreq = "none" | "monthly" | "quarterly" | "yearly";

/* ───────────────────────── basic stats / linear algebra ───────────────────────── */
function mean(a: number[]): number {
  if (!a.length) return 0;
  return a.reduce((s, x) => s + x, 0) / a.length;
}

/** Per-asset simple returns from a price matrix (rows = assets). */
export function returnsFromPrices(pricesByAsset: number[][]): number[][] {
  return pricesByAsset.map((p) => {
    const r: number[] = [];
    for (let i = 1; i < p.length; i++) r.push(p[i] / p[i - 1] - 1);
    return r;
  });
}

/** Annualised mean-return vector from a returns matrix (rows = assets). */
export function meanVector(returnsByAsset: number[][], annualise = true): number[] {
  const k = annualise ? TRADING_DAYS : 1;
  return returnsByAsset.map((r) => mean(r) * k);
}

/** Sample covariance matrix from a returns matrix (rows = assets, equal length). */
export function covMatrix(returnsByAsset: number[][], annualise = true): number[][] {
  const n = returnsByAsset.length;
  const T = Math.min(...returnsByAsset.map((r) => r.length));
  const k = annualise ? TRADING_DAYS : 1;
  const mu = returnsByAsset.map((r) => mean(r.slice(0, T)));
  const cov: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let s = 0;
      for (let t = 0; t < T; t++) s += (returnsByAsset[i][t] - mu[i]) * (returnsByAsset[j][t] - mu[j]);
      const v = (T > 1 ? s / (T - 1) : 0) * k;
      cov[i][j] = v;
      cov[j][i] = v;
    }
  }
  return cov;
}

export function correlationFromCov(cov: number[][]): number[][] {
  const n = cov.length;
  const sd = cov.map((row, i) => Math.sqrt(Math.max(row[i], 0)));
  return cov.map((row, i) =>
    row.map((c, j) => (sd[i] > 0 && sd[j] > 0 ? c / (sd[i] * sd[j]) : i === j ? 1 : 0))
  );
}

function matVec(A: number[][], v: number[]): number[] {
  return A.map((row) => row.reduce((s, x, j) => s + x * v[j], 0));
}

function invertMatrix(A: number[][]): number[][] {
  const n = A.length;
  const M = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let i = 0; i < n; i++) {
    let mx = Math.abs(M[i][i]), pi = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > mx) { mx = Math.abs(M[k][i]); pi = k; }
    if (pi !== i) [M[i], M[pi]] = [M[pi], M[i]];
    if (Math.abs(M[i][i]) < 1e-12) M[i][i] = M[i][i] >= 0 ? 1e-12 : -1e-12;
    const piv = M[i][i];
    for (let j = 0; j < 2 * n; j++) M[i][j] /= piv;
    for (let k = 0; k < n; k++) if (k !== i) {
      const f = M[k][i];
      for (let j = 0; j < 2 * n; j++) M[k][j] -= f * M[i][j];
    }
  }
  return M.map((row) => row.slice(n));
}

/** Euclidean projection of a vector onto the probability simplex (w>=0, Σw=1). */
function projectSimplex(v: number[]): number[] {
  const n = v.length;
  if (!n) return [];
  const u = [...v].sort((a, b) => b - a);
  let css = 0, rho = -1;
  const cs: number[] = [];
  for (let i = 0; i < n; i++) { css += u[i]; cs.push(css); }
  for (let i = 0; i < n; i++) {
    if (u[i] + (1 - cs[i]) / (i + 1) > 0) rho = i;
  }
  const theta = rho >= 0 ? (cs[rho] - 1) / (rho + 1) : 0;
  return v.map((x) => Math.max(x - theta, 0));
}

function normalize(w: number[]): number[] {
  const s = w.reduce((a, b) => a + b, 0);
  return s > 0 ? w.map((x) => x / s) : w.map(() => 1 / w.length);
}

/* ───────────────────────── allocation schemes ───────────────────────── */
export function equalWeight(n: number): number[] {
  return new Array(n).fill(1 / n);
}

/** Long-only Equal-Risk-Contribution (risk parity) via fixed-point iteration. */
export function riskParityWeights(cov: number[][], iters = 500): number[] {
  const n = cov.length;
  let w = equalWeight(n);
  for (let it = 0; it < iters; it++) {
    const mrc = matVec(cov, w); // marginal (Σw)_i
    const next = w.map((wi, i) => (mrc[i] > 1e-12 ? wi / mrc[i] : wi));
    const nw = normalize(next);
    let diff = 0;
    for (let i = 0; i < n; i++) diff += Math.abs(nw[i] - w[i]);
    w = nw;
    if (diff < 1e-10) break;
  }
  return w;
}

/** Long-only minimum-variance via projected-gradient descent. */
export function minVarianceWeights(cov: number[][], iters = 2000): number[] {
  const n = cov.length;
  let w = equalWeight(n);
  // step size ~ 1 / (2 * largest diagonal) keeps the gradient step stable
  const lmax = Math.max(...cov.map((r, i) => Math.abs(r[i]))) || 1;
  const step = 1 / (4 * lmax + 1e-9);
  for (let it = 0; it < iters; it++) {
    const grad = matVec(cov, w).map((g) => 2 * g);
    const moved = w.map((wi, i) => wi - step * grad[i]);
    const nw = projectSimplex(moved);
    let diff = 0;
    for (let i = 0; i < n; i++) diff += Math.abs(nw[i] - w[i]);
    w = nw;
    if (diff < 1e-12) break;
  }
  return w;
}

/**
 * Long-only mean-variance / tangency weights. Starts from the unconstrained
 * tangency solution Σ⁻¹μ then projects onto the simplex (drops shorts).
 */
export function meanVarianceWeights(cov: number[][], mu: number[]): number[] {
  const n = cov.length;
  try {
    const inv = invertMatrix(cov);
    const raw = matVec(inv, mu);
    const s = raw.reduce((a, b) => a + b, 0);
    const tangency = Math.abs(s) > 1e-12 ? raw.map((x) => x / s) : equalWeight(n);
    return projectSimplex(tangency);
  } catch {
    return equalWeight(n);
  }
}

export function weightsFor(method: AllocMethod, cov: number[][], mu: number[]): number[] {
  switch (method) {
    case "equal": return equalWeight(cov.length);
    case "riskparity": return riskParityWeights(cov);
    case "minvar": return minVarianceWeights(cov);
    case "meanvar": return meanVarianceWeights(cov, mu);
  }
}

/* ───────────────────────── risk contributions ───────────────────────── */
export interface RiskContribution {
  weight: number;
  mcr: number; // marginal risk contribution
  pcr: number; // percentage of total risk
}

export function riskContributions(cov: number[][], w: number[]): { sigma: number; rows: RiskContribution[] } {
  const Sw = matVec(cov, w);
  const variance = w.reduce((s, wi, i) => s + wi * Sw[i], 0);
  const sigma = Math.sqrt(Math.max(variance, 0));
  const rows = w.map((wi, i) => {
    const mcr = sigma > 1e-12 ? Sw[i] / sigma : 0;
    const contrib = wi * mcr; // absolute risk contribution
    return { weight: wi, mcr, pcr: sigma > 1e-12 ? contrib / sigma : 0 };
  });
  return { sigma, rows };
}

/* ───────────────────────── series alignment ───────────────────────── */
export interface AlignedSeries {
  dates: string[];
  symbols: string[];
  pricesByAsset: number[][]; // rows = assets, aligned to `dates`
}

/** Align several {symbol, dates, prices} series on their common dates. */
export function alignSeries(
  inputs: { symbol: string; dates: string[]; prices: number[] }[]
): AlignedSeries {
  const valid = inputs.filter((s) => s.dates.length && s.prices.length);
  if (!valid.length) return { dates: [], symbols: [], pricesByAsset: [] };
  const maps = valid.map((s) => {
    const m = new Map<string, number>();
    s.dates.forEach((d, i) => { if (Number.isFinite(s.prices[i])) m.set(d, s.prices[i]); });
    return m;
  });
  const common = valid[0].dates.filter((d) => maps.every((m) => m.has(d)));
  const dates = common.sort();
  return {
    dates,
    symbols: valid.map((s) => s.symbol),
    pricesByAsset: maps.map((m) => dates.map((d) => m.get(d) as number)),
  };
}

/* ───────────────────────── rebalancing backtest ───────────────────────── */
export interface PortfolioParams {
  method: AllocMethod;
  rebalance: RebalanceFreq;
  /** trailing window (days) used to estimate cov/μ at each rebalance */
  estWindow?: number;
  /** one-way transaction cost + slippage in basis points (charged on turnover) */
  costBps?: number;
}

export interface PortfolioMetrics {
  totalReturn: number;
  cagr: number;
  annReturn: number;
  annVol: number;
  sharpe: number;
  maxDrawdown: number;
  calmar: number;
  turnover: number; // annualised
  costDrag: number; // gross CAGR − net CAGR
}

export interface PortfolioResult {
  dates: string[];
  equity: number[]; // net of costs
  benchmark: number[]; // equal-weight, costless
  weightHistory: number[][]; // [time][asset], aligned to dates
  finalWeights: number[];
  targetWeights: number[]; // latest target (static full-sample estimate)
  metrics: PortfolioMetrics;
}

function isRebalance(prevDate: string, date: string, freq: RebalanceFreq): boolean {
  if (freq === "none") return false;
  const a = new Date(prevDate), b = new Date(date);
  if (freq === "monthly") return a.getUTCMonth() !== b.getUTCMonth() || a.getUTCFullYear() !== b.getUTCFullYear();
  if (freq === "quarterly") {
    const qa = Math.floor(a.getUTCMonth() / 3), qb = Math.floor(b.getUTCMonth() / 3);
    return qa !== qb || a.getUTCFullYear() !== b.getUTCFullYear();
  }
  return a.getUTCFullYear() !== b.getUTCFullYear();
}

function drawdown(equity: number[]): number {
  let peak = -Infinity, maxDD = 0;
  for (const e of equity) { peak = Math.max(peak, e); maxDD = Math.min(maxDD, e / peak - 1); }
  return maxDD;
}

/**
 * Run a long-only rebalancing portfolio backtest. Weights are re-estimated on
 * the trailing `estWindow` of returns at each rebalance (no look-ahead) and
 * drift with prices between rebalances; turnover is charged at `costBps`.
 */
export function runPortfolioBacktest(aligned: AlignedSeries, params: PortfolioParams): PortfolioResult {
  const { dates, pricesByAsset } = aligned;
  const n = pricesByAsset.length;
  const T = dates.length;
  const rate = (params.costBps ?? 0) / 1e4;
  const estWindow = Math.max(20, params.estWindow ?? 252);

  if (n === 0 || T < 5) {
    return {
      dates, equity: [1], benchmark: [1], weightHistory: [], finalWeights: equalWeight(Math.max(n, 1)),
      targetWeights: equalWeight(Math.max(n, 1)),
      metrics: { totalReturn: 0, cagr: 0, annReturn: 0, annVol: 0, sharpe: 0, maxDrawdown: 0, calmar: 0, turnover: 0, costDrag: 0 },
    };
  }

  // per-day asset returns: assetRet[t][i], t in 1..T-1
  const assetRet: number[][] = [];
  for (let t = 1; t < T; t++) {
    assetRet.push(pricesByAsset.map((p) => p[t] / p[t - 1] - 1));
  }

  const computeWeights = (uptoIdx: number): number[] => {
    const lo = Math.max(0, uptoIdx - estWindow);
    const window = pricesByAsset.map((p) => {
      const sl = p.slice(lo, uptoIdx + 1);
      const r: number[] = [];
      for (let i = 1; i < sl.length; i++) r.push(sl[i] / sl[i - 1] - 1);
      return r;
    });
    if (window[0].length < 5) return equalWeight(n);
    const cov = covMatrix(window);
    const mu = meanVector(window);
    return weightsFor(params.method, cov, mu);
  };

  let weights: number[] | null = null;
  const equity = [1], equityGross = [1], benchmark = [1];
  const stratRets: number[] = [];
  const weightHistory: number[][] = [];
  let turnoverSum = 0;
  const ew = equalWeight(n);

  for (let t = 1; t < T; t++) {
    const r = assetRet[t - 1];
    const needRebal = weights === null || isRebalance(dates[t - 1], dates[t], params.rebalance);
    if (needRebal) {
      const target = computeWeights(t - 1);
      const prev = weights ?? new Array(n).fill(0);
      const turnover = target.reduce((s, w, i) => s + Math.abs(w - prev[i]), 0);
      turnoverSum += turnover;
      const cost = turnover * rate;
      equity[equity.length - 1] *= (1 - cost);
      weights = target;
    }
    const w = weights as number[];
    const portRet = w.reduce((s, wi, i) => s + wi * r[i], 0);
    const grossRet = portRet;
    stratRets.push(portRet);
    equity.push(equity[equity.length - 1] * (1 + portRet));
    equityGross.push(equityGross[equityGross.length - 1] * (1 + grossRet));
    benchmark.push(benchmark[benchmark.length - 1] * (1 + ew.reduce((s, wi, i) => s + wi * r[i], 0)));
    // drift weights with realised returns
    const drifted = w.map((wi, i) => wi * (1 + r[i]));
    const ds = drifted.reduce((a, b) => a + b, 0);
    weights = ds > 0 ? drifted.map((x) => x / ds) : w;
    weightHistory.push([...weights]);
  }

  const years = (T - 1) / TRADING_DAYS;
  const last = equity[equity.length - 1];
  const lastGross = equityGross[equityGross.length - 1];
  const m = mean(stratRets);
  const sd = Math.sqrt(stratRets.reduce((s, x) => s + (x - m) * (x - m), 0) / Math.max(stratRets.length - 1, 1));
  const annVol = sd * Math.sqrt(TRADING_DAYS);
  const annReturn = m * TRADING_DAYS;
  const cagr = years > 0 && last > 0 ? Math.pow(last, 1 / years) - 1 : 0;
  const cagrGross = years > 0 && lastGross > 0 ? Math.pow(lastGross, 1 / years) - 1 : 0;
  const maxDD = drawdown(equity);

  return {
    dates,
    equity,
    benchmark,
    weightHistory,
    finalWeights: weights ?? ew,
    targetWeights: computeWeights(T - 1),
    metrics: {
      totalReturn: last - 1,
      cagr,
      annReturn,
      annVol,
      sharpe: annVol > 1e-9 ? annReturn / annVol : 0,
      maxDrawdown: maxDD,
      calmar: maxDD < -1e-9 ? cagr / Math.abs(maxDD) : 0,
      turnover: (turnoverSum / (T - 1)) * TRADING_DAYS,
      costDrag: cagrGross - cagr,
    },
  };
}

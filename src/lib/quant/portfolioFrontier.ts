/**
 * Portfolio frontier library (V5.6) — pure, dependency-free implementations of
 * the classical / equilibrium / execution / dynamic layers of portfolio theory
 * that complement `portfolio.ts` (allocation + backtest) and
 * `portfolioAdvanced.ts` (Black-Litterman, CVaR, shrinkage, Kelly).
 *
 * Covers: mean-variance frontier geometry & two-fund separation, zero-beta
 * CAPM under restricted borrowing, the Sharpe single-index model, estimation
 * error in rolling optimisation, constraints & rebalancing cost, active
 * management (Grinold fundamental law, Treynor-Black), downside risk &
 * stochastic dominance, multi-period / Merton dynamic allocation, and
 * high-dimensional regularisation with maximum diversification.
 */

import { invertMatrix, matVec, projectSimplex } from "./portfolioAdvanced";

/* ───────────────────────── helpers ───────────────────────── */

export function makeRng(seed: number) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function gauss(r: () => number): number {
  let u = 0, v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const sd = (a: number[]) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
};
export const portVariance = (w: number[], cov: number[][]) => dot(w, matVec(cov, w));
export const portSigma = (w: number[], cov: number[][]) => Math.sqrt(Math.max(portVariance(w, cov), 0));

/* ═══════════════ 1. Frontier geometry & two-fund separation ═══════════════ */

export interface FrontierGeometry {
  A: number; B: number; C: number; D: number;
  /** frontier hyperbola sampled over target returns */
  curve: { ret: number; vol: number; efficient: boolean }[];
  gmv: { ret: number; vol: number; weights: number[] };
  tangency: { ret: number; vol: number; sharpe: number; weights: number[] } | null;
  /** capital allocation line, truncated at the leverage cap */
  cal: { ret: number; vol: number }[];
  /** zero-beta companion of the tangency (or of the reference frontier port) */
  zeroBeta: { ret: number; vol: number; weights: number[] } | null;
  /** security-market-line intercept implied by the frontier portfolio used */
  assets: { ret: number; vol: number; beta: number }[];
  /** long-only efficient frontier (projected), for the constrained overlay */
  constrained: { ret: number; vol: number }[];
}

/** Analytic mean-variance frontier: σ²(m) = (A m² − 2 B m + C)/D. */
export function frontierGeometry(
  mu: number[], cov: number[][], rf: number, leverageCap = 2, points = 60
): FrontierGeometry {
  const n = mu.length;
  const ones = new Array(n).fill(1);
  const inv = invertMatrix(cov);
  const iOne = matVec(inv, ones);
  const iMu = matVec(inv, mu);
  const A = dot(ones, iOne);
  const B = dot(ones, iMu);
  const C = dot(mu, iMu);
  const D = A * C - B * B;

  const wFor = (m: number): number[] => {
    // w(m) = [ (C − B m) Σ⁻¹1 + (A m − B) Σ⁻¹μ ] / D
    const k1 = (C - B * m) / D, k2 = (A * m - B) / D;
    return iOne.map((x, i) => k1 * x + k2 * iMu[i]);
  };
  const volFor = (m: number) => Math.sqrt(Math.max((A * m * m - 2 * B * m + C) / D, 0));

  const gmvRet = B / A;
  const gmvW = iOne.map((x) => x / A);
  const lo = gmvRet - 1.6 * Math.max(...mu.map((m) => Math.abs(m - gmvRet)), 0.02);
  const hi = gmvRet + 1.8 * Math.max(...mu.map((m) => Math.abs(m - gmvRet)), 0.02);
  const curve = Array.from({ length: points }, (_, i) => {
    const m = lo + ((hi - lo) * i) / (points - 1);
    return { ret: m, vol: volFor(m), efficient: m >= gmvRet };
  });

  // tangency exists only when the CAL is well defined (B − A·rf ≠ 0)
  const den = B - A * rf;
  let tangency: FrontierGeometry["tangency"] = null;
  if (Math.abs(den) > 1e-10) {
    const raw = mu.map((m) => m - rf);
    const wt0 = matVec(inv, raw);
    const s = wt0.reduce((a, b) => a + b, 0);
    if (Math.abs(s) > 1e-12) {
      const w = wt0.map((x) => x / s);
      const ret = dot(w, mu), vol = portSigma(w, cov);
      tangency = { ret, vol, sharpe: vol > 1e-12 ? (ret - rf) / vol : 0, weights: w };
    }
  }

  const cal = tangency
    ? Array.from({ length: points }, (_, i) => {
        const k = (leverageCap * i) / (points - 1);
        return { ret: rf + k * (tangency!.ret - rf), vol: k * tangency!.vol };
      })
    : [];

  // zero-beta companion of the reference frontier portfolio (tangency if it
  // exists, otherwise the max-return frontier point): cov(p,z) = 0.
  const refRet = tangency ? tangency.ret : hi;
  let zeroBeta: FrontierGeometry["zeroBeta"] = null;
  if (Math.abs(refRet - gmvRet) > 1e-10 && Math.abs(A) > 1e-12) {
    const mz = gmvRet - D / (A * A * (refRet - gmvRet));
    const wz = wFor(mz);
    zeroBeta = { ret: mz, vol: volFor(mz), weights: wz };
  }

  const refW = tangency ? tangency.weights : wFor(refRet);
  const refVar = Math.max(portVariance(refW, cov), 1e-16);
  const covRow = matVec(cov, refW);
  const assets = mu.map((m, i) => ({
    ret: m,
    vol: Math.sqrt(Math.max(cov[i][i], 0)),
    beta: covRow[i] / refVar,
  }));

  // long-only frontier: minimise variance subject to target return
  const constrained = Array.from({ length: 40 }, (_, i) => {
    const m = Math.min(...mu) + ((Math.max(...mu) - Math.min(...mu)) * i) / 39;
    const w = longOnlyTargetReturn(mu, cov, m);
    return { ret: dot(w, mu), vol: portSigma(w, cov) };
  });

  return { A, B, C, D, curve, gmv: { ret: gmvRet, vol: volFor(gmvRet), weights: gmvW }, tangency, cal, zeroBeta, assets, constrained };
}

/** Long-only min-variance with a target return, via penalised projected gradient. */
export function longOnlyTargetReturn(mu: number[], cov: number[][], target: number, iters = 1500): number[] {
  const n = mu.length;
  let w = new Array(n).fill(1 / n);
  const lmax = Math.max(...cov.map((r, i) => Math.abs(r[i]))) || 1;
  const step = 1 / (8 * lmax + 1e-9);
  const pen = 50 * lmax;
  for (let it = 0; it < iters; it++) {
    const g1 = matVec(cov, w).map((g) => 2 * g);
    const gap = dot(w, mu) - target;
    const grad = g1.map((g, i) => g + 2 * pen * gap * mu[i]);
    const nw = projectSimplex(w.map((x, i) => x - step * grad[i]));
    let diff = 0;
    for (let i = 0; i < n; i++) diff += Math.abs(nw[i] - w[i]);
    w = nw;
    if (diff < 1e-12) break;
  }
  return w;
}

/* ═══════════════ 2. Single-index / multi-index dimension reduction ═══════════════ */

export interface SingleIndexResult {
  betas: number[];
  idioVar: number[];
  r2: number[];
  marketVar: number;
  covSample: number[][];
  covIndex: number[][];
  paramsSample: number; paramsIndex: number;
  /** out-of-sample volatility of min-variance portfolios built on each estimate */
  oosVolSample: number; oosVolIndex: number; oosVolTrue: number; oosVolEqual: number;
  meanAbsCovError: { sample: number; index: number };
}

export function singleIndexLab(opts: {
  n?: number; T?: number; seed?: number; betaMean?: number; betaDisp?: number;
  idioVol?: number; mktVol?: number;
}): SingleIndexResult {
  const n = opts.n ?? 12, T = opts.T ?? 60, seed = opts.seed ?? 7;
  const betaMean = opts.betaMean ?? 1, betaDisp = opts.betaDisp ?? 0.35;
  const idioVol = opts.idioVol ?? 0.06, mktVol = opts.mktVol ?? 0.045;
  const r = makeRng(seed);

  const trueBeta = Array.from({ length: n }, () => betaMean + betaDisp * gauss(r));
  const trueIdio = Array.from({ length: n }, () => (idioVol * (0.6 + 0.8 * r())) ** 2);
  const mv = mktVol * mktVol;
  const trueCov = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => trueBeta[i] * trueBeta[j] * mv + (i === j ? trueIdio[i] : 0)));

  // simulate returns
  const mkt: number[] = [], rets: number[][] = Array.from({ length: n }, () => []);
  for (let t = 0; t < T; t++) {
    const m = mktVol * gauss(r);
    mkt.push(m);
    for (let i = 0; i < n; i++) rets[i].push(trueBeta[i] * m + Math.sqrt(trueIdio[i]) * gauss(r));
  }

  const mBar = mean(mkt);
  const mVarS = mkt.reduce((s, x) => s + (x - mBar) ** 2, 0) / Math.max(T - 1, 1);
  const betas: number[] = [], idioVar: number[] = [], r2: number[] = [];
  for (let i = 0; i < n; i++) {
    const yBar = mean(rets[i]);
    let sxy = 0;
    for (let t = 0; t < T; t++) sxy += (mkt[t] - mBar) * (rets[i][t] - yBar);
    const b = mVarS > 1e-14 ? sxy / (mVarS * (T - 1)) : 0;
    let sse = 0, sst = 0;
    for (let t = 0; t < T; t++) {
      const e = rets[i][t] - yBar - b * (mkt[t] - mBar);
      sse += e * e; sst += (rets[i][t] - yBar) ** 2;
    }
    betas.push(b);
    idioVar.push(sse / Math.max(T - 2, 1));
    r2.push(sst > 1e-16 ? 1 - sse / sst : 0);
  }

  const covSample = sampleCovRows(rets);
  const covIndex = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => betas[i] * betas[j] * mVarS + (i === j ? idioVar[i] : 0)));

  const wS = minVarLongOnly(covSample), wI = minVarLongOnly(covIndex);
  const wT = minVarLongOnly(trueCov), wE = new Array(n).fill(1 / n);

  const errs = (M: number[][]) => {
    let s = 0, c = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { s += Math.abs(M[i][j] - trueCov[i][j]); c++; }
    return s / c;
  };

  return {
    betas, idioVar, r2, marketVar: mVarS, covSample, covIndex,
    paramsSample: (n * (n + 1)) / 2, paramsIndex: 2 * n + 1,
    oosVolSample: portSigma(wS, trueCov), oosVolIndex: portSigma(wI, trueCov),
    oosVolTrue: portSigma(wT, trueCov), oosVolEqual: portSigma(wE, trueCov),
    meanAbsCovError: { sample: errs(covSample), index: errs(covIndex) },
  };
}

export function sampleCovRows(rows: number[][]): number[][] {
  const n = rows.length, T = rows[0]?.length ?? 0;
  const mu = rows.map(mean);
  const cov = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = i; j < n; j++) {
    let s = 0;
    for (let t = 0; t < T; t++) s += (rows[i][t] - mu[i]) * (rows[j][t] - mu[j]);
    const v = T > 1 ? s / (T - 1) : 0;
    cov[i][j] = v; cov[j][i] = v;
  }
  return cov;
}

export function minVarLongOnly(cov: number[][], iters = 1200): number[] {
  const n = cov.length;
  let w = new Array(n).fill(1 / n);
  const lmax = Math.max(...cov.map((r, i) => Math.abs(r[i]))) || 1;
  const step = 1 / (4 * lmax + 1e-9);
  for (let it = 0; it < iters; it++) {
    const grad = matVec(cov, w).map((g) => 2 * g);
    const nw = projectSimplex(w.map((x, i) => x - step * grad[i]));
    let diff = 0;
    for (let i = 0; i < n; i++) diff += Math.abs(nw[i] - w[i]);
    w = nw;
    if (diff < 1e-13) break;
  }
  return w;
}

/* ═══════════════ 3. Estimation error in rolling optimisation ═══════════════ */

export interface EstErrorRow {
  method: string;
  trueSharpe: number;   // realised (true-parameter) Sharpe of the estimated weights
  vol: number;
  weightError: number;  // L1 distance to the oracle MV weights
  maxWeight: number;
  turnoverProxy: number; // average |Δw| across simulation draws
}
export interface EstErrorResult {
  rows: EstErrorRow[];
  oracleSharpe: number;
  /** Sharpe as a function of sample length, per method */
  bySample: { T: number; mv: number; minvar: number; equal: number; oracle: number }[];
}

export function estimationErrorLab(opts: {
  n?: number; T?: number; sims?: number; seed?: number; disp?: number;
}): EstErrorResult {
  const n = opts.n ?? 8, T = opts.T ?? 60, sims = opts.sims ?? 120, seed = opts.seed ?? 11;
  const disp = opts.disp ?? 0.02;
  const r = makeRng(seed);

  // true parameters (monthly): common factor + idiosyncratic
  const trueMu = Array.from({ length: n }, (_, i) => 0.006 + disp * (i / (n - 1) - 0.5));
  const beta = Array.from({ length: n }, () => 0.7 + 0.6 * r());
  const idio = Array.from({ length: n }, () => (0.03 + 0.03 * r()) ** 2);
  const fv = 0.04 ** 2;
  const trueCov = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => beta[i] * beta[j] * fv + (i === j ? idio[i] : 0)));

  const oracleW = tangencyLongOnly(trueMu, trueCov);
  const sharpeOf = (w: number[]) => {
    const v = portSigma(w, trueCov);
    return v > 1e-12 ? (dot(w, trueMu) / v) * Math.sqrt(12) : 0;
  };
  const oracleSharpe = sharpeOf(oracleW);

  const draw = (len: number) => {
    const rows: number[][] = Array.from({ length: n }, () => []);
    for (let t = 0; t < len; t++) {
      const f = Math.sqrt(fv) * gauss(r);
      for (let i = 0; i < n; i++) rows[i].push(trueMu[i] + beta[i] * f + Math.sqrt(idio[i]) * gauss(r));
    }
    return rows;
  };

  const run = (len: number, reps: number) => {
    const acc: Record<string, { sh: number[]; vol: number[]; err: number[]; mx: number[]; prev: number[] | null; turn: number[] }> = {
      mv: { sh: [], vol: [], err: [], mx: [], prev: null, turn: [] },
      minvar: { sh: [], vol: [], err: [], mx: [], prev: null, turn: [] },
      equal: { sh: [], vol: [], err: [], mx: [], prev: null, turn: [] },
    };
    for (let s = 0; s < reps; s++) {
      const rows = draw(len);
      const mHat = rows.map(mean);
      const cHat = sampleCovRows(rows);
      const ws: Record<string, number[]> = {
        mv: tangencyLongOnly(mHat, cHat),
        minvar: minVarLongOnly(cHat),
        equal: new Array(n).fill(1 / n),
      };
      for (const k of Object.keys(ws)) {
        const w = ws[k], a = acc[k];
        a.sh.push(sharpeOf(w));
        a.vol.push(portSigma(w, trueCov) * Math.sqrt(12));
        a.err.push(w.reduce((sum, x, i) => sum + Math.abs(x - oracleW[i]), 0));
        a.mx.push(Math.max(...w));
        if (a.prev) a.turn.push(w.reduce((sum, x, i) => sum + Math.abs(x - a.prev![i]), 0));
        a.prev = w;
      }
    }
    return acc;
  };

  const acc = run(T, sims);
  const label: Record<string, string> = {
    mv: "样本均值-方差 (切点)", minvar: "最小方差", equal: "等权 1/N",
  };
  const rows: EstErrorRow[] = Object.keys(acc).map((k) => ({
    method: label[k],
    trueSharpe: mean(acc[k].sh),
    vol: mean(acc[k].vol),
    weightError: mean(acc[k].err),
    maxWeight: mean(acc[k].mx),
    turnoverProxy: mean(acc[k].turn),
  }));

  const grid = [24, 36, 60, 120, 240, 480];
  const bySample = grid.map((len) => {
    const a = run(len, Math.max(20, Math.round(sims / 3)));
    return { T: len, mv: mean(a.mv.sh), minvar: mean(a.minvar.sh), equal: mean(a.equal.sh), oracle: oracleSharpe };
  });

  return { rows, oracleSharpe, bySample };
}

/** Long-only tangency: Σ⁻¹μ normalised then projected onto the simplex. */
export function tangencyLongOnly(mu: number[], cov: number[][], rf = 0): number[] {
  const n = mu.length;
  try {
    const raw = matVec(invertMatrix(cov), mu.map((m) => m - rf));
    const s = raw.reduce((a, b) => a + b, 0);
    if (!Number.isFinite(s) || Math.abs(s) < 1e-12) return new Array(n).fill(1 / n);
    return projectSimplex(raw.map((x) => x / s));
  } catch {
    return new Array(n).fill(1 / n);
  }
}

/* ═══════════════ 4. Constraints & rebalancing cost ═══════════════ */

export type RebalRule = "none" | "monthly" | "quarterly" | "annual" | "threshold";

export interface RebalRow {
  rule: string;
  trades: number;
  turnover: number;       // annualised
  cost: number;           // cumulative cost drag
  trackingError: number;  // annualised TE vs the continuously rebalanced target
  netCagr: number;
  maxDrift: number;
}
export interface RebalResult {
  rows: RebalRow[];
  /** cost / TE trade-off along the threshold grid */
  frontier: { threshold: number; cost: number; te: number; turnover: number }[];
  driftPath: { t: number; drift: number; band: number }[];
  capEffect: { cap: number; vol: number; ret: number; effN: number }[];
}

export function constraintRebalanceLab(opts: {
  n?: number; days?: number; seed?: number; costBps?: number; threshold?: number;
  vol?: number; corr?: number;
}): RebalResult {
  const n = opts.n ?? 6, days = opts.days ?? 1260, seed = opts.seed ?? 5;
  const costBps = opts.costBps ?? 20, thr = opts.threshold ?? 0.05;
  const volA = opts.vol ?? 0.2, corr = opts.corr ?? 0.3;
  const r = makeRng(seed);
  const dt = 1 / 252;

  // correlated daily returns via a one-factor structure
  const bshare = Math.sqrt(Math.max(corr, 0));
  const rets: number[][] = [];
  for (let t = 0; t < days; t++) {
    const f = gauss(r);
    rets.push(Array.from({ length: n }, (_, i) =>
      (0.05 + 0.02 * (i / n)) * dt + volA * Math.sqrt(dt) * (bshare * f + Math.sqrt(1 - bshare * bshare) * gauss(r))));
  }
  const target = new Array(n).fill(1 / n);

  const simulate = (rule: RebalRule, band: number, rate: number) => {
    let w = [...target];
    let eq = 1, trades = 0, turn = 0, cost = 0, maxDrift = 0;
    const stratRet: number[] = [], benchRet: number[] = [], drift: number[] = [];
    for (let t = 0; t < days; t++) {
      const d = w.reduce((s, x, i) => s + Math.abs(x - target[i]), 0) / 2;
      drift.push(d);
      maxDrift = Math.max(maxDrift, d);
      const calendar =
        (rule === "monthly" && t % 21 === 0 && t > 0) ||
        (rule === "quarterly" && t % 63 === 0 && t > 0) ||
        (rule === "annual" && t % 252 === 0 && t > 0);
      const banded = rule === "threshold" && d > band;
      if (calendar || banded) {
        const to = w.reduce((s, x, i) => s + Math.abs(x - target[i]), 0);
        turn += to; trades++;
        const c = to * rate;
        cost += c; eq *= 1 - c;
        w = [...target];
      }
      const rp = w.reduce((s, x, i) => s + x * rets[t][i], 0);
      const rb = target.reduce((s, x, i) => s + x * rets[t][i], 0);
      stratRet.push(rp); benchRet.push(rb);
      eq *= 1 + rp;
      const drifted = w.map((x, i) => x * (1 + rets[t][i]));
      const ds = drifted.reduce((a, b) => a + b, 0);
      w = ds > 0 ? drifted.map((x) => x / ds) : w;
    }
    const diff = stratRet.map((x, i) => x - benchRet[i]);
    const years = days / 252;
    return {
      trades, turnover: turn / years, cost,
      trackingError: sd(diff) * Math.sqrt(252),
      netCagr: Math.pow(Math.max(eq, 1e-9), 1 / years) - 1,
      maxDrift, drift,
    };
  };

  const rate = costBps / 1e4;
  const defs: { rule: RebalRule; label: string }[] = [
    { rule: "none", label: "买入持有 (不再平衡)" },
    { rule: "monthly", label: "日历 · 每月" },
    { rule: "quarterly", label: "日历 · 每季" },
    { rule: "annual", label: "日历 · 每年" },
    { rule: "threshold", label: `阈值 · ${(thr * 100).toFixed(0)}% 偏离带` },
  ];
  const rows: RebalRow[] = defs.map((d) => {
    const s = simulate(d.rule, thr, rate);
    return {
      rule: d.label, trades: s.trades, turnover: s.turnover, cost: s.cost,
      trackingError: s.trackingError, netCagr: s.netCagr, maxDrift: s.maxDrift,
    };
  });

  const frontier = [0.01, 0.02, 0.03, 0.05, 0.075, 0.1, 0.15, 0.2].map((b) => {
    const s = simulate("threshold", b, rate);
    return { threshold: b, cost: s.cost, te: s.trackingError, turnover: s.turnover };
  });

  const base = simulate("threshold", thr, rate);
  const driftPath = base.drift
    .filter((_, i) => i % Math.max(1, Math.floor(days / 240)) === 0)
    .map((d, i) => ({ t: i, drift: d, band: thr }));

  // weight-cap constraint: how a max-weight cap changes the min-variance solution
  const cov = sampleCovRows(Array.from({ length: n }, (_, i) => rets.map((row) => row[i]))).map((row) => row.map((x) => x * 252));
  const capEffect = [1, 0.5, 0.35, 0.25, 1 / n].map((cap) => {
    const w = cappedMinVar(cov, cap);
    const effN = 1 / w.reduce((s, x) => s + x * x, 0);
    const muA = Array.from({ length: n }, (_, i) => mean(rets.map((row) => row[i])) * 252);
    return { cap, vol: portSigma(w, cov), ret: dot(w, muA), effN };
  });

  return { rows, frontier, driftPath, capEffect };
}

/** Min-variance with 0 ≤ wᵢ ≤ cap via projected gradient + capped simplex projection. */
export function cappedMinVar(cov: number[][], cap: number, iters = 1500): number[] {
  const n = cov.length;
  const c = Math.max(cap, 1 / n);
  let w = new Array(n).fill(1 / n);
  const lmax = Math.max(...cov.map((r, i) => Math.abs(r[i]))) || 1;
  const step = 1 / (4 * lmax + 1e-9);
  for (let it = 0; it < iters; it++) {
    const grad = matVec(cov, w).map((g) => 2 * g);
    const nw = projectCapped(w.map((x, i) => x - step * grad[i]), c);
    let diff = 0;
    for (let i = 0; i < n; i++) diff += Math.abs(nw[i] - w[i]);
    w = nw;
    if (diff < 1e-12) break;
  }
  return w;
}

/** Projection onto {0 ≤ w ≤ cap, Σw = 1} by bisection on the dual variable. */
export function projectCapped(v: number[], cap: number): number[] {
  const clip = (theta: number) => v.map((x) => Math.min(Math.max(x - theta, 0), cap));
  let lo = Math.min(...v) - 1, hi = Math.max(...v) + 1;
  for (let it = 0; it < 100; it++) {
    const mid = (lo + hi) / 2;
    const s = clip(mid).reduce((a, b) => a + b, 0);
    if (s > 1) lo = mid; else hi = mid;
  }
  const w = clip((lo + hi) / 2);
  const s = w.reduce((a, b) => a + b, 0);
  return s > 0 ? w.map((x) => x / s) : v.map(() => 1 / v.length);
}

/* ═══════════════ 5. Active management: fundamental law & Treynor-Black ═══════════════ */

export interface ActiveResult {
  ir: number;
  irWithTC: number;
  valueAdded: number;       // IR²/(4λ)
  optimalTE: number;        // IR/(2λ)
  breakEvenIC: number;      // IC needed to reach a target IR
  grid: { breadth: number; ic05: number; ic03: number; ic10: number }[];
  tcCurve: { tc: number; ir: number }[];
  treynorBlack: {
    activeAlpha: number; activeSigma: number; appraisal: number;
    w0: number; wActive: number; sharpeCombined: number; sharpeMarket: number;
    positions: { name: string; alpha: number; resid: number; weight: number }[];
  };
}

export function activeManagementLab(opts: {
  ic?: number; breadth?: number; tc?: number; lambda?: number; targetIR?: number;
  alphas?: number[]; residVols?: number[]; mktPremium?: number; mktVol?: number;
}): ActiveResult {
  const ic = opts.ic ?? 0.05, breadth = opts.breadth ?? 200, tc = opts.tc ?? 0.6;
  const lambda = opts.lambda ?? 0.1, targetIR = opts.targetIR ?? 0.5;
  const alphas = opts.alphas ?? [0.03, 0.02, -0.015, 0.01];
  const residVols = opts.residVols ?? [0.18, 0.22, 0.15, 0.30];
  const mktPremium = opts.mktPremium ?? 0.055, mktVol = opts.mktVol ?? 0.16;

  const ir = ic * Math.sqrt(breadth);
  const irTC = tc * ir;
  const valueAdded = (irTC * irTC) / (4 * lambda);
  const optimalTE = irTC / (2 * lambda);
  const breakEvenIC = targetIR / (tc * Math.sqrt(breadth));

  const grid = [10, 25, 50, 100, 200, 400, 800, 1600].map((b) => ({
    breadth: b, ic03: 0.03 * Math.sqrt(b), ic05: 0.05 * Math.sqrt(b), ic10: 0.10 * Math.sqrt(b),
  }));
  const tcCurve = Array.from({ length: 21 }, (_, i) => {
    const x = i / 20;
    return { tc: x, ir: x * ir };
  });

  // Treynor-Black active portfolio
  const ratios = alphas.map((a, i) => a / (residVols[i] * residVols[i]));
  const denom = ratios.reduce((s, x) => s + x, 0);
  const wA = ratios.map((x) => (Math.abs(denom) > 1e-12 ? x / denom : 1 / ratios.length));
  const alphaA = dot(wA, alphas);
  const varA = wA.reduce((s, x, i) => s + x * x * residVols[i] * residVols[i], 0);
  const sigA = Math.sqrt(Math.max(varA, 1e-12));
  const appraisal = alphaA / sigA;
  const w0 = (alphaA / varA) / (mktPremium / (mktVol * mktVol));
  const wActive = w0; // beta of the active portfolio normalised to 1 by construction here
  const sharpeM = mktPremium / mktVol;
  const sharpeCombined = Math.sqrt(sharpeM * sharpeM + appraisal * appraisal);

  return {
    ir, irWithTC: irTC, valueAdded, optimalTE, breakEvenIC, grid, tcCurve,
    treynorBlack: {
      activeAlpha: alphaA, activeSigma: sigA, appraisal, w0, wActive,
      sharpeCombined, sharpeMarket: sharpeM,
      positions: alphas.map((a, i) => ({ name: `资产 ${i + 1}`, alpha: a, resid: residVols[i], weight: wA[i] })),
    },
  };
}

/* ═══════════════ 6. Downside risk, stochastic dominance & CRRA utility ═══════════════ */

export interface DownsideMetrics {
  meanRet: number; vol: number; semiDev: number;
  lpm1: number; lpm2: number; lpm3: number;
  sharpe: number; sortino: number; omega: number; kappa3: number;
  var95: number; cvar95: number; skew: number; kurt: number;
}
export interface DownsideResult {
  a: DownsideMetrics; b: DownsideMetrics;
  cdf: { x: number; A: number; B: number; intA: number; intB: number }[];
  fsd: { dominates: "A" | "B" | "none"; maxViolation: number };
  ssd: { dominates: "A" | "B" | "none"; maxViolation: number };
  /** CRRA expected utility as a function of the weight on A */
  utility: { w: number; ceq: number; eu: number; meanVarCeq: number }[];
  bestWeight: number;
}

export function downsideMetrics(x: number[], tau = 0, rf = 0): DownsideMetrics {
  const m = mean(x), s = sd(x);
  const below = x.map((v) => Math.max(tau - v, 0));
  const above = x.map((v) => Math.max(v - tau, 0));
  const lpm = (n: number) => mean(below.map((d) => d ** n));
  const semi = Math.sqrt(lpm(2));
  const sorted = [...x].sort((p, q) => p - q);
  const idx = Math.max(0, Math.floor(0.05 * sorted.length) - 1);
  const var95 = -sorted[idx];
  const tail = sorted.slice(0, Math.max(idx + 1, 1));
  const cv = -mean(tail);
  const cm = (n: number) => (s > 1e-12 ? mean(x.map((v) => ((v - m) / s) ** n)) : 0);
  return {
    meanRet: m, vol: s, semiDev: semi,
    lpm1: lpm(1), lpm2: lpm(2), lpm3: lpm(3),
    sharpe: s > 1e-12 ? (m - rf) / s : 0,
    sortino: semi > 1e-12 ? (m - tau) / semi : 0,
    omega: lpm(1) > 1e-12 ? mean(above) / lpm(1) : Infinity,
    kappa3: lpm(3) > 1e-16 ? (m - tau) / Math.cbrt(lpm(3)) : 0,
    var95, cvar95: cv, skew: cm(3), kurt: cm(4),
  };
}

/** Compare two return distributions on FSD / SSD and CRRA utility mixing. */
export function downsideRiskLab(opts: {
  seed?: number; n?: number; muA?: number; volA?: number; skewA?: number;
  muB?: number; volB?: number; jumpProb?: number; jumpSize?: number; gamma?: number; tau?: number;
}): DownsideResult {
  const seed = opts.seed ?? 9, n = opts.n ?? 4000;
  const muA = opts.muA ?? 0.07, volA = opts.volA ?? 0.14;
  const muB = opts.muB ?? 0.09, volB = opts.volB ?? 0.13;
  const jp = opts.jumpProb ?? 0.03, js = opts.jumpSize ?? 0.25;
  const gamma = opts.gamma ?? 4, tau = opts.tau ?? 0;
  const r = makeRng(seed);

  // A: symmetric; B: higher mean & lower vol but a negatively skewed jump tail
  const A: number[] = [], B: number[] = [];
  for (let i = 0; i < n; i++) {
    A.push(muA + volA * gauss(r));
    const jump = r() < jp ? -js * (0.5 + r()) : 0;
    B.push(muB + volB * gauss(r) + jump);
  }

  const a = downsideMetrics(A, tau), b = downsideMetrics(B, tau);

  const lo = Math.min(...A, ...B), hi = Math.max(...A, ...B);
  const K = 120;
  const As = [...A].sort((p, q) => p - q), Bs = [...B].sort((p, q) => p - q);
  const cdfAt = (s: number[], x: number) => {
    let l = 0, h = s.length;
    while (l < h) { const m = (l + h) >> 1; if (s[m] <= x) l = m + 1; else h = m; }
    return l / s.length;
  };
  let intA = 0, intB = 0;
  const step = (hi - lo) / (K - 1);
  const cdf = Array.from({ length: K }, (_, i) => {
    const x = lo + i * step;
    const ca = cdfAt(As, x), cb = cdfAt(Bs, x);
    intA += ca * step; intB += cb * step;
    return { x, A: ca, B: cb, intA, intB };
  });
  const decide = (get: (p: typeof cdf[number]) => [number, number]) => {
    let aLess = 0, bLess = 0;
    for (const p of cdf) {
      const [x, y] = get(p);
      if (x - y > 1e-6) bLess = Math.max(bLess, x - y);
      if (y - x > 1e-6) aLess = Math.max(aLess, y - x);
    }
    const dominates: "A" | "B" | "none" = bLess < 1e-6 && aLess > 1e-6 ? "A" : aLess < 1e-6 && bLess > 1e-6 ? "B" : "none";
    return { dominates, maxViolation: Math.min(aLess, bLess) };
  };
  const fsd = decide((p) => [p.A, p.B]);
  const ssd = decide((p) => [p.intA, p.intB]);

  const crra = (w: number) => {
    let eu = 0;
    for (let i = 0; i < n; i++) {
      const g = 1 + w * A[i] + (1 - w) * B[i];
      const wealth = Math.max(g, 1e-6);
      eu += Math.abs(gamma - 1) < 1e-9 ? Math.log(wealth) : (Math.pow(wealth, 1 - gamma) - 1) / (1 - gamma);
    }
    eu /= n;
    const ceq = Math.abs(gamma - 1) < 1e-9 ? Math.exp(eu) - 1 : Math.pow(eu * (1 - gamma) + 1, 1 / (1 - gamma)) - 1;
    const mix = A.map((x, i) => w * x + (1 - w) * B[i]);
    const mvCeq = mean(mix) - 0.5 * gamma * sd(mix) ** 2;
    return { ceq, eu, mvCeq };
  };
  const utility = Array.from({ length: 21 }, (_, i) => {
    const w = i / 20;
    const u = crra(w);
    return { w, ceq: u.ceq, eu: u.eu, meanVarCeq: u.mvCeq };
  });
  const bestWeight = utility.reduce((best, p) => (p.ceq > best.ceq ? p : best), utility[0]).w;

  return { a, b, cdf, fsd, ssd, utility, bestWeight };
}

/* ═══════════════ 7. Multi-period & dynamic allocation (Merton) ═══════════════ */

export interface DynamicResult {
  mertonWeight: number;
  myopic: number;
  hedgingDemand: number;
  totalWeight: number;
  glide: { age: number; humanRatio: number; totalEquity: number; financialEquity: number }[];
  horizonCurve: { horizon: number; weight: number; hedging: number }[];
  paths: { q: string; rebalanced: number; buyHold: number }[];
  rebalancedMean: number; buyHoldMean: number;
  rebalancedVol: number; buyHoldVol: number;
  volDragBonus: number;
}

export function dynamicAllocationLab(opts: {
  mu?: number; sigma?: number; rf?: number; gamma?: number; horizon?: number;
  phi?: number; lambdaXi?: number; seed?: number; sims?: number; cap?: number;
}): DynamicResult {
  const mu = opts.mu ?? 0.07, sigma = opts.sigma ?? 0.16, rf = opts.rf ?? 0.02;
  const gamma = opts.gamma ?? 4, horizon = opts.horizon ?? 20;
  const phi = opts.phi ?? 0.15;   // mean-reversion speed of the risk premium
  const rho = opts.lambdaXi ?? -0.6; // correlation between premium shocks and returns
  const seed = opts.seed ?? 13, sims = opts.sims ?? 2000, cap = opts.cap ?? 2;

  const myopic = (mu - rf) / (gamma * sigma * sigma);
  // intertemporal hedging demand under an Ornstein-Uhlenbeck risk premium
  const hedge = (h: number) => {
    const decay = phi > 1e-6 ? (1 - Math.exp(-phi * h)) / phi : h;
    return (-rho * (1 - 1 / gamma) * 0.5 * decay * (mu - rf)) / (sigma * sigma);
  };
  const hedgingDemand = hedge(horizon);
  const total = Math.max(0, Math.min(myopic + hedgingDemand, cap));

  const glide = Array.from({ length: 46 }, (_, i) => {
    const age = 25 + i;
    const retire = 65;
    const yrs = Math.max(retire - age, 0);
    const hc = 1 - Math.exp(-0.06 * yrs); // normalised human-capital PV (bond-like)
    const fin = 0.15 + 1.4 * (1 - hc);    // financial wealth accumulates over life
    const humanRatio = hc / (hc + fin);
    const financialEquity = Math.max(0, Math.min(total / (1 - humanRatio), cap));
    return { age, humanRatio, totalEquity: total, financialEquity };
  });

  const horizonCurve = Array.from({ length: 31 }, (_, i) => {
    const h = i;
    const hd = hedge(h);
    return { horizon: h, weight: Math.max(0, Math.min(myopic + hd, cap)), hedging: hd };
  });

  // path dependence: annually rebalanced vs buy & hold, same weight
  const r = makeRng(seed);
  const wStart = Math.max(0, Math.min(total, 1));
  const rebal: number[] = [], bh: number[] = [];
  for (let s = 0; s < sims; s++) {
    let wr = 1, eqShare = wStart;
    let eq = wStart, bd = 1 - wStart;
    for (let t = 0; t < horizon; t++) {
      const z = gauss(r);
      const rEq = Math.exp((mu - 0.5 * sigma * sigma) + sigma * z) - 1;
      wr *= 1 + wStart * rEq + (1 - wStart) * rf;
      eq *= 1 + rEq; bd *= 1 + rf;
      eqShare = eq / (eq + bd);
    }
    rebal.push(wr);
    bh.push(eq + bd);
  }
  const qs = [0.05, 0.25, 0.5, 0.75, 0.95];
  const sortedR = [...rebal].sort((a, b) => a - b), sortedB = [...bh].sort((a, b) => a - b);
  const paths = qs.map((q) => ({
    q: `${(q * 100).toFixed(0)}%`,
    rebalanced: sortedR[Math.floor(q * (sims - 1))],
    buyHold: sortedB[Math.floor(q * (sims - 1))],
  }));

  return {
    mertonWeight: myopic + hedgingDemand, myopic, hedgingDemand, totalWeight: total,
    glide, horizonCurve, paths,
    rebalancedMean: mean(rebal), buyHoldMean: mean(bh),
    rebalancedVol: sd(rebal), buyHoldVol: sd(bh),
    volDragBonus: mean(rebal) - mean(bh),
  };
}

/* ═══════════════ 8. Regularisation & maximum diversification ═══════════════ */

export interface RegRow {
  name: string; vol: number; ret: number; sharpe: number;
  effN: number; gross: number; shortShare: number; divRatio: number;
  weights: number[];
}
export interface RegResult {
  rows: RegRow[];
  path: { lambda: number; effN: number; gross: number; vol: number; maxWeight: number }[];
  weightsChart: { asset: string; minvar: number; l2: number; l1: number; mdp: number; equal: number }[];
}

/** Diversification ratio: (Σwᵢσᵢ) / σ_p — equals 1 only for a single asset. */
export function diversificationRatio(w: number[], cov: number[][]): number {
  const num = w.reduce((s, x, i) => s + Math.abs(x) * Math.sqrt(Math.max(cov[i][i], 0)), 0);
  const den = portSigma(w, cov);
  return den > 1e-12 ? num / den : 1;
}

/**
 * Long-only maximum-diversification portfolio (Choueifaty-Coignard 2008).
 * Maximising (Σwᵢσᵢ)/σ_p is equivalent to solving the long-only minimum-variance
 * problem on the *correlation* matrix and then de-scaling by each volatility.
 */
export function maxDiversification(cov: number[][]): number[] {
  const n = cov.length;
  const s = cov.map((row, i) => Math.sqrt(Math.max(row[i], 1e-16)));
  const corr = cov.map((row, i) => row.map((c, j) => c / (s[i] * s[j])));
  const y = minVarLongOnly(corr, 4000);
  const raw = y.map((x, i) => x / s[i]);
  const tot = raw.reduce((a, b) => a + b, 0);
  return tot > 0 ? raw.map((x) => x / tot) : new Array(n).fill(1 / n);
}

/**
 * Norm-constrained min-variance (DeMiguel et al. 2009):
 * min w'Σw + λ₂‖w‖₂² + λ₁‖w‖₁ subject to Σw = 1 (shorts allowed).
 * Solved by proximal gradient: gradient step → soft threshold → project to Σw=1.
 */
export function regularizedMinVar(cov: number[][], l1: number, l2: number, iters = 3000): number[] {
  const n = cov.length;
  let w = new Array(n).fill(1 / n);
  const lmax = Math.max(...cov.map((r, i) => Math.abs(r[i]))) || 1;
  const step = 1 / (4 * (lmax + l2) + 1e-9);
  const soft = (x: number, k: number) => Math.sign(x) * Math.max(Math.abs(x) - k, 0);
  for (let it = 0; it < iters; it++) {
    const grad = matVec(cov, w).map((g, i) => 2 * g + 2 * l2 * w[i]);
    let z = w.map((x, i) => soft(x - step * grad[i], step * l1));
    const s = z.reduce((a, b) => a + b, 0);
    z = z.map((x) => x + (1 - s) / n); // project onto the hyperplane Σw = 1
    let diff = 0;
    for (let i = 0; i < n; i++) diff += Math.abs(z[i] - w[i]);
    w = z;
    if (diff < 1e-13) break;
  }
  return w;
}

export function regularizationLab(opts: {
  n?: number; T?: number; seed?: number; l1?: number; l2?: number;
}): RegResult {
  const n = opts.n ?? 20, T = opts.T ?? 60, seed = opts.seed ?? 17;
  const l1 = opts.l1 ?? 0.02, l2 = opts.l2 ?? 0.05;
  const r = makeRng(seed);

  const beta = Array.from({ length: n }, () => 0.6 + 0.8 * r());
  const idio = Array.from({ length: n }, () => (0.05 + 0.05 * r()) ** 2);
  const fv = 0.045 ** 2;
  const trueMu = Array.from({ length: n }, () => 0.005 + 0.004 * gauss(r));
  const trueCov = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => beta[i] * beta[j] * fv + (i === j ? idio[i] : 0)));

  const rows: number[][] = Array.from({ length: n }, () => []);
  for (let t = 0; t < T; t++) {
    const f = Math.sqrt(fv) * gauss(r);
    for (let i = 0; i < n; i++) rows[i].push(trueMu[i] + beta[i] * f + Math.sqrt(idio[i]) * gauss(r));
  }
  const cHat = sampleCovRows(rows);

  const describe = (name: string, w: number[]): RegRow => {
    const vol = portSigma(w, trueCov) * Math.sqrt(12);
    const ret = dot(w, trueMu) * 12;
    return {
      name, vol, ret, sharpe: vol > 1e-9 ? ret / vol : 0,
      effN: 1 / w.reduce((s, x) => s + x * x, 0),
      gross: w.reduce((s, x) => s + Math.abs(x), 0),
      shortShare: w.filter((x) => x < -1e-6).reduce((s, x) => s - x, 0),
      divRatio: diversificationRatio(w, trueCov),
      weights: w,
    };
  };

  const unconstrained = (() => {
    try {
      const inv = invertMatrix(cHat);
      const one = new Array(n).fill(1);
      const io = matVec(inv, one);
      const s = io.reduce((a, b) => a + b, 0);
      return io.map((x) => x / s);
    } catch { return new Array(n).fill(1 / n); }
  })();

  const wL2 = regularizedMinVar(cHat, 0, l2);
  const wL1 = regularizedMinVar(cHat, l1, 0);
  const wLO = minVarLongOnly(cHat);
  const wMDP = maxDiversification(cHat);
  const wEW = new Array(n).fill(1 / n);

  const list: RegRow[] = [
    describe("样本最小方差 (无约束)", unconstrained),
    describe("L2 岭正则化", wL2),
    describe("L1 稀疏 (LASSO)", wL1),
    describe("长仓约束 (w ≥ 0)", wLO),
    describe("最大分散化 MDP", wMDP),
    describe("等权 1/N", wEW),
  ];

  const path = Array.from({ length: 16 }, (_, i) => {
    const lam = (i / 15) * 0.06;
    const w = regularizedMinVar(cHat, lam, 0);
    return {
      lambda: lam,
      effN: 1 / w.reduce((s, x) => s + x * x, 0),
      gross: w.reduce((s, x) => s + Math.abs(x), 0),
      vol: portSigma(w, trueCov) * Math.sqrt(12),
      maxWeight: Math.max(...w),
    };
  });

  const weightsChart = Array.from({ length: Math.min(n, 20) }, (_, i) => ({
    asset: `A${i + 1}`,
    minvar: unconstrained[i], l2: wL2[i], l1: wL1[i], mdp: wMDP[i], equal: wEW[i],
  }));

  return { rows: list, path, weightsChart };
}
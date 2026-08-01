/**
 * V5.3 — Advanced asset-pricing primitives.
 *
 * Covers the parts of the "price → state price → SDF → equilibrium" map that
 * the V3.6 module did not reach:
 *   A. state prices / risk-neutral measure / market (in)completeness
 *   B. SDF ⇄ linear factor model duality, HJ distance & pricing errors
 *   C. preference-based resolutions of the three puzzles
 *   D. Campbell-Shiller decomposition, factor-zoo shrinkage, currency carry
 *
 * All functions are pure and unit-tested.
 */

import { invertMatrix, mean, std, variance, covariance } from "./assetPricing";

export { invertMatrix, mean, std, variance, covariance };

/* ══════════════════════════════════════════════════════════════
   A. State prices, risk-neutral measure, completeness
   ══════════════════════════════════════════════════════════════ */

export interface StatePriceInput {
  /** payoff[i][s] — payoff of asset i in state s */
  payoff: number[][];
  /** price[i] — today's price of asset i */
  price: number[];
  /** prob[s] — physical probability of state s */
  prob: number[];
  /** optional target payoff to bound when the market is incomplete */
  target?: number[];
}

export interface StatePriceResult {
  nAssets: number;
  nStates: number;
  q: number[] | null;
  m: number[] | null;
  qRiskNeutral: number[] | null;
  rfGross: number | null;
  complete: boolean;
  arbitrageFree: boolean;
  targetBounds: { lower: number; upper: number } | null;
  vertices: number[][];
  note: string;
}

function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[piv][i])) piv = r;
    if (Math.abs(M[piv][i]) < 1e-12) return null;
    [M[i], M[piv]] = [M[piv], M[i]];
    const d = M[i][i];
    for (let j = i; j <= n; j++) M[i][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = M[r][i];
      if (f === 0) continue;
      for (let j = i; j <= n; j++) M[r][j] -= f * M[i][j];
    }
  }
  return M.map((r) => r[n]);
}

/** All k-subsets of {0..n-1}. */
function combinations(n: number, k: number): number[][] {
  const out: number[][] = [];
  const cur: number[] = [];
  const walk = (start: number) => {
    if (cur.length === k) { out.push([...cur]); return; }
    for (let i = start; i < n; i++) { cur.push(i); walk(i + 1); cur.pop(); }
  };
  walk(0);
  return out;
}

/** Numerical rank of a matrix via Gaussian elimination with partial pivoting. */
export function matrixRank(mat: number[][], tol = 1e-10): number {
  const A = mat.map((r) => [...r]);
  const rows = A.length;
  const cols = A[0]?.length ?? 0;
  let rank = 0;
  let row = 0;
  for (let c = 0; c < cols && row < rows; c++) {
    let piv = row;
    for (let r = row + 1; r < rows; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    if (Math.abs(A[piv][c]) < tol) continue;
    [A[row], A[piv]] = [A[piv], A[row]];
    for (let r = 0; r < rows; r++) {
      if (r === row) continue;
      const f = A[r][c] / A[row][c];
      for (let j = c; j < cols; j++) A[r][j] -= f * A[row][j];
    }
    row++; rank++;
  }
  return rank;
}

export function statePrices(input: StatePriceInput): StatePriceResult {
  const { payoff, price, prob, target } = input;
  const nAssets = payoff.length;
  const nStates = prob.length;
  const rank = matrixRank(payoff);
  const complete = rank >= nStates;

  const vertices: number[][] = [];
  const support = combinations(nStates, Math.min(rank, nStates));
  for (const cols of support) {
    const k = cols.length;
    const AtA = Array.from({ length: k }, (_, a) =>
      Array.from({ length: k }, (_, b) => {
        let s = 0;
        for (let i = 0; i < nAssets; i++) s += payoff[i][cols[a]] * payoff[i][cols[b]];
        return s;
      }),
    );
    const Atp = Array.from({ length: k }, (_, a) => {
      let s = 0;
      for (let i = 0; i < nAssets; i++) s += payoff[i][cols[a]] * price[i];
      return s;
    });
    const sol = solveLinear(AtA, Atp);
    if (!sol) continue;
    const q = Array(nStates).fill(0);
    cols.forEach((c, a) => (q[c] = sol[a]));
    let ok = sol.every((v) => v > -1e-9);
    if (ok) {
      for (let i = 0; i < nAssets; i++) {
        let p = 0;
        for (let s = 0; s < nStates; s++) p += payoff[i][s] * q[s];
        if (Math.abs(p - price[i]) > 1e-7 * Math.max(1, Math.abs(price[i]))) { ok = false; break; }
      }
    }
    if (ok) vertices.push(q.map((v) => (Math.abs(v) < 1e-12 ? 0 : v)));
  }

  const arbitrageFree = vertices.length > 0;
  let q: number[] | null = null;
  if (arbitrageFree) {
    q = Array.from({ length: nStates }, (_, s) =>
      vertices.reduce((acc, v) => acc + v[s], 0) / vertices.length,
    );
  }

  const sumQ = q ? q.reduce((a, b) => a + b, 0) : null;
  const m = q ? q.map((v, s) => (prob[s] > 0 ? v / prob[s] : 0)) : null;
  const qRN = q && sumQ ? q.map((v) => v / sumQ) : null;

  let targetBounds: { lower: number; upper: number } | null = null;
  if (target && arbitrageFree) {
    const vals = vertices.map((v) => v.reduce((acc, qv, s) => acc + qv * target[s], 0));
    targetBounds = { lower: Math.min(...vals), upper: Math.max(...vals) };
  }

  const note = !arbitrageFree
    ? "不存在非负状态价格向量 ⇒ 该价格体系存在套利机会。"
    : complete
      ? "资产张成全部状态 ⇒ 市场完备，状态价格唯一，任意支付都有唯一无套利价格。"
      : "资产数不足以张成全部状态 ⇒ 市场不完备：SDF 不唯一，不可复制支付只有价格区间。";

  return {
    nAssets, nStates, q, m, qRiskNeutral: qRN,
    rfGross: sumQ && sumQ > 0 ? 1 / sumQ : null,
    complete, arbitrageFree, targetBounds, vertices, note,
  };
}

/* ══════════════════════════════════════════════════════════════
   B. SDF ⇄ linear factor model, HJ distance
   ══════════════════════════════════════════════════════════════ */

export interface SdfFactorResult {
  eM: number;
  b: number[];
  a: number;
  lambda: number[];
  volM: number;
  maxSharpe: number;
}

function quad(v: number[], M: number[][]): number {
  let s = 0;
  for (let i = 0; i < v.length; i++)
    for (let j = 0; j < v.length; j++) s += v[i] * M[i][j] * v[j];
  return s;
}

/**
 * Map traded-factor risk premia λ into SDF loadings b for m = a − b'(f − E f),
 * and report the implied σ(m) / maximum Sharpe ratio.
 */
export function sdfFromFactorPremia(lambda: number[], Sigma: number[][], rf: number): SdfFactorResult {
  const eM = 1 / (1 + rf);
  const Sinv = invertMatrix(Sigma);
  const b = Sinv.map((row) => row.reduce((s, v, j) => s + v * lambda[j], 0) / eM);
  const varM = quad(b, Sigma) * eM * eM;
  const volM = Math.sqrt(Math.max(varM, 0));
  return {
    eM,
    b,
    a: eM,
    lambda: Sigma.map((row) => row.reduce((s, v, j) => s + v * b[j], 0) * eM),
    volM,
    maxSharpe: volM / eM,
  };
}

/** OLS of y on [1, X]; returns [intercept, slopes...] and residuals. */
export function olsFit(y: number[], X: number[][]): { coef: number[]; resid: number[] } {
  const T = y.length;
  const k = (X[0]?.length ?? 0) + 1;
  const Xd = X.map((r) => [1, ...r]);
  const XtX = Array.from({ length: k }, () => Array(k).fill(0));
  const Xty = Array(k).fill(0);
  for (let t = 0; t < T; t++) {
    for (let a = 0; a < k; a++) {
      Xty[a] += Xd[t][a] * y[t];
      for (let b = 0; b < k; b++) XtX[a][b] += Xd[t][a] * Xd[t][b];
    }
  }
  const coef = invertMatrix(XtX).map((row) => row.reduce((s, v, j) => s + v * Xty[j], 0));
  const resid = y.map((yi, t) => yi - Xd[t].reduce((s, v, a) => s + v * coef[a], 0));
  return { coef, resid };
}

export interface ModelEvalResult {
  name: string;
  alphas: number[];
  meanAbsAlpha: number;
  hjDistance: number;
  crossR2: number;
  aggPricingError: number;
}

/**
 * Time-series evaluation of a linear factor model on test-asset excess returns:
 * alphas, Hansen–Jagannathan distance and cross-sectional R².
 */
export function evaluateFactorModel(
  name: string,
  excess: number[][],
  factors: number[][],
): ModelEvalResult {
  const T = excess.length;
  const N = excess[0].length;
  const alphas: number[] = [];
  for (let i = 0; i < N; i++) {
    const y = excess.map((r) => r[i]);
    const { coef } = olsFit(y, factors);
    alphas.push(coef[0]);
  }
  const G = Array.from({ length: N }, (_, i) =>
    Array.from({ length: N }, (_, j) => {
      let s = 0;
      for (let t = 0; t < T; t++) s += excess[t][i] * excess[t][j];
      return s / T;
    }),
  );
  let hj = NaN;
  let agg = NaN;
  try {
    const Ginv = invertMatrix(G);
    agg = quad(alphas, Ginv);
    hj = Math.sqrt(Math.max(agg, 0));
  } catch {
    /* singular second-moment matrix */
  }
  const realized = Array.from({ length: N }, (_, i) => mean(excess.map((r) => r[i])));
  const fitted = realized.map((r, i) => r - alphas[i]);
  const mr = mean(realized);
  const ssTot = realized.reduce((s, v) => s + (v - mr) ** 2, 0);
  const ssRes = realized.reduce((s, v, i) => s + (v - fitted[i]) ** 2, 0);
  return {
    name,
    alphas,
    meanAbsAlpha: mean(alphas.map(Math.abs)),
    hjDistance: hj,
    crossR2: ssTot === 0 ? 0 : 1 - ssRes / ssTot,
    aggPricingError: agg,
  };
}

/* ══════════════════════════════════════════════════════════════
   C. Puzzle mechanisms
   ══════════════════════════════════════════════════════════════ */

export interface LongRunRiskInput {
  delta: number;
  gamma: number;
  psi: number;
  muC: number;
  sigma: number;
  rho: number;
  phiE: number;
  leverage: number;
  kappa1: number;
}
export interface LongRunRiskResult {
  theta: number;
  A1: number;
  A1d: number;
  lambdaEta: number;
  lambdaE: number;
  rf: number;
  equityPremium: number;
  volM: number;
  sharpe: number;
}

/**
 * Homoskedastic Bansal–Yaron long-run risk model under Epstein–Zin preferences.
 * Nests CRRA when ψ = 1/γ (θ = 1 ⇒ λ_e = 0).
 */
export function longRunRisk(inp: LongRunRiskInput): LongRunRiskResult {
  const { delta, gamma, psi, rho, phiE, leverage, kappa1 } = inp;
  const mu = inp.muC / 100;
  const sigma = inp.sigma / 100;
  const theta = (1 - gamma) / (1 - 1 / psi);
  const A1 = (1 - 1 / psi) / (1 - kappa1 * rho);
  const A1d = (leverage - 1 / psi) / (1 - kappa1 * rho);
  const lambdaEta = gamma;
  const lambdaE = (1 - theta) * kappa1 * A1 * phiE;
  const varM = (lambdaEta ** 2 + lambdaE ** 2) * sigma ** 2;
  const volM = Math.sqrt(varM);
  const rf = (-Math.log(delta) + mu / psi - 0.5 * varM) * 100;
  const betaE = kappa1 * A1d * phiE;
  const premium = (lambdaE * betaE + lambdaEta * leverage) * sigma * sigma;
  return {
    theta, A1, A1d, lambdaEta, lambdaE,
    rf,
    equityPremium: premium * 100,
    volM,
    sharpe: volM,
  };
}

export interface HabitInput {
  delta: number;
  gamma: number;
  g: number;
  sigma: number;
  phi: number;
}
export interface HabitPoint {
  s: number;
  surplus: number;
  riskAversion: number;
  sharpe: number;
  premium: number;
}
export interface HabitResult {
  sBar: number;
  sMax: number;
  rf: number;
  steady: HabitPoint;
  curve: HabitPoint[];
}

/** Campbell–Cochrane external habit: time-varying risk aversion & Sharpe ratio. */
export function habitModel(inp: HabitInput): HabitResult {
  const { delta, gamma, phi } = inp;
  const g = inp.g / 100;
  const sigma = inp.sigma / 100;
  const Sbar = sigma * Math.sqrt(gamma / (1 - phi));
  const sBarLog = Math.log(Sbar);
  const sMaxLog = sBarLog + 0.5 * (1 - Sbar * Sbar);
  const lambdaOf = (sLog: number) => {
    const inner = 1 - 2 * (sLog - sBarLog);
    return inner <= 0 ? 0 : (1 / Sbar) * Math.sqrt(inner) - 1;
  };
  const point = (sLog: number): HabitPoint => {
    const S = Math.exp(sLog);
    const lam = lambdaOf(sLog);
    const sharpe = gamma * sigma * (1 + lam);
    return {
      s: sLog,
      surplus: S,
      riskAversion: gamma / S,
      sharpe,
      premium: sharpe * sigma * gamma * 100,
    };
  };
  const curve: HabitPoint[] = [];
  const lo = sBarLog - 2.5;
  for (let i = 0; i <= 60; i++) curve.push(point(lo + ((sMaxLog - lo) * i) / 60));
  const rf = (-Math.log(delta) + gamma * g - 0.5 * gamma * (1 - phi)) * 100;
  return { sBar: Sbar, sMax: Math.exp(sMaxLog), rf, steady: point(sBarLog), curve };
}

export interface DisasterInput {
  delta: number;
  gamma: number;
  g: number;
  sigma: number;
  p: number;
  b: number;
  leverage: number;
}
export interface DisasterResult {
  rf: number;
  equityPremium: number;
  disasterTerm: number;
  diffusiveTerm: number;
  eM: number;
  volM: number;
}

/** Rietz–Barro rare disasters under CRRA utility. */
export function disasterModel(inp: DisasterInput): DisasterResult {
  const { delta, gamma, p, b, leverage } = inp;
  const g = inp.g / 100;
  const sigma = inp.sigma / 100;
  const jump = Math.pow(1 - b, -gamma);
  const eDisc = (1 - p) + p * jump;
  const rf = (-Math.log(delta) + gamma * g - 0.5 * gamma * gamma * sigma * sigma - Math.log(eDisc)) * 100;
  const diffusive = gamma * sigma * sigma * leverage;
  const disaster = p * (jump - 1) * (1 - Math.pow(1 - b, leverage));
  const eM = delta * Math.exp(-gamma * g + 0.5 * gamma * gamma * sigma * sigma) * eDisc;
  const secondMoment =
    delta * delta * Math.exp(-2 * gamma * g + 2 * gamma * gamma * sigma * sigma) *
    ((1 - p) + p * Math.pow(1 - b, -2 * gamma));
  const volM = Math.sqrt(Math.max(secondMoment - eM * eM, 0));
  return {
    rf,
    equityPremium: (diffusive + disaster) * 100,
    disasterTerm: disaster * 100,
    diffusiveTerm: diffusive * 100,
    eM,
    volM,
  };
}

/* ══════════════════════════════════════════════════════════════
   D1. Campbell–Shiller decomposition & return predictability
   ══════════════════════════════════════════════════════════════ */

export interface CSInput {
  dp: number[];
  ret: number[];
  dg: number[];
}
export interface CSResult {
  rho: number;
  phi: number;
  bReturn: number;
  bDividend: number;
  identity: number;
  identityGap: number;
  drNewsShare: number;
  cfNewsShare: number;
  horizons: { h: number; beta: number; r2: number; tHodrick: number }[];
}

export function campbellShiller(inp: CSInput): CSResult {
  const { dp, ret, dg } = inp;
  const n = Math.min(dp.length - 1, ret.length - 1, dg.length - 1);
  const x = dp.slice(0, n);
  const rho = 1 / (1 + Math.exp(mean(dp)));
  const phi = olsFit(dp.slice(1, n + 1), x.map((v) => [v])).coef[1];
  const fitR = olsFit(ret.slice(1, n + 1), x.map((v) => [v]));
  const fitD = olsFit(dg.slice(1, n + 1), x.map((v) => [v]));
  const bR = fitR.coef[1];
  const bD = fitD.coef[1];
  const identity = bR - bD + rho * phi;
  const drShare = bR / (1 - rho * phi);
  const cfShare = bD / (1 - rho * phi);
  const denom = Math.abs(drShare) + Math.abs(cfShare) || 1;

  const horizons: CSResult["horizons"] = [];
  for (const h of [1, 2, 3, 5]) {
    if (n - h < 10) continue;
    const y: number[] = [];
    const xs: number[][] = [];
    for (let t = 0; t + h < n; t++) {
      let s = 0;
      for (let k = 1; k <= h; k++) s += ret[t + k];
      y.push(s);
      xs.push([dp[t]]);
    }
    const f = olsFit(y, xs);
    const my = mean(y);
    const sst = y.reduce((s, v) => s + (v - my) ** 2, 0);
    const sse = f.resid.reduce((s, v) => s + v * v, 0);
    const xm = mean(xs.map((r) => r[0]));
    let sxx = 0;
    for (const r of xs) sxx += (r[0] - xm) ** 2;
    let sHod = 0;
    for (let t = 0; t < y.length; t++) {
      let w = 0;
      for (let k = 0; k < h && t - k >= 0; k++) w += xs[t - k][0] - xm;
      sHod += (w * f.resid[t]) ** 2;
    }
    const se = sxx > 0 ? Math.sqrt(sHod) / sxx : NaN;
    horizons.push({
      h,
      beta: f.coef[1],
      r2: sst === 0 ? 0 : 1 - sse / sst,
      tHodrick: se ? f.coef[1] / se : NaN,
    });
  }

  return {
    rho, phi, bReturn: bR, bDividend: bD,
    identity, identityGap: identity - 1,
    drNewsShare: Math.abs(drShare) / denom,
    cfNewsShare: Math.abs(cfShare) / denom,
    horizons,
  };
}

/* ══════════════════════════════════════════════════════════════
   D2. Factor zoo — PCA, shrinkage, multiple testing
   ══════════════════════════════════════════════════════════════ */

/** Symmetric eigen-decomposition by the cyclic Jacobi method. */
export function jacobiEigen(matIn: number[][], iters = 100): { values: number[]; vectors: number[][] } {
  const n = matIn.length;
  const A = matIn.map((r) => [...r]);
  let V: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0) as number),
  );
  for (let sweep = 0; sweep < iters; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] ** 2;
    if (off < 1e-18) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(A[p][q]) < 1e-15) continue;
        const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = A[k][p], akq = A[k][q];
          A[k][p] = c * akp - s * akq;
          A[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = A[p][k], aqk = A[q][k];
          A[p][k] = c * apk - s * aqk;
          A[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = V[k][p], vkq = V[k][q];
          V[k][p] = c * vkp - s * vkq;
          V[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }
  const pairs = Array.from({ length: n }, (_, i) => ({ v: A[i][i], vec: V.map((r) => r[i]) }))
    .sort((a, b) => b.v - a.v);
  V = pairs.map((p) => p.vec);
  return { values: pairs.map((p) => p.v), vectors: V };
}

export interface FactorZooInput {
  factors: number[][];
  names: string[];
  y: number[];
  ridgeLambda: number;
  lassoLambda: number;
}
export interface FactorZooResult {
  pcaExplained: { pc: number; share: number; cumulative: number }[];
  effectiveFactors: number;
  ols: { name: string; coef: number; t: number; survivesHLZ: boolean; survivesBonferroni: boolean }[];
  ridge: { name: string; coef: number }[];
  lasso: { name: string; coef: number; selected: boolean }[];
  bonferroniT: number;
  hlzT: number;
}

function standardize(cols: number[][]): number[][] {
  const K = cols[0].length;
  const mu = Array.from({ length: K }, (_, k) => mean(cols.map((r) => r[k])));
  const sd = Array.from({ length: K }, (_, k) => std(cols.map((r) => r[k])) || 1);
  return cols.map((r) => r.map((v, k) => (v - mu[k]) / sd[k]));
}

function softThreshold(x: number, lam: number): number {
  if (x > lam) return x - lam;
  if (x < -lam) return x + lam;
  return 0;
}

/** Two-sided normal critical value (Acklam inverse-CDF approximation). */
export function tCrit(pTwoSided: number): number {
  const p = 1 - pTwoSided / 2;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  let q: number;
  let r: number;
  if (p < pl) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= 1 - pl) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

export function factorZoo(inp: FactorZooInput): FactorZooResult {
  const { factors, names, y, ridgeLambda, lassoLambda } = inp;
  const T = factors.length;
  const K = factors[0].length;
  const z = standardize(factors);

  const corr = Array.from({ length: K }, (_, i) =>
    Array.from({ length: K }, (_, j) => {
      let s = 0;
      for (let t = 0; t < T; t++) s += z[t][i] * z[t][j];
      return s / (T - 1);
    }),
  );
  const { values } = jacobiEigen(corr);
  const total = values.reduce((a, b) => a + Math.max(b, 0), 0) || 1;
  let cum = 0;
  const pcaExplained = values.map((v, i) => {
    const share = Math.max(v, 0) / total;
    cum += share;
    return { pc: i + 1, share, cumulative: cum };
  });
  const idx95 = pcaExplained.findIndex((p) => p.cumulative >= 0.95);
  const effectiveFactors = idx95 >= 0 ? idx95 + 1 : K;

  const fit = olsFit(y, z);
  const sse = fit.resid.reduce((s, v) => s + v * v, 0);
  const s2 = sse / Math.max(T - K - 1, 1);
  const Xd = z.map((r) => [1, ...r]);
  const XtX = Array.from({ length: K + 1 }, (_, a) =>
    Array.from({ length: K + 1 }, (_, b) => {
      let s = 0;
      for (let t = 0; t < T; t++) s += Xd[t][a] * Xd[t][b];
      return s;
    }),
  );
  const XtXInv = invertMatrix(XtX);
  const bonferroniT = tCrit(0.05 / K);
  const hlzT = 3.0;
  const ols = names.map((name, k) => {
    const se = Math.sqrt(Math.max(s2 * XtXInv[k + 1][k + 1], 0));
    const t = se > 0 ? fit.coef[k + 1] / se : 0;
    return {
      name,
      coef: fit.coef[k + 1],
      t,
      survivesHLZ: Math.abs(t) > hlzT,
      survivesBonferroni: Math.abs(t) > bonferroniT,
    };
  });

  const ym = mean(y);
  const yc = y.map((v) => v - ym);
  const G = Array.from({ length: K }, (_, a) =>
    Array.from({ length: K }, (_, b) => {
      let s = 0;
      for (let t = 0; t < T; t++) s += z[t][a] * z[t][b];
      return s + (a === b ? ridgeLambda * T : 0);
    }),
  );
  const Zty = Array.from({ length: K }, (_, a) => {
    let s = 0;
    for (let t = 0; t < T; t++) s += z[t][a] * yc[t];
    return s;
  });
  const ridgeCoef = invertMatrix(G).map((row) => row.reduce((s, v, j) => s + v * Zty[j], 0));
  const ridge = names.map((name, k) => ({ name, coef: ridgeCoef[k] }));

  const beta = Array(K).fill(0);
  const colNorm = Array.from({ length: K }, (_, k) => {
    let s = 0;
    for (let t = 0; t < T; t++) s += z[t][k] ** 2;
    return s / T;
  });
  for (let it = 0; it < 500; it++) {
    let maxDelta = 0;
    for (let k = 0; k < K; k++) {
      let rho = 0;
      for (let t = 0; t < T; t++) {
        let pred = 0;
        for (let j = 0; j < K; j++) if (j !== k) pred += z[t][j] * beta[j];
        rho += z[t][k] * (yc[t] - pred);
      }
      rho /= T;
      const newB = softThreshold(rho, lassoLambda) / (colNorm[k] || 1);
      maxDelta = Math.max(maxDelta, Math.abs(newB - beta[k]));
      beta[k] = newB;
    }
    if (maxDelta < 1e-9) break;
  }
  const lasso = names.map((name, k) => ({ name, coef: beta[k], selected: Math.abs(beta[k]) > 1e-8 }));

  return { pcaExplained, effectiveFactors, ols, ridge, lasso, bonferroniT, hlzT };
}

/* ══════════════════════════════════════════════════════════════
   D3. International pricing — UIP, carry, SDF differential
   ══════════════════════════════════════════════════════════════ */

export interface CurrencyInput {
  name: string;
  iForeign: number;
  depreciation: number;
  fxVol: number;
}
export interface CarryResult {
  domesticRate: number;
  legs: {
    name: string;
    forwardDiscount: number;
    carryReturn: number;
    uipDeviation: number;
    sharpe: number;
    sdfGap: number;
  }[];
  highMinusLow: number;
  uipSlope: number;
  uipVerdict: string;
}

/**
 * Carry sorting + Fama (1984) UIP regression. Under complete markets the
 * exchange-rate change equals the SDF differential: Δs = ln M* − ln M.
 */
export function currencyCarry(domesticRate: number, ccys: CurrencyInput[]): CarryResult {
  const legs = ccys.map((c) => {
    const fd = c.iForeign - domesticRate;
    const carry = fd - c.depreciation;
    return {
      name: c.name,
      forwardDiscount: fd,
      carryReturn: carry,
      uipDeviation: carry,
      sharpe: c.fxVol > 0 ? carry / c.fxVol : 0,
      sdfGap: c.depreciation / 100,
    };
  });
  const sorted = [...legs].sort((a, b) => a.forwardDiscount - b.forwardDiscount);
  const highMinusLow = sorted.length > 1
    ? sorted[sorted.length - 1].carryReturn - sorted[0].carryReturn
    : 0;
  const xs = legs.map((l) => [l.forwardDiscount]);
  const ys = ccys.map((c) => c.depreciation);
  let slope = NaN;
  if (legs.length >= 2) slope = olsFit(ys, xs).coef[1];
  const uipVerdict = !isFinite(slope)
    ? "样本不足以估计 Fama 回归。"
    : slope < 0.5
      ? `Fama 斜率 β = ${slope.toFixed(2)} < 1 ⇒ UIP 被拒绝：高息货币未如期贬值，Carry 组合获得正收益（前向溢价之谜）。`
      : `Fama 斜率 β = ${slope.toFixed(2)} ≈ 1 ⇒ 本样本与 UIP 一致，Carry 收益接近零。`;
  return { domesticRate, legs, highMinusLow, uipSlope: slope, uipVerdict };
}
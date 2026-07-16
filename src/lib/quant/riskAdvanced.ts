/**
 * Advanced risk-management library — V4.3.
 * Six research-grade tools:
 *   1) Systemic risk: CoVaR, DeltaCoVaR, MES, SRISK
 *   2) Liquidity risk: LVaR + Almgren-Chriss optimal execution
 *   3) FRTB IMA: 97.5% Expected Shortfall + liquidity-horizon scaling +
 *      Basel traffic light (Kupiec + Christoffersen independence)
 *   4) Operational risk: LDA Poisson x Lognormal Monte Carlo -> OpVaR
 *   5) Reverse stress testing: Mahalanobis-min factor shock
 *   6) Concentration & Component VaR (Euler allocation) + HHI
 *
 * Pure, framework-free. Covered by src/lib/quant/__tests__/riskAdvanced.test.ts.
 */

/* ── deterministic RNG ── */
export function makeRng(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 1 | s) + 0x9e3779b9) >>> 0;
    return (s >>> 0) / 4294967296;
  };
}
export function randn(rng: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ── Standard normal helpers ── */
export function normCdf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * ax);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return 0.5 * (1 + sign * y);
}
export function normInv(p: number): number {
  // Beasley-Springer-Moro
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.3577518672690, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425, ph = 1 - pl;
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= ph) {
    const q = p - 0.5, r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
}

/* ── shared linear algebra ── */
function matVec(A: number[][], x: number[]): number[] {
  const n = A.length; const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += A[i][j] * x[j];
    out[i] = s;
  }
  return out;
}
function dot(a: number[], b: number[]): number {
  let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s;
}

/* Solve linear system by Gauss-Jordan (small n). */
export function solveLinear(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M: number[][] = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    // pivot
    let piv = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[piv][i])) piv = k;
    if (piv !== i) [M[i], M[piv]] = [M[piv], M[i]];
    const d = M[i][i] || 1e-12;
    for (let j = i; j <= n; j++) M[i][j] /= d;
    for (let k = 0; k < n; k++) if (k !== i) {
      const f = M[k][i];
      for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j];
    }
  }
  return M.map((r) => r[n]);
}

/* ══════════════════════════════════════════════════════════════
   1. Systemic risk — CoVaR / DeltaCoVaR / MES / SRISK
   ══════════════════════════════════════════════════════════════ */

/** Historical quantile (order statistic) at fraction q ∈ [0,1]. */
export function quantile(x: number[], q: number): number {
  if (x.length === 0) return NaN;
  const s = [...x].sort((a, b) => a - b);
  const pos = q * (s.length - 1);
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

/** OLS quantile regression by iteratively reweighted least squares (small samples). */
export function quantileRegression(y: number[], x: number[], tau: number, iters = 60): { a: number; b: number } {
  // Simple 1-D quantile regression via Barrodale-Roberts style IRLS
  const n = y.length;
  let a = 0, b = 0;
  for (let it = 0; it < iters; it++) {
    // residuals
    const w = new Array(n);
    for (let i = 0; i < n; i++) {
      const r = y[i] - (a + b * x[i]);
      const eps = 1e-6;
      const wi = r >= 0 ? tau : (1 - tau);
      w[i] = wi / Math.max(Math.abs(r), eps);
    }
    // weighted LS
    let Sw = 0, Swx = 0, Swxx = 0, Swy = 0, Swxy = 0;
    for (let i = 0; i < n; i++) {
      Sw += w[i]; Swx += w[i] * x[i]; Swxx += w[i] * x[i] * x[i];
      Swy += w[i] * y[i]; Swxy += w[i] * x[i] * y[i];
    }
    const det = Sw * Swxx - Swx * Swx || 1e-12;
    a = (Swxx * Swy - Swx * Swxy) / det;
    b = (Sw * Swxy - Swx * Swy) / det;
  }
  return { a, b };
}

export interface SystemicOutput {
  varI: number;         // VaR of institution i at level alpha
  varSys: number;       // Unconditional VaR of system
  coVaR: number;        // System VaR conditional on institution in distress
  coVaRMed: number;     // System VaR conditional on institution at median state
  deltaCoVaR: number;   // Systemic contribution
  mes: number;          // Marginal Expected Shortfall
  esSys: number;        // Unconditional ES of system
  lrmes: number;        // Long-run MES ~ 1 - exp(-18 * MES)
  srisk: number;        // SRISK capital shortfall (positive = shortfall)
}

/**
 * Compute CoVaR (Adrian & Brunnermeier 2016) via quantile regression:
 *   VaR_sys | R_i = a + b * R_i, evaluated at R_i = VaR_i(alpha) vs median.
 * MES (Acharya et al. 2017) = E[R_i | R_sys <= VaR_sys(alpha)].
 * SRISK = k * Debt - (1-k) * (1 - LRMES) * Equity  (positive = capital shortfall).
 */
export function computeSystemic(
  retsSys: number[],
  retsI: number[],
  alpha: number,
  marketCap: number,
  debt: number,
  k = 0.08,
): SystemicOutput {
  const n = Math.min(retsSys.length, retsI.length);
  const rs = retsSys.slice(0, n), ri = retsI.slice(0, n);
  const varI = quantile(ri, alpha);              // left tail: alpha ~ 0.05
  const varSys = quantile(rs, alpha);
  // Quantile regression of rs on ri at tau=alpha
  const { a, b } = quantileRegression(rs, ri, alpha);
  const medI = quantile(ri, 0.5);
  const coVaR = a + b * varI;
  const coVaRMed = a + b * medI;
  const deltaCoVaR = coVaR - coVaRMed;
  // MES: average institution return on days system in left tail
  const tailCut = varSys;
  let sMes = 0, cMes = 0, sES = 0;
  for (let i = 0; i < n; i++) {
    if (rs[i] <= tailCut) {
      sMes += ri[i]; sES += rs[i]; cMes++;
    }
  }
  const mes = cMes > 0 ? sMes / cMes : 0;
  const esSys = cMes > 0 ? sES / cMes : varSys;
  const lrmes = 1 - Math.exp(18 * mes); // mes is negative on average; keeps LRMES in [0,1)
  const srisk = k * debt - (1 - k) * (1 - lrmes) * marketCap;
  return { varI, varSys, coVaR, coVaRMed, deltaCoVaR, mes, esSys, lrmes, srisk };
}

/** Generate a jointly-normal (sys, inst) return sample with given correlation. */
export function simulateJoint(rho: number, n: number, seed = 42, sigS = 0.012, sigI = 0.02): { rs: number[]; ri: number[] } {
  const rng = makeRng(seed);
  const rs: number[] = [], ri: number[] = [];
  for (let t = 0; t < n; t++) {
    const z1 = randn(rng);
    const z2 = rho * z1 + Math.sqrt(Math.max(1 - rho * rho, 0)) * randn(rng);
    rs.push(sigS * z1);
    ri.push(sigI * z2);
  }
  return { rs, ri };
}

/* ══════════════════════════════════════════════════════════════
   2. Liquidity risk — LVaR + Almgren-Chriss optimal execution
   ══════════════════════════════════════════════════════════════ */

/** Exogenous liquidity-adjusted VaR: LVaR = VaR + 0.5 * |Position| * spread. */
export function exogenousLVaR(V: number, sigma: number, alpha: number, spreadBps: number): { var: number; lvar: number; liquidityCost: number } {
  const z = normInv(alpha);
  const varAmt = V * z * sigma;
  const cost = 0.5 * V * (spreadBps / 10000);
  return { var: varAmt, lvar: varAmt + cost, liquidityCost: cost };
}

export interface AlmgrenChrisInputs {
  X: number;         // total shares to liquidate
  T: number;         // horizon (days)
  N: number;         // number of intervals
  sigma: number;     // per-period volatility (absolute)
  eta: number;       // temporary impact (linear)
  gamma?: number;    // permanent impact (linear)
  lambda: number;    // risk aversion
}
export interface AlmgrenChrisOutput {
  schedule: { t: number; x: number; n: number }[]; // holdings x(t) and trade size n(t)
  expCost: number;   // expected implementation shortfall
  varCost: number;   // variance of implementation shortfall
  kappa: number;     // solution parameter
}

/** Almgren-Chriss (2000) optimal liquidation with linear impact.
 *  x_k = X * sinh(kappa*(T-t_k)) / sinh(kappa*T),  kappa = sqrt(lambda * sigma^2 / eta_bar),
 *  where eta_bar = eta - 0.5 * gamma * tau (tau = T/N). */
export function almgrenChriss(o: AlmgrenChrisInputs): AlmgrenChrisOutput {
  const { X, T, N, sigma, eta, lambda } = o;
  const gamma = o.gamma ?? 0;
  const tau = T / N;
  const etaBar = eta - 0.5 * gamma * tau;
  const kappa2 = (lambda * sigma * sigma) / Math.max(etaBar, 1e-9);
  const kappa = Math.sqrt(Math.max(kappa2, 0));
  const schedule: { t: number; x: number; n: number }[] = [];
  let prevX = X;
  for (let k = 0; k <= N; k++) {
    const t = k * tau;
    let xk: number;
    if (kappa < 1e-8) {
      // risk-neutral limit: TWAP
      xk = X * (1 - k / N);
    } else {
      xk = X * Math.sinh(kappa * (T - t)) / Math.sinh(kappa * T);
    }
    const n = prevX - xk;
    schedule.push({ t, x: xk, n });
    prevX = xk;
  }
  // Expected cost & variance (closed-form limits)
  const expCost = 0.5 * gamma * X * X + etaBar * X * X * (kappa < 1e-8 ? 1 / (N * tau) : (kappa / Math.tanh(kappa * T) - 1 / T));
  const varCost = 0.5 * sigma * sigma * X * X * (kappa < 1e-8 ? T / 3 : (T * (1 / Math.tanh(kappa * T)) - 1 / kappa) / Math.tanh(kappa * T));
  return { schedule, expCost, varCost, kappa };
}

/* ══════════════════════════════════════════════════════════════
   3. FRTB IMA — 97.5% Expected Shortfall + LH scaling + backtesting
   ══════════════════════════════════════════════════════════════ */

/** ES at level alpha on a P&L series (losses positive convention: L = -PnL). */
export function historicalES(pnl: number[], alpha = 0.975): { var: number; es: number } {
  const losses = pnl.map((p) => -p);
  const s = [...losses].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.floor(alpha * s.length));
  const varAmt = s[idx];
  const tail = s.slice(idx);
  const es = tail.reduce((a, b) => a + b, 0) / Math.max(tail.length, 1);
  return { var: varAmt, es };
}

/** FRTB liquidity-horizon scaling: ES_liq = sqrt( sum_j ES_j^2 * (LH_j - LH_{j-1})/10 ). */
export function frtbLHScaling(esByBucket: number[], lh: number[]): number {
  // esByBucket[j] is 10-day ES for factors truncated to horizon LH_j (>= 10).
  const bounds = [10, ...lh];
  let s = 0;
  for (let j = 0; j < esByBucket.length; j++) {
    const diff = bounds[j + 1] - bounds[j];
    s += esByBucket[j] * esByBucket[j] * (diff / 10);
  }
  return Math.sqrt(s);
}

/** Basel traffic-light zones by exception count (250-day backtest at 99%). */
export function baselTrafficLight(exceptions: number): { zone: "green" | "yellow" | "red"; multiplier: number } {
  if (exceptions <= 4) return { zone: "green", multiplier: 1.5 };
  if (exceptions <= 9) return { zone: "yellow", multiplier: 1.5 + 0.1 * (exceptions - 4) };
  return { zone: "red", multiplier: 2.0 };
}

/** Kupiec POF (unconditional coverage) LR test statistic. */
export function kupiecPOF(exceptions: number, N: number, p: number): { LR: number; pValue: number } {
  const x = exceptions;
  if (x === 0 || x === N) {
    const LR = -2 * (x * Math.log(p) + (N - x) * Math.log(1 - p));
    return { LR, pValue: 1 - chiSqCdf(LR, 1) };
  }
  const ph = x / N;
  const LR = -2 * (x * Math.log(p) + (N - x) * Math.log(1 - p) - x * Math.log(ph) - (N - x) * Math.log(1 - ph));
  return { LR, pValue: 1 - chiSqCdf(LR, 1) };
}

/** Christoffersen independence test. */
export function christoffersenIndep(exSeq: number[]): { LR: number; pValue: number } {
  let n00 = 0, n01 = 0, n10 = 0, n11 = 0;
  for (let i = 1; i < exSeq.length; i++) {
    const a = exSeq[i - 1], b = exSeq[i];
    if (a === 0 && b === 0) n00++;
    else if (a === 0 && b === 1) n01++;
    else if (a === 1 && b === 0) n10++;
    else n11++;
  }
  const p01 = n01 / Math.max(n00 + n01, 1);
  const p11 = n11 / Math.max(n10 + n11, 1);
  const p = (n01 + n11) / Math.max(n00 + n01 + n10 + n11, 1);
  const eps = 1e-12;
  const L0 = (n01 + n11) * Math.log(p + eps) + (n00 + n10) * Math.log(1 - p + eps);
  const L1 = n01 * Math.log(p01 + eps) + n00 * Math.log(1 - p01 + eps) + n11 * Math.log(p11 + eps) + n10 * Math.log(1 - p11 + eps);
  const LR = -2 * (L0 - L1);
  return { LR, pValue: 1 - chiSqCdf(LR, 1) };
}

/* Chi-square CDF via lower incomplete gamma series (small df). */
export function chiSqCdf(x: number, k: number): number {
  if (x <= 0) return 0;
  return regularizedGammaP(k / 2, x / 2);
}
function regularizedGammaP(a: number, x: number): number {
  if (x < a + 1) {
    // series
    let term = 1 / a, sum = term;
    for (let n = 1; n < 200; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < 1e-12) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  }
  // continued fraction
  let b = x + 1 - a, c = 1e30, d = 1 / b, h = d;
  for (let i = 1; i < 200; i++) {
    const an = -i * (i - a);
    b += 2; d = an * d + b; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  return 1 - h * Math.exp(-x + a * Math.log(x) - logGamma(a));
}
function logGamma(z: number): number {
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/* ══════════════════════════════════════════════════════════════
   4. Operational risk — LDA Poisson × Lognormal Monte Carlo
   ══════════════════════════════════════════════════════════════ */

export interface LDAInputs {
  lambda: number;   // annual frequency (Poisson mean)
  mu: number;       // lognormal log-mean of loss severity
  sigma: number;    // lognormal log-sd
  nSims: number;    // Monte Carlo trials (years)
  seed?: number;
}
export interface LDAOutput {
  totals: number[]; // annual aggregate losses
  mean: number;
  var999: number;
  es999: number;
  var995: number;
  hist: { bucket: number; count: number }[];
}

function poissonSample(rng: () => number, lambda: number): number {
  // Knuth for small lambda; normal approx for large
  if (lambda < 30) {
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= rng(); } while (p > L);
    return k - 1;
  }
  return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * randn(rng)));
}

export function ldaOpVaR(o: LDAInputs): LDAOutput {
  const rng = makeRng(o.seed ?? 7);
  const totals: number[] = [];
  for (let s = 0; s < o.nSims; s++) {
    const N = poissonSample(rng, o.lambda);
    let sum = 0;
    for (let i = 0; i < N; i++) {
      const z = randn(rng);
      sum += Math.exp(o.mu + o.sigma * z);
    }
    totals.push(sum);
  }
  const sorted = [...totals].sort((a, b) => a - b);
  const idx999 = Math.min(sorted.length - 1, Math.floor(0.999 * sorted.length));
  const idx995 = Math.min(sorted.length - 1, Math.floor(0.995 * sorted.length));
  const var999 = sorted[idx999];
  const var995 = sorted[idx995];
  const tail = sorted.slice(idx999);
  const es999 = tail.reduce((a, b) => a + b, 0) / Math.max(tail.length, 1);
  const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
  // Histogram (30 buckets, clipped at 99% for readability)
  const maxVal = sorted[Math.floor(0.99 * sorted.length)] || 1;
  const B = 30;
  const hist = new Array(B).fill(0).map((_, i) => ({ bucket: (i + 0.5) * (maxVal / B), count: 0 }));
  for (const v of totals) {
    const b = Math.min(B - 1, Math.floor((v / maxVal) * B));
    if (b >= 0) hist[b].count++;
  }
  return { totals, mean, var999, es999, var995, hist };
}

/* ══════════════════════════════════════════════════════════════
   5. Reverse stress testing — Mahalanobis-minimal factor shock
   ══════════════════════════════════════════════════════════════ */

export interface ReverseStressOutput {
  delta: number[];       // most plausible shock vector achieving L*
  plausibility: number;  // Mahalanobis distance^2 = delta^T Sigma^-1 delta
  contributions: number[]; // per-factor loss contribution (b_i * delta_i)
}

/**
 * Reverse stress test: minimise Mahalanobis distance subject to b·delta = L*.
 * Closed-form solution: delta* = (L* / (b^T Sigma b)) * Sigma b.
 */
export function reverseStress(Sigma: number[][], b: number[], Lstar: number): ReverseStressOutput {
  const Sb = matVec(Sigma, b);
  const bSb = dot(b, Sb);
  const c = Lstar / Math.max(bSb, 1e-12);
  const delta = Sb.map((v) => c * v);
  const contributions = delta.map((di, i) => b[i] * di);
  // Mahalanobis: delta^T Sigma^-1 delta = L*^2 / (b^T Sigma b)
  const plausibility = (Lstar * Lstar) / Math.max(bSb, 1e-12);
  return { delta, plausibility, contributions };
}

/* ══════════════════════════════════════════════════════════════
   6. Concentration & Component VaR (Euler allocation)
   ══════════════════════════════════════════════════════════════ */

export interface ComponentVaROutput {
  portVar: number;
  portSigma: number;
  hhi: number;
  effectiveN: number;
  marginalVaR: number[];
  componentVaR: number[];
  percentContrib: number[];
}

/** Parametric Component VaR under normal assumption (Euler allocation). */
export function componentVaR(weights: number[], Sigma: number[][], alpha = 0.99): ComponentVaROutput {
  const n = weights.length;
  const Sw = matVec(Sigma, weights);
  const variance = Math.max(dot(weights, Sw), 1e-16);
  const sigmaP = Math.sqrt(variance);
  const z = normInv(alpha);
  const portVar = z * sigmaP;
  const marginalVaR = Sw.map((v) => (z * v) / sigmaP);
  const componentVaRArr = weights.map((w, i) => w * marginalVaR[i]);
  const percentContrib = componentVaRArr.map((c) => c / portVar);
  const hhi = weights.reduce((s, w) => s + w * w, 0);
  const effectiveN = 1 / Math.max(hhi, 1e-12);
  return { portVar, portSigma: sigmaP, hhi, effectiveN, marginalVaR, componentVaR: componentVaRArr, percentContrib };
}

/**
 * V5.8 — Risk Management Frontier
 *
 * Computation layer for the risk-management completion sprint:
 *  1. Coherence axioms, spectral / distortion measures, elicitability scores
 *  2. EWMA / GARCH(1,1) / HAR volatility + Filtered Historical Simulation
 *  3. PD / LGD / EAD, Vasicek unexpected loss and the Basel IRB risk weight
 *  4. Rating migration matrices, generators and a CreditMetrics simulation
 *  5. Funding liquidity: haircuts, deleveraging spirals, survival horizon
 *  6. Basel capital stack + LCR / NSFR
 *  7. Model risk: dispersion bands, epsilon-contamination worst case
 *  8. Multi-period capital trajectory / recovery planning
 *
 * Reuses the primitives already shipped in `riskAdvanced.ts`.
 */
import { makeRng, randn, normCdf, normInv, quantile } from "./riskAdvanced";

export { makeRng, randn, normCdf, normInv, quantile };

/* ═══════════════ 1. Risk measures & elicitability ═══════════════ */

export function varOf(losses: number[], alpha = 0.99): number {
  return quantile(losses, alpha);
}

export function esOf(losses: number[], alpha = 0.99): number {
  const v = varOf(losses, alpha);
  const tail = losses.filter((l) => l >= v);
  return tail.length ? tail.reduce((a, b) => a + b, 0) / tail.length : v;
}

/**
 * Classic sub-additivity counterexample: two independent defaultable bonds.
 * Each pays a coupon `c` but loses `L` with probability `p`. At a confidence
 * level between (1-p)... the single-bond VaR is a small gain, while the
 * pooled VaR is a genuine loss => VaR(A+B) > VaR(A) + VaR(B).
 */
export function subadditivityDemo(
  p = 0.04,
  loss = 100,
  coupon = 2,
  alpha = 0.95,
  n = 20000,
  seed = 11
): {
  varA: number; varB: number; varSum: number; varPool: number;
  esA: number; esPool: number; violatesVaR: boolean; violatesES: boolean;
} {
  const rng = makeRng(seed);
  const a: number[] = [], b: number[] = [], pool: number[] = [];
  for (let i = 0; i < n; i++) {
    const la = rng() < p ? loss - coupon : -coupon;
    const lb = rng() < p ? loss - coupon : -coupon;
    a.push(la); b.push(lb); pool.push((la + lb) / 2);
  }
  const varA = varOf(a, alpha), varB = varOf(b, alpha);
  const varPool = varOf(pool, alpha) * 2;
  const esA = esOf(a, alpha), esPool = esOf(pool, alpha) * 2;
  return {
    varA, varB, varSum: varA + varB, varPool,
    esA, esPool,
    violatesVaR: varPool > varA + varB + 1e-9,
    violatesES: esPool > esA + esOf(b, alpha) + 1e-9,
  };
}

/** Exponential risk-aversion spectrum φ(u) ∝ γ e^{-γ(1-u)} on u∈[0,1]. */
export function spectralRisk(losses: number[], gamma = 10): { value: number; weights: { u: number; phi: number }[] } {
  const s = [...losses].sort((x, y) => x - y);
  const n = s.length;
  let num = 0, den = 0;
  const weights: { u: number; phi: number }[] = [];
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const phi = gamma * Math.exp(-gamma * (1 - u));
    num += phi * s[i];
    den += phi;
    if (i % Math.max(1, Math.floor(n / 60)) === 0) weights.push({ u: +u.toFixed(4), phi: +phi.toFixed(5) });
  }
  return { value: num / den, weights };
}

export type Distortion = "wang" | "ph" | "dual" | "es";

/** Distortion risk measure ρ_g(L) = ∫ g(S_L(x)) dx via the quantile form. */
export function distortionRisk(losses: number[], kind: Distortion, param: number): number {
  const s = [...losses].sort((x, y) => x - y);
  const n = s.length;
  const g = (u: number) => {
    switch (kind) {
      case "wang": return normCdf(normInv(Math.min(1 - 1e-9, Math.max(1e-9, u))) + param);
      case "ph": return Math.pow(u, 1 / Math.max(1e-6, param));
      case "dual": return 1 - Math.pow(1 - u, Math.max(1e-6, param));
      case "es": return Math.min(1, u / Math.max(1e-6, 1 - param));
    }
  };
  // ρ = Σ_i s_i * [ g(1 - i/n) - g(1 - (i+1)/n) ]
  let acc = 0;
  for (let i = 0; i < n; i++) acc += s[i] * (g(1 - i / n) - g(1 - (i + 1) / n));
  return acc;
}

/** Pinball (quantile) loss — VaR is elicitable with this scoring function. */
export function pinballLoss(y: number[], q: number, alpha: number): number {
  return y.reduce((s, v) => s + (v > q ? alpha * (v - q) : (1 - alpha) * (q - v)), 0) / y.length;
}

/**
 * Fissler–Ziegel joint (VaR, ES) score — ES alone is not elicitable, but the
 * pair is jointly elicitable, which is why FRTB pairs ES with VaR backtests.
 */
export function fzLoss(y: number[], v: number, e: number, alpha: number): number {
  const es = Math.max(e, v + 1e-8);
  return (
    y.reduce((s, x) => {
      const ind = x > v ? 1 : 0;
      return s + (ind - (1 - alpha)) * v - ind * x + (1 / es) * (es * v + (x > v ? x - v : 0) / (1 - alpha)) - Math.log(es);
    }, 0) / y.length
  );
}

/* ═══════════════ 2. Volatility models + FHS ═══════════════ */

export function ewmaVol(rets: number[], lambda = 0.94): number[] {
  const out: number[] = [];
  let v = rets.slice(0, Math.min(20, rets.length)).reduce((s, r) => s + r * r, 0) / Math.min(20, rets.length);
  for (const r of rets) {
    v = lambda * v + (1 - lambda) * r * r;
    out.push(Math.sqrt(v));
  }
  return out;
}

export function garch11Filter(rets: number[], omega: number, alpha: number, beta: number): { sigma: number[]; logLik: number } {
  const uncond = omega / Math.max(1e-9, 1 - alpha - beta);
  let v = uncond > 0 ? uncond : rets.reduce((s, r) => s + r * r, 0) / rets.length;
  const sigma: number[] = [];
  let ll = 0;
  for (const r of rets) {
    sigma.push(Math.sqrt(v));
    ll += -0.5 * (Math.log(2 * Math.PI) + Math.log(v) + (r * r) / v);
    v = omega + alpha * r * r + beta * v;
  }
  return { sigma, logLik: ll };
}

/** Coarse-to-fine grid MLE for GARCH(1,1) — fast and dependency free. */
export function garch11Fit(rets: number[]): { omega: number; alpha: number; beta: number; logLik: number; persistence: number } {
  const s2 = rets.reduce((s, r) => s + r * r, 0) / rets.length;
  let best = { omega: s2 * 0.05, alpha: 0.08, beta: 0.9, logLik: -Infinity, persistence: 0.98 };
  let aLo = 0.01, aHi = 0.3, bLo = 0.5, bHi = 0.985;
  for (let pass = 0; pass < 3; pass++) {
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      for (let j = 0; j <= steps; j++) {
        const a = aLo + ((aHi - aLo) * i) / steps;
        const b = bLo + ((bHi - bLo) * j) / steps;
        if (a + b >= 0.999) continue;
        const omega = s2 * (1 - a - b);
        const { logLik } = garch11Filter(rets, omega, a, b);
        if (logLik > best.logLik) best = { omega, alpha: a, beta: b, logLik, persistence: a + b };
      }
    }
    const wa = (aHi - aLo) / 6, wb = (bHi - bLo) / 6;
    aLo = Math.max(0.001, best.alpha - wa); aHi = Math.min(0.5, best.alpha + wa);
    bLo = Math.max(0.1, best.beta - wb); bHi = Math.min(0.995, best.beta + wb);
  }
  return best;
}

/** HAR-RV style volatility: blend of daily / weekly / monthly realised vol. */
export function harVol(rets: number[], w = [0.4, 0.35, 0.25]): number[] {
  const rv = rets.map((r) => r * r);
  const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / Math.max(1, arr.length);
  return rets.map((_, i) => {
    const d = mean(rv.slice(Math.max(0, i - 0), i + 1));
    const wk = mean(rv.slice(Math.max(0, i - 4), i + 1));
    const mo = mean(rv.slice(Math.max(0, i - 21), i + 1));
    return Math.sqrt(Math.max(1e-12, w[0] * d + w[1] * wk + w[2] * mo));
  });
}

/**
 * Filtered Historical Simulation: standardise by the conditional vol, resample
 * the standardised residuals and rescale by the current forecast.
 */
export function filteredHistoricalSim(
  rets: number[], sigma: number[], sigmaNext: number, alpha = 0.99, horizon = 1, nSims = 20000, seed = 7
): { var: number; es: number; hist: { x: number; n: number }[] } {
  const z = rets.map((r, i) => r / Math.max(1e-9, sigma[i]));
  const rng = makeRng(seed);
  const losses: number[] = [];
  for (let s = 0; s < nSims; s++) {
    let cum = 0;
    for (let h = 0; h < horizon; h++) cum += sigmaNext * z[Math.floor(rng() * z.length)];
    losses.push(-cum);
  }
  const v = varOf(losses, alpha);
  const tail = losses.filter((l) => l >= v);
  const lo = Math.min(...losses), hi = Math.max(...losses), bins = 40, w = (hi - lo) / bins || 1;
  const counts = new Array(bins).fill(0);
  for (const l of losses) counts[Math.min(bins - 1, Math.floor((l - lo) / w))]++;
  return {
    var: v,
    es: tail.length ? tail.reduce((a, b) => a + b, 0) / tail.length : v,
    hist: counts.map((n, i) => ({ x: +(lo + (i + 0.5) * w).toFixed(4), n })),
  };
}

/* ═══════════════ 3. PD / LGD / EAD and Basel IRB ═══════════════ */

export interface IrbInputs { pd: number; lgd: number; ead: number; maturity: number; kind?: "corporate" | "retail_mortgage" | "retail_other" | "sme"; sales?: number }

export interface IrbOutput {
  el: number; correlation: number; maturityAdj: number; conditionalPd: number;
  k: number; rwa: number; capital: number; ulRatio: number;
}

/** Basel II/III IRB risk-weight function (BCBS 128 §272 onwards). */
export function irbCapital(o: IrbInputs): IrbOutput {
  const pd = Math.min(0.9999, Math.max(0.0003, o.pd));
  const { lgd, ead, maturity } = o;
  const kind = o.kind ?? "corporate";
  let R: number;
  if (kind === "retail_mortgage") R = 0.15;
  else if (kind === "retail_other") R = 0.03 * ((1 - Math.exp(-35 * pd)) / (1 - Math.exp(-35))) + 0.16 * (1 - (1 - Math.exp(-35 * pd)) / (1 - Math.exp(-35)));
  else {
    const w = (1 - Math.exp(-50 * pd)) / (1 - Math.exp(-50));
    R = 0.12 * w + 0.24 * (1 - w);
    if (kind === "sme") {
      const S = Math.min(50, Math.max(5, o.sales ?? 25));
      R -= 0.04 * (1 - (S - 5) / 45);
    }
  }
  const b = Math.pow(0.11852 - 0.05478 * Math.log(pd), 2);
  const maturityAdj = kind.startsWith("retail") ? 1 : (1 + (maturity - 2.5) * b) / (1 - 1.5 * b);
  const conditionalPd = normCdf((normInv(pd) + Math.sqrt(R) * normInv(0.999)) / Math.sqrt(1 - R));
  const k = Math.max(0, (lgd * conditionalPd - lgd * pd) * maturityAdj);
  const rwa = k * 12.5 * ead;
  return {
    el: pd * lgd * ead,
    correlation: R,
    maturityAdj,
    conditionalPd,
    k,
    rwa,
    capital: k * ead,
    ulRatio: k,
  };
}

/** Vasicek single-factor portfolio loss quantile (large homogeneous pool). */
export function vasicekLossQuantile(pd: number, rho: number, conf: number, lgd = 1): number {
  return lgd * normCdf((normInv(pd) + Math.sqrt(rho) * normInv(conf)) / Math.sqrt(1 - rho));
}

/** Through-the-cycle vs point-in-time PD given a macro state z (z<0 = downturn). */
export function pitPd(ttcPd: number, rho: number, z: number): number {
  return normCdf((normInv(Math.min(0.9999, Math.max(1e-6, ttcPd))) - Math.sqrt(rho) * z) / Math.sqrt(1 - rho));
}

/* ═══════════════ 4. Migration matrices & CreditMetrics ═══════════════ */

export function matMul(A: number[][], B: number[][]): number[][] {
  const n = A.length, m = B[0].length, k = B.length;
  const out = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let i = 0; i < n; i++) for (let p = 0; p < k; p++) { const a = A[i][p]; if (!a) continue; for (let j = 0; j < m; j++) out[i][j] += a * B[p][j]; }
  return out;
}

export function matPow(P: number[][], n: number): number[][] {
  let R = P.map((_, i) => P.map((__, j) => (i === j ? 1 : 0)));
  let base = P.map((r) => [...r]);
  let e = Math.max(0, Math.round(n));
  while (e > 0) {
    if (e & 1) R = matMul(R, base);
    base = matMul(base, base);
    e >>= 1;
  }
  return R;
}

/** Generator Q ≈ log(P) via the Mercator series, then row-normalised. */
export function generatorFromP(P: number[][], terms = 30): number[][] {
  const n = P.length;
  const I = P.map((_, i) => P.map((__, j) => (i === j ? 1 : 0)));
  const A = P.map((r, i) => r.map((v, j) => v - I[i][j]));
  let term = A.map((r) => [...r]);
  const Q = A.map((r) => [...r]);
  for (let k = 2; k <= terms; k++) {
    term = matMul(term, A);
    const c = ((k % 2 === 0 ? -1 : 1) * 1) / k;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) Q[i][j] += c * term[i][j];
  }
  // JLT-style regularisation: no negative off-diagonals, rows sum to zero.
  for (let i = 0; i < n; i++) {
    let neg = 0;
    for (let j = 0; j < n; j++) if (i !== j && Q[i][j] < 0) { neg += Q[i][j]; Q[i][j] = 0; }
    Q[i][i] += neg;
    const s = Q[i].reduce((a, b) => a + b, 0);
    Q[i][i] -= s;
  }
  return Q;
}

/** S&P-style 8-state annual migration matrix (AAA…CCC, D absorbing). */
export const SP_MIGRATION: number[][] = [
  [0.9081, 0.0833, 0.0068, 0.0006, 0.0012, 0.0000, 0.0000, 0.0000],
  [0.0070, 0.9065, 0.0779, 0.0064, 0.0006, 0.0014, 0.0002, 0.0000],
  [0.0009, 0.0227, 0.9105, 0.0552, 0.0074, 0.0026, 0.0001, 0.0006],
  [0.0002, 0.0033, 0.0595, 0.8693, 0.0530, 0.0117, 0.0012, 0.0018],
  [0.0003, 0.0014, 0.0067, 0.0773, 0.8053, 0.0884, 0.0100, 0.0106],
  [0.0000, 0.0011, 0.0024, 0.0043, 0.0648, 0.8346, 0.0407, 0.0521],
  [0.0022, 0.0000, 0.0022, 0.0130, 0.0238, 0.1124, 0.6486, 0.1978],
  [0, 0, 0, 0, 0, 0, 0, 1],
];
export const RATING_LABELS = ["AAA", "AA", "A", "BBB", "BB", "B", "CCC", "D"];
/** Credit spreads (bps) by rating used for revaluation. */
export const RATING_SPREADS = [40, 60, 90, 150, 320, 600, 1200, 0];

export interface CreditMetricsInputs {
  ratingIdx: number; n: number; rho: number; lgd: number; horizonYears: number;
  maturity: number; notional: number; nSims: number; seed: number;
}

export interface CreditMetricsOutput {
  mean: number; var99: number; es99: number; creditVar: number;
  migrationLoss: number; defaultLoss: number;
  thresholds: { rating: string; z: number; p: number }[];
  hist: { x: number; n: number }[];
}

/** Threshold (CreditMetrics) model with a one-factor Gaussian copula. */
export function creditMetrics(o: CreditMetricsInputs): CreditMetricsOutput {
  const P = matPow(SP_MIGRATION, Math.max(1, Math.round(o.horizonYears)));
  const row = P[o.ratingIdx];
  // Cumulative from worst (D) upward -> thresholds on the latent variable.
  const cum: number[] = [];
  let c = 0;
  for (let j = row.length - 1; j >= 0; j--) { c += row[j]; cum[j] = c; }
  const thresholds = row.map((p, j) => ({
    rating: RATING_LABELS[j],
    z: j === 0 ? Infinity : normInv(Math.min(0.999999, Math.max(1e-6, cum[j]))),
    p,
  }));
  const remaining = Math.max(0.25, o.maturity - o.horizonYears);
  const valueAt = (j: number) =>
    j === RATING_LABELS.length - 1
      ? o.notional * (1 - o.lgd)
      : o.notional * Math.exp(-(RATING_SPREADS[j] / 10000) * remaining);
  const base = valueAt(o.ratingIdx) * o.n;

  const rng = makeRng(o.seed);
  const losses: number[] = [];
  let migSum = 0, defSum = 0;
  for (let s = 0; s < o.nSims; s++) {
    const m = randn(rng);
    let value = 0, defaults = 0;
    for (let i = 0; i < o.n; i++) {
      const x = Math.sqrt(o.rho) * m + Math.sqrt(1 - o.rho) * randn(rng);
      let j = 0;
      for (let k = RATING_LABELS.length - 1; k >= 0; k--) { if (x < thresholds[k].z) { j = k; break; } }
      if (j === RATING_LABELS.length - 1) defaults++;
      value += valueAt(j);
    }
    const loss = base - value;
    losses.push(loss);
    const defLoss = defaults * (valueAt(o.ratingIdx) - valueAt(RATING_LABELS.length - 1));
    defSum += defLoss;
    migSum += loss - defLoss;
  }
  const mean = losses.reduce((a, b) => a + b, 0) / losses.length;
  const var99 = varOf(losses, 0.99);
  const tail = losses.filter((l) => l >= var99);
  const lo = Math.min(...losses), hi = Math.max(...losses), bins = 40, w = (hi - lo) / bins || 1;
  const counts = new Array(bins).fill(0);
  for (const l of losses) counts[Math.min(bins - 1, Math.floor((l - lo) / w))]++;
  return {
    mean, var99,
    es99: tail.length ? tail.reduce((a, b) => a + b, 0) / tail.length : var99,
    creditVar: var99 - mean,
    migrationLoss: migSum / o.nSims,
    defaultLoss: defSum / o.nSims,
    thresholds,
    hist: counts.map((n, i) => ({ x: +(lo + (i + 0.5) * w).toFixed(2), n })),
  };
}

/* ═══════════════ 5. Funding liquidity & deleveraging spiral ═══════════════ */

export interface SpiralInputs {
  assets: number; equity: number; haircut: number; haircutShock: number;
  priceImpact: number; shock: number; rounds: number; targetLeverage?: number;
}
export interface SpiralStep {
  round: number; assets: number; equity: number; leverage: number;
  sales: number; price: number; margin: number;
}
export interface SpiralOutput { path: SpiralStep[]; totalSales: number; finalLeverage: number; insolvent: boolean; amplification: number }

/** Brunnermeier–Pedersen style margin / loss spiral. */
export function deleveragingSpiral(o: SpiralInputs): SpiralOutput {
  let assets = o.assets;
  let equity = o.equity * (1 - o.shock);
  assets *= 1 - o.shock * (o.assets / Math.max(1e-9, o.assets));
  let price = 1 - o.shock;
  let haircut = o.haircut;
  const target = o.targetLeverage ?? o.assets / o.equity;
  const path: SpiralStep[] = [];
  let totalSales = 0;
  for (let r = 1; r <= o.rounds; r++) {
    haircut = Math.min(0.95, haircut + o.haircutShock);
    const maxAssets = Math.min(equity * target, equity / Math.max(1e-6, haircut));
    const sales = Math.max(0, assets - maxAssets);
    totalSales += sales;
    const drop = o.priceImpact * (sales / Math.max(1e-9, o.assets));
    price *= 1 - drop;
    assets = Math.max(0, (assets - sales) * (1 - drop));
    equity = Math.max(0, equity - (assets + sales) * drop);
    path.push({
      round: r, assets: +assets.toFixed(4), equity: +equity.toFixed(4),
      leverage: equity > 1e-6 ? +(assets / equity).toFixed(3) : Infinity,
      sales: +sales.toFixed(4), price: +price.toFixed(4), margin: +haircut.toFixed(4),
    });
    if (equity <= 1e-6) break;
  }
  const directLoss = o.assets * o.shock;
  const totalLoss = o.assets - assets;
  return {
    path, totalSales,
    finalLeverage: equity > 1e-6 ? assets / equity : Infinity,
    insolvent: equity <= 1e-6,
    amplification: directLoss > 0 ? totalLoss / directLoss : 1,
  };
}

/** Cash-flow survival horizon under a runoff / margin-call stress. */
export function survivalHorizon(
  cash: number, hqla: number, hqlaHaircut: number, dailyOutflow: number, marginCall: number, days = 30
): { path: { day: number; liquidity: number }[]; survivalDays: number } {
  let liq = cash + hqla * (1 - hqlaHaircut);
  const path: { day: number; liquidity: number }[] = [{ day: 0, liquidity: +liq.toFixed(3) }];
  let survival = days;
  for (let d = 1; d <= days; d++) {
    liq -= dailyOutflow + (d <= 5 ? marginCall : 0);
    path.push({ day: d, liquidity: +liq.toFixed(3) });
    if (liq < 0 && survival === days) survival = d - 1;
  }
  return { path, survivalDays: survival };
}

/* ═══════════════ 6. Basel capital stack + LCR / NSFR ═══════════════ */

export interface CapitalStackInputs {
  cet1: number; at1: number; t2: number; rwa: number; exposure: number;
  ccyb: number; gsib: number;
  hqla: number; netOutflows: number; asf: number; rsf: number;
}
export interface CapitalStackOutput {
  cet1Ratio: number; tier1Ratio: number; totalRatio: number; leverageRatio: number;
  cet1Required: number; tier1Required: number; totalRequired: number;
  buffer: number; surplus: number; mdaTrigger: boolean; mdaPayoutCap: number;
  lcr: number; nsfr: number;
  checks: { name: string; value: number; required: number; pass: boolean }[];
}

export function baselCapitalStack(o: CapitalStackInputs): CapitalStackOutput {
  const cet1Ratio = o.cet1 / o.rwa;
  const tier1Ratio = (o.cet1 + o.at1) / o.rwa;
  const totalRatio = (o.cet1 + o.at1 + o.t2) / o.rwa;
  const leverageRatio = (o.cet1 + o.at1) / o.exposure;
  const buffer = 0.025 + o.ccyb + o.gsib; // CCB + CCyB + G-SIB
  const cet1Required = 0.045 + buffer;
  const tier1Required = 0.06 + buffer;
  const totalRequired = 0.08 + buffer;
  const lcr = o.hqla / Math.max(1e-9, o.netOutflows);
  const nsfr = o.asf / Math.max(1e-9, o.rsf);
  // MDA: the combined buffer is split in quartiles.
  const bufferUsed = Math.max(0, cet1Required - cet1Ratio);
  const q = buffer > 0 ? Math.min(1, bufferUsed / buffer) : 0;
  const mdaPayoutCap = q <= 0 ? 1 : q <= 0.25 ? 0.6 : q <= 0.5 ? 0.4 : q <= 0.75 ? 0.2 : 0;
  const checks = [
    { name: "CET1", value: cet1Ratio, required: cet1Required, pass: cet1Ratio >= cet1Required },
    { name: "Tier 1", value: tier1Ratio, required: tier1Required, pass: tier1Ratio >= tier1Required },
    { name: "Total Capital", value: totalRatio, required: totalRequired, pass: totalRatio >= totalRequired },
    { name: "Leverage", value: leverageRatio, required: 0.03, pass: leverageRatio >= 0.03 },
    { name: "LCR", value: lcr, required: 1, pass: lcr >= 1 },
    { name: "NSFR", value: nsfr, required: 1, pass: nsfr >= 1 },
  ];
  return {
    cet1Ratio, tier1Ratio, totalRatio, leverageRatio,
    cet1Required, tier1Required, totalRequired,
    buffer, surplus: (cet1Ratio - cet1Required) * o.rwa,
    mdaTrigger: cet1Ratio < cet1Required, mdaPayoutCap,
    lcr, nsfr, checks,
  };
}

/* ═══════════════ 7. Model risk & robust decisions ═══════════════ */

export interface ModelEstimate { name: string; var: number; es: number; weight?: number }
export interface ModelRiskOutput {
  min: number; max: number; spread: number; relSpread: number;
  average: number; weightedAverage: number; worstCase: number;
  contaminated: number; buffer: number;
}

/**
 * Model-risk band across competing VaR estimates plus an ε-contamination
 * worst-case: ρ_ε = (1-ε)ρ_base + ε ρ_stress.
 */
export function modelRiskBand(models: ModelEstimate[], eps: number, stressMultiple: number): ModelRiskOutput {
  const vs = models.map((m) => m.var);
  const min = Math.min(...vs), max = Math.max(...vs);
  const average = vs.reduce((a, b) => a + b, 0) / vs.length;
  const wsum = models.reduce((s, m) => s + (m.weight ?? 1), 0);
  const weightedAverage = models.reduce((s, m) => s + m.var * (m.weight ?? 1), 0) / wsum;
  const contaminated = (1 - eps) * weightedAverage + eps * max * stressMultiple;
  return {
    min, max, spread: max - min, relSpread: average > 0 ? (max - min) / average : 0,
    average, weightedAverage, worstCase: max * stressMultiple,
    contaminated, buffer: Math.max(0, contaminated - weightedAverage),
  };
}

/* ═══════════════ 8. Resilience & recovery planning ═══════════════ */

export interface CapitalPathInputs {
  cet1: number; rwa: number; quarters: number;
  ppnr: number;            // pre-provision net revenue per quarter (% of RWA)
  lossPath: number[];      // credit + market losses per quarter (% of RWA)
  rwaGrowth: number;       // per-quarter RWA drift under stress
  dividend: number;        // payout as % of positive net income
  buffer: number;          // combined buffer requirement
  ccybRelease?: number;    // countercyclical buffer released in stress
  mgmtActions?: boolean;   // deleveraging + payout suspension after a breach
}
export interface CapitalPathStep {
  q: number; cet1: number; rwa: number; ratio: number; requirement: number;
  loss: number; ppnr: number; dividend: number; breach: boolean;
}
export interface CapitalPathOutput {
  path: CapitalPathStep[]; trough: number; troughQuarter: number;
  breaches: number; minRequirement: number; passes: boolean; drawdownBps: number;
}

export function capitalTrajectory(o: CapitalPathInputs): CapitalPathOutput {
  let cet1 = o.cet1, rwa = o.rwa;
  const start = cet1 / rwa;
  const path: CapitalPathStep[] = [];
  let breaches = 0;
  let actionsOn = false;
  const requirement = 0.045 + o.buffer - (o.ccybRelease ?? 0);
  for (let q = 1; q <= o.quarters; q++) {
    const loss = (o.lossPath[(q - 1) % o.lossPath.length] / 100) * rwa;
    const ppnr = (o.ppnr / 100) * rwa;
    const pre = ppnr - loss;
    const div = pre > 0 && !actionsOn ? pre * o.dividend : 0;
    cet1 += pre - div;
    rwa *= 1 + (actionsOn && o.mgmtActions ? Math.min(0, o.rwaGrowth) - 0.02 : o.rwaGrowth);
    const ratio = cet1 / rwa;
    const breach = ratio < requirement;
    if (breach) { breaches++; if (o.mgmtActions) actionsOn = true; }
    path.push({
      q, cet1: +cet1.toFixed(3), rwa: +rwa.toFixed(2),
      ratio: +(ratio * 100).toFixed(3), requirement: +(requirement * 100).toFixed(3),
      loss: +loss.toFixed(3), ppnr: +ppnr.toFixed(3), dividend: +div.toFixed(3), breach,
    });
  }
  const ratios = path.map((p) => p.ratio / 100);
  const trough = Math.min(...ratios);
  return {
    path, trough, troughQuarter: ratios.indexOf(trough) + 1,
    breaches, minRequirement: requirement, passes: breaches === 0,
    drawdownBps: (start - trough) * 10000,
  };
}

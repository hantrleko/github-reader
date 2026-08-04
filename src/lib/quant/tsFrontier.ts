/**
 * V5.5 — Time-series frontier toolkit.
 *
 * Fills the gaps of the time-series section relative to the
 * "DGP → stationarity → specification → diagnostics → forecast/structure" chain:
 *   1. Unit-root test suite: ADF, Phillips-Perron, DF-GLS, KPSS, Zivot-Andrews, HEGY
 *   2. Wold / ARMA identification: theoretical vs sample ACF-PACF, order grid, roots
 *   3. Differencing decisions: spurious regression MC, over-differencing, forecast fans
 *   4. Non-linearity: SETAR threshold search + Hansen bootstrap, LSTAR/ESTAR
 *   5. Bai-Perron multiple structural breaks (dynamic programming + sequential supF)
 *   6. Density-forecast evaluation: PIT, log score, CRPS, coverage, pinball loss
 *   7. Hansen Model Confidence Set + forecast combination weights
 *   8. Stochastic volatility (particle filter) vs GARCH(1,1)
 *
 * Pure and deterministic given a seed.
 */

import { chiSquarePValue, fPValue, normalCdf, tTwoTail } from "./econometrics";
import { mulberry32, randn, lstsq } from "./econAdvanced";
import { fitGarch11 } from "./calibration";

export { mulberry32, randn };

const mean = (v: number[]) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0);
const sd = (v: number[]) => {
  const m = mean(v);
  return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(v.length - 1, 1));
};
const seq = (n: number) => Array.from({ length: n }, (_, i) => i);

/* ══════════════════ shared series generators ══════════════════ */

export type SeriesKind = "rw" | "rwdrift" | "trend" | "ar" | "break" | "seasonal";

/** Deterministic teaching series used by the stationarity tools. */
export function makeSeries(kind: SeriesKind, n: number, seed: number, rho = 0.7): number[] {
  const rng = mulberry32(seed);
  const out: number[] = [];
  let y = 0;
  for (let t = 0; t < n; t++) {
    const e = randn(rng);
    switch (kind) {
      case "rw": y = y + e; out.push(y); break;
      case "rwdrift": y = y + 0.05 + e; out.push(y); break;
      case "trend": out.push(0.05 * t + e); break;
      case "ar": y = rho * y + e; out.push(y); break;
      case "break": y = rho * y + e; out.push(y + (t > n / 2 ? 3 : 0)); break;
      case "seasonal": {
        // quarterly seasonal unit root: y_t = y_{t-4} + e
        const lag4 = out.length >= 4 ? out[out.length - 4] : 0;
        out.push(lag4 + e);
        break;
      }
    }
  }
  return out;
}

/* ══════════════════ 1. Unit-root test suite ══════════════════ */

export interface URTest {
  name: string;
  stat: number;
  cv: { c1: number; c5: number; c10: number };
  /** Null hypothesis in words. */
  h0: string;
  /** true ⇒ reject H0 at 5%. */
  reject5: boolean;
  /** Conclusion under the 5% decision. */
  verdict: string;
  extra?: string;
}

function lagMatrix(dy: number[], y1: number[], p: number, trend: boolean) {
  // rows: t = p .. n-1 of dy
  const X: number[][] = [];
  const Y: number[] = [];
  for (let t = p; t < dy.length; t++) {
    const row = [1];
    if (trend) row.push(t);
    row.push(y1[t]);
    for (let i = 1; i <= p; i++) row.push(dy[t - i]);
    X.push(row);
    Y.push(dy[t]);
  }
  return { X, Y, gammaIdx: trend ? 2 : 1 };
}

const ADF_CV = {
  c: { c1: -3.43, c5: -2.86, c10: -2.57 },
  ct: { c1: -3.96, c5: -3.41, c10: -3.13 },
};
const DFGLS_CV = {
  c: { c1: -2.57, c5: -1.94, c10: -1.62 },
  ct: { c1: -3.42, c5: -2.91, c10: -2.62 },
};
const KPSS_CV = {
  c: { c1: 0.739, c5: 0.463, c10: 0.347 },
  ct: { c1: 0.216, c5: 0.146, c10: 0.119 },
};
const ZA_CV = { c1: -5.34, c5: -4.8, c10: -4.58 };

/** Augmented Dickey-Fuller with the usual deterministic options. */
export function adfTest(y: number[], p = 2, trend = false): URTest & { gamma: number } {
  const dy = y.map((v, i) => (i === 0 ? 0 : v - y[i - 1]));
  const { X, Y, gammaIdx } = lagMatrix(dy.slice(1), y.slice(0, -1), p, trend);
  const fit = lstsq(X, Y);
  const stat = fit.beta[gammaIdx] / (fit.se[gammaIdx] || 1e-9);
  const cv = trend ? ADF_CV.ct : ADF_CV.c;
  const reject5 = stat < cv.c5;
  return {
    name: "ADF",
    stat, cv, gamma: fit.beta[gammaIdx],
    h0: "存在单位根 (γ = 0)",
    reject5,
    verdict: reject5 ? "拒绝单位根 → 平稳" : "未能拒绝单位根",
    extra: `p = ${p} 阶差分滞后${trend ? " · 含趋势项" : " · 仅含常数"}`,
  };
}

/** Newey-West long-run variance of a residual series. */
export function longRunVar(e: number[], q: number): number {
  const n = e.length;
  let g0 = 0;
  for (const v of e) g0 += v * v;
  g0 /= n;
  let lam = g0;
  for (let j = 1; j <= q; j++) {
    let gj = 0;
    for (let t = j; t < n; t++) gj += e[t] * e[t - j];
    gj /= n;
    lam += 2 * (1 - j / (q + 1)) * gj;
  }
  return lam;
}

/** Phillips-Perron Z_t: DF regression with a non-parametric autocorrelation fix. */
export function ppTest(y: number[], trend = false): URTest {
  const n = y.length;
  const X: number[][] = [];
  const Y: number[] = [];
  for (let t = 1; t < n; t++) {
    const row = [1];
    if (trend) row.push(t);
    row.push(y[t - 1]);
    X.push(row);
    Y.push(y[t] - y[t - 1]);
  }
  const fit = lstsq(X, Y);
  const gi = trend ? 2 : 1;
  const tRho = fit.beta[gi] / (fit.se[gi] || 1e-9);
  const q = Math.max(1, Math.floor(4 * Math.pow(fit.n / 100, 2 / 9)));
  const g0 = fit.resid.reduce((s, e) => s + e * e, 0) / fit.n;
  const lam = longRunVar(fit.resid, q);
  const sigma = Math.sqrt(Math.max(lam, 1e-12));
  const stat =
    Math.sqrt(g0 / lam) * tRho -
    ((lam - g0) * fit.n * (fit.se[gi] || 1e-9)) / (2 * lam * sigma);
  const cv = trend ? ADF_CV.ct : ADF_CV.c;
  const reject5 = stat < cv.c5;
  return {
    name: "Phillips-Perron Z_t",
    stat, cv,
    h0: "存在单位根",
    reject5,
    verdict: reject5 ? "拒绝单位根 → 平稳" : "未能拒绝单位根",
    extra: `Newey-West 带宽 q = ${q}，无需显式加差分滞后`,
  };
}

/** Elliott-Rothenberg-Stock DF-GLS: GLS de-trending then a DF regression. */
export function dfGlsTest(y: number[], p = 2, trend = false): URTest {
  const n = y.length;
  const cbar = trend ? -13.5 : -7;
  const a = 1 + cbar / n;
  const yq: number[] = [y[0]];
  const Zq: number[][] = [trend ? [1, 1] : [1]];
  for (let t = 1; t < n; t++) {
    yq.push(y[t] - a * y[t - 1]);
    Zq.push(trend ? [1 - a, t + 1 - a * t] : [1 - a]);
  }
  const gfit = lstsq(Zq, yq);
  const yd = y.map((v, t) => v - (trend ? gfit.beta[0] + gfit.beta[1] * (t + 1) : gfit.beta[0]));
  // DF regression without deterministics on the de-trended series
  const X: number[][] = [];
  const Y: number[] = [];
  for (let t = p + 1; t < n; t++) {
    const row = [yd[t - 1]];
    for (let i = 1; i <= p; i++) row.push(yd[t - i] - yd[t - i - 1]);
    X.push(row);
    Y.push(yd[t] - yd[t - 1]);
  }
  const fit = lstsq(X, Y);
  const stat = fit.beta[0] / (fit.se[0] || 1e-9);
  const cv = trend ? DFGLS_CV.ct : DFGLS_CV.c;
  const reject5 = stat < cv.c5;
  return {
    name: "DF-GLS (ERS)",
    stat, cv,
    h0: "存在单位根",
    reject5,
    verdict: reject5 ? "拒绝单位根 → 平稳" : "未能拒绝单位根",
    extra: "GLS 去趋势提高近单位根区域的功效",
  };
}

/** KPSS: stationarity is the NULL — complementary to ADF/PP. */
export function kpssTest(y: number[], trend = false): URTest {
  const n = y.length;
  const X = y.map((_, t) => (trend ? [1, t] : [1]));
  const fit = lstsq(X, y);
  let cum = 0;
  let s = 0;
  for (const e of fit.resid) {
    cum += e;
    s += cum * cum;
  }
  const q = Math.max(1, Math.floor(4 * Math.pow(n / 100, 0.25)));
  const lam = longRunVar(fit.resid, q);
  const stat = s / (n * n * Math.max(lam, 1e-12));
  const cv = trend ? KPSS_CV.ct : KPSS_CV.c;
  const reject5 = stat > cv.c5;
  return {
    name: "KPSS",
    stat, cv,
    h0: "序列平稳 (原假设方向相反)",
    reject5,
    verdict: reject5 ? "拒绝平稳 → 非平稳证据" : "未能拒绝平稳",
    extra: "与 ADF/PP 配对使用：四种组合中有两种是「证据不足」",
  };
}

export interface ZAResult extends URTest {
  breakIndex: number;
  breakFraction: number;
  path: { t: number; tstat: number }[];
}

/** Zivot-Andrews: minimum ADF t-stat over an endogenously searched break. */
export function zivotAndrews(y: number[], p = 2, trim = 0.15): ZAResult {
  const n = y.length;
  const lo = Math.floor(n * trim);
  const hi = Math.ceil(n * (1 - trim));
  let best = { t: Infinity, idx: lo };
  const path: { t: number; tstat: number }[] = [];
  const dy = y.map((v, i) => (i === 0 ? 0 : v - y[i - 1]));
  for (let b = lo; b < hi; b++) {
    const X: number[][] = [];
    const Y: number[] = [];
    for (let t = p + 1; t < n; t++) {
      const row = [1, t, t > b ? 1 : 0, y[t - 1]];
      for (let i = 1; i <= p; i++) row.push(dy[t - i]);
      X.push(row);
      Y.push(dy[t]);
    }
    const fit = lstsq(X, Y);
    const tstat = fit.beta[3] / (fit.se[3] || 1e-9);
    path.push({ t: b, tstat });
    if (tstat < best.t) best = { t: tstat, idx: b };
  }
  const reject5 = best.t < ZA_CV.c5;
  return {
    name: "Zivot-Andrews",
    stat: best.t,
    cv: ZA_CV,
    h0: "含单位根 (对立: 断点处水平位移的趋势平稳)",
    reject5,
    verdict: reject5 ? "拒绝单位根 → 断点 + 平稳" : "未能拒绝单位根",
    breakIndex: best.idx,
    breakFraction: best.idx / n,
    path,
    extra: `内生断点位置 t = ${best.idx}（占样本 ${(100 * best.idx / n).toFixed(0)}%）`,
  };
}

export interface HEGYResult {
  tPi1: number; tPi2: number; fPi34: number;
  rejectZero: boolean; rejectSemi: boolean; rejectAnnual: boolean;
  note: string;
}

/** HEGY seasonal unit roots for quarterly data (frequency 0, π and ±π/2). */
export function hegyTest(y: number[], lags = 1): HEGYResult {
  const n = y.length;
  const X: number[][] = [];
  const Y: number[] = [];
  const start = Math.max(4 + lags, 5);
  for (let t = start; t < n; t++) {
    const y1 = y[t - 1] + y[t - 2] + y[t - 3] + y[t - 4];
    const y2 = -(y[t - 1] - y[t - 2] + y[t - 3] - y[t - 4]);
    const y3 = -(y[t - 2] - y[t - 4]);
    const y4 = -(y[t - 1] - y[t - 3]);
    const row = [1, y1, y2, y3, y4];
    for (let i = 1; i <= lags; i++) row.push(y[t - i] - y[t - i - 4]);
    X.push(row);
    Y.push(y[t] - y[t - 4]);
  }
  const fit = lstsq(X, Y);
  const tPi1 = fit.beta[1] / (fit.se[1] || 1e-9);
  const tPi2 = fit.beta[2] / (fit.se[2] || 1e-9);
  // joint F on π3 = π4 = 0 via restricted regression
  const Xr = X.map((r) => r.filter((_, j) => j !== 3 && j !== 4));
  const fr = lstsq(Xr, Y);
  const dfDen = Math.max(fit.n - fit.k, 1);
  const fPi34 = ((fr.rss - fit.rss) / 2) / (fit.rss / dfDen);
  const rejectZero = tPi1 < -2.88;
  const rejectSemi = tPi2 < -1.95;
  const rejectAnnual = fPi34 > 6.6;
  return {
    tPi1, tPi2, fPi34, rejectZero, rejectSemi, rejectAnnual,
    note: [
      rejectZero ? "零频率无单位根" : "零频率存在单位根 → 需一阶差分",
      rejectSemi && rejectAnnual ? "季节频率均无单位根" : "存在季节单位根 → 需季节差分 (1-L⁴)",
    ].join("；"),
  };
}

export interface UnitRootSuite {
  series: number[];
  tests: URTest[];
  za: ZAResult;
  hegy: HEGYResult;
  /** joint reading of ADF (or PP) and KPSS. */
  matrix: string;
}

export function unitRootSuite(opts: {
  kind?: SeriesKind; n?: number; seed?: number; rho?: number; lags?: number; trend?: boolean;
  series?: number[];
}): UnitRootSuite {
  const n = opts.n ?? 240;
  const series = opts.series ?? makeSeries(opts.kind ?? "rw", n, opts.seed ?? 3, opts.rho ?? 0.7);
  const p = opts.lags ?? 2;
  const trend = opts.trend ?? false;
  const adf = adfTest(series, p, trend);
  const pp = ppTest(series, trend);
  const gls = dfGlsTest(series, p, trend);
  const kpss = kpssTest(series, trend);
  const za = zivotAndrews(series, p);
  const hegy = hegyTest(series, 1);
  const matrix = adf.reject5
    ? kpss.reject5
      ? "ADF 拒绝单位根但 KPSS 也拒绝平稳 → 证据矛盾，检查断点/长记忆/异方差"
      : "两者一致：序列平稳"
    : kpss.reject5
      ? "两者一致：序列非平稳（含单位根）"
      : "证据不足：样本太短或过程近单位根，检验功效低";
  return { series, tests: [adf, pp, gls, kpss], za, hegy, matrix };
}

/* ══════════════════ 2. Wold / ARMA identification ══════════════════ */

/** ψ-weights of an ARMA(p,q): the Wold moving-average representation. */
export function woldWeights(ar: number[], ma: number[], len = 24): number[] {
  const psi: number[] = [1];
  for (let j = 1; j < len; j++) {
    let v = j - 1 < ma.length ? ma[j - 1] : 0;
    for (let i = 0; i < ar.length; i++) if (j - i - 1 >= 0) v += ar[i] * psi[j - i - 1];
    psi.push(v);
  }
  return psi;
}

/** Theoretical ACF of an ARMA from its ψ-weights (truncated). */
export function theoreticalAcf(ar: number[], ma: number[], maxLag = 20): number[] {
  const psi = woldWeights(ar, ma, 400);
  const g = (h: number) => {
    let s = 0;
    for (let j = 0; j + h < psi.length; j++) s += psi[j] * psi[j + h];
    return s;
  };
  const g0 = g(0) || 1;
  return seq(maxLag).map((_, i) => g(i + 1) / g0);
}

/** Sample ACF (lags 1..maxLag). */
export function sampleAcf(x: number[], maxLag = 20): number[] {
  const n = x.length;
  const m = mean(x);
  let c0 = 0;
  for (const v of x) c0 += (v - m) ** 2;
  c0 /= n;
  return seq(maxLag).map((_, k) => {
    const h = k + 1;
    let c = 0;
    for (let t = h; t < n; t++) c += (x[t] - m) * (x[t - h] - m);
    c /= n;
    return c0 > 1e-14 ? c / c0 : 0;
  });
}

/** PACF via the Durbin-Levinson recursion, from an ACF vector. */
export function pacfFromAcf(acf: number[]): number[] {
  const K = acf.length;
  const phi: number[][] = Array.from({ length: K + 1 }, () => Array(K + 1).fill(0));
  const out: number[] = [];
  phi[1][1] = acf[0];
  out.push(acf[0]);
  for (let k = 2; k <= K; k++) {
    let num = acf[k - 1];
    let den = 1;
    for (let j = 1; j < k; j++) {
      num -= phi[k - 1][j] * acf[k - j - 1];
      den -= phi[k - 1][j] * acf[j - 1];
    }
    const pk = Math.abs(den) > 1e-12 ? num / den : 0;
    phi[k][k] = pk;
    for (let j = 1; j < k; j++) phi[k][j] = phi[k - 1][j] - pk * phi[k - 1][k - j];
    out.push(pk);
  }
  return out;
}

/** Roots of 1 - a1 z - ... - ap z^p via Durand-Kerner (complex). */
export function polyRoots(coefLead: number[]): { re: number; im: number; modulus: number }[] {
  // polynomial in z: 1 - a1 z - a2 z^2 ...
  const a = coefLead.filter((_, i) => i < coefLead.length);
  const p = a.length;
  if (p === 0) return [];
  // c[k] = coefficient of z^k, k=0..p
  const c = [1, ...a.map((v) => -v)];
  while (c.length > 1 && Math.abs(c[c.length - 1]) < 1e-12) c.pop();
  const deg = c.length - 1;
  if (deg < 1) return [];
  let zr = seq(deg).map((_, i) => Math.cos((2 * Math.PI * i) / deg) * 0.9 + 0.4);
  let zi = seq(deg).map((_, i) => Math.sin((2 * Math.PI * i) / deg) * 0.9);
  const evalPoly = (x: number, y: number) => {
    let rr = 0, ii = 0;
    for (let k = deg; k >= 0; k--) {
      const nr = rr * x - ii * y + c[k];
      const ni = rr * y + ii * x;
      rr = nr; ii = ni;
    }
    return [rr, ii];
  };
  for (let iter = 0; iter < 300; iter++) {
    for (let i = 0; i < deg; i++) {
      const [pr, pi] = evalPoly(zr[i], zi[i]);
      let dr = c[deg], di = 0;
      for (let j = 0; j < deg; j++) {
        if (j === i) continue;
        const ar = zr[i] - zr[j];
        const ai = zi[i] - zi[j];
        const nr = dr * ar - di * ai;
        const ni = dr * ai + di * ar;
        dr = nr; di = ni;
      }
      const den = dr * dr + di * di || 1e-14;
      const qr = (pr * dr + pi * di) / den;
      const qi = (pi * dr - pr * di) / den;
      zr[i] -= qr;
      zi[i] -= qi;
    }
  }
  return seq(deg).map((_, i) => ({
    re: zr[i], im: zi[i], modulus: Math.hypot(zr[i], zi[i]),
  }));
}

/** Hannan-Rissanen ARMA(p,q) estimation: long AR for innovations, then OLS. */
export function hannanRissanen(y: number[], p: number, q: number) {
  const n = y.length;
  const m = mean(y);
  const x = y.map((v) => v - m);
  const L = Math.min(Math.max(8, 2 * (p + q)), Math.floor(n / 4));
  const Xa: number[][] = [];
  const Ya: number[] = [];
  for (let t = L; t < n; t++) {
    Xa.push(seq(L).map((_, i) => x[t - i - 1]));
    Ya.push(x[t]);
  }
  const arFit = lstsq(Xa, Ya);
  const eps = Array(n).fill(0);
  for (let t = L; t < n; t++) eps[t] = arFit.resid[t - L];

  const start = Math.max(p, q) + L;
  const X: number[][] = [];
  const Y: number[] = [];
  for (let t = start; t < n; t++) {
    const row: number[] = [];
    for (let i = 1; i <= p; i++) row.push(x[t - i]);
    for (let j = 1; j <= q; j++) row.push(eps[t - j]);
    if (!row.length) row.push(0);
    X.push(row);
    Y.push(x[t]);
  }
  const fit = lstsq(X, Y);
  const k = p + q;
  const nn = fit.n;
  const sigma2 = fit.rss / nn;
  const ll = -0.5 * nn * (Math.log(2 * Math.PI * sigma2) + 1);
  return {
    ar: fit.beta.slice(0, p),
    ma: fit.beta.slice(p, p + q),
    sigma2,
    aic: -2 * ll + 2 * (k + 1),
    bic: -2 * ll + Math.log(nn) * (k + 1),
    hq: -2 * ll + 2 * Math.log(Math.log(nn)) * (k + 1),
    resid: fit.resid,
    n: nn,
  };
}

export interface ArmaIdentResult {
  series: number[];
  theoryAcf: number[];
  sampleAcfV: number[];
  theoryPacf: number[];
  samplePacfV: number[];
  band: number;
  psi: number[];
  grid: { p: number; q: number; aic: number; bic: number; hq: number }[];
  bestAic: { p: number; q: number };
  bestBic: { p: number; q: number };
  arRoots: { re: number; im: number; modulus: number }[];
  maRoots: { re: number; im: number; modulus: number }[];
  stationary: boolean;
  invertible: boolean;
}

/** Simulate an ARMA(p,q) and lay out the whole Box-Jenkins identification step. */
export function armaIdentLab(opts: {
  ar?: number[]; ma?: number[]; n?: number; seed?: number; maxLag?: number; maxOrder?: number;
}): ArmaIdentResult {
  const ar = opts.ar ?? [0.6];
  const ma = opts.ma ?? [0.4];
  const n = opts.n ?? 400;
  const maxLag = opts.maxLag ?? 20;
  const maxOrder = opts.maxOrder ?? 3;
  const rng = mulberry32(opts.seed ?? 11);
  const burn = 200;
  const eps: number[] = [];
  const y: number[] = [];
  for (let t = 0; t < n + burn; t++) {
    const e = randn(rng);
    eps.push(e);
    let v = e;
    for (let i = 0; i < ar.length; i++) if (t - i - 1 >= 0) v += ar[i] * y[t - i - 1];
    for (let j = 0; j < ma.length; j++) if (t - j - 1 >= 0) v += ma[j] * eps[t - j - 1];
    y.push(v);
  }
  const series = y.slice(burn);

  const sAcf = sampleAcf(series, maxLag);
  const tAcf = theoreticalAcf(ar, ma, maxLag);
  const grid: ArmaIdentResult["grid"] = [];
  for (let p = 0; p <= maxOrder; p++)
    for (let q = 0; q <= maxOrder; q++) {
      if (p === 0 && q === 0) continue;
      const f = hannanRissanen(series, p, q);
      grid.push({ p, q, aic: f.aic, bic: f.bic, hq: f.hq });
    }
  const bestAic = grid.reduce((b, g) => (g.aic < b.aic ? g : b), grid[0]);
  const bestBic = grid.reduce((b, g) => (g.bic < b.bic ? g : b), grid[0]);
  const arRoots = polyRoots(ar);
  const maRoots = polyRoots(ma.map((v) => -v));
  return {
    series,
    theoryAcf: tAcf,
    sampleAcfV: sAcf,
    theoryPacf: pacfFromAcf(tAcf),
    samplePacfV: pacfFromAcf(sAcf),
    band: 1.96 / Math.sqrt(series.length),
    psi: woldWeights(ar, ma, 24),
    grid,
    bestAic: { p: bestAic.p, q: bestAic.q },
    bestBic: { p: bestBic.p, q: bestBic.q },
    arRoots,
    maRoots,
    stationary: arRoots.every((r) => r.modulus > 1) || ar.length === 0,
    invertible: maRoots.every((r) => r.modulus > 1) || ma.length === 0,
  };
}

/* ══════════════════ 3. Differencing decisions ══════════════════ */

export interface SpuriousResult {
  rejectRate: number;
  meanAbsT: number;
  meanR2: number;
  tHist: { bin: number; count: number }[];
  /** same experiment on the differenced series */
  diffRejectRate: number;
  diffMeanR2: number;
}

/** Monte-Carlo of regressing one independent random walk on another. */
export function spuriousRegression(opts: { n?: number; sims?: number; seed?: number }): SpuriousResult {
  const n = opts.n ?? 200;
  const sims = opts.sims ?? 400;
  const rng = mulberry32(opts.seed ?? 5);
  const ts: number[] = [];
  const r2s: number[] = [];
  let rejects = 0, dRejects = 0;
  const dR2: number[] = [];
  for (let s = 0; s < sims; s++) {
    const x: number[] = [], y: number[] = [];
    let xv = 0, yv = 0;
    for (let t = 0; t < n; t++) {
      xv += randn(rng); yv += randn(rng);
      x.push(xv); y.push(yv);
    }
    const fit = lstsq(x.map((v) => [1, v]), y);
    const tstat = fit.beta[1] / (fit.se[1] || 1e-9);
    const yb = mean(y);
    const tss = y.reduce((s2, v) => s2 + (v - yb) ** 2, 0);
    const r2 = 1 - fit.rss / (tss || 1);
    ts.push(Math.abs(tstat));
    r2s.push(r2);
    if (Math.abs(tstat) > 1.96) rejects++;
    const dx = x.slice(1).map((v, i) => v - x[i]);
    const dy = y.slice(1).map((v, i) => v - y[i]);
    const df = lstsq(dx.map((v) => [1, v]), dy);
    const dt = df.beta[1] / (df.se[1] || 1e-9);
    const dyb = mean(dy);
    const dtss = dy.reduce((s2, v) => s2 + (v - dyb) ** 2, 0);
    dR2.push(1 - df.rss / (dtss || 1));
    if (Math.abs(dt) > 1.96) dRejects++;
  }
  const bins = 12;
  const maxT = Math.max(...ts);
  const tHist = seq(bins).map((_, i) => ({
    bin: +(((i + 0.5) * maxT) / bins).toFixed(2),
    count: ts.filter((v) => v >= (i * maxT) / bins && v < ((i + 1) * maxT) / bins).length,
  }));
  return {
    rejectRate: rejects / sims,
    meanAbsT: mean(ts),
    meanR2: mean(r2s),
    tHist,
    diffRejectRate: dRejects / sims,
    diffMeanR2: mean(dR2),
  };
}

export interface DifferencingResult {
  spurious: SpuriousResult;
  /** over-differencing an already stationary AR(1) */
  overDiff: { maRootLevel: number; maRootDiff: number; rmseLevel: number; rmseDiff: number };
  /** competing forecasts from the same data */
  fan: { t: number; actual: number | null; tsMean: number | null; tsLo: number | null; tsHi: number | null; rwMean: number | null; rwLo: number | null; rwHi: number | null }[];
}

export function differencingLab(opts: {
  n?: number; seed?: number; rho?: number; sims?: number; horizon?: number;
}): DifferencingResult {
  const n = opts.n ?? 200;
  const rho = opts.rho ?? 0.7;
  const horizon = opts.horizon ?? 24;
  const seed = opts.seed ?? 5;
  const spurious = spuriousRegression({ n, sims: opts.sims ?? 300, seed });

  // over-differencing: AR(1) stationary series
  const y = makeSeries("ar", n, seed + 1, rho);
  const maLevel = hannanRissanen(y, 1, 1);
  const dy = y.slice(1).map((v, i) => v - y[i]);
  const maDiff = hannanRissanen(dy, 1, 1);
  // one-step rolling RMSE: AR(1) on levels vs AR(1) on differences
  const split = Math.floor(n * 0.7);
  const errL: number[] = [], errD: number[] = [];
  for (let t = split; t < n - 1; t++) {
    const hist = y.slice(0, t + 1);
    const f1 = lstsq(hist.slice(0, -1).map((v) => [1, v]), hist.slice(1));
    const predL = f1.beta[0] + f1.beta[1] * y[t];
    errL.push(y[t + 1] - predL);
    const dh = hist.slice(1).map((v, i) => v - hist[i]);
    const f2 = lstsq(dh.slice(0, -1).map((v) => [1, v]), dh.slice(1));
    const predD = y[t] + f2.beta[0] + f2.beta[1] * (y[t] - y[t - 1]);
    errD.push(y[t + 1] - predD);
  }
  const rmse = (e: number[]) => Math.sqrt(mean(e.map((v) => v * v)));

  // forecast fan: trend-stationary vs random walk fitted to the SAME trending series
  const z = makeSeries("trend", n, seed + 2);
  const tsFit = lstsq(z.map((_, t) => [1, t]), z);
  const tsSigma = Math.sqrt(tsFit.sigma2);
  const dz = z.slice(1).map((v, i) => v - z[i]);
  const drift = mean(dz);
  const rwSigma = sd(dz);
  const fan: DifferencingResult["fan"] = [];
  for (let t = n - 40; t < n; t++) {
    fan.push({ t, actual: z[t], tsMean: null, tsLo: null, tsHi: null, rwMean: null, rwLo: null, rwHi: null });
  }
  for (let h = 1; h <= horizon; h++) {
    const t = n - 1 + h;
    const tsm = tsFit.beta[0] + tsFit.beta[1] * t;
    const rwm = z[n - 1] + drift * h;
    const tw = 1.96 * tsSigma;
    const rw = 1.96 * rwSigma * Math.sqrt(h);
    fan.push({
      t, actual: null,
      tsMean: tsm, tsLo: tsm - tw, tsHi: tsm + tw,
      rwMean: rwm, rwLo: rwm - rw, rwHi: rwm + rw,
    });
  }
  return {
    spurious,
    overDiff: {
      maRootLevel: maLevel.ma[0] ?? 0,
      maRootDiff: maDiff.ma[0] ?? 0,
      rmseLevel: rmse(errL),
      rmseDiff: rmse(errD),
    },
    fan,
  };
}

/* ══════════════════ 4. SETAR / STAR non-linearity ══════════════════ */

export interface SetarResult {
  threshold: number;
  delay: number;
  lowRegime: { const: number; ar: number; n: number };
  highRegime: { const: number; ar: number; n: number };
  linear: { const: number; ar: number };
  ssrSetar: number;
  ssrLinear: number;
  supF: number;
  bootP: number;
  grid: { c: number; ssr: number; f: number }[];
  fitted: { t: number; y: number; setar: number; linear: number; regime: number }[];
  /** LSTAR transition function over the observed range of the state variable. */
  lstar: { gamma: number; c: number; ssr: number; curve: { z: number; g: number }[] };
}

function ar1Split(y: number[], d: number, c: number) {
  const lo: number[][] = [], loY: number[] = [], hi: number[][] = [], hiY: number[] = [];
  for (let t = Math.max(1, d); t < y.length; t++) {
    const state = y[t - d];
    if (state <= c) { lo.push([1, y[t - 1]]); loY.push(y[t]); }
    else { hi.push([1, y[t - 1]]); hiY.push(y[t]); }
  }
  return { lo, loY, hi, hiY };
}

/** SETAR two-regime threshold AR(1) with Hansen's bootstrap linearity test. */
export function setarLab(opts: {
  y?: number[]; n?: number; seed?: number; delay?: number; trim?: number; boots?: number;
  cTrue?: number; arLow?: number; arHigh?: number;
}): SetarResult {
  const d = opts.delay ?? 1;
  const trim = opts.trim ?? 0.15;
  const boots = opts.boots ?? 150;
  const n = opts.n ?? 400;
  const rng0 = mulberry32(opts.seed ?? 21);
  const y = opts.y ?? (() => {
    const arL = opts.arLow ?? 0.85;
    const arH = opts.arHigh ?? 0.2;
    const cT = opts.cTrue ?? 0;
    const out: number[] = [0];
    for (let t = 1; t < n + 100; t++) {
      const prev = out[t - 1];
      const a = prev <= cT ? arL : arH;
      out.push(a * prev + randn(rng0));
    }
    return out.slice(100);
  })();

  const linFit = lstsq(y.slice(0, -1).map((v) => [1, v]), y.slice(1));
  const ssrLinear = linFit.rss;

  const sorted = [...y].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * trim)];
  const hi = sorted[Math.floor(sorted.length * (1 - trim))];
  const steps = 40;
  const grid: SetarResult["grid"] = [];
  let best = { c: lo, ssr: Infinity, f: 0, res: null as any };
  for (let i = 0; i <= steps; i++) {
    const c = lo + ((hi - lo) * i) / steps;
    const { lo: Xl, loY, hi: Xh, hiY } = ar1Split(y, d, c);
    if (loY.length < 10 || hiY.length < 10) continue;
    const fl = lstsq(Xl, loY);
    const fh = lstsq(Xh, hiY);
    const ssr = fl.rss + fh.rss;
    const dof = y.length - 1 - 4;
    const f = ((ssrLinear - ssr) / 2) / (ssr / Math.max(dof, 1));
    grid.push({ c, ssr, f });
    if (ssr < best.ssr) best = { c, ssr, f, res: { fl, fh, nl: loY.length, nh: hiY.length } };
  }

  // Hansen bootstrap: simulate under the linear AR(1) null, recompute supF
  const rngB = mulberry32((opts.seed ?? 21) + 999);
  const sigma = Math.sqrt(linFit.sigma2);
  let exceed = 0;
  for (let b = 0; b < boots; b++) {
    const yb: number[] = [y[0]];
    for (let t = 1; t < y.length; t++) yb.push(linFit.beta[0] + linFit.beta[1] * yb[t - 1] + sigma * randn(rngB));
    const lf = lstsq(yb.slice(0, -1).map((v) => [1, v]), yb.slice(1));
    const sb = [...yb].sort((a, b2) => a - b2);
    let maxF = 0;
    for (let i = 0; i <= 12; i++) {
      const c = sb[Math.floor(sb.length * trim)] +
        ((sb[Math.floor(sb.length * (1 - trim))] - sb[Math.floor(sb.length * trim)]) * i) / 12;
      const sp = ar1Split(yb, d, c);
      if (sp.loY.length < 10 || sp.hiY.length < 10) continue;
      const s = lstsq(sp.lo, sp.loY).rss + lstsq(sp.hi, sp.hiY).rss;
      const f = ((lf.rss - s) / 2) / (s / Math.max(yb.length - 5, 1));
      if (f > maxF) maxF = f;
    }
    if (maxF >= best.f) exceed++;
  }

  // LSTAR: grid over (gamma, c), linear params concentrated out
  let bestL = { gamma: 1, c: best.c, ssr: Infinity };
  for (let gi = 0; gi < 12; gi++) {
    const gamma = 0.25 * Math.pow(1.5, gi);
    for (let ci = 0; ci <= 20; ci++) {
      const c = lo + ((hi - lo) * ci) / 20;
      const X: number[][] = [], Y: number[] = [];
      for (let t = Math.max(1, d); t < y.length; t++) {
        const g = 1 / (1 + Math.exp(-gamma * (y[t - d] - c)));
        X.push([1, y[t - 1], g, g * y[t - 1]]);
        Y.push(y[t]);
      }
      const f = lstsq(X, Y);
      if (f.rss < bestL.ssr) bestL = { gamma, c, ssr: f.rss };
    }
  }
  const curve = seq(60).map((_, i) => {
    const z = lo + ((hi - lo) * i) / 59;
    return { z: +z.toFixed(3), g: 1 / (1 + Math.exp(-bestL.gamma * (z - bestL.c))) };
  });

  const fitted: SetarResult["fitted"] = [];
  for (let t = Math.max(1, d); t < y.length; t++) {
    const low = y[t - d] <= best.c;
    const fl = best.res.fl.beta, fh = best.res.fh.beta;
    fitted.push({
      t,
      y: y[t],
      setar: low ? fl[0] + fl[1] * y[t - 1] : fh[0] + fh[1] * y[t - 1],
      linear: linFit.beta[0] + linFit.beta[1] * y[t - 1],
      regime: low ? 0 : 1,
    });
  }

  return {
    threshold: best.c,
    delay: d,
    lowRegime: { const: best.res.fl.beta[0], ar: best.res.fl.beta[1], n: best.res.nl },
    highRegime: { const: best.res.fh.beta[0], ar: best.res.fh.beta[1], n: best.res.nh },
    linear: { const: linFit.beta[0], ar: linFit.beta[1] },
    ssrSetar: best.ssr,
    ssrLinear,
    supF: best.f,
    bootP: exceed / boots,
    grid,
    fitted,
    lstar: { gamma: bestL.gamma, c: bestL.c, ssr: bestL.ssr, curve },
  };
}

/* ══════════════════ 5. Bai-Perron multiple breaks ══════════════════ */

export interface BaiPerronResult {
  breaks: number[];
  segments: { start: number; end: number; mean: number }[];
  ssrByM: { m: number; ssr: number; bic: number; lwz: number }[];
  sequential: { test: string; f: number; cv5: number; reject: boolean }[];
  mBIC: number;
  mSequential: number;
  series: { t: number; y: number; fit: number }[];
}

/**
 * Bai-Perron with a pure mean-shift regression, solved by dynamic programming.
 */
export function baiPerron(opts: {
  y?: number[]; n?: number; seed?: number; maxBreaks?: number; trim?: number;
  trueBreaks?: number[]; shift?: number;
}): BaiPerronResult {
  const maxM = opts.maxBreaks ?? 4;
  const trim = opts.trim ?? 0.15;
  const n0 = opts.n ?? 240;
  const rng = mulberry32(opts.seed ?? 33);
  const y = opts.y ?? (() => {
    const tb = opts.trueBreaks ?? [0.33, 0.66];
    const shift = opts.shift ?? 2;
    return seq(n0).map((_, t) => {
      let level = 0;
      tb.forEach((f, i) => { if (t / n0 > f) level = shift * (i + 1); });
      return level + randn(rng);
    });
  })();
  const n = y.length;
  const h = Math.max(3, Math.floor(n * trim));

  // SSR of a constant fit on [i, j]
  const cs = [0], cs2 = [0];
  for (let t = 0; t < n; t++) { cs.push(cs[t] + y[t]); cs2.push(cs2[t] + y[t] * y[t]); }
  const segSSR = (i: number, j: number) => {
    const m = j - i + 1;
    const s = cs[j + 1] - cs[i];
    const s2 = cs2[j + 1] - cs2[i];
    return s2 - (s * s) / m;
  };
  const segMean = (i: number, j: number) => (cs[j + 1] - cs[i]) / (j - i + 1);

  // DP: best[m][j] = min SSR of segmenting [0..j] with m breaks
  const INF = 1e18;
  const best: number[][] = Array.from({ length: maxM + 1 }, () => Array(n).fill(INF));
  const argm: number[][] = Array.from({ length: maxM + 1 }, () => Array(n).fill(-1));
  for (let j = h - 1; j < n; j++) best[0][j] = segSSR(0, j);
  for (let m = 1; m <= maxM; m++) {
    for (let j = (m + 1) * h - 1; j < n; j++) {
      for (let b = m * h - 1; b <= j - h; b++) {
        const v = best[m - 1][b] + segSSR(b + 1, j);
        if (v < best[m][j]) { best[m][j] = v; argm[m][j] = b; }
      }
    }
  }
  const recover = (m: number): number[] => {
    const out: number[] = [];
    let j = n - 1;
    for (let k = m; k >= 1; k--) {
      const b = argm[k][j];
      if (b < 0) break;
      out.unshift(b);
      j = b;
    }
    return out;
  };

  const ssrByM: BaiPerronResult["ssrByM"] = [];
  for (let m = 0; m <= maxM; m++) {
    const ssr = best[m][n - 1];
    if (!Number.isFinite(ssr) || ssr >= INF) continue;
    const k = m + 1 + m; // segment means + break dates
    ssrByM.push({
      m,
      ssr,
      bic: Math.log(ssr / n) + (k * Math.log(n)) / n,
      lwz: Math.log(ssr / (n - k)) + (k * 0.299 * Math.pow(Math.log(n), 2.1)) / n,
    });
  }
  const mBIC = ssrByM.reduce((b, r) => (r.bic < b.bic ? r : b), ssrByM[0]).m;

  // sequential supF(l+1 | l) with Bai-Perron 5% critical values (q = 1, trim 0.15)
  const CV = [8.58, 10.13, 11.14, 11.83, 12.25];
  const sequential: BaiPerronResult["sequential"] = [];
  let mSeq = 0;
  for (let l = 0; l < maxM; l++) {
    const s0 = ssrByM.find((r) => r.m === l)?.ssr;
    const s1 = ssrByM.find((r) => r.m === l + 1)?.ssr;
    if (s0 == null || s1 == null) break;
    const f = ((s0 - s1) / (s1 / (n - 2 * (l + 1))));
    const cv5 = CV[Math.min(l, CV.length - 1)];
    const reject = f > cv5;
    sequential.push({ test: `supF(${l + 1}|${l})`, f, cv5, reject });
    if (reject && mSeq === l) mSeq = l + 1;
  }

  const chosen = recover(mBIC);
  const bounds = [-1, ...chosen, n - 1];
  const segments = seq(bounds.length - 1).map((_, i) => ({
    start: bounds[i] + 1,
    end: bounds[i + 1],
    mean: segMean(bounds[i] + 1, bounds[i + 1]),
  }));
  const series = y.map((v, t) => {
    const s = segments.find((sg) => t >= sg.start && t <= sg.end) ?? segments[segments.length - 1];
    return { t, y: v, fit: s.mean };
  });

  return { breaks: chosen, segments, ssrByM, sequential, mBIC, mSequential: mSeq, series };
}

/* ══════════════════ 6. Density-forecast evaluation ══════════════════ */

/** Student-t quantile by bisection on the t CDF. */
export function tQuantile(p: number, df: number): number {
  const cdf = (x: number) => (x >= 0 ? 1 - tTwoTail(x, df) / 2 : tTwoTail(-x, df) / 2);
  let lo = -50, hi = 50;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (cdf(mid) < p) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function normalQuantile(p: number): number {
  let lo = -12, hi = 12;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (normalCdf(mid) < p) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface DensityModelScore {
  name: string;
  logScore: number;
  crps: number;
  pit: number[];
  pitHist: { bin: string; freq: number }[];
  uniformityChi2: number;
  uniformityP: number;
  coverage90: number;
  pinball: number;
}

export interface DensityEvalResult {
  returns: number[];
  trueVol: number[];
  models: DensityModelScore[];
  bestBy: { logScore: string; crps: string };
}

/** CRPS via the pinball (quantile-score) integral: CRPS = 2 ∫ QS_τ dτ. */
function crpsFromQuantiles(y: number, q: (tau: number) => number, m = 49): number {
  let s = 0;
  for (let i = 1; i <= m; i++) {
    const tau = i / (m + 1);
    const qq = q(tau);
    s += y >= qq ? tau * (y - qq) : (1 - tau) * (qq - y);
  }
  return (2 * s) / m;
}

/**
 * Simulate GARCH-type returns, then score three competing predictive densities:
 * homoskedastic normal, homoskedastic Student-t, and a GARCH(1,1) normal.
 */
export function densityEvalLab(opts: {
  n?: number; seed?: number; alpha?: number; beta?: number; nu?: number; fatTails?: boolean;
}): DensityEvalResult {
  const n = opts.n ?? 800;
  const alpha = opts.alpha ?? 0.1;
  const beta = opts.beta ?? 0.85;
  const nu = opts.nu ?? 5;
  const rng = mulberry32(opts.seed ?? 17);
  const omega = 0.00001;
  let s2 = omega / Math.max(1 - alpha - beta, 0.02);
  const returns: number[] = [];
  const trueVol: number[] = [];
  let prev = 0;
  for (let t = 0; t < n; t++) {
    s2 = omega + alpha * prev * prev + beta * s2;
    let z = randn(rng);
    if (opts.fatTails) {
      // t(nu) standardised innovation
      let chi = 0;
      for (let k = 0; k < nu; k++) chi += randn(rng) ** 2;
      z = (z / Math.sqrt(chi / nu)) * Math.sqrt((nu - 2) / nu);
    }
    const r = Math.sqrt(s2) * z;
    returns.push(r);
    trueVol.push(Math.sqrt(s2));
    prev = r;
  }

  const mu = mean(returns);
  const sigmaU = sd(returns);
  const g = fitGarch11(returns);
  const garchDaily = g.condVol.map((v) => v / Math.sqrt(252));

  const build = (name: string, sigmaAt: (t: number) => number, dist: "n" | "t"): DensityModelScore => {
    const pit: number[] = [];
    let ls = 0, crps = 0, cov = 0, pin = 0;
    const scaleT = Math.sqrt(nu / (nu - 2));
    for (let t = 0; t < n; t++) {
      const s = Math.max(sigmaAt(t), 1e-8);
      const z = (returns[t] - mu) / s;
      if (dist === "n") {
        pit.push(normalCdf(z));
        ls += -0.5 * (Math.log(2 * Math.PI) + 2 * Math.log(s) + z * z);
      } else {
        const zs = z * scaleT;
        pit.push(zs >= 0 ? 1 - tTwoTail(zs, nu) / 2 : tTwoTail(-zs, nu) / 2);
        // y = mu + s·z with z = zs/scaleT standardised ⇒ log f(y) = -log s + log scaleT + log f_t(zs)
        const c =
          Math.log(gammaFn((nu + 1) / 2)) - Math.log(gammaFn(nu / 2)) -
          0.5 * Math.log(nu * Math.PI) - Math.log(s) + Math.log(scaleT);
        ls += c - ((nu + 1) / 2) * Math.log(1 + (zs * zs) / nu);
      }
      const qf = (tau: number) => mu + s * (dist === "n" ? normalQuantile(tau) : tQuantile(tau, nu) / scaleT);
      crps += crpsFromQuantiles(returns[t], qf, 19);
      const lo = qf(0.05), hi = qf(0.95);
      if (returns[t] >= lo && returns[t] <= hi) cov++;
      for (const tau of [0.05, 0.25, 0.5, 0.75, 0.95]) {
        const q = qf(tau);
        pin += returns[t] >= q ? tau * (returns[t] - q) : (1 - tau) * (q - returns[t]);
      }
    }
    const bins = 10;
    const counts = Array(bins).fill(0);
    pit.forEach((p) => counts[Math.min(bins - 1, Math.max(0, Math.floor(p * bins)))]++);
    const expct = n / bins;
    const chi2 = counts.reduce((s2v, c) => s2v + (c - expct) ** 2 / expct, 0);
    return {
      name,
      logScore: ls / n,
      crps: crps / n,
      pit,
      pitHist: counts.map((c, i) => ({ bin: `${(i * 10)}-${(i + 1) * 10}%`, freq: c / n })),
      uniformityChi2: chi2,
      uniformityP: chiSquarePValue(chi2, bins - 1),
      coverage90: cov / n,
      pinball: pin / (n * 5),
    };
  };

  const models = [
    build("同方差正态", () => sigmaU, "n"),
    build(`同方差 t(${nu})`, () => sigmaU, "t"),
    build("GARCH(1,1) 正态", (t) => garchDaily[t] ?? sigmaU, "n"),
  ];
  const bestLS = models.reduce((b, m) => (m.logScore > b.logScore ? m : b), models[0]);
  const bestCR = models.reduce((b, m) => (m.crps < b.crps ? m : b), models[0]);
  return { returns, trueVol, models, bestBy: { logScore: bestLS.name, crps: bestCR.name } };
}

/** Lanczos gamma function. */
export function gammaFn(x: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gammaFn(1 - x));
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * a;
}

/* ══════════════════ 7. Model Confidence Set & combination ══════════════════ */

export interface MCSResult {
  models: { name: string; mse: number; inMCS: boolean; pElim: number; weightInv: number; weightOpt: number }[];
  eliminationOrder: string[];
  combos: { name: string; mse: number }[];
  pairwiseDM: { a: string; b: string; dm: number; p: number }[];
  alpha: number;
}

/**
 * Hansen's Model Confidence Set (T_max statistic, block bootstrap) plus
 * equal / inverse-MSE / optimal forecast combinations.
 */
export function mcsLab(opts: {
  n?: number; seed?: number; boots?: number; alpha?: number; block?: number;
  /** loss series per model; if omitted a 5-model forecasting race is simulated. */
  errors?: { name: string; e: number[] }[];
}): MCSResult {
  const n = opts.n ?? 300;
  const alpha = opts.alpha ?? 0.1;
  const boots = opts.boots ?? 300;
  const block = opts.block ?? 6;
  const rng = mulberry32(opts.seed ?? 41);

  const errors = opts.errors ?? (() => {
    const quality = [0.9, 0.95, 1.0, 1.05, 1.4];
    const names = ["AR(1)", "ARMA(1,1)", "Holt-Winters", "VAR", "随机游走"];
    const common: number[] = seq(n).map(() => randn(rng));
    return names.map((name, i) => ({
      name,
      e: common.map((c) => quality[i] * (0.7 * c + 0.7 * randn(rng))),
    }));
  })();

  const loss = errors.map((m) => ({ name: m.name, l: m.e.map((v) => v * v), e: m.e }));
  const mseOf = (l: number[]) => mean(l);

  // block-bootstrap indices reused across the elimination loop
  const bootIdx: number[][] = [];
  for (let b = 0; b < boots; b++) {
    const idx: number[] = [];
    while (idx.length < n) {
      const start = Math.floor(rng() * n);
      for (let k = 0; k < block && idx.length < n; k++) idx.push((start + k) % n);
    }
    bootIdx.push(idx);
  }

  let alive = loss.map((_, i) => i);
  const eliminationOrder: string[] = [];
  const pElim: Record<string, number> = {};
  let pMax = 0;
  while (alive.length > 1) {
    const means = alive.map((i) => mseOf(loss[i].l));
    const grand = mean(means);
    // t_i = (Li - Lbar) / se via bootstrap
    const bootT: number[] = [];
    const seI = alive.map(() => 0);
    const bootDev: number[][] = alive.map(() => []);
    for (let b = 0; b < boots; b++) {
      const idx = bootIdx[b];
      const bm = alive.map((i) => mean(idx.map((t) => loss[i].l[t])));
      const bg = mean(bm);
      alive.forEach((_, k) => bootDev[k].push(bm[k] - bg - (means[k] - grand)));
    }
    alive.forEach((_, k) => { seI[k] = Math.max(sd(bootDev[k]), 1e-12); });
    const tStats = alive.map((_, k) => (means[k] - grand) / seI[k]);
    const tMax = Math.max(...tStats);
    for (let b = 0; b < boots; b++) {
      const devs = alive.map((_, k) => bootDev[k][b] / seI[k]);
      bootT.push(Math.max(...devs));
    }
    const p = bootT.filter((v) => v >= tMax).length / boots;
    pMax = Math.max(pMax, p);
    if (p > alpha) break;
    const worstK = tStats.indexOf(tMax);
    const worst = alive[worstK];
    pElim[loss[worst].name] = pMax;
    eliminationOrder.push(loss[worst].name);
    alive = alive.filter((i) => i !== worst);
  }

  // combination weights
  const mses = loss.map((m) => mseOf(m.l));
  const invW = mses.map((m) => 1 / m);
  const invSum = invW.reduce((s, v) => s + v, 0);
  const E = loss.map((m) => m.e);
  // optimal weights: min w'Σw s.t. Σw = 1  →  w ∝ Σ⁻¹1
  const k = E.length;
  const S = Array.from({ length: k }, (_, i) =>
    Array.from({ length: k }, (_, j) => mean(E[i].map((v, t) => v * E[j][t])))
  );
  for (let i = 0; i < k; i++) S[i][i] += 1e-6;
  const solveInv1 = (() => {
    const A = S.map((r, i) => [...r, 1]);
    // Gaussian elimination for S x = 1
    for (let i = 0; i < k; i++) {
      let piv = i;
      for (let r = i + 1; r < k; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
      [A[i], A[piv]] = [A[piv], A[i]];
      const d = A[i][i] || 1e-12;
      for (let j = i; j <= k; j++) A[i][j] /= d;
      for (let r = 0; r < k; r++) {
        if (r === i) continue;
        const f = A[r][i];
        for (let j = i; j <= k; j++) A[r][j] -= f * A[i][j];
      }
    }
    return A.map((r) => r[k]);
  })();
  const optSum = solveInv1.reduce((s, v) => s + v, 0) || 1;
  const optW = solveInv1.map((v) => v / optSum);

  const comboMse = (w: number[]) =>
    mean(seq(n).map((_, t) => {
      const e = E.reduce((s, ev, i) => s + w[i] * ev[t], 0);
      return e * e;
    }));
  const eq = Array(k).fill(1 / k);
  const combos = [
    { name: "最优单模型", mse: Math.min(...mses) },
    { name: "等权组合", mse: comboMse(eq) },
    { name: "逆 MSE 加权", mse: comboMse(invW.map((v) => v / invSum)) },
    { name: "最优权重 (Σ⁻¹1)", mse: comboMse(optW) },
  ];

  const pairwiseDM: MCSResult["pairwiseDM"] = [];
  for (let i = 0; i < k; i++)
    for (let j = i + 1; j < k; j++) {
      const d = seq(n).map((_, t) => loss[i].l[t] - loss[j].l[t]);
      const dm = mean(d) / (sd(d) / Math.sqrt(n) || 1e-12);
      pairwiseDM.push({
        a: loss[i].name, b: loss[j].name, dm,
        p: 2 * (1 - normalCdf(Math.abs(dm))),
      });
    }

  return {
    models: loss.map((m, i) => ({
      name: m.name,
      mse: mses[i],
      inMCS: alive.includes(i),
      pElim: pElim[m.name] ?? 1,
      weightInv: invW[i] / invSum,
      weightOpt: optW[i],
    })),
    eliminationOrder,
    combos,
    pairwiseDM,
    alpha,
  };
}

/* ══════════════════ 8. Stochastic volatility vs GARCH ══════════════════ */

export interface SVResult {
  trueVol: number[];
  svVol: number[];
  garchVol: number[];
  returns: number[];
  params: { phi: number; sigmaEta: number; muH: number; logLik: number };
  garchParams: { alpha: number; beta: number; persistence: number };
  rmseSV: number;
  rmseGarch: number;
  logScoreSV: number;
  logScoreGarch: number;
  corrSV: number;
  corrGarch: number;
}

/** Bootstrap particle filter for h_t = μ + φ(h_{t-1}−μ) + σ_η η_t, y_t = e^{h_t/2} ε_t. */
export function particleFilterSV(
  y: number[], phi: number, sigmaEta: number, muH: number, nPart = 300, seed = 7
) {
  const rng = mulberry32(seed);
  let parts = Array.from({ length: nPart }, () => muH + (sigmaEta / Math.sqrt(Math.max(1 - phi * phi, 0.01))) * randn(rng));
  const filtered: number[] = [];
  let ll = 0;
  for (let t = 0; t < y.length; t++) {
    parts = parts.map((h) => muH + phi * (h - muH) + sigmaEta * randn(rng));
    const w = parts.map((h) => {
      const s2 = Math.exp(h);
      return Math.exp(-0.5 * (Math.log(2 * Math.PI * s2) + (y[t] * y[t]) / s2));
    });
    const sw = w.reduce((s, v) => s + v, 0);
    if (!(sw > 0) || !Number.isFinite(sw)) { filtered.push(Math.exp(muH / 2)); continue; }
    ll += Math.log(sw / nPart);
    const wn = w.map((v) => v / sw);
    filtered.push(Math.sqrt(parts.reduce((s, h, i) => s + wn[i] * Math.exp(h), 0)));
    // systematic resampling
    const u0 = rng() / nPart;
    const out: number[] = [];
    let c = wn[0], i = 0;
    for (let j = 0; j < nPart; j++) {
      const u = u0 + j / nPart;
      while (u > c && i < nPart - 1) { i++; c += wn[i]; }
      out.push(parts[i]);
    }
    parts = out;
  }
  return { filtered, logLik: ll };
}

/** Simulate an SV process, estimate it by a coarse PF grid and race it against GARCH. */
export function svVsGarch(opts: {
  n?: number; seed?: number; phi?: number; sigmaEta?: number; muH?: number; particles?: number;
}): SVResult {
  const n = opts.n ?? 500;
  const phiT = opts.phi ?? 0.97;
  const sigT = opts.sigmaEta ?? 0.2;
  const muH = opts.muH ?? Math.log(0.01 * 0.01);
  const nPart = opts.particles ?? 250;
  const rng = mulberry32(opts.seed ?? 23);

  let h = muH;
  const returns: number[] = [];
  const trueVol: number[] = [];
  for (let t = 0; t < n; t++) {
    h = muH + phiT * (h - muH) + sigT * randn(rng);
    const s = Math.exp(h / 2);
    trueVol.push(s);
    returns.push(s * randn(rng));
  }

  // coarse grid MLE on (phi, sigmaEta)
  let best = { phi: 0.9, sigmaEta: 0.2, ll: -Infinity, filtered: [] as number[] };
  const muHat = Math.log(Math.max(mean(returns.map((r) => r * r)), 1e-12));
  for (const phi of [0.8, 0.88, 0.94, 0.97, 0.99]) {
    for (const se of [0.1, 0.2, 0.3, 0.45]) {
      const r = particleFilterSV(returns, phi, se, muHat, nPart, (opts.seed ?? 23) + 5);
      if (r.logLik > best.ll) best = { phi, sigmaEta: se, ll: r.logLik, filtered: r.filtered };
    }
  }

  const g = fitGarch11(returns);
  const garchVol = g.condVol.map((v) => v / Math.sqrt(252));
  const rmse = (a: number[]) => Math.sqrt(mean(a.map((v, i) => (v - trueVol[i]) ** 2)));
  const corr = (a: number[]) => {
    const ma = mean(a), mb = mean(trueVol);
    const cov = mean(a.map((v, i) => (v - ma) * (trueVol[i] - mb)));
    return cov / (sd(a) * sd(trueVol) || 1e-12);
  };
  const logScore = (v: number[]) =>
    mean(returns.map((r, i) => {
      const s2 = Math.max(v[i] * v[i], 1e-14);
      return -0.5 * (Math.log(2 * Math.PI * s2) + (r * r) / s2);
    }));

  return {
    trueVol,
    svVol: best.filtered,
    garchVol,
    returns,
    params: { phi: best.phi, sigmaEta: best.sigmaEta, muH: muHat, logLik: best.ll },
    garchParams: { alpha: g.alpha, beta: g.beta, persistence: g.persistence },
    rmseSV: rmse(best.filtered),
    rmseGarch: rmse(garchVol),
    logScoreSV: logScore(best.filtered),
    logScoreGarch: logScore(garchVol),
    corrSV: corr(best.filtered),
    corrGarch: corr(garchVol),
  };
}

/** Convenience re-export so tools can show an F-test p-value. */
export { fPValue };
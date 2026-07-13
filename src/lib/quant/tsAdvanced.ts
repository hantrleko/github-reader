/**
 * Advanced time-series library (V4.0) — pure, dependency-free math for:
 *   1. VAR fitting + lag selection, Granger causality & Toda-Yamamoto Wald
 *   2. Periodogram / smoothed spectral density, Bai-Perron single break, CUSUM,
 *      McLeod-Li & Keenan non-linearity tests
 *   3. Holt-Winters / ETS / Theta forecasting, classical decomposition,
 *      rolling one-step out-of-sample backtest (RMSE/MAE/MASE/RMSSE)
 *   4. Long-memory estimation: GPH log-periodogram d, R/S Hurst, fractional
 *      differencing + ARFIMA(0,d,0) simulation
 *
 * Reuses the vetted p-value routines from econometrics.ts so distribution tails
 * stay consistent across the platform.
 */
import { chiSquarePValue, fPValue, normalCdf, tTwoTail } from "./econometrics";

/* ─────────────────────────── small helpers ─────────────────────────── */
function mean(a: number[]): number {
  if (!a.length) return 0;
  return a.reduce((s, x) => s + x, 0) / a.length;
}
function sum(a: number[]): number {
  return a.reduce((s, x) => s + x, 0);
}
function variance(a: number[]): number {
  if (a.length < 2) return 0;
  const m = mean(a);
  return a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1);
}
function std(a: number[]): number {
  return Math.sqrt(variance(a));
}

/** Invert a small square matrix via Gauss-Jordan (returns identity-scaled on singular). */
function matInvert(mat: number[][]): number[][] {
  const n = mat.length;
  const A = mat.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(A[k][i]) > Math.abs(A[piv][i])) piv = k;
    if (Math.abs(A[piv][i]) < 1e-12) { A[i][i] += 1e-8; piv = i; }
    [A[i], A[piv]] = [A[piv], A[i]];
    const d = A[i][i];
    for (let j = 0; j < 2 * n; j++) A[i][j] /= d;
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const f = A[k][i];
      for (let j = 0; j < 2 * n; j++) A[k][j] -= f * A[i][j];
    }
  }
  return A.map((r) => r.slice(n));
}

/** OLS with an explicit design matrix that ALREADY includes the intercept column. */
function olsRaw(Xd: number[][], y: number[]) {
  const n = y.length;
  const k = Xd[0].length;
  const XtX = Array.from({ length: k }, () => Array(k).fill(0));
  const Xty = Array(k).fill(0);
  for (let i = 0; i < n; i++)
    for (let a = 0; a < k; a++) {
      Xty[a] += Xd[i][a] * y[i];
      for (let b = 0; b < k; b++) XtX[a][b] += Xd[i][a] * Xd[i][b];
    }
  const XtXinv = matInvert(XtX);
  const beta = XtXinv.map((row) => row.reduce((s, v, j) => s + v * Xty[j], 0));
  const fitted = Xd.map((row) => row.reduce((s, v, j) => s + v * beta[j], 0));
  const resid = y.map((v, i) => v - fitted[i]);
  const rss = resid.reduce((s, e) => s + e * e, 0);
  const dof = Math.max(n - k, 1);
  const sigma2 = rss / dof;
  return { beta, XtXinv, fitted, resid, rss, sigma2, n, k };
}

/** Sample autocorrelation for lags 1..maxLag. */
export function acfLags(x: number[], maxLag = 24): number[] {
  const n = x.length;
  if (n < 2) return [];
  const m = mean(x);
  let c0 = 0;
  for (let i = 0; i < n; i++) c0 += (x[i] - m) ** 2;
  c0 /= n;
  const out: number[] = [];
  for (let k = 1; k <= Math.min(maxLag, n - 1); k++) {
    let ck = 0;
    for (let i = 0; i < n - k; i++) ck += (x[i] - m) * (x[i + k] - m);
    ck /= n;
    out.push(c0 > 1e-12 ? ck / c0 : 0);
  }
  return out;
}

/* ══════════════════════════════════════════════════════════════════
   LINE 1 · VAR + Granger causality + Toda-Yamamoto
   ══════════════════════════════════════════════════════════════════ */

/** Build lagged design for a target series regressed on p lags of each variable. */
function lagMatrix(vars: number[][], p: number, extraLags = 0): { rows: number[][]; start: number; T: number } {
  const L = p + extraLags;
  const T = vars[0].length;
  const rows: number[][] = [];
  for (let t = L; t < T; t++) {
    const row: number[] = [1];
    for (const v of vars) for (let l = 1; l <= L; l++) row.push(v[t - l]);
    rows.push(row);
  }
  return { rows, start: L, T };
}

export interface VARLagChoice { p: number; aic: number; bic: number; hq: number }

/**
 * Select VAR lag order over 1..maxLag on a two-variable system using the
 * residual-covariance determinant information criteria.
 */
export function selectVARLag(y: number[], x: number[], maxLag = 8): { table: VARLagChoice[]; aicBest: number; bicBest: number } {
  const table: VARLagChoice[] = [];
  const T = y.length;
  for (let p = 1; p <= Math.min(maxLag, Math.floor(T / 4)); p++) {
    const { rows } = lagMatrix([y, x], p);
    const ys = y.slice(p);
    const xs = x.slice(p);
    const fy = olsRaw(rows, ys);
    const fx = olsRaw(rows, xs);
    const n = fy.n;
    // 2x2 residual covariance determinant
    const ey = fy.resid, ex = fx.resid;
    const s11 = ey.reduce((s, e) => s + e * e, 0) / n;
    const s22 = ex.reduce((s, e) => s + e * e, 0) / n;
    let s12 = 0;
    for (let i = 0; i < n; i++) s12 += ey[i] * ex[i];
    s12 /= n;
    const det = Math.max(s11 * s22 - s12 * s12, 1e-300);
    const K = 2; // variables
    const params = K * (K * p + 1); // total coeffs in system
    const logDet = Math.log(det);
    table.push({
      p,
      aic: logDet + (2 * params) / n,
      bic: logDet + (Math.log(n) * params) / n,
      hq: logDet + (2 * Math.log(Math.log(n)) * params) / n,
    });
  }
  let aicBest = table[0]?.p ?? 1, bicBest = table[0]?.p ?? 1;
  let aMin = Infinity, bMin = Infinity;
  for (const r of table) {
    if (r.aic < aMin) { aMin = r.aic; aicBest = r.p; }
    if (r.bic < bMin) { bMin = r.bic; bicBest = r.p; }
  }
  return { table, aicBest, bicBest };
}

export interface GrangerResult {
  fStat: number;
  fPValue: number;
  chi2: number;
  chi2PValue: number;
  df: number;
  reject: boolean;
}

/**
 * Granger causality of `cause` → `effect` at lag p (F-test of the cause's lags
 * in the effect equation).
 */
export function grangerCausality(effect: number[], cause: number[], p: number): GrangerResult {
  const T = effect.length;
  const yr = effect.slice(p);
  // Unrestricted: lags of effect + lags of cause
  const un: number[][] = [];
  const re: number[][] = [];
  for (let t = p; t < T; t++) {
    const base = [1];
    for (let l = 1; l <= p; l++) base.push(effect[t - l]);
    re.push([...base]);
    const u = [...base];
    for (let l = 1; l <= p; l++) u.push(cause[t - l]);
    un.push(u);
  }
  const fu = olsRaw(un, yr);
  const fr = olsRaw(re, yr);
  const q = p; // restrictions
  const dfDen = fu.n - fu.k;
  const fStat = ((fr.rss - fu.rss) / q) / (fu.rss / dfDen);
  const chi2 = q * fStat;
  return {
    fStat,
    fPValue: fPValue(fStat, q, dfDen),
    chi2,
    chi2PValue: chiSquarePValue(chi2, q),
    df: q,
    reject: fPValue(fStat, q, dfDen) < 0.05,
  };
}

export interface TYResult {
  wald: number;
  pValue: number;
  df: number;
  reject: boolean;
}

/**
 * Toda-Yamamoto causality: fit an augmented VAR(p + dmax) and Wald-test the
 * first p lags of `cause` in the `effect` equation. Robust to unit roots /
 * cointegration because the extra dmax lags absorb the integration order.
 */
export function todaYamamoto(effect: number[], cause: number[], p: number, dmax = 1): TYResult {
  const L = p + dmax;
  const T = effect.length;
  const yr = effect.slice(L);
  const Xd: number[][] = [];
  for (let t = L; t < T; t++) {
    const row = [1];
    for (let l = 1; l <= L; l++) row.push(effect[t - l]); // effect lags: cols 1..L
    for (let l = 1; l <= L; l++) row.push(cause[t - l]);  // cause lags: cols L+1..2L
    Xd.push(row);
  }
  const fit = olsRaw(Xd, yr);
  // Restriction: cause lags 1..p (columns 1+L .. 1+L+p-1) equal zero.
  const idx: number[] = [];
  for (let l = 0; l < p; l++) idx.push(1 + L + l);
  const Rbeta = idx.map((i) => fit.beta[i]);
  // Covariance of beta = sigma2 * XtXinv; extract sub-block.
  const V = idx.map((i) => idx.map((j) => fit.sigma2 * fit.XtXinv[i][j]));
  const Vinv = matInvert(V);
  let wald = 0;
  for (let a = 0; a < p; a++)
    for (let b = 0; b < p; b++) wald += Rbeta[a] * Vinv[a][b] * Rbeta[b];
  return { wald, pValue: chiSquarePValue(wald, p), df: p, reject: chiSquarePValue(wald, p) < 0.05 };
}

/* ══════════════════════════════════════════════════════════════════
   LINE 2 · Spectral analysis, structural break, non-linearity
   ══════════════════════════════════════════════════════════════════ */

export interface SpectralPoint { freq: number; period: number; power: number; smooth: number }
export interface SpectralResult {
  points: SpectralPoint[];
  dominantPeriod: number;
  dominantFreq: number;
}

/**
 * Periodogram and Daniell-smoothed spectral density of a mean-removed series.
 * `windowHalf` is the half-width of the moving-average smoother.
 */
export function periodogram(series: number[], windowHalf = 2): SpectralResult {
  const n = series.length;
  const m = mean(series);
  const x = series.map((v) => v - m);
  const K = Math.floor(n / 2);
  const raw: SpectralPoint[] = [];
  for (let k = 1; k <= K; k++) {
    const w = (2 * Math.PI * k) / n;
    let re = 0, im = 0;
    for (let t = 0; t < n; t++) {
      re += x[t] * Math.cos(w * t);
      im += x[t] * Math.sin(w * t);
    }
    const power = (re * re + im * im) / (2 * Math.PI * n);
    raw.push({ freq: w, period: n / k, power, smooth: power });
  }
  // Daniell smoothing
  for (let i = 0; i < raw.length; i++) {
    let s = 0, c = 0;
    for (let j = -windowHalf; j <= windowHalf; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < raw.length) { s += raw[idx].power; c++; }
    }
    raw[i].smooth = c ? s / c : raw[i].power;
  }
  let best = raw[0];
  for (const p of raw) if (p.smooth > best.smooth) best = p;
  return { points: raw, dominantPeriod: best.period, dominantFreq: best.freq };
}

export interface BreakResult {
  breakIndex: number;
  supF: number;
  pValue: number;
  reject: boolean;
  rssNoBreak: number;
  rssBreak: number;
}

/**
 * Bai-Perron style single structural break in a linear-trend model
 * y = a + b·t. Sup-F searches trimmed candidate break points.
 */
export function structuralBreak(series: number[], trim = 0.15): BreakResult {
  const n = series.length;
  const t = Array.from({ length: n }, (_, i) => i);
  const full = olsRaw(t.map((ti) => [1, ti]).map((r) => r), series); // note intercept already in row
  // build proper design [1, t]
  const Xfull = t.map((ti) => [1, ti]);
  const f0 = olsRaw(Xfull, series);
  const lo = Math.max(3, Math.floor(n * trim));
  const hi = Math.min(n - 3, Math.floor(n * (1 - trim)));
  let best = { idx: lo, rss: Infinity, F: 0 };
  for (let m = lo; m <= hi; m++) {
    const X1 = [], y1 = [], X2 = [], y2 = [];
    for (let i = 0; i < n; i++) {
      if (i < m) { X1.push([1, i]); y1.push(series[i]); }
      else { X2.push([1, i]); y2.push(series[i]); }
    }
    const a = olsRaw(X1, y1), b = olsRaw(X2, y2);
    const rss = a.rss + b.rss;
    const q = 2; // params tested
    const F = ((f0.rss - rss) / q) / (rss / (n - 2 * q));
    if (rss < best.rss) best = { idx: m, rss, F };
  }
  void full;
  const q = 2;
  return {
    breakIndex: best.idx,
    supF: best.F,
    pValue: fPValue(best.F, q, n - 2 * q),
    reject: fPValue(best.F, q, n - 2 * q) < 0.05,
    rssNoBreak: f0.rss,
    rssBreak: best.rss,
  };
}

export interface CusumPoint { t: number; cusum: number; upper: number; lower: number }

/**
 * OLS-CUSUM of standardized residuals from a linear-trend fit, with 5%
 * Brown-Durbin-Evans boundaries (a = 0.948).
 */
export function cusumTest(series: number[]): { points: CusumPoint[]; crossed: boolean } {
  const n = series.length;
  const X = Array.from({ length: n }, (_, i) => [1, i]);
  const fit = olsRaw(X, series);
  const sigma = Math.sqrt(fit.rss / Math.max(n - 2, 1));
  const a = 0.948;
  const points: CusumPoint[] = [];
  let run = 0;
  let crossed = false;
  for (let t = 0; t < n; t++) {
    run += fit.resid[t] / sigma;
    const w = run / Math.sqrt(n);
    const frac = (t + 1) / n;
    const bound = a * (1 + 2 * frac);
    if (Math.abs(w) > bound) crossed = true;
    points.push({ t, cusum: w, upper: bound, lower: -bound });
  }
  return { points, crossed };
}

export interface LjungResult { stat: number; df: number; pValue: number; reject: boolean }

/** McLeod-Li test: Ljung-Box applied to squared, mean-removed series (ARCH / non-linear structure). */
export function mcLeodLi(series: number[], lags = 12): LjungResult {
  const m = mean(series);
  const sq = series.map((v) => (v - m) ** 2);
  const r = acfLags(sq, lags);
  const n = series.length;
  let q = 0;
  for (let k = 1; k <= r.length; k++) q += (r[k - 1] * r[k - 1]) / (n - k);
  q *= n * (n + 2);
  return { stat: q, df: r.length, pValue: chiSquarePValue(q, r.length), reject: chiSquarePValue(q, r.length) < 0.05 };
}

/**
 * Keenan's one-degree test for additivity / non-linearity (Tsay family).
 * Fits an AR(p), then checks whether squared fitted values add explanatory power.
 */
export function keenanTest(series: number[], p = 2): LjungResult {
  const n = series.length;
  const y = series.slice(p);
  const X: number[][] = [];
  for (let t = p; t < n; t++) {
    const row = [1];
    for (let l = 1; l <= p; l++) row.push(series[t - l]);
    X.push(row);
  }
  const fit = olsRaw(X, y);
  // Regress fitted^2 on X, take residual z; regress AR residual e on z.
  const f2 = fit.fitted.map((v) => v * v);
  const zfit = olsRaw(X, f2);
  const z = zfit.resid;
  // e = eta0 * z + err
  const zz = z.reduce((s, v) => s + v * v, 0) || 1e-12;
  const ze = z.reduce((s, v, i) => s + v * fit.resid[i], 0);
  const eta = ze / zz;
  const rssNew = fit.resid.reduce((s, e, i) => s + (e - eta * z[i]) ** 2, 0);
  const N = y.length;
  const F = ((fit.rss - rssNew) / 1) / (rssNew / (N - fit.k - 1));
  return { stat: F, df: 1, pValue: fPValue(F, 1, N - fit.k - 1), reject: fPValue(F, 1, N - fit.k - 1) < 0.05 };
}

/* ══════════════════════════════════════════════════════════════════
   LINE 3 · Exponential smoothing, decomposition, backtest
   ══════════════════════════════════════════════════════════════════ */

export type HWSeasonal = "additive" | "multiplicative" | "none";

export interface HWFit {
  fitted: number[];
  forecast: number[];
  level: number;
  trend: number;
  season: number[];
  alpha: number;
  beta: number;
  gamma: number;
  sse: number;
}

/** Holt-Winters with fixed smoothing parameters. */
function holtWintersRun(y: number[], m: number, alpha: number, beta: number, gamma: number, seasonal: HWSeasonal, h: number): HWFit {
  const n = y.length;
  const useSeason = seasonal !== "none" && m > 1 && n >= 2 * m;
  // Initialise
  let level = mean(y.slice(0, Math.min(m, n)));
  let trend = 0;
  if (n >= 2 * m && m > 1) {
    const a1 = mean(y.slice(0, m));
    const a2 = mean(y.slice(m, 2 * m));
    trend = (a2 - a1) / m;
  } else if (n >= 2) {
    trend = (y[n - 1] - y[0]) / (n - 1);
  }
  const season = new Array(m).fill(seasonal === "multiplicative" ? 1 : 0);
  if (useSeason) {
    for (let i = 0; i < m; i++) {
      season[i] = seasonal === "multiplicative" ? (level !== 0 ? y[i] / level : 1) : y[i] - level;
    }
  }
  const fitted: number[] = [];
  let sse = 0;
  for (let t = 0; t < n; t++) {
    const si = useSeason ? season[t % m] : (seasonal === "multiplicative" ? 1 : 0);
    const pred = seasonal === "multiplicative" ? (level + trend) * si : level + trend + si;
    fitted.push(pred);
    if (t > 0) sse += (y[t] - pred) ** 2;
    const prevLevel = level;
    if (seasonal === "multiplicative") {
      level = alpha * (si !== 0 ? y[t] / si : y[t]) + (1 - alpha) * (level + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
      if (useSeason) season[t % m] = gamma * (level !== 0 ? y[t] / level : 1) + (1 - gamma) * si;
    } else {
      level = alpha * (y[t] - si) + (1 - alpha) * (level + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
      if (useSeason) season[t % m] = gamma * (y[t] - level) + (1 - gamma) * si;
    }
  }
  const forecast: number[] = [];
  for (let k = 1; k <= h; k++) {
    const si = useSeason ? season[(n + k - 1) % m] : (seasonal === "multiplicative" ? 1 : 0);
    forecast.push(seasonal === "multiplicative" ? (level + k * trend) * si : level + k * trend + si);
  }
  return { fitted, forecast, level, trend, season, alpha, beta, gamma, sse };
}

/** Fit Holt-Winters, grid-searching α,β,γ to minimise one-step SSE. */
export function holtWinters(y: number[], m: number, seasonal: HWSeasonal, h = 12): HWFit {
  const grid = [0.05, 0.1, 0.2, 0.3, 0.5, 0.7, 0.9];
  let best: HWFit | null = null;
  for (const a of grid) for (const b of grid) {
    const gammas = seasonal === "none" ? [0] : grid;
    for (const g of gammas) {
      const f = holtWintersRun(y, m, a, b, g, seasonal, h);
      if (!best || f.sse < best.sse) best = f;
    }
  }
  return best!;
}

export interface ThetaFit { fitted: number[]; forecast: number[] }

/** Standard Theta method (θ = 0 linear trend + θ = 2 SES), equal weights. */
export function thetaMethod(y: number[], h = 12): ThetaFit {
  const n = y.length;
  const t = Array.from({ length: n }, (_, i) => i);
  const X = t.map((ti) => [1, ti]);
  const lin = olsRaw(X, y);
  const [a, b] = lin.beta;
  // Theta-2 line = 2y - linear trend; apply SES.
  const theta2 = y.map((v, i) => 2 * v - (a + b * i));
  // SES optimise alpha
  const grid = [0.1, 0.2, 0.3, 0.5, 0.7, 0.9];
  let bestA = 0.3, bestSSE = Infinity, bestLevel = theta2[0];
  for (const alpha of grid) {
    let lvl = theta2[0], sse = 0;
    for (let i = 1; i < n; i++) { const pred = lvl; sse += (theta2[i] - pred) ** 2; lvl = alpha * theta2[i] + (1 - alpha) * lvl; }
    if (sse < bestSSE) { bestSSE = sse; bestA = alpha; bestLevel = lvl; }
  }
  const fitted: number[] = [];
  let lvl = theta2[0];
  for (let i = 0; i < n; i++) {
    const linVal = a + b * i;
    fitted.push(0.5 * linVal + 0.5 * lvl);
    lvl = bestA * theta2[i] + (1 - bestA) * lvl;
  }
  const forecast: number[] = [];
  for (let k = 1; k <= h; k++) {
    const linVal = a + b * (n - 1 + k);
    forecast.push(0.5 * linVal + 0.5 * bestLevel);
  }
  return { fitted, forecast };
}

export interface Decomposition {
  trend: (number | null)[];
  seasonal: number[];
  remainder: (number | null)[];
}

/** Classical additive decomposition via centered moving average. */
export function classicalDecompose(y: number[], m: number): Decomposition {
  const n = y.length;
  const trend: (number | null)[] = new Array(n).fill(null);
  const half = Math.floor(m / 2);
  for (let t = half; t < n - half; t++) {
    let s = 0;
    if (m % 2 === 0) {
      s += 0.5 * y[t - half] + 0.5 * y[t + half];
      for (let j = -half + 1; j <= half - 1; j++) s += y[t + j];
      s /= m;
    } else {
      for (let j = -half; j <= half; j++) s += y[t + j];
      s /= m;
    }
    trend[t] = s;
  }
  const detr: number[] = [];
  const detrIdx: number[] = [];
  for (let t = 0; t < n; t++) if (trend[t] != null) { detr.push(y[t] - (trend[t] as number)); detrIdx.push(t); }
  const seasonMeans = new Array(m).fill(0);
  const seasonCnt = new Array(m).fill(0);
  for (let i = 0; i < detr.length; i++) { const s = detrIdx[i] % m; seasonMeans[s] += detr[i]; seasonCnt[s]++; }
  for (let s = 0; s < m; s++) seasonMeans[s] = seasonCnt[s] ? seasonMeans[s] / seasonCnt[s] : 0;
  const avg = mean(seasonMeans);
  const seasonNorm = seasonMeans.map((v) => v - avg);
  const seasonal = Array.from({ length: n }, (_, t) => seasonNorm[t % m]);
  const remainder: (number | null)[] = y.map((v, t) => (trend[t] == null ? null : v - (trend[t] as number) - seasonal[t]));
  return { trend, seasonal, remainder };
}

export interface BacktestResult {
  rmse: number;
  mae: number;
  mase: number;
  rmsse: number;
  naiveRmse: number;
  naiveMae: number;
  errors: number[];
  preds: number[];
  actuals: number[];
  startIndex: number;
}

/**
 * Expanding-window one-step-ahead backtest of Holt-Winters vs seasonal-naive.
 * MASE / RMSSE scale by the in-sample seasonal-naive error.
 */
export function rollingBacktest(y: number[], m: number, seasonal: HWSeasonal, initFrac = 0.6): BacktestResult {
  const n = y.length;
  const start = Math.max(m + 2, Math.floor(n * initFrac));
  const preds: number[] = [], actuals: number[] = [], errors: number[] = [];
  const naiveErr: number[] = [];
  for (let t = start; t < n; t++) {
    const hist = y.slice(0, t);
    const f = holtWintersRun(hist, m, 0.3, 0.1, 0.1, seasonal, 1);
    const pred = f.forecast[0];
    preds.push(pred); actuals.push(y[t]); errors.push(y[t] - pred);
    const naive = t >= m ? y[t - m] : y[t - 1];
    naiveErr.push(y[t] - naive);
  }
  // In-sample seasonal-naive scale
  let scaleAbs = 0, scaleSq = 0, cnt = 0;
  for (let t = m; t < n; t++) { const d = Math.abs(y[t] - y[t - m]); scaleAbs += d; scaleSq += d * d; cnt++; }
  scaleAbs = cnt ? scaleAbs / cnt : 1;
  scaleSq = cnt ? Math.sqrt(scaleSq / cnt) : 1;
  const mae = mean(errors.map(Math.abs));
  const rmse = Math.sqrt(mean(errors.map((e) => e * e)));
  return {
    rmse,
    mae,
    mase: scaleAbs > 0 ? mae / scaleAbs : NaN,
    rmsse: scaleSq > 0 ? rmse / scaleSq : NaN,
    naiveMae: mean(naiveErr.map(Math.abs)),
    naiveRmse: Math.sqrt(mean(naiveErr.map((e) => e * e))),
    errors, preds, actuals, startIndex: start,
  };
}

/* ══════════════════════════════════════════════════════════════════
   LINE 4 · Long memory / fractional integration
   ══════════════════════════════════════════════════════════════════ */

export interface GPHResult {
  d: number;
  se: number;
  tStat: number;
  pValue: number;
  m: number;
  points: { x: number; y: number }[];
  slope: number;
  intercept: number;
}

/**
 * Geweke-Porter-Hudak log-periodogram estimator of the fractional-integration
 * order d. Uses the lowest m ≈ n^power Fourier frequencies.
 */
export function gphEstimator(series: number[], power = 0.5): GPHResult {
  const spec = periodogram(series, 0);
  const n = series.length;
  const m = Math.max(4, Math.floor(Math.pow(n, power)));
  const xs: number[] = [], ys: number[] = [];
  const points: { x: number; y: number }[] = [];
  for (let j = 0; j < Math.min(m, spec.points.length); j++) {
    const p = spec.points[j];
    const xj = Math.log(4 * Math.sin(p.freq / 2) ** 2);
    const yj = Math.log(Math.max(p.power, 1e-300));
    xs.push(xj); ys.push(yj);
    points.push({ x: xj, y: yj });
  }
  const mx = mean(xs);
  let sxx = 0, sxy = 0;
  const my = mean(ys);
  for (let i = 0; i < xs.length; i++) { sxx += (xs[i] - mx) ** 2; sxy += (xs[i] - mx) * (ys[i] - my); }
  const slope = sxx > 0 ? sxy / sxx : 0;
  const d = -slope;
  const intercept = my - slope * mx;
  // Asymptotic SE: sd(d) = π / sqrt(6 · Σ(x-x̄)²)
  const se = Math.PI / Math.sqrt(6 * sxx);
  const tStat = d / se;
  return { d, se, tStat, pValue: tTwoTail(tStat, xs.length - 2), m: xs.length, points, slope, intercept };
}

export interface HurstResult {
  hurst: number;
  d: number;
  points: { logN: number; logRS: number }[];
  slope: number;
}

/** Rescaled-range (R/S) Hurst-exponent estimator across dyadic window sizes. */
export function hurstRS(series: number[]): HurstResult {
  const n = series.length;
  const points: { logN: number; logRS: number }[] = [];
  for (let w = 8; w <= Math.floor(n / 2); w = Math.floor(w * 1.6)) {
    const nblocks = Math.floor(n / w);
    if (nblocks < 1) break;
    let rsSum = 0, c = 0;
    for (let b = 0; b < nblocks; b++) {
      const seg = series.slice(b * w, (b + 1) * w);
      const mu = mean(seg);
      const dev = seg.map((v) => v - mu);
      let cum = 0, mn = Infinity, mx = -Infinity;
      for (const dv of dev) { cum += dv; mn = Math.min(mn, cum); mx = Math.max(mx, cum); }
      const R = mx - mn;
      const S = std(seg);
      if (S > 1e-12) { rsSum += R / S; c++; }
    }
    if (c > 0) points.push({ logN: Math.log(w), logRS: Math.log(rsSum / c) });
  }
  const xs = points.map((p) => p.logN), ys = points.map((p) => p.logRS);
  const mx = mean(xs), my = mean(ys);
  let sxx = 0, sxy = 0;
  for (let i = 0; i < xs.length; i++) { sxx += (xs[i] - mx) ** 2; sxy += (xs[i] - mx) * (ys[i] - my); }
  const slope = sxx > 0 ? sxy / sxx : 0.5;
  return { hurst: slope, d: slope - 0.5, points, slope };
}

/** Fractional-differencing binomial weights ψ_j for (1-L)^d, j = 0..len-1. */
export function fracDiffWeights(d: number, len: number): number[] {
  const w = new Array(len).fill(0);
  w[0] = 1;
  for (let k = 1; k < len; k++) w[k] = w[k - 1] * ((k - 1 - d) / k);
  return w;
}

/** Apply fractional differencing (1-L)^d to a series (truncated at series start). */
export function fractionalDifference(series: number[], d: number): number[] {
  const n = series.length;
  const w = fracDiffWeights(d, n);
  const out: number[] = [];
  for (let t = 0; t < n; t++) {
    let s = 0;
    for (let j = 0; j <= t; j++) s += w[j] * series[t - j];
    out.push(s);
  }
  return out;
}

/** Simulate ARFIMA(0,d,0): apply (1-L)^(-d) MA weights to white noise. */
export function simulateARFIMA(n: number, d: number, rng: () => number, burn = 200): number[] {
  const total = n + burn;
  const eps: number[] = [];
  for (let i = 0; i < total; i++) {
    let u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    eps.push(Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v));
  }
  // (1-L)^(-d) weights
  const psi = fracDiffWeights(-d, total);
  const out: number[] = [];
  for (let t = 0; t < total; t++) {
    let s = 0;
    const maxJ = Math.min(t, 500);
    for (let j = 0; j <= maxJ; j++) s += psi[j] * eps[t - j];
    out.push(s);
  }
  return out.slice(burn);
}

export { mean as tsMean, std as tsStd, sum as tsSum, normalCdf };
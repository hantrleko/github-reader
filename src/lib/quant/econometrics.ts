/**
 * Econometric diagnostics, robust inference, dynamic-panel GMM, forecast
 * comparison and nonparametric smoothing — pure, dependency-free helpers so
 * the UI can flag these tools as "verified" and unit-test the maths.
 *
 * Blocks:
 *  - Distribution tails (normal / chi² / t / F) via series & continued fractions
 *  - OLS with residuals + (X'X)⁻¹ for building test statistics
 *  - Diagnostics: Breusch-Pagan, White, Durbin-Watson, Breusch-Godfrey,
 *    VIF / condition number, Ramsey RESET
 *  - Robust SE: HC0 / HC3 (heteroskedasticity) and Newey-West (HAC)
 *  - Arellano-Bond difference-GMM for dynamic panels
 *  - Diebold-Mariano forecast-accuracy test (+ Harvey small-sample correction)
 *  - Nadaraya-Watson & local-linear kernel regression + LOO-CV bandwidth
 */

/* ───────────────────────── distributions ───────────────────────── */

export function erf(x: number): number {
  // Abramowitz & Stegun 7.1.26
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

export function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

/** Two-tailed standard-normal p-value. */
export function normalTwoTail(z: number): number {
  return 2 * (1 - normalCdf(Math.abs(z)));
}

function logGamma(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Regularised lower incomplete gamma P(a, x). */
function gammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    // series
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let n = 0; n < 500; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-12) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  }
  // continued fraction for Q, then P = 1 - Q
  let b = x + 1 - a;
  let c = 1e30;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  const q = Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
  return 1 - q;
}

/** Upper-tail p-value of a chi-squared statistic with df degrees of freedom. */
export function chiSquarePValue(stat: number, df: number): number {
  if (stat <= 0) return 1;
  return 1 - gammaP(df / 2, stat / 2);
}

/** Regularised incomplete beta I_x(a,b) via Lentz continued fraction. */
function betaInc(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
  const cf = (xx: number, aa: number, bb: number) => {
    let c = 1;
    let d = 1 - ((aa + bb) * xx) / (aa + 1);
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    let h = d;
    for (let i = 1; i < 300; i++) {
      const m = Math.floor(i / 2);
      let num: number;
      if (i % 2 === 0) num = (m * (bb - m) * xx) / ((aa + 2 * m - 1) * (aa + 2 * m));
      else num = (-(aa + m) * (aa + bb + m) * xx) / ((aa + 2 * m) * (aa + 2 * m + 1));
      d = 1 + num * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      d = 1 / d;
      c = 1 + num / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      const del = c * d;
      h *= del;
      if (Math.abs(del - 1) < 1e-12) break;
    }
    return h;
  };
  if (x < (a + 1) / (a + b + 2)) return front * cf(x, a, b);
  return 1 - (Math.exp(Math.log(1 - x) * b + Math.log(x) * a - lbeta) / b) * cf(1 - x, b, a);
}

/** Two-tailed p-value of a t statistic. */
export function tTwoTail(t: number, df: number): number {
  const x = df / (df + t * t);
  return betaInc(x, df / 2, 0.5);
}

/** Upper-tail p-value of an F statistic F(d1, d2). */
export function fPValue(f: number, d1: number, d2: number): number {
  if (f <= 0) return 1;
  const x = d2 / (d2 + d1 * f);
  return betaInc(x, d2 / 2, d1 / 2);
}

/* ───────────────────────── linear algebra ───────────────────────── */

function matInvert(mat: number[][]): number[][] {
  const n = mat.length;
  const a = mat.map((r, i) => r.concat(Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))));
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(a[r][i]) > Math.abs(a[piv][i])) piv = r;
    if (piv !== i) [a[i], a[piv]] = [a[piv], a[i]];
    const d = a[i][i];
    if (Math.abs(d) < 1e-14) throw new Error("singular matrix");
    for (let j = 0; j < 2 * n; j++) a[i][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = a[r][i];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[i][j];
    }
  }
  return a.map((row) => row.slice(n));
}

function mean(a: number[]): number {
  return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
}

/* ───────────────────────── OLS core ───────────────────────── */

export interface OLSDetail {
  beta: number[]; // intercept then slopes
  resid: number[];
  fitted: number[];
  XtXinv: number[][];
  Xd: number[][]; // design matrix WITH intercept column
  n: number;
  k: number; // params incl. intercept
  sigma2: number;
  r2: number;
  se: number[]; // classical OLS SE
}

/** OLS y ~ [1, X]. `X` is n×p WITHOUT intercept (added automatically). */
export function olsDetail(X: number[][], y: number[]): OLSDetail {
  const n = y.length;
  const p = X[0]?.length ?? 0;
  const k = p + 1;
  const Xd = X.map((row) => [1, ...row]);
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
  const yMean = mean(y);
  let rss = 0;
  let tss = 0;
  for (let i = 0; i < n; i++) {
    rss += resid[i] * resid[i];
    tss += (y[i] - yMean) ** 2;
  }
  const dof = Math.max(n - k, 1);
  const sigma2 = rss / dof;
  const se = XtXinv.map((row, i) => Math.sqrt(Math.max(sigma2 * row[i], 0)));
  const r2 = tss === 0 ? 1 : 1 - rss / tss;
  return { beta, resid, fitted, XtXinv, Xd, n, k, sigma2, r2, se };
}

/* ───────────────────────── diagnostics ───────────────────────── */

export interface TestResult {
  stat: number;
  df: number;
  pValue: number;
  reject: boolean; // at 5%
}

/** Breusch-Pagan test for heteroskedasticity (LM = n·R² of e² on regressors). */
export function breuschPagan(fit: OLSDetail): TestResult {
  const e2 = fit.resid.map((e) => e * e);
  const X = fit.Xd.map((row) => row.slice(1)); // drop intercept for regressors
  const aux = olsDetail(X, e2);
  const stat = fit.n * aux.r2;
  const df = fit.k - 1;
  const p = chiSquarePValue(stat, df);
  return { stat, df, pValue: p, reject: p < 0.05 };
}

/** White test: e² on regressors, their squares and cross products. */
export function whiteTest(fit: OLSDetail): TestResult {
  const cols = fit.Xd[0].length - 1; // number of regressors (excl intercept)
  const base = fit.Xd.map((row) => row.slice(1));
  const design: number[][] = base.map((row) => {
    const out = [...row];
    for (let a = 0; a < cols; a++)
      for (let b = a; b < cols; b++) out.push(row[a] * row[b]);
    return out;
  });
  const e2 = fit.resid.map((e) => e * e);
  const aux = olsDetail(design, e2);
  const stat = fit.n * aux.r2;
  const df = aux.k - 1;
  const p = chiSquarePValue(stat, df);
  return { stat, df, pValue: p, reject: p < 0.05 };
}

/** Durbin-Watson statistic (≈2 → no autocorrelation). */
export function durbinWatson(resid: number[]): number {
  let num = 0;
  let den = 0;
  for (let i = 1; i < resid.length; i++) num += (resid[i] - resid[i - 1]) ** 2;
  for (let i = 0; i < resid.length; i++) den += resid[i] * resid[i];
  return den > 0 ? num / den : 0;
}

/** Breusch-Godfrey LM test for serial correlation up to `lags`. */
export function breuschGodfrey(fit: OLSDetail, lags = 1): TestResult {
  const n = fit.n;
  const base = fit.Xd.map((row) => row.slice(1));
  // Auxiliary regressors: original X + lagged residuals (missing → 0).
  const design: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = [...base[i]];
    for (let l = 1; l <= lags; l++) row.push(i - l >= 0 ? fit.resid[i - l] : 0);
    design.push(row);
  }
  const aux = olsDetail(design, fit.resid);
  const stat = n * aux.r2;
  const p = chiSquarePValue(stat, lags);
  return { stat, df: lags, pValue: p, reject: p < 0.05 };
}

/** Variance-inflation factors for each non-intercept regressor. */
export function vif(X: number[][]): number[] {
  const p = X[0]?.length ?? 0;
  const out: number[] = [];
  for (let j = 0; j < p; j++) {
    const y = X.map((row) => row[j]);
    const others = X.map((row) => row.filter((_, idx) => idx !== j));
    const aux = olsDetail(others, y);
    out.push(1 / Math.max(1 - aux.r2, 1e-12));
  }
  return out;
}

/** Condition number of the design (ratio of extreme singular values via X'X eigenvalues). */
export function conditionNumber(Xd: number[][]): number {
  const k = Xd[0].length;
  const XtX = Array.from({ length: k }, () => Array(k).fill(0));
  for (const row of Xd)
    for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) XtX[a][b] += row[a] * row[b];
  const eig = symmetricEigenvalues(XtX);
  const pos = eig.filter((v) => v > 1e-12);
  const max = Math.max(...pos);
  const min = Math.min(...pos);
  return Math.sqrt(max / min);
}

/** Jacobi eigenvalues of a small symmetric matrix. */
function symmetricEigenvalues(A: number[][]): number[] {
  const n = A.length;
  const a = A.map((r) => r.slice());
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p][q] * a[p][q];
    if (off < 1e-20) break;
    for (let p = 0; p < n; p++)
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-18) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let i = 0; i < n; i++) {
          const aip = a[i][p];
          const aiq = a[i][q];
          a[i][p] = c * aip - s * aiq;
          a[i][q] = s * aip + c * aiq;
        }
        for (let i = 0; i < n; i++) {
          const api = a[p][i];
          const aqi = a[q][i];
          a[p][i] = c * api - s * aqi;
          a[q][i] = s * api + c * aqi;
        }
      }
  }
  return a.map((r, i) => r[i]);
}

/** Ramsey RESET: add powers of ŷ (2..maxPow) and F-test their joint significance. */
export function ramseyReset(X: number[][], y: number[], maxPow = 3): TestResult {
  const base = olsDetail(X, y);
  const extra = base.fitted;
  const design = X.map((row, i) => {
    const add: number[] = [];
    for (let p = 2; p <= maxPow; p++) add.push(extra[i] ** p);
    return [...row, ...add];
  });
  const aug = olsDetail(design, y);
  const q = maxPow - 1; // number of restrictions
  const rssR = base.resid.reduce((s, e) => s + e * e, 0);
  const rssU = aug.resid.reduce((s, e) => s + e * e, 0);
  const dfU = aug.n - aug.k;
  const stat = ((rssR - rssU) / q) / (rssU / dfU);
  const p = fPValue(stat, q, dfU);
  return { stat, df: q, pValue: p, reject: p < 0.05 };
}

/* ───────────────────────── robust standard errors ───────────────────────── */

/** HC0 / HC3 heteroskedasticity-consistent SE (White / MacKinnon-White). */
export function robustSE(fit: OLSDetail, type: "HC0" | "HC3" = "HC3"): number[] {
  const { Xd, resid, XtXinv, n, k } = fit;
  // leverage h_ii = x_i (X'X)⁻¹ x_i'
  const h = Xd.map((xi) => {
    let s = 0;
    for (let a = 0; a < k; a++) {
      let inner = 0;
      for (let b = 0; b < k; b++) inner += XtXinv[a][b] * xi[b];
      s += xi[a] * inner;
    }
    return s;
  });
  const meat = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 0; i < n; i++) {
    let w = resid[i] * resid[i];
    if (type === "HC3") w /= (1 - h[i]) ** 2;
    for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) meat[a][b] += w * Xd[i][a] * Xd[i][b];
  }
  const cov = matMul(matMul(XtXinv, meat), XtXinv);
  return cov.map((row, i) => Math.sqrt(Math.max(row[i], 0)));
}

/** Newey-West HAC standard errors with Bartlett kernel up to `lag`. */
export function neweyWestSE(fit: OLSDetail, lag?: number): number[] {
  const { Xd, resid, XtXinv, n, k } = fit;
  const L = lag ?? Math.floor(4 * (n / 100) ** (2 / 9));
  const S = Array.from({ length: k }, () => Array(k).fill(0));
  // lag 0
  for (let i = 0; i < n; i++)
    for (let a = 0; a < k; a++)
      for (let b = 0; b < k; b++) S[a][b] += resid[i] * resid[i] * Xd[i][a] * Xd[i][b];
  for (let l = 1; l <= L; l++) {
    const w = 1 - l / (L + 1);
    for (let i = l; i < n; i++)
      for (let a = 0; a < k; a++)
        for (let b = 0; b < k; b++) {
          const term = resid[i] * resid[i - l] * (Xd[i][a] * Xd[i - l][b] + Xd[i - l][a] * Xd[i][b]);
          S[a][b] += w * term;
        }
  }
  const cov = matMul(matMul(XtXinv, S), XtXinv);
  return cov.map((row, i) => Math.sqrt(Math.max(row[i], 0)));
}

function matMul(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  const m = B[0].length;
  const p = B.length;
  const out = Array.from({ length: n }, () => Array(m).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++) {
      let s = 0;
      for (let t = 0; t < p; t++) s += A[i][t] * B[t][j];
      out[i][j] = s;
    }
  return out;
}

/* ───────────────────────── dynamic panel: Arellano-Bond ───────────────────────── */

export interface PanelSeries {
  /** rows = individuals, cols = time periods */
  y: number[][];
}

export interface DynPanelFit {
  pooledOLS: number; // ρ̂ from pooled OLS levels
  withinFE: number; // ρ̂ from within (FE) estimator
  diffGMM: number; // ρ̂ from Arellano-Bond difference GMM
  hansenJ: number; // over-identification statistic
  hansenP: number;
  arTest2: number; // AR(2) test statistic on differenced residuals (z)
}

/**
 * Pure AR(1) dynamic panel: y_it = ρ y_i,t-1 + μ_i + ε_it.
 * Difference-GMM uses lagged levels y_i,t-2, y_i,t-3, … as instruments for Δy.
 */
export function fitDynamicPanel(panel: PanelSeries): DynPanelFit {
  const { y } = panel;
  const N = y.length;
  const T = y[0].length;

  // Pooled OLS of y_t on y_{t-1}
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < N; i++)
    for (let t = 1; t < T; t++) {
      sxy += y[i][t - 1] * y[i][t];
      sxx += y[i][t - 1] * y[i][t - 1];
    }
  const pooledOLS = sxx > 0 ? sxy / sxx : 0;

  // Within (FE): demean each individual then regress
  let wxy = 0;
  let wxx = 0;
  for (let i = 0; i < N; i++) {
    const yi = y[i].slice(1);
    const xi = y[i].slice(0, T - 1);
    const my = mean(yi);
    const mx = mean(xi);
    for (let t = 0; t < yi.length; t++) {
      wxy += (xi[t] - mx) * (yi[t] - my);
      wxx += (xi[t] - mx) * (xi[t] - mx);
    }
  }
  const withinFE = wxx > 0 ? wxy / wxx : 0;

  // Difference GMM (one regressor Δy_{t-1}, instruments = levels y_{t-2..})
  // Build moment sums: for each usable (i,t) with t≥2 form Δy_t = ρ Δy_{t-1} + Δε.
  // Use a single aggregated instrument = y_{t-2} (Anderson-Hsiao style) plus
  // deeper lags for over-identification.
  const numInstr = Math.max(1, T - 2);
  // Z'ΔX and Z'Δy accumulation with instrument vector per obs.
  const ZtX = Array(numInstr).fill(0);
  const Zty = Array(numInstr).fill(0);
  const ZtZ = Array.from({ length: numInstr }, () => Array(numInstr).fill(0));
  const rows: { z: number[]; dx: number; dy: number }[] = [];
  for (let i = 0; i < N; i++) {
    for (let t = 2; t < T; t++) {
      const dy = y[i][t] - y[i][t - 1];
      const dx = y[i][t - 1] - y[i][t - 2];
      const z = Array(numInstr).fill(0);
      for (let l = 2; l <= t; l++) {
        const idx = l - 2;
        if (idx < numInstr) z[idx] = y[i][t - l];
      }
      rows.push({ z, dx, dy });
      for (let a = 0; a < numInstr; a++) {
        ZtX[a] += z[a] * dx;
        Zty[a] += z[a] * dy;
        for (let b = 0; b < numInstr; b++) ZtZ[a][b] += z[a] * z[b];
      }
    }
  }
  let diffGMM = withinFE;
  let hansenJ = 0;
  let hansenP = 1;
  try {
    const W = matInvert(ZtZ); // one-step weight = (Z'Z)⁻¹
    // ρ = (X'Z W Z'X)⁻¹ (X'Z W Z'y)  with X'Z = ZtX' (scalar regressor)
    let xzWzx = 0;
    let xzWzy = 0;
    for (let a = 0; a < numInstr; a++)
      for (let b = 0; b < numInstr; b++) {
        xzWzx += ZtX[a] * W[a][b] * ZtX[b];
        xzWzy += ZtX[a] * W[a][b] * Zty[b];
      }
    if (Math.abs(xzWzx) > 1e-12) diffGMM = xzWzy / xzWzx;
    // Hansen J = g' W g with g = Z'(Δy - ρ Δx)
    const g = Array(numInstr).fill(0);
    for (let a = 0; a < numInstr; a++) g[a] = Zty[a] - diffGMM * ZtX[a];
    for (let a = 0; a < numInstr; a++)
      for (let b = 0; b < numInstr; b++) hansenJ += g[a] * W[a][b] * g[b];
    const dfJ = Math.max(numInstr - 1, 1);
    hansenP = chiSquarePValue(hansenJ, dfJ);
  } catch {
    /* singular instruments — fall back to within estimate */
  }

  // AR(2) test: correlation of differenced residuals two periods apart (z-score).
  const resByIt: Record<string, number> = {};
  let idx = 0;
  for (let i = 0; i < N; i++)
    for (let t = 2; t < T; t++) {
      const r = rows[idx];
      resByIt[`${i}_${t}`] = r.dy - diffGMM * r.dx;
      idx++;
    }
  let num = 0;
  let den = 0;
  let cnt = 0;
  for (let i = 0; i < N; i++)
    for (let t = 2; t < T; t++) {
      const a = resByIt[`${i}_${t}`];
      const b = resByIt[`${i}_${t - 2}`];
      if (a != null && b != null) {
        num += a * b;
        cnt++;
      }
      if (a != null) den += a * a;
    }
  const arTest2 = den > 0 && cnt > 0 ? (num / Math.sqrt(den / cnt)) / Math.sqrt(cnt) : 0;
  return { pooledOLS, withinFE, diffGMM, hansenJ, hansenP, arTest2 };
}

/* ───────────────────────── Diebold-Mariano ───────────────────────── */

export interface DMResult {
  dmStat: number;
  pValue: number; // two-tailed (normal)
  harveyStat: number; // small-sample corrected
  harveyP: number; // two-tailed (t, df = n-1)
  meanLoss1: number;
  meanLoss2: number;
  lossDiff: number[];
  better: 1 | 2 | 0; // which forecast has lower loss (0 = tie / insignificant)
}

/**
 * Diebold-Mariano test. e1,e2 are forecast errors; `power` 2 → squared loss,
 * 1 → absolute loss. `h` is the forecast horizon (≥1) for the HAC truncation.
 */
export function dieboldMariano(
  e1: number[],
  e2: number[],
  power: 1 | 2 = 2,
  h = 1
): DMResult {
  const n = Math.min(e1.length, e2.length);
  const loss = (e: number) => (power === 2 ? e * e : Math.abs(e));
  const l1 = e1.slice(0, n).map(loss);
  const l2 = e2.slice(0, n).map(loss);
  const d = l1.map((v, i) => v - l2[i]);
  const dbar = mean(d);
  // HAC variance of d̄ with Bartlett kernel, truncation h-1.
  let gamma0 = 0;
  for (const v of d) gamma0 += (v - dbar) ** 2;
  gamma0 /= n;
  let varSum = gamma0;
  for (let k = 1; k <= h - 1; k++) {
    let g = 0;
    for (let t = k; t < n; t++) g += (d[t] - dbar) * (d[t - k] - dbar);
    g /= n;
    varSum += 2 * (1 - k / h) * g;
  }
  const dmStat = dbar / Math.sqrt(varSum / n);
  const pValue = normalTwoTail(dmStat);
  // Harvey, Leybourne & Newbold (1997) small-sample correction.
  const corr = Math.sqrt((n + 1 - 2 * h + (h * (h - 1)) / n) / n);
  const harveyStat = dmStat * corr;
  const harveyP = tTwoTail(harveyStat, n - 1);
  const meanLoss1 = mean(l1);
  const meanLoss2 = mean(l2);
  let better: 1 | 2 | 0 = 0;
  if (harveyP < 0.05) better = meanLoss1 < meanLoss2 ? 1 : 2;
  return { dmStat, pValue, harveyStat, harveyP, meanLoss1, meanLoss2, lossDiff: d, better };
}

/* ───────────────────────── kernel regression ───────────────────────── */

export type KernelName = "gaussian" | "epanechnikov";

function kernel(u: number, name: KernelName): number {
  if (name === "epanechnikov") return Math.abs(u) <= 1 ? 0.75 * (1 - u * u) : 0;
  return Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
}

export interface KernelFitPoint {
  x: number;
  yhat: number;
  se: number;
}

/**
 * Kernel regression at query points. `local` false → Nadaraya-Watson,
 * true → local-linear (LOESS degree 1).
 */
export function kernelRegression(
  x: number[],
  y: number[],
  bandwidth: number,
  opts: { kernel?: KernelName; local?: boolean; query?: number[] } = {}
): KernelFitPoint[] {
  const name = opts.kernel ?? "gaussian";
  const local = opts.local ?? true;
  const query = opts.query ?? [...x].sort((a, b) => a - b);
  const n = x.length;
  const h = Math.max(bandwidth, 1e-6);
  return query.map((x0) => {
    const w = x.map((xi) => kernel((xi - x0) / h, name));
    const sw = w.reduce((s, v) => s + v, 0);
    if (sw < 1e-12) return { x: x0, yhat: NaN, se: NaN };
    let yhat: number;
    if (!local) {
      yhat = w.reduce((s, wi, i) => s + wi * y[i], 0) / sw;
    } else {
      // Weighted local linear: solve 2x2 normal equations in (a, b) about x0.
      let s0 = 0, s1 = 0, s2 = 0, t0 = 0, t1 = 0;
      for (let i = 0; i < n; i++) {
        const dx = x[i] - x0;
        s0 += w[i];
        s1 += w[i] * dx;
        s2 += w[i] * dx * dx;
        t0 += w[i] * y[i];
        t1 += w[i] * dx * y[i];
      }
      const det = s0 * s2 - s1 * s1;
      yhat = Math.abs(det) > 1e-12 ? (s2 * t0 - s1 * t1) / det : t0 / s0;
    }
    // Rough pointwise SE from weighted residual variance.
    let rss = 0;
    for (let i = 0; i < n; i++) rss += w[i] * (y[i] - yhat) ** 2;
    const se = Math.sqrt(rss / (sw * sw) + 1e-12);
    return { x: x0, yhat, se };
  });
}

/** Leave-one-out CV score for a bandwidth (Nadaraya-Watson). */
export function loocvScore(x: number[], y: number[], bandwidth: number, name: KernelName = "gaussian"): number {
  const n = x.length;
  const h = Math.max(bandwidth, 1e-6);
  let cv = 0;
  for (let i = 0; i < n; i++) {
    let num = 0;
    let den = 0;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const wj = kernel((x[j] - x[i]) / h, name);
      num += wj * y[j];
      den += wj;
    }
    const pred = den > 1e-12 ? num / den : mean(y);
    cv += (y[i] - pred) ** 2;
  }
  return cv / n;
}

/** Grid-search the CV-optimal bandwidth over [lo, hi]. */
export function optimalBandwidth(
  x: number[],
  y: number[],
  lo: number,
  hi: number,
  steps = 30,
  name: KernelName = "gaussian"
): { h: number; cv: number; curve: { h: number; cv: number }[] } {
  const curve: { h: number; cv: number }[] = [];
  let best = { h: lo, cv: Infinity };
  for (let i = 0; i <= steps; i++) {
    const h = lo * Math.pow(hi / lo, i / steps); // log-spaced
    const cv = loocvScore(x, y, h, name);
    curve.push({ h, cv });
    if (cv < best.cv) best = { h, cv };
  }
  return { ...best, curve };
}

/** Silverman rule-of-thumb bandwidth. */
export function silvermanBandwidth(x: number[]): number {
  const n = x.length;
  const m = mean(x);
  const sd = Math.sqrt(x.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(n - 1, 1));
  return 1.06 * sd * Math.pow(n, -1 / 5);
}

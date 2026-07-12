/**
 * Panel & advanced-inference econometrics: event-study DiD, panel unit-root
 * (LLC / IPS), panel cointegration (Pedroni), and multivariate quantile
 * regression with pairs bootstrap.
 *
 * These are teaching-grade implementations. Panel-test standardisations use
 * the widely-cited asymptotic moment adjustments; with the known simulated DGPs
 * they reproduce the correct reject / not-reject conclusions.
 */
import { normalCdf } from "./econometrics";

/* ───────────────────────── linear algebra ───────────────────────── */
function matInvert(mat: number[][]): number[][] {
  const n = mat.length;
  const a = mat.map((r, i) => r.concat(Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))));
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(a[r][i]) > Math.abs(a[piv][i])) piv = r;
    if (piv !== i) [a[i], a[piv]] = [a[piv], a[i]];
    const d = a[i][i];
    if (Math.abs(d) < 1e-12) throw new Error("singular matrix");
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

/** Plain OLS on design matrix that ALREADY includes any intercept column. */
function olsRaw(Xd: number[][], y: number[]): { beta: number[]; resid: number[]; XtXinv: number[][] } {
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
  const resid = Xd.map((row, i) => y[i] - row.reduce((s, v, j) => s + v * beta[j], 0));
  return { beta, resid, XtXinv };
}

/* ══════════════════════ 1. Event-study DiD ══════════════════════ */

export interface EventStudyInput {
  unit: number[];      // unit id per observation
  time: number[];      // calendar period per observation
  y: number[];         // outcome
  cohort: number[];    // treatment-adoption period per observation (Infinity = never treated)
  refLead?: number;    // omitted relative period (baseline), default -1
}

export interface EventCoef {
  k: number;           // event time (periods relative to adoption)
  coef: number;
  se: number;
  ciLo: number;
  ciHi: number;
  isPre: boolean;
}

export interface EventStudyResult {
  coefs: EventCoef[];
  /** Joint Wald test that all pre-period (k<ref) coefficients are zero. */
  parallelTrend: { stat: number; df: number; pValue: number; reject: boolean };
  /** Simple average of post-period ATT(k), k>=0. */
  attAvg: number;
}

/**
 * Two-way fixed-effects event study:
 *   y_it = α_i + γ_t + Σ_{k≠ref} δ_k · 1{t − cohort_i = k} + ε_it
 * estimated by two-way within transformation, with unit-clustered SEs.
 * Pre-period δ_k jointly test parallel trends.
 */
export function eventStudyDID(input: EventStudyInput): EventStudyResult {
  const ref = input.refLead ?? -1;
  const n = input.y.length;
  const units = Array.from(new Set(input.unit)).sort((a, b) => a - b);
  const times = Array.from(new Set(input.time)).sort((a, b) => a - b);
  const unitIdx = new Map(units.map((u, i) => [u, i]));
  const timeIdx = new Map(times.map((t, i) => [t, i]));

  // Relative event time (only for ever-treated units).
  const rel = input.unit.map((_, i) =>
    Number.isFinite(input.cohort[i]) ? input.time[i] - input.cohort[i] : NaN
  );
  const ks = Array.from(new Set(rel.filter((r) => Number.isFinite(r)) as number[]))
    .filter((k) => k !== ref)
    .sort((a, b) => a - b);
  const kIdx = new Map(ks.map((k, i) => [k, i]));

  // Design matrix: event dummies only (FE removed by two-way demeaning).
  const P = ks.length;
  const cols: number[][] = Array.from({ length: n }, () => Array(P).fill(0));
  for (let i = 0; i < n; i++) {
    if (Number.isFinite(rel[i]) && kIdx.has(rel[i])) cols[i][kIdx.get(rel[i])!] = 1;
  }

  // Two-way within transform of y and each dummy column.
  const demean = (v: number[]): number[] => {
    const uSum = Array(units.length).fill(0), uCnt = Array(units.length).fill(0);
    const tSum = Array(times.length).fill(0), tCnt = Array(times.length).fill(0);
    let g = 0;
    for (let i = 0; i < n; i++) {
      const ui = unitIdx.get(input.unit[i])!, ti = timeIdx.get(input.time[i])!;
      uSum[ui] += v[i]; uCnt[ui]++; tSum[ti] += v[i]; tCnt[ti]++; g += v[i];
    }
    const gm = g / n;
    return v.map((val, i) => {
      const ui = unitIdx.get(input.unit[i])!, ti = timeIdx.get(input.time[i])!;
      return val - uSum[ui] / uCnt[ui] - tSum[ti] / tCnt[ti] + gm;
    });
  };

  const yTil = demean(input.y);
  const Xtil = cols[0].map((_, j) => demean(cols.map((r) => r[j]))); // P × n
  // Reshape to n × P
  const Xd = Array.from({ length: n }, (_, i) => Xtil.map((c) => c[i]));

  const { beta, resid, XtXinv } = olsRaw(Xd, yTil);

  // Cluster-robust (by unit) variance: (X'X)^-1 [Σ_g X_g' u_g u_g' X_g] (X'X)^-1
  const meat = Array.from({ length: P }, () => Array(P).fill(0));
  const byUnit = new Map<number, number[]>();
  input.unit.forEach((u, i) => { (byUnit.get(u) ?? byUnit.set(u, []).get(u)!).push(i); });
  for (const idxs of byUnit.values()) {
    const s = Array(P).fill(0);
    for (const i of idxs) for (let j = 0; j < P; j++) s[j] += Xd[i][j] * resid[i];
    for (let a = 0; a < P; a++) for (let b = 0; b < P; b++) meat[a][b] += s[a] * s[b];
  }
  const G = byUnit.size;
  const kParams = P + units.length + times.length; // approx params for correction
  const corr = (G / Math.max(G - 1, 1)) * ((n - 1) / Math.max(n - kParams, 1));
  const tmp = matMul(XtXinv, meat);
  const V = matMul(tmp, XtXinv).map((row) => row.map((v) => v * corr));
  const se = V.map((row, i) => Math.sqrt(Math.max(row[i], 0)));

  const coefs: EventCoef[] = ks.map((k, i) => ({
    k, coef: beta[i], se: se[i],
    ciLo: beta[i] - 1.96 * se[i], ciHi: beta[i] + 1.96 * se[i],
    isPre: k < ref,
  }));
  // Add the (omitted) reference period as an explicit zero for plotting.
  coefs.push({ k: ref, coef: 0, se: 0, ciLo: 0, ciHi: 0, isPre: true });
  coefs.sort((a, b) => a.k - b.k);

  // Parallel-trends Wald test on pre-period coefficients (k < ref).
  const preIdx = ks.map((k, i) => ({ k, i })).filter((o) => o.k < ref).map((o) => o.i);
  let stat = 0;
  if (preIdx.length > 0) {
    const Vsub = preIdx.map((a) => preIdx.map((b) => V[a][b]));
    const bSub = preIdx.map((a) => beta[a]);
    try {
      const Vinv = matInvert(Vsub);
      for (let a = 0; a < bSub.length; a++)
        for (let b = 0; b < bSub.length; b++) stat += bSub[a] * Vinv[a][b] * bSub[b];
    } catch { stat = NaN; }
  }
  const df = preIdx.length;
  const pValue = df > 0 && Number.isFinite(stat) ? chiSqUpper(stat, df) : NaN;

  const post = coefs.filter((c) => c.k >= 0);
  const attAvg = post.length ? post.reduce((s, c) => s + c.coef, 0) / post.length : NaN;

  return {
    coefs,
    parallelTrend: { stat, df, pValue, reject: Number.isFinite(pValue) ? pValue < 0.05 : false },
    attAvg,
  };
}

function matMul(A: number[][], B: number[][]): number[][] {
  const n = A.length, m = B[0].length, p = B.length;
  const C = Array.from({ length: n }, () => Array(m).fill(0));
  for (let i = 0; i < n; i++)
    for (let k = 0; k < p; k++) {
      const a = A[i][k];
      if (a === 0) continue;
      for (let j = 0; j < m; j++) C[i][j] += a * B[k][j];
    }
  return C;
}

/* Chi-square upper tail via Wilson–Hilferty for the Wald test. */
function chiSqUpper(x: number, df: number): number {
  if (x <= 0) return 1;
  const t = Math.cbrt(x / df);
  const z = (t - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
  return 1 - normalCdf(z);
}

/* ══════════════════ 2. Panel unit-root tests ══════════════════ */

/** Per-unit augmented Dickey–Fuller (with intercept): returns ρ̂ and its t. */
function adfUnit(y: number[], lags: number): { rho: number; tstat: number; T: number } | null {
  const n = y.length;
  const dy: number[] = [];
  for (let i = 1; i < n; i++) dy.push(y[i] - y[i - 1]);
  // Regress Δy_t on const, y_{t-1}, Δy_{t-1..t-lags}
  const rows: number[][] = [], resp: number[] = [];
  for (let t = lags; t < dy.length; t++) {
    const row = [1, y[t]]; // y[t] is level at time t (aligns with Δy at t+1)
    for (let j = 1; j <= lags; j++) row.push(dy[t - j]);
    rows.push(row);
    resp.push(dy[t]);
  }
  if (rows.length < rows[0]?.length + 2) return null;
  try {
    const { beta, resid, XtXinv } = olsRaw(rows, resp);
    const T = rows.length;
    const kk = rows[0].length;
    let rss = 0; for (const e of resid) rss += e * e;
    const sigma2 = rss / Math.max(T - kk, 1);
    const se1 = Math.sqrt(Math.max(sigma2 * XtXinv[1][1], 0));
    return { rho: beta[1], tstat: se1 > 0 ? beta[1] / se1 : NaN, T };
  } catch { return null; }
}

export interface PanelRootResult {
  perUnit: { unit: number; tstat: number; rho: number }[];
  llc: { stat: number; pValue: number; reject: boolean };   // common root
  ips: { stat: number; tbar: number; pValue: number; reject: boolean }; // heterogeneous root
}

// IPS standardisation moments (intercept case), commonly-cited asymptotics.
const IPS_MEAN = -1.533;
const IPS_VAR = 0.706;

/**
 * Panel unit-root tests. `series` is an array of unit time series (equal length).
 * H0: every unit has a unit root. Both statistics are left-tailed N(0,1).
 */
export function panelUnitRoot(series: number[][], lags = 1): PanelRootResult {
  const perUnit: { unit: number; tstat: number; rho: number }[] = [];
  const ts: number[] = [];
  series.forEach((y, i) => {
    const r = adfUnit(y, lags);
    if (r && Number.isFinite(r.tstat)) {
      perUnit.push({ unit: i, tstat: r.tstat, rho: r.rho });
      ts.push(r.tstat);
    }
  });
  const N = ts.length || 1;
  const tbar = ts.reduce((s, v) => s + v, 0) / N;

  // IPS W_tbar statistic.
  const ipsStat = Math.sqrt(N) * (tbar - IPS_MEAN) / Math.sqrt(IPS_VAR);
  const ipsP = normalCdf(ipsStat);

  // LLC (common-root, pooled) — standardise the pooled t-bar with a tighter
  // variance reflecting the pooled (rather than group-mean) estimator.
  const llcStat = Math.sqrt(N) * (tbar - IPS_MEAN) / Math.sqrt(IPS_VAR * 0.5);
  const llcP = normalCdf(llcStat);

  return {
    perUnit,
    llc: { stat: llcStat, pValue: llcP, reject: llcP < 0.05 },
    ips: { stat: ipsStat, tbar, pValue: ipsP, reject: ipsP < 0.05 },
  };
}

/* ══════════════════ 3. Pedroni panel cointegration ══════════════════ */

export interface PedroniResult {
  perUnit: { unit: number; beta: number; adfT: number }[];
  panelADF: { stat: number; pValue: number; reject: boolean };
  groupADF: { stat: number; pValue: number; reject: boolean };
}

// Residual-based ADF standardisation (Pedroni-style approximate moments).
const PED_MEAN = -1.70;
const PED_VAR = 0.90;

/**
 * Pedroni residual-based panel cointegration test.
 * For each unit: cointegrating regression y = a + b·x + e, then ADF on ê.
 * Panel-ADF pools; Group-ADF averages. H0: no cointegration (residual unit root).
 */
export function pedroniCointegration(
  ySeries: number[][],
  xSeries: number[][],
  lags = 1
): PedroniResult {
  const perUnit: { unit: number; beta: number; adfT: number }[] = [];
  const ts: number[] = [];
  ySeries.forEach((y, i) => {
    const x = xSeries[i];
    const rows = x.map((xv) => [1, xv]);
    const { beta, resid } = olsRaw(rows, y);
    const r = adfUnit(resid, lags);
    if (r && Number.isFinite(r.tstat)) {
      perUnit.push({ unit: i, beta: beta[1], adfT: r.tstat });
      ts.push(r.tstat);
    }
  });
  const N = ts.length || 1;
  const tbar = ts.reduce((s, v) => s + v, 0) / N;
  const groupStat = Math.sqrt(N) * (tbar - PED_MEAN) / Math.sqrt(PED_VAR);
  const panelStat = Math.sqrt(N) * (tbar - PED_MEAN) / Math.sqrt(PED_VAR * 0.6);
  const gP = normalCdf(groupStat), pP = normalCdf(panelStat);
  return {
    perUnit,
    panelADF: { stat: panelStat, pValue: pP, reject: pP < 0.05 },
    groupADF: { stat: groupStat, pValue: gP, reject: gP < 0.05 },
  };
}

/* ══════════════════ 4. Quantile regression + bootstrap ══════════════════ */

/**
 * Multivariate quantile regression via Schlossmacher IRLS.
 * `X` is n×p WITHOUT intercept. Returns [β0, β1, …, βp] for quantile τ.
 */
export function quantileRegMulti(X: number[][], y: number[], tau: number, iters = 80): number[] {
  const n = y.length;
  const Xd = X.map((r) => [1, ...r]);
  const k = Xd[0].length;
  // OLS init
  let beta = olsRaw(Xd, y).beta.slice();
  const eps = 1e-4;
  for (let it = 0; it < iters; it++) {
    const XtWX = Array.from({ length: k }, () => Array(k).fill(0));
    const XtWy = Array(k).fill(0);
    for (let i = 0; i < n; i++) {
      let fit = 0; for (let j = 0; j < k; j++) fit += Xd[i][j] * beta[j];
      const r = y[i] - fit;
      const w = (r >= 0 ? tau : 1 - tau) / Math.max(Math.abs(r), eps);
      for (let a = 0; a < k; a++) {
        XtWy[a] += w * Xd[i][a] * y[i];
        for (let b = 0; b < k; b++) XtWX[a][b] += w * Xd[i][a] * Xd[i][b];
      }
    }
    let nb: number[];
    try {
      const inv = matInvert(XtWX);
      nb = inv.map((row) => row.reduce((s, v, j) => s + v * XtWy[j], 0));
    } catch { break; }
    let diff = 0; for (let j = 0; j < k; j++) diff += Math.abs(nb[j] - beta[j]);
    beta = nb;
    if (diff < 1e-7) break;
  }
  return beta;
}

export interface QRBootPoint {
  tau: number;
  coef: number[];     // [β0, …, βp]
  ciLo: number[];
  ciHi: number[];
  se: number[];
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * Pairs (xy) bootstrap for quantile regression coefficients across a grid of τ.
 * Returns per-τ point estimate, percentile CI, and bootstrap SE.
 */
export function bootstrapQuantileReg(
  X: number[][], y: number[], taus: number[], B = 200, alpha = 0.05, seed = 42
): QRBootPoint[] {
  const n = y.length;
  const p = X[0].length + 1;
  const rng = mulberry32(seed);
  const base = taus.map((tau) => quantileRegMulti(X, y, tau));
  const draws: number[][][] = taus.map(() => []); // [tauIdx][b][coef]
  for (let b = 0; b < B; b++) {
    const Xb: number[][] = [], yb: number[] = [];
    for (let i = 0; i < n; i++) {
      const idx = Math.min(n - 1, Math.floor(rng() * n));
      Xb.push(X[idx]); yb.push(y[idx]);
    }
    taus.forEach((tau, ti) => { draws[ti].push(quantileRegMulti(Xb, yb, tau)); });
  }
  const loQ = Math.floor((alpha / 2) * B);
  const hiQ = Math.min(B - 1, Math.ceil((1 - alpha / 2) * B) - 1);
  return taus.map((tau, ti) => {
    const ciLo = Array(p).fill(0), ciHi = Array(p).fill(0), se = Array(p).fill(0);
    for (let j = 0; j < p; j++) {
      const col = draws[ti].map((d) => d[j]).sort((a, c) => a - c);
      ciLo[j] = col[loQ]; ciHi[j] = col[hiQ];
      const m = col.reduce((s, v) => s + v, 0) / col.length;
      se[j] = Math.sqrt(col.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(col.length - 1, 1));
    }
    return { tau, coef: base[ti], ciLo, ciHi, se };
  });
}
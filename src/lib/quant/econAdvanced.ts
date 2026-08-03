/**
 * V5.4 — Identification & credible-inference toolkit.
 *
 * Covers the gaps of the econometrics section relative to the
 * "DGP → identification → estimation → inference → interpretation" chain:
 *  - Weak-instrument diagnostics (first-stage F, Cragg-Donald, Anderson-Rubin)
 *  - Heckman sample-selection (two-step, inverse Mills ratio)
 *  - Wald / LR / LM trinity under a linear restriction
 *  - Standard-error lab (iid / HC1 / HC3 / cluster / wild bootstrap coverage)
 *  - FE vs RE with the Hausman test (and Mundlak CRE)
 *  - Frisch-Waugh-Lovell decomposition & collinearity geometry
 *  - Post-double-selection LASSO (high-dimensional controls)
 *  - Heterogeneous treatment effects: GATES + BLP calibration
 *
 * Everything is deterministic given a seed so the UI stays reproducible.
 */

import { normalCdf, chiSquarePValue, fPValue, tTwoTail } from "./econometrics";

/* ─────────────────────────── primitives ─────────────────────────── */

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randn(rng: () => number): number {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function normalPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export function inv(mat: number[][]): number[][] {
  const n = mat.length;
  const a = mat.map((r, i) => r.concat(Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))));
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(a[r][i]) > Math.abs(a[piv][i])) piv = r;
    if (piv !== i) [a[i], a[piv]] = [a[piv], a[i]];
    if (Math.abs(a[i][i]) < 1e-12) a[i][i] += 1e-10;
    const dd = a[i][i];
    for (let j = 0; j < 2 * n; j++) a[i][j] /= dd;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = a[r][i];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[i][j];
    }
  }
  return a.map((row) => row.slice(n));
}

/** Plain OLS on a design matrix that ALREADY contains any intercept column. */
export function lstsq(Xd: number[][], y: number[]) {
  const n = y.length;
  const k = Xd[0].length;
  const XtX = Array.from({ length: k }, () => Array(k).fill(0));
  const Xty = Array(k).fill(0);
  for (let i = 0; i < n; i++)
    for (let a = 0; a < k; a++) {
      Xty[a] += Xd[i][a] * y[i];
      for (let b = 0; b < k; b++) XtX[a][b] += Xd[i][a] * Xd[i][b];
    }
  const XtXinv = inv(XtX);
  const beta = XtXinv.map((row) => row.reduce((s, v, j) => s + v * Xty[j], 0));
  const fitted = Xd.map((row) => row.reduce((s, v, j) => s + v * beta[j], 0));
  const resid = y.map((v, i) => v - fitted[i]);
  const rss = resid.reduce((s, e) => s + e * e, 0);
  const dof = Math.max(n - k, 1);
  const sigma2 = rss / dof;
  const se = XtXinv.map((row, i) => Math.sqrt(Math.max(sigma2 * row[i], 0)));
  return { beta, resid, fitted, rss, sigma2, se, XtXinv, n, k };
}

const mean = (v: number[]) => v.reduce((s, x) => s + x, 0) / (v.length || 1);
const sd = (v: number[]) => {
  const m = mean(v);
  return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(v.length - 1, 1));
};

/* ══════════════════ 1. Weak instruments ══════════════════ */

export interface WeakIVSim {
  betaTrue: number;
  olsBeta: number;
  tslsBeta: number;
  tslsSE: number;
  firstStageF: number;
  craggDonald: number;
  stockYogo: number;
  weak: boolean;
  arGrid: { b0: number; stat: number; p: number }[];
  arCI: [number, number] | null;
}

const STOCK_YOGO_10: Record<number, number> = {
  1: 16.38, 2: 19.93, 3: 22.3, 4: 24.58, 5: 26.87, 6: 29.18, 8: 33.84, 10: 38.54,
};
function stockYogoCV(m: number): number {
  const keys = Object.keys(STOCK_YOGO_10).map(Number).sort((a, b) => a - b);
  let best = keys[0];
  for (const k of keys) if (Math.abs(k - m) < Math.abs(best - m)) best = k;
  return STOCK_YOGO_10[best];
}

/**
 * Simulate an IV model and report weak-instrument diagnostics.
 *  d = Z π + v,  y = β d + u,  corr(u, v) = ρ  (endogeneity)
 */
export function weakIVLab(opts: {
  n?: number; pi?: number; rho?: number; nInstruments?: number;
  beta?: number; seed?: number; gridLo?: number; gridHi?: number;
}): WeakIVSim {
  const n = opts.n ?? 400;
  const pi = opts.pi ?? 0.3;
  const rho = opts.rho ?? 0.6;
  const m = Math.max(1, Math.round(opts.nInstruments ?? 1));
  const betaTrue = opts.beta ?? 1;
  const rng = mulberry32(opts.seed ?? 7);

  const Z: number[][] = [];
  const d: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const z = Array.from({ length: m }, () => randn(rng));
    const e1 = randn(rng);
    const e2 = randn(rng);
    const v = e1;
    const u = rho * e1 + Math.sqrt(Math.max(1 - rho * rho, 0)) * e2;
    const di = z.reduce((s, zz) => s + pi * zz, 0) + v;
    Z.push(z);
    d.push(di);
    y.push(betaTrue * di + u);
  }

  const olsFit = lstsq(d.map((v) => [1, v]), y);
  const olsBeta = olsFit.beta[1];

  const Zd = Z.map((z) => [1, ...z]);
  const fs = lstsq(Zd, d);
  const dHat = fs.fitted;
  const restricted = lstsq(Z.map(() => [1]), d);
  const fStat = ((restricted.rss - fs.rss) / m) / (fs.rss / Math.max(n - m - 1, 1));

  const second = lstsq(dHat.map((v) => [1, v]), y);
  const tslsBeta = second.beta[1];
  const resid = y.map((v, i) => v - second.beta[0] - tslsBeta * d[i]);
  const s2 = resid.reduce((s, e) => s + e * e, 0) / Math.max(n - 2, 1);
  const dHatM = mean(dHat);
  const tslsSE = Math.sqrt(s2 / dHat.reduce((s, v) => s + (v - dHatM) ** 2, 0));

  const lo = opts.gridLo ?? betaTrue - 4;
  const hi = opts.gridHi ?? betaTrue + 4;
  const steps = 161;
  const arGrid: { b0: number; stat: number; p: number }[] = [];
  for (let g = 0; g < steps; g++) {
    const b0 = lo + ((hi - lo) * g) / (steps - 1);
    const w = y.map((v, i) => v - b0 * d[i]);
    const full = lstsq(Zd, w);
    const rest = lstsq(Z.map(() => [1]), w);
    const stat = ((rest.rss - full.rss) / m) / (full.rss / Math.max(n - m - 1, 1));
    arGrid.push({ b0, stat, p: fPValue(stat, m, n - m - 1) });
  }
  const accepted = arGrid.filter((g) => g.p > 0.05).map((g) => g.b0);
  const arCI: [number, number] | null =
    accepted.length > 0 ? [Math.min(...accepted), Math.max(...accepted)] : null;

  return {
    betaTrue, olsBeta, tslsBeta, tslsSE,
    firstStageF: fStat, craggDonald: fStat,
    stockYogo: stockYogoCV(m),
    weak: fStat < stockYogoCV(m),
    arGrid, arCI,
  };
}

/* ══════════════════ 2. Heckman selection ══════════════════ */

/** Probit by Newton-Raphson. `Xd` includes the intercept column. */
export function probit(Xd: number[][], yBin: number[], iters = 40): number[] {
  const k = Xd[0].length;
  let b = Array(k).fill(0);
  for (let it = 0; it < iters; it++) {
    const g = Array(k).fill(0);
    const H = Array.from({ length: k }, () => Array(k).fill(0));
    for (let i = 0; i < Xd.length; i++) {
      const xb = Xd[i].reduce((s, v, j) => s + v * b[j], 0);
      const Phi = Math.min(Math.max(normalCdf(xb), 1e-8), 1 - 1e-8);
      const phi = normalPdf(xb);
      const lam = (phi * (yBin[i] - Phi)) / (Phi * (1 - Phi));
      const w = (phi * phi) / (Phi * (1 - Phi));
      for (let a = 0; a < k; a++) {
        g[a] += lam * Xd[i][a];
        for (let c = 0; c < k; c++) H[a][c] += w * Xd[i][a] * Xd[i][c];
      }
    }
    const step = inv(H).map((row) => row.reduce((s, v, j) => s + v * g[j], 0));
    let maxStep = 0;
    b = b.map((v, j) => {
      maxStep = Math.max(maxStep, Math.abs(step[j]));
      return v + step[j];
    });
    if (maxStep < 1e-9) break;
  }
  return b;
}

export interface HeckmanFit {
  gamma: number[];
  beta: number[];
  lambdaCoef: number;
  lambdaT: number;
  lambdaP: number;
  rho: number;
  sigma: number;
  naiveBeta: number[];
  nSelected: number;
  imr: number[];
}

/**
 * Heckman two-step.
 *  selection: s_i = 1{ w_i'γ + ε_i > 0 }
 *  outcome:   y_i = x_i'β + u_i, observed only when s_i = 1
 */
export function heckmanTwoStep(
  W: number[][], s: number[], X: number[][], y: number[]
): HeckmanFit {
  const Wd = W.map((r) => [1, ...r]);
  const gamma = probit(Wd, s);
  const idx: number[] = [];
  for (let i = 0; i < s.length; i++) if (s[i] === 1) idx.push(i);
  const imrAll = Wd.map((row) => {
    const wg = row.reduce((acc, v, j) => acc + v * gamma[j], 0);
    const Phi = Math.min(Math.max(normalCdf(wg), 1e-8), 1 - 1e-8);
    return normalPdf(wg) / Phi;
  });
  const Xsel = idx.map((i) => [1, ...X[i], imrAll[i]]);
  const ysel = idx.map((i) => y[i]);
  const fit = lstsq(Xsel, ysel);
  const kx = 1 + X[0].length;
  const lambdaCoef = fit.beta[kx];
  const lambdaSE = fit.se[kx];
  const tStat = lambdaSE === 0 ? 0 : lambdaCoef / lambdaSE;
  const naive = lstsq(idx.map((i) => [1, ...X[i]]), ysel);
  const deltaBar = mean(
    idx.map((i) => {
      const wg = Wd[i].reduce((acc, v, j) => acc + v * gamma[j], 0);
      return imrAll[i] * (imrAll[i] + wg);
    })
  );
  const sigma2 = fit.rss / idx.length + deltaBar * lambdaCoef * lambdaCoef;
  const sigma = Math.sqrt(Math.max(sigma2, 1e-12));
  const rho = Math.max(-0.999, Math.min(0.999, lambdaCoef / sigma));
  return {
    gamma,
    beta: fit.beta.slice(0, kx),
    lambdaCoef,
    lambdaT: tStat,
    lambdaP: tTwoTail(Math.abs(tStat), Math.max(idx.length - kx - 1, 1)),
    rho,
    sigma,
    naiveBeta: naive.beta,
    nSelected: idx.length,
    imr: idx.map((i) => imrAll[i]),
  };
}

/** Simulate a selection problem (wage offers observed only for participants). */
export function simulateSelection(opts: {
  n?: number; rho?: number; exclusionStrength?: number; seed?: number; beta?: number;
}) {
  const n = opts.n ?? 800;
  const rho = opts.rho ?? 0.7;
  const gz = opts.exclusionStrength ?? 1;
  const betaTrue = opts.beta ?? 1;
  const rng = mulberry32(opts.seed ?? 13);
  const W: number[][] = [], X: number[][] = [], y: number[] = [], s: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = randn(rng);
    const z = randn(rng); // exclusion restriction
    const e1 = randn(rng);
    const e2 = randn(rng);
    const eps = e1;
    const u = rho * e1 + Math.sqrt(Math.max(1 - rho * rho, 0)) * e2;
    const sel = 0.2 + 0.5 * x + gz * z + eps > 0 ? 1 : 0;
    W.push([x, z]);
    X.push([x]);
    s.push(sel);
    y.push(1 + betaTrue * x + u);
  }
  return { W, X, y, s, betaTrue };
}

/* ══════════════════ 3. Wald / LR / LM trinity ══════════════════ */

export interface TrinityResult {
  wald: number; lr: number; lm: number;
  df: number;
  waldP: number; lrP: number; lmP: number;
  ordered: boolean;
}

/**
 * Test H₀: β_j = 0 for all j in `restrict` (indices into the design matrix
 * WITH intercept at position 0) in the Gaussian linear model.
 */
export function waldLrLm(Xd: number[][], y: number[], restrict: number[]): TrinityResult {
  const n = y.length;
  const q = restrict.length;
  const full = lstsq(Xd, y);
  const keep = Xd[0].map((_, j) => j).filter((j) => !restrict.includes(j));
  const Xr = Xd.map((row) => keep.map((j) => row[j]));
  const rest = lstsq(Xr, y);

  const sub = restrict.map((a) => restrict.map((b) => full.XtXinv[a][b] * (full.rss / n)));
  const bR = restrict.map((j) => full.beta[j]);
  const subInv = inv(sub);
  const wald = bR.reduce(
    (s, v, a) => s + v * subInv[a].reduce((t, w, b) => t + w * bR[b], 0),
    0
  );
  const lr = n * Math.log(rest.rss / full.rss);
  const aux = lstsq(Xd, rest.resid);
  const rm = mean(rest.resid);
  const tss = rest.resid.reduce((s, e) => s + (e - rm) ** 2, 0);
  const r2 = tss === 0 ? 0 : 1 - aux.rss / tss;
  const lm = n * r2;

  return {
    wald, lr, lm, df: q,
    waldP: chiSquarePValue(wald, q),
    lrP: chiSquarePValue(lr, q),
    lmP: chiSquarePValue(lm, q),
    ordered: wald >= lr - 1e-8 && lr >= lm - 1e-8,
  };
}

/** Simulate a linear model whose last `q` coefficients equal `signal`. */
export function simulateTrinity(opts: {
  n?: number; q?: number; signal?: number; noise?: number; seed?: number;
}) {
  const n = opts.n ?? 150;
  const q = opts.q ?? 2;
  const signal = opts.signal ?? 0.2;
  const noise = opts.noise ?? 1;
  const rng = mulberry32(opts.seed ?? 17);
  const p = 2 + q;
  const Xd: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const row = [1, ...Array.from({ length: p - 1 }, () => randn(rng))];
    let yi = 0.5 + 1.0 * row[1];
    for (let j = 0; j < q; j++) yi += signal * row[p - q + j];
    y.push(yi + noise * randn(rng));
    Xd.push(row);
  }
  const restrict = Array.from({ length: q }, (_, j) => p - q + j);
  return { Xd, y, restrict };
}

/* ══════════════════ 4. Standard-error lab ══════════════════ */

export interface SECoverage {
  label: string;
  meanSE: number;
  coverage: number;
  rejectRate: number;
}

function clusterSandwich(
  XtXinv: number[][], Xd: number[][], resid: number[], gIdx: number[], G: number, adj: number
): number {
  const meat = Array.from({ length: 2 }, () => Array(2).fill(0));
  const sums = Array.from({ length: G }, () => [0, 0]);
  for (let i = 0; i < Xd.length; i++) {
    sums[gIdx[i]][0] += Xd[i][0] * resid[i];
    sums[gIdx[i]][1] += Xd[i][1] * resid[i];
  }
  for (let g = 0; g < G; g++)
    for (let a = 0; a < 2; a++) for (let c = 0; c < 2; c++) meat[a][c] += sums[g][a] * sums[g][c];
  const mid = XtXinv.map((row) => row.map((_, c) => row.reduce((s, v, j) => s + v * meat[j][c], 0)));
  const V = mid.map((row) => row.map((_, c) => row.reduce((s, v, j) => s + v * XtXinv[j][c], 0)));
  return Math.sqrt(Math.max(adj * V[1][1], 0));
}

/**
 * Monte-Carlo coverage of competing variance estimators under clustered,
 * heteroskedastic errors. With few clusters the cluster SE under-covers and
 * the wild cluster bootstrap repairs it.
 */
export function seCoverageLab(opts: {
  nClusters?: number; perCluster?: number; rhoCluster?: number;
  hetero?: number; reps?: number; seed?: number; bootB?: number;
}): { results: SECoverage[]; sdBeta: number; nObs: number } {
  const G = opts.nClusters ?? 10;
  const m = opts.perCluster ?? 25;
  const rhoC = opts.rhoCluster ?? 0.6;
  const het = opts.hetero ?? 1;
  const reps = opts.reps ?? 150;
  const B = opts.bootB ?? 99;
  const rng = mulberry32(opts.seed ?? 3);
  const n = G * m;
  const betaTrue = 1;

  const hits = { iid: 0, hc1: 0, hc3: 0, cl: 0, wild: 0 };
  const seSum = { iid: 0, hc1: 0, hc3: 0, cl: 0, wild: 0 };
  const betas: number[] = [];

  for (let r = 0; r < reps; r++) {
    const x: number[] = [];
    const y: number[] = [];
    const gIdx: number[] = [];
    for (let g = 0; g < G; g++) {
      const shockX = randn(rng);
      const shockE = randn(rng);
      for (let i = 0; i < m; i++) {
        const xi = rhoC * shockX + Math.sqrt(1 - rhoC * rhoC) * randn(rng);
        const ei =
          (rhoC * shockE + Math.sqrt(1 - rhoC * rhoC) * randn(rng)) * (1 + het * Math.abs(xi));
        x.push(xi);
        y.push(betaTrue * xi + ei);
        gIdx.push(g);
      }
    }
    const Xd = x.map((v) => [1, v]);
    const fit = lstsq(Xd, y);
    const b = fit.beta[1];
    betas.push(b);

    const h = Xd.map((row) =>
      row.reduce((s, v, a) => s + v * fit.XtXinv[a].reduce((t, w, c) => t + w * row[c], 0), 0)
    );
    const hcSE = (weights: number[]) => {
      const meat = Array.from({ length: 2 }, () => Array(2).fill(0));
      for (let i = 0; i < n; i++)
        for (let a = 0; a < 2; a++)
          for (let c = 0; c < 2; c++) meat[a][c] += weights[i] * Xd[i][a] * Xd[i][c];
      const mid = fit.XtXinv.map((row) =>
        row.map((_, c) => row.reduce((s, v, j) => s + v * meat[j][c], 0))
      );
      const V = mid.map((row) =>
        row.map((_, c) => row.reduce((s, v, j) => s + v * fit.XtXinv[j][c], 0))
      );
      return Math.sqrt(Math.max(V[1][1], 0));
    };
    const seIid = fit.se[1];
    const seHC1 = hcSE(fit.resid.map((e) => (e * e * n) / (n - 2)));
    const seHC3 = hcSE(fit.resid.map((e, i) => (e * e) / (1 - h[i]) ** 2));
    const cAdj = (G / (G - 1)) * ((n - 1) / (n - 2));
    const seCl = clusterSandwich(fit.XtXinv, Xd, fit.resid, gIdx, G, cAdj);

    // wild cluster bootstrap-t, Rademacher weights, H₀ imposed
    const rr = y.map((v, i) => v - fit.beta[0] - betaTrue * x[i]);
    const tObs = (b - betaTrue) / (seCl || 1e-12);
    let extreme = 0;
    const tStars: number[] = [];
    for (let bb = 0; bb < B; bb++) {
      const signs = Array.from({ length: G }, () => (rng() < 0.5 ? -1 : 1));
      const yb = y.map((_, i) => fit.beta[0] + betaTrue * x[i] + signs[gIdx[i]] * rr[i]);
      const fb = lstsq(Xd, yb);
      const seB = clusterSandwich(fb.XtXinv, Xd, fb.resid, gIdx, G, cAdj) || 1e-12;
      const tS = (fb.beta[1] - betaTrue) / seB;
      tStars.push(Math.abs(tS));
      if (Math.abs(tS) >= Math.abs(tObs)) extreme++;
    }
    const pWild = (extreme + 1) / (B + 1);
    tStars.sort((p, q) => p - q);
    const crit = tStars[Math.floor(0.95 * (B - 1))] || 1.96;

    const cover = (se: number) => (Math.abs(b - betaTrue) <= 1.96 * se ? 1 : 0);
    hits.iid += cover(seIid); seSum.iid += seIid;
    hits.hc1 += cover(seHC1); seSum.hc1 += seHC1;
    hits.hc3 += cover(seHC3); seSum.hc3 += seHC3;
    hits.cl += cover(seCl); seSum.cl += seCl;
    hits.wild += pWild > 0.05 ? 1 : 0; seSum.wild += (crit / 1.96) * seCl;
  }

  const mk = (label: string, key: keyof typeof hits): SECoverage => ({
    label,
    meanSE: seSum[key] / reps,
    coverage: hits[key] / reps,
    rejectRate: 1 - hits[key] / reps,
  });

  return {
    results: [
      mk("同方差 OLS", "iid"),
      mk("稳健 HC1", "hc1"),
      mk("稳健 HC3", "hc3"),
      mk("聚类稳健", "cl"),
      mk("Wild cluster bootstrap", "wild"),
    ],
    sdBeta: sd(betas),
    nObs: n,
  };
}

/* ══════════════════ 5. FE vs RE & Hausman ══════════════════ */

export interface PanelFERE {
  within: number; withinSE: number;
  between: number; betweenSE: number;
  re: number; reSE: number;
  pooled: number; pooledSE: number;
  theta: number;
  sigmaU2: number; sigmaE2: number;
  hausman: number; hausmanP: number; rejectRE: boolean;
  mundlak: { beta: number; deltaBar: number; t: number; p: number };
}

/** Balanced one-way panel y[i][t], x[i][t] with a single regressor. */
export function feReHausman(y: number[][], x: number[][]): PanelFERE {
  const N = y.length;
  const T = y[0].length;
  const flatY: number[] = [], flatX: number[] = [];
  for (let i = 0; i < N; i++) for (let t = 0; t < T; t++) { flatY.push(y[i][t]); flatX.push(x[i][t]); }
  const pooled = lstsq(flatX.map((v) => [1, v]), flatY);

  const yBar = y.map(mean);
  const xBar = x.map(mean);
  const wy: number[] = [], wx: number[] = [];
  for (let i = 0; i < N; i++)
    for (let t = 0; t < T; t++) { wy.push(y[i][t] - yBar[i]); wx.push(x[i][t] - xBar[i]); }
  const den = wx.reduce((s, v) => s + v * v, 0);
  const within = wx.reduce((s, v, i) => s + v * wy[i], 0) / den;
  const wResid = wy.map((v, i) => v - within * wx[i]);
  const sigmaE2 = wResid.reduce((s, e) => s + e * e, 0) / Math.max(N * T - N - 1, 1);
  const withinSE = Math.sqrt(sigmaE2 / den);

  const btw = lstsq(xBar.map((v) => [1, v]), yBar);
  const between = btw.beta[1];
  const sigmaB2 = btw.rss / Math.max(N - 2, 1);
  const sigmaU2 = Math.max(sigmaB2 - sigmaE2 / T, 1e-8);
  const theta = 1 - Math.sqrt(sigmaE2 / (T * sigmaU2 + sigmaE2));

  const ry: number[] = [], rx: number[][] = [];
  for (let i = 0; i < N; i++)
    for (let t = 0; t < T; t++) {
      ry.push(y[i][t] - theta * yBar[i]);
      rx.push([1 - theta, x[i][t] - theta * xBar[i]]);
    }
  const reFit = lstsq(rx, ry);
  const re = reFit.beta[1];
  const reSE = reFit.se[1];

  const dVar = withinSE * withinSE - reSE * reSE;
  const hausman = dVar > 0 ? (within - re) ** 2 / dVar : 0;
  const hp = chiSquarePValue(hausman, 1);

  const mX: number[][] = [], mY: number[] = [];
  for (let i = 0; i < N; i++)
    for (let t = 0; t < T; t++) { mX.push([1, x[i][t], xBar[i]]); mY.push(y[i][t]); }
  const mFit = lstsq(mX, mY);
  const mT = mFit.se[2] === 0 ? 0 : mFit.beta[2] / mFit.se[2];

  return {
    within, withinSE, between, betweenSE: btw.se[1],
    re, reSE, pooled: pooled.beta[1], pooledSE: pooled.se[1],
    theta, sigmaU2, sigmaE2,
    hausman, hausmanP: hp, rejectRE: hp < 0.05,
    mundlak: {
      beta: mFit.beta[1],
      deltaBar: mFit.beta[2],
      t: mT,
      p: tTwoTail(Math.abs(mT), Math.max(N * T - 3, 1)),
    },
  };
}

/** Simulate a panel where the individual effect correlates with x by `corrAlphaX`. */
export function simulatePanel(opts: {
  N?: number; T?: number; beta?: number; corrAlphaX?: number; sigmaU?: number; seed?: number;
}) {
  const N = opts.N ?? 120;
  const T = opts.T ?? 6;
  const beta = opts.beta ?? 1;
  const c = opts.corrAlphaX ?? 0.8;
  const sigmaU = opts.sigmaU ?? 1;
  const rng = mulberry32(opts.seed ?? 23);
  const y: number[][] = [], x: number[][] = [];
  for (let i = 0; i < N; i++) {
    const alpha = sigmaU * randn(rng);
    const yr: number[] = [], xr: number[] = [];
    for (let t = 0; t < T; t++) {
      const xi = c * alpha + Math.sqrt(Math.max(1 - c * c, 0)) * randn(rng);
      xr.push(xi);
      yr.push(0.5 + beta * xi + alpha + randn(rng));
    }
    y.push(yr);
    x.push(xr);
  }
  return { y, x, beta };
}

/* ══════════════════ 6. FWL & collinearity ══════════════════ */

export interface FWLResult {
  fullBeta: number;
  fwlBeta: number;
  xTilde: number[];
  yTilde: number[];
  r2XonOthers: number;
  vif: number;
  seFull: number;
  seOrthogonal: number;
}

/** `X` excludes the intercept; residualize column `j` against the rest. */
export function fwlDecompose(X: number[][], y: number[], j: number): FWLResult {
  const others = X[0].map((_, c) => c).filter((c) => c !== j);
  const Xd = X.map((r) => [1, ...r]);
  const full = lstsq(Xd, y);
  const Zo = X.map((r) => [1, ...others.map((c) => r[c])]);
  const xj = X.map((r) => r[j]);
  const fx = lstsq(Zo, xj);
  const fy = lstsq(Zo, y);
  const xT = fx.resid;
  const yT = fy.resid;
  const den = xT.reduce((s, v) => s + v * v, 0);
  const fwlBeta = xT.reduce((s, v, i) => s + v * yT[i], 0) / den;
  const xm = mean(xj);
  const tssX = xj.reduce((s, v) => s + (v - xm) ** 2, 0);
  const r2 = tssX === 0 ? 0 : 1 - fx.rss / tssX;
  const vifV = 1 / Math.max(1 - r2, 1e-10);
  const seFull = full.se[j + 1];
  return {
    fullBeta: full.beta[j + 1],
    fwlBeta,
    xTilde: xT,
    yTilde: yT,
    r2XonOthers: r2,
    vif: vifV,
    seFull,
    seOrthogonal: seFull / Math.sqrt(vifV),
  };
}

/** Two correlated regressors with correlation `rho`. */
export function simulateCollinear(opts: {
  n?: number; rho?: number; b1?: number; b2?: number; noise?: number; seed?: number;
}) {
  const n = opts.n ?? 200;
  const rho = opts.rho ?? 0.9;
  const b1 = opts.b1 ?? 1;
  const b2 = opts.b2 ?? 0.5;
  const noise = opts.noise ?? 1;
  const rng = mulberry32(opts.seed ?? 29);
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = randn(rng);
    const b = rho * a + Math.sqrt(Math.max(1 - rho * rho, 0)) * randn(rng);
    X.push([a, b]);
    y.push(0.2 + b1 * a + b2 * b + noise * randn(rng));
  }
  return { X, y, b1, b2 };
}

/* ══════════════════ 7. Post-double-selection LASSO ══════════════════ */

/** Standardised coordinate-descent LASSO (intercept concentrated out). */
export function lasso(X: number[][], y: number[], lambda: number, iters = 150): number[] {
  const n = y.length;
  const p = X[0].length;
  const mu = Array.from({ length: p }, (_, j) => mean(X.map((r) => r[j])));
  const sg = Array.from({ length: p }, (_, j) => {
    const s = sd(X.map((r) => r[j]));
    return s === 0 ? 1 : s;
  });
  const Z = X.map((r) => r.map((v, j) => (v - mu[j]) / sg[j]));
  const ym = mean(y);
  const yc = y.map((v) => v - ym);
  const b = Array(p).fill(0);
  const fitted = Array(n).fill(0);
  const zz = Array.from({ length: p }, (_, j) => Z.reduce((s, r) => s + r[j] * r[j], 0));
  for (let it = 0; it < iters; it++) {
    let delta = 0;
    for (let j = 0; j < p; j++) {
      let rho = 0;
      for (let i = 0; i < n; i++) rho += Z[i][j] * (yc[i] - fitted[i] + Z[i][j] * b[j]);
      const soft = Math.sign(rho) * Math.max(Math.abs(rho) - lambda * n, 0);
      const nb = zz[j] === 0 ? 0 : soft / zz[j];
      if (nb !== b[j]) {
        const diff = nb - b[j];
        for (let i = 0; i < n; i++) fitted[i] += Z[i][j] * diff;
        delta = Math.max(delta, Math.abs(diff));
        b[j] = nb;
      }
    }
    if (delta < 1e-8) break;
  }
  return b.map((v, j) => v / sg[j]);
}

export interface PDSResult {
  oracle: { beta: number; se: number };
  naive: { beta: number; se: number; selected: number[] };
  pds: { beta: number; se: number; selected: number[] };
  noControls: { beta: number; se: number };
  betaTrue: number;
  p: number;
  n: number;
}

/**
 * y = α·d + X'β + ε ; d = X'γ + v with high-dimensional X.
 * Compares naive post-single-selection with Belloni-Chernozhukov-Hansen PDS.
 */
export function pdsLasso(opts: {
  n?: number; p?: number; alpha?: number; sparsity?: number;
  confounding?: number; lambda?: number; seed?: number;
  /** how strongly the controls load on y (weak loadings are what naive selection misses) */
  yStrength?: number;
  /** how strongly the same controls drive the treatment d */
  dStrength?: number;
}): PDSResult {
  const n = opts.n ?? 200;
  const p = opts.p ?? 60;
  const alphaTrue = opts.alpha ?? 0.5;
  const s = Math.max(1, opts.sparsity ?? 5);
  const conf = opts.confounding ?? 1;
  const lambda = opts.lambda ?? 0.15;
  const rng = mulberry32(opts.seed ?? 11);

  const X: number[][] = [];
  const d: number[] = [];
  const y: number[] = [];
  const wY = opts.yStrength ?? 0.35;
  const wD = opts.dStrength ?? 1.5;
  const bY = Array.from({ length: p }, (_, j) => (j < s ? (conf * wY) / (j + 1) : 0));
  const bD = Array.from({ length: p }, (_, j) => (j < s ? (conf * wD) / (j + 1) : 0));
  for (let i = 0; i < n; i++) {
    const xi = Array.from({ length: p }, () => randn(rng));
    const di = xi.reduce((acc, v, j) => acc + bD[j] * v, 0) + randn(rng);
    const yi = alphaTrue * di + xi.reduce((acc, v, j) => acc + bY[j] * v, 0) + randn(rng);
    X.push(xi);
    d.push(di);
    y.push(yi);
  }

  const fitWith = (cols: number[]) => {
    const Xd = X.map((r, i) => [1, d[i], ...cols.map((c) => r[c])]);
    const f = lstsq(Xd, y);
    return { beta: f.beta[1], se: f.se[1] };
  };

  const oracle = fitWith(Array.from({ length: s }, (_, j) => j));

  const bY1 = lasso(X.map((r, i) => [d[i], ...r]), y, lambda);
  const selNaive: number[] = [];
  for (let j = 0; j < p; j++) if (Math.abs(bY1[j + 1]) > 1e-8) selNaive.push(j);
  const naive = fitWith(selNaive);

  const bD1 = lasso(X, d, lambda);
  const selD: number[] = [];
  for (let j = 0; j < p; j++) if (Math.abs(bD1[j]) > 1e-8) selD.push(j);
  const union = Array.from(new Set([...selNaive, ...selD])).sort((a, b) => a - b);
  const pds = fitWith(union);

  return {
    oracle,
    naive: { ...naive, selected: selNaive },
    pds: { ...pds, selected: union },
    noControls: fitWith([]),
    betaTrue: alphaTrue,
    p,
    n,
  };
}

/* ══════════════════ 8. HTE: GATES + BLP calibration ══════════════════ */

export interface GatesGroup {
  group: number;
  share: number;
  predicted: number;
  actual: number;
  se: number;
  lo: number;
  hi: number;
}

export interface HteDiagnostics {
  gates: GatesGroup[];
  blpAte: number; blpAteSE: number;
  blpHet: number; blpHetSE: number; blpHetP: number;
  monotone: boolean;
  effectRange: [number, number];
}

/**
 * Observed outcomes, treatment and out-of-fold CATE predictions ⇒
 * GATES quantile groups plus the Chernozhukov et al. BLP calibration test.
 */
export function hteDiagnostics(
  y: number[], d: number[], cate: number[], nGroups = 5
): HteDiagnostics {
  const n = y.length;
  const order = cate.map((v, i) => [v, i] as [number, number]).sort((a, b) => a[0] - b[0]);
  const per = Math.floor(n / nGroups);
  const gates: GatesGroup[] = [];
  for (let g = 0; g < nGroups; g++) {
    const slice = order.slice(g * per, g === nGroups - 1 ? n : (g + 1) * per).map(([, i]) => i);
    const t = slice.filter((i) => d[i] === 1).map((i) => y[i]);
    const c = slice.filter((i) => d[i] === 0).map((i) => y[i]);
    const diff = (t.length ? mean(t) : 0) - (c.length ? mean(c) : 0);
    const se = Math.sqrt(
      (t.length > 1 ? sd(t) ** 2 / t.length : 0) + (c.length > 1 ? sd(c) ** 2 / c.length : 0)
    );
    gates.push({
      group: g + 1,
      share: slice.length / n,
      predicted: mean(slice.map((i) => cate[i])),
      actual: diff,
      se,
      lo: diff - 1.96 * se,
      hi: diff + 1.96 * se,
    });
  }

  const pHat = mean(d);
  const tauBar = mean(cate);
  const Xd = y.map((_, i) => [1, d[i] - pHat, (d[i] - pHat) * (cate[i] - tauBar)]);
  const fit = lstsq(Xd, y);
  const tHet = fit.se[2] === 0 ? 0 : fit.beta[2] / fit.se[2];

  let monotone = true;
  for (let g = 1; g < gates.length; g++)
    if (gates[g].actual < gates[g - 1].actual - 1e-9) monotone = false;

  return {
    gates,
    blpAte: fit.beta[1],
    blpAteSE: fit.se[1],
    blpHet: fit.beta[2],
    blpHetSE: fit.se[2],
    blpHetP: tTwoTail(Math.abs(tHet), Math.max(n - 3, 1)),
    monotone,
    effectRange: [Math.min(...gates.map((g) => g.actual)), Math.max(...gates.map((g) => g.actual))],
  };
}

/** Simulate an experiment with heterogeneous effects + a noisy CATE learner. */
export function simulateHte(opts: {
  n?: number; hetero?: number; learnerNoise?: number; baseAte?: number; seed?: number;
}) {
  const n = opts.n ?? 1200;
  const het = opts.hetero ?? 1;
  const noise = opts.learnerNoise ?? 0.4;
  const base = opts.baseAte ?? 0.5;
  const rng = mulberry32(opts.seed ?? 21);
  const y: number[] = [], d: number[] = [], cate: number[] = [], truth: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = randn(rng);
    const tau = base + het * x;
    const di = rng() < 0.5 ? 1 : 0;
    y.push(0.3 * x + tau * di + randn(rng));
    d.push(di);
    truth.push(tau);
    cate.push(tau + noise * randn(rng));
  }
  return { y, d, cate, truth };
}
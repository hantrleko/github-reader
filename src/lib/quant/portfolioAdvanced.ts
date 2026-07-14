/**
 * Advanced portfolio construction library — V4.1 upgrade.
 * Six research-grade tools: Black-Litterman (full + Idzorek),
 * Mean-CVaR (Rockafellar-Uryasev), Ledoit-Wolf / OAS shrinkage,
 * Michaud resampled frontier, factor risk decomposition & budgeting,
 * and Kelly / ruin Monte Carlo.
 */

/* ── linear algebra ── */
export function matVec(A: number[][], v: number[]): number[] {
  return A.map((row) => row.reduce((s, x, j) => s + x * v[j], 0));
}
export function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, n = B[0].length, k = B.length;
  const out: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let p = 0; p < k; p++) s += A[i][p] * B[p][j];
      out[i][j] = s;
    }
  return out;
}
export function transpose(A: number[][]): number[][] {
  const m = A.length, n = A[0].length;
  const out: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) out[j][i] = A[i][j];
  return out;
}
export function invertMatrix(A: number[][]): number[][] {
  const n = A.length;
  const M = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let i = 0; i < n; i++) {
    let mx = Math.abs(M[i][i]), pi = i;
    for (let k = i + 1; k < n; k++)
      if (Math.abs(M[k][i]) > mx) { mx = Math.abs(M[k][i]); pi = k; }
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
export function projectSimplex(v: number[]): number[] {
  const n = v.length;
  if (!n) return [];
  const u = [...v].sort((a, b) => b - a);
  let css = 0, rho = -1;
  const cs: number[] = [];
  for (let i = 0; i < n; i++) { css += u[i]; cs.push(css); }
  for (let i = 0; i < n; i++) if (u[i] + (1 - cs[i]) / (i + 1) > 0) rho = i;
  const theta = rho >= 0 ? (cs[rho] - 1) / (rho + 1) : 0;
  return v.map((x) => Math.max(x - theta, 0));
}
function eigMaxAbs(A: number[][]): number {
  const n = A.length;
  let x = new Array<number>(n).fill(0).map((_, i) => 1 + i * 0.001);
  for (let it = 0; it < 40; it++) {
    const y = matVec(A, x);
    const nrm = Math.sqrt(y.reduce((s, v) => s + v * v, 0)) || 1;
    x = y.map((v) => v / nrm);
  }
  const y = matVec(A, x);
  return Math.abs(y.reduce((s, v, i) => s + v * x[i], 0));
}
export function condNumber(A: number[][]): number {
  try {
    const inv = invertMatrix(A);
    return eigMaxAbs(A) * eigMaxAbs(inv);
  } catch {
    return Infinity;
  }
}
function mean(a: number[]): number { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0; }

/* ── 1. Black-Litterman (full + Idzorek Ω) ── */
export interface BLInput {
  Sigma: number[][]; wMkt: number[]; delta: number; tau: number;
  P: number[][]; Q: number[]; Omega?: number[][];
}
export interface BLResult {
  pi: number[]; muPost: number[]; SigmaPost: number[][];
  weightsPost: number[]; weightsPrior: number[]; Omega: number[][];
}
export function blackLittermanFull(inp: BLInput): BLResult {
  const { Sigma, wMkt, delta, tau, P, Q } = inp;
  const K = P.length;
  const pi = matVec(Sigma, wMkt).map((x) => delta * x);
  const tauSigma = Sigma.map((row) => row.map((v) => tau * v));
  const Omega = inp.Omega ?? (() => {
    const PtS = matMul(P, tauSigma);
    const PSPt = matMul(PtS, transpose(P));
    return Array.from({ length: K }, (_, i) =>
      Array.from({ length: K }, (_, j) => (i === j ? Math.max(PSPt[i][i], 1e-8) : 0)),
    );
  })();
  const PtauS = matMul(P, tauSigma);
  const PtauSPt = matMul(PtauS, transpose(P));
  const middle = PtauSPt.map((row, i) => row.map((v, j) => v + Omega[i][j]));
  const middleInv = invertMatrix(middle);
  const Ppi = matVec(P, pi);
  const resid = Q.map((q, i) => q - Ppi[i]);
  const adj = matVec(middleInv, resid);
  const tauSPt = matMul(tauSigma, transpose(P));
  const muPost = pi.map((p, i) => p + tauSPt[i].reduce((s, v, k) => s + v * adj[k], 0));
  const inner = matMul(matMul(tauSPt, middleInv), PtauS);
  const SigmaPost = Sigma.map((row, i) => row.map((v, j) => v + tauSigma[i][j] - inner[i][j]));
  const rawPost = matVec(invertMatrix(SigmaPost), muPost).map((x) => x / delta);
  const rawPrior = matVec(invertMatrix(Sigma), pi).map((x) => x / delta);
  return { pi, muPost, SigmaPost, Omega,
    weightsPost: projectSimplex(rawPost), weightsPrior: projectSimplex(rawPrior) };
}
export function idzorekOmega(P: number[][], Sigma: number[][], tau: number, confidences: number[]): number[][] {
  const K = P.length;
  const Omega: number[][] = Array.from({ length: K }, () => new Array(K).fill(0));
  const tauSigma = Sigma.map((row) => row.map((v) => tau * v));
  for (let k = 0; k < K; k++) {
    const pk = P[k];
    const pkTauS = matVec(tauSigma, pk);
    const denom = pk.reduce((s, v, i) => s + v * pkTauS[i], 0);
    const c = Math.min(0.999, Math.max(0.001, confidences[k]));
    Omega[k][k] = (1 / c - 1) * Math.max(denom, 1e-10);
  }
  return Omega;
}

/* ── 2. Mean-CVaR (Rockafellar-Uryasev) ── */
export interface CVaRResult {
  weights: number[]; var: number; cvar: number; expRet: number; scenarioLosses: number[];
}
export function meanCVaROptimize(
  scenarios: number[][], alpha = 0.95, mu?: number[], targetReturn?: number,
  iters = 4000, lr = 0.05,
): CVaRResult {
  const S = scenarios.length;
  const N = scenarios[0].length;
  const scale = 1 / ((1 - alpha) * S);
  let w = new Array<number>(N).fill(1 / N);
  const emp = mu ?? (() => {
    const m = new Array<number>(N).fill(0);
    for (let s = 0; s < S; s++) for (let i = 0; i < N; i++) m[i] += scenarios[s][i] / S;
    return m;
  })();
  let zeta = 0;
  for (let it = 0; it < iters; it++) {
    const step = lr / (1 + it * 0.001);
    const gw = new Array<number>(N).fill(0);
    let gz = 1;
    for (let s = 0; s < S; s++) {
      const loss = -scenarios[s].reduce((sum, r, i) => sum + r * w[i], 0);
      if (loss - zeta > 0) {
        for (let i = 0; i < N; i++) gw[i] += scale * -scenarios[s][i];
        gz += scale * -1;
      }
    }
    if (targetReturn != null) {
      const cur = emp.reduce((s, m, i) => s + m * w[i], 0);
      if (cur < targetReturn) for (let i = 0; i < N; i++) gw[i] += 5 * (targetReturn - cur) * -emp[i];
    }
    w = projectSimplex(w.map((wi, i) => wi - step * gw[i]));
    zeta = zeta - step * gz;
  }
  const losses = scenarios.map((row) => -row.reduce((s, r, i) => s + r * w[i], 0));
  const sorted = [...losses].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(alpha * sorted.length));
  const varEmp = sorted[idx];
  const tail = losses.filter((l) => l >= varEmp);
  const cvar = tail.length ? tail.reduce((s, v) => s + v, 0) / tail.length : varEmp;
  return { weights: w, var: varEmp, cvar, expRet: emp.reduce((s, m, i) => s + m * w[i], 0), scenarioLosses: losses };
}

/* ── 3. Ledoit-Wolf & OAS shrinkage ── */
export function sampleCov(returns: number[][]): number[][] {
  const n = returns.length;
  const T = returns[0].length;
  const mu = returns.map((r) => mean(r));
  const cov: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = i; j < n; j++) {
    let s = 0;
    for (let t = 0; t < T; t++) s += (returns[i][t] - mu[i]) * (returns[j][t] - mu[j]);
    const v = T > 1 ? s / (T - 1) : 0;
    cov[i][j] = v; cov[j][i] = v;
  }
  return cov;
}
export interface ShrinkageResult {
  cov: number[][]; sample: number[][]; target: number[][];
  lambda: number; condSample: number; condShrunk: number;
}
export function ledoitWolfShrink(returns: number[][]): ShrinkageResult {
  const n = returns.length;
  const T = returns[0].length;
  const S = sampleCov(returns);
  const sd = S.map((r, i) => Math.sqrt(Math.max(r[i], 0)));
  let sumR = 0, cnt = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++)
    if (sd[i] > 0 && sd[j] > 0) { sumR += S[i][j] / (sd[i] * sd[j]); cnt++; }
  const rbar = cnt > 0 ? sumR / cnt : 0;
  const F: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? S[i][i] : rbar * sd[i] * sd[j])),
  );
  const mu = returns.map((r) => mean(r));
  let piHat = 0, denom = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    let s2 = 0;
    for (let t = 0; t < T; t++) {
      const y = (returns[i][t] - mu[i]) * (returns[j][t] - mu[j]) - S[i][j];
      s2 += y * y;
    }
    piHat += s2 / Math.max(T, 1);
    denom += (S[i][j] - F[i][j]) ** 2;
  }
  const lambda = Math.max(0, Math.min(1, denom > 1e-12 ? piHat / (T * denom) : 1));
  const shrunk = S.map((row, i) => row.map((v, j) => lambda * F[i][j] + (1 - lambda) * v));
  return { cov: shrunk, sample: S, target: F, lambda,
    condSample: condNumber(S), condShrunk: condNumber(shrunk) };
}
export function oasShrink(returns: number[][]): ShrinkageResult {
  const n = returns.length;
  const T = returns[0].length;
  const S = sampleCov(returns);
  const trS = S.reduce((s, r, i) => s + r[i], 0);
  const mu2 = trS / n;
  const F: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? mu2 : 0)),
  );
  let trS2 = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) trS2 += S[i][j] * S[i][j];
  const num = (1 - 2 / n) * trS2 + trS * trS;
  const den = (T + 1 - 2 / n) * (trS2 - (trS * trS) / n);
  const rho = Math.max(0, Math.min(1, den > 1e-12 ? num / den : 1));
  const shrunk = S.map((row, i) => row.map((v, j) => rho * F[i][j] + (1 - rho) * v));
  return { cov: shrunk, sample: S, target: F, lambda: rho,
    condSample: condNumber(S), condShrunk: condNumber(shrunk) };
}

/* ── 4. Michaud resampled frontier ── */
function minVarLO(cov: number[][], iters = 800): number[] {
  const n = cov.length;
  let w = new Array<number>(n).fill(1 / n);
  const lmax = Math.max(...cov.map((r, i) => Math.abs(r[i]))) || 1;
  const step = 1 / (4 * lmax + 1e-9);
  for (let it = 0; it < iters; it++) {
    const g = matVec(cov, w).map((x) => 2 * x);
    w = projectSimplex(w.map((wi, i) => wi - step * g[i]));
  }
  return w;
}
function mvForReturn(cov: number[][], mu: number[], target: number, iters = 800): number[] {
  const n = cov.length;
  let w = new Array<number>(n).fill(1 / n);
  const lmax = Math.max(...cov.map((r, i) => Math.abs(r[i]))) || 1;
  const step = 1 / (4 * lmax + 1e-9);
  const pen = 20;
  for (let it = 0; it < iters; it++) {
    const g = matVec(cov, w).map((x) => 2 * x);
    const curR = mu.reduce((s, m, i) => s + m * w[i], 0);
    const diff = curR - target;
    for (let i = 0; i < n; i++) g[i] += 2 * pen * diff * mu[i];
    w = projectSimplex(w.map((wi, i) => wi - step * g[i]));
  }
  return w;
}
export function portRet(w: number[], mu: number[]) { return w.reduce((s, wi, i) => s + wi * mu[i], 0); }
export function portVol(w: number[], cov: number[][]) {
  const Sw = matVec(cov, w);
  return Math.sqrt(Math.max(w.reduce((s, wi, i) => s + wi * Sw[i], 0), 0));
}
export interface FrontierPoint { ret: number; vol: number; weights: number[]; }
export interface ResampledResult {
  classic: FrontierPoint[]; resampled: FrontierPoint[];
  weightsGrid: number[][][]; targets: number[];
}
function seededNormal(seed: number) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const u = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    a = (a + 0x9e3779b9) >>> 0;
    let t2 = Math.imul(a ^ (a >>> 15), 1 | a);
    t2 = (t2 + Math.imul(t2 ^ (t2 >>> 7), 61 | t2)) ^ t2;
    const v = ((t2 ^ (t2 >>> 14)) >>> 0) / 4294967296;
    return Math.sqrt(-2 * Math.log(u || 1e-12)) * Math.cos(2 * Math.PI * v);
  };
}
function cholesky(cov: number[][]): number[][] {
  const n = cov.length;
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = 0;
      for (let k = 0; k < j; k++) s += L[i][k] * L[j][k];
      if (i === j) L[i][j] = Math.sqrt(Math.max(cov[i][i] - s, 1e-12));
      else L[i][j] = (cov[i][j] - s) / (L[j][j] || 1e-12);
    }
  }
  return L;
}
export function resampledFrontier(
  mu: number[], cov: number[][], T = 120, B = 30, G = 10, seed = 7,
): ResampledResult {
  const n = mu.length;
  const rand = seededNormal(seed);
  const L = cholesky(cov);
  const wMV = minVarLO(cov);
  const rLo = portRet(wMV, mu);
  const rHi = Math.max(...mu);
  const targets: number[] = [];
  for (let g = 0; g < G; g++) targets.push(rLo + ((rHi - rLo) * g) / (G - 1));
  const classic: FrontierPoint[] = targets.map((tg) => {
    const w = mvForReturn(cov, mu, tg);
    return { ret: portRet(w, mu), vol: portVol(w, cov), weights: w };
  });
  const weightsGrid: number[][][] = targets.map(() => []);
  for (let b = 0; b < B; b++) {
    const sample: number[][] = Array.from({ length: n }, () => new Array(T).fill(0));
    for (let ti = 0; ti < T; ti++) {
      const z = new Array<number>(n).fill(0).map(() => rand());
      for (let i = 0; i < n; i++) {
        let x = mu[i];
        for (let k = 0; k <= i; k++) x += L[i][k] * z[k];
        sample[i][ti] = x;
      }
    }
    const muHat = sample.map((r) => mean(r));
    const covHat = sampleCov(sample);
    for (let g = 0; g < G; g++) {
      const w = mvForReturn(covHat, muHat, targets[g], 400);
      weightsGrid[g].push(w);
    }
  }
  const resampled: FrontierPoint[] = targets.map((_tg, g) => {
    const avg = new Array<number>(n).fill(0);
    for (const w of weightsGrid[g]) for (let i = 0; i < n; i++) avg[i] += w[i] / weightsGrid[g].length;
    return { ret: portRet(avg, mu), vol: portVol(avg, cov), weights: avg };
  });
  return { classic, resampled, weightsGrid, targets };
}

/* ── 5. Factor risk decomposition & budgeting ── */
export interface FactorDecomp {
  totalVar: number; totalVol: number;
  factorContribs: { name: string; var: number; pct: number; exposure: number }[];
  specificVar: number; specificPct: number;
}
export function factorRiskDecomp(
  weights: number[], B: number[][], factorCov: number[][], specificVar: number[], factorNames?: string[],
): FactorDecomp {
  const N = weights.length;
  const K = factorCov.length;
  const betaP = new Array<number>(K).fill(0);
  for (let k = 0; k < K; k++) for (let i = 0; i < N; i++) betaP[k] += B[i][k] * weights[i];
  const Fbeta = matVec(factorCov, betaP);
  const factorVarTotal = betaP.reduce((s, b, k) => s + b * Fbeta[k], 0);
  const specVar = weights.reduce((s, w, i) => s + w * w * specificVar[i], 0);
  const total = factorVarTotal + specVar;
  const names = factorNames ?? Array.from({ length: K }, (_, k) => `F${k + 1}`);
  const contribs = betaP.map((b, k) => {
    const v = b * Fbeta[k];
    return { name: names[k], var: v, pct: total > 1e-12 ? v / total : 0, exposure: b };
  });
  return { totalVar: total, totalVol: Math.sqrt(Math.max(total, 0)),
    factorContribs: contribs, specificVar: specVar,
    specificPct: total > 1e-12 ? specVar / total : 0 };
}
export function factorBudgetWeights(
  B: number[][], factorCov: number[][], specificVar: number[], targets: number[],
  iters = 2500, lr = 0.02,
): { weights: number[]; decomp: FactorDecomp } {
  const N = B.length;
  const K = factorCov.length;
  let w = new Array<number>(N).fill(1 / N);
  for (let it = 0; it < iters; it++) {
    const Btw = matVec(transpose(B), w);
    const FBtw = matVec(factorCov, Btw);
    const BFBtw = new Array<number>(N).fill(0);
    for (let i = 0; i < N; i++) for (let k = 0; k < K; k++) BFBtw[i] += B[i][k] * FBtw[k];
    const Sw = BFBtw.map((v, i) => v + specificVar[i] * w[i]);
    const totalVar = w.reduce((s, wi, i) => s + wi * Sw[i], 0);
    const grad = new Array<number>(N).fill(0);
    for (let k = 0; k < K; k++) {
      const rc = Btw[k] * FBtw[k];
      const err = (rc / Math.max(totalVar, 1e-12)) - targets[k];
      for (let i = 0; i < N; i++) grad[i] += 2 * err * (2 * B[i][k] * FBtw[k]) / Math.max(totalVar, 1e-12);
    }
    for (let i = 0; i < N; i++) grad[i] += 0.001 * (w[i] - 1 / N);
    w = projectSimplex(w.map((wi, i) => wi - lr * grad[i]));
  }
  return { weights: w, decomp: factorRiskDecomp(w, B, factorCov, specificVar) };
}

/* ── 6. Kelly & ruin Monte Carlo ── */
export function kellyWeights(mu: number[], cov: number[][], rf = 0): number[] {
  const excess = mu.map((m) => m - rf);
  return matVec(invertMatrix(cov), excess);
}
export interface KellySim {
  fractions: number[]; medianTerminal: number[]; meanTerminal: number[];
  q05Terminal: number[]; q95Terminal: number[]; ruinProb: number[]; growthRate: number[];
}
export function kellySimulate(
  mu: number[], cov: number[][], rf = 0, years = 20, paths = 3000,
  ruinThreshold = 0.5, seed = 11, fGrid?: number[],
): KellySim {
  const k = kellyWeights(mu, cov, rf);
  const muExcess = mu.map((m) => m - rf);
  const muP = k.reduce((s, w, i) => s + w * muExcess[i], 0);
  const Sw = matVec(cov, k);
  const varP = k.reduce((s, w, i) => s + w * Sw[i], 0);
  const sigmaP = Math.sqrt(Math.max(varP, 1e-12));
  const fractions = fGrid ?? [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  const norm = seededNormal(seed);
  const out: KellySim = { fractions,
    medianTerminal: [], meanTerminal: [], q05Terminal: [], q95Terminal: [], ruinProb: [], growthRate: [] };
  for (const f of fractions) {
    const meanG = f * muP + rf - 0.5 * f * f * varP;
    const sdG = f * sigmaP;
    const terminals: number[] = new Array(paths);
    let ruin = 0;
    for (let p = 0; p < paths; p++) {
      let logW = 0, minLogW = 0;
      for (let t = 0; t < years; t++) { logW += meanG + sdG * norm(); if (logW < minLogW) minLogW = logW; }
      terminals[p] = Math.exp(logW);
      if (Math.exp(minLogW) < ruinThreshold) ruin++;
    }
    terminals.sort((a, b) => a - b);
    const q = (p: number) => terminals[Math.max(0, Math.min(terminals.length - 1, Math.floor(p * terminals.length)))];
    out.medianTerminal.push(q(0.5));
    out.meanTerminal.push(terminals.reduce((s, v) => s + v, 0) / terminals.length);
    out.q05Terminal.push(q(0.05));
    out.q95Terminal.push(q(0.95));
    out.ruinProb.push(ruin / paths);
    out.growthRate.push(meanG);
  }
  return out;
}

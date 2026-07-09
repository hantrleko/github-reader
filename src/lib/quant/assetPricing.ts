/**
 * Pure, unit-tested asset-pricing primitives backing the expanded
 * Asset Pricing module (SDF / CCAPM / HJ bound / anomaly sorts / GRS test).
 */

export function invertMatrix(mat: number[][]): number[][] {
  const n = mat.length;
  const a = mat.map((r, i) =>
    r.concat(Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))),
  );
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++)
      if (Math.abs(a[r][i]) > Math.abs(a[piv][i])) piv = r;
    if (piv !== i) [a[i], a[piv]] = [a[piv], a[i]];
    const d = a[i][i];
    if (Math.abs(d) < 1e-14) throw new Error("assetPricing: singular matrix");
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

export function quadForm(v: number[], Minv: number[][]): number {
  const n = v.length;
  let s = 0;
  for (let i = 0; i < n; i++) {
    let row = 0;
    for (let j = 0; j < n; j++) row += Minv[i][j] * v[j];
    s += v[i] * row;
  }
  return s;
}

export const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
export const variance = (a: number[]) => {
  const m = mean(a);
  return a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1);
};
export const std = (a: number[]) => Math.sqrt(variance(a));
export function covariance(a: number[], b: number[]): number {
  const ma = mean(a);
  const mb = mean(b);
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - ma) * (b[i] - mb);
  return s / (a.length - 1);
}

export interface SDFAsset {
  name: string;
  er: number;
  vol: number;
  rho: number;
}
export interface SDFResult {
  a: number;
  b: number;
  eM: number;
  volM: number;
  rfImplied: number;
  assets: {
    name: string;
    covM: number;
    premiumModel: number;
    premiumInput: number;
  }[];
}

export function linearSDF(opts: {
  rf: number;
  erm: number;
  volm: number;
  assets: SDFAsset[];
}): SDFResult {
  const rf = opts.rf / 100;
  const erm = opts.erm / 100;
  const volm = opts.volm / 100;
  const varm = volm * volm;
  const eM = 1 / (1 + rf);
  const eRm = 1 + erm;
  const eRm2 = varm + eRm * eRm;
  const b = (1 - eM * eRm) / (eRm * eRm - eRm2);
  const a = eM + b * eRm;
  const volM = Math.abs(b) * volm;
  const assets = opts.assets.map((asset) => {
    const er = asset.er / 100;
    const vol = asset.vol / 100;
    const covM = -b * asset.rho * volm * vol;
    const premiumModel = -(1 + rf) * covM * 100;
    const premiumInput = (er - rf) * 100;
    return { name: asset.name, covM, premiumModel, premiumInput };
  });
  return { a, b, eM, volM, rfImplied: (1 / eM - 1) * 100, assets };
}

export interface CCAPMResult {
  rf: number;
  equityPremium: number;
  volM: number;
  gammaToMatch: number;
}
export function ccapm(opts: {
  delta: number;
  gamma: number;
  muC: number;
  sigmaC: number;
  sigmaM: number;
  rho: number;
  targetERP: number;
}): CCAPMResult {
  const { delta, gamma, targetERP } = opts;
  const muC = opts.muC / 100;
  const sigmaC = opts.sigmaC / 100;
  const sigmaM = opts.sigmaM / 100;
  const rho = opts.rho;
  const rf =
    (-Math.log(delta) + gamma * muC - 0.5 * gamma * gamma * sigmaC * sigmaC) * 100;
  const cov = rho * sigmaC * sigmaM;
  const equityPremium = gamma * cov * 100;
  const volM = gamma * sigmaC;
  const gammaToMatch = cov > 0 ? targetERP / 100 / cov : Infinity;
  return { rf, equityPremium, volM, gammaToMatch };
}

export interface HJPoint {
  sharpe: number;
  minVolM: number;
}
export function hjBound(sharpe: number, rf: number): number {
  const eM = 1 / (1 + rf / 100);
  return sharpe * eM;
}
export function hjFrontier(rf: number, maxSharpe = 1.2, steps = 25): HJPoint[] {
  const out: HJPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const sharpe = (i / steps) * maxSharpe;
    out.push({ sharpe: +sharpe.toFixed(3), minVolM: +hjBound(sharpe, rf).toFixed(4) });
  }
  return out;
}

export interface SortResult {
  portfolios: { rank: number; avgReturn: number; count: number }[];
  longShort: number;
  tStat: number;
  monotonic: boolean;
}
export function anomalySort(
  returns: number[][],
  characteristic: number[],
  nGroups: number,
): SortResult {
  const T = returns.length;
  const N = characteristic.length;
  const idx = Array.from({ length: N }, (_, i) => i).sort(
    (i, j) => characteristic[i] - characteristic[j],
  );
  const per = Math.floor(N / nGroups);
  const groups: number[][] = [];
  for (let g = 0; g < nGroups; g++) {
    const start = g * per;
    const end = g === nGroups - 1 ? N : start + per;
    groups.push(idx.slice(start, end));
  }
  const portSeries = groups.map((members) => {
    const series: number[] = [];
    for (let t = 0; t < T; t++) {
      let s = 0;
      for (const m of members) s += returns[t][m];
      series.push(s / members.length);
    }
    return series;
  });
  const portfolios = groups.map((members, g) => ({
    rank: g + 1,
    avgReturn: mean(portSeries[g]),
    count: members.length,
  }));
  const ls: number[] = [];
  for (let t = 0; t < T; t++)
    ls.push(portSeries[nGroups - 1][t] - portSeries[0][t]);
  const lsMean = mean(ls);
  const lsSe = std(ls) / Math.sqrt(T);
  const tStat = lsSe === 0 ? 0 : lsMean / lsSe;
  let monotonic = true;
  for (let g = 1; g < nGroups; g++)
    if (portfolios[g].avgReturn < portfolios[g - 1].avgReturn) monotonic = false;
  return { portfolios, longShort: lsMean, tStat, monotonic };
}

export interface GRSResult {
  grs: number;
  df1: number;
  df2: number;
  pValue: number;
  alphas: number[];
  meanAbsAlpha: number;
}
export function grsTest(excessReturns: number[][], factors: number[][]): GRSResult {
  const T = excessReturns.length;
  const N = excessReturns[0].length;
  const K = factors[0].length;
  const fMean = Array.from({ length: K }, (_, k) => mean(factors.map((r) => r[k])));
  const Omega = Array.from({ length: K }, (_, i) =>
    Array.from({ length: K }, (_, j) =>
      covariance(factors.map((r) => r[i]), factors.map((r) => r[j])),
    ),
  );
  const Xd = factors.map((row) => [1, ...row]);
  const kk = K + 1;
  const XtX = Array.from({ length: kk }, () => Array(kk).fill(0));
  for (let t = 0; t < T; t++)
    for (let a = 0; a < kk; a++)
      for (let b = 0; b < kk; b++) XtX[a][b] += Xd[t][a] * Xd[t][b];
  const XtXInv = invertMatrix(XtX);
  const alphas: number[] = [];
  const resid: number[][] = Array.from({ length: T }, () => Array(N).fill(0));
  for (let i = 0; i < N; i++) {
    const y = excessReturns.map((r) => r[i]);
    const Xty = Array(kk).fill(0);
    for (let t = 0; t < T; t++) for (let a = 0; a < kk; a++) Xty[a] += Xd[t][a] * y[t];
    const beta = XtXInv.map((row) => row.reduce((s, v, j) => s + v * Xty[j], 0));
    alphas.push(beta[0]);
    for (let t = 0; t < T; t++) {
      let yhat = 0;
      for (let a = 0; a < kk; a++) yhat += Xd[t][a] * beta[a];
      resid[t][i] = y[t] - yhat;
    }
  }
  const Sigma = Array.from({ length: N }, (_, i) =>
    Array.from({ length: N }, (_, j) => {
      let s = 0;
      for (let t = 0; t < T; t++) s += resid[t][i] * resid[t][j];
      return s / T;
    }),
  );
  const SigmaInv = invertMatrix(Sigma);
  const OmegaInv = invertMatrix(Omega);
  const aSa = quadForm(alphas, SigmaInv);
  const fOf = quadForm(fMean, OmegaInv);
  const grs = (T / N) * ((T - N - K) / (T - K - 1)) * (aSa / (1 + fOf));
  const df1 = N;
  const df2 = T - N - K;
  return {
    grs,
    df1,
    df2,
    pValue: fSurvival(grs, df1, df2),
    alphas,
    meanAbsAlpha: mean(alphas.map(Math.abs)),
  };
}

function logGamma(x: number): number {
  const c = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}
function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200;
  const EPS = 3e-12;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}
function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  );
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}
export function fSurvival(f: number, d1: number, d2: number): number {
  if (f <= 0) return 1;
  const x = d2 / (d2 + d1 * f);
  return betai(d2 / 2, d1 / 2, x);
}

export function rollingBeta(
  assetReturns: number[],
  marketReturns: number[],
  window: number,
): { t: number; beta: number }[] {
  const out: { t: number; beta: number }[] = [];
  const T = assetReturns.length;
  for (let end = window; end <= T; end++) {
    const a = assetReturns.slice(end - window, end);
    const m = marketReturns.slice(end - window, end);
    const varm = variance(m);
    const beta = varm === 0 ? 0 : covariance(a, m) / varm;
    out.push({ t: end, beta });
  }
  return out;
}
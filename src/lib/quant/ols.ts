/**
 * Multivariate OLS via the normal equations (X'X)β = X'y.
 * Gauss-Jordan inversion — fine for the <50-column matrices we deal with.
 */

export interface OLSResult {
  /** intercept then slopes */
  beta: number[];
  se: number[];
  tStat: number[];
  r2: number;
  adjR2: number;
  residualStd: number;
  n: number;
  k: number;
}

function invert(mat: number[][]): number[][] {
  const n = mat.length;
  const a = mat.map((r, i) =>
    r.concat(Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)))
  );
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(a[r][i]) > Math.abs(a[piv][i])) piv = r;
    if (piv !== i) [a[i], a[piv]] = [a[piv], a[i]];
    const d = a[i][i];
    if (Math.abs(d) < 1e-14) throw new Error("OLS: singular matrix");
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

/**
 * Run OLS y ~ [1, X₁, … Xₖ].
 * `X` is an n×k design matrix WITHOUT the intercept column (added automatically).
 */
export function ols(X: number[][], y: number[]): OLSResult {
  const n = y.length;
  if (X.length !== n) throw new Error("OLS: X and y row mismatch");
  const k = (X[0]?.length ?? 0) + 1; // + intercept
  const Xd = X.map((row) => [1, ...row]);

  // X'X (k×k) and X'y (k)
  const XtX = Array.from({ length: k }, () => Array(k).fill(0));
  const Xty = Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < k; a++) {
      Xty[a] += Xd[i][a] * y[i];
      for (let b = 0; b < k; b++) XtX[a][b] += Xd[i][a] * Xd[i][b];
    }
  }
  const XtXInv = invert(XtX);
  const beta = XtXInv.map((row) => row.reduce((s, v, j) => s + v * Xty[j], 0));

  // residuals
  let rss = 0;
  const yMean = y.reduce((s, v) => s + v, 0) / n;
  let tss = 0;
  for (let i = 0; i < n; i++) {
    let yhat = 0;
    for (let a = 0; a < k; a++) yhat += Xd[i][a] * beta[a];
    const e = y[i] - yhat;
    rss += e * e;
    tss += (y[i] - yMean) ** 2;
  }
  const dof = Math.max(n - k, 1);
  const sigma2 = rss / dof;
  const se = XtXInv.map((row, i) => Math.sqrt(Math.max(sigma2 * row[i], 0)));
  const tStat = beta.map((b, i) => (se[i] === 0 ? NaN : b / se[i]));
  const r2 = tss === 0 ? 1 : 1 - rss / tss;
  const adjR2 = 1 - (1 - r2) * ((n - 1) / dof);
  return {
    beta,
    se,
    tStat,
    r2,
    adjR2,
    residualStd: Math.sqrt(sigma2),
    n,
    k,
  };
}
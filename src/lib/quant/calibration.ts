/**
 * Calibration library — fit teaching models to real return / rate series.
 * Pure and dependency-free so the UI can flag the tools as "verified".
 *
 * Models:
 *  - GARCH(1,1) via Gaussian MLE (Nelder-Mead simplex on transformed params)
 *  - EWMA / RiskMetrics decay factor via grid search on the likelihood
 *  - Vasicek / CIR short-rate via discrete OLS estimators
 *  - Merton jump-diffusion via a threshold (peaks) decomposition
 */

const TRADING_DAYS = 252;

function mean(a: number[]): number {
  if (!a.length) return 0;
  return a.reduce((s, x) => s + x, 0) / a.length;
}
function variance(a: number[]): number {
  if (a.length < 2) return 0;
  const m = mean(a);
  return a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1);
}
function std(a: number[]): number {
  return Math.sqrt(variance(a));
}

/* ─────────────────────────── Nelder-Mead ─────────────────────────── */
/** Minimise f over an n-dim vector. Small, robust, dependency-free. */
export function nelderMead(
  f: (x: number[]) => number,
  x0: number[],
  opts: { maxIter?: number; tol?: number; step?: number } = {}
): { x: number[]; fx: number; iters: number } {
  const maxIter = opts.maxIter ?? 600;
  const tol = opts.tol ?? 1e-8;
  const step = opts.step ?? 0.1;
  const n = x0.length;

  // Build initial simplex.
  const simplex: number[][] = [x0.slice()];
  for (let i = 0; i < n; i++) {
    const p = x0.slice();
    p[i] += (p[i] !== 0 ? p[i] * step : step);
    simplex.push(p);
  }
  let fvals = simplex.map(f);

  const order = () => {
    const idx = fvals.map((v, i) => i).sort((a, b) => fvals[a] - fvals[b]);
    return { best: idx[0], worst: idx[n], second: idx[n - 1] };
  };

  let iters = 0;
  for (; iters < maxIter; iters++) {
    const { best, worst, second } = order();
    // Convergence on function spread.
    if (Math.abs(fvals[worst] - fvals[best]) < tol) break;

    // Centroid of all but worst.
    const centroid = new Array<number>(n).fill(0);
    for (let i = 0; i <= n; i++) {
      if (i === worst) continue;
      for (let j = 0; j < n; j++) centroid[j] += simplex[i][j] / n;
    }

    const reflect = centroid.map((c, j) => c + 1.0 * (c - simplex[worst][j]));
    const fr = f(reflect);
    if (fr < fvals[best]) {
      const expand = centroid.map((c, j) => c + 2.0 * (c - simplex[worst][j]));
      const fe = f(expand);
      if (fe < fr) { simplex[worst] = expand; fvals[worst] = fe; }
      else { simplex[worst] = reflect; fvals[worst] = fr; }
    } else if (fr < fvals[second]) {
      simplex[worst] = reflect; fvals[worst] = fr;
    } else {
      const contract = centroid.map((c, j) => c + 0.5 * (simplex[worst][j] - c));
      const fc = f(contract);
      if (fc < fvals[worst]) { simplex[worst] = contract; fvals[worst] = fc; }
      else {
        // Shrink toward best.
        for (let i = 0; i <= n; i++) {
          if (i === best) continue;
          simplex[i] = simplex[i].map((v, j) => simplex[best][j] + 0.5 * (v - simplex[best][j]));
          fvals[i] = f(simplex[i]);
        }
      }
    }
  }
  const { best } = order();
  return { x: simplex[best], fx: fvals[best], iters };
}

/* ─────────────────────────── GARCH(1,1) ─────────────────────────── */
export interface Garch11Fit {
  omega: number;
  alpha: number;
  beta: number;
  persistence: number; // alpha + beta
  longRunVar: number; // daily
  longRunVol: number; // annualised σ (decimal)
  condVol: number[]; // daily conditional σ series (decimal)
  logLik: number;
  mu: number; // estimated mean of returns
}

/** Conditional-variance recursion for a (ω,α,β) parameterisation. */
function garchVarPath(eps: number[], omega: number, alpha: number, beta: number) {
  const n = eps.length;
  const s2 = new Array<number>(n);
  const v0 = variance(eps);
  s2[0] = v0 > 0 ? v0 : 1e-8;
  for (let t = 1; t < n; t++) {
    s2[t] = omega + alpha * eps[t - 1] * eps[t - 1] + beta * s2[t - 1];
    if (!(s2[t] > 0) || !Number.isFinite(s2[t])) s2[t] = 1e-10;
  }
  return s2;
}

export function garchNegLogLik(eps: number[], omega: number, alpha: number, beta: number): number {
  const s2 = garchVarPath(eps, omega, alpha, beta);
  let ll = 0;
  for (let t = 0; t < eps.length; t++) {
    ll += -0.5 * (Math.log(2 * Math.PI) + Math.log(s2[t]) + (eps[t] * eps[t]) / s2[t]);
  }
  return -ll;
}

/** Fit GARCH(1,1) on a daily-return series via Gaussian MLE. */
export function fitGarch11(returns: number[]): Garch11Fit {
  const mu = mean(returns);
  const eps = returns.map((r) => r - mu);
  const v = variance(eps) || 1e-6;

  // Transform to keep ω>0 and α,β∈(0,1) with α+β<1:
  // ω = exp(a); α = s·g, β = s·(1-g) where s = sigmoid(c)∈(0,1), g = sigmoid(d)∈(0,1).
  const sig = (x: number) => 1 / (1 + Math.exp(-x));
  const decode = (p: number[]) => {
    const omega = Math.exp(p[0]);
    const s = sig(p[1]) * 0.999;
    const g = sig(p[2]);
    return { omega, alpha: s * g, beta: s * (1 - g) };
  };
  const obj = (p: number[]) => {
    const { omega, alpha, beta } = decode(p);
    return garchNegLogLik(eps, omega, alpha, beta);
  };

  // Start near a typical equity GARCH: α≈0.08, β≈0.90, ω≈0.05·v.
  const start = [Math.log(0.05 * v), 1.5, Math.log(0.08 / 0.9)];
  const res = nelderMead(obj, start, { maxIter: 1500, tol: 1e-10, step: 0.25 });
  const { omega, alpha, beta } = decode(res.x);
  const persistence = alpha + beta;
  const longRunVar = persistence < 1 ? omega / (1 - persistence) : v;
  const s2 = garchVarPath(eps, omega, alpha, beta);
  const condVol = s2.map((x) => Math.sqrt(x) * Math.sqrt(TRADING_DAYS));

  return {
    omega, alpha, beta, persistence,
    longRunVar,
    longRunVol: Math.sqrt(longRunVar * TRADING_DAYS),
    condVol,
    logLik: -res.fx,
    mu,
  };
}

/* ─────────────────────────── EWMA / RiskMetrics ─────────────────────────── */
export interface EwmaFit {
  lambda: number;
  condVol: number[]; // annualised σ
  logLik: number;
  riskMetricsVol: number; // latest σ at λ=0.94 (annualised)
  latestVol: number; // latest σ at fitted λ (annualised)
}

function ewmaVarPath(eps: number[], lambda: number): number[] {
  const n = eps.length;
  const s2 = new Array<number>(n);
  s2[0] = variance(eps) || 1e-8;
  for (let t = 1; t < n; t++) {
    s2[t] = lambda * s2[t - 1] + (1 - lambda) * eps[t - 1] * eps[t - 1];
  }
  return s2;
}

export function fitEwmaLambda(returns: number[]): EwmaFit {
  const mu = mean(returns);
  const eps = returns.map((r) => r - mu);
  let bestLambda = 0.94;
  let bestLL = -Infinity;
  for (let lam = 0.80; lam <= 0.995; lam += 0.0025) {
    const s2 = ewmaVarPath(eps, lam);
    let ll = 0;
    for (let t = 1; t < eps.length; t++) {
      ll += -0.5 * (Math.log(2 * Math.PI) + Math.log(s2[t]) + (eps[t] * eps[t]) / s2[t]);
    }
    if (ll > bestLL) { bestLL = ll; bestLambda = lam; }
  }
  const fitted = ewmaVarPath(eps, bestLambda);
  const rm = ewmaVarPath(eps, 0.94);
  return {
    lambda: bestLambda,
    condVol: fitted.map((x) => Math.sqrt(x) * Math.sqrt(TRADING_DAYS)),
    logLik: bestLL,
    riskMetricsVol: Math.sqrt(rm[rm.length - 1] * TRADING_DAYS),
    latestVol: Math.sqrt(fitted[fitted.length - 1] * TRADING_DAYS),
  };
}

/* ─────────────────────────── Vasicek / CIR ─────────────────────────── */
export interface ShortRateFit {
  kappa: number; // mean-reversion speed (annual)
  theta: number; // long-run mean
  sigma: number; // volatility (annual)
  halfLife: number; // years to close half the gap
  model: "vasicek" | "cir";
}

/**
 * Discrete OLS estimator. Regress r[t] = a + b·r[t-1] + e.
 * Vasicek:  κ = -ln(b)/dt, θ = a/(1-b), σ from residual variance.
 * CIR: same drift, but σ scaled by sqrt(r) (residuals divided by √r[t-1]).
 */
export function fitShortRate(
  rates: number[],
  model: "vasicek" | "cir" = "vasicek",
  dt = 1 / TRADING_DAYS
): ShortRateFit {
  const x = rates.slice(0, -1);
  const y = rates.slice(1);
  const n = x.length;
  const mx = mean(x), my = mean(y);
  let sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (x[i] - mx) * (x[i] - mx);
    sxy += (x[i] - mx) * (y[i] - my);
  }
  const b = sxx > 0 ? sxy / sxx : 0;
  const a = my - b * mx;
  const bb = Math.min(0.999999, Math.max(1e-6, b));
  const kappa = -Math.log(bb) / dt;
  const theta = Math.abs(1 - b) > 1e-9 ? a / (1 - b) : my;

  const resid: number[] = [];
  for (let i = 0; i < n; i++) {
    const e = y[i] - (a + b * x[i]);
    resid.push(model === "cir" && x[i] > 1e-9 ? e / Math.sqrt(x[i]) : e);
  }
  const residVar = variance(resid);
  // σ² (annual) from discrete residuals: σ² = residVar · 2κ / (1 - b²)
  const denom = 1 - b * b;
  const sigma2 = denom > 1e-9 ? (residVar * 2 * kappa) / denom : residVar / dt;
  const sigma = Math.sqrt(Math.max(sigma2, 0));

  return {
    kappa,
    theta,
    sigma,
    halfLife: kappa > 1e-9 ? Math.log(2) / kappa : Infinity,
    model,
  };
}

/* ─────────────────────────── Merton jump-diffusion ─────────────────────────── */
export interface MertonJumpFit {
  sigmaDiffusion: number; // annualised diffusion σ
  lambda: number; // annual jump intensity
  jumpMean: number; // mean jump size (log-return)
  jumpStd: number; // jump size std
  nJumps: number;
  threshold: number; // |return| cutoff used to flag jumps
}

/**
 * Threshold / peaks decomposition: flag returns beyond k·σ as jumps, estimate
 * the diffusion σ from the remainder and the jump law from the flagged set.
 */
export function fitMertonJump(
  returns: number[],
  k = 3,
  dt = 1 / TRADING_DAYS
): MertonJumpFit {
  const mu = mean(returns);
  const sd0 = std(returns);
  const threshold = k * sd0;
  const jumps: number[] = [];
  const diffuse: number[] = [];
  for (const r of returns) {
    if (Math.abs(r - mu) > threshold) jumps.push(r);
    else diffuse.push(r);
  }
  const sigmaDiffusion = (std(diffuse) || sd0) / Math.sqrt(dt);
  const lambda = (jumps.length / returns.length) / dt;
  return {
    sigmaDiffusion,
    lambda,
    jumpMean: jumps.length ? mean(jumps) : 0,
    jumpStd: jumps.length > 1 ? std(jumps) : 0,
    nJumps: jumps.length,
    threshold,
  };
}
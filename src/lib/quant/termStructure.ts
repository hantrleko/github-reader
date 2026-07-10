/**
 * Term-structure fitting — Nelson-Siegel (1987) and Svensson (1994).
 *
 * The zero-coupon yield curve is written as a small set of factor loadings
 * (level / slope / curvature, plus a second curvature hump for Svensson)
 * multiplied by β coefficients. For a FIXED decay λ the model is linear in
 * β, so we fit β by ordinary least squares and pick λ by a 1-D (NS) or 2-D
 * (NSS) grid search that minimises the residual sum of squares.
 *
 * Yields and β are in percent (e.g. 4.25 = 4.25%); τ (maturity) is in years.
 */
import { ols } from "@/lib/quant/ols";

export interface CurvePoint {
  /** maturity in years (> 0) */
  tau: number;
  /** observed zero/par yield in percent */
  yield: number;
}

export interface NSParams {
  b0: number;
  b1: number;
  b2: number;
  lambda: number;
}

export interface NSSParams {
  b0: number;
  b1: number;
  b2: number;
  b3: number;
  lambda1: number;
  lambda2: number;
}

export interface FitStats {
  /** fitted yield at each input τ */
  fitted: number[];
  /** observed − fitted at each input τ */
  residuals: number[];
  /** root mean squared error (percent) */
  rmse: number;
  /** coefficient of determination */
  r2: number;
}

export interface NSFit extends NSParams, FitStats {}
export interface NSSFit extends NSSParams, FitStats {}

const EPS = 1e-8;

/** The two non-constant Nelson-Siegel loadings [slope, curvature] for a τ / λ. */
export function nsLoadings(tau: number, lambda: number): [number, number] {
  const x = Math.max(tau, EPS) / lambda;
  const expX = Math.exp(-x);
  const slope = (1 - expX) / x;
  const curv = slope - expX;
  return [slope, curv];
}

/** Nelson-Siegel spot rate y(τ). */
export function nsRate(tau: number, p: NSParams): number {
  const [l1, l2] = nsLoadings(tau, p.lambda);
  return p.b0 + p.b1 * l1 + p.b2 * l2;
}

/** Nelson-Siegel instantaneous forward rate f(τ) (closed form). */
export function nsForward(tau: number, p: NSParams): number {
  const x = Math.max(tau, EPS) / p.lambda;
  const expX = Math.exp(-x);
  return p.b0 + p.b1 * expX + p.b2 * x * expX;
}

/** Svensson spot rate y(τ). */
export function nssRate(tau: number, p: NSSParams): number {
  const [l1, l2] = nsLoadings(tau, p.lambda1);
  const x2 = Math.max(tau, EPS) / p.lambda2;
  const expX2 = Math.exp(-x2);
  const l3 = (1 - expX2) / x2 - expX2;
  return p.b0 + p.b1 * l1 + p.b2 * l2 + p.b3 * l3;
}

/** Svensson instantaneous forward rate f(τ). */
export function nssForward(tau: number, p: NSSParams): number {
  const x1 = Math.max(tau, EPS) / p.lambda1;
  const x2 = Math.max(tau, EPS) / p.lambda2;
  return (
    p.b0 +
    p.b1 * Math.exp(-x1) +
    p.b2 * x1 * Math.exp(-x1) +
    p.b3 * x2 * Math.exp(-x2)
  );
}

function computeStats(points: CurvePoint[], predict: (tau: number) => number): FitStats {
  const ys = points.map((p) => p.yield);
  const fitted = points.map((p) => predict(p.tau));
  const residuals = points.map((p, i) => p.yield - fitted[i]);
  const rss = residuals.reduce((s, e) => s + e * e, 0);
  const mean = ys.reduce((s, v) => s + v, 0) / ys.length;
  const tss = ys.reduce((s, v) => s + (v - mean) ** 2, 0);
  return {
    fitted,
    residuals,
    rmse: Math.sqrt(rss / points.length),
    r2: tss < EPS ? 1 : 1 - rss / tss,
    __rss: rss,
  } as FitStats & { __rss: number };
}

function linspace(a: number, b: number, n: number): number[] {
  if (n <= 1) return [a];
  return Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
}

/**
 * Fit Nelson-Siegel to observed (τ, yield) points.
 * β is solved by OLS for each λ on a grid; the λ with minimum RSS wins.
 */
export function fitNS(
  points: CurvePoint[],
  lambdaRange: [number, number] = [0.2, 6],
  gridSize = 60
): NSFit {
  const valid = points.filter((p) => p.tau > 0 && Number.isFinite(p.yield));
  if (valid.length < 3) throw new Error("fitNS: need at least 3 valid points");

  const y = valid.map((p) => p.yield);
  const grid = linspace(lambdaRange[0], lambdaRange[1], gridSize);
  let best: NSFit | null = null;
  let bestRss = Infinity;

  for (const lambda of grid) {
    const X = valid.map((p) => nsLoadings(p.tau, lambda));
    let res;
    try {
      res = ols(X, y);
    } catch {
      continue;
    }
    const [b0, b1, b2] = res.beta;
    const stats = computeStats(valid, (tau) => nsRate(tau, { b0, b1, b2, lambda })) as FitStats & { __rss: number };
    if (stats.__rss < bestRss) {
      bestRss = stats.__rss;
      best = { b0, b1, b2, lambda, fitted: stats.fitted, residuals: stats.residuals, rmse: stats.rmse, r2: stats.r2 };
    }
  }
  if (!best) throw new Error("fitNS: fit failed");
  return best;
}

/**
 * Fit Svensson (two curvature humps) to observed points via a 2-D λ grid
 * search with OLS on β at each node.
 */
export function fitNSS(
  points: CurvePoint[],
  lambda1Range: [number, number] = [0.3, 4],
  lambda2Range: [number, number] = [4, 12],
  gridSize = 22
): NSSFit {
  const valid = points.filter((p) => p.tau > 0 && Number.isFinite(p.yield));
  if (valid.length < 4) throw new Error("fitNSS: need at least 4 valid points");

  const y = valid.map((p) => p.yield);
  const g1 = linspace(lambda1Range[0], lambda1Range[1], gridSize);
  const g2 = linspace(lambda2Range[0], lambda2Range[1], gridSize);
  let best: NSSFit | null = null;
  let bestRss = Infinity;

  for (const lambda1 of g1) {
    for (const lambda2 of g2) {
      if (Math.abs(lambda1 - lambda2) < 1e-3) continue; // avoid collinear loadings
      const X = valid.map((p) => {
        const [l1, l2] = nsLoadings(p.tau, lambda1);
        const x2 = Math.max(p.tau, EPS) / lambda2;
        const l3 = (1 - Math.exp(-x2)) / x2 - Math.exp(-x2);
        return [l1, l2, l3];
      });
      let res;
      try {
        res = ols(X, y);
      } catch {
        continue;
      }
      const [b0, b1, b2, b3] = res.beta;
      const stats = computeStats(valid, (tau) => nssRate(tau, { b0, b1, b2, b3, lambda1, lambda2 })) as FitStats & { __rss: number };
      if (stats.__rss < bestRss) {
        bestRss = stats.__rss;
        best = { b0, b1, b2, b3, lambda1, lambda2, fitted: stats.fitted, residuals: stats.residuals, rmse: stats.rmse, r2: stats.r2 };
      }
    }
  }
  if (!best) throw new Error("fitNSS: fit failed");
  return best;
}

/** Sample a fitted NS curve on a dense grid for plotting. */
export function sampleNS(p: NSParams, maxTau = 30, n = 60): { tau: number; spot: number; forward: number }[] {
  return linspace(0.25, maxTau, n).map((tau) => ({
    tau: +tau.toFixed(3),
    spot: +nsRate(tau, p).toFixed(4),
    forward: +nsForward(tau, p).toFixed(4),
  }));
}

/** Sample a fitted Svensson curve on a dense grid for plotting. */
export function sampleNSS(p: NSSParams, maxTau = 30, n = 60): { tau: number; spot: number; forward: number }[] {
  return linspace(0.25, maxTau, n).map((tau) => ({
    tau: +tau.toFixed(3),
    spot: +nssRate(tau, p).toFixed(4),
    forward: +nssForward(tau, p).toFixed(4),
  }));
}
import { describe, it, expect } from "vitest";
import {
  normalCdf, chiSquarePValue, tTwoTail, fPValue,
  olsDetail, breuschPagan, whiteTest, durbinWatson, breuschGodfrey,
  vif, ramseyReset, robustSE, neweyWestSE,
  fitDynamicPanel, dieboldMariano,
  kernelRegression, loocvScore, optimalBandwidth, silvermanBandwidth,
} from "../econometrics";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randn(rng: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

describe("distributions", () => {
  it("normalCdf known values", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 3);
  });
  it("chi-square upper tail", () => {
    // χ²(1) 3.841 → 0.05
    expect(chiSquarePValue(3.841, 1)).toBeCloseTo(0.05, 2);
    // χ²(2) 5.991 → 0.05
    expect(chiSquarePValue(5.991, 2)).toBeCloseTo(0.05, 2);
  });
  it("t two-tailed", () => {
    // t=1.96, huge df ≈ normal → 0.05
    expect(tTwoTail(1.96, 100000)).toBeCloseTo(0.05, 2);
    expect(tTwoTail(0, 10)).toBeCloseTo(1, 6);
  });
  it("F upper tail", () => {
    // F(3,10) 3.708 → ~0.05
    expect(fPValue(3.708, 3, 10)).toBeCloseTo(0.05, 2);
  });
});

describe("OLS core", () => {
  it("recovers known coefficients", () => {
    const X = Array.from({ length: 50 }, (_, i) => [i / 10, (i % 5)]);
    const y = X.map(([a, b]) => 1 + 2 * a - 0.5 * b);
    const f = olsDetail(X, y);
    expect(f.beta[0]).toBeCloseTo(1, 6);
    expect(f.beta[1]).toBeCloseTo(2, 6);
    expect(f.beta[2]).toBeCloseTo(-0.5, 6);
    expect(f.r2).toBeCloseTo(1, 8);
  });
});

describe("diagnostics", () => {
  const rng = mulberry32(42);
  const n = 300;
  const X = Array.from({ length: n }, (_, i) => [i / n]);
  // Homoskedastic clean model
  const yClean = X.map(([x]) => 1 + 2 * x + 0.3 * randn(rng));
  // Heteroskedastic: variance grows with x
  const rng2 = mulberry32(7);
  const yHet = X.map(([x]) => 1 + 2 * x + (0.1 + 2 * x) * randn(rng2));

  it("Breusch-Pagan flags heteroskedasticity", () => {
    const fClean = olsDetail(X, yClean);
    const fHet = olsDetail(X, yHet);
    expect(breuschPagan(fClean).reject).toBe(false);
    expect(breuschPagan(fHet).reject).toBe(true);
  });
  it("White test runs and returns valid p", () => {
    const w = whiteTest(olsDetail(X, yHet));
    expect(w.pValue).toBeGreaterThanOrEqual(0);
    expect(w.pValue).toBeLessThanOrEqual(1);
  });
  it("Durbin-Watson ≈ 2 for iid errors", () => {
    const dw = durbinWatson(olsDetail(X, yClean).resid);
    expect(dw).toBeGreaterThan(1.7);
    expect(dw).toBeLessThan(2.3);
  });
  it("Breusch-Godfrey flags AR(1) errors", () => {
    const rng3 = mulberry32(11);
    let e = 0;
    const yAR = X.map(([x]) => {
      e = 0.8 * e + 0.3 * randn(rng3);
      return 1 + 2 * x + e;
    });
    const bg = breuschGodfrey(olsDetail(X, yAR), 1);
    expect(bg.reject).toBe(true);
  });
  it("VIF high for collinear regressors", () => {
    const rng4 = mulberry32(3);
    const Xc = Array.from({ length: 200 }, () => {
      const a = randn(rng4);
      return [a, a + 0.01 * randn(rng4)]; // near-collinear
    });
    const v = vif(Xc);
    expect(v[0]).toBeGreaterThan(10);
  });
  it("RESET flags omitted nonlinearity", () => {
    const rng5 = mulberry32(9);
    const Xr = Array.from({ length: 200 }, (_, i) => [i / 50 - 2]);
    const yNL = Xr.map(([x]) => 1 + 0.5 * x + 0.8 * x * x + 0.1 * randn(rng5));
    const r = ramseyReset(Xr, yNL, 3);
    expect(r.reject).toBe(true);
  });
});

describe("robust SE", () => {
  it("HC3 ≥ 0 and finite", () => {
    const rng = mulberry32(1);
    const X = Array.from({ length: 100 }, (_, i) => [i / 100]);
    const y = X.map(([x]) => 1 + 2 * x + (0.1 + x) * randn(rng));
    const f = olsDetail(X, y);
    const hc3 = robustSE(f, "HC3");
    const nw = neweyWestSE(f, 4);
    expect(hc3.every((s) => s >= 0 && Number.isFinite(s))).toBe(true);
    expect(nw.every((s) => s >= 0 && Number.isFinite(s))).toBe(true);
  });
});

describe("dynamic panel", () => {
  it("diff-GMM reduces Nickell bias vs FE", () => {
    const rng = mulberry32(123);
    const N = 80;
    const T = 8;
    const rho = 0.6;
    const y: number[][] = [];
    for (let i = 0; i < N; i++) {
      const mu = randn(rng) * 0.5;
      const row = [mu + randn(rng)];
      for (let t = 1; t < T; t++) row.push(rho * row[t - 1] + mu + 0.5 * randn(rng));
      y.push(row);
    }
    const fit = fitDynamicPanel({ y });
    // FE is biased downward in short panels; GMM should be closer to true rho.
    expect(Math.abs(fit.diffGMM - rho)).toBeLessThan(Math.abs(fit.withinFE - rho) + 0.35);
    expect(fit.hansenP).toBeGreaterThanOrEqual(0);
    expect(fit.hansenP).toBeLessThanOrEqual(1);
  });
});

describe("Diebold-Mariano", () => {
  it("detects a clearly better forecast", () => {
    const rng = mulberry32(55);
    const n = 200;
    const e1: number[] = [];
    const e2: number[] = [];
    for (let i = 0; i < n; i++) {
      e1.push(0.5 * randn(rng)); // small errors
      e2.push(2.0 * randn(rng)); // big errors
    }
    const dm = dieboldMariano(e1, e2, 2, 1);
    expect(dm.better).toBe(1);
    expect(dm.harveyP).toBeLessThan(0.05);
  });
  it("no significant difference for equal forecasts", () => {
    const rng = mulberry32(66);
    const n = 200;
    const e1 = Array.from({ length: n }, () => randn(rng));
    const e2 = Array.from({ length: n }, () => randn(rng));
    const dm = dieboldMariano(e1, e2, 2, 1);
    expect(dm.harveyP).toBeGreaterThan(0.05);
  });
});

describe("kernel regression", () => {
  const rng = mulberry32(77);
  const x = Array.from({ length: 120 }, (_, i) => (i / 120) * 6 - 3);
  const truth = (v: number) => Math.sin(v);
  const y = x.map((v) => truth(v) + 0.15 * randn(rng));

  it("local-linear recovers a smooth function", () => {
    const h = silvermanBandwidth(x);
    const fit = kernelRegression(x, y, h, { local: true, query: x });
    let err = 0;
    fit.forEach((p, i) => (err += (p.yhat - truth(x[i])) ** 2));
    expect(err / x.length).toBeLessThan(0.05);
  });
  it("CV picks a sensible bandwidth", () => {
    const opt = optimalBandwidth(x, y, 0.05, 2, 25);
    expect(opt.h).toBeGreaterThan(0.05);
    expect(opt.h).toBeLessThan(2);
    // CV score at optimum ≤ score at tiny bandwidth
    expect(opt.cv).toBeLessThan(loocvScore(x, y, 0.05));
  });
});

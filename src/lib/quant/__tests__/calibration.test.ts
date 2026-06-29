import { describe, it, expect } from "vitest";
import {
  fitGarch11,
  fitEwmaLambda,
  fitShortRate,
  fitMertonJump,
  nelderMead,
  fitShortRate as fitSR,
  acf,
  qqNormal,
  normalQuantile,
  standardizedResiduals,
} from "../calibration";

/** Mulberry32 deterministic PRNG. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Box-Muller standard normal. */
function gauss(r: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

describe("nelderMead", () => {
  it("minimises a simple quadratic", () => {
    const f = (x: number[]) => (x[0] - 3) ** 2 + (x[1] + 2) ** 2;
    const res = nelderMead(f, [0, 0]);
    expect(res.x[0]).toBeCloseTo(3, 2);
    expect(res.x[1]).toBeCloseTo(-2, 2);
  });
});

describe("fitGarch11", () => {
  it("recovers sensible params on simulated GARCH data", () => {
    const r = rng(42);
    const omega = 0.00001, alpha = 0.08, beta = 0.9;
    const n = 4000;
    let s2 = omega / (1 - alpha - beta);
    const returns: number[] = [];
    let prevEps = 0;
    for (let i = 0; i < n; i++) {
      s2 = omega + alpha * prevEps * prevEps + beta * s2;
      const eps = Math.sqrt(s2) * gauss(r);
      returns.push(eps);
      prevEps = eps;
    }
    const fit = fitGarch11(returns);
    expect(fit.persistence).toBeGreaterThan(0.8);
    expect(fit.persistence).toBeLessThan(1.0);
    expect(fit.beta).toBeGreaterThan(fit.alpha); // β dominates in equity-like GARCH
    expect(fit.condVol.length).toBe(n);
    expect(fit.longRunVol).toBeGreaterThan(0);
  });
});

describe("fitEwmaLambda", () => {
  it("returns a lambda within the search bounds and a RiskMetrics comparison", () => {
    const r = rng(7);
    const returns = Array.from({ length: 1000 }, () => 0.01 * gauss(r));
    const fit = fitEwmaLambda(returns);
    expect(fit.lambda).toBeGreaterThanOrEqual(0.8);
    expect(fit.lambda).toBeLessThanOrEqual(0.995);
    expect(fit.riskMetricsVol).toBeGreaterThan(0);
    expect(fit.latestVol).toBeGreaterThan(0);
  });
});

describe("fitShortRate (Vasicek)", () => {
  it("recovers mean-reversion level and speed on simulated OU data", () => {
    const r = rng(123);
    const kappa = 1.5, theta = 0.04, sigma = 0.01;
    const dt = 1 / 252;
    const n = 6000;
    let rate = 0.03;
    const rates = [rate];
    for (let i = 1; i < n; i++) {
      rate = rate + kappa * (theta - rate) * dt + sigma * Math.sqrt(dt) * gauss(r);
      rates.push(rate);
    }
    const fit = fitShortRate(rates, "vasicek", dt);
    expect(fit.theta).toBeCloseTo(theta, 2);
    expect(fit.kappa).toBeGreaterThan(0.5);
    expect(fit.kappa).toBeLessThan(3);
    expect(fit.sigma).toBeGreaterThan(0.005);
    expect(fit.sigma).toBeLessThan(0.02);
  });
});

describe("fitMertonJump", () => {
  it("separates a few large jumps from the diffusion", () => {
    const r = rng(99);
    const returns: number[] = [];
    for (let i = 0; i < 1000; i++) returns.push(0.008 * gauss(r));
    // inject 5 obvious jumps
    [100, 250, 500, 750, 900].forEach((i) => (returns[i] = 0.1));
    const fit = fitMertonJump(returns, 3);
    expect(fit.nJumps).toBeGreaterThanOrEqual(4);
    expect(fit.jumpMean).toBeGreaterThan(0.05);
    expect(fit.sigmaDiffusion).toBeGreaterThan(0);
  });
});

describe("fitShortRate (CIR)", () => {
  it("recovers mean level on simulated CIR data", () => {
    const r = rng(321);
    const kappa = 1.2, theta = 0.05, sigma = 0.08;
    const dt = 1 / 252;
    const n = 6000;
    let rate = 0.04;
    const rates = [rate];
    for (let i = 1; i < n; i++) {
      rate = Math.max(1e-5, rate + kappa * (theta - rate) * dt + sigma * Math.sqrt(Math.max(rate, 0)) * Math.sqrt(dt) * gauss(r));
      rates.push(rate);
    }
    const fit = fitSR(rates, "cir", dt);
    expect(fit.theta).toBeCloseTo(theta, 2);
    expect(fit.kappa).toBeGreaterThan(0.3);
    expect(fit.model).toBe("cir");
  });
});

describe("diagnostics", () => {
  it("normalQuantile inverts standard normal at known points", () => {
    expect(normalQuantile(0.5)).toBeCloseTo(0, 4);
    expect(normalQuantile(0.975)).toBeCloseTo(1.96, 2);
    expect(normalQuantile(0.025)).toBeCloseTo(-1.96, 2);
  });

  it("acf of white noise is near zero at all lags", () => {
    const r = rng(7);
    const x = Array.from({ length: 2000 }, () => gauss(r));
    const ac = acf(x, 10);
    expect(ac.length).toBe(10);
    ac.forEach((v) => expect(Math.abs(v)).toBeLessThan(0.15));
  });

  it("qqNormal of standard normal data is roughly linear with slope 1", () => {
    const r = rng(9);
    const x = Array.from({ length: 1000 }, () => gauss(r));
    const qq = qqNormal(x);
    const mid = qq[Math.floor(qq.length / 2)];
    expect(Math.abs(mid.sample - mid.theoretical)).toBeLessThan(0.5);
  });

  it("standardizedResiduals divides returns by the daily vol tail", () => {
    const returns = [0.01, -0.02, 0.015, -0.005, 0.02];
    const dailyVol = [0.02, 0.02, 0.02]; // aligned to the tail
    const z = standardizedResiduals(returns, dailyVol);
    expect(z.length).toBe(3);
  });
});
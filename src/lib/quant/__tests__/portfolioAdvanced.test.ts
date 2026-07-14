import { describe, it, expect } from "vitest";
import {
  blackLittermanFull, ledoitWolfShrink, meanCVaROptimize,
  factorRiskDecomp, kellySimulate,
} from "../portfolioAdvanced";

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function gauss(r: () => number) {
  let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

describe("Black-Litterman full", () => {
  const Sigma = [[0.04, 0.01, 0.005], [0.01, 0.09, 0.01], [0.005, 0.01, 0.16]];
  const wMkt = [0.5, 0.3, 0.2];
  it("high uncertainty pulls posterior toward prior", () => {
    const bigOmega = [[1e6]];
    const P = [[1, 0, -1]];
    const Q = [0.2];
    const r = blackLittermanFull({ Sigma, wMkt, delta: 2.5, tau: 0.05, P, Q, Omega: bigOmega });
    for (let i = 0; i < 3; i++) expect(Math.abs(r.muPost[i] - r.pi[i])).toBeLessThan(1e-3);
  });
  it("near-zero uncertainty enforces the view", () => {
    const P = [[1, 0, -1]];
    const Q = [0.2];
    const tiny = [[1e-10]];
    const r = blackLittermanFull({ Sigma, wMkt, delta: 2.5, tau: 0.05, P, Q, Omega: tiny });
    expect(r.muPost[0] - r.muPost[2]).toBeCloseTo(0.2, 3);
  });
});

describe("Ledoit-Wolf shrinkage", () => {
  it("improves conditioning on a near-singular sample", () => {
    const r = rng(3);
    const T = 30, N = 6;
    // fewer observations than assets → sample cov is ill-conditioned
    const rets: number[][] = Array.from({ length: N }, () =>
      Array.from({ length: T }, () => 0.01 * gauss(r)));
    const s = ledoitWolfShrink(rets);
    expect(s.condShrunk).toBeLessThan(s.condSample);
    expect(s.lambda).toBeGreaterThan(0);
  });
});

describe("Mean-CVaR optimisation", () => {
  it("weights sum to 1 and are long-only", () => {
    const r = rng(5);
    const S = 400, N = 3;
    const scenarios: number[][] = Array.from({ length: S }, () =>
      [0.001 + 0.02 * gauss(r), 0.0005 + 0.03 * gauss(r), 0.002 + 0.05 * gauss(r)]);
    const res = meanCVaROptimize(scenarios, 0.95);
    const sum = res.weights.reduce((s, x) => s + x, 0);
    expect(sum).toBeCloseTo(1, 3);
    expect(res.weights.every((w) => w >= -1e-6)).toBe(true);
    expect(res.cvar).toBeGreaterThan(0);
  });
});

describe("Factor risk decomposition", () => {
  it("factor + specific variance sums to total portfolio variance", () => {
    const w = [0.4, 0.3, 0.3];
    const B = [[1.0, 0.5], [1.1, -0.2], [0.8, 0.9]];
    const F = [[0.04, 0.005], [0.005, 0.02]];
    const spec = [0.01, 0.015, 0.02];
    const d = factorRiskDecomp(w, B, F, spec);
    const sum = d.factorContribs.reduce((s, c) => s + c.var, 0) + d.specificVar;
    expect(sum).toBeCloseTo(d.totalVar, 8);
  });
});

describe("Kelly simulation", () => {
  it("half-Kelly has lower ruin probability than 1.5×Kelly", () => {
    const mu = [0.12, 0.08];
    const cov = [[0.04, 0.01], [0.01, 0.09]];
    const sim = kellySimulate(mu, cov, 0.02, 15, 1500, 0.5, 42, [0.5, 1.5]);
    expect(sim.ruinProb[0]).toBeLessThan(sim.ruinProb[1]);
  });
});

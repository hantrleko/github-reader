import { describe, it, expect } from "vitest";
import {
  computeSystemic, simulateJoint, almgrenChriss, historicalES, baselTrafficLight,
  kupiecPOF, ldaOpVaR, reverseStress, componentVaR,
} from "../riskAdvanced";

describe("riskAdvanced — V4.3", () => {
  it("CoVaR magnitude grows with correlation", () => {
    const low = simulateJoint(0.1, 1000, 1);
    const hi = simulateJoint(0.8, 1000, 1);
    const rLow = computeSystemic(low.rs, low.ri, 0.05, 100, 300);
    const rHi = computeSystemic(hi.rs, hi.ri, 0.05, 100, 300);
    // Higher correlation => more negative CoVaR (larger absolute)
    expect(Math.abs(rHi.deltaCoVaR)).toBeGreaterThan(Math.abs(rLow.deltaCoVaR));
  });

  it("MES is at least as extreme as unconditional mean", () => {
    const s = simulateJoint(0.6, 2000, 7);
    const r = computeSystemic(s.rs, s.ri, 0.05, 100, 300);
    const uncondMean = s.ri.reduce((a, b) => a + b, 0) / s.ri.length;
    // Tail-conditional expectation is more negative than unconditional
    expect(r.mes).toBeLessThan(uncondMean);
  });

  it("Almgren-Chriss: lambda -> 0 approaches TWAP; lambda large front-loads execution", () => {
    const twap = almgrenChriss({ X: 100, T: 5, N: 5, sigma: 0.02, eta: 0.01, lambda: 1e-9 });
    // Should be linear schedule, second period holds ~80% of X
    expect(twap.schedule[1].x).toBeCloseTo(80, 0);
    const fast = almgrenChriss({ X: 100, T: 5, N: 5, sigma: 0.02, eta: 0.01, lambda: 5 });
    // Aggressive: after 1 period much less than TWAP
    expect(fast.schedule[1].x).toBeLessThan(twap.schedule[1].x);
  });

  it("Historical ES ≥ VaR (loss convention)", () => {
    const pnl = Array.from({ length: 500 }, (_, i) => -Math.log(1 + i / 100));
    const { var: v, es } = historicalES(pnl, 0.975);
    expect(es).toBeGreaterThanOrEqual(v);
  });

  it("Basel traffic light zones", () => {
    expect(baselTrafficLight(3).zone).toBe("green");
    expect(baselTrafficLight(7).zone).toBe("yellow");
    expect(baselTrafficLight(11).zone).toBe("red");
    expect(baselTrafficLight(11).multiplier).toBe(2);
  });

  it("Kupiec POF: p-value > 0.05 when exceptions match expected", () => {
    const { pValue } = kupiecPOF(3, 250, 0.01); // expected 2.5, close to 3
    expect(pValue).toBeGreaterThan(0.05);
  });

  it("LDA OpVaR: sample mean approximates lambda * E[X]", () => {
    const out = ldaOpVaR({ lambda: 5, mu: 2, sigma: 0.5, nSims: 5000, seed: 42 });
    const expected = 5 * Math.exp(2 + 0.5 * 0.25); // lambda * exp(mu + sigma^2/2)
    expect(out.mean).toBeGreaterThan(expected * 0.85);
    expect(out.mean).toBeLessThan(expected * 1.15);
    expect(out.var999).toBeGreaterThan(out.var995);
  });

  it("Reverse stress: plausibility scales with L*^2", () => {
    const Sigma = [[1, 0.3], [0.3, 1]];
    const b = [0.6, 0.4];
    const s1 = reverseStress(Sigma, b, 1);
    const s2 = reverseStress(Sigma, b, 2);
    expect(s2.plausibility / s1.plausibility).toBeCloseTo(4, 1);
    // Reproduces the loss constraint
    const sum = s2.contributions.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(2, 6);
  });

  it("Component VaR sums to portfolio VaR (Euler)", () => {
    const w = [0.3, 0.4, 0.3];
    const Sigma = [
      [0.04, 0.006, 0.008],
      [0.006, 0.09, 0.012],
      [0.008, 0.012, 0.06],
    ];
    const r = componentVaR(w, Sigma, 0.99);
    const sum = r.componentVaR.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(r.portVar, 8);
    expect(r.hhi).toBeCloseTo(0.34, 3);
  });
});
import { describe, it, expect } from "vitest";
import {
  hyperbolicDiscount, dsswNoiseTraderIRF, overconfidenceOutcome,
  kyleEquilibrium, glostenMilgromSpread, rollSpread,
  almgrenChriss, amihudIlliq,
} from "../behaviorMicro";

describe("hyperbolicDiscount", () => {
  it("β<1 → present-biased discount at t=1 vs exponential baseline", () => {
    const o = hyperbolicDiscount(0.7, 0.96, 10);
    expect(o.hyperbolic[0]).toBe(1);
    expect(o.hyperbolic[1]).toBeLessThan(o.exponential[1]);
    expect(o.preferenceReversal).toBe(true);
  });
  it("β=1 collapses to exponential", () => {
    const o = hyperbolicDiscount(1, 0.95, 5);
    o.years.forEach((_, i) => expect(o.hyperbolic[i]).toBeCloseTo(o.exponential[i], 10));
    expect(o.preferenceReversal).toBe(false);
  });
});

describe("DSSW IRF", () => {
  it("higher arb share dampens mispricing", () => {
    const a = dsswNoiseTraderIRF({ rho: 0.7, shock: 1, arbShare: 0.2, horizon: 10 });
    const b = dsswNoiseTraderIRF({ rho: 0.7, shock: 1, arbShare: 0.8, horizon: 10 });
    expect(Math.abs(a.mispricing[0])).toBeGreaterThan(Math.abs(b.mispricing[0]));
  });
});

describe("overconfidence", () => {
  it("k>1 raises turnover and lowers net alpha", () => {
    const base = overconfidenceOutcome({ k: 1, baseAlpha: 0.04, costPerTrade: 0.002, turnoverBase: 1 });
    const over = overconfidenceOutcome({ k: 3, baseAlpha: 0.04, costPerTrade: 0.002, turnoverBase: 1 });
    expect(over.turnover).toBeGreaterThan(base.turnover);
    expect(over.netAlpha).toBeLessThan(base.netAlpha);
  });
});

describe("Kyle equilibrium", () => {
  it("λ → 0 as σ_u → ∞ (perfect camouflage)", () => {
    const low = kyleEquilibrium({ sigmaV: 1, sigmaU: 1, v: 100, p0: 90 });
    const high = kyleEquilibrium({ sigmaV: 1, sigmaU: 100, v: 100, p0: 90 });
    expect(high.lambda).toBeLessThan(low.lambda);
    expect(high.depth).toBeGreaterThan(low.depth);
  });
  it("identity 2·λ·x* = v − p₀", () => {
    const k = kyleEquilibrium({ sigmaV: 2, sigmaU: 3, v: 105, p0: 100 });
    expect(2 * k.lambda * k.xStar).toBeCloseTo(5, 8);
  });
});

describe("Glosten-Milgrom", () => {
  it("α = 0 (all noise) → zero spread", () => {
    const g = glostenMilgromSpread({ alpha: 0, vH: 110, vL: 90, pi: 0.5 });
    expect(g.spread).toBeCloseTo(0, 10);
  });
  it("spread increases with informed share α", () => {
    const lo = glostenMilgromSpread({ alpha: 0.1, vH: 110, vL: 90, pi: 0.5 });
    const hi = glostenMilgromSpread({ alpha: 0.6, vH: 110, vL: 90, pi: 0.5 });
    expect(hi.spread).toBeGreaterThan(lo.spread);
  });
});

describe("Roll spread", () => {
  it("recovers effective spread from synthetic bid-ask bounce", () => {
    // v_t = 100 constant; q_t alternates ±1 with 50% flips → strong negative autocov
    const s = 0.4;
    const prices: number[] = [];
    let q = 1;
    for (let i = 0; i < 500; i++) {
      if (Math.random() < 0.5) q = -q;
      prices.push(100 + (s / 2) * q);
    }
    const est = rollSpread(prices);
    expect(est.spread).toBeGreaterThan(0.2);
    expect(est.spread).toBeLessThan(0.6);
  });
});

describe("Almgren-Chriss", () => {
  it("λ = 0 collapses to linear VWAP", () => {
    const r = almgrenChriss({ X: 1000, T: 1, N: 20, eta: 0.1, gamma: 0.01, sigma: 0.3, lambda: 0 });
    r.holdings.forEach((h, i) => expect(h).toBeCloseTo(r.linearVWAP[i], 6));
  });
  it("higher λ front-loads liquidation (holdings decline faster early)", () => {
    const lo = almgrenChriss({ X: 1000, T: 1, N: 20, eta: 0.1, gamma: 0.01, sigma: 0.3, lambda: 1 });
    const hi = almgrenChriss({ X: 1000, T: 1, N: 20, eta: 0.1, gamma: 0.01, sigma: 0.3, lambda: 50 });
    // at half-horizon, aggressive schedule holds fewer shares
    expect(hi.holdings[10]).toBeLessThan(lo.holdings[10]);
    expect(hi.kappa).toBeGreaterThan(lo.kappa);
  });
});

describe("Amihud ILLIQ", () => {
  it("increases when dollar volume shrinks", () => {
    const r = [0.01, -0.02, 0.015, -0.008];
    const highVol = amihudIlliq(r, [1e8, 1e8, 1e8, 1e8]);
    const lowVol = amihudIlliq(r, [1e6, 1e6, 1e6, 1e6]);
    expect(lowVol).toBeGreaterThan(highVol);
  });
});
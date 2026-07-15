import { describe, it, expect } from "vitest";
import { blackScholes } from "../blackScholes";
import {
  mertonJumpPrice, kouJumpPrice, batesMCPrice, varianceSwapFairStrike,
  crankNicolsonBS, hedgePnLSimulate, autocallablePrice, xvaCompute,
} from "../derivAdvanced";

describe("Merton jump-diffusion", () => {
  it("collapses to Black-Scholes when lambda -> 0", () => {
    const bs = blackScholes({ S: 100, K: 100, T: 1, r: 0.05, sigma: 0.2 }).call;
    const m = mertonJumpPrice({ S: 100, K: 100, T: 1, r: 0.05, sigma: 0.2, lambda: 0, muJ: 0, sigmaJ: 0.1 });
    expect(m).toBeCloseTo(bs, 6);
  });
  it("prices with jumps > BS for OTM short-tenor call", () => {
    const bs = blackScholes({ S: 100, K: 120, T: 0.25, r: 0.03, sigma: 0.2 }).call;
    const m = mertonJumpPrice({ S: 100, K: 120, T: 0.25, r: 0.03, sigma: 0.2, lambda: 1.5, muJ: 0, sigmaJ: 0.25 });
    expect(m).toBeGreaterThan(bs);
  });
});

describe("Kou jump MC", () => {
  it("collapses toward Black-Scholes when lambda -> 0", () => {
    const bs = blackScholes({ S: 100, K: 100, T: 0.5, r: 0.03, sigma: 0.2 }).call;
    const k = kouJumpPrice({ S: 100, K: 100, T: 0.5, r: 0.03, sigma: 0.2, lambda: 0, p: 0.5, etaUp: 10, etaDown: 10, nPaths: 8000 });
    expect(k).toBeCloseTo(bs, 0);
  });
});

describe("Crank-Nicolson PDE", () => {
  it("matches Black-Scholes for a European call within 1e-2", () => {
    const bs = blackScholes({ S: 100, K: 100, T: 1, r: 0.05, sigma: 0.2 }).call;
    const cn = crankNicolsonBS({ S: 100, K: 100, T: 1, r: 0.05, sigma: 0.2, NS: 300, NT: 300 }).price;
    expect(Math.abs(cn - bs)).toBeLessThan(1e-2);
  });
  it("American put >= European put (early-exercise premium)", () => {
    const euro = crankNicolsonBS({ S: 100, K: 110, T: 1, r: 0.05, sigma: 0.3, isCall: false, NS: 200, NT: 200 }).price;
    const amer = crankNicolsonBS({ S: 100, K: 110, T: 1, r: 0.05, sigma: 0.3, isCall: false, american: true, NS: 200, NT: 200 }).price;
    expect(amer).toBeGreaterThanOrEqual(euro - 1e-4);
  });
});

describe("Variance swap replication", () => {
  it("recovers sigma^2 for flat IV surface within a few percent", () => {
    const sigma = 0.25;
    const S0 = 100, T = 1, r = 0.03;
    const strikes: number[] = [];
    const ivs: number[] = [];
    for (let K = 40; K <= 200; K += 5) { strikes.push(K); ivs.push(sigma); }
    const K_var = varianceSwapFairStrike({ S0, T, r, strikes, ivs });
    expect(K_var).toBeGreaterThan(sigma * sigma * 0.85);
    expect(K_var).toBeLessThan(sigma * sigma * 1.15);
  });
});

describe("Bates MC", () => {
  it("prices ATM call in a plausible range", () => {
    const res = batesMCPrice({
      S: 100, K: 100, T: 1, r: 0.03,
      v0: 0.04, kappa: 2, theta: 0.04, xi: 0.3, rho: -0.5,
      lambda: 0.5, muJ: -0.05, sigmaJ: 0.15,
      nPaths: 3000, nSteps: 80,
    });
    expect(res.price).toBeGreaterThan(5);
    expect(res.price).toBeLessThan(25);
  });
});

describe("Hedge P&L", () => {
  it("mean P&L improves when pricing vol matches realized vol", () => {
    const matched = hedgePnLSimulate({ S: 100, K: 100, T: 0.5, r: 0.02, sigmaPricing: 0.2, sigmaReal: 0.2, nSteps: 40, nPaths: 800, cost: 0 });
    const mispriced = hedgePnLSimulate({ S: 100, K: 100, T: 0.5, r: 0.02, sigmaPricing: 0.2, sigmaReal: 0.35, nSteps: 40, nPaths: 800, cost: 0 });
    expect(Math.abs(matched.meanPnL)).toBeLessThan(Math.abs(mispriced.meanPnL) + 0.5);
    expect(mispriced.attribution.vega).not.toBe(0);
  });
});

describe("Autocallable", () => {
  it("higher autocall barrier lowers early-call probability sum", () => {
    const base = { S0: 100, T: 3, r: 0.03, sigma: 0.25, observations: 6, kiBarrier: 0.6, couponPerObs: 0.03, nPaths: 3000 };
    const low = autocallablePrice({ ...base, autocallBarrier: 0.95 });
    const high = autocallablePrice({ ...base, autocallBarrier: 1.20 });
    const sumLow = low.callProb.reduce((s, x) => s + x, 0);
    const sumHigh = high.callProb.reduce((s, x) => s + x, 0);
    expect(sumLow).toBeGreaterThan(sumHigh);
  });
});

describe("XVA", () => {
  it("CVA increases with counterparty hazard rate", () => {
    const base = {
      notional: 1_000_000, T: 3, steps: 24, r: 0.02, sigma: 0.005,
      fixedRate: 0.03, floatRate0: 0.03, ownHazard: 0.01, recovery: 0.4,
      fundingSpread: 0.005, nPaths: 800,
    };
    const low = xvaCompute({ ...base, cptyHazard: 0.005 });
    const high = xvaCompute({ ...base, cptyHazard: 0.05 });
    expect(high.cva).toBeGreaterThan(low.cva);
  });
});
import { describe, it, expect } from "vitest";
import {
  crrBinomial, ammImpermanentLoss, ammSwapOut,
  prospectValue, prospectWeight, fitGPD, potVaR,
} from "../extraModels";
import { blackScholes } from "../blackScholes";

describe("crrBinomial", () => {
  it("converges to Black-Scholes for European call as N grows", () => {
    const bs = blackScholes({ S: 100, K: 100, T: 1, r: 0.05, sigma: 0.2 }).call;
    const crr = crrBinomial({ S: 100, K: 100, r: 0.05, sigma: 0.2, T: 1, N: 500, isCall: true, american: false }).price;
    expect(crr).toBeCloseTo(bs, 1);
  });

  it("American call without dividends equals European (no early exercise)", () => {
    const euro = crrBinomial({ S: 100, K: 100, r: 0.05, sigma: 0.2, T: 1, N: 200, isCall: true, american: false }).price;
    const amer = crrBinomial({ S: 100, K: 100, r: 0.05, sigma: 0.2, T: 1, N: 200, isCall: true, american: true }).price;
    expect(amer).toBeCloseTo(euro, 6);
  });

  it("American put carries an early-exercise premium", () => {
    const euro = crrBinomial({ S: 100, K: 110, r: 0.05, sigma: 0.3, T: 1, N: 300, isCall: false, american: false }).price;
    const amer = crrBinomial({ S: 100, K: 110, r: 0.05, sigma: 0.3, T: 1, N: 300, isCall: false, american: true }).price;
    expect(amer).toBeGreaterThan(euro);
  });
});

describe("ammImpermanentLoss", () => {
  it("is zero at r=1 and negative otherwise", () => {
    expect(ammImpermanentLoss(1)).toBeCloseTo(0, 10);
    expect(ammImpermanentLoss(2)).toBeCloseTo(-0.0572, 3); // ~ -5.7%
    expect(ammImpermanentLoss(4)).toBeCloseTo(-0.2, 3); // -20%
    expect(ammImpermanentLoss(0.5)).toBeLessThan(0);
  });

  it("swap output preserves constant product", () => {
    const x = 1000, y = 1_000_000, dx = 100;
    const out = ammSwapOut(x, y, dx);
    expect((x + dx) * (y - out)).toBeCloseTo(x * y, 4);
  });
});

describe("prospect theory", () => {
  it("value function is identity under risk-neutral params", () => {
    expect(prospectValue(50, 1, 1, 1)).toBeCloseTo(50, 6);
    expect(prospectValue(-50, 1, 1, 1)).toBeCloseTo(-50, 6);
  });
  it("loss aversion makes losses loom larger", () => {
    expect(prospectValue(-100, 0.88, 0.88, 2.25)).toBeLessThan(-prospectValue(100, 0.88, 0.88, 2.25));
  });
  it("probability weight is identity at gamma=1 and overweights small p", () => {
    expect(prospectWeight(0.3, 1)).toBeCloseTo(0.3, 6);
    expect(prospectWeight(0.05, 0.61)).toBeGreaterThan(0.05);
  });
});

describe("GPD fit + POT VaR", () => {
  it("recovers GPD parameters from exponential tail (xi≈0)", () => {
    // exponential exceedances → xi ≈ 0, beta ≈ mean
    const exc = Array.from({ length: 2000 }, (_, i) => -Math.log((i + 0.5) / 2000));
    const { xi, beta } = fitGPD(exc);
    expect(xi).toBeLessThan(0.15);
    expect(beta).toBeGreaterThan(0.7);
  });
  it("POT VaR increases with confidence level", () => {
    const args = { u: 2, xi: 0.2, beta: 1, n: 1000, Nu: 100 };
    const v99 = potVaR({ ...args, alpha: 0.99 });
    const v999 = potVaR({ ...args, alpha: 0.999 });
    expect(v999).toBeGreaterThan(v99);
  });
});
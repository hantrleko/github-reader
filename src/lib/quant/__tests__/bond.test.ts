import { describe, it, expect } from "vitest";
import { bondPrice, ytmBisect, bondDuration } from "../bond";

describe("bondPrice", () => {
  it("par bond when coupon = ytm", () => {
    const p = bondPrice({ face: 1000, coupon: 0.05, years: 10, freq: 2, ytm: 0.05 });
    expect(p).toBeCloseTo(1000, 8);
  });

  it("discount bond when ytm > coupon", () => {
    const p = bondPrice({ face: 1000, coupon: 0.04, years: 5, freq: 2, ytm: 0.06 });
    expect(p).toBeLessThan(1000);
    expect(p).toBeCloseTo(914.6979, 3); // computed via PV closed form
  });
});

describe("ytmBisect", () => {
  it("recovers ytm from price", () => {
    const truth = 0.045;
    const price = bondPrice({ face: 1000, coupon: 0.06, years: 7, freq: 2, ytm: truth });
    const y = ytmBisect({ face: 1000, coupon: 0.06, years: 7, freq: 2, price });
    expect(y).toBeCloseTo(truth, 8);
  });
});

describe("bondDuration", () => {
  it("zero-coupon Macaulay duration = maturity", () => {
    const d = bondDuration({ face: 1000, coupon: 0, years: 5, freq: 1, ytm: 0.05 });
    expect(d.macaulay).toBeCloseTo(5, 8);
    expect(d.modified).toBeCloseTo(5 / 1.05, 8);
  });
});
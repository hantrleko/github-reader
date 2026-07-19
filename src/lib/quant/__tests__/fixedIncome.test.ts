import { describe, it, expect } from "vitest";
import {
  mertonCredit, cdsParSpread, bootstrapHazard,
  vasicekZCB, cirZCB, vasicekYield,
  priceCallableBond, solveOAS, mbsCashflows,
  breakevenInflation, butterflyPnl,
} from "../fixedIncome";

describe("Merton", () => {
  it("very solvent firm has near-zero PD and spread", () => {
    const m = mertonCredit({ V: 200, sigmaV: 0.2, D: 80, r: 0.03, T: 1 });
    expect(m.PD).toBeLessThan(1e-4);
    expect(m.spread).toBeLessThan(1e-4);
  });
  it("distressed firm has positive spread", () => {
    const m = mertonCredit({ V: 100, sigmaV: 0.4, D: 95, r: 0.03, T: 1 });
    expect(m.PD).toBeGreaterThan(0.1);
    expect(m.spread).toBeGreaterThan(0.005);
  });
});

describe("CDS", () => {
  it("par spread ≈ λ(1-R) for small λ", () => {
    const s = cdsParSpread(0.02, 0.4, 5, 0.03);
    expect(s).toBeCloseTo(0.02 * 0.6, 2);
  });
  it("bootstrap recovers hazard", () => {
    const s = cdsParSpread(0.03, 0.4, 5, 0.03);
    const lam = bootstrapHazard(s, 0.4, 5, 0.03);
    expect(lam).toBeCloseTo(0.03, 3);
  });
});

describe("Rate models", () => {
  it("Vasicek ZCB monotone in T for typical params", () => {
    const p = { kappa: 0.3, theta: 0.04, sigma: 0.01, r0: 0.03 };
    expect(vasicekZCB(1, p)).toBeGreaterThan(vasicekZCB(5, p));
    expect(vasicekYield(0.0001, p)).toBeCloseTo(0.03, 3);
  });
  it("CIR ZCB positive and < 1", () => {
    const P = cirZCB(3, { kappa: 0.4, theta: 0.05, sigma: 0.08, r0: 0.03 });
    expect(P).toBeGreaterThan(0);
    expect(P).toBeLessThan(1);
  });
});

describe("Callable / OAS", () => {
  it("callable bond ≤ straight bond (call cap)", () => {
    const b = { face: 100, coupon: 0.06, years: 5, freq: 2, rateVol: 0.01, r0: 0.03, callPrice: 100, callFromYear: 2 };
    const px = priceCallableBond(b);
    expect(px).toBeGreaterThan(90);
    expect(px).toBeLessThan(115);
  });
  it("solveOAS recovers zero spread when priced at model", () => {
    const b = { face: 100, coupon: 0.06, years: 5, freq: 2, rateVol: 0.01, r0: 0.03 };
    const px = priceCallableBond(b, 0);
    const oas = solveOAS(b, px);
    expect(Math.abs(oas)).toBeLessThan(5e-4);
  });
});

describe("MBS", () => {
  it("cashflows amortise to zero", () => {
    const r = mbsCashflows({ balance: 100_000, wac: 0.06, wam: 360, psa: 100, discountRate: 0.05 });
    expect(r.balance[r.balance.length - 1]).toBeLessThan(1);
    expect(r.wal).toBeGreaterThan(5);
    expect(r.wal).toBeLessThan(15);
    expect(r.price).toBeGreaterThan(0);
  });
});

describe("Inflation & curve", () => {
  it("breakeven = nominal - real", () => {
    expect(breakevenInflation(0.045, 0.02)).toBeCloseTo(0.025, 8);
  });
  it("butterfly weights are PV01-neutral", () => {
    const b = butterflyPnl({ y2: 0.04, y5: 0.045, y10: 0.05, d2: 1.9, d5: 4.5, d10: 8.0,
      shift2: 0, shift5: 0, shift10: 0 });
    expect(b.w2 * 1.9 + b.w10 * 8.0).toBeCloseTo(4.5, 6);
  });
});
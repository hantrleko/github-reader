import { describe, it, expect } from "vitest";
import {
  debtDynamics, fiscalSpaceScore,
  dornbuschIRF,
  bopGaps,
  bggAccelerator,
  zlbNKSolve, forwardGuidanceAmplification,
} from "../macroAdvanced";

describe("debt sustainability", () => {
  it("r>g explodes without primary surplus", () => {
    const p = debtDynamics({ b0: 1.0, r: 0.05, g: 0.02, primarySurplus: 0, horizon: 30 });
    expect(p.explosive).toBe(true);
    expect(p.finalDebt).toBeGreaterThan(p.debt[0]);
  });
  it("running the stabilizing surplus keeps debt flat", () => {
    const s = ((0.04 - 0.02) / 1.02) * 1.0;
    const p = debtDynamics({ b0: 1.0, r: 0.04, g: 0.02, primarySurplus: s, horizon: 50 });
    expect(Math.abs(p.finalDebt - 1.0)).toBeLessThan(1e-8);
    expect(p.stabilizingSurplus).toBeCloseTo(s, 8);
  });
  it("r<g regime is safe", () => {
    const f = fiscalSpaceScore(0.02, 0.03);
    expect(f.regime).toBe("safe");
  });
});

describe("Dornbusch overshooting", () => {
  it("nominal exchange overshoots long-run PPP", () => {
    const out = dornbuschIRF({ moneyShock: 0.05, theta: 0.3, phi: 1, lambda: 2, horizon: 20 });
    expect(out.exchange[0]).toBeGreaterThan(out.longRunE);
    expect(out.overshoot).toBeGreaterThan(0);
    // converges to long-run
    expect(Math.abs(out.exchange[out.exchange.length - 1] - out.longRunE)).toBeLessThan(0.01);
  });
  it("prices are sticky at t=0 and rise monotonically", () => {
    const out = dornbuschIRF({ moneyShock: 0.05, theta: 0.3, phi: 1, lambda: 2, horizon: 20 });
    expect(out.price[0]).toBeCloseTo(0, 8);
    for (let i = 1; i < out.price.length; i++) expect(out.price[i]).toBeGreaterThanOrEqual(out.price[i - 1] - 1e-10);
  });
});

describe("BOP identity", () => {
  it("CA equals sum of two gaps", () => {
    const r = bopGaps({ privateSaving: 0.22, investment: 0.20, taxes: 0.18, govSpending: 0.19 });
    expect(r.currentAccount).toBeCloseTo(0.02 + -0.01, 10);
  });
});

describe("BGG financial accelerator", () => {
  it("amplifies vs frictionless RBC baseline", () => {
    const shock = -0.02;
    const bgg = bggAccelerator({ leverage: 3, mu: 0.12, sigmaOmega: 0.5, rho: 0.9, shock, horizon: 20 });
    const rbc = bggAccelerator({ leverage: 3, mu: 0.12, sigmaOmega: 0.5, rho: 0.9, shock, horizon: 20, frictionless: true });
    const peakBgg = Math.max(...bgg.output.map(Math.abs));
    const peakRbc = Math.max(...rbc.output.map(Math.abs));
    expect(peakBgg).toBeGreaterThan(peakRbc);
  });
  it("EFP is zero in frictionless mode", () => {
    const rbc = bggAccelerator({ leverage: 3, mu: 0.12, sigmaOmega: 0.5, rho: 0.9, shock: -0.02, horizon: 10, frictionless: true });
    expect(rbc.efp.every((v) => Math.abs(v) < 1e-12)).toBe(true);
  });
});

describe("ZLB / forward guidance", () => {
  const base = {
    sigma: 1, kappa: 0.1, beta: 0.99,
    phiPi: 1.5, phiX: 0.5,
    rNatural: -0.01, zlbPeriods: 4, horizon: 20,
  };
  it("negative natural-rate shock at ZLB contracts output", () => {
    const out = zlbNKSolve(base);
    expect(out.outputImpact).toBeLessThan(0);
  });
  it("longer ZLB deepens current output — forward guidance puzzle", () => {
    const amp = forwardGuidanceAmplification(base, 4);
    expect(amp).toBeGreaterThan(1);
  });
  it("policy rate is pinned at 0 during ZLB", () => {
    const out = zlbNKSolve(base);
    for (let k = 0; k < base.zlbPeriods; k++) expect(out.policyRate[k]).toBe(0);
  });
});

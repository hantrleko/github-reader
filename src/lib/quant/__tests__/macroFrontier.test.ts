import { describe, it, expect } from "vitest";
import {
  endogenousGrowth, growthAccounting, developmentAccounting,
  multiplierAccelerator, fiscalMultipliers,
  rbcSimulate, calvoNKPC, barroGordon, policyRuleSim,
  parityLab, suddenStop,
  expectationsLab, unconventionalPolicy, bankCapitalAmplification, climateMacroPath,
} from "../macroFrontier";

const G = {
  A: 0.5, s: 0.25, delta: 0.05, n: 0.01,
  psi: 0.06, u: 0.3, theta: 0.05, sR: 0.4,
  lambdaInn: 0.3, gamma: 1.15, alpha: 0.35, horizon: 40,
};

describe("endogenous growth", () => {
  it("AK growth rises one-for-one with the saving rate", () => {
    const a = endogenousGrowth(G);
    const b = endogenousGrowth({ ...G, s: G.s + 0.1 });
    expect(b.rates.ak - a.rates.ak).toBeCloseTo(0.1 * G.A, 10);
  });
  it("Solow has no long-run per-capita growth while AK does", () => {
    const a = endogenousGrowth(G);
    expect(a.rates.solow).toBe(0);
    expect(a.rates.ak).toBeGreaterThan(0);
    const tail = a.solow.slice(-3);
    expect(Math.abs(tail[2] - tail[1])).toBeLessThan(Math.abs(a.solow[1] - a.solow[0]));
  });
  it("Schumpeter growth is λ·ln(γ)", () => {
    const a = endogenousGrowth(G);
    expect(a.rates.schumpeter).toBeCloseTo(0.3 * Math.log(1.15), 12);
  });
});

describe("growth accounting", () => {
  it("contributions plus residual reproduce output growth", () => {
    const r = growthAccounting({ gY: 0.07, gK: 0.09, gL: 0.01, gH: 0.005, alpha: 0.4 });
    expect(r.capitalContrib + r.labourContrib + r.humanContrib + r.tfp).toBeCloseTo(0.07, 12);
  });
  it("development accounting factors multiply to the income ratio", () => {
    const d = developmentAccounting({ kyRich: 3, kyPoor: 2, hRich: 3, hPoor: 1.5, incomeRatio: 20, alpha: 1 / 3 });
    expect(d.capitalFactor * d.tfpFactor).toBeCloseTo(20, 10);
    expect(d.tfpSharePct).toBeGreaterThan(0);
  });
});

describe("multiplier-accelerator & fiscal multipliers", () => {
  it("classifies damped oscillation and converges", () => {
    const p = multiplierAccelerator({ mpc: 0.6, accel: 0.8, gShock: 1, horizon: 60 });
    expect(p.regime).toBe("damped-oscillation");
    expect(Math.abs(p.output[60] - p.longRunMultiplier)).toBeLessThan(0.05);
  });
  it("high accelerator explodes", () => {
    const p = multiplierAccelerator({ mpc: 0.9, accel: 2.5, gShock: 1, horizon: 40 });
    expect(p.regime.startsWith("explosive")).toBe(true);
  });
  it("ZLB and slack raise the spending multiplier, Ricardian offset lowers it", () => {
    const base = { mpc: 0.7, taxRate: 0.25, importShare: 0.2, ricardian: 0, slack: 0.1, atZLB: false, monetaryOffset: 0.4 };
    const normal = fiscalMultipliers(base);
    const zlb = fiscalMultipliers({ ...base, atZLB: true, slack: 0.9 });
    const ric = fiscalMultipliers({ ...base, ricardian: 1 });
    expect(zlb.spending).toBeGreaterThan(normal.spending);
    expect(ric.spending).toBeLessThan(normal.spending);
    expect(zlb.regime).toBe("recession");
  });
});

describe("RBC moments", () => {
  const p = { alpha: 0.36, beta: 0.99, delta: 0.025, rhoA: 0.95, sigmaA: 0.007, laborElast: 2, periods: 400, seed: 7 };
  it("is reproducible for a fixed seed", () => {
    expect(rbcSimulate(p).output).toEqual(rbcSimulate(p).output);
  });
  it("investment is more volatile than output and procyclical", () => {
    const m = rbcSimulate(p);
    expect(m.relSd.i).toBeGreaterThan(1);
    expect(m.corrWithY.a).toBeGreaterThan(0.5);
  });
});

describe("Calvo / NKPC", () => {
  it("stickier prices flatten the curve and lengthen price duration", () => {
    const base = { theta: 0.5, beta: 0.99, sigma: 1, phiLabor: 1, omega: 0, epsilon: 6 };
    const sticky = calvoNKPC({ ...base, theta: 0.85 });
    const flex = calvoNKPC(base);
    expect(sticky.kappa).toBeLessThan(flex.kappa);
    expect(sticky.avgPriceDuration).toBeGreaterThan(flex.avgPriceDuration);
    expect(sticky.sacrificeRatio).toBeGreaterThan(flex.sacrificeRatio);
  });
  it("indexation shifts weight to the backward-looking term", () => {
    const hybrid = calvoNKPC({ theta: 0.7, beta: 0.99, sigma: 1, phiLabor: 1, omega: 0.6, epsilon: 6 });
    expect(hybrid.hybridBackward).toBeGreaterThan(0);
    expect(hybrid.hybridForward + hybrid.hybridBackward).toBeGreaterThan(0.9);
  });
});

describe("rules vs discretion", () => {
  it("discretion carries a positive inflation bias that credibility removes", () => {
    const d = barroGordon({ ambition: 0.02, lambda: 1, slopeAlpha: 0.5, shock: 0, credibility: 0 });
    const c = barroGordon({ ambition: 0.02, lambda: 1, slopeAlpha: 0.5, shock: 0, credibility: 1 });
    expect(d.inflationBias).toBeGreaterThan(0);
    expect(d.actualInflation).toBeGreaterThan(c.actualInflation);
    expect(c.actualInflation).toBeCloseTo(0, 12);
  });
  it("price-level targeting delivers lower cumulative drift than inflation targeting", () => {
    const base = { phiPi: 1.5, phiX: 0.5, kappa: 0.1, beta: 0.99, sigma: 1, rhoShock: 0.8, shock: 0.01, horizon: 30 } as const;
    const it = policyRuleSim({ ...base, rule: "inflation-target" });
    const plt = policyRuleSim({ ...base, rule: "price-level" });
    expect(Math.abs(plt.cumInflation)).toBeLessThan(Math.abs(it.cumInflation));
    expect(it.determinate).toBe(true);
  });
});

describe("open economy", () => {
  it("detects the forward premium puzzle when the true beta is negative", () => {
    const r = parityLab({ iDom: 0.05, iFor: 0.01, spot: 7, forward: 7.1, inflDom: 0.03, inflFor: 0.02, periods: 400, seed: 3, uipBeta: -0.8, noiseSd: 0.02 });
    expect(r.puzzle).toBe(true);
    expect(r.famaBeta).toBeLessThan(0);
  });
  it("recovers beta≈1 under UIP and prices the CIP basis", () => {
    const r = parityLab({ iDom: 0.05, iFor: 0.01, spot: 7, forward: 7.28, inflDom: 0.03, inflFor: 0.02, periods: 800, seed: 11, uipBeta: 1, noiseSd: 0.005 });
    expect(r.famaBeta).toBeGreaterThan(0.5);
    expect(Math.abs(r.cipBasis)).toBeLessThan(50);
  });
  it("flags a crisis when reserve cover is thin and reversal is large", () => {
    const s = suddenStop({ caDeficit: 0.06, externalDebt: 0.6, reserves: 0.08, shortTermShare: 0.4, flowReversal: 0.8, fxPassthrough: 0.5, horizon: 20 });
    expect(s.crisis).toBe(true);
    expect(s.reserveCover).toBeLessThan(1);
    expect(s.currentAccount[s.currentAccount.length - 1]).toBeGreaterThan(s.currentAccount[0]);
  });
});

describe("frontier macro", () => {
  it("rational expectations have no systematic forecast error", () => {
    const r = expectationsLab({ kind: "rational", gain: 0.2, stickiness: 0.5, diagnostic: 0.5, rhoShock: 0.8, shock: 0.02, kappa: 0.1, horizon: 30 });
    expect(Math.max(...r.forecastError.map(Math.abs))).toBeLessThan(1e-12);
  });
  it("sticky information produces predictable errors (CG coefficient ≠ 0)", () => {
    const r = expectationsLab({ kind: "sticky", gain: 0.2, stickiness: 0.6, diagnostic: 0, rhoShock: 0.8, shock: 0.02, kappa: 0.1, horizon: 40 });
    expect(Math.abs(r.cgCoefficient)).toBeGreaterThan(0);
    expect(Math.max(...r.forecastError.map(Math.abs))).toBeGreaterThan(0);
  });
  it("diagnostic expectations overshoot the rational benchmark", () => {
    const d = expectationsLab({ kind: "diagnostic", gain: 0.2, stickiness: 0, diagnostic: 0.5, rhoShock: 0.8, shock: 0.02, kappa: 0.1, horizon: 10 });
    const re = expectationsLab({ kind: "rational", gain: 0.2, stickiness: 0, diagnostic: 0, rhoShock: 0.8, shock: 0.02, kappa: 0.1, horizon: 10 });
    expect(d.expected[1]).toBeGreaterThan(re.expected[1]);
  });
  it("QE lowers yields through both channels and YCC caps the yield", () => {
    const q = unconventionalPolicy({ qeSize: 0.15, durationRemoved: 2, preferredHabitat: 0.5, yccTarget: null, signalling: 0.5, marketDepth: 1, horizon: 20 });
    expect(q.totalYieldDrop).toBeGreaterThan(0);
    expect(q.channelSplit.portfolio).toBeGreaterThan(0);
    const y = unconventionalPolicy({ qeSize: 0.15, durationRemoved: 0.2, preferredHabitat: 0.5, yccTarget: 0.001, signalling: 0.1, marketDepth: 1, horizon: 20 });
    expect(Math.max(...y.yield10y)).toBeLessThanOrEqual(0.1 + 1e-9);
  });
  it("bank capital losses amplify into credit and output", () => {
    const b = bankCapitalAmplification({ capitalRatio: 0.08, riskWeight: 1, lossShock: 0.02, targetLeverage: 12, creditElasticity: 0.3, fireSaleImpact: 0.2, horizon: 20 });
    expect(Math.min(...b.creditSupply)).toBeLessThan(0);
    expect(b.amplification).toBeGreaterThan(1);
  });
  it("climate transition trades near-term cost for lower warming", () => {
    const strong = climateMacroPath({ carbonPrice: 200, energyShare: 0.06, transitionYears: 30, greenInvestment: 2, abatementElasticity: 1.2, damageIntensity: 1.5, warmingBaseline: 3 });
    const weak = climateMacroPath({ carbonPrice: 20, energyShare: 0.06, transitionYears: 30, greenInvestment: 0.5, abatementElasticity: 1.2, damageIntensity: 1.5, warmingBaseline: 3 });
    expect(strong.warming).toBeLessThan(weak.warming);
    expect(strong.npvTransitionCost).toBeGreaterThan(weak.npvTransitionCost);
    expect(strong.emissions[strong.emissions.length - 1]).toBeLessThan(weak.emissions[weak.emissions.length - 1]);
  });
});

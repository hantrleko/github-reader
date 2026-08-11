import { describe, it, expect } from "vitest";
import {
  cptGamble, cptWeight, fourfoldPattern, myopicLossAversion, bsvBeliefs,
  dhsOverconfidence, hongSteinDiffusion, limitsToArbitrage,
  sentimentCrossSection, behavioralCorporate,
} from "../behaviorFinance";

const TK = { alpha: 0.88, beta: 0.88, lambda: 2.25, gamma: 0.61 };

describe("CPT", () => {
  it("λ=1, α=β=γ=1 collapses to expected value", () => {
    const g = cptGamble(100, 100, 0.5, { alpha: 1, beta: 1, lambda: 1, gamma: 1 });
    expect(g.prospectValue).toBeCloseTo(0, 8);
    expect(g.certaintyEquivalent).toBeCloseTo(0, 8);
  });
  it("loss aversion makes a fair 50/50 gamble unattractive", () => {
    const g = cptGamble(100, 100, 0.5, TK);
    expect(g.prospectValue).toBeLessThan(0);
    expect(g.riskPremium).toBeGreaterThan(0);
  });
  it("w(p) overweights small probabilities", () => {
    expect(cptWeight(0.02, 0.61)).toBeGreaterThan(0.02);
    expect(cptWeight(0.9, 0.61)).toBeLessThan(0.9);
  });
  it("fourfold pattern: low-probability gain is risk-seeking", () => {
    const cells = fourfoldPattern(1000, TK);
    const lowGain = cells.find((c) => c.domain === "gain" && c.probability < 0.5)!;
    expect(lowGain.attitude).toBe("risk-seeking");
  });
});

describe("myopic loss aversion", () => {
  it("λ=1 requires no premium", () => {
    const o = myopicLossAversion({ lambda: 1, sigmaAnnual: 0.2, evaluationsPerYear: 1, riskFree: 0.02 });
    expect(o.impliedEquityPremium).toBeCloseTo(0, 6);
  });
  it("more frequent evaluation raises the required premium", () => {
    const yearly = myopicLossAversion({ lambda: 2.25, sigmaAnnual: 0.2, evaluationsPerYear: 1, riskFree: 0.02 });
    const monthly = myopicLossAversion({ lambda: 2.25, sigmaAnnual: 0.2, evaluationsPerYear: 12, riskFree: 0.02 });
    expect(monthly.impliedEquityPremium).toBeGreaterThan(yearly.impliedEquityPremium);
  });
});

describe("BSV", () => {
  it("produces short-run underreaction and a later reversal", () => {
    const o = bsvBeliefs({ piL: 0.8, piH: 0.7, lambda1: 0.6, shock: 1, horizon: 40 });
    expect(o.underreaction).toBeGreaterThan(0);
    expect(o.overreaction).toBeGreaterThan(0);
    expect(o.reversal).toBe(true);
  });
});

describe("DHS", () => {
  it("overconfidence creates overshoot then reversal", () => {
    const o = dhsOverconfidence({ overconfidence: 2, selfAttribution: 0.6, signal: 1, horizon: 30, correctionRate: 0.15 });
    expect(o.peakOvershoot).toBeGreaterThan(0);
    expect(o.longRunReversal).toBeGreaterThan(0);
  });
  it("k=1, ψ=0 → no overshoot", () => {
    const o = dhsOverconfidence({ overconfidence: 1, selfAttribution: 0, signal: 1, horizon: 20, correctionRate: 0.2 });
    expect(o.peakOvershoot).toBeCloseTo(0, 8);
  });
});

describe("Hong-Stein", () => {
  it("momentum traders cause overshoot", () => {
    const o = hongSteinDiffusion({ diffusionPeriods: 6, momentumShare: 0.6, momentumLookback: 3, shock: 1, horizon: 40 });
    expect(o.overshoot).toBe(true);
    expect(o.momentumStrength).toBeGreaterThan(0);
  });
  it("no momentum traders → no overshoot", () => {
    const o = hongSteinDiffusion({ diffusionPeriods: 6, momentumShare: 0, momentumLookback: 3, shock: 1, horizon: 40 });
    expect(o.momentumStrength).toBeLessThanOrEqual(1e-9);
  });
});

describe("limits to arbitrage", () => {
  it("tighter margin reduces the maximum position", () => {
    const loose = limitsToArbitrage({ mispricing: 1, noiseVol: 0.1, convergenceRate: 0.2, capital: 100, marginRequirement: 0.2, redemptionSensitivity: 0.5, horizon: 30 });
    const tight = limitsToArbitrage({ mispricing: 1, noiseVol: 0.1, convergenceRate: 0.2, capital: 100, marginRequirement: 0.9, redemptionSensitivity: 0.5, horizon: 30 });
    expect(tight.maxPosition).toBeLessThan(loose.maxPosition);
  });
  it("unconstrained benchmark converges monotonically", () => {
    const o = limitsToArbitrage({ mispricing: 1, noiseVol: 0, convergenceRate: 0.3, capital: 100, marginRequirement: 0.5, redemptionSensitivity: 0, horizon: 20 });
    for (let i = 1; i < o.unconstrained.length; i++) {
      expect(o.unconstrained[i]).toBeLessThanOrEqual(o.unconstrained[i - 1] + 1e-12);
    }
  });
});

describe("sentiment cross-section", () => {
  it("sentiment = 0 → no spread", () => {
    const o = sentimentCrossSection({ sentiment: 0, sensitivity: 0.05, arbitrageCost: 0.3, baseReturn: 0.08, horizon: 12 });
    expect(o.spread).toBeCloseTo(0, 10);
  });
  it("high sentiment predicts lower returns on hard-to-value stocks", () => {
    const o = sentimentCrossSection({ sentiment: 1.5, sensitivity: 0.05, arbitrageCost: 0.3, baseReturn: 0.08, horizon: 12 });
    expect(o.hardToValueReturn).toBeLessThan(o.easyToValueReturn);
    expect(o.regime).toBe("high");
  });
});

describe("behavioral corporate finance", () => {
  const cf = [-1, -0.5, 0, 0.5, 1, 1.5];
  it("overconfidence raises investment-cash-flow sensitivity", () => {
    const base = behavioralCorporate({ overconfidence: 0, cashFlow: cf, externalFinanceCost: 0.2, sentiment: cf.map(() => 0), timingIntensity: 0 });
    const over = behavioralCorporate({ overconfidence: 1.5, cashFlow: cf, externalFinanceCost: 0.2, sentiment: cf.map(() => 0), timingIntensity: 0 });
    expect(over.investmentCashFlowSensitivity).toBeGreaterThan(base.investmentCashFlowSensitivity);
    expect(base.investmentCashFlowSensitivity).toBeCloseTo(base.rationalSensitivity, 8);
  });
  it("market timing: positive sentiment triggers issuance and lowers leverage", () => {
    const o = behavioralCorporate({ overconfidence: 0, cashFlow: cf, externalFinanceCost: 0.2, sentiment: cf.map(() => 1), timingIntensity: 0.5 });
    expect(o.equityIssuance.every((v) => v > 0)).toBe(true);
    expect(o.leverage[o.leverage.length - 1]).toBeLessThan(0.4);
  });
});
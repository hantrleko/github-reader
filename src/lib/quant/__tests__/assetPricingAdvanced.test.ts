import { describe, it, expect } from "vitest";
import {
  statePrices,
  matrixRank,
  sdfFromFactorPremia,
  evaluateFactorModel,
  longRunRisk,
  habitModel,
  disasterModel,
  campbellShiller,
  factorZoo,
  jacobiEigen,
  currencyCarry,
} from "../assetPricingAdvanced";

describe("statePrices", () => {
  it("recovers unique state prices in a complete two-state market", () => {
    // bond pays 1 in both states (price 0.95), stock pays 2 / 0.5 (price 1.0)
    const r = statePrices({
      payoff: [[1, 1], [2, 0.5]],
      price: [0.95, 1.0],
      prob: [0.5, 0.5],
    });
    expect(r.complete).toBe(true);
    expect(r.arbitrageFree).toBe(true);
    const [q1, q2] = r.q!;
    expect(q1 + q2).toBeCloseTo(0.95, 8);
    expect(2 * q1 + 0.5 * q2).toBeCloseTo(1.0, 8);
    expect(r.rfGross).toBeCloseTo(1 / 0.95, 8);
    // SDF m = q/π
    expect(r.m![0]).toBeCloseTo(q1 / 0.5, 8);
    // risk-neutral probabilities sum to one
    expect(r.qRiskNeutral!.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it("flags arbitrage when no non-negative state price vector exists", () => {
    // asset dominates the bond but is cheaper -> arbitrage
    const r = statePrices({
      payoff: [[1, 1], [2, 2]],
      price: [1.0, 1.0],
      prob: [0.5, 0.5],
    });
    expect(r.arbitrageFree).toBe(false);
    expect(r.q).toBeNull();
  });

  it("returns a price band for a non-replicable payoff in an incomplete market", () => {
    const r = statePrices({
      payoff: [[1, 1, 1], [3, 2, 0]],
      price: [0.95, 1.5],
      prob: [1 / 3, 1 / 3, 1 / 3],
      target: [1, 0, 0],
    });
    expect(r.complete).toBe(false);
    expect(r.arbitrageFree).toBe(true);
    expect(r.targetBounds!.upper).toBeGreaterThan(r.targetBounds!.lower);
  });
});

describe("matrixRank", () => {
  it("detects rank deficiency", () => {
    expect(matrixRank([[1, 1], [2, 2]])).toBe(1);
    expect(matrixRank([[1, 0], [0, 1]])).toBe(2);
  });
});

describe("sdfFromFactorPremia", () => {
  it("round-trips λ → b → λ", () => {
    const Sigma = [[0.04, 0.005], [0.005, 0.02]];
    const lambda = [0.06, 0.03];
    const r = sdfFromFactorPremia(lambda, Sigma, 0.03);
    expect(r.lambda[0]).toBeCloseTo(lambda[0], 10);
    expect(r.lambda[1]).toBeCloseTo(lambda[1], 10);
    expect(r.maxSharpe).toBeGreaterThan(0);
  });
});

describe("evaluateFactorModel", () => {
  it("gives ~0 alphas and a small HJ distance when the model is true", () => {
    let seed = 11;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff - 0.5;
    };
    const factors: number[][] = [];
    const excess: number[][] = [];
    const betas = [0.8, 1.0, 1.2];
    for (let t = 0; t < 200; t++) {
      const f = 0.5 + rand() * 4;
      factors.push([f]);
      excess.push(betas.map((b) => b * f + rand() * 0.4));
    }
    const r = evaluateFactorModel("CAPM", excess, factors);
    expect(r.meanAbsAlpha).toBeLessThan(0.2);
    expect(r.hjDistance).toBeGreaterThanOrEqual(0);
  });

  it("shows a larger HJ distance once alpha is injected", () => {
    let seed = 5;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff - 0.5;
    };
    const factors: number[][] = [];
    const clean: number[][] = [];
    const dirty: number[][] = [];
    for (let t = 0; t < 200; t++) {
      const f = 0.5 + rand() * 3;
      factors.push([f]);
      const base = [1.0, 1.1, 0.9].map((b) => b * f + rand() * 0.3);
      clean.push(base);
      dirty.push(base.map((v) => v + 2));
    }
    const a = evaluateFactorModel("clean", clean, factors);
    const b = evaluateFactorModel("dirty", dirty, factors);
    expect(b.hjDistance).toBeGreaterThan(a.hjDistance);
    expect(b.meanAbsAlpha).toBeGreaterThan(1.5);
  });
});

describe("longRunRisk (Epstein-Zin / Bansal-Yaron)", () => {
  const base = {
    delta: 0.998, gamma: 10, psi: 1.5, muC: 1.8, sigma: 2.7,
    rho: 0.979, phiE: 0.044, leverage: 3, kappa1: 0.997,
  };
  it("nests CRRA when ψ = 1/γ (θ = 1, no long-run risk price)", () => {
    const r = longRunRisk({ ...base, psi: 1 / base.gamma });
    expect(r.theta).toBeCloseTo(1, 8);
    expect(r.lambdaE).toBeCloseTo(0, 8);
  });
  it("raises the equity premium when preference for early resolution is stronger", () => {
    const low = longRunRisk({ ...base, gamma: 5 });
    const high = longRunRisk({ ...base, gamma: 15 });
    expect(high.equityPremium).toBeGreaterThan(low.equityPremium);
    expect(high.volM).toBeGreaterThan(low.volM);
  });
  it("delivers a low risk-free rate with high EIS", () => {
    const r = longRunRisk(base);
    expect(r.rf).toBeLessThan(5);
  });
});

describe("habitModel (Campbell-Cochrane)", () => {
  const inp = { delta: 0.97, gamma: 2, g: 1.9, sigma: 1.5, phi: 0.87 };
  it("has maximum risk aversion and Sharpe at low surplus consumption", () => {
    const r = habitModel(inp);
    const first = r.curve[0];
    const last = r.curve[r.curve.length - 1];
    expect(first.riskAversion).toBeGreaterThan(last.riskAversion);
    expect(first.sharpe).toBeGreaterThan(last.sharpe);
  });
  it("reduces to the steady-state Sharpe at s = s̄", () => {
    const r = habitModel(inp);
    expect(r.steady.surplus).toBeCloseTo(r.sBar, 10);
    expect(r.steady.sharpe).toBeGreaterThan(0);
  });
});

describe("disasterModel (Rietz-Barro)", () => {
  const base = { delta: 0.97, gamma: 4, g: 2.5, sigma: 2, p: 0.017, b: 0.4, leverage: 1 };
  it("collapses to the diffusive premium when disaster probability is zero", () => {
    const r = disasterModel({ ...base, p: 0 });
    expect(r.disasterTerm).toBeCloseTo(0, 10);
    expect(r.equityPremium).toBeCloseTo(r.diffusiveTerm, 10);
  });
  it("generates a large premium and a low risk-free rate with disasters on", () => {
    const off = disasterModel({ ...base, p: 0 });
    const on = disasterModel(base);
    expect(on.equityPremium).toBeGreaterThan(off.equityPremium);
    expect(on.rf).toBeLessThan(off.rf);
    expect(on.volM).toBeGreaterThan(off.volM);
  });
});

describe("campbellShiller", () => {
  it("finds a positive return-predictability coefficient on dp", () => {
    let seed = 3;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff - 0.5;
    };
    const T = 300;
    const dp: number[] = [-3.4];
    const ret: number[] = [0];
    const dg: number[] = [0];
    for (let t = 1; t < T; t++) {
      const prev = dp[t - 1];
      ret.push(0.02 + 0.12 * (prev + 3.4) + rand() * 0.05);
      dg.push(0.015 + rand() * 0.02);
      dp.push(-3.4 + 0.94 * (prev + 3.4) + rand() * 0.08);
    }
    const r = campbellShiller({ dp, ret, dg });
    expect(r.bReturn).toBeGreaterThan(0);
    expect(r.rho).toBeGreaterThan(0.9);
    expect(r.phi).toBeGreaterThan(0.5);
    expect(r.horizons.length).toBeGreaterThan(1);
    expect(r.drNewsShare + r.cfNewsShare).toBeCloseTo(1, 8);
  });
});

describe("jacobiEigen", () => {
  it("diagonalises a known symmetric matrix", () => {
    const { values } = jacobiEigen([[2, 1], [1, 2]]);
    expect(values[0]).toBeCloseTo(3, 8);
    expect(values[1]).toBeCloseTo(1, 8);
  });
});

describe("factorZoo", () => {
  it("collapses highly-correlated factors into few principal components and shrinks noise", () => {
    let seed = 99;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff - 0.5;
    };
    const T = 240;
    const factors: number[][] = [];
    const y: number[] = [];
    for (let t = 0; t < T; t++) {
      const core = rand() * 4;
      const clone = core + rand() * 0.2;   // near-duplicate factor
      const noise = rand() * 4;
      factors.push([core, clone, noise]);
      y.push(1.2 * core + rand() * 0.4);
    }
    const r = factorZoo({
      factors, names: ["MKT", "MKT-clone", "noise"], y,
      ridgeLambda: 0.05, lassoLambda: 0.3,
    });
    expect(r.pcaExplained[0].share).toBeGreaterThan(0.5);
    expect(r.effectiveFactors).toBeLessThanOrEqual(3);
    expect(r.lasso.find((l) => l.name === "noise")!.selected).toBe(false);
    expect(r.bonferroniT).toBeGreaterThan(1.96);
  });
});

describe("currencyCarry", () => {
  it("rejects UIP and produces a positive high-minus-low carry when rates do not predict depreciation", () => {
    const r = currencyCarry(2, [
      { name: "JPY", iForeign: 0.1, depreciation: 0.2, fxVol: 9 },
      { name: "EUR", iForeign: 2.5, depreciation: 0.3, fxVol: 8 },
      { name: "AUD", iForeign: 4.5, depreciation: 0.5, fxVol: 11 },
      { name: "BRL", iForeign: 11, depreciation: 1.2, fxVol: 16 },
    ]);
    expect(r.uipSlope).toBeLessThan(0.5);
    expect(r.highMinusLow).toBeGreaterThan(0);
    expect(r.legs[0].forwardDiscount).toBeCloseTo(-1.9, 10);
  });
});
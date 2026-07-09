import { describe, it, expect } from "vitest";
import {
  linearSDF,
  ccapm,
  hjBound,
  anomalySort,
  grsTest,
  rollingBeta,
  fSurvival,
  covariance,
} from "../assetPricing";

describe("linearSDF", () => {
  it("prices the risk-free rate consistently: E[M] = 1/(1+rf)", () => {
    const r = linearSDF({ rf: 3, erm: 9, volm: 18, assets: [] });
    expect(r.eM).toBeCloseTo(1 / 1.03, 8);
    expect(r.rfImplied).toBeCloseTo(3, 6);
  });
  it("recovers the market premium for a β=1 asset (ρ·vol/volm = 1)", () => {
    const r = linearSDF({
      rf: 3,
      erm: 9,
      volm: 18,
      assets: [{ name: "MKT", er: 9, vol: 18, rho: 1 }],
    });
    // model premium for the market itself should be close to erm - rf = 6
    expect(r.assets[0].premiumModel).toBeGreaterThan(4);
    expect(r.assets[0].premiumModel).toBeLessThan(8);
  });
});

describe("ccapm equity premium puzzle", () => {
  it("needs a huge gamma to match a 6% premium under low consumption vol", () => {
    const r = ccapm({
      delta: 0.98,
      gamma: 2,
      muC: 2,
      sigmaC: 3.6,
      sigmaM: 20,
      rho: 0.2,
      targetERP: 6,
    });
    // With gamma=2 the model premium is tiny
    expect(r.equityPremium).toBeLessThan(0.5);
    // Gamma required to hit 6% is implausibly large (>40)
    expect(r.gammaToMatch).toBeGreaterThan(40);
  });
  it("premium scales linearly with gamma", () => {
    const base = ccapm({ delta: 0.98, gamma: 10, muC: 2, sigmaC: 3.6, sigmaM: 20, rho: 0.2, targetERP: 6 });
    const dbl = ccapm({ delta: 0.98, gamma: 20, muC: 2, sigmaC: 3.6, sigmaM: 20, rho: 0.2, targetERP: 6 });
    expect(dbl.equityPremium).toBeCloseTo(2 * base.equityPremium, 8);
  });
});

describe("hjBound", () => {
  it("σ(M)/E(M) ≥ Sharpe ⇒ minVolM = Sharpe·E(M)", () => {
    expect(hjBound(0.5, 3)).toBeCloseTo(0.5 / 1.03, 8);
    expect(hjBound(0, 3)).toBe(0);
  });
});

describe("anomalySort", () => {
  it("detects a monotone characteristic → return relation", () => {
    // 6 assets, higher characteristic → higher constant return
    const N = 6;
    const T = 50;
    const char = [1, 2, 3, 4, 5, 6];
    const returns = Array.from({ length: T }, () =>
      char.map((c) => c * 0.5),
    );
    const r = anomalySort(returns, char, 3);
    expect(r.monotonic).toBe(true);
    expect(r.longShort).toBeGreaterThan(0);
    expect(r.portfolios).toHaveLength(3);
  });
});

describe("grsTest", () => {
  it("returns a small GRS / large p-value when alphas are ~0", () => {
    // factor with mean ~0.5, assets = beta*factor + tiny noise, no alpha
    const T = 120;
    const N = 4;
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff - 0.5;
    };
    const factors: number[][] = [];
    const excess: number[][] = [];
    const betas = [0.8, 1.0, 1.2, 1.4];
    for (let t = 0; t < T; t++) {
      const f = 0.5 + rand() * 4;
      factors.push([f]);
      excess.push(betas.map((b) => b * f + rand() * 0.5));
    }
    const r = grsTest(excess, factors);
    expect(r.df1).toBe(N);
    expect(r.df2).toBe(T - N - 1);
    expect(r.pValue).toBeGreaterThan(0.05);
    expect(r.meanAbsAlpha).toBeLessThan(0.3);
  });
  it("rejects when a large alpha is injected", () => {
    const T = 120;
    const N = 3;
    let seed = 7;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff - 0.5;
    };
    const factors: number[][] = [];
    const excess: number[][] = [];
    for (let t = 0; t < T; t++) {
      const f = 0.5 + rand() * 3;
      factors.push([f]);
      // inject +2 alpha on every asset
      excess.push([1.0, 1.1, 0.9].map((b) => 2 + b * f + rand() * 0.3));
    }
    const r = grsTest(excess, factors);
    expect(r.pValue).toBeLessThan(0.05);
  });
});

describe("fSurvival", () => {
  it("is monotone decreasing and bounded in [0,1]", () => {
    const a = fSurvival(1, 4, 100);
    const b = fSurvival(3, 4, 100);
    expect(a).toBeGreaterThan(b);
    expect(a).toBeLessThanOrEqual(1);
    expect(b).toBeGreaterThanOrEqual(0);
  });
});

describe("rollingBeta", () => {
  it("recovers a constant beta of 2 on noiseless data", () => {
    const T = 60;
    const mkt = Array.from({ length: T }, (_, i) => Math.sin(i));
    const asset = mkt.map((m) => 2 * m);
    const rb = rollingBeta(asset, mkt, 24);
    for (const p of rb) expect(p.beta).toBeCloseTo(2, 6);
  });
});

describe("covariance helper", () => {
  it("matches manual covariance", () => {
    expect(covariance([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 10);
  });
});
import { describe, it, expect } from "vitest";
import {
  weakIVLab, heckmanTwoStep, simulateSelection, waldLrLm, simulateTrinity,
  seCoverageLab, feReHausman, simulatePanel, fwlDecompose, simulateCollinear,
  lasso, pdsLasso, hteDiagnostics, simulateHte, probit,
} from "../econAdvanced";

describe("weak instruments", () => {
  it("strong instrument: 2SLS beats OLS and F is large", () => {
    const r = weakIVLab({ n: 800, pi: 0.8, rho: 0.7, nInstruments: 1, seed: 5 });
    expect(r.firstStageF).toBeGreaterThan(50);
    expect(r.weak).toBe(false);
    expect(Math.abs(r.tslsBeta - 1)).toBeLessThan(Math.abs(r.olsBeta - 1));
    expect(r.arCI).not.toBeNull();
  });
  it("weak instrument flags Stock-Yogo and widens the AR set", () => {
    const weak = weakIVLab({ n: 400, pi: 0.03, rho: 0.7, nInstruments: 1, seed: 5 });
    const strong = weakIVLab({ n: 400, pi: 0.8, rho: 0.7, nInstruments: 1, seed: 5 });
    expect(weak.weak).toBe(true);
    const width = (ci: [number, number] | null) => (ci ? ci[1] - ci[0] : Infinity);
    expect(width(weak.arCI)).toBeGreaterThan(width(strong.arCI));
  });
});

describe("probit / Heckman", () => {
  it("probit recovers coefficients approximately", () => {
    const { W, s } = simulateSelection({ n: 4000, seed: 2 });
    const b = probit(W.map((r) => [1, ...r]), s);
    expect(b[1]).toBeCloseTo(0.5, 1);
    expect(b[2]).toBeCloseTo(1, 1);
  });
  it("two-step correction beats naive OLS under selection", () => {
    const { W, X, y, s, betaTrue } = simulateSelection({ n: 3000, rho: 0.8, seed: 4 });
    const f = heckmanTwoStep(W, s, X, y);
    expect(f.lambdaP).toBeLessThan(0.05);
    expect(f.rho).toBeGreaterThan(0.3);
    expect(Math.abs(f.beta[1] - betaTrue)).toBeLessThan(Math.abs(f.naiveBeta[1] - betaTrue));
  });
});

describe("Wald / LR / LM", () => {
  it("respects the Wald ≥ LR ≥ LM ordering", () => {
    const { Xd, y, restrict } = simulateTrinity({ n: 120, q: 2, signal: 0.3, seed: 8 });
    const t = waldLrLm(Xd, y, restrict);
    expect(t.ordered).toBe(true);
    expect(t.df).toBe(2);
  });
  it("rejects a false null and keeps a true one", () => {
    const big = simulateTrinity({ n: 600, q: 2, signal: 0.6, seed: 9 });
    const nul = simulateTrinity({ n: 600, q: 2, signal: 0, seed: 9 });
    expect(waldLrLm(big.Xd, big.y, big.restrict).lrP).toBeLessThan(0.01);
    expect(waldLrLm(nul.Xd, nul.y, nul.restrict).lrP).toBeGreaterThan(0.05);
  });
});

describe("standard error lab", () => {
  it("cluster/wild cover better than iid under clustering", () => {
    const r = seCoverageLab({ nClusters: 8, perCluster: 20, reps: 40, bootB: 49, seed: 6 });
    const by = Object.fromEntries(r.results.map((x) => [x.label, x.coverage]));
    expect(by["同方差 OLS"]).toBeLessThan(0.9);
    expect(by["聚类稳健"]).toBeGreaterThan(by["同方差 OLS"]);
    expect(by["Wild cluster bootstrap"]).toBeGreaterThanOrEqual(by["聚类稳健"] - 0.1);
  }, 60000);
});

describe("FE vs RE", () => {
  it("Hausman rejects RE when the effect correlates with x", () => {
    const { y, x, beta } = simulatePanel({ N: 150, T: 6, corrAlphaX: 0.8, seed: 12 });
    const r = feReHausman(y, x);
    expect(Math.abs(r.within - beta)).toBeLessThan(0.12);
    expect(r.rejectRE).toBe(true);
    expect(r.mundlak.p).toBeLessThan(0.05);
  });
  it("does not reject RE when the effect is exogenous", () => {
    const { y, x } = simulatePanel({ N: 150, T: 6, corrAlphaX: 0, seed: 15 });
    expect(feReHausman(y, x).hausmanP).toBeGreaterThan(0.05);
  });
});

describe("FWL", () => {
  it("residualized slope equals the multivariate coefficient", () => {
    const { X, y } = simulateCollinear({ n: 300, rho: 0.9, seed: 31 });
    const r = fwlDecompose(X, y, 0);
    expect(r.fwlBeta).toBeCloseTo(r.fullBeta, 8);
    expect(r.vif).toBeGreaterThan(4);
    expect(r.seFull).toBeGreaterThan(r.seOrthogonal);
  });
});

describe("LASSO / post-double-selection", () => {
  it("lasso zeroes out irrelevant columns", () => {
    const { X, y } = simulateCollinear({ n: 200, rho: 0.1, seed: 33 });
    const Xa = X.map((r) => [...r, r[0] * 0 + 1e-6]);
    const b = lasso(Xa, y, 0.1);
    expect(Math.abs(b[2])).toBeLessThan(1e-6);
    expect(Math.abs(b[0])).toBeGreaterThan(0.2);
  });
  it("PDS is less biased than naive selection on average", () => {
    let pdsErr = 0;
    let naiveErr = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const r = pdsLasso({ n: 250, p: 60, alpha: 0.5, confounding: 1.2, seed });
      pdsErr += Math.abs(r.pds.beta - r.betaTrue);
      naiveErr += Math.abs(r.naive.beta - r.betaTrue);
      expect(r.pds.selected.length).toBeGreaterThanOrEqual(r.naive.selected.length);
    }
    expect(pdsErr).toBeLessThan(naiveErr);
  }, 30000);
});

describe("HTE diagnostics", () => {
  it("detects heterogeneity when the learner is informative", () => {
    const { y, d, cate } = simulateHte({ n: 3000, hetero: 1, learnerNoise: 0.3, seed: 25 });
    const r = hteDiagnostics(y, d, cate, 5);
    expect(r.blpHetP).toBeLessThan(0.01);
    expect(r.blpHet).toBeGreaterThan(0.5);
    expect(r.gates[4].actual).toBeGreaterThan(r.gates[0].actual);
  });
  it("finds no heterogeneity for a pure-noise learner", () => {
    const { y, d, cate } = simulateHte({ n: 2000, hetero: 0, learnerNoise: 1, seed: 26 });
    expect(hteDiagnostics(y, d, cate, 5).blpHetP).toBeGreaterThan(0.05);
  });
});
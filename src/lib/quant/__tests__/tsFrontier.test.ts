import { describe, it, expect } from "vitest";
import {
  makeSeries, adfTest, ppTest, dfGlsTest, kpssTest, zivotAndrews, hegyTest, unitRootSuite,
  woldWeights, theoreticalAcf, sampleAcf, pacfFromAcf, polyRoots, armaIdentLab,
  spuriousRegression, differencingLab, setarLab, baiPerron,
  densityEvalLab, tQuantile, gammaFn, mcsLab, particleFilterSV, svVsGarch,
} from "../tsFrontier";

describe("unit-root suite", () => {
  it("ADF fails to reject on a random walk but rejects on a stationary AR(1)", () => {
    const rw = makeSeries("rw", 300, 1);
    const ar = makeSeries("ar", 300, 2, 0.4);
    expect(adfTest(rw, 2).reject5).toBe(false);
    expect(adfTest(ar, 2).reject5).toBe(true);
  });

  it("Phillips-Perron and DF-GLS agree with ADF on a clear stationary case", () => {
    const ar = makeSeries("ar", 300, 4, 0.3);
    expect(ppTest(ar).stat).toBeLessThan(-2.86);
    expect(dfGlsTest(ar, 2).stat).toBeLessThan(-1.94);
  });

  it("KPSS rejects stationarity on a random walk", () => {
    const rw = makeSeries("rw", 300, 6);
    const k = kpssTest(rw);
    expect(k.stat).toBeGreaterThan(k.cv.c5);
  });

  it("Zivot-Andrews locates a mid-sample level shift", () => {
    const y = makeSeries("break", 240, 8, 0.4);
    const za = zivotAndrews(y, 2);
    expect(za.breakFraction).toBeGreaterThan(0.3);
    expect(za.breakFraction).toBeLessThan(0.75);
    expect(za.path.length).toBeGreaterThan(50);
  });

  it("HEGY flags seasonal unit roots on a seasonal random walk", () => {
    const y = makeSeries("seasonal", 240, 9);
    const h = hegyTest(y);
    expect(h.rejectAnnual).toBe(false);
    expect(typeof h.note).toBe("string");
  });

  it("suite returns a joint ADF/KPSS reading", () => {
    const s = unitRootSuite({ kind: "rw", n: 240, seed: 3 });
    expect(s.tests).toHaveLength(4);
    expect(s.matrix.length).toBeGreaterThan(4);
  });
});

describe("Wold / ARMA identification", () => {
  it("psi weights of an AR(1) decay geometrically", () => {
    const psi = woldWeights([0.5], [], 5);
    expect(psi[0]).toBeCloseTo(1, 10);
    expect(psi[1]).toBeCloseTo(0.5, 10);
    expect(psi[2]).toBeCloseTo(0.25, 10);
  });

  it("theoretical ACF of AR(1) equals rho^h", () => {
    const acf = theoreticalAcf([0.6], [], 4);
    expect(acf[0]).toBeCloseTo(0.6, 2);
    expect(acf[1]).toBeCloseTo(0.36, 2);
  });

  it("PACF of AR(1) cuts off after lag 1", () => {
    const p = pacfFromAcf(theoreticalAcf([0.6], [], 6));
    expect(p[0]).toBeCloseTo(0.6, 2);
    expect(Math.abs(p[1])).toBeLessThan(0.05);
  });

  it("AR polynomial roots lie outside the unit circle when stationary", () => {
    const r = polyRoots([0.5]);
    expect(r[0].modulus).toBeCloseTo(2, 4);
  });

  it("armaIdentLab produces a full order grid and correct stationarity flags", () => {
    const res = armaIdentLab({ ar: [0.6], ma: [0.4], n: 400, seed: 11, maxOrder: 2 });
    expect(res.series).toHaveLength(400);
    expect(res.grid.length).toBe(8);
    expect(res.stationary).toBe(true);
    expect(res.invertible).toBe(true);
    expect(res.sampleAcfV[0]).toBeGreaterThan(0.4);
  });
});

describe("differencing decisions", () => {
  it("spurious regression rejects far more often than 5% in levels", () => {
    const s = spuriousRegression({ n: 150, sims: 150, seed: 5 });
    expect(s.rejectRate).toBeGreaterThan(0.4);
    expect(s.diffRejectRate).toBeLessThan(0.2);
  });

  it("over-differencing an AR(1) induces a near -1 MA root", () => {
    const d = differencingLab({ n: 240, seed: 5, sims: 100, rho: 0.7 });
    expect(d.overDiff.maRootDiff).toBeLessThan(d.overDiff.maRootLevel);
    expect(d.fan.length).toBeGreaterThan(50);
  });
});

describe("non-linearity and breaks", () => {
  it("SETAR recovers two regimes with different persistence", () => {
    const r = setarLab({ n: 300, seed: 21, boots: 40, arLow: 0.9, arHigh: 0.1, cTrue: 0 });
    expect(r.ssrSetar).toBeLessThan(r.ssrLinear);
    expect(r.lowRegime.ar).toBeGreaterThan(r.highRegime.ar);
    expect(r.bootP).toBeLessThan(0.2);
    expect(r.lstar.curve).toHaveLength(60);
  });

  it("Bai-Perron finds two mean shifts", () => {
    const r = baiPerron({ n: 240, seed: 33, maxBreaks: 4, trueBreaks: [0.33, 0.66], shift: 3 });
    expect(r.mBIC).toBe(2);
    expect(r.breaks).toHaveLength(2);
    expect(r.segments).toHaveLength(3);
    expect(r.sequential[0].reject).toBe(true);
  });
});

describe("density forecast evaluation", () => {
  it("gamma and t quantile helpers are sane", () => {
    expect(gammaFn(5)).toBeCloseTo(24, 4);
    expect(tQuantile(0.975, 1e6)).toBeCloseTo(1.96, 1);
  });

  it("GARCH density beats the homoskedastic normal on GARCH data", () => {
    const r = densityEvalLab({ n: 500, seed: 17, alpha: 0.12, beta: 0.85 });
    expect(r.models).toHaveLength(3);
    const norm = r.models[0], garch = r.models[2];
    expect(garch.logScore).toBeGreaterThan(norm.logScore);
    expect(garch.pitHist).toHaveLength(10);
    expect(garch.coverage90).toBeGreaterThan(0.8);
  });
});

describe("model confidence set", () => {
  it("keeps good models and eliminates the worst", () => {
    const r = mcsLab({ n: 250, seed: 41, boots: 120, alpha: 0.1 });
    expect(r.models).toHaveLength(5);
    expect(r.models[0].inMCS).toBe(true);
    expect(r.models[4].inMCS).toBe(false);
    expect(r.combos).toHaveLength(4);
    expect(r.pairwiseDM.length).toBe(10);
  });
});

describe("stochastic volatility", () => {
  it("particle filter tracks a persistent log-volatility process", () => {
    const r = svVsGarch({ n: 300, seed: 23, phi: 0.97, sigmaEta: 0.2, particles: 150 });
    expect(r.svVol).toHaveLength(300);
    expect(r.corrSV).toBeGreaterThan(0.3);
    expect(Number.isFinite(r.logScoreSV)).toBe(true);
  });

  it("particleFilterSV returns a finite likelihood", () => {
    const y = Array.from({ length: 100 }, (_, i) => 0.01 * Math.sin(i));
    const r = particleFilterSV(y, 0.95, 0.2, Math.log(0.0001), 100, 3);
    expect(r.filtered).toHaveLength(100);
    expect(Number.isFinite(r.logLik)).toBe(true);
  });
});
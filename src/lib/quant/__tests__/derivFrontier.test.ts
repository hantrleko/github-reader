import { describe, it, expect } from "vitest";
import {
  statePricesFromTree, arbitrageBounds, longstaffSchwartz, futuresVsForward,
  sviFit, sviTotalVar, surfaceArbitrageCheck, dupireLocalVolFromSurface,
  vasicekBond, cirBond, hullWhiteBondOption, hjmDriftCheck, lmmCapletBlack,
  hazardRateBootstrap, cdsParSpread, carrMadanFFT, mcVarianceReduction,
  rBergomiSmile, roughSkewTermStructure, meanVarianceHedge, solveLin,
} from "../derivFrontier";
import { blackScholes } from "../blackScholes";

describe("state prices", () => {
  const sp = statePricesFromTree({ S0: 100, sigma: 0.2, r: 0.05, T: 1, n: 20 });
  it("sums to the discount factor", () => {
    expect(sp.sumStatePrices).toBeCloseTo(Math.exp(-0.05), 6);
  });
  it("reprices the forward", () => {
    const fwd = sp.nodes.reduce((s, n) => s + n.statePrice * n.ST, 0);
    expect(fwd).toBeCloseTo(100, 4);
  });
  it("prices a European call close to Black-Scholes", () => {
    const c = sp.nodes.reduce((s, n) => s + n.statePrice * Math.max(n.ST - 100, 0), 0);
    expect(c).toBeCloseTo(blackScholes({ S: 100, K: 100, T: 1, r: 0.05, sigma: 0.2 }).call, 0);
  });
});

describe("no-arbitrage bounds in an incomplete market", () => {
  const b = arbitrageBounds({
    S0: 100, r: 0, T: 1, states: [120, 100, 80], payoffs: [20, 0, 0],
  });
  it("produces an interval, not a point", () => {
    expect(b.upper).toBeGreaterThan(b.lower);
    expect(b.spread).toBeGreaterThan(0);
  });
  it("brackets the two-state complete-market price", () => {
    expect(b.completePrice).toBeGreaterThanOrEqual(b.lower - 1e-9);
    expect(b.completePrice).toBeLessThanOrEqual(b.upper + 1e-9);
  });
});

describe("Longstaff-Schwartz", () => {
  const r = longstaffSchwartz({ S0: 100, K: 100, r: 0.05, sigma: 0.2, T: 1, steps: 25, nPaths: 4000, type: "put", seed: 42 });
  it("is at least the European put value", () => {
    expect(r.price).toBeGreaterThan(r.european - 3 * r.stderr);
    expect(r.earlyPremium).toBeGreaterThan(-0.05);
  });
  it("is close to the known binomial value (~6.09)", () => {
    expect(r.price).toBeGreaterThan(5.2);
    expect(r.price).toBeLessThan(7.2);
  });
  it("a deep OTM put is nearly worthless", () => {
    const d = longstaffSchwartz({ S0: 100, K: 50, r: 0.05, sigma: 0.2, T: 1, steps: 20, nPaths: 2000, type: "put" });
    expect(d.price).toBeLessThan(0.5);
  });
});

describe("futures vs forward", () => {
  it("matches cost of carry with zero correlation", () => {
    const f = futuresVsForward({ S0: 100, r: 0.05, T: 1, rho: 0 });
    expect(f.forward).toBeCloseTo(100 * Math.exp(0.05), 8);
    expect(f.convexity).toBeCloseTo(0, 8);
  });
  it("futures exceed forwards when spot and rates co-move", () => {
    const f = futuresVsForward({ S0: 100, r: 0.05, T: 2, rho: 0.5, sigmaS: 0.3, sigmaR: 0.02 });
    expect(f.futures).toBeGreaterThan(f.forward);
  });
  it("inverts the convenience yield", () => {
    const f = futuresVsForward({ S0: 100, r: 0.05, storage: 0.01, T: 1, marketFutures: 100 * Math.exp(0.02) });
    expect(f.impliedConvenience).toBeCloseTo(0.04, 6);
  });
});

describe("SVI surface", () => {
  const truth = { a: 0.02, b: 0.1, rho: -0.4, m: 0.0, sigma: 0.15 };
  const T = 0.5;
  const quotes = Array.from({ length: 15 }, (_, i) => {
    const k = -0.5 + i * (1 / 14);
    return { k, iv: Math.sqrt(sviTotalVar(truth, k) / T) };
  });
  it("recovers the smile within a tight RMSE", () => {
    const fit = sviFit(quotes, T);
    const err = quotes.map((q) => Math.abs(Math.sqrt(sviTotalVar(fit.params, q.k) / T) - q.iv));
    expect(Math.max(...err)).toBeLessThan(0.01);
  });
  it("flags calendar arbitrage when long variance is below short", () => {
    const short = truth;
    const bad = { ...truth, a: 0.005 };
    expect(surfaceArbitrageCheck(short, bad).calendarViolations).toBeGreaterThan(0);
    const good = { ...truth, a: 0.05 };
    expect(surfaceArbitrageCheck(short, good).calendarViolations).toBe(0);
  });
  it("produces positive local vols from an arbitrage-free pair", () => {
    const lv = dupireLocalVolFromSurface(truth, { ...truth, a: 0.05 }, 0.5, 1.0);
    expect(lv.every((p) => p.localVol > 0 && Number.isFinite(p.localVol))).toBe(true);
  });
});

describe("short-rate models", () => {
  it("Vasicek yield tends to r0 at the short end", () => {
    const b = vasicekBond({ r0: 0.03, a: 0.2, b: 0.05, sigma: 0.01, T: 0.01 });
    expect(b.yield).toBeCloseTo(0.03, 3);
    expect(b.P).toBeLessThan(1);
  });
  it("CIR bond prices decline with maturity", () => {
    const p1 = cirBond({ r0: 0.03, a: 0.2, b: 0.05, sigma: 0.05, T: 1 }).P;
    const p5 = cirBond({ r0: 0.03, a: 0.2, b: 0.05, sigma: 0.05, T: 5 }).P;
    expect(p5).toBeLessThan(p1);
    expect(cirBond({ r0: 0.03, a: 0.2, b: 0.05, sigma: 0.05, T: 0.001 }).yield).toBeCloseTo(0.03, 3);
  });
  it("Hull-White bond option satisfies put-call parity", () => {
    const PT = Math.exp(-0.03 * 1), PS = Math.exp(-0.03 * 3);
    const o = hullWhiteBondOption({ a: 0.1, sigma: 0.01, T: 1, S: 3, K: 0.93, PT, PS });
    expect(o.call - o.put).toBeCloseTo(PS - 0.93 * PT, 8);
  });
  it("HJM drift is positive and increasing in tenor", () => {
    const c = hjmDriftCheck({ sigma: 0.01, a: 0.1, horizon: 10 });
    expect(c[0].drift).toBeGreaterThanOrEqual(0);
    expect(c[c.length - 1].cumDrift).toBeGreaterThan(c[0].cumDrift);
  });
  it("Black-76 caplet respects put-call parity", () => {
    const c = lmmCapletBlack({ F: 0.03, K: 0.025, sigma: 0.3, T: 1, tau: 0.25, P: 0.97 });
    expect(c.caplet - c.floorlet).toBeCloseTo(0.25 * 0.97 * (0.03 - 0.025), 10);
  });
});

describe("credit curve", () => {
  const quotes = [
    { tenor: 1, spread: 0.008 }, { tenor: 3, spread: 0.011 }, { tenor: 5, spread: 0.013 },
  ];
  const boot = hazardRateBootstrap({ quotes, r: 0.03, recovery: 0.4 });
  it("reprices each quoted CDS at par", () => {
    quotes.forEach((q, i) => {
      const par = cdsParSpread({ tenor: q.tenor, hazards: boot.hazards.slice(0, i + 1), r: 0.03, recovery: 0.4 });
      expect(par).toBeCloseTo(q.spread, 5);
    });
  });
  it("survival decreases with tenor and stays in (0,1)", () => {
    expect(boot.curve[0].survival).toBeGreaterThan(boot.curve[2].survival);
    expect(boot.curve[2].survival).toBeGreaterThan(0);
    expect(boot.curve[0].survival).toBeLessThan(1);
  });
  it("is close to the credit triangle approximation", () => {
    expect(boot.curve[0].hazard).toBeCloseTo(0.008 / 0.6, 2);
  });
});

describe("Fourier pricing", () => {
  it("Carr-Madan reproduces Black-Scholes when vol of vol vanishes", () => {
    const p = carrMadanFFT({ S: 100, K: 100, r: 0.03, T: 1, v0: 0.04, theta: 0.04, kappa: 2, xi: 0.0001, rho: 0 });
    expect(p.call).toBeCloseTo(blackScholes({ S: 100, K: 100, T: 1, r: 0.03, sigma: 0.2 }).call, 1);
  });
  it("satisfies put-call parity", () => {
    const p = carrMadanFFT({ S: 100, K: 110, r: 0.03, T: 1, v0: 0.04, theta: 0.05, kappa: 1.5, xi: 0.5, rho: -0.7 });
    expect(p.call - p.put).toBeCloseTo(100 - 110 * Math.exp(-0.03), 6);
  });
  it("call price decreases in strike", () => {
    const a = carrMadanFFT({ S: 100, K: 90, r: 0.03, T: 1, v0: 0.04, theta: 0.04, kappa: 2, xi: 0.4, rho: -0.6 }).call;
    const b = carrMadanFFT({ S: 100, K: 110, r: 0.03, T: 1, v0: 0.04, theta: 0.04, kappa: 2, xi: 0.4, rho: -0.6 }).call;
    expect(a).toBeGreaterThan(b);
  });
});

describe("variance reduction", () => {
  const vr = mcVarianceReduction({ S: 100, K: 100, r: 0.03, sigma: 0.2, T: 1, nPaths: 4000 });
  it("all estimators land near the exact price", () => {
    vr.results.forEach((r) => expect(Math.abs(r.price - vr.exact)).toBeLessThan(1.0));
  });
  it("antithetic and control variate beat plain MC", () => {
    const plain = vr.results[0], anti = vr.results[1], cv = vr.results[2];
    expect(anti.stderr).toBeLessThan(plain.stderr);
    expect(cv.stderr).toBeLessThan(plain.stderr);
    expect(cv.efficiency).toBeGreaterThan(1);
  });
});

describe("rough volatility & optimal hedging", () => {
  it("rBergomi produces a downward-sloping smile with negative rho", () => {
    const s = rBergomiSmile({ S0: 100, xi: 0.04, eta: 1.5, H: 0.1, rho: -0.8, T: 0.25, nPaths: 600, steps: 16 });
    expect(s.smile.every((p) => p.iv > 0)).toBe(true);
    expect(s.atmSkew).toBeLessThan(0);
  });
  it("rough skew explodes at short maturities relative to a diffusion", () => {
    const ts = roughSkewTermStructure(0.1, 1.5, [1 / 52, 1 / 12, 0.5, 1]);
    expect(Math.abs(ts[0].rough)).toBeGreaterThan(Math.abs(ts[3].rough));
    expect(Math.abs(ts[0].rough)).toBeGreaterThan(Math.abs(ts[0].diffusive));
  });
  it("mean-variance hedging leaves residual risk under jumps", () => {
    const h = meanVarianceHedge({ S0: 100, K: 100, r: 0.02, sigma: 0.2, T: 0.5, lambda: 1, muJ: -0.1, sigmaJ: 0.2, gamma: 1 });
    expect(h.residualStd).toBeGreaterThan(0);
    expect(h.hedgeRatio).toBeGreaterThan(0);
    expect(h.hedgeRatio).toBeLessThan(1.2);
    expect(h.indifferencePrice).toBeGreaterThan(h.meanVariancePrice);
    expect(h.superPrice).toBeGreaterThan(h.subPrice);
  });
});

describe("linear solver", () => {
  it("solves a small system", () => {
    const x = solveLin([[2, 1], [1, 3]], [5, 10]);
    expect(x[0]).toBeCloseTo(1, 8);
    expect(x[1]).toBeCloseTo(3, 8);
  });
});

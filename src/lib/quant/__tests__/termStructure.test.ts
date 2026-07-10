import { describe, it, expect } from "vitest";
import {
  nsLoadings,
  nsRate,
  nsForward,
  nssRate,
  fitNS,
  fitNSS,
  type NSParams,
  type NSSParams,
} from "@/lib/quant/termStructure";

describe("Nelson-Siegel loadings", () => {
  it("level loading is 1, slope→1 as τ→0, curvature→0 as τ→0", () => {
    const [l1, l2] = nsLoadings(1e-6, 2);
    expect(l1).toBeCloseTo(1, 3);
    expect(l2).toBeCloseTo(0, 3);
  });

  it("slope loading decays toward 0 for long maturities", () => {
    const [lShort] = nsLoadings(0.5, 2);
    const [lLong] = nsLoadings(30, 2);
    expect(lShort).toBeGreaterThan(lLong);
    expect(lLong).toBeLessThan(0.2);
  });
});

describe("nsRate / nsForward", () => {
  const p: NSParams = { b0: 4.5, b1: -2, b2: 1.5, lambda: 1.8 };
  it("long end → β0, short end → β0+β1", () => {
    expect(nsRate(60, p)).toBeCloseTo(p.b0, 1);
    expect(nsRate(1e-6, p)).toBeCloseTo(p.b0 + p.b1, 3);
  });
  it("forward and spot agree at the short end", () => {
    expect(nsForward(1e-6, p)).toBeCloseTo(p.b0 + p.b1, 3);
  });
});

describe("fitNS recovers known parameters", () => {
  const truth: NSParams = { b0: 4.2, b1: -1.6, b2: 2.1, lambda: 1.5 };
  const taus = [0.25, 0.5, 1, 2, 3, 5, 7, 10, 20, 30];
  const points = taus.map((tau) => ({ tau, yield: nsRate(tau, truth) }));

  it("fits noise-free data almost exactly", () => {
    const fit = fitNS(points);
    expect(fit.rmse).toBeLessThan(0.02);
    expect(fit.r2).toBeGreaterThan(0.999);
    expect(fit.b0).toBeCloseTo(truth.b0, 1);
  });

  it("throws on too few points", () => {
    expect(() => fitNS(points.slice(0, 2))).toThrow();
  });
});

describe("fitNSS recovers a Svensson curve", () => {
  const truth: NSSParams = { b0: 4, b1: -1.2, b2: 2, b3: -1.5, lambda1: 1.2, lambda2: 8 };
  const taus = [0.25, 0.5, 1, 2, 3, 5, 7, 10, 15, 20, 30];
  const points = taus.map((tau) => ({ tau, yield: nssRate(tau, truth) }));

  it("achieves a very tight fit on noise-free Svensson data", () => {
    const fit = fitNSS(points);
    expect(fit.rmse).toBeLessThan(0.05);
    expect(fit.r2).toBeGreaterThan(0.999);
  });
});
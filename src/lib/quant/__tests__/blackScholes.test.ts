import { describe, it, expect } from "vitest";
import { blackScholes, impliedVolatility, normCdf } from "../blackScholes";

describe("normCdf", () => {
  it("matches known values", () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 6);
    expect(normCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normCdf(-1.96)).toBeCloseTo(0.025, 3);
    expect(normCdf(3)).toBeCloseTo(0.998650102, 6);
  });
});

describe("blackScholes", () => {
  // Hull (10e) Table — well-known textbook benchmark
  it("ATM call S=K=100, r=5%, σ=20%, T=1 ≈ 10.4506", () => {
    const r = blackScholes({ S: 100, K: 100, T: 1, r: 0.05, sigma: 0.2 });
    expect(r.call).toBeCloseTo(10.4506, 3);
    expect(r.put).toBeCloseTo(5.5735, 3);
  });

  it("put-call parity holds: C - P = S e^{-qT} - K e^{-rT}", () => {
    const S = 120, K = 100, T = 0.75, r = 0.04, sigma = 0.35, q = 0.02;
    const { call, put } = blackScholes({ S, K, T, r, sigma, q });
    const lhs = call - put;
    const rhs = S * Math.exp(-q * T) - K * Math.exp(-r * T);
    expect(lhs).toBeCloseTo(rhs, 8);
  });

  it("delta of deep ITM call ≈ 1, deep OTM ≈ 0", () => {
    expect(blackScholes({ S: 1000, K: 100, T: 1, r: 0.05, sigma: 0.2 }).deltaCall).toBeCloseTo(1, 4);
    expect(blackScholes({ S: 10, K: 100, T: 1, r: 0.05, sigma: 0.2 }).deltaCall).toBeCloseTo(0, 4);
  });
});

describe("impliedVolatility", () => {
  it("round-trips: σ → price → σ", () => {
    const trueSigma = 0.27;
    const { call } = blackScholes({ S: 100, K: 110, T: 0.5, r: 0.03, sigma: trueSigma });
    const iv = impliedVolatility({ price: call, S: 100, K: 110, T: 0.5, r: 0.03 });
    expect(iv).toBeCloseTo(trueSigma, 6);
  });

  it("recovers high vol", () => {
    const trueSigma = 0.85;
    const { put } = blackScholes({ S: 80, K: 100, T: 1.5, r: 0.02, sigma: trueSigma });
    const iv = impliedVolatility({
      price: put,
      S: 80,
      K: 100,
      T: 1.5,
      r: 0.02,
      type: "put",
    });
    expect(iv).toBeCloseTo(trueSigma, 5);
  });
});
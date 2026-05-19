import { describe, it, expect } from "vitest";
import { ols } from "../ols";

describe("ols", () => {
  it("recovers known β with no noise", () => {
    // y = 2 + 3 x1 - 1 x2
    const X = [
      [1, 2], [2, 1], [3, 0], [4, -1], [5, -2], [6, -3], [0, 4], [-1, 5],
    ];
    const y = X.map(([a, b]) => 2 + 3 * a - 1 * b);
    const r = ols(X, y);
    expect(r.beta[0]).toBeCloseTo(2, 8);
    expect(r.beta[1]).toBeCloseTo(3, 8);
    expect(r.beta[2]).toBeCloseTo(-1, 8);
    expect(r.r2).toBeCloseTo(1, 10);
  });

  it("reproduces simple linreg slope", () => {
    // y = 1 + 0.5 x, no noise
    const X = Array.from({ length: 20 }, (_, i) => [i]);
    const y = X.map(([x]) => 1 + 0.5 * x);
    const r = ols(X, y);
    expect(r.beta[0]).toBeCloseTo(1, 10);
    expect(r.beta[1]).toBeCloseTo(0.5, 10);
    expect(r.r2).toBeCloseTo(1, 12);
  });
});
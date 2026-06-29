import { describe, it, expect } from "vitest";
import {
  equalWeight, riskParityWeights, minVarianceWeights, meanVarianceWeights,
  covMatrix, correlationFromCov, riskContributions, alignSeries,
  runPortfolioBacktest, returnsFromPrices,
} from "../portfolio";

const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);

/** Mulberry32 PRNG + Box-Muller normal. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function gauss(r: () => number) { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

describe("weight schemes are long-only and sum to 1", () => {
  const cov = [
    [0.04, 0.006, 0.0],
    [0.006, 0.09, 0.0],
    [0.0, 0.0, 0.16],
  ];
  const mu = [0.08, 0.10, 0.12];

  it("equal weight", () => {
    const w = equalWeight(3);
    expect(sum(w)).toBeCloseTo(1, 8);
    expect(w.every((x) => x >= 0)).toBe(true);
  });

  it("risk parity equalises risk contributions", () => {
    const w = riskParityWeights(cov);
    expect(sum(w)).toBeCloseTo(1, 6);
    expect(w.every((x) => x >= -1e-9)).toBe(true);
    const { rows } = riskContributions(cov, w);
    const pcrs = rows.map((r) => r.pcr);
    // each risk contribution should be ~1/3
    pcrs.forEach((p) => expect(p).toBeCloseTo(1 / 3, 2));
  });

  it("min variance puts most weight on the lowest-variance asset", () => {
    const w = minVarianceWeights(cov);
    expect(sum(w)).toBeCloseTo(1, 5);
    expect(w.every((x) => x >= -1e-9)).toBe(true);
    expect(w[0]).toBeGreaterThan(w[1]);
    expect(w[0]).toBeGreaterThan(w[2]);
  });

  it("mean-variance is long-only after projection", () => {
    const w = meanVarianceWeights(cov, mu);
    expect(sum(w)).toBeCloseTo(1, 5);
    expect(w.every((x) => x >= -1e-9)).toBe(true);
  });
});

describe("covMatrix / correlation", () => {
  it("diagonal of correlation is 1", () => {
    const r = rng(5);
    const a = Array.from({ length: 500 }, () => 0.01 * gauss(r));
    const b = Array.from({ length: 500 }, () => 0.02 * gauss(r));
    const cov = covMatrix([a, b]);
    const corr = correlationFromCov(cov);
    expect(corr[0][0]).toBeCloseTo(1, 6);
    expect(corr[1][1]).toBeCloseTo(1, 6);
    expect(Math.abs(corr[0][1])).toBeLessThan(0.3);
  });
});

describe("alignSeries", () => {
  it("keeps only common dates", () => {
    const a = { symbol: "A", dates: ["2020-01-01", "2020-01-02", "2020-01-03"], prices: [10, 11, 12] };
    const b = { symbol: "B", dates: ["2020-01-02", "2020-01-03", "2020-01-04"], prices: [20, 21, 22] };
    const al = alignSeries([a, b]);
    expect(al.dates).toEqual(["2020-01-02", "2020-01-03"]);
    expect(al.pricesByAsset[0]).toEqual([11, 12]);
    expect(al.pricesByAsset[1]).toEqual([20, 21]);
  });
});

describe("runPortfolioBacktest", () => {
  function alignedFromPrices(pricesByAsset: number[][]) {
    const dates = pricesByAsset[0].map((_, i) => {
      const d = new Date(Date.UTC(2018, 0, 1));
      d.setUTCDate(d.getUTCDate() + i);
      return d.toISOString().slice(0, 10);
    });
    return { dates, symbols: pricesByAsset.map((_, i) => "A" + i), pricesByAsset };
  }

  it("equal-weight matches its own benchmark with zero cost", () => {
    const r = rng(11);
    const n = 400;
    const p1 = [100], p2 = [100];
    for (let i = 1; i < n; i++) {
      p1.push(p1[i - 1] * (1 + 0.0003 + 0.01 * gauss(r)));
      p2.push(p2[i - 1] * (1 + 0.0002 + 0.012 * gauss(r)));
    }
    const aligned = alignedFromPrices([p1, p2]);
    const res = runPortfolioBacktest(aligned, { method: "equal", rebalance: "monthly", costBps: 0 });
    const last = res.equity.length - 1;
    // benchmark is daily-rebalanced equal weight; a monthly-rebalanced equal
    // portfolio drifts between rebalances, so they track closely but not exactly.
    expect(Math.abs(res.equity[last] / res.benchmark[last] - 1)).toBeLessThan(0.02);
    expect(res.metrics.costDrag).toBeCloseTo(0, 8);
  });

  it("transaction costs reduce realised return", () => {
    const r = rng(21);
    const n = 500;
    const p1 = [100], p2 = [100];
    for (let i = 1; i < n; i++) {
      p1.push(p1[i - 1] * (1 + 0.0004 + 0.015 * gauss(r)));
      p2.push(p2[i - 1] * (1 + 0.0001 + 0.02 * gauss(r)));
    }
    const aligned = alignedFromPrices([p1, p2]);
    const free = runPortfolioBacktest(aligned, { method: "riskparity", rebalance: "monthly", costBps: 0 });
    const costly = runPortfolioBacktest(aligned, { method: "riskparity", rebalance: "monthly", costBps: 50 });
    expect(costly.metrics.cagr).toBeLessThan(free.metrics.cagr);
    expect(costly.metrics.costDrag).toBeGreaterThan(0);
  });

  it("returnsFromPrices yields one fewer point per asset", () => {
    const rets = returnsFromPrices([[100, 110, 121], [50, 55, 60]]);
    expect(rets[0].length).toBe(2);
    expect(rets[0][0]).toBeCloseTo(0.1, 8);
  });
});

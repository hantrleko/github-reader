import { describe, it, expect } from "vitest";
import { runBacktest, strategyPositions } from "../backtest";

/** Deterministic geometric series with a constant up-drift. */
function trendingPrices(n: number, dailyDrift = 0.001, start = 100): number[] {
  const p = [start];
  for (let i = 1; i < n; i++) p.push(p[i - 1] * (1 + dailyDrift));
  return p;
}

describe("runBacktest", () => {
  it("buy & hold equals the benchmark", () => {
    const prices = trendingPrices(300, 0.0008);
    const res = runBacktest(prices, undefined, "buyhold");
    const last = res.equity.length - 1;
    expect(res.equity[last]).toBeCloseTo(res.benchmark[last], 8);
    expect(res.metrics.exposure).toBeCloseTo(1, 6);
  });

  it("captures positive total return on a rising trend", () => {
    const prices = trendingPrices(300, 0.001);
    const res = runBacktest(prices, undefined, "buyhold");
    expect(res.metrics.totalReturn).toBeGreaterThan(0);
    expect(res.metrics.cagr).toBeGreaterThan(0);
  });

  it("max drawdown is non-positive and bounded by -1", () => {
    const prices = trendingPrices(250, 0.0005);
    const res = runBacktest(prices, undefined, "sma", { fast: 10, slow: 30 });
    expect(res.metrics.maxDrawdown).toBeLessThanOrEqual(0);
    expect(res.metrics.maxDrawdown).toBeGreaterThanOrEqual(-1);
  });

  it("SMA stays long on a pure uptrend once warmed up", () => {
    const prices = trendingPrices(120, 0.002);
    const pos = strategyPositions(prices, "sma", { fast: 5, slow: 20 });
    expect(pos[pos.length - 1]).toBe(1);
  });

  it("vol-target scales position inversely with realized vol", () => {
    const calm = trendingPrices(120, 0.0002);
    const posCalm = strategyPositions(calm, "voltarget", { targetVol: 0.1, volWindow: 20, maxLeverage: 10 });
    // very low realized vol -> leverage hits the cap
    expect(posCalm[posCalm.length - 1]).toBeGreaterThan(1);
  });
});
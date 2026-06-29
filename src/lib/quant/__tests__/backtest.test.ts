import { describe, it, expect } from "vitest";
import { runBacktest, strategyPositions, gridScan, monthlyReturns } from "../backtest";

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
    // low-vol series -> high leverage; high-vol series -> lower leverage
    const calm = [100];
    const wild = [100];
    for (let i = 1; i < 160; i++) {
      const o = (i % 2 === 0 ? 1 : -1);
      calm.push(calm[i - 1] * (1 + o * 0.001)); // ±0.1% chop
      wild.push(wild[i - 1] * (1 + o * 0.03)); // ±3% chop
    }
    const posCalm = strategyPositions(calm, "voltarget", { targetVol: 0.15, volWindow: 20, maxLeverage: 10 });
    const posWild = strategyPositions(wild, "voltarget", { targetVol: 0.15, volWindow: 20, maxLeverage: 10 });
    expect(posCalm[posCalm.length - 1]).toBeGreaterThan(posWild[posWild.length - 1]);
  });

  it("transaction costs are monotone: more cost never improves net return", () => {
    // choppy series so the SMA strategy trades a lot
    const prices = [100];
    for (let i = 1; i < 300; i++) prices.push(prices[i - 1] * (1 + (i % 3 === 0 ? 0.02 : -0.015)));
    const free = runBacktest(prices, undefined, "sma", { fast: 5, slow: 15, costBps: 0 });
    const costly = runBacktest(prices, undefined, "sma", { fast: 5, slow: 15, costBps: 30, slippageBps: 20 });
    expect(costly.metrics.totalReturn).toBeLessThanOrEqual(free.metrics.totalReturn + 1e-12);
    expect(costly.metrics.costDrag).toBeGreaterThanOrEqual(0);
    expect(free.equityGross.length).toBe(free.equity.length);
  });
});

describe("gridScan", () => {
  it("returns a grid matching the sweep dimensions and a best cell inside it", () => {
    const prices = trendingPrices(400, 0.0006);
    const res = gridScan(prices, undefined, "sma", {
      xParam: "fast", xValues: [5, 10, 20],
      yParam: "slow", yValues: [40, 80, 120, 200],
      metric: "sharpe",
    });
    expect(res.grid.length).toBe(4); // rows = yValues
    expect(res.grid[0].length).toBe(3); // cols = xValues
    expect(res.xValues).toContain(res.best.x);
    expect(res.yValues).toContain(res.best.y);
  });
});

describe("monthlyReturns", () => {
  it("aggregates an equity curve into a year×month matrix", () => {
    const dates: string[] = [];
    const equity: number[] = [];
    const start = new Date(Date.UTC(2021, 0, 1));
    for (let i = 0; i < 400; i++) {
      const d = new Date(start); d.setUTCDate(start.getUTCDate() + i);
      dates.push(d.toISOString().slice(0, 10));
      equity.push(1 * Math.pow(1.0005, i));
    }
    const mr = monthlyReturns(dates, equity);
    expect(mr.years.length).toBeGreaterThan(0);
    expect(mr.matrix[0].length).toBe(12);
    // a rising curve should have mostly positive monthly returns
    const flat = mr.matrix.flat().filter((v): v is number => v != null);
    expect(flat.filter((v) => v > 0).length).toBeGreaterThan(flat.length / 2);
  });
});
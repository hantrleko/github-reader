import { describe, it, expect } from "vitest";
import {
  syntheticPanel,
  panelFromSeries,
  buildCrossSections,
  ridgeFit,
  spearman,
  evaluateSignal,
  runQlibWorkflow,
  FACTOR_IDS,
  type FactorId,
} from "../qlibPipeline";

const FACTORS = [...FACTOR_IDS] as FactorId[];

describe("qlib pipeline", () => {
  it("builds a deterministic panel", () => {
    const a = syntheticPanel(10, 300, 1);
    const b = syntheticPanel(10, 300, 1);
    expect(a.close[3][299]).toBeCloseTo(b.close[3][299], 10);
    expect(a.symbols).toHaveLength(10);
    expect(a.dates).toHaveLength(300);
  });

  it("cross-sectionally normalises factors to ~zero mean", () => {
    const p = syntheticPanel(20, 400, 7);
    const secs = buildCrossSections(p, FACTORS, 5);
    expect(secs.length).toBeGreaterThan(100);
    const s = secs[50];
    for (let j = 0; j < FACTORS.length; j++) {
      const col = s.X.map((r) => r[j]);
      expect(Math.abs(col.reduce((x, y) => x + y, 0) / col.length)).toBeLessThan(0.35);
      expect(Math.max(...col)).toBeLessThanOrEqual(3.0001);
    }
  });

  it("recovers known ridge coefficients", () => {
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 200; i++) {
      const a = Math.sin(i);
      const b = Math.cos(i * 0.7);
      X.push([a, b]);
      y.push(2 * a - 1 * b);
    }
    const w = ridgeFit(X, y, 1e-6);
    expect(w[0]).toBeCloseTo(2, 3);
    expect(w[1]).toBeCloseTo(-1, 3);
  });

  it("computes rank correlation", () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1, 6);
    expect(spearman([1, 2, 3, 4], [40, 30, 20, 10])).toBeCloseTo(-1, 6);
  });

  it("reports a perfect IC for an oracle signal", () => {
    const p = syntheticPanel(15, 300, 3);
    const secs = buildCrossSections(p, FACTORS, 5);
    const oracle = secs.map((s) => s.fwd.slice());
    const ev = evaluateSignal(secs, oracle);
    expect(ev.meanIc).toBeCloseTo(1, 6);
    expect(ev.meanRankIc).toBeCloseTo(1, 6);
    expect(ev.hitRate).toBe(1);
    expect(ev.quantiles[4]).toBeGreaterThan(ev.quantiles[0]);
  });

  it("runs the end-to-end workflow out of sample", () => {
    const p = syntheticPanel(30, 750, 42);
    const res = runQlibWorkflow(p, {
      factors: FACTORS,
      horizon: 5,
      model: "ridge",
      lambda: 1,
      trainRatio: 0.6,
      topk: { topk: 5, nDrop: 2, freq: 5, costBps: 5 },
    });
    expect(res).not.toBeNull();
    if (!res) return;
    expect(res.weights).toHaveLength(FACTORS.length);
    expect(res.nTest).toBeGreaterThan(10);
    expect(res.backtest.equity.length).toBeGreaterThan(10);
    expect(res.backtest.turnover).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(res.test.icir)).toBe(true);
    expect(Number.isFinite(res.backtest.metrics.sharpe)).toBe(true);
    expect(res.backtest.metrics.maxDrawdown).toBeLessThanOrEqual(0);
  });

  it("aligns real series into a panel on common dates", () => {
    const mk = (sym: string, off: number) => ({
      symbol: sym,
      dates: Array.from({ length: 100 }, (_, i) => `2024-01-${String((i % 28) + 1).padStart(2, "0")}-${i}`),
      prices: Array.from({ length: 100 }, (_, i) => 100 + i + off),
    });
    const panel = panelFromSeries([mk("A", 0), mk("B", 1), mk("C", 2), mk("D", 3), mk("E", 4)]);
    expect(panel).not.toBeNull();
    expect(panel?.symbols).toEqual(["A", "B", "C", "D", "E"]);
    expect(panelFromSeries([mk("A", 0)])).toBeNull();
  });
});

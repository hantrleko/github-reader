import { describe, it, expect } from "vitest";
import { importIpynb } from "@/lib/notebook/importIpynb";
import { bootstrapCone } from "@/lib/quant/backtest";

describe("importIpynb", () => {
  const nb = JSON.stringify({
    nbformat: 4,
    cells: [
      { cell_type: "markdown", source: ["# My Research\n", "\n", "Intro text"] },
      { cell_type: "code", source: ["import numpy as np\n", "np.mean([1,2,3])"] },
      { cell_type: "markdown", source: "plain string source" },
      { cell_type: "code", source: [] },
    ],
  });

  it("extracts title from first H1", () => {
    const r = importIpynb(nb);
    expect(r.title).toBe("My Research");
  });

  it("maps markdown and code cells, skipping empty", () => {
    const r = importIpynb(nb);
    expect(r.cells).toHaveLength(3);
    expect(r.cells[0].kind).toBe("markdown");
    expect(r.cells[1].kind).toBe("python");
    expect(r.cells[1].body).toContain("np.mean");
  });

  it("throws on invalid json / missing cells", () => {
    expect(() => importIpynb("{}")).toThrow();
    expect(() => importIpynb(JSON.stringify({ cells: [] }))).toThrow();
  });
});

describe("bootstrapCone", () => {
  // deterministic synthetic daily returns: mild positive drift
  const rets = Array.from({ length: 500 }, (_, i) => 0.0004 + 0.01 * Math.sin(i * 0.7));

  it("is deterministic given a seed", () => {
    const a = bootstrapCone(rets, { horizon: 100, nSims: 100, seed: 1 });
    const b = bootstrapCone(rets, { horizon: 100, nSims: 100, seed: 1 });
    expect(a.p50).toEqual(b.p50);
    expect(a.terminal).toEqual(b.terminal);
  });

  it("bands are ordered p5 <= p25 <= p50 <= p75 <= p95", () => {
    const c = bootstrapCone(rets, { horizon: 120, nSims: 200, seed: 3 });
    for (let i = 0; i < c.horizon.length; i++) {
      expect(c.p5[i]).toBeLessThanOrEqual(c.p25[i]);
      expect(c.p25[i]).toBeLessThanOrEqual(c.p50[i]);
      expect(c.p50[i]).toBeLessThanOrEqual(c.p75[i]);
      expect(c.p75[i]).toBeLessThanOrEqual(c.p95[i]);
    }
  });

  it("positive-drift returns produce median terminal > 1 and low probLoss", () => {
    const c = bootstrapCone(rets, { horizon: 252, nSims: 300, seed: 5 });
    expect(c.terminal.p50).toBeGreaterThan(1);
    expect(c.terminal.probLoss).toBeLessThan(0.5);
  });

  it("handles too-short input gracefully", () => {
    const c = bootstrapCone([0.01, -0.01], { horizon: 50 });
    expect(c.nSims).toBe(0);
    expect(c.p50.every((x) => x === 1)).toBe(true);
  });
});

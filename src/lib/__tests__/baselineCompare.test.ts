import { describe, it, expect } from "vitest";
import {
  diffValue, fmtNum, fmtSigned, compareRow, changedParams, diffKind, capmMetrics, olsivMetrics, hedgeMetrics,
  COMPARE_METRICS, COMPARE_PARAMS, fmtParam,
} from "@/lib/baselineCompare";

const pct = { id: "x", labelKey: "k", unit: "pct" as const, digits: 2 };
const plain = { id: "y", labelKey: "k", unit: "plain" as const, digits: 3 };

describe("difference maths", () => {
  it("is current minus baseline, signed correctly", () => {
    expect(diffValue(10.2, 15)).toBeCloseTo(4.8);
    expect(diffValue(1.8, -3)).toBeCloseTo(-4.8);
    expect(diffValue(-2, -5)).toBe(-3);
  });
  it("keeps a real zero and returns no result when a side is missing", () => {
    expect(diffValue(0, 0)).toBe(0);
    expect(diffValue(null, 1)).toBeNull();
    expect(diffValue(1, undefined)).toBeNull();
    expect(diffValue(NaN, 1)).toBeNull();
    expect(diffValue(1, Infinity)).toBeNull();
  });
  it("formats signs, zero and negative zero", () => {
    expect(fmtSigned(0.41, 2)).toBe("+0.41");
    expect(fmtSigned(-1.2, 2)).toBe("\u22121.20");
    expect(fmtSigned(0, 2)).toBe("0.00");
    expect(fmtSigned(-0.0001, 2)).toBe("0.00");
    expect(fmtNum(-0, 2)).toBe("0.00");
    expect(fmtNum(-3, 2)).toBe("\u22123.00");
    expect(fmtNum(null, 2)).toBeNull();
  });
});

describe("absolute vs percentage-point differences", () => {
  it("percent results differ in pp, never in %", () => {
    const r = compareRow(pct, 10.2, 15);
    expect(r).toMatchObject({ base: "10.20%", cur: "15.00%", diff: "+4.80 pp", kind: "pp" });
    expect(r.diff).not.toContain("%");
    expect(compareRow(pct, 1.8, -3).diff).toBe("\u22124.80 pp");
    expect(diffKind("pct")).toBe("pp");
  });
  it("plain results differ absolutely, with no pp label", () => {
    const r = compareRow(plain, 1.41, 1);
    expect(r).toMatchObject({ base: "1.410", cur: "1.000", diff: "\u22120.410", kind: "abs" });
    expect(diffKind("plain")).toBe("abs");
  });
  it("shows a real zero and marks missing as no result", () => {
    expect(compareRow(pct, 0, 0)).toMatchObject({ base: "0.00%", cur: "0.00%", diff: "0.00 pp" });
    const m = compareRow(plain, 7.5, null);
    expect(m).toMatchObject({ base: "7.500", cur: null, diff: null });
    expect(compareRow(plain, undefined, 2)).toMatchObject({ base: null, cur: "2.000", diff: null });
  });
  it("uses the translated pp unit when given", () => {
    expect(compareRow(pct, 1, 2, "个百分点").diff).toBe("+1.00 个百分点");
  });
});

describe("changed parameters and adapters", () => {
  it("lists every input that changed, so nothing is pinned on a single one", () => {
    expect(changedParams({ a: 1, b: 2 }, { a: 1, b: 2 })).toEqual([]);
    expect(changedParams({ a: 1, b: 2 }, { a: 1, b: 3 })).toEqual(["b"]);
    expect(changedParams({ a: 1, b: 2 }, { a: 0, b: 3 })).toEqual(["a", "b"]);
  });
  it("adapters pass through lab outputs and keep missing values missing", () => {
    expect(capmMetrics({ required: 10.2, alpha: 1.8, prem: 6, treynor: null })).toEqual({ required: 10.2, alpha: 1.8, prem: 6, treynor: null });
    expect(olsivMetrics(1, { olsBeta: 1.41, ivBeta: 1.08, olsSe: 0.05, ivSe: 0.09 }).olsBias).toBeCloseTo(0.41);
    expect(olsivMetrics(1, { olsBeta: NaN, ivBeta: 1, olsSe: 0, ivSe: 0 }).olsBias).toBeNull();
    expect(hedgeMetrics({ meanPnL: -0.5, stdPnL: 1, attribution: { vega: -0.4, transactionCost: 0 } })).toEqual({ meanPnL: -0.5, stdPnL: 1, vega: -0.4, cost: 0 });
  });
  it("only CAPM return metrics are percentages; parameter labels show units", () => {
    expect(COMPARE_METRICS.capm.filter((m) => m.unit === "pct").map((m) => m.id)).toEqual(["required", "alpha", "prem"]);
    expect(COMPARE_METRICS.olsiv.every((m) => m.unit === "plain")).toBe(true);
    expect(COMPARE_METRICS.hedge.every((m) => m.unit === "plain")).toBe(true);
    const sp = COMPARE_PARAMS.hedge.find((p) => p.id === "sigmaPricing")!;
    expect(fmtParam(sp, 0.2)).toBe("20%");
    expect(fmtParam(COMPARE_PARAMS.hedge.find((p) => p.id === "cost")!, 0.001)).toBe("10.0 bp");
  });
});

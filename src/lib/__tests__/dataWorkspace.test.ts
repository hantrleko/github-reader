import { describe, it, expect } from "vitest";
import { parseCsv, applyTransform, seriesStats } from "@/lib/dataWorkspace";

describe("parseCsv", () => {
  it("parses date + numeric columns", () => {
    const csv = "date,close,volume\n2024-01-01,100,5000\n2024-01-02,101.5,6200\n2024-01-03,99.8,4100";
    const r = parseCsv(csv);
    expect(r.dates).toEqual(["2024-01-01", "2024-01-02", "2024-01-03"]);
    expect(r.columns.close).toEqual([100, 101.5, 99.8]);
    expect(r.columns.volume).toEqual([5000, 6200, 4100]);
  });

  it("handles all-numeric first column as data", () => {
    const csv = "x,y\n1,2\n2,4\n3,6";
    const r = parseCsv(csv);
    expect(r.columns.x).toEqual([1, 2, 3]);
    expect(r.columns.y).toEqual([2, 4, 6]);
    expect(r.dates).toEqual(["1", "2", "3"]);
  });

  it("supports semicolon separator and quoted headers", () => {
    const csv = '"date";"value"\n2024-01-01;10\n2024-01-02;20';
    const r = parseCsv(csv);
    expect(r.columns.value).toEqual([10, 20]);
  });

  it("throws on empty / header-only input", () => {
    expect(() => parseCsv("date,value")).toThrow();
  });

  it("drops non-numeric columns", () => {
    const csv = "date,name,value\n2024-01-01,foo,1\n2024-01-02,bar,2";
    const r = parseCsv(csv);
    expect(r.columns.name).toBeUndefined();
    expect(r.columns.value).toEqual([1, 2]);
  });
});

describe("applyTransform", () => {
  const v = [100, 110, 99];

  it("simpleReturns", () => {
    const r = applyTransform(v, "simpleReturns");
    expect(r[0]).toBeCloseTo(0.1);
    expect(r[1]).toBeCloseTo(-0.1);
  });

  it("logReturns", () => {
    const r = applyTransform(v, "logReturns");
    expect(r[0]).toBeCloseTo(Math.log(1.1));
  });

  it("diff", () => {
    expect(applyTransform(v, "diff")).toEqual([10, -11]);
  });

  it("zscore has ~0 mean and 1 std", () => {
    const r = applyTransform([1, 2, 3, 4, 5], "zscore");
    const mean = r.reduce((s, x) => s + x, 0) / r.length;
    expect(mean).toBeCloseTo(0);
    expect(Math.max(...r)).toBeCloseTo(-Math.min(...r));
  });

  it("cumsum", () => {
    expect(applyTransform([1, 2, 3], "cumsum")).toEqual([1, 3, 6]);
  });

  it("none passes through", () => {
    expect(applyTransform(v, "none")).toEqual(v);
  });
});

describe("seriesStats", () => {
  it("computes basic stats ignoring non-finite", () => {
    const s = seriesStats([1, 2, 3, NaN, Infinity]);
    expect(s.n).toBe(3);
    expect(s.mean).toBeCloseTo(2);
    expect(s.min).toBe(1);
    expect(s.max).toBe(3);
  });
});

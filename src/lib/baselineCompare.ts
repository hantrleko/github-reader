/**
 * Baseline vs current comparison for the three teaching-path labs.
 *
 * Pure, framework-free helpers. A lab hands over the results it already
 * computes (no parallel formulas live here); the visitor pins them as a
 * baseline, changes inputs, and each key result is shown as
 * baseline / current / difference.
 *
 * Unit rules
 * - "pct" metrics are percentages (e.g. 10.2 means 10.2%). Their difference is
 *   current − baseline in percentage points ("pp"), never a % change.
 * - "plain" metrics carry their unit in the label (β̂, price units per option);
 *   their difference is an absolute difference in that same unit.
 * Missing rules: a non-finite or absent value is "no result" — shown as a dash,
 * never as 0 — and any difference involving it is also "no result".
 *
 * Reset rule (one rule for all three labs): Reset restores the default
 * scenario AND clears the pinned baseline.
 */
import type { PathLabId } from "@/lib/teachingPath";

export type MetricUnit = "pct" | "plain";
export type DiffKind = "pp" | "abs";
export type MaybeNum = number | null | undefined;

export interface MetricSpec {
  id: string;
  /** i18n key for the row label (must name the unit for "plain" metrics). */
  labelKey: string;
  unit: MetricUnit;
  digits: number;
}
export interface ParamSpec {
  id: string;
  labelKey: string;
  /** Display transform, e.g. 0.2 → 20 for a vol shown in %. */
  scale?: number;
  digits: number;
  suffix?: string;
}
export type Values = Record<string, MaybeNum>;
export interface Snapshot { params: Record<string, number>; metrics: Values }

export const isNum = (v: MaybeNum): v is number => typeof v === "number" && Number.isFinite(v);

export const diffKind = (unit: MetricUnit): DiffKind => (unit === "pct" ? "pp" : "abs");

/** current − baseline, or null when either side has no result. */
export function diffValue(base: MaybeNum, cur: MaybeNum): number | null {
  return isNum(base) && isNum(cur) ? cur - base : null;
}

const MINUS = "\u2212";
/** Fixed-digit number with a typographic minus; −0 and values that round to 0 print as 0. */
export function fmtNum(v: MaybeNum, digits: number): string | null {
  if (!isNum(v)) return null;
  const r = Number(v.toFixed(digits));
  if (r === 0) return (0).toFixed(digits);
  return (r < 0 ? MINUS : "") + Math.abs(r).toFixed(digits);
}
/** Signed difference: "+0.41", "−1.20", or "0.00" when it rounds to zero. */
export function fmtSigned(v: MaybeNum, digits: number): string | null {
  if (!isNum(v)) return null;
  const r = Number(v.toFixed(digits));
  if (r === 0) return (0).toFixed(digits);
  return (r > 0 ? "+" : MINUS) + Math.abs(r).toFixed(digits);
}

export interface CompareRow {
  spec: MetricSpec;
  base: string | null;
  cur: string | null;
  diff: string | null;
  kind: DiffKind;
  raw: { base: number | null; cur: number | null; diff: number | null };
}

/** Value text with its unit; diff text with "pp" for percentage metrics. */
export function compareRow(spec: MetricSpec, base: MaybeNum, cur: MaybeNum, ppUnit = "pp"): CompareRow {
  const d = diffValue(base, cur);
  const kind = diffKind(spec.unit);
  const val = (v: MaybeNum) => {
    const s = fmtNum(v, spec.digits);
    return s === null ? null : spec.unit === "pct" ? `${s}%` : s;
  };
  const ds = fmtSigned(d, spec.digits);
  return {
    spec,
    base: val(base),
    cur: val(cur),
    diff: ds === null ? null : kind === "pp" ? `${ds} ${ppUnit}` : ds,
    kind,
    raw: { base: isNum(base) ? base : null, cur: isNum(cur) ? cur : null, diff: d },
  };
}

/** Parameters whose value differs between the pinned baseline and now. */
export function changedParams(base: Record<string, number>, cur: Record<string, number>): string[] {
  return Object.keys(cur).filter((k) => !(k in base) || Math.abs(cur[k] - base[k]) > 1e-12);
}

export function fmtParam(spec: ParamSpec, v: number): string {
  return `${fmtNum(v * (spec.scale ?? 1), spec.digits)}${spec.suffix ?? ""}`;
}

/* ───────────── per-lab specs: which existing outputs are compared ───────────── */

export const COMPARE_PARAMS: Record<PathLabId, ParamSpec[]> = {
  olsiv: [
    { id: "n", labelKey: "compare.param.olsiv.n", digits: 0 },
    { id: "trueBeta", labelKey: "compare.param.olsiv.trueBeta", digits: 2 },
    { id: "endo", labelKey: "compare.param.olsiv.endo", digits: 2 },
    { id: "zStrength", labelKey: "compare.param.olsiv.zStrength", digits: 2 },
    { id: "seed", labelKey: "compare.param.olsiv.seed", digits: 0 },
  ],
  capm: [
    { id: "rf", labelKey: "compare.param.capm.rf", digits: 2, suffix: "%" },
    { id: "erm", labelKey: "compare.param.capm.erm", digits: 2, suffix: "%" },
    { id: "beta", labelKey: "compare.param.capm.beta", digits: 2 },
    { id: "actual", labelKey: "compare.param.capm.actual", digits: 2, suffix: "%" },
  ],
  hedge: [
    { id: "sigmaPricing", labelKey: "compare.param.hedge.sigmaPricing", scale: 100, digits: 0, suffix: "%" },
    { id: "sigmaReal", labelKey: "compare.param.hedge.sigmaReal", scale: 100, digits: 0, suffix: "%" },
    { id: "nSteps", labelKey: "compare.param.hedge.nSteps", digits: 0 },
    { id: "cost", labelKey: "compare.param.hedge.cost", scale: 10000, digits: 1, suffix: " bp" },
  ],
};

export const COMPARE_METRICS: Record<PathLabId, MetricSpec[]> = {
  olsiv: [
    { id: "olsBeta", labelKey: "compare.metric.olsiv.olsBeta", unit: "plain", digits: 3 },
    { id: "ivBeta", labelKey: "compare.metric.olsiv.ivBeta", unit: "plain", digits: 3 },
    { id: "olsBias", labelKey: "compare.metric.olsiv.olsBias", unit: "plain", digits: 3 },
    { id: "olsSe", labelKey: "compare.metric.olsiv.olsSe", unit: "plain", digits: 3 },
    { id: "ivSe", labelKey: "compare.metric.olsiv.ivSe", unit: "plain", digits: 3 },
  ],
  capm: [
    { id: "required", labelKey: "compare.metric.capm.required", unit: "pct", digits: 2 },
    { id: "alpha", labelKey: "compare.metric.capm.alpha", unit: "pct", digits: 2 },
    { id: "prem", labelKey: "compare.metric.capm.prem", unit: "pct", digits: 2 },
    { id: "treynor", labelKey: "compare.metric.capm.treynor", unit: "plain", digits: 2 },
  ],
  hedge: [
    { id: "meanPnL", labelKey: "compare.metric.hedge.meanPnL", unit: "plain", digits: 3 },
    { id: "stdPnL", labelKey: "compare.metric.hedge.stdPnL", unit: "plain", digits: 3 },
    { id: "vega", labelKey: "compare.metric.hedge.vega", unit: "plain", digits: 3 },
    { id: "cost", labelKey: "compare.metric.hedge.cost", unit: "plain", digits: 3 },
  ],
};

/* Adapters from each lab's existing result objects (no recomputation). */
export const olsivMetrics = (trueBeta: number, r: { olsBeta: MaybeNum; ivBeta: MaybeNum; olsSe: MaybeNum; ivSe: MaybeNum }): Values => ({
  olsBeta: r.olsBeta, ivBeta: r.ivBeta, olsBias: isNum(r.olsBeta) ? r.olsBeta - trueBeta : null, olsSe: r.olsSe, ivSe: r.ivSe,
});
export const capmMetrics = (r: { required: MaybeNum; alpha: MaybeNum; prem: MaybeNum; treynor: MaybeNum }): Values => ({
  required: r.required, alpha: r.alpha, prem: r.prem, treynor: r.treynor,
});
export const hedgeMetrics = (r: { meanPnL: MaybeNum; stdPnL: MaybeNum; attribution: { vega: MaybeNum; transactionCost: MaybeNum } }): Values => ({
  meanPnL: r.meanPnL, stdPnL: r.stdPnL, vega: r.attribution.vega, cost: r.attribution.transactionCost,
});

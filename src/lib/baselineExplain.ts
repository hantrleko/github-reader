/**
 * Deterministic "why did it change / what not to conclude" notes for the
 * baseline-vs-current panel of the three teaching-path labs.
 *
 * Pure and framework-free. It only reads what the comparison already holds:
 * the pinned and current inputs and the rows built by `compareRow` from each
 * lab's own outputs. No second formula path, no new numbers — every value in
 * the text is one of the panel's formatted strings (baseline / current /
 * difference, with pp vs absolute units).
 *
 * Rules
 * - No baseline → no explanation (the panel keeps its hint).
 * - No input changed → "results match the baseline", nothing else.
 * - Inputs changed but every comparable difference rounds to 0 → say so,
 *   infer no mechanism. Missing values stay "no result", never 0.
 * - One input changed → a conditional *theory* note for that input, kept
 *   apart from the *observed* numbers of this run. Seed / sample-size changes
 *   are sampling variation, not a causal effect.
 * - Several inputs changed → joint change only; no attribution or ranking.
 * - Lab-specific "do not conclude" notes are always included when anything
 *   changed.
 */
import type { PathLabId } from "@/lib/teachingPath";
import { HEDGE_FIXED } from "@/lib/teachingPath";
import {
  COMPARE_METRICS, COMPARE_PARAMS, changedParams, compareRow, fmtParam, isNum,
  type CompareRow, type Snapshot, type Values,
} from "@/lib/baselineCompare";

/** An i18n message: plain vars, vars that are themselves i18n keys, and lists of messages joined with the list separator. */
export interface Msg {
  key: string;
  vars?: Record<string, string>;
  tvars?: Record<string, string>;
  lists?: Record<string, Msg[]>;
}

export type ExplainKind = "same" | "zero" | "noData" | "one" | "many";

export interface Explanation {
  kind: ExplainKind;
  summary: Msg;
  /** What this run computed (formatted panel values only). */
  observed: Msg[];
  /** What the model says may happen — only for a single non-sampling change. */
  theory: Msg[];
  /** Conclusions that must not be drawn. */
  limits: Msg[];
}

const K = "compare.explain";
/** Inputs that only redraw the random sample. */
const SAMPLING: Partial<Record<PathLabId, string[]>> = { olsiv: ["n", "seed"] };

export const isSamplingParam = (lab: PathLabId, id: string) => (SAMPLING[lab] ?? []).includes(id);

/** A difference that exists and prints as zero at the panel's precision. */
const isZeroRow = (r: CompareRow) => r.diff !== null && isNum(r.raw.diff) && Number(r.raw.diff.toFixed(r.spec.digits)) === 0;

function paramMsg(lab: PathLabId, id: string, base: Snapshot["params"], cur: Snapshot["params"]): Msg {
  const spec = COMPARE_PARAMS[lab].find((p) => p.id === id);
  if (!spec) return { key: `${K}.paramChange`, vars: { label: id, from: String(base[id]), to: String(cur[id]) } };
  return {
    key: `${K}.paramChange`,
    vars: { from: id in base ? fmtParam(spec, base[id]) : "—", to: fmtParam(spec, cur[id]) },
    tvars: { label: spec.labelKey },
  };
}

function observedLines(rows: CompareRow[]): Msg[] {
  const out: Msg[] = [];
  const zero: Msg[] = [];
  for (const r of rows) {
    const label = { label: r.spec.labelKey };
    if (r.diff === null) {
      const which = r.base === null && r.cur === null ? "missingBoth" : r.cur === null ? "missingCur" : "missingBase";
      out.push({ key: `${K}.obs.${which}`, vars: { base: r.base ?? "", cur: r.cur ?? "" }, tvars: label });
    } else if (isZeroRow(r)) {
      zero.push({ key: `${K}.label`, tvars: label });
    } else {
      out.push({
        key: `${K}.obs.changed`,
        vars: { base: r.base!, cur: r.cur!, diff: r.diff },
        tvars: { ...label, kind: `compare.kind.${r.kind}` },
      });
    }
  }
  if (zero.length) out.push({ key: `${K}.obs.unchanged`, lists: { list: zero } });
  return out;
}

function limitLines(lab: PathLabId, rows: CompareRow[], base: Snapshot, metrics: Values): Msg[] {
  if (lab === "olsiv") return [{ key: `${K}.limit.olsiv.ivNotBetter` }, { key: `${K}.limit.finite` }];
  if (lab === "capm") {
    const out: Msg[] = [{ key: `${K}.limit.capm.notGuaranteed` }, { key: `${K}.limit.capm.alpha` }];
    const negB = isNum(base.metrics.prem) && base.metrics.prem < 0;
    const negC = isNum(metrics.prem) && metrics.prem < 0;
    if (negB || negC) out.push({ key: `${K}.limit.capm.negPrem`, tvars: { which: `${K}.side.${negB && negC ? "both" : negB ? "base" : "cur"}` } });
    const tr = rows.find((r) => r.spec.id === "treynor");
    if (tr && tr.diff === null) out.push({ key: `${K}.limit.capm.treynorZero` });
    return out;
  }
  return [
    { key: `${K}.limit.hedge.noProfit`, vars: { paths: String(HEDGE_FIXED.nPaths) } },
    { key: `${K}.limit.finite` },
  ];
}

function theoryLines(lab: PathLabId, id: string, base: Snapshot["params"], cur: Snapshot["params"]): Msg[] {
  const dir = cur[id] > (base[id] ?? cur[id]) ? "up" : "down";
  if (lab === "olsiv") {
    if (id === "trueBeta") return [{ key: `${K}.theory.olsiv.trueBeta` }, { key: `${K}.theory.olsiv.sameDraws` }];
    return [{ key: `${K}.theory.olsiv.${id}.${dir}` }, { key: `${K}.theory.olsiv.sameDraws` }];
  }
  if (lab === "capm") return [{ key: `${K}.theory.capm.${id}` }, { key: `${K}.theory.capm.identity` }];
  return [{ key: `${K}.theory.hedge.${id}.${dir}` }];
}

/** Constant facts about a lab that the reader needs to read the numbers (hedge book, vega sign). */
function contextLines(lab: PathLabId): Msg[] {
  if (lab !== "hedge") return [];
  return [
    { key: `${K}.context.hedge.book`, vars: { K: String(HEDGE_FIXED.K), T: String(HEDGE_FIXED.T) } },
    { key: `${K}.context.hedge.vegaSign` },
  ];
}

export function explainBaseline(
  lab: PathLabId, baseline: Snapshot | null, params: Record<string, number>, metrics: Values, ppUnit = "pp",
): Explanation | null {
  if (!baseline) return null;
  const changed = changedParams(baseline.params, params);
  if (changed.length === 0) return { kind: "same", summary: { key: `${K}.summary.same` }, observed: [], theory: [], limits: [] };

  const rows = COMPARE_METRICS[lab].map((s) => compareRow(s, baseline.metrics[s.id], metrics[s.id], ppUnit));
  const observed = [...contextLines(lab), ...observedLines(rows)];
  const limits = limitLines(lab, rows, baseline, metrics);
  const changes = changed.map((id) => paramMsg(lab, id, baseline.params, params));
  const comparable = rows.filter((r) => r.diff !== null);

  if (comparable.length === 0) return { kind: "noData", summary: { key: `${K}.summary.noData`, lists: { list: changes } }, observed, theory: [], limits };
  if (comparable.every(isZeroRow)) return { kind: "zero", summary: { key: `${K}.summary.zero`, lists: { list: changes } }, observed, theory: [], limits };

  if (changed.length > 1) {
    const sampled = changed.filter((id) => isSamplingParam(lab, id));
    if (sampled.length) limits.unshift({ key: `${K}.limit.samplingInMix` });
    return { kind: "many", summary: { key: `${K}.summary.many`, vars: { count: String(changed.length) }, lists: { list: changes } }, observed, theory: [], limits };
  }

  const id = changed[0];
  if (isSamplingParam(lab, id)) {
    const theory: Msg[] = id === "n" ? [{ key: `${K}.theory.olsiv.n` }] : [];
    return { kind: "one", summary: { key: `${K}.summary.oneSampling`, lists: { list: changes } }, observed, theory, limits };
  }
  return { kind: "one", summary: { key: `${K}.summary.one`, lists: { list: changes } }, observed, theory: theoryLines(lab, id, baseline.params, params), limits };
}

type TFn = (key: string, opts?: Record<string, unknown>) => string;

/** Resolve a Msg to text with the active language. */
export function renderMsg(t: TFn, m: Msg): string {
  const vars: Record<string, unknown> = { ...(m.vars ?? {}) };
  for (const [k, key] of Object.entries(m.tvars ?? {})) vars[k] = t(key);
  for (const [k, items] of Object.entries(m.lists ?? {})) vars[k] = items.map((i) => renderMsg(t, i)).join(t("compare.listSep"));
  return t(m.key, { ...vars, interpolation: { escapeValue: false } });
}

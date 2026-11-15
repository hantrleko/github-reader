import { describe, it, expect, beforeEach } from "vitest";
import i18n from "@/i18n";
import en from "@/i18n/locales/en.json";
import { explainBaseline, renderMsg, type Explanation } from "@/lib/baselineExplain";
import { capmMetrics, hedgeMetrics, olsivMetrics, type Snapshot } from "@/lib/baselineCompare";
import { CAPM_DEFAULT, HEDGE_DEFAULT, HEDGE_FIXED, OLSIV_DEFAULT, capmRequired, type CapmState, type HedgeState } from "@/lib/teachingPath";
import { hedgePnLSimulate } from "@/lib/quant/derivAdvanced";

const E = en.compare.explain;
const t = (k: string, o?: Record<string, unknown>) => i18n.t(k, o) as string;
const text = (e: Explanation) => ({
  summary: renderMsg(t, e.summary),
  observed: e.observed.map((m) => renderMsg(t, m)),
  theory: e.theory.map((m) => renderMsg(t, m)),
  limits: e.limits.map((m) => renderMsg(t, m)),
});
const all = (e: Explanation) => { const x = text(e); return [x.summary, ...x.observed, ...x.theory, ...x.limits].join("\n"); };
const keys = (e: Explanation) => [e.summary, ...e.observed, ...e.theory, ...e.limits].map((m) => m.key);

/* Same formulas the CAPM lab uses for its result object (see V31AssetTools). */
const capmRes = (s: CapmState) => {
  const required = capmRequired(s);
  return capmMetrics({ required, alpha: s.actual - required, prem: s.erm - s.rf, treynor: s.beta !== 0 ? (s.actual - s.rf) / s.beta : null });
};
const capmSnap = (s: CapmState): Snapshot => ({ params: { ...s }, metrics: capmRes(s) });
const hedgeRes = (s: HedgeState) => hedgeMetrics(hedgePnLSimulate({
  S: HEDGE_FIXED.S, K: HEDGE_FIXED.K, T: HEDGE_FIXED.T, r: HEDGE_FIXED.r, ...s, nPaths: HEDGE_FIXED.nPaths, seed: HEDGE_FIXED.seed, isCall: true,
}));
const ols = { ...OLSIV_DEFAULT };
const olsBase: Snapshot = { params: ols, metrics: olsivMetrics(1, { olsBeta: 1.41, ivBeta: 1.08, olsSe: 0.05, ivSe: 0.09 }) };

beforeEach(async () => { await i18n.changeLanguage("en"); });

describe("honest empty and edge states", () => {
  it("no baseline pinned → no explanation at all", () => {
    expect(explainBaseline("capm", null, { ...CAPM_DEFAULT }, capmRes(CAPM_DEFAULT))).toBeNull();
  });

  it("no input changed → results match the baseline, no mechanism or caveats", () => {
    const e = explainBaseline("capm", capmSnap(CAPM_DEFAULT), { ...CAPM_DEFAULT }, capmRes(CAPM_DEFAULT))!;
    expect(e.kind).toBe("same");
    expect(text(e).summary).toBe(E.summary.same);
    expect(e.observed).toEqual([]); expect(e.theory).toEqual([]); expect(e.limits).toEqual([]);
  });

  it("inputs changed but every difference is a real zero → no mechanism inferred", () => {
    const cur = { ...ols, endo: 0.5 };
    const e = explainBaseline("olsiv", olsBase, cur, { ...olsBase.metrics })!;
    expect(e.kind).toBe("zero");
    expect(e.theory).toEqual([]);
    expect(text(e).summary).toContain("Endogeneity");
    expect(text(e).summary).toContain("unchanged at the displayed precision");
    expect(text(e).observed.join(" ")).toMatch(/^Unchanged at the displayed precision: OLS β̂/);
  });

  it("β = 0: Treynor is no result, never 0, and gets no directional story", () => {
    const cur = { ...CAPM_DEFAULT, beta: 0 };
    const e = explainBaseline("capm", capmSnap(CAPM_DEFAULT), cur, capmRes(cur))!;
    const x = text(e);
    const tr = x.observed.find((l) => l.startsWith("Treynor"))!;
    expect(tr).toBe("Treynor ratio (% per unit of β): baseline 7.50, current has no result — no difference is stated.");
    expect(tr).not.toMatch(/0\.00|→/);
    expect(x.limits).toContain(E.limit.capm.treynorZero);
  });

  it("a missing side (NaN / null) is no result, not 0", () => {
    const cur = { ...ols, seed: 7 };
    const e = explainBaseline("olsiv", olsBase, cur, { ...olsBase.metrics, ivBeta: NaN, ivSe: null })!;
    const x = text(e).observed;
    expect(x).toContain("IV (2SLS) β̂: baseline 1.080, current has no result — no difference is stated.");
    expect(x.join(" ")).not.toMatch(/IV \(2SLS\) β̂: 1\.080 → 0/);
  });

  it("nothing comparable on both sides → no change described", () => {
    const base: Snapshot = { params: ols, metrics: { olsBeta: null, ivBeta: null, olsBias: null, olsSe: null, ivSe: null } };
    const e = explainBaseline("olsiv", base, { ...ols, endo: 0.1 }, { olsBeta: 1, ivBeta: null, olsBias: 0, olsSe: null, ivSe: null })!;
    expect(e.kind).toBe("noData");
    expect(e.theory).toEqual([]);
  });
});

describe("single-parameter change", () => {
  it("OLS/IV: names the input, quotes the signed absolute difference, keeps theory apart, never says IV is better", () => {
    const cur = { ...ols, endo: 0 };
    const e = explainBaseline("olsiv", olsBase, cur, olsivMetrics(1, { olsBeta: 1.02, ivBeta: 1.05, olsSe: 0.05, ivSe: 0.08 }))!;
    const x = text(e);
    expect(e.kind).toBe("one");
    expect(x.summary).toContain("Endogeneity Cov(x,ε) 0.70 → 0.00");
    expect(x.observed).toContain("OLS bias (β̂ − true β): 0.410 → 0.020 (\u22120.390, absolute diff.)");
    expect(e.theory.map((m) => m.key)).toEqual(["compare.explain.theory.olsiv.endo.down", "compare.explain.theory.olsiv.sameDraws"]);
    expect(x.limits).toContain(E.limit.finite);
    expect(x.limits).toContain(E.limit.olsiv.ivNotBetter);
    const claims = [x.summary, ...x.observed, ...x.theory].join(" ");
    expect(claims).not.toMatch(/more accurate|always|proves?\b/i);
    expect(x.limits.join(" ")).toMatch(/weak instruments/);
    expect(x.limits.join(" ")).toMatch(/exclusion restriction/);
  });

  it("OLS/IV: a seed change is sampling variation, not causal, and gets no mechanism", () => {
    const e = explainBaseline("olsiv", olsBase, { ...ols, seed: 7 }, olsivMetrics(1, { olsBeta: 1.38, ivBeta: 0.97, olsSe: 0.05, ivSe: 0.1 }))!;
    expect(e.summary.key).toBe("compare.explain.summary.oneSampling");
    expect(text(e).summary).toContain("not a causal effect");
    expect(e.theory).toEqual([]);
  });

  it("OLS/IV: an n change is sampling variation; its only theory note is about repeated samples", () => {
    const e = explainBaseline("olsiv", olsBase, { ...ols, n: 800 }, olsivMetrics(1, { olsBeta: 1.4, ivBeta: 1.01, olsSe: 0.02, ivSe: 0.04 }))!;
    expect(text(e).summary).toContain("not a causal effect");
    expect(e.theory.map((m) => m.key)).toEqual(["compare.explain.theory.olsiv.n"]);
  });

  it("CAPM: β change quotes pp differences and says required return is not guaranteed", () => {
    const cur = { ...CAPM_DEFAULT, beta: 2 };
    const e = explainBaseline("capm", capmSnap(CAPM_DEFAULT), cur, capmRes(cur))!;
    const x = text(e);
    expect(x.observed).toContain("CAPM required return: 10.20% → 15.00% (+4.80 pp, percentage-point diff.)");
    expect(x.observed).toContain("Jensen's α: 1.80% → \u22123.00% (\u22124.80 pp, percentage-point diff.)");
    expect(x.observed.join(" ")).toMatch(/^Unchanged at the displayed precision: Market risk premium|Unchanged at the displayed precision: Market risk premium/);
    expect(x.limits).toContain(E.limit.capm.notGuaranteed);
    expect([x.summary, ...x.observed, ...x.theory].join(" ")).not.toMatch(/guarantee|will (earn|return)/i);
    expect(e.limits.some((m) => m.key.endsWith("negPrem"))).toBe(false);
  });

  it("CAPM: a negative market premium is flagged honestly", () => {
    const base = { ...CAPM_DEFAULT, rf: 6 };
    const cur = { ...base, erm: 4 };
    const e = explainBaseline("capm", capmSnap(base), cur, capmRes(cur))!;
    const neg = text(e).limits.find((l) => l.includes("negative"))!;
    expect(neg).toContain("the current scenario (E(Rm) < Rf)");
    expect(neg).toContain("not a market prediction");
  });

  it("hedge: describes the short-call book this tool simulates and promises no profit", () => {
    const cur = { ...HEDGE_DEFAULT, sigmaReal: 0.2 };
    const base: Snapshot = { params: { ...HEDGE_DEFAULT }, metrics: hedgeRes(HEDGE_DEFAULT) };
    const e = explainBaseline("hedge", base, cur, hedgeRes(cur))!;
    const x = text(e);
    expect(x.observed[0]).toContain("you sell one at-the-money call (K = 100, T = 0.5)");
    expect(x.observed[0]).toContain("Positive P&L means this hedged short-call book gained");
    expect(x.observed[1]).toContain("option holder's side");
    const mean = x.observed.find((l) => l.startsWith("Mean P&L"))!;
    expect(mean).toMatch(/^Mean P&L \(price units per option\): \u22122\.\d{3} → [−\d.]+ \(\+\d\.\d{3}, absolute diff\.\)$/);
    expect(e.theory.map((m) => m.key)).toEqual(["compare.explain.theory.hedge.sigmaReal.down"]);
    expect(x.theory[0]).toMatch(/short option/);
    expect(all(e)).not.toMatch(/long (call|option)|buy(s|ing)? the call/i);
    expect(x.limits).toContain(`This is simulated P&L on ${HEDGE_FIXED.nPaths} paths with a fixed seed: not a forecast and no guarantee of future profit. In practice σ_real is unknown when the option is sold.`);
    expect([x.summary, ...x.observed, ...x.theory].join(" ")).not.toMatch(/guarantee|profit/i);
  });

  it("hedge: a step-count change warns that the paths change too", () => {
    const cur = { ...HEDGE_DEFAULT, nSteps: 200 };
    const base: Snapshot = { params: { ...HEDGE_DEFAULT }, metrics: hedgeRes(HEDGE_DEFAULT) };
    const e = explainBaseline("hedge", base, cur, hedgeRes(cur))!;
    expect(text(e).theory[0]).toContain("cannot be split here");
  });
});

describe("several inputs changed", () => {
  it("joint wording only: no theory note and no single-input attribution", () => {
    const cur = { ...CAPM_DEFAULT, beta: 2, actual: 14 };
    const e = explainBaseline("capm", capmSnap(CAPM_DEFAULT), cur, capmRes(cur))!;
    expect(e.kind).toBe("many");
    expect(e.theory).toEqual([]);
    expect(text(e).summary).toBe("2 inputs changed together (Asset β 1.20 → 2.00; Asset return R 12.00% → 14.00%). The differences are their joint result; they cannot be attributed to, or ranked across, any single input.");
    expect(keys(e).some((k) => k.includes(".theory."))).toBe(false);
  });

  it("a seed among several changes adds the sampling caveat", () => {
    const e = explainBaseline("olsiv", olsBase, { ...ols, endo: 0.2, seed: 9 }, olsivMetrics(1, { olsBeta: 1.1, ivBeta: 1, olsSe: 0.05, ivSe: 0.09 }))!;
    expect(e.kind).toBe("many");
    expect(text(e).limits[0]).toBe(E.limit.samplingInMix);
  });
});

describe("language", () => {
  it("relabels the same explanation in Chinese with the zh pp unit", async () => {
    const cur = { ...CAPM_DEFAULT, beta: 2 };
    await i18n.changeLanguage("zh");
    const e = explainBaseline("capm", capmSnap(CAPM_DEFAULT), cur, capmRes(cur), t("compare.ppUnit"))!;
    const x = text(e);
    expect(x.summary).toContain("资产 β 1.20 → 2.00");
    expect(x.observed).toContain("CAPM 要求收益：10.20% → 15.00%（+4.80 个百分点，百分点差）");
    expect(x.limits.join("")).toContain("不是保证收益");
  });
});

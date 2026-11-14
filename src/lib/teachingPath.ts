/**
 * Three-lab teaching path: OLS/IV → CAPM/SML → delta hedging.
 *
 * Pure, framework-free helpers. Each lab keeps its own state; these functions
 * turn the current inputs into i18n keys + interpolation values so the
 * interpretation and comprehension-check answers always match the scenario on
 * screen. Routes point at the existing section pages and tool tabs.
 */
import { blackScholes } from "@/lib/quant/blackScholes";

export type PathLabId = "olsiv" | "capm" | "hedge";

export interface PathStep {
  id: PathLabId;
  /** Existing /s/:sectionId page. */
  section: string;
  /** Existing ?t= tool tab inside that page. */
  tab: string;
  to: string;
}

export const TEACHING_PATH: PathStep[] = [
  { id: "olsiv", section: "econometrics", tab: "olsiv", to: "/s/econometrics?t=olsiv" },
  { id: "capm", section: "asset-pricing", tab: "capm", to: "/s/asset-pricing?t=capm" },
  { id: "hedge", section: "derivatives", tab: "hedge_pnl", to: "/s/derivatives?t=hedge_pnl" },
];

/** Where the "review the path" link after the last lab lands. */
export const PATH_HOME = "/#start";

export function pathIndex(id: PathLabId) {
  return TEACHING_PATH.findIndex((s) => s.id === id);
}
export function nextStep(id: PathLabId): PathStep | null {
  return TEACHING_PATH[pathIndex(id) + 1] ?? null;
}

/** One comprehension question: the question key plus a scenario-specific answer. */
export interface CheckItem {
  id: string;
  answerKey: string;
  vars: Record<string, string>;
}

const f = (x: number, d = 2) => x.toFixed(d);
const sgn = (x: number, d = 2) => (x >= 0 ? "+" : "") + x.toFixed(d);

/* ───────────────────────── 1. OLS / IV ───────────────────────── */
export interface OlsIvState { n: number; trueBeta: number; endo: number; zStrength: number; seed: number }
export const OLSIV_DEFAULT: OlsIvState = { n: 200, trueBeta: 1, endo: 0.7, zStrength: 0.8, seed: 42 };
export interface OlsIvResult { olsBeta: number; ivBeta: number; olsSe: number; ivSe: number }

export function olsivChecks(s: OlsIvState, r: OlsIvResult): CheckItem[] {
  const bias = r.olsBeta - s.trueBeta;
  const base = { ols: f(r.olsBeta), iv: f(r.ivBeta), b: f(s.trueBeta), bias: sgn(bias), endo: f(s.endo), z: f(s.zStrength) };
  const dir = s.endo < 0.05 ? "none" : Math.abs(bias) < 0.05 ? "small" : bias > 0 ? "up" : "down";
  const ratio = r.olsSe > 0 ? r.ivSe / r.olsSe : 0;
  return [
    { id: "direction", answerKey: `path.olsiv.a.direction.${dir}`, vars: base },
    {
      id: "instrument",
      answerKey: `path.olsiv.a.instrument.${s.zStrength < 0.25 ? "weak" : "strong"}`,
      vars: { ...base, seIv: f(r.ivSe, 3), seOls: f(r.olsSe, 3), ratio: f(ratio, 1) },
    },
    { id: "causal", answerKey: "path.olsiv.a.causal", vars: base },
  ];
}

/* ───────────────────────── 2. CAPM / SML ───────────────────────── */
export interface CapmState { rf: number; erm: number; beta: number; actual: number }
export const CAPM_DEFAULT: CapmState = { rf: 3, erm: 9, beta: 1.2, actual: 12 };

export function capmRequired(s: CapmState, beta = s.beta) {
  return s.rf + beta * (s.erm - s.rf);
}

export function capmChecks(s: CapmState): CheckItem[] {
  const req = capmRequired(s);
  const alpha = s.actual - req;
  const pos = Math.abs(alpha) < 0.25 ? "on" : alpha > 0 ? "above" : "below";
  const base = { beta: f(s.beta), req: f(req), actual: f(s.actual), alpha: sgn(alpha), rf: f(s.rf), prem: f(s.erm - s.rf) };
  return [
    { id: "position", answerKey: `path.capm.a.position.${pos}`, vars: base },
    { id: "forecast", answerKey: "path.capm.a.forecast", vars: base },
    {
      id: "doubleBeta",
      answerKey: "path.capm.a.doubleBeta",
      vars: { ...base, beta2: f(s.beta * 2), req2: f(capmRequired(s, s.beta * 2)), diff: f(s.beta * (s.erm - s.rf)) },
    },
  ];
}

/* ───────────────────────── 3. Delta hedge ───────────────────────── */
export interface HedgeState { sigmaPricing: number; sigmaReal: number; nSteps: number; cost: number }
export const HEDGE_DEFAULT: HedgeState = { sigmaPricing: 0.2, sigmaReal: 0.28, nSteps: 50, cost: 0.001 };
/** Fixed contract and simulation settings (documented in the UI). */
export const HEDGE_FIXED = { S: 100, K: 100, T: 0.5, r: 0.02, nPaths: 1500, seed: 42 } as const;

/** Black-Scholes call delta (the hedge ratio) at spot S under the pricing vol. */
export function hedgeDelta(S: number, sigma: number) {
  const { K, T, r } = HEDGE_FIXED;
  return blackScholes({ S, K, T, r, sigma }).deltaCall;
}

export function hedgeDeltaCurve(sigma: number) {
  const out: { S: number; delta: number }[] = [];
  for (let S = 70; S <= 130; S += 2.5) out.push({ S, delta: +hedgeDelta(S, sigma).toFixed(4) });
  return out;
}

export interface HedgeResultLite { meanPnL: number; stdPnL: number }

/** Live one-sentence takeaway key for the hedge lab. */
export function hedgeConclusion(s: HedgeState, r: HedgeResultLite) {
  const gap = s.sigmaReal - s.sigmaPricing;
  const key = Math.abs(gap) < 0.01 ? "flat" : gap > 0 ? "loss" : "gain";
  return {
    key: `flagship.hedge.${key}`,
    vars: { mean: f(r.meanPnL, 3), std: f(r.stdPnL, 3), sp: f(s.sigmaPricing * 100, 0), sr: f(s.sigmaReal * 100, 0), steps: String(s.nSteps) },
  };
}

export function hedgeChecks(s: HedgeState, r: HedgeResultLite): CheckItem[] {
  const d100 = hedgeDelta(100, s.sigmaPricing);
  const d110 = hedgeDelta(110, s.sigmaPricing);
  const gap = s.sigmaReal - s.sigmaPricing;
  return [
    {
      id: "rebalance",
      answerKey: "path.hedge.a.rebalance",
      vars: { d100: f(d100, 3), d110: f(d110, 3), diff: f((d110 - d100) * 100, 1), sp: f(s.sigmaPricing * 100, 0) },
    },
    {
      id: "riskless",
      answerKey: `path.hedge.a.riskless.${Math.abs(gap) < 0.01 ? "match" : "mismatch"}`,
      vars: { std: f(r.stdPnL, 3), mean: f(r.meanPnL, 3), steps: String(s.nSteps), gap: sgn(gap * 100, 0), bp: f(s.cost * 10000, 1) },
    },
  ];
}

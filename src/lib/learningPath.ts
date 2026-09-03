/**
 * The six-stage learning path, bound to real section pages.
 *
 * Each stage lists the sections a reader should work through, in order.
 * Titles/descriptions live in i18n under `learning.stages.<id>`; only the
 * structure lives here so the path stays a single source of truth for the
 * homepage roadmap, the Overview hub and progress tracking.
 */
import { SECTION_MAP, type SectionDef } from "./sections";

export interface LearningStage {
  id: string;
  /** primary domain this stage belongs to (`/d/:groupId`) */
  group: string;
  /** ordered section ids — validated against SECTION_MAP at runtime */
  sections: string[];
}

export const LEARNING_STAGES: LearningStage[] = [
  {
    id: "prob",
    group: "econometrics",
    sections: ["econometrics-theory", "econometrics", "time-series-theory"],
  },
  {
    id: "micro",
    group: "foundations",
    sections: ["micro-theory", "micro", "macro-theory", "macro"],
  },
  {
    id: "fin",
    group: "pricing",
    sections: ["calculator", "derivatives-theory", "implied-vol", "mc-pricer"],
  },
  {
    id: "ap",
    group: "asset-portfolio",
    sections: ["asset-pricing-theory", "asset-pricing", "portfolio-theory", "frontier"],
  },
  {
    id: "risk",
    group: "risk",
    sections: ["risk-theory", "risk", "fixed-income-theory", "fixed-income-lab"],
  },
  {
    id: "adv",
    group: "quant-trading",
    sections: ["quant-theory", "qlib-guide", "qlib-lab", "backtest"],
  },
];

/** Resolve a stage's section ids to definitions, dropping unknown ids. */
export const stageSections = (stage: LearningStage): SectionDef[] =>
  stage.sections.map((id) => SECTION_MAP[id]).filter(Boolean);

/** Every section id referenced by the path (deduped, in order). */
export const learningPathSectionIds = (): string[] =>
  Array.from(new Set(LEARNING_STAGES.flatMap((s) => s.sections)));

/** Section ids referenced by the path that do not exist — should be empty. */
export const invalidLearningSectionIds = (): string[] =>
  learningPathSectionIds().filter((id) => !SECTION_MAP[id]);

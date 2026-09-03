import { describe, it, expect } from "vitest";
import { LEARNING_STAGES, invalidLearningSectionIds, stageSections } from "@/lib/learningPath";
import { NAV_GROUPS } from "@/lib/sections";

describe("learning path", () => {
  it("references only existing sections", () => {
    expect(invalidLearningSectionIds()).toEqual([]);
  });

  it("has six stages, each with at least two resolvable sections", () => {
    expect(LEARNING_STAGES).toHaveLength(6);
    for (const stage of LEARNING_STAGES) {
      expect(stageSections(stage).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("points every stage at a real domain group", () => {
    const ids = new Set(NAV_GROUPS.map((g) => g.id));
    for (const stage of LEARNING_STAGES) expect(ids.has(stage.group)).toBe(true);
  });
});

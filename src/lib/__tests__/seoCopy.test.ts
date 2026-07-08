import { describe, it, expect } from "vitest";
import { SECTIONS } from "@/lib/sections";
import {
  SEO_RULES,
  TITLE_SUFFIX,
  sectionSeo,
  validateSection,
  validateHome,
  validateAllCopy,
  HOME_SEO,
} from "@/lib/seoCopy";

describe("copy consistency — landing page", () => {
  it("home SEO obeys unified rules", () => {
    expect(validateHome()).toEqual([]);
  });
});

describe("copy consistency — every section", () => {
  it.each(SECTIONS.map((s) => [s.id, s] as const))(
    "section %s uses unified editorial + SEO format",
    (_id, def) => {
      expect(validateSection(def)).toEqual([]);
    },
  );

  it("section titles stay within SEO length + brand suffix", () => {
    for (const def of SECTIONS) {
      const { title } = sectionSeo(def);
      expect(title.endsWith(TITLE_SUFFIX)).toBe(true);
      expect(title.length).toBeLessThanOrEqual(SEO_RULES.title.max);
    }
  });

  it("section descriptions stay within meta length", () => {
    for (const def of SECTIONS) {
      const { description } = sectionSeo(def);
      expect(description.length).toBeLessThanOrEqual(SEO_RULES.description.max);
    }
  });
});

describe("copy consistency — full report", () => {
  it("no issues across the whole site", () => {
    const issues = validateAllCopy();
    // Fail with a readable report if anything drifts from the style rules.
    expect(issues, JSON.stringify(issues, null, 2)).toEqual([]);
  });

  it("home og copy is brand-free and distinct from title", () => {
    expect(HOME_SEO.ogTitle).not.toContain("EF Lab");
  });
});

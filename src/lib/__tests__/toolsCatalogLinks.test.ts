import { describe, it, expect } from "vitest";
import { TOOLS_CATALOG } from "@/data/toolsCatalog";
import { HOME_IDS, isSectionId, sectionHref } from "@/lib/sections";

const baseId = (anchor: string) => {
  const q = anchor.indexOf("?");
  const raw = q >= 0 ? anchor.slice(0, q) : anchor;
  return raw.replace(/^\/?#/, "");
};

describe("tools catalog links", () => {
  it("every anchor resolves to a real section page or a home anchor", () => {
    for (const t of TOOLS_CATALOG) {
      const id = baseId(t.anchor);
      expect(
        isSectionId(id) || HOME_IDS.includes(id),
        `tool "${t.id}" points at unknown anchor "${t.anchor}"`
      ).toBe(true);
    }
  });

  it("section anchors are rewritten to /s/<id> routes, preserving ?t=", () => {
    expect(sectionHref("/#macro-lab?t=debt")).toBe("/s/macro-lab?t=debt");
    expect(sectionHref("/#micro")).toBe("/s/micro");
    expect(sectionHref("/#topics")).toBe("/#topics");
    for (const t of TOOLS_CATALOG) {
      const id = baseId(t.anchor);
      if (isSectionId(id)) expect(sectionHref(t.anchor).startsWith(`/s/${id}`)).toBe(true);
    }
  });
});

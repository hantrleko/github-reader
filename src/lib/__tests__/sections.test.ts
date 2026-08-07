import { describe, it, expect } from "vitest";
import {
  SECTIONS,
  NAV_GROUPS,
  GROUP_OF,
  UNGROUPED_SECTION_IDS,
  sectionsByGroup,
  groupEntryHref,
  HOME_IDS,
  SECTION_MAP,
} from "../sections";

describe("unified information architecture", () => {
  it("assigns every section to exactly one domain", () => {
    expect(UNGROUPED_SECTION_IDS).toEqual([]);
    const seen = new Set<string>();
    for (const g of NAV_GROUPS) {
      for (const id of g.items) {
        expect(seen.has(id), `duplicate nav item: ${id}`).toBe(false);
        seen.add(id);
      }
    }
    for (const s of SECTIONS) expect(GROUP_OF[s.id]).toBeTruthy();
  });

  it("only references real section ids or home anchors", () => {
    for (const g of NAV_GROUPS) {
      for (const id of g.items) {
        expect(Boolean(SECTION_MAP[id]) || HOME_IDS.includes(id), `unknown id: ${id}`).toBe(true);
      }
    }
  });

  it("uses unique ordered domain codes", () => {
    const codes = NAV_GROUPS.map((g) => g.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect([...codes].sort()).toEqual(codes);
  });

  it("gives every domain a working entry route", () => {
    for (const g of NAV_GROUPS) expect(groupEntryHref(g)).toMatch(/^\/(s\/.+)?$/);
  });

  it("keeps directory groups aligned with NAV_GROUPS order", () => {
    const dir = sectionsByGroup().map((e) => e.group.id);
    const expected = NAV_GROUPS.filter((g) => g.items.some((id) => SECTION_MAP[id])).map((g) => g.id);
    expect(dir).toEqual(expected);
  });
});

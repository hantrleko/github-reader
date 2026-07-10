import { describe, it, expect } from "vitest";
import { buildSearchIndex, searchDocs } from "@/lib/searchIndex";
import { TOPIC_CONNECTIONS } from "@/data/topicConnections";
import { topicsData } from "@/data/topicsData";
import { GLOSSARY } from "@/data/glossary";
import { PAPERS } from "@/data/papers";
import { STRATEGIES } from "@/data/strategies";
import { WORKFLOWS } from "@/data/workflows";
import { TOOLS_BY_ID } from "@/data/toolsCatalog";
import { isSectionId, HOME_IDS } from "@/lib/sections";

describe("searchIndex", () => {
  it("indexes every content silo", () => {
    const docs = buildSearchIndex();
    const kinds = new Set(docs.map((d) => d.kind));
    for (const k of ["page", "tool", "topic", "knowledge", "glossary", "paper", "strategy", "workflow"]) {
      expect(kinds.has(k as never), `missing kind ${k}`).toBe(true);
    }
    // Rough lower bound: 78 tools + 9 topics + 100 KPs + 45 terms + 48 papers + 18 strategies + 8 workflows
    expect(docs.length).toBeGreaterThan(280);
  });

  it("has unique doc ids", () => {
    const docs = buildSearchIndex();
    expect(new Set(docs.map((d) => d.id)).size).toBe(docs.length);
  });

  it("finds content by english keyword across silos", () => {
    const hits = searchDocs("prospect");
    expect(hits.length).toBeGreaterThan(0);
    // prospect theory exists as a tool and as the loss-aversion glossary formula context
    expect(hits.some((h) => h.kind === "tool" || h.kind === "paper")).toBe(true);
  });

  it("finds glossary terms by english name", () => {
    const hits = searchDocs("expected shortfall");
    expect(hits.some((h) => h.kind === "glossary")).toBe(true);
  });

  it("finds papers by author", () => {
    const hits = searchDocs("kahneman");
    expect(hits.some((h) => h.kind === "paper")).toBe(true);
  });

  it("finds tools by chinese name", () => {
    const hits = searchDocs("隐含波动率");
    expect(hits.some((h) => h.kind === "tool")).toBe(true);
  });

  it("multi-token queries require all tokens", () => {
    const hits = searchDocs("garch dcc");
    for (const h of hits) {
      expect(h.haystack.includes("garch") || h.title.toLowerCase().includes("garch")).toBe(true);
    }
  });

  it("returns empty for blank query", () => {
    expect(searchDocs("   ")).toEqual([]);
  });
});

describe("topicConnections cross-reference integrity", () => {
  const glossarySlugs = new Set(GLOSSARY.map((g) => g.slug));
  const paperSlugs = new Set(PAPERS.map((p) => p.slug));
  const strategySlugs = new Set(STRATEGIES.map((s) => s.slug));
  const workflowIds = new Set(WORKFLOWS.map((w) => w.id));
  const topicIds = new Set(topicsData.map((t) => t.id));

  it("every connection key is a real topic id", () => {
    for (const key of Object.keys(TOPIC_CONNECTIONS)) {
      expect(topicIds.has(key), `unknown topic ${key}`).toBe(true);
    }
  });

  it("every topic has a connections entry", () => {
    for (const t of topicsData) {
      expect(TOPIC_CONNECTIONS[t.id], `topic ${t.id} lacks connections`).toBeTruthy();
    }
  });

  it("all referenced slugs exist", () => {
    for (const [topic, conn] of Object.entries(TOPIC_CONNECTIONS)) {
      for (const s of conn.glossary ?? []) expect(glossarySlugs.has(s), `${topic}: glossary ${s}`).toBe(true);
      for (const s of conn.papers ?? []) expect(paperSlugs.has(s), `${topic}: paper ${s}`).toBe(true);
      for (const s of conn.strategies ?? []) expect(strategySlugs.has(s), `${topic}: strategy ${s}`).toBe(true);
      for (const s of conn.workflows ?? []) expect(workflowIds.has(s), `${topic}: workflow ${s}`).toBe(true);
    }
  });
});

describe("topicsData tool links integrity", () => {
  it("every knowledge-point tool id resolves to a section, home anchor, or catalog tool", () => {
    for (const topic of topicsData) {
      for (const kp of topic.knowledgePoints) {
        if (!kp.tool) continue;
        const ok =
          isSectionId(kp.tool.id) ||
          HOME_IDS.includes(kp.tool.id) ||
          Boolean(TOOLS_BY_ID[kp.tool.id]);
        expect(ok, `${topic.id} → "${kp.title}" links unknown tool "${kp.tool.id}"`).toBe(true);
      }
    }
  });
});

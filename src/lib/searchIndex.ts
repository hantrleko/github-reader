/**
 * Unified search index — weaves the platform's six content silos
 * (tools, topics, glossary, papers, strategies, workflows) into one
 * searchable knowledge network. Consumed by the global ⌘K palette.
 *
 * Built lazily on first access and cached at module level: all sources
 * are static in-repo data, so a single pass is enough.
 */
import { TOOLS_CATALOG } from "@/data/toolsCatalog";
import { topicsData } from "@/data/topicsData";
import { GLOSSARY } from "@/data/glossary";
import { PAPERS } from "@/data/papers";
import { STRATEGIES } from "@/data/strategies";
import { WORKFLOWS } from "@/data/workflows";
import { sectionHref } from "@/lib/sections";
import { KIND_LABELS, type SearchDoc } from "@/lib/searchIndexTypes";

export type { SearchKind, SearchDoc } from "@/lib/searchIndexTypes";
export { KIND_LABELS } from "@/lib/searchIndexTypes";

const STATIC_PAGES: Array<{ id: string; title: string; subtitle?: string; href: string; extra?: string }> = [
  { id: "home", title: "首页", subtitle: "Home", href: "/", extra: "index landing" },
  { id: "tools", title: "工具目录", subtitle: "Tools Catalog", href: "/tools", extra: "catalog 全部工具" },
  { id: "workflows", title: "研究工作流", subtitle: "Workflows", href: "/workflows", extra: "playbook 剧本" },
  { id: "glossary", title: "术语表", subtitle: "Glossary", href: "/glossary", extra: "词典 定义" },
  { id: "papers", title: "论文索引", subtitle: "Paper Index", href: "/papers", extra: "文献 references" },
  { id: "strategies", title: "策略库", subtitle: "Strategy Library", href: "/strategies", extra: "quant 量化策略" },
  { id: "notebook", title: "Notebook", subtitle: "研究笔记", href: "/notebook", extra: "笔记本 复现" },
  { id: "notebook-templates", title: "Notebook 模板", subtitle: "Templates", href: "/notebook/templates", extra: "模板库" },
  { id: "changelog", title: "更新日志", subtitle: "Changelog", href: "/changelog", extra: "版本 release" },
  { id: "github", title: "GitHub Explorer", subtitle: "仓库浏览", href: "/github", extra: "repo 代码" },
];

let CACHE: SearchDoc[] | null = null;

const norm = (...parts: Array<string | undefined>) =>
  parts.filter(Boolean).join(" ").toLowerCase();

export function buildSearchIndex(): SearchDoc[] {
  if (CACHE) return CACHE;
  const docs: SearchDoc[] = [];

  // Pages
  for (const p of STATIC_PAGES) {
    docs.push({
      kind: "page",
      id: `page:${p.id}`,
      title: p.title,
      subtitle: p.subtitle,
      href: p.href,
      haystack: norm(p.title, p.subtitle, p.extra, p.href),
      group: KIND_LABELS.page,
    });
  }

  // Tools (78+). The catalog may re-list an id under two categories
  // (e.g. "backtest" under quant and platform) — index each id once.
  const seenTools = new Set<string>();
  for (const t of TOOLS_CATALOG) {
    if (seenTools.has(t.id)) continue;
    seenTools.add(t.id);
    docs.push({
      kind: "tool",
      id: `tool:${t.id}`,
      title: t.name,
      subtitle: t.nameEn,
      href: sectionHref(t.anchor),
      haystack: norm(t.name, t.nameEn, t.blurb, t.tags.join(" "), t.category, t.id),
      group: KIND_LABELS.tool,
    });
  }

  // Topics + their knowledge points
  for (const topic of topicsData) {
    docs.push({
      kind: "topic",
      id: `topic:${topic.id}`,
      title: topic.title,
      subtitle: topic.subtitle,
      href: `/topic/${topic.id}`,
      haystack: norm(topic.title, topic.subtitle, topic.desc, topic.tags.join(" "), topic.id),
      group: KIND_LABELS.topic,
    });
    topic.knowledgePoints.forEach((kp, i) => {
      docs.push({
        kind: "knowledge",
        id: `kp:${topic.id}:${i}`,
        title: kp.title,
        subtitle: topic.title,
        href: `/topic/${topic.id}#kp-${i + 1}`,
        haystack: norm(kp.title, kp.content.slice(0, 120), topic.title),
        group: KIND_LABELS.knowledge,
      });
    });
  }

  // Glossary
  for (const g of GLOSSARY) {
    docs.push({
      kind: "glossary",
      id: `glossary:${g.slug}`,
      title: g.zh,
      subtitle: g.en,
      href: `/glossary#${g.slug}`,
      haystack: norm(g.zh, g.en, g.def.slice(0, 120), g.slug, g.category),
      group: KIND_LABELS.glossary,
    });
  }

  // Papers
  for (const p of PAPERS) {
    docs.push({
      kind: "paper",
      id: `paper:${p.slug}`,
      title: p.title,
      subtitle: `${p.authors} (${p.year})`,
      href: `/papers#${p.slug}`,
      haystack: norm(p.title, p.authors, String(p.year), p.contribution, p.topics.join(" ")),
      group: KIND_LABELS.paper,
    });
  }

  // Strategies
  for (const s of STRATEGIES) {
    docs.push({
      kind: "strategy",
      id: `strategy:${s.slug}`,
      title: s.name,
      subtitle: s.nameEn,
      href: `/strategies#${s.slug}`,
      haystack: norm(s.name, s.nameEn, s.oneLiner, s.edge.slice(0, 100), s.category),
      group: KIND_LABELS.strategy,
    });
  }

  // Workflows
  for (const w of WORKFLOWS) {
    docs.push({
      kind: "workflow",
      id: `workflow:${w.id}`,
      title: w.title,
      subtitle: w.titleEn,
      href: `/workflows?w=${w.id}`,
      haystack: norm(w.title, w.titleEn, w.blurb.slice(0, 120), w.id),
      group: KIND_LABELS.workflow,
    });
  }

  CACHE = docs;
  return docs;
}

/**
 * Rank documents for a query. Simple deterministic scoring:
 * exact-prefix on title > substring on title > substring anywhere.
 * Multi-token queries require every token to match somewhere.
 */
export function searchDocs(query: string, limit = 40): SearchDoc[] {
  const docs = buildSearchIndex();
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);

  const scored: Array<{ doc: SearchDoc; score: number }> = [];
  for (const doc of docs) {
    let score = 0;
    let ok = true;
    const titleLc = doc.title.toLowerCase();
    const subLc = (doc.subtitle ?? "").toLowerCase();
    for (const tok of tokens) {
      if (titleLc.startsWith(tok)) score += 8;
      else if (titleLc.includes(tok)) score += 5;
      else if (subLc.includes(tok)) score += 3;
      else if (doc.haystack.includes(tok)) score += 1;
      else {
        ok = false;
        break;
      }
    }
    if (ok) scored.push({ doc, score });
  }

  // Prefer concise, navigational kinds when scores tie.
  const kindBoost: Partial<Record<SearchKind, number>> = {
    page: 0.6,
    tool: 0.5,
    topic: 0.5,
    workflow: 0.3,
    glossary: 0.2,
  };
  scored.sort(
    (a, b) =>
      b.score + (kindBoost[b.doc.kind] ?? 0) - (a.score + (kindBoost[a.doc.kind] ?? 0))
  );
  return scored.slice(0, limit).map((s) => s.doc);
}

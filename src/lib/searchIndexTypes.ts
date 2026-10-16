/**
 * Types and labels for the unified search index, split out so the global
 * ⌘K palette can reference them without statically importing the index
 * itself (which pulls in ~300KB of catalog data). The implementation lives
 * in `./searchIndex` and is loaded on demand.
 */
export type SearchKind =
  | "tool"
  | "topic"
  | "knowledge"
  | "glossary"
  | "paper"
  | "strategy"
  | "workflow"
  | "page";

export interface SearchDoc {
  kind: SearchKind;
  /** stable unique id: `${kind}:${slug}` */
  id: string;
  /** primary display label (zh) */
  title: string;
  /** secondary label (en / subtitle) */
  subtitle?: string;
  /** router path to navigate to */
  href: string;
  /** lowercase haystack used for matching */
  haystack: string;
  /** group heading in the palette */
  group: string;
}

export const KIND_LABELS: Record<SearchKind, string> = {
  page: "页面 · Pages",
  tool: "交互工具 · Tools",
  topic: "学科主题 · Topics",
  knowledge: "知识点 · Knowledge",
  glossary: "术语 · Glossary",
  paper: "论文 · Papers",
  strategy: "策略 · Strategies",
  workflow: "工作流 · Workflows",
};

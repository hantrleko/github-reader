import { REFS, type Citation } from "./citations";

/**
 * Format a citation in APA 7th style.
 * Example: Black, F. & Scholes, M. (1973). The Pricing of Options...
 *          Journal of Political Economy 81(3), 637–654. https://doi.org/10.1086/260062
 */
export function formatAPA(c: Citation): string {
  const parts = [`${c.authors} (${c.year}). ${c.title}.`];
  if (c.journal) parts.push(`${c.journal}.`);
  if (c.doi) parts.push(`https://doi.org/${c.doi}`);
  else if (c.url) parts.push(c.url);
  return parts.join(" ");
}

/**
 * Format as BibTeX `@article{key, ...}` entry.
 * Key derived from first-author surname + year.
 */
export function formatBibTeX(c: Citation): string {
  const firstAuthor = c.authors.split(",")[0].trim().replace(/\s+/g, "");
  const key = `${firstAuthor.toLowerCase()}${c.year}`;
  const fields: [string, string][] = [
    ["author", c.authors.replace(/&/g, "and")],
    ["title", `{${c.title}}`],
    ["year", String(c.year)],
  ];
  if (c.journal) fields.push(["journal", c.journal]);
  if (c.doi) fields.push(["doi", c.doi]);
  if (c.url) fields.push(["url", c.url]);
  const body = fields.map(([k, v]) => `  ${k} = {${v}}`).join(",\n");
  return `@article{${key},\n${body}\n}`;
}

export function formatAPAById(id: string): string | null {
  const c = REFS[id];
  return c ? formatAPA(c) : null;
}

export function formatBibTeXById(id: string): string | null {
  const c = REFS[id];
  return c ? formatBibTeX(c) : null;
}

/** Bulk export — useful for tool footers that cite multiple papers. */
export function exportAllAPA(ids: string[]): string {
  return ids
    .map((id) => formatAPAById(id))
    .filter((s): s is string => !!s)
    .join("\n\n");
}

export function exportAllBibTeX(ids: string[]): string {
  return ids
    .map((id) => formatBibTeXById(id))
    .filter((s): s is string => !!s)
    .join("\n\n");
}
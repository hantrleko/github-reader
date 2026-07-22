/**
 * Import a Jupyter `.ipynb` (v4) into Reactive Notebook cells.
 * - markdown cells → markdown
 * - code cells → python cells (executable via the Pyodide kernel)
 */

export interface ImportedCell {
  id: string;
  kind: "markdown" | "python";
  text?: string;
  body?: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const joinSource = (src: unknown): string =>
  Array.isArray(src) ? src.join("") : typeof src === "string" ? src : "";

export function importIpynb(json: string): { title: string; cells: ImportedCell[] } {
  const nb = JSON.parse(json);
  if (!nb || !Array.isArray(nb.cells)) throw new Error("不是有效的 .ipynb 文件");

  const cells: ImportedCell[] = [];
  let title = "Imported Notebook";
  let titleFound = false;

  for (const c of nb.cells) {
    const src = joinSource(c.source).trimEnd();
    if (!src) continue;
    if (c.cell_type === "markdown") {
      if (!titleFound) {
        const m = src.match(/^#\s+(.+)$/m);
        if (m) {
          title = m[1].trim();
          titleFound = true;
        }
      }
      cells.push({ id: uid(), kind: "markdown", text: src });
    } else if (c.cell_type === "code") {
      cells.push({ id: uid(), kind: "python", body: src });
    }
  }
  if (!cells.length) throw new Error("Notebook 中没有可导入的单元");
  return { title, cells };
}

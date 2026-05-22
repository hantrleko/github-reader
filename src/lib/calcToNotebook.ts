/**
 * Serialize a calculator's current state into a Notebook seed and
 * navigate to /notebook?seed=<base64>. The Notebook page decodes the
 * seed into starter cells (markdown header + param sliders + optional
 * formula/chart cells).
 */
export interface CalcSeed {
  title: string;
  description?: string;
  params: Array<{ name: string; value: number; min: number; max: number; step: number }>;
  formulas?: Array<{ latex: string; expression: string }>;
  charts?: Array<{ xVar: string; xMin: number; xMax: number; n: number; expression: string }>;
}

export function encodeCalcSeed(seed: CalcSeed): string {
  return btoa(encodeURIComponent(JSON.stringify(seed)));
}

export function decodeCalcSeed(raw: string): CalcSeed | null {
  try {
    return JSON.parse(decodeURIComponent(atob(raw))) as CalcSeed;
  } catch {
    return null;
  }
}

/** Convert a CalcSeed into Notebook TemplateCell[] (matching notebookTemplates.ts shape). */
export function seedToCells(seed: CalcSeed): Array<Record<string, unknown>> {
  const cells: Array<Record<string, unknown>> = [];
  cells.push({
    id: "seed-md",
    kind: "markdown",
    text: `# ${seed.title}\n\n${seed.description ?? "从计算器导入的参数集。修改滑块即可重新求值。"}`,
  });
  seed.params.forEach((p, i) =>
    cells.push({
      id: `seed-p-${i}`,
      kind: "param",
      name: p.name,
      value: p.value,
      min: p.min,
      max: p.max,
      step: p.step,
    })
  );
  (seed.formulas ?? []).forEach((f, i) =>
    cells.push({ id: `seed-f-${i}`, kind: "formula", latex: f.latex, expression: f.expression })
  );
  (seed.charts ?? []).forEach((c, i) =>
    cells.push({
      id: `seed-c-${i}`,
      kind: "chart",
      xVar: c.xVar,
      xMin: c.xMin,
      xMax: c.xMax,
      n: c.n,
      expression: c.expression,
    })
  );
  return cells;
}

export function buildNotebookSeedUrl(seed: CalcSeed): string {
  return `/notebook?seed=${encodeCalcSeed(seed)}`;
}
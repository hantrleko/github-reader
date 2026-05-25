import { compileExpr, compileJs, extractRefs } from "./sandbox";

/**
 * Reactive DAG runtime.
 *
 * Every cell may declare a `name` (the variable it exposes downstream)
 * and a source string. We extract referenced identifiers, build a
 * dependency graph, topologically sort, and evaluate. Downstream cells
 * receive a scope that includes:
 *   - all upstream named values
 *   - all `param` cells flattened by name
 *   - a `p` alias = { all params }
 *
 * Result type per cell:
 *   { value, error, refs }   — `value` is undefined on error.
 */

export type Scope = Record<string, unknown>;
export type CellResult = {
  value: unknown;
  error?: string;
  refs: string[];
  /** Cells whose names this cell references. */
  deps: string[];
};

export interface DagCellInput {
  id: string;
  /** Variable name this cell exposes (optional). */
  name?: string;
  /** Source code: expression for formula/chart, body for js. */
  source: string;
  /** "expr" returns the expression value; "js" evaluates a function body. */
  mode: "expr" | "js" | "value";
  /** For mode "value" (e.g. param cells), the raw value. */
  rawValue?: unknown;
}

export function evalDag(cells: DagCellInput[]): Map<string, CellResult> {
  // 1. build name → cellId index
  const nameToCell = new Map<string, string>();
  cells.forEach((c) => {
    if (c.name) nameToCell.set(c.name, c.id);
  });

  // 2. collect refs per cell
  const cellRefs = new Map<string, string[]>();
  const cellDeps = new Map<string, string[]>();
  cells.forEach((c) => {
    const refs = c.mode === "value" ? [] : extractRefs(c.source);
    cellRefs.set(c.id, refs);
    const deps = refs.filter((r) => nameToCell.has(r) && nameToCell.get(r) !== c.id);
    cellDeps.set(c.id, deps);
  });

  // 3. topological sort (Kahn). Cycles → mark error on involved cells.
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  cells.forEach((c) => { indeg.set(c.id, 0); adj.set(c.id, []); });
  cells.forEach((c) => {
    for (const ref of cellDeps.get(c.id)!) {
      const upId = nameToCell.get(ref)!;
      adj.get(upId)!.push(c.id);
      indeg.set(c.id, (indeg.get(c.id) || 0) + 1);
    }
  });
  const order: string[] = [];
  const q: string[] = [];
  indeg.forEach((d, id) => { if (d === 0) q.push(id); });
  while (q.length) {
    const id = q.shift()!;
    order.push(id);
    for (const next of adj.get(id) || []) {
      indeg.set(next, indeg.get(next)! - 1);
      if (indeg.get(next) === 0) q.push(next);
    }
  }

  const results = new Map<string, CellResult>();
  const scope: Scope = {};
  // gather params first (any cell with mode "value")
  const paramScope: Record<string, number> = {};
  cells.forEach((c) => {
    if (c.mode === "value" && c.name) {
      const v = c.rawValue;
      if (typeof v === "number") paramScope[c.name] = v;
      scope[c.name] = v;
    }
  });
  scope.p = paramScope;

  const cellById = new Map(cells.map((c) => [c.id, c] as const));

  for (const id of order) {
    const c = cellById.get(id)!;
    const refs = cellRefs.get(id)!;
    const deps = cellDeps.get(id)!;
    if (c.mode === "value") {
      results.set(id, { value: c.rawValue, refs, deps });
      continue;
    }
    try {
      const fn = c.mode === "js" ? compileJs(c.source) : compileExpr(c.source);
      const v = fn(scope);
      results.set(id, { value: v, refs, deps });
      if (c.name) scope[c.name] = v;
    } catch (e) {
      results.set(id, {
        value: undefined,
        error: String((e as Error)?.message ?? e),
        refs,
        deps,
      });
    }
  }

  // cycles: cells not in `order`
  cells.forEach((c) => {
    if (!results.has(c.id)) {
      results.set(c.id, {
        value: undefined,
        error: "循环依赖,无法求值",
        refs: cellRefs.get(c.id) || [],
        deps: cellDeps.get(c.id) || [],
      });
    }
  });

  return results;
}

/** Build a scope (for chart cells that need to call `evalExpr(x)`). */
export function buildScope(cells: DagCellInput[], results: Map<string, CellResult>): Scope {
  const scope: Scope = {};
  const paramScope: Record<string, number> = {};
  cells.forEach((c) => {
    if (c.mode === "value" && c.name) {
      if (typeof c.rawValue === "number") paramScope[c.name] = c.rawValue;
      scope[c.name] = c.rawValue;
    } else if (c.name) {
      const r = results.get(c.id);
      if (r && !r.error) scope[c.name] = r.value;
    }
  });
  scope.p = paramScope;
  return scope;
}
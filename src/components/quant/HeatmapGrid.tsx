import { useMemo } from "react";

interface Props {
  /** matrix[row][col] of values; null cells render blank */
  matrix: (number | null)[][];
  rowLabels: string[];
  colLabels: string[];
  /** how to format a cell value for the tooltip / label */
  fmt?: (v: number) => string;
  /** diverging palette centred on zero (e.g. returns) vs sequential (e.g. Sharpe) */
  diverging?: boolean;
  /** optional click handler (row, col) — used by the parameter scan */
  onCell?: (row: number, col: number) => void;
  /** highlight a single cell with a ring */
  highlight?: { row: number; col: number };
  cellLabel?: boolean;
  rowTitle?: string;
  colTitle?: string;
}

const GOLD = "43, 80%, 55%";
const GREEN = "150, 55%, 45%";
const RED = "0, 70%, 55%";

/**
 * Lightweight, dependency-free colour-coded grid shared by the parameter scan,
 * monthly-return and correlation-matrix views.
 */
export default function HeatmapGrid({
  matrix, rowLabels, colLabels, fmt = (v) => v.toFixed(2),
  diverging = false, onCell, highlight, cellLabel = true, rowTitle, colTitle,
}: Props) {
  const { min, max, absMax } = useMemo(() => {
    let mn = Infinity, mx = -Infinity, am = 0;
    for (const row of matrix) for (const v of row) {
      if (v == null || !Number.isFinite(v)) continue;
      mn = Math.min(mn, v); mx = Math.max(mx, v); am = Math.max(am, Math.abs(v));
    }
    if (!Number.isFinite(mn)) { mn = 0; mx = 0; am = 0; }
    return { min: mn, max: mx, absMax: am || 1 };
  }, [matrix]);

  const color = (v: number): string => {
    if (diverging) {
      const t = Math.max(-1, Math.min(1, v / absMax));
      if (t >= 0) return `hsl(${GREEN} / ${0.12 + t * 0.6})`;
      return `hsl(${RED} / ${0.12 + Math.abs(t) * 0.6})`;
    }
    const t = max > min ? (v - min) / (max - min) : 0.5;
    return `hsl(${GOLD} / ${0.1 + t * 0.65})`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-[10px] font-mono">
        <thead>
          <tr>
            <th className="p-1 text-right text-muted-foreground font-normal sticky left-0 bg-card">
              {rowTitle && <span className="text-gold">{rowTitle}</span>}
              {rowTitle && colTitle ? " \\ " : ""}
              {colTitle && <span className="text-gold">{colTitle}</span>}
            </th>
            {colLabels.map((c, j) => (
              <th key={j} className="p-1 font-normal text-muted-foreground text-center min-w-[34px]">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              <td className="p-1 text-right text-muted-foreground sticky left-0 bg-card whitespace-nowrap">{rowLabels[i]}</td>
              {row.map((v, j) => {
                const hi = highlight && highlight.row === i && highlight.col === j;
                return (
                  <td
                    key={j}
                    onClick={onCell ? () => onCell(i, j) : undefined}
                    title={v == null ? "" : fmt(v)}
                    style={{ background: v == null ? "transparent" : color(v) }}
                    className={
                      "text-center tabular-nums px-1 py-1 border border-background/40 " +
                      (onCell ? "cursor-pointer hover:outline hover:outline-1 hover:outline-gold " : "") +
                      (hi ? "outline outline-2 outline-gold font-bold" : "")
                    }
                  >
                    {v == null ? "" : cellLabel ? fmt(v) : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

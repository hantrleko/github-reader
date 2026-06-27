import { useState, useCallback } from "react";
import { ArrowLeftRight, Copy, RotateCcw, ArrowUp, ArrowDown, Minus } from "lucide-react";

/**
 * useCompareState — 通用 A/B 对比 hook。
 * 维护两组同结构 state，提供同步 / 重置 B / 切换显示工具方法。
 */
export function useCompareState<T extends object>(initial: T) {
  const [enabled, setEnabled] = useState(false);
  const [a, setA] = useState<T>(initial);
  const [b, setB] = useState<T>(initial);

  const syncBfromA = useCallback(() => setB({ ...a }), [a]);
  const resetB = useCallback(() => setB(initial), [initial]);
  const toggle = useCallback(() => {
    setEnabled((prev) => {
      if (!prev) setB({ ...a });
      return !prev;
    });
  }, [a]);

  return { enabled, toggle, a, b, setA, setB, syncBfromA, resetB };
}

interface ToolbarProps {
  enabled: boolean;
  onToggle: () => void;
  onSync: () => void;
  onReset: () => void;
}

export const CompareToolbar = ({ enabled, onToggle, onSync, onReset }: ToolbarProps) => (
  <div className="flex flex-wrap items-center gap-2">
    <button
      onClick={onToggle}
      aria-pressed={enabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono border transition-colors ${
        enabled
          ? "bg-gold/10 border-gold/40 text-gold"
          : "bg-card border-border hover:border-gold/40 hover:text-gold"
      }`}
      title="开启 A/B 对比模式"
    >
      <ArrowLeftRight className="w-3.5 h-3.5" />
      A/B 对比 {enabled ? "· 开" : "· 关"}
    </button>
    {enabled && (
      <>
        <button
          onClick={onSync}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono border border-border bg-card hover:border-gold/40 hover:text-gold transition-colors"
          title="把 A 的参数复制到 B"
        >
          <Copy className="w-3 h-3" /> A → B
        </button>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono border border-border bg-card hover:border-gold/40 hover:text-gold transition-colors"
          title="重置 B 参数"
        >
          <RotateCcw className="w-3 h-3" /> 重置 B
        </button>
      </>
    )}
  </div>
);

export interface CompareMetric {
  /** human label, e.g. "Call" */
  label: string;
  /** value of variant A (the live tool) */
  a: number;
  /** value of variant B */
  b: number;
  /** formatter applied to each value */
  fmt?: (n: number) => string;
  /** when true, an increase is "good" (green); when false, a decrease is green.
   *  Omit for neutral (gold) diff coloring. */
  higherIsBetter?: boolean;
}

const defaultFmt = (n: number) => (Number.isFinite(n) ? n.toFixed(4) : "—");

/**
 * CompareDiff — renders an A vs B metric table with Δ (B − A) and ↑↓ markers.
 * Coloring follows `higherIsBetter` when provided, else neutral gold.
 */
export const CompareDiff = ({ metrics }: { metrics: CompareMetric[] }) => (
  <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
    <table className="w-full text-[11px] font-mono">
      <thead>
        <tr className="border-b border-border/60 text-muted-foreground">
          <th className="text-left px-3 py-2 font-normal uppercase tracking-wider">指标</th>
          <th className="text-right px-3 py-2 font-normal">A</th>
          <th className="text-right px-3 py-2 font-normal">B</th>
          <th className="text-right px-3 py-2 font-normal">Δ (B−A)</th>
        </tr>
      </thead>
      <tbody>
        {metrics.map((m) => {
          const fmt = m.fmt ?? defaultFmt;
          const delta = m.b - m.a;
          const up = delta > 1e-9;
          const down = delta < -1e-9;
          const good =
            m.higherIsBetter == null
              ? null
              : (m.higherIsBetter ? up : down);
          const tone =
            good == null
              ? up || down
                ? "text-gold"
                : "text-muted-foreground"
              : good
              ? "text-emerald-500"
              : "text-rose-500";
          const Icon = up ? ArrowUp : down ? ArrowDown : Minus;
          return (
            <tr key={m.label} className="border-b border-border/30 last:border-0">
              <td className="px-3 py-1.5 text-foreground/80">{m.label}</td>
              <td className="px-3 py-1.5 text-right text-foreground/70">{fmt(m.a)}</td>
              <td className="px-3 py-1.5 text-right text-foreground">{fmt(m.b)}</td>
              <td className={`px-3 py-1.5 text-right ${tone}`}>
                <span className="inline-flex items-center gap-1 justify-end">
                  <Icon className="w-3 h-3" />
                  {fmt(Math.abs(delta))}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
import { useState, useCallback } from "react";
import { ArrowLeftRight, Copy, RotateCcw } from "lucide-react";

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
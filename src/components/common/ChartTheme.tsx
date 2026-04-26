import type { ReactNode } from "react";

/**
 * 统一的 Recharts 主题 token —— 所有图表共用以保证视觉一致性。
 * 使用 hsl(var(--token)) 形式以同时支持深/浅模式。
 */
export const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  gold: "hsl(var(--gold))",
  teal: "hsl(var(--teal))",
  destructive: "hsl(var(--destructive))",
  muted: "hsl(var(--muted-foreground))",
  series: [
    "hsl(var(--gold))",
    "hsl(var(--primary))",
    "hsl(var(--teal))",
    "hsl(var(--destructive))",
    "hsl(var(--muted-foreground))",
  ],
};

export const GRID_PROPS = {
  stroke: "hsl(var(--border) / 0.4)",
  strokeDasharray: "3 3",
};

export const AXIS_PROPS = {
  stroke: "hsl(var(--muted-foreground))",
  tick: { fontSize: 11, fontFamily: "ui-monospace, monospace", fill: "hsl(var(--muted-foreground))" },
  tickLine: { stroke: "hsl(var(--border))" },
  axisLine: { stroke: "hsl(var(--border))" },
};

/** Recharts <Tooltip content={...} /> 用的统一卡片样式 */
export const ThemedTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border/70 bg-popover/95 backdrop-blur-md shadow-lg px-3 py-2 text-xs font-mono">
      {label !== undefined && (
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
          {String(label)}
        </div>
      )}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 tabular-nums">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.stroke }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="text-foreground font-semibold">
            {typeof p.value === "number" ? p.value.toFixed(4) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/** 包裹 ResponsiveContainer 给固定外观的辅助组件（可选用） */
export const ChartFrame = ({ children, height = 280 }: { children: ReactNode; height?: number }) => (
  <div className="rounded-lg border border-border/50 bg-card/30 p-3" style={{ height }}>
    {children}
  </div>
);
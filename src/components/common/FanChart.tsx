import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { AXIS_PROPS, GRID_PROPS, ThemedTooltip } from "./ChartTheme";

/**
 * FanChart — 蒙特卡洛 / bootstrap 分位数带图。
 * 输入每个时点的样本数组或已算好的分位数; 输出双层置信带 + 中位数。
 */

export type FanPoint = { x: number | string; samples?: number[]; quantiles?: { p05: number; p25: number; p50: number; p75: number; p95: number } };

export type Annotation =
  | { type: "band"; from: number | string; to: number | string; label?: string; color?: string }
  | { type: "line"; at: number | string; label?: string; color?: string };

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export default function FanChart({
  data,
  xKey = "x",
  height = 280,
  yLabel,
  annotations = [],
  formatY = (v: number) => v.toFixed(3),
}: {
  data: FanPoint[];
  xKey?: string;
  height?: number;
  yLabel?: string;
  annotations?: Annotation[];
  formatY?: (v: number) => string;
}) {
  const rows = useMemo(() => {
    return data.map(d => {
      let q = d.quantiles;
      if (!q && d.samples?.length) {
        const s = [...d.samples].sort((a, b) => a - b);
        q = { p05: quantile(s, 0.05), p25: quantile(s, 0.25), p50: quantile(s, 0.5), p75: quantile(s, 0.75), p95: quantile(s, 0.95) };
      }
      const qq = q ?? { p05: NaN, p25: NaN, p50: NaN, p75: NaN, p95: NaN };
      return {
        [xKey]: d.x,
        p50: qq.p50,
        // stacked areas expect deltas: outer band lower, then range widths
        _p05: qq.p05,
        _band90: qq.p95 - qq.p05,
        _p25: qq.p25,
        _band50: qq.p75 - qq.p25,
      };
    });
  }, [data, xKey]);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis dataKey={xKey} {...AXIS_PROPS} />
        <YAxis {...AXIS_PROPS} label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))", fontSize: 11 } : undefined} tickFormatter={formatY} />
        <Tooltip content={<ThemedTooltip formatter={(v) => (typeof v === "number" ? formatY(v) : String(v))} />} />
        {/* 90% band via stacked invisible-lower + visible-range */}
        <Area type="monotone" dataKey="_p05" stackId="fan90" stroke="none" fill="transparent" isAnimationActive={false} name="p05" />
        <Area type="monotone" dataKey="_band90" stackId="fan90" stroke="none" fill="hsl(var(--gold) / 0.15)" isAnimationActive={false} name="90% band" />
        <Area type="monotone" dataKey="_p25" stackId="fan50" stroke="none" fill="transparent" isAnimationActive={false} name="p25" />
        <Area type="monotone" dataKey="_band50" stackId="fan50" stroke="none" fill="hsl(var(--gold) / 0.35)" isAnimationActive={false} name="50% band" />
        <Line type="monotone" dataKey="p50" stroke="hsl(var(--gold))" strokeWidth={2} dot={false} name="中位数" isAnimationActive={false} />
        {annotations.map((a, i) =>
          a.type === "band" ? (
            <ReferenceArea
              key={i}
              x1={a.from}
              x2={a.to}
              fill={a.color ?? "hsl(var(--muted-foreground) / 0.12)"}
              stroke="none"
              label={a.label ? { value: a.label, position: "insideTop", fill: "hsl(var(--muted-foreground))", fontSize: 10 } : undefined}
            />
          ) : (
            <ReferenceLine
              key={i}
              x={a.at}
              stroke={a.color ?? "hsl(var(--destructive))"}
              strokeDasharray="4 3"
              label={a.label ? { value: a.label, position: "top", fill: "hsl(var(--destructive))", fontSize: 10 } : undefined}
            />
          )
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
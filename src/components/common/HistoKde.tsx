import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { AXIS_PROPS, GRID_PROPS, ThemedTooltip } from "./ChartTheme";

/**
 * HistoKde — 直方图叠 KDE (高斯核) 密度曲线。
 * 用于展示回报分布 / 蒙特卡洛终值 / bootstrap 系数。
 */

function kdeGaussian(samples: number[], grid: number[], bandwidth?: number) {
  const n = samples.length;
  if (!n) return grid.map(() => 0);
  const mean = samples.reduce((s, x) => s + x, 0) / n;
  const variance = samples.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, n - 1);
  const sd = Math.sqrt(Math.max(variance, 1e-12));
  // Silverman's rule of thumb
  const h = bandwidth ?? 1.06 * sd * Math.pow(n, -1 / 5);
  const norm = 1 / (Math.sqrt(2 * Math.PI) * h);
  return grid.map((x) => {
    let s = 0;
    for (let i = 0; i < n; i++) {
      const u = (x - samples[i]) / h;
      s += Math.exp(-0.5 * u * u);
    }
    return (norm * s) / n;
  });
}

export default function HistoKde({
  samples,
  bins = 32,
  height = 260,
  formatX = (v: number) => v.toFixed(3),
  markers = [],
  showKde = true,
}: {
  samples: number[];
  bins?: number;
  height?: number;
  formatX?: (v: number) => string;
  markers?: Array<{ at: number; label?: string; color?: string }>;
  showKde?: boolean;
}) {
  const { rows, domain } = useMemo(() => {
    if (!samples.length) return { rows: [] as Array<{ x: number; xLabel: string; density: number; kde: number }>, domain: [0, 1] as [number, number] };
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const w = (max - min) / bins || 1;
    const centers = Array.from({ length: bins }, (_, i) => min + w * (i + 0.5));
    const counts = new Array(bins).fill(0);
    for (const v of samples) {
      let k = Math.floor((v - min) / w);
      if (k >= bins) k = bins - 1;
      if (k < 0) k = 0;
      counts[k] += 1;
    }
    const total = samples.length * w;
    const density = counts.map((c) => c / total);
    const kde = showKde ? kdeGaussian(samples, centers) : centers.map(() => 0);
    const rows = centers.map((c, i) => ({
      x: c,
      xLabel: formatX(c),
      density: density[i],
      kde: kde[i],
    }));
    // Extend numeric domain slightly so markers just outside the bin range still render.
    const markerMin = markers.length ? Math.min(...markers.map((m) => m.at)) : Infinity;
    const markerMax = markers.length ? Math.max(...markers.map((m) => m.at)) : -Infinity;
    const lo = Math.min(min - w / 2, markerMin - w / 2);
    const hi = Math.max(max + w / 2, markerMax + w / 2);
    return { rows, domain: [lo, hi] as [number, number] };
  }, [samples, bins, formatX, showKde, markers]);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis
          dataKey="x"
          type="number"
          domain={domain}
          allowDecimals
          {...AXIS_PROPS}
          tickFormatter={(v) => formatX(Number(v))}
        />
        <YAxis {...AXIS_PROPS} tickFormatter={(v) => Number(v).toFixed(2)} />
        <Tooltip
          labelFormatter={(v) => formatX(Number(v))}
          content={<ThemedTooltip formatter={(v) => (typeof v === "number" ? Number(v).toFixed(4) : String(v))} />}
        />
        <Bar
          dataKey="density"
          fill="hsl(var(--gold) / 0.45)"
          isAnimationActive={false}
          name="密度"
          // On a numeric axis Recharts needs an explicit bar size in px; approximate to bin spacing.
          barSize={Math.max(2, Math.floor(600 / Math.max(1, rows.length)) - 1)}
        />
        {showKde && (
          <Line type="monotone" dataKey="kde" stroke="hsl(var(--teal))" strokeWidth={2} dot={false} name="KDE" isAnimationActive={false} />
        )}
        {markers.map((m, i) => {
          const color = m.color ?? "hsl(var(--destructive))";
          return (
            <ReferenceLine
              key={i}
              x={m.at}
              stroke={color}
              strokeDasharray="4 3"
              label={m.label ? { value: `${m.label} (${formatX(m.at)})`, position: "top", fill: color, fontSize: 10 } : undefined}
            />
          );
        })}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
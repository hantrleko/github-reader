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
  const rows = useMemo(() => {
    if (!samples.length) return [];
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
    // Scale KDE line so it lives on the same y-axis as density
    return centers.map((c, i) => ({
      x: c,
      xLabel: formatX(c),
      density: density[i],
      kde: kde[i],
    }));
  }, [samples, bins, formatX, showKde]);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis dataKey="xLabel" {...AXIS_PROPS} interval={Math.max(0, Math.floor(rows.length / 8) - 1)} />
        <YAxis {...AXIS_PROPS} tickFormatter={(v) => Number(v).toFixed(2)} />
        <Tooltip content={<ThemedTooltip formatter={(v) => (typeof v === "number" ? Number(v).toFixed(4) : String(v))} />} />
        <Bar dataKey="density" fill="hsl(var(--gold) / 0.45)" isAnimationActive={false} name="密度" />
        {showKde && (
          <Line type="monotone" dataKey="kde" stroke="hsl(var(--teal))" strokeWidth={2} dot={false} name="KDE" isAnimationActive={false} />
        )}
        {markers.map((m, i) => {
          // Snap the marker to the nearest bin center so ReferenceLine's
          // category-axis value matches an existing xLabel exactly.
          let nearest = rows[0];
          let bestD = Infinity;
          for (const r of rows) {
            const d = Math.abs(r.x - m.at);
            if (d < bestD) { bestD = d; nearest = r; }
          }
          if (!nearest) return null;
          const color = m.color ?? "hsl(var(--destructive))";
          return (
            <ReferenceLine
              key={i}
              x={nearest.xLabel}
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
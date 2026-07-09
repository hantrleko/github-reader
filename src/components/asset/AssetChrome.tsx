import type { ReactNode } from "react";

/** Shared chart palette + UI primitives for the Asset Pricing module. */
export const CHART = {
  GOLD: "hsl(43, 80%, 55%)",
  TEAL: "hsl(180, 50%, 40%)",
  RED: "hsl(0, 70%, 55%)",
  BLUE: "hsl(220, 70%, 55%)",
  GRID: "hsl(var(--border))",
  TEXT: "hsl(var(--muted-foreground))",
};

const sliderClass =
  "w-full h-1.5 rounded-full appearance-none cursor-pointer bg-secondary accent-gold [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold";

const Slider = ({ label, sub, value, min, max, step, onChange }: {
  label: string; sub?: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) => (
  <div>
    <div className="flex justify-between items-baseline mb-2">
      <label className="text-xs text-secondary-foreground font-medium">{label}{sub && <span className="text-muted-foreground ml-1.5 text-[10px]">{sub}</span>}</label>
      <span className="text-xs font-mono text-gold tabular-nums">{value.toFixed(step >= 1 ? 0 : step >= 0.1 ? 2 : 3)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} className={sliderClass} />
  </div>
);

const Stat = ({ label, value, color = CHART.GOLD, sub }: {
  label: string; value: string; color?: string; sub?: string;
}) => (
  <div className="rounded-lg bg-secondary/40 border border-border p-3">
    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-lg font-mono tabular-nums" style={{ color }}>{value}</p>
    {sub && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

const Note = ({ children }: { children: ReactNode }) => (
  <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">{children}</div>
);

const ChartCard = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => (
  <div className="rounded-xl border border-border bg-secondary/20 p-4">
    <h4 className="text-sm font-semibold text-foreground mb-2">{title}</h4>
    <div className="h-[300px]">{children}</div>
    {hint && <p className="text-[10px] font-mono text-muted-foreground mt-2 leading-relaxed">{hint}</p>}
  </div>
);

export const AssetChrome = { Slider, Stat, Note, ChartCard };

/** Deterministic RNG + standard-normal draw (shared across simulation tools). */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function randn(rng: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
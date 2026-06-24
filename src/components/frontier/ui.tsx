/** Shared compact UI primitives for the Frontier interactive mini-tools. */
export const C = {
  gold: "hsl(43, 80%, 55%)",
  teal: "hsl(180, 50%, 40%)",
  red: "hsl(0, 70%, 55%)",
  blue: "hsl(220, 70%, 55%)",
  green: "hsl(150, 55%, 45%)",
  grid: "hsl(var(--border))",
  text: "hsl(var(--muted-foreground))",
};

const sliderClass =
  "w-full h-1.5 rounded-full appearance-none cursor-pointer bg-secondary accent-gold [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold";

export const Slider = ({
  label,
  sub,
  value,
  min,
  max,
  step,
  fmt,
  onChange,
}: {
  label: string;
  sub?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  fmt?: (v: number) => string;
  onChange: (v: number) => void;
}) => (
  <div>
    <div className="flex justify-between items-baseline mb-1.5">
      <label className="text-xs text-secondary-foreground font-medium">
        {label}
        {sub && <span className="text-muted-foreground ml-1.5 text-[10px]">{sub}</span>}
      </label>
      <span className="text-xs font-mono text-gold tabular-nums">
        {fmt ? fmt(value) : value.toFixed(step >= 1 ? 0 : step >= 0.1 ? 2 : 3)}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(+e.target.value)}
      className={sliderClass}
    />
  </div>
);

export const Stat = ({
  label,
  value,
  color = C.gold,
  sub,
}: {
  label: string;
  value: string;
  color?: string;
  sub?: string;
}) => (
  <div className="rounded-lg bg-secondary/40 border border-border p-3">
    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-lg font-mono tabular-nums" style={{ color }}>
      {value}
    </p>
    {sub && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

/** Deterministic LCG so generated networks/draws are stable per-seed. */
export function makeRng(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const tooltipStyle = {
  background: "hsl(var(--card))",
  border: `1px solid ${C.grid}`,
  fontSize: 11,
};
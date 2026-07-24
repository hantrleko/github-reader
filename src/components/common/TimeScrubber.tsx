import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

/**
 * TimeScrubber — 播放 / 暂停 / 拖拽时间轴。
 * 受控组件：父组件持有 t，接收 onChange。
 */
export default function TimeScrubber({
  value,
  min = 0,
  max,
  step = 1,
  onChange,
  fps = 20,
  label,
  formatValue,
}: {
  value: number;
  min?: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  fps?: number;
  label?: string;
  formatValue?: (v: number) => string;
}) {
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number | null>(null);
  const last = useRef<number>(0);

  useEffect(() => {
    if (!playing) return;
    const loop = (t: number) => {
      if (t - last.current >= 1000 / fps) {
        last.current = t;
        const next = value + step;
        if (next > max) {
          onChange(min);
        } else {
          onChange(next);
        }
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [playing, value, step, min, max, fps, onChange]);

  return (
    <div className="flex items-center gap-2 print:hidden">
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? "Pause" : "Play"}
        className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-gold hover:border-gold/50 transition-colors"
      >
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>
      <button
        type="button"
        onClick={() => { setPlaying(false); onChange(min); }}
        aria-label="Reset"
        className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-gold hover:border-gold/50 transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
      {label && <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">{label}</span>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="flex-1 h-1.5 rounded-full appearance-none bg-secondary accent-gold [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold"
      />
      <span className="text-xs font-mono tabular-nums text-gold min-w-[3ch] text-right">
        {formatValue ? formatValue(value) : value.toFixed(step >= 1 ? 0 : 2)}
      </span>
    </div>
  );
}
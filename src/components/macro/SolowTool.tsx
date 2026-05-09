import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, ComposedChart, Area } from "recharts";
import PresetButtons from "../PresetButtons";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

const sliderClass =
  "w-full h-1.5 rounded-full appearance-none cursor-pointer bg-secondary accent-gold [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold";

const Slider = ({ label, sub, value, min, max, step, onChange }: { label: string; sub?: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) => (
  <div>
    <div className="flex justify-between items-baseline mb-2">
      <label className="text-xs text-secondary-foreground font-medium">{label}{sub && <span className="text-muted-foreground ml-1.5 text-[10px]">{sub}</span>}</label>
      <span className="text-xs font-mono text-gold tabular-nums">{value.toFixed(step >= 1 ? 0 : step >= 0.1 ? 2 : 3)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} className={sliderClass} />
  </div>
);

const Stat = ({ label, value, color = CHART_GOLD, sub }: { label: string; value: string; color?: string; sub?: string }) => (
  <div className="rounded-lg bg-secondary/40 border border-border p-3">
    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-lg font-mono tabular-nums" style={{ color }}>{value}</p>
    {sub && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

/**
 * Solow-Swan growth model with Cobb-Douglas Y = A K^α (Lh)^(1−α).
 * In per-effective-worker terms (k̃ = K/(AL)):
 *    k̃̇ = s·k̃^α − (n + g + δ)·k̃
 * Steady state: k̃* = (s/(n+g+δ))^(1/(1−α))
 * Golden-rule savings: s_gr = α (consumption-maximising).
 */
function simulateSolow(opts: {
  alpha: number; s: number; n: number; g: number; delta: number;
  k0: number; T: number;
}) {
  const { alpha, s, n, g, delta, k0, T } = opts;
  const series: { t: number; k: number; y: number; c: number; i: number; sy: number; brk: number }[] = [];
  let k = k0;
  for (let t = 0; t <= T; t++) {
    const y = Math.pow(Math.max(k, 1e-9), alpha);
    const i = s * y;
    const c = (1 - s) * y;
    const brk = (n + g + delta) * k;
    series.push({ t, k: +k.toFixed(4), y: +y.toFixed(4), c: +c.toFixed(4), i: +i.toFixed(4), sy: +i.toFixed(4), brk: +brk.toFixed(4) });
    // Discrete-time update of k̃
    k = k + (i - brk);
    if (!isFinite(k) || k < 0) k = 1e-6;
  }
  const kStar = Math.pow(s / (n + g + delta), 1 / (1 - alpha));
  const yStar = Math.pow(kStar, alpha);
  const cStar = (1 - s) * yStar;
  const sGold = alpha;
  const kGold = Math.pow(sGold / (n + g + delta), 1 / (1 - alpha));
  const yGold = Math.pow(kGold, alpha);
  const cGold = (1 - sGold) * yGold;
  return { series, kStar, yStar, cStar, sGold, kGold, cGold };
}

export const SolowTool = () => {
  const [alpha, setAlpha] = useState(0.33);
  const [s, setS] = useState(0.25);
  const [n, setN] = useState(0.01);
  const [g, setG] = useState(0.02);
  const [delta, setDelta] = useState(0.05);
  const [k0, setK0] = useState(1.0);
  const [T, setT] = useState(150);

  const sim = useMemo(() => simulateSolow({ alpha, s, n, g, delta, k0, T }), [alpha, s, n, g, delta, k0, T]);

  // Phase diagram: sf(k) and break-even (n+g+δ)k as functions of k
  const phase = useMemo(() => {
    const kMax = Math.max(sim.kStar, sim.kGold) * 1.8;
    const out: { k: number; sf: number; brk: number; goldF: number }[] = [];
    for (let i = 0; i <= 80; i++) {
      const kk = (i / 80) * kMax + 1e-3;
      out.push({
        k: +kk.toFixed(4),
        sf: +(s * Math.pow(kk, alpha)).toFixed(4),
        brk: +((n + g + delta) * kk).toFixed(4),
        goldF: +(sim.sGold * Math.pow(kk, alpha)).toFixed(4),
      });
    }
    return out;
  }, [sim, s, alpha, n, g, delta]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "美国基准", description: "α=0.33,s=0.20,δ=0.05", apply: () => { setAlpha(0.33); setS(0.20); setN(0.01); setG(0.02); setDelta(0.05); setK0(1); setT(150); } },
        { name: "高储蓄 (中国)", description: "s=0.40", apply: () => { setS(0.40); setAlpha(0.4); setN(0.005); setG(0.04); setDelta(0.06); } },
        { name: "黄金率", description: "s=α 消费最大化", apply: () => { setS(0.33); setAlpha(0.33); setN(0.01); setG(0.02); setDelta(0.05); } },
        { name: "贫困陷阱起点", description: "k₀ 极低,看收敛", apply: () => { setK0(0.05); setT(200); } },
        { name: "过度储蓄", description: "s=0.6 远超黄金率", apply: () => { setS(0.6); setAlpha(0.33); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">技术与偏好</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="α (资本弹性)" value={alpha} min={0.1} max={0.6} step={0.01} onChange={setAlpha} />
            <Slider label="s (储蓄率)" sub="∈[0,1]" value={s} min={0.01} max={0.7} step={0.01} onChange={setS} />
            <Slider label="δ (折旧率)" value={delta} min={0.01} max={0.15} step={0.005} onChange={setDelta} />
            <Slider label="n (人口增长)" value={n} min={-0.01} max={0.05} step={0.001} onChange={setN} />
            <Slider label="g (技术进步)" value={g} min={0} max={0.05} step={0.001} onChange={setG} />
            <Slider label="k₀ (初始资本)" value={k0} min={0.01} max={10} step={0.05} onChange={setK0} />
          </div>
          <Slider label="T (期数)" value={T} min={20} max={400} step={10} onChange={setT} />
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="稳态 k̃*" value={sim.kStar.toFixed(3)} sub="(s/(n+g+δ))^(1/(1-α))" />
            <Stat label="稳态 ỹ*" value={sim.yStar.toFixed(3)} color={CHART_TEAL} />
            <Stat label="稳态消费 c̃*" value={sim.cStar.toFixed(3)} color={CHART_BLUE} />
            <Stat label="黄金率 s_gr" value={sim.sGold.toFixed(3)} color={CHART_RED} sub={`s_gr = α; 当前 s ${s > sim.sGold ? "> α (过度储蓄)" : s < sim.sGold ? "< α (储蓄不足)" : "= α (黄金率)"}`} />
            <Stat label="黄金率 k̃_gr" value={sim.kGold.toFixed(3)} color={CHART_RED} />
            <Stat label="黄金率 c̃_gr" value={sim.cGold.toFixed(3)} color={CHART_RED} sub={`Δc̃ = ${(sim.cGold - sim.cStar).toFixed(3)}`} />
          </div>
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
            <p><span className="text-gold">Solow-Swan (1956)：</span>资本积累与外生技术驱动的长期增长基准模型。</p>
            <p>动力学：k̃̇ = s·k̃<sup>α</sup> − (n+g+δ)k̃；交点即稳态。</p>
            <p><span className="text-gold">收敛性：</span>无论 k₀ 起点高低，k̃ 都收敛到 k̃*（条件收敛假说）。</p>
            <p><span className="text-gold">黄金率：</span>s = α 时稳态消费最大；过度储蓄 → 资本沉沦。</p>
          </div>
        </div>
      </div>

      {/* Convergence chart */}
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">资本与产出动态收敛 — 走向稳态 k̃* = {sim.kStar.toFixed(3)}</h4>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sim.series}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "期 t", position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="k" name="资本 k̃" stroke={CHART_GOLD} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="y" name="产出 ỹ = k̃^α" stroke={CHART_TEAL} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="c" name="消费 c̃ = (1−s)ỹ" stroke={CHART_BLUE} strokeWidth={2} dot={false} strokeDasharray="4 3" />
              <ReferenceLine y={sim.kStar} stroke={CHART_RED} strokeDasharray="3 3" label={{ value: "k̃*", fill: CHART_RED, fontSize: 10 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Phase diagram */}
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">Solow 相图 — 投资曲线 vs 折旧线</h4>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={phase}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="k" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "k̃", position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="sf" name={`投资 s·f(k̃) = ${s.toFixed(2)}·k̃^α`} stroke={CHART_GOLD} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="brk" name={`折旧+人口+技术 (n+g+δ)k̃`} stroke={CHART_RED} strokeWidth={2} dot={false} strokeDasharray="5 3" />
              <Line type="monotone" dataKey="goldF" name={`黄金率投资 α·k̃^α`} stroke={CHART_BLUE} strokeWidth={1.5} dot={false} strokeDasharray="2 2" />
              <ReferenceLine x={sim.kStar} stroke={CHART_GOLD} strokeDasharray="2 2" label={{ value: "k̃*", fill: CHART_GOLD, fontSize: 10 }} />
              <ReferenceLine x={sim.kGold} stroke={CHART_BLUE} strokeDasharray="2 2" label={{ value: "k̃_gr", fill: CHART_BLUE, fontSize: 10 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground mt-2 leading-relaxed">
          交点 = 稳态。投资线 (金) 在交点处与折旧线 (红) 相切于 k̃*。蓝色虚线显示黄金率 s = α 对应的投资曲线，它与折旧线的交点在 k̃<sub>gr</sub> 处使消费 c̃ 达到最大。
        </p>
      </div>
    </div>
  );
};

export default SolowTool;

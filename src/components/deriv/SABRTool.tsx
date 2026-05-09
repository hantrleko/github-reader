import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine,
} from "recharts";
import "katex/dist/katex.min.css";
import PresetButtons from "../PresetButtons";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

const sliderClass =
  "w-full h-1.5 rounded-full appearance-none cursor-pointer bg-secondary accent-gold [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold";

const Slider = ({ label, sub, value, min, max, step, onChange }: {
  label: string; sub?: string;
  value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) => (
  <div>
    <div className="flex justify-between items-baseline mb-2">
      <label className="text-xs text-secondary-foreground font-medium">
        {label}{sub && <span className="text-muted-foreground ml-1.5 text-[10px]">{sub}</span>}
      </label>
      <span className="text-xs font-mono text-gold tabular-nums">
        {value.toFixed(step >= 1 ? 0 : step >= 0.1 ? 2 : 3)}
      </span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))} className={sliderClass} />
  </div>
);

const Stat = ({ label, value, color = "hsl(var(--gold))", sub }: { label: string; value: string; color?: string; sub?: string }) => (
  <div className="rounded-lg bg-secondary/40 border border-border p-3">
    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-lg font-mono tabular-nums" style={{ color }}>{value}</p>
    {sub && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

/**
 * Hagan et al. (2002) SABR implied Black volatility (lognormal) approximation.
 * Returns σ_B(K, F, T) for the SABR model:
 *   dF = α F^β dW1, dα = ν α dW2, Corr(dW1,dW2) = ρ.
 */
function sabrIV(F: number, K: number, T: number, alpha: number, beta: number, rho: number, nu: number): number {
  if (F <= 0 || K <= 0 || alpha <= 0) return NaN;
  const eps = 1e-7;
  const oneMb = 1 - beta;
  const FK = F * K;
  const logFK = Math.log(F / K);
  const FKb = Math.pow(FK, oneMb / 2);

  // ATM special case
  if (Math.abs(F - K) < eps * F) {
    const term1 = alpha / Math.pow(F, oneMb);
    const c1 = (oneMb * oneMb / 24) * (alpha * alpha) / Math.pow(F, 2 * oneMb);
    const c2 = 0.25 * (rho * beta * nu * alpha) / Math.pow(F, oneMb);
    const c3 = ((2 - 3 * rho * rho) / 24) * nu * nu;
    return term1 * (1 + (c1 + c2 + c3) * T);
  }

  const z = (nu / alpha) * FKb * logFK;
  const xz = Math.log((Math.sqrt(1 - 2 * rho * z + z * z) + z - rho) / (1 - rho));
  // (1-β)^2 expansion in denominator
  const denom = FKb * (1 + (oneMb * oneMb / 24) * logFK * logFK + (Math.pow(oneMb, 4) / 1920) * Math.pow(logFK, 4));
  const num = alpha;

  const A = num / denom;
  const B = (z / xz);
  const C1 = (oneMb * oneMb / 24) * (alpha * alpha) / Math.pow(FK, oneMb);
  const C2 = 0.25 * (rho * beta * nu * alpha) / Math.pow(FK, oneMb / 2);
  const C3 = ((2 - 3 * rho * rho) / 24) * nu * nu;
  return A * B * (1 + (C1 + C2 + C3) * T);
}

export const SABRTool = () => {
  const [F, setF] = useState(100);
  const [T, setT] = useState(1.0);
  const [alpha, setAlpha] = useState(0.20);
  const [beta, setBeta] = useState(0.5);
  const [rho, setRho] = useState(-0.4);
  const [nu, setNu] = useState(0.5);

  const smile = useMemo(() => {
    const out: { k: number; iv: number; betaHi: number; betaLo: number }[] = [];
    for (let i = -25; i <= 25; i++) {
      const k = 0.02 * i;
      const K = F * Math.exp(k);
      const iv = sabrIV(F, K, T, alpha, beta, rho, nu);
      const bHi = sabrIV(F, K, T, alpha, 1.0, rho, nu);   // β=1 (lognormal)
      const bLo = sabrIV(F, K, T, alpha, 0.0, rho, nu);   // β=0 (normal)
      out.push({
        k: +k.toFixed(3),
        iv: isFinite(iv) ? +(iv * 100).toFixed(3) : 0,
        betaHi: isFinite(bHi) ? +(bHi * 100).toFixed(3) : 0,
        betaLo: isFinite(bLo) ? +(bLo * 100).toFixed(3) : 0,
      });
    }
    return out;
  }, [F, T, alpha, beta, rho, nu]);

  const atm = useMemo(() => sabrIV(F, F, T, alpha, beta, rho, nu), [F, T, alpha, beta, rho, nu]);
  const skew25 = useMemo(() => {
    const lo = sabrIV(F, F * Math.exp(-0.10), T, alpha, beta, rho, nu);
    const hi = sabrIV(F, F * Math.exp(+0.10), T, alpha, beta, rho, nu);
    return (lo - hi) * 100;
  }, [F, T, alpha, beta, rho, nu]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "股指 (β=0.5, ρ<0)", description: "经典左偏 skew", apply: () => { setAlpha(0.20); setBeta(0.5); setRho(-0.5); setNu(0.6); } },
        { name: "FX 对称微笑", description: "ρ=0,凸性主导", apply: () => { setAlpha(0.12); setBeta(1.0); setRho(0); setNu(0.7); } },
        { name: "利率 (β=0)", description: "Normal SABR,LIBOR 市场", apply: () => { setAlpha(0.015); setBeta(0); setRho(-0.2); setNu(0.4); setF(0.03); } },
        { name: "Hagan 论文示例", description: "原始 2002 标定", apply: () => { setAlpha(0.20); setBeta(0.5); setRho(-0.3); setNu(0.4); setF(100); setT(1); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">市场参数</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="F (远期)" value={F} min={0.01} max={200} step={0.01} onChange={setF} />
            <Slider label="T (年)" value={T} min={0.1} max={5} step={0.1} onChange={setT} />
          </div>
          <p className="text-xs font-mono text-gold uppercase tracking-wider mt-4">SABR 四参数</p>
          <Slider label="α (初始波动)" sub="决定整体水平" value={alpha} min={0.01} max={1.0} step={0.01} onChange={setAlpha} />
          <Slider label="β (CEV 弹性)" sub="0=normal, 1=lognormal" value={beta} min={0} max={1} step={0.05} onChange={setBeta} />
          <Slider label="ρ (相关系数)" sub="决定 skew 方向" value={rho} min={-0.95} max={0.95} step={0.05} onChange={setRho} />
          <Slider label="ν (vol-of-vol)" sub="决定 smile 凸度" value={nu} min={0.05} max={2.0} step={0.05} onChange={setNu} />
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="ATM IV (Hagan)" value={`${(atm * 100).toFixed(2)}%`} />
            <Stat label="25Δ Risk Reversal" value={`${skew25.toFixed(2)}%`} color={skew25 >= 0 ? CHART_RED : CHART_TEAL}
              sub={skew25 >= 0 ? "OTM put 更贵 (左偏)" : "OTM call 更贵 (右偏)"} />
            <Stat label="β" value={beta.toFixed(2)} sub={beta < 0.05 ? "Normal SABR" : beta > 0.95 ? "Lognormal" : "CEV"} />
            <Stat label="ν / α 比" value={(nu / Math.max(alpha, 1e-6)).toFixed(2)} sub="vol-of-vol 相对强度" />
          </div>
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
            <p><span className="text-gold">SABR (Hagan et al. 2002)：</span>IR/Swaption 行业标准的随机波动率模型。</p>
            <p><span className="text-gold">β：</span>控制后向远期分布形状 — β=0 高斯、β=1 对数正态、β=0.5 CIR-like。</p>
            <p><span className="text-gold">ρ：</span>决定 skew 倾斜方向，<span className="text-gold">ν：</span>决定 smile 曲度。</p>
            <p>对比 Heston: SABR 是<u>解析近似</u>(无 MC)，更适合即时 smile 标定与对冲。</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">SABR 隐含波动率微笑 — β 敏感性对比</h4>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={smile}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="k" stroke={CHART_TEXT} tick={{ fontSize: 10 }}
                label={{ value: "log-moneyness k = ln(K/F)", position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }}
                label={{ value: "IV %", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="iv" name={`SABR (β=${beta.toFixed(2)})`} stroke={CHART_GOLD} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="betaHi" name="β=1 (Lognormal)" stroke={CHART_TEAL} strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
              <Line type="monotone" dataKey="betaLo" name="β=0 (Normal)" stroke={CHART_BLUE} strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
              <ReferenceLine x={0} stroke={CHART_RED} strokeDasharray="3 3" label={{ value: "ATM", fill: CHART_RED, fontSize: 10 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground mt-2 leading-relaxed">
          Hagan 公式：σ<sub>B</sub>(K,F) = (α / D) · (z/x(z)) · [1 + ((1-β)²α²/24·(FK)<sup>1-β</sup> + ρβνα/(4(FK)<sup>(1-β)/2</sup>) + (2-3ρ²)ν²/24)·T]
          其中 z = (ν/α)(FK)<sup>(1-β)/2</sup>·ln(F/K)，x(z) = ln((√(1-2ρz+z²)+z-ρ)/(1-ρ)).
        </p>
      </div>
    </div>
  );
};

export default SABRTool;

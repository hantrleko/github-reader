import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import "katex/dist/katex.min.css";
import PresetButtons from "../PresetButtons";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

const sliderClass =
  "w-full h-1.5 rounded-full appearance-none cursor-pointer bg-secondary accent-gold [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold";

const Slider = ({ label, sub, value, min, max, step, onChange }: {
  label: string; sub?: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) => (
  <div>
    <div className="flex justify-between items-baseline mb-2">
      <label className="text-xs text-secondary-foreground font-medium">
        {label}{sub && <span className="text-muted-foreground ml-1.5 text-[10px]">{sub}</span>}
      </label>
      <span className="text-xs font-mono text-gold tabular-nums">{value.toFixed(step >= 1 ? 0 : step >= 0.1 ? 2 : 3)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} className={sliderClass} />
  </div>
);

function normCdf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * ax);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return 0.5 * (1.0 + sign * y);
}
function bsCall(S: number, K: number, r: number, sigma: number, T: number) {
  if (T <= 0 || sigma <= 0) return Math.max(S - K, 0);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return S * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2);
}

/**
 * Parametric IV surface (SVI-style in k = ln(K/S0), simplified):
 *   σ_iv(k, T) = atm + skew·k + curv·k^2 + termSlope·(T - 1)
 * Used as the "market quote" surface from which Dupire local vol is back-solved.
 */
function ivSurface(k: number, T: number, atm: number, skew: number, curv: number, termSlope: number): number {
  return Math.max(0.02, atm + skew * k + curv * k * k + termSlope * (T - 1));
}

export const LocalVolTool = () => {
  const [S0, setS0] = useState(100);
  const [r, setR] = useState(0.03);
  const [atm, setAtm] = useState(0.22);
  const [skew, setSkew] = useState(-0.30);
  const [curv, setCurv] = useState(0.40);
  const [termSlope, setTermSlope] = useState(0.02);
  const [Tslice, setTslice] = useState(1.0);

  // Compute Dupire local-vol slice at fixed T
  const slice = useMemo(() => {
    const out: { k: number; ivPct: number; locPct: number }[] = [];
    const dk = 0.005;
    const dT = 0.005;
    for (let i = -25; i <= 25; i++) {
      const k = 0.02 * i;
      const K = S0 * Math.exp(k);
      const iv = ivSurface(k, Tslice, atm, skew, curv, termSlope);
      // Numerical Dupire: σ²_loc = (∂C/∂T) / (½ K² ∂²C/∂K²)
      const c = bsCall(S0, K, r, iv, Tslice);
      const cTplus = bsCall(S0, K, r, ivSurface(k, Tslice + dT, atm, skew, curv, termSlope), Tslice + dT);
      const cTminus = bsCall(S0, K, r, ivSurface(k, Math.max(Tslice - dT, 0.01), atm, skew, curv, termSlope), Math.max(Tslice - dT, 0.01));
      const dCdT = (cTplus - cTminus) / (2 * dT);

      const Kp = S0 * Math.exp(k + dk);
      const Km = S0 * Math.exp(k - dk);
      const cKp = bsCall(S0, Kp, r, ivSurface(k + dk, Tslice, atm, skew, curv, termSlope), Tslice);
      const cKm = bsCall(S0, Km, r, ivSurface(k - dk, Tslice, atm, skew, curv, termSlope), Tslice);
      const d2CdK2 = (cKp - 2 * c + cKm) / Math.pow(K * dk, 2); // approx; uses K·dk as ΔK
      const num = dCdT + r * K * (cKp - cKm) / (2 * K * dk); // Dupire with carry
      const denom = 0.5 * K * K * d2CdK2;
      const sigma2 = denom > 1e-10 ? Math.max(num / denom, 1e-8) : NaN;
      const loc = isFinite(sigma2) ? Math.sqrt(sigma2) : NaN;
      out.push({
        k: +k.toFixed(3),
        ivPct: +(iv * 100).toFixed(2),
        locPct: isFinite(loc) ? +(loc * 100).toFixed(2) : 0,
      });
    }
    return out;
  }, [S0, r, atm, skew, curv, termSlope, Tslice]);

  const atmIv = ivSurface(0, Tslice, atm, skew, curv, termSlope);
  const atmLoc = slice.find(s => s.k === 0)?.locPct ?? 0;

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "股指负 skew", description: "典型左偏", apply: () => { setAtm(0.22); setSkew(-0.35); setCurv(0.40); setTermSlope(0.02); } },
        { name: "FX 对称微笑", description: "skew≈0,凸度高", apply: () => { setAtm(0.12); setSkew(0); setCurv(0.6); setTermSlope(0.01); } },
        { name: "平直曲面", description: "退化到 BS 常数 σ", apply: () => { setAtm(0.20); setSkew(0); setCurv(0); setTermSlope(0); } },
        { name: "极端 skew", description: "短期左尾恐慌", apply: () => { setAtm(0.30); setSkew(-0.7); setCurv(0.8); setTermSlope(-0.05); setTslice(0.25); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">市场参数</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="S₀" value={S0} min={50} max={200} step={5} onChange={setS0} />
            <Slider label="r" value={r} min={0} max={0.1} step={0.005} onChange={setR} />
          </div>
          <p className="text-xs font-mono text-gold uppercase tracking-wider mt-4">IV 曲面参数 (输入)</p>
          <Slider label="ATM σ" sub="平值水平" value={atm} min={0.05} max={0.5} step={0.01} onChange={setAtm} />
          <Slider label="Skew ∂σ/∂k" sub="负值=左偏" value={skew} min={-1} max={1} step={0.05} onChange={setSkew} />
          <Slider label="Curvature ∂²σ/∂k²" value={curv} min={-0.5} max={1.5} step={0.05} onChange={setCurv} />
          <Slider label="期限斜率" sub="∂σ/∂T" value={termSlope} min={-0.1} max={0.1} step={0.005} onChange={setTermSlope} />
          <Slider label="切片 T (年)" value={Tslice} min={0.1} max={3} step={0.05} onChange={setTslice} />
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-secondary/40 border border-border p-3">
              <p className="text-[10px] font-mono uppercase text-muted-foreground">ATM IV (输入)</p>
              <p className="text-lg font-mono text-gold tabular-nums">{(atmIv * 100).toFixed(2)}%</p>
            </div>
            <div className="rounded-lg bg-secondary/40 border border-border p-3">
              <p className="text-[10px] font-mono uppercase text-muted-foreground">ATM σ_loc (Dupire)</p>
              <p className="text-lg font-mono tabular-nums" style={{ color: CHART_TEAL }}>{atmLoc.toFixed(2)}%</p>
            </div>
          </div>
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
            <p><span className="text-gold">Dupire (1994)：</span>给定无套利的欧式 call 曲面 C(K,T)，唯一确定一个<u>确定性</u>局部波动率 σ(K,T):</p>
            <p className="text-center my-2 text-foreground">σ²<sub>loc</sub>(K,T) = [∂C/∂T + rK·∂C/∂K] / [½K²·∂²C/∂K²]</p>
            <p>常用直觉："局部波动率是对应隐含波动率的<u>双倍 skew</u>"——曲面越陡，σ_loc 偏离 σ_iv 越大。</p>
            <p>退化情形：常数 σ_iv ⇒ σ_loc ≡ σ_iv ⇒ 退化为 Black-Scholes。</p>
            <p>与 SVI/IV 工具天然衔接：先拟合 IV 曲面，再用 Dupire 反演路径生成器。</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">σ_iv vs σ_loc — Dupire 反演切片 @ T={Tslice.toFixed(2)}</h4>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={slice}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="k" stroke={CHART_TEXT} tick={{ fontSize: 10 }}
                label={{ value: "log-moneyness k", position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }}
                label={{ value: "σ %", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="ivPct" name="σ_iv (输入隐含波动率)" stroke={CHART_GOLD} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="locPct" name="σ_loc (Dupire 反演)" stroke={CHART_TEAL} strokeWidth={2.5} dot={false} />
              <ReferenceLine x={0} stroke={CHART_RED} strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default LocalVolTool;

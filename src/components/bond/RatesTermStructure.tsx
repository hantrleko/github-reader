import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, ComposedChart, Area, BarChart, Bar,
} from "recharts";
import "katex/dist/katex.min.css";
import PresetButtons from "../PresetButtons";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randn(rng: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const sliderClass =
  "w-full h-1.5 rounded-full appearance-none cursor-pointer bg-secondary accent-gold [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:shadow-md";

const Slider = ({ label, sub, unit, value, min, max, step, onChange }: {
  label: string; sub?: string; unit?: string;
  value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) => (
  <div>
    <div className="flex justify-between items-baseline mb-2">
      <label className="text-xs text-secondary-foreground font-medium">
        {label}{sub && <span className="text-muted-foreground ml-1.5 text-[10px]">{sub}</span>}
      </label>
      <span className="text-xs font-mono text-gold tabular-nums">
        {value.toFixed(step >= 1 ? 0 : step >= 0.1 ? 2 : 4)}{unit && ` ${unit}`}
      </span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))} className={sliderClass} />
  </div>
);

const Stat = ({ label, value, color = "hsl(var(--gold))", sub }: { label: string; value: string; color?: string; sub?: string }) => (
  <div className="rounded-lg bg-secondary/40 border border-border p-3">
    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-base font-mono tabular-nums" style={{ color }}>{value}</p>
    {sub && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

/* ─── Bootstrap zero curve from par-bond yields ───
 * Inputs: maturities T_i (years) and par YTM y_i (decimal), assumed annual coupon = y_i (par).
 * Output: zero rates z_i s.t. sum_{j<=i} y_i / (1+z_j)^{T_j} + 1/(1+z_i)^{T_i} = 1.
 */
function bootstrap(maturities: number[], parYields: number[]) {
  const z: number[] = [];
  for (let i = 0; i < maturities.length; i++) {
    const Ti = maturities[i];
    const c = parYields[i]; // coupon = par yield, annual frequency, face=1
    let pvCoupons = 0;
    for (let j = 0; j < i; j++) {
      pvCoupons += c / Math.pow(1 + z[j], maturities[j]);
    }
    // Solve: pvCoupons + (1 + c) / (1 + z_i)^{Ti} = 1
    const num = (1 + c);
    const denom = 1 - pvCoupons;
    if (denom <= 0) { z.push(NaN); continue; }
    const factor = num / denom; // = (1 + z_i)^{Ti}
    const zi = Math.pow(factor, 1 / Ti) - 1;
    z.push(zi);
  }
  return z;
}

/* Continuously-compounded forward rate between T_i-1 and T_i (annual compounding inputs). */
function forwardRates(maturities: number[], zeros: number[]) {
  const f: number[] = [];
  for (let i = 0; i < maturities.length; i++) {
    if (i === 0) {
      f.push(zeros[i]);
    } else {
      const dT = maturities[i] - maturities[i - 1];
      const num = Math.pow(1 + zeros[i], maturities[i]);
      const den = Math.pow(1 + zeros[i - 1], maturities[i - 1]);
      f.push(Math.pow(num / den, 1 / dT) - 1);
    }
  }
  return f;
}

/* ─── Hull-White (1-factor) on a continuous curve ───
 * Use the bootstrapped zero curve as the initial f(0,T).
 * dr = (theta(t) - a r) dt + sigma dW, with
 *   theta(t) = ∂f(0,t)/∂t + a f(0,t) + σ²/(2a)(1 - e^{-2at})
 * For simulation we discretize and approximate ∂f/∂t numerically from the curve.
 */
function simulateHullWhite(params: {
  zeros: number[]; mats: number[]; a: number; sigma: number;
  T: number; nSteps: number; nPaths: number; seed: number;
}) {
  const { zeros, mats, a, sigma, T, nSteps, nPaths, seed } = params;
  const rng = mulberry32(seed);
  const dt = T / nSteps;
  // Build a denser forward curve f(0,t) by piecewise-linear interpolation of zero rates,
  // then f(0,t) = z(t) + t * dz/dt.
  const zAt = (t: number) => {
    if (t <= mats[0]) return zeros[0];
    if (t >= mats[mats.length - 1]) return zeros[zeros.length - 1];
    for (let i = 1; i < mats.length; i++) {
      if (t <= mats[i]) {
        const w = (t - mats[i - 1]) / (mats[i] - mats[i - 1]);
        return zeros[i - 1] * (1 - w) + zeros[i] * w;
      }
    }
    return zeros[zeros.length - 1];
  };
  const fInst = (t: number) => {
    const dt2 = 0.01;
    const z = zAt(t);
    const zP = zAt(t + dt2);
    const dzdt = (zP - z) / dt2;
    return z + t * dzdt;
  };
  const theta = (t: number) => {
    const dt2 = 0.01;
    const f = fInst(t);
    const dfdt = (fInst(t + dt2) - f) / dt2;
    return dfdt + a * f + (sigma * sigma) / (2 * a) * (1 - Math.exp(-2 * a * t));
  };

  const r0 = fInst(0);
  const paths: Float64Array[] = Array.from({ length: nPaths }, () => new Float64Array(nSteps + 1));
  for (let p = 0; p < nPaths; p++) paths[p][0] = r0;
  for (let s = 1; s <= nSteps; s++) {
    const t = (s - 1) * dt;
    const th = theta(t);
    for (let p = 0; p < nPaths; p++) {
      const rPrev = paths[p][s - 1];
      const dW = randn(rng) * Math.sqrt(dt);
      paths[p][s] = rPrev + (th - a * rPrev) * dt + sigma * dW;
    }
  }

  // Build chart data with mean and 5/95 percentile bands
  const chart: any[] = [];
  for (let s = 0; s <= nSteps; s++) {
    const col = new Float64Array(nPaths);
    for (let p = 0; p < nPaths; p++) col[p] = paths[p][s];
    const sorted = Array.from(col).sort((a, b) => a - b);
    const q = (p: number) => sorted[Math.floor(p * (nPaths - 1))];
    const mean = sorted.reduce((acc, v) => acc + v, 0) / nPaths;
    const t = s * dt;
    const row: any = {
      t: +t.toFixed(3),
      mean: +(mean * 100).toFixed(3),
      band: [+(q(0.05) * 100).toFixed(3), +(q(0.95) * 100).toFixed(3)] as [number, number],
      forward: +(fInst(t) * 100).toFixed(3),
    };
    for (let k = 0; k < Math.min(8, nPaths); k++) row[`p${k}`] = +(paths[k][s] * 100).toFixed(3);
    chart.push(row);
  }
  return { chart, r0 };
}

const DEFAULT_MATS = [0.25, 0.5, 1, 2, 3, 5, 7, 10];

export const RatesTermStructure = () => {
  const [mode, setMode] = useState<"boot" | "hw">("boot");

  // Editable par yields (% annualized) at fixed maturity grid
  const [yields, setYields] = useState<number[]>([3.5, 3.7, 4.0, 4.2, 4.3, 4.4, 4.45, 4.5]);
  // Hull-White
  const [aHW, setAHW] = useState(0.1);
  const [sigmaHW, setSigmaHW] = useState(0.012);
  const [Tsim, setTsim] = useState(5);
  const [nPaths, setNPaths] = useState(1000);
  const [seed, setSeed] = useState(42);

  const zeros = useMemo(() => bootstrap(DEFAULT_MATS, yields.map(y => y / 100)), [yields]);
  const fwds = useMemo(() => forwardRates(DEFAULT_MATS, zeros), [zeros]);

  const curveData = useMemo(() => DEFAULT_MATS.map((t, i) => ({
    t,
    par: yields[i],
    zero: +(zeros[i] * 100).toFixed(3),
    forward: +(fwds[i] * 100).toFixed(3),
    discount: +(1 / Math.pow(1 + zeros[i], t)).toFixed(4),
  })), [yields, zeros, fwds]);

  const hwSim = useMemo(() => {
    if (mode !== "hw") return null;
    return simulateHullWhite({
      zeros, mats: DEFAULT_MATS, a: aHW, sigma: sigmaHW, T: Tsim, nSteps: 80, nPaths, seed,
    });
  }, [mode, zeros, aHW, sigmaHW, Tsim, nPaths, seed]);

  const setYieldAt = (i: number, v: number) => {
    const next = yields.slice(); next[i] = v; setYields(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 justify-center">
        {[
          { id: "boot" as const, label: "Bootstrapping 即期曲线", desc: "从 par YTM → 零息曲线" },
          { id: "hw" as const, label: "Hull-White 短端利率", desc: "校准到当前曲线的 1-因子模型" },
        ].map(opt => (
          <button key={opt.id} onClick={() => setMode(opt.id)}
            className={`px-4 py-2 rounded-lg text-xs font-mono transition-all ${
              mode === opt.id ? "bg-gold/20 text-gold border border-gold/40" : "bg-secondary text-muted-foreground border border-transparent"
            }`}
            title={opt.desc}>
            {opt.label}
          </button>
        ))}
      </div>

      {mode === "boot" && (
        <>
          <PresetButtons presets={[
            { name: "正常向上 (常态)", description: "短低长高", apply: () => setYields([3.5, 3.7, 4.0, 4.2, 4.3, 4.4, 4.45, 4.5]) },
            { name: "倒挂曲线 (衰退)", description: "短高长低", apply: () => setYields([5.5, 5.4, 5.1, 4.8, 4.5, 4.2, 4.0, 3.9]) },
            { name: "驼峰曲线", description: "中段隆起", apply: () => setYields([3.0, 3.5, 4.2, 4.8, 5.0, 4.7, 4.3, 4.0]) },
            { name: "平坦曲线", description: "近常数", apply: () => setYields([4.0, 4.0, 4.0, 4.0, 4.0, 4.0, 4.0, 4.0]) },
          ]} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-xs font-mono text-gold uppercase tracking-wider mb-2">Par 票息债 YTM (%)</p>
              {DEFAULT_MATS.map((m, i) => (
                <Slider key={m} label={`T = ${m}y`} value={yields[i]} min={0.5} max={10} step={0.05}
                  onChange={(v) => setYieldAt(i, v)} />
              ))}
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <h4 className="text-sm font-semibold text-foreground mb-2">Par / Zero / Forward 曲线</h4>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={curveData}>
                      <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                      <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                      <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} unit="%" />
                      <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="par" name="Par YTM" stroke={CHART_BLUE} strokeWidth={1.5} strokeDasharray="4 3" />
                      <Line type="monotone" dataKey="zero" name="Zero (即期)" stroke={CHART_GOLD} strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="forward" name="Forward (远期)" stroke={CHART_TEAL} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <h4 className="text-sm font-semibold text-foreground mb-2">折现因子 P(0, T)</h4>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={curveData}>
                      <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                      <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                      <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} domain={[0, 1]} />
                      <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                      <Bar dataKey="discount" fill={CHART_GOLD} fillOpacity={0.7} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
                <p><span className="text-gold">迭代 bootstrap：</span>P(0,Tᵢ)=1−c·∑ⱼ&lt;ᵢ P(0,Tⱼ)，再反解出 zᵢ。</p>
                <p>正常曲线下 forward &gt; zero &gt; par；倒挂 → 三者反向。</p>
              </div>
            </div>
          </div>
        </>
      )}

      {mode === "hw" && hwSim && (
        <>
          <PresetButtons presets={[
            { name: "标准校准", description: "a=0.1, σ=120bp", apply: () => { setAHW(0.1); setSigmaHW(0.012); } },
            { name: "强均值回复", description: "a=0.5, σ=80bp", apply: () => { setAHW(0.5); setSigmaHW(0.008); } },
            { name: "高波动情景", description: "σ=250bp", apply: () => { setAHW(0.1); setSigmaHW(0.025); } },
            { name: "近常数 a→0", description: "类布朗运动", apply: () => { setAHW(0.02); setSigmaHW(0.012); } },
          ]} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Slider label="均值回复速度 a" sub="↑则曲线平稳" value={aHW} min={0.01} max={1} step={0.01} onChange={setAHW} />
              <Slider label="σ (年化绝对波动)" sub="bp/√年" value={sigmaHW} min={0.002} max={0.05} step={0.001} onChange={setSigmaHW} />
              <Slider label="模拟期限 T (年)" value={Tsim} min={1} max={15} step={0.5} onChange={setTsim} />
              <div className="grid grid-cols-2 gap-3">
                <Slider label="路径数" value={nPaths} min={200} max={3000} step={100} onChange={setNPaths} />
                <Slider label="种子" value={seed} min={1} max={999} step={1} onChange={setSeed} />
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <Stat label="r₀ (从曲线推导)" value={`${(hwSim.r0 * 100).toFixed(3)}%`} />
                <Stat label="长期 σ_∞" value={`${(sigmaHW / Math.sqrt(2 * aHW) * 100).toFixed(3)}%`} color={CHART_TEAL}
                  sub="σ/√(2a)" />
              </div>

              <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
                <p><span className="text-gold">Hull-White (1990)：</span>扩展 Vasicek，θ(t) 由当前曲线反推 ⇒ 完美 fit 所有 ZCB 价格。</p>
                <p>θ(t) = ∂f(0,t)/∂t + a·f(0,t) + σ²/(2a)·(1−e^(−2at))。</p>
                <p>用于 caps/floors/swaptions 定价（Black 公式封闭解）与 OAS 估值树。</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <h4 className="text-sm font-semibold text-foreground mb-2">短端利率扇形图 — Hull-White vs Forward 曲线</h4>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={hwSim.chart}>
                      <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                      <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }}
                        label={{ value: "t (年)", position: "insideBottom", offset: -3, fill: CHART_TEXT, fontSize: 10 }} />
                      <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} unit="%" />
                      <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Area type="monotone" dataKey="band" name="5–95% 带" stroke="none" fill={CHART_GOLD} fillOpacity={0.18} />
                      <Line type="monotone" dataKey="mean" name="HW 均值" stroke={CHART_GOLD} strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="forward" name="初始 Forward 曲线" stroke={CHART_TEAL} strokeWidth={2} strokeDasharray="5 4" dot={false} />
                      {Array.from({ length: 8 }, (_, k) => (
                        <Line key={k} type="monotone" dataKey={`p${k}`} stroke={CHART_BLUE} strokeOpacity={0.3} strokeWidth={1} dot={false} legendType="none" />
                      ))}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] font-mono text-muted-foreground mt-1 text-center">
                  HW 期望路径与初始 Forward 曲线在期限早段对齐 ⇒ 无套利校准成功
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RatesTermStructure;
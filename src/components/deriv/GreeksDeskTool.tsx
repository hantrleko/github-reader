import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import PresetButtons from "../PresetButtons";
import SendToTool from "@/components/common/SendToTool";
import { useBusConsume } from "@/lib/toolBus";

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

function nPdf(x: number) { return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI); }
function nCdf(x: number) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * ax);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return 0.5 * (1.0 + sign * y);
}

/** Black-Scholes Greeks: returns analytic values for a European call/put. */
function bsGreeks(S: number, K: number, r: number, q: number, sigma: number, T: number, type: "call" | "put") {
  if (T <= 0 || sigma <= 0) {
    const intrinsic = type === "call" ? Math.max(S - K, 0) : Math.max(K - S, 0);
    return { price: intrinsic, delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0, vanna: 0, volga: 0, d1: 0, d2: 0 };
  }
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const Nd1 = nCdf(d1), Nd2 = nCdf(d2), nd1 = nPdf(d1);
  const disc = Math.exp(-r * T), divDisc = Math.exp(-q * T);
  const sign = type === "call" ? 1 : -1;
  const Nd1s = type === "call" ? Nd1 : Nd1 - 1;
  const Nd2s = type === "call" ? Nd2 : Nd2 - 1;

  const price = sign * (S * divDisc * (type === "call" ? Nd1 : 1 - Nd1) - K * disc * (type === "call" ? Nd2 : 1 - Nd2));
  const delta = divDisc * Nd1s;
  const gamma = (divDisc * nd1) / (S * sigma * sqrtT);
  const vega = S * divDisc * nd1 * sqrtT * 0.01; // per 1% vol
  const theta = (
    -(S * divDisc * nd1 * sigma) / (2 * sqrtT)
    + sign * (q * S * divDisc * (type === "call" ? Nd1 : 1 - Nd1)
      - r * K * disc * (type === "call" ? Nd2 : 1 - Nd2))
  ) / 365; // per day
  const rho = sign * K * T * disc * (type === "call" ? Nd2 : 1 - Nd2) * 0.01; // per 1% rate
  const vanna = -divDisc * nd1 * d2 / sigma * 0.01; // ∂²V/∂S∂σ × 1%
  const volga = vega * d1 * d2 / sigma; // already vega-scaled
  return { price, delta, gamma, vega, theta, rho, vanna, volga, d1, d2 };
}

export const GreeksDeskTool = () => {
  const [S, setS] = useState(100);
  const [K, setK] = useState(100);
  const [r, setR] = useState(0.03);
  const [q, setQ] = useState(0.0);
  const [sigma, setSigma] = useState(0.20);
  const [T, setT] = useState(0.5);
  const [type, setType] = useState<"call" | "put">("call");
  const [scan, setScan] = useState<"S" | "T">("S");

  // Receive canonical parameters handed off from another tool (IV / BS / MC).
  useBusConsume(["S0", "K", "sigma", "r", "T"], (v) => {
    if (v.S0 != null) setS(v.S0);
    if (v.K != null) setK(v.K);
    if (v.sigma != null) setSigma(v.sigma);
    if (v.r != null) setR(v.r);
    if (v.T != null) setT(v.T);
  });

  const greeks = useMemo(() => bsGreeks(S, K, r, q, sigma, T, type), [S, K, r, q, sigma, T, type]);

  const profile = useMemo(() => {
    const out: any[] = [];
    if (scan === "S") {
      const lo = K * 0.5, hi = K * 1.5;
      for (let i = 0; i <= 80; i++) {
        const x = lo + ((hi - lo) * i) / 80;
        const g = bsGreeks(x, K, r, q, sigma, T, type);
        out.push({ x: +x.toFixed(2), price: +g.price.toFixed(3), delta: +g.delta.toFixed(4), gamma: +g.gamma.toFixed(5), vega: +g.vega.toFixed(4), theta: +g.theta.toFixed(5), vanna: +g.vanna.toFixed(5) });
      }
    } else {
      for (let i = 1; i <= 80; i++) {
        const tt = (i / 80) * Math.max(T * 2, 0.1);
        const g = bsGreeks(S, K, r, q, sigma, tt, type);
        out.push({ x: +tt.toFixed(3), price: +g.price.toFixed(3), delta: +g.delta.toFixed(4), gamma: +g.gamma.toFixed(5), vega: +g.vega.toFixed(4), theta: +g.theta.toFixed(5), vanna: +g.vanna.toFixed(5) });
      }
    }
    return out;
  }, [scan, K, r, q, sigma, T, type, S]);

  const Tile = ({ name, value, sub, color = CHART_GOLD }: { name: string; value: string; sub?: string; color?: string }) => (
    <div className="rounded-lg border border-border bg-secondary/40 p-3">
      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{name}</p>
      <p className="text-base font-mono tabular-nums" style={{ color }}>{value}</p>
      {sub && <p className="text-[9px] font-mono text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <SendToTool
          fromId="greeks-desk"
          label="Greeks Desk"
          outputs={{ S0: S, K, sigma, r, T }}
          targets={["bs", "iv", "mc"]}
        />
      </div>
      <PresetButtons presets={[
        { name: "ATM 看涨", description: "标准 ATM 教学", apply: () => { setS(100); setK(100); setSigma(0.2); setT(0.5); setType("call"); } },
        { name: "深虚值 put", description: "Δ→0, Γ→0", apply: () => { setS(100); setK(70); setType("put"); } },
        { name: "短期 ATM", description: "Γ/Θ 极大", apply: () => { setT(0.05); setS(100); setK(100); setSigma(0.3); } },
        { name: "高波动率", description: "Vega 主导", apply: () => { setSigma(0.6); setS(100); setK(100); setT(1); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Slider label="S (现价)" value={S} min={50} max={200} step={1} onChange={setS} />
            <Slider label="K (执行价)" value={K} min={50} max={200} step={1} onChange={setK} />
            <Slider label="σ (年化)" value={sigma} min={0.05} max={1} step={0.01} onChange={setSigma} />
            <Slider label="T (年)" value={T} min={0.02} max={3} step={0.02} onChange={setT} />
            <Slider label="r" value={r} min={0} max={0.1} step={0.005} onChange={setR} />
            <Slider label="q (股息率)" value={q} min={0} max={0.08} step={0.005} onChange={setQ} />
          </div>
          <div className="flex gap-2">
            {(["call", "put"] as const).map(s => (
              <button key={s} onClick={() => setType(s)}
                className={`flex-1 px-3 py-2 text-xs font-mono rounded-md border transition-all ${type === s ? "bg-gold/20 border-gold text-gold" : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"}`}>
                {s === "call" ? "Call" : "Put"}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <span className="text-[10px] font-mono text-muted-foreground self-center uppercase tracking-wider">扫描:</span>
            {(["S", "T"] as const).map(s => (
              <button key={s} onClick={() => setScan(s)}
                className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-all ${scan === s ? "bg-gold/20 border-gold text-gold" : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"}`}>
                {s === "S" ? "标的价格 S" : "到期时间 T"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Tile name="价格" value={greeks.price.toFixed(3)} />
          <Tile name="Δ Delta" value={greeks.delta.toFixed(4)} sub="∂V/∂S" color={CHART_TEAL} />
          <Tile name="Γ Gamma" value={greeks.gamma.toFixed(5)} sub="∂²V/∂S²" color={CHART_BLUE} />
          <Tile name="Vega (×1%)" value={greeks.vega.toFixed(4)} sub="∂V/∂σ" color={CHART_GOLD} />
          <Tile name="Θ Theta /日" value={greeks.theta.toFixed(5)} sub="−∂V/∂T" color={CHART_RED} />
          <Tile name="ρ Rho (×1%)" value={greeks.rho.toFixed(4)} sub="∂V/∂r" color={CHART_TEAL} />
          <Tile name="Vanna" value={greeks.vanna.toFixed(5)} sub="∂Δ/∂σ" color={CHART_BLUE} />
          <Tile name="Volga" value={greeks.volga.toFixed(5)} sub="∂Vega/∂σ" color={CHART_BLUE} />
          <Tile name="d₁" value={greeks.d1.toFixed(3)} sub={`d₂ = ${greeks.d2.toFixed(3)}`} color={CHART_TEXT} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">
          Greeks 剖面 — 沿 {scan === "S" ? "标的价格 S" : "到期时间 T"} 扫描
        </h4>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={profile}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="x" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="left" type="monotone" dataKey="delta" name="Δ" stroke={CHART_TEAL} strokeWidth={2} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="gamma" name="Γ ×100" stroke={CHART_BLUE} strokeWidth={2} dot={false}
                strokeDasharray="3 3" />
              <Line yAxisId="left" type="monotone" dataKey="vega" name="Vega ×1%" stroke={CHART_GOLD} strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="theta" name="Θ /日" stroke={CHART_RED} strokeWidth={2} dot={false} />
              {scan === "S" && <ReferenceLine yAxisId="left" x={K} stroke={CHART_RED} strokeDasharray="3 3" label={{ value: "K", fill: CHART_RED, fontSize: 10 }} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground mt-2 leading-relaxed">
          Δ = e<sup>−qT</sup>·N(d₁)，Γ = e<sup>−qT</sup>·n(d₁)/(Sσ√T)，Vega = S·e<sup>−qT</sup>·n(d₁)·√T。Vanna = −e<sup>−qT</sup>·n(d₁)·d₂/σ 用于波动率倾斜对 Δ-hedge 的二阶冲击；Volga = Vega·d₁d₂/σ 度量 Vega 自身的"曲率"。
        </p>
      </div>
    </div>
  );
};

export default GreeksDeskTool;

import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { C, Slider, Stat, tooltipStyle } from "../frontier/ui";

const KEY_TENORS = [1, 2, 3, 5, 7, 10, 20, 30];

/** Nelson-Siegel spot rate (%) at maturity τ. */
function nsRate(tau: number, b0: number, b1: number, b2: number, lambda: number) {
  if (tau <= 0) return b0 + b1;
  const x = tau / lambda;
  const decay = (1 - Math.exp(-x)) / x;
  return b0 + b1 * decay + b2 * (decay - Math.exp(-x));
}

/** Triangular key-rate hat for key j evaluated at time t (∈[0,1]). */
function hat(t: number, keys: number[], j: number) {
  const k = keys[j];
  const prev = j > 0 ? keys[j - 1] : -Infinity;
  const next = j < keys.length - 1 ? keys[j + 1] : Infinity;
  if (t <= k) {
    if (prev === -Infinity) return 1; // flat to the left of first key
    if (t <= prev) return 0;
    return (t - prev) / (k - prev);
  } else {
    if (next === Infinity) return 1; // flat to the right of last key
    if (t >= next) return 0;
    return (next - t) / (next - k);
  }
}

export const KeyRateDurationTool = () => {
  const [couponRate, setCouponRate] = useState(5);
  const [maturity, setMaturity] = useState(10);
  const [b0, setB0] = useState(4.5);
  const [b1, setB1] = useState(-1.5);
  const [b2, setB2] = useState(1.0);
  const [lambda, setLambda] = useState(2.0);

  const res = useMemo(() => {
    const freq = 2;
    const n = Math.round(maturity * freq);
    const c = couponRate / freq; // coupon per period on face 100
    const times = Array.from({ length: n }, (_, i) => (i + 1) / freq);
    const cfs = times.map((_, i) => (i === n - 1 ? 100 + c : c));
    const keys = KEY_TENORS.filter((k) => k <= maturity + 0.01);
    if (keys.length === 0 || keys[keys.length - 1] < maturity) keys.push(maturity);

    const price = (shiftBpFn: (t: number) => number) =>
      times.reduce((s, t, i) => {
        const z = nsRate(t, b0, b1, b2, lambda) + shiftBpFn(t);
        return s + cfs[i] / Math.pow(1 + z / 100, t);
      }, 0);

    const P0 = price(() => 0);
    const bumpDecimal = 0.0001; // 1bp
    const bumpPct = 0.01; // 1bp in % units

    const krd = keys.map((k, j) => {
      const up = price((t) => hat(t, keys, j) * bumpPct);
      const dn = price((t) => -hat(t, keys, j) * bumpPct);
      const d = -(up - dn) / (2 * bumpDecimal * P0);
      return { tenor: `${k}Y`, krd: +d.toFixed(3), k };
    });

    // total parallel-shift effective duration
    const upP = price(() => bumpPct);
    const dnP = price(() => -bumpPct);
    const effDur = -(upP - dnP) / (2 * bumpDecimal * P0);
    const sumKrd = krd.reduce((s, r) => s + r.krd, 0);

    return { P0, krd, effDur, sumKrd };
  }, [couponRate, maturity, b0, b1, b2, lambda]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "10Y 5% 正常曲线", description: "上斜收益率曲线", apply: () => { setCouponRate(5); setMaturity(10); setB0(4.5); setB1(-1.5); setB2(1.0); setLambda(2); } },
        { name: "30Y 长债", description: "久期集中长端", apply: () => { setCouponRate(4); setMaturity(30); setB0(4.5); setB1(-1); setB2(0.5); } },
        { name: "倒挂曲线", description: "短端更高", apply: () => { setB0(3); setB1(2); setB2(-1); setMaturity(10); } },
        { name: "零息债", description: "KRD 集中到期点", apply: () => { setCouponRate(0); setMaturity(10); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">债券与 NS 曲线参数</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="票面利率 c%" value={couponRate} min={0} max={12} step={0.5} onChange={setCouponRate} />
            <Slider label="到期 T (年)" value={maturity} min={1} max={30} step={1} onChange={setMaturity} />
            <Slider label="β₀ (水平)" value={b0} min={1} max={8} step={0.1} onChange={setB0} />
            <Slider label="β₁ (斜率)" value={b1} min={-4} max={4} step={0.1} onChange={setB1} />
            <Slider label="β₂ (曲率)" value={b2} min={-4} max={4} step={0.1} onChange={setB2} />
            <Slider label="λ (衰减)" value={lambda} min={0.5} max={5} step={0.1} onChange={setLambda} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="债券价格 P" value={res.P0.toFixed(3)} />
          <Stat label="有效久期 (平行)" value={res.effDur.toFixed(3)} color={C.teal} sub="平行 ±1bp" />
          <Stat label="Σ KRD" value={res.sumKrd.toFixed(3)} color={C.gold} sub="≈ 有效久期" />
          <Stat label="一致性误差" value={Math.abs(res.sumKrd - res.effDur).toFixed(4)} color={C.red} sup="" sub="Σ KRD − 有效久期" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">关键利率久期分解 — 各期限点的局部利率敏感度</h4>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={res.krd}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="tenor" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "KRD (年)", angle: -90, position: "insideLeft", fill: C.text, fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={0} stroke={C.text} />
              <Bar dataKey="krd" name="KRD">
                {res.krd.map((r, i) => (
                  <Cell key={i} fill={r.k >= maturity - 0.5 ? C.gold : C.blue} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground mt-2 leading-relaxed">每个柱表示曲线在该期限点局部上移 1bp 对价格的敏感度；到期点 (金色) 因本金偿还通常贡献最大。各 KRD 之和近似等于平行移动的有效久期。</p>
      </div>

      <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
        <p><span className="text-gold">关键利率久期 (Ho 1992)：</span>把单一久期分解到曲线的多个期限点，刻画非平行移动（陡峭化/平坦化/蝶式）的风险。</p>
        <p><span className="text-gold">用途：</span>对冲组合时仅看总久期会漏掉曲线形变风险；KRD 指导分期限对冲与曲线交易。</p>
      </div>
    </div>
  );
};

export default KeyRateDurationTool;
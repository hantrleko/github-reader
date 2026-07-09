import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceDot, ReferenceLine, ComposedChart, Scatter, BarChart, Bar, Cell,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { ols } from "@/lib/quant/ols";
import { rollingBeta } from "@/lib/quant/assetPricing";

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

const Note = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">{children}</div>
);

const ChartCard = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-secondary/20 p-4">
    <h4 className="text-sm font-semibold text-foreground mb-2">{title}</h4>
    <div className="h-[300px]">{children}</div>
    {hint && <p className="text-[10px] font-mono text-muted-foreground mt-2 leading-relaxed">{hint}</p>}
  </div>
);

/* ════════════════════════════════════════════════════════════
   1. CAPM / SML — Security Market Line & Jensen's alpha
   E(R) = Rf + β·(E(Rm) − Rf)
   ════════════════════════════════════════════════════════════ */
export const CAPMTool = () => {
  const [rf, setRf] = useState(3);
  const [erm, setErm] = useState(9);
  const [beta, setBeta] = useState(1.2);
  const [actual, setActual] = useState(12);  // realized/expected asset return

  const r = useMemo(() => {
    const prem = erm - rf;
    const required = rf + beta * prem;
    const alpha = actual - required;       // Jensen's alpha
    const treynor = beta !== 0 ? (actual - rf) / beta : 0;
    return { prem, required, alpha, treynor };
  }, [rf, erm, beta, actual]);

  const sml = useMemo(() => {
    const out: { beta: number; sml: number }[] = [];
    for (let b = 0; b <= 2.5; b += 0.1) out.push({ beta: +b.toFixed(2), sml: +(rf + b * r.prem).toFixed(2) });
    return out;
  }, [rf, r]);

  // Time-varying β demo: simulate returns whose true β drifts, then estimate
  // rolling-window β to show estimation uncertainty around the input β.
  const rolling = useMemo(() => {
    const rng = mulberry32(7);
    const T = 180;
    const window = 36;
    const mkt: number[] = [];
    const asset: number[] = [];
    for (let t = 0; t < T; t++) {
      const trueBeta = beta * (0.7 + 0.6 * (t / T)); // drift 0.7β → 1.3β
      const m = randn(rng) * 4.5;
      mkt.push(m);
      asset.push(trueBeta * m + randn(rng) * 3);
    }
    return rollingBeta(asset, mkt, window).map((p) => ({
      t: p.t,
      beta: +p.beta.toFixed(3),
      input: +beta.toFixed(3),
    }));
  }, [beta]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "市场组合", description: "β=1", apply: () => { setRf(3); setErm(9); setBeta(1); setActual(9); } },
        { name: "进攻型 (跑赢)", description: "β=1.5, α>0", apply: () => { setBeta(1.5); setActual(15); } },
        { name: "防御型", description: "β=0.6", apply: () => { setBeta(0.6); setActual(7); } },
        { name: "负 alpha", description: "跑输 SML", apply: () => { setBeta(1.2); setActual(8); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label="无风险利率 Rf (%)" value={rf} min={0} max={6} step={0.25} onChange={setRf} />
          <Slider label="市场预期收益 E(Rm) (%)" value={erm} min={4} max={16} step={0.5} onChange={setErm} />
          <Slider label="资产 β" value={beta} min={0} max={2.5} step={0.05} onChange={setBeta} />
          <Slider label="资产实际/预期收益 (%)" value={actual} min={0} max={20} step={0.5} onChange={setActual} />
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="市场风险溢价" value={`${r.prem.toFixed(2)}%`} sub="E(Rm) − Rf" />
            <Stat label="CAPM 要求收益" value={`${r.required.toFixed(2)}%`} color={CHART_TEAL} sub="Rf + β·溢价" />
            <Stat label="Jensen's α" value={`${r.alpha >= 0 ? "+" : ""}${r.alpha.toFixed(2)}%`} color={r.alpha >= 0 ? CHART_TEAL : CHART_RED} sub={r.alpha >= 0 ? "跑赢 SML" : "跑输 SML"} />
            <Stat label="Treynor 比率" value={r.treynor.toFixed(2)} color={CHART_GOLD} sub="(R−Rf)/β" />
          </div>
          <Note>
            <p><span className="text-gold">CAPM (Sharpe 1964)：</span>资产预期超额收益仅由系统性风险 β 决定。</p>
            <p><span className="text-gold">SML：</span>证券市场线刻画 β 与 E(R) 的线性关系；位于线上方 ⟹ 正 α（被低估）。</p>
            <p>非系统性风险可分散，因此不获补偿——只有 β 被定价。</p>
          </Note>
        </div>
      </div>
      <ChartCard title="证券市场线 (SML)" hint="金线为 SML。资产点在 SML 上方 ⟹ 正 alpha（被低估）；下方 ⟹ 负 alpha。">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={sml}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="beta" type="number" stroke={CHART_TEXT} tick={{ fontSize: 10 }} domain={[0, 2.5]} label={{ value: "β", position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "E(R) %", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="sml" name="SML" stroke={CHART_GOLD} strokeWidth={2.5} dot={false} />
            <ReferenceDot x={beta} y={r.required} r={4} fill={CHART_TEAL} stroke="none" />
            <ReferenceDot x={beta} y={actual} r={5} fill={r.alpha >= 0 ? CHART_TEAL : CHART_RED} stroke="hsl(var(--background))" strokeWidth={1} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="滚动 β 估计 (36 期窗口)" hint="真实 β 在样本内从 0.7β 漂移到 1.3β。滚动窗口回归的 β̂ 围绕真实值波动——说明 β 并非常数、估计存在不确定性，静态 CAPM 需谨慎解读。">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rolling}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="beta" name="滚动 β̂" stroke={CHART_GOLD} strokeWidth={1.8} dot={false} />
            <Line type="monotone" dataKey="input" name="输入 β" stroke={CHART_BLUE} strokeWidth={1.2} strokeDasharray="4 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   2. APT — multi-factor arbitrage pricing
   E(R) = Rf + Σ βᵢ·Fᵢ
   ════════════════════════════════════════════════════════════ */
export const APTTool = () => {
  const [rf, setRf] = useState(3);
  const [b1, setB1] = useState(1.0); const [f1, setF1] = useState(5);   // market
  const [b2, setB2] = useState(0.4); const [f2, setF2] = useState(3);   // inflation/size
  const [b3, setB3] = useState(-0.3); const [f3, setF3] = useState(2);  // industrial/value

  const r = useMemo(() => {
    const c1 = b1 * f1, c2 = b2 * f2, c3 = b3 * f3;
    const er = rf + c1 + c2 + c3;
    return {
      er,
      contrib: [
        { name: "无风险", v: +rf.toFixed(2), color: CHART_TEXT },
        { name: "因子1 (市场)", v: +c1.toFixed(2), color: CHART_GOLD },
        { name: "因子2 (规模/通胀)", v: +c2.toFixed(2), color: CHART_BLUE },
        { name: "因子3 (价值/工业)", v: +c3.toFixed(2), color: CHART_RED },
      ],
    };
  }, [rf, b1, f1, b2, f2, b3, f3]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "单因子 (≈CAPM)", description: "仅市场暴露", apply: () => { setB1(1); setB2(0); setB3(0); } },
        { name: "成长股", description: "负价值暴露", apply: () => { setB1(1.2); setB2(0.5); setB3(-0.5); } },
        { name: "价值股", description: "正价值暴露", apply: () => { setB1(0.9); setB2(0.3); setB3(0.6); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label="无风险利率 Rf (%)" value={rf} min={0} max={6} step={0.25} onChange={setRf} />
          <div className="grid grid-cols-2 gap-3">
            <Slider label="β₁ (市场)" value={b1} min={-1} max={2} step={0.1} onChange={setB1} />
            <Slider label="F₁ 溢价 (%)" value={f1} min={0} max={10} step={0.5} onChange={setF1} />
            <Slider label="β₂ (规模/通胀)" value={b2} min={-1} max={2} step={0.1} onChange={setB2} />
            <Slider label="F₂ 溢价 (%)" value={f2} min={-4} max={8} step={0.5} onChange={setF2} />
            <Slider label="β₃ (价值/工业)" value={b3} min={-1} max={2} step={0.1} onChange={setB3} />
            <Slider label="F₃ 溢价 (%)" value={f3} min={-4} max={8} step={0.5} onChange={setF3} />
          </div>
        </div>
        <div className="space-y-3">
          <Stat label="APT 预期收益 E(R)" value={`${r.er.toFixed(2)}%`} sub="Rf + Σ βᵢ·Fᵢ" />
          <Note>
            <p><span className="text-gold">APT (Ross 1976)：</span>基于无套利原则，预期收益是多个宏观因子暴露的线性组合。</p>
            <p>不依赖市场组合假设；但理论不指定具体因子（"因子选择困境"）。</p>
            <p>每个因子贡献 = βᵢ × 因子溢价 Fᵢ；负载荷表示对冲该因子。</p>
          </Note>
        </div>
      </div>
      <ChartCard title="收益分解 — 各因子贡献">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={r.contrib}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke={CHART_TEXT} tick={{ fontSize: 9 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "贡献 %", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
            <Bar dataKey="v" name="收益贡献">
              {r.contrib.map((c, i) => <Cell key={i} fill={c.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   3. Fama-French — 3/5-factor regression (DGP simulation + OLS)
   Rᵢ − Rf = α + β₁(Rm−Rf) + β₂SMB + β₃HML [+ β₄RMW + β₅CMA] + ε
   ════════════════════════════════════════════════════════════ */
export const FamaFrenchTool = () => {
  const [five, setFive] = useState(false);
  const [n, setN] = useState(120);
  const [trueAlpha, setTrueAlpha] = useState(0.1);
  const [bMkt, setBMkt] = useState(1.1);
  const [bSmb, setBSmb] = useState(0.4);
  const [bHml, setBHml] = useState(0.6);
  const [bRmw, setBRmw] = useState(0.2);
  const [bCma, setBCma] = useState(-0.3);
  const [noise, setNoise] = useState(2);
  const [seed, setSeed] = useState(42);

  const res = useMemo(() => {
    const rng = mulberry32(seed);
    const X: number[][] = [];
    const y: number[] = [];
    const labels = five
      ? ["α", "Mkt-RF", "SMB", "HML", "RMW", "CMA"]
      : ["α", "Mkt-RF", "SMB", "HML"];
    const trueB = five
      ? [trueAlpha, bMkt, bSmb, bHml, bRmw, bCma]
      : [trueAlpha, bMkt, bSmb, bHml];
    for (let i = 0; i < n; i++) {
      const mkt = randn(rng) * 4;
      const smb = randn(rng) * 3;
      const hml = randn(rng) * 3;
      const rmw = randn(rng) * 2.5;
      const cma = randn(rng) * 2.5;
      const row = five ? [mkt, smb, hml, rmw, cma] : [mkt, smb, hml];
      let ri = trueAlpha + bMkt * mkt + bSmb * smb + bHml * hml;
      if (five) ri += bRmw * rmw + bCma * cma;
      ri += randn(rng) * noise;
      X.push(row);
      y.push(ri);
    }
    const o = ols(X, y);
    const rows = o.beta.map((b, i) => ({
      label: labels[i],
      est: b,
      truth: trueB[i],
      se: o.se[i],
      t: o.tStat[i],
    }));
    return { o, rows };
  }, [five, n, trueAlpha, bMkt, bSmb, bHml, bRmw, bCma, noise, seed]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "三因子", description: "Mkt+SMB+HML", apply: () => { setFive(false); setTrueAlpha(0.1); setBMkt(1.1); setBSmb(0.4); setBHml(0.6); } },
        { name: "五因子", description: "+RMW+CMA", apply: () => { setFive(true); } },
        { name: "零 alpha", description: "纯因子暴露", apply: () => { setTrueAlpha(0); } },
        { name: "高噪声", description: "难以识别", apply: () => { setNoise(5); } },
      ]} />
      <div className="flex gap-2 mb-2">
        {[{ id: false, label: "3 因子" }, { id: true, label: "5 因子" }].map(m => (
          <button key={String(m.id)} onClick={() => setFive(m.id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-mono transition-all ${five === m.id ? "bg-primary text-primary-foreground shadow" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
            {m.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Slider label="样本月数 n" value={n} min={36} max={360} step={12} onChange={setN} />
            <Slider label="真实 α (月%)" value={trueAlpha} min={-0.5} max={0.5} step={0.05} onChange={setTrueAlpha} />
            <Slider label="β 市场" value={bMkt} min={0} max={2} step={0.05} onChange={setBMkt} />
            <Slider label="β SMB" value={bSmb} min={-1} max={1.5} step={0.05} onChange={setBSmb} />
            <Slider label="β HML" value={bHml} min={-1} max={1.5} step={0.05} onChange={setBHml} />
            {five && <Slider label="β RMW" value={bRmw} min={-1} max={1.5} step={0.05} onChange={setBRmw} />}
            {five && <Slider label="β CMA" value={bCma} min={-1} max={1.5} step={0.05} onChange={setBCma} />}
            <Slider label="残差波动 σ" value={noise} min={0.5} max={6} step={0.5} onChange={setNoise} />
            <Slider label="随机种子" value={seed} min={1} max={999} step={1} onChange={setSeed} />
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="R²" value={res.o.r2.toFixed(3)} sub={`调整 R²=${res.o.adjR2.toFixed(3)}`} />
            <Stat label="估计 α" value={res.rows[0].est.toFixed(3)} color={Math.abs(res.rows[0].t) > 2 ? CHART_RED : CHART_TEAL} sub={`t=${res.rows[0].t.toFixed(2)}`} />
          </div>
          <Note>
            <p><span className="text-gold">Fama-French (1993/2015)：</span>在市场因子上加入规模 (SMB)、价值 (HML)、盈利 (RMW)、投资 (CMA)。</p>
            <p>显著的 α (|t|&gt;2) ⟹ 因子无法解释的超额收益；α≈0 ⟹ 收益完全由因子暴露解释。</p>
            <p>此处用已知载荷的模拟数据生成收益并回归恢复，演示因子归因。</p>
          </Note>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 p-4 overflow-x-auto">
        <h4 className="text-sm font-semibold text-foreground mb-3">回归结果 — 估计 vs 真实载荷</h4>
        <table className="w-full text-xs font-mono border-collapse">
          <thead>
            <tr className="text-gold text-left">
              <th className="p-2 border-b border-border">系数</th>
              <th className="p-2 border-b border-border">估计值</th>
              <th className="p-2 border-b border-border">真实值</th>
              <th className="p-2 border-b border-border">标准误</th>
              <th className="p-2 border-b border-border">t 值</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            {res.rows.map(row => (
              <tr key={row.label}>
                <td className="p-2 border-b border-border/40 text-foreground">{row.label}</td>
                <td className="p-2 border-b border-border/40">{row.est.toFixed(3)}</td>
                <td className="p-2 border-b border-border/40">{row.truth.toFixed(3)}</td>
                <td className="p-2 border-b border-border/40">{row.se.toFixed(3)}</td>
                <td className="p-2 border-b border-border/40" style={{ color: Math.abs(row.t) > 2 ? CHART_GOLD : undefined }}>{row.t.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   4. Fama-MacBeth — two-pass cross-sectional regression
   Pass 1 (time series):  R_it - Rf = a_i + β_i·F_t + ε_it  → β_i
   Pass 2 (cross section, each t):  R_it = λ0_t + λ_t·β_i + u_it
   λ̂ = mean_t(λ_t),  SE_FM = std(λ_t)/√T,  + Shanken correction
   ════════════════════════════════════════════════════════════ */
export const FamaMacBethTool = () => {
  const [nAssets, setNAssets] = useState(40);
  const [T, setT] = useState(120);
  const [lambdaTrue, setLambdaTrue] = useState(0.6); // true factor premium (% per period)
  const [noise, setNoise] = useState(3); // idiosyncratic vol
  const [seed, setSeed] = useState(11);

  const res = useMemo(() => {
    const rng = mulberry32(seed);
    const N = Math.round(nAssets);
    const periods = Math.round(T);
    // true betas spread across assets
    const betaTrue = Array.from({ length: N }, () => 0.3 + rng() * 1.6);
    // factor realizations: mean = lambdaTrue, some vol
    const factor = Array.from({ length: periods }, () => lambdaTrue + randn(rng) * 4);
    // returns panel R[i][t] = betaTrue_i * factor_t + idiosyncratic
    const R: number[][] = betaTrue.map((b) =>
      factor.map((f) => b * f + randn(rng) * noise)
    );

    // Pass 1: estimate beta_i from time-series regression on factor
    const betaHat = R.map((ri) => {
      const X = factor.map((f) => [f]);
      return ols(X, ri).beta[1];
    });

    // Pass 2: each period, cross-sectional regression R_it ~ betaHat
    const lamSeries: { t: number; lambda: number; gamma0: number }[] = [];
    const lambdas: number[] = [];
    const gamma0s: number[] = [];
    for (let t = 0; t < periods; t++) {
      const y = R.map((ri) => ri[t]);
      const X = betaHat.map((b) => [b]);
      const cs = ols(X, y);
      gamma0s.push(cs.beta[0]);
      lambdas.push(cs.beta[1]);
      lamSeries.push({ t, lambda: +cs.beta[1].toFixed(3), gamma0: +cs.beta[0].toFixed(3) });
    }

    const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
    const std = (a: number[], m: number) => Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
    const lamHat = mean(lambdas);
    const lamStd = std(lambdas, lamHat);
    const seFM = lamStd / Math.sqrt(periods);
    const tFM = lamHat / seFM;
    // Shanken correction factor c = (1 + λ̂²/σ_f²)
    const fMean = mean(factor);
    const fVar = std(factor, fMean) ** 2;
    const shanken = 1 + (lamHat * lamHat) / fVar;
    const seShanken = seFM * Math.sqrt(shanken);
    const tShanken = lamHat / seShanken;

    const g0Hat = mean(gamma0s);
    const seG0 = std(gamma0s, g0Hat) / Math.sqrt(periods);

    return {
      lamHat, seFM, tFM, seShanken, tShanken, shanken,
      g0Hat, seG0, tG0: g0Hat / seG0,
      lamSeries, lambdaTrue,
    };
  }, [nAssets, T, lambdaTrue, noise, seed]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "经典面板", description: "N=40,T=120", apply: () => { setNAssets(40); setT(120); setLambdaTrue(0.6); setNoise(3); } },
        { name: "强因子溢价", description: "λ=1.2", apply: () => { setLambdaTrue(1.2); setNoise(3); } },
        { name: "零溢价 (无定价)", description: "λ=0", apply: () => { setLambdaTrue(0); } },
        { name: "短样本噪声大", description: "T=36, noise=6", apply: () => { setT(36); setNoise(6); } },
        { name: "大横截面", description: "N=100", apply: () => { setNAssets(100); setT(180); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">面板与因子参数</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="N (资产数)" value={nAssets} min={15} max={120} step={5} onChange={setNAssets} />
            <Slider label="T (期数)" value={T} min={24} max={240} step={6} onChange={setT} />
            <Slider label="λ 真实溢价" sub="%/期" value={lambdaTrue} min={0} max={1.5} step={0.05} onChange={setLambdaTrue} />
            <Slider label="特异波动" value={noise} min={0.5} max={8} step={0.5} onChange={setNoise} />
          </div>
          <Slider label="随机种子" value={seed} min={1} max={99} step={1} onChange={setSeed} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="λ̂ (估计溢价)" value={res.lamHat.toFixed(3)} sub={`真实 ${res.lambdaTrue.toFixed(2)}`} />
          <Stat label="FM 标准误" value={res.seFM.toFixed(3)} color={CHART_BLUE} sub={`t=${res.tFM.toFixed(2)}`} />
          <Stat label="Shanken 标准误" value={res.seShanken.toFixed(3)} color={CHART_RED} sub={`t=${res.tShanken.toFixed(2)}`} />
          <Stat label="Shanken 因子" value={res.shanken.toFixed(3)} color={CHART_TEAL} sub="EIV 修正放大" />
          <Stat label="γ₀ (零β截距)" value={res.g0Hat.toFixed(3)} sub={`t=${res.tG0.toFixed(2)}`} color={Math.abs(res.tG0) > 2 ? CHART_RED : undefined} />
          <Stat label="定价结论" value={Math.abs(res.tShanken) > 2 ? "显著" : "不显著"} color={Math.abs(res.tShanken) > 2 ? CHART_GOLD : undefined} />
        </div>
      </div>

      <ChartCard title="每期横截面溢价 λ_t 时间序列" hint="Fama-MacBeth 取各期 λ_t 的时间均值；其时序波动给出标准误。Shanken 修正纠正第一阶段 β 估计误差 (EIV) 导致的过度自信。">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={res.lamSeries}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="lambda" name="λ_t" stroke={CHART_GOLD} strokeWidth={1.8} dot={false} />
            <ReferenceLine y={res.lamHat} stroke={CHART_RED} strokeDasharray="4 3" label={{ value: "λ̂", fill: CHART_RED, fontSize: 10 }} />
            <ReferenceLine y={res.lambdaTrue} stroke={CHART_BLUE} strokeDasharray="2 2" label={{ value: "真实", fill: CHART_BLUE, fontSize: 10 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <Note>
        <p><span className="text-gold">Fama-MacBeth (1973)：</span>两阶段横截面回归——先时序估 β，再逐期横截面回归得风险溢价 λ_t。</p>
        <p><span className="text-gold">FM 标准误：</span>SE(λ̂)=std(λ_t)/√T，自动稳健于横截面相关。</p>
        <p><span className="text-gold">Shanken 修正：</span>第一阶段 β 含估计误差 (errors-in-variables)，使 t 值偏大；乘以 √(1+λ̂²/σ_f²) 修正。</p>
      </Note>
    </div>
  );
};
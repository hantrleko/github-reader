import { useMemo, useState } from "react";
import { useToolTab } from "@/lib/useToolTab";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, Area, ComposedChart, Bar,
} from "recharts";
import { C, Slider, Stat, tooltipStyle } from "@/components/frontier/ui";
import PresetButtons from "@/components/PresetButtons";
import {
  debtDynamics, fiscalSpaceScore,
  dornbuschIRF,
  bopGaps,
  bggAccelerator,
  zlbNKSolve, forwardGuidanceAmplification,
} from "@/lib/quant/macroAdvanced";

type Tab = "debt" | "fx" | "bgg" | "zlb";

const TABS: { id: Tab; title: string; kicker: string; desc: string }[] = [
  { id: "debt", title: "财政与债务动态", kicker: "Debt/Blanchard", desc: "b_{t+1}=(1+r)/(1+g)·b_t−s 与 r−g 财政空间" },
  { id: "fx",   title: "汇率与外部平衡", kicker: "Dornbusch/BOP", desc: "粘性价格汇率超调 + S−I / T−G / CA 三缺口" },
  { id: "bgg",  title: "金融加速器",   kicker: "BGG",             desc: "净值冲击 → EFP → 投资/产出的非线性放大" },
  { id: "zlb",  title: "ZLB 与前瞻指引", kicker: "ZLB/FG",         desc: "零利率下限约束下 NK 模型 & 前瞻指引 puzzle" },
];

export default function V46MacroLab() {
  const [tab, setTab] = useToolTab<Tab>(TABS.map((x) => x.id), "debt");
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-card/50 p-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-1">V4.6 · Macro Lab</p>
        <h2 className="text-2xl font-serif text-foreground">宏观经济学高阶实验室</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
          围绕四大现代宏观议题展开: 财政可持续性 (Blanchard r−g)、汇率超调 (Dornbusch)、
          外部平衡三缺口 (BOP)、金融加速器 (Bernanke-Gertler-Gilchrist)、
          零利率下限 (ZLB) 与前瞻指引 puzzle。与 /s/macro 的经典模型 (IS-LM / Solow / DSGE) 互为补充。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3.5 py-2 rounded-lg border text-xs font-mono transition-colors ${
                tab === t.id ? "bg-gold/15 border-gold/60 text-gold"
                             : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
              }`}>
              <span className="uppercase tracking-wider mr-2">{t.kicker}</span>{t.title}
            </button>
          ))}
        </div>
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {tab === "debt" && <DebtPanel />}
        {tab === "fx"   && <FxPanel />}
        {tab === "bgg"  && <BGGPanel />}
        {tab === "zlb"  && <ZLBPanel />}
      </motion.div>

      <div className="rounded-lg border border-border bg-card/60 p-4 text-[11px] font-mono text-muted-foreground leading-relaxed">
        <p className="text-gold uppercase tracking-wider mb-2">参考文献</p>
        <p>Blanchard (2019) Public Debt and Low Interest Rates · Dornbusch (1976) Expectations and Exchange Rate Dynamics · Bernanke-Gertler-Gilchrist (1999) The Financial Accelerator in a Quantitative Business Cycle Framework · Eggertsson-Woodford (2003) The Zero Bound on Interest Rates · Del Negro-Giannoni-Patterson (2015) The Forward Guidance Puzzle.</p>
      </div>
    </section>
  );
}

/* ─── Panel 1: Debt sustainability & Blanchard ─── */
function DebtPanel() {
  const [b0, setB0] = useState(1.0);
  const [r, setR] = useState(0.04);
  const [g, setG] = useState(0.02);
  const [s, setS] = useState(0.005);
  const [H, setH] = useState(30);

  const path = useMemo(() => debtDynamics({ b0, r, g, primarySurplus: s, horizon: H }), [b0, r, g, s, H]);
  const chart = path.years.map((y, i) => ({ y, debt: +(path.debt[i] * 100).toFixed(2), interest: +(path.interestBurden[i] * 100).toFixed(2) }));
  const score = fiscalSpaceScore(r, g);
  const regimeColor = score.regime === "safe" ? C.green : score.regime === "watch" ? C.gold : C.red;

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "低利率陷阱 (r<g)", description: "r=1%, g=2.5%", apply: () => { setR(0.01); setG(0.025); setS(0); } },
        { name: "r>g 债务螺旋", description: "r=5%, g=1.5%, s=0", apply: () => { setR(0.05); setG(0.015); setS(0); } },
        { name: "财政整顿", description: "s=1.5% 削债", apply: () => { setR(0.04); setG(0.02); setS(0.015); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">债务动态参数</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="初始债务 b₀" value={b0} min={0.2} max={2.5} step={0.05} onChange={setB0} fmt={(v)=>`${(v*100).toFixed(0)}%`} />
            <Slider label="实际利率 r" value={r} min={-0.02} max={0.1} step={0.005} onChange={setR} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label="潜在增长 g" value={g} min={-0.01} max={0.08} step={0.005} onChange={setG} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label="基本盈余 s" value={s} min={-0.03} max={0.05} step={0.0025} onChange={setS} fmt={(v)=>`${(v*100).toFixed(2)}%`} />
            <Slider label="模拟年限" value={H} min={5} max={60} step={5} onChange={setH} />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Stat label="r − g" value={`${(score.rMinusG * 100).toFixed(2)}%`} color={regimeColor} sub={score.message} />
            <Stat label="稳定所需 s*" value={`${(path.stabilizingSurplus * 100).toFixed(2)}%`} color={C.gold} sub="(r−g)/(1+g)·b₀" />
            <Stat label="终期债务 b_H" value={`${(path.finalDebt * 100).toFixed(1)}%`} color={path.finalDebt > b0 ? C.red : C.green} />
            <Stat label="财政空间" value={score.regime === "safe" ? "SAFE" : score.regime === "watch" ? "WATCH" : "DANGER"} color={regimeColor} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <p className="text-xs font-mono text-gold uppercase tracking-wider mb-2">债务 / GDP 轨迹</p>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <ComposedChart data={chart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="y" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "年", position:"insideBottom", offset:-4, fill:C.text, fontSize:10 }} />
                <YAxis yAxisId="l" stroke={C.gold} tick={{ fontSize: 10 }} label={{ value: "b/GDP %", angle:-90, position:"insideLeft", fill:C.gold, fontSize:10 }} />
                <YAxis yAxisId="r" orientation="right" stroke={C.red} tick={{ fontSize: 10 }} label={{ value: "利息负担 %", angle:90, position:"insideRight", fill:C.red, fontSize:10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line yAxisId="l" type="monotone" dataKey="debt" stroke={C.gold} strokeWidth={2} dot={false} name="Debt/GDP" />
                <Bar yAxisId="r" dataKey="interest" fill={C.red} fillOpacity={0.35} name="(r−g)b_{t−1}" />
                <ReferenceLine yAxisId="l" y={b0 * 100} stroke={C.text} strokeDasharray="4 4" label={{ value: "b₀", fill: C.text, fontSize: 10 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground mt-2">
            金条 = 债务/GDP;红色柱 = 每期利息-增长差价负担。s &lt; s* 则轨迹上行。
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Panel 2: FX Overshooting + BOP gaps ─── */
function FxPanel() {
  const [dm, setDm] = useState(0.05);
  const [theta, setTheta] = useState(0.3);
  const [lambda, setLambda] = useState(2);
  const [H, setH] = useState(24);
  const out = useMemo(() => dornbuschIRF({ moneyShock: dm, theta, phi: 1, lambda, horizon: H }), [dm, theta, lambda, H]);
  const chart = out.t.map((t, i) => ({
    t,
    price: +(out.price[i] * 100).toFixed(3),
    exchange: +(out.exchange[i] * 100).toFixed(3),
    interest: +(out.interest[i] * 100).toFixed(3),
  }));

  // BOP
  const [S, setS] = useState(0.22);
  const [I, setI] = useState(0.20);
  const [T, setT] = useState(0.18);
  const [G, setG] = useState(0.19);
  const bop = useMemo(() => bopGaps({ privateSaving: S, investment: I, taxes: T, govSpending: G }), [S, I, T, G]);
  const caColor = bop.currentAccount > 0 ? C.green : bop.currentAccount < 0 ? C.red : C.gold;

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "美国式赤字", description: "S<I, T<G", apply: () => { setS(0.18); setI(0.22); setT(0.17); setG(0.22); } },
        { name: "德国式盈余", description: "S>>I, 财政中性", apply: () => { setS(0.28); setI(0.22); setT(0.20); setG(0.20); } },
        { name: "货币冲击强超调", description: "低 λθ", apply: () => { setDm(0.05); setTheta(0.15); setLambda(1.5); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">Dornbusch 汇率超调</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="货币冲击 Δm" value={dm} min={-0.1} max={0.1} step={0.005} onChange={setDm} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label="价格调整 θ" value={theta} min={0.05} max={1} step={0.05} onChange={setTheta} />
            <Slider label="利率半弹性 λ" value={lambda} min={0.5} max={6} step={0.25} onChange={setLambda} />
            <Slider label="时长 (季度)" value={H} min={8} max={60} step={2} onChange={setH} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="长期 e* = Δm" value={`${(out.longRunE * 100).toFixed(2)}%`} color={C.gold} />
            <Stat label="初始超调幅度" value={`${(out.overshoot * 100).toFixed(2)}%`} color={C.red} sub="e(0)−e*" />
            <Stat label="超调倍数" value={`${(1 + 1 / (lambda * theta)).toFixed(2)}×`} color={C.teal} sub="1+1/(λθ)" />
            <Stat label="收敛半衰期" value={`${(Math.log(2) / theta).toFixed(1)} 期`} color={C.blue} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <p className="text-xs font-mono text-gold uppercase tracking-wider mb-2">e / p / i 冲击响应</p>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "%", angle:-90, position:"insideLeft", fill:C.text, fontSize:10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="exchange" stroke={C.gold} strokeWidth={2} dot={false} name="e (汇率)" />
                <Line type="monotone" dataKey="price" stroke={C.teal} strokeWidth={2} dot={false} name="p (价格)" />
                <Line type="monotone" dataKey="interest" stroke={C.red} strokeWidth={2} dot={false} name="i (利率偏离)" />
                <ReferenceLine y={out.longRunE * 100} stroke={C.text} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground mt-2">
            价格粘性 → 汇率承担全部即时调整 → 超调 → UIP 隐含未来升值 → 短期利率下行。
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <p className="text-xs font-mono text-gold uppercase tracking-wider mb-3">BOP 三缺口: CA ≡ (S − I) + (T − G)</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="grid grid-cols-2 gap-3">
            <Slider label="私人储蓄 S" value={S} min={0.05} max={0.4} step={0.005} onChange={setS} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label="投资 I"   value={I} min={0.05} max={0.4} step={0.005} onChange={setI} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label="税收 T"   value={T} min={0.05} max={0.4} step={0.005} onChange={setT} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label="政府支出 G" value={G} min={0.05} max={0.4} step={0.005} onChange={setG} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="S − I" value={`${(bop.privateGap * 100).toFixed(2)}%`} color={bop.privateGap >= 0 ? C.green : C.red} />
            <Stat label="T − G" value={`${(bop.fiscalGap * 100).toFixed(2)}%`} color={bop.fiscalGap >= 0 ? C.green : C.red} />
            <Stat label="经常账户 CA" value={`${(bop.currentAccount * 100).toFixed(2)}%`} color={caColor} sub={bop.regime.toUpperCase()} />
            <Stat label="外部净融资" value={`${(-bop.currentAccount * 100).toFixed(2)}%`} color={C.blue} sub="= −CA" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Panel 3: BGG accelerator ─── */
function BGGPanel() {
  const [lev, setLev] = useState(3);
  const [mu, setMu] = useState(0.12);
  const [sig, setSig] = useState(0.5);
  const [rho, setRho] = useState(0.9);
  const [shock, setShock] = useState(-0.02);
  const [H] = useState(20);
  const bgg = useMemo(() => bggAccelerator({ leverage: lev, mu, sigmaOmega: sig, rho, shock, horizon: H }), [lev, mu, sig, rho, shock, H]);
  const rbc = useMemo(() => bggAccelerator({ leverage: lev, mu, sigmaOmega: sig, rho, shock, horizon: H, frictionless: true }), [lev, mu, sig, rho, shock, H]);
  const chart = bgg.t.map((t, i) => ({
    t,
    n: +(bgg.netWorth[i] * 100).toFixed(3),
    efp: +(bgg.efp[i] * 1e4).toFixed(2),
    y_bgg: +(bgg.output[i] * 100).toFixed(3),
    y_rbc: +(rbc.output[i] * 100).toFixed(3),
  }));

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "健康企业", description: "低杠杆低成本", apply: () => { setLev(2); setMu(0.08); setSig(0.35); } },
        { name: "危机时刻", description: "高杠杆强放大", apply: () => { setLev(5); setMu(0.18); setSig(0.7); setShock(-0.05); } },
        { name: "正向净值冲击", description: "扩张情形", apply: () => { setShock(0.02); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">Bernanke-Gertler-Gilchrist</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="杠杆 A/N" value={lev} min={1.5} max={8} step={0.25} onChange={setLev} />
            <Slider label="监督成本 μ" value={mu} min={0.02} max={0.3} step={0.01} onChange={setMu} fmt={(v)=>`${(v*100).toFixed(0)}%`} />
            <Slider label="项目风险 σ_ω" value={sig} min={0.1} max={1} step={0.05} onChange={setSig} />
            <Slider label="持久性 ρ" value={rho} min={0} max={0.98} step={0.02} onChange={setRho} />
            <Slider label="净值冲击" value={shock} min={-0.1} max={0.05} step={0.005} onChange={setShock} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="EFP 峰值" value={`${(Math.max(...bgg.efp.map(Math.abs)) * 1e4).toFixed(0)} bp`} color={C.red} />
            <Stat label="产出峰值 |ŷ|" value={`${(Math.max(...bgg.output.map(Math.abs)) * 100).toFixed(2)}%`} color={C.gold} />
            <Stat label="放大系数" value={`${bgg.amplification.toFixed(2)}×`} color={C.teal} sub="peak ŷ / peak n̂" />
            <Stat label="vs RBC 增幅" value={`${((Math.max(...bgg.output.map(Math.abs)) / Math.max(1e-9, Math.max(...rbc.output.map(Math.abs))) - 1) * 100).toFixed(0)}%`} color={C.blue} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <p className="text-xs font-mono text-gold uppercase tracking-wider mb-2">净值 · EFP · 产出 IRF</p>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <ComposedChart data={chart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "期", position:"insideBottom", offset:-4, fill:C.text, fontSize:10 }} />
                <YAxis yAxisId="l" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "% 偏离", angle:-90, position:"insideLeft", fill:C.text, fontSize:10 }} />
                <YAxis yAxisId="r" orientation="right" stroke={C.red} tick={{ fontSize: 10 }} label={{ value: "EFP (bp)", angle:90, position:"insideRight", fill:C.red, fontSize:10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line yAxisId="l" type="monotone" dataKey="n" stroke={C.teal} strokeWidth={2} dot={false} name="n̂ 净值" />
                <Line yAxisId="l" type="monotone" dataKey="y_bgg" stroke={C.gold} strokeWidth={2} dot={false} name="ŷ (BGG)" />
                <Line yAxisId="l" type="monotone" dataKey="y_rbc" stroke={C.blue} strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="ŷ (RBC 无摩擦)" />
                <Bar yAxisId="r" dataKey="efp" fill={C.red} fillOpacity={0.3} name="EFP" />
                <ReferenceLine yAxisId="l" y={0} stroke={C.text} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground mt-2">
            负向净值冲击 → EFP 上升 → 投资/产出跌幅超过无摩擦基线。
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Panel 4: ZLB & Forward guidance ─── */
function ZLBPanel() {
  const [rNat, setRNat] = useState(-0.01);
  const [zlbK, setZlbK] = useState(4);
  const [sigma, setSigma] = useState(1);
  const [kappa, setKappa] = useState(0.1);
  const [beta] = useState(0.99);
  const [H] = useState(20);

  const base = { sigma, kappa, beta, phiPi: 1.5, phiX: 0.5, rNatural: rNat, zlbPeriods: zlbK, horizon: H };
  const out = useMemo(() => zlbNKSolve(base), [rNat, zlbK, sigma, kappa]);
  const chart = out.t.map((t, i) => ({
    t,
    x: +(out.output[i] * 100).toFixed(3),
    pi: +(out.inflation[i] * 100).toFixed(3),
    i_pol: +(out.policyRate[i] * 100).toFixed(3),
    binding: out.binding[i] ? 100 : 0,
  }));

  const ampSweep = useMemo(() => {
    const arr: { extra: number; amp: number }[] = [];
    for (let k = 0; k <= 8; k++) arr.push({ extra: k, amp: +forwardGuidanceAmplification({ ...base, zlbPeriods: 1 }, k).toFixed(3) });
    return arr;
  }, [rNat, sigma, kappa]);

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "GFC 情境", description: "6 期 ZLB, rⁿ=−2%", apply: () => { setRNat(-0.02); setZlbK(6); } },
        { name: "COVID 冲击", description: "4 期 ZLB, rⁿ=−3%", apply: () => { setRNat(-0.03); setZlbK(4); } },
        { name: "陡峭菲利普斯", description: "κ=0.3", apply: () => { setKappa(0.3); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">NK 3 方程 + ZLB 参数</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="自然利率 rⁿ" value={rNat} min={-0.05} max={0.02} step={0.005} onChange={setRNat} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label="ZLB 期数" value={zlbK} min={1} max={12} step={1} onChange={setZlbK} />
            <Slider label="σ (IES⁻¹)" value={sigma} min={0.5} max={3} step={0.1} onChange={setSigma} />
            <Slider label="κ (NKPC 斜率)" value={kappa} min={0.02} max={0.5} step={0.02} onChange={setKappa} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="当期 x₀" value={`${(out.outputImpact * 100).toFixed(2)}%`} color={out.outputImpact < 0 ? C.red : C.green} />
            <Stat label="当期 π₀" value={`${(out.inflation[0] * 100).toFixed(2)}%`} color={C.gold} />
            <Stat label="ZLB × 2 放大" value={`${forwardGuidanceAmplification(base, 2).toFixed(2)}×`} color={C.teal} sub="vs 1 期基线" />
            <Stat label="ZLB × 4 放大" value={`${forwardGuidanceAmplification(base, 4).toFixed(2)}×`} color={C.blue} sub="Del Negro et al." />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <p className="text-xs font-mono text-gold uppercase tracking-wider mb-2">ZLB 路径: x / π / i</p>
          <div className="h-[240px]">
            <ResponsiveContainer>
              <ComposedChart data={chart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="l" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "%", angle:-90, position:"insideLeft", fill:C.text, fontSize:10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area yAxisId="l" type="stepAfter" dataKey="binding" stroke="transparent" fill={C.red} fillOpacity={0.06} name="ZLB 生效" />
                <Line yAxisId="l" type="monotone" dataKey="x" stroke={C.gold} strokeWidth={2} dot={false} name="产出缺口 x" />
                <Line yAxisId="l" type="monotone" dataKey="pi" stroke={C.teal} strokeWidth={2} dot={false} name="通胀 π" />
                <Line yAxisId="l" type="monotone" dataKey="i_pol" stroke={C.red} strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="政策利率 i" />
                <ReferenceLine yAxisId="l" y={0} stroke={C.text} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <p className="text-xs font-mono text-gold uppercase tracking-wider mb-2">前瞻指引 Puzzle · 额外 ZLB 期数 → 当期 x 放大</p>
        <div className="h-[200px]">
          <ResponsiveContainer>
            <LineChart data={ampSweep}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="extra" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "额外 ZLB 期数", position:"insideBottom", offset:-4, fill:C.text, fontSize:10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "放大倍数", angle:-90, position:"insideLeft", fill:C.text, fontSize:10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="amp" stroke={C.gold} strokeWidth={2} dot={{ r: 3 }} name="x₀ 放大倍数" />
              <ReferenceLine y={1} stroke={C.text} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground mt-2">
          标准 NK 模型下前瞻指引效力随 ZLB 期数指数级放大 —— Del Negro-Giannoni-Patterson (2015) 记录的 "puzzle"。
        </p>
      </div>
    </div>
  );
}

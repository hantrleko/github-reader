import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, ComposedChart, Bar, ScatterChart, Scatter, Area,
} from "recharts";
import { C, Slider, Stat, tooltipStyle } from "@/components/frontier/ui";
import PresetButtons from "@/components/PresetButtons";
import {
  endogenousGrowth, growthAccounting, developmentAccounting,
  multiplierAccelerator, fiscalMultipliers,
  rbcSimulate, calvoNKPC, barroGordon, policyRuleSim,
  parityLab, suddenStop,
  expectationsLab, unconventionalPolicy, bankCapitalAmplification, climateMacroPath,
  type RuleKind, type ExpectationKind,
} from "@/lib/quant/macroFrontier";

type Cat = "growth" | "cycle" | "policy" | "open" | "frontier";
type Tab =
  | "endo" | "accounting"
  | "multiplier" | "rbc" | "calvo"
  | "rules"
  | "parity" | "sudden"
  | "expect" | "uncon" | "bank" | "climate";

const CATS: { id: Cat; label: string; kicker: string }[] = [
  { id: "growth",   label: "长期增长",   kicker: "Growth" },
  { id: "cycle",    label: "周期与刚性", kicker: "Cycles" },
  { id: "policy",   label: "政策规则",   kicker: "Policy" },
  { id: "open",     label: "开放经济",   kicker: "Open Economy" },
  { id: "frontier", label: "当代前沿",   kicker: "Frontier" },
];

const TABS: { id: Tab; cat: Cat; title: string; desc: string }[] = [
  { id: "endo",       cat: "growth",   title: "内生增长引擎",     desc: "AK / Lucas / Romer / Schumpeter vs Solow" },
  { id: "accounting", cat: "growth",   title: "增长核算与 TFP",   desc: "Solow 残差 + Hall-Jones 发展核算" },
  { id: "multiplier", cat: "cycle",    title: "乘数—加速数与财政乘数", desc: "Samuelson 周期 + 状态依赖乘数" },
  { id: "rbc",        cat: "cycle",    title: "RBC 校准与周期矩", desc: "技术冲击驱动的波动率与相关性" },
  { id: "calvo",      cat: "cycle",    title: "Calvo 定价与 NKPC", desc: "θ → κ、指数化与货币非中性" },
  { id: "rules",      cat: "policy",   title: "规则 vs 相机抉择", desc: "Barro-Gordon 通胀偏差 + 四种规则对比" },
  { id: "parity",     cat: "open",     title: "平价条件与 Carry", desc: "PPP / UIP / CIP 与远期溢价之谜" },
  { id: "sudden",     cat: "open",     title: "突然停止与外部调整", desc: "资本流逆转、储备覆盖与资产负债表效应" },
  { id: "expect",     cat: "frontier", title: "行为宏观：预期形成", desc: "理性 / 适应性 / 黏性 / 诊断性" },
  { id: "uncon",      cat: "frontier", title: "非常规货币政策",   desc: "QE 组合再平衡 + YCC 收益率曲线控制" },
  { id: "bank",       cat: "frontier", title: "宏观金融：银行资本", desc: "资本冲击 → 去杠杆 → 信贷与产出" },
  { id: "climate",    cat: "frontier", title: "气候转型的宏观路径", desc: "碳价、绿色通胀与物理损害权衡" },
];

export default function V60MacroTools() {
  const [cat, setCat] = useState<Cat>("growth");
  const [tab, setTab] = useState<Tab>("endo");
  const inCat = TABS.filter((t) => t.cat === cat);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-card/50 p-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-1">V6.0 · Macro Frontier Lab</p>
        <h2 className="text-2xl font-serif text-foreground">宏观前沿实验室</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
          补全宏观谱系的四块缺口：内生增长与增长核算、周期机制与名义刚性微观基础、政策规则与财政—货币协调、
          开放经济平价与当代前沿（行为宏观、非常规政策、宏观金融、气候）。与 /s/macro 的经典模型与 /s/macro-lab 的
          债务/汇率/BGG/ZLB 实验互为补充。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button key={c.id}
              onClick={() => { setCat(c.id); setTab(TABS.find((t) => t.cat === c.id)!.id); }}
              className={`px-3.5 py-2 rounded-lg border text-xs font-mono transition-colors ${
                cat === c.id ? "bg-gold/15 border-gold/60 text-gold"
                             : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
              }`}>
              <span className="uppercase tracking-wider mr-2">{c.kicker}</span>{c.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {inCat.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-md border text-[11px] transition-colors ${
                tab === t.id ? "bg-secondary border-gold/40 text-foreground"
                             : "bg-transparent border-border/60 text-muted-foreground hover:text-foreground"
              }`}>
              {t.title}
              <span className="ml-2 text-[10px] text-muted-foreground/70 hidden md:inline">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {tab === "endo" && <EndoPanel />}
        {tab === "accounting" && <AccountingPanel />}
        {tab === "multiplier" && <MultiplierPanel />}
        {tab === "rbc" && <RBCPanel />}
        {tab === "calvo" && <CalvoPanel />}
        {tab === "rules" && <RulesPanel />}
        {tab === "parity" && <ParityPanel />}
        {tab === "sudden" && <SuddenPanel />}
        {tab === "expect" && <ExpectPanel />}
        {tab === "uncon" && <UnconPanel />}
        {tab === "bank" && <BankPanel />}
        {tab === "climate" && <ClimatePanel />}
      </motion.div>

      <div className="rounded-lg border border-border bg-card/60 p-4 text-[11px] font-mono text-muted-foreground leading-relaxed">
        <p className="text-gold uppercase tracking-wider mb-2">参考文献</p>
        <p>
          Romer (1990) Endogenous Technological Change · Aghion-Howitt (1992) Creative Destruction · Lucas (1988) On the Mechanics of Development ·
          Hall-Jones (1999) Why Do Some Countries Produce So Much More Output per Worker · Samuelson (1939) Interactions between the Multiplier and the Accelerator ·
          Kydland-Prescott (1982) Time to Build · Calvo (1983) Staggered Prices · Barro-Gordon (1983) Rules, Discretion and Reputation ·
          Fama (1984) Forward and Spot Exchange Rates · Calvo (1998) Capital Flows and Capital-Market Crises ·
          Mankiw-Reis (2002) Sticky Information · Bordalo-Gennaioli-Shleifer (2018) Diagnostic Expectations ·
          Vayanos-Vila (2021) Preferred-Habitat · Gertler-Kiyotaki (2010) Financial Intermediation · Golosov-Hassler-Krusell-Tsyvinski (2014) Optimal Taxes on Fossil Fuel.
        </p>
        <p className="mt-2">所有模型均为教学级对数线性/校准化简写，用于机制直觉与比较静态，不作为校准化 GE 预测使用。</p>
      </div>
    </section>
  );
}

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-secondary/20 p-4">
    <p className="text-xs font-mono text-gold uppercase tracking-wider mb-2">{title}</p>
    {children}
  </div>
);
const Note = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-mono text-muted-foreground mt-2 leading-relaxed">{children}</p>
);

/* ── 1. Endogenous growth ── */
function EndoPanel() {
  const [s, setS] = useState(0.25);
  const [A, setA] = useState(0.5);
  const [psi, setPsi] = useState(0.06);
  const [u, setU] = useState(0.3);
  const [theta, setTheta] = useState(0.05);
  const [sR, setSR] = useState(0.4);
  const [lam, setLam] = useState(0.3);
  const [gamma, setGamma] = useState(1.15);
  const g = useMemo(() => endogenousGrowth({
    A, s, delta: 0.05, n: 0.01, psi, u, theta, sR, lambdaInn: lam, gamma, alpha: 0.35, horizon: 50,
  }), [A, s, psi, u, theta, sR, lam, gamma]);
  const chart = g.t.map((t, i) => ({
    t,
    AK: +(g.ak[i] * 100).toFixed(2),
    Lucas: +(g.lucas[i] * 100).toFixed(2),
    Romer: +(g.romer[i] * 100).toFixed(2),
    Schumpeter: +(g.schumpeter[i] * 100).toFixed(2),
    Solow: +((g.solow[i] - g.solow[0]) * 100).toFixed(2),
  }));
  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "研发驱动型", description: "高 θ·s_R", apply: () => { setTheta(0.09); setSR(0.55); } },
        { name: "人力资本驱动", description: "高 ψ·u", apply: () => { setPsi(0.1); setU(0.4); } },
        { name: "资本深化型", description: "高 s·A (AK)", apply: () => { setS(0.4); setA(0.6); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">四种增长引擎参数</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="储蓄率 s" value={s} min={0.05} max={0.5} step={0.01} onChange={setS} fmt={(v)=>`${(v*100).toFixed(0)}%`} />
            <Slider label="AK 生产率 A" value={A} min={0.1} max={1} step={0.05} onChange={setA} />
            <Slider label="Lucas ψ" value={psi} min={0.01} max={0.15} step={0.005} onChange={setPsi} />
            <Slider label="教育时间 u" value={u} min={0.05} max={0.6} step={0.05} onChange={setU} />
            <Slider label="Romer θ" value={theta} min={0.01} max={0.15} step={0.005} onChange={setTheta} />
            <Slider label="R&D 人员份额 s_R" value={sR} min={0.05} max={0.8} step={0.05} onChange={setSR} />
            <Slider label="创新强度 λ" value={lam} min={0.05} max={1} step={0.05} onChange={setLam} />
            <Slider label="质量阶梯 γ" value={gamma} min={1.02} max={1.5} step={0.01} onChange={setGamma} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="AK: sA−(δ+n)" value={`${(g.rates.ak*100).toFixed(2)}%`} color={C.gold} />
            <Stat label="Lucas: ψu" value={`${(g.rates.lucas*100).toFixed(2)}%`} color={C.teal} />
            <Stat label="Romer: θs_R" value={`${(g.rates.romer*100).toFixed(2)}%`} color={C.blue} sub={g.scaleEffect ? "存在规模效应" : "无规模效应"} />
            <Stat label="Schumpeter: λlnγ" value={`${(g.rates.schumpeter*100).toFixed(2)}%`} color={C.green} />
          </div>
        </div>
        <Panel title="人均产出对数路径 (相对起点)">
          <div className="h-[300px]">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "年", position: "insideBottom", offset: -4, fill: C.text, fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "log y ×100", angle: -90, position: "insideLeft", fill: C.text, fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="AK" stroke={C.gold} dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="Lucas" stroke={C.teal} dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="Romer" stroke={C.blue} dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="Schumpeter" stroke={C.green} dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="Solow" stroke={C.red} dot={false} strokeWidth={1.5} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <Note>
            Solow (红虚线) 只有过渡动态：储蓄率提高改变水平而非长期增速；四种内生机制则把增速本身变成政策与制度的函数。
            Romer 的 θ·s_R·L 蕴含规模效应，是半内生增长 (Jones 1995) 的主要批评靶点。
          </Note>
        </Panel>
      </div>
    </div>
  );
}

/* ── 2. Growth accounting ── */
function AccountingPanel() {
  const [gY, setGY] = useState(0.07);
  const [gK, setGK] = useState(0.1);
  const [gL, setGL] = useState(0.012);
  const [gH, setGH] = useState(0.006);
  const [alpha, setAlpha] = useState(0.4);
  const acc = useMemo(() => growthAccounting({ gY, gK, gL, gH, alpha }), [gY, gK, gL, gH, alpha]);
  const [ratio, setRatio] = useState(20);
  const [kyR, setKyR] = useState(3), [kyP, setKyP] = useState(2.2);
  const [hR, setHR] = useState(3.2), [hP, setHP] = useState(1.6);
  const dev = useMemo(() => developmentAccounting({ kyRich: kyR, kyPoor: kyP, hRich: hR, hPoor: hP, incomeRatio: ratio, alpha: 1/3 }), [kyR, kyP, hR, hP, ratio]);
  const bars = [
    { k: "资本", v: +(acc.capitalContrib * 100).toFixed(2) },
    { k: "劳动", v: +(acc.labourContrib * 100).toFixed(2) },
    { k: "人力资本", v: +(acc.humanContrib * 100).toFixed(2) },
    { k: "TFP 残差", v: +(acc.tfp * 100).toFixed(2) },
  ];
  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "东亚投入驱动", description: "Krugman-Young 争论", apply: () => { setGY(0.08); setGK(0.14); setGL(0.03); setGH(0.01); } },
        { name: "美国生产率繁荣", description: "1995-2004", apply: () => { setGY(0.038); setGK(0.045); setGL(0.012); setGH(0.004); } },
        { name: "生产率放缓", description: "2010s", apply: () => { setGY(0.02); setGK(0.025); setGL(0.008); setGH(0.003); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">Solow 残差分解</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="产出增速 gY" value={gY} min={-0.02} max={0.15} step={0.002} onChange={setGY} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label="资本增速 gK" value={gK} min={-0.02} max={0.2} step={0.002} onChange={setGK} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label="劳动增速 gL" value={gL} min={-0.02} max={0.05} step={0.002} onChange={setGL} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label="人力资本 gH" value={gH} min={0} max={0.03} step={0.001} onChange={setGH} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label="资本份额 α" value={alpha} min={0.2} max={0.6} step={0.01} onChange={setAlpha} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="TFP 增速" value={`${(acc.tfp*100).toFixed(2)}%`} color={acc.tfp >= 0 ? C.green : C.red} />
            <Stat label="TFP 贡献占比" value={`${(acc.tfpShare*100).toFixed(0)}%`} color={C.gold} sub="残差 / 产出增速" />
          </div>
          <Note>
            残差既包含真实技术进步，也吸收了要素利用率、配置效率与测量误差 —— 这正是「TFP 是无知的度量」批评的来源。
          </Note>
        </div>
        <Panel title="增长来源分解 (百分点)">
          <div className="h-[240px]">
            <ResponsiveContainer>
              <ComposedChart data={bars}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="k" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine y={0} stroke={C.text} />
                <Bar dataKey="v" fill={C.gold} fillOpacity={0.6} name="贡献 pp" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="发展核算：富国 / 穷国收入差距如何分解 (Hall-Jones)">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="grid grid-cols-2 gap-3">
            <Slider label="收入比 y_R/y_P" value={ratio} min={2} max={40} step={1} onChange={setRatio} fmt={(v)=>`${v.toFixed(0)}×`} />
            <Slider label="富国 K/Y" value={kyR} min={1} max={5} step={0.1} onChange={setKyR} />
            <Slider label="穷国 K/Y" value={kyP} min={0.5} max={5} step={0.1} onChange={setKyP} />
            <Slider label="富国 h" value={hR} min={1} max={4} step={0.1} onChange={setHR} />
            <Slider label="穷国 h" value={hP} min={0.8} max={4} step={0.1} onChange={setHP} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="要素因子" value={`${dev.capitalFactor.toFixed(2)}×`} color={C.teal} sub="(K/Y)^{α/(1−α)}·h" />
            <Stat label="TFP 因子" value={`${dev.tfpFactor.toFixed(2)}×`} color={C.gold} />
            <Stat label="TFP 解释份额" value={`${(dev.tfpSharePct*100).toFixed(0)}%`} color={C.red} sub="对数分解" />
            <Stat label="要素解释份额" value={`${((1-dev.tfpSharePct)*100).toFixed(0)}%`} color={C.blue} />
          </div>
        </div>
        <Note>典型结论：跨国收入差距中约一半以上来自效率/TFP 而非要素积累 —— 把注意力推向制度、配置效率与技术扩散。</Note>
      </Panel>
    </div>
  );
}

/* ── 3. Multiplier-accelerator & fiscal ── */
function MultiplierPanel() {
  const [mpc, setMpc] = useState(0.6);
  const [v, setV] = useState(0.8);
  const path = useMemo(() => multiplierAccelerator({ mpc, accel: v, gShock: 1, horizon: 50 }), [mpc, v]);
  const chart = path.t.map((t, i) => ({ t, Y: +path.output[i].toFixed(3), C: +path.consumption[i].toFixed(3), I: +path.investment[i].toFixed(3) }));

  const [taxRate, setTaxRate] = useState(0.25);
  const [imp, setImp] = useState(0.2);
  const [ric, setRic] = useState(0.2);
  const [slack, setSlack] = useState(0.6);
  const [zlb, setZlb] = useState(false);
  const [off, setOff] = useState(0.4);
  const fm = useMemo(() => fiscalMultipliers({ mpc, taxRate, importShare: imp, ricardian: ric, slack, atZLB: zlb, monetaryOffset: off }), [mpc, taxRate, imp, ric, slack, zlb, off]);
  const mBars = [
    { k: "教科书基准", v: +fm.baseline.toFixed(2) },
    { k: "政府支出", v: +fm.spending.toFixed(2) },
    { k: "减税", v: +fm.tax.toFixed(2) },
    { k: "转移支付", v: +fm.transfer.toFixed(2) },
  ];
  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "衰退 + ZLB", description: "高乘数情形", apply: () => { setSlack(0.9); setZlb(true); setRic(0.1); } },
        { name: "过热经济", description: "货币抵消强", apply: () => { setSlack(0.1); setZlb(false); setOff(0.8); } },
        { name: "李嘉图世界", description: "完全等价", apply: () => { setRic(1); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">Samuelson 乘数—加速数</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="边际消费倾向 c" value={mpc} min={0.3} max={0.95} step={0.01} onChange={setMpc} />
            <Slider label="加速数 v" value={v} min={0} max={3} step={0.05} onChange={setV} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="动态区制" value={
              path.regime === "monotone" ? "单调收敛"
              : path.regime === "damped-oscillation" ? "阻尼振荡"
              : path.regime === "explosive-oscillation" ? "发散振荡" : "发散"
            } color={path.regime.startsWith("explosive") ? C.red : C.green} />
            <Stat label="长期乘数 1/(1−c)" value={`${path.longRunMultiplier.toFixed(2)}×`} color={C.gold} />
          </div>
        </div>
        <Panel title="Y / C / I 对永久性 G 冲击的动态">
          <div className="h-[260px]">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="Y" stroke={C.gold} dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="C" stroke={C.teal} dot={false} strokeWidth={1.5} />
                <Line type="monotone" dataKey="I" stroke={C.red} dot={false} strokeWidth={1.5} />
                <ReferenceLine y={path.longRunMultiplier} stroke={C.text} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <Note>内生周期无需外生冲击：加速数把投资与产出变化挂钩，c·v 的根决定振荡与收敛/发散。</Note>
        </Panel>
      </div>

      <Panel title="状态依赖的财政乘数">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="grid grid-cols-2 gap-3">
            <Slider label="税率 t (自动稳定器)" value={taxRate} min={0} max={0.5} step={0.01} onChange={setTaxRate} />
            <Slider label="进口漏出 m" value={imp} min={0} max={0.5} step={0.01} onChange={setImp} />
            <Slider label="李嘉图程度" value={ric} min={0} max={1} step={0.05} onChange={setRic} />
            <Slider label="经济松弛度" value={slack} min={0} max={1} step={0.05} onChange={setSlack} />
            <Slider label="货币抵消强度" value={off} min={0} max={1} step={0.05} onChange={setOff} />
            <label className="flex items-center gap-2 text-xs text-secondary-foreground mt-2">
              <input type="checkbox" checked={zlb} onChange={(e) => setZlb(e.target.checked)} className="accent-gold" />
              处于 ZLB / 货币政策不抵消
            </label>
          </div>
          <div>
            <div className="h-[200px]">
              <ResponsiveContainer>
                <ComposedChart data={mBars}>
                  <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="k" stroke={C.text} tick={{ fontSize: 10 }} />
                  <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <ReferenceLine y={1} stroke={C.red} strokeDasharray="4 4" />
                  <Bar dataKey="v" fill={C.gold} fillOpacity={0.65} name="乘数" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Stat label="经济状态" value={fm.regime === "recession" ? "衰退" : fm.regime === "boom" ? "过热" : "常态"} color={fm.regime === "recession" ? C.red : C.gold} />
              <Stat label="自动稳定器吸收" value={`${(fm.stabiliserStrength*100).toFixed(0)}%`} color={C.teal} />
            </div>
          </div>
        </div>
        <Note>红线为 1：乘数是否大于 1 取决于松弛度、货币政策是否抵消与家庭的李嘉图程度，而不是一个固定常数。</Note>
      </Panel>
    </div>
  );
}

/* ── 4. RBC ── */
function RBCPanel() {
  const [rho, setRho] = useState(0.95);
  const [sig, setSig] = useState(0.007);
  const [fr, setFr] = useState(2);
  const [alpha, setAlpha] = useState(0.36);
  const m = useMemo(() => rbcSimulate({ alpha, beta: 0.99, delta: 0.025, rhoA: rho, sigmaA: sig, laborElast: fr, periods: 400, seed: 42 }), [alpha, rho, sig, fr]);
  const chart = m.t.slice(0, 120).map((t, i) => ({
    t,
    y: +(m.output[i] * 100).toFixed(3),
    c: +(m.consumption[i] * 100).toFixed(3),
    i: +(m.investment[i] * 100).toFixed(3),
    a: +(m.tfp[i] * 100).toFixed(3),
  }));
  const rows = [
    { k: "σ(c)/σ(y)", model: m.relSd.c, data: m.dataFacts.relC },
    { k: "σ(i)/σ(y)", model: m.relSd.i, data: m.dataFacts.relI },
    { k: "σ(h)/σ(y)", model: m.relSd.h, data: m.dataFacts.relH },
    { k: "corr(c,y)", model: m.corrWithY.c, data: m.dataFacts.corrC },
    { k: "corr(i,y)", model: m.corrWithY.i, data: m.dataFacts.corrI },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">Kydland-Prescott 式校准</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="TFP 持久性 ρ" value={rho} min={0.5} max={0.99} step={0.01} onChange={setRho} />
            <Slider label="技术冲击 σ" value={sig} min={0.002} max={0.02} step={0.001} onChange={setSig} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label="Frisch 弹性 ν" value={fr} min={0.2} max={5} step={0.1} onChange={setFr} />
            <Slider label="资本份额 α" value={alpha} min={0.25} max={0.45} step={0.01} onChange={setAlpha} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="σ(y)" value={`${(m.sd.y*100).toFixed(2)}%`} color={C.gold} />
            <Stat label="corr(TFP, y)" value={m.corrWithY.a.toFixed(2)} color={C.teal} />
            <Stat label="产出自相关" value={m.autocorrY.toFixed(2)} color={C.blue} />
            <Stat label="σ(i)/σ(y)" value={m.relSd.i.toFixed(2)} color={m.relSd.i > 1 ? C.green : C.red} />
          </div>
          <div className="rounded-lg border border-border bg-card/40 p-3">
            <p className="text-[11px] font-mono text-gold mb-2">模型矩 vs 典型事实</p>
            <table className="w-full text-[11px] font-mono">
              <thead><tr className="text-muted-foreground"><th className="text-left">矩</th><th className="text-right">模型</th><th className="text-right">数据</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.k} className="text-foreground/80">
                    <td className="text-left py-0.5">{r.k}</td>
                    <td className="text-right tabular-nums">{r.model.toFixed(2)}</td>
                    <td className="text-right tabular-nums text-muted-foreground">{r.data.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <Panel title="模拟序列 (前 120 期, % 偏离)">
          <div className="h-[300px]">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="y" stroke={C.gold} dot={false} strokeWidth={2} name="产出" />
                <Line type="monotone" dataKey="c" stroke={C.teal} dot={false} strokeWidth={1.2} name="消费" />
                <Line type="monotone" dataKey="i" stroke={C.red} dot={false} strokeWidth={1.2} name="投资" />
                <Line type="monotone" dataKey="a" stroke={C.blue} dot={false} strokeWidth={1} strokeDasharray="3 3" name="TFP" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <Note>
            RBC 的贡献是方法论 (随机动态一般均衡 + 校准 + 矩匹配)；其争议在于把衰退解释为技术倒退、需要高 Frisch 弹性，
            以及缺少货币与金融摩擦。
          </Note>
        </Panel>
      </div>
    </div>
  );
}

/* ── 5. Calvo ── */
function CalvoPanel() {
  const [theta, setTheta] = useState(0.75);
  const [omega, setOmega] = useState(0.3);
  const [sigma, setSigma] = useState(1);
  const [phi, setPhi] = useState(1);
  const [eps, setEps] = useState(6);
  const r = useMemo(() => calvoNKPC({ theta, beta: 0.99, sigma, phiLabor: phi, omega, epsilon: eps }), [theta, omega, sigma, phi, eps]);
  const curve = useMemo(() => {
    const pts: { theta: number; kappa: number; dur: number }[] = [];
    for (let th = 0.05; th <= 0.95; th += 0.025) {
      const c = calvoNKPC({ theta: th, beta: 0.99, sigma, phiLabor: phi, omega, epsilon: eps });
      pts.push({ theta: +th.toFixed(3), kappa: +c.kappa.toFixed(4), dur: +c.avgPriceDuration.toFixed(2) });
    }
    return pts;
  }, [omega, sigma, phi, eps]);
  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "美国校准", description: "θ=0.75 (季度)", apply: () => { setTheta(0.75); setOmega(0.3); } },
        { name: "高通胀经济", description: "价格频繁调整", apply: () => { setTheta(0.35); setOmega(0.6); } },
        { name: "纯前瞻 NKPC", description: "无指数化", apply: () => { setOmega(0); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">Calvo 交错定价参数</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="不调价概率 θ" value={theta} min={0.05} max={0.95} step={0.01} onChange={setTheta} />
            <Slider label="指数化程度 ω" value={omega} min={0} max={1} step={0.05} onChange={setOmega} />
            <Slider label="1/IES σ" value={sigma} min={0.5} max={4} step={0.1} onChange={setSigma} />
            <Slider label="1/Frisch φ" value={phi} min={0.2} max={4} step={0.1} onChange={setPhi} />
            <Slider label="替代弹性 ε" value={eps} min={2} max={15} step={0.5} onChange={setEps} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="NKPC 斜率 κ" value={r.kappa.toFixed(4)} color={C.gold} />
            <Stat label="平均价格期限" value={`${r.avgPriceDuration.toFixed(1)} 期`} color={C.teal} />
            <Stat label="前瞻/回顾权重" value={`${r.hybridForward.toFixed(2)} / ${r.hybridBackward.toFixed(2)}`} color={C.blue} />
            <Stat label="加成 ε/(ε−1)" value={`${r.markup.toFixed(2)}×`} color={C.green} />
            <Stat label="牺牲率" value={`${r.sacrificeRatio.toFixed(1)}`} color={C.red} sub="1pp 反通胀的产出代价" />
            <Stat label="货币非中性半衰期" value={`${r.moneyHalfLife.toFixed(1)} 期`} color={C.gold} />
          </div>
        </div>
        <Panel title="θ → κ 与价格期限映射">
          <div className="h-[300px]">
            <ResponsiveContainer>
              <ComposedChart data={curve}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="theta" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "θ", position: "insideBottom", offset: -4, fill: C.text, fontSize: 10 }} />
                <YAxis yAxisId="l" stroke={C.gold} tick={{ fontSize: 10 }} label={{ value: "κ", angle: -90, position: "insideLeft", fill: C.gold, fontSize: 10 }} />
                <YAxis yAxisId="r" orientation="right" stroke={C.teal} tick={{ fontSize: 10 }} label={{ value: "期限", angle: 90, position: "insideRight", fill: C.teal, fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area yAxisId="l" type="monotone" dataKey="kappa" stroke={C.gold} fill={C.gold} fillOpacity={0.15} name="κ 斜率" />
                <Line yAxisId="r" type="monotone" dataKey="dur" stroke={C.teal} dot={false} strokeWidth={1.5} name="1/(1−θ)" />
                <ReferenceLine yAxisId="l" x={theta} stroke={C.red} strokeDasharray="4 4" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <Note>
            θ 上升 → 曲线变平 → 通胀对产出缺口不敏感 → 反通胀的牺牲率上升、货币非中性更持久。
            指数化 ω 把权重推向 π_{"{t−1}"}，产生通胀惯性。
          </Note>
        </Panel>
      </div>
    </div>
  );
}

/* ── 6. Rules vs discretion ── */
function RulesPanel() {
  const [k, setK] = useState(0.02);
  const [lam, setLam] = useState(1);
  const [a, setA] = useState(0.5);
  const [shock, setShock] = useState(0.01);
  const [cred, setCred] = useState(0.3);
  const bg = useMemo(() => barroGordon({ ambition: k, lambda: lam, slopeAlpha: a, shock, credibility: cred }), [k, lam, a, shock, cred]);
  const credCurve = useMemo(() => Array.from({ length: 21 }, (_, i) => {
    const c = i / 20;
    const r = barroGordon({ ambition: k, lambda: lam, slopeAlpha: a, shock, credibility: c });
    return { c: +(c * 100).toFixed(0), pi: +(r.actualInflation * 100).toFixed(2), loss: +r.lossDiscretion.toFixed(4) };
  }), [k, lam, a, shock]);

  const [rule, setRule] = useState<RuleKind>("taylor");
  const [phiPi, setPhiPi] = useState(1.5);
  const [phiX, setPhiX] = useState(0.5);
  const sims = useMemo(() => {
    const base = { phiPi, phiX, kappa: 0.1, beta: 0.99, sigma: 1, rhoShock: 0.8, shock: 0.01, horizon: 24 };
    const kinds: RuleKind[] = ["taylor", "inflation-target", "price-level", "ngdp"];
    return kinds.map((kk) => ({ kind: kk, sim: policyRuleSim({ ...base, rule: kk }) }));
  }, [phiPi, phiX]);
  const active = sims.find((s) => s.kind === rule)!.sim;
  const cmp = active.t.map((t, i) => {
    const row: Record<string, number> = { t };
    sims.forEach((s) => { row[s.kind] = +(s.sim.inflation[i] * 100).toFixed(3); });
    return row;
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">Barro-Gordon 时间不一致</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="产出野心 k" value={k} min={0} max={0.06} step={0.002} onChange={setK} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label="产出权重 λ" value={lam} min={0} max={4} step={0.1} onChange={setLam} />
            <Slider label="PC 斜率 α" value={a} min={0.1} max={1.5} step={0.05} onChange={setA} />
            <Slider label="供给冲击" value={shock} min={-0.03} max={0.05} step={0.002} onChange={setShock} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label="承诺可信度" value={cred} min={0} max={1} step={0.05} onChange={setCred} fmt={(v)=>`${(v*100).toFixed(0)}%`} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="通胀偏差 λαk" value={`${(bg.inflationBias*100).toFixed(2)}%`} color={C.red} />
            <Stat label="相机抉择 π" value={`${(bg.discretionInflation*100).toFixed(2)}%`} color={C.gold} />
            <Stat label="承诺 π" value={`${(bg.commitmentInflation*100).toFixed(2)}%`} color={C.green} />
            <Stat label="当前均衡 π" value={`${(bg.actualInflation*100).toFixed(2)}%`} color={C.teal} />
          </div>
        </div>
        <Panel title="可信度 → 均衡通胀与损失">
          <div className="h-[240px]">
            <ResponsiveContainer>
              <ComposedChart data={credCurve}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="c" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "可信度 %", position: "insideBottom", offset: -4, fill: C.text, fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="pi" stroke={C.gold} dot={false} strokeWidth={2} name="均衡通胀 %" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <Note>没有承诺机制时，公众预期到央行的扩张动机 → 通胀更高但产出不变。独立央行、通胀目标与保守央行行长都是承诺技术。</Note>
        </Panel>
      </div>

      <Panel title="四种政策规则在成本推动冲击下的表现">
        <div className="flex flex-wrap gap-2 mb-3">
          {(["taylor", "inflation-target", "price-level", "ngdp"] as RuleKind[]).map((kk) => (
            <button key={kk} onClick={() => setRule(kk)}
              className={`px-3 py-1.5 rounded-md border text-[11px] font-mono ${rule === kk ? "bg-gold/15 border-gold/50 text-gold" : "border-border text-muted-foreground hover:text-foreground"}`}>
              {kk === "taylor" ? "泰勒规则" : kk === "inflation-target" ? "通胀目标制" : kk === "price-level" ? "价格水平目标" : "名义 GDP 目标"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Slider label="φ_π" value={phiPi} min={0.5} max={3} step={0.05} onChange={setPhiPi} />
              <Slider label="φ_x" value={phiX} min={0} max={2} step={0.05} onChange={setPhiX} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="泰勒原则" value={active.determinate ? "满足 (φ_π>1)" : "不满足 → 不确定性"} color={active.determinate ? C.green : C.red} />
              <Stat label="通胀波动 σ(π)" value={`${(active.volInflation*100).toFixed(2)}%`} color={C.gold} />
              <Stat label="产出波动 σ(x)" value={`${(active.volOutput*100).toFixed(2)}%`} color={C.teal} />
              <Stat label="价格水平漂移" value={`${(active.cumInflation*100).toFixed(2)}%`} color={Math.abs(active.cumInflation) < 0.01 ? C.green : C.red} />
            </div>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer>
              <LineChart data={cmp}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "π %", angle: -90, position: "insideLeft", fill: C.text, fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="taylor" stroke={C.gold} dot={false} strokeWidth={rule === "taylor" ? 2.5 : 1} name="泰勒" />
                <Line type="monotone" dataKey="inflation-target" stroke={C.teal} dot={false} strokeWidth={rule === "inflation-target" ? 2.5 : 1} name="通胀目标" />
                <Line type="monotone" dataKey="price-level" stroke={C.blue} dot={false} strokeWidth={rule === "price-level" ? 2.5 : 1} name="价格水平" />
                <Line type="monotone" dataKey="ngdp" stroke={C.green} dot={false} strokeWidth={rule === "ngdp" ? 2.5 : 1} name="名义 GDP" />
                <ReferenceLine y={0} stroke={C.text} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <Note>价格水平目标通过「补偿过去偏离」获得额外的预期渠道，因此累计漂移更小 —— 代价是短期产出波动可能更大。</Note>
      </Panel>
    </div>
  );
}

/* ── 7. Parity ── */
function ParityPanel() {
  const [iD, setID] = useState(0.05);
  const [iF, setIF] = useState(0.01);
  const [spot, setSpot] = useState(7);
  const [fwd, setFwd] = useState(7.2);
  const [beta, setBeta] = useState(-0.8);
  const [noise, setNoise] = useState(0.02);
  const r = useMemo(() => parityLab({
    iDom: iD, iFor: iF, spot, forward: fwd, inflDom: 0.03, inflFor: 0.02,
    periods: 400, seed: 21, uipBeta: beta, noiseSd: noise,
  }), [iD, iF, spot, fwd, beta, noise]);
  const fit = [
    { diff: Math.min(...r.scatter.map(s => s.diff)), ds: 0 },
    { diff: Math.max(...r.scatter.map(s => s.diff)), ds: 0 },
  ].map((p) => ({ diff: p.diff, fitted: +(r.famaBeta * p.diff).toFixed(3), uip: p.diff }));
  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "远期溢价之谜", description: "β < 0", apply: () => { setBeta(-0.8); setNoise(0.02); } },
        { name: "UIP 成立", description: "β = 1", apply: () => { setBeta(1); setNoise(0.005); } },
        { name: "CIP 偏离 (危机)", description: "掉期基差", apply: () => { setFwd(7.45); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">平价条件参数</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="本币利率 i" value={iD} min={0} max={0.15} step={0.0025} onChange={setID} fmt={(v)=>`${(v*100).toFixed(2)}%`} />
            <Slider label="外币利率 i*" value={iF} min={0} max={0.15} step={0.0025} onChange={setIF} fmt={(v)=>`${(v*100).toFixed(2)}%`} />
            <Slider label="即期 S" value={spot} min={1} max={12} step={0.1} onChange={setSpot} />
            <Slider label="远期 F" value={fwd} min={1} max={12} step={0.01} onChange={setFwd} />
            <Slider label="真实 UIP β" value={beta} min={-2} max={2} step={0.1} onChange={setBeta} />
            <Slider label="噪声 σ" value={noise} min={0.002} max={0.06} step={0.002} onChange={setNoise} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="CIP 基差" value={`${r.cipBasis.toFixed(0)} bp`} color={Math.abs(r.cipBasis) > 50 ? C.red : C.green} />
            <Stat label="远期溢价" value={`${(r.forwardPremium*100).toFixed(2)}%`} color={C.gold} />
            <Stat label="Fama β" value={r.famaBeta.toFixed(2)} color={r.puzzle ? C.red : C.green} sub={r.puzzle ? "远期溢价之谜" : "UIP 方向一致"} />
            <Stat label="回归 R²" value={r.famaR2.toFixed(3)} color={C.blue} />
            <Stat label="Carry 超额收益" value={`${(r.carryReturn*100).toFixed(2)}%`} color={r.carryReturn > 0 ? C.green : C.red} />
            <Stat label="PPP 实际漂移" value={`${(r.realExchangeDrift*100).toFixed(2)}%`} color={C.teal} sub="π − π*" />
          </div>
        </div>
        <Panel title="Fama 回归：Δs 对利差散点">
          <div className="h-[300px]">
            <ResponsiveContainer>
              <ScatterChart>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis type="number" dataKey="diff" stroke={C.text} tick={{ fontSize: 10 }} name="i−i* (%)" />
                <YAxis type="number" dataKey="ds" stroke={C.text} tick={{ fontSize: 10 }} name="Δs (%)" />
                <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={r.scatter} fill={C.gold} fillOpacity={0.45} name="观测" />
                <Scatter data={fit} line={{ stroke: C.red, strokeWidth: 2 }} dataKey="fitted" fill="transparent" name="拟合" />
                <Scatter data={fit} line={{ stroke: C.teal, strokeWidth: 1.5, strokeDasharray: "4 4" }} dataKey="uip" fill="transparent" name="UIP β=1" />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <Note>
            UIP 预测 β=1；实证常得到 β&lt;0：高息货币不仅没有贬值，反而带来正的 Carry 收益。风险溢价、峰度风险与
            有限套利资本都是候选解释。CIP 基差在 2008 后长期非零，说明连「无风险」平价都受资产负债表约束。
          </Note>
        </Panel>
      </div>
    </div>
  );
}

/* ── 8. Sudden stop ── */
function SuddenPanel() {
  const [ca, setCa] = useState(0.06);
  const [debt, setDebt] = useState(0.6);
  const [res, setRes] = useState(0.12);
  const [stShare, setStShare] = useState(0.4);
  const [rev, setRev] = useState(0.7);
  const [pass, setPass] = useState(0.5);
  const s = useMemo(() => suddenStop({
    caDeficit: ca, externalDebt: debt, reserves: res, shortTermShare: stShare,
    flowReversal: rev, fxPassthrough: pass, horizon: 24,
  }), [ca, debt, res, stShare, rev, pass]);
  const chart = s.t.map((t, i) => ({
    t,
    ca: +(s.currentAccount[i] * 100).toFixed(2),
    fx: +(s.depreciation[i] * 100).toFixed(2),
    y: +(s.output[i] * 100).toFixed(2),
  }));
  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "亚洲金融危机式", description: "短债高、储备薄", apply: () => { setStShare(0.6); setRes(0.08); setRev(0.9); } },
        { name: "储备充足", description: "Greenspan-Guidotti 达标", apply: () => { setRes(0.3); setStShare(0.3); } },
        { name: "温和调整", description: "流动逆转有限", apply: () => { setRev(0.3); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">外部脆弱性参数</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="经常账户赤字" value={ca} min={0} max={0.15} step={0.005} onChange={setCa} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label="外债 / GDP" value={debt} min={0.1} max={1.5} step={0.05} onChange={setDebt} fmt={(v)=>`${(v*100).toFixed(0)}%`} />
            <Slider label="储备 / GDP" value={res} min={0.01} max={0.5} step={0.01} onChange={setRes} fmt={(v)=>`${(v*100).toFixed(0)}%`} />
            <Slider label="短期债务占比" value={stShare} min={0.05} max={0.8} step={0.05} onChange={setStShare} fmt={(v)=>`${(v*100).toFixed(0)}%`} />
            <Slider label="资本流逆转比例" value={rev} min={0} max={1} step={0.05} onChange={setRev} fmt={(v)=>`${(v*100).toFixed(0)}%`} />
            <Slider label="汇率传递系数" value={pass} min={0} max={1} step={0.05} onChange={setPass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="储备覆盖率" value={`${s.reserveCover.toFixed(2)}×`} color={s.reserveCover >= 1 ? C.green : C.red} sub="Greenspan-Guidotti ≥1" />
            <Stat label="所需外部调整" value={`${(s.requiredAdjustment*100).toFixed(2)}%`} color={C.gold} />
            <Stat label="资产负债表损失" value={`${(s.balanceSheetLoss*100).toFixed(2)}%`} color={C.red} sub="FX 债务估值效应" />
            <Stat label="判定" value={s.crisis ? "危机风险" : "可控"} color={s.crisis ? C.red : C.green} />
          </div>
        </div>
        <Panel title="突然停止后的调整路径">
          <div className="h-[300px]">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "季度", position: "insideBottom", offset: -4, fill: C.text, fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "%", angle: -90, position: "insideLeft", fill: C.text, fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="ca" stroke={C.gold} dot={false} strokeWidth={2} name="经常账户 / GDP" />
                <Line type="monotone" dataKey="fx" stroke={C.red} dot={false} strokeWidth={2} name="累计贬值" />
                <Line type="monotone" dataKey="y" stroke={C.teal} dot={false} strokeWidth={2} name="产出偏离" />
                <ReferenceLine y={0} stroke={C.text} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <Note>
            货币错配下贬值同时带来支出转换 (扩张) 与资产负债表损失 (紧缩)；后者占优时贬值反而是收缩性的 —— 这正是
            「原罪」与外汇储备自我保险的核心动机。
          </Note>
        </Panel>
      </div>
    </div>
  );
}

/* ── 9. Expectations ── */
function ExpectPanel() {
  const [kind, setKind] = useState<ExpectationKind>("sticky");
  const [gain, setGain] = useState(0.25);
  const [stick, setStick] = useState(0.6);
  const [diag, setDiag] = useState(0.5);
  const [rho, setRho] = useState(0.85);
  const kinds: ExpectationKind[] = ["rational", "adaptive", "sticky", "diagnostic"];
  const all = useMemo(() => kinds.map((k) => ({
    k,
    r: expectationsLab({ kind: k, gain, stickiness: stick, diagnostic: diag, rhoShock: rho, shock: 0.02, kappa: 0.1, horizon: 30 }),
  })), [gain, stick, diag, rho]);
  const active = all.find((a) => a.k === kind)!.r;
  const chart = active.t.map((t, i) => {
    const row: Record<string, number> = { t, actual: +(active.actual[i] * 100).toFixed(3) };
    all.forEach((a) => { row[a.k] = +(a.r.expected[i] * 100).toFixed(3); });
    return row;
  });
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {kinds.map((k) => (
          <button key={k} onClick={() => setKind(k)}
            className={`px-3 py-1.5 rounded-md border text-[11px] font-mono ${kind === k ? "bg-gold/15 border-gold/50 text-gold" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {k === "rational" ? "理性预期" : k === "adaptive" ? "适应性学习" : k === "sticky" ? "黏性信息" : "诊断性预期"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{active.label}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="学习增益 g" value={gain} min={0.02} max={0.8} step={0.02} onChange={setGain} />
            <Slider label="信息黏性 λ" value={stick} min={0} max={0.95} step={0.05} onChange={setStick} />
            <Slider label="诊断参数 θ" value={diag} min={0} max={1.5} step={0.05} onChange={setDiag} />
            <Slider label="冲击持久性 ρ" value={rho} min={0.3} max={0.98} step={0.02} onChange={setRho} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="CG 系数" value={active.cgCoefficient.toFixed(3)} color={Math.abs(active.cgCoefficient) < 1e-8 ? C.green : C.gold}
              sub="误差对修正回归；≠0 表示可预测误差" />
            <Stat label="最大预测误差" value={`${(Math.max(...active.forecastError.map(Math.abs)) * 100).toFixed(2)}%`} color={C.red} />
          </div>
          <Note>
            FIRE 基准要求预测误差不可预测。黏性信息给出正的 CG 系数 (反应不足)，诊断性预期给出负系数 (过度反应)，
            适应性学习则在冲击后产生系统性追赶 —— 这三类偏离正是行为宏观的实证抓手。
          </Note>
        </div>
        <Panel title="实际值 vs 四种预期路径">
          <div className="h-[300px]">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "%", angle: -90, position: "insideLeft", fill: C.text, fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="actual" stroke={C.text} dot={false} strokeWidth={2} name="实际" />
                <Line type="monotone" dataKey="rational" stroke={C.green} dot={false} strokeWidth={kind === "rational" ? 2.5 : 1} name="理性" />
                <Line type="monotone" dataKey="adaptive" stroke={C.blue} dot={false} strokeWidth={kind === "adaptive" ? 2.5 : 1} name="适应性" />
                <Line type="monotone" dataKey="sticky" stroke={C.gold} dot={false} strokeWidth={kind === "sticky" ? 2.5 : 1} name="黏性" />
                <Line type="monotone" dataKey="diagnostic" stroke={C.red} dot={false} strokeWidth={kind === "diagnostic" ? 2.5 : 1} name="诊断性" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ── 10. Unconventional policy ── */
function UnconPanel() {
  const [qe, setQe] = useState(0.15);
  const [dur, setDur] = useState(2);
  const [hab, setHab] = useState(0.5);
  const [sig, setSig] = useState(0.5);
  const [depth, setDepth] = useState(1);
  const [ycc, setYcc] = useState(false);
  const [target, setTarget] = useState(0.0025);
  const r = useMemo(() => unconventionalPolicy({
    qeSize: qe, durationRemoved: dur, preferredHabitat: hab,
    yccTarget: ycc ? target : null, signalling: sig, marketDepth: depth, horizon: 20,
  }), [qe, dur, hab, sig, depth, ycc, target]);
  const chart = r.t.map((t, i) => ({
    t,
    y10: +r.yield10y[i].toFixed(3),
    exp: +r.expectedShortRate[i].toFixed(3),
    tp: +r.termPremium[i].toFixed(1),
    bs: +(r.balanceSheet[i] * 100).toFixed(1),
  }));
  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "大规模 QE", description: "久期移除大", apply: () => { setQe(0.3); setDur(4); setYcc(false); } },
        { name: "日本式 YCC", description: "收益率上限", apply: () => { setYcc(true); setTarget(0.0025); } },
        { name: "纯信号渠道", description: "前瞻指引为主", apply: () => { setDur(0.3); setSig(1); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">QE / YCC 参数</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="购买规模 (%GDP)" value={qe} min={0.02} max={0.6} step={0.02} onChange={setQe} fmt={(v)=>`${(v*100).toFixed(0)}%`} />
            <Slider label="久期移除 (10y 等值)" value={dur} min={0.1} max={6} step={0.1} onChange={setDur} />
            <Slider label="偏好栖息地弹性" value={hab} min={0.1} max={1.5} step={0.05} onChange={setHab} />
            <Slider label="信号渠道强度" value={sig} min={0} max={1.5} step={0.05} onChange={setSig} />
            <Slider label="市场深度" value={depth} min={0.3} max={3} step={0.1} onChange={setDepth} />
            <Slider label="YCC 目标" value={target} min={0} max={0.02} step={0.0005} onChange={setTarget} fmt={(v)=>`${(v*100).toFixed(2)}%`} />
          </div>
          <label className="flex items-center gap-2 text-xs text-secondary-foreground">
            <input type="checkbox" checked={ycc} onChange={(e) => setYcc(e.target.checked)} className="accent-gold" />
            启用收益率曲线控制 (YCC)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="总收益率下压" value={`${r.totalYieldDrop.toFixed(0)} bp`} color={C.gold} />
            <Stat label="组合再平衡渠道" value={`${r.channelSplit.portfolio.toFixed(0)} bp`} color={C.teal} />
            <Stat label="信号渠道" value={`${r.channelSplit.signalling.toFixed(0)} bp`} color={C.blue} />
            <Stat label="YCC 可守住?" value={ycc ? (r.yccDefends ? "是 (无需大量购债)" : "需大量购债") : "未启用"}
              color={!ycc ? C.text : r.yccDefends ? C.green : C.red}
              sub={ycc ? `隐含额外购买 ${(r.yccPurchasesNeeded).toFixed(0)} 单位` : undefined} />
          </div>
        </div>
        <Panel title="10y 收益率分解与资产负债表">
          <div className="h-[300px]">
            <ResponsiveContainer>
              <ComposedChart data={chart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="l" stroke={C.gold} tick={{ fontSize: 10 }} label={{ value: "%", angle: -90, position: "insideLeft", fill: C.gold, fontSize: 10 }} />
                <YAxis yAxisId="r" orientation="right" stroke={C.teal} tick={{ fontSize: 10 }} label={{ value: "资产负债表 %GDP", angle: 90, position: "insideRight", fill: C.teal, fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line yAxisId="l" type="monotone" dataKey="y10" stroke={C.gold} dot={false} strokeWidth={2} name="10y 收益率" />
                <Line yAxisId="l" type="monotone" dataKey="exp" stroke={C.blue} dot={false} strokeWidth={1.5} strokeDasharray="4 4" name="预期短端路径" />
                <Bar yAxisId="r" dataKey="bs" fill={C.teal} fillOpacity={0.25} name="央行持仓" />
                {ycc && <ReferenceLine yAxisId="l" y={target * 100} stroke={C.red} strokeDasharray="4 4" label={{ value: "YCC 上限", fill: C.red, fontSize: 10 }} />}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <Note>QE 通过组合再平衡压低期限溢价、通过信号渠道压低预期短端路径；YCC 用价格承诺替代数量目标，可信时购买量反而更小。</Note>
        </Panel>
      </div>
    </div>
  );
}

/* ── 11. Bank capital ── */
function BankPanel() {
  const [cap, setCap] = useState(0.08);
  const [loss, setLoss] = useState(0.02);
  const [lev, setLev] = useState(12);
  const [el, setEl] = useState(0.3);
  const [fire, setFire] = useState(0.2);
  const r = useMemo(() => bankCapitalAmplification({
    capitalRatio: cap, riskWeight: 1, lossShock: loss, targetLeverage: lev,
    creditElasticity: el, fireSaleImpact: fire, horizon: 20,
  }), [cap, loss, lev, el, fire]);
  const chart = r.t.map((t, i) => ({ t, cap: +r.capital[i].toFixed(2), credit: +r.creditSupply[i].toFixed(2), y: +r.output[i].toFixed(2), spread: +r.spread[i].toFixed(0) }));
  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "2008 式冲击", description: "高杠杆 + 抛售", apply: () => { setLev(25); setLoss(0.03); setFire(0.35); } },
        { name: "Basel III 后", description: "厚资本缓冲", apply: () => { setCap(0.14); setLev(12); } },
        { name: "轻微损失", description: "可吸收", apply: () => { setLoss(0.005); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">银行资本与去杠杆</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="初始资本率" value={cap} min={0.03} max={0.2} step={0.005} onChange={setCap} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label="损失冲击" value={loss} min={0} max={0.06} step={0.0025} onChange={setLoss} fmt={(v)=>`${(v*100).toFixed(2)}%`} />
            <Slider label="目标杠杆" value={lev} min={5} max={35} step={1} onChange={setLev} />
            <Slider label="信贷—产出弹性" value={el} min={0.05} max={0.8} step={0.05} onChange={setEl} />
            <Slider label="抛售价格冲击" value={fire} min={0} max={0.6} step={0.05} onChange={setFire} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="信贷收缩峰值" value={`${Math.min(...r.creditSupply).toFixed(1)}%`} color={C.red} />
            <Stat label="产出缺口峰值" value={`${Math.min(...r.output).toFixed(2)}%`} color={C.gold} />
            <Stat label="放大倍数" value={`${r.amplification.toFixed(1)}×`} color={C.teal} sub="|Δy| / 损失冲击" />
            <Stat label="监管底线" value={r.breachesMinimum ? "触及最低资本" : "缓冲充足"} color={r.breachesMinimum ? C.red : C.green} />
          </div>
        </div>
        <Panel title="资本 → 信贷 → 产出与利差">
          <div className="h-[300px]">
            <ResponsiveContainer>
              <ComposedChart data={chart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="l" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "%", angle: -90, position: "insideLeft", fill: C.text, fontSize: 10 }} />
                <YAxis yAxisId="r" orientation="right" stroke={C.red} tick={{ fontSize: 10 }} label={{ value: "利差 bp", angle: 90, position: "insideRight", fill: C.red, fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line yAxisId="l" type="monotone" dataKey="cap" stroke={C.teal} dot={false} strokeWidth={2} name="资本率 %" />
                <Line yAxisId="l" type="monotone" dataKey="credit" stroke={C.gold} dot={false} strokeWidth={2} name="信贷供给" />
                <Line yAxisId="l" type="monotone" dataKey="y" stroke={C.blue} dot={false} strokeWidth={2} name="产出" />
                <Bar yAxisId="r" dataKey="spread" fill={C.red} fillOpacity={0.25} name="信贷利差" />
                <ReferenceLine yAxisId="l" y={0} stroke={C.text} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <Note>净值损失 × 目标杠杆 = 资产收缩规模；抛售价格冲击把个体审慎行为变成系统性紧缩 —— 宏观审慎政策的靶点。</Note>
        </Panel>
      </div>
    </div>
  );
}

/* ── 12. Climate ── */
function ClimatePanel() {
  const [price, setPrice] = useState(150);
  const [share, setShare] = useState(0.06);
  const [years, setYears] = useState(30);
  const [green, setGreen] = useState(2);
  const [ab, setAb] = useState(1.2);
  const [dmg, setDmg] = useState(1.5);
  const [warm, setWarm] = useState(3);
  const r = useMemo(() => climateMacroPath({
    carbonPrice: price, energyShare: share, transitionYears: years,
    greenInvestment: green, abatementElasticity: ab, damageIntensity: dmg, warmingBaseline: warm,
  }), [price, share, years, green, ab, dmg, warm]);
  const chart = r.t.map((t, i) => ({
    t, em: +r.emissions[i].toFixed(1), cost: +r.outputCost[i].toFixed(2),
    dam: +r.physicalDamage[i].toFixed(2), net: +r.netOutput[i].toFixed(2), infl: +r.inflation[i].toFixed(2),
  }));
  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "有序转型", description: "早、缓、可预期", apply: () => { setPrice(180); setYears(30); setGreen(2.5); } },
        { name: "无序转型", description: "晚、急、成本高", apply: () => { setPrice(300); setYears(10); setGreen(1); } },
        { name: "温室世界", description: "无政策 → 高损害", apply: () => { setPrice(10); setGreen(0.2); setWarm(4); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">转型情景参数</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="终期碳价 (USD/t)" value={price} min={0} max={400} step={10} onChange={setPrice} />
            <Slider label="能源成本份额" value={share} min={0.02} max={0.15} step={0.005} onChange={setShare} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label="转型年限" value={years} min={5} max={40} step={1} onChange={setYears} />
            <Slider label="绿色投资 (%GDP/年)" value={green} min={0} max={5} step={0.1} onChange={setGreen} />
            <Slider label="减排弹性" value={ab} min={0.2} max={3} step={0.1} onChange={setAb} />
            <Slider label="损害强度" value={dmg} min={0.2} max={4} step={0.1} onChange={setDmg} />
            <Slider label="无政策升温 (°C)" value={warm} min={1.5} max={5} step={0.1} onChange={setWarm} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="终期升温" value={`${r.warming.toFixed(2)}°C`} color={r.warming < 2 ? C.green : r.warming < 3 ? C.gold : C.red} />
            <Stat label="转型成本 NPV" value={`${r.npvTransitionCost.toFixed(1)}%`} color={C.teal} sub="3% 贴现" />
            <Stat label="绿色通胀峰值" value={`${Math.max(...r.inflation).toFixed(2)} pp`} color={C.gold} />
            <Stat label="政策优于不作为" value={r.crossover != null ? `第 ${r.crossover} 年起` : "本情景下未跨越"} color={r.crossover != null ? C.green : C.red} />
          </div>
        </div>
        <Panel title="排放路径与产出成本分解">
          <div className="h-[300px]">
            <ResponsiveContainer>
              <ComposedChart data={chart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "年", position: "insideBottom", offset: -4, fill: C.text, fontSize: 10 }} />
                <YAxis yAxisId="l" stroke={C.gold} tick={{ fontSize: 10 }} label={{ value: "排放指数", angle: -90, position: "insideLeft", fill: C.gold, fontSize: 10 }} />
                <YAxis yAxisId="r" orientation="right" stroke={C.red} tick={{ fontSize: 10 }} label={{ value: "% 产出", angle: 90, position: "insideRight", fill: C.red, fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area yAxisId="l" type="monotone" dataKey="em" stroke={C.gold} fill={C.gold} fillOpacity={0.15} name="排放 (100=今天)" />
                <Line yAxisId="r" type="monotone" dataKey="cost" stroke={C.teal} dot={false} strokeWidth={1.5} name="转型成本" />
                <Line yAxisId="r" type="monotone" dataKey="dam" stroke={C.red} dot={false} strokeWidth={1.5} name="物理损害" />
                <Line yAxisId="r" type="monotone" dataKey="net" stroke={C.blue} dot={false} strokeWidth={2} name="净产出影响" />
                <ReferenceLine yAxisId="r" y={0} stroke={C.text} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <Note>
            碳定价把外部性内部化，短期表现为供给侧成本与「绿色通胀」，长期换取更低的物理损害。
            无序转型 (晚而急) 同时抬高转型成本与金融风险 —— 央行气候压力测试的核心情景对照。
          </Note>
        </Panel>
      </div>
    </div>
  );
}

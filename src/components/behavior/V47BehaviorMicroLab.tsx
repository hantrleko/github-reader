import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, Area, ComposedChart, ScatterChart, Scatter,
} from "recharts";
import { C, Slider, Stat, tooltipStyle } from "@/components/frontier/ui";
import PresetButtons from "@/components/PresetButtons";
import {
  hyperbolicDiscount,
  dsswNoiseTraderIRF,
  overconfidenceOutcome,
  dispositionSim,
  kyleEquilibrium,
  glostenMilgromSpread,
  rollSpread,
  almgrenChriss,
  amihudIlliq,
} from "@/lib/quant/behaviorMicro";

type Tab = "behavior" | "micro";

const TABS: { id: Tab; title: string; kicker: string; desc: string }[] = [
  { id: "behavior", title: "行为金融", kicker: "Behavioral", desc: "双曲贴现 · DSSW · 过度自信 · 处置效应" },
  { id: "micro",    title: "市场微观结构", kicker: "Microstructure", desc: "Kyle · Glosten-Milgrom · Roll · Almgren-Chriss · Amihud" },
];

export default function V47BehaviorMicroLab() {
  const { t } = useTranslation();
  const [tab, setTab] = useToolTab<Tab>(["behavior", "micro"], "behavior");
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-card/50 p-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-1">V4.7 · Behavior &amp; Microstructure Lab</p>
        <h2 className="text-2xl font-serif text-foreground">{t("labs.behaviorMicro.title")}</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
          {t("labs.behaviorMicro.subtitle")}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {TABS.map((tb) => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`px-3.5 py-2 rounded-lg border text-xs font-mono transition-colors ${
                tab === tb.id ? "bg-gold/15 border-gold/60 text-gold"
                             : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
              }`}>
              <span className="uppercase tracking-wider mr-2">{tb.kicker}</span>{t(`labs.behaviorMicro.tab.${tb.id}`)}
            </button>
          ))}
        </div>
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {tab === "behavior" ? <BehaviorPanels /> : <MicrostructurePanels />}
      </motion.div>

      <div className="rounded-lg border border-border bg-card/60 p-4 text-[11px] font-mono text-muted-foreground leading-relaxed">
        <p className="text-gold uppercase tracking-wider mb-2">{t("labs.behaviorMicro.references")}</p>
        <p>
          Laibson (1997) Golden Eggs and Hyperbolic Discounting · De Long, Shleifer, Summers, Waldmann (1990)
          Noise Trader Risk · Odean (1998), Barber-Odean (2001) Trading is Hazardous to Your Wealth ·
          Kyle (1985) Continuous Auctions and Insider Trading · Glosten-Milgrom (1985) Bid, Ask and Transaction Prices ·
          Roll (1984) A Simple Implicit Measure of the Bid-Ask Spread · Almgren-Chriss (2000) Optimal Execution of
          Portfolio Transactions · Amihud (2002) Illiquidity and Stock Returns.
        </p>
      </div>
    </section>
  );
}

/* ═══════════════════════ Behavior tab ═══════════════════════ */
function BehaviorPanels() {
  return (
    <div className="space-y-6">
      <HyperbolicPanel />
      <DsswPanel />
      <OverconfidencePanel />
      <DispositionPanel />
    </div>
  );
}

/* ─── 1. Hyperbolic discounting ─── */
function HyperbolicPanel() {
  const [beta, setBeta] = useState(0.7);
  const [delta, setDelta] = useState(0.96);
  const [T, setT] = useState(20);
  const o = useMemo(() => hyperbolicDiscount(beta, delta, T), [beta, delta, T]);
  const data = o.years.map((y, i) => ({
    t: y,
    hyp: +o.hyperbolic[i].toFixed(4),
    exp: +o.exponential[i].toFixed(4),
  }));
  return (
    <ToolCard title="心理账户 & 双曲贴现" kicker="Quasi-hyperbolic β-δ (Laibson 1997)"
      formula="D(t) = β · δᵗ  (t≥1),  D(0)=1">
      <PresetButtons presets={[
        { name: "Laibson 校准", description: "β=.7, δ=.96", apply: () => { setBeta(0.7); setDelta(0.96); } },
        { name: "强现时偏好", description: "β=.5", apply: () => { setBeta(0.5); setDelta(0.95); } },
        { name: "指数一致", description: "β=1", apply: () => { setBeta(1); setDelta(0.95); } },
      ]}/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-3">
          <Slider label="β 现时偏好" value={beta} min={0.3} max={1} step={0.01} onChange={setBeta}/>
          <Slider label="δ 长期折扣" value={delta} min={0.85} max={0.99} step={0.005} onChange={setDelta}/>
          <Slider label="窗口 T (年)" value={T} min={5} max={40} step={1} onChange={setT} fmt={(v)=>v.toFixed(0)}/>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Stat label="D(1) 双曲" value={o.hyperbolic[1].toFixed(3)} color={C.gold}/>
            <Stat label="D(1) 指数" value={o.exponential[1].toFixed(3)} color={C.blue}/>
            <Stat label="偏好反转" value={o.preferenceReversal ? "存在" : "无"} color={o.preferenceReversal ? C.red : C.green}/>
            <Stat label="D(T) 双曲" value={o.hyperbolic[T].toFixed(3)} color={C.text}/>
          </div>
        </div>
        <div className="lg:col-span-2 h-[280px]">
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3"/>
              <XAxis dataKey="t" stroke={C.text} tick={{fontSize:10}} label={{value:"年", position:"insideBottom", offset:-5, fill:C.text, fontSize:10}}/>
              <YAxis stroke={C.text} tick={{fontSize:10}} domain={[0,1]}/>
              <Tooltip contentStyle={tooltipStyle}/>
              <Legend wrapperStyle={{fontSize:11}}/>
              <Line type="monotone" dataKey="hyp" name="β·δᵗ 双曲" stroke={C.gold} strokeWidth={2.5} dot={false}/>
              <Line type="monotone" dataKey="exp" name="δᵗ 指数" stroke={C.blue} strokeWidth={2} strokeDasharray="4 3" dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ToolCard>
  );
}

/* ─── 2. DSSW noise trader IRF ─── */
function DsswPanel() {
  const [rho, setRho] = useState(0.75);
  const [shock, setShock] = useState(1);
  const [arb, setArb] = useState(0.4);
  const o = useMemo(() => dsswNoiseTraderIRF({ rho, shock, arbShare: arb, horizon: 24 }), [rho, shock, arb]);
  const data = o.t.map((t, i) => ({ t, mp: +o.mispricing[i].toFixed(4), sent: +o.sentiment[i].toFixed(4) }));
  return (
    <ToolCard title="有限套利 · DSSW 噪声交易者" kicker="DSSW (1990) Noise Trader Risk"
      formula="mispricing(t) = (1 − σ_arb) · sentiment(t),  sentiment ~ AR(1)">
      <PresetButtons presets={[
        { name: "持续偏差", description: "ρ=.9", apply: () => setRho(0.9) },
        { name: "快速回归", description: "ρ=.3", apply: () => setRho(0.3) },
        { name: "深口袋套利者", description: "σ=.8", apply: () => setArb(0.8) },
      ]}/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-3">
          <Slider label="ρ 情绪持续性" value={rho} min={0} max={0.98} step={0.01} onChange={setRho}/>
          <Slider label="情绪冲击" value={shock} min={-2} max={2} step={0.1} onChange={setShock}/>
          <Slider label="σ_arb 套利者份额" value={arb} min={0} max={1} step={0.05} onChange={setArb}/>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Stat label="t=0 定价误差" value={o.mispricing[0].toFixed(3)} color={C.red}/>
            <Stat label="t=12 定价误差" value={o.mispricing[12].toFixed(3)} color={C.gold}/>
          </div>
        </div>
        <div className="lg:col-span-2 h-[280px]">
          <ResponsiveContainer>
            <ComposedChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3"/>
              <XAxis dataKey="t" stroke={C.text} tick={{fontSize:10}}/>
              <YAxis stroke={C.text} tick={{fontSize:10}}/>
              <Tooltip contentStyle={tooltipStyle}/>
              <Legend wrapperStyle={{fontSize:11}}/>
              <ReferenceLine y={0} stroke={C.text}/>
              <Area type="monotone" dataKey="mp" name="定价误差" fill={C.red} stroke={C.red} fillOpacity={0.15}/>
              <Line type="monotone" dataKey="sent" name="情绪 ρ_t" stroke={C.blue} strokeWidth={2} dot={false}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ToolCard>
  );
}

/* ─── 3. Overconfidence outcome ─── */
function OverconfidencePanel() {
  const [k, setK] = useState(2.5);
  const [alpha, setAlpha] = useState(0.04);
  const [cost, setCost] = useState(0.002);
  const [turnover0, setTurnover0] = useState(1);
  const o = useMemo(() => overconfidenceOutcome({ k, baseAlpha: alpha, costPerTrade: cost, turnoverBase: turnover0 }),
    [k, alpha, cost, turnover0]);
  // Sweep k for chart
  const curve = useMemo(() => {
    const arr: { k:number; net:number; drag:number }[] = [];
    for (let kk = 1; kk <= 5; kk += 0.1) {
      const r = overconfidenceOutcome({ k: kk, baseAlpha: alpha, costPerTrade: cost, turnoverBase: turnover0 });
      arr.push({ k: +kk.toFixed(2), net: +(r.netAlpha*100).toFixed(3), drag: +(r.costDrag*100).toFixed(3) });
    }
    return arr;
  }, [alpha, cost, turnover0]);
  return (
    <ToolCard title="过度自信 & 换手率-alpha 侵蚀" kicker="Barber & Odean (2001)"
      formula="turnover = k · turnover₀,   net α = α − k · turnover₀ · cost">
      <PresetButtons presets={[
        { name: "Barber-Odean 男性", description: "k=2.5", apply: () => setK(2.5) },
        { name: "极端过度自信", description: "k=4", apply: () => setK(4) },
        { name: "校准良好", description: "k=1", apply: () => setK(1) },
      ]}/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-3">
          <Slider label="k 信号精度膨胀" value={k} min={1} max={5} step={0.05} onChange={setK}/>
          <Slider label="基线换手率" value={turnover0} min={0.2} max={3} step={0.1} onChange={setTurnover0}/>
          <Slider label="毛 α" value={alpha} min={0} max={0.15} step={0.005} onChange={setAlpha} fmt={v=>(v*100).toFixed(2)+"%"}/>
          <Slider label="单次交易成本" value={cost} min={0.0005} max={0.01} step={0.0005} onChange={setCost} fmt={v=>(v*10000).toFixed(0)+"bps"}/>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Stat label="实际换手率" value={o.turnover.toFixed(2)+"x"} color={C.blue}/>
            <Stat label="成本拖累" value={(o.costDrag*100).toFixed(2)+"%"} color={C.red}/>
            <Stat label="毛 α" value={(o.grossAlpha*100).toFixed(2)+"%"} color={C.text}/>
            <Stat label="净 α" value={(o.netAlpha*100).toFixed(2)+"%"} color={o.netAlpha>=0?C.green:C.red}/>
          </div>
        </div>
        <div className="lg:col-span-2 h-[280px]">
          <ResponsiveContainer>
            <LineChart data={curve}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3"/>
              <XAxis dataKey="k" stroke={C.text} tick={{fontSize:10}} label={{value:"k", position:"insideBottom", offset:-5, fill:C.text, fontSize:10}}/>
              <YAxis stroke={C.text} tick={{fontSize:10}} label={{value:"%", angle:-90, position:"insideLeft", fill:C.text, fontSize:10}}/>
              <Tooltip contentStyle={tooltipStyle}/>
              <Legend wrapperStyle={{fontSize:11}}/>
              <ReferenceLine y={0} stroke={C.text}/>
              <ReferenceLine x={k} stroke={C.gold} strokeDasharray="3 3"/>
              <Line type="monotone" dataKey="net" name="净 α (%)" stroke={C.green} strokeWidth={2.5} dot={false}/>
              <Line type="monotone" dataKey="drag" name="成本拖累 (%)" stroke={C.red} strokeWidth={2} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ToolCard>
  );
}

/* ─── 4. Disposition effect MC ─── */
function DispositionPanel() {
  const [gainP, setGainP] = useState(0.15);
  const [lossP, setLossP] = useState(0.05);
  const [sigma, setSigma] = useState(0.25);
  const [drift, setDrift] = useState(0.05);
  const [N, setN] = useState(200);
  const sim = useMemo(() => dispositionSim({ N, drift, sigma, gainSellProb: gainP, lossSellProb: lossP, seed: 7 }),
    [N, drift, sigma, gainP, lossP]);
  const scatter = sim.paths.slice(0, 200).map((p, i) => {
    const t = p.sold >= 0 ? p.sold : p.pnl.length - 1;
    return { i, t, pnl: +(p.pnl[t]*100).toFixed(2), sold: p.sold >= 0 };
  });
  return (
    <ToolCard title="处置效应蒙特卡洛" kicker="Odean (1998) PGR vs PLR"
      formula="P(卖出 | 盈利) > P(卖出 | 亏损)  ⇒  PGR / PLR > 1">
      <PresetButtons presets={[
        { name: "典型处置", description: "PGR/PLR = 3", apply: () => { setGainP(0.15); setLossP(0.05); } },
        { name: "对称基准", description: "无处置效应", apply: () => { setGainP(0.1); setLossP(0.1); } },
        { name: "反向 (止损)", description: "PGR<PLR", apply: () => { setGainP(0.05); setLossP(0.15); } },
      ]}/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-3">
          <Slider label="P(卖出 | 盈利)" value={gainP} min={0.01} max={0.3} step={0.01} onChange={setGainP}/>
          <Slider label="P(卖出 | 亏损)" value={lossP} min={0.01} max={0.3} step={0.01} onChange={setLossP}/>
          <Slider label="μ 年化漂移" value={drift} min={-0.2} max={0.2} step={0.01} onChange={setDrift} fmt={v=>(v*100).toFixed(0)+"%"}/>
          <Slider label="σ 年化波动" value={sigma} min={0.05} max={0.6} step={0.01} onChange={setSigma} fmt={v=>(v*100).toFixed(0)+"%"}/>
          <Slider label="模拟次数 N" value={N} min={50} max={500} step={50} onChange={setN} fmt={v=>v.toFixed(0)}/>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Stat label="PGR" value={sim.pgr.toFixed(3)} color={C.green}/>
            <Stat label="PLR" value={sim.plr.toFixed(3)} color={C.red}/>
            <Stat label="PGR / PLR" value={isFinite(sim.ratio) ? sim.ratio.toFixed(2) : "∞"} color={C.gold} sub={sim.ratio>1?"处置效应":"无"}/>
          </div>
        </div>
        <div className="lg:col-span-2 h-[280px]">
          <ResponsiveContainer>
            <ScatterChart>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3"/>
              <XAxis type="number" dataKey="t" name="持有天数" stroke={C.text} tick={{fontSize:10}}/>
              <YAxis type="number" dataKey="pnl" name="累积回报%" stroke={C.text} tick={{fontSize:10}}/>
              <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }}/>
              <ReferenceLine y={0} stroke={C.text}/>
              <Scatter name="已卖出" data={scatter.filter(s=>s.sold)} fill={C.gold}/>
              <Scatter name="仍持有" data={scatter.filter(s=>!s.sold)} fill={C.blue}/>
              <Legend wrapperStyle={{fontSize:11}}/>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ToolCard>
  );
}

/* ═══════════════════════ Microstructure tab ═══════════════════════ */
function MicrostructurePanels() {
  return (
    <div className="space-y-6">
      <KylePanel />
      <GMPanel />
      <RollPanel />
      <AlmgrenPanel />
    </div>
  );
}

/* ─── 5. Kyle 1985 ─── */
function KylePanel() {
  const [sigmaV, setSigmaV] = useState(1);
  const [sigmaU, setSigmaU] = useState(2);
  const [v, setV] = useState(105);
  const [p0, setP0] = useState(100);
  const eq = useMemo(() => kyleEquilibrium({ sigmaV, sigmaU, v, p0 }), [sigmaV, sigmaU, v, p0]);
  // depth vs σ_u
  const curve = useMemo(() => {
    const arr: { su:number; depth:number; profit:number }[] = [];
    for (let su = 0.2; su <= 5; su += 0.1) {
      const e = kyleEquilibrium({ sigmaV, sigmaU: su, v, p0 });
      arr.push({ su: +su.toFixed(2), depth: +e.depth.toFixed(3), profit: +e.expectedProfit.toFixed(3) });
    }
    return arr;
  }, [sigmaV, v, p0]);
  return (
    <ToolCard title="Kyle 1985 批量拍卖" kicker="Insider Trading & Price Impact"
      formula="λ = σ_v / (2 σ_u),   x* = (v − p₀) / (2λ),   利润 = (v − p₀)² / (4λ)">
      <PresetButtons presets={[
        { name: "隐蔽性高", description: "σ_u=5", apply: () => setSigmaU(5) },
        { name: "极端不对称", description: "σ_v=3", apply: () => setSigmaV(3) },
        { name: "小信息优势", description: "v=101", apply: () => setV(101) },
      ]}/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-3">
          <Slider label="σ_v 私有信息不确定性" value={sigmaV} min={0.2} max={4} step={0.1} onChange={setSigmaV}/>
          <Slider label="σ_u 噪声流动性" value={sigmaU} min={0.2} max={5} step={0.1} onChange={setSigmaU}/>
          <Slider label="v 内在价值" value={v} min={90} max={120} step={0.5} onChange={setV}/>
          <Slider label="p₀ 先验价格" value={p0} min={90} max={120} step={0.5} onChange={setP0}/>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Stat label="λ 价格冲击" value={eq.lambda.toFixed(4)} color={C.red}/>
            <Stat label="市场深度 1/λ" value={eq.depth.toFixed(2)} color={C.green}/>
            <Stat label="x* 知情单量" value={eq.xStar.toFixed(2)} color={C.gold}/>
            <Stat label="E[知情利润]" value={eq.expectedProfit.toFixed(2)} color={C.blue}/>
          </div>
        </div>
        <div className="lg:col-span-2 h-[280px]">
          <ResponsiveContainer>
            <ComposedChart data={curve}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3"/>
              <XAxis dataKey="su" stroke={C.text} tick={{fontSize:10}} label={{value:"σ_u", position:"insideBottom", offset:-5, fill:C.text, fontSize:10}}/>
              <YAxis yAxisId="L" stroke={C.text} tick={{fontSize:10}}/>
              <YAxis yAxisId="R" orientation="right" stroke={C.text} tick={{fontSize:10}}/>
              <Tooltip contentStyle={tooltipStyle}/>
              <Legend wrapperStyle={{fontSize:11}}/>
              <ReferenceLine x={sigmaU} stroke={C.gold} strokeDasharray="3 3"/>
              <Line yAxisId="L" type="monotone" dataKey="depth" name="深度 1/λ" stroke={C.green} strokeWidth={2.5} dot={false}/>
              <Line yAxisId="R" type="monotone" dataKey="profit" name="知情利润 (右)" stroke={C.blue} strokeWidth={2} dot={false}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ToolCard>
  );
}

/* ─── 6. Glosten-Milgrom ─── */
function GMPanel() {
  const [alpha, setAlpha] = useState(0.3);
  const [vH, setVH] = useState(110);
  const [vL, setVL] = useState(90);
  const [pi, setPi] = useState(0.5);
  const gm = useMemo(() => glostenMilgromSpread({ alpha, vH, vL, pi }), [alpha, vH, vL, pi]);
  const curve = useMemo(() => {
    const arr: { a:number; spread:number }[] = [];
    for (let a = 0; a <= 1; a += 0.02) {
      const s = glostenMilgromSpread({ alpha: a, vH, vL, pi });
      arr.push({ a: +a.toFixed(2), spread: +s.spread.toFixed(3) });
    }
    return arr;
  }, [vH, vL, pi]);
  return (
    <ToolCard title="Glosten-Milgrom 序贯交易" kicker="Adverse Selection Spread"
      formula="Ask = E[V | buy],  Bid = E[V | sell];  spread ↑ with 知情比例 α">
      <PresetButtons presets={[
        { name: "低知情", description: "α=.1", apply: () => setAlpha(0.1) },
        { name: "高知情 (盘前)", description: "α=.6", apply: () => setAlpha(0.6) },
        { name: "偏悲观", description: "π=.3", apply: () => setPi(0.3) },
      ]}/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-3">
          <Slider label="α 知情交易者比例" value={alpha} min={0} max={0.95} step={0.01} onChange={setAlpha}/>
          <Slider label="π 先验 P(V=vH)" value={pi} min={0.05} max={0.95} step={0.01} onChange={setPi}/>
          <Slider label="vH" value={vH} min={100} max={130} step={1} onChange={setVH} fmt={v=>v.toFixed(0)}/>
          <Slider label="vL" value={vL} min={70} max={100} step={1} onChange={setVL} fmt={v=>v.toFixed(0)}/>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Stat label="Ask" value={gm.ask.toFixed(3)} color={C.red}/>
            <Stat label="Bid" value={gm.bid.toFixed(3)} color={C.green}/>
            <Stat label="价差 S" value={gm.spread.toFixed(3)} color={C.gold}/>
            <Stat label="Mid" value={((gm.ask+gm.bid)/2).toFixed(3)} color={C.text}/>
          </div>
        </div>
        <div className="lg:col-span-2 h-[280px]">
          <ResponsiveContainer>
            <LineChart data={curve}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3"/>
              <XAxis dataKey="a" stroke={C.text} tick={{fontSize:10}} label={{value:"α", position:"insideBottom", offset:-5, fill:C.text, fontSize:10}}/>
              <YAxis stroke={C.text} tick={{fontSize:10}}/>
              <Tooltip contentStyle={tooltipStyle}/>
              <Legend wrapperStyle={{fontSize:11}}/>
              <ReferenceLine x={alpha} stroke={C.gold} strokeDasharray="3 3"/>
              <Line type="monotone" dataKey="spread" name="Bid-Ask 价差" stroke={C.gold} strokeWidth={2.5} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ToolCard>
  );
}

/* ─── 7. Roll spread from synthetic ticks ─── */
function RollPanel() {
  const [trueSpread, setTrueSpread] = useState(0.4);
  const [flip, setFlip] = useState(0.5);
  const [n, setN] = useState(400);
  const [seed, setSeed] = useState(3);

  const { series, est } = useMemo(() => {
    let s = (seed >>> 0) || 1;
    const rng = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    let q = 1;
    const prices: number[] = [];
    for (let i = 0; i < n; i++) {
      if (rng() < flip) q = -q;
      prices.push(100 + (trueSpread / 2) * q);
    }
    const est = rollSpread(prices);
    const series = prices.slice(0, 120).map((p, i) => ({ i, p: +p.toFixed(3) }));
    return { series, est };
  }, [trueSpread, flip, n, seed]);

  return (
    <ToolCard title="Roll 1984 有效价差反推" kicker="Serial-covariance estimator"
      formula="ŝ = 2 · √(−cov(Δpₜ, Δpₜ₋₁))">
      <PresetButtons presets={[
        { name: "宽价差 (小盘)", description: "s=0.8", apply: () => setTrueSpread(0.8) },
        { name: "紧价差 (大盘)", description: "s=0.05", apply: () => setTrueSpread(0.05) },
        { name: "有趋势 (低翻转)", description: "flip=0.2", apply: () => setFlip(0.2) },
      ]}/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-3">
          <Slider label="真实有效价差" value={trueSpread} min={0.01} max={1.5} step={0.01} onChange={setTrueSpread}/>
          <Slider label="买卖翻转率" value={flip} min={0.1} max={0.9} step={0.05} onChange={setFlip}/>
          <Slider label="样本量" value={n} min={100} max={2000} step={100} onChange={setN} fmt={v=>v.toFixed(0)}/>
          <Slider label="随机种子" value={seed} min={1} max={99} step={1} onChange={setSeed} fmt={v=>v.toFixed(0)}/>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Stat label="真实 s" value={trueSpread.toFixed(3)} color={C.text}/>
            <Stat label="Roll ŝ" value={est.spread.toFixed(3)} color={C.gold}/>
            <Stat label="cov(Δpₜ,Δpₜ₋₁)" value={est.covariance.toFixed(4)} color={est.covariance<0?C.red:C.green} sub="负号 → 价差存在"/>
            <Stat label="估计误差" value={((est.spread-trueSpread)*100).toFixed(1)+"bp"} color={C.blue}/>
          </div>
        </div>
        <div className="lg:col-span-2 h-[280px]">
          <ResponsiveContainer>
            <LineChart data={series}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3"/>
              <XAxis dataKey="i" stroke={C.text} tick={{fontSize:10}}/>
              <YAxis stroke={C.text} tick={{fontSize:10}} domain={["auto","auto"]}/>
              <Tooltip contentStyle={tooltipStyle}/>
              <Line type="stepAfter" dataKey="p" name="tick price" stroke={C.gold} strokeWidth={1.5} dot={{r:1.5}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ToolCard>
  );
}

/* ─── 8. Almgren-Chriss + Amihud ─── */
function AlmgrenPanel() {
  const [X, setX] = useState(100000);
  const [T, setT] = useState(1);
  const [N, setN] = useState(20);
  const [eta, setEta] = useState(0.1);
  const [gamma, setGamma] = useState(0.02);
  const [sigma, setSigma] = useState(0.3);
  const [lam, setLam] = useState(5);

  const sol = useMemo(() => almgrenChriss({ X, T, N, eta, gamma, sigma, lambda: lam }), [X, T, N, eta, gamma, sigma, lam]);
  const chart = sol.times.map((t, i) => ({
    t: +t.toFixed(3),
    optimal: +sol.holdings[i].toFixed(1),
    vwap: +sol.linearVWAP[i].toFixed(1),
  }));

  // Efficient frontier: sweep λ
  const frontier = useMemo(() => {
    const arr: { cost:number; std:number; lam:number }[] = [];
    const ls = [0, 0.5, 1, 2, 5, 10, 25, 50, 100, 200];
    for (const l of ls) {
      const r = almgrenChriss({ X, T, N, eta, gamma, sigma, lambda: l });
      arr.push({ cost: +r.expectedCost.toFixed(1), std: +Math.sqrt(r.variance).toFixed(1), lam: l });
    }
    return arr;
  }, [X, T, N, eta, gamma, sigma]);

  // Amihud illustrative
  const amihud = useMemo(() => amihudIlliq(
    [0.012, -0.018, 0.007, -0.02, 0.011],
    [8e7, 8e7, 8e7, 8e7, 8e7],
  ), []);

  return (
    <ToolCard title="Almgren-Chriss 最优执行 & Amihud 非流动性" kicker="Optimal Liquidation Frontier"
      formula="x_t = sinh(κ(T−t)) / sinh(κT) · X,   κ² = λσ² / η̃">
      <PresetButtons presets={[
        { name: "风险中性 (VWAP)", description: "λ=0", apply: () => setLam(0) },
        { name: "激进 (紧急清仓)", description: "λ=50", apply: () => setLam(50) },
        { name: "高冲击市场", description: "η=0.3", apply: () => setEta(0.3) },
        { name: "低波动", description: "σ=0.1", apply: () => setSigma(0.1) },
      ]}/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-3">
          <Slider label="X 总仓位 (股)" value={X} min={10000} max={500000} step={10000} onChange={setX} fmt={v=>(v/1000).toFixed(0)+"k"}/>
          <Slider label="T 时限 (日)" value={T} min={0.25} max={5} step={0.25} onChange={setT}/>
          <Slider label="N 划分步数" value={N} min={5} max={60} step={1} onChange={setN} fmt={v=>v.toFixed(0)}/>
          <Slider label="η 临时冲击" value={eta} min={0.01} max={0.5} step={0.01} onChange={setEta}/>
          <Slider label="γ 永久冲击" value={gamma} min={0} max={0.1} step={0.005} onChange={setGamma}/>
          <Slider label="σ 波动率" value={sigma} min={0.05} max={0.8} step={0.01} onChange={setSigma}/>
          <Slider label="λ 风险厌恶" value={lam} min={0} max={200} step={1} onChange={setLam} fmt={v=>v.toFixed(0)}/>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Stat label="κ" value={sol.kappa.toFixed(3)} color={C.red}/>
            <Stat label="E[成本]" value={sol.expectedCost.toFixed(0)} color={C.gold}/>
            <Stat label="σ[成本]" value={Math.sqrt(sol.variance).toFixed(0)} color={C.blue}/>
            <Stat label="Amihud ILLIQ (示例)" value={(amihud*1e9).toFixed(2)} color={C.text} sub="×10⁻⁹"/>
          </div>
        </div>
        <div className="lg:col-span-2 space-y-3">
          <div className="h-[220px]">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3"/>
                <XAxis dataKey="t" stroke={C.text} tick={{fontSize:10}} label={{value:"t", position:"insideBottom", offset:-5, fill:C.text, fontSize:10}}/>
                <YAxis stroke={C.text} tick={{fontSize:10}}/>
                <Tooltip contentStyle={tooltipStyle}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Line type="monotone" dataKey="optimal" name="最优 x_t" stroke={C.gold} strokeWidth={2.5} dot={false}/>
                <Line type="monotone" dataKey="vwap" name="线性 VWAP" stroke={C.blue} strokeWidth={1.5} strokeDasharray="4 3" dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <ScatterChart>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3"/>
                <XAxis type="number" dataKey="std" name="σ[成本]" stroke={C.text} tick={{fontSize:10}}
                  label={{value:"σ[成本]", position:"insideBottom", offset:-5, fill:C.text, fontSize:10}}/>
                <YAxis type="number" dataKey="cost" name="E[成本]" stroke={C.text} tick={{fontSize:10}}/>
                <Tooltip contentStyle={tooltipStyle}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Scatter name="有效前沿 (λ 扫描)" data={frontier} fill={C.gold} line={{ stroke: C.gold }} lineType="joint"/>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </ToolCard>
  );
}

/* ═══════════════════════ shared card shell ═══════════════════════ */
function ToolCard({ title, kicker, formula, children }: {
  title: string; kicker: string; formula: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/50 p-5 space-y-4">
      <div>
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold/80">{kicker}</p>
        <h3 className="text-lg font-serif text-foreground mt-0.5">{title}</h3>
        <p className="mt-2 text-[11px] font-mono text-muted-foreground bg-secondary/30 border border-border rounded px-3 py-2 inline-block">
          {formula}
        </p>
      </div>
      {children}
    </div>
  );
}
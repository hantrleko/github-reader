import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToolTab } from "@/lib/useToolTab";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, BarChart, Bar, AreaChart, Area,
} from "recharts";
import { C, Slider, Stat, tooltipStyle } from "@/components/frontier/ui";
import PresetButtons from "@/components/PresetButtons";
import {
  mertonCredit, cdsParSpread, bootstrapHazard,
  vasicekYield, cirYield, simulateShortRate,
  priceCallableBond, solveOAS, mbsCashflows,
  breakevenInflation, butterflyPnl,
} from "@/lib/quant/fixedIncome";

type Tab = "credit" | "rates" | "oas" | "curve";


const TAB_IDS: Tab[] = ["credit", "rates", "oas", "curve"];

export default function V45FixedIncomeLab() {
  const { t, i18n } = useTranslation();
const TABS: { id: Tab; title: string; titleEn: string; kicker: string; desc: string; descEn: string }[] = [
  { id: "credit", title: "信用债 & CDS", titleEn: "Credit & CDS", kicker: "Credit", desc: "Merton 结构化模型 + CDS par spread / hazard 反推" , descEn: "Merton structural model plus CDS par spread / hazard inversion" },
  { id: "rates", title: "短率模型", titleEn: "Short-Rate Models", kicker: "Rate Models", desc: "Vasicek / CIR / Hull-White 期限结构与路径模拟" , descEn: "Vasicek / CIR / Hull-White term structure and path simulation" },
  { id: "oas", title: "OAS & 含权债", titleEn: "OAS & Callable / MBS", kicker: "Callable/MBS", desc: "Ho-Lee 树上可赎回债 OAS + PSA 提前偿付 MBS" , descEn: "Callable-bond OAS on a Ho-Lee tree plus PSA prepayment MBS" },
  { id: "curve", title: "通胀与曲线策略", titleEn: "Inflation & Curve Strategies", kicker: "Inflation/Curve", desc: "Breakeven、2-5-10 蝶式、carry-roll 分解" , descEn: "Breakeven inflation, 2-5-10 butterfly, carry-roll decomposition" },
];
  const isEn = i18n.language?.startsWith("en");
  const [tab, setTab] = useToolTab<Tab>(TAB_IDS, "credit");
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-card/50 p-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-1">V4.5 · Fixed Income Lab</p>
        <h2 className="text-2xl font-serif text-foreground">{t("labs.fiLab.title")}</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">{t("labs.fiLab.intro")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {TABS.map((tabItem) => (
            <button
              key={tabItem.id}
              onClick={() => setTab(tabItem.id)}
              title={isEn ? tabItem.descEn : tabItem.desc}
              className={`px-3.5 py-2 rounded-lg border text-xs font-mono transition-colors ${
                tab === tabItem.id
                  ? "bg-gold/15 border-gold/60 text-gold"
                  : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="uppercase tracking-wider mr-2">{tabItem.kicker}</span>
              {isEn ? tabItem.titleEn : tabItem.title}
            </button>
          ))}
        </div>
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {tab === "credit" && <CreditPanel />}
        {tab === "rates" && <RatesPanel />}
        {tab === "oas" && <OasPanel />}
        {tab === "curve" && <CurvePanel />}
      </motion.div>

      <div className="rounded-lg border border-border bg-card/60 p-4 text-[11px] font-mono text-muted-foreground leading-relaxed">
        <p className="text-gold uppercase tracking-wider mb-2">{t("labs.nav.references")}</p>
        <p>Merton (1974) · Vasicek (1977) · Cox-Ingersoll-Ross (1985) · Hull &amp; White (1990) · Fabozzi (2012) Bond Markets, Analysis and Strategies.</p>
      </div>
    </section>
  );
}

/* ─── Panel 1: Credit / CDS ─── */
function CreditPanel() {
  const { t } = useTranslation();
  const [V, setV] = useState(120);
  const [D, setD] = useState(100);
  const [sig, setSig] = useState(0.25);
  const [r, setR] = useState(0.03);
  const [T, setT] = useState(1);
  const merton = useMemo(() => mertonCredit({ V, sigmaV: sig, D, r, T }), [V, D, sig, r, T]);

  const [lam, setLam] = useState(0.03);
  const [R, setRec] = useState(0.4);
  const [cdsT, setCdsT] = useState(5);
  const [sMkt, setSMkt] = useState(200); // bp
  const par = useMemo(() => cdsParSpread(lam, R, cdsT, r), [lam, R, cdsT, r]);
  const hazard = useMemo(() => bootstrapHazard(sMkt / 1e4, R, cdsT, r), [sMkt, R, cdsT, r]);

  // leverage sweep
  const sweep = useMemo(() => {
    const arr: { lev: number; spread: number; pd: number }[] = [];
    for (let k = 40; k <= 130; k += 5) {
      const m = mertonCredit({ V: 100, sigmaV: sig, D: k, r, T });
      arr.push({ lev: k, spread: +(m.spread * 1e4).toFixed(1), pd: +(m.PD * 100).toFixed(2) });
    }
    return arr;
  }, [sig, r, T]);

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "投资级", description: "低杠杆低波动", apply: () => { setV(150); setD(80); setSig(0.2); } },
        { name: "高收益", description: "接近资本结构临界", apply: () => { setV(110); setD(100); setSig(0.35); } },
        { name: "困境企业", description: "V<D 概率不小", apply: () => { setV(95); setD(100); setSig(0.45); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">Merton 结构化模型</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="资产价值 V" value={V} min={60} max={200} step={5} onChange={setV} />
            <Slider label="债务面值 D" value={D} min={40} max={150} step={5} onChange={setD} />
            <Slider label="资产波动 σᵥ" value={sig} min={0.05} max={0.6} step={0.01} onChange={setSig} fmt={(v)=>`${(v*100).toFixed(0)}%`} />
            <Slider label="无风险利率 r" value={r} min={0} max={0.1} step={0.005} onChange={setR} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label="到期 T (年)" value={T} min={0.25} max={10} step={0.25} onChange={setT} />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Stat label="股权 E" value={merton.equity.toFixed(2)} />
            <Stat label="风险债 B" value={merton.debt.toFixed(2)} color={C.teal} />
            <Stat label="违约概率 PD" value={`${(merton.PD * 100).toFixed(2)}%`} color={C.red} />
            <Stat label="信用利差" value={`${(merton.spread * 1e4).toFixed(1)} bp`} color={C.gold} />
            <Stat label="回收率 R" value={`${(merton.recovery * 100).toFixed(1)}%`} color={C.blue} sub="风险中性" />
            <Stat label="预期损失" value={`${(merton.expectedLoss * 100).toFixed(2)}%`} color={C.red} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <p className="text-xs font-mono text-gold uppercase tracking-wider mb-2">杠杆 → 信用利差</p>
          <div className="h-[240px]">
            <ResponsiveContainer>
              <LineChart data={sweep}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="lev" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "债务 D", position: "insideBottom", offset: -4, fill: C.text, fontSize: 10 }} />
                <YAxis yAxisId="l" stroke={C.gold} tick={{ fontSize: 10 }} label={{ value: "利差 (bp)", angle: -90, position: "insideLeft", fill: C.gold, fontSize: 10 }} />
                <YAxis yAxisId="r" orientation="right" stroke={C.red} tick={{ fontSize: 10 }} label={{ value: "PD (%)", angle: 90, position: "insideRight", fill: C.red, fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line yAxisId="l" type="monotone" dataKey="spread" stroke={C.gold} strokeWidth={2} dot={false} name="Spread bp" />
                <Line yAxisId="r" type="monotone" dataKey="pd" stroke={C.red} strokeWidth={2} dot={false} name="PD %" />
                <ReferenceLine yAxisId="l" x={D} stroke={C.text} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground mt-2">虚线为当前 D。杠杆升高时利差呈凸性上升。</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <p className="text-xs font-mono text-gold uppercase tracking-wider mb-3">CDS 定价 & Hazard 反推</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="grid grid-cols-2 gap-3">
            <Slider label="Hazard λ" value={lam} min={0.001} max={0.15} step={0.001} onChange={setLam} fmt={(v)=>`${(v*100).toFixed(2)}%`} />
            <Slider label="回收率 R" value={R} min={0} max={0.9} step={0.05} onChange={setRec} fmt={(v)=>`${(v*100).toFixed(0)}%`} />
            <Slider label="期限 (年)" value={cdsT} min={1} max={10} step={1} onChange={setCdsT} />
            <Slider label="市场 spread (bp)" value={sMkt} min={20} max={1500} step={10} onChange={setSMkt} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="正向: par spread" value={`${(par * 1e4).toFixed(1)} bp`} color={C.gold} sub={`λ=${(lam*100).toFixed(2)}% → s`} />
            <Stat label="反向: 隐含 hazard" value={`${(hazard * 100).toFixed(2)}%`} color={C.teal} sub={`${sMkt} bp → λ`} />
            <Stat label="近似 λ(1−R)" value={`${(lam * (1 - R) * 1e4).toFixed(1)} bp`} color={C.blue} />
            <Stat label="5Y 累积 PD" value={`${((1 - Math.exp(-hazard * 5)) * 100).toFixed(1)}%`} color={C.red} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Panel 2: Rate models ─── */
function RatesPanel() {
  const { t } = useTranslation();
  const [model, setModel] = useState<"vasicek" | "cir">("vasicek");
  const [kappa, setKappa] = useState(0.3);
  const [theta, setTheta] = useState(0.04);
  const [sigma, setSigma] = useState(0.015);
  const [r0, setR0] = useState(0.03);
  const [seed, setSeed] = useState(7);

  const curve = useMemo(() => {
    const p = { kappa, theta, sigma, r0 };
    const taus = [0.25, 0.5, 1, 2, 3, 5, 7, 10, 15, 20, 30];
    return taus.map((tau) => ({
      tau,
      vasicek: +(vasicekYield(tau, p) * 100).toFixed(3),
      cir: +(cirYield(tau, p) * 100).toFixed(3),
    }));
  }, [kappa, theta, sigma, r0]);

  const paths = useMemo(() => {
    const raw = simulateShortRate(model, { kappa, theta, sigma, r0 }, 5, 260, 30, seed);
    // shape into recharts rows
    return Array.from({ length: raw[0].length }, (_, i) => {
      const row: Record<string, number> = { t: +((i / (raw[0].length - 1)) * 5).toFixed(3) };
      raw.forEach((p, k) => { row[`p${k}`] = +(p[i] * 100).toFixed(3); });
      return row;
    });
  }, [model, kappa, theta, sigma, r0, seed]);

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: "均值回复温和", description: "κ=0.3, θ=4%", apply: () => { setKappa(0.3); setTheta(0.04); setSigma(0.015); setR0(0.03); } },
        { name: "强回复高波动", description: "κ=1.2, σ=3%", apply: () => { setKappa(1.2); setTheta(0.045); setSigma(0.03); } },
        { name: "近零利率", description: "r0=0.5%", apply: () => { setR0(0.005); setTheta(0.02); setKappa(0.5); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["vasicek", "cir"] as const).map((m) => (
              <button key={m} onClick={() => setModel(m)}
                className={`px-3 py-1.5 rounded text-[11px] font-mono uppercase tracking-wider border ${
                  model === m ? "bg-gold/15 border-gold/60 text-gold" : "border-border text-muted-foreground"
                }`}>{m}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="均值回复 κ" value={kappa} min={0.05} max={2} step={0.05} onChange={setKappa} />
            <Slider label="长期均值 θ" value={theta} min={0} max={0.1} step={0.005} onChange={setTheta} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label="波动 σ" value={sigma} min={0.002} max={0.05} step={0.001} onChange={setSigma} fmt={(v)=>`${(v*100).toFixed(2)}%`} />
            <Slider label="初始利率 r₀" value={r0} min={0} max={0.1} step={0.005} onChange={setR0} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label="随机种子" value={seed} min={1} max={99} step={1} onChange={setSeed} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="10Y Vasicek" value={`${(vasicekYield(10, {kappa,theta,sigma,r0})*100).toFixed(2)}%`} color={C.gold} />
            <Stat label="10Y CIR" value={`${(cirYield(10, {kappa,theta,sigma,r0})*100).toFixed(2)}%`} color={C.teal} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <p className="text-xs font-mono text-gold uppercase tracking-wider mb-2">闭式期限结构</p>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <LineChart data={curve}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="tau" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "τ (年)", position:"insideBottom", offset:-4, fill:C.text, fontSize:10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "y (%)", angle:-90, position:"insideLeft", fill:C.text, fontSize:10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="vasicek" stroke={C.gold} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cir" stroke={C.teal} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <p className="text-xs font-mono text-gold uppercase tracking-wider mb-2">短率路径模拟（{model}, 30 条 · 5Y）</p>
        <div className="h-[260px]">
          <ResponsiveContainer>
            <LineChart data={paths}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "年", position:"insideBottom", offset:-4, fill:C.text, fontSize:10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "r (%)", angle:-90, position:"insideLeft", fill:C.text, fontSize:10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={theta * 100} stroke={C.gold} strokeDasharray="4 4" label={{ value: "θ", fill: C.gold, fontSize: 10 }} />
              {Array.from({ length: 30 }, (_, k) => (
                <Line key={k} type="monotone" dataKey={`p${k}`} stroke={C.blue} strokeOpacity={0.35} strokeWidth={1} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground mt-2">CIR 保证 r≥0，Vasicek 允许负利率；两者均围绕 θ 均值回复。</p>
      </div>
    </div>
  );
}

/* ─── Panel 3: OAS & MBS ─── */
function OasPanel() {
  const { t } = useTranslation();
  const [coupon, setCoupon] = useState(0.06);
  const [years, setYears] = useState(5);
  const [rateVol, setRateVol] = useState(0.012);
  const [r0, setR0] = useState(0.04);
  const [callK, setCallK] = useState(100);
  const [callFrom, setCallFrom] = useState(2);
  const [mktPrice, setMktPrice] = useState(102);

  const bond = { face: 100, coupon, years, freq: 2, rateVol, r0, callPrice: callK, callFromYear: callFrom };
  const modelPrice = useMemo(() => priceCallableBond(bond, 0), [coupon, years, rateVol, r0, callK, callFrom]);
  const straight = useMemo(() => priceCallableBond({ ...bond, callFromYear: years + 1 }, 0), [coupon, years, rateVol, r0, callK]);
  const oas = useMemo(() => solveOAS(bond, mktPrice), [coupon, years, rateVol, r0, callK, callFrom, mktPrice]);

  // MBS
  const [wac, setWac] = useState(0.06);
  const [psa, setPsa] = useState(100);
  const [wam, setWam] = useState(360);
  const [disc, setDisc] = useState(0.055);
  const mbs = useMemo(() => mbsCashflows({ balance: 100_000, wac, wam, psa, discountRate: disc }), [wac, wam, psa, disc]);
  const mbsChart = useMemo(() => mbs.months.filter((_, i) => i % 6 === 0).map((m, k) => {
    const i = k * 6;
    return { m, interest: +mbs.interest[i].toFixed(1), scheduled: +mbs.principal[i].toFixed(1), prepay: +mbs.prepay[i].toFixed(1), balance: +mbs.balance[i].toFixed(0) };
  }), [mbs]);

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: t("labs.bond.v45.text53", { defaultValue: "利率下行 OAS 收窄" }), description: t("labs.bond.v45.text54", { defaultValue: "低 r0 高 vol" }), apply: () => { setR0(0.025); setRateVol(0.018); setMktPrice(105); } },
        { name: t("labs.bond.v45.text55", { defaultValue: "深度价内" }), description: t("labs.bond.v45.text56", { defaultValue: "callK 低于市价" }), apply: () => { setCallK(98); setMktPrice(101); } },
        { name: "Fast PSA MBS", description: "300% PSA", apply: () => { setPsa(300); setWac(0.065); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.bond.v45.text57", { defaultValue: "可赎回债 · Ho-Lee 树" })}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.bond.v45.text58", { defaultValue: "票息 c" })} value={coupon} min={0.01} max={0.12} step={0.005} onChange={setCoupon} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label={t("labs.bond.v45.text20", { defaultValue: "到期 T (年)" })} value={years} min={2} max={15} step={1} onChange={setYears} />
            <Slider label={t("labs.bond.v45.text59", { defaultValue: "利率波动 σ" })} value={rateVol} min={0.002} max={0.04} step={0.001} onChange={setRateVol} fmt={(v)=>`${(v*100).toFixed(2)}%`} />
            <Slider label={t("labs.bond.v45.text60", { defaultValue: "短率 r₀" })} value={r0} min={0.005} max={0.1} step={0.005} onChange={setR0} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label={t("labs.bond.v45.text61", { defaultValue: "Call 价 K" })} value={callK} min={95} max={110} step={0.5} onChange={setCallK} />
            <Slider label="Callable after (yr)" value={callFrom} min={1} max={Math.max(1, years - 1)} step={1} onChange={setCallFrom} />
            <Slider label={t("labs.bond.v45.text62", { defaultValue: "市场价" })} value={mktPrice} min={80} max={125} step={0.5} onChange={setMktPrice} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.bond.v45.text63", { defaultValue: "含权模型价" })} value={modelPrice.toFixed(3)} color={C.gold} />
            <Stat label={t("labs.bond.v45.text64", { defaultValue: "等价直债" })} value={straight.toFixed(3)} color={C.teal} />
            <Stat label={t("labs.bond.v45.text65", { defaultValue: "嵌入期权价值" })} value={(straight - modelPrice).toFixed(3)} color={C.red} sub={t("labs.bond.v45.text66", { defaultValue: "发行人 call" })} />
            <Stat label="OAS" value={`${(oas * 1e4).toFixed(1)} bp`} color={C.blue} sub={t("labs.bond.v45.text67", { defaultValue: "市场价 → 模型" })} />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.bond.v45.text68", { defaultValue: "MBS · PSA 提前偿付" })}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="WAC" value={wac} min={0.03} max={0.1} step={0.005} onChange={setWac} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
            <Slider label={t("labs.bond.v45.text69", { defaultValue: "WAM (月)" })} value={wam} min={60} max={360} step={12} onChange={setWam} />
            <Slider label="PSA (%)" value={psa} min={0} max={500} step={25} onChange={setPsa} />
            <Slider label={t("labs.bond.v45.text70", { defaultValue: "贴现率" })} value={disc} min={0.02} max={0.1} step={0.005} onChange={setDisc} fmt={(v)=>`${(v*100).toFixed(1)}%`} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.bond.v45.text71", { defaultValue: "MBS 价格" })} value={mbs.price.toFixed(0)} color={C.gold} sub={t("labs.bond.v45.text72", { defaultValue: "面值 100,000" })} />
            <Stat label={t("labs.bond.v45.text73", { defaultValue: "加权平均寿命" })} value={`${mbs.wal.toFixed(2)}y`} color={C.teal} />
          </div>
          <div className="rounded-xl border border-border bg-secondary/20 p-3 h-[220px]">
            <ResponsiveContainer>
              <BarChart data={mbsChart} stackOffset="sign">
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="m" stroke={C.text} tick={{ fontSize: 9 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Bar dataKey="interest" stackId="a" fill={C.gold} name={t("labs.bond.v45.text74", { defaultValue: "利息" })} />
                <Bar dataKey="scheduled" stackId="a" fill={C.teal} name={t("labs.bond.v45.text75", { defaultValue: "计划本金" })} />
                <Bar dataKey="prepay" stackId="a" fill={C.red} name={t("labs.bond.v45.text76", { defaultValue: "提前偿付" })} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Panel 4: Inflation & curve strategies ─── */
function CurvePanel() {
  const { t } = useTranslation();
  const [yN, setYN] = useState(0.045);
  const [yR, setYR] = useState(0.02);
  const cpiExp = breakevenInflation(yN, yR);

  const [y2, setY2] = useState(0.041);
  const [y5, setY5] = useState(0.043);
  const [y10, setY10] = useState(0.045);
  const [d2, setD2] = useState(1.9);
  const [d5, setD5] = useState(4.5);
  const [d10, setD10] = useState(8.0);
  const [s2, setS2] = useState(-10);
  const [s5, setS5] = useState(0);
  const [s10, setS10] = useState(-10);
  const bf = useMemo(() => butterflyPnl({ y2, y5, y10, d2, d5, d10, shift2: s2/1e4, shift5: s5/1e4, shift10: s10/1e4 }), [y2, y5, y10, d2, d5, d10, s2, s5, s10]);

  // scenario table
  const scenarios = [
    { name: t("labs.bond.v45.text77", { defaultValue: "平行 −25bp" }), s2: -25, s5: -25, s10: -25 },
    { name: t("labs.bond.v45.text78", { defaultValue: "陡峭化 (bear steep)" }), s2: 0, s5: 10, s10: 25 },
    { name: t("labs.bond.v45.text79", { defaultValue: "平坦化 (bull flat)" }), s2: 0, s5: -10, s10: -25 },
    { name: t("labs.bond.v45.text80", { defaultValue: "凸性走弱 (belly卖)" }), s2: -10, s5: 15, s10: -10 },
    { name: t("labs.bond.v45.text81", { defaultValue: "凸性走强 (belly涨)" }), s2: 10, s5: -15, s10: 10 },
  ].map((sc) => ({
    name: sc.name,
    pnl: +(butterflyPnl({ y2, y5, y10, d2, d5, d10, shift2: sc.s2/1e4, shift5: sc.s5/1e4, shift10: sc.s10/1e4 }).net * 1e4).toFixed(2),
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">TIPS Breakeven Inflation</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.bond.v45.text82", { defaultValue: "名义 10Y" })} value={yN} min={0} max={0.08} step={0.001} onChange={setYN} fmt={(v)=>`${(v*100).toFixed(2)}%`} />
            <Slider label={t("labs.bond.v45.text83", { defaultValue: "真实 10Y (TIPS)" })} value={yR} min={-0.02} max={0.05} step={0.001} onChange={setYR} fmt={(v)=>`${(v*100).toFixed(2)}%`} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.bond.v45.text84", { defaultValue: "Breakeven 通胀" })} value={`${(cpiExp * 100).toFixed(2)}%`} color={C.gold} sub={t("labs.bond.v45.text85", { defaultValue: "市场隐含通胀" })} />
            <Stat label={t("labs.bond.v45.text86", { defaultValue: "风险溢价近似" })} value={`${((cpiExp - 0.02) * 100).toFixed(2)}%`} color={C.teal} sub={t("labs.bond.v45.text87", { defaultValue: "vs 2% 目标" })} />
          </div>
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
            <span className="text-gold">Breakeven = y_nominal − y_real</span>{t("labs.bond.v45.text88", { defaultValue: "：市场对未来平均通胀的定价。当央行政策紧缩预期升温时通常回落。" })}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.bond.v45.text89", { defaultValue: "2-5-10 Butterfly (PV01 中性)" })}</p>
          <div className="grid grid-cols-3 gap-3">
            <Slider label="2Y y" value={y2} min={0} max={0.08} step={0.001} onChange={setY2} fmt={(v)=>`${(v*100).toFixed(2)}%`} />
            <Slider label="5Y y" value={y5} min={0} max={0.08} step={0.001} onChange={setY5} fmt={(v)=>`${(v*100).toFixed(2)}%`} />
            <Slider label="10Y y" value={y10} min={0} max={0.08} step={0.001} onChange={setY10} fmt={(v)=>`${(v*100).toFixed(2)}%`} />
            <Slider label="D₂" value={d2} min={1} max={3} step={0.1} onChange={setD2} />
            <Slider label="D₅" value={d5} min={3} max={6} step={0.1} onChange={setD5} />
            <Slider label="D₁₀" value={d10} min={6} max={10} step={0.1} onChange={setD10} />
            <Slider label="Δy 2Y (bp)" value={s2} min={-50} max={50} step={1} onChange={setS2} />
            <Slider label="Δy 5Y (bp)" value={s5} min={-50} max={50} step={1} onChange={setS5} />
            <Slider label="Δy 10Y (bp)" value={s10} min={-50} max={50} step={1} onChange={setS10} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="wing w₂" value={bf.w2.toFixed(3)} color={C.blue} />
            <Stat label="wing w₁₀" value={bf.w10.toFixed(3)} color={C.blue} />
            <Stat label={t("labs.bond.v45.text90", { defaultValue: "净 P&L (bp)" })} value={(bf.net * 1e4).toFixed(2)} color={bf.net >= 0 ? C.gold : C.red} sub={t("labs.bond.v45.text91", { defaultValue: "策略持有" })} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <p className="text-xs font-mono text-gold uppercase tracking-wider mb-3">{t("labs.bond.v45.text92", { defaultValue: "曲线情景 P&L (bp per unit notional)" })}</p>
        <div className="h-[220px]">
          <ResponsiveContainer>
            <BarChart data={scenarios} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis type="number" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} width={100} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine x={0} stroke={C.text} />
              <Bar dataKey="pnl" fill={C.gold} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground mt-2">
          {t("labs.bond.v45.text93", { defaultValue: "Butterfly 押注曲线凸性变化——belly 相对 wings 的相对定价。平行位移下 P&L 接近零。" })}
        </p>
      </div>
    </div>
  );
}
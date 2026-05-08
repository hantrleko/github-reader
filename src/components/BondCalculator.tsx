import { useState, useMemo, useRef, useCallback } from "react";
import { ShareExportToolbar, useSharedState } from "@/lib/calculatorTools";
import PresetButtons, { Preset } from "./PresetButtons";
import { FormulaCodeView } from "./common/FormulaCodeView";
import { HistoryDrawer } from "./common/HistoryDrawer";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import "katex/dist/katex.min.css";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { EquationBlock } from "@/components/common/EquationBlock";
import { RatesTermStructure } from "./bond/RatesTermStructure";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

type TabId = "pricing" | "duration" | "curve" | "termstruct";

// ─── Bond Pricing ───
function bondPrice(face: number, coupon: number, ytm: number, n: number, freq: number) {
  const c = (coupon / 100) * face / freq;
  const y = ytm / 100 / freq;
  const periods = n * freq;
  if (Math.abs(y) < 1e-10) return c * periods + face;
  let pv = 0;
  for (let i = 1; i <= periods; i++) {
    pv += c / Math.pow(1 + y, i);
  }
  pv += face / Math.pow(1 + y, periods);
  return pv;
}

function macaulayDuration(face: number, coupon: number, ytm: number, n: number, freq: number) {
  const c = (coupon / 100) * face / freq;
  const y = ytm / 100 / freq;
  const periods = n * freq;
  const price = bondPrice(face, coupon, ytm, n, freq);
  let wSum = 0;
  for (let i = 1; i <= periods; i++) {
    const t = i / freq;
    wSum += t * c / Math.pow(1 + y, i);
  }
  wSum += (periods / freq) * face / Math.pow(1 + y, periods);
  return wSum / price;
}

function modifiedDuration(face: number, coupon: number, ytm: number, n: number, freq: number) {
  const dMac = macaulayDuration(face, coupon, ytm, n, freq);
  return dMac / (1 + ytm / 100 / freq);
}

function convexity(face: number, coupon: number, ytm: number, n: number, freq: number) {
  const c = (coupon / 100) * face / freq;
  const y = ytm / 100 / freq;
  const periods = n * freq;
  const price = bondPrice(face, coupon, ytm, n, freq);
  let sum = 0;
  for (let i = 1; i <= periods; i++) {
    const t = i / freq;
    sum += t * (t + 1 / freq) * c / Math.pow(1 + y, i);
  }
  sum += (periods / freq) * (periods / freq + 1 / freq) * face / Math.pow(1 + y, periods);
  return sum / (price * Math.pow(1 + y / 1, 2)) ;
  // Simplified: convexity in years²
}

// Nelson-Siegel yield curve
function nelsonSiegel(tau: number, b0: number, b1: number, b2: number, lambda: number) {
  if (tau <= 0) return b0 + b1;
  const x = tau / lambda;
  const expX = Math.exp(-x);
  const factor1 = (1 - expX) / x;
  const factor2 = factor1 - expX;
  return b0 + b1 * factor1 + b2 * factor2;
}

// Price-yield data for chart
function priceYieldData(face: number, coupon: number, n: number, freq: number, currentYtm: number) {
  const data: { ytm: number; price: number; duration_approx: number }[] = [];
  const minY = Math.max(0.1, currentYtm - 5);
  const maxY = currentYtm + 5;
  for (let i = 0; i <= 80; i++) {
    const y = minY + (maxY - minY) * i / 80;
    const p = bondPrice(face, coupon, y, n, freq);
    // Duration-based linear approximation from current point
    const pCurrent = bondPrice(face, coupon, currentYtm, n, freq);
    const dMod = modifiedDuration(face, coupon, currentYtm, n, freq);
    const approx = pCurrent * (1 - dMod * (y - currentYtm) / 100);
    data.push({
      ytm: parseFloat(y.toFixed(2)),
      price: parseFloat(p.toFixed(2)),
      duration_approx: parseFloat(approx.toFixed(2)),
    });
  }
  return data;
}

// Duration/Convexity across maturities
function durationByMaturity(face: number, coupon: number, ytm: number, freq: number) {
  const data: { maturity: number; macDur: number; modDur: number; convex: number }[] = [];
  for (let n = 1; n <= 30; n++) {
    data.push({
      maturity: n,
      macDur: parseFloat(macaulayDuration(face, coupon, ytm, n, freq).toFixed(3)),
      modDur: parseFloat(modifiedDuration(face, coupon, ytm, n, freq).toFixed(3)),
      convex: parseFloat(convexity(face, coupon, ytm, n, freq).toFixed(2)),
    });
  }
  return data;
}

// Cash flow waterfall
function cashFlowData(face: number, coupon: number, ytm: number, n: number, freq: number) {
  const c = (coupon / 100) * face / freq;
  const y = ytm / 100 / freq;
  const periods = n * freq;
  const data: { period: string; cashflow: number; pv: number }[] = [];
  for (let i = 1; i <= periods; i++) {
    const cf = i === periods ? c + face : c;
    data.push({
      period: `${(i / freq).toFixed(1)}`,
      cashflow: parseFloat(cf.toFixed(2)),
      pv: parseFloat((cf / Math.pow(1 + y, i)).toFixed(2)),
    });
  }
  return data;
}

const BondCalculator = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabId>("pricing");

  // Bond params
  const [face, setFace] = useState(100);
  const [couponRate, setCouponRate] = useState(5);
  const [ytm, setYtm] = useState(4);
  const [maturity, setMaturity] = useState(10);
  const [freq, setFreq] = useState(2); // semi-annual

  // NS params
  const [b0, setB0] = useState(4.5);
  const [b1, setB1] = useState(-2.0);
  const [b2, setB2] = useState(1.5);
  const [lambda, setLambda] = useState(1.8);

  const captureRef = useRef<HTMLDivElement>(null);
  const apply = useCallback((s: any) => {
    if (s.tab) setTab(s.tab);
    if (s.face != null) setFace(s.face);
    if (s.couponRate != null) setCouponRate(s.couponRate);
    if (s.ytm != null) setYtm(s.ytm);
    if (s.maturity != null) setMaturity(s.maturity);
    if (s.freq != null) setFreq(s.freq);
    if (s.b0 != null) setB0(s.b0);
    if (s.b1 != null) setB1(s.b1);
    if (s.b2 != null) setB2(s.b2);
    if (s.lambda != null) setLambda(s.lambda);
  }, []);
  useSharedState("bond", apply);

  // Computed bond metrics
  const metrics = useMemo(() => {
    const price = bondPrice(face, couponRate, ytm, maturity, freq);
    const dMac = macaulayDuration(face, couponRate, ytm, maturity, freq);
    const dMod = modifiedDuration(face, couponRate, ytm, maturity, freq);
    const conv = convexity(face, couponRate, ytm, maturity, freq);
    const dv01 = dMod * price * 0.0001;
    const accruedInterest = 0; // simplified
    const currentYield = (couponRate / 100 * face) / price * 100;
    return { price, dMac, dMod, conv, dv01, currentYield };
  }, [face, couponRate, ytm, maturity, freq]);

  const pyData = useMemo(() => priceYieldData(face, couponRate, maturity, freq, ytm), [face, couponRate, maturity, freq, ytm]);
  const durData = useMemo(() => durationByMaturity(face, couponRate, ytm, freq), [face, couponRate, ytm, freq]);
  const cfData = useMemo(() => cashFlowData(face, couponRate, ytm, maturity, freq), [face, couponRate, ytm, maturity, freq]);

  // Nelson-Siegel curve data
  const nsData = useMemo(() => {
    const data: { tau: number; yield: number; forward: number }[] = [];
    for (let i = 1; i <= 60; i++) {
      const tau = i * 0.5;
      const y = nelsonSiegel(tau, b0, b1, b2, lambda);
      // Instantaneous forward rate approximation
      const dt = 0.01;
      const yPlus = nelsonSiegel(tau + dt, b0, b1, b2, lambda);
      const f = y + tau * (yPlus - y) / dt;
      data.push({
        tau,
        yield: parseFloat(y.toFixed(3)),
        forward: parseFloat(f.toFixed(3)),
      });
    }
    return data;
  }, [b0, b1, b2, lambda]);

  const tabs: { id: TabId; name: string; nameEn: string; formula: string }[] = [
    { id: "pricing", name: "债券定价", nameEn: "Bond Pricing — Discounted Cash Flow",
      formula: String.raw`P = \sum_{i=1}^{n}\frac{C}{(1+y)^{i}} + \frac{F}{(1+y)^{n}}` },
    { id: "duration", name: "久期 & 凸性", nameEn: "Modified Duration & Convexity",
      formula: String.raw`D_{\mathrm{mod}} = \dfrac{D_{\mathrm{Mac}}}{1+y},\quad \dfrac{\Delta P}{P} \approx -D_{\mathrm{mod}}\,\Delta y + \tfrac{1}{2}\,\mathrm{Conv}\,(\Delta y)^2` },
    { id: "curve", name: "收益率曲线", nameEn: "Nelson-Siegel Yield Curve",
      formula: String.raw`y(\tau) = \beta_0 + \beta_1\,\dfrac{1-e^{-\tau/\lambda}}{\tau/\lambda} + \beta_2\,\Bigl[\dfrac{1-e^{-\tau/\lambda}}{\tau/\lambda} - e^{-\tau/\lambda}\Bigr]` },
    { id: "termstruct", name: "Hull-White & Bootstrapping", nameEn: "Term Structure — Bootstrapping & Hull-White (1990)",
      formula: String.raw`\text{Bootstrap: }P(0,T_i)=\dfrac{1-c\sum_{j<i}P(0,T_j)}{1+c}\quad\Big|\quad \text{HW: }dr_t=(\theta(t)-a\,r_t)\,dt+\sigma\,dW_t` },
  ];

  const sliderClass = "w-full h-1.5 rounded-full appearance-none cursor-pointer bg-secondary accent-gold [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:shadow-md";

  const renderSlider = (label: string, shortLabel: string, unit: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void) => (
    <div key={label}>
      <div className="flex justify-between items-baseline mb-2">
        <label className="text-sm text-secondary-foreground font-medium">{label}</label>
        <span className="text-sm font-mono text-gold">{value}{unit && ` ${unit}`}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className={sliderClass} />
      <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );

  return (
    <section className="py-24 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/20 to-transparent pointer-events-none" />
      <div className="container relative z-10 max-w-5xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold mb-3">
            {t("sections.bond.tag")}
          </p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
            {t("sections.bond.title")}
          </h2>
        </motion.div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 rounded-lg text-sm font-mono transition-all duration-300 ${
                tab === t.id
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        <motion.div
          key={tab}
          ref={captureRef}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl border border-border bg-card p-8 md:p-10 glow-gold"
        >
          <div className="flex justify-end mb-4">
            <div className="flex flex-wrap gap-2">
              <HistoryDrawer
                storageKey="bond"
                currentState={{ tab, face, couponRate, ytm, maturity, freq, b0, b1, b2, lambda }}
                onApply={(s: any) => {
                  if (s.face !== undefined) setFace(s.face);
                  if (s.couponRate !== undefined) setCouponRate(s.couponRate);
                  if (s.ytm !== undefined) setYtm(s.ytm);
                  if (s.maturity !== undefined) setMaturity(s.maturity);
                  if (s.freq !== undefined) setFreq(s.freq);
                  if (s.b0 !== undefined) setB0(s.b0);
                  if (s.b1 !== undefined) setB1(s.b1);
                  if (s.b2 !== undefined) setB2(s.b2);
                  if (s.lambda !== undefined) setLambda(s.lambda);
                }}
                summarize={(s: any) =>
                  `F=${s.face} c=${s.couponRate}% y=${s.ytm}% T=${s.maturity}y`
                }
              />
              <ShareExportToolbar
                storageKey="bond"
                anchorId="bond"
                state={{ tab, face, couponRate, ytm, maturity, freq, b0, b1, b2, lambda }}
                captureRef={captureRef}
                filename={`bond-${tab}`}
              />
            </div>
          </div>
          {/* Formula bar */}
          <div className="text-center mb-8 py-5 px-6 rounded-xl bg-gradient-to-br from-secondary/60 to-secondary/30 border border-gold/20 shadow-inner">
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold/80 mb-2">
              {tabs.find((t) => t.id === tab)!.nameEn}
            </p>
            <div className="text-foreground katex-display-gold">
              <EquationBlock math={tabs.find((t) => t.id === tab)!.formula} />
            </div>
          </div>

          {/* ═══ PRICING TAB ═══ */}
          {tab === "pricing" && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="space-y-5">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">债券参数</p>
                  <PresetButtons presets={[
                    { name: "国债标准", description: "F=100, c=3%, YTM=4%, 10Y半年付", apply: () => { setFace(100); setCouponRate(3); setYtm(4); setMaturity(10); setFreq(2); } },
                    { name: "高收益债", description: "F=100, c=8%, YTM=6%, 5Y", apply: () => { setFace(100); setCouponRate(8); setYtm(6); setMaturity(5); setFreq(2); } },
                    { name: "零息债券", description: "F=100, c=0%, YTM=5%, 20Y", apply: () => { setFace(100); setCouponRate(0); setYtm(5); setMaturity(20); setFreq(1); } },
                    { name: "溢价债券", description: "F=100, c=7%, YTM=4%, 15Y", apply: () => { setFace(100); setCouponRate(7); setYtm(4); setMaturity(15); setFreq(2); } },
                  ]} />
                  {renderSlider("面值 F", "F", "", face, 100, 10000, 100, setFace)}
                  {renderSlider("票面利率", "c", "%", couponRate, 0, 15, 0.1, setCouponRate)}
                  {renderSlider("到期收益率 YTM", "y", "%", ytm, 0.1, 20, 0.1, setYtm)}
                  {renderSlider("到期期限", "T", "年", maturity, 1, 30, 1, setMaturity)}
                  <div>
                    <label className="text-sm text-secondary-foreground font-medium mb-2 block">付息频率</label>
                    <div className="flex gap-2">
                      {[{ v: 1, l: "年付" }, { v: 2, l: "半年付" }, { v: 4, l: "季付" }].map((f) => (
                        <button
                          key={f.v}
                          onClick={() => setFreq(f.v)}
                          className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all ${
                            freq === f.v ? "bg-gold/20 text-gold border border-gold/30" : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {f.l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Price-Yield chart */}
                <div>
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                    价格-收益率关系
                  </p>
                  <div className="rounded-xl bg-secondary/30 border border-border p-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={pyData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                        <XAxis dataKey="ytm" stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
                          label={{ value: "YTM (%)", position: "insideBottom", offset: -2, style: { fontSize: 11, fill: CHART_TEXT, fontFamily: "var(--font-mono)" } }}
                        />
                        <YAxis stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} width={50}
                          label={{ value: "价格", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 11, fill: CHART_TEXT, fontFamily: "var(--font-mono)" } }}
                        />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-mono)" }} />
                        <ReferenceLine x={ytm} stroke={CHART_GOLD} strokeDasharray="4 4" strokeOpacity={0.5} />
                        <ReferenceLine y={face} stroke={CHART_TEXT} strokeDasharray="2 4" strokeOpacity={0.3} />
                        <Line type="monotone" dataKey="price" name="实际价格" stroke={CHART_GOLD} strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="duration_approx" name="久期近似" stroke={CHART_TEAL} strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                        <Legend wrapperStyle={{ fontSize: 10, fontFamily: "var(--font-mono)" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono mt-2 text-center">
                    金色 = 真实凸曲线 · 青色虚线 = 久期线性近似 · 差距 = 凸性效应
                  </p>
                </div>
              </div>

              {/* Metrics cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                {[
                  { label: "债券价格", value: metrics.price.toFixed(2), color: "text-gold", border: "border-gold/20", bg: "bg-gold/[0.03]" },
                  { label: "Macaulay 久期", value: `${metrics.dMac.toFixed(3)} 年`, color: "text-teal-400", border: "border-teal-400/20", bg: "bg-teal-400/[0.03]" },
                  { label: "修正久期", value: metrics.dMod.toFixed(3), color: "text-blue-400", border: "border-blue-400/20", bg: "bg-blue-400/[0.03]" },
                  { label: "凸性", value: metrics.conv.toFixed(2), color: "text-purple-400", border: "border-purple-400/20", bg: "bg-purple-400/[0.03]" },
                  { label: "DV01", value: metrics.dv01.toFixed(4), color: "text-red-400", border: "border-red-400/20", bg: "bg-red-400/[0.03]" },
                  { label: "当前收益率", value: `${metrics.currentYield.toFixed(2)}%`, color: "text-emerald-400", border: "border-emerald-400/20", bg: "bg-emerald-400/[0.03]" },
                ].map((m) => (
                  <div key={m.label} className={`rounded-xl border ${m.border} ${m.bg} p-4 text-center`}>
                    <p className={`text-[10px] font-mono ${m.color} mb-1 uppercase tracking-wider`}>{m.label}</p>
                    <p className="text-base font-mono font-bold text-foreground">{m.value}</p>
                  </div>
                ))}
              </div>

              {/* 公式 / Python / 结果 三联视图 */}
              <div className="mb-8">
                <FormulaCodeView
                  title="DCF Bond Pricing"
                  formula={String.raw`P = \sum_{i=1}^{n}\frac{C}{(1+y/m)^{i}} + \frac{F}{(1+y/m)^{n}}`}
                  python={`import numpy as np

def bond_price(face, coupon_rate, ytm, n_years, freq=2):
    """Plain-vanilla coupon bond price via DCF."""
    c = coupon_rate / 100 * face / freq
    y = ytm / 100 / freq
    periods = n_years * freq
    t = np.arange(1, periods + 1)
    pv_coupons = np.sum(c / (1 + y) ** t)
    pv_face    = face / (1 + y) ** periods
    return pv_coupons + pv_face

price = bond_price(face=${face}, coupon_rate=${couponRate},
                   ytm=${ytm}, n_years=${maturity}, freq=${freq})
# => ${metrics.price.toFixed(2)}`}
                  result={
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="rounded-md border border-gold/20 bg-gold/5 p-3">
                        <div className="text-[10px] uppercase tracking-wider text-gold/80">价格 P</div>
                        <div className="text-base text-gold font-bold">{metrics.price.toFixed(4)}</div>
                      </div>
                      <div className="rounded-md border border-border bg-card/50 p-3">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">修正久期</div>
                        <div className="text-base text-foreground font-bold">{metrics.dMod.toFixed(4)}</div>
                      </div>
                      <div className="rounded-md border border-border bg-card/50 p-3">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">DV01</div>
                        <div className="text-base text-foreground font-bold">{metrics.dv01.toFixed(4)}</div>
                      </div>
                    </div>
                  }
                />
              </div>

              {/* Cash flow waterfall */}
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                  现金流与现值分解
                </p>
                <div className="rounded-xl bg-secondary/30 border border-border p-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={cfData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      <XAxis dataKey="period" stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
                        label={{ value: "年", position: "insideBottom", offset: -2, style: { fontSize: 10, fill: CHART_TEXT, fontFamily: "var(--font-mono)" } }}
                      />
                      <YAxis stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} width={45} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-mono)" }} />
                      <Bar dataKey="cashflow" name="现金流" fill={CHART_GOLD} fillOpacity={0.3} stroke={CHART_GOLD} strokeWidth={1} />
                      <Bar dataKey="pv" name="现值" fill={CHART_TEAL} fillOpacity={0.6} />
                      <Legend wrapperStyle={{ fontSize: 10, fontFamily: "var(--font-mono)" }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono mt-2 text-center">
                  金色 = 名义现金流 · 青色 = 折现后现值 · 最后一期含本金偿还
                </p>
              </div>
            </>
          )}

          {/* ═══ DURATION & CONVEXITY TAB ═══ */}
          {tab === "duration" && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="space-y-5">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">参数设置</p>
                  {renderSlider("票面利率", "c", "%", couponRate, 0, 15, 0.1, setCouponRate)}
                  {renderSlider("到期收益率 YTM", "y", "%", ytm, 0.1, 20, 0.1, setYtm)}
                  <div>
                    <label className="text-sm text-secondary-foreground font-medium mb-2 block">付息频率</label>
                    <div className="flex gap-2">
                      {[{ v: 1, l: "年付" }, { v: 2, l: "半年付" }, { v: 4, l: "季付" }].map((f) => (
                        <button key={f.v} onClick={() => setFreq(f.v)}
                          className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all ${freq === f.v ? "bg-gold/20 text-gold border border-gold/30" : "bg-secondary text-muted-foreground"}`}
                        >{f.l}</button>
                      ))}
                    </div>
                  </div>

                  {/* Price change estimator */}
                  <div className="mt-6 rounded-xl border border-border bg-secondary/30 p-5">
                    <p className="text-xs font-mono text-gold mb-3 uppercase tracking-wider">利率冲击模拟</p>
                    {(() => {
                      const shocks = [-200, -100, -50, 50, 100, 200];
                      const p0 = bondPrice(face, couponRate, ytm, maturity, freq);
                      const dMod = modifiedDuration(face, couponRate, ytm, maturity, freq);
                      const conv = convexity(face, couponRate, ytm, maturity, freq);
                      return (
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-4 gap-1 text-[9px] xs:text-[10px] font-mono text-muted-foreground border-b border-border pb-1">
                            <span className="truncate">Δy (bp)</span><span className="truncate">久期近似</span><span className="truncate">久期+凸性</span><span className="truncate">精确值</span>
                          </div>
                          {shocks.map((s) => {
                            const dy = s / 10000;
                            const durOnly = -dMod * dy * 100;
                            const durConv = (-dMod * dy + 0.5 * conv * dy * dy) * 100;
                            const exact = (bondPrice(face, couponRate, ytm + s / 100, maturity, freq) / p0 - 1) * 100;
                            return (
                              <div key={s} className="grid grid-cols-4 gap-1 text-[10px] xs:text-xs font-mono tabular-nums">
                                <span className={s < 0 ? "text-emerald-400" : "text-red-400"}>{s > 0 ? "+" : ""}{s}</span>
                                <span className="text-foreground truncate">{durOnly.toFixed(2)}%</span>
                                <span className="text-foreground truncate">{durConv.toFixed(2)}%</span>
                                <span className="text-gold truncate">{exact.toFixed(2)}%</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Duration by maturity chart */}
                <div>
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                    久期-期限关系
                  </p>
                  <div className="rounded-xl bg-secondary/30 border border-border p-4">
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={durData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                        <XAxis dataKey="maturity" stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
                          label={{ value: "到期期限 (年)", position: "insideBottom", offset: -2, style: { fontSize: 11, fill: CHART_TEXT, fontFamily: "var(--font-mono)" } }}
                        />
                        <YAxis yAxisId="left" stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} width={40} />
                        <YAxis yAxisId="right" orientation="right" stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} width={45} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-mono)" }} />
                        <ReferenceLine x={maturity} stroke={CHART_GOLD} strokeDasharray="4 4" strokeOpacity={0.4} yAxisId="left" />
                        <Line yAxisId="left" type="monotone" dataKey="macDur" name="Macaulay 久期" stroke={CHART_GOLD} strokeWidth={2} dot={false} />
                        <Line yAxisId="left" type="monotone" dataKey="modDur" name="修正久期" stroke={CHART_TEAL} strokeWidth={2} dot={false} />
                        <Line yAxisId="right" type="monotone" dataKey="convex" name="凸性" stroke={CHART_BLUE} strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                        <Legend wrapperStyle={{ fontSize: 10, fontFamily: "var(--font-mono)" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono mt-2 text-center">
                    金色虚线 = 当前期限 · 零息债券久期 = 到期时间（对角线）
                  </p>

                  {/* Zero coupon comparison */}
                  <div className="mt-4 rounded-xl bg-secondary/30 border border-border p-4">
                    <p className="text-[11px] font-mono text-muted-foreground mb-2">附息 vs 零息债券 (当前期限 {maturity} 年)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center">
                        <p className="text-[10px] font-mono text-gold">附息债券 (c={couponRate}%)</p>
                        <p className="text-sm font-mono font-bold text-foreground">D = {metrics.dMac.toFixed(3)} 年</p>
                        <p className="text-[10px] font-mono text-muted-foreground">Conv = {metrics.conv.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-mono text-teal-400">零息债券</p>
                        <p className="text-sm font-mono font-bold text-foreground">D = {maturity.toFixed(3)} 年</p>
                        <p className="text-[10px] font-mono text-muted-foreground">Conv = {(maturity * (maturity + 1 / freq) / Math.pow(1 + ytm / 100 / freq, 2)).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ═══ YIELD CURVE TAB ═══ */}
          {tab === "curve" && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="space-y-5">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                    Nelson-Siegel 参数
                  </p>
                  {renderSlider("水平因子 β₀ (Level)", "β₀", "%", b0, 0, 10, 0.1, setB0)}
                  {renderSlider("斜率因子 β₁ (Slope)", "β₁", "%", b1, -8, 5, 0.1, setB1)}
                  {renderSlider("曲率因子 β₂ (Curvature)", "β₂", "%", b2, -5, 8, 0.1, setB2)}
                  {renderSlider("衰减参数 λ", "λ", "", lambda, 0.5, 5, 0.1, setLambda)}

                  <div className="rounded-xl border border-border bg-secondary/30 p-4 mt-4">
                    <p className="text-xs font-mono text-gold mb-2">因子解读</p>
                    <div className="space-y-1 text-[11px] font-mono text-muted-foreground">
                      <p>τ→∞: y → β₀ = <span className="text-gold">{b0.toFixed(1)}%</span> (长端利率)</p>
                      <p>τ→0: y → β₀+β₁ = <span className="text-gold">{(b0 + b1).toFixed(1)}%</span> (短端利率)</p>
                      <p>斜率: β₁ = <span className={b1 < 0 ? "text-emerald-400" : "text-red-400"}>{b1.toFixed(1)}%</span> {b1 < 0 ? "(正常向上)" : "(倒挂)"}</p>
                      <p>驼峰: β₂ = <span className="text-blue-400">{b2.toFixed(1)}%</span> {b2 > 0 ? "(凸起)" : "(凹陷)"}</p>
                    </div>
                  </div>
                </div>

                {/* NS Yield Curve chart */}
                <div>
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                    Nelson-Siegel 收益率曲线
                  </p>
                  <div className="rounded-xl bg-secondary/30 border border-border p-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={nsData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                        <XAxis dataKey="tau" stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
                          label={{ value: "期限 τ (年)", position: "insideBottom", offset: -2, style: { fontSize: 11, fill: CHART_TEXT, fontFamily: "var(--font-mono)" } }}
                        />
                        <YAxis stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} width={40}
                          label={{ value: "利率 (%)", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 11, fill: CHART_TEXT, fontFamily: "var(--font-mono)" } }}
                        />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-mono)" }} />
                        <Area type="monotone" dataKey="yield" name="即期利率" stroke={CHART_GOLD} fill={CHART_GOLD} fillOpacity={0.1} strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="forward" name="远期利率" stroke={CHART_TEAL} strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                        <Legend wrapperStyle={{ fontSize: 10, fontFamily: "var(--font-mono)" }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono mt-2 text-center">
                    金色 = 即期利率曲线 · 青色虚线 = 瞬时远期利率 · 调节参数观察形态变化
                  </p>
                </div>
              </div>

              {/* Factor loadings */}
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                  因子载荷函数
                </p>
                <div className="rounded-xl bg-secondary/30 border border-border p-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart
                      data={Array.from({ length: 60 }, (_, i) => {
                        const tau = (i + 1) * 0.5;
                        const x = tau / lambda;
                        const expX = Math.exp(-x);
                        return {
                          tau,
                          level: 1,
                          slope: parseFloat(((1 - expX) / x).toFixed(4)),
                          curvature: parseFloat(((1 - expX) / x - expX).toFixed(4)),
                        };
                      })}
                      margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      <XAxis dataKey="tau" stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
                        label={{ value: "期限 τ (年)", position: "insideBottom", offset: -2, style: { fontSize: 10, fill: CHART_TEXT, fontFamily: "var(--font-mono)" } }}
                      />
                      <YAxis stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} width={35} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-mono)" }} />
                      <Line type="monotone" dataKey="level" name="Level (β₀)" stroke={CHART_GOLD} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="slope" name="Slope (β₁)" stroke={CHART_TEAL} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="curvature" name="Curvature (β₂)" stroke={CHART_BLUE} strokeWidth={2} dot={false} />
                      <ReferenceLine y={0} stroke={CHART_TEXT} strokeOpacity={0.3} />
                      <Legend wrapperStyle={{ fontSize: 10, fontFamily: "var(--font-mono)" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono mt-2 text-center">
                  Level=1（常数）· Slope 短端=1 长端→0 · Curvature 中间凸起 · λ 控制衰减速度
                </p>
              </div>
            </>
          )}

          {/* ═══ TERM-STRUCTURE / HULL-WHITE TAB ═══ */}
          {tab === "termstruct" && <RatesTermStructure />}
        </motion.div>
      </div>
    </section>
  );
};

export default BondCalculator;

import { useState, useMemo, useRef, useCallback } from "react";
import { ShareExportToolbar, useSharedState } from "@/lib/calculatorTools";
import { HistoryDrawer } from "./common/HistoryDrawer";
import PresetButtons, { Preset } from "./PresetButtons";
import RealDataLoader from "./RealDataLoader";
import { motion } from "framer-motion";

import "katex/dist/katex.min.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { EquationBlock } from "@/components/common/EquationBlock";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(220, 12%, 18%)";
const CHART_TEXT = "hsl(220, 10%, 50%)";

// ─── BS helpers ───
function normCdf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1.0 / (1.0 + p * ax);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return 0.5 * (1.0 + sign * y);
}

function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function bsCall(s: number, k: number, r: number, sigma: number, t: number) {
  if (t <= 0 || sigma <= 0) return Math.max(s - k * Math.exp(-r * t), 0);
  const d1 = (Math.log(s / k) + (r + sigma * sigma / 2) * t) / (sigma * Math.sqrt(t));
  const d2 = d1 - sigma * Math.sqrt(t);
  return s * normCdf(d1) - k * Math.exp(-r * t) * normCdf(d2);
}

function bsPut(s: number, k: number, r: number, sigma: number, t: number) {
  if (t <= 0 || sigma <= 0) return Math.max(k * Math.exp(-r * t) - s, 0);
  const d1 = (Math.log(s / k) + (r + sigma * sigma / 2) * t) / (sigma * Math.sqrt(t));
  const d2 = d1 - sigma * Math.sqrt(t);
  return k * Math.exp(-r * t) * normCdf(-d2) - s * normCdf(-d1);
}

function bsVega(s: number, k: number, r: number, sigma: number, t: number) {
  if (t <= 0 || sigma <= 0) return 0;
  const d1 = (Math.log(s / k) + (r + sigma * sigma / 2) * t) / (sigma * Math.sqrt(t));
  return s * normPdf(d1) * Math.sqrt(t);
}

// Newton-Raphson implied volatility
function impliedVol(
  marketPrice: number, s: number, k: number, r: number, t: number, isCall: boolean
): number | null {
  let sigma = 0.2; // initial guess
  for (let i = 0; i < 100; i++) {
    const price = isCall ? bsCall(s, k, r, sigma, t) : bsPut(s, k, r, sigma, t);
    const vega = bsVega(s, k, r, sigma, t);
    if (Math.abs(vega) < 1e-12) break;
    const diff = price - marketPrice;
    if (Math.abs(diff) < 1e-8) return sigma;
    sigma -= diff / vega;
    if (sigma <= 0.001) sigma = 0.001;
    if (sigma > 5) return null;
  }
  return sigma > 0.001 && sigma < 5 ? sigma : null;
}

// Generate synthetic vol surface with smile/skew
function generateVolSurface(
  s: number, r: number, baseVol: number, skew: number, smile: number
) {
  const strikes = Array.from({ length: 21 }, (_, i) => s * (0.7 + i * 0.03));
  const maturities = [0.08, 0.17, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0];

  // Surface data for heatmap-style line chart
  const smileData: Record<string, number | string>[][] = [];
  const surfaceByExpiry: { expiry: number; label: string; data: { strike: number; iv: number }[] }[] = [];

  for (const t of maturities) {
    const row: { strike: number; iv: number }[] = [];
    for (const k of strikes) {
      const moneyness = Math.log(k / s);
      // Skew: OTM puts have higher IV; smile: both wings up
      const ivAdj = baseVol + skew * moneyness / Math.sqrt(t) + smile * moneyness * moneyness / t;
      const iv = Math.max(0.05, ivAdj);
      row.push({ strike: parseFloat(k.toFixed(1)), iv: parseFloat((iv * 100).toFixed(2)) });
    }
    surfaceByExpiry.push({
      expiry: t,
      label: t < 1 ? `${Math.round(t * 12)}M` : `${t}Y`,
      data: row,
    });
  }

  // For the smile chart: combine all expiries into one dataset keyed by strike
  const smileChartData = strikes.map((k) => {
    const point: Record<string, number> = { strike: parseFloat(k.toFixed(1)) };
    for (const exp of surfaceByExpiry) {
      const match = exp.data.find(d => Math.abs(d.strike - k) < 0.5);
      if (match) point[exp.label] = match.iv;
    }
    return point;
  });

  // Term structure: ATM IV by expiry
  const termData = surfaceByExpiry.map((exp) => {
    const atm = exp.data.reduce((closest, d) =>
      Math.abs(d.strike - s) < Math.abs(closest.strike - s) ? d : closest
    );
    return { expiry: exp.expiry, label: exp.label, iv: atm.iv };
  });

  return { surfaceByExpiry, smileChartData, termData, strikes, maturities };
}

const EXPIRY_COLORS = [
  CHART_GOLD, CHART_TEAL, CHART_RED, CHART_BLUE,
  "hsl(280,60%,55%)", "hsl(150,60%,45%)", "hsl(30,80%,50%)", "hsl(340,60%,50%)",
];

const ImpliedVolTool = () => {
  // IV calculator inputs
  const [optType, setOptType] = useState<"call" | "put">("call");
  const [mktPrice, setMktPrice] = useState(10.45);
  const [ivS, setIvS] = useState(100);
  const [ivK, setIvK] = useState(100);
  const [ivR, setIvR] = useState(5);
  const [ivT, setIvT] = useState(1);

  // Surface params
  const [baseVol, setBaseVol] = useState(20);
  const [skew, setSkew] = useState(-0.1);
  const [smile, setSmile] = useState(0.05);

  const captureRef = useRef<HTMLDivElement>(null);
  const apply = useCallback((s: any) => {
    if (s.optType) setOptType(s.optType);
    if (s.mktPrice != null) setMktPrice(s.mktPrice);
    if (s.ivS != null) setIvS(s.ivS);
    if (s.ivK != null) setIvK(s.ivK);
    if (s.ivR != null) setIvR(s.ivR);
    if (s.ivT != null) setIvT(s.ivT);
    if (s.baseVol != null) setBaseVol(s.baseVol);
    if (s.skew != null) setSkew(s.skew);
    if (s.smile != null) setSmile(s.smile);
  }, []);
  useSharedState("iv", apply);

  // Compute IV
  const ivResult = useMemo(() => {
    const iv = impliedVol(mktPrice, ivS, ivK, ivR / 100, ivT, optType === "call");
    if (iv === null) return null;
    // Compute BS price at this IV for verification
    const bsP = optType === "call"
      ? bsCall(ivS, ivK, ivR / 100, iv, ivT)
      : bsPut(ivS, ivK, ivR / 100, iv, ivT);
    return { iv: iv * 100, bsPrice: bsP };
  }, [mktPrice, ivS, ivK, ivR, ivT, optType]);

  // IV sensitivity: how IV changes as market price varies
  const ivSensData = useMemo(() => {
    const bsP0 = optType === "call"
      ? bsCall(ivS, ivK, ivR / 100, baseVol / 100, ivT)
      : bsPut(ivS, ivK, ivR / 100, baseVol / 100, ivT);
    const data: { price: number; iv: number }[] = [];
    const pMin = Math.max(0.1, bsP0 * 0.3);
    const pMax = bsP0 * 2;
    for (let i = 0; i <= 60; i++) {
      const p = pMin + (pMax - pMin) * i / 60;
      const iv = impliedVol(p, ivS, ivK, ivR / 100, ivT, optType === "call");
      if (iv !== null) {
        data.push({ price: parseFloat(p.toFixed(2)), iv: parseFloat((iv * 100).toFixed(2)) });
      }
    }
    return data;
  }, [ivS, ivK, ivR, ivT, optType, baseVol]);

  // Vol surface
  const surface = useMemo(
    () => generateVolSurface(ivS, ivR / 100, baseVol / 100, skew, smile),
    [ivS, ivR, baseVol, skew, smile]
  );

  const sliderClass = "w-full h-1.5 rounded-full appearance-none cursor-pointer bg-secondary accent-gold [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:shadow-md";

  const renderSlider = (label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void, unit = "") => (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <label className="text-sm text-secondary-foreground font-medium">{label}</label>
        <span className="text-sm font-mono text-gold">{value}{unit}</span>
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
            Implied Volatility
          </p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
            隐含波动率工具
          </h2>
        </motion.div>

        <motion.div
          ref={captureRef}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-border bg-card p-8 md:p-10 glow-gold"
        >
          <div className="flex justify-end mb-4">
            <div className="flex flex-wrap gap-2">
              <HistoryDrawer
                storageKey="iv"
                currentState={{ optType, mktPrice, ivS, ivK, ivR, ivT, baseVol, skew, smile }}
                onApply={(s: any) => {
                  if (s.optType) setOptType(s.optType);
                  if (s.mktPrice !== undefined) setMktPrice(s.mktPrice);
                  if (s.ivS !== undefined) setIvS(s.ivS);
                  if (s.ivK !== undefined) setIvK(s.ivK);
                  if (s.ivR !== undefined) setIvR(s.ivR);
                  if (s.ivT !== undefined) setIvT(s.ivT);
                  if (s.baseVol !== undefined) setBaseVol(s.baseVol);
                  if (s.skew !== undefined) setSkew(s.skew);
                  if (s.smile !== undefined) setSmile(s.smile);
                }}
                summarize={(s: any) => `S=${s.ivS} K=${s.ivK} T=${s.ivT}y price=${s.mktPrice}`}
              />
              <ShareExportToolbar
                storageKey="iv"
                anchorId="implied-vol"
                state={{ optType, mktPrice, ivS, ivK, ivR, ivT, baseVol, skew, smile }}
                captureRef={captureRef}
                filename="implied-vol"
              />
            </div>
          </div>
          {/* Formula */}
          <div className="text-center mb-8 py-5 px-6 rounded-xl bg-gradient-to-br from-secondary/60 to-secondary/30 border border-gold/20 shadow-inner">
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold/80 mb-2">
              Implied Volatility — Newton-Raphson Inversion
            </p>
            <div className="text-foreground katex-display-gold">
              <EquationBlock math={String.raw`\text{Solve } \sigma_{\mathrm{iv}}\;:\;\; C_{\mathrm{BS}}(S,K,r,\sigma_{\mathrm{iv}},T)=C_{\mathrm{mkt}},\quad \sigma_{n+1}=\sigma_n - \dfrac{C_{\mathrm{BS}}(\sigma_n)-C_{\mathrm{mkt}}}{\mathcal{V}(\sigma_n)}`} />
            </div>
          </div>

          {/* ─── IV Calculator ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            <div className="space-y-4">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">隐含波动率反算</p>
              <RealDataLoader
                defaultSymbol="SPY"
                onApply={({ S0, sigma }) => {
                  setIvS(Math.round(S0));
                  setIvK(Math.round(S0));
                  setBaseVol(Math.round(sigma * 1000) / 10);
                }}
              />
              <PresetButtons presets={[
                { name: "ATM标准", description: "S=K=100, T=1, 市场价10.45", apply: () => { setOptType("call"); setMktPrice(10.45); setIvS(100); setIvK(100); setIvR(5); setIvT(1); setBaseVol(20); setSkew(-0.1); setSmile(0.05); } },
                { name: "OTM看跌", description: "S=100, K=90, Put", apply: () => { setOptType("put"); setMktPrice(3.2); setIvS(100); setIvK(90); setIvR(5); setIvT(0.5); } },
                { name: "强微笑", description: "高smile系数, 股指风格", apply: () => { setBaseVol(18); setSkew(-0.15); setSmile(0.12); } },
              ]} />

              {/* Option type toggle */}
              <div>
                <label className="text-sm text-secondary-foreground font-medium mb-2 block">期权类型</label>
                <div className="flex gap-2">
                  {([{ v: "call" as const, l: "看涨 Call" }, { v: "put" as const, l: "看跌 Put" }]).map((o) => (
                    <button key={o.v} onClick={() => setOptType(o.v)}
                      className={`px-4 py-1.5 text-xs font-mono rounded-lg transition-all ${optType === o.v ? "bg-gold/20 text-gold border border-gold/30" : "bg-secondary text-muted-foreground"}`}
                    >{o.l}</button>
                  ))}
                </div>
              </div>

              {renderSlider("市场价格", mktPrice, 0.1, 50, 0.05, setMktPrice)}
              {renderSlider("标的价格 S", ivS, 50, 200, 1, setIvS)}
              {renderSlider("行权价格 K", ivK, 50, 200, 1, setIvK)}
              {renderSlider("无风险利率 r", ivR, 0, 15, 0.1, setIvR, "%")}
              {renderSlider("到期时间 T", ivT, 0.01, 3, 0.01, setIvT, " 年")}
            </div>

            <div>
              {/* IV result */}
              <div className={`rounded-xl border p-6 text-center mb-4 ${
                ivResult ? "border-gold/20 bg-gold/[0.03]" : "border-red-400/20 bg-red-400/[0.03]"
              }`}>
                <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">
                  隐含波动率 σ_iv
                </p>
                {ivResult ? (
                  <>
                    <p className="text-4xl font-mono font-bold text-gold mb-1">
                      {ivResult.iv.toFixed(2)}%
                    </p>
                    <p className="text-sm font-mono text-muted-foreground">
                      BS价格验证: {ivResult.bsPrice.toFixed(4)} ≈ 市场价 {mktPrice.toFixed(2)}
                    </p>
                  </>
                ) : (
                  <p className="text-lg font-mono text-red-400">无解 — 检查输入参数</p>
                )}
              </div>

              {/* IV vs Market Price chart */}
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                隐含波动率 vs 市场价格
              </p>
              <div className="rounded-xl bg-secondary/30 border border-border p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={ivSensData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="price" stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
                      label={{ value: "期权价格", position: "insideBottom", offset: -2, style: { fontSize: 10, fill: CHART_TEXT, fontFamily: "var(--font-mono)" } }}
                    />
                    <YAxis stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} width={40}
                      label={{ value: "σ_iv (%)", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 10, fill: CHART_TEXT, fontFamily: "var(--font-mono)" } }}
                    />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-mono)" }} />
                    <ReferenceLine x={mktPrice} stroke={CHART_GOLD} strokeDasharray="4 4" strokeOpacity={0.5} />
                    <Line type="monotone" dataKey="iv" name="σ_iv (%)" stroke={CHART_GOLD} strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ─── Volatility Surface ─── */}
          <div className="border-t border-border pt-8">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">
              波动率曲面参数
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {renderSlider("基础波动率 σ₀", baseVol, 5, 60, 0.5, setBaseVol, "%")}
              {renderSlider("偏斜系数 (Skew)", skew, -0.3, 0.1, 0.01, (v) => setSkew(v))}
              {renderSlider("微笑系数 (Smile)", smile, 0, 0.2, 0.005, (v) => setSmile(v))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Volatility Smile across expiries */}
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                  波动率微笑 · 各到期日
                </p>
                <div className="rounded-xl bg-secondary/30 border border-border p-4">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={surface.smileChartData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      <XAxis dataKey="strike" stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
                        label={{ value: "行权价 K", position: "insideBottom", offset: -2, style: { fontSize: 10, fill: CHART_TEXT, fontFamily: "var(--font-mono)" } }}
                      />
                      <YAxis stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} width={40}
                        label={{ value: "IV (%)", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 10, fill: CHART_TEXT, fontFamily: "var(--font-mono)" } }}
                      />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-mono)" }} />
                      <ReferenceLine x={ivS} stroke={CHART_TEXT} strokeDasharray="3 6" strokeOpacity={0.3} />
                      {surface.surfaceByExpiry.map((exp, i) => (
                        <Line
                          key={exp.label}
                          type="monotone"
                          dataKey={exp.label}
                          name={exp.label}
                          stroke={EXPIRY_COLORS[i % EXPIRY_COLORS.length]}
                          strokeWidth={1.8}
                          dot={false}
                        />
                      ))}
                      <Legend wrapperStyle={{ fontSize: 10, fontFamily: "var(--font-mono)" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono mt-2 text-center">
                  {"σ(K,T) = σ₀ + skew·ln(K/S)/√T + smile·[ln(K/S)]²/T"}
                </p>
              </div>

              {/* ATM Term Structure */}
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                  ATM 波动率期限结构
                </p>
                <div className="rounded-xl bg-secondary/30 border border-border p-4">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={surface.termData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      <XAxis dataKey="expiry" stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
                        label={{ value: "到期 (年)", position: "insideBottom", offset: -2, style: { fontSize: 10, fill: CHART_TEXT, fontFamily: "var(--font-mono)" } }}
                      />
                      <YAxis stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} width={40}
                        label={{ value: "ATM IV (%)", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 10, fill: CHART_TEXT, fontFamily: "var(--font-mono)" } }}
                        domain={["auto", "auto"]}
                      />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-mono)" }} />
                      <Line type="monotone" dataKey="iv" name="ATM IV" stroke={CHART_GOLD} strokeWidth={2.5} dot={{ r: 4, fill: CHART_GOLD }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono mt-2 text-center">
                  ATM 隐含波动率随到期时间的变化 · 短期 IV 通常高于长期
                </p>
              </div>
            </div>

            {/* Vol surface heatmap table */}
            <div className="mt-6">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                波动率曲面矩阵 (IV %)
              </p>
              <div className="rounded-xl bg-secondary/30 border border-border p-4 overflow-x-auto">
                <table className="w-full text-center font-mono text-[10px]">
                  <thead>
                    <tr>
                      <th className="text-muted-foreground p-1.5 sticky left-0 bg-secondary/30">K \ T</th>
                      {surface.surfaceByExpiry.map((e) => (
                        <th key={e.label} className="text-muted-foreground p-1.5">{e.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {surface.strikes.filter((_, i) => i % 2 === 0).map((k, ki) => (
                      <tr key={k} className={ki % 2 === 0 ? "" : "bg-secondary/20"}>
                        <td className="text-muted-foreground p-1.5 sticky left-0 bg-secondary/30 font-bold">
                          {k.toFixed(0)}
                          {Math.abs(k - ivS) < 2 && <span className="text-gold ml-1">•</span>}
                        </td>
                        {surface.surfaceByExpiry.map((exp) => {
                          const match = exp.data.find(d => Math.abs(d.strike - k) < 0.5);
                          const iv = match?.iv ?? 0;
                          const intensity = Math.min(1, Math.max(0, (iv - baseVol * 0.5) / (baseVol * 1.5)));
                          return (
                            <td
                              key={exp.label}
                              className="p-1.5 text-foreground"
                              style={{
                                backgroundColor: `hsla(43, 80%, 55%, ${intensity * 0.25})`,
                              }}
                            >
                              {iv.toFixed(1)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono mt-2 text-center">
                {"金色深浅 = IV 高低 · • = ATM 行权价 · 调节 Skew/Smile 观察曲面形态变化"}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ImpliedVolTool;

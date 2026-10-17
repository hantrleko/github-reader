import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, ComposedChart, Area, BarChart, Bar, ScatterChart, Scatter, Cell,
} from "recharts";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import PresetButtons, { Preset } from "../PresetButtons";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

/* ──────── shared rng ──────── */
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

interface SliderProps {
  label: string; sub?: string; unit?: string;
  value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}
const Slider = ({ label, sub, unit, value, min, max, step, onChange }: SliderProps) => (
  <div>
    <div className="flex justify-between items-baseline mb-2">
      <label className="text-xs text-secondary-foreground font-medium">
        {label}
        {sub && <span className="text-muted-foreground ml-1.5 text-[10px]">{sub}</span>}
      </label>
      <span className="text-xs font-mono text-gold tabular-nums">
        {value.toFixed(step >= 1 ? 0 : step >= 0.1 ? 1 : 3)}
        {unit && ` ${unit}`}
      </span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className={sliderClass}
    />
  </div>
);

const Stat = ({ label, value, color = "hsl(var(--gold))", sub }: { label: string; value: string; color?: string; sub?: string }) => (
  <div className="p-3 rounded-lg border border-border bg-secondary/30 flex items-center justify-between">
    <div>
      <div className="text-xs font-mono text-muted-foreground">{label}</div>
      {sub && <div className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">{sub}</div>}
    </div>
    <span className="text-base font-mono font-semibold tabular-nums" style={{ color }}>{value}</span>
  </div>
);

/* ════════════════════════════════════════════════════════
   1) SYNTHETIC CONTROL — Abadie-Diamond-Hainmueller (2010)
   ════════════════════════════════════════════════════════ */

/** Project a vector onto the simplex {w >= 0, sum w = 1}. (Wang & Carreira-Perpiñán 2013) */
function projectSimplex(v: number[]): number[] {
  const n = v.length;
  const u = [...v].sort((a, b) => b - a);
  let css = 0; let rho = 0; let theta = 0;
  for (let i = 0; i < n; i++) {
    css += u[i];
    const t = (css - 1) / (i + 1);
    if (u[i] - t > 0) { rho = i + 1; theta = t; }
  }
  return v.map((x) => Math.max(x - theta, 0));
}

/** Synthetic control weights via projected gradient descent on simplex.
 *  X1: (T0,) treated pre-period outcomes; X0: (T0, J) donor pre-period matrix. */
function fitSyntheticControl(X1: number[], X0: number[][], iters = 800, lr = 0.05) {
  const T0 = X1.length; const J = X0[0].length;
  let w = new Array(J).fill(1 / J);
  for (let it = 0; it < iters; it++) {
    // residual r = X1 - X0 w  (length T0)
    const r = new Array(T0).fill(0);
    for (let t = 0; t < T0; t++) {
      let s = 0;
      for (let j = 0; j < J; j++) s += X0[t][j] * w[j];
      r[t] = X1[t] - s;
    }
    // grad_j = -2 sum_t X0[t][j] * r[t]
    const g = new Array(J).fill(0);
    for (let j = 0; j < J; j++) {
      let s = 0;
      for (let t = 0; t < T0; t++) s += X0[t][j] * r[t];
      g[j] = -2 * s / T0;
    }
    for (let j = 0; j < J; j++) w[j] -= lr * g[j];
    w = projectSimplex(w);
  }
  return w;
}

export const SyntheticControlTool = () => {
  const { t } = useTranslation();
  const [J, setJ] = useState(8);            // donor pool size
  const [T0, setT0] = useState(20);         // pre-treatment periods
  const [T1, setT1] = useState(15);         // post-treatment periods
  const [att, setAtt] = useState(2.5);      // true ATT
  const [noise, setNoise] = useState(0.4);
  const [seed, setSeed] = useState(42);

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    const T = T0 + T1;
    // 2 latent factors + heterogeneous loadings → mimics ADH DGP
    const f1 = Array.from({ length: T }, (_, t) => Math.sin(t * 0.18) + 0.04 * t);
    const f2 = Array.from({ length: T }, (_, t) => Math.cos(t * 0.27));
    // treated unit loadings
    const lam1 = 0.9, lam2 = 0.6, intercept1 = 1.0;
    // donors with random loadings
    const donors: { lam1: number; lam2: number; mu: number }[] = [];
    for (let j = 0; j < J; j++) {
      donors.push({ lam1: 0.4 + 1.0 * rng(), lam2: 0.2 + 0.8 * rng(), mu: 0.5 + 1.5 * rng() });
    }
    // generate paths
    const Y1: number[] = []; const Y0_donors: number[][] = [];
    for (let t = 0; t < T; t++) {
      Y1.push(intercept1 + lam1 * f1[t] + lam2 * f2[t] + noise * randn(rng) + (t >= T0 ? att : 0));
      const row: number[] = [];
      for (let j = 0; j < J; j++) row.push(donors[j].mu + donors[j].lam1 * f1[t] + donors[j].lam2 * f2[t] + noise * randn(rng));
      Y0_donors.push(row);
    }
    // fit on pre period
    const X1 = Y1.slice(0, T0);
    const X0 = Y0_donors.slice(0, T0);
    const w = fitSyntheticControl(X1, X0);
    // synthetic path full
    const Yhat = Y0_donors.map((row) => row.reduce((s, v, j) => s + v * w[j], 0));
    // RMSPE pre & post
    const rmspe = (s: number, e: number) => {
      let ss = 0;
      for (let t = s; t < e; t++) { const d = Y1[t] - Yhat[t]; ss += d * d; }
      return Math.sqrt(ss / (e - s));
    };
    const preRMSPE = rmspe(0, T0);
    const postRMSPE = rmspe(T0, T);
    const ratio = postRMSPE / Math.max(preRMSPE, 1e-9);
    // ATT̂ = average gap post
    let attHat = 0;
    for (let t = T0; t < T; t++) attHat += Y1[t] - Yhat[t];
    attHat /= T1;

    // Placebo in space — refit treating each donor as "treated"
    const placeboRatios: number[] = [];
    const placeboGaps: number[][] = [];
    for (let p = 0; p < J; p++) {
      const yp = Y0_donors.map((row) => row[p]);                // synthetic-treated
      const X0p = Y0_donors.map((row) => row.filter((_, j) => j !== p));
      const wp = fitSyntheticControl(yp.slice(0, T0), X0p.slice(0, T0));
      const yphat = X0p.map((row) => row.reduce((s, v, j) => s + v * wp[j], 0));
      const gaps = yp.map((y, t) => y - yphat[t]);
      placeboGaps.push(gaps);
      const pre = Math.sqrt(gaps.slice(0, T0).reduce((s, g) => s + g * g, 0) / T0);
      const post = Math.sqrt(gaps.slice(T0).reduce((s, g) => s + g * g, 0) / T1);
      placeboRatios.push(post / Math.max(pre, 1e-9));
    }
    // permutation p-value: rank of treated ratio among placebos
    const allRatios = [ratio, ...placeboRatios];
    const rank = allRatios.filter((r) => r >= ratio).length;
    const pVal = rank / allRatios.length;

    const series = Y1.map((y1, t) => ({ t, treated: +y1.toFixed(3), synthetic: +Yhat[t].toFixed(3), gap: +(y1 - Yhat[t]).toFixed(3) }));
    return { series, weights: w, donors, attHat, preRMSPE, postRMSPE, ratio, placeboGaps, pVal, T };
  }, [J, T0, T1, att, noise, seed]);

  const presets: Preset[] = [
    { name: t("labs.causalAdvanced.text001", { defaultValue: "经典 ADH" }), description: t("labs.causalAdvanced.text002", { defaultValue: "强信号 ATT=2.5, 噪声小" }), apply: () => { setAtt(2.5); setNoise(0.4); setT0(20); setT1(15); setJ(8); } },
    { name: t("labs.causalAdvanced.text003", { defaultValue: "无效应安慰剂" }), description: t("labs.causalAdvanced.text004", { defaultValue: "ATT=0, 应有大 p-value" }), apply: () => { setAtt(0); setNoise(0.5); } },
    { name: t("labs.causalAdvanced.text005", { defaultValue: "弱信号" }), description: t("labs.causalAdvanced.text006", { defaultValue: "ATT=0.6, 与噪声相当" }), apply: () => { setAtt(0.6); setNoise(0.5); } },
    { name: t("labs.causalAdvanced.text007", { defaultValue: "短前期" }), description: t("labs.causalAdvanced.text008", { defaultValue: "T0=10, 拟合不稳定" }), apply: () => { setT0(10); setT1(15); setAtt(2); } },
  ];

  return (
    <div className="space-y-6">
      <PresetButtons presets={presets} />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <Slider label={t("labs.causalAdvanced.text009", { defaultValue: "捐献池规模 J" })} value={J} min={3} max={20} step={1} onChange={setJ} />
          <Slider label={t("labs.causalAdvanced.text010", { defaultValue: "处理前期数 T₀" })} value={T0} min={8} max={50} step={1} onChange={setT0} />
          <Slider label={t("labs.causalAdvanced.text011", { defaultValue: "处理后期数 T₁" })} value={T1} min={5} max={40} step={1} onChange={setT1} />
          <Slider label={t("labs.causalAdvanced.text012", { defaultValue: "真实 ATT" })} value={att} min={-3} max={5} step={0.1} onChange={setAtt} />
          <Slider label={t("labs.causalAdvanced.text013", { defaultValue: "噪声 σ" })} value={noise} min={0.05} max={1.5} step={0.05} onChange={setNoise} />
          <Slider label={t("labs.causalAdvanced.text014", { defaultValue: "随机种子" })} value={seed} min={1} max={200} step={1} onChange={setSeed} />

          <div className="space-y-2 mt-4">
            <Stat label={t("labs.causalAdvanced.text015", { defaultValue: "估计 ATT̂" })} value={data.attHat.toFixed(3)} color={CHART_GOLD} sub={t("labs.causalAdvanced.text016", { defaultValue: "真实 = {{var1}}", var1: att.toFixed(2) })} />
            <Stat label="Pre RMSPE" value={data.preRMSPE.toFixed(3)} color={CHART_TEAL} />
            <Stat label={t("labs.causalAdvanced.text017", { defaultValue: "Post / Pre 比" })} value={data.ratio.toFixed(2)} color={CHART_RED} sub={t("labs.causalAdvanced.text018", { defaultValue: "拟合质量诊断" })} />
            <Stat label={t("labs.causalAdvanced.text019", { defaultValue: "排列 p-value" })} value={data.pVal.toFixed(3)} color={data.pVal < 0.1 ? CHART_GOLD : CHART_TEXT} sub={t("labs.causalAdvanced.text020", { defaultValue: "安慰剂秩检验 (J+1={{var1}})", var1: 1 + J })} />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">{t("labs.causalAdvanced.text021", { defaultValue: "真实 vs 合成对照路径" })}</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.series} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine x={T0 - 0.5} stroke={CHART_RED} strokeDasharray="4 3" label={{ value: t("labs.causalAdvanced.text022", { defaultValue: "处理时点" }), fill: CHART_RED, fontSize: 10 }} />
                <Line type="monotone" dataKey="treated" stroke={CHART_GOLD} strokeWidth={2} dot={false} name={t("labs.causalAdvanced.text023", { defaultValue: "处理单元 Y₁" })} />
                <Line type="monotone" dataKey="synthetic" stroke={CHART_TEAL} strokeWidth={2} strokeDasharray="5 3" dot={false} name={t("labs.causalAdvanced.text024", { defaultValue: "合成对照 Ŷ₀" })} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">{t("labs.causalAdvanced.text025", { defaultValue: "间隙图 (Y₁−Ŷ₀)：处理单元 vs 安慰剂" })}</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis type="number" dataKey="t" domain={[0, data.T - 1]} stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                <ReferenceLine y={0} stroke={CHART_GRID} />
                <ReferenceLine x={T0 - 0.5} stroke={CHART_RED} strokeDasharray="4 3" />
                {data.placeboGaps.map((g, i) => (
                  <Line key={`p${i}`} data={g.map((v, t) => ({ t, v }))} type="monotone" dataKey="v" stroke={CHART_TEXT} strokeOpacity={0.3} strokeWidth={1} dot={false} isAnimationActive={false} name={i === 0 ? t("labs.causalAdvanced.text026", { defaultValue: "安慰剂" }) : ""} legendType="none" />
                ))}
                <Line data={data.series} type="monotone" dataKey="gap" stroke={CHART_GOLD} strokeWidth={2.5} dot={false} name={t("labs.causalAdvanced.text027", { defaultValue: "处理单元间隙" })} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">{t("labs.causalAdvanced.text028", { defaultValue: "合成对照权重 W*" })}</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={data.weights.map((w, j) => ({ donor: `D${j + 1}`, w: +w.toFixed(3) }))}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="donor" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                <Bar dataKey="w" fill={CHART_GOLD} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <details className="rounded-lg border border-border bg-card/40 p-4">
        <summary className="cursor-pointer text-xs font-mono uppercase tracking-[0.2em] text-gold/80">{t("labs.causalAdvanced.text029", { defaultValue: "方法学说明" })}</summary>
        <div className="mt-3 space-y-2 text-xs text-secondary-foreground leading-relaxed">
          <p>{t("labs.causalAdvanced.text030", { defaultValue: "合成对照法为单一处理单元构造一组捐献者（donor pool）的凸组合 W* = argmin ‖X₁ − X₀W‖² s.t. wⱼ ≥ 0, Σwⱼ = 1，使得合成单元在处理前的轨迹与处理单元尽量贴合。" })}</p>
          <p>{t("labs.causalAdvanced.text031", { defaultValue: "识别假设：因子模型 Yᵢₜ = δₜ + λₜ′μᵢ + εᵢₜ。当 T₀ 足够长时，前期良好拟合意味着潜因子 μ̂ 被合成单元复现，从而 ATT̂ₜ = Y₁ₜ − Ŷ₀ₜ。" })}</p>
          <p>{t("labs.causalAdvanced.text032", { defaultValue: "推断采用" })} <strong>{t("labs.causalAdvanced.text033", { defaultValue: "排列检验（permutation test）" })}</strong>{t("labs.causalAdvanced.text034", { defaultValue: "：依次将每个捐献者当作\"处理单元\"重新拟合，计算 post/pre RMSPE 比值。真实处理单元在所有比值中的排名即给出 p-value。" })}</p>
          <p className="text-[11px] text-muted-foreground">Reference: Abadie, Diamond & Hainmueller (2010) <em>Synthetic Control Methods for Comparative Case Studies</em>, JASA 105(490).</p>
        </div>
      </details>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   2) STAGGERED DID — Callaway & Sant'Anna (2021)
   ════════════════════════════════════════════════════════ */

export const StaggeredDIDTool = () => {
  const { t } = useTranslation();
  const [N, setN] = useState(40);              // units per group
  const [T, setT] = useState(20);
  const [tauEarly, setTauEarly] = useState(2);    // ATT for early-treated
  const [tauLate, setTauLate] = useState(4);      // ATT for late-treated (heterogeneous!)
  const [dynamic, setDynamic] = useState(0.3);    // ramp slope per period since treatment
  const [noise, setNoise] = useState(0.5);
  const [seed, setSeed] = useState(7);

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    // Three groups: never-treated (G=∞), early G=6, late G=14
    const groups = [Infinity, 6, 14];
    const groupSize = N;
    const totalUnits = 3 * groupSize;
    // Generate panel
    const Y: number[][] = []; // [unit][t]
    const G: number[] = [];
    for (let g = 0; g < 3; g++) {
      const gt = groups[g];
      const baseTau = g === 1 ? tauEarly : g === 2 ? tauLate : 0;
      for (let i = 0; i < groupSize; i++) {
        const ai = randn(rng) * 0.5;             // unit FE
        const row: number[] = [];
        for (let t = 0; t < T; t++) {
          const trend = 0.1 * t;
          let tau = 0;
          if (isFinite(gt) && t >= gt) {
            const k = t - gt;
            tau = baseTau + dynamic * k;
          }
          row.push(ai + trend + tau + noise * randn(rng));
        }
        Y.push(row); G.push(gt);
      }
    }

    // ── Callaway-Sant'Anna ATT(g, t) using never-treated as control ──
    // ATT(g,t) = E[Y_t - Y_{g-1} | G=g] - E[Y_t - Y_{g-1} | C=1]   for t >= g
    const treatedGroups = [6, 14];
    const csCells: { g: number; t: number; att: number }[] = [];
    for (const g of treatedGroups) {
      for (let t = g; t < T; t++) {
        // changes for group g
        let dG = 0; let nG = 0;
        let dC = 0; let nC = 0;
        for (let i = 0; i < totalUnits; i++) {
          const diff = Y[i][t] - Y[i][g - 1];
          if (G[i] === g) { dG += diff; nG++; }
          else if (!isFinite(G[i])) { dC += diff; nC++; }
        }
        csCells.push({ g, t, att: dG / nG - dC / nC });
      }
    }

    // Event-time aggregation: e = t - g
    const eventMap = new Map<number, number[]>();
    csCells.forEach((c) => {
      const e = c.t - c.g;
      if (!eventMap.has(e)) eventMap.set(e, []);
      eventMap.get(e)!.push(c.att);
    });
    const eventStudy = Array.from(eventMap.entries())
      .map(([e, arr]) => ({ e, att: arr.reduce((s, x) => s + x, 0) / arr.length }))
      .sort((a, b) => a.e - b.e);

    // Overall ATT (simple average of post-treatment cells)
    const attOverall = csCells.reduce((s, c) => s + c.att, 0) / csCells.length;

    // ── Naïve TWFE estimate (single ATT via unit + time FE + D_it) ──
    // Within transformation: y_tilde = y - y_i_bar - y_t_bar + y_bar
    const D: number[][] = Y.map((_, i) => Array.from({ length: T }, (_, t) => isFinite(G[i]) && t >= G[i] ? 1 : 0));
    const yBar = Y.flat().reduce((s, v) => s + v, 0) / (totalUnits * T);
    const yI = Y.map((row) => row.reduce((s, v) => s + v, 0) / T);
    const yT = Array.from({ length: T }, (_, t) => Y.reduce((s, row) => s + row[t], 0) / totalUnits);
    const dBar = D.flat().reduce((s, v) => s + v, 0) / (totalUnits * T);
    const dI = D.map((row) => row.reduce((s, v) => s + v, 0) / T);
    const dT = Array.from({ length: T }, (_, t) => D.reduce((s, row) => s + row[t], 0) / totalUnits);
    let num = 0, den = 0;
    for (let i = 0; i < totalUnits; i++) {
      for (let t = 0; t < T; t++) {
        const yt = Y[i][t] - yI[i] - yT[t] + yBar;
        const dt = D[i][t] - dI[i] - dT[t] + dBar;
        num += dt * yt; den += dt * dt;
      }
    }
    const twfe = num / den;

    // True average post-treatment ATT (for comparison)
    let trueAvg = 0; let cnt = 0;
    for (const g of treatedGroups) {
      const baseTau = g === 6 ? tauEarly : tauLate;
      for (let t = g; t < T; t++) { trueAvg += baseTau + dynamic * (t - g); cnt++; }
    }
    trueAvg /= cnt;

    return { csCells, eventStudy, attOverall, twfe, trueAvg, treatedGroups };
  }, [N, T, tauEarly, tauLate, dynamic, noise, seed]);

  const presets: Preset[] = [
    { name: t("labs.causalAdvanced.text035", { defaultValue: "异质性效应" }), description: t("labs.causalAdvanced.text036", { defaultValue: "早=2, 晚=4, 显示 TWFE 偏误" }), apply: () => { setTauEarly(2); setTauLate(4); setDynamic(0.3); } },
    { name: t("labs.causalAdvanced.text037", { defaultValue: "同质瞬时" }), description: t("labs.causalAdvanced.text038", { defaultValue: "两组相同, TWFE≈CS" }), apply: () => { setTauEarly(3); setTauLate(3); setDynamic(0); } },
    { name: t("labs.causalAdvanced.text039", { defaultValue: "强动态效应" }), description: t("labs.causalAdvanced.text040", { defaultValue: "ramp=0.6, 事件研究最有用" }), apply: () => { setDynamic(0.6); setTauEarly(1); setTauLate(2); } },
    { name: t("labs.causalAdvanced.text041", { defaultValue: "反向异质性" }), description: t("labs.causalAdvanced.text042", { defaultValue: "晚<早, TWFE 严重低估" }), apply: () => { setTauEarly(4); setTauLate(1); setDynamic(0.1); } },
  ];

  // Heatmap rendering: rebuild matrix
  const heatRows = data.treatedGroups.map((g) => {
    const row = data.csCells.filter((c) => c.g === g).sort((a, b) => a.t - b.t);
    return { g, cells: row };
  });
  const allAtt = data.csCells.map((c) => c.att);
  const minA = Math.min(...allAtt, 0); const maxA = Math.max(...allAtt, 0);
  const cellColor = (v: number) => {
    if (v >= 0) {
      const a = Math.min(1, v / Math.max(maxA, 1e-6));
      return `hsla(43, 80%, 55%, ${0.15 + 0.85 * a})`;
    }
    const a = Math.min(1, -v / Math.max(-minA, 1e-6));
    return `hsla(0, 70%, 55%, ${0.15 + 0.85 * a})`;
  };

  return (
    <div className="space-y-6">
      <PresetButtons presets={presets} />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <Slider label={t("labs.causalAdvanced.text043", { defaultValue: "每组单元数 N" })} value={N} min={20} max={120} step={5} onChange={setN} />
          <Slider label={t("labs.causalAdvanced.text044", { defaultValue: "时期数 T" })} value={T} min={15} max={40} step={1} onChange={setT} />
          <Slider label={t("labs.causalAdvanced.text045", { defaultValue: "早期组 ATT (G=6)" })} value={tauEarly} min={-2} max={6} step={0.1} onChange={setTauEarly} />
          <Slider label={t("labs.causalAdvanced.text046", { defaultValue: "晚期组 ATT (G=14)" })} value={tauLate} min={-2} max={6} step={0.1} onChange={setTauLate} />
          <Slider label={t("labs.causalAdvanced.text047", { defaultValue: "动态斜率 (每期增量)" })} value={dynamic} min={-0.2} max={1} step={0.05} onChange={setDynamic} />
          <Slider label={t("labs.causalAdvanced.text048", { defaultValue: "噪声 σ" })} value={noise} min={0.1} max={1.5} step={0.05} onChange={setNoise} />
          <Slider label={t("labs.causalAdvanced.text049", { defaultValue: "随机种子" })} value={seed} min={1} max={200} step={1} onChange={setSeed} />

          <div className="space-y-2 mt-4">
            <Stat label={t("labs.causalAdvanced.text050", { defaultValue: "CS 整体 ATT̄" })} value={data.attOverall.toFixed(3)} color={CHART_GOLD} sub={t("labs.causalAdvanced.text051", { defaultValue: "post 单元加权平均" })} />
            <Stat label={t("labs.causalAdvanced.text052", { defaultValue: "TWFE 估计" })} value={data.twfe.toFixed(3)} color={CHART_RED} sub={t("labs.causalAdvanced.text053", { defaultValue: "存在异质性 → 偏误" })} />
            <Stat label={t("labs.causalAdvanced.text054", { defaultValue: "真实平均 ATT" })} value={data.trueAvg.toFixed(3)} color={CHART_TEAL} sub={t("labs.causalAdvanced.text055", { defaultValue: "基准" })} />
            <Stat label={t("labs.causalAdvanced.text056", { defaultValue: "TWFE 偏差" })} value={(data.twfe - data.trueAvg).toFixed(3)} color={Math.abs(data.twfe - data.trueAvg) > 0.3 ? CHART_RED : CHART_TEAL} />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">{t("labs.causalAdvanced.text057", { defaultValue: "事件研究：聚合 ATT(e)" })}</p>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={data.eventStudy} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="e" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: t("labs.causalAdvanced.text058", { defaultValue: "事件时间 e = t − g" }), position: "insideBottom", offset: -2, fontSize: 10, fill: CHART_TEXT }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                <ReferenceLine y={0} stroke={CHART_GRID} />
                <ReferenceLine x={-0.5} stroke={CHART_RED} strokeDasharray="4 3" />
                <Bar dataKey="att" name="ATT(e)" fill={CHART_GOLD} />
                <Line type="monotone" dataKey="att" stroke={CHART_TEAL} dot={{ r: 3 }} legendType="none" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">{t("labs.causalAdvanced.text059", { defaultValue: "ATT(g,t) 矩阵 — 群组 × 日历时间" })}</p>
            <div className="overflow-x-auto">
              <table className="text-[10px] font-mono border-collapse">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-muted-foreground">g \ t</th>
                    {Array.from({ length: T }, (_, t) => (
                      <th key={t} className="px-1.5 py-1 text-muted-foreground text-center min-w-[26px]">{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatRows.map(({ g, cells }) => (
                    <tr key={g}>
                      <td className="px-2 py-1 text-gold font-semibold">G={g}</td>
                      {Array.from({ length: T }, (_, t) => {
                        const c = cells.find((x) => x.t === t);
                        if (!c) return <td key={t} className="px-1 py-1 text-muted-foreground/40 text-center">·</td>;
                        return (
                          <td key={t} className="px-1 py-1 text-center text-foreground" style={{ background: cellColor(c.att) }} title={`ATT(${g},${t}) = ${c.att.toFixed(3)}`}>
                            {c.att.toFixed(1)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <details className="rounded-lg border border-border bg-card/40 p-4">
        <summary className="cursor-pointer text-xs font-mono uppercase tracking-[0.2em] text-gold/80">{t("labs.causalAdvanced.text060", { defaultValue: "方法学说明" })}</summary>
        <div className="mt-3 space-y-2 text-xs text-secondary-foreground leading-relaxed">
          <p><strong>{t("labs.causalAdvanced.text061", { defaultValue: "问题：" })}</strong>{t("labs.causalAdvanced.text062", { defaultValue: "当处理在不同时点交错发生且效应存在异质性（动态或群组间），传统 TWFE 估计 β̂ 会成为各 ATT(g,t) 的" })}<em>{t("labs.causalAdvanced.text063", { defaultValue: "含负权重" })}</em>{t("labs.causalAdvanced.text064", { defaultValue: "加权平均（Goodman-Bacon 2021），可能严重偏离真实平均效应，甚至符号反转。" })}</p>
          <p><strong>{t("labs.causalAdvanced.text065", { defaultValue: "CS 估计量：" })}</strong> ATT(g, t) = E[Y_t − Y_{`{g−1}`} | G=g] − E[Y_t − Y_{`{g−1}`} {t("labs.causalAdvanced.text066", { defaultValue: "| 永不处理]。每个群组-时间格子单独计算 2×2 DID，避免污染。" })}</p>
          <p><strong>{t("labs.causalAdvanced.text067", { defaultValue: "聚合：" })}</strong>{t("labs.causalAdvanced.text068", { defaultValue: "事件时间 ATT(e) = avg_g ATT(g, g+e) 给出标准的事件研究曲线；整体 ATT 为所有 post 单元的简单平均。" })}</p>
          <p className="text-[11px] text-muted-foreground">Reference: Callaway & Sant'Anna (2021) <em>Difference-in-Differences with Multiple Time Periods</em>, J. Econometrics 225(2). de Chaisemartin & D'Haultfœuille (2020); Goodman-Bacon (2021).</p>
        </div>
      </details>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   3) MARKOV REGIME-SWITCHING — Hamilton (1989)
   ════════════════════════════════════════════════════════ */

function normPdf(x: number, mu: number, sigma: number) {
  return Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
}

/** Hamilton filter + Kim smoother for 2-state Markov-switching mean/variance.
 *  Returns filtered & smoothed P(S_t = 1 | info), and log-likelihood. */
function hamiltonFilter(
  y: number[], mu: [number, number], sigma: [number, number], P: [[number, number], [number, number]]
) {
  const T = y.length;
  // stationary distribution
  const p11 = P[0][0], p22 = P[1][1];
  const pi1 = (1 - p22) / (2 - p11 - p22);
  let pred: [number, number] = [pi1, 1 - pi1];
  const filt: [number, number][] = []; let ll = 0;
  for (let t = 0; t < T; t++) {
    const l0 = normPdf(y[t], mu[0], sigma[0]);
    const l1 = normPdf(y[t], mu[1], sigma[1]);
    const j0 = pred[0] * l0; const j1 = pred[1] * l1;
    const s = j0 + j1;
    ll += Math.log(Math.max(s, 1e-300));
    const f0 = j0 / s; const f1 = j1 / s;
    filt.push([f0, f1]);
    pred = [f0 * P[0][0] + f1 * P[1][0], f0 * P[0][1] + f1 * P[1][1]];
  }
  // Kim smoother (backward)
  const smooth: [number, number][] = new Array(T);
  smooth[T - 1] = filt[T - 1];
  for (let t = T - 2; t >= 0; t--) {
    const fpred0 = filt[t][0] * P[0][0] + filt[t][1] * P[1][0];
    const fpred1 = filt[t][0] * P[0][1] + filt[t][1] * P[1][1];
    const s0 = filt[t][0] * (P[0][0] * smooth[t + 1][0] / Math.max(fpred0, 1e-12) + P[0][1] * smooth[t + 1][1] / Math.max(fpred1, 1e-12));
    const s1 = filt[t][1] * (P[1][0] * smooth[t + 1][0] / Math.max(fpred0, 1e-12) + P[1][1] * smooth[t + 1][1] / Math.max(fpred1, 1e-12));
    smooth[t] = [s0, s1];
  }
  return { filt, smooth, ll };
}

/** EM (Baum-Welch) for 2-state Gaussian Markov-switching. */
function emFit(y: number[], iters = 60) {
  // init from quantile split
  const sorted = [...y].sort((a, b) => a - b);
  let mu: [number, number] = [sorted[Math.floor(y.length * 0.25)], sorted[Math.floor(y.length * 0.75)]];
  const v0 = y.reduce((s, v) => s + (v - mu[0]) ** 2, 0) / y.length;
  let sigma: [number, number] = [Math.sqrt(v0), Math.sqrt(v0)];
  let P: [[number, number], [number, number]] = [[0.9, 0.1], [0.1, 0.9]];
  let prevLL = -Infinity;
  for (let it = 0; it < iters; it++) {
    const { filt, smooth, ll } = hamiltonFilter(y, mu, sigma, P);
    if (Math.abs(ll - prevLL) < 1e-6) break;
    prevLL = ll;
    // joint smoothed P(S_t=i, S_{t+1}=j)
    const xi = [[0, 0], [0, 0]];
    for (let t = 0; t < y.length - 1; t++) {
      const fpred0 = filt[t][0] * P[0][0] + filt[t][1] * P[1][0];
      const fpred1 = filt[t][0] * P[0][1] + filt[t][1] * P[1][1];
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          const denom = j === 0 ? fpred0 : fpred1;
          xi[i][j] += filt[t][i] * P[i][j] * smooth[t + 1][j] / Math.max(denom, 1e-12);
        }
      }
    }
    // M step
    for (let i = 0; i < 2; i++) {
      const rowSum = xi[i][0] + xi[i][1];
      P[i][0] = xi[i][0] / Math.max(rowSum, 1e-12);
      P[i][1] = xi[i][1] / Math.max(rowSum, 1e-12);
    }
    for (let i = 0; i < 2; i++) {
      let wsum = 0, num = 0;
      for (let t = 0; t < y.length; t++) { wsum += smooth[t][i]; num += smooth[t][i] * y[t]; }
      mu[i] = num / Math.max(wsum, 1e-12);
      let v = 0;
      for (let t = 0; t < y.length; t++) v += smooth[t][i] * (y[t] - mu[i]) ** 2;
      sigma[i] = Math.sqrt(Math.max(v / Math.max(wsum, 1e-12), 1e-6));
    }
  }
  // Order states so that state 0 is "calm" (lower variance)
  if (sigma[0] > sigma[1]) {
    mu = [mu[1], mu[0]]; sigma = [sigma[1], sigma[0]];
    P = [[P[1][1], P[1][0]], [P[0][1], P[0][0]]];
  }
  const final = hamiltonFilter(y, mu, sigma, P);
  return { mu, sigma, P, smooth: final.smooth, ll: final.ll };
}

export const RegimeSwitchTool = () => {
  const { t } = useTranslation();
  const [T, setT] = useState(300);
  const [mu0, setMu0] = useState(0.6);   // calm regime mean (e.g. positive returns)
  const [mu1, setMu1] = useState(-0.8);  // crisis regime mean
  const [s0, setS0] = useState(0.8);     // calm vol
  const [s1, setS1] = useState(2.5);     // crisis vol
  const [p11, setP11] = useState(0.97);  // stay-calm prob
  const [p22, setP22] = useState(0.92);  // stay-crisis prob
  const [seed, setSeed] = useState(11);

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    // Simulate true regimes
    const trueS: number[] = []; const y: number[] = [];
    let s: 0 | 1 = 0;
    for (let t = 0; t < T; t++) {
      const stay = s === 0 ? p11 : p22;
      if (rng() > stay) s = (s === 0 ? 1 : 0);
      trueS.push(s);
      const mu = s === 0 ? mu0 : mu1;
      const sd = s === 0 ? s0 : s1;
      y.push(mu + sd * randn(rng));
    }
    const fit = emFit(y);
    // Viterbi most-likely path
    const logP = [[Math.log(fit.P[0][0]), Math.log(fit.P[0][1])], [Math.log(fit.P[1][0]), Math.log(fit.P[1][1])]];
    const delta: number[][] = [[0, 0]]; const psi: number[][] = [[0, 0]];
    delta[0] = [Math.log(0.5) + Math.log(normPdf(y[0], fit.mu[0], fit.sigma[0])), Math.log(0.5) + Math.log(normPdf(y[0], fit.mu[1], fit.sigma[1]))];
    psi[0] = [0, 0];
    for (let t = 1; t < T; t++) {
      const d: number[] = [0, 0]; const p: number[] = [0, 0];
      for (let j = 0; j < 2; j++) {
        const cands = [delta[t - 1][0] + logP[0][j], delta[t - 1][1] + logP[1][j]];
        const best = cands[0] >= cands[1] ? 0 : 1;
        d[j] = cands[best] + Math.log(Math.max(normPdf(y[t], fit.mu[j], fit.sigma[j]), 1e-300));
        p[j] = best;
      }
      delta.push(d); psi.push(p);
    }
    const viterbi: number[] = new Array(T);
    viterbi[T - 1] = delta[T - 1][0] >= delta[T - 1][1] ? 0 : 1;
    for (let t = T - 2; t >= 0; t--) viterbi[t] = psi[t + 1][viterbi[t + 1]];

    const series = y.map((v, t) => ({
      t, y: +v.toFixed(3),
      pCrisis: +fit.smooth[t][1].toFixed(3),
      trueS: trueS[t],
      viterbi: viterbi[t],
    }));

    // Classification accuracy (states may be label-permuted; we already enforce vol order)
    let agree = 0;
    for (let t = 0; t < T; t++) if (viterbi[t] === trueS[t]) agree++;
    const acc = agree / T;

    // Expected duration in each regime: E[d_i] = 1 / (1 − p_ii)
    const dur0 = 1 / Math.max(1 - fit.P[0][0], 1e-6);
    const dur1 = 1 / Math.max(1 - fit.P[1][1], 1e-6);

    return { series, fit, acc, dur0, dur1, trueS };
  }, [T, mu0, mu1, s0, s1, p11, p22, seed]);

  const presets: Preset[] = [
    { name: t("labs.causalAdvanced.text069", { defaultValue: "牛熊切换" }), description: t("labs.causalAdvanced.text070", { defaultValue: "正/负均值 + 高低波动" }), apply: () => { setMu0(0.6); setMu1(-0.8); setS0(0.8); setS1(2.5); setP11(0.97); setP22(0.92); } },
    { name: t("labs.causalAdvanced.text071", { defaultValue: "纯波动切换" }), description: t("labs.causalAdvanced.text072", { defaultValue: "均值相同, 仅 σ 不同" }), apply: () => { setMu0(0); setMu1(0); setS0(0.6); setS1(2.2); setP11(0.95); setP22(0.9); } },
    { name: t("labs.causalAdvanced.text073", { defaultValue: "频繁切换" }), description: t("labs.causalAdvanced.text074", { defaultValue: "持久性低, 状态很短" }), apply: () => { setP11(0.85); setP22(0.8); } },
    { name: t("labs.causalAdvanced.text075", { defaultValue: "极端持久" }), description: t("labs.causalAdvanced.text076", { defaultValue: "几乎不切换" }), apply: () => { setP11(0.99); setP22(0.98); } },
  ];

  return (
    <div className="space-y-6">
      <PresetButtons presets={presets} />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <Slider label={t("labs.causalAdvanced.text077", { defaultValue: "样本长度 T" })} value={T} min={100} max={800} step={20} onChange={setT} />
          <Slider label={t("labs.causalAdvanced.text078", { defaultValue: "状态 0 均值 μ₀" })} value={mu0} min={-2} max={2} step={0.05} onChange={setMu0} />
          <Slider label={t("labs.causalAdvanced.text079", { defaultValue: "状态 1 均值 μ₁" })} value={mu1} min={-3} max={2} step={0.05} onChange={setMu1} />
          <Slider label={t("labs.causalAdvanced.text080", { defaultValue: "状态 0 波动 σ₀" })} value={s0} min={0.2} max={3} step={0.1} onChange={setS0} />
          <Slider label={t("labs.causalAdvanced.text081", { defaultValue: "状态 1 波动 σ₁" })} value={s1} min={0.2} max={5} step={0.1} onChange={setS1} />
          <Slider label={t("labs.causalAdvanced.text082", { defaultValue: "P(留在 0 | 0)" })} value={p11} min={0.5} max={0.995} step={0.005} onChange={setP11} />
          <Slider label={t("labs.causalAdvanced.text083", { defaultValue: "P(留在 1 | 1)" })} value={p22} min={0.5} max={0.995} step={0.005} onChange={setP22} />
          <Slider label={t("labs.causalAdvanced.text084", { defaultValue: "随机种子" })} value={seed} min={1} max={200} step={1} onChange={setSeed} />

          <div className="space-y-2 mt-4">
            <Stat label={t("labs.causalAdvanced.text085", { defaultValue: "估计 μ̂₀ / μ̂₁" })} value={`${data.fit.mu[0].toFixed(2)} / ${data.fit.mu[1].toFixed(2)}`} color={CHART_GOLD} sub={t("labs.causalAdvanced.text086", { defaultValue: "按 σ 升序排列" })} />
            <Stat label={t("labs.causalAdvanced.text087", { defaultValue: "估计 σ̂₀ / σ̂₁" })} value={`${data.fit.sigma[0].toFixed(2)} / ${data.fit.sigma[1].toFixed(2)}`} color={CHART_TEAL} />
            <Stat label="P̂₁₁ / P̂₂₂" value={`${data.fit.P[0][0].toFixed(3)} / ${data.fit.P[1][1].toFixed(3)}`} color={CHART_BLUE} />
            <Stat label={t("labs.causalAdvanced.text088", { defaultValue: "期望持续期 E[d₀] / E[d₁]" })} value={`${data.dur0.toFixed(1)} / ${data.dur1.toFixed(1)}`} color={CHART_GOLD} sub="1/(1−p_ii)" />
            <Stat label={t("labs.causalAdvanced.text089", { defaultValue: "对数似然" })} value={data.fit.ll.toFixed(2)} color={CHART_TEXT} />
            <Stat label={t("labs.causalAdvanced.text090", { defaultValue: "Viterbi 分类精度" })} value={(data.acc * 100).toFixed(1) + "%"} color={data.acc > 0.85 ? CHART_GOLD : CHART_RED} />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">{t("labs.causalAdvanced.text091", { defaultValue: "观测序列 yₜ + 真实危机区域（阴影）" })}</p>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={data.series} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                <ReferenceLine y={0} stroke={CHART_GRID} />
                <Area type="step" dataKey={(d: any) => d.trueS ? Math.max(...data.series.map(s => s.y)) : null} fill={CHART_RED} fillOpacity={0.08} stroke="none" name={t("labs.causalAdvanced.text092", { defaultValue: "真实危机期" })} isAnimationActive={false} />
                <Line type="monotone" dataKey="y" stroke={CHART_GOLD} strokeWidth={1.4} dot={false} name="yₜ" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">{t("labs.causalAdvanced.text093", { defaultValue: "平滑概率 P(Sₜ = 危机 | y₁:T)" })}</p>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={data.series} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} domain={[0, 1]} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                <ReferenceLine y={0.5} stroke={CHART_GRID} strokeDasharray="3 3" />
                <Area type="monotone" dataKey="trueS" stroke="none" fill={CHART_RED} fillOpacity={0.12} name={t("labs.causalAdvanced.text094", { defaultValue: "真实状态" })} />
                <Line type="monotone" dataKey="pCrisis" stroke={CHART_RED} strokeWidth={2} dot={false} name={t("labs.causalAdvanced.text095", { defaultValue: "P(危机)" })} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <details className="rounded-lg border border-border bg-card/40 p-4">
        <summary className="cursor-pointer text-xs font-mono uppercase tracking-[0.2em] text-gold/80">{t("labs.causalAdvanced.text096", { defaultValue: "方法学说明" })}</summary>
        <div className="mt-3 space-y-2 text-xs text-secondary-foreground leading-relaxed">
          <p><strong>{t("labs.causalAdvanced.text097", { defaultValue: "模型：" })}</strong> yₜ | Sₜ = i ~ N(μᵢ, σᵢ²)，Sₜ ∈ {`{0,1}`} {t("labs.causalAdvanced.text098", { defaultValue: "服从一阶 Markov 链，转移矩阵 P。" })}</p>
          <p><strong>{t("labs.causalAdvanced.text099", { defaultValue: "Hamilton 滤波：" })}</strong>{t("labs.causalAdvanced.text100", { defaultValue: "前向递推 P(Sₜ | y₁:ₜ) — 在每步根据观测更新状态后验，用于实时识别。" })}</p>
          <p><strong>{t("labs.causalAdvanced.text101", { defaultValue: "Kim 平滑：" })}</strong>{t("labs.causalAdvanced.text102", { defaultValue: "后向递推 P(Sₜ | y₁:T) — 利用全样本信息，事后识别更准确（如 NBER 衰退期）。" })}</p>
          <p><strong>EM (Baum-Welch)：</strong>{t("labs.causalAdvanced.text103", { defaultValue: "反复执行 E 步（计算 ξᵢⱼ = P(Sₜ=i, Sₜ₊₁=j | y)）和 M 步（更新 μ, σ, P）直至对数似然收敛。" })}</p>
          <p><strong>Viterbi：</strong>{t("labs.causalAdvanced.text104", { defaultValue: "动态规划求最大后验状态序列 argmax P(S₁:T | y₁:T)，给出\"最可能\"的离散状态路径。" })}</p>
          <p className="text-[11px] text-muted-foreground">Reference: Hamilton (1989) <em>A New Approach to the Economic Analysis of Nonstationary Time Series and the Business Cycle</em>, Econometrica 57(2). Kim (1994).</p>
        </div>
      </details>
    </div>
  );
};
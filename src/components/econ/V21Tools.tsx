import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, BarChart, Bar, ComposedChart, Area, Cell,
} from "recharts";
import "katex/dist/katex.min.css";
import PresetButtons, { Preset } from "../PresetButtons";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED  = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

/* ─────── shared utilities ─────── */
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

const Slider = ({ label, sub, value, min, max, step, onChange, fmt }: {
  label: string; sub?: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; fmt?: (v: number) => string;
}) => (
  <div>
    <div className="flex justify-between items-baseline mb-2">
      <label className="text-xs text-secondary-foreground font-medium">
        {label}
        {sub && <span className="text-muted-foreground ml-1.5 text-[10px]">{sub}</span>}
      </label>
      <span className="text-xs font-mono text-gold tabular-nums">
        {fmt ? fmt(value) : value.toFixed(step >= 1 ? 0 : step >= 0.1 ? 2 : 3)}
      </span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))} className={sliderClass} />
  </div>
);

const Stat = ({ label, value, color = CHART_GOLD, sub }: { label: string; value: string; color?: string; sub?: string }) => (
  <div className="p-3 rounded-lg border border-border bg-secondary/30 flex items-center justify-between">
    <div>
      <div className="text-xs font-mono text-muted-foreground">{label}</div>
      {sub && <div className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">{sub}</div>}
    </div>
    <span className="text-base font-mono font-semibold tabular-nums" style={{ color }}>{value}</span>
  </div>
);

/* ─────── linear algebra ─────── */
/** Solve OLS  beta = (X'X)^{-1} X'y  via Gauss-Jordan. */
function olsBeta(X: number[][], y: number[]): number[] {
  const n = X.length, k = X[0].length;
  const XtX: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  const Xty: number[] = new Array(k).fill(0);
  for (let i = 0; i < n; i++) for (let a = 0; a < k; a++) {
    Xty[a] += X[i][a] * y[i];
    for (let b = 0; b < k; b++) XtX[a][b] += X[i][a] * X[i][b];
  }
  // augment
  const M: number[][] = XtX.map((row, i) => [...row, Xty[i]]);
  for (let i = 0; i < k; i++) {
    // pivot
    let p = i; let mx = Math.abs(M[i][i]);
    for (let r = i + 1; r < k; r++) if (Math.abs(M[r][i]) > mx) { mx = Math.abs(M[r][i]); p = r; }
    if (mx < 1e-12) return new Array(k).fill(0);
    if (p !== i) { const tmp = M[i]; M[i] = M[p]; M[p] = tmp; }
    const pv = M[i][i];
    for (let c = i; c <= k; c++) M[i][c] /= pv;
    for (let r = 0; r < k; r++) if (r !== i) {
      const f = M[r][i];
      if (f !== 0) for (let c = i; c <= k; c++) M[r][c] -= f * M[i][c];
    }
  }
  return M.map(row => row[k]);
}

/* ════════════════════════════════════════════════════════════════
   1) PSM / IPW / AIPW — Doubly-Robust ATE Estimation
   ════════════════════════════════════════════════════════════════ */
function fitLogit(X: number[][], y: number[], iters = 30): number[] {
  const n = X.length, k = X[0].length;
  let beta = new Array(k).fill(0);
  for (let it = 0; it < iters; it++) {
    // p_i, W_i = p(1-p), z_i = X beta + (y - p)/W
    const W = new Array(n).fill(0); const z = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let xb = 0; for (let j = 0; j < k; j++) xb += X[i][j] * beta[j];
      const p = 1 / (1 + Math.exp(-xb));
      const w = Math.max(p * (1 - p), 1e-6);
      W[i] = w; z[i] = xb + (y[i] - p) / w;
    }
    // weighted OLS: (X' W X) b = X' W z
    const XtWX: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
    const XtWz: number[] = new Array(k).fill(0);
    for (let i = 0; i < n; i++) for (let a = 0; a < k; a++) {
      XtWz[a] += X[i][a] * W[i] * z[i];
      for (let b = 0; b < k; b++) XtWX[a][b] += X[i][a] * W[i] * X[i][b];
    }
    // augmented solve
    const M: number[][] = XtWX.map((row, i) => [...row, XtWz[i]]);
    for (let i = 0; i < k; i++) {
      let p = i; let mx = Math.abs(M[i][i]);
      for (let r = i + 1; r < k; r++) if (Math.abs(M[r][i]) > mx) { mx = Math.abs(M[r][i]); p = r; }
      if (mx < 1e-12) break;
      if (p !== i) { const tmp = M[i]; M[i] = M[p]; M[p] = tmp; }
      const pv = M[i][i];
      for (let c = i; c <= k; c++) M[i][c] /= pv;
      for (let r = 0; r < k; r++) if (r !== i) {
        const f = M[r][i];
        if (f !== 0) for (let c = i; c <= k; c++) M[r][c] -= f * M[i][c];
      }
    }
    const newBeta = M.map(row => row[k]);
    let diff = 0; for (let j = 0; j < k; j++) diff += Math.abs(newBeta[j] - beta[j]);
    beta = newBeta;
    if (diff < 1e-7) break;
  }
  return beta;
}

const psmPresets = (t: ReturnType<typeof useTranslation>["t"], set: (v: { n: number; tau: number; gamma: number; beta: number; seed: number }) => void): Preset[] => [
  { name: t("labs.econV21.text001", { defaultValue: "弱选择偏差 (γ=0.3)" }), description: t("labs.econV21.text002", { defaultValue: "倾向得分接近随机分配,所有估计量都好" }),
    apply: () => set({ n: 600, tau: 1.0, gamma: 0.3, beta: 0.8, seed: 42 }) },
  { name: t("labs.econV21.text003", { defaultValue: "强选择偏差 (γ=1.5)" }), description: t("labs.econV21.text004", { defaultValue: "OLS 严重偏误,但 AIPW 双稳健" }),
    apply: () => set({ n: 600, tau: 1.0, gamma: 1.5, beta: 1.5, seed: 42 }) },
  { name: t("labs.econV21.text005", { defaultValue: "重叠不足 (γ=2.5)" }), description: t("labs.econV21.text006", { defaultValue: "极端 IPW 权重,PSM 优势凸显" }),
    apply: () => set({ n: 600, tau: 1.0, gamma: 2.5, beta: 1.0, seed: 7 }) },
  { name: t("labs.econV21.text007", { defaultValue: "RCT 模拟 (γ=0)" }), description: t("labs.econV21.text008", { defaultValue: "无混淆 — 所有方法一致" }),
    apply: () => set({ n: 600, tau: 1.0, gamma: 0.0, beta: 1.0, seed: 42 }) },
];

export const PSMTool = () => {
  const { t } = useTranslation();
  const [n, setN] = useState(600);
  const [tau, setTau] = useState(1.0);
  const [gamma, setGamma] = useState(1.5);     // selection strength on X
  const [beta, setBeta] = useState(1.5);       // confounding effect on Y
  const [seed, setSeed] = useState(42);

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    // X ~ N(0,1); T ~ Bern( σ(γ X) ); Y = α + τT + βX + ε
    const X = new Array(n).fill(0).map(() => randn(rng));
    // Use rng for treatment too
    const rng2 = mulberry32(seed + 1);
    const Tvec: number[] = X.map(x => (rng2() < 1 / (1 + Math.exp(-gamma * x)) ? 1 : 0));
    const Y: number[] = X.map((x, i) => 0 + tau * Tvec[i] + beta * x + 0.5 * randn(rng));

    // Estimate propensity score by logit on [1, X]
    const Xmat: number[][] = X.map(x => [1, x]);
    const bHat = fitLogit(Xmat, Tvec);
    const psHat = X.map(x => 1 / (1 + Math.exp(-(bHat[0] + bHat[1] * x))));
    // Trim extreme PS to avoid blow-up
    const psTrim = psHat.map(p => Math.min(0.98, Math.max(0.02, p)));

    // ── 1) Naive OLS Y on T ──
    const meanT1 = Y.filter((_, i) => Tvec[i] === 1).reduce((a, b) => a + b, 0) / Math.max(1, Tvec.filter(t => t === 1).length);
    const meanT0 = Y.filter((_, i) => Tvec[i] === 0).reduce((a, b) => a + b, 0) / Math.max(1, Tvec.filter(t => t === 0).length);
    const ateNaive = meanT1 - meanT0;

    // ── 2) IPW (Horvitz-Thompson) ──
    let ipwSum = 0;
    for (let i = 0; i < n; i++) ipwSum += (Tvec[i] * Y[i]) / psTrim[i] - ((1 - Tvec[i]) * Y[i]) / (1 - psTrim[i]);
    const ateIpw = ipwSum / n;

    // ── 3) PSM 1-NN matching on PS ──
    const treatedIdx = Tvec.map((t, i) => t === 1 ? i : -1).filter(i => i >= 0);
    const controlIdx = Tvec.map((t, i) => t === 0 ? i : -1).filter(i => i >= 0);
    let psmSum = 0; let matched = 0;
    for (const i of treatedIdx) {
      let bestJ = -1; let bestD = Infinity;
      for (const j of controlIdx) {
        const d = Math.abs(psTrim[i] - psTrim[j]);
        if (d < bestD) { bestD = d; bestJ = j; }
      }
      if (bestJ >= 0) { psmSum += Y[i] - Y[bestJ]; matched++; }
    }
    const atePsm = matched > 0 ? psmSum / matched : NaN;

    // ── 4) Outcome regression: m1(x), m0(x) via OLS on each arm ──
    const X1: number[][] = []; const Y1: number[] = [];
    const X0: number[][] = []; const Y0: number[] = [];
    for (let i = 0; i < n; i++) {
      if (Tvec[i] === 1) { X1.push([1, X[i]]); Y1.push(Y[i]); }
      else { X0.push([1, X[i]]); Y0.push(Y[i]); }
    }
    const b1 = X1.length > 2 ? olsBeta(X1, Y1) : [0, 0];
    const b0 = X0.length > 2 ? olsBeta(X0, Y0) : [0, 0];
    const m1 = X.map(x => b1[0] + b1[1] * x);
    const m0 = X.map(x => b0[0] + b0[1] * x);

    // ── 5) AIPW (Doubly Robust) ──
    let aipwSum = 0;
    for (let i = 0; i < n; i++) {
      aipwSum += (m1[i] - m0[i])
        + (Tvec[i] * (Y[i] - m1[i])) / psTrim[i]
        - ((1 - Tvec[i]) * (Y[i] - m0[i])) / (1 - psTrim[i]);
    }
    const ateAipw = aipwSum / n;

    // PS distribution histogram (treated vs control)
    const bins = 20;
    const psHist: any[] = [];
    for (let b = 0; b < bins; b++) {
      const lo = b / bins, hi = (b + 1) / bins;
      let nt = 0, nc = 0;
      for (let i = 0; i < n; i++) {
        if (psTrim[i] >= lo && psTrim[i] < hi) {
          if (Tvec[i] === 1) nt++; else nc++;
        }
      }
      psHist.push({ ps: ((lo + hi) / 2).toFixed(2), treated: nt, control: -nc });
    }

    // SMD before / after IPW (for X covariate)
    const meanX1 = X.filter((_, i) => Tvec[i] === 1).reduce((a, b) => a + b, 0) / Math.max(1, treatedIdx.length);
    const meanX0 = X.filter((_, i) => Tvec[i] === 0).reduce((a, b) => a + b, 0) / Math.max(1, controlIdx.length);
    const varX1 = X.filter((_, i) => Tvec[i] === 1).reduce((s, v) => s + (v - meanX1) ** 2, 0) / Math.max(1, treatedIdx.length);
    const varX0 = X.filter((_, i) => Tvec[i] === 0).reduce((s, v) => s + (v - meanX0) ** 2, 0) / Math.max(1, controlIdx.length);
    const smdBefore = (meanX1 - meanX0) / Math.sqrt((varX1 + varX0) / 2);
    // After IPW: weights w_i = T/p + (1-T)/(1-p)
    let sw1 = 0, sw0 = 0, mw1 = 0, mw0 = 0;
    for (let i = 0; i < n; i++) {
      if (Tvec[i] === 1) { const w = 1 / psTrim[i]; sw1 += w; mw1 += w * X[i]; }
      else { const w = 1 / (1 - psTrim[i]); sw0 += w; mw0 += w * X[i]; }
    }
    const meanWX1 = mw1 / sw1, meanWX0 = mw0 / sw0;
    const smdAfter = (meanWX1 - meanWX0) / Math.sqrt((varX1 + varX0) / 2);

    return {
      ateTrue: tau, ateNaive, ateIpw, atePsm, ateAipw,
      psHist, smdBefore, smdAfter,
      nT: treatedIdx.length, nC: controlIdx.length,
      psBetaHat: bHat,
    };
  }, [n, tau, gamma, beta, seed]);

  const ateBars = [
    { name: "Naive OLS",  v: data.ateNaive,  truth: data.ateTrue, fill: CHART_RED  },
    { name: "IPW",        v: data.ateIpw,    truth: data.ateTrue, fill: CHART_BLUE },
    { name: "1-NN PSM",   v: data.atePsm,    truth: data.ateTrue, fill: CHART_TEAL },
    { name: "AIPW (DR)",  v: data.ateAipw,   truth: data.ateTrue, fill: CHART_GOLD },
  ];

  return (
    <div className="space-y-6">
      <PresetButtons
        presets={psmPresets(t, (v) => { setN(v.n); setTau(v.tau); setGamma(v.gamma); setBeta(v.beta); setSeed(v.seed); })}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Slider label={t("labs.econV21.text009", { defaultValue: "样本数 n" })}          value={n}     min={100} max={2000} step={100} onChange={setN} />
          <Slider label={t("labs.econV21.text010", { defaultValue: "真实 ATE  τ" })}       value={tau}   min={-2}  max={3}    step={0.1} onChange={setTau} />
          <Slider label={t("labs.econV21.text011", { defaultValue: "选择偏差强度 γ" })}    sub="P(T=1)=σ(γX)" value={gamma} min={0} max={3} step={0.1} onChange={setGamma} />
          <Slider label={t("labs.econV21.text012", { defaultValue: "混淆系数 β" })}        sub="Y=α+τT+βX+ε"  value={beta}  min={-2} max={3} step={0.1} onChange={setBeta} />
          <Slider label={t("labs.econV21.text013", { defaultValue: "随机种子" })}          value={seed}  min={1}   max={200}  step={1}   onChange={setSeed} />
        </div>
        <div className="space-y-2">
          <Stat label={t("labs.econV21.text014", { defaultValue: "处理 / 对照" })} value={`${data.nT} / ${data.nC}`} />
          <Stat label={t("labs.econV21.text015", { defaultValue: "真实 ATE" })}   value={data.ateTrue.toFixed(3)} color={CHART_GOLD} />
          <Stat label="Naive OLS"  value={data.ateNaive.toFixed(3)} color={CHART_RED}
                sub={t("labs.econV21.text016", { defaultValue: "偏差 {{v1}}", v1: (data.ateNaive - data.ateTrue).toFixed(3) })} />
          <Stat label="IPW"        value={data.ateIpw.toFixed(3)}   color={CHART_BLUE}
                sub={t("labs.econV21.text017", { defaultValue: "偏差 {{v1}}", v1: (data.ateIpw - data.ateTrue).toFixed(3) })} />
          <Stat label="1-NN PSM"   value={data.atePsm.toFixed(3)}   color={CHART_TEAL}
                sub={t("labs.econV21.text018", { defaultValue: "偏差 {{v1}}", v1: (data.atePsm - data.ateTrue).toFixed(3) })} />
          <Stat label="AIPW (DR)"  value={data.ateAipw.toFixed(3)}  color={CHART_GOLD}
                sub={t("labs.econV21.text019", { defaultValue: "偏差 {{v1}}", v1: (data.ateAipw - data.ateTrue).toFixed(3) })} />
          <Stat label={t("labs.econV21.text020", { defaultValue: "SMD (X) 加权前 → 后" })}
                value={`${data.smdBefore.toFixed(2)} → ${data.smdAfter.toFixed(2)}`}
                color={Math.abs(data.smdAfter) < 0.1 ? CHART_TEAL : CHART_RED}
                sub={t("labs.econV21.text021", { defaultValue: "|SMD|<0.1 视为平衡" })} />
        </div>
      </div>

      {/* Chart 1: ATE comparison */}
      <div>
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">{t("labs.econV21.text022", { defaultValue: "ATE 估计对比" })}</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={ateBars} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke={CHART_TEXT} tick={{ fontSize: 11 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
            <ReferenceLine y={data.ateTrue} stroke={CHART_GOLD} strokeDasharray="4 3"
              label={{ value: t("labs.econV21.text023", { defaultValue: "真实 τ = {{v1}}", v1: data.ateTrue.toFixed(2) }), position: "right", fill: CHART_GOLD, fontSize: 10 }} />
            <Bar dataKey="v" name={t("labs.econV21.text024", { defaultValue: "估计 ATE" })}>
              {ateBars.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 2: PS overlap */}
      <div>
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">
          {t("labs.econV21.text025", { defaultValue: "倾向得分共同支撑 (上=处理 / 下=对照)" })}
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.psHist} stackOffset="sign" margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="ps" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
            <ReferenceLine y={0} stroke={CHART_TEXT} />
            <Bar dataKey="treated" stackId="a" fill={CHART_GOLD} name={t("labs.econV21.text026", { defaultValue: "处理 T=1" })} />
            <Bar dataKey="control" stackId="a" fill={CHART_TEAL} name={t("labs.econV21.text027", { defaultValue: "对照 T=0" })} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border border-gold/20 bg-secondary/20 p-4 text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">{t("labs.econV21.text028", { defaultValue: "三条估计路径：" })}</strong></p>
        <p><strong>① IPW (Horvitz-Thompson)</strong> {t("labs.econV21.text029", { defaultValue: "用倾向得分 e(X)=P(T=1|X) 重加权，" })}<em>{t("labs.econV21.text030", { defaultValue: "仅" })}</em>{t("labs.econV21.text031", { defaultValue: "需 e(X) 正确即一致估计 ATE。" })}</p>
        <p><strong>{t("labs.econV21.text032", { defaultValue: "② 结果回归 (g-formula)" })}</strong> {t("labs.econV21.text033", { defaultValue: "用 m₁(X), m₀(X) 反事实预测，" })}<em>{t("labs.econV21.text034", { defaultValue: "仅" })}</em>{t("labs.econV21.text035", { defaultValue: "需结果模型正确即一致。" })}</p>
        <p><strong>{t("labs.econV21.text036", { defaultValue: "③ AIPW 双稳健" })}</strong>{t("labs.econV21.text037", { defaultValue: "结合二者：" })}<em>{t("labs.econV21.text038", { defaultValue: "e 或 m 任一正确" })}</em>{t("labs.econV21.text039", { defaultValue: "都能得到一致的 ATE，且渐近方差最小。" })}</p>
        <p className="text-[11px] text-muted-foreground/80">Reference: Robins, Rotnitzky & Zhao (1994) <em>Estimation of Regression Coefficients When Some Regressors Are Not Always Observed</em>, JASA 89. Hirano, Imbens & Ridder (2003).</p>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   2) ARIMA + AUTO ORDER (Hannan-Rissanen)
   ════════════════════════════════════════════════════════════════ */

/** Simulate ARMA(p,q): y_t = sum φ_i y_{t-i} + ε_t + sum θ_j ε_{t-j} */
function simulateARMA(T: number, phi: number[], theta: number[], sigma: number, seed: number) {
  const rng = mulberry32(seed);
  const burn = 100; const N = T + burn;
  const eps = new Array(N).fill(0).map(() => sigma * randn(rng));
  const y = new Array(N).fill(0);
  for (let t = 0; t < N; t++) {
    let yt = eps[t];
    for (let i = 0; i < phi.length; i++) if (t - 1 - i >= 0) yt += phi[i] * y[t - 1 - i];
    for (let j = 0; j < theta.length; j++) if (t - 1 - j >= 0) yt += theta[j] * eps[t - 1 - j];
    y[t] = yt;
  }
  return y.slice(burn);
}

/** Hannan-Rissanen 2-step ARMA(p,q) estimator. */
function fitARMA(y: number[], p: number, q: number) {
  const T = y.length;
  if (p === 0 && q === 0) {
    const mu = y.reduce((a, b) => a + b, 0) / T;
    const ssr = y.reduce((s, v) => s + (v - mu) ** 2, 0);
    return { coef: [mu], resid: y.map(v => v - mu), ssr, k: 1 };
  }
  // Step 1: long AR to estimate residuals
  const L = Math.min(10, Math.floor(T / 5));
  let epsHat: number[] = new Array(T).fill(0);
  if (L >= 1) {
    const Xa: number[][] = []; const ya: number[] = [];
    for (let t = L; t < T; t++) {
      const row = [1]; for (let i = 1; i <= L; i++) row.push(y[t - i]);
      Xa.push(row); ya.push(y[t]);
    }
    const ba = olsBeta(Xa, ya);
    for (let t = L; t < T; t++) {
      let pred = ba[0]; for (let i = 1; i <= L; i++) pred += ba[i] * y[t - i];
      epsHat[t] = y[t] - pred;
    }
  }
  // Step 2: regress y_t on [1, y_{t-1..p}, eps_{t-1..q}]
  const start = Math.max(p, q, L);
  const X: number[][] = []; const yy: number[] = [];
  for (let t = start; t < T; t++) {
    const row = [1];
    for (let i = 1; i <= p; i++) row.push(y[t - i]);
    for (let j = 1; j <= q; j++) row.push(epsHat[t - j]);
    X.push(row); yy.push(y[t]);
  }
  if (X.length < p + q + 2) {
    return { coef: new Array(1 + p + q).fill(0), resid: y.slice(), ssr: NaN, k: 1 + p + q };
  }
  const coef = olsBeta(X, yy);
  const resid = new Array(T).fill(0);
  for (let t = start; t < T; t++) {
    let pred = coef[0];
    for (let i = 1; i <= p; i++) pred += coef[i] * y[t - i];
    for (let j = 1; j <= q; j++) pred += coef[p + j] * epsHat[t - j];
    resid[t] = y[t] - pred;
  }
  let ssr = 0; for (let t = start; t < T; t++) ssr += resid[t] ** 2;
  return { coef, resid, ssr, k: 1 + p + q, nEff: T - start };
}

/** Sample autocorrelation up to lag K. */
function acf(x: number[], K: number) {
  const n = x.length; const m = x.reduce((a, b) => a + b, 0) / n;
  const c: number[] = []; let c0 = 0;
  for (let i = 0; i < n; i++) c0 += (x[i] - m) ** 2;
  c0 /= n;
  for (let k = 1; k <= K; k++) {
    let s = 0; for (let t = k; t < n; t++) s += (x[t] - m) * (x[t - k] - m);
    c.push(s / n / c0);
  }
  return c;
}

const arimaPresets = (t: ReturnType<typeof useTranslation>["t"], set: (v: any) => void): Preset[] => [
  { name: t("labs.econV21.text040", { defaultValue: "白噪声" }), description: t("labs.econV21.text041", { defaultValue: "纯随机:期望 (p,q)=(0,0)" }),
    apply: () => set({ phi1: 0, phi2: 0, theta1: 0, theta2: 0, T: 300, seed: 42 }) },
  { name: "AR(1) φ=0.7", description: t("labs.econV21.text042", { defaultValue: "强持续性:期望 (1,0)" }),
    apply: () => set({ phi1: 0.7, phi2: 0, theta1: 0, theta2: 0, T: 300, seed: 42 }) },
  { name: "MA(1) θ=0.6", description: t("labs.econV21.text043", { defaultValue: "短期记忆:期望 (0,1)" }),
    apply: () => set({ phi1: 0, phi2: 0, theta1: 0.6, theta2: 0, T: 300, seed: 42 }) },
  { name: "ARMA(2,1)", description: t("labs.econV21.text044", { defaultValue: "复合动力:期望 (2,1)" }),
    apply: () => set({ phi1: 0.5, phi2: 0.2, theta1: 0.4, theta2: 0, T: 400, seed: 42 }) },
];

export const ARIMATool = () => {
  const { t } = useTranslation();
  const [phi1, setPhi1] = useState(0.5);
  const [phi2, setPhi2] = useState(0.2);
  const [theta1, setTheta1] = useState(0.4);
  const [theta2, setTheta2] = useState(0);
  const [T, setT] = useState(400);
  const [seed, setSeed] = useState(42);

  const data = useMemo(() => {
    const phiTrue = [phi1, phi2].filter((_, i) => Math.abs([phi1, phi2][i]) > 1e-9);
    const thetaTrue = [theta1, theta2].filter((_, i) => Math.abs([theta1, theta2][i]) > 1e-9);
    const y = simulateARMA(T, [phi1, phi2], [theta1, theta2], 1.0, seed);

    // AIC/BIC grid over (p,q) ∈ [0..3]²
    const grid: { p: number; q: number; aic: number; bic: number }[] = [];
    let best: { p: number; q: number; aic: number; bic: number; coef: number[] } | null = null;
    for (let p = 0; p <= 3; p++) for (let q = 0; q <= 3; q++) {
      const fit = fitARMA(y, p, q);
      const n = (fit.nEff ?? y.length);
      if (!isFinite(fit.ssr) || fit.ssr <= 0) continue;
      const sig2 = fit.ssr / n;
      const ll = -0.5 * n * (Math.log(2 * Math.PI * sig2) + 1);
      const k = 1 + p + q;
      const aic = -2 * ll + 2 * k;
      const bic = -2 * ll + k * Math.log(n);
      grid.push({ p, q, aic, bic });
      if (!best || aic < best.aic) best = { p, q, aic, bic, coef: fit.coef };
    }

    // Best fit residuals + ACF
    const fitBest = best ? fitARMA(y, best.p, best.q) : fitARMA(y, 0, 0);
    const start = Math.max(best?.p ?? 0, best?.q ?? 0, 10);
    const residTail = fitBest.resid.slice(start);
    const acfRes = acf(residTail, 20);
    const lbCi = 1.96 / Math.sqrt(residTail.length);

    // Ljung-Box Q(10)
    let Q = 0; const m = 10;
    for (let k = 1; k <= m; k++) Q += acfRes[k - 1] ** 2 / (residTail.length - k);
    Q *= residTail.length * (residTail.length + 2);

    // Rolling 1-step forecast on last 60 points
    const fLen = Math.min(60, Math.floor(T / 4));
    const series = y.map((v, t) => ({ t, y: v, pred: null as number | null, lo: null as number | null, hi: null as number | null }));
    if (best) {
      const sig = Math.sqrt(fitBest.ssr / Math.max(1, (fitBest.nEff ?? y.length)));
      // Re-run fit using only first T-fLen
      const yTrain = y.slice(0, T - fLen);
      const refit = fitARMA(yTrain, best.p, best.q);
      // Step-ahead in-sample-style: at each t in [T-fLen, T) use known y up to t-1 and refit's residuals
      // For simplicity reuse refit residuals proxy via long AR on full series eps
      const epsAll = fitBest.resid;
      for (let t = T - fLen; t < T; t++) {
        let pred = refit.coef[0];
        for (let i = 1; i <= best.p; i++) pred += refit.coef[i] * y[t - i];
        for (let j = 1; j <= best.q; j++) pred += refit.coef[best.p + j] * (epsAll[t - j] || 0);
        series[t].pred = pred;
        series[t].lo = pred - 1.96 * sig;
        series[t].hi = pred + 1.96 * sig;
      }
    }

    return { y, grid, best, acfRes, lbCi, Q, series, sig: Math.sqrt(fitBest.ssr / Math.max(1, (fitBest.nEff ?? y.length))) };
  }, [phi1, phi2, theta1, theta2, T, seed]);

  const aicMap = data.grid.reduce((m, g) => { m[`${g.p},${g.q}`] = g.aic; return m; }, {} as Record<string, number>);
  const minAic = Math.min(...data.grid.map(g => g.aic));
  const maxAic = Math.max(...data.grid.map(g => g.aic));

  return (
    <div className="space-y-6">
      <PresetButtons
        presets={arimaPresets(t, (v) => { setPhi1(v.phi1); setPhi2(v.phi2); setTheta1(v.theta1); setTheta2(v.theta2); setT(v.T); setSeed(v.seed); })}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Slider label="AR φ₁"     value={phi1}   min={-0.95} max={0.95} step={0.05} onChange={setPhi1} />
          <Slider label="AR φ₂"     value={phi2}   min={-0.6}  max={0.6}  step={0.05} onChange={setPhi2} />
          <Slider label="MA θ₁"     value={theta1} min={-0.95} max={0.95} step={0.05} onChange={setTheta1} />
          <Slider label="MA θ₂"     value={theta2} min={-0.6}  max={0.6}  step={0.05} onChange={setTheta2} />
          <Slider label={t("labs.econV21.text045", { defaultValue: "样本长度 T" })} value={T}      min={100}   max={800}  step={50}   onChange={setT} />
          <Slider label={t("labs.econV21.text046", { defaultValue: "随机种子" })}   value={seed}   min={1}     max={200}  step={1}    onChange={setSeed} />
        </div>
        <div className="space-y-2">
          <Stat label={t("labs.econV21.text047", { defaultValue: "自动选阶 (p,q)" })} value={data.best ? `(${data.best.p}, ${data.best.q})` : "—"} color={CHART_GOLD} />
          <Stat label={t("labs.econV21.text048", { defaultValue: "最小 AIC" })}      value={data.best ? data.best.aic.toFixed(1) : "—"} color={CHART_BLUE} />
          <Stat label={t("labs.econV21.text049", { defaultValue: "最小 BIC" })}      value={data.best ? data.best.bic.toFixed(1) : "—"} color={CHART_TEAL} />
          <Stat label={t("labs.econV21.text050", { defaultValue: "残差 σ̂" })}        value={isFinite(data.sig) ? data.sig.toFixed(3) : "—"} />
          <Stat label="Ljung-Box Q(10)" value={data.Q.toFixed(2)}
                color={data.Q < 18.31 ? CHART_TEAL : CHART_RED}
                sub={data.Q < 18.31 ? t("labs.econV21.text051", { defaultValue: "p>0.05 → 残差白噪声 ✓" }) : t("labs.econV21.text052", { defaultValue: "p<0.05 → 仍有结构" })} />
        </div>
      </div>

      {/* AIC heatmap as grid */}
      <div>
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">
          {t("labs.econV21.text053", { defaultValue: "AIC 网格 (p × q ∈ [0..3]) — 颜色越深越优,★ 为最优" })}
        </p>
        <div className="grid grid-cols-5 gap-1 text-[11px] font-mono">
          <div className="text-center text-muted-foreground">p \ q</div>
          {[0, 1, 2, 3].map(q => <div key={`h${q}`} className="text-center text-muted-foreground">q={q}</div>)}
          {[0, 1, 2, 3].map(p => (
            <>
              <div key={`r${p}`} className="text-center text-muted-foreground">p={p}</div>
              {[0, 1, 2, 3].map(q => {
                const aic = aicMap[`${p},${q}`];
                const norm = (aic - minAic) / Math.max(1e-6, maxAic - minAic);
                const isBest = data.best && data.best.p === p && data.best.q === q;
                const bg = `hsl(43, 80%, ${30 + norm * 50}%)`;
                return (
                  <div key={`c${p}${q}`} className="text-center py-2 rounded tabular-nums"
                       style={{ background: bg, color: norm < 0.4 ? "#fff" : "hsl(var(--background))",
                                outline: isBest ? "2px solid hsl(var(--gold))" : "none" }}>
                    {isBest && "★ "}{aic?.toFixed(0) ?? "—"}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Time series with rolling forecast band */}
      <div>
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">
          {t("labs.econV21.text054", { defaultValue: "时间序列 + 末端 1-步滚动预测 ±1.96σ̂" })}
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data.series} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
            <Area type="monotone" dataKey="hi" stroke="none" fill={CHART_GOLD} fillOpacity={0.12} />
            <Area type="monotone" dataKey="lo" stroke="none" fill="hsl(var(--background))" fillOpacity={1} />
            <Line type="monotone" dataKey="y"    stroke={CHART_BLUE} strokeWidth={1.5} dot={false} name="y_t" />
            <Line type="monotone" dataKey="pred" stroke={CHART_GOLD} strokeWidth={2}   dot={false} name={t("labs.econV21.text055", { defaultValue: "预测" })} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Residual ACF */}
      <div>
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">
          {t("labs.econV21.text056", { defaultValue: "残差 ACF (虚线 ±1.96/√T 为 95% 置信带)" })}
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data.acfRes.map((v, i) => ({ k: i + 1, acf: v }))}
                    margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="k" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} domain={[-0.4, 0.4]} />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
            <ReferenceLine y={data.lbCi}  stroke={CHART_RED} strokeDasharray="3 3" />
            <ReferenceLine y={-data.lbCi} stroke={CHART_RED} strokeDasharray="3 3" />
            <ReferenceLine y={0} stroke={CHART_TEXT} />
            <Bar dataKey="acf" fill={CHART_TEAL} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border border-gold/20 bg-secondary/20 p-4 text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">{t("labs.econV21.text057", { defaultValue: "Hannan-Rissanen 两步法:" })}</strong> {t("labs.econV21.text058", { defaultValue: "① 先用长 AR(L) 估计残差 ε̂ₜ；② 把 y_t 同时回归到 (y_" })}{`{t-i}`}, ε̂_{`{t-j}`}{t("labs.econV21.text059", { defaultValue: ")。AIC = −2ℓ + 2k, BIC = −2ℓ + k·ln(n)；BIC 一致估计真阶,AIC 渐近最优预测。" })}</p>
        <p>{t("labs.econV21.text060", { defaultValue: "Ljung-Box Q(m) ~ χ²(m−p−q):若 Q&lt;18.31 (m=10, α=0.05) 则不能拒绝白噪声 ⇒ 模型设定恰当。" })}</p>
        <p className="text-[11px] text-muted-foreground/80">Reference: Hannan & Rissanen (1982); Box, Jenkins, Reinsel (2008) <em>Time Series Analysis: Forecasting and Control</em>.</p>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   3) LOCAL PROJECTIONS (Jordà 2005)
   ════════════════════════════════════════════════════════════════ */

const lpPresets = (t: ReturnType<typeof useTranslation>["t"], set: (v: any) => void): Preset[] => [
  { name: t("labs.econV21.text061", { defaultValue: "货币冲击" }), description: t("labs.econV21.text062", { defaultValue: "x 持续,y 滞后响应" }),
    apply: () => set({ rho: 0.7, alpha: 0.6, phi: 0.4, T: 300, H: 16, seed: 42 }) },
  { name: t("labs.econV21.text063", { defaultValue: "财政冲击" }), description: t("labs.econV21.text064", { defaultValue: "x 较弱持续,y 强响应" }),
    apply: () => set({ rho: 0.4, alpha: 1.0, phi: 0.3, T: 300, H: 16, seed: 42 }) },
  { name: t("labs.econV21.text065", { defaultValue: "瞬时冲击" }), description: t("labs.econV21.text066", { defaultValue: "x 无持续,IRF 单期反应" }),
    apply: () => set({ rho: 0.0, alpha: 0.8, phi: 0.5, T: 300, H: 16, seed: 42 }) },
  { name: t("labs.econV21.text067", { defaultValue: "无响应" }), description: t("labs.econV21.text068", { defaultValue: "α≈0,IRF 应平直 0" }),
    apply: () => set({ rho: 0.6, alpha: 0.0, phi: 0.5, T: 300, H: 16, seed: 42 }) },
];

export const LocalProjectionTool = () => {
  const { t } = useTranslation();
  const [rho, setRho] = useState(0.7);
  const [alpha, setAlpha] = useState(0.6);
  const [phi, setPhi] = useState(0.4);
  const [T, setT] = useState(300);
  const [H, setH] = useState(16);
  const [seed, setSeed] = useState(42);

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    // DGP: VAR(1)
    //   x_t = ρ x_{t-1}                + ε^x_t
    //   y_t = α x_{t-1} + φ y_{t-1}    + ε^y_t
    const x = new Array(T).fill(0); const y = new Array(T).fill(0);
    for (let t = 1; t < T; t++) {
      x[t] = rho * x[t - 1] + randn(rng);
      y[t] = alpha * x[t - 1] + phi * y[t - 1] + randn(rng);
    }

    // Local Projections: for each h, regress y_{t+h} on x_t with controls (y_{t-1}, x_{t-1}, intercept)
    const lpIRF: { h: number; lp: number; lpLo: number; lpHi: number; var: number }[] = [];
    for (let h = 0; h <= H; h++) {
      const X: number[][] = []; const yy: number[] = [];
      for (let t = 1; t + h < T; t++) {
        X.push([1, x[t], y[t - 1], x[t - 1]]);
        yy.push(y[t + h]);
      }
      if (X.length < 10) { lpIRF.push({ h, lp: 0, lpLo: 0, lpHi: 0, var: 0 }); continue; }
      const b = olsBeta(X, yy);
      // SE for coef[1] using HAC-lite (Newey-West with bw = h+1)
      let resid: number[] = new Array(yy.length).fill(0);
      for (let i = 0; i < yy.length; i++) {
        let pred = 0; for (let j = 0; j < 4; j++) pred += X[i][j] * b[j];
        resid[i] = yy[i] - pred;
      }
      // Robust (HC0) on coef[1] only:
      // Var(b) = (X'X)^{-1} X' Ω X (X'X)^{-1}; here we approximate with (X'X)^{-1} * sum(x²·e²)/(X'X)
      // Simpler: white SE on x partialled out.
      // We compute residual from regression of x on other regressors, then SE = std(resid_y * resid_x) / sum(resid_x²)
      const Xother: number[][] = X.map(r => [r[0], r[2], r[3]]);
      const bo = olsBeta(Xother, X.map(r => r[1]));
      const xtilde = X.map((r, i) => r[1] - (bo[0] + bo[1] * r[2] + bo[2] * r[3]));
      const sumx2 = xtilde.reduce((s, v) => s + v * v, 0);
      // Newey-West with lag = h
      let omega = 0;
      for (let i = 0; i < xtilde.length; i++) omega += (xtilde[i] * resid[i]) ** 2;
      for (let l = 1; l <= h; l++) {
        const w = 1 - l / (h + 1);
        let cov = 0;
        for (let i = l; i < xtilde.length; i++) cov += (xtilde[i] * resid[i]) * (xtilde[i - l] * resid[i - l]);
        omega += 2 * w * cov;
      }
      const seB = Math.sqrt(omega) / Math.max(1e-10, sumx2);
      lpIRF.push({ h, lp: b[1], lpLo: b[1] - 1.96 * seB, lpHi: b[1] + 1.96 * seB, var: seB ** 2 });
    }

    // VAR(1) Wold IRF: theoretical IRF of y to ε^x (one-period delayed in DGP)
    // Companion form: z_t = [x_t, y_t]'; A = [[ρ, 0], [α, φ]];  shock e = [1, 0]'
    // IRF_h = A^h e ; record y component
    const A = [[rho, 0], [alpha, phi]];
    const varIRF: { h: number; v: number }[] = [];
    let v: number[] = [1, 0]; // immediate response x=1, y=0
    varIRF.push({ h: 0, v: v[1] });
    for (let h = 1; h <= H; h++) {
      v = [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]];
      varIRF.push({ h, v: v[1] });
    }

    const merged = lpIRF.map((d, i) => ({
      h: d.h, lp: d.lp, lpLo: d.lpLo, lpHi: d.lpHi, var: varIRF[i].v,
    }));

    return { merged, lpIRF, varIRF };
  }, [rho, alpha, phi, T, H, seed]);

  return (
    <div className="space-y-6">
      <PresetButtons
        presets={lpPresets(t, (v) => { setRho(v.rho); setAlpha(v.alpha); setPhi(v.phi); setT(v.T); setH(v.H); setSeed(v.seed); })}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Slider label={t("labs.econV21.text069", { defaultValue: "x 持续性 ρ" })}  sub="x_t = ρx_{t-1}+ε" value={rho}   min={-0.9} max={0.95} step={0.05} onChange={setRho} />
          <Slider label={t("labs.econV21.text070", { defaultValue: "响应强度 α" })}  sub="y_t=αx_{t-1}+…"   value={alpha} min={-1.5} max={1.5}  step={0.05} onChange={setAlpha} />
          <Slider label={t("labs.econV21.text071", { defaultValue: "y 持续性 φ" })}                          value={phi}   min={-0.9} max={0.95} step={0.05} onChange={setPhi} />
          <Slider label={t("labs.econV21.text072", { defaultValue: "样本长度 T" })} value={T}    min={100} max={800} step={50} onChange={setT} />
          <Slider label={t("labs.econV21.text073", { defaultValue: "预测期 H" })}   value={H}    min={4}   max={24}  step={1}  onChange={setH} />
          <Slider label={t("labs.econV21.text074", { defaultValue: "随机种子" })}   value={seed} min={1}   max={200} step={1}  onChange={setSeed} />
        </div>
        <div className="space-y-2">
          <Stat label={t("labs.econV21.text075", { defaultValue: "LP IRF 峰值" })}   value={Math.max(...data.lpIRF.map(d => d.lp)).toFixed(3)} color={CHART_GOLD} />
          <Stat label={t("labs.econV21.text076", { defaultValue: "VAR Wold 峰值" })} value={Math.max(...data.varIRF.map(d => d.v)).toFixed(3)} color={CHART_BLUE} />
          <Stat label={t("labs.econV21.text077", { defaultValue: "LP-VAR 最大偏差" })}
                value={Math.max(...data.merged.map(d => Math.abs(d.lp - d.var))).toFixed(3)}
                color={CHART_TEAL}
                sub={t("labs.econV21.text078", { defaultValue: "设定正确时应趋于 0" })} />
          <Stat label={t("labs.econV21.text079", { defaultValue: "平均 95% CI 半宽" })}
                value={(data.lpIRF.reduce((s, d) => s + (d.lpHi - d.lpLo) / 2, 0) / data.lpIRF.length).toFixed(3)} />
        </div>
      </div>

      {/* IRF comparison */}
      <div>
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">
          {t("labs.econV21.text080", { defaultValue: "脉冲响应 IRF: LP (Jordà) 95% CI vs VAR(1) Wold" })}
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data.merged} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="h" stroke={CHART_TEXT} tick={{ fontSize: 10 }}
                   label={{ value: "horizon h", position: "insideBottom", offset: -2, fill: CHART_TEXT, fontSize: 10 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
            <ReferenceLine y={0} stroke={CHART_TEXT} />
            <Area type="monotone" dataKey="lpHi" stroke="none" fill={CHART_GOLD} fillOpacity={0.18} />
            <Area type="monotone" dataKey="lpLo" stroke="none" fill="hsl(var(--background))" fillOpacity={1} />
            <Line type="monotone" dataKey="lp"  stroke={CHART_GOLD} strokeWidth={2.4} dot={{ r: 3 }} name="LP β_h" />
            <Line type="monotone" dataKey="var" stroke={CHART_BLUE} strokeWidth={2}   dot={false} strokeDasharray="5 3" name="VAR Wold" />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border border-gold/20 bg-secondary/20 p-4 text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Local Projections (Jordà 2005):</strong> {t("labs.econV21.text081", { defaultValue: "对每个 horizon h" })} <em>{t("labs.econV21.text082", { defaultValue: "独立" })}</em>{t("labs.econV21.text083", { defaultValue: "跑回归 yₜ₊ₕ = α_h + β_h xₜ + γ_h Wₜ + uₜ₊ₕ；β_h 直接就是 IRF。" })}</p>
        <p><strong>{t("labs.econV21.text084", { defaultValue: "vs 传统 VAR Wold IRF:" })}</strong> {t("labs.econV21.text085", { defaultValue: "VAR 用 A^h 递推，对" })} <em>{t("labs.econV21.text086", { defaultValue: "动态错设" })}</em>{t("labs.econV21.text087", { defaultValue: "非常敏感（h 越远偏差越大被放大）。LP 不假设线性 VAR 结构，更稳健，但" })}<em>{t("labs.econV21.text088", { defaultValue: "方差大" })}</em>{t("labs.econV21.text089", { defaultValue: "且需 Newey-West HAC 标准误（误差自相关至 lag h）。" })}</p>
        <p>{t("labs.econV21.text090", { defaultValue: "当 DGP 真为 VAR(1) 时，两者应大致一致 ⇒ 偏差度量是设定正确性的诊断。" })}</p>
        <p className="text-[11px] text-muted-foreground/80">Reference: Jordà (2005) <em>Estimation and Inference of Impulse Responses by Local Projections</em>, AER 95(1), 161–182.</p>
      </div>
    </div>
  );
};

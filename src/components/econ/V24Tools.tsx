import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, Area, ComposedChart, BarChart, Bar, ScatterChart, Scatter,
} from "recharts";
import "katex/dist/katex.min.css";
import PresetButtons from "../PresetButtons";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED  = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

/* ───────── PRNG / utils ───────── */
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

const Stat = ({ label, value, color = CHART_GOLD, sub }:
  { label: string; value: string; color?: string; sub?: string }) => (
  <div className="p-3 rounded-lg border border-border bg-secondary/30 flex items-center justify-between">
    <div>
      <div className="text-xs font-mono text-muted-foreground">{label}</div>
      {sub && <div className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">{sub}</div>}
    </div>
    <span className="text-base font-mono font-semibold tabular-nums" style={{ color }}>{value}</span>
  </div>
);

/* ───────── Linear algebra ───────── */
function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[piv][i])) piv = k;
    if (Math.abs(M[piv][i]) < 1e-12) return null;
    [M[i], M[piv]] = [M[piv], M[i]];
    for (let k = i + 1; k < n; k++) {
      const f = M[k][i] / M[i][i];
      for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }
  return x;
}
function invSym(A: number[][]): number[][] | null {
  const k = A.length;
  const out: number[][] = [];
  for (let j = 0; j < k; j++) {
    const e = new Array(k).fill(0); e[j] = 1;
    const col = solveLinear(A.map(r => [...r]), e);
    if (!col) return null;
    out.push(col);
  }
  // out is column-major; transpose to row-major
  const M: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) M[i][j] = out[j][i];
  return M;
}
/** OLS on design matrix X (n x k) and y (n). Returns β and resid. */
function olsMulti(X: number[][], y: number[]): { beta: number[]; yhat: number[]; resid: number[] } | null {
  const n = X.length;
  const k = X[0].length;
  const XtX: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  const Xty: number[] = new Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < k; a++) {
      Xty[a] += X[i][a] * y[i];
      for (let b = 0; b < k; b++) XtX[a][b] += X[i][a] * X[i][b];
    }
  }
  const beta = solveLinear(XtX, Xty);
  if (!beta) return null;
  const yhat = X.map(row => row.reduce((s, v, j) => s + v * beta[j], 0));
  const resid = y.map((yi, i) => yi - yhat[i]);
  return { beta, yhat, resid };
}

/* ════════════════════════════════════════════════════════════════
   1.  Double / Debiased Machine Learning  (Chernozhukov 2018)

      y = θ·D + g(X) + ε
      D = m(X) + ν
   Cross-fitted partialling-out:
      ỹ = y − ĝ_{-k}(X),  D̃ = D − m̂_{-k}(X)
      θ̂_DML = Σ D̃·ỹ / Σ D̃²
   ════════════════════════════════════════════════════════════════ */

/** Polynomial-feature ridge regression as the "ML learner" (closed form, fast). */
function ridgeFit(X: number[][], y: number[], lambda: number): number[] | null {
  const n = X.length;
  const k = X[0].length;
  const XtX: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  const Xty: number[] = new Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < k; a++) {
      Xty[a] += X[i][a] * y[i];
      for (let b = 0; b < k; b++) XtX[a][b] += X[i][a] * X[i][b];
    }
  }
  for (let j = 1; j < k; j++) XtX[j][j] += lambda; // don't penalize intercept
  return solveLinear(XtX, Xty);
}
function polyFeatures(x1: number, x2: number, deg: number): number[] {
  // [1, x1, x2, x1², x2², x1·x2, x1³, x2³, x1²·x2, x1·x2²]
  const f = [1, x1, x2];
  if (deg >= 2) f.push(x1 * x1, x2 * x2, x1 * x2);
  if (deg >= 3) f.push(x1 * x1 * x1, x2 * x2 * x2, x1 * x1 * x2, x1 * x2 * x2);
  return f;
}

export const DoubleMLTool = () => {
  const { t } = useTranslation();
  const [n, setN] = useState(400);
  const [theta, setTheta] = useState(0.8);     // true causal effect
  const [gStrength, setGStrength] = useState(2.0); // nonlinearity of g(X)
  const [mStrength, setMStrength] = useState(1.5); // confounding via m(X)
  const [noise, setNoise] = useState(0.5);
  const [seed, setSeed] = useState(7);
  const [folds, setFolds] = useState(5);
  const [polyDeg, setPolyDeg] = useState<2 | 3>(3);

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    const X1: number[] = [], X2: number[] = [], D: number[] = [], Y: number[] = [];
    for (let i = 0; i < n; i++) {
      const x1 = randn(rng);
      const x2 = randn(rng);
      const m = mStrength * (Math.sin(x1) + 0.5 * x2 * x2 - 0.5);   // nonlinear treatment assignment
      const g = gStrength * (Math.cos(1.2 * x1) + 0.3 * x2 * x1);   // nonlinear outcome confounding
      const d = m + randn(rng) * 0.7;
      const y = theta * d + g + randn(rng) * noise;
      X1.push(x1); X2.push(x2); D.push(d); Y.push(y);
    }

    /* (a) Naive OLS: regress y on (1, D) — confounded. */
    const Xnaive = D.map(d => [1, d]);
    const naive = olsMulti(Xnaive, Y);
    const thetaNaive = naive ? naive.beta[1] : NaN;

    /* (b) "Long" OLS with linear controls — still misspecified. */
    const Xlin = D.map((d, i) => [1, d, X1[i], X2[i]]);
    const longOls = olsMulti(Xlin, Y);
    const thetaLong = longOls ? longOls.beta[1] : NaN;

    /* (c) DML with K-fold cross-fit ridge polynomial nuisances. */
    const idx = Array.from({ length: n }, (_, i) => i);
    // simple deterministic shuffle by seed to keep results stable
    const rng2 = mulberry32(seed + 13);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng2() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    const foldOf = new Array(n).fill(0).map((_, k) => k % folds);
    const fold = new Array(n).fill(0);
    for (let i = 0; i < n; i++) fold[idx[i]] = foldOf[i];

    const Yres = new Array(n).fill(0);
    const Dres = new Array(n).fill(0);
    for (let f = 0; f < folds; f++) {
      const trainX: number[][] = [], trainY: number[] = [], trainD: number[] = [];
      for (let i = 0; i < n; i++) if (fold[i] !== f) {
        trainX.push(polyFeatures(X1[i], X2[i], polyDeg));
        trainY.push(Y[i]); trainD.push(D[i]);
      }
      const bY = ridgeFit(trainX, trainY, 1.0);
      const bD = ridgeFit(trainX, trainD, 1.0);
      if (!bY || !bD) continue;
      for (let i = 0; i < n; i++) if (fold[i] === f) {
        const phi = polyFeatures(X1[i], X2[i], polyDeg);
        const yh = phi.reduce((s, v, j) => s + v * bY[j], 0);
        const dh = phi.reduce((s, v, j) => s + v * bD[j], 0);
        Yres[i] = Y[i] - yh;
        Dres[i] = D[i] - dh;
      }
    }
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { num += Dres[i] * Yres[i]; den += Dres[i] * Dres[i]; }
    const thetaDML = den > 0 ? num / den : NaN;
    // robust SE (Neyman-orthogonal): Var(θ̂) = (1/n) E[D̃²]⁻² · E[D̃²·ψ²]
    let psi2 = 0;
    for (let i = 0; i < n; i++) {
      const r = Yres[i] - thetaDML * Dres[i];
      psi2 += Dres[i] * Dres[i] * r * r;
    }
    const seDML = Math.sqrt(psi2) / Math.max(den, 1e-9);

    // OLS naive SE
    const seNaive = (() => {
      if (!naive) return NaN;
      const ssr = naive.resid.reduce((s, e) => s + e * e, 0);
      const sigma2 = ssr / Math.max(n - 2, 1);
      const mD = D.reduce((s, v) => s + v, 0) / n;
      let sxx = 0; for (let i = 0; i < n; i++) sxx += (D[i] - mD) ** 2;
      return Math.sqrt(sigma2 / sxx);
    })();

    /* Scatter for visual: D̃ vs ỹ should align on slope = θ */
    const scatter = Dres.map((d, i) => ({ d: +d.toFixed(3), y: +Yres[i].toFixed(3) }));

    /* Comparison bars */
    const bars = [
      { name: "Naive OLS (y~D)",    val: +thetaNaive.toFixed(3), bias: +(thetaNaive - theta).toFixed(3) },
      { name: "Long OLS (linear X)", val: +thetaLong.toFixed(3),  bias: +(thetaLong - theta).toFixed(3) },
      { name: "DML (cross-fit)",    val: +thetaDML.toFixed(3),   bias: +(thetaDML - theta).toFixed(3) },
      { name: "True θ",              val: +theta.toFixed(3),       bias: 0 },
    ];
    return { thetaNaive, thetaLong, thetaDML, seDML, seNaive, scatter, bars };
  }, [n, theta, gStrength, mStrength, noise, seed, folds, polyDeg]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.econV24.text001", { defaultValue: "强非线性混淆" }), description: t("labs.econV24.text002", { defaultValue: "g,m 高度非线性 → OLS 严重偏误" }), apply: () => { setGStrength(2.5); setMStrength(2); setTheta(0.8); setNoise(0.4); } },
        { name: t("labs.econV24.text003", { defaultValue: "弱混淆" }), description: t("labs.econV24.text004", { defaultValue: "g,m 接近线性 → OLS 与 DML 接近" }), apply: () => { setGStrength(0.4); setMStrength(0.3); setTheta(0.8); setNoise(0.5); } },
        { name: t("labs.econV24.text005", { defaultValue: "高维样本" }), description: t("labs.econV24.text006", { defaultValue: "n=800,凸显交叉拟合稳定性" }), apply: () => { setN(800); setGStrength(2); setMStrength(1.5); setFolds(5); } },
        { name: "K=2 cross-fit", description: t("labs.econV24.text007", { defaultValue: "最小样本拆分,方差↑" }), apply: () => { setFolds(2); setN(300); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label={t("labs.econV24.text008", { defaultValue: "样本量 n" })} value={n} min={100} max={1500} step={50} onChange={setN} />
          <Slider label={t("labs.econV24.text009", { defaultValue: "真实因果效应 θ" })} value={theta} min={-1.5} max={2} step={0.05} onChange={setTheta} />
          <Slider label={t("labs.econV24.text010", { defaultValue: "g(X) 非线性强度" })} sub={t("labs.econV24.text011", { defaultValue: "结果方程混淆" })} value={gStrength} min={0} max={3} step={0.1} onChange={setGStrength} />
          <Slider label={t("labs.econV24.text012", { defaultValue: "m(X) 非线性强度" })} sub={t("labs.econV24.text013", { defaultValue: "处理分配机制" })} value={mStrength} min={0} max={3} step={0.1} onChange={setMStrength} />
          <Slider label={t("labs.econV24.text014", { defaultValue: "噪声 σ_ε" })} value={noise} min={0.1} max={2} step={0.05} onChange={setNoise} />
          <Slider label="K-fold cross-fit" value={folds} min={2} max={10} step={1} onChange={setFolds} />
          <Slider label={t("labs.econV24.text015", { defaultValue: "多项式次数 deg" })} value={polyDeg} min={2} max={3} step={1} onChange={(v) => setPolyDeg(v as 2 | 3)} />
          <Slider label={t("labs.econV24.text016", { defaultValue: "随机种子" })} value={seed} min={1} max={999} step={1} onChange={setSeed} />
        </div>
        <div className="space-y-3">
          <Stat label={t("labs.econV24.text017", { defaultValue: "真实 θ" })} value={theta.toFixed(3)} color={CHART_BLUE} />
          <Stat label="Naive OLS θ̂" value={`${data.thetaNaive.toFixed(3)} (SE ${data.seNaive.toFixed(3)})`} color={CHART_RED} sub={t("labs.econV24.text018", { defaultValue: "偏误 {{v1}}", v1: (data.thetaNaive - theta).toFixed(3) })} />
          <Stat label="Long OLS θ̂" value={data.thetaLong.toFixed(3)} color={CHART_TEAL} sub={t("labs.econV24.text019", { defaultValue: "偏误 {{v1}}", v1: (data.thetaLong - theta).toFixed(3) })} />
          <Stat label="DML θ̂ (cross-fit)" value={`${data.thetaDML.toFixed(3)} (SE ${data.seDML.toFixed(3)})`} color={CHART_GOLD} sub={t("labs.econV24.text020", { defaultValue: "偏误 {{v1}}", v1: (data.thetaDML - theta).toFixed(3) })} />
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">
            <p><span className="text-gold">{t("labs.econV24.text021", { defaultValue: "Neyman 正交性" })}</span>{t("labs.econV24.text022", { defaultValue: ":DML 用 ML 拟合 ĝ, m̂ 后做 partialling-out,使一阶矩条件对 ĝ, m̂ 的扰动鲁棒。" })}</p>
            <p>{t("labs.econV24.text023", { defaultValue: "偏误 √n·(θ̂−θ) 收敛速度 = ML 学习器收敛速度的乘积 → 即使 ML 收敛慢于 √n,DML 仍 √n-一致。" })}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.econV24.text024", { defaultValue: "θ 估计对比 (横线为真值)" })}</h4>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.bars} margin={{ top: 10, right: 20, bottom: 30, left: 0 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke={CHART_TEXT} tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                <ReferenceLine y={theta} stroke={CHART_BLUE} strokeDasharray="4 3" label={{ value: `θ=${theta}`, fill: CHART_BLUE, fontSize: 10 }} />
                <Bar dataKey="val" fill={CHART_GOLD} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.econV24.text025", { defaultValue: "Partialling-out 散点 D̃ vs ỹ (斜率 = θ̂_DML)" })}</h4>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis type="number" dataKey="d" stroke={CHART_TEXT} tick={{ fontSize: 10 }} name="D̃" />
                <YAxis type="number" dataKey="y" stroke={CHART_TEXT} tick={{ fontSize: 10 }} name="ỹ" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                <ReferenceLine segment={[{ x: -3, y: -3 * data.thetaDML }, { x: 3, y: 3 * data.thetaDML }]} stroke={CHART_GOLD} strokeWidth={2} />
                <Scatter data={data.scatter} fill={CHART_TEAL} fillOpacity={0.5} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gold/20 bg-secondary/20 p-4 text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Double/Debiased ML (Chernozhukov et al. 2018):</strong></p>
        <p>• <em>Step 1 (cross-fit):</em> {t("labs.econV24.text026", { defaultValue: "将样本分 K 折,每折用 K−1 折训练 ML 模型 (此处用多项式 ridge 代理) 估 ĝ(X)=E[Y|X], m̂(X)=E[D|X]" })}</p>
        <p>• <em>Step 2 (residual on residual):</em> {t("labs.econV24.text027", { defaultValue: "ỹ = y − ĝ, D̃ = D − m̂,然后 θ̂ = Σ D̃·ỹ / Σ D̃²" })}</p>
        <p>{t("labs.econV24.text028", { defaultValue: "• 与 long OLS 对比:线性控制无法吸收 g 和 m 的非线性,残余偏误污染 θ̂_OLS" })}</p>
        <p>• Neyman orthogonal score:∂_η M(W; θ, η)|_{"{η=η_0}"} {t("labs.econV24.text029", { defaultValue: "= 0,使 √n·(θ̂−θ) 渐近正态且方差不依赖 ML 收敛速度" })}</p>
        <p className="text-[11px] text-muted-foreground/80">Reference: Chernozhukov V., Chetverikov D., Demirer M., Duflo E., Hansen C., Newey W., Robins J. (2018) <em>Double/debiased machine learning for treatment and structural parameters</em>, Econometrics Journal 21(1).</p>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   2.  Causal Forest / GRF  (Athey & Wager 2018, simplified)

      Estimates heterogeneous treatment effect τ(x) = E[Y(1) − Y(0) | X=x]
      via a forest of "honest" causal trees built on residualized (D̃, ỹ).
      We approximate with B kernel-weighted local 2SLS estimators around
      each evaluation point (analogous to honest local averaging).
   ════════════════════════════════════════════════════════════════ */

export const CausalForestTool = () => {
  const { t } = useTranslation();
  const [n, setN] = useState(500);
  const [tauMode, setTauMode] = useState<"linear" | "step" | "sigmoid">("sigmoid");
  const [noise, setNoise] = useState(0.6);
  const [bandwidth, setBandwidth] = useState(0.5);
  const [seed, setSeed] = useState(11);

  const trueTau = (x: number) => {
    if (tauMode === "linear") return 0.5 + 0.8 * x;
    if (tauMode === "step")   return x > 0 ? 1.5 : 0.2;
    return 1.0 / (1.0 + Math.exp(-2.5 * x));
  };

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    const X: number[] = [], D: number[] = [], Y: number[] = [];
    for (let i = 0; i < n; i++) {
      const x = (rng() * 4 - 2);                 // U(-2, 2)
      const propensity = 1.0 / (1.0 + Math.exp(-0.4 * x));
      const d = rng() < propensity ? 1 : 0;
      const tau = trueTau(x);
      const baseline = 0.3 * x * x - 0.5 * x;
      const y = baseline + tau * d + randn(rng) * noise;
      X.push(x); D.push(d); Y.push(y);
    }
    /* Step (a): residualize Y and D on X using polynomial ridge (cross-fit K=5). */
    const folds = 5;
    const fold = X.map((_, i) => i % folds);
    const Yres = new Array(n).fill(0);
    const Dres = new Array(n).fill(0);
    for (let f = 0; f < folds; f++) {
      const tX: number[][] = [], tY: number[] = [], tD: number[] = [];
      for (let i = 0; i < n; i++) if (fold[i] !== f) {
        tX.push([1, X[i], X[i] * X[i], X[i] * X[i] * X[i]]);
        tY.push(Y[i]); tD.push(D[i]);
      }
      const bY = ridgeFit(tX, tY, 0.5);
      const bD = ridgeFit(tX, tD, 0.5);
      if (!bY || !bD) continue;
      for (let i = 0; i < n; i++) if (fold[i] === f) {
        const phi = [1, X[i], X[i] * X[i], X[i] * X[i] * X[i]];
        Yres[i] = Y[i] - phi.reduce((s, v, j) => s + v * bY[j], 0);
        Dres[i] = D[i] - phi.reduce((s, v, j) => s + v * bD[j], 0);
      }
    }

    /* Step (b): kernel-weighted local moment τ̂(x0) = Σ K_h(X_i-x0) D̃_i ỹ_i / Σ K_h D̃_i². */
    const grid: number[] = [];
    for (let g = -2; g <= 2.0001; g += 0.1) grid.push(+g.toFixed(3));
    const curve = grid.map(x0 => {
      let num = 0, den = 0, wsum = 0;
      for (let i = 0; i < n; i++) {
        const u = (X[i] - x0) / bandwidth;
        if (Math.abs(u) > 1) continue;
        const w = (1 - u * u);                  // Epanechnikov kernel
        num += w * Dres[i] * Yres[i];
        den += w * Dres[i] * Dres[i];
        wsum += w;
      }
      const tauHat = den > 1e-6 ? num / den : NaN;
      // local SE via plug-in
      let psi2 = 0;
      for (let i = 0; i < n; i++) {
        const u = (X[i] - x0) / bandwidth;
        if (Math.abs(u) > 1) continue;
        const w = (1 - u * u);
        const r = Yres[i] - tauHat * Dres[i];
        psi2 += w * w * Dres[i] * Dres[i] * r * r;
      }
      const se = den > 1e-6 ? Math.sqrt(psi2) / den : NaN;
      const tauTrue = trueTau(x0);
      return {
        x: x0,
        tau: +tauHat.toFixed(4),
        lo: +(tauHat - 1.96 * se).toFixed(4),
        hi: +(tauHat + 1.96 * se).toFixed(4),
        band: [+(tauHat - 1.96 * se).toFixed(4), +(tauHat + 1.96 * se).toFixed(4)] as [number, number],
        truth: +tauTrue.toFixed(4),
        n_eff: +wsum.toFixed(1),
      };
    });

    /* Variable importance proxy: variance of τ̂(x) along grid */
    const tauVals = curve.filter(p => Number.isFinite(p.tau)).map(p => p.tau);
    const meanTau = tauVals.reduce((s, v) => s + v, 0) / Math.max(tauVals.length, 1);
    const varTau = tauVals.reduce((s, v) => s + (v - meanTau) ** 2, 0) / Math.max(tauVals.length, 1);

    /* Average treatment effect (residual-on-residual, full sample) */
    let aNum = 0, aDen = 0;
    for (let i = 0; i < n; i++) { aNum += Dres[i] * Yres[i]; aDen += Dres[i] * Dres[i]; }
    const ATE = aDen > 0 ? aNum / aDen : NaN;

    return { curve, ATE, varTau, meanTau };
  }, [n, tauMode, noise, bandwidth, seed]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.econV24.text030", { defaultValue: "Sigmoid 异质性" }), description: t("labs.econV24.text031", { defaultValue: "τ(x) 平滑 S 形 → 经典 GRF 用例" }), apply: () => { setTauMode("sigmoid"); setN(500); setBandwidth(0.5); setNoise(0.6); } },
        { name: t("labs.econV24.text032", { defaultValue: "线性异质性" }), description: "τ(x)=0.5+0.8x", apply: () => { setTauMode("linear"); setN(500); setBandwidth(0.5); } },
        { name: t("labs.econV24.text033", { defaultValue: "阶跃异质性" }), description: t("labs.econV24.text034", { defaultValue: "x>0 治疗效果跳升" }), apply: () => { setTauMode("step"); setBandwidth(0.3); setN(700); } },
        { name: t("labs.econV24.text035", { defaultValue: "宽带宽过平滑" }), description: t("labs.econV24.text036", { defaultValue: "h=1.0 → 偏差↑方差↓" }), apply: () => { setBandwidth(1.0); setN(500); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label={t("labs.econV24.text037", { defaultValue: "样本量 n" })} value={n} min={100} max={1500} step={50} onChange={setN} />
          <Slider label={t("labs.econV24.text038", { defaultValue: "噪声 σ_ε" })} value={noise} min={0.1} max={1.5} step={0.05} onChange={setNoise} />
          <Slider label={t("labs.econV24.text039", { defaultValue: "核带宽 h" })} sub={t("labs.econV24.text040", { defaultValue: "局部估计窗" })} value={bandwidth} min={0.1} max={1.5} step={0.05} onChange={setBandwidth} />
          <Slider label={t("labs.econV24.text041", { defaultValue: "随机种子" })} value={seed} min={1} max={999} step={1} onChange={setSeed} />
          <div className="flex gap-2">
            {(["linear", "step", "sigmoid"] as const).map(m => (
              <button key={m} onClick={() => setTauMode(m)}
                className={`flex-1 px-3 py-2 rounded text-xs font-mono transition-colors ${tauMode === m ? "bg-gold text-background" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
                τ: {m}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Stat label={t("labs.econV24.text042", { defaultValue: "ATE 平均处理效应" })} value={data.ATE.toFixed(4)} color={CHART_GOLD} />
          <Stat label={t("labs.econV24.text043", { defaultValue: "HTE 方差 Var(τ̂)" })} value={data.varTau.toFixed(4)} color={CHART_TEAL} sub={t("labs.econV24.text044", { defaultValue: "τ(x) 异质性强度代理" })} />
          <Stat label={t("labs.econV24.text045", { defaultValue: "τ̂ 网格均值" })} value={data.meanTau.toFixed(4)} color={CHART_BLUE} />
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">
            <p><span className="text-gold">{t("labs.econV24.text046", { defaultValue: "解读" })}</span>{t("labs.econV24.text047", { defaultValue: ":每点 τ̂(x₀) = 局部 partialling-out 估计,带 95% 渐近 CI。" })}</p>
            <p>{t("labs.econV24.text048", { defaultValue: "真实 τ(x) 与 τ̂(x) 重合度衡量异质性识别质量;CI 在数据稀疏区段显著变宽。" })}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.econV24.text049", { defaultValue: "CATE 曲线 τ̂(x) ± 95% CI vs 真实 τ(x)" })}</h4>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.curve} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="x" type="number" domain={[-2, 2]} stroke={CHART_TEXT} tick={{ fontSize: 11 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="band" fill={CHART_GOLD} fillOpacity={0.18} stroke="none" name="95% CI" />
              <Line type="monotone" dataKey="tau" stroke={CHART_GOLD} strokeWidth={2.5} dot={false} name="τ̂(x) Causal Forest" />
              <Line type="monotone" dataKey="truth" stroke={CHART_BLUE} strokeWidth={2} strokeDasharray="5 4" dot={false} name={t("labs.econV24.text050", { defaultValue: "真实 τ(x)" })} />
              <ReferenceLine y={0} stroke={CHART_GRID} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border border-gold/20 bg-secondary/20 p-4 text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Causal Forest / Generalized Random Forest (Athey & Wager 2018):</strong></p>
        <p>• <em>Honest splitting</em>{t("labs.econV24.text051", { defaultValue: ":一半样本决定分裂结构,另一半样本估叶子内 τ̂,确保 √n 渐近正态" })}</p>
        <p>• <em>Local moment equation</em>{t("labs.econV24.text052", { defaultValue: ":τ̂(x) 解 Σ α_i(x) ψ(W_i; τ̂, ν̂) = 0,其中 α_i(x) 为森林叶子共占率" })}</p>
        <p>{t("labs.econV24.text053", { defaultValue: "• 本工具用" })} <em>{t("labs.econV24.text054", { defaultValue: "核加权局部 partialling-out" })}</em> {t("labs.econV24.text055", { defaultValue: "近似:Epanechnikov 核 K_h(X_i−x₀) 替代森林权重 α_i(x)" })}</p>
        <p>{t("labs.econV24.text056", { defaultValue: "• 与 DML 关系:DML 给一个标量 ATE,Causal Forest 给整条 τ(x);二者用相同的 Neyman orthogonal score" })}</p>
        <p className="text-[11px] text-muted-foreground/80">Reference: Athey S., Tibshirani J., Wager S. (2019) <em>Generalized Random Forests</em>, Annals of Statistics 47(2);
          Wager S. & Athey S. (2018) <em>Estimation and Inference of Heterogeneous Treatment Effects using Random Forests</em>, JASA 113(523).</p>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   3.  Bayesian Linear Regression  (Normal-Inverse-Gamma conjugate)

      Prior:    β | σ² ~ N(β₀, σ² Λ₀⁻¹),  σ² ~ Inv-Gamma(a₀, b₀)
      Posterior closed form:
        Λn = X'X + Λ₀
        βn = Λn⁻¹ (X'y + Λ₀ β₀)
        an = a₀ + n/2
        bn = b₀ + ½ (y'y + β₀'Λ₀β₀ - βn'Λn βn)
      Posterior predictive:  y* | x* ~ t_{2an}( x*'βn,  bn/an · (1 + x*'Λn⁻¹ x*) )
   ════════════════════════════════════════════════════════════════ */

function studentT_pdf(t: number, df: number): number {
  // Standard t-distribution density.
  const lg = (z: number) => {
    // Lanczos log-gamma
    const g = 7;
    const c = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lg(1 - z);
    z -= 1;
    let x = c[0];
    for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
    const tt = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(tt) - tt + Math.log(x);
  };
  const ln = lg((df + 1) / 2) - lg(df / 2) - 0.5 * Math.log(df * Math.PI)
    - ((df + 1) / 2) * Math.log(1 + (t * t) / df);
  return Math.exp(ln);
}

export const BayesianRegTool = () => {
  const { t } = useTranslation();
  const [n, setN] = useState(40);
  const [trueBeta1, setTrueBeta1] = useState(1.5);
  const [noise, setNoise] = useState(1.0);
  const [priorMean, setPriorMean] = useState(0);
  const [priorPrec, setPriorPrec] = useState(0.5); // Λ₀ diag (precision); higher = stronger prior
  const [seed, setSeed] = useState(3);

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    const xs: number[] = [], ys: number[] = [];
    for (let i = 0; i < n; i++) {
      const x = (i / Math.max(n - 1, 1)) * 4 - 2;   // grid x in [-2, 2]
      const y = 0.3 + trueBeta1 * x + randn(rng) * noise;
      xs.push(x); ys.push(y);
    }
    /* Build design X = [1, x] */
    const X = xs.map(x => [1, x]);

    /* OLS reference */
    const ols = olsMulti(X, ys);
    const ssr = ols ? ols.resid.reduce((s, e) => s + e * e, 0) : NaN;
    const sigma2_ols = ssr / Math.max(n - 2, 1);
    const XtX = [[0, 0], [0, 0]];
    const Xty = [0, 0];
    for (let i = 0; i < n; i++) {
      Xty[0] += ys[i]; Xty[1] += xs[i] * ys[i];
      XtX[0][0] += 1; XtX[0][1] += xs[i];
      XtX[1][0] += xs[i]; XtX[1][1] += xs[i] * xs[i];
    }
    const XtXinv = invSym(XtX)!;
    const seOlsBeta1 = Math.sqrt(sigma2_ols * XtXinv[1][1]);

    /* Bayesian update */
    const Lam0 = [[priorPrec, 0], [0, priorPrec]];
    const beta0 = [priorMean, priorMean];
    const Lamn = [
      [XtX[0][0] + Lam0[0][0], XtX[0][1] + Lam0[0][1]],
      [XtX[1][0] + Lam0[1][0], XtX[1][1] + Lam0[1][1]],
    ];
    const Lam0_b0 = [Lam0[0][0] * beta0[0] + Lam0[0][1] * beta0[1], Lam0[1][0] * beta0[0] + Lam0[1][1] * beta0[1]];
    const rhs = [Xty[0] + Lam0_b0[0], Xty[1] + Lam0_b0[1]];
    const Lamn_inv = invSym(Lamn)!;
    const betaN = [Lamn_inv[0][0] * rhs[0] + Lamn_inv[0][1] * rhs[1], Lamn_inv[1][0] * rhs[0] + Lamn_inv[1][1] * rhs[1]];

    const a0 = 2, b0 = 2;
    const an = a0 + n / 2;
    let yty = 0;
    for (let i = 0; i < n; i++) yty += ys[i] * ys[i];
    const b0Lb0 = beta0[0] * Lam0_b0[0] + beta0[1] * Lam0_b0[1];
    const bnLnbn = betaN[0] * (Lamn[0][0] * betaN[0] + Lamn[0][1] * betaN[1])
                 + betaN[1] * (Lamn[1][0] * betaN[0] + Lamn[1][1] * betaN[1]);
    const bn = b0 + 0.5 * (yty + b0Lb0 - bnLnbn);

    // Posterior σ² mean (Inv-Gamma): bn / (an - 1)
    const sigma2_post = bn / Math.max(an - 1, 1);
    // Marginal posterior of β: Multivariate-t with df = 2 an, scale = (bn/an) Λn⁻¹
    const dfPost = 2 * an;
    const seBetaN1 = Math.sqrt((bn / an) * Lamn_inv[1][1]);

    /* Posterior predictive band along x grid */
    const grid: number[] = [];
    for (let g = -2; g <= 2.0001; g += 0.1) grid.push(+g.toFixed(3));
    const band = grid.map(x => {
      const xp = [1, x];
      const mean = xp[0] * betaN[0] + xp[1] * betaN[1];
      // Var(y* | x*) under posterior predictive (marginal t)
      const xLx = xp[0] * (Lamn_inv[0][0] * xp[0] + Lamn_inv[0][1] * xp[1])
                + xp[1] * (Lamn_inv[1][0] * xp[0] + Lamn_inv[1][1] * xp[1]);
      const scale2 = (bn / an) * (1 + xLx);
      const se = Math.sqrt(scale2);
      const tCrit = 1.96 + 2 / Math.max(dfPost, 4); // small df adj.
      return {
        x,
        mean: +mean.toFixed(4),
        ols: ols ? +(ols.beta[0] + ols.beta[1] * x).toFixed(4) : NaN,
        truth: +(0.3 + trueBeta1 * x).toFixed(4),
        band: [+(mean - tCrit * se).toFixed(4), +(mean + tCrit * se).toFixed(4)] as [number, number],
      };
    });
    const samples = xs.map((x, i) => ({ x, y: ys[i] }));

    /* Posterior density of β₁ (marginal t) */
    const grid2: number[] = [];
    const center = betaN[1];
    const span = 4 * seBetaN1 + 0.001;
    for (let g = -50; g <= 50; g++) grid2.push(+(center + (g / 50) * span).toFixed(4));
    const post = grid2.map(b1 => {
      const tStat = (b1 - betaN[1]) / seBetaN1;
      return {
        b1,
        post: +(studentT_pdf(tStat, dfPost) / seBetaN1).toFixed(5),
      };
    });

    return {
      betaN, sigma2_post, dfPost, seBetaN1,
      ols_b: ols ? ols.beta : [NaN, NaN], seOlsBeta1, sigma2_ols,
      band, samples, post,
    };
  }, [n, trueBeta1, noise, priorMean, priorPrec, seed]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.econV24.text057", { defaultValue: "弱先验 (≈OLS)" }), description: t("labs.econV24.text058", { defaultValue: "Λ₀=0.05,后验由数据主导" }), apply: () => { setPriorPrec(0.05); setPriorMean(0); setN(40); setNoise(1); } },
        { name: t("labs.econV24.text059", { defaultValue: "强先验 β₀=0" }), description: t("labs.econV24.text060", { defaultValue: "Λ₀=5,小样本时收缩到 0" }), apply: () => { setPriorPrec(5); setPriorMean(0); setN(20); setNoise(1.2); } },
        { name: t("labs.econV24.text061", { defaultValue: "错指定先验" }), description: t("labs.econV24.text062", { defaultValue: "β₀=0 但真值=2,演示先验拖累" }), apply: () => { setPriorPrec(8); setPriorMean(0); setTrueBeta1(2); setN(25); } },
        { name: t("labs.econV24.text063", { defaultValue: "大样本" }), description: t("labs.econV24.text064", { defaultValue: "n=200,先验影响消失" }), apply: () => { setN(200); setPriorPrec(0.5); setPriorMean(0); setNoise(1); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label={t("labs.econV24.text065", { defaultValue: "样本量 n" })} value={n} min={10} max={300} step={5} onChange={setN} />
          <Slider label={t("labs.econV24.text066", { defaultValue: "真实 β₁" })} value={trueBeta1} min={-2} max={3} step={0.05} onChange={setTrueBeta1} />
          <Slider label={t("labs.econV24.text067", { defaultValue: "噪声 σ" })} value={noise} min={0.1} max={3} step={0.05} onChange={setNoise} />
          <Slider label={t("labs.econV24.text068", { defaultValue: "先验均值 β₀" })} value={priorMean} min={-2} max={2} step={0.05} onChange={setPriorMean} />
          <Slider label={t("labs.econV24.text069", { defaultValue: "先验精度 Λ₀" })} sub={t("labs.econV24.text070", { defaultValue: "↑ = 先验更强" })} value={priorPrec} min={0.01} max={10} step={0.01} onChange={setPriorPrec} />
          <Slider label={t("labs.econV24.text071", { defaultValue: "随机种子" })} value={seed} min={1} max={999} step={1} onChange={setSeed} />
        </div>
        <div className="space-y-3">
          <Stat label={t("labs.econV24.text072", { defaultValue: "后验 E[β₁ | y]" })} value={`${data.betaN[1].toFixed(4)} ± ${data.seBetaN1.toFixed(4)}`} color={CHART_GOLD} sub={`df = 2aₙ = ${data.dfPost.toFixed(1)}`} />
          <Stat label="OLS β̂₁" value={`${data.ols_b[1].toFixed(4)} ± ${data.seOlsBeta1.toFixed(4)}`} color={CHART_TEAL} />
          <Stat label={t("labs.econV24.text073", { defaultValue: "后验 E[σ² | y]" })} value={data.sigma2_post.toFixed(4)} color={CHART_BLUE} sub={`OLS σ̂² = ${data.sigma2_ols.toFixed(4)}`} />
          <Stat label={t("labs.econV24.text074", { defaultValue: "真实 β₁" })} value={trueBeta1.toFixed(4)} color={CHART_RED} />
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">
            <p><span className="text-gold">{t("labs.econV24.text075", { defaultValue: "收缩" })}</span>{t("labs.econV24.text076", { defaultValue: ":βₙ = (X'X + Λ₀)⁻¹ (X'y + Λ₀β₀) → 强先验时拉向 β₀,弱先验时趋近 OLS。" })}</p>
            <p>{t("labs.econV24.text077", { defaultValue: "当 Λ₀=λI 时即" })} <em>{t("labs.econV24.text078", { defaultValue: "Ridge 回归" })}</em>{t("labs.econV24.text079", { defaultValue: ",Bayesian 给出额外的不确定性度量(后验 t 分布)。" })}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.econV24.text080", { defaultValue: "后验预测 ± 95% 区间 vs OLS / 真实" })}</h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.band} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="x" type="number" stroke={CHART_TEXT} tick={{ fontSize: 11 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="band" fill={CHART_GOLD} fillOpacity={0.16} stroke="none" name={t("labs.econV24.text081", { defaultValue: "后验 95% PPI" })} />
                <Line type="monotone" dataKey="mean" stroke={CHART_GOLD} strokeWidth={2.5} dot={false} name={t("labs.econV24.text082", { defaultValue: "后验均值" })} />
                <Line type="monotone" dataKey="ols" stroke={CHART_TEAL} strokeWidth={1.8} strokeDasharray="4 3" dot={false} name="OLS" />
                <Line type="monotone" dataKey="truth" stroke={CHART_RED} strokeWidth={1.5} strokeDasharray="2 3" dot={false} name={t("labs.econV24.text083", { defaultValue: "真实" })} />
                <Scatter data={data.samples} fill={CHART_BLUE} fillOpacity={0.5} dataKey="y" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.econV24.text084", { defaultValue: "β₁ 后验密度 (marginal t)" })}</h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.post}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="b1" type="number" domain={["dataMin", "dataMax"]} stroke={CHART_TEXT} tick={{ fontSize: 11 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                <ReferenceLine x={trueBeta1} stroke={CHART_RED} strokeDasharray="3 3" label={{ value: t("labs.econV24.text085", { defaultValue: "真值" }), fill: CHART_RED, fontSize: 10 }} />
                <ReferenceLine x={data.betaN[1]} stroke={CHART_GOLD} strokeDasharray="3 3" label={{ value: "βₙ", fill: CHART_GOLD, fontSize: 10 }} />
                <ReferenceLine x={priorMean} stroke={CHART_BLUE} strokeDasharray="3 3" label={{ value: "β₀", fill: CHART_BLUE, fontSize: 10 }} />
                <Line type="monotone" dataKey="post" stroke={CHART_GOLD} strokeWidth={2.4} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gold/20 bg-secondary/20 p-4 text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">{t("labs.econV24.text086", { defaultValue: "Bayesian Linear Regression (Normal-Inverse-Gamma 共轭):" })}</strong></p>
        <p>• <em>{t("labs.econV24.text087", { defaultValue: "先验" })}</em>{t("labs.econV24.text088", { defaultValue: ":β | σ² ~ N(β₀, σ² Λ₀⁻¹),σ² ~ Inv-Gamma(a₀, b₀);共轭使后验闭式可解" })}</p>
        <p>• <em>{t("labs.econV24.text089", { defaultValue: "后验精度" })}</em>{t("labs.econV24.text090", { defaultValue: ":Λₙ = X'X + Λ₀ → 数据信息 + 先验信息相加;后验均值是两者的精度加权平均" })}</p>
        <p>• <em>{t("labs.econV24.text091", { defaultValue: "后验预测" })}</em>:y* | x*, y ~ t_{"{2aₙ}"}{t("labs.econV24.text092", { defaultValue: "(x*'βₙ, (bₙ/aₙ)(1 + x*'Λₙ⁻¹x*)) → 比 OLS 多吸收了 σ² 的不确定性" })}</p>
        <p>{t("labs.econV24.text093", { defaultValue: "• 与 Ridge 等价:Λ₀ = λI 且 β₀ = 0 时,后验众数 = Ridge 估计;Bayesian 同时给出区间和模型不确定性" })}</p>
        <p>{t("labs.econV24.text094", { defaultValue: "• 大样本下先验被数据淹没 → 后验 → OLS;小样本 / 病态 X'X 下先验起到正则化与稳定化作用" })}</p>
        <p className="text-[11px] text-muted-foreground/80">Reference: Gelman A., Carlin J., Stern H., Dunson D., Vehtari A., Rubin D. (2013) <em>Bayesian Data Analysis</em>, 3rd ed., Ch. 14;
          O'Hagan A. & Forster J. (2004) <em>Kendall's Advanced Theory of Statistics, Vol. 2B: Bayesian Inference</em>.</p>
      </div>
    </div>
  );
};

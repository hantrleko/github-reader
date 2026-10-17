import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, BarChart, Bar, ComposedChart, Area, Cell, ScatterChart, Scatter,
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

// erf approximation (Abramowitz & Stegun 7.1.26)
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const a1=0.254829592, a2=-0.284496736, a3=1.421413741, a4=-1.453152027, a5=1.061405429, p=0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}
const normCdf = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));
const normPdf = (z: number) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);

// chi-square upper-tail p-value (Wilson-Hilferty approximation)
function chiSqP(x: number, df: number): number {
  if (x <= 0 || df <= 0) return 1;
  const t = Math.pow(x / df, 1 / 3);
  const z = (t - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
  return 1 - normCdf(z);
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
function olsBeta(X: number[][], y: number[]): { beta: number[]; resid: number[]; ssr: number; XtXinv: number[][] } {
  const n = X.length, k = X[0].length;
  const XtX: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  const Xty: number[] = new Array(k).fill(0);
  for (let i = 0; i < n; i++) for (let a = 0; a < k; a++) {
    Xty[a] += X[i][a] * y[i];
    for (let b = 0; b < k; b++) XtX[a][b] += X[i][a] * X[i][b];
  }
  // augment with identity to also recover inverse
  const M: number[][] = XtX.map((row, i) => {
    const id = new Array(k).fill(0); id[i] = 1;
    return [...row, Xty[i], ...id];
  });
  for (let i = 0; i < k; i++) {
    let p = i; let mx = Math.abs(M[i][i]);
    for (let r = i + 1; r < k; r++) if (Math.abs(M[r][i]) > mx) { mx = Math.abs(M[r][i]); p = r; }
    if (mx < 1e-12) { return { beta: new Array(k).fill(0), resid: y.slice(), ssr: NaN, XtXinv: [] }; }
    if (p !== i) { const tmp = M[i]; M[i] = M[p]; M[p] = tmp; }
    const pv = M[i][i];
    for (let c = i; c < 1 + k + k; c++) M[i][c] /= pv;
    for (let r = 0; r < k; r++) if (r !== i) {
      const f = M[r][i];
      if (f !== 0) for (let c = i; c < 1 + k + k; c++) M[r][c] -= f * M[i][c];
    }
  }
  const beta = M.map(row => row[k]);
  const XtXinv = M.map(row => row.slice(k + 1));
  let ssr = 0;
  const resid = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let yh = 0; for (let j = 0; j < k; j++) yh += X[i][j] * beta[j];
    resid[i] = y[i] - yh;
    ssr += resid[i] * resid[i];
  }
  return { beta, resid, ssr, XtXinv };
}

/* ════════════════════════════════════════════════════════════════
   1) LASSO / Ridge / Elastic Net + K-fold CV
   ════════════════════════════════════════════════════════════════ */
function softThresh(z: number, g: number) {
  if (z > g) return z - g;
  if (z < -g) return z + g;
  return 0;
}
/** Coordinate descent for elastic net on standardised X (cols already centred & unit-norm-ish).
 * Loss: (1/2n)||y - Xβ||² + λ[α||β||₁ + ½(1-α)||β||²]
 * Returns β (no intercept; centre y separately). */
function elasticNetCD(X: number[][], y: number[], lambda: number, alpha: number, beta0?: number[], iters = 100): number[] {
  const n = X.length, p = X[0].length;
  const beta = beta0 ? beta0.slice() : new Array(p).fill(0);
  // Pre-compute column norms ||x_j||²/n  (assumed standardised so ≈1, but compute anyway)
  const colNorm = new Array(p).fill(0);
  for (let j = 0; j < p; j++) {
    let s = 0; for (let i = 0; i < n; i++) s += X[i][j] * X[i][j];
    colNorm[j] = s / n;
  }
  // Residuals
  const r = y.slice();
  for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) r[i] -= X[i][j] * beta[j];
  for (let it = 0; it < iters; it++) {
    let maxDelta = 0;
    for (let j = 0; j < p; j++) {
      // partial residual r_j = r + x_j β_j
      let zj = 0;
      for (let i = 0; i < n; i++) zj += X[i][j] * (r[i] + X[i][j] * beta[j]);
      zj /= n;
      const denom = colNorm[j] + lambda * (1 - alpha);
      const newBj = denom > 0 ? softThresh(zj, lambda * alpha) / denom : 0;
      const delta = newBj - beta[j];
      if (delta !== 0) {
        for (let i = 0; i < n; i++) r[i] -= X[i][j] * delta;
        beta[j] = newBj;
        if (Math.abs(delta) > maxDelta) maxDelta = Math.abs(delta);
      }
    }
    if (maxDelta < 1e-6) break;
  }
  return beta;
}

const lassoPresets = (t: ReturnType<typeof useTranslation>["t"], set: (v: { n: number; p: number; sparse: number; alpha: number; rho: number; sigma: number; seed: number }) => void): Preset[] => [
  { name: t("labs.econV22.text001", { defaultValue: "稀疏真模型 (LASSO 优势)" }),  description: t("labs.econV22.text002", { defaultValue: "10 个特征只有 3 个非零, α=1" }),
    apply: () => set({ n: 200, p: 10, sparse: 3, alpha: 1.0, rho: 0.0, sigma: 0.5, seed: 42 }) },
  { name: t("labs.econV22.text003", { defaultValue: "多重共线性 (Ridge 优势)" }),  description: t("labs.econV22.text004", { defaultValue: "高度相关特征, α=0" }),
    apply: () => set({ n: 200, p: 10, sparse: 8, alpha: 0.0, rho: 0.85, sigma: 0.5, seed: 7 }) },
  { name: t("labs.econV22.text005", { defaultValue: "高维 p>n" }),                description: t("labs.econV22.text006", { defaultValue: "n=80, p=120, LASSO 必选" }),
    apply: () => set({ n: 80, p: 120, sparse: 5, alpha: 1.0, rho: 0.2, sigma: 0.5, seed: 11 }) },
  { name: "Elastic Net",             description: t("labs.econV22.text007", { defaultValue: "相关特征 + 稀疏, α=0.5" }),
    apply: () => set({ n: 200, p: 20, sparse: 5, alpha: 0.5, rho: 0.7, sigma: 0.5, seed: 21 }) },
];

export const LassoTool = () => {
  const { t } = useTranslation();
  const [n, setN]         = useState(200);
  const [p, setP]         = useState(10);
  const [sparse, setSparse] = useState(3);
  const [alpha, setAlpha] = useState(1.0);  // 1=LASSO 0=Ridge
  const [rho, setRho]     = useState(0.0);  // pairwise corr in X
  const [sigma, setSigma] = useState(0.5);
  const [seed, setSeed]   = useState(42);

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    const sp = Math.min(sparse, p);
    // True β
    const trueBeta = new Array(p).fill(0);
    for (let j = 0; j < sp; j++) trueBeta[j] = (j % 2 === 0 ? 1 : -1) * (1.5 - 0.2 * j);
    // Generate X with AR(1)-like correlation structure: x_j = ρ x_{j-1} + sqrt(1-ρ²) z
    const X: number[][] = Array.from({ length: n }, () => new Array(p).fill(0));
    for (let i = 0; i < n; i++) {
      let prev = randn(rng);
      X[i][0] = prev;
      for (let j = 1; j < p; j++) {
        const z = randn(rng);
        const xj = rho * prev + Math.sqrt(Math.max(1 - rho * rho, 0)) * z;
        X[i][j] = xj;
        prev = xj;
      }
    }
    // y
    const y = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let yi = 0;
      for (let j = 0; j < p; j++) yi += X[i][j] * trueBeta[j];
      y[i] = yi + sigma * randn(rng);
    }
    // Standardise X (centre + scale by SD), centre y
    const mx = new Array(p).fill(0), sx = new Array(p).fill(1);
    for (let j = 0; j < p; j++) {
      let s = 0; for (let i = 0; i < n; i++) s += X[i][j];
      mx[j] = s / n;
      let v = 0; for (let i = 0; i < n; i++) v += (X[i][j] - mx[j]) ** 2;
      sx[j] = Math.sqrt(v / n) || 1;
    }
    const Xs: number[][] = X.map(row => row.map((v, j) => (v - mx[j]) / sx[j]));
    const my = y.reduce((a, b) => a + b, 0) / n;
    const ys = y.map(v => v - my);

    // Compute lambda_max = max |X_s^T y_s| / (n α) (only valid for α>0; floor for ridge)
    let lamMax = 0;
    for (let j = 0; j < p; j++) {
      let s = 0; for (let i = 0; i < n; i++) s += Xs[i][j] * ys[i];
      lamMax = Math.max(lamMax, Math.abs(s) / n);
    }
    if (alpha > 0) lamMax = lamMax / alpha;
    else lamMax = lamMax * 5;  // arbitrary upper bound for pure ridge
    const lamMin = lamMax * 1e-3;
    const N_LAM = 40;
    const lambdas: number[] = [];
    for (let k = 0; k < N_LAM; k++) {
      lambdas.push(lamMax * Math.exp((Math.log(lamMin / lamMax)) * k / (N_LAM - 1)));
    }

    // Fit full path with warm starts
    const path: number[][] = [];
    let warm: number[] | undefined = undefined;
    for (const lam of lambdas) {
      const b = elasticNetCD(Xs, ys, lam, alpha, warm);
      path.push(b.slice());
      warm = b;
    }

    // K-fold CV (K=5)
    const K = 5;
    const idx = Array.from({ length: n }, (_, i) => i);
    // shuffle deterministically
    const rng2 = mulberry32(seed + 99);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng2() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    const cvMean = new Array(N_LAM).fill(0);
    const cvSEArr = new Array(N_LAM).fill(0);
    const foldErrs: number[][] = Array.from({ length: N_LAM }, () => []);
    for (let f = 0; f < K; f++) {
      const test = new Set(idx.filter((_, i) => i % K === f));
      const Xtr: number[][] = [], ytr: number[] = [];
      const Xte: number[][] = [], yte: number[] = [];
      for (let i = 0; i < n; i++) {
        if (test.has(i)) { Xte.push(Xs[i]); yte.push(ys[i]); }
        else { Xtr.push(Xs[i]); ytr.push(ys[i]); }
      }
      let warm2: number[] | undefined = undefined;
      for (let k = 0; k < N_LAM; k++) {
        const b = elasticNetCD(Xtr, ytr, lambdas[k], alpha, warm2, 60);
        warm2 = b;
        let err = 0;
        for (let i = 0; i < Xte.length; i++) {
          let yh = 0;
          for (let j = 0; j < p; j++) yh += Xte[i][j] * b[j];
          err += (yte[i] - yh) ** 2;
        }
        foldErrs[k].push(err / Xte.length);
      }
    }
    for (let k = 0; k < N_LAM; k++) {
      const arr = foldErrs[k];
      const m = arr.reduce((a, b) => a + b, 0) / arr.length;
      const v = arr.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(arr.length - 1, 1);
      cvMean[k] = m; cvSEArr[k] = Math.sqrt(v / arr.length);
    }
    // λ_min and λ_1se
    let kMin = 0; for (let k = 1; k < N_LAM; k++) if (cvMean[k] < cvMean[kMin]) kMin = k;
    const thresh = cvMean[kMin] + cvSEArr[kMin];
    let k1se = kMin;
    for (let k = 0; k < kMin; k++) if (cvMean[k] <= thresh) { k1se = k; break; }

    // Compose chart data
    const pathChart = lambdas.map((lam, k) => {
      const row: any = { logLam: +Math.log10(lam).toFixed(3), lam };
      for (let j = 0; j < p; j++) row[`b${j}`] = path[k][j];
      return row;
    });
    const cvChart = lambdas.map((lam, k) => ({
      logLam: +Math.log10(lam).toFixed(3),
      mse: cvMean[k],
      band: [cvMean[k] - cvSEArr[k], cvMean[k] + cvSEArr[k]] as [number, number],
      nonzero: path[k].filter(b => Math.abs(b) > 1e-6).length,
    }));

    // OLS comparison (on standardised) for β bar chart — only when n > p
    let olsBetaStd: number[] = new Array(p).fill(0);
    if (n > p + 5) {
      const r = olsBeta(Xs, ys);
      olsBetaStd = r.beta;
    }
    const betaBars = trueBeta.map((bt, j) => ({
      name: `β${j + 1}`,
      truth: bt,
      ols: olsBetaStd[j] / sx[j],     // un-standardise for plot
      lasso: path[kMin][j] / sx[j],
      lasso1se: path[k1se][j] / sx[j],
    }));

    return {
      lambdas, pathChart, cvChart, betaBars,
      kMin, k1se, lamMin: lambdas[kMin], lam1se: lambdas[k1se],
      mseMin: cvMean[kMin], nonzeroMin: cvChart[kMin].nonzero,
      nonzero1se: cvChart[k1se].nonzero,
      trueNonzero: sp, p,
    };
  }, [n, p, sparse, alpha, rho, sigma, seed]);

  // Color palette for many coefficient lines
  const colors = ["hsl(43,80%,55%)", "hsl(180,50%,40%)", "hsl(220,70%,55%)", "hsl(0,70%,55%)",
                  "hsl(280,55%,55%)", "hsl(140,55%,45%)", "hsl(20,75%,55%)", "hsl(200,60%,50%)",
                  "hsl(60,70%,50%)", "hsl(330,55%,55%)"];

  return (
    <div className="space-y-6">
      <PresetButtons
        presets={lassoPresets(t, (v) => {
          setN(v.n); setP(v.p); setSparse(v.sparse); setAlpha(v.alpha);
          setRho(v.rho); setSigma(v.sigma); setSeed(v.seed);
        })}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Slider label={t("labs.econV22.text008", { defaultValue: "样本量 n" })}        value={n}      min={40}  max={500} step={10} onChange={setN} />
          <Slider label={t("labs.econV22.text009", { defaultValue: "特征数 p" })}        value={p}      min={3}   max={120} step={1}  onChange={setP} />
          <Slider label={t("labs.econV22.text010", { defaultValue: "真实非零数 s" })}    sub={t("labs.econV22.text011", { defaultValue: "只前 s 个特征对 y 有效" })}
                  value={sparse} min={1}   max={Math.min(p, 15)} step={1}  onChange={setSparse} />
          <Slider label="α (1=LASSO 0=Ridge)" value={alpha} min={0} max={1} step={0.05} onChange={setAlpha} />
          <Slider label={t("labs.econV22.text012", { defaultValue: "特征相关性 ρ" })}    value={rho}    min={0}   max={0.95} step={0.05} onChange={setRho} />
          <Slider label={t("labs.econV22.text013", { defaultValue: "噪声 σ" })}          value={sigma}  min={0.1} max={2}   step={0.1} onChange={setSigma} />
          <Slider label={t("labs.econV22.text014", { defaultValue: "随机种子" })}        value={seed}   min={1}   max={200} step={1}   onChange={setSeed} />
        </div>
        <div className="space-y-2">
          <Stat label={t("labs.econV22.text015", { defaultValue: "λ_min (CV 最优)" })}    value={data.lamMin.toExponential(2)} color={CHART_GOLD}
                sub={`CV-MSE = ${data.mseMin.toFixed(3)}`} />
          <Stat label={t("labs.econV22.text016", { defaultValue: "λ_1se (1-SE 准则)" })}  value={data.lam1se.toExponential(2)} color={CHART_TEAL}
                sub={t("labs.econV22.text017", { defaultValue: "更稀疏更稳健" })} />
          <Stat label={t("labs.econV22.text018", { defaultValue: "非零特征数 @λ_min" })}  value={`${data.nonzeroMin} / ${data.p}`} color={CHART_BLUE}
                sub={t("labs.econV22.text019", { defaultValue: "真实非零 = {{v1}}", v1: data.trueNonzero })} />
          <Stat label={t("labs.econV22.text020", { defaultValue: "非零特征数 @λ_1se" })}  value={`${data.nonzero1se} / ${data.p}`} color={CHART_TEAL} />
          <Stat label={t("labs.econV22.text021", { defaultValue: "模型类型" })}           value={alpha === 1 ? "LASSO" : alpha === 0 ? "Ridge" : "Elastic Net"} color={CHART_GOLD}
                sub={`α = ${alpha.toFixed(2)}`} />
        </div>
      </div>

      {/* Coefficient path */}
      <div>
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">{t("labs.econV22.text022", { defaultValue: "系数路径 β(λ) — x 轴 log₁₀ λ" })}</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.pathChart} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="logLam" stroke={CHART_TEXT} tick={{ fontSize: 10 }} reversed />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
            <ReferenceLine x={+Math.log10(data.lamMin).toFixed(3)} stroke={CHART_GOLD} strokeDasharray="4 3"
              label={{ value: "λ_min", position: "top", fill: CHART_GOLD, fontSize: 10 }} />
            <ReferenceLine x={+Math.log10(data.lam1se).toFixed(3)} stroke={CHART_TEAL} strokeDasharray="4 3"
              label={{ value: "λ_1se", position: "top", fill: CHART_TEAL, fontSize: 10 }} />
            {Array.from({ length: Math.min(p, 10) }).map((_, j) => (
              <Line key={j} type="monotone" dataKey={`b${j}`} stroke={colors[j % colors.length]}
                    strokeWidth={1.5} dot={false} name={`β${j + 1}`} />
            ))}
          </LineChart>
        </ResponsiveContainer>
        {p > 10 && <p className="text-[10px] font-mono text-muted-foreground/70 mt-1">{t("labs.econV22.text023", { defaultValue: "仅显示前 10 个系数 (共" })} {p} {t("labs.econV22.text024", { defaultValue: "个)" })}</p>}
      </div>

      {/* CV curve */}
      <div>
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">{t("labs.econV22.text025", { defaultValue: "5-Fold 交叉验证 MSE ± 1 SE" })}</p>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data.cvChart} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="logLam" stroke={CHART_TEXT} tick={{ fontSize: 10 }} reversed />
            <YAxis yAxisId="L" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
            <YAxis yAxisId="R" orientation="right" stroke={CHART_BLUE} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area yAxisId="L" type="monotone" dataKey="band" stroke="none" fill={CHART_GOLD} fillOpacity={0.18} name="±1 SE" />
            <Line yAxisId="L" type="monotone" dataKey="mse"  stroke={CHART_GOLD} strokeWidth={2} dot={false} name="CV MSE" />
            <Line yAxisId="R" type="stepAfter" dataKey="nonzero" stroke={CHART_BLUE} strokeWidth={1.5} dot={false} name={t("labs.econV22.text026", { defaultValue: "非零系数 #" })} />
            <ReferenceLine yAxisId="L" x={+Math.log10(data.lamMin).toFixed(3)} stroke={CHART_GOLD} strokeDasharray="4 3" />
            <ReferenceLine yAxisId="L" x={+Math.log10(data.lam1se).toFixed(3)} stroke={CHART_TEAL} strokeDasharray="4 3" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* β recovery vs OLS */}
      <div>
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">{t("labs.econV22.text027", { defaultValue: "系数恢复对比 (前 10 个)" })}</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.betaBars.slice(0, 10)} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={0} stroke={CHART_TEXT} />
            <Bar dataKey="truth" fill={CHART_GOLD} name={t("labs.econV22.text028", { defaultValue: "真实 β" })} />
            <Bar dataKey="ols"   fill={CHART_RED}  name="OLS" />
            <Bar dataKey="lasso" fill={CHART_TEAL} name={t("labs.econV22.text029", { defaultValue: "正则化 @λ_min" })} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border border-gold/20 bg-secondary/20 p-4 text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">{t("labs.econV22.text030", { defaultValue: "Friedman-Hastie-Tibshirani (2010) 坐标下降:" })}</strong></p>
        <p>• <strong>LASSO (α=1)</strong>{t("labs.econV22.text031", { defaultValue: ": ℓ₁ 罚项产生稀疏解 → 自动变量选择" })}</p>
        <p>• <strong>Ridge (α=0)</strong>{t("labs.econV22.text032", { defaultValue: ": ℓ₂ 罚项收缩所有系数,处理多重共线性,但不稀疏" })}</p>
        <p>• <strong>Elastic Net (0&lt;α&lt;1)</strong>{t("labs.econV22.text033", { defaultValue: ": 兼顾两者,相关特征组一同保留或剔除" })}</p>
        <p>• <strong>λ_min</strong> {t("labs.econV22.text034", { defaultValue: "= 最低 CV-MSE;" })} <strong>λ_1se</strong> {t("labs.econV22.text035", { defaultValue: "= 在 1-SE 范围内最简单模型,Breiman 推荐用于实践" })}</p>
        <p className="text-[11px] text-muted-foreground/80">Tibshirani (1996) <em>Regression Shrinkage and Selection via the Lasso</em>, JRSS-B; Zou & Hastie (2005) Elastic Net.</p>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   2) Panel FE / RE + Hausman
   ════════════════════════════════════════════════════════════════ */
const panelPresets = (t: ReturnType<typeof useTranslation>["t"], set: (v: { N: number; T: number; beta: number; sigU: number; sigE: number; corrUX: number; seed: number }) => void): Preset[] => [
  { name: t("labs.econV22.text036", { defaultValue: "FE 适用 (个体效应∼X 相关)" }), description: t("labs.econV22.text037", { defaultValue: "Cov(α_i, X)>0 ⇒ RE 偏误, 选 FE" }),
    apply: () => set({ N: 50, T: 8, beta: 1.0, sigU: 1.5, sigE: 0.5, corrUX: 0.7, seed: 42 }) },
  { name: t("labs.econV22.text038", { defaultValue: "RE 高效 (个体效应独立)" }), description: t("labs.econV22.text039", { defaultValue: "Cov(α_i, X)=0 ⇒ RE 一致且高效" }),
    apply: () => set({ N: 50, T: 8, beta: 1.0, sigU: 1.5, sigE: 0.5, corrUX: 0.0, seed: 42 }) },
  { name: t("labs.econV22.text040", { defaultValue: "大 N 小 T" }), description: t("labs.econV22.text041", { defaultValue: "短面板典型设定 (微观经济学)" }),
    apply: () => set({ N: 200, T: 4, beta: 1.0, sigU: 1.0, sigE: 0.5, corrUX: 0.5, seed: 11 }) },
  { name: t("labs.econV22.text042", { defaultValue: "弱个体效应" }),  description: t("labs.econV22.text043", { defaultValue: "σ_u 小 → Pooled OLS 也接近 FE" }),
    apply: () => set({ N: 80, T: 6, beta: 1.0, sigU: 0.3, sigE: 0.5, corrUX: 0.5, seed: 7 }) },
];

export const PanelTool = () => {
  const { t } = useTranslation();
  const [N, setN]       = useState(50);
  const [T, setT]       = useState(8);
  const [beta, setBeta] = useState(1.0);
  const [sigU, setSigU] = useState(1.5);
  const [sigE, setSigE] = useState(0.5);
  const [corrUX, setCorrUX] = useState(0.7);
  const [seed, setSeed] = useState(42);

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    const n = N * T;
    // Generate α_i ~ N(0, σ_u²); X_it depends on α_i with strength corrUX
    const alphaI: number[] = Array.from({ length: N }, () => sigU * randn(rng));
    const X: number[] = new Array(n).fill(0);
    const y: number[] = new Array(n).fill(0);
    const idIdx: number[] = new Array(n).fill(0);
    const tIdx: number[]  = new Array(n).fill(0);
    let k = 0;
    for (let i = 0; i < N; i++) {
      for (let t = 0; t < T; t++) {
        const z = randn(rng);
        const xit = corrUX * alphaI[i] + Math.sqrt(Math.max(1 - corrUX * corrUX, 0)) * z;
        const eps = sigE * randn(rng);
        X[k] = xit;
        y[k] = alphaI[i] + beta * xit + eps;
        idIdx[k] = i; tIdx[k] = t;
        k++;
      }
    }
    // ── Pooled OLS  y = a + βx + ε ──
    const Xpool: number[][] = X.map(xi => [1, xi]);
    const olsP = olsBeta(Xpool, y);
    const sigma2P = olsP.ssr / (n - 2);
    const seBetaP = Math.sqrt(sigma2P * olsP.XtXinv[1][1]);

    // ── Fixed Effects (Within): demean by individual ──
    const ybar: number[] = new Array(N).fill(0);
    const xbar: number[] = new Array(N).fill(0);
    const cnt: number[] = new Array(N).fill(0);
    for (let i = 0; i < n; i++) { ybar[idIdx[i]] += y[i]; xbar[idIdx[i]] += X[i]; cnt[idIdx[i]]++; }
    for (let i = 0; i < N; i++) { ybar[i] /= cnt[i]; xbar[i] /= cnt[i]; }
    const yW = y.map((v, i) => v - ybar[idIdx[i]]);
    const xW = X.map((v, i) => v - xbar[idIdx[i]]);
    let sxx = 0, sxy = 0;
    for (let i = 0; i < n; i++) { sxx += xW[i] * xW[i]; sxy += xW[i] * yW[i]; }
    const betaFE = sxy / sxx;
    let ssrFE = 0;
    for (let i = 0; i < n; i++) {
      const e = yW[i] - betaFE * xW[i];
      ssrFE += e * e;
    }
    const dofFE = n - N - 1;
    const sigma2FE = ssrFE / dofFE;
    const seBetaFE = Math.sqrt(sigma2FE / sxx);
    // Recover α_i = ȳ_i - β x̄_i
    const alphaHatFE: number[] = new Array(N).fill(0);
    for (let i = 0; i < N; i++) alphaHatFE[i] = ybar[i] - betaFE * xbar[i];

    // ── Random Effects (Swamy-Arora style) ──
    // σ²_ε ≈ σ²_FE
    // σ²_u from Between regression: ȳ_i = a + β x̄_i + (α_i + ε̄_i)
    const Xb: number[][] = xbar.map(xi => [1, xi]);
    const olsB = olsBeta(Xb, ybar);
    const ssrB = olsB.ssr;
    const sigma2B = ssrB / Math.max(N - 2, 1);
    const sigma2U = Math.max(sigma2B - sigma2FE / T, 0);
    const theta = 1 - Math.sqrt(sigma2FE / (sigma2FE + T * sigma2U));
    // Quasi-demean: y* = y_it - θ ȳ_i, x* = x_it - θ x̄_i, plus 1*=1-θ
    const yStar = y.map((v, i) => v - theta * ybar[idIdx[i]]);
    const xStar = X.map((v, i) => v - theta * xbar[idIdx[i]]);
    const Xre: number[][] = xStar.map(xi => [1 - theta, xi]);
    const olsRE = olsBeta(Xre, yStar);
    const sigma2RE = olsRE.ssr / (n - 2);
    const seBetaRE = Math.sqrt(sigma2RE * olsRE.XtXinv[1][1]);

    // ── Hausman test ──
    // H = (β_FE - β_RE)² / (Var(β_FE) - Var(β_RE)) ~ χ²(1)
    const varDiff = seBetaFE * seBetaFE - seBetaRE * seBetaRE;
    const H = varDiff > 1e-10 ? ((betaFE - olsRE.beta[1]) ** 2) / varDiff : NaN;
    const pH = isFinite(H) ? chiSqP(H, 1) : NaN;
    const verdict = isFinite(pH) && pH < 0.05 ? "FE" : "RE";

    // Sample 60 points for scatter
    const scatter: any[] = [];
    const step = Math.max(1, Math.floor(n / 200));
    for (let i = 0; i < n; i += step) scatter.push({ x: X[i], y: y[i], id: idIdx[i] });

    // α_i histogram
    const aMin = Math.min(...alphaHatFE), aMax = Math.max(...alphaHatFE);
    const bins = 14;
    const hist: any[] = [];
    for (let b = 0; b < bins; b++) {
      const lo = aMin + (b / bins) * (aMax - aMin);
      const hi = aMin + ((b + 1) / bins) * (aMax - aMin);
      const c = alphaHatFE.filter(a => a >= lo && (b === bins - 1 ? a <= hi : a < hi)).length;
      hist.push({ a: ((lo + hi) / 2).toFixed(2), n: c });
    }

    return {
      betaTrue: beta,
      pooled: { beta: olsP.beta[1], se: seBetaP },
      fe:     { beta: betaFE,        se: seBetaFE },
      re:     { beta: olsRE.beta[1], se: seBetaRE, theta },
      H, pH, verdict,
      scatter, hist, n, N, T,
    };
  }, [N, T, beta, sigU, sigE, corrUX, seed]);

  const tableRows = [
    { name: t("labs.econV22.text044", { defaultValue: "真实 β" }),   est: data.betaTrue, se: NaN, color: CHART_GOLD },
    { name: "Pooled OLS", est: data.pooled.beta, se: data.pooled.se, color: CHART_RED },
    { name: "Fixed Effects (Within)", est: data.fe.beta, se: data.fe.se, color: CHART_TEAL },
    { name: "Random Effects (GLS)",   est: data.re.beta, se: data.re.se, color: CHART_BLUE },
  ];

  return (
    <div className="space-y-6">
      <PresetButtons
        presets={panelPresets(t, (v) => {
          setN(v.N); setT(v.T); setBeta(v.beta); setSigU(v.sigU);
          setSigE(v.sigE); setCorrUX(v.corrUX); setSeed(v.seed);
        })}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Slider label={t("labs.econV22.text045", { defaultValue: "个体数 N" })}          value={N}    min={10} max={300} step={10} onChange={setN} />
          <Slider label={t("labs.econV22.text046", { defaultValue: "时期数 T" })}          value={T}    min={2}  max={20}  step={1}  onChange={setT} />
          <Slider label={t("labs.econV22.text047", { defaultValue: "真实 β" })}            value={beta} min={-2} max={3}   step={0.1} onChange={setBeta} />
          <Slider label={t("labs.econV22.text048", { defaultValue: "σ_α (个体效应)" })}   value={sigU} min={0}  max={3}   step={0.1} onChange={setSigU} />
          <Slider label={t("labs.econV22.text049", { defaultValue: "σ_ε (噪声)" })}        value={sigE} min={0.1} max={2}  step={0.1} onChange={setSigE} />
          <Slider label="Cov(α_i, X)"       sub={t("labs.econV22.text050", { defaultValue: "0=独立 → RE 一致" })} value={corrUX} min={0} max={0.95} step={0.05} onChange={setCorrUX} />
          <Slider label={t("labs.econV22.text051", { defaultValue: "随机种子" })}          value={seed} min={1}  max={200} step={1}   onChange={setSeed} />
        </div>
        <div className="space-y-2">
          <Stat label={t("labs.econV22.text052", { defaultValue: "面板规模" })}   value={`N=${data.N} × T=${data.T} = ${data.n}`} color={CHART_GOLD} />
          <Stat label="Pooled β̂"  value={data.pooled.beta.toFixed(3)} color={CHART_RED}
                sub={t("labs.econV22.text053", { defaultValue: "SE={{v1}} | 偏差 {{v2}}", v1: data.pooled.se.toFixed(3), v2: (data.pooled.beta - data.betaTrue).toFixed(3) })} />
          <Stat label="FE β̂"      value={data.fe.beta.toFixed(3)}     color={CHART_TEAL}
                sub={t("labs.econV22.text054", { defaultValue: "SE={{v1}} | 偏差 {{v2}}", v1: data.fe.se.toFixed(3), v2: (data.fe.beta - data.betaTrue).toFixed(3) })} />
          <Stat label="RE β̂"      value={data.re.beta.toFixed(3)}     color={CHART_BLUE}
                sub={`SE=${data.re.se.toFixed(3)} | θ=${data.re.theta.toFixed(3)}`} />
          <Stat label="Hausman χ²(1)"
                value={isFinite(data.H) ? data.H.toFixed(3) : "—"} color={data.verdict === "FE" ? CHART_TEAL : CHART_BLUE}
                sub={t("labs.econV22.text055", { defaultValue: "p = {{v1}} | 建议: {{v2}}", v1: isFinite(data.pH) ? data.pH.toFixed(4) : "—", v2: data.verdict })} />
        </div>
      </div>

      {/* β comparison bar */}
      <div>
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">{t("labs.econV22.text056", { defaultValue: "β̂ 对比 (与真实 β 对照)" })}</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={tableRows} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
            <ReferenceLine y={data.betaTrue} stroke={CHART_GOLD} strokeDasharray="4 3"
              label={{ value: t("labs.econV22.text057", { defaultValue: "真实 β = {{v1}}", v1: data.betaTrue.toFixed(2) }), position: "right", fill: CHART_GOLD, fontSize: 10 }} />
            <Bar dataKey="est" name="β̂">
              {tableRows.map((r, i) => <Cell key={i} fill={r.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* α_i histogram */}
      <div>
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">{t("labs.econV22.text058", { defaultValue: "个体效应 α̂_i 分布 (N=" })}{data.N})</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.hist} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="a" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
            <Bar dataKey="n" fill={CHART_TEAL} name={t("labs.econV22.text059", { defaultValue: "频次" })} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border border-gold/20 bg-secondary/20 p-4 text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">{t("labs.econV22.text060", { defaultValue: "三种估计的取舍:" })}</strong></p>
        <p>• <strong>Pooled OLS</strong>{t("labs.econV22.text061", { defaultValue: ": 忽略 α_i, 若 α_i 与 X 相关则 β̂ 严重有偏" })}</p>
        <p>• <strong>FE (Within)</strong>{t("labs.econV22.text062", { defaultValue: ": 个体内去均值消除时不变 α_i, 即使 Cov(α, X)≠0 也一致, 代价是损失 N 个自由度" })}</p>
        <p>• <strong>RE (GLS)</strong>{t("labs.econV22.text063", { defaultValue: ": 假设 Cov(α, X)=0, 用 θ 加权变换提升效率, 但若假设破坏则不一致" })}</p>
        <p>• <strong>{t("labs.econV22.text064", { defaultValue: "Hausman 检验" })}</strong> {t("labs.econV22.text065", { defaultValue: "H = (β̂_FE − β̂_RE)' [V(FE) − V(RE)]⁻¹ (β̂_FE − β̂_RE) ~ χ²: p&lt;0.05 ⇒ 选 FE" })}</p>
        <p className="text-[11px] text-muted-foreground/80">Reference: Hausman (1978) <em>Specification Tests in Econometrics</em>; Wooldridge (2010) <em>Econometric Analysis of Cross Section and Panel Data</em>.</p>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   3) Tobit / Heckman two-step
   ════════════════════════════════════════════════════════════════ */
/** Fit Probit by IRLS-ish gradient with Newton step on log-likelihood. Simple BFGS-free. */
function fitProbit(X: number[][], y: number[], iters = 40): number[] {
  const n = X.length, k = X[0].length;
  let beta = new Array(k).fill(0);
  for (let it = 0; it < iters; it++) {
    // Gradient g and Hessian H (negative of log-lik)
    const g = new Array(k).fill(0);
    const H: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
    for (let i = 0; i < n; i++) {
      let xb = 0; for (let j = 0; j < k; j++) xb += X[i][j] * beta[j];
      const Phi = Math.min(Math.max(normCdf(xb), 1e-9), 1 - 1e-9);
      const phi = normPdf(xb);
      const lambda = y[i] === 1 ? phi / Phi : -phi / (1 - Phi);
      const w = lambda * (lambda + xb);  // information weight
      for (let a = 0; a < k; a++) {
        g[a] += lambda * X[i][a];
        for (let b = 0; b < k; b++) H[a][b] += w * X[i][a] * X[i][b];
      }
    }
    // Newton step: β_new = β + H⁻¹ g
    const M: number[][] = H.map((row, i) => [...row, g[i]]);
    let ok = true;
    for (let i = 0; i < k; i++) {
      let pv = i; let mx = Math.abs(M[i][i]);
      for (let r = i + 1; r < k; r++) if (Math.abs(M[r][i]) > mx) { mx = Math.abs(M[r][i]); pv = r; }
      if (mx < 1e-10) { ok = false; break; }
      if (pv !== i) { const tmp = M[i]; M[i] = M[pv]; M[pv] = tmp; }
      const piv = M[i][i];
      for (let c = i; c <= k; c++) M[i][c] /= piv;
      for (let r = 0; r < k; r++) if (r !== i) {
        const f = M[r][i];
        if (f !== 0) for (let c = i; c <= k; c++) M[r][c] -= f * M[i][c];
      }
    }
    if (!ok) break;
    const step = M.map(row => row[k]);
    let maxStep = 0;
    for (let j = 0; j < k; j++) {
      beta[j] += step[j];
      if (Math.abs(step[j]) > maxStep) maxStep = Math.abs(step[j]);
    }
    if (maxStep < 1e-7) break;
  }
  return beta;
}

/** Fit Tobit (left-censored at 0) by Newton on (β, log σ).
 * y* = X β + ε,  ε~N(0,σ²);  observe y = max(0, y*). */
function fitTobit(X: number[][], y: number[], iters = 60): { beta: number[]; sigma: number } {
  const n = X.length, k = X[0].length;
  // Initialise from OLS on uncensored sample
  const Xu: number[][] = []; const yu: number[] = [];
  for (let i = 0; i < n; i++) if (y[i] > 0) { Xu.push(X[i]); yu.push(y[i]); }
  const init = Xu.length > k + 2 ? olsBeta(Xu, yu) : { beta: new Array(k).fill(0), resid: yu, ssr: 1, XtXinv: [] };
  let beta = init.beta.slice();
  let logSig = Math.log(Math.sqrt(init.ssr / Math.max(Xu.length - k, 1)) || 1);
  // Numerical gradient ascent on log-likelihood
  const ll = (b: number[], ls: number) => {
    const s = Math.exp(ls);
    let L = 0;
    for (let i = 0; i < n; i++) {
      let xb = 0; for (let j = 0; j < k; j++) xb += X[i][j] * b[j];
      if (y[i] > 0) {
        const z = (y[i] - xb) / s;
        L += -0.5 * Math.log(2 * Math.PI) - ls - 0.5 * z * z;
      } else {
        L += Math.log(Math.max(normCdf(-xb / s), 1e-12));
      }
    }
    return L;
  };
  let lr = 0.05;
  let prevL = ll(beta, logSig);
  for (let it = 0; it < iters; it++) {
    const eps = 1e-4;
    const grad = new Array(k + 1).fill(0);
    for (let j = 0; j < k; j++) {
      const b1 = beta.slice(); b1[j] += eps;
      const b2 = beta.slice(); b2[j] -= eps;
      grad[j] = (ll(b1, logSig) - ll(b2, logSig)) / (2 * eps);
    }
    grad[k] = (ll(beta, logSig + eps) - ll(beta, logSig - eps)) / (2 * eps);
    // Normalise step
    let gnorm = 0; for (const v of grad) gnorm += v * v; gnorm = Math.sqrt(gnorm);
    if (gnorm < 1e-6) break;
    const scale = lr / Math.max(gnorm, 1);
    const newB = beta.map((b, j) => b + scale * grad[j]);
    const newLs = logSig + scale * grad[k];
    const newL = ll(newB, newLs);
    if (newL > prevL) {
      beta = newB; logSig = newLs; prevL = newL;
      lr = Math.min(lr * 1.1, 0.2);
    } else {
      lr *= 0.5;
      if (lr < 1e-6) break;
    }
  }
  return { beta, sigma: Math.exp(logSig) };
}

const tobitPresets = (t: ReturnType<typeof useTranslation>["t"], set: (v: { n: number; beta: number; alpha: number; sigma: number; selStrength: number; rho: number; seed: number }) => void): Preset[] => [
  { name: t("labs.econV22.text066", { defaultValue: "强左截断 (40% 删失)" }),       description: t("labs.econV22.text067", { defaultValue: "α=0, ~40% 观测被截断为 0" }),
    apply: () => set({ n: 400, beta: 1.0, alpha: 0.0, sigma: 1.0, selStrength: 0.0, rho: 0.0, seed: 42 }) },
  { name: t("labs.econV22.text068", { defaultValue: "工资方程 (Heckman 经典)" }),   description: t("labs.econV22.text069", { defaultValue: "强样本选择, ρ=0.7" }),
    apply: () => set({ n: 500, beta: 0.8, alpha: 0.5, sigma: 1.0, selStrength: 1.2, rho: 0.7, seed: 11 }) },
  { name: t("labs.econV22.text070", { defaultValue: "无选择偏差 (ρ=0)" }),          description: t("labs.econV22.text071", { defaultValue: "OLS 与 Heckman 一致" }),
    apply: () => set({ n: 400, beta: 1.0, alpha: 1.0, sigma: 1.0, selStrength: 0.8, rho: 0.0, seed: 7 }) },
  { name: t("labs.econV22.text072", { defaultValue: "强选择偏差 (ρ=0.9)" }),        description: t("labs.econV22.text073", { defaultValue: "OLS 严重有偏, Heckman 校正" }),
    apply: () => set({ n: 500, beta: 1.0, alpha: 0.3, sigma: 1.0, selStrength: 1.5, rho: 0.9, seed: 21 }) },
];

export const TobitTool = () => {
  const { t } = useTranslation();
  const [n, setN]         = useState(400);
  const [beta, setBeta]   = useState(1.0);
  const [alpha, setAlpha] = useState(0.0);
  const [sigma, setSigma] = useState(1.0);
  const [selStrength, setSel] = useState(0.0);  // selection equation strength
  const [rho, setRho]     = useState(0.0);      // corr(ε_outcome, ε_selection)
  const [seed, setSeed]   = useState(42);

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    // X ~ N(0,1); Z (selection regressor) shares with X
    const X: number[] = [], Z: number[] = [], yStar: number[] = [];
    const yObs: number[] = []; const dObs: number[] = [];
    const yHeck: number[] = []; // observed only when d=1, else NaN
    for (let i = 0; i < n; i++) {
      const x = randn(rng);
      const z = 0.5 * x + Math.sqrt(0.75) * randn(rng);   // Z partly correlated with X for identification
      // Joint normal errors (ε1, ε2) with corr ρ
      const u1 = randn(rng); const u2 = randn(rng);
      const e1 = sigma * u1;
      const e2 = rho * u1 + Math.sqrt(Math.max(1 - rho * rho, 0)) * u2;  // unit variance
      const yS = alpha + beta * x + e1;          // latent outcome
      // Selection mechanism (only used in Heckman view): d = 1 if (γ0 + γ1 z + e2) > 0
      const sel = -0.2 + selStrength * z + e2;
      const d = sel > 0 ? 1 : 0;
      X.push(x); Z.push(z); yStar.push(yS);
      // Tobit observation: censored at 0
      yObs.push(yS > 0 ? yS : 0);
      dObs.push(d);
      yHeck.push(d === 1 ? yS : NaN);
    }

    // ── 1) OLS on uncensored sample (Tobit comparison) ──
    const Xu: number[][] = []; const yu: number[] = [];
    for (let i = 0; i < n; i++) if (yObs[i] > 0) { Xu.push([1, X[i]]); yu.push(yObs[i]); }
    const olsCensU = Xu.length > 3 ? olsBeta(Xu, yu) : { beta: [0, 0], resid: [], ssr: 0, XtXinv: [] };

    // ── 2) OLS on full sample including 0s (naive) ──
    const Xall: number[][] = X.map(xi => [1, xi]);
    const olsAll = olsBeta(Xall, yObs);

    // ── 3) Tobit MLE ──
    const tob = fitTobit(Xall, yObs);

    // ── 4) Heckman two-step ──
    // Selection: Probit on [1, Z]
    const Zmat: number[][] = Z.map(zi => [1, zi]);
    const gamma = fitProbit(Zmat, dObs);
    // Inverse Mills ratio for selected observations
    const lam: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      const zg = gamma[0] + gamma[1] * Z[i];
      lam[i] = normPdf(zg) / Math.max(normCdf(zg), 1e-9);
    }
    // Outcome regression on selected sample with λ added
    const Xh: number[][] = []; const yh: number[] = []; const lamSel: number[] = [];
    for (let i = 0; i < n; i++) if (dObs[i] === 1) {
      Xh.push([1, X[i], lam[i]]);
      yh.push(yStar[i]);   // selected observed outcome
      lamSel.push(lam[i]);
    }
    const heck = Xh.length > 4 ? olsBeta(Xh, yh) : { beta: [0, 0, 0], resid: [], ssr: 0, XtXinv: [] };
    // Naive OLS on selected sample (ignoring selection)
    const Xn: number[][] = []; const yn: number[] = [];
    for (let i = 0; i < n; i++) if (dObs[i] === 1) { Xn.push([1, X[i]]); yn.push(yStar[i]); }
    const olsSel = Xn.length > 3 ? olsBeta(Xn, yn) : { beta: [0, 0], resid: [], ssr: 0, XtXinv: [] };

    // Censored share / selection share
    const censShare = yObs.filter(v => v === 0).length / n;
    const selShare = dObs.filter(d => d === 1).length / n;

    // Scatter for Tobit view: y vs X, mark censored red, observed gold
    const scatterTob: any[] = [];
    const step = Math.max(1, Math.floor(n / 200));
    for (let i = 0; i < n; i += step) {
      scatterTob.push({ x: X[i], y: yObs[i], censored: yObs[i] === 0 ? 1 : 0 });
    }

    // Mills ratio curve along sorted Zγ
    const sortedI = Array.from({ length: n }, (_, i) => i).sort((a, b) => Z[a] - Z[b]);
    const millsCurve = sortedI.map(i => {
      const zg = gamma[0] + gamma[1] * Z[i];
      return { z: +Z[i].toFixed(3), zg: +zg.toFixed(3), lam: +lam[i].toFixed(4), d: dObs[i] };
    }).filter((_, k) => k % Math.max(1, Math.floor(n / 100)) === 0);

    return {
      betaTrue: beta, alphaTrue: alpha,
      olsCensU: olsCensU.beta,
      olsAll: olsAll.beta,
      tobit: tob,
      olsSel: olsSel.beta,
      heck: heck.beta,            // [α, β, ρσ]
      gamma,
      censShare, selShare,
      scatterTob, millsCurve,
      rhoSigma: heck.beta[2] || 0,
    };
  }, [n, beta, alpha, sigma, selStrength, rho, seed]);

  const tobitRows = [
    { name: t("labs.econV22.text074", { defaultValue: "真实 β" }),                  est: data.betaTrue,     fill: CHART_GOLD },
    { name: t("labs.econV22.text075", { defaultValue: "OLS (含 0, 朴素)" }),        est: data.olsAll[1],     fill: CHART_RED },
    { name: t("labs.econV22.text076", { defaultValue: "OLS (仅观测 y>0)" }),        est: data.olsCensU[1],   fill: CHART_BLUE },
    { name: "Tobit MLE",               est: data.tobit.beta[1], fill: CHART_TEAL },
  ];
  const heckRows = [
    { name: t("labs.econV22.text077", { defaultValue: "真实 β" }),                est: data.betaTrue,    fill: CHART_GOLD },
    { name: t("labs.econV22.text078", { defaultValue: "OLS (选样, 朴素)" }),      est: data.olsSel[1],   fill: CHART_RED },
    { name: t("labs.econV22.text079", { defaultValue: "Heckman 两步" }),          est: data.heck[1],     fill: CHART_TEAL },
  ];

  return (
    <div className="space-y-6">
      <PresetButtons
        presets={tobitPresets(t, (v) => {
          setN(v.n); setBeta(v.beta); setAlpha(v.alpha); setSigma(v.sigma);
          setSel(v.selStrength); setRho(v.rho); setSeed(v.seed);
        })}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Slider label={t("labs.econV22.text080", { defaultValue: "样本量 n" })}           value={n}       min={100} max={1000} step={50} onChange={setN} />
          <Slider label={t("labs.econV22.text081", { defaultValue: "真实 β" })}             value={beta}    min={-2}  max={3}    step={0.1} onChange={setBeta} />
          <Slider label={t("labs.econV22.text082", { defaultValue: "截距 α" })}             sub={t("labs.econV22.text083", { defaultValue: "负值 ⇒ 更多左截断" })} value={alpha} min={-2} max={2} step={0.1} onChange={setAlpha} />
          <Slider label={t("labs.econV22.text084", { defaultValue: "σ (噪声)" })}           value={sigma}   min={0.2} max={3}    step={0.1} onChange={setSigma} />
          <Slider label={t("labs.econV22.text085", { defaultValue: "选择方程强度 γ_z" })}   sub={t("labs.econV22.text086", { defaultValue: "Heckman 用" })} value={selStrength} min={0} max={3} step={0.1} onChange={setSel} />
          <Slider label={t("labs.econV22.text087", { defaultValue: "选择相关性 ρ" })}       sub={t("labs.econV22.text088", { defaultValue: "Cov(ε_y, ε_d), |ρ|>0 ⇒ 选择偏差" })} value={rho} min={-0.95} max={0.95} step={0.05} onChange={setRho} />
          <Slider label={t("labs.econV22.text089", { defaultValue: "随机种子" })}           value={seed}    min={1}   max={200}  step={1}   onChange={setSeed} />
        </div>
        <div className="space-y-2">
          <Stat label={t("labs.econV22.text090", { defaultValue: "左截断比例 (Tobit)" })}  value={(data.censShare * 100).toFixed(1) + "%"} color={CHART_RED} />
          <Stat label={t("labs.econV22.text091", { defaultValue: "选中比例 (Heckman)" })}  value={(data.selShare * 100).toFixed(1) + "%"} color={CHART_BLUE} />
          <Stat label="Tobit β̂"            value={data.tobit.beta[1].toFixed(3)} color={CHART_TEAL}
                sub={`σ̂ = ${data.tobit.sigma.toFixed(3)}`} />
          <Stat label={t("labs.econV22.text092", { defaultValue: "OLS (朴素全样本)" })}    value={data.olsAll[1].toFixed(3)} color={CHART_RED}
                sub={t("labs.econV22.text093", { defaultValue: "偏差 {{v1}}", v1: (data.olsAll[1] - data.betaTrue).toFixed(3) })} />
          <Stat label="Heckman β̂"          value={data.heck[1].toFixed(3)} color={CHART_TEAL}
                sub={t("labs.econV22.text094", { defaultValue: "偏差 {{v1}}", v1: (data.heck[1] - data.betaTrue).toFixed(3) })} />
          <Stat label={t("labs.econV22.text095", { defaultValue: "ρ̂σ̂ (Mills 系数)" })}   value={data.rhoSigma.toFixed(3)}
                color={Math.abs(data.rhoSigma) > 0.2 ? CHART_RED : CHART_TEAL}
                sub={t("labs.econV22.text096", { defaultValue: "≠0 ⇒ 存在选择偏差" })} />
        </div>
      </div>

      {/* Tobit comparison */}
      <div>
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">
          {t("labs.econV22.text097", { defaultValue: "Tobit:左截断模型 β̂ 对比" })}
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={tobitRows} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
            <ReferenceLine y={data.betaTrue} stroke={CHART_GOLD} strokeDasharray="4 3"
              label={{ value: t("labs.econV22.text098", { defaultValue: "真实 β = {{v1}}", v1: data.betaTrue.toFixed(2) }), position: "right", fill: CHART_GOLD, fontSize: 10 }} />
            <Bar dataKey="est" name="β̂">
              {tobitRows.map((r, i) => <Cell key={i} fill={r.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tobit scatter */}
      <div>
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">
          {t("labs.econV22.text099", { defaultValue: "观测散点 y vs X (红=被截断为 0)" })}
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" stroke={CHART_TEXT} tick={{ fontSize: 10 }} name="X" />
            <YAxis type="number" dataKey="y" stroke={CHART_TEXT} tick={{ fontSize: 10 }} name="y" />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
            <Scatter name={t("labs.econV22.text100", { defaultValue: "观测 y>0" })} data={data.scatterTob.filter(d => d.censored === 0)} fill={CHART_GOLD} fillOpacity={0.65} />
            <Scatter name={t("labs.econV22.text101", { defaultValue: "截断 y=0" })}  data={data.scatterTob.filter(d => d.censored === 1)} fill={CHART_RED}  fillOpacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Heckman comparison */}
      <div>
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">
          {t("labs.econV22.text102", { defaultValue: "Heckman:样本选择校正 β̂ 对比" })}
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={heckRows} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
            <ReferenceLine y={data.betaTrue} stroke={CHART_GOLD} strokeDasharray="4 3" />
            <Bar dataKey="est" name="β̂">
              {heckRows.map((r, i) => <Cell key={i} fill={r.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Mills ratio */}
      <div>
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">
          {t("labs.econV22.text103", { defaultValue: "Inverse Mills Ratio λ(Zγ̂) — 沿 Z 排序" })}
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data.millsCurve} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis type="number" dataKey="z" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
            <Line type="monotone" dataKey="lam" stroke={CHART_GOLD} strokeWidth={2} dot={false} name="λ(Zγ̂) = φ/Φ" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border border-gold/20 bg-secondary/20 p-4 text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">{t("labs.econV22.text104", { defaultValue: "两类受限样本问题:" })}</strong></p>
        <p>• <strong>Tobit (Tobin 1958)</strong>{t("labs.econV22.text105", { defaultValue: ": y 在 0 处" })}<em>{t("labs.econV22.text106", { defaultValue: "左截断" })}</em> {t("labs.econV22.text107", { defaultValue: "(例:消费、医疗支出),\n           对 y&gt;0 用密度 φ/σ, 对 y=0 用累计 Φ(−Xβ/σ), MLE 同时估 β 和 σ" })}</p>
        <p>• <strong>{t("labs.econV22.text108", { defaultValue: "Heckman 两步 (1979)" })}</strong>: <em>{t("labs.econV22.text109", { defaultValue: "样本选择" })}</em>{t("labs.econV22.text110", { defaultValue: "问题 (例:工资方程仅观测就业者),\n          第 1 步 Probit 选择方程, 第 2 步对选中样本 OLS 加 Mills λ̂" })}</p>
        <p>• <strong>{t("labs.econV22.text111", { defaultValue: "ρ̂σ̂ 系数" })}</strong>{t("labs.econV22.text112", { defaultValue: ": Heckman 第二步 λ 的回归系数 = ρσ; 显著 ⇒ 存在选择偏差,\n          需要用 Heckman 而非朴素 OLS" })}</p>
        <p className="text-[11px] text-muted-foreground/80">Reference: Tobin (1958) <em>Estimation of Relationships for Limited Dependent Variables</em>, Econometrica 26;
          Heckman (1979) <em>Sample Selection Bias as a Specification Error</em>, Econometrica 47.</p>
      </div>
    </div>
  );
};
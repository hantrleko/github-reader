import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, ComposedChart, Area, ScatterChart, Scatter, BarChart, Bar,
} from "recharts";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import PresetButtons, { Preset } from "../PresetButtons";
import { EquationBlock } from "@/components/common/EquationBlock";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

/* ────────── Shared helpers ────────── */
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
    <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
      <span>{min}</span><span>{max}</span>
    </div>
  </div>
);

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-card border border-border px-3 py-2 shadow-lg">
      <p className="text-[10px] font-mono text-muted-foreground mb-1">t = {label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs font-mono" style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(4) : p.value}
        </p>
      ))}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   1) GARCH(1,1) / EGARCH(1,1) Volatility Modeling
   ════════════════════════════════════════════════════════════ */
export const GARCHTool = () => {
  const [model, setModel] = useState<"garch" | "egarch">("garch");
  const [omega, setOmega] = useState(0.05);
  const [alpha, setAlpha] = useState(0.1);
  const [beta, setBeta] = useState(0.85);
  const [gammaLev, setGammaLev] = useState(-0.1); // EGARCH leverage
  const [n, setN] = useState(500);
  const [seed, setSeed] = useState(42);

  const presets: Preset[] = [
    { name: "教材参数", description: "ω=0.05, α=0.1, β=0.85 (典型股票)",
      apply: () => { setModel("garch"); setOmega(0.05); setAlpha(0.1); setBeta(0.85); setN(500); } },
    { name: "高持续性", description: "α+β≈0.99 接近 IGARCH",
      apply: () => { setModel("garch"); setOmega(0.02); setAlpha(0.08); setBeta(0.91); setN(500); } },
    { name: "杠杆效应", description: "EGARCH γ=−0.15 负冲击放大波动",
      apply: () => { setModel("egarch"); setOmega(-0.1); setAlpha(0.15); setBeta(0.95); setGammaLev(-0.15); setN(500); } },
    { name: "低持续性", description: "α=0.05, β=0.5 波动快速衰减",
      apply: () => { setModel("garch"); setOmega(0.3); setAlpha(0.05); setBeta(0.5); setN(500); } },
  ];

  const sim = useMemo(() => {
    const rng = mulberry32(seed);
    const r: number[] = [];
    const sig2: number[] = [];
    const lnSig2: number[] = [];

    if (model === "garch") {
      let s2 = omega / Math.max(1e-6, 1 - alpha - beta);
      if (!isFinite(s2) || s2 <= 0) s2 = 1;
      let prevR = 0;
      for (let t = 0; t < n; t++) {
        s2 = omega + alpha * prevR * prevR + beta * s2;
        if (!isFinite(s2) || s2 < 1e-8) s2 = 1e-8;
        const eps = randn(rng);
        const rt = Math.sqrt(s2) * eps;
        r.push(rt); sig2.push(s2); prevR = rt;
      }
    } else {
      // EGARCH(1,1): ln σ²_t = ω + β ln σ²_{t-1} + α(|z_{t-1}| - E|z|) + γ z_{t-1}
      const Eabs = Math.sqrt(2 / Math.PI);
      let lns2 = omega / Math.max(1e-6, 1 - beta);
      let prevZ = 0;
      for (let t = 0; t < n; t++) {
        lns2 = omega + beta * lns2 + alpha * (Math.abs(prevZ) - Eabs) + gammaLev * prevZ;
        if (lns2 > 20) lns2 = 20;
        if (lns2 < -20) lns2 = -20;
        const s2 = Math.exp(lns2);
        const z = randn(rng);
        const rt = Math.sqrt(s2) * z;
        r.push(rt); sig2.push(s2); lnSig2.push(lns2); prevZ = z;
      }
    }

    // Compute realised abs(r) for visualization of clustering
    const data = r.map((rt, i) => ({
      t: i,
      ret: parseFloat(rt.toFixed(4)),
      sigma: parseFloat(Math.sqrt(sig2[i]).toFixed(4)),
      sigmaUp: parseFloat((2 * Math.sqrt(sig2[i])).toFixed(4)),
      sigmaDn: parseFloat((-2 * Math.sqrt(sig2[i])).toFixed(4)),
      absRet: parseFloat(Math.abs(rt).toFixed(4)),
    }));

    // ACF of |r| (volatility clustering)
    const ar = r.map(Math.abs);
    const meanAr = ar.reduce((a, b) => a + b, 0) / ar.length;
    const denom = ar.reduce((a, b) => a + (b - meanAr) ** 2, 0);
    const acfData: { lag: number; acf: number; absAcf: number }[] = [];
    const acfRet: number[] = [];
    for (let k = 1; k <= 20; k++) {
      let num = 0;
      for (let i = k; i < ar.length; i++) num += (ar[i] - meanAr) * (ar[i - k] - meanAr);
      const v = num / denom;
      acfData.push({ lag: k, acf: parseFloat(v.toFixed(4)), absAcf: parseFloat(Math.abs(v).toFixed(4)) });
      // ACF of raw returns (should be ~0)
      const meanR = r.reduce((a, b) => a + b, 0) / r.length;
      const denR = r.reduce((a, b) => a + (b - meanR) ** 2, 0);
      let nR = 0;
      for (let i = k; i < r.length; i++) nR += (r[i] - meanR) * (r[i - k] - meanR);
      acfRet.push(nR / denR);
    }
    const acfCombined = acfData.map((d, i) => ({
      ...d,
      acfReturn: parseFloat(acfRet[i].toFixed(4)),
    }));

    // Persistence + unconditional variance
    const persistence = model === "garch" ? alpha + beta : beta;
    const uncondVar = model === "garch"
      ? (alpha + beta < 1 ? omega / (1 - alpha - beta) : NaN)
      : (beta < 1 ? Math.exp(omega / (1 - beta)) : NaN);

    // Confidence band ±1.96/√n for ACF
    const acfBand = 1.96 / Math.sqrt(r.length);

    return { data, acfCombined, persistence, uncondVar, acfBand };
  }, [model, omega, alpha, beta, gammaLev, n, seed]);

  return (
    <>
      {/* Identification info */}
      <div className="rounded-lg bg-secondary/30 border border-gold/15 px-4 py-3 mb-6 text-xs">
        <div className="flex flex-wrap gap-x-6 gap-y-2 items-baseline">
          <span className="font-mono text-gold uppercase tracking-wider text-[10px]">
            {model === "garch" ? "GARCH(1,1)" : "EGARCH(1,1)"}
          </span>
          <div className="text-muted-foreground leading-relaxed flex-1 min-w-[280px]">
            {model === "garch" ? (
              <>
                条件方差递推：<InlineMath math={String.raw`\sigma_t^2 = \omega + \alpha\,r_{t-1}^2 + \beta\,\sigma_{t-1}^2`} />
                <span className="text-foreground/70 ml-1">(Symmetric volatility clustering)</span>
              </>
            ) : (
              <>
                对数方差含杠杆：<InlineMath math={String.raw`\ln\sigma_t^2 = \omega + \beta\ln\sigma_{t-1}^2 + \alpha(|z_{t-1}|-E|z|) + \gamma z_{t-1}`} />
                <span className="text-foreground/70 ml-1">(Asymmetric leverage effect, γ {"<"} 0)</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Controls */}
        <div className="space-y-4">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">参数设置</p>
          <PresetButtons presets={presets} />

          <div className="flex gap-2 mb-2">
            {(["garch", "egarch"] as const).map(m => (
              <button key={m} onClick={() => setModel(m)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-mono transition flex-1 ${
                  model === m ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}>
                {m.toUpperCase()}
              </button>
            ))}
          </div>

          <Slider label="ω (常数)" sub={model === "egarch" ? "(对数尺度)" : ""}
            value={omega} min={model === "egarch" ? -0.5 : 0.001}
            max={model === "egarch" ? 0.5 : 1} step={0.005} onChange={setOmega} />
          <Slider label="α (ARCH)" sub="新息冲击系数" value={alpha} min={0} max={0.5} step={0.005} onChange={setAlpha} />
          <Slider label="β (GARCH)" sub="持续性" value={beta} min={0} max={0.99} step={0.005} onChange={setBeta} />
          {model === "egarch" && (
            <Slider label="γ (杠杆)" sub="负值=负冲击放大波动" value={gammaLev} min={-0.5} max={0.5} step={0.01} onChange={setGammaLev} />
          )}
          <Slider label="样本量 n" value={n} min={200} max={2000} step={50} onChange={setN} />
          <Slider label="随机种子" value={seed} min={1} max={999} step={1} onChange={setSeed} />
        </div>

        {/* Stats */}
        <div className="lg:col-span-2 space-y-4">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">模型诊断</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="text-[10px] font-mono text-muted-foreground uppercase mb-1">持续性 (α+β)</div>
              <div className="text-xl font-mono text-gold">{sim.persistence.toFixed(4)}</div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {sim.persistence >= 1 ? "⚠ 非平稳 (IGARCH)" : sim.persistence > 0.95 ? "高持续" : "正常"}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="text-[10px] font-mono text-muted-foreground uppercase mb-1">无条件方差</div>
              <div className="text-xl font-mono text-foreground">
                {isFinite(sim.uncondVar) ? sim.uncondVar.toFixed(4) : "∞"}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                <InlineMath math={String.raw`\bar{\sigma}^2 = \omega/(1-\alpha-\beta)`} />
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="text-[10px] font-mono text-muted-foreground uppercase mb-1">半衰期 (天)</div>
              <div className="text-xl font-mono text-foreground">
                {sim.persistence < 1 ? (Math.log(0.5) / Math.log(sim.persistence)).toFixed(1) : "∞"}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">冲击衰减一半所需时间</div>
            </div>
          </div>

          {/* Returns + sigma band */}
          <div>
            <p className="text-[10px] font-mono text-muted-foreground uppercase mb-2">收益率序列与 ±2σ 条件波动带</p>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={sim.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                  <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                  <Tooltip content={<Tip />} />
                  <ReferenceLine y={0} stroke={CHART_TEXT} strokeDasharray="2 4" />
                  <Area type="monotone" dataKey="sigmaUp" stroke="none" fill={CHART_GOLD} fillOpacity={0.08} />
                  <Area type="monotone" dataKey="sigmaDn" stroke="none" fill={CHART_GOLD} fillOpacity={0.08} />
                  <Line type="monotone" dataKey="ret" stroke={CHART_BLUE} strokeWidth={1} dot={false} name="rₜ" />
                  <Line type="monotone" dataKey="sigma" stroke={CHART_GOLD} strokeWidth={1.5} dot={false} name="σₜ" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ACF chart */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-[10px] font-mono text-muted-foreground uppercase mb-2">
          自相关函数 ACF — 验证波动率聚类 (|rₜ| 应显著正相关，rₜ 应接近 0)
        </p>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={sim.acfCombined}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="lag" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "Lag", fill: CHART_TEXT, fontSize: 10, position: "insideBottom", offset: -2 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} domain={[-0.3, 0.5]} />
              <Tooltip content={<Tip />} />
              <ReferenceLine y={sim.acfBand} stroke={CHART_RED} strokeDasharray="3 3" label={{ value: "+1.96/√n", fill: CHART_RED, fontSize: 9, position: "right" }} />
              <ReferenceLine y={-sim.acfBand} stroke={CHART_RED} strokeDasharray="3 3" />
              <ReferenceLine y={0} stroke={CHART_TEXT} />
              <Bar dataKey="acf" fill={CHART_GOLD} name="ACF |rₜ|" />
              <Line type="monotone" dataKey="acfReturn" stroke={CHART_TEAL} strokeWidth={1.5} dot={{ r: 2 }} name="ACF rₜ" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground mt-2 text-center">
          金色柱 = |rₜ| 的 ACF (波动率聚类)；青色线 = rₜ 的 ACF (应在红色 95% 置信带内 ≈ 白噪声)
        </p>
      </div>
    </>
  );
};

/* ════════════════════════════════════════════════════════════
   2) Cointegration + VECM (Engle-Granger 2-step)
   ════════════════════════════════════════════════════════════ */
export const CointTool = () => {
  const [n, setN] = useState(200);
  const [betaTrue, setBetaTrue] = useState(1.5);
  const [alphaTrue, setAlphaTrue] = useState(2);
  const [adjustSpeed, setAdjustSpeed] = useState(-0.3); // VECM α (loading)
  const [sigmaEps, setSigmaEps] = useState(0.5);
  const [seed, setSeed] = useState(7);
  const [spurious, setSpurious] = useState(false);

  const presets: Preset[] = [
    { name: "强协整", description: "调整速度 −0.5, 误差快速回归",
      apply: () => { setSpurious(false); setBetaTrue(1.5); setAlphaTrue(2); setAdjustSpeed(-0.5); setSigmaEps(0.5); setN(200); } },
    { name: "弱协整", description: "调整速度 −0.1, 缓慢回归",
      apply: () => { setSpurious(false); setBetaTrue(1.2); setAlphaTrue(1); setAdjustSpeed(-0.1); setSigmaEps(0.5); setN(200); } },
    { name: "伪回归", description: "两个独立 I(1) 序列, 无协整",
      apply: () => { setSpurious(true); setSigmaEps(1); setN(200); } },
    { name: "长样本", description: "n=500 提高检验功效",
      apply: () => { setSpurious(false); setBetaTrue(1.5); setAdjustSpeed(-0.3); setN(500); } },
  ];

  const sim = useMemo(() => {
    const rng = mulberry32(seed);
    const x: number[] = [0];
    const y: number[] = [0];

    if (spurious) {
      // Two independent random walks
      for (let t = 1; t < n; t++) {
        x.push(x[t - 1] + randn(rng));
        y.push(y[t - 1] + randn(rng));
      }
    } else {
      // Cointegrated: x is RW, y = α + β x + stationary u
      let u = 0;
      for (let t = 1; t < n; t++) {
        x.push(x[t - 1] + randn(rng));
        u = (1 + adjustSpeed) * u + sigmaEps * randn(rng); // AR(1) with persistence (1+adjustSpeed)
        y.push(alphaTrue + betaTrue * x[t] + u);
      }
    }

    // Step 1: OLS y = a + b*x
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    let sxx = 0, sxy = 0;
    for (let i = 0; i < n; i++) { sxx += (x[i] - meanX) ** 2; sxy += (x[i] - meanX) * (y[i] - meanY); }
    const bHat = sxy / sxx;
    const aHat = meanY - bHat * meanX;
    const resid: number[] = y.map((yi, i) => yi - aHat - bHat * x[i]);

    // Step 2: ADF on residuals (regression Δuₜ = ρ uₜ₋₁ + ε; test ρ=0)
    // Simplified Dickey-Fuller: regress du on u_{t-1}
    const du: number[] = [];
    const ulag: number[] = [];
    for (let t = 1; t < n; t++) {
      du.push(resid[t] - resid[t - 1]);
      ulag.push(resid[t - 1]);
    }
    const m = du.length;
    const meanU = ulag.reduce((a, b) => a + b, 0) / m;
    const meanDu = du.reduce((a, b) => a + b, 0) / m;
    let suu = 0, sudu = 0;
    for (let i = 0; i < m; i++) { suu += (ulag[i] - meanU) ** 2; sudu += (ulag[i] - meanU) * (du[i] - meanDu); }
    const rho = sudu / suu;
    // residual SE
    let rss = 0;
    for (let i = 0; i < m; i++) {
      const pred = meanDu + rho * (ulag[i] - meanU);
      rss += (du[i] - pred) ** 2;
    }
    const sigma2 = rss / (m - 2);
    const seRho = Math.sqrt(sigma2 / suu);
    const tStat = rho / seRho;
    // Critical values (MacKinnon approx for cointegration test, no constant in resid regression, n=∞)
    // For 2-variable Engle-Granger with constant: 5%≈-3.34, 1%≈-3.90
    const crit5 = -3.34;
    const crit1 = -3.90;
    const cointReject = tStat < crit5;

    // Step 3: VECM if cointegrated. Δyₜ = α(yₜ₋₁ - β xₜ₋₁) + γ Δxₜ + ε
    // Estimate α (adjustment) by regressing Δy on residual lagged
    const dy: number[] = [];
    const dx: number[] = [];
    const ecmLag: number[] = [];
    for (let t = 1; t < n; t++) {
      dy.push(y[t] - y[t - 1]);
      dx.push(x[t] - x[t - 1]);
      ecmLag.push(resid[t - 1]);
    }
    // OLS: dy = c + α*ecmLag + γ*dx
    // Multiple regression closed-form (3 params)
    const k = dy.length;
    let Sxx2 = 0, Sxy2 = 0, See = 0, Sex = 0, Sey = 0, Sxe = 0;
    const meanEcm = ecmLag.reduce((a, b) => a + b, 0) / k;
    const meanDx = dx.reduce((a, b) => a + b, 0) / k;
    const meanDy = dy.reduce((a, b) => a + b, 0) / k;
    // Build normal equations for 2 regressors (after demean): [α, γ] = (X'X)^-1 X'y
    let A11 = 0, A12 = 0, A22 = 0, B1 = 0, B2 = 0;
    for (let i = 0; i < k; i++) {
      const e = ecmLag[i] - meanEcm;
      const d = dx[i] - meanDx;
      const yy = dy[i] - meanDy;
      A11 += e * e; A22 += d * d; A12 += e * d;
      B1 += e * yy; B2 += d * yy;
    }
    const det = A11 * A22 - A12 * A12;
    const alphaVECM = (A22 * B1 - A12 * B2) / det;
    const gammaVECM = (A11 * B2 - A12 * B1) / det;
    const cVECM = meanDy - alphaVECM * meanEcm - gammaVECM * meanDx;
    // SE for α
    let rssV = 0;
    for (let i = 0; i < k; i++) {
      const pred = cVECM + alphaVECM * ecmLag[i] + gammaVECM * dx[i];
      rssV += (dy[i] - pred) ** 2;
    }
    const sV = rssV / (k - 3);
    const seAlpha = Math.sqrt(sV * A22 / det);
    const tAlpha = alphaVECM / seAlpha;

    // Build chart data
    const seriesData = x.map((xi, i) => ({
      t: i,
      x: parseFloat(xi.toFixed(3)),
      y: parseFloat(y[i].toFixed(3)),
      resid: parseFloat(resid[i].toFixed(3)),
    }));

    return {
      x, y, resid, seriesData,
      aHat, bHat, rho, tStat, crit5, crit1, cointReject,
      alphaVECM, gammaVECM, seAlpha, tAlpha,
      n,
    };
  }, [n, betaTrue, alphaTrue, adjustSpeed, sigmaEps, seed, spurious]);

  return (
    <>
      <div className="rounded-lg bg-secondary/30 border border-gold/15 px-4 py-3 mb-6 text-xs">
        <div className="flex flex-wrap gap-x-4 gap-y-2 items-baseline">
          <span className="font-mono text-gold uppercase tracking-wider text-[10px]">Engle-Granger (1987)</span>
          <div className="text-muted-foreground leading-relaxed flex-1 min-w-[300px]">
            两步法：① OLS 估计长期均衡 <InlineMath math="y_t = \alpha + \beta x_t + u_t" />；
            ② 对残差 ADF 检验单位根；③ 若拒绝 → 估计 VECM
            <InlineMath math={String.raw`\;\Delta y_t = \alpha_{\mathrm{ec}}\, u_{t-1} + \gamma\,\Delta x_t + \varepsilon_t`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="space-y-4">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">DGP 参数</p>
          <PresetButtons presets={presets} />
          <div className="flex items-center gap-2 text-xs">
            <input type="checkbox" id="spur" checked={spurious} onChange={e => setSpurious(e.target.checked)} className="accent-gold" />
            <label htmlFor="spur" className="text-secondary-foreground">伪回归模式 (两独立 I(1))</label>
          </div>
          {!spurious && (
            <>
              <Slider label="α (截距)" value={alphaTrue} min={-5} max={5} step={0.1} onChange={setAlphaTrue} />
              <Slider label="β (协整向量)" value={betaTrue} min={-3} max={3} step={0.05} onChange={setBetaTrue} />
              <Slider label="调整速度" sub="VECM 中 αₑc, 越负越快" value={adjustSpeed} min={-0.9} max={-0.02} step={0.02} onChange={setAdjustSpeed} />
              <Slider label="σ_ε (新息标准差)" value={sigmaEps} min={0.1} max={2} step={0.05} onChange={setSigmaEps} />
            </>
          )}
          <Slider label="样本量 n" value={n} min={50} max={500} step={10} onChange={setN} />
          <Slider label="随机种子" value={seed} min={1} max={999} step={1} onChange={setSeed} />
        </div>

        <div className="lg:col-span-2 space-y-4">
          {/* Two series chart */}
          <div>
            <p className="text-[10px] font-mono text-muted-foreground uppercase mb-2">两序列原始路径 (I(1) 非平稳)</p>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sim.seriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                  <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                  <Tooltip content={<Tip />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="x" stroke={CHART_BLUE} dot={false} strokeWidth={1.5} name="xₜ" />
                  <Line type="monotone" dataKey="y" stroke={CHART_GOLD} dot={false} strokeWidth={1.5} name="yₜ" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Residual chart */}
          <div>
            <p className="text-[10px] font-mono text-muted-foreground uppercase mb-2">
              残差 uₜ = yₜ − α̂ − β̂ xₜ {sim.cointReject ? "(平稳 ✓ 协整)" : "(非平稳 ✗ 伪回归)"}
            </p>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sim.seriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                  <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                  <Tooltip content={<Tip />} />
                  <ReferenceLine y={0} stroke={CHART_TEXT} strokeDasharray="2 4" />
                  <Line type="monotone" dataKey="resid" stroke={sim.cointReject ? CHART_TEAL : CHART_RED} dot={false} strokeWidth={1.2} name="uₜ" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Test results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[10px] font-mono text-gold uppercase tracking-wider mb-3">协整检验 (Engle-Granger ADF)</p>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground">长期关系 β̂</span>
              <span className="text-foreground tabular-nums">{sim.bHat.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">截距 α̂</span>
              <span className="text-foreground tabular-nums">{sim.aHat.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ADF 统计量 t</span>
              <span className="text-foreground tabular-nums">{sim.tStat.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">5% 临界值</span>
              <span className="text-foreground/70 tabular-nums">{sim.crit5.toFixed(2)}</span>
            </div>
            <div className={`mt-2 px-2 py-1.5 rounded text-center font-mono ${
              sim.cointReject ? "bg-gold/15 text-gold" : "bg-destructive/10 text-destructive"
            }`}>
              {sim.cointReject ? "✓ 拒绝 H₀: 序列协整" : "✗ 不拒绝 H₀: 无协整"}
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[10px] font-mono uppercase tracking-wider mb-3" style={{ color: CHART_TEAL }}>
            VECM 误差修正模型
          </p>
          <div className="space-y-2 text-xs font-mono">
            <div className="text-[10px] text-muted-foreground mb-2">
              <InlineMath math={String.raw`\Delta y_t = c + \alpha_{\mathrm{ec}}\,u_{t-1} + \gamma\,\Delta x_t + \varepsilon_t`} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">调整速度 α̂_ec</span>
              <span className="text-foreground tabular-nums">{sim.alphaVECM.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SE(α̂_ec)</span>
              <span className="text-foreground/70 tabular-nums">{sim.seAlpha.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">t 统计量</span>
              <span className="text-foreground tabular-nums">{sim.tAlpha.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">短期效应 γ̂</span>
              <span className="text-foreground tabular-nums">{sim.gammaVECM.toFixed(4)}</span>
            </div>
            <div className={`mt-2 px-2 py-1.5 rounded text-center font-mono ${
              sim.alphaVECM < 0 && Math.abs(sim.tAlpha) > 1.96 ? "bg-gold/15 text-gold" : "bg-secondary text-muted-foreground"
            }`}>
              {sim.alphaVECM < 0 && Math.abs(sim.tAlpha) > 1.96
                ? "✓ 显著负调整，向均衡回归"
                : "调整效应不显著"}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

/* ════════════════════════════════════════════════════════════
   3) Kalman Filter — Dynamic β + HP Filter
   ════════════════════════════════════════════════════════════ */
export const KalmanTool = () => {
  const [mode, setMode] = useState<"beta" | "hp">("beta");
  // Dynamic β params
  const [n, setN] = useState(250);
  const [beta0, setBeta0] = useState(1.0);
  const [betaDrift, setBetaDrift] = useState(0.005); // structural shift speed
  const [sigmaObs, setSigmaObs] = useState(0.02); // R
  const [sigmaState, setSigmaState] = useState(0.01); // Q
  const [seed, setSeed] = useState(11);
  // HP filter param
  const [lambda, setLambda] = useState(1600);

  const presets: Preset[] = mode === "beta" ? [
    { name: "稳定 β", description: "β 几乎不变, Q 极小",
      apply: () => { setBeta0(1.2); setBetaDrift(0); setSigmaState(0.002); setSigmaObs(0.02); setN(250); } },
    { name: "缓慢漂移", description: "β 从 1.0 漂移到 1.5",
      apply: () => { setBeta0(1.0); setBetaDrift(0.002); setSigmaState(0.01); setN(250); } },
    { name: "结构突变", description: "中段 β 跳变",
      apply: () => { setBeta0(0.8); setBetaDrift(0.015); setSigmaState(0.02); setN(250); } },
    { name: "高观测噪声", description: "R 大, Kalman 平滑更强",
      apply: () => { setBeta0(1.0); setBetaDrift(0.005); setSigmaObs(0.06); setSigmaState(0.005); setN(250); } },
  ] : [
    { name: "标准季度 (λ=1600)", description: "Hodrick-Prescott 经典值",
      apply: () => { setLambda(1600); setN(200); } },
    { name: "年度数据 (λ=100)", description: "R&S 推荐",
      apply: () => { setLambda(100); setN(200); } },
    { name: "月度数据 (λ=14400)", description: "Ravn-Uhlig 准则",
      apply: () => { setLambda(14400); setN(300); } },
    { name: "极平滑 (λ=10⁶)", description: "趋势近似线性",
      apply: () => { setLambda(1000000); setN(200); } },
  ];

  const sim = useMemo(() => {
    const rng = mulberry32(seed);

    if (mode === "beta") {
      // True dynamic β: β_t = β_{t-1} + drift + state_noise
      // y_t = β_t * x_t + obs_noise
      const xs: number[] = [];
      const ys: number[] = [];
      const trueBeta: number[] = [];
      let bt = beta0;
      for (let t = 0; t < n; t++) {
        bt = bt + betaDrift + sigmaState * randn(rng);
        trueBeta.push(bt);
        const xt = 0.5 + 2 * Math.sin(t * 0.05) + 0.5 * randn(rng);
        xs.push(xt);
        ys.push(bt * xt + sigmaObs * randn(rng));
      }

      // OLS estimate (constant β)
      const meanX = xs.reduce((a, b) => a + b, 0) / n;
      const meanY = ys.reduce((a, b) => a + b, 0) / n;
      let sxx = 0, sxy = 0;
      for (let i = 0; i < n; i++) { sxx += (xs[i] - meanX) ** 2; sxy += (xs[i] - meanX) * (ys[i] - meanY); }
      const olsBeta = sxy / sxx;

      // Rolling OLS (window=30)
      const W = 30;
      const rollBeta: (number | null)[] = [];
      for (let t = 0; t < n; t++) {
        if (t < W - 1) { rollBeta.push(null); continue; }
        let mx = 0, my = 0;
        for (let i = t - W + 1; i <= t; i++) { mx += xs[i]; my += ys[i]; }
        mx /= W; my /= W;
        let sx = 0, sy = 0;
        for (let i = t - W + 1; i <= t; i++) { sx += (xs[i] - mx) ** 2; sy += (xs[i] - mx) * (ys[i] - my); }
        rollBeta.push(sy / sx);
      }

      // Kalman filter: state β_t, transition β_t = β_{t-1} (random walk), Q = sigmaState^2
      // observation y_t = x_t β_t + ε, R = sigmaObs^2
      const Q = sigmaState * sigmaState;
      const R = sigmaObs * sigmaObs;
      let bHat = beta0; // prior mean
      let P = 1.0;       // prior variance
      const kfBeta: number[] = [];
      const kfUp: number[] = [];
      const kfDn: number[] = [];
      for (let t = 0; t < n; t++) {
        // Predict
        const bPred = bHat;
        const PPred = P + Q;
        // Update
        const xt = xs[t];
        const S = xt * PPred * xt + R;
        const K = PPred * xt / S;
        bHat = bPred + K * (ys[t] - xt * bPred);
        P = (1 - K * xt) * PPred;
        kfBeta.push(bHat);
        kfUp.push(bHat + 1.96 * Math.sqrt(P));
        kfDn.push(bHat - 1.96 * Math.sqrt(P));
      }

      const data = xs.map((_, i) => ({
        t: i,
        trueBeta: parseFloat(trueBeta[i].toFixed(4)),
        ols: parseFloat(olsBeta.toFixed(4)),
        roll: rollBeta[i] !== null ? parseFloat(rollBeta[i]!.toFixed(4)) : null,
        kf: parseFloat(kfBeta[i].toFixed(4)),
        kfUp: parseFloat(kfUp[i].toFixed(4)),
        kfDn: parseFloat(kfDn[i].toFixed(4)),
      }));

      // RMSE
      const rmseOLS = Math.sqrt(trueBeta.reduce((a, bt, i) => a + (bt - olsBeta) ** 2, 0) / n);
      const rmseKF = Math.sqrt(trueBeta.reduce((a, bt, i) => a + (bt - kfBeta[i]) ** 2, 0) / n);

      return { mode: "beta" as const, data, rmseOLS, rmseKF, finalP: P };
    } else {
      // HP Filter: synthetic GDP-like series with trend + cycle
      const ys: number[] = [];
      const trueTrend: number[] = [];
      const trueCycle: number[] = [];
      for (let t = 0; t < n; t++) {
        const trend = 100 + 0.4 * t + 0.001 * t * t;
        const cycle = 5 * Math.sin(2 * Math.PI * t / 30) + 3 * Math.cos(2 * Math.PI * t / 18);
        const noise = 0.5 * randn(rng);
        trueTrend.push(trend);
        trueCycle.push(cycle);
        ys.push(trend + cycle + noise);
      }

      // Solve HP: minimize Σ(y - τ)² + λ Σ((τ_{t+1}-τ_t)-(τ_t-τ_{t-1}))²
      // Linear system (I + λ K'K) τ = y, where K is second-difference operator
      // Build pentadiagonal matrix, solve via Thomas algorithm extension or simple Gaussian for n<500
      const N = n;
      // Construct A as banded
      // Diagonal contributions from K'K (n-2 rows, each [1,-2,1])
      // Equivalent: A[i][i] += 1; for HP, diag and bands precomputed
      const A: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
      for (let i = 0; i < N; i++) A[i][i] = 1;
      // K is (n-2) × n with rows [1 -2 1] starting at col i
      // K'K diag: corner adjustments
      for (let i = 0; i < N - 2; i++) {
        // row i of K affects τ[i], τ[i+1], τ[i+2]
        const c = [1, -2, 1];
        for (let a = 0; a < 3; a++) {
          for (let b = 0; b < 3; b++) {
            A[i + a][i + b] += lambda * c[a] * c[b];
          }
        }
      }
      // Solve A τ = y via LU (Gaussian elimination, OK for n≤300)
      const M = A.map((row, i) => [...row, ys[i]]);
      for (let i = 0; i < N; i++) {
        // pivot
        let maxRow = i;
        for (let k = i + 1; k < N; k++) if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
        [M[i], M[maxRow]] = [M[maxRow], M[i]];
        const piv = M[i][i];
        if (Math.abs(piv) < 1e-12) continue;
        for (let k = i + 1; k < N; k++) {
          const f = M[k][i] / piv;
          if (f === 0) continue;
          for (let j = i; j <= N; j++) M[k][j] -= f * M[i][j];
        }
      }
      const tau = new Array(N).fill(0);
      for (let i = N - 1; i >= 0; i--) {
        let s = M[i][N];
        for (let j = i + 1; j < N; j++) s -= M[i][j] * tau[j];
        tau[i] = s / M[i][i];
      }
      const cycle = ys.map((y, i) => y - tau[i]);

      const data = ys.map((y, i) => ({
        t: i,
        y: parseFloat(y.toFixed(3)),
        trend: parseFloat(tau[i].toFixed(3)),
        cycle: parseFloat(cycle[i].toFixed(3)),
        trueTrend: parseFloat(trueTrend[i].toFixed(3)),
        trueCycle: parseFloat(trueCycle[i].toFixed(3)),
      }));
      const cycleStd = Math.sqrt(cycle.reduce((a, c) => a + c * c, 0) / N);
      const rmseTrend = Math.sqrt(tau.reduce((a, t, i) => a + (t - trueTrend[i]) ** 2, 0) / N);

      return { mode: "hp" as const, data, lambda, cycleStd, rmseTrend };
    }
  }, [mode, n, beta0, betaDrift, sigmaObs, sigmaState, seed, lambda]);

  return (
    <>
      <div className="rounded-lg bg-secondary/30 border border-gold/15 px-4 py-3 mb-6 text-xs">
        <div className="flex flex-wrap gap-x-4 gap-y-2 items-baseline">
          <span className="font-mono text-gold uppercase tracking-wider text-[10px]">
            {mode === "beta" ? "Kalman Filter — Dynamic β" : "Hodrick-Prescott Filter"}
          </span>
          <div className="text-muted-foreground leading-relaxed flex-1 min-w-[300px]">
            {mode === "beta" ? (
              <>
                状态空间：<InlineMath math={String.raw`\beta_t = \beta_{t-1} + \eta_t,\;\; y_t = x_t\beta_t + \varepsilon_t`} />
                ；最优递推估计 <InlineMath math={String.raw`\hat\beta_{t|t} = \hat\beta_{t|t-1} + K_t(y_t - x_t\hat\beta_{t|t-1})`} />
              </>
            ) : (
              <>
                趋势分解：<InlineMath math={String.raw`\min_\tau \sum (y_t-\tau_t)^2 + \lambda\sum\bigl((\tau_{t+1}-\tau_t)-(\tau_t-\tau_{t-1})\bigr)^2`} />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {(["beta", "hp"] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-md text-xs font-mono transition flex-1 md:flex-none ${
              mode === m ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}>
            {m === "beta" ? "动态 β (CAPM)" : "HP 滤波 (趋势/周期)"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="space-y-4">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">参数设置</p>
          <PresetButtons presets={presets} />
          <Slider label="样本量 n" value={n} min={50} max={400} step={10} onChange={setN} />
          {mode === "beta" ? (
            <>
              <Slider label="β₀ (初始值)" value={beta0} min={0} max={3} step={0.05} onChange={setBeta0} />
              <Slider label="漂移速度" value={betaDrift} min={-0.02} max={0.02} step={0.001} onChange={setBetaDrift} />
              <Slider label="σ_state (Q)" sub="状态噪声" value={sigmaState} min={0.001} max={0.05} step={0.001} onChange={setSigmaState} />
              <Slider label="σ_obs (R)" sub="观测噪声" value={sigmaObs} min={0.005} max={0.1} step={0.005} onChange={setSigmaObs} />
            </>
          ) : (
            <Slider label="λ (平滑参数)" sub="越大越平滑" value={lambda} min={10} max={1000000} step={10} onChange={setLambda} />
          )}
          <Slider label="随机种子" value={seed} min={1} max={999} step={1} onChange={setSeed} />
        </div>

        <div className="lg:col-span-2 space-y-4">
          {sim.mode === "beta" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase mb-1">RMSE OLS (静态)</div>
                  <div className="text-xl font-mono text-destructive">{sim.rmseOLS.toFixed(4)}</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase mb-1">RMSE Kalman</div>
                  <div className="text-xl font-mono text-gold">{sim.rmseKF.toFixed(4)}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    改进 {((1 - sim.rmseKF / sim.rmseOLS) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase mb-2">
                  动态 β 估计对比 — Kalman 滤波 vs OLS vs 滚动窗口(30)
                </p>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={sim.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                      <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                      <Tooltip content={<Tip />} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Area type="monotone" dataKey="kfUp" stroke="none" fill={CHART_GOLD} fillOpacity={0.1} legendType="none" />
                      <Area type="monotone" dataKey="kfDn" stroke="none" fill={CHART_GOLD} fillOpacity={0.1} legendType="none" />
                      <Line type="monotone" dataKey="trueBeta" stroke={CHART_BLUE} strokeWidth={2} dot={false} name="真实 βₜ" />
                      <Line type="monotone" dataKey="kf" stroke={CHART_GOLD} strokeWidth={1.8} dot={false} name="Kalman β̂" />
                      <Line type="monotone" dataKey="roll" stroke={CHART_TEAL} strokeWidth={1.2} strokeDasharray="4 3" dot={false} name="滚动 OLS" connectNulls />
                      <Line type="monotone" dataKey="ols" stroke={CHART_RED} strokeWidth={1.2} strokeDasharray="2 4" dot={false} name="全样本 OLS" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase mb-1">趋势 RMSE</div>
                  <div className="text-xl font-mono text-gold">{sim.rmseTrend.toFixed(3)}</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase mb-1">周期 σ</div>
                  <div className="text-xl font-mono text-foreground">{sim.cycleStd.toFixed(3)}</div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase mb-2">原始序列 + HP 趋势</p>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sim.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                      <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                      <Tooltip content={<Tip />} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="y" stroke={CHART_BLUE} strokeWidth={1} dot={false} name="yₜ" />
                      <Line type="monotone" dataKey="trend" stroke={CHART_GOLD} strokeWidth={2} dot={false} name="HP 趋势 τₜ" />
                      <Line type="monotone" dataKey="trueTrend" stroke={CHART_TEAL} strokeWidth={1} strokeDasharray="3 3" dot={false} name="真实趋势" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase mb-2">周期分量 cₜ = yₜ − τₜ</p>
                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sim.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                      <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                      <Tooltip content={<Tip />} />
                      <ReferenceLine y={0} stroke={CHART_TEXT} strokeDasharray="2 4" />
                      <Line type="monotone" dataKey="cycle" stroke={CHART_RED} strokeWidth={1.2} dot={false} name="HP 周期" />
                      <Line type="monotone" dataKey="trueCycle" stroke={CHART_TEAL} strokeWidth={1} strokeDasharray="3 3" dot={false} name="真实周期" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

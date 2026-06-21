import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Area, ComposedChart, BarChart, Bar, ScatterChart, Scatter, ReferenceLine,
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

/* OLS with HC0 SE */
function olsFull(X: number[][], y: number[]) {
  const n = y.length, k = X[0].length;
  const XtX = Array.from({ length: k }, () => new Array(k).fill(0));
  const Xty = new Array(k).fill(0);
  for (let i = 0; i < n; i++)
    for (let r = 0; r < k; r++) {
      Xty[r] += X[i][r] * y[i];
      for (let c = 0; c < k; c++) XtX[r][c] += X[i][r] * X[i][c];
    }
  // invert
  const Inv: number[][] = [];
  for (let j = 0; j < k; j++) {
    const e = new Array(k).fill(0); e[j] = 1;
    const col = solveLinear(XtX.map(r => [...r]), e);
    if (!col) return null;
    Inv.push(col);
  }
  const beta = new Array(k).fill(0);
  for (let r = 0; r < k; r++) for (let j = 0; j < k; j++) beta[r] += Inv[r][j] * Xty[j];
  let ssr = 0; const yhat = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let yh = 0;
    for (let r = 0; r < k; r++) yh += X[i][r] * beta[r];
    yhat[i] = yh; ssr += (y[i] - yh) ** 2;
  }
  const ymean = y.reduce((a, b) => a + b, 0) / n;
  let sst = 0; for (const v of y) sst += (v - ymean) ** 2;
  const sigma2 = ssr / Math.max(n - k, 1);
  const se = new Array(k).fill(0);
  for (let r = 0; r < k; r++) se[r] = Math.sqrt(Math.max(sigma2 * Inv[r][r], 0));
  return { beta, se, r2: 1 - ssr / Math.max(sst, 1e-12), n, k, yhat };
}

/* ════════════════════════════════════════════════════════════
   1. Realized Volatility / HAR-RV (Corsi 2009)
   ════════════════════════════════════════════════════════════ */
export const HARRVTool = () => {
  const [days, setDays] = useState(250);
  const [intraN, setIntraN] = useState(78);     // 5-min bars / day (~6.5h)
  const [meanVol, setMeanVol] = useState(0.20); // annualised
  const [persist, setPersist] = useState(0.95);
  const [jumpProb, setJumpProb] = useState(0.05);
  const [jumpSize, setJumpSize] = useState(2.5);
  const [seed, setSeed] = useState(11);

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    const dt = 1 / (252 * intraN);
    // Daily integrated variance follows AR(1) in log
    let logIV = Math.log((meanVol ** 2) / 252);
    const muLog = Math.log((meanVol ** 2) / 252);
    const sigLog = 0.4;
    const RV: number[] = [], BV: number[] = [], JV: number[] = [], dates: number[] = [];
    for (let d = 0; d < days; d++) {
      logIV = muLog + persist * (logIV - muLog) + sigLog * Math.sqrt(1 - persist * persist) * randn(rng);
      const sig2Daily = Math.exp(logIV);
      const sigBar = Math.sqrt(sig2Daily / intraN);
      // Generate intraday returns
      const r: number[] = new Array(intraN);
      let rv = 0;
      for (let j = 0; j < intraN; j++) {
        let rj = sigBar * randn(rng);
        if (rng() < jumpProb / intraN) rj += jumpSize * sigBar * (rng() < 0.5 ? -1 : 1) * 4;
        r[j] = rj; rv += rj * rj;
      }
      // Bipower variation: (π/2) Σ |r_i| |r_{i-1}|
      let bv = 0;
      for (let j = 1; j < intraN; j++) bv += Math.abs(r[j]) * Math.abs(r[j - 1]);
      bv *= Math.PI / 2;
      const jv = Math.max(rv - bv, 0);
      RV.push(rv); BV.push(bv); JV.push(jv); dates.push(d + 1);
    }
    // HAR-RV regression: RV_t = β0 + βd RV_{t-1} + βw RV_{t-1:t-5} + βm RV_{t-1:t-22} + ε
    const startT = 22;
    const Xrows: number[][] = [], yv: number[] = [];
    for (let t = startT; t < days; t++) {
      const rvD = RV[t - 1];
      let rvW = 0; for (let k = 1; k <= 5; k++) rvW += RV[t - k]; rvW /= 5;
      let rvM = 0; for (let k = 1; k <= 22; k++) rvM += RV[t - k]; rvM /= 22;
      Xrows.push([1, rvD, rvW, rvM]); yv.push(RV[t]);
    }
    const fit = olsFull(Xrows, yv);
    // Annualised RV plot (% vol)
    const ann = (v: number) => Math.sqrt(Math.max(v, 0) * 252) * 100;
    const series = RV.map((v, i) => ({
      day: dates[i],
      rvAnn: +ann(v).toFixed(3),
      bvAnn: +ann(BV[i]).toFixed(3),
      jvAnn: +ann(JV[i]).toFixed(3),
    }));
    // In-sample fitted vs actual (annualised)
    let fitted: { day: number; actual: number; pred: number }[] = [];
    if (fit) {
      for (let i = 0; i < yv.length; i++) {
        fitted.push({
          day: startT + i + 1,
          actual: +ann(yv[i]).toFixed(3),
          pred: +ann(fit.yhat[i]).toFixed(3),
        });
      }
    }
    const jumpDays = JV.filter(v => v > 1e-12).length;
    return { series, fit, fitted, jumpDays, RV };
  }, [days, intraN, meanVol, persist, jumpProb, jumpSize, seed]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "平稳市场", description: "低跳跃、中等持续", apply: () => { setMeanVol(0.18); setPersist(0.95); setJumpProb(0.02); setJumpSize(2.0); } },
        { name: "高跳跃环境", description: "盈利公告/危机", apply: () => { setMeanVol(0.25); setPersist(0.92); setJumpProb(0.20); setJumpSize(4.0); } },
        { name: "强持续高波动", description: "GFC/疫情情景", apply: () => { setMeanVol(0.35); setPersist(0.98); setJumpProb(0.05); setJumpSize(2.5); } },
        { name: "近似 BS 假设", description: "无跳跃、低持续", apply: () => { setMeanVol(0.20); setPersist(0.50); setJumpProb(0.0); setJumpSize(0); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label="样本天数" value={days} min={60} max={500} step={10} onChange={setDays} />
          <Slider label="日内 5-min 频次" sub="N" value={intraN} min={20} max={150} step={1} onChange={setIntraN} />
          <Slider label="平均年化波动" value={meanVol} min={0.05} max={0.6} step={0.01} onChange={setMeanVol} fmt={(v)=>(v*100).toFixed(1)+"%"} />
          <Slider label="波动持续性 ρ" value={persist} min={0} max={0.995} step={0.005} onChange={setPersist} />
          <Slider label="跳跃强度 (日)" value={jumpProb} min={0} max={0.4} step={0.01} onChange={setJumpProb} />
          <Slider label="跳跃幅度倍数" value={jumpSize} min={0} max={6} step={0.1} onChange={setJumpSize} />
          <Slider label="随机种子" value={seed} min={1} max={999} step={1} onChange={setSeed} />
        </div>
        <div className="space-y-2">
          {data.fit ? <>
            <Stat label="HAR β_d (日)"  value={data.fit.beta[1].toFixed(3)} sub={`SE ${data.fit.se[1].toFixed(3)}`} />
            <Stat label="HAR β_w (周)"  value={data.fit.beta[2].toFixed(3)} sub={`SE ${data.fit.se[2].toFixed(3)}`} color={CHART_TEAL}/>
            <Stat label="HAR β_m (月)"  value={data.fit.beta[3].toFixed(3)} sub={`SE ${data.fit.se[3].toFixed(3)}`} color={CHART_BLUE}/>
            <Stat label="R²"            value={(data.fit.r2*100).toFixed(2)+"%"} color={CHART_RED} />
          </> : <div className="text-xs text-muted-foreground">样本不足以估计 HAR-RV</div>}
          <Stat label="跳跃日数 (BV 检测)" value={`${data.jumpDays} / ${data.series.length}`} sub="JV = max(RV − BV, 0)" color={CHART_RED}/>
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
            <p><span className="text-gold">解读：</span>RV_t = Σ r²_{`{t,j}`}; BV_t = (π/2)·Σ|r_j||r_{`{j-1}`}| 跳跃稳健。</p>
            <p>HAR(1,5,22) 异质性回归近似长记忆,β_w/β_m 显著表明波动率多尺度持续。</p>
          </div>
        </div>
      </div>

      <div className="h-[280px] rounded-xl border border-border p-4 bg-secondary/20">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data.series}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="day" stroke={CHART_TEXT} tick={{ fontSize: 11 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 11 }} unit="%" />
            <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border:`1px solid ${CHART_GRID}`, fontSize:11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="rvAnn" name="√RV (年化)" stroke={CHART_GOLD} strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="bvAnn" name="√BV (年化)" stroke={CHART_TEAL} strokeWidth={1.2} dot={false} />
            <Bar dataKey="jvAnn" name="跳跃成分" fill={CHART_RED} fillOpacity={0.5} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {data.fitted.length > 0 && (
        <div className="h-[240px] rounded-xl border border-border p-4 bg-secondary/20">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.fitted}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke={CHART_TEXT} tick={{ fontSize: 11 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border:`1px solid ${CHART_GRID}`, fontSize:11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="actual" name="实际 √RV" stroke={CHART_GOLD} strokeWidth={1.4} dot={false} />
              <Line type="monotone" dataKey="pred"   name="HAR 拟合" stroke={CHART_RED}  strokeWidth={1.4} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   2. Hawkes Process (univariate, exponential kernel)
   λ(t) = μ + α Σ_{t_i<t} exp(−β (t − t_i))
   ════════════════════════════════════════════════════════════ */
export const HawkesTool = () => {
  const [T, setT] = useState(200);
  const [mu, setMu] = useState(0.5);
  const [alpha, setAlpha] = useState(0.6);
  const [beta, setBeta] = useState(1.2);
  const [seed, setSeed] = useState(7);

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    // Ogata thinning
    const events: number[] = [];
    let t = 0;
    let lamStar = mu;
    let safety = 0;
    while (t < T && safety < 100000) {
      safety++;
      const u = rng();
      const w = -Math.log(u) / Math.max(lamStar, 1e-9);
      t += w;
      if (t >= T) break;
      // recompute λ(t)
      let lam = mu;
      for (const ti of events) lam += alpha * Math.exp(-beta * (t - ti));
      const D = rng();
      if (D * lamStar <= lam) {
        events.push(t);
        lamStar = lam + alpha; // jump after event
      } else {
        lamStar = lam;
      }
    }
    // Intensity path on grid
    const G = 400;
    const path: { t: number; lam: number }[] = [];
    for (let g = 0; g <= G; g++) {
      const tg = (g / G) * T;
      let lam = mu;
      for (const ti of events) {
        if (ti < tg) lam += alpha * Math.exp(-beta * (tg - ti));
      }
      path.push({ t: +tg.toFixed(3), lam: +lam.toFixed(4) });
    }

    // MLE on (μ, α, β) via grid search around true (illustrative, not full optimisation)
    // Log-likelihood: Σ log λ(t_i) − ∫_0^T λ(s) ds
    function logLik(m: number, a: number, b: number): number {
      if (m <= 0 || a < 0 || b <= 0 || a >= b) return -1e9;
      // recursive A_i = exp(−b(t_i − t_{i-1})) (1 + A_{i-1}); λ(t_i) = μ + α A_i
      let ll = 0;
      let A = 0;
      let prev = 0;
      for (let i = 0; i < events.length; i++) {
        const ti = events[i];
        if (i === 0) A = 0;
        else A = Math.exp(-b * (ti - prev)) * (1 + A);
        ll += Math.log(m + a * A);
        prev = ti;
      }
      // compensator ∫ λ = μ T + α/β Σ (1 − exp(−β (T−t_i)))
      let comp = m * T;
      for (const ti of events) comp += (a / b) * (1 - Math.exp(-b * (T - ti)));
      return ll - comp;
    }
    // Coordinate-descent search around starting point (true params) to demo MLE near optimum
    let best = { m: mu, a: alpha, b: beta, ll: logLik(mu, alpha, beta) };
    const grid = [0.5, 0.7, 0.85, 1.0, 1.15, 1.3, 1.5];
    for (let it = 0; it < 4; it++) {
      for (const fm of grid) {
        const cand = logLik(best.m * fm, best.a, best.b);
        if (cand > best.ll) best = { ...best, m: best.m * fm, ll: cand };
      }
      for (const fa of grid) {
        const cand = logLik(best.m, best.a * fa, best.b);
        if (cand > best.ll) best = { ...best, a: best.a * fa, ll: cand };
      }
      for (const fb of grid) {
        const cand = logLik(best.m, best.a, best.b * fb);
        if (cand > best.ll) best = { ...best, b: best.b * fb, ll: cand };
      }
    }

    const branching = alpha / beta; // n*: < 1 stationarity
    const meanLam = mu / Math.max(1 - branching, 1e-6);
    const eventDots = events.map(ti => ({ t: +ti.toFixed(3), y: 0 }));
    return { events, path, mle: best, branching, meanLam, eventDots };
  }, [T, mu, alpha, beta, seed]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "弱聚集 (近 Poisson)", description: "α/β ≈ 0.2", apply: () => { setMu(0.6); setAlpha(0.2); setBeta(1.0); } },
        { name: "高聚集 (订单流)", description: "α/β ≈ 0.7", apply: () => { setMu(0.3); setAlpha(0.8); setBeta(1.2); } },
        { name: "临界次临界", description: "α/β → 1", apply: () => { setMu(0.2); setAlpha(0.95); setBeta(1.0); } },
        { name: "纯 Poisson", description: "α=0", apply: () => { setMu(1.0); setAlpha(0.0); setBeta(1.0); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label="时间区间 T" value={T} min={50} max={500} step={10} onChange={setT} />
          <Slider label="基线强度 μ" value={mu} min={0.05} max={2} step={0.05} onChange={setMu} />
          <Slider label="自激跳幅 α" value={alpha} min={0} max={1.5} step={0.05} onChange={setAlpha} />
          <Slider label="衰减率 β" sub="α/β<1 平稳" value={beta} min={0.2} max={3} step={0.05} onChange={setBeta} />
          <Slider label="随机种子" value={seed} min={1} max={999} step={1} onChange={setSeed} />
        </div>
        <div className="space-y-2">
          <Stat label="事件数 N(T)"      value={String(data.events.length)} />
          <Stat label="分支比 n* = α/β"  value={data.branching.toFixed(3)} color={data.branching < 1 ? CHART_TEAL : CHART_RED}
                sub={data.branching < 1 ? "次临界 → 平稳" : "≥1 → 爆发"} />
          <Stat label="理论平均强度 E[λ]" value={Number.isFinite(data.meanLam) ? data.meanLam.toFixed(3) : "∞"} color={CHART_BLUE} />
          <Stat label="MLE μ̂"           value={data.mle.m.toFixed(3)} sub={`真值 ${mu.toFixed(2)}`} />
          <Stat label="MLE α̂"           value={data.mle.a.toFixed(3)} sub={`真值 ${alpha.toFixed(2)}`} color={CHART_TEAL}/>
          <Stat label="MLE β̂"           value={data.mle.b.toFixed(3)} sub={`真值 ${beta.toFixed(2)}`} color={CHART_BLUE}/>
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
            <p><span className="text-gold">解读：</span>每个事件后强度跃升 α,以速率 β 指数衰减;n*=α/β 是后代期望数。</p>
            <p>用途:高频订单到达聚集、违约传染、地震余震 (Hawkes 1971; Bowsher 2007)。</p>
          </div>
        </div>
      </div>

      <div className="h-[280px] rounded-xl border border-border p-4 bg-secondary/20">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data.path}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" stroke={CHART_TEXT} tick={{ fontSize: 11 }} domain={[0, T]} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border:`1px solid ${CHART_GRID}`, fontSize:11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="lam" name="λ(t)" stroke={CHART_GOLD} fill={CHART_GOLD} fillOpacity={0.18} />
            <ReferenceLine y={mu} stroke={CHART_BLUE} strokeDasharray="4 4" label={{ value:"μ", fill: CHART_BLUE, fontSize: 10 }} />
            <Scatter data={data.eventDots} dataKey="y" name="事件 t_i" fill={CHART_RED} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   3. Kyle Lambda / Order Book Price Impact + PIN
   Δp_t = λ · q_t + ε_t  (signed order flow → price change)
   ════════════════════════════════════════════════════════════ */
export const KyleLambdaTool = () => {
  const [days, setDays] = useState(15);
  const [intra, setIntra] = useState(60);
  const [trueLam, setTrueLam] = useState(0.05);   // bps per share
  const [sigma_u, setSigmaU] = useState(0.10);    // noise trader vol (% of price)
  const [alpha, setAlpha] = useState(0.30);       // P(info event)
  const [delta, setDelta] = useState(0.50);       // P(bad | info)
  const [muInf, setMuInf] = useState(50);         // info trader rate
  const [eps, setEps] = useState(50);             // uninformed rate / side
  const [seed, setSeed] = useState(31);

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    // Generate signed order flow q (net buys−sells per Δt) and price changes
    const ND = days * intra;
    const flows: number[] = [], dPs: number[] = [];
    const dailyTotalsB: number[] = [], dailyTotalsS: number[] = [];
    let buyDay = 0, sellDay = 0;
    let bucket = 0;
    for (let t = 0; t < ND; t++) {
      const buys  = Math.max(0, eps + (rng() < alpha ? (rng() < (1 - delta) ? muInf : 0) : 0) + 8 * (rng() - 0.5));
      const sells = Math.max(0, eps + (rng() < alpha ? (rng() < delta       ? muInf : 0) : 0) + 8 * (rng() - 0.5));
      const q = buys - sells + sigma_u * randn(rng) * 100; // noise trader signed flow
      const dp = trueLam * q + sigma_u * randn(rng) * 5;
      flows.push(q); dPs.push(dp);
      buyDay  += buys;
      sellDay += sells;
      bucket++;
      if (bucket >= intra) {
        dailyTotalsB.push(buyDay); dailyTotalsS.push(sellDay);
        buyDay = 0; sellDay = 0; bucket = 0;
      }
    }

    // OLS: Δp = λ q + ε
    const X = flows.map(q => [1, q]);
    const fit = olsFull(X, dPs);
    const lamHat = fit ? fit.beta[1] : NaN;
    const lamSE  = fit ? fit.se[1]   : NaN;

    // Estimate PIN via simple moment-method on daily totals (Easley et al. 1996 simplification)
    // Mean buys = ε + α(1−δ)μ ; Mean sells = ε + αδμ ; Mean total = 2ε + α μ
    let meanB = 0, meanS = 0; for (let i = 0; i < dailyTotalsB.length; i++) { meanB += dailyTotalsB[i]; meanS += dailyTotalsS[i]; }
    meanB /= dailyTotalsB.length; meanS /= dailyTotalsS.length;
    const meanInfo = Math.max(meanB - meanS, 0); // = αμ(1−2δ) when δ<0.5; rough only
    const meanTotal = meanB + meanS;             // 2ε + αμ
    // Calibrate: assume δ=0.5 → meanInfo≈0; use OFI imbalance variance instead for PIN approximation
    let ofiVar = 0;
    for (let i = 0; i < dailyTotalsB.length; i++) ofiVar += (dailyTotalsB[i] - dailyTotalsS[i]) ** 2;
    ofiVar /= dailyTotalsB.length;
    // True PIN
    const truePIN = (alpha * muInf) / (alpha * muInf + 2 * eps);
    // Crude estimator: αμ̂ ≈ √(Var(B−S) / (1 + |2δ−1|^2 ε_term)); use simplified surrogate via excess vol vs uninformed baseline
    const pinEst = Math.min(Math.max(Math.sqrt(Math.max(ofiVar - 2 * eps, 0)) / Math.max(meanTotal, 1), 0), 1);

    // Scatter (subsample for speed)
    const step = Math.max(1, Math.floor(flows.length / 600));
    const scatter: { q: number; dp: number }[] = [];
    for (let i = 0; i < flows.length; i += step) {
      scatter.push({ q: +flows[i].toFixed(2), dp: +dPs[i].toFixed(4) });
    }
    const qmin = Math.min(...flows), qmax = Math.max(...flows);
    const fitLine = [
      { q: +qmin.toFixed(2), dp: +(fit ? fit.beta[0] + lamHat * qmin : 0).toFixed(4) },
      { q: +qmax.toFixed(2), dp: +(fit ? fit.beta[0] + lamHat * qmax : 0).toFixed(4) },
    ];
    return { lamHat, lamSE, r2: fit?.r2 ?? 0, truePIN, pinEst, scatter, fitLine, meanB, meanS };
  }, [days, intra, trueLam, sigma_u, alpha, delta, muInf, eps, seed]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "流动性强 (低 λ)", description: "深度大、冲击小", apply: () => { setTrueLam(0.02); setSigmaU(0.08); setEps(80); setMuInf(30); setAlpha(0.2); } },
        { name: "信息驱动 (高 PIN)", description: "α↑ μ↑", apply: () => { setTrueLam(0.06); setSigmaU(0.10); setAlpha(0.45); setMuInf(80); setEps(40); } },
        { name: "噪声主导", description: "ε >> μ", apply: () => { setAlpha(0.15); setMuInf(20); setEps(120); setTrueLam(0.03); } },
        { name: "极端冲击 (高 λ)", description: "薄市", apply: () => { setTrueLam(0.12); setSigmaU(0.15); setEps(20); setMuInf(60); setAlpha(0.4); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label="天数"          value={days}    min={3} max={40}  step={1}    onChange={setDays} />
          <Slider label="每日交易区间"   value={intra}   min={20} max={200} step={5}   onChange={setIntra} />
          <Slider label="真实 λ (Kyle)"  value={trueLam} min={0.005} max={0.20} step={0.005} onChange={setTrueLam} />
          <Slider label="噪声波动 σ_u"   value={sigma_u} min={0.02} max={0.30} step={0.01} onChange={setSigmaU} />
          <Slider label="α (信息事件概率)" value={alpha} min={0.05} max={0.8} step={0.01} onChange={setAlpha} />
          <Slider label="δ (坏消息条件概率)" value={delta} min={0.05} max={0.95} step={0.01} onChange={setDelta} />
          <Slider label="μ (信息交易者强度)" value={muInf} min={0} max={150} step={5}    onChange={setMuInf} />
          <Slider label="ε (无知交易者强度)" value={eps}   min={5} max={200} step={5}    onChange={setEps} />
          <Slider label="随机种子" value={seed} min={1} max={999} step={1} onChange={setSeed} />
        </div>
        <div className="space-y-2">
          <Stat label="估计 λ̂ (Kyle)"  value={Number.isFinite(data.lamHat) ? data.lamHat.toFixed(4) : "—"}
                sub={`真值 ${trueLam.toFixed(4)} · SE ${Number.isFinite(data.lamSE) ? data.lamSE.toFixed(4) : "—"}`}/>
          <Stat label="R² (价格冲击)"   value={(data.r2*100).toFixed(2)+"%"} color={CHART_TEAL} />
          <Stat label="真实 PIN"        value={data.truePIN.toFixed(3)}  color={CHART_BLUE} sub="αμ / (αμ + 2ε)"/>
          <Stat label="经验 PIN̂"        value={data.pinEst.toFixed(3)}   color={CHART_RED}  sub="基于日订单流不平衡 (粗估)"/>
          <Stat label="日均买入 / 卖出"  value={`${data.meanB.toFixed(0)} / ${data.meanS.toFixed(0)}`} color={CHART_TEAL}/>
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
            <p><span className="text-gold">解读：</span>Kyle (1985):做市商均衡报价 Δp = λ·q;λ = √(Σ_v) / (2 σ_u) 反映信息不对称。</p>
            <p>PIN (Easley-O'Hara 1996/2002):知情交易概率,值越高代表信息驱动越强、买卖价差越宽。</p>
          </div>
        </div>
      </div>

      <div className="h-[300px] rounded-xl border border-border p-4 bg-secondary/20">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis type="number" dataKey="q" name="净订单流 q" stroke={CHART_TEXT} tick={{ fontSize: 11 }} />
            <YAxis type="number" dataKey="dp" name="Δp" stroke={CHART_TEXT} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border:`1px solid ${CHART_GRID}`, fontSize:11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Scatter data={data.scatter} name="(q, Δp)" fill={CHART_TEAL} fillOpacity={0.45} />
            <Line data={data.fitLine} dataKey="dp" name={`λ̂ q + α̂`} stroke={CHART_GOLD} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

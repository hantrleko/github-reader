import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, ScatterChart, Scatter, ComposedChart, Area, BarChart, Bar, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";

import "katex/dist/katex.min.css";
import PresetButtons from "../PresetButtons";
import { useFamaFrench } from "@/lib/marketData";
import { Database, Loader2, CheckCircle2 } from "lucide-react";
import { EquationBlock } from "@/components/common/EquationBlock";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_PURPLE = "hsl(280, 60%, 60%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

/* ─── Helpers ─── */
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

const Slider = ({ label, sub, unit, value, min, max, step, onChange }: {
  label: string; sub?: string; unit?: string;
  value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) => (
  <div>
    <div className="flex justify-between items-baseline mb-2">
      <label className="text-xs text-secondary-foreground font-medium">
        {label}
        {sub && <span className="text-muted-foreground ml-1.5 text-[10px]">{sub}</span>}
      </label>
      <span className="text-xs font-mono text-gold tabular-nums">
        {value.toFixed(step >= 1 ? 0 : step >= 0.1 ? 1 : 4)}{unit && ` ${unit}`}
      </span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))} className={sliderClass} />
    <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
      <span>{min}</span><span>{max}</span>
    </div>
  </div>
);

const Stat = ({ label, value, color = "hsl(var(--gold))", sub }: { label: string; value: string; color?: string; sub?: string }) => (
  <div className="rounded-lg bg-secondary/40 border border-border p-3">
    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-lg font-mono tabular-nums" style={{ color }}>{value}</p>
    {sub && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

/* Linear algebra: invert symmetric small matrix via Gauss-Jordan */
function invertMatrix(A: number[][]): number[][] {
  const n = A.length;
  const M: number[][] = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let i = 0; i < n; i++) {
    let mx = Math.abs(M[i][i]), pi = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > mx) { mx = Math.abs(M[k][i]); pi = k; }
    if (pi !== i) [M[i], M[pi]] = [M[pi], M[i]];
    if (Math.abs(M[i][i]) < 1e-12) M[i][i] = 1e-12;
    const piv = M[i][i];
    for (let j = 0; j < 2 * n; j++) M[i][j] /= piv;
    for (let k = 0; k < n; k++) if (k !== i) {
      const f = M[k][i];
      for (let j = 0; j < 2 * n; j++) M[k][j] -= f * M[i][j];
    }
  }
  return M.map(row => row.slice(n));
}
function matVec(A: number[][], v: number[]): number[] {
  return A.map(row => row.reduce((s, x, j) => s + x * v[j], 0));
}
function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, n = B[0].length, k = B.length;
  const out: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
    let s = 0; for (let p = 0; p < k; p++) s += A[i][p] * B[p][j];
    out[i][j] = s;
  }
  return out;
}
function dot(a: number[], b: number[]) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }

/* OLS multivariate (no intercept handling: caller adds 1's column) */
function olsMulti(X: number[][], y: number[]): { beta: number[]; resid: number[]; r2: number; tStats: number[]; se: number[] } {
  const n = X.length, k = X[0].length;
  // (X'X)^{-1} X'y
  const XtX: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  const Xty: number[] = new Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < k; a++) {
      for (let b = 0; b < k; b++) XtX[a][b] += X[i][a] * X[i][b];
      Xty[a] += X[i][a] * y[i];
    }
  }
  const inv = invertMatrix(XtX);
  const beta = matVec(inv, Xty);
  const resid = y.map((yi, i) => yi - dot(beta, X[i]));
  const ybar = y.reduce((s, v) => s + v, 0) / n;
  let sst = 0, sse = 0;
  for (let i = 0; i < n; i++) { sst += (y[i] - ybar) ** 2; sse += resid[i] ** 2; }
  const sigma2 = sse / Math.max(n - k, 1);
  const se = inv.map((row, i) => Math.sqrt(Math.max(sigma2 * row[i], 0)));
  const tStats = beta.map((b, i) => b / Math.max(se[i], 1e-9));
  return { beta, resid, r2: 1 - sse / Math.max(sst, 1e-12), tStats, se };
}

/* ════════════════════════════════════════════════════════════
   1. Backtest Engine — Momentum / Mean Reversion / Pairs
   ════════════════════════════════════════════════════════════ */
type Strategy = "momentum" | "meanrev" | "pairs";

export const BacktestTool = () => {
  const { t } = useTranslation();
  const [strategy, setStrategy] = useState<Strategy>("momentum");
  const [years, setYears] = useState(5);
  const [seed, setSeed] = useState(7);
  const [mu, setMu] = useState(0.08);
  const [sigma, setSigma] = useState(0.20);
  // momentum: lookback
  const [lookback, setLookback] = useState(60);
  // mean rev: z-score threshold and lookback
  const [zThr, setZThr] = useState(1.5);
  const [mrLook, setMrLook] = useState(20);
  // pairs: half-life of mean reversion
  const [halflife, setHalflife] = useState(15);
  const [tcBp, setTcBp] = useState(5); // transaction cost in bps per side

  const result = useMemo(() => {
    const rng = mulberry32(seed);
    const T = Math.floor(years * 252);
    const dt = 1 / 252;

    // For pairs: simulate 2 cointegrated assets; for others: single asset
    const px: number[] = [100];
    const px2: number[] = strategy === "pairs" ? [100] : [];
    let z = 0; // OU spread state for pairs
    const kappa = Math.log(2) / Math.max(halflife, 1);
    for (let t = 1; t <= T; t++) {
      const eps1 = randn(rng);
      const r = mu * dt + sigma * Math.sqrt(dt) * eps1;
      px.push(px[t - 1] * Math.exp(r));
      if (strategy === "pairs") {
        const eps2 = randn(rng);
        // OU spread: dz = -kappa·z·dt + 0.02·dW
        z += -kappa * z * dt + 0.015 * eps2;
        // asset2 = asset1 * exp(z) → cointegration
        px2.push(px[t] * Math.exp(z));
      }
    }

    // log returns
    const ret: number[] = []; for (let t = 1; t <= T; t++) ret.push(Math.log(px[t] / px[t - 1]));
    const ret2: number[] = strategy === "pairs" ? (() => {
      const r: number[] = []; for (let t = 1; t <= T; t++) r.push(Math.log(px2[t] / px2[t - 1])); return r;
    })() : [];

    const positions: number[] = new Array(T).fill(0);
    const tc = tcBp / 10000;
    let prevPos = 0;
    let pnl: number[] = [];
    let equity: number[] = [1];

    if (strategy === "momentum") {
      for (let t = 0; t < T; t++) {
        const start = Math.max(0, t - lookback);
        const past = ret.slice(start, t).reduce((s, v) => s + v, 0);
        const pos = past > 0 ? 1 : (past < 0 ? -1 : 0);
        positions[t] = pos;
      }
    } else if (strategy === "meanrev") {
      for (let t = 0; t < T; t++) {
        const start = Math.max(0, t - mrLook);
        const win = ret.slice(start, t);
        if (win.length < 5) { positions[t] = 0; continue; }
        const m = win.reduce((s, v) => s + v, 0) / win.length;
        const sd = Math.sqrt(win.reduce((s, v) => s + (v - m) ** 2, 0) / win.length);
        // z-score of *price* deviation from MA
        const ma = win.reduce((s, v) => s + v, 0); // simplified
        const cur = Math.log(px[t] / px[Math.max(start, 1)]);
        const zScore = (cur - ma) / Math.max(sd * Math.sqrt(win.length), 1e-6);
        if (zScore > zThr) positions[t] = -1;
        else if (zScore < -zThr) positions[t] = 1;
        else positions[t] = positions[t - 1] || 0;
      }
    } else {
      // pairs: trade spread z = log(px2/px); long spread when z<-thr, short when z>+thr
      for (let t = 0; t < T; t++) {
        const sp = Math.log(px2[t] / px[t]);
        // rolling mean & std
        const start = Math.max(0, t - 60);
        const win: number[] = [];
        for (let j = start; j <= t; j++) win.push(Math.log(px2[j] / px[j]));
        const m = win.reduce((s, v) => s + v, 0) / win.length;
        const sd = Math.sqrt(win.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(win.length, 1));
        const zScore = (sp - m) / Math.max(sd, 1e-6);
        if (zScore > zThr) positions[t] = -1;       // short spread = short asset2, long asset1
        else if (zScore < -zThr) positions[t] = 1;
        else if (Math.abs(zScore) < 0.3) positions[t] = 0; // exit at mean
        else positions[t] = positions[t - 1] || 0;
      }
    }

    // PnL
    for (let t = 0; t < T; t++) {
      const trade = Math.abs(positions[t] - prevPos);
      let dailyR = 0;
      if (strategy === "pairs") {
        // pos=1: long asset1 short asset2; spread = log(p2/p1) → pnl = -pos·dspread
        const dspread = ret2[t] - ret[t];
        dailyR = -positions[t] * dspread;
      } else {
        dailyR = positions[t] * ret[t];
      }
      const cost = trade * tc;
      const r = dailyR - cost;
      pnl.push(r);
      equity.push(equity[t] * Math.exp(r));
      prevPos = positions[t];
    }

    // Buy & hold benchmark
    const bh: number[] = [1];
    for (let t = 0; t < T; t++) bh.push(bh[t] * Math.exp(ret[t]));

    // Stats
    const annR = (Math.log(equity[T] / equity[0])) / years;
    const annV = Math.sqrt(pnl.reduce((s, v) => s + v * v, 0) / pnl.length) * Math.sqrt(252);
    const sharpe = annR / Math.max(annV, 1e-6);
    let peak = -Infinity, maxDD = 0;
    for (const e of equity) { if (e > peak) peak = e; const dd = (peak - e) / peak; if (dd > maxDD) maxDD = dd; }
    const calmar = annR / Math.max(maxDD, 1e-6);
    const winDays = pnl.filter(r => r > 0).length;
    const winRate = winDays / pnl.length;
    const turnover = positions.reduce((s, p, t) => s + Math.abs(p - (t === 0 ? 0 : positions[t - 1])), 0) / years;

    // Drawdown series
    const ddSeries: any[] = [];
    let pk = 1;
    for (let t = 0; t <= T; t++) {
      if (equity[t] > pk) pk = equity[t];
      ddSeries.push({ t, dd: -(pk - equity[t]) / pk * 100 });
    }

    // sample equity (downsample for plot)
    const stride = Math.max(1, Math.floor(T / 250));
    const equityChart: any[] = [];
    for (let t = 0; t <= T; t += stride) {
      equityChart.push({
        t: +(t / 252).toFixed(3),
        strat: +equity[t].toFixed(4),
        bh: +bh[t].toFixed(4),
        dd: +ddSeries[t].dd.toFixed(2),
      });
    }

    // Position over time (sample)
    const posChart: any[] = [];
    for (let t = 0; t < T; t += stride) posChart.push({ t: +(t / 252).toFixed(3), pos: positions[t] });

    return { equityChart, posChart, annR, annV, sharpe, maxDD, calmar, winRate, turnover, finalEquity: equity[T], finalBh: bh[T] };
  }, [strategy, years, seed, mu, sigma, lookback, zThr, mrLook, halflife, tcBp]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.quant.sprint4.backtest.p1"), description: t("labs.quant.sprint4.backtest.p1d"), apply: () => { setStrategy("momentum"); setLookback(60); setMu(0.10); setSigma(0.18); } },
        { name: t("labs.quant.sprint4.backtest.p2"), description: t("labs.quant.sprint4.backtest.p2d"), apply: () => { setStrategy("meanrev"); setZThr(1.5); setMrLook(20); setMu(0.05); setSigma(0.25); } },
        { name: t("labs.quant.sprint4.backtest.p3"), description: t("labs.quant.sprint4.backtest.p3d"), apply: () => { setStrategy("pairs"); setHalflife(15); setZThr(1.5); } },
        { name: t("labs.quant.sprint4.backtest.p4"), description: t("labs.quant.sprint4.backtest.p4d"), apply: () => { setTcBp(20); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {([
              { id: "momentum", label: t("labs.quant.sprint4.backtest.momentum") },
              { id: "meanrev", label: t("labs.quant.sprint4.backtest.meanrev") },
              { id: "pairs", label: t("labs.quant.sprint4.backtest.pairs") },
            ] as const).map(m => (
              <button key={m.id} onClick={() => setStrategy(m.id)}
                className={"text-xs px-3 py-1.5 rounded border font-mono transition-colors " +
                  (strategy === m.id ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground hover:text-foreground")}>
                {m.label}
              </button>
            ))}
          </div>
          <Slider label={t("labs.quant.sprint4.backtest.years")} value={years} min={1} max={15} step={1} onChange={setYears} />
          <Slider label={t("labs.quant.sprint4.backtest.mu")} value={mu} min={-0.2} max={0.30} step={0.01} onChange={setMu} />
          <Slider label={t("labs.quant.sprint4.backtest.sigma")} value={sigma} min={0.05} max={0.60} step={0.01} onChange={setSigma} />
          {strategy === "momentum" && <Slider label={t("labs.quant.sprint4.backtest.lookback")} value={lookback} min={5} max={252} step={5} onChange={setLookback} />}
          {strategy === "meanrev" && (
            <>
              <Slider label={t("labs.quant.sprint4.backtest.zthr")} value={zThr} min={0.5} max={3} step={0.1} onChange={setZThr} />
              <Slider label={t("labs.quant.sprint4.backtest.mrlook")} value={mrLook} min={5} max={120} step={5} onChange={setMrLook} />
            </>
          )}
          {strategy === "pairs" && (
            <>
              <Slider label={t("labs.quant.sprint4.backtest.halflife")} value={halflife} min={3} max={60} step={1} onChange={setHalflife} />
              <Slider label={t("labs.quant.sprint4.backtest.zthrEntry")} value={zThr} min={0.5} max={3} step={0.1} onChange={setZThr} />
            </>
          )}
          <Slider label={t("labs.quant.sprint4.backtest.tcbp")} value={tcBp} min={0} max={50} step={1} onChange={setTcBp} />
          <Slider label={t("labs.quant.sprint4.backtest.seed")} value={seed} min={1} max={999} step={1} onChange={setSeed} />
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.quant.sprint4.backtest.finalEquity")} value={result.finalEquity.toFixed(3)} color={CHART_GOLD} sub={t("labs.quant.sprint4.backtest.bhSub", { v: result.finalBh.toFixed(3) })} />
            <Stat label={t("labs.quant.sprint4.backtest.annR")} value={`${(result.annR * 100).toFixed(2)}%`} color={result.annR > 0 ? CHART_TEAL : CHART_RED} />
            <Stat label={t("labs.quant.sprint4.backtest.annV")} value={`${(result.annV * 100).toFixed(2)}%`} />
            <Stat label={t("labs.quant.sprint4.backtest.sharpe")} value={result.sharpe.toFixed(2)} color={CHART_GOLD} sub={t("labs.quant.sprint4.backtest.rfZero")} />
            <Stat label={t("labs.quant.sprint4.backtest.maxdd")} value={`${(result.maxDD * 100).toFixed(2)}%`} color={CHART_RED} />
            <Stat label={t("labs.quant.sprint4.backtest.calmar")} value={result.calmar.toFixed(2)} sub={t("labs.quant.sprint4.backtest.calmarSub")} />
            <Stat label={t("labs.quant.sprint4.backtest.winrate")} value={`${(result.winRate * 100).toFixed(1)}%`} />
            <Stat label={t("labs.quant.sprint4.backtest.turnover")} value={result.turnover.toFixed(1)} sub={t("labs.quant.sprint4.backtest.turnoverSub")} />
          </div>
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">
            <p><span className="text-gold">{t("labs.quant.sprint4.backtest.noteMomentumLabel")}</span>{t("labs.quant.sprint4.backtest.noteMomentum")}<span className="text-gold">{t("labs.quant.sprint4.backtest.noteMeanrevLabel")}</span>{t("labs.quant.sprint4.backtest.noteMeanrev")}</p>
            <p><span className="text-gold">{t("labs.quant.sprint4.backtest.notePairsLabel")}</span>{t("labs.quant.sprint4.backtest.notePairs")}</p>
            <p>{t("labs.quant.sprint4.backtest.noteCost")}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.quant.sprint4.backtest.equityChartTitle")}</h4>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={result.equityChart}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: t("labs.quant.sprint4.year"), position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="strat" name={t("labs.quant.sprint4.backtest.strategy")} stroke={CHART_GOLD} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="bh" name="Buy &amp; Hold" stroke={CHART_TEAL} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
              <ReferenceLine y={1} stroke={CHART_TEXT} strokeDasharray="2 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.quant.sprint4.backtest.ddChartTitle")}</h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={result.equityChart}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Area type="monotone" dataKey="dd" stroke={CHART_RED} strokeWidth={1.5} fill={CHART_RED} fillOpacity={0.25} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.quant.sprint4.backtest.posChartTitle")}</h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.posChart}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis domain={[-1.2, 1.2]} stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Line type="stepAfter" dataKey="pos" stroke={CHART_GOLD} strokeWidth={1.5} dot={false} />
                <ReferenceLine y={0} stroke={CHART_TEXT} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   2. Black-Litterman Bayesian Portfolio
   ════════════════════════════════════════════════════════════ */
export const BlackLittermanTool = () => {
  const { t } = useTranslation();
  const N = 5;
  const assetNames = ["Equity-US", "Equity-EU", "Equity-EM", "Bonds-Govt", "Commodities"];
  const [mktCaps, setMktCaps] = useState<number[]>([45, 25, 15, 10, 5]);
  const [riskAversion, setRiskAversion] = useState(2.5);
  const [tau, setTau] = useState(0.05);

  // View 1: equity-US will outperform equity-EU by Q1 (relative)
  const [q1, setQ1] = useState(0.03); // 3% relative outperformance
  const [view1On, setView1On] = useState(true);
  const [conf1, setConf1] = useState(0.7); // 0..1
  // View 2: EM absolute view
  const [q2, setQ2] = useState(0.08);
  const [view2On, setView2On] = useState(true);
  const [conf2, setConf2] = useState(0.5);

  const result = useMemo(() => {
    // Plausible covariance matrix (annual)
    const vols = [0.18, 0.20, 0.28, 0.06, 0.22];
    const corr = [
      [1.00, 0.70, 0.65, -0.10, 0.30],
      [0.70, 1.00, 0.60, -0.05, 0.25],
      [0.65, 0.60, 1.00, -0.05, 0.40],
      [-0.10, -0.05, -0.05, 1.00, 0.05],
      [0.30, 0.25, 0.40, 0.05, 1.00],
    ];
    const Sigma: number[][] = Array.from({ length: N }, (_, i) =>
      Array.from({ length: N }, (_, j) => vols[i] * vols[j] * corr[i][j])
    );

    // Market weights normalized
    const sumCap = mktCaps.reduce((s, v) => s + v, 0);
    const wMkt = mktCaps.map(c => c / sumCap);

    // Implied equilibrium returns: π = δ·Σ·w_mkt
    const pi = matVec(Sigma, wMkt).map(x => x * riskAversion);

    // Build views matrix P (k × N) and Q (k)
    const P_rows: number[][] = [];
    const Q_arr: number[] = [];
    const conf_arr: number[] = [];
    if (view1On) {
      const r = new Array(N).fill(0); r[0] = 1; r[1] = -1;
      P_rows.push(r); Q_arr.push(q1); conf_arr.push(conf1);
    }
    if (view2On) {
      const r = new Array(N).fill(0); r[2] = 1;
      P_rows.push(r); Q_arr.push(q2); conf_arr.push(conf2);
    }

    let wBL = wMkt.slice();
    let muBL = pi.slice();
    let muTilde: number[] | null = null;

    if (P_rows.length > 0) {
      const k = P_rows.length;
      const P = P_rows;
      const Q = Q_arr;
      // Omega = diag( (1-conf)/conf · P·(τΣ)·P' diag )
      const tauSigma: number[][] = Sigma.map(row => row.map(v => v * tau));
      // P · τΣ · P'
      const PtauS = matMul(P, tauSigma);
      const PtauSPt = matMul(PtauS, P[0].map((_, j) => P.map(r => r[j])));
      const Omega: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
      for (let i = 0; i < k; i++) {
        const c = Math.max(Math.min(conf_arr[i], 0.999), 0.01);
        Omega[i][i] = ((1 - c) / c) * PtauSPt[i][i];
      }

      // Posterior mean: μ̃ = π + τΣP'(PτΣP' + Ω)^{-1}(Q - Pπ)
      const inner: number[][] = Array.from({ length: k }, (_, i) =>
        Array.from({ length: k }, (_, j) => PtauSPt[i][j] + Omega[i][j])
      );
      const innerInv = invertMatrix(inner);
      const Ppi = matVec(P, pi);
      const diff = Q.map((q, i) => q - Ppi[i]);
      const adj = matVec(innerInv, diff);
      const Pt = P[0].map((_, j) => P.map(r => r[j]));
      const tauSigmaPt = matMul(tauSigma, Pt);
      const correction = matVec(tauSigmaPt, adj);
      muTilde = pi.map((p, i) => p + correction[i]);

      // BL weights via mean-variance with posterior mean
      // w_BL = (δΣ)^{-1} μ̃
      const dSigma = Sigma.map(row => row.map(v => v * riskAversion));
      const dSigmaInv = invertMatrix(dSigma);
      wBL = matVec(dSigmaInv, muTilde);
      muBL = muTilde;
    }

    // Tangency portfolio via Σ^{-1} π for comparison
    const SigmaInv = invertMatrix(Sigma);
    const wRaw = matVec(SigmaInv, muBL);
    const sumRaw = wRaw.reduce((s, v) => s + v, 0);
    const wTan = wRaw.map(v => v / sumRaw);

    const compareData = assetNames.map((nm, i) => ({
      asset: nm,
      market: +(wMkt[i] * 100).toFixed(2),
      bl: +(wBL[i] * 100).toFixed(2),
      tangency: +(wTan[i] * 100).toFixed(2),
    }));
    const returnsData = assetNames.map((nm, i) => ({
      asset: nm,
      pi: +(pi[i] * 100).toFixed(2),
      posterior: muTilde ? +(muTilde[i] * 100).toFixed(2) : +(pi[i] * 100).toFixed(2),
    }));

    return { wMkt, wBL, wTan, pi, muTilde, compareData, returnsData };
  }, [mktCaps, riskAversion, tau, q1, view1On, conf1, q2, view2On, conf2]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.quant.sprint4.bl.p1"), description: t("labs.quant.sprint4.bl.p1d"), apply: () => { setConf1(0.9); setConf2(0.85); setQ1(0.05); setQ2(0.10); setTau(0.05); } },
        { name: t("labs.quant.sprint4.bl.p2"), description: t("labs.quant.sprint4.bl.p2d"), apply: () => { setConf1(0.2); setConf2(0.2); setTau(0.025); } },
        { name: t("labs.quant.sprint4.bl.p3"), description: t("labs.quant.sprint4.bl.p3d"), apply: () => { setView1On(false); setView2On(false); } },
        { name: t("labs.quant.sprint4.bl.p4"), description: t("labs.quant.sprint4.bl.p4d"), apply: () => { setRiskAversion(4); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.quant.sprint4.bl.marketParams")}</p>
          <Slider label={t("labs.quant.sprint4.bl.riskAversion")} sub={t("labs.quant.sprint4.bl.riskAversionSub")} value={riskAversion} min={1} max={6} step={0.25} onChange={setRiskAversion} />
          <Slider label={t("labs.quant.sprint4.bl.tau")} value={tau} min={0.01} max={0.20} step={0.005} onChange={setTau} />
          <p className="text-xs font-mono text-gold uppercase tracking-wider mt-3">{t("labs.quant.sprint4.bl.mktCapWeights")}</p>
          {assetNames.map((nm, i) => (
            <Slider key={i} label={nm} value={mktCaps[i]} min={0} max={80} step={1}
              onChange={(v) => { const m = [...mktCaps]; m[i] = v; setMktCaps(m); }} />
          ))}
        </div>

        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.quant.sprint4.bl.views")}</p>
          <div className="rounded-lg border border-border p-3 space-y-2 bg-secondary/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono">{t("labs.quant.sprint4.bl.view1")}</span>
              <button onClick={() => setView1On(!view1On)}
                className={"text-[10px] px-2 py-0.5 rounded border " + (view1On ? "border-gold text-gold" : "border-border text-muted-foreground")}>
                {view1On ? "ON" : "OFF"}
              </button>
            </div>
            {view1On && (
              <>
                <Slider label={t("labs.quant.sprint4.bl.q1")} value={q1} min={-0.10} max={0.15} step={0.005} onChange={setQ1} />
                <Slider label={t("labs.quant.sprint4.bl.confidence")} value={conf1} min={0.05} max={0.95} step={0.05} onChange={setConf1} />
              </>
            )}
          </div>
          <div className="rounded-lg border border-border p-3 space-y-2 bg-secondary/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono">{t("labs.quant.sprint4.bl.view2")}</span>
              <button onClick={() => setView2On(!view2On)}
                className={"text-[10px] px-2 py-0.5 rounded border " + (view2On ? "border-gold text-gold" : "border-border text-muted-foreground")}>
                {view2On ? "ON" : "OFF"}
              </button>
            </div>
            {view2On && (
              <>
                <Slider label={t("labs.quant.sprint4.bl.q2")} value={q2} min={-0.10} max={0.20} step={0.005} onChange={setQ2} />
                <Slider label={t("labs.quant.sprint4.bl.confidence")} value={conf2} min={0.05} max={0.95} step={0.05} onChange={setConf2} />
              </>
            )}
          </div>
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
            <p><span className="text-gold">{t("labs.quant.sprint4.bl.frameworkLabel")}</span>{t("labs.quant.sprint4.bl.framework")}</p>
            <p>{t("labs.quant.sprint4.bl.confNote")}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.quant.sprint4.bl.weightCompareTitle")}</h4>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={result.compareData}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="asset" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="market" name={t("labs.quant.sprint4.bl.market")} fill={CHART_TEAL} />
                <Bar dataKey="bl" name={t("labs.quant.sprint4.bl.blPosterior")} fill={CHART_GOLD} />
                <ReferenceLine y={0} stroke={CHART_TEXT} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.quant.sprint4.bl.returnsCompareTitle")}</h4>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={result.returnsData}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="asset" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="pi" name={t("labs.quant.sprint4.bl.piImplied")} fill={CHART_TEAL} />
                <Bar dataKey="posterior" name={t("labs.quant.sprint4.bl.muPosterior")} fill={CHART_GOLD} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   3. Fama-French 5-Factor Attribution
   ════════════════════════════════════════════════════════════ */
type FFLoadings = { mkt: number; smb: number; hml: number; rmw: number; cma: number };

export const FamaFrenchTool = () => {
  const { t } = useTranslation();
  // True portfolio loadings to simulate
  const [loadings, setLoadings] = useState<FFLoadings>({ mkt: 1.1, smb: 0.4, hml: -0.2, rmw: 0.3, cma: 0.1 });
  const [trueAlpha, setTrueAlpha] = useState(0.002); // monthly alpha
  const [months, setMonths] = useState(120);
  const [resVol, setResVol] = useState(0.015);
  const [seed, setSeed] = useState(11);
  const [ffActive, setFfActive] = useState(false);
  const ffQuery = useFamaFrench(months, ffActive);
  const [ffStatus, setFfStatus] = useState<string | null>(null);

  const loadRealFF = async () => {
    setFfActive(true);
    try {
      const res = await ffQuery.refetch();
      if (res.error || !res.data || !res.data.rows.length) throw res.error || new Error("no data");
      const rows = res.data.rows;
      // Estimate empirical loadings from a hypothetical portfolio? Instead,
      // calibrate residual vol & sample length to the real series.
      const mktVals = rows.map((r) => r.mktRf / 100);
      const mean = mktVals.reduce((s, v) => s + v, 0) / mktVals.length;
      const variance = mktVals.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(mktVals.length - 1, 1);
      setMonths(rows.length);
      setResVol(parseFloat(Math.sqrt(variance).toFixed(4)));
      setFfStatus(t("labs.quant.sprint4.ff.statusLoaded", { n: rows.length, from: res.data.from, to: res.data.to }));
    } catch {
      setFfStatus(t("labs.quant.sprint4.ff.statusFailed"));
    }
  };

  const result = useMemo(() => {
    const rng = mulberry32(seed);
    const T = months;
    // Simulate factor returns (monthly): MKT, SMB, HML, RMW, CMA — plausible means/vols
    const meanF = [0.006, 0.002, 0.003, 0.003, 0.002];
    const volF = [0.045, 0.025, 0.028, 0.020, 0.018];
    // Mild factor correlations
    const corrF = [
      [1, 0.15, 0.10, 0.05, 0.05],
      [0.15, 1, -0.10, -0.20, 0.05],
      [0.10, -0.10, 1, 0.20, 0.40],
      [0.05, -0.20, 0.20, 1, 0.30],
      [0.05, 0.05, 0.40, 0.30, 1],
    ];
    // Cholesky
    const L: number[][] = Array.from({ length: 5 }, () => new Array(5).fill(0));
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = 0;
        for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
        if (i === j) L[i][j] = Math.sqrt(Math.max(corrF[i][i] - sum, 1e-9));
        else L[i][j] = (corrF[i][j] - sum) / L[j][j];
      }
    }

    const factors: number[][] = []; // [T][5]
    for (let t = 0; t < T; t++) {
      const z = [randn(rng), randn(rng), randn(rng), randn(rng), randn(rng)];
      const corrZ = [0, 0, 0, 0, 0];
      for (let i = 0; i < 5; i++) for (let j = 0; j <= i; j++) corrZ[i] += L[i][j] * z[j];
      const f = corrZ.map((x, i) => meanF[i] + volF[i] * x);
      factors.push(f);
    }

    const arr = [loadings.mkt, loadings.smb, loadings.hml, loadings.rmw, loadings.cma];
    const port: number[] = factors.map(f => trueAlpha + arr[0] * f[0] + arr[1] * f[1] + arr[2] * f[2] + arr[3] * f[3] + arr[4] * f[4] + resVol * randn(rng));

    // Regress port on factors (with intercept)
    const X = factors.map(f => [1, f[0], f[1], f[2], f[3], f[4]]);
    const reg = olsMulti(X, port);
    const [aHat, bMkt, bSmb, bHml, bRmw, bCma] = reg.beta;
    const labels = [t("labs.quant.sprint4.ff.alphaMonthly"), "MKT", "SMB", "HML", "RMW", "CMA"];

    const coefData = labels.map((lab, i) => ({
      name: lab,
      value: +reg.beta[i].toFixed(4),
      tStat: +reg.tStats[i].toFixed(2),
      true_: i === 0 ? trueAlpha : arr[i - 1],
      ciLo: +(reg.beta[i] - 1.96 * reg.se[i]).toFixed(4),
      ciHi: +(reg.beta[i] + 1.96 * reg.se[i]).toFixed(4),
    }));

    // Cumulative attribution (each factor's contribution over time)
    const factorContrib: any[] = [];
    let cum = { alpha: 0, mkt: 0, smb: 0, hml: 0, rmw: 0, cma: 0, port: 0 };
    factorContrib.push({ t: 0, ...cum });
    for (let t = 0; t < T; t++) {
      cum.alpha += aHat;
      cum.mkt += bMkt * factors[t][0];
      cum.smb += bSmb * factors[t][1];
      cum.hml += bHml * factors[t][2];
      cum.rmw += bRmw * factors[t][3];
      cum.cma += bCma * factors[t][4];
      cum.port += port[t];
      if (t % Math.max(1, Math.floor(T / 120)) === 0 || t === T - 1) {
        factorContrib.push({
          t: +(t / 12).toFixed(2),
          alpha: +(cum.alpha * 100).toFixed(2),
          mkt: +(cum.mkt * 100).toFixed(2),
          smb: +(cum.smb * 100).toFixed(2),
          hml: +(cum.hml * 100).toFixed(2),
          rmw: +(cum.rmw * 100).toFixed(2),
          cma: +(cum.cma * 100).toFixed(2),
          port: +(cum.port * 100).toFixed(2),
        });
      }
    }

    // Loadings comparison radar
    const radar = [
      { factor: "MKT", true_: loadings.mkt, est: +bMkt.toFixed(3) },
      { factor: "SMB", true_: loadings.smb, est: +bSmb.toFixed(3) },
      { factor: "HML", true_: loadings.hml, est: +bHml.toFixed(3) },
      { factor: "RMW", true_: loadings.rmw, est: +bRmw.toFixed(3) },
      { factor: "CMA", true_: loadings.cma, est: +bCma.toFixed(3) },
    ];

    const annAlpha = aHat * 12;
    const annAlphaTstat = reg.tStats[0];

    return { reg, coefData, factorContrib, radar, annAlpha, annAlphaTstat };
  }, [loadings, trueAlpha, months, resVol, seed]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-md border border-border/60 bg-muted/30 text-[11px] font-mono">
        <span className="flex items-center gap-1.5 text-gold">
          <Database className="w-3.5 h-3.5" />
          {t("labs.quant.sprint4.ff.dataSourceLabel")}
        </span>
        <button
          onClick={loadRealFF}
          disabled={ffQuery.isFetching}
          className="px-2.5 py-1 rounded bg-primary/90 text-primary-foreground hover:bg-primary disabled:opacity-50 flex items-center gap-1"
        >
          {ffQuery.isFetching ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          {ffQuery.isFetching ? t("labs.quant.sprint4.ff.fetching") : t("labs.quant.sprint4.ff.loadReal")}
        </button>
        {ffStatus && (
          <span className="flex items-center gap-1 text-gold">
            <CheckCircle2 className="w-3 h-3" />
            {ffStatus}
          </span>
        )}
      </div>
      <PresetButtons presets={[
        { name: t("labs.quant.sprint4.ff.p1"), description: t("labs.quant.sprint4.ff.p1d"), apply: () => { setLoadings({ mkt: 1.0, smb: 0.6, hml: 0.5, rmw: 0.2, cma: 0.3 }); setTrueAlpha(0.001); } },
        { name: t("labs.quant.sprint4.ff.p2"), description: t("labs.quant.sprint4.ff.p2d"), apply: () => { setLoadings({ mkt: 1.1, smb: -0.3, hml: -0.4, rmw: 0.4, cma: -0.3 }); setTrueAlpha(0.002); } },
        { name: t("labs.quant.sprint4.ff.p3"), description: t("labs.quant.sprint4.ff.p3d"), apply: () => { setLoadings({ mkt: 0.8, smb: -0.1, hml: 0.2, rmw: 0.7, cma: 0.4 }); setTrueAlpha(0.003); } },
        { name: t("labs.quant.sprint4.ff.p4"), description: t("labs.quant.sprint4.ff.p4d"), apply: () => { setTrueAlpha(0.005); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.quant.sprint4.ff.dgpLoadings")}</p>
          <Slider label={t("labs.quant.sprint4.ff.mkt")} value={loadings.mkt} min={-0.5} max={2} step={0.05} onChange={(v) => setLoadings({ ...loadings, mkt: v })} />
          <Slider label={t("labs.quant.sprint4.ff.smb")} value={loadings.smb} min={-1} max={1.2} step={0.05} onChange={(v) => setLoadings({ ...loadings, smb: v })} />
          <Slider label={t("labs.quant.sprint4.ff.hml")} value={loadings.hml} min={-1} max={1.2} step={0.05} onChange={(v) => setLoadings({ ...loadings, hml: v })} />
          <Slider label={t("labs.quant.sprint4.ff.rmw")} value={loadings.rmw} min={-1} max={1.2} step={0.05} onChange={(v) => setLoadings({ ...loadings, rmw: v })} />
          <Slider label={t("labs.quant.sprint4.ff.cma")} value={loadings.cma} min={-1} max={1.2} step={0.05} onChange={(v) => setLoadings({ ...loadings, cma: v })} />
          <Slider label={t("labs.quant.sprint4.ff.trueAlpha")} value={trueAlpha} min={-0.005} max={0.010} step={0.0005} onChange={setTrueAlpha} />
          <Slider label={t("labs.quant.sprint4.ff.months")} value={months} min={36} max={360} step={12} onChange={setMonths} />
          <Slider label={t("labs.quant.sprint4.ff.resVol")} value={resVol} min={0.005} max={0.05} step={0.001} onChange={setResVol} />
          <Slider label={t("labs.quant.sprint4.ff.seed")} value={seed} min={1} max={999} step={1} onChange={setSeed} />
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.quant.sprint4.ff.alphaAnn")} value={`${(result.annAlpha * 100).toFixed(2)}%`} color={result.annAlpha > 0 ? CHART_GOLD : CHART_RED} sub={t("labs.quant.sprint4.ff.tStatSub", { v: result.annAlphaTstat.toFixed(2) })} />
            <Stat label="R²" value={result.reg.r2.toFixed(3)} sub={t("labs.quant.sprint4.ff.fitSub")} />
            <Stat label={t("labs.quant.sprint4.ff.mktBeta")} value={result.reg.beta[1].toFixed(3)} color={CHART_TEAL} sub={`t=${result.reg.tStats[1].toFixed(1)}`} />
            <Stat label={t("labs.quant.sprint4.ff.smbBeta")} value={result.reg.beta[2].toFixed(3)} sub={`t=${result.reg.tStats[2].toFixed(1)}`} />
            <Stat label={t("labs.quant.sprint4.ff.hmlBeta")} value={result.reg.beta[3].toFixed(3)} sub={`t=${result.reg.tStats[3].toFixed(1)}`} />
            <Stat label={t("labs.quant.sprint4.ff.rmwBeta")} value={result.reg.beta[4].toFixed(3)} sub={`t=${result.reg.tStats[4].toFixed(1)}`} />
            <Stat label={t("labs.quant.sprint4.ff.cmaBeta")} value={result.reg.beta[5].toFixed(3)} sub={`t=${result.reg.tStats[5].toFixed(1)}`} />
            <Stat label={t("labs.quant.sprint4.ff.sigFactors")} value={`${result.reg.tStats.slice(1).filter(t => Math.abs(t) > 1.96).length} / 5`} sub={t("labs.quant.sprint4.ff.tThreshold")} />
          </div>
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">
            <p><span className="text-gold">{t("labs.quant.sprint4.ff.ff5Label")}</span>R_p - R_f = α + β_MKT·MKT + β_SMB·SMB + β_HML·HML + β_RMW·RMW + β_CMA·CMA + ε</p>
            <p>{t("labs.quant.sprint4.ff.alphaNote")}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.quant.sprint4.ff.radarTitle")}</h4>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={result.radar}>
                <PolarGrid stroke={CHART_GRID} />
                <PolarAngleAxis dataKey="factor" tick={{ fontSize: 11, fill: CHART_TEXT }} />
                <PolarRadiusAxis tick={{ fontSize: 9, fill: CHART_TEXT }} />
                <Radar name={t("labs.quant.sprint4.ff.trueLabel")} dataKey="true_" stroke={CHART_TEAL} fill={CHART_TEAL} fillOpacity={0.25} />
                <Radar name={t("labs.quant.sprint4.ff.olsEst")} dataKey="est" stroke={CHART_GOLD} fill={CHART_GOLD} fillOpacity={0.35} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.quant.sprint4.ff.cumContribTitle")}</h4>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.factorContrib}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: t("labs.quant.sprint4.year"), position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="port" name={t("labs.quant.sprint4.ff.portfolio")} stroke="#ffffff" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="mkt" name="MKT" stroke={CHART_GOLD} dot={false} />
                <Line type="monotone" dataKey="smb" name="SMB" stroke={CHART_TEAL} dot={false} />
                <Line type="monotone" dataKey="hml" name="HML" stroke={CHART_RED} dot={false} />
                <Line type="monotone" dataKey="rmw" name="RMW" stroke={CHART_BLUE} dot={false} />
                <Line type="monotone" dataKey="cma" name="CMA" stroke={CHART_PURPLE} dot={false} />
                <Line type="monotone" dataKey="alpha" name="α" stroke="#ffffff" strokeDasharray="4 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

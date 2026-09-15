import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, Area, ComposedChart,
} from "recharts";
import "katex/dist/katex.min.css";
import PresetButtons, { Preset } from "../PresetButtons";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED  = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

/* ─────────────────  PRNG  ───────────────── */
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

/* ════════════════════════════════════════════════════════════════
   Local-Linear-Trend + Seasonal Dynamic Linear Model

     y_t = μ_t + γ_t + ε_t,           ε_t ~ N(0, σ²_ε)
     μ_t = μ_{t-1} + ν_{t-1} + η_t,   η_t ~ N(0, σ²_η)
     ν_t = ν_{t-1} + ζ_t,             ζ_t ~ N(0, σ²_ζ)
     γ_t = -Σ_{s=1}^{S-1} γ_{t-s} + ω_t, ω_t ~ N(0, σ²_ω)

   State vector: x = [μ, ν, γ_1, γ_2, ..., γ_{S-1}]'  (dim k = 1 + 1 + (S-1))
   Observation: y_t = Z x_t + ε_t   with Z = [1, 0, 1, 0, ..., 0]
   ════════════════════════════════════════════════════════════════ */

function buildDLM(S: number) {
  const k = 2 + (S - 1);
  const T_mat: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  // Trend block:  μ_t = μ + ν;  ν_t = ν
  T_mat[0][0] = 1; T_mat[0][1] = 1;
  T_mat[1][1] = 1;
  // Seasonal block:  γ_t = -Σγ_{t-s}; γ_{t-1} = γ_t (shift)
  // First seasonal row (idx = 2) :  γ_t = -γ_{t-1} - γ_{t-2} - ... - γ_{t-(S-1)}
  for (let j = 0; j < S - 1; j++) T_mat[2][2 + j] = -1;
  // shift rows: x[2 + i] = old x[2 + (i - 1)] for i = 1..S-2
  for (let i = 1; i < S - 1; i++) T_mat[2 + i][2 + i - 1] = 1;
  // Z observation row
  const Z: number[] = new Array(k).fill(0);
  Z[0] = 1;            // level
  if (S >= 2) Z[2] = 1; // current seasonal
  return { k, T: T_mat, Z };
}

/** Multiply matrix * vector */
function matVec(M: number[][], v: number[]): number[] {
  const r = M.length, c = v.length;
  const out = new Array(r).fill(0);
  for (let i = 0; i < r; i++) {
    let s = 0;
    for (let j = 0; j < c; j++) s += M[i][j] * v[j];
    out[i] = s;
  }
  return out;
}
/** M1 * M2 */
function matMul(A: number[][], B: number[][]): number[][] {
  const r = A.length, m = B.length, c = B[0].length;
  const out: number[][] = Array.from({ length: r }, () => new Array(c).fill(0));
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) {
    let s = 0;
    for (let l = 0; l < m; l++) s += A[i][l] * B[l][j];
    out[i][j] = s;
  }
  return out;
}
/** Transpose */
function transpose(M: number[][]): number[][] {
  const r = M.length, c = M[0].length;
  const out: number[][] = Array.from({ length: c }, () => new Array(r).fill(0));
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) out[j][i] = M[i][j];
  return out;
}
/** Matrix add */
function matAdd(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((v, j) => v + B[i][j]));
}

interface KFResult {
  loglik: number;
  filtMean: number[][];   // T x k
  filtCov: number[][][];  // T x k x k
  predMean: number[][];   // T x k (a_t = T x_{t-1|t-1})
  predCov: number[][][];
  innov: number[];
  innovVar: number[];
}

/** Kalman filter for univariate observation, no exogenous. */
function kalmanFilter(
  y: number[], T: number[][], Z: number[], Q: number[][], sigEps2: number,
  x0: number[], P0: number[][],
): KFResult {
  const n = y.length, k = T.length;
  let x = x0.slice();
  let P = P0.map(r => r.slice());
  let loglik = 0;
  const filtMean: number[][] = [], filtCov: number[][][] = [];
  const predMean: number[][] = [], predCov: number[][][] = [];
  const innov: number[] = [], innovVar: number[] = [];
  for (let t = 0; t < n; t++) {
    // Predict
    const xp = matVec(T, x);
    const TP = matMul(T, P);
    const Pp = matAdd(matMul(TP, transpose(T)), Q);
    predMean.push(xp.slice()); predCov.push(Pp.map(r => r.slice()));
    // Innovation
    let yhat = 0;
    for (let j = 0; j < k; j++) yhat += Z[j] * xp[j];
    const v = y[t] - yhat;
    // F = Z P Z' + σ²_ε
    const PZ = new Array(k).fill(0);
    for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) PZ[i] += Pp[i][j] * Z[j];
    let F = sigEps2;
    for (let i = 0; i < k; i++) F += Z[i] * PZ[i];
    F = Math.max(F, 1e-10);
    innov.push(v); innovVar.push(F);
    loglik += -0.5 * (Math.log(2 * Math.PI) + Math.log(F) + (v * v) / F);
    // Kalman gain K = P Z' / F
    const K = PZ.map(p => p / F);
    // Update
    const xNew = xp.map((xv, i) => xv + K[i] * v);
    const Pnew: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
    for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) Pnew[i][j] = Pp[i][j] - K[i] * PZ[j];
    x = xNew; P = Pnew;
    filtMean.push(x.slice()); filtCov.push(P.map(r => r.slice()));
  }
  return { loglik, filtMean, filtCov, predMean, predCov, innov, innovVar };
}

/** RTS smoother — backward recursion. */
function rtsSmoother(
  filt: KFResult, T: number[][],
): { smoothMean: number[][]; smoothCov: number[][][] } {
  const n = filt.filtMean.length, k = T.length;
  const sM: number[][] = new Array(n);
  const sC: number[][][] = new Array(n);
  sM[n - 1] = filt.filtMean[n - 1].slice();
  sC[n - 1] = filt.filtCov[n - 1].map(r => r.slice());
  for (let t = n - 2; t >= 0; t--) {
    const Pt  = filt.filtCov[t];
    const Pp1 = filt.predCov[t + 1];
    const xp1 = filt.predMean[t + 1];
    // J = Pt T' Pp1^{-1}
    const PtTt = matMul(Pt, transpose(T));
    const Pinv = invertSmall(Pp1);
    if (!Pinv) { sM[t] = filt.filtMean[t].slice(); sC[t] = Pt.map(r => r.slice()); continue; }
    const J = matMul(PtTt, Pinv);
    // x_t|n = x_t|t + J (x_{t+1|n} - x_{t+1|t})
    const diff = sM[t + 1].map((v, i) => v - xp1[i]);
    const corr = matVec(J, diff);
    sM[t] = filt.filtMean[t].map((v, i) => v + corr[i]);
    // P_t|n = Pt + J (P_{t+1|n} - Pp1) J'
    const Pdiff: number[][] = sC[t + 1].map((row, i) => row.map((v, j) => v - Pp1[i][j]));
    const JPdiff = matMul(J, Pdiff);
    const cov = matAdd(Pt, matMul(JPdiff, transpose(J)));
    sC[t] = cov;
  }
  return { smoothMean: sM, smoothCov: sC };
}

/** Gauss-Jordan invert for small matrices. */
function invertSmall(A: number[][]): number[][] | null {
  const k = A.length;
  const M: number[][] = A.map((row, i) => {
    const id = new Array(k).fill(0); id[i] = 1;
    return [...row, ...id];
  });
  for (let i = 0; i < k; i++) {
    let p = i, mx = Math.abs(M[i][i]);
    for (let r = i + 1; r < k; r++) if (Math.abs(M[r][i]) > mx) { mx = Math.abs(M[r][i]); p = r; }
    if (mx < 1e-12) return null;
    if (p !== i) { const tmp = M[i]; M[i] = M[p]; M[p] = tmp; }
    const pv = M[i][i];
    for (let c = 0; c < 2 * k; c++) M[i][c] /= pv;
    for (let r = 0; r < k; r++) if (r !== i) {
      const f = M[r][i];
      if (f !== 0) for (let c = 0; c < 2 * k; c++) M[r][c] -= f * M[i][c];
    }
  }
  return M.map(row => row.slice(k));
}

/** h-step ahead forecast from final filtered state. Returns mean ± 95% PI for y. */
function forecast(
  h: number, T: number[][], Z: number[], Q: number[][], sigEps2: number,
  xT: number[], PT: number[][],
) {
  const out: { mean: number; lo: number; hi: number }[] = [];
  let x = xT.slice();
  let P = PT.map(r => r.slice());
  for (let i = 0; i < h; i++) {
    x = matVec(T, x);
    P = matAdd(matMul(matMul(T, P), transpose(T)), Q);
    let yhat = 0;
    for (let j = 0; j < x.length; j++) yhat += Z[j] * x[j];
    const PZ = new Array(x.length).fill(0);
    for (let r = 0; r < x.length; r++) for (let c = 0; c < x.length; c++) PZ[r] += P[r][c] * Z[c];
    let F = sigEps2;
    for (let j = 0; j < x.length; j++) F += Z[j] * PZ[j];
    const sd = Math.sqrt(Math.max(F, 0));
    out.push({ mean: yhat, lo: yhat - 1.96 * sd, hi: yhat + 1.96 * sd });
  }
  return out;
}

/** Diffuse-prior wrapper that runs filter + smoother for given variance hyper-parameters. */
function fitDLM(y: number[], S: number, sigEps: number, sigEta: number, sigZeta: number, sigOmega: number) {
  const { k, T, Z } = buildDLM(S);
  const Q: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  Q[0][0] = sigEta * sigEta;     // level shocks
  Q[1][1] = sigZeta * sigZeta;   // slope shocks
  Q[2][2] = sigOmega * sigOmega; // seasonal shocks
  const x0 = new Array(k).fill(0);
  // diffuse prior — large diagonal
  const P0: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let i = 0; i < k; i++) P0[i][i] = 1e6;
  const f = kalmanFilter(y, T, Z, Q, sigEps * sigEps, x0, P0);
  const s = rtsSmoother(f, T);
  return { k, T, Z, Q, filt: f, smooth: s };
}

/** Naive Nelder-Mead-style coordinate search on log-σ parameters to maximise log-likelihood. */
function mleVariances(
  y: number[], S: number,
  init: { sigEps: number; sigEta: number; sigZeta: number; sigOmega: number },
) {
  // Search over log10(σ)
  let logs = [Math.log10(init.sigEps), Math.log10(init.sigEta), Math.log10(init.sigZeta), Math.log10(init.sigOmega)];
  const eval_ = (l: number[]) => {
    const r = fitDLM(y, S, 10 ** l[0], 10 ** l[1], 10 ** l[2], 10 ** l[3]);
    return r.filt.loglik;
  };
  let best = eval_(logs);
  const steps = [0.5, 0.25, 0.12, 0.06];
  for (const step of steps) {
    let improved = true; let safety = 0;
    while (improved && safety < 60) {
      improved = false; safety++;
      for (let j = 0; j < 4; j++) {
        for (const dir of [+1, -1]) {
          const cand = logs.slice(); cand[j] += dir * step;
          if (cand[j] < -3.5 || cand[j] > 1.5) continue;
          const ll = eval_(cand);
          if (ll > best + 1e-4) { logs = cand; best = ll; improved = true; }
        }
      }
    }
  }
  return {
    sigEps: 10 ** logs[0], sigEta: 10 ** logs[1],
    sigZeta: 10 ** logs[2], sigOmega: 10 ** logs[3],
    loglik: best,
  };
}

/* ════════════════════════════════════════════════════════════════
   DLMTool component
   ════════════════════════════════════════════════════════════════ */

const dlmPresets = (set: (v: { n: number; S: number; trueLevel: number; trueSlope: number; seasonAmp: number; sigObs: number; sigSlope: number; sigSeason: number; seed: number }) => void, t: (k: string) => string): Preset[] => [
  { name: t("labs.econ.v23.dlm.presets.trendSeason.name"),    description: t("labs.econ.v23.dlm.presets.trendSeason.desc"),
    apply: () => set({ n: 120, S: 12, trueLevel: 100, trueSlope: 0.4, seasonAmp: 6, sigObs: 1.5, sigSlope: 0.02, sigSeason: 0.3, seed: 7 }) },
  { name: t("labs.econ.v23.dlm.presets.localLevel.name"), description: t("labs.econ.v23.dlm.presets.localLevel.desc"),
    apply: () => set({ n: 100, S: 4, trueLevel: 50, trueSlope: 0, seasonAmp: 0, sigObs: 1, sigSlope: 0, sigSeason: 0, seed: 11 }) },
  { name: t("labs.econ.v23.dlm.presets.weakSignal.name"),    description: t("labs.econ.v23.dlm.presets.weakSignal.desc"),
    apply: () => set({ n: 150, S: 12, trueLevel: 50, trueSlope: 0.1, seasonAmp: 2, sigObs: 4, sigSlope: 0.005, sigSeason: 0.1, seed: 21 }) },
  { name: t("labs.econ.v23.dlm.presets.quarterly.name"),           description: t("labs.econ.v23.dlm.presets.quarterly.desc"),
    apply: () => set({ n: 80, S: 4, trueLevel: 100, trueSlope: 0.3, seasonAmp: 4, sigObs: 1, sigSlope: 0.01, sigSeason: 0.2, seed: 33 }) },
];

export const DLMTool = () => {
  const { t } = useTranslation();
  // DGP params
  const [n, setN] = useState(120);
  const [S, setS] = useState(12);
  const [trueLevel, setTrueLevel] = useState(100);
  const [trueSlope, setTrueSlope] = useState(0.4);
  const [seasonAmp, setSeasonAmp] = useState(6);
  const [sigObs, setSigObs] = useState(1.5);
  const [sigSlope, setSigSlope] = useState(0.02);
  const [sigSeason, setSigSeason] = useState(0.3);
  const [seed, setSeed] = useState(7);

  // Estimation hyper-parameters (user-tunable; "Fit MLE" overrides)
  const [hSigEps, setHSigEps]   = useState(1.5);
  const [hSigEta, setHSigEta]   = useState(0.1);
  const [hSigZeta, setHSigZeta] = useState(0.02);
  const [hSigOmega, setHSigOmega] = useState(0.3);

  const [horizon, setHorizon] = useState(24);
  const [mleStatus, setMleStatus] = useState<string | null>(null);

  // Generate synthetic data
  const sim = useMemo(() => {
    const rng = mulberry32(seed);
    let mu = trueLevel;
    let nu = trueSlope;
    // initial seasonal pattern: cosine wave with amplitude `seasonAmp`, sums to ~0 over S
    const gamma: number[] = new Array(S - 1).fill(0);
    for (let s = 0; s < S - 1; s++) gamma[s] = seasonAmp * Math.cos(2 * Math.PI * (s + 1) / S);
    const ys: number[] = [];
    const trueLev: number[] = [], trueSeas: number[] = [];
    for (let t = 0; t < n; t++) {
      // current seasonal = gamma[0]
      const g_now = gamma[0];
      const eps = randn(rng) * sigObs;
      const y = mu + g_now + eps;
      ys.push(y); trueLev.push(mu); trueSeas.push(g_now);
      // evolve
      const eta = randn(rng) * sigSlope * 5;   // moderate level innovation
      const zeta = randn(rng) * sigSlope;
      const omega = randn(rng) * sigSeason;
      const newMu = mu + nu + eta;
      const newNu = nu + zeta;
      const newGammaTop = -gamma.reduce((a, b) => a + b, 0) + omega;
      // shift: gamma_{t+1} index 0 = newGammaTop; rest shifts down (idx i = old idx i-1)
      for (let i = S - 2; i >= 1; i--) gamma[i] = gamma[i - 1];
      gamma[0] = newGammaTop;
      mu = newMu; nu = newNu;
    }
    return { ys, trueLev, trueSeas };
  }, [n, S, trueLevel, trueSlope, seasonAmp, sigObs, sigSlope, sigSeason, seed]);

  // Fit DLM with current hyper-parameters
  const fit = useMemo(() => {
    return fitDLM(sim.ys, S, hSigEps, hSigEta, hSigZeta, hSigOmega);
  }, [sim.ys, S, hSigEps, hSigEta, hSigZeta, hSigOmega]);

  const onFitMLE = () => {
    setMleStatus(t("labs.econ.v23.dlm.fittingStatus"));
    setTimeout(() => {
      const r = mleVariances(sim.ys, S, {
        sigEps: hSigEps, sigEta: hSigEta, sigZeta: hSigZeta, sigOmega: hSigOmega,
      });
      setHSigEps(+r.sigEps.toFixed(4));
      setHSigEta(+r.sigEta.toFixed(4));
      setHSigZeta(+r.sigZeta.toFixed(4));
      setHSigOmega(+r.sigOmega.toFixed(4));
      setMleStatus(t("labs.econ.v23.dlm.doneStatus", { ll: r.loglik.toFixed(2) }));
    }, 30);
  };

  // Decomposition series for plotting
  const decompData = useMemo(() => {
    const sm = fit.smooth.smoothMean;
    return sim.ys.map((y, t) => ({
      t,
      y,
      level: sm[t][0],
      seasonal: sm[t][2] ?? 0,
      fitted: sm[t][0] + (sm[t][2] ?? 0),
      irregular: y - (sm[t][0] + (sm[t][2] ?? 0)),
      trueLevel: sim.trueLev[t],
    }));
  }, [fit, sim]);

  // Forecast
  const fcstData = useMemo(() => {
    const T = fit.T, Z = fit.Z, Q = fit.Q;
    const last = fit.filt.filtMean[fit.filt.filtMean.length - 1];
    const lastP = fit.filt.filtCov[fit.filt.filtCov.length - 1];
    const fc = forecast(horizon, T, Z, Q, hSigEps * hSigEps, last, lastP);
    return fc.map((p, i) => ({ t: sim.ys.length + i, mean: p.mean, lo: p.lo, hi: p.hi, band: [p.lo, p.hi] as [number, number] }));
  }, [fit, horizon, hSigEps, sim.ys.length]);

  const combined = useMemo(() => {
    const obs = decompData.map(d => ({ t: d.t, y: d.y, fitted: d.fitted, mean: null as number | null, band: null as [number, number] | null }));
    const fc  = fcstData.map(d => ({ t: d.t, y: null as number | null, fitted: null as number | null, mean: d.mean, band: d.band }));
    return [...obs, ...fc];
  }, [decompData, fcstData]);

  // diagnostics
  const innovStd = useMemo(() => {
    const v = fit.filt.innov; const F = fit.filt.innovVar;
    return v.map((vi, i) => ({ t: i, e: vi / Math.sqrt(F[i]) }));
  }, [fit]);
  const ljungQ = useMemo(() => {
    // Q on standardised innovations, lag 10
    const e = innovStd.map(d => d.e);
    const n2 = e.length; const lag = 10;
    const mean = e.reduce((a, b) => a + b, 0) / n2;
    const c0 = e.reduce((s, x) => s + (x - mean) ** 2, 0) / n2;
    let Q = 0;
    for (let k = 1; k <= lag; k++) {
      let c = 0;
      for (let t = k; t < n2; t++) c += (e[t] - mean) * (e[t - k] - mean);
      c /= n2;
      const r = c / c0;
      Q += (r * r) / (n2 - k);
    }
    Q *= n2 * (n2 + 2);
    return Q;
  }, [innovStd]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={dlmPresets((v) => {
        setN(v.n); setS(v.S);
        setTrueLevel(v.trueLevel); setTrueSlope(v.trueSlope); setSeasonAmp(v.seasonAmp);
        setSigObs(v.sigObs); setSigSlope(v.sigSlope); setSigSeason(v.sigSeason);
        setSeed(v.seed);
        setHSigEps(v.sigObs); setHSigEta(0.1); setHSigZeta(Math.max(v.sigSlope, 1e-3)); setHSigOmega(Math.max(v.sigSeason, 1e-3));
        setMleStatus(null);
      }, t)} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DGP controls */}
        <div className="space-y-3 p-4 rounded-xl border border-border bg-secondary/20">
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80">{t("labs.econ.v23.dlm.dgpTitle")}</p>
          <Slider label={t("labs.econ.v23.dlm.sampleSize")}     value={n}         min={40}  max={300} step={10} onChange={setN} />
          <Slider label={t("labs.econ.v23.dlm.seasonPeriod")}   value={S}         min={2}   max={12}  step={1}  onChange={(v) => setS(Math.round(v))} />
          <Slider label={t("labs.econ.v23.dlm.initLevel")}  value={trueLevel} min={0}   max={200} step={1}  onChange={setTrueLevel} />
          <Slider label={t("labs.econ.v23.dlm.initSlope")}  value={trueSlope} min={-1}  max={1}   step={0.05} onChange={setTrueSlope} />
          <Slider label={t("labs.econ.v23.dlm.seasonAmp")}     value={seasonAmp} min={0}   max={15}  step={0.5}  onChange={setSeasonAmp} />
          <Slider label={t("labs.econ.v23.dlm.sigmaEps")} value={sigObs}    min={0.1} max={6}   step={0.1}  onChange={setSigObs} />
          <Slider label={t("labs.econ.v23.dlm.sigmaZeta")} value={sigSlope}  min={0}   max={0.1} step={0.005} onChange={setSigSlope} />
          <Slider label={t("labs.econ.v23.dlm.sigmaOmega")} value={sigSeason} min={0}   max={1}   step={0.05}  onChange={setSigSeason} />
          <Slider label={t("labs.econ.v23.dlm.randomSeed")}      value={seed}      min={1}   max={999} step={1}    onChange={setSeed} />
        </div>

        {/* Estimation controls */}
        <div className="space-y-3 p-4 rounded-xl border border-border bg-secondary/20">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80">{t("labs.econ.v23.dlm.estVarTitle")}</p>
            <button onClick={onFitMLE}
              className="text-[11px] px-3 py-1.5 rounded-md border border-gold/40 bg-gold/10 text-gold hover:bg-gold/20 transition-colors font-mono">
              {t("labs.econ.v23.dlm.mleButton")}
            </button>
          </div>
          <Slider label="σ̂_ε (irregular)" value={hSigEps}   min={0.05} max={6}   step={0.05} onChange={setHSigEps} />
          <Slider label="σ̂_η (level)"     value={hSigEta}   min={0}    max={2}   step={0.01} onChange={setHSigEta} />
          <Slider label="σ̂_ζ (slope)"     value={hSigZeta}  min={0}    max={0.5} step={0.005} onChange={setHSigZeta} />
          <Slider label="σ̂_ω (seasonal)"  value={hSigOmega} min={0}    max={1}   step={0.01} onChange={setHSigOmega} />
          <Slider label={t("labs.econ.v23.dlm.horizonLabel")}        value={horizon}   min={4}    max={48}  step={2}    onChange={setHorizon} />
          {mleStatus && (
            <div className="text-[11px] font-mono text-gold/80 px-3 py-2 rounded-md bg-secondary/40 border border-gold/20">
              {mleStatus}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Stat label="log-lik"        value={fit.filt.loglik.toFixed(2)} color={CHART_GOLD} />
            <Stat label="AIC"            value={(-2 * fit.filt.loglik + 2 * 4).toFixed(2)} color={CHART_TEAL} />
            <Stat label={t("labs.econ.v23.dlm.snrLabel")} value={((hSigEta / hSigEps) ** 2).toFixed(4)} color={CHART_BLUE} sub={t("labs.econ.v23.dlm.snrSub")} />
            <Stat label="Ljung-Box Q(10)" value={ljungQ.toFixed(2)} color={ljungQ > 18.31 ? CHART_RED : CHART_TEAL} sub="χ²₀.₀₅ = 18.31" />
          </div>
        </div>
      </div>

      {/* Observed vs filtered + forecast */}
      <div>
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">
          {t("labs.econ.v23.dlm.chartTitle", { horizon })}
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={combined} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis type="number" dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} domain={["dataMin", "dataMax"]} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine x={sim.ys.length - 0.5} stroke={CHART_GOLD} strokeDasharray="4 3" label={{ value: t("labs.econ.v23.dlm.forecastStart"), position: "insideTopRight", fill: CHART_GOLD, fontSize: 10 }} />
            <Area dataKey="band" stroke="none" fill={CHART_GOLD} fillOpacity={0.13} name={t("labs.econ.v23.dlm.piName")} />
            <Line type="monotone" dataKey="y"      stroke={CHART_TEAL} strokeWidth={1.5} dot={false} name={t("labs.econ.v23.dlm.obsName")} connectNulls={false} />
            <Line type="monotone" dataKey="fitted" stroke={CHART_RED}  strokeWidth={1.5} dot={false} name={t("labs.econ.v23.dlm.fittedName")} connectNulls={false} />
            <Line type="monotone" dataKey="mean"   stroke={CHART_GOLD} strokeWidth={2}   dot={false} name={t("labs.econ.v23.dlm.forecastMeanName")} connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Decomposition: level + seasonal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">
            {t("labs.econ.v23.dlm.compILabel")}
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={decompData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="trueLevel" stroke={CHART_TEAL} strokeWidth={1} dot={false} strokeDasharray="3 3" name={t("labs.econ.v23.dlm.trueLevelName")} />
              <Line type="monotone" dataKey="level"     stroke={CHART_GOLD} strokeWidth={2} dot={false} name={t("labs.econ.v23.dlm.smoothLevelName")} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">
            {t("labs.econ.v23.dlm.compIILabel")}
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={decompData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
              <ReferenceLine y={0} stroke={CHART_GRID} />
              <Line type="monotone" dataKey="seasonal" stroke={CHART_BLUE} strokeWidth={2} dot={false} name="γ̂_t" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Standardised innovations diagnostics */}
      <div>
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">
          {t("labs.econ.v23.dlm.diagLabel")}
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={innovStd} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
            <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} domain={[-4, 4]} />
            <ReferenceLine y={ 1.96} stroke={CHART_RED} strokeDasharray="3 3" />
            <ReferenceLine y={-1.96} stroke={CHART_RED} strokeDasharray="3 3" />
            <ReferenceLine y={0} stroke={CHART_GRID} />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
            <Line type="monotone" dataKey="e" stroke={CHART_RED} strokeWidth={1.2} dot={false} name="ε̃_t" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border border-gold/20 bg-secondary/20 p-4 text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">{t("labs.econ.v23.dlm.footerTitle")}</strong></p>
        <p>• {t("labs.econ.v23.dlm.footer1a")} <em>x_t = [μ_t, ν_t, γ_t, γ_{"{t-1}"}, ..., γ_{"{t-S+2}"}]'</em>{t("labs.econ.v23.dlm.footer1b")}</p>
        <p>• {t("labs.econ.v23.dlm.footer2a")} <em>{t("labs.econ.v23.dlm.footer2trend")}</em>{t("labs.econ.v23.dlm.footer2b")}</p>
        <p>• <strong>q_η/ε = σ²_η / σ²_ε</strong>{t("labs.econ.v23.dlm.footer3")}</p>
        <p>• <strong>{t("labs.econ.v23.dlm.mleStrong")}</strong>{t("labs.econ.v23.dlm.footer4")}</p>
        <p>• <strong>{t("labs.econ.v23.dlm.diagStrong")}</strong>{t("labs.econ.v23.dlm.footer5")}</p>
        <p className="text-[11px] text-muted-foreground/80">Reference: Harvey A.C. (1989) <em>Forecasting, Structural Time Series Models and the Kalman Filter</em>, CUP;
          Durbin J. &amp; Koopman S.J. (2012) <em>Time Series Analysis by State Space Methods</em>, 2nd ed.</p>
      </div>
    </div>
  );
};
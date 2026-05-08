import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Cell, LineChart, Line,
} from "recharts";
import "katex/dist/katex.min.css";
import PresetButtons from "../PresetButtons";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_PURPLE = "hsl(280, 60%, 60%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function randn(rng: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = rng(); while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ── Linear algebra ── */
function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, n = B[0].length, k = B.length;
  const out: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
    let s = 0; for (let p = 0; p < k; p++) s += A[i][p] * B[p][j];
    out[i][j] = s;
  }
  return out;
}
function matVec(A: number[][], v: number[]): number[] {
  return A.map(row => row.reduce((s, x, j) => s + x * v[j], 0));
}
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

/* ── Build a random PSD covariance from random factor structure ── */
function buildCov(n: number, seed: number, vols: number[], corrStrength: number): number[][] {
  const rng = mulberry32(seed);
  // Single common factor + idiosyncratic: corr_ij ≈ b_i b_j / sqrt((b_i²+ι)(b_j²+ι))
  const b: number[] = Array.from({ length: n }, () => 0.3 + 0.7 * Math.abs(randn(rng)) * corrStrength);
  const iota = Math.max(0.001, 1 - corrStrength);
  const corr: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (i === j) corr[i][j] = 1;
    else corr[i][j] = (b[i] * b[j]) / Math.sqrt((b[i] * b[i] + iota) * (b[j] * b[j] + iota));
  }
  const Sigma: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++)
    Sigma[i][j] = corr[i][j] * vols[i] * vols[j];
  return Sigma;
}

/* ── Portfolios ── */
function equalWeight(n: number) { return new Array(n).fill(1 / n); }

function minVar(Sigma: number[][]): number[] {
  const n = Sigma.length;
  const inv = invertMatrix(Sigma);
  const ones = new Array(n).fill(1);
  const num = matVec(inv, ones);
  const denom = num.reduce((a, b) => a + b, 0);
  return num.map(v => v / denom);
}

/** ERC by cyclic coordinate descent on log-utility w_i ∝ w_i / (Σw)_i (Spinu 2013 / Maillard et al 2010). */
function erc(Sigma: number[][], iters = 500): number[] {
  const n = Sigma.length;
  let w = new Array(n).fill(1 / n);
  for (let k = 0; k < iters; k++) {
    let changed = 0;
    for (let i = 0; i < n; i++) {
      // Solve: Σ_ii w_i² + (Σ_{j≠i} Σ_ij w_j) w_i - σp² / n = 0
      // simpler iterative: w_i_new ∝ 1 / (Σw)_i
      const Sw = matVec(Sigma, w);
      const newWi = w[i] * Math.sqrt(1 / Math.max(Sw[i] * w[i], 1e-12));
      changed += Math.abs(newWi - w[i]);
      w[i] = newWi;
      const s = w.reduce((a, b) => a + b, 0);
      w = w.map(v => v / s);
    }
    if (changed < 1e-9) break;
  }
  return w;
}

/** HRP — Lopez de Prado (2016).  
 *  1. Distance d_ij = sqrt((1-ρ_ij)/2)  
 *  2. Single-linkage clustering on d → leaf order  
 *  3. Quasi-diagonalize Σ by leaf order  
 *  4. Recursive bisection allocating inverse-variance.
 */
function hrp(Sigma: number[][]): number[] {
  const n = Sigma.length;
  const sd = Sigma.map((r, i) => Math.sqrt(r[i]));
  const corr: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => Sigma[i][j] / (sd[i] * sd[j])));
  const dist: number[][] = corr.map((row, i) =>
    row.map((c, j) => Math.sqrt(Math.max((1 - c) / 2, 0))));

  // Single-linkage clustering. Each cluster is an array of original indices.
  const clusters: number[][] = Array.from({ length: n }, (_, i) => [i]);
  const dCluster = (A: number[], B: number[]) => {
    let m = Infinity;
    for (const a of A) for (const b of B) if (dist[a][b] < m) m = dist[a][b];
    return m;
  };
  while (clusters.length > 1) {
    let bi = 0, bj = 1, bd = Infinity;
    for (let i = 0; i < clusters.length; i++) for (let j = i + 1; j < clusters.length; j++) {
      const d = dCluster(clusters[i], clusters[j]);
      if (d < bd) { bd = d; bi = i; bj = j; }
    }
    const merged = [...clusters[bi], ...clusters[bj]];
    clusters.splice(bj, 1); clusters.splice(bi, 1);
    clusters.push(merged);
  }
  const order = clusters[0];

  // Recursive bisection on the ordered list
  const w = new Array(n).fill(1.0);
  const ivp = (idxs: number[]) => {
    // inverse-variance portfolio weights within cluster
    const ivar = idxs.map(i => 1 / Sigma[i][i]);
    const s = ivar.reduce((a, b) => a + b, 0);
    return ivar.map(v => v / s);
  };
  const clusterVar = (idxs: number[]) => {
    const wi = ivp(idxs);
    let v = 0;
    for (let a = 0; a < idxs.length; a++) for (let b = 0; b < idxs.length; b++)
      v += wi[a] * wi[b] * Sigma[idxs[a]][idxs[b]];
    return v;
  };
  const stack: number[][] = [order];
  while (stack.length > 0) {
    const c = stack.pop()!;
    if (c.length <= 1) continue;
    const mid = Math.floor(c.length / 2);
    const left = c.slice(0, mid), right = c.slice(mid);
    const vL = clusterVar(left), vR = clusterVar(right);
    const a = 1 - vL / (vL + vR); // weight to left
    for (const i of left) w[i] *= a;
    for (const i of right) w[i] *= 1 - a;
    stack.push(left); stack.push(right);
  }
  return w;
}

/* ── Portfolio metrics ── */
function portfolioStats(w: number[], Sigma: number[][]) {
  const Sw = matVec(Sigma, w);
  const var_p = w.reduce((s, wi, i) => s + wi * Sw[i], 0);
  const vol = Math.sqrt(var_p);
  const rc = w.map((wi, i) => (wi * Sw[i]) / Math.max(var_p, 1e-12)); // % risk contribution
  const heffWeights = 1 / w.reduce((s, wi) => s + wi * wi, 0); // effective N
  const heffRisk = 1 / rc.reduce((s, r) => s + r * r, 0);
  return { vol, rc, heffWeights, heffRisk };
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
        {label}{sub && <span className="text-muted-foreground ml-1.5 text-[10px]">{sub}</span>}
      </label>
      <span className="text-xs font-mono text-gold tabular-nums">
        {value.toFixed(step >= 1 ? 0 : 2)}{unit && ` ${unit}`}
      </span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))} className={sliderClass} />
  </div>
);

export const RiskParityTool = () => {
  const [n, setN] = useState(8);
  const [seed, setSeed] = useState(42);
  const [corrStrength, setCorrStrength] = useState(0.6);
  const [volDisp, setVolDisp] = useState(0.5); // dispersion of vols

  // Generate vol vector: σ_i = 0.1 + volDisp * uniform(seed)
  const vols = useMemo(() => {
    const rng = mulberry32(seed * 31 + 1);
    return Array.from({ length: n }, (_, i) => +(0.08 + volDisp * (0.05 + rng() * 0.4)).toFixed(4));
  }, [n, seed, volDisp]);

  const Sigma = useMemo(() => buildCov(n, seed, vols, corrStrength), [n, seed, vols, corrStrength]);

  const portfolios = useMemo(() => {
    const wEW = equalWeight(n);
    const wMV = minVar(Sigma);
    const wERC = erc(Sigma);
    const wHRP = hrp(Sigma);
    return {
      ew: { w: wEW, ...portfolioStats(wEW, Sigma) },
      mv: { w: wMV, ...portfolioStats(wMV, Sigma) },
      erc: { w: wERC, ...portfolioStats(wERC, Sigma) },
      hrp: { w: wHRP, ...portfolioStats(wHRP, Sigma) },
    };
  }, [n, Sigma]);

  // Long bar chart: per-asset weights side-by-side
  const weightChart = Array.from({ length: n }, (_, i) => ({
    asset: `A${i + 1}`,
    EW: +(portfolios.ew.w[i] * 100).toFixed(2),
    "Min-Var": +(portfolios.mv.w[i] * 100).toFixed(2),
    ERC: +(portfolios.erc.w[i] * 100).toFixed(2),
    HRP: +(portfolios.hrp.w[i] * 100).toFixed(2),
    σ: +(vols[i] * 100).toFixed(2),
  }));

  // Risk contribution chart
  const rcChart = Array.from({ length: n }, (_, i) => ({
    asset: `A${i + 1}`,
    EW: +(portfolios.ew.rc[i] * 100).toFixed(2),
    "Min-Var": +(portfolios.mv.rc[i] * 100).toFixed(2),
    ERC: +(portfolios.erc.rc[i] * 100).toFixed(2),
    HRP: +(portfolios.hrp.rc[i] * 100).toFixed(2),
  }));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "标准多资产", description: "8 资产, ρ=0.6", apply: () => { setN(8); setCorrStrength(0.6); setVolDisp(0.5); } },
        { name: "高相关 (危机)", description: "ρ=0.85", apply: () => { setN(8); setCorrStrength(0.85); setVolDisp(0.3); } },
        { name: "低相关 (分散有效)", description: "ρ=0.2", apply: () => { setN(10); setCorrStrength(0.2); setVolDisp(0.6); } },
        { name: "波动悬殊", description: "高 σ 离散度", apply: () => { setN(8); setVolDisp(1.0); setCorrStrength(0.5); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <Slider label="资产数 N" value={n} min={4} max={12} step={1} onChange={setN} />
        <Slider label="平均相关性" sub="0=独立 1=完全" value={corrStrength} min={0.05} max={0.95} step={0.05} onChange={setCorrStrength} />
        <Slider label="波动率离散度" value={volDisp} min={0.1} max={1.5} step={0.05} onChange={setVolDisp} />
        <Slider label="种子" value={seed} min={1} max={999} step={1} onChange={setSeed} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          { k: "ew", name: "Equal Weight (EW)", color: CHART_BLUE },
          { k: "mv", name: "Min-Variance", color: CHART_RED },
          { k: "erc", name: "Risk Parity (ERC)", color: CHART_GOLD },
          { k: "hrp", name: "HRP (Lopez de Prado)", color: CHART_TEAL },
        ] as const).map(({ k, name, color }) => {
          const p = (portfolios as any)[k];
          return (
            <div key={k} className="rounded-lg border border-border bg-secondary/30 p-3">
              <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color }}>{name}</p>
              <p className="text-base font-mono text-foreground mt-1">σ_p = {(p.vol * 100).toFixed(2)}%</p>
              <p className="text-[11px] font-mono text-muted-foreground">N_eff (w) = {p.heffWeights.toFixed(2)}</p>
              <p className="text-[11px] font-mono text-muted-foreground">N_eff (RC) = {p.heffRisk.toFixed(2)}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">资产配置权重 (%)</h4>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weightChart}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="asset" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} unit="%" />
              <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="EW" fill={CHART_BLUE} fillOpacity={0.8} />
              <Bar dataKey="Min-Var" fill={CHART_RED} fillOpacity={0.8} />
              <Bar dataKey="ERC" fill={CHART_GOLD} fillOpacity={0.8} />
              <Bar dataKey="HRP" fill={CHART_TEAL} fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">风险贡献分解 (%) — ERC 应近似水平线</h4>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rcChart}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="asset" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} unit="%" />
              <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="EW" fill={CHART_BLUE} fillOpacity={0.7} />
              <Bar dataKey="Min-Var" fill={CHART_RED} fillOpacity={0.7} />
              <Bar dataKey="ERC" fill={CHART_GOLD} fillOpacity={0.95} />
              <Bar dataKey="HRP" fill={CHART_TEAL} fillOpacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
        <p><span className="text-gold">Maillard et al. (2010) ERC：</span>权重满足 wᵢ·(Σw)ᵢ = const ⇒ 每资产对组合方差贡献相同。</p>
        <p><span className="text-gold">Lopez de Prado (2016) HRP：</span>无需求逆 Σ⁻¹，对噪声协方差更稳健；通过分层聚类避开 Markowitz 的 ill-conditioning。</p>
        <p>风险贡献条形图中 ERC 几近水平 → 风险均衡；Min-Var 高度集中于低 σ 资产。</p>
      </div>
    </div>
  );
};

export default RiskParityTool;
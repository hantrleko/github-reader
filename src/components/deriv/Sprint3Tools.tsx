import { useState, useMemo, useRef, Suspense } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, ScatterChart, Scatter, ComposedChart, Area, BarChart, Bar, Cell,
} from "recharts";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import PresetButtons from "../PresetButtons";
import { EquationBlock } from "@/components/common/EquationBlock";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

/* ─── Shared helpers ─── */
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
function normCdf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * ax);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return 0.5 * (1.0 + sign * y);
}
function bsCall(S: number, K: number, r: number, sigma: number, T: number) {
  if (T <= 0) return Math.max(S - K, 0);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return S * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2);
}
function bsPut(S: number, K: number, r: number, sigma: number, T: number) {
  if (T <= 0) return Math.max(K - S, 0);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return K * Math.exp(-r * T) * normCdf(-d2) - S * normCdf(-d1);
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

/* ════════════════════════════════════════════════════════════
   1. Volatility Surface (SVI parametrization)
   w(k) = a + b{ ρ(k - m) + sqrt((k-m)² + σ²) }   (raw SVI)
   Total variance w = σ_BS²·T → σ_IV(k,T) = sqrt(w/T)
   ════════════════════════════════════════════════════════════ */

// 3D mesh component
function SurfaceMesh({ kGrid, tGrid, ivGrid }: { kGrid: number[]; tGrid: number[]; ivGrid: number[][] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const Nx = kGrid.length, Ny = tGrid.length;

  const { geometry, colors } = useMemo(() => {
    const geom = new THREE.PlaneGeometry(4, 4, Nx - 1, Ny - 1);
    const positions = geom.attributes.position as THREE.BufferAttribute;
    let minIv = Infinity, maxIv = -Infinity;
    for (let j = 0; j < Ny; j++) for (let i = 0; i < Nx; i++) {
      const v = ivGrid[j][i]; if (v < minIv) minIv = v; if (v > maxIv) maxIv = v;
    }
    const cols: number[] = [];
    for (let j = 0; j < Ny; j++) {
      for (let i = 0; i < Nx; i++) {
        const idx = j * Nx + i;
        const iv = ivGrid[j][i];
        const z = (iv - minIv) * 4; // amplify
        positions.setZ(idx, z);
        // color ramp: teal → gold → red
        const t = (iv - minIv) / Math.max(maxIv - minIv, 1e-6);
        const c = new THREE.Color().setHSL(0.55 - t * 0.45, 0.75, 0.45 + t * 0.1);
        cols.push(c.r, c.g, c.b);
      }
    }
    geom.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    geom.computeVertexNormals();
    return { geometry: geom, colors: cols };
  }, [kGrid, tGrid, ivGrid, Nx, Ny]);

  useFrame((_, dt) => {
    if (meshRef.current) meshRef.current.rotation.z += dt * 0.05;
  });

  return (
    <>
      <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2.2, 0, 0]}>
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} flatShading={false} metalness={0.3} roughness={0.6} />
      </mesh>
      <gridHelper args={[5, 10, "#444", "#222"]} position={[0, -0.01, 0]} />
    </>
  );
}

export const VolSurfaceTool = () => {
  // SVI per-slice parameters (single slice for simplicity, then scale across T)
  const [a, setA] = useState(0.04);
  const [b, setB] = useState(0.2);
  const [rho, setRho] = useState(-0.4);
  const [m, setM] = useState(0.0);
  const [sigma, setSigma] = useState(0.2);
  // Term-structure: how a scales with T
  const [aSlope, setASlope] = useState(0.02);
  const [tMin, setTMin] = useState(0.1);
  const [tMax, setTMax] = useState(2.0);

  const Nk = 25, Nt = 18;

  const { kGrid, tGrid, ivGrid, surfaceLine, smileLine } = useMemo(() => {
    const ks: number[] = [];
    for (let i = 0; i < Nk; i++) ks.push(-0.8 + (1.6 * i) / (Nk - 1));
    const ts: number[] = [];
    for (let j = 0; j < Nt; j++) ts.push(tMin + ((tMax - tMin) * j) / (Nt - 1));
    const grid: number[][] = [];
    for (let j = 0; j < Nt; j++) {
      const T = ts[j];
      const aT = a + aSlope * T;
      const row: number[] = [];
      for (let i = 0; i < Nk; i++) {
        const k = ks[i];
        const w = aT + b * (rho * (k - m) + Math.sqrt((k - m) * (k - m) + sigma * sigma));
        const iv = Math.sqrt(Math.max(w, 1e-6) / T);
        row.push(iv);
      }
      grid.push(row);
    }
    // 2D smile at middle T
    const midJ = Math.floor(Nt / 2);
    const smile = ks.map((k, i) => ({ k: +k.toFixed(3), iv: +(grid[midJ][i] * 100).toFixed(2) }));
    // term structure ATM (k=0)
    const i0 = ks.findIndex(k => k >= 0);
    const term = ts.map((T, j) => ({ T: +T.toFixed(2), iv: +(grid[j][i0] * 100).toFixed(2) }));
    return { kGrid: ks, tGrid: ts, ivGrid: grid, surfaceLine: term, smileLine: smile };
  }, [a, b, rho, m, sigma, aSlope, tMin, tMax]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "股指标准笑容", description: "ρ<0, 左偏", apply: () => { setA(0.04); setB(0.18); setRho(-0.5); setM(0); setSigma(0.18); setASlope(0.02); } },
        { name: "FX 微笑", description: "对称 smile", apply: () => { setA(0.06); setB(0.25); setRho(0); setM(0); setSigma(0.15); setASlope(0.01); } },
        { name: "危机模式", description: "陡峭左偏", apply: () => { setA(0.08); setB(0.35); setRho(-0.8); setM(-0.05); setSigma(0.10); setASlope(0.04); } },
        { name: "平坦曲面", description: "近常数 IV", apply: () => { setA(0.05); setB(0.05); setRho(0); setM(0); setSigma(0.30); setASlope(0); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">SVI 参数 (raw)</p>
          <Slider label="a (level)" value={a} min={0} max={0.2} step={0.005} onChange={setA} />
          <Slider label="b (slope)" value={b} min={0.01} max={0.6} step={0.01} onChange={setB} />
          <Slider label="ρ (skew)" sub="负=左偏" value={rho} min={-0.95} max={0.95} step={0.05} onChange={setRho} />
          <Slider label="m (translation)" value={m} min={-0.3} max={0.3} step={0.01} onChange={setM} />
          <Slider label="σ (curvature)" value={sigma} min={0.02} max={0.6} step={0.01} onChange={setSigma} />
          <Slider label="期限项斜率 ∂a/∂T" value={aSlope} min={-0.02} max={0.08} step={0.005} onChange={setASlope} />
          <div className="grid grid-cols-2 gap-2">
            <Slider label="T_min" value={tMin} min={0.05} max={1} step={0.05} onChange={setTMin} />
            <Slider label="T_max" value={tMax} min={1} max={5} step={0.25} onChange={setTMax} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-secondary/20 p-2 h-[340px]">
            <Canvas camera={{ position: [4, 3.5, 4], fov: 45 }}>
              <Suspense fallback={null}>
                <ambientLight intensity={0.45} />
                <directionalLight position={[5, 5, 5]} intensity={0.8} />
                <directionalLight position={[-5, 3, -3]} intensity={0.3} />
                <SurfaceMesh kGrid={kGrid} tGrid={tGrid} ivGrid={ivGrid} />
                <Text position={[2.5, 0, 0]} fontSize={0.18} color="#d4af37">k (log-moneyness)</Text>
                <Text position={[0, 0, 2.5]} fontSize={0.18} color="#d4af37">T</Text>
                <Text position={[0, 1.6, 0]} fontSize={0.2} color="#d4af37">IV</Text>
                <OrbitControls enablePan={false} />
              </Suspense>
            </Canvas>
          </div>
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
            <p><span className="text-gold">SVI 公式：</span>w(k) = a + b·{`{`}ρ(k−m) + √((k−m)² + σ²){`}`}，其中 w 为总方差 = σ²·T。</p>
            <p>Gatheral (2004) 五参数模型，业界事实标准；ρ&lt;0 复现股指典型左偏。</p>
            <p>拖动 3D 曲面观察微笑/skew/期限结构形态。</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">2D 切片 — Smile @ T={tGrid[Math.floor(Nt / 2)].toFixed(2)}</h4>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={smileLine}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="k" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "log-moneyness k", position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "IV %", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Line type="monotone" dataKey="iv" stroke={CHART_GOLD} strokeWidth={2.5} dot={false} />
                <ReferenceLine x={0} stroke={CHART_TEAL} strokeDasharray="3 3" label={{ value: "ATM", fill: CHART_TEAL, fontSize: 10 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">ATM 期限结构 σ(T)</h4>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={surfaceLine}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="T" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "T (年)", position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "ATM IV %", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Line type="monotone" dataKey="iv" stroke={CHART_TEAL} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   2. American Option — Longstaff-Schwartz (LSM) + Binomial CRR
   ════════════════════════════════════════════════════════════ */

// CRR binomial American option
function binomialAmerican(S: number, K: number, r: number, sigma: number, T: number, N: number, isCall: boolean) {
  const dt = T / N;
  const u = Math.exp(sigma * Math.sqrt(dt));
  const d = 1 / u;
  const p = (Math.exp(r * dt) - d) / (u - d);
  const disc = Math.exp(-r * dt);
  const prices = new Array(N + 1);
  for (let i = 0; i <= N; i++) {
    const ST = S * Math.pow(u, N - i) * Math.pow(d, i);
    prices[i] = isCall ? Math.max(ST - K, 0) : Math.max(K - ST, 0);
  }
  for (let step = N - 1; step >= 0; step--) {
    for (let i = 0; i <= step; i++) {
      const ST = S * Math.pow(u, step - i) * Math.pow(d, i);
      const cont = disc * (p * prices[i] + (1 - p) * prices[i + 1]);
      const intrinsic = isCall ? Math.max(ST - K, 0) : Math.max(K - ST, 0);
      prices[i] = Math.max(cont, intrinsic);
    }
  }
  return prices[0];
}

// Solve OLS for [1, x, x²] basis
function regressQuadratic(xs: number[], ys: number[]): [number, number, number] {
  const n = xs.length;
  let sx = 0, sx2 = 0, sx3 = 0, sx4 = 0, sy = 0, sxy = 0, sx2y = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i], y = ys[i];
    const x2 = x * x;
    sx += x; sx2 += x2; sx3 += x2 * x; sx4 += x2 * x2;
    sy += y; sxy += x * y; sx2y += x2 * y;
  }
  // Normal equations matrix:
  // [n    sx   sx2 ] [a]   [sy ]
  // [sx   sx2  sx3 ] [b] = [sxy]
  // [sx2  sx3  sx4 ] [c]   [sx2y]
  const M = [
    [n, sx, sx2, sy],
    [sx, sx2, sx3, sxy],
    [sx2, sx3, sx4, sx2y],
  ];
  // Gaussian elimination
  for (let i = 0; i < 3; i++) {
    // pivot
    let mx = Math.abs(M[i][i]), mxi = i;
    for (let k = i + 1; k < 3; k++) if (Math.abs(M[k][i]) > mx) { mx = Math.abs(M[k][i]); mxi = k; }
    if (mxi !== i) { [M[i], M[mxi]] = [M[mxi], M[i]]; }
    if (Math.abs(M[i][i]) < 1e-12) return [0, 0, 0];
    for (let k = i + 1; k < 3; k++) {
      const f = M[k][i] / M[i][i];
      for (let j = i; j < 4; j++) M[k][j] -= f * M[i][j];
    }
  }
  const c = M[2][3] / M[2][2];
  const b = (M[1][3] - M[1][2] * c) / M[1][1];
  const a = (M[0][3] - M[0][1] * b - M[0][2] * c) / M[0][0];
  return [a, b, c];
}

export const AmericanOptionTool = () => {
  const [S, setS] = useState(100);
  const [K, setK] = useState(100);
  const [r, setR] = useState(0.05);
  const [sigma, setSigma] = useState(0.30);
  const [T, setT] = useState(1.0);
  const [paths, setPaths] = useState(5000);
  const [steps, setSteps] = useState(50);
  const [isCall, setIsCall] = useState(false);
  const [seed, setSeed] = useState(42);

  const result = useMemo(() => {
    const rng = mulberry32(seed);
    const dt = T / steps;
    const drift = (r - 0.5 * sigma * sigma) * dt;
    const vol = sigma * Math.sqrt(dt);

    // Antithetic paths
    const halfPaths = Math.floor(paths / 2);
    const N = halfPaths * 2;
    // S[t][path]
    const S_mat: number[][] = Array.from({ length: steps + 1 }, () => new Array(N).fill(0));
    for (let p = 0; p < N; p++) S_mat[0][p] = S;
    for (let t = 1; t <= steps; t++) {
      for (let p = 0; p < halfPaths; p++) {
        const z = randn(rng);
        S_mat[t][2 * p] = S_mat[t - 1][2 * p] * Math.exp(drift + vol * z);
        S_mat[t][2 * p + 1] = S_mat[t - 1][2 * p + 1] * Math.exp(drift - vol * z);
      }
    }

    // Cashflow & exercise time per path; init at maturity
    const payoff = (s: number) => isCall ? Math.max(s - K, 0) : Math.max(K - s, 0);
    const cashflow = new Array(N);
    const exTime = new Array(N);
    for (let p = 0; p < N; p++) {
      cashflow[p] = payoff(S_mat[steps][p]);
      exTime[p] = steps;
    }

    // Track exercise stats per step
    const exCounts = new Array(steps + 1).fill(0);
    for (let p = 0; p < N; p++) if (cashflow[p] > 0) exCounts[steps]++;

    const disc = Math.exp(-r * dt);

    // Sample regression points (for visualization at one chosen step)
    const visStep = Math.floor(steps / 2);
    let regSamples: { x: number; y: number; cont: number }[] = [];

    for (let t = steps - 1; t >= 1; t--) {
      // gather ITM paths
      const idxITM: number[] = [];
      const xs: number[] = [], ys: number[] = [];
      for (let p = 0; p < N; p++) {
        const intr = payoff(S_mat[t][p]);
        if (intr > 0) {
          idxITM.push(p);
          xs.push(S_mat[t][p]);
          // Discounted future cashflow from exercise time
          ys.push(cashflow[p] * Math.pow(disc, exTime[p] - t));
        }
      }
      let coef: [number, number, number] = [0, 0, 0];
      if (xs.length >= 3) coef = regressQuadratic(xs, ys);

      for (let kIdx = 0; kIdx < idxITM.length; kIdx++) {
        const p = idxITM[kIdx];
        const x = xs[kIdx];
        const cont = coef[0] + coef[1] * x + coef[2] * x * x;
        const intr = payoff(S_mat[t][p]);
        if (t === visStep) regSamples.push({ x: +x.toFixed(2), y: +ys[kIdx].toFixed(4), cont: +cont.toFixed(4) });
        if (intr > cont) {
          cashflow[p] = intr;
          exTime[p] = t;
          exCounts[t]++;
        }
      }
    }

    let sum = 0;
    for (let p = 0; p < N; p++) sum += cashflow[p] * Math.pow(disc, exTime[p]);
    const lsmPrice = sum / N;
    // Standard error
    let s2 = 0;
    for (let p = 0; p < N; p++) {
      const v = cashflow[p] * Math.pow(disc, exTime[p]);
      s2 += (v - lsmPrice) * (v - lsmPrice);
    }
    const se = Math.sqrt(s2 / (N - 1) / N);

    // European price (BS) and binomial American
    const euro = isCall ? bsCall(S, K, r, sigma, T) : bsPut(S, K, r, sigma, T);
    const binom = binomialAmerican(S, K, r, sigma, T, 200, isCall);
    const earlyPremium = lsmPrice - euro;

    // Sample paths for plot
    const samplePaths: any[] = [];
    const numSample = Math.min(60, N);
    for (let t = 0; t <= steps; t++) {
      const row: any = { t: +(t * dt).toFixed(3) };
      for (let p = 0; p < numSample; p++) row[`p${p}`] = +S_mat[t][p].toFixed(2);
      samplePaths.push(row);
    }

    // Exercise frequency by time
    const exDist = exCounts.map((c, t) => ({ t: +(t * dt).toFixed(3), pct: +((c / N) * 100).toFixed(2) }));

    // Sort regression samples for nice line
    regSamples.sort((aa, bb) => aa.x - bb.x);

    return { lsmPrice, se, euro, binom, earlyPremium, samplePaths, exDist, regSamples, visT: visStep * dt };
  }, [S, K, r, sigma, T, paths, steps, isCall, seed]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "ATM 美式认沽", description: "高早行使溢价", apply: () => { setS(100); setK(100); setR(0.06); setSigma(0.4); setT(1); setIsCall(false); } },
        { name: "深度实值认沽", description: "立即行使有利", apply: () => { setS(70); setK(100); setSigma(0.25); setIsCall(false); } },
        { name: "无股息认购", description: "美式 = 欧式", apply: () => { setS(100); setK(100); setR(0.05); setSigma(0.3); setIsCall(true); } },
        { name: "高精度模拟", description: "10k 路径 / 100 步", apply: () => { setPaths(10000); setSteps(100); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setIsCall(false)}
              className={"text-xs px-3 py-1.5 rounded border font-mono transition-colors " + (!isCall ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground")}>
              Put 认沽
            </button>
            <button onClick={() => setIsCall(true)}
              className={"text-xs px-3 py-1.5 rounded border font-mono transition-colors " + (isCall ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground")}>
              Call 认购
            </button>
          </div>
          <Slider label="标的价格 S₀" value={S} min={50} max={200} step={1} onChange={setS} />
          <Slider label="行权价 K" value={K} min={50} max={200} step={1} onChange={setK} />
          <Slider label="无风险利率 r" value={r} min={0} max={0.15} step={0.005} onChange={setR} />
          <Slider label="波动率 σ" value={sigma} min={0.05} max={0.8} step={0.01} onChange={setSigma} />
          <Slider label="期限 T" value={T} min={0.1} max={3} step={0.1} onChange={setT} />
          <Slider label="路径数" value={paths} min={1000} max={20000} step={1000} onChange={setPaths} />
          <Slider label="时间步数" value={steps} min={20} max={200} step={10} onChange={setSteps} />
          <Slider label="种子" value={seed} min={1} max={999} step={1} onChange={setSeed} />
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="LSM 美式价格" value={result.lsmPrice.toFixed(4)} color={CHART_GOLD} sub={`SE ±${result.se.toFixed(4)}`} />
            <Stat label="二叉树 (200步)" value={result.binom.toFixed(4)} color={CHART_TEAL} sub="benchmark" />
            <Stat label="欧式 (BS)" value={result.euro.toFixed(4)} sub="无早行使" />
            <Stat label="早行使溢价" value={result.earlyPremium.toFixed(4)} color={CHART_RED} sub="LSM − BS" />
            <Stat label="LSM-CRR 误差" value={Math.abs(result.lsmPrice - result.binom).toFixed(4)} sub="收敛诊断" />
            <Stat label="t-stat" value={(result.lsmPrice / Math.max(result.se, 1e-9)).toFixed(1)} sub="价格 / SE" />
          </div>
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">
            <p><span className="text-gold">Longstaff-Schwartz (2001)：</span>逆向时间循环，对 ITM 路径用最小二乘 (1, S, S²) 估计延续价值 E[V_{`{t+1}`}|S_t]。</p>
            <p>当内在价值 &gt; 拟合的延续价值时立即行使。无股息认购的早行使无价值，结果等于欧式 (Merton 1973)。</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">回归散点 @ t={result.visT.toFixed(2)} (ITM 路径)</h4>
          <p className="text-[10px] font-mono text-muted-foreground mb-2">点=未来折现现金流 · 金线=拟合的延续价值</p>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={result.regSamples}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Scatter dataKey="y" fill={CHART_TEAL} fillOpacity={0.5} />
                <Line type="monotone" dataKey="cont" stroke={CHART_GOLD} strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">行使时刻分布 (% of paths)</h4>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={result.exDist}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Bar dataKey="pct" fill={CHART_GOLD} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   3. Interest Rate Derivatives — Black-76 Cap/Floor/Swaption
   ════════════════════════════════════════════════════════════ */

// Black-76 caplet on forward rate F over period [T_i, T_{i+1}], notional N, year-frac τ
function caplet(F: number, K: number, sigma: number, T: number, tau: number, N: number, df: number, isCap: boolean) {
  if (T <= 0) return Math.max(isCap ? F - K : K - F, 0) * tau * N * df;
  const d1 = (Math.log(F / K) + 0.5 * sigma * sigma * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  const sign = isCap ? 1 : -1;
  return df * tau * N * sign * (F * normCdf(sign * d1) - K * normCdf(sign * d2));
}
// Black-76 swaption: payer (call on swap rate)
function swaption(forwardSwapRate: number, K: number, sigma: number, T: number, annuity: number, N: number, isPayer: boolean) {
  if (T <= 0) return Math.max(isPayer ? forwardSwapRate - K : K - forwardSwapRate, 0) * annuity * N;
  const F = forwardSwapRate;
  const d1 = (Math.log(F / K) + 0.5 * sigma * sigma * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  const sign = isPayer ? 1 : -1;
  return annuity * N * sign * (F * normCdf(sign * d1) - K * normCdf(sign * d2));
}

export const RatesDerivativesTool = () => {
  const [product, setProduct] = useState<"cap" | "floor" | "swaption">("cap");
  const [N, setN] = useState(100); // notional in M
  const [K, setK] = useState(0.04);
  const [sigma, setSigma] = useState(0.20);
  const [tenor, setTenor] = useState(5); // years
  const [freq, setFreq] = useState(2); // payments per year
  const [r0, setR0] = useState(0.035); // current short rate / first forward
  const [slope, setSlope] = useState(0.005); // upward sloping forward curve per year
  const [expiry, setExpiry] = useState(1); // swaption expiry (years)
  const [isPayer, setIsPayer] = useState(true);

  const result = useMemo(() => {
    const tau = 1 / freq;
    const nPay = Math.floor(tenor * freq);
    // Build forward curve: F_i for fixing at T_i = i·τ (i = 0..nPay-1)
    const forwards: { Ti: number; Fi: number; df: number }[] = [];
    for (let i = 0; i < nPay; i++) {
      const Ti = i * tau;
      const Fi = r0 + slope * Ti;
      // Discount factor uses average forward up to T_i+τ
      let cum = 0;
      for (let j = 0; j <= i; j++) cum += (r0 + slope * j * tau) * tau;
      const df = Math.exp(-cum);
      forwards.push({ Ti: +Ti.toFixed(3), Fi: +(Fi * 100).toFixed(3), df });
    }

    if (product === "swaption") {
      // forward starting swap at expiry, length = tenor
      // forward swap rate ≈ (P(0,T_start) - P(0,T_end))/Annuity
      const tStart = expiry;
      const nSwapPay = Math.floor(tenor * freq);
      // Build df for tStart and each payment
      const dfAt = (T: number) => {
        // Use simple forward integration with slope curve
        let cum = 0;
        const stepsN = Math.max(20, Math.floor(T * 12));
        const dt = T / stepsN;
        for (let s = 0; s < stepsN; s++) cum += (r0 + slope * (s + 0.5) * dt) * dt;
        return Math.exp(-cum);
      };
      const dfStart = dfAt(tStart);
      let annuity = 0;
      let dfEnd = dfStart;
      const swapLegs: any[] = [];
      for (let i = 1; i <= nSwapPay; i++) {
        const Ti = tStart + i * tau;
        const dfi = dfAt(Ti);
        annuity += tau * dfi;
        swapLegs.push({ Ti: +Ti.toFixed(3), df: +dfi.toFixed(4), pay: +(K * tau * N).toFixed(3) });
        dfEnd = dfi;
      }
      const fwdSwapRate = (dfStart - dfEnd) / annuity;
      const price = swaption(fwdSwapRate, K, sigma, expiry, annuity, N, isPayer);

      // Strike sensitivity
      const strikeCurve: any[] = [];
      for (let s = 0.005; s <= 0.10; s += 0.005) {
        const v = swaption(fwdSwapRate, s, sigma, expiry, annuity, N, isPayer);
        strikeCurve.push({ K: +(s * 100).toFixed(2), price: +v.toFixed(4) });
      }

      return { product, price, fwdRate: fwdSwapRate, annuity, dfStart, forwards, strikeCurve, swapLegs };
    }

    // Cap or Floor: sum of caplets/floorlets
    let total = 0;
    const caplets: any[] = [];
    const strikeCurve: any[] = [];
    for (const f of forwards) {
      const v = caplet(f.Fi / 100, K, sigma, f.Ti, tau, N, f.df, product === "cap");
      total += v;
      caplets.push({ Ti: f.Ti, value: +v.toFixed(4), Fi: f.Fi, df: +f.df.toFixed(4) });
    }
    for (let s = 0.005; s <= 0.10; s += 0.005) {
      let sum = 0;
      for (const f of forwards) sum += caplet(f.Fi / 100, s, sigma, f.Ti, tau, N, f.df, product === "cap");
      strikeCurve.push({ K: +(s * 100).toFixed(2), price: +sum.toFixed(4) });
    }
    return { product, price: total, forwards, caplets, strikeCurve };
  }, [product, N, K, sigma, tenor, freq, r0, slope, expiry, isPayer]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "5Y Cap @4%", description: "标准利率上限", apply: () => { setProduct("cap"); setTenor(5); setK(0.04); setSigma(0.2); setR0(0.035); setSlope(0.005); } },
        { name: "10Y Floor @2%", description: "下限保护", apply: () => { setProduct("floor"); setTenor(10); setK(0.02); setSigma(0.18); setR0(0.025); setSlope(0.003); } },
        { name: "1Y×5Y Payer Swaption", description: "支付方互换期权", apply: () => { setProduct("swaption"); setExpiry(1); setTenor(5); setK(0.04); setSigma(0.22); setIsPayer(true); } },
        { name: "高波动情景", description: "σ=35%", apply: () => { setSigma(0.35); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {([
              { id: "cap", label: "Cap 利率上限" },
              { id: "floor", label: "Floor 利率下限" },
              { id: "swaption", label: "Swaption 互换期权" },
            ] as const).map(m => (
              <button key={m.id} onClick={() => setProduct(m.id)}
                className={"text-xs px-3 py-1.5 rounded border font-mono transition-colors " +
                  (product === m.id ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground hover:text-foreground")}>
                {m.label}
              </button>
            ))}
          </div>
          {product === "swaption" && (
            <div className="flex gap-2">
              <button onClick={() => setIsPayer(true)}
                className={"text-xs px-3 py-1.5 rounded border font-mono " + (isPayer ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground")}>
                Payer 支付方
              </button>
              <button onClick={() => setIsPayer(false)}
                className={"text-xs px-3 py-1.5 rounded border font-mono " + (!isPayer ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground")}>
                Receiver 接收方
              </button>
            </div>
          )}
          <Slider label="名义本金 (M)" value={N} min={10} max={1000} step={10} onChange={setN} />
          <Slider label="行权利率 K" unit="" value={K} min={0.005} max={0.10} step={0.0025} onChange={setK} />
          <Slider label="Black 波动率 σ" value={sigma} min={0.05} max={0.80} step={0.01} onChange={setSigma} />
          <Slider label={product === "swaption" ? "底层互换期限 (年)" : "产品期限 (年)"} value={tenor} min={1} max={20} step={1} onChange={setTenor} />
          <Slider label="支付频率 (次/年)" value={freq} min={1} max={4} step={1} onChange={setFreq} />
          <Slider label="即期利率 r₀" value={r0} min={0} max={0.10} step={0.0025} onChange={setR0} />
          <Slider label="远期曲线斜率 ∂F/∂T" value={slope} min={-0.01} max={0.02} step={0.0005} onChange={setSlope} />
          {product === "swaption" && (
            <Slider label="期权到期 T (年)" value={expiry} min={0.25} max={10} step={0.25} onChange={setExpiry} />
          )}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="产品价格" value={result.price.toFixed(3)} color={CHART_GOLD} sub="单位: M" />
            <Stat label="价格 / 名义" value={`${(result.price / N * 10000).toFixed(1)} bp`} sub="prem / notional" />
            {product === "swaption" && (result as any).fwdRate !== undefined && (
              <>
                <Stat label="远期互换利率" value={`${((result as any).fwdRate * 100).toFixed(3)}%`} color={CHART_TEAL} />
                <Stat label="年金 A" value={(result as any).annuity.toFixed(4)} sub="Σ τ·P(0,Tᵢ)" />
              </>
            )}
            {product !== "swaption" && (
              <>
                <Stat label="caplet/floorlet 数" value={`${(result as any).caplets.length}`} />
                <Stat label="ATM 远期均值" value={`${((result as any).forwards.reduce((s: number, f: any) => s + f.Fi, 0) / (result as any).forwards.length).toFixed(2)}%`} color={CHART_TEAL} />
              </>
            )}
          </div>
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">
            <p><span className="text-gold">Black-76 框架：</span>把 F 视为对数正态随机变量，使用与 BS 类似的解析公式。</p>
            <p><strong>Cap</strong> = Σ caplet on F_i；<strong>Swaption</strong> = call/put on 远期互换利率 S_{`{T,N}`}，年金 A 作为 numéraire。</p>
            <p>Payer = 支付固定利率方在利率上行中获利，等价于看涨 swap rate。</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">远期利率曲线</h4>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={(result as any).forwards}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="Ti" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "T (年)", position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "F %", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Line type="monotone" dataKey="Fi" stroke={CHART_GOLD} strokeWidth={2.5} dot={{ r: 3 }} />
                <ReferenceLine y={K * 100} stroke={CHART_RED} strokeDasharray="4 4" label={{ value: `K=${(K * 100).toFixed(2)}%`, fill: CHART_RED, fontSize: 10 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">价格 vs 行权利率</h4>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={(result as any).strikeCurve}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="K" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "K %", position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "Price (M)", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Line type="monotone" dataKey="price" stroke={CHART_TEAL} strokeWidth={2.5} dot={false} />
                <ReferenceLine x={+(K * 100).toFixed(2)} stroke={CHART_GOLD} strokeDasharray="4 4" label={{ value: "当前 K", fill: CHART_GOLD, fontSize: 10 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

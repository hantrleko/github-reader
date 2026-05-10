import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine,
} from "recharts";
import "katex/dist/katex.min.css";
import PresetButtons from "../PresetButtons";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

const sliderClass =
  "w-full h-1.5 rounded-full appearance-none cursor-pointer bg-secondary accent-gold [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold";

const Slider = ({ label, sub, value, min, max, step, onChange }: {
  label: string; sub?: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) => (
  <div>
    <div className="flex justify-between items-baseline mb-1.5">
      <label className="text-[11px] text-secondary-foreground font-medium">
        {label}{sub && <span className="text-muted-foreground ml-1 text-[10px]">{sub}</span>}
      </label>
      <span className="text-[11px] font-mono text-gold tabular-nums">{value.toFixed(step >= 1 ? 0 : step >= 0.1 ? 2 : 3)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className={sliderClass} />
  </div>
);

/* ── shared math ── */
function mulberry32(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function randn(rng: () => number) { let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function normCdf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1; const ax = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * ax);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return 0.5 * (1.0 + sign * y);
}
function bsCall(S: number, K: number, r: number, sigma: number, T: number) {
  if (T <= 0 || sigma <= 0) return Math.max(S - K, 0);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return S * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2);
}
function impliedVol(price: number, S: number, K: number, r: number, T: number) {
  let lo = 1e-4, hi = 5.0;
  const fLo = bsCall(S, K, r, lo, T) - price; const fHi = bsCall(S, K, r, hi, T) - price;
  if (fLo * fHi > 0) return NaN;
  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi);
    const f = bsCall(S, K, r, mid, T) - price;
    if (Math.abs(f) < 1e-6) return mid;
    if (f * fLo > 0) lo = mid; else hi = mid;
  }
  return 0.5 * (lo + hi);
}

function sabrIV(F: number, K: number, T: number, alpha: number, beta: number, rho: number, nu: number): number {
  if (F <= 0 || K <= 0 || alpha <= 0) return NaN;
  const eps = 1e-7; const oneMb = 1 - beta;
  const FK = F * K; const logFK = Math.log(F / K); const FKb = Math.pow(FK, oneMb / 2);
  if (Math.abs(F - K) < eps * F) {
    const term1 = alpha / Math.pow(F, oneMb);
    const c1 = (oneMb * oneMb / 24) * (alpha * alpha) / Math.pow(F, 2 * oneMb);
    const c2 = 0.25 * (rho * beta * nu * alpha) / Math.pow(F, oneMb);
    const c3 = ((2 - 3 * rho * rho) / 24) * nu * nu;
    return term1 * (1 + (c1 + c2 + c3) * T);
  }
  const z = (nu / alpha) * FKb * logFK;
  const xz = Math.log((Math.sqrt(1 - 2 * rho * z + z * z) + z - rho) / (1 - rho));
  const denom = FKb * (1 + (oneMb * oneMb / 24) * logFK * logFK + (Math.pow(oneMb, 4) / 1920) * Math.pow(logFK, 4));
  const A = alpha / denom; const B = z / xz;
  const C1 = (oneMb * oneMb / 24) * (alpha * alpha) / Math.pow(FK, oneMb);
  const C2 = 0.25 * (rho * beta * nu * alpha) / Math.pow(FK, oneMb / 2);
  const C3 = ((2 - 3 * rho * rho) / 24) * nu * nu;
  return A * B * (1 + (C1 + C2 + C3) * T);
}

/** Heston MC implied vol smile for given T over k-grid. */
function hestonSmile(params: {
  S0: number; r: number; v0: number; kappa: number; theta: number; xi: number; rho: number;
  T: number; ks: number[]; nPaths: number; nSteps: number; seed: number;
}): { k: number; iv: number }[] {
  const { S0, r, v0, kappa, theta, xi, rho, T, ks, nPaths, nSteps, seed } = params;
  const rng = mulberry32(seed);
  const dt = T / nSteps; const sqrtDt = Math.sqrt(dt);
  const Scur = new Float64Array(nPaths).fill(S0);
  const vCur = new Float64Array(nPaths).fill(v0);
  for (let s = 0; s < nSteps; s++) {
    for (let i = 0; i < nPaths; i++) {
      const z1 = randn(rng);
      const z2 = rho * z1 + Math.sqrt(1 - rho * rho) * randn(rng);
      const vPos = Math.max(vCur[i], 0); const sqv = Math.sqrt(vPos);
      Scur[i] = Scur[i] * Math.exp((r - 0.5 * vPos) * dt + sqv * sqrtDt * z1);
      vCur[i] = vCur[i] + kappa * (theta - vPos) * dt + xi * sqv * sqrtDt * z2;
    }
  }
  const disc = Math.exp(-r * T);
  return ks.map(k => {
    const K = S0 * Math.exp(k);
    let s = 0; for (let i = 0; i < nPaths; i++) { const p = Scur[i] - K; if (p > 0) s += p; }
    const price = (s / nPaths) * disc;
    const iv = impliedVol(price, S0, K, r, T);
    return { k, iv: isFinite(iv) ? iv : NaN };
  });
}

export const SABRvsHestonTool = () => {
  // shared market
  const [S0, setS0] = useState(100);
  const [r, setR] = useState(0.03);
  const [T, setT] = useState(1.0);

  // SABR
  const [alpha, setAlpha] = useState(0.20);
  const [beta, setBeta] = useState(0.5);
  const [rhoS, setRhoS] = useState(-0.5);
  const [nu, setNu] = useState(0.55);

  // Heston
  const [v0, setV0] = useState(0.04);
  const [kappa, setKappa] = useState(2.0);
  const [theta, setTheta] = useState(0.04);
  const [xi, setXi] = useState(0.5);
  const [rhoH, setRhoH] = useState(-0.7);
  const [nPaths, setNPaths] = useState(2500);
  const [seed, setSeed] = useState(7);

  // Smile @ current T
  const smile = useMemo(() => {
    const ks: number[] = [];
    for (let i = -10; i <= 10; i++) ks.push(0.04 * i);
    const hes = hestonSmile({ S0, r, v0, kappa, theta, xi, rho: rhoH, T, ks, nPaths, nSteps: 80, seed });
    return ks.map((k, i) => {
      const K = S0 * Math.exp(k);
      const sIV = sabrIV(S0, K, T, alpha, beta, rhoS, nu);
      const hIV = hes[i].iv;
      return {
        k: +k.toFixed(3),
        sabr: isFinite(sIV) ? +(sIV * 100).toFixed(2) : 0,
        heston: isFinite(hIV) ? +(hIV * 100).toFixed(2) : 0,
        diff: isFinite(sIV) && isFinite(hIV) ? +((sIV - hIV) * 100).toFixed(3) : 0,
      };
    });
  }, [S0, r, T, alpha, beta, rhoS, nu, v0, kappa, theta, xi, rhoH, nPaths, seed]);

  // key points
  const keyPts = useMemo(() => {
    const atmS = sabrIV(S0, S0, T, alpha, beta, rhoS, nu);
    const atmH = (hestonSmile({ S0, r, v0, kappa, theta, xi, rho: rhoH, T, ks: [0], nPaths, nSteps: 80, seed })[0].iv) || NaN;
    const k25 = 0.10;
    const sLo = sabrIV(S0, S0 * Math.exp(-k25), T, alpha, beta, rhoS, nu);
    const sHi = sabrIV(S0, S0 * Math.exp(+k25), T, alpha, beta, rhoS, nu);
    const hSm = hestonSmile({ S0, r, v0, kappa, theta, xi, rho: rhoH, T, ks: [-k25, +k25], nPaths, nSteps: 80, seed: seed + 1 });
    const rrS = (sLo - sHi) * 100;
    const rrH = ((hSm[0].iv || 0) - (hSm[1].iv || 0)) * 100;
    return { atmS: atmS * 100, atmH: atmH * 100, rrS, rrH };
  }, [S0, r, T, alpha, beta, rhoS, nu, v0, kappa, theta, xi, rhoH, nPaths, seed]);

  // Error heatmap over (k, T)
  const heatmap = useMemo(() => {
    const ks = [-0.20, -0.15, -0.10, -0.05, 0, 0.05, 0.10, 0.15, 0.20];
    const Ts = [0.25, 0.5, 1.0, 1.5, 2.0];
    const grid: { k: number; T: number; err: number }[] = [];
    let maxAbs = 0;
    for (const Tk of Ts) {
      const hes = hestonSmile({ S0, r, v0, kappa, theta, xi, rho: rhoH, T: Tk, ks, nPaths: Math.max(1500, Math.floor(nPaths / 2)), nSteps: 60, seed });
      ks.forEach((k, i) => {
        const K = S0 * Math.exp(k);
        const sIV = sabrIV(S0, K, Tk, alpha, beta, rhoS, nu);
        const hIV = hes[i].iv;
        const err = (isFinite(sIV) && isFinite(hIV)) ? (sIV - hIV) * 100 : 0;
        if (Math.abs(err) > maxAbs) maxAbs = Math.abs(err);
        grid.push({ k, T: Tk, err: +err.toFixed(3) });
      });
    }
    return { ks, Ts, grid, maxAbs };
  }, [S0, r, alpha, beta, rhoS, nu, v0, kappa, theta, xi, rhoH, nPaths, seed]);

  const colorFor = (err: number, maxAbs: number) => {
    if (maxAbs < 1e-6) return "hsl(180, 30%, 45%)";
    const t = Math.max(-1, Math.min(1, err / maxAbs));
    // negative=teal, positive=red, zero=neutral
    if (t >= 0) {
      const l = 60 - 25 * t;
      return `hsl(0, ${30 + 50 * t}%, ${l}%)`;
    } else {
      const l = 60 - 25 * Math.abs(t);
      return `hsl(180, ${30 + 50 * Math.abs(t)}%, ${l}%)`;
    }
  };

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "股指基线 (左偏)", description: "ρ<0, 中等 vol-of-vol", apply: () => {
          setAlpha(0.20); setBeta(0.5); setRhoS(-0.5); setNu(0.5);
          setV0(0.04); setKappa(2); setTheta(0.04); setXi(0.5); setRhoH(-0.7);
        }},
        { name: "FX 对称微笑", description: "ρ≈0, 凸性主导", apply: () => {
          setAlpha(0.12); setBeta(1.0); setRhoS(0); setNu(0.7);
          setV0(0.025); setKappa(1.5); setTheta(0.025); setXi(0.6); setRhoH(0);
        }},
        { name: "危机左尾", description: "强 ρ<0, 高 ξ/ν", apply: () => {
          setAlpha(0.30); setBeta(0.7); setRhoS(-0.8); setNu(0.9);
          setV0(0.10); setKappa(3); setTheta(0.06); setXi(0.8); setRhoH(-0.85);
        }},
      ]} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-2">
          <p className="text-[11px] font-mono text-gold uppercase tracking-wider">市场</p>
          <Slider label="S₀ = F" value={S0} min={50} max={200} step={5} onChange={setS0} />
          <Slider label="r" value={r} min={0} max={0.1} step={0.005} onChange={setR} />
          <Slider label="T (年)" value={T} min={0.1} max={3} step={0.05} onChange={setT} />
        </div>
        <div className="rounded-lg border border-gold/30 bg-secondary/20 p-3 space-y-2">
          <p className="text-[11px] font-mono text-gold uppercase tracking-wider">SABR</p>
          <Slider label="α" value={alpha} min={0.01} max={1} step={0.01} onChange={setAlpha} />
          <Slider label="β" value={beta} min={0} max={1} step={0.05} onChange={setBeta} />
          <Slider label="ρ" value={rhoS} min={-0.95} max={0.95} step={0.05} onChange={setRhoS} />
          <Slider label="ν" value={nu} min={0.05} max={2} step={0.05} onChange={setNu} />
        </div>
        <div className="rounded-lg border border-teal-500/30 bg-secondary/20 p-3 space-y-2">
          <p className="text-[11px] font-mono uppercase tracking-wider" style={{ color: CHART_TEAL }}>Heston</p>
          <div className="grid grid-cols-2 gap-2">
            <Slider label="v₀" value={v0} min={0.005} max={0.2} step={0.005} onChange={setV0} />
            <Slider label="θ" value={theta} min={0.005} max={0.2} step={0.005} onChange={setTheta} />
            <Slider label="κ" value={kappa} min={0.1} max={6} step={0.1} onChange={setKappa} />
            <Slider label="ξ" value={xi} min={0.05} max={1.5} step={0.05} onChange={setXi} />
            <Slider label="ρ" value={rhoH} min={-0.95} max={0.95} step={0.05} onChange={setRhoH} />
            <Slider label="路径" value={nPaths} min={1000} max={6000} step={500} onChange={setNPaths} />
          </div>
        </div>
      </div>

      {/* Key points */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded-lg bg-secondary/40 border border-gold/30 p-3">
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">SABR ATM IV</p>
          <p className="text-lg font-mono tabular-nums" style={{ color: CHART_GOLD }}>{keyPts.atmS.toFixed(2)}%</p>
        </div>
        <div className="rounded-lg bg-secondary/40 border p-3" style={{ borderColor: "hsl(180 50% 40% / 0.3)" }}>
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Heston ATM IV</p>
          <p className="text-lg font-mono tabular-nums" style={{ color: CHART_TEAL }}>{keyPts.atmH.toFixed(2)}%</p>
        </div>
        <div className="rounded-lg bg-secondary/40 border border-gold/30 p-3">
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">SABR 25Δ RR</p>
          <p className="text-lg font-mono tabular-nums" style={{ color: CHART_GOLD }}>{keyPts.rrS.toFixed(2)}%</p>
        </div>
        <div className="rounded-lg bg-secondary/40 border p-3" style={{ borderColor: "hsl(180 50% 40% / 0.3)" }}>
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Heston 25Δ RR</p>
          <p className="text-lg font-mono tabular-nums" style={{ color: CHART_TEAL }}>{keyPts.rrH.toFixed(2)}%</p>
        </div>
      </div>

      {/* Smile overlay */}
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">微笑曲线对比 — SABR (解析) vs Heston (MC) @ T={T.toFixed(2)}</h4>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={smile}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="k" stroke={CHART_TEXT} tick={{ fontSize: 10 }}
                label={{ value: "log-moneyness k = ln(K/S₀)", position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }}
                label={{ value: "IV %", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="sabr" name="SABR (Hagan)" stroke={CHART_GOLD} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="heston" name="Heston (MC)" stroke={CHART_TEAL} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 1.5 }} />
              <ReferenceLine x={0} stroke={CHART_RED} strokeDasharray="3 3" label={{ value: "ATM", fill: CHART_RED, fontSize: 10 }} />
              <ReferenceLine x={-0.10} stroke={CHART_TEXT} strokeDasharray="2 4" label={{ value: "25ΔP", fill: CHART_TEXT, fontSize: 9 }} />
              <ReferenceLine x={0.10} stroke={CHART_TEXT} strokeDasharray="2 4" label={{ value: "25ΔC", fill: CHART_TEXT, fontSize: 9 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Diff line */}
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">误差曲线 σ<sub>SABR</sub> − σ<sub>Heston</sub> (单位: %)</h4>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={smile}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="k" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <ReferenceLine y={0} stroke={CHART_RED} strokeDasharray="3 3" />
              <Line type="monotone" dataKey="diff" stroke={CHART_RED} strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Error heatmap */}
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">误差热图 |σ<sub>SABR</sub> − σ<sub>Heston</sub>| over (k, T) — 单位: %</h4>
        <div className="overflow-x-auto">
          <table className="text-[10px] font-mono mx-auto">
            <thead>
              <tr>
                <th className="px-1 py-0.5 text-muted-foreground">T \ k</th>
                {heatmap.ks.map(k => (
                  <th key={k} className="px-1.5 py-0.5 text-muted-foreground tabular-nums">{k.toFixed(2)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmap.Ts.map(Tk => (
                <tr key={Tk}>
                  <td className="px-1 py-0.5 text-muted-foreground tabular-nums">{Tk.toFixed(2)}</td>
                  {heatmap.ks.map(k => {
                    const cell = heatmap.grid.find(g => g.k === k && g.T === Tk);
                    const err = cell?.err ?? 0;
                    return (
                      <td key={k} className="px-2 py-1 text-center tabular-nums"
                        style={{ background: colorFor(err, heatmap.maxAbs), color: "hsl(var(--background))" }}
                        title={`k=${k.toFixed(2)}, T=${Tk.toFixed(2)}: ${err.toFixed(2)}%`}>
                        {err >= 0 ? "+" : ""}{err.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-muted-foreground justify-center">
          <span style={{ color: CHART_TEAL }}>■ 负 (SABR &lt; Heston)</span>
          <span>■ 接近</span>
          <span style={{ color: CHART_RED }}>■ 正 (SABR &gt; Heston)</span>
          <span className="ml-3">最大 |误差|: <span className="text-gold">{heatmap.maxAbs.toFixed(2)}%</span></span>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground mt-2 leading-relaxed">
          Hagan 公式为 T 较大或远离 ATM 时的渐近近似，期限越长、|k| 越大，与 Heston MC 的偏差通常越显著 — 热图直观展示了 SABR 解析解的有效域。
        </p>
      </div>
    </div>
  );
};

export default SABRvsHestonTool;

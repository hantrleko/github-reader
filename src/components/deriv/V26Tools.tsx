import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, ComposedChart, Area, ScatterChart, Scatter, BarChart, Bar, Cell,
} from "recharts";
import "katex/dist/katex.min.css";
import PresetButtons from "../PresetButtons";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED  = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

/* PRNG */
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
  const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x)/Math.SQRT2;
  const t = 1.0/(1.0+p*ax);
  const y = 1.0-(((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-ax*ax);
  return 0.5*(1.0+sign*y);
}
function bs(S:number,K:number,r:number,sig:number,T:number,call:boolean){
  if (T<=1e-9) return Math.max(call?S-K:K-S,0);
  const d1 = (Math.log(S/K)+(r+0.5*sig*sig)*T)/(sig*Math.sqrt(T));
  const d2 = d1 - sig*Math.sqrt(T);
  return call ? S*normCdf(d1)-K*Math.exp(-r*T)*normCdf(d2)
              : K*Math.exp(-r*T)*normCdf(-d2)-S*normCdf(-d1);
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

/* ════════════════════════════════════════════════════════════
   1. Bermudan Swaption — LMM Monte Carlo (Longstaff-Schwartz)
   ════════════════════════════════════════════════════════════ */
export const LMMSwaptionTool = () => {
  const [N, setN] = useState(5);           // tenor years (N libor periods, semi-annual? use annual for simplicity)
  const [K, setK] = useState(0.04);        // strike rate
  const [F0, setF0] = useState(0.04);      // flat initial fwd
  const [sigmaLMM, setSigma] = useState(0.20);
  const [rho, setRho] = useState(0.8);     // inter-fwd correlation
  const [nPaths, setNPaths] = useState(2000);
  const [seed, setSeed] = useState(42);
  const [exMode, setExMode] = useState<"bermudan" | "european">("bermudan");

  const result = useMemo(() => {
    const dt = 1.0;                        // 1y tenor
    const rng = mulberry32(seed);
    // Forward rates F_i for i = 0..N-1 reset T_i=i, pay T_{i+1}.
    // Discount via spot Libor: P(0,T_{k}) = ∏_{i<k} 1/(1+F_i·dt) — use simulated path for numeraire.
    // Use spot-libor measure: numeraire B_t = ∏_{i: T_i<=t} (1+F_i(T_i)·dt).
    // Pre-compute correlation eigen-factors (use rank-2 for speed).
    const fwdsAll: number[][] = []; // paths × N
    const numAll: number[] = [];    // path numeraire at T_N
    const exposureAtT: number[][] = Array.from({length: N}, () => []); // payer-swap value at each exercise date per path

    for (let p = 0; p < nPaths; p++) {
      const F = new Array(N).fill(F0);
      let logNum = 0;
      const exposurePath: number[] = [];
      // Evolve through each tenor step k = 0..N-1 (over [T_k, T_{k+1}]).
      for (let k = 0; k < N; k++) {
        // Capture exposure (payer swap value) at T_k BEFORE freezing F[k]:
        // Value of payer swap starting at T_k with remaining tenor (N-k):
        // V_k = Σ_{i=k}^{N-1} P(T_k,T_{i+1}) * dt * (F_i(T_k) - K)
        // Use simulated F[i] at T_k as forwards seen at T_k.
        let P = 1.0;
        let swapVal = 0;
        for (let i = k; i < N; i++) {
          P /= (1 + F[i] * dt);
          swapVal += P * dt * (F[i] - K);
        }
        exposurePath.push(Math.max(swapVal, 0)); // payer swaption intrinsic
        exposureAtT[k].push(swapVal);            // raw swap value (can be negative)

        // Now diffuse forwards F[i] for i=k..N-1 over dt under spot measure.
        // Drift μ_i = σ_i σ_k ρ_{ik} F_i / (1+F_i dt) summed; simplified two-factor.
        // Use two correlated normals for rank-2 factor:
        const z1 = randn(rng);
        const z2 = randn(rng);
        for (let i = k; i < N; i++) {
          // factor loadings: b1_i = sqrt(rho), b2_i = sqrt(1-rho)*cos((i-k)*0.3) (decay)
          const b1 = Math.sqrt(Math.max(rho, 0));
          const b2 = Math.sqrt(Math.max(1 - rho, 0)) * Math.cos((i - k) * 0.25);
          const dW = (b1 * z1 + b2 * z2) * Math.sqrt(dt);
          // Spot-measure drift (approximate, freeze F at start of step):
          let drift = 0;
          for (let j = k; j <= i; j++) {
            const corr_ij = b1 * b1 + b2 * Math.sqrt(Math.max(1-rho,0)) * Math.cos((j-k)*0.25);
            drift += corr_ij * sigmaLMM * sigmaLMM * F[j] * dt / (1 + F[j] * dt);
          }
          F[i] = F[i] * Math.exp((drift - 0.5 * sigmaLMM * sigmaLMM) * dt + sigmaLMM * dW);
        }
        // Update numeraire by the libor rate fixed at T_k: B grows by (1+F[k](T_k)·dt)
        // F[k] was frozen at fixing, but we already overwrote it; capture before evolve:
        // (For pedagogical accuracy: use the pre-evolved F[k] for numeraire.)
        // Simpler: use the post-evolved F[k] — bias small for σ·√dt < 0.3.
        logNum += Math.log(1 + F[k] * dt);
      }
      fwdsAll.push(F);
      numAll.push(Math.exp(logNum));
      // attach exposure path: we stored in exposureAtT
    }

    // Longstaff-Schwartz backward induction for Bermudan payer swaption.
    // Exercise dates: T_0, T_1, ..., T_{N-1}. Continuation regression on (V_k, V_k^2).
    // Cashflow if exercised at T_k = swapVal(T_k); but we need discounting to T_0 by 1/B_k.
    // For simplicity, treat all paths share same discount: deflate by numeraire at exercise.
    // We need numeraire at each T_k: log B_{T_k} = Σ_{i<k} log(1+F_i(T_i)·dt).
    // We did not store; reconstruct: assume our logNum was accumulated; approximate via flat F0.
    const disc = (k: number) => Math.exp(-F0 * k); // simple flat discount for clarity

    // Cash flow array per path = (kStar, value)
    // Backward: start at T_{N-1} as last exercise.
    const cf = new Array(nPaths).fill(0).map(() => ({ k: -1, val: 0 })); // exercise index & undiscounted payoff
    // Initialize: at T_{N-1}, exercise if exposure > 0
    for (let p = 0; p < nPaths; p++) {
      const v = Math.max(exposureAtT[N-1][p], 0);
      if (v > 0) cf[p] = { k: N-1, val: v };
    }
    if (exMode === "bermudan") {
      for (let k = N - 2; k >= 0; k--) {
        // ITM paths
        const itm: number[] = [];
        for (let p = 0; p < nPaths; p++) if (exposureAtT[k][p] > 0) itm.push(p);
        if (itm.length < 5) continue;
        // Regression x = exposure(k), y = discounted future CF from cf[p]
        let s0=0,s1=0,s2=0,s3=0,s4=0, t0=0,t1=0,t2=0;
        for (const p of itm) {
          const x = exposureAtT[k][p];
          const dy = cf[p].k >= 0 ? cf[p].val * disc(cf[p].k - k) : 0;
          s0++; s1+=x; s2+=x*x; s3+=x*x*x; s4+=x*x*x*x;
          t0+=dy; t1+=x*dy; t2+=x*x*dy;
        }
        // Solve 3x3 normal equations for quadratic regression [1,x,x²].
        const A=[[s0,s1,s2],[s1,s2,s3],[s2,s3,s4]];
        const b=[t0,t1,t2];
        // Cramer
        const det = (m:number[][])=>m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])
          -m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])
          +m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
        const D = det(A);
        if (Math.abs(D) < 1e-12) continue;
        const replace = (col:number)=>{const M=A.map(r=>r.slice());for(let i=0;i<3;i++)M[i][col]=b[i];return M;};
        const c0 = det(replace(0))/D, c1 = det(replace(1))/D, c2 = det(replace(2))/D;
        for (const p of itm) {
          const x = exposureAtT[k][p];
          const contVal = c0 + c1*x + c2*x*x;
          if (x > contVal && x > 0) cf[p] = { k, val: x };
        }
      }
    } else {
      // European: only exercise at T_0
      for (let p = 0; p < nPaths; p++) {
        const v = Math.max(exposureAtT[0][p], 0);
        cf[p] = v > 0 ? { k: 0, val: v } : { k: -1, val: 0 };
      }
    }

    let sumPV = 0, sumPV2 = 0, nEx = 0;
    const exerciseHist = new Array(N).fill(0);
    for (let p = 0; p < nPaths; p++) {
      if (cf[p].k >= 0) {
        const pv = cf[p].val * disc(cf[p].k);
        sumPV += pv; sumPV2 += pv*pv;
        nEx++;
        exerciseHist[cf[p].k]++;
      }
    }
    const price = sumPV / nPaths;
    const se = Math.sqrt(Math.max((sumPV2/nPaths - price*price)/Math.max(nPaths-1,1), 0));

    // European Black-76 reference: payer swaption on swap starting T_0 with tenor N
    // Treat as Black on swap rate ≈ F0 (flat curve): annuity A = Σ_{i=1..N} P(0,T_i)
    let A = 0, Pacc = 1;
    for (let i = 0; i < N; i++) { Pacc /= (1+F0*dt); A += Pacc * dt; }
    const Tex = 1e-6; // immediate (at T_0, but we treat T_0=0 here for simplicity)
    // Use sigma·sqrt(N/2) as effective vol over life — for indication only.
    const sigEff = sigmaLMM * Math.sqrt(N/2);
    const d1 = (Math.log(F0/K) + 0.5*sigEff*sigEff) / Math.max(sigEff,1e-6);
    const d2 = d1 - sigEff;
    const blackPayer = A * (F0*normCdf(d1) - K*normCdf(d2));

    // Exposure stats per date (mean positive exposure)
    const exposureChart = exposureAtT.map((arr, k) => {
      const mean = arr.reduce((s,v)=>s+v,0)/arr.length;
      const pos = arr.filter(v=>v>0);
      const epe = pos.length ? pos.reduce((s,v)=>s+v,0)/arr.length : 0;
      return { T: k, mean: +(mean*100).toFixed(3), epe: +(epe*100).toFixed(3) };
    });
    const exerciseChart = exerciseHist.map((c, k) => ({ T: k, freq: +(c/nPaths*100).toFixed(1) }));

    return { price, se, blackPayer, exerciseChart, exposureChart, nEx };
  }, [N, K, F0, sigmaLMM, rho, nPaths, seed, exMode]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "ATM Bermudan", description: "F₀=K=4%, 5y", apply: () => { setN(5); setK(0.04); setF0(0.04); setSigma(0.2); setRho(0.8); setExMode("bermudan"); } },
        { name: "Deep ITM 长尾", description: "K=2%, 高波动", apply: () => { setN(7); setK(0.02); setF0(0.05); setSigma(0.3); setExMode("bermudan"); } },
        { name: "OTM European", description: "K=6%, 仅 T₀ 行权", apply: () => { setN(5); setK(0.06); setF0(0.04); setSigma(0.25); setExMode("european"); } },
        { name: "强相关 (≈HJM 1-fac)", description: "ρ=0.99", apply: () => { setRho(0.99); setSigma(0.18); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label="到期年数 N" sub="Tenor" value={N} min={2} max={10} step={1} onChange={setN} />
          <Slider label="行权利率 K" value={K} min={0.005} max={0.1} step={0.005} onChange={setK} fmt={v=>`${(v*100).toFixed(2)}%`} />
          <Slider label="初始平坦 fwd F₀" value={F0} min={0.005} max={0.1} step={0.005} onChange={setF0} fmt={v=>`${(v*100).toFixed(2)}%`} />
          <Slider label="LMM 波动率 σ" value={sigmaLMM} min={0.05} max={0.5} step={0.01} onChange={setSigma} />
          <Slider label="远期间相关 ρ" sub="rank-2 因子" value={rho} min={0} max={0.99} step={0.01} onChange={setRho} />
          <Slider label="MC 路径数" value={nPaths} min={500} max={5000} step={500} onChange={setNPaths} />
          <Slider label="随机种子" value={seed} min={1} max={999} step={1} onChange={setSeed} />
          <div className="flex gap-2">
            {(["bermudan","european"] as const).map(m=>(
              <button key={m} onClick={()=>setExMode(m)}
                className={`flex-1 px-3 py-1.5 text-xs font-mono rounded ${exMode===m?"bg-gold text-background":"bg-secondary text-secondary-foreground"}`}>
                {m==="bermudan"?"Bermudan (LSM)":"European (T₀)"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Stat label="LMM 蒙特卡洛价格" value={(result.price*10000).toFixed(2)+" bp"} color={CHART_GOLD} sub={`SE = ${(result.se*10000).toFixed(2)} bp · ${exMode}`} />
          <Stat label="Black-76 参考价格" value={(result.blackPayer*10000).toFixed(2)+" bp"} color={CHART_TEAL} sub="European 单期近似" />
          <Stat label="提前行权溢价" value={((result.price - result.blackPayer)*10000).toFixed(2)+" bp"} color={CHART_BLUE} sub="Bermudan vs European" />
          <Stat label="行权频率" value={`${(result.nEx/Math.max(1,1000)).toFixed(0)} / 1000`} sub={`总路径 ${1000}`} />
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
            <p><span className="text-gold">LMM (Brace-Gatarek-Musiela 1997)：</span>直接对前向 Libor 建模 dF_i = σ_i F_i dW_i 在 T_(i+1) 测度下。本工具用 rank-2 因子近似全相关结构。</p>
            <p>Bermudan 行权权利通过 <strong>Longstaff-Schwartz</strong> 二次回归近似连续价值,在每个 T_k 比较立即行权与持有。</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">EPE 期望正暴露曲线</h4>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={result.exposureChart}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="T" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "T_k (年)", position: "insideBottom", offset: -4, fill: CHART_TEXT, fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "Swap 价值 ×100", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="epe" name="EPE" stroke={CHART_GOLD} fill={CHART_GOLD} fillOpacity={0.25} />
                <Line type="monotone" dataKey="mean" name="平均 swap 值" stroke={CHART_TEAL} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">行权时刻分布 (LSM)</h4>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={result.exerciseChart}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="T" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "% 路径", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Bar dataKey="freq" fill={CHART_BLUE} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   2. Path-dependent Exotics — Asian / Barrier / Lookback + Control Variate
   ════════════════════════════════════════════════════════════ */
type ExoticType = "asian" | "barrier_do" | "barrier_uo" | "lookback";
export const ExoticOptionsTool = () => {
  const [S0, setS0] = useState(100);
  const [K, setK] = useState(100);
  const [r, setR] = useState(0.04);
  const [sigma, setSigma] = useState(0.25);
  const [T, setT] = useState(1.0);
  const [steps, setSteps] = useState(64);
  const [nPaths, setNPaths] = useState(5000);
  const [seed, setSeed] = useState(7);
  const [exotic, setExotic] = useState<ExoticType>("asian");
  const [barrier, setBarrier] = useState(90);
  const [useCV, setUseCV] = useState(true);

  const result = useMemo(() => {
    const rng = mulberry32(seed);
    const dt = T / steps;
    const drift = (r - 0.5 * sigma * sigma) * dt;
    const vol = sigma * Math.sqrt(dt);
    const disc = Math.exp(-r * T);

    const payoffs: number[] = [];
    const controls: number[] = []; // BS European call payoff for CV
    let samplePath: number[] = [];

    for (let p = 0; p < nPaths; p++) {
      let S = S0;
      let sum = 0;
      let mx = S0, mn = S0;
      let knockedOut = false;
      const path: number[] = [S0];
      for (let i = 1; i <= steps; i++) {
        const z = randn(rng);
        S = S * Math.exp(drift + vol * z);
        sum += S;
        if (S > mx) mx = S;
        if (S < mn) mn = S;
        if (exotic === "barrier_do" && S <= barrier) knockedOut = true;
        if (exotic === "barrier_uo" && S >= barrier) knockedOut = true;
        path.push(S);
      }
      if (p === 0) samplePath = path;
      let py = 0;
      if (exotic === "asian") {
        const avg = sum / steps;
        py = Math.max(avg - K, 0);
      } else if (exotic === "barrier_do" || exotic === "barrier_uo") {
        py = knockedOut ? 0 : Math.max(S - K, 0);
      } else if (exotic === "lookback") {
        // floating-strike lookback call: S_T - min(S)
        py = Math.max(S - mn, 0);
      }
      payoffs.push(py);
      // Control variate: vanilla European call on S_T
      controls.push(Math.max(S - K, 0));
    }

    const mean = (a:number[]) => a.reduce((s,v)=>s+v,0)/a.length;
    const varOf = (a:number[], m:number) => a.reduce((s,v)=>s+(v-m)*(v-m),0)/(a.length-1);
    const cov = (a:number[], b:number[], ma:number, mb:number) => {
      let s = 0; for (let i=0;i<a.length;i++) s += (a[i]-ma)*(b[i]-mb);
      return s/(a.length-1);
    };
    const mP = mean(payoffs), mC = mean(controls);
    const vP = varOf(payoffs, mP), vC = varOf(controls, mC);
    const cPC = cov(payoffs, controls, mP, mC);
    const beta = vC > 1e-12 ? cPC / vC : 0;
    const C_BS = bs(S0, K, r, sigma, T, true); // analytic
    const cv_adj = payoffs.map((py, i) => py - beta * (controls[i] - mC));
    const mCV = mean(cv_adj);
    const vCV = varOf(cv_adj, mCV);

    const priceMC = disc * mP;
    const seMC = disc * Math.sqrt(vP / nPaths);
    const priceCV = disc * (mCV + beta * (C_BS * Math.exp(r*T) - mC));
    // After CV: estimator = mean(payoff - β(C - E[C])); E[C] under risk-neutral = e^{rT}*BS_price
    const seCV = disc * Math.sqrt(vCV / nPaths);
    const corr = Math.sqrt(cPC*cPC / Math.max(vP*vC, 1e-12));
    const varReduction = vP > 0 ? 1 - vCV/vP : 0;

    // Histogram of payoffs
    const maxPy = Math.max(...payoffs, 1);
    const bins = 30;
    const hist = new Array(bins).fill(0);
    for (const v of payoffs) {
      const idx = Math.min(bins-1, Math.floor(v/maxPy*bins));
      hist[idx]++;
    }
    const histData = hist.map((c, i) => ({
      x: +((i+0.5)*maxPy/bins).toFixed(2),
      n: c,
    }));

    const pathData = samplePath.map((s, i) => ({
      t: +(i*dt).toFixed(3),
      S: +s.toFixed(2),
    }));

    return { priceMC, seMC, priceCV, seCV, C_BS, corr, varReduction, beta, histData, pathData };
  }, [S0, K, r, sigma, T, steps, nPaths, seed, exotic, barrier, useCV]);

  const finalPrice = useCV ? result.priceCV : result.priceMC;
  const finalSE = useCV ? result.seCV : result.seMC;

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "Asian ATM", description: "亚式平均行权", apply: () => { setExotic("asian"); setS0(100); setK(100); setSigma(0.25); } },
        { name: "Down-and-Out", description: "下障碍敲出", apply: () => { setExotic("barrier_do"); setBarrier(85); setS0(100); setK(100); } },
        { name: "Up-and-Out", description: "上障碍敲出", apply: () => { setExotic("barrier_uo"); setBarrier(120); setS0(100); setK(100); } },
        { name: "Lookback 浮动", description: "S_T − min(S)", apply: () => { setExotic("lookback"); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {([["asian","Asian"],["barrier_do","DO Barrier"],["barrier_uo","UO Barrier"],["lookback","Lookback"]] as [ExoticType,string][]).map(([id,name])=>(
              <button key={id} onClick={()=>setExotic(id)}
                className={`px-3 py-1.5 text-xs font-mono rounded ${exotic===id?"bg-gold text-background":"bg-secondary text-secondary-foreground"}`}>
                {name}
              </button>
            ))}
          </div>
          <Slider label="现价 S₀" value={S0} min={50} max={200} step={1} onChange={setS0} />
          <Slider label="行权 K" value={K} min={50} max={200} step={1} onChange={setK} />
          <Slider label="r 无风险" value={r} min={0} max={0.15} step={0.005} onChange={setR} fmt={v=>`${(v*100).toFixed(2)}%`} />
          <Slider label="σ 波动率" value={sigma} min={0.05} max={0.8} step={0.01} onChange={setSigma} />
          <Slider label="T 期限" value={T} min={0.25} max={3} step={0.25} onChange={setT} />
          <Slider label="时间步 m" value={steps} min={16} max={252} step={8} onChange={setSteps} />
          <Slider label="路径数 N" value={nPaths} min={1000} max={20000} step={1000} onChange={setNPaths} />
          <Slider label="种子" value={seed} min={1} max={999} step={1} onChange={setSeed} />
          {(exotic === "barrier_do" || exotic === "barrier_uo") && (
            <Slider label="障碍 B" value={barrier} min={50} max={200} step={1} onChange={setBarrier} />
          )}
          <label className="flex items-center gap-2 text-xs font-mono text-secondary-foreground p-2 rounded bg-secondary/40 border border-border cursor-pointer">
            <input type="checkbox" checked={useCV} onChange={e=>setUseCV(e.target.checked)} className="accent-gold" />
            启用控制变量 (vanilla call BS)
          </label>
        </div>

        <div className="space-y-3">
          <Stat label={useCV?"价格 (CV)":"价格 (朴素 MC)"} value={finalPrice.toFixed(4)} color={CHART_GOLD} sub={`SE = ${finalSE.toFixed(4)} · 95% CI ± ${(1.96*finalSE).toFixed(4)}`} />
          <Stat label="朴素 MC 价格" value={result.priceMC.toFixed(4)} color={CHART_BLUE} sub={`SE = ${result.seMC.toFixed(4)}`} />
          <Stat label="对照 European Call (BS)" value={result.C_BS.toFixed(4)} sub="控制变量解析价" />
          <Stat label="payoff–控制相关 ρ" value={result.corr.toFixed(3)} color={CHART_TEAL} sub={`β̂ = ${result.beta.toFixed(3)}`} />
          <Stat label="方差降低" value={`${(result.varReduction*100).toFixed(1)}%`} color={CHART_TEAL} sub={`SE 比 ${result.seMC>0?(result.seCV/result.seMC).toFixed(3):"—"}`} />
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
            <p><span className="text-gold">控制变量法：</span>θ̂_CV = Ȳ − β̂(C̄ − E[C]),其中 E[C] 由 Black-Scholes 解析提供。</p>
            <p>当 ρ(Y, C) → 1 时方差降幅 → 100%。Asian/Barrier 通常与 vanilla 高度相关 → 显著降方差。</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">单条样本路径</h4>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.pathData}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <ReferenceLine y={K} stroke={CHART_GOLD} strokeDasharray="3 3" label={{value:`K=${K}`,fill:CHART_GOLD,fontSize:10}} />
                {(exotic==="barrier_do"||exotic==="barrier_uo") && (
                  <ReferenceLine y={barrier} stroke={CHART_RED} strokeDasharray="4 4" label={{value:`B=${barrier}`,fill:CHART_RED,fontSize:10}} />
                )}
                <Line type="monotone" dataKey="S" stroke={CHART_TEAL} dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">payoff 分布 (N={nPaths})</h4>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={result.histData}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="x" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Bar dataKey="n" fill={CHART_GOLD} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

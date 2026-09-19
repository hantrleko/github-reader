import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, ComposedChart, Area, BarChart, Bar, ScatterChart, Scatter, Cell,
} from "recharts";
import "katex/dist/katex.min.css";
import PresetButtons from "../PresetButtons";
import { useTranslation } from "react-i18next";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED  = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

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
function normInv(p: number): number {
  // Beasley-Springer-Moro
  const a=[-3.969683028665376e1,2.209460984245205e2,-2.759285104469687e2,1.383577518672690e2,-3.066479806614716e1,2.506628277459239];
  const b=[-5.447609879822406e1,1.615858368580409e2,-1.556989798598866e2,6.680131188771972e1,-1.328068155288572e1];
  const c=[-7.784894002430293e-3,-3.223964580411365e-1,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783];
  const d=[7.784695709041462e-3,3.224671290700398e-1,2.445134137142996,3.754408661907416];
  const pl=0.02425, ph=1-pl;
  let q:number,r:number;
  if(p<pl){q=Math.sqrt(-2*Math.log(p));return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
  else if(p<=ph){q=p-0.5;r=q*q;return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);}
  else{q=Math.sqrt(-2*Math.log(1-p));return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
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
   1. CVA / DVA / Bilateral XVA — Swap exposure simulation
   ════════════════════════════════════════════════════════════ */
export const CVAXVATool = () => {
  const { t } = useTranslation();
  const [notional, setNotional] = useState(100); // 100M
  const [tenor, setTenor] = useState(5);         // years
  const [r0, setR0] = useState(0.04);
  const [sigmaR, setSigmaR] = useState(0.012);   // bp √y vol
  const [Kfix, setKfix] = useState(0.04);
  const [hazardC, setHazardC] = useState(0.02);  // counterparty
  const [hazardB, setHazardB] = useState(0.005); // bank own
  const [LGD, setLGD] = useState(0.6);
  const [rho_WW, setRhoWW] = useState(0.4);      // wrong-way: corr(rate, hazard intensity)
  const [nPaths, setNPaths] = useState(2000);
  const [seed, setSeed] = useState(11);

  const result = useMemo(() => {
    const rng = mulberry32(seed);
    const steps = tenor * 4;          // quarterly
    const dt = tenor / steps;
    // Vasicek-like Gaussian short rate (no mean-reversion for clarity): r_{t+dt} = r_t + σ √dt z
    // Stochastic hazard λ_t for counterparty correlated with rate via rho_WW (wrong-way risk).
    // Path-wise exposure of payer-IRS to bank (receive fix - pay float).
    const exposureSum = new Array(steps + 1).fill(0); // E[E^+]
    const expCondDefault = new Array(steps + 1).fill(0);
    const cntDefault = new Array(steps + 1).fill(0);

    // Survival probabilities (independent baseline): SC = exp(-λ_C·t), SB = exp(-λ_B·t)
    // For bilateral CVA, we need joint default ordering. Use independent here, then add WWR via stochastic λ.

    let totalCVA = 0;
    let totalDVA = 0;
    let totalCVA_naive = 0; // independent (no WWR)

    for (let p = 0; p < nPaths; p++) {
      let r = r0;
      let hC = hazardC;
      const rPath: number[] = [r];
      const valPath: number[] = [];
      const survC: number[] = [1];
      const survB: number[] = [1];
      const dq: number[] = [0]; // marginal default prob counterparty per step
      const dqB: number[] = [0];
      let sc = 1, sb = 1;
      for (let k = 1; k <= steps; k++) {
        const z1 = randn(rng);
        const z2 = randn(rng);
        // correlated shock for hazard
        const zH = rho_WW * z1 + Math.sqrt(Math.max(1-rho_WW*rho_WW,0)) * z2;
        r = r + sigmaR * Math.sqrt(dt) * z1;
        // log-normal hazard around base
        const sigH = 0.5;
        hC = hazardC * Math.exp(sigH * Math.sqrt(dt) * zH - 0.5*sigH*sigH*dt);
        rPath.push(r);

        const pdC_step = 1 - Math.exp(-hC * dt);
        const pdB_step = 1 - Math.exp(-hazardB * dt);
        const scNew = sc * Math.exp(-hC * dt);
        const sbNew = sb * Math.exp(-hazardB * dt);
        dq.push(sc - scNew);    // marginal P(τ_C in (t_{k-1},t_k])
        dqB.push(sb - sbNew);
        sc = scNew; sb = sbNew;
        survC.push(sc); survB.push(sb);
      }
      // Compute MtM at each grid: receive-fixed swap value approx = notional * Σ_{i=k+1..steps} dt * (Kfix - F_i) * P(t_k,t_i)
      // Use simple: V_k = notional * (Kfix - r_k) * remaining_tenor (linear approx)
      for (let k = 0; k <= steps; k++) {
        const remain = (steps - k) * dt;
        const V = notional * (Kfix - rPath[k]) * remain;
        valPath.push(V);
        const Epos = Math.max(V, 0);
        const Eneg = Math.max(-V, 0);
        exposureSum[k] += Epos;
        // accumulate CVA contribution at this grid: LGD * E[E^+(t_k)] * dq_C[k] * discount
        if (k > 0) {
          const disc = Math.exp(-r0 * (k*dt));
          totalCVA += LGD * Epos * dq[k] * disc / nPaths;
          totalDVA += LGD * Eneg * dqB[k] * disc / nPaths;
          // naive: use unconditional hazard
          const pdC_uncond = (Math.exp(-hazardC*(k-1)*dt) - Math.exp(-hazardC*k*dt));
          totalCVA_naive += LGD * Epos * pdC_uncond * disc / nPaths;
        }
      }
    }

    // EPE / ENE curves
    const epeCurve = exposureSum.map((s, k) => ({
      t: +(k * dt).toFixed(2),
      epe: +(s/nPaths).toFixed(3),
    }));

    const bcva = totalCVA - totalDVA;
    const wwr_impact = totalCVA - totalCVA_naive;

    // Scenario bar: CVA, DVA, BCVA
    const xvaBar = [
      { name: "CVA", val: +totalCVA.toFixed(3), color: CHART_RED },
      { name: "DVA", val: +totalDVA.toFixed(3), color: CHART_TEAL },
      { name: "BCVA (CVA−DVA)", val: +bcva.toFixed(3), color: CHART_GOLD },
      { name: t("labs.risk.v26.cva.chart.wwrDelta"), val: +wwr_impact.toFixed(3), color: CHART_BLUE },
    ];

    return { totalCVA, totalDVA, bcva, totalCVA_naive, wwr_impact, epeCurve, xvaBar };
  }, [notional, tenor, r0, sigmaR, Kfix, hazardC, hazardB, LGD, rho_WW, nPaths, seed]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.risk.v26.cva.presets.noWwr.name"), description: t("labs.risk.v26.cva.presets.noWwr.description"), apply: () => { setRhoWW(0); setHazardC(0.02); } },
        { name: t("labs.risk.v26.cva.presets.strongWrongWay.name"), description: t("labs.risk.v26.cva.presets.strongWrongWay.description"), apply: () => { setRhoWW(0.7); setHazardC(0.025); } },
        { name: t("labs.risk.v26.cva.presets.rightWay.name"), description: t("labs.risk.v26.cva.presets.rightWay.description"), apply: () => { setRhoWW(-0.6); } },
        { name: t("labs.risk.v26.cva.presets.igCounterparty.name"), description: t("labs.risk.v26.cva.presets.igCounterparty.description"), apply: () => { setHazardC(0.005); setLGD(0.4); setRhoWW(0.2); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label={t("labs.risk.v26.cva.sliders.notional")} value={notional} min={10} max={500} step={10} onChange={setNotional} />
          <Slider label={t("labs.risk.v26.cva.sliders.tenor")} value={tenor} min={1} max={10} step={1} onChange={setTenor} />
          <Slider label={t("labs.risk.v26.cva.sliders.r0")} value={r0} min={0} max={0.1} step={0.005} onChange={setR0} fmt={v=>`${(v*100).toFixed(2)}%`} />
          <Slider label={t("labs.risk.v26.cva.sliders.sigmaR")} value={sigmaR} min={0.002} max={0.04} step={0.001} onChange={setSigmaR} />
          <Slider label={t("labs.risk.v26.cva.sliders.kfix")} value={Kfix} min={0} max={0.1} step={0.005} onChange={setKfix} fmt={v=>`${(v*100).toFixed(2)}%`} />
          <Slider label={t("labs.risk.v26.cva.sliders.hazardC")} sub={t("labs.risk.v26.cva.sliders.hazardCSub")} value={hazardC} min={0.001} max={0.1} step={0.001} onChange={setHazardC} />
          <Slider label={t("labs.risk.v26.cva.sliders.hazardB")} sub={t("labs.risk.v26.cva.sliders.hazardBSub")} value={hazardB} min={0} max={0.05} step={0.001} onChange={setHazardB} />
          <Slider label={t("labs.risk.v26.cva.sliders.lgd")} value={LGD} min={0.1} max={1.0} step={0.05} onChange={setLGD} />
          <Slider label={t("labs.risk.v26.cva.sliders.rhoWw")} sub={t("labs.risk.v26.cva.sliders.rhoWwSub")} value={rho_WW} min={-0.9} max={0.9} step={0.05} onChange={setRhoWW} />
          <Slider label={t("labs.risk.v26.cva.sliders.nPaths")} value={nPaths} min={500} max={5000} step={500} onChange={setNPaths} />
          <Slider label={t("labs.risk.v26.cva.sliders.seed")} value={seed} min={1} max={999} step={1} onChange={setSeed} />
        </div>

        <div className="space-y-3">
          <Stat label="CVA" value={result.totalCVA.toFixed(3)+" M"} color={CHART_RED} sub={t("labs.risk.v26.cva.stats.cvaSub")} />
          <Stat label="DVA" value={result.totalDVA.toFixed(3)+" M"} color={CHART_TEAL} sub={t("labs.risk.v26.cva.stats.dvaSub")} />
          <Stat label={t("labs.risk.v26.cva.stats.bcvaLabel")} value={result.bcva.toFixed(3)+" M"} color={CHART_GOLD} sub={t("labs.risk.v26.cva.stats.bcvaSub")} />
          <Stat label={t("labs.risk.v26.cva.stats.naiveLabel")} value={result.totalCVA_naive.toFixed(3)+" M"} sub={t("labs.risk.v26.cva.stats.naiveSub")} />
          <Stat label={t("labs.risk.v26.cva.stats.wwrDeltaLabel")} value={`${result.wwr_impact>=0?"+":""}${result.wwr_impact.toFixed(3)} M`} color={result.wwr_impact>=0?CHART_RED:CHART_TEAL} sub={t("labs.risk.v26.cva.stats.wwrDeltaSub")} />
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
            <p><span className="text-gold">{t("labs.risk.v26.cva.explain.cvaTitle")}</span>{t("labs.risk.v26.cva.explain.cvaFormula")}</p>
            <p>{t("labs.risk.v26.cva.explain.wwr")}</p>
            <p>{t("labs.risk.v26.cva.explain.bcva")}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.risk.v26.cva.chart.epeTitle")}</h4>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={result.epeCurve}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Area type="monotone" dataKey="epe" name="EPE (M)" stroke={CHART_GOLD} fill={CHART_GOLD} fillOpacity={0.25} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.risk.v26.cva.chart.xvaTitle")}</h4>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={result.xvaBar}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <ReferenceLine y={0} stroke={CHART_TEXT} />
                <Bar dataKey="val">
                  {result.xvaBar.map((d,i)=>(<Cell key={i} fill={d.color} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   2. Credit Portfolio Copula — Vasicek / Li (Gaussian vs t)
   ════════════════════════════════════════════════════════════ */
export const CreditCopulaTool = () => {
  const { t } = useTranslation();
  const [n, setN] = useState(100);       // n obligors
  const [pd, setPd] = useState(0.03);    // marginal PD
  const [rho, setRho] = useState(0.2);   // asset correlation
  const [LGD, setLGD] = useState(0.6);
  const [EAD, setEAD] = useState(1.0);   // each
  const [df, setDf] = useState(8);       // t df
  const [family, setFamily] = useState<"gaussian"|"t">("gaussian");
  const [nSim, setNSim] = useState(5000);
  const [seed, setSeed] = useState(42);
  const [alpha, setAlpha] = useState(0.99);

  const result = useMemo(() => {
    const rng = mulberry32(seed);
    const a = Math.sqrt(rho);
    const b = Math.sqrt(Math.max(1-rho,0));
    // Threshold: default if latent ≤ Φ^{-1}(pd) (Gaussian) or t_df^{-1}(pd) (t copula)
    const cG = normInv(pd);
    // Simulate
    const losses: number[] = [];
    const defaultCounts: number[] = [];
    const chi2 = (k:number) => { let s=0; for(let i=0;i<k;i++){const z=randn(rng);s+=z*z;} return s; };
    for (let s = 0; s < nSim; s++) {
      const M = randn(rng); // common factor
      let scale = 1;
      if (family === "t") {
        const W = chi2(df) / df;
        scale = 1/Math.sqrt(W);
      }
      let nDef = 0;
      for (let i = 0; i < n; i++) {
        const eps = randn(rng);
        const X = (a * M + b * eps) * scale;
        // In t copula, threshold from t-CDF; approximate t-CDF via scaled normal: P(T<x) ≈ Φ(x/√(df/(df-2)))
        let thr = cG;
        if (family === "t") {
          // adjust threshold so marginal default prob equals pd
          const adj = df>2 ? Math.sqrt(df/(df-2)) : 1;
          thr = normInv(pd) * adj;
        }
        if (X <= thr) nDef++;
      }
      defaultCounts.push(nDef);
      losses.push(nDef * LGD * EAD);
    }
    const sorted = [...losses].sort((p,q)=>p-q);
    const idx = Math.min(Math.floor(alpha*nSim), nSim-1);
    const VaR = sorted[idx];
    const tail = sorted.slice(idx);
    const ES = tail.reduce((a,b)=>a+b,0)/Math.max(tail.length,1);
    const mean = losses.reduce((a,b)=>a+b,0)/nSim;
    const varL = losses.reduce((s,v)=>s+(v-mean)*(v-mean),0)/(nSim-1);
    const stdev = Math.sqrt(varL);

    // Vasicek analytical large-portfolio formula: P(L/n > x) = Φ((√(1−ρ) Φ^{-1}(x) − Φ^{-1}(pd))/√ρ)
    // → quantile of loss rate at α: x_α = Φ((Φ^{-1}(pd) + √ρ Φ^{-1}(α))/√(1−ρ))
    const x_alpha = normCdf((normInv(pd) + Math.sqrt(rho)*normInv(alpha))/Math.sqrt(1-rho));
    const VaR_vasicek = x_alpha * n * LGD * EAD;

    // Histogram of loss
    const maxL = sorted[nSim-1];
    const bins = 40;
    const hist = new Array(bins).fill(0);
    for (const v of losses) {
      const j = Math.min(bins-1, Math.floor(v/Math.max(maxL,1e-9)*bins));
      hist[j]++;
    }
    const histData = hist.map((c,i)=>({
      x: +((i+0.5)*maxL/bins).toFixed(2),
      n: c,
      tail: i*maxL/bins >= VaR ? c : 0,
    }));

    // Default correlation surface: ρ_D = (P(D_i & D_j) − pd²) / (pd(1−pd))
    // For Gaussian copula: P(D_i & D_j) = Φ_2(c, c; ρ). Approximate via Owen/Joe — sample.
    const surfData: any[] = [];
    const rhoVals = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.7];
    const pdVals = [0.005, 0.01, 0.02, 0.05, 0.10];
    // empirical bivariate via Monte Carlo (fast small)
    for (const pdv of pdVals) {
      const row: any = { pd: +(pdv*100).toFixed(1) };
      const c0 = normInv(pdv);
      for (const rv of rhoVals) {
        const av = Math.sqrt(rv), bv = Math.sqrt(1-rv);
        let nBoth = 0; const NN = 4000;
        const rng2 = mulberry32(seed + Math.floor(rv*100));
        for (let k = 0; k < NN; k++) {
          const Mc = randn(rng2);
          const e1 = randn(rng2), e2 = randn(rng2);
          const X1 = av*Mc + bv*e1;
          const X2 = av*Mc + bv*e2;
          if (X1 <= c0 && X2 <= c0) nBoth++;
        }
        const Pboth = nBoth / NN;
        const rhoD = (Pboth - pdv*pdv) / (pdv*(1-pdv));
        row["r"+Math.round(rv*100)] = +rhoD.toFixed(4);
      }
      surfData.push(row);
    }

    return { mean, stdev, VaR, ES, VaR_vasicek, histData, surfData, rhoVals };
  }, [n, pd, rho, LGD, EAD, df, family, nSim, seed, alpha]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "投资级组合", description: "PD 1%, ρ=0.15", apply: () => { setPd(0.01); setRho(0.15); setLGD(0.45); setFamily("gaussian"); } },
        { name: "高收益组合", description: "PD 5%, ρ=0.3", apply: () => { setPd(0.05); setRho(0.30); setLGD(0.65); } },
        { name: "尾部相依 (t-Copula)", description: "df=4, ρ=0.25", apply: () => { setFamily("t"); setDf(4); setRho(0.25); setPd(0.03); } },
        { name: "Basel IRB 参数", description: "ρ=0.24 (公司)", apply: () => { setRho(0.24); setPd(0.02); setLGD(0.45); setFamily("gaussian"); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["gaussian","t"] as const).map(f=>(
              <button key={f} onClick={()=>setFamily(f)}
                className={`flex-1 px-3 py-1.5 text-xs font-mono rounded ${family===f?"bg-gold text-background":"bg-secondary text-secondary-foreground"}`}>
                {f==="gaussian"?"Gaussian (Vasicek/Li)":"Student-t"}
              </button>
            ))}
          </div>
          <Slider label="组合规模 n" value={n} min={20} max={500} step={10} onChange={setN} />
          <Slider label="边际 PD" value={pd} min={0.001} max={0.20} step={0.005} onChange={setPd} fmt={v=>`${(v*100).toFixed(2)}%`} />
          <Slider label="资产相关 ρ" value={rho} min={0.01} max={0.7} step={0.01} onChange={setRho} />
          <Slider label="LGD" value={LGD} min={0.1} max={1} step={0.05} onChange={setLGD} />
          <Slider label="单户 EAD" value={EAD} min={0.1} max={5} step={0.1} onChange={setEAD} />
          {family==="t" && <Slider label="自由度 df" value={df} min={3} max={30} step={1} onChange={setDf} />}
          <Slider label="模拟次数" value={nSim} min={1000} max={20000} step={1000} onChange={setNSim} />
          <Slider label="VaR/ES 置信度 α" value={alpha} min={0.90} max={0.999} step={0.005} onChange={setAlpha} fmt={v=>v.toFixed(3)} />
          <Slider label="种子" value={seed} min={1} max={999} step={1} onChange={setSeed} />
        </div>
        <div className="space-y-3">
          <Stat label="期望损失 EL" value={result.mean.toFixed(2)} color={CHART_GOLD} sub={`= n·PD·LGD·EAD ≈ ${(n*pd*LGD*EAD).toFixed(2)}`} />
          <Stat label="损失标准差" value={result.stdev.toFixed(2)} sub="尾相依放大效应" />
          <Stat label={`VaR_${alpha.toFixed(3)} (MC)`} value={result.VaR.toFixed(2)} color={CHART_RED} />
          <Stat label={`ES_${alpha.toFixed(3)}`} value={result.ES.toFixed(2)} color={CHART_RED} sub="条件尾损失均值" />
          <Stat label="Vasicek 解析 VaR" value={result.VaR_vasicek.toFixed(2)} color={CHART_TEAL} sub="大组合极限公式" />
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
            <p><span className="text-gold">Vasicek 1987 / Li 2000：</span>X_i = √ρ·M + √(1−ρ)·ε_i,违约当 X_i ≤ Φ⁻¹(PD)。</p>
            <p>t-Copula 引入共同尺度因子 W ~ χ²_df/df,产生强尾相依 → 极端共同违约概率显著抬升,2008 危机超额损失的核心来源。</p>
            <p>Basel II IRB 公式即由 Vasicek 大组合极限推导:K = LGD·[Φ((Φ⁻¹(PD)+√ρ·Φ⁻¹(0.999))/√(1−ρ)) − PD]。</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">组合损失分布</h4>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={result.histData}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="x" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Bar dataKey="n" fill={CHART_GOLD} />
                <Bar dataKey="tail" fill={CHART_RED} name={`尾部 > VaR_${alpha.toFixed(2)}`} />
                <ReferenceLine x={+result.VaR.toFixed(2)} stroke={CHART_RED} strokeDasharray="3 3" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">违约相关性 ρ_D vs 资产 ρ (按 PD)</h4>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.surfData}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="pd" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{value:"PD %",position:"insideBottom",offset:-2,fill:CHART_TEXT,fontSize:10}} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 12%)", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {result.rhoVals.map((rv,i)=>(
                  <Line key={rv} type="monotone" dataKey={"r"+Math.round(rv*100)} name={`ρ=${rv}`}
                    stroke={`hsl(${30+i*30}, 70%, 55%)`} strokeWidth={1.5} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

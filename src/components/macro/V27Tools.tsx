import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, BarChart, Bar, ComposedChart, Area, Cell,
} from "recharts";
import PresetButtons from "../PresetButtons";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_PURPLE = "hsl(280, 55%, 60%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

const sliderClass =
  "w-full h-1.5 rounded-full appearance-none cursor-pointer bg-secondary accent-gold [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold";

const Slider = ({ label, sub, value, min, max, step, onChange }: {
  label: string; sub?: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) => (
  <div>
    <div className="flex justify-between items-baseline mb-2">
      <label className="text-xs text-secondary-foreground font-medium">
        {label}{sub && <span className="text-muted-foreground ml-1.5 text-[10px]">{sub}</span>}
      </label>
      <span className="text-xs font-mono text-gold tabular-nums">
        {value.toFixed(step >= 1 ? 0 : step >= 0.1 ? 2 : 3)}
      </span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(+e.target.value)} className={sliderClass} />
  </div>
);

const Stat = ({ label, value, color = CHART_GOLD, sub }: {
  label: string; value: string; color?: string; sub?: string;
}) => (
  <div className="rounded-lg bg-secondary/40 border border-border p-3">
    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-lg font-mono tabular-nums" style={{ color }}>{value}</p>
    {sub && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

/* ════════════════════════════════════════════════════════════
   1. 3-equation New Keynesian DSGE — Impulse Response Functions
   ════════════════════════════════════════════════════════════ */
/**
 * Clarida-Gali-Gertler (1999) canonical 3-equation NK model:
 *   IS    : x_t = E_t x_{t+1} − (1/σ)(i_t − E_t π_{t+1}) + ε_d
 *   NKPC  : π_t = β E_t π_{t+1} + κ x_t + ε_s
 *   Taylor: i_t = φ_π π_t + φ_x x_t + ε_m
 *
 * Under AR(1) shocks ε_t = ρ ε_{t-1} + u_t, the MSV rational-expectations
 * solution takes form (x_t, π_t, i_t) = Ψ · ε_t. For each shock type we
 * solve the resulting 3×3 linear system in closed form, then trace IRFs by
 * applying ε_t = ρ^t to a unit innovation u_0 = 1.
 */
function solveNK(shock: "demand" | "supply" | "monetary",
  sigma: number, beta: number, kappa: number, phiPi: number, phiX: number, rho: number) {
  // System: variables (x, π, i). Equations after substituting E_t z_{t+1} = ρ z_t:
  //   IS:    x(1-ρ) + (1/σ)(i - ρ π) = ε_d
  //   NKPC:  π(1 - β ρ) − κ x = ε_s
  //   Taylor: i − φ_π π − φ_x x = ε_m
  // Solve A·[x,π,i]ᵀ = b for unit shock in chosen eq.
  const A = [
    [1 - rho, -rho / sigma, 1 / sigma],
    [-kappa, 1 - beta * rho, 0],
    [-phiX, -phiPi, 1],
  ];
  const b = shock === "demand" ? [1, 0, 0] : shock === "supply" ? [0, 1, 0] : [0, 0, 1];
  // Cramer's rule (3x3)
  const det = (M: number[][]) =>
    M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[2][1]) -
    M[0][1]*(M[1][0]*M[2][2]-M[1][2]*M[2][0]) +
    M[0][2]*(M[1][0]*M[2][1]-M[1][1]*M[2][0]);
  const D = det(A);
  const colSub = (k: number) => A.map((row, i) => row.map((v, j) => j === k ? b[i] : v));
  return {
    psiX: det(colSub(0)) / D,
    psiPi: det(colSub(1)) / D,
    psiI: det(colSub(2)) / D,
    det: D,
  };
}

export const DSGENKTool = () => {
  const { t } = useTranslation();
  const [shock, setShock] = useState<"demand" | "supply" | "monetary">("monetary");
  const [sigma, setSigma] = useState(1.0);
  const [beta, setBeta] = useState(0.99);
  const [kappa, setKappa] = useState(0.13);
  const [phiPi, setPhiPi] = useState(1.5);
  const [phiX, setPhiX] = useState(0.5);
  const [rho, setRho] = useState(0.8);
  const [horizon, setHorizon] = useState(20);

  const sol = useMemo(() => solveNK(shock, sigma, beta, kappa, phiPi, phiX, rho),
    [shock, sigma, beta, kappa, phiPi, phiX, rho]);

  const irf = useMemo(() => {
    const arr: any[] = [];
    for (let t = 0; t <= horizon; t++) {
      const eps = Math.pow(rho, t);
      arr.push({
        t,
        x: +(sol.psiX * eps * 100).toFixed(4),    // % output gap
        pi: +(sol.psiPi * eps * 100).toFixed(4),  // % inflation
        i: +(sol.psiI * eps * 100).toFixed(4),    // % interest rate
        eps: +(eps * 100).toFixed(4),
      });
    }
    return arr;
  }, [sol, rho, horizon]);

  // Taylor principle check
  const taylorOK = phiPi > 1;

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.macroV27.standardCalibration"), description: t("labs.macroV27.galiTextbook"), apply: () => { setSigma(1); setBeta(0.99); setKappa(0.13); setPhiPi(1.5); setPhiX(0.5); setRho(0.8); } },
        { name: t("labs.macroV27.dovishCB"), description: t("labs.macroV27.dovishCBDesc"), apply: () => { setPhiPi(1.1); setPhiX(0.0); setRho(0.8); } },
        { name: t("labs.macroV27.hawkishCB"), description: t("labs.macroV27.hawkishCBDesc"), apply: () => { setPhiPi(2.5); setPhiX(0.125); setRho(0.5); } },
        { name: t("labs.macroV27.rigidPrice"), description: t("labs.macroV27.rigidPriceDesc"), apply: () => { setKappa(0.03); setBeta(0.99); } },
        { name: t("labs.macroV27.persistentShock"), description: t("labs.macroV27.persistentShockDesc"), apply: () => { setRho(0.95); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.macroV27.shockType")}</p>
          <div className="flex gap-2">
            {(["demand","supply","monetary"] as const).map(s => (
              <button key={s} onClick={() => setShock(s)}
                className={`flex-1 px-3 py-1.5 rounded-md text-[11px] font-mono transition-all ${
                  shock === s ? "bg-gold text-background" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}>
                {s === "demand" ? t("labs.macroV27.demandShock") : s === "supply" ? t("labs.macroV27.supplyShock") : t("labs.macroV27.monetaryShock")}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Slider label={t("labs.macroV27.sigmaLabel")} value={sigma} min={0.5} max={3} step={0.1} onChange={setSigma} />
            <Slider label={t("labs.macroV27.betaLabel")} value={beta} min={0.95} max={0.999} step={0.001} onChange={setBeta} />
            <Slider label={t("labs.macroV27.kappaLabel")} sub={t("labs.macroV27.priceRigidity")} value={kappa} min={0.01} max={0.5} step={0.01} onChange={setKappa} />
            <Slider label={t("labs.macroV27.phiPiLabel")} value={phiPi} min={0.5} max={3} step={0.05} onChange={setPhiPi} />
            <Slider label={t("labs.macroV27.phiXLabel")} value={phiX} min={0} max={1.5} step={0.05} onChange={setPhiX} />
            <Slider label={t("labs.macroV27.rhoLabel")} value={rho} min={0} max={0.99} step={0.01} onChange={setRho} />
          </div>
          <Slider label={t("labs.macroV27.horizonLabel")} value={horizon} min={8} max={40} step={1} onChange={setHorizon} />
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.macroV27.psiXLabel")} value={sol.psiX.toFixed(3)} sub={t("labs.macroV27.psiXSub")} />
            <Stat label={t("labs.macroV27.psiPiLabel")} value={sol.psiPi.toFixed(3)} color={CHART_RED} sub={t("labs.macroV27.psiPiSub")} />
            <Stat label={t("labs.macroV27.psiILabel")} value={sol.psiI.toFixed(3)} color={CHART_BLUE} sub={t("labs.macroV27.psiISub")} />
            <Stat label={t("labs.macroV27.taylorPrinciple")} value={taylorOK ? t("labs.macroV27.determinate") : t("labs.macroV27.indeterminate")} color={taylorOK ? CHART_TEAL : CHART_RED} sub={`φ_π = ${phiPi.toFixed(2)} ${taylorOK ? "> 1" : "≤ 1"}`} />
          </div>

          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">
            <p><span className="text-gold">{t("labs.macroV27.nkTitle")}</span> IS + NKPC + Taylor Rule</p>
            <p>{t("labs.macroV27.nkSolution")}</p>
            <p>{shock === "demand" ? t("labs.macroV27.demandDesc") :
                shock === "supply" ? t("labs.macroV27.supplyDesc") :
                t("labs.macroV27.monetaryDesc")}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.macroV27.irfTitle", { shock })}</h4>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={irf}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke={CHART_TEXT} />
              <Line type="monotone" dataKey="x" name={t("labs.macroV27.xGap")} stroke={CHART_GOLD} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="pi" name={t("labs.macroV27.piInf")} stroke={CHART_RED} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="i" name={t("labs.macroV27.iRate")} stroke={CHART_BLUE} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="eps" name={t("labs.macroV27.epsShock")} stroke={CHART_TEAL} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   2. HANK (teaching version: TANK + MPC heterogeneity)
   ════════════════════════════════════════════════════════════ */
/**
 * Two-Agent New Keynesian (Galí-López-Salido-Vallés 2007) as a pedagogical
 * stepping stone to HANK (Kaplan-Moll-Violante 2018). A fraction λ of
 * households are hand-to-mouth (HTM, MPC = 1) and a fraction 1-λ are
 * Ricardian (intertemporal optimisers). Aggregate IS curve becomes
 *
 *    x_t = E_t x_{t+1} − ((1−λ)/σ̃)(i_t − E_t π_{t+1}) + ξ
 *
 * with σ̃ = σ·(1−λ) when wages are sticky. We additionally simulate a
 * 10-decile wealth distribution (Pareto in top tail) and per-decile MPCs to
 * visualise consumption response heterogeneity to a transfer shock.
 */
export const HANKTool = () => {
  const { t } = useTranslation();
  const [lambda, setLambda] = useState(0.35);   // HTM share
  const [sigma, setSigma] = useState(1.0);
  const [beta, setBeta] = useState(0.99);
  const [kappa, setKappa] = useState(0.13);
  const [phiPi, setPhiPi] = useState(1.5);
  const [phiX, setPhiX] = useState(0.5);
  const [rho, setRho] = useState(0.8);
  const [transfer, setTransfer] = useState(1.0); // unit fiscal transfer

  // Solve RANK vs TANK NK system for monetary shock
  const solveTANK = (effLambda: number) => {
    // Effective IS slope: 1/σ * (1−λ)  — HTM share dampens intertemporal response
    const sigEff = sigma / Math.max(1 - effLambda, 0.05);
    const A = [
      [1 - rho, -rho / sigEff, 1 / sigEff],
      [-kappa, 1 - beta * rho, 0],
      [-phiX, -phiPi, 1],
    ];
    const b = [0, 0, 1]; // monetary shock
    const det = (M: number[][]) =>
      M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[2][1]) -
      M[0][1]*(M[1][0]*M[2][2]-M[1][2]*M[2][0]) +
      M[0][2]*(M[1][0]*M[2][1]-M[1][1]*M[2][0]);
    const D = det(A);
    const colSub = (k: number) => A.map((r, i) => r.map((v, j) => j === k ? b[i] : v));
    return { psiX: det(colSub(0)) / D, psiPi: det(colSub(1)) / D };
  };

  const rank = useMemo(() => solveTANK(0), [sigma, beta, kappa, phiPi, phiX, rho]);
  const tank = useMemo(() => solveTANK(lambda), [lambda, sigma, beta, kappa, phiPi, phiX, rho]);

  // IRFs comparison
  const irf = useMemo(() => {
    const out: any[] = [];
    for (let t = 0; t <= 20; t++) {
      const eps = Math.pow(rho, t);
      out.push({
        t,
        rankX: +(rank.psiX * eps * 100).toFixed(4),
        tankX: +(tank.psiX * eps * 100).toFixed(4),
        rankPi: +(rank.psiPi * eps * 100).toFixed(4),
        tankPi: +(tank.psiPi * eps * 100).toFixed(4),
      });
    }
    return out;
  }, [rank, tank, rho]);

  // Wealth distribution: Pareto top + low/zero bottom (HTM)
  // Build 10 deciles with empirical-style wealth shares & corresponding MPCs.
  const dist = useMemo(() => {
    // HTM households populate the bottom λ share with ~0 wealth, MPC ≈ 1
    // Ricardians follow Pareto with tail index α_p ≈ 1.5
    const alphaP = 1.5;
    const out: any[] = [];
    let totW = 0;
    const raw: number[] = [];
    for (let d = 1; d <= 10; d++) {
      const cdf = d / 10;
      const isHTM = cdf <= lambda;
      // Pareto inverse CDF for Ricardian quantiles, mapped from (λ, 1]
      let w: number;
      if (isHTM) {
        w = 0.02 * d / 10; // near zero
      } else {
        const u = (cdf - lambda) / (1 - lambda);
        w = Math.pow(1 / Math.max(1 - u, 0.01), 1 / alphaP);
      }
      raw.push(w);
      totW += w;
    }
    for (let d = 1; d <= 10; d++) {
      const cdf = d / 10;
      const isHTM = cdf <= lambda;
      const share = (raw[d - 1] / totW) * 100;
      // MPC: HTM = 1; Ricardian decreasing in wealth (Kaplan-Violante PHANK shape)
      const mpc = isHTM ? 0.95 : Math.max(0.5 - 0.05 * (d - Math.ceil(lambda * 10)), 0.05);
      // Consumption response to unit transfer (proportional)
      const dC = mpc * transfer;
      out.push({
        decile: `D${d}`,
        share: +share.toFixed(2),
        mpc: +mpc.toFixed(3),
        dC: +dC.toFixed(3),
        type: isHTM ? "HTM" : "Ricardian",
      });
    }
    return out;
  }, [lambda, transfer]);

  // Aggregate MPC = sum(pop_share_i × mpc_i). Equal-sized deciles → mean.
  const aggMPC = useMemo(
    () => dist.reduce((s, d) => s + d.mpc, 0) / dist.length,
    [dist]
  );
  // Aggregate consumption response = sum of dC weighted equally (1 unit transfer per capita scenario)
  const aggDC = useMemo(
    () => dist.reduce((s, d) => s + d.dC, 0) / dist.length,
    [dist]
  );

  const amplification = tank.psiX / rank.psiX;

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.macroV27.usBenchmark"), description: t("labs.macroV27.htmShare"), apply: () => { setLambda(0.35); setSigma(1); setBeta(0.99); setKappa(0.13); setPhiPi(1.5); setRho(0.8); } },
        { name: t("labs.macroV27.rankOnly"), description: t("labs.macroV27.rankOnlyDesc"), apply: () => { setLambda(0); } },
        { name: t("labs.macroV27.deepHank"), description: t("labs.macroV27.deepHankDesc"), apply: () => { setLambda(0.6); } },
        { name: t("labs.macroV27.fiscalStimulus"), description: t("labs.macroV27.fiscalStimulusDesc"), apply: () => { setTransfer(1.5); setLambda(0.4); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.macroV27.lambdaLabel")} sub="hand-to-mouth" value={lambda} min={0} max={0.7} step={0.01} onChange={setLambda} />
            <Slider label={t("labs.macroV27.sigmaLabel")} value={sigma} min={0.5} max={3} step={0.1} onChange={setSigma} />
            <Slider label={t("labs.macroV27.kappaLabel")} value={kappa} min={0.03} max={0.4} step={0.01} onChange={setKappa} />
            <Slider label="φ_π Taylor" value={phiPi} min={1.01} max={3} step={0.05} onChange={setPhiPi} />
            <Slider label={t("labs.macroV27.rhoLabel")} value={rho} min={0} max={0.95} step={0.01} onChange={setRho} />
            <Slider label={t("labs.macroV27.transferLabel")} sub={t("labs.macroV27.fiscalShockUnit")} value={transfer} min={0} max={2} step={0.1} onChange={setTransfer} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.macroV27.aggMPC")} value={aggMPC.toFixed(3)} color={CHART_GOLD} sub={t("labs.macroV27.aggMPCSub")} />
            <Stat label={t("labs.macroV27.fiscalMultiplier")} value={aggDC.toFixed(3)} color={CHART_TEAL} sub={t("labs.macroV27.aggDCSub")} />
            <Stat label={t("labs.macroV27.monetaryAmp")} value={`${amplification.toFixed(2)}×`} color={CHART_PURPLE} sub={t("labs.macroV27.ampSub")} />
            <Stat label={t("labs.macroV27.topWealthShare")} value={`${dist[9].share.toFixed(1)}%`} sub={t("labs.macroV27.topWealthSub")} />
          </div>
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">
            <p><span className="text-gold">HANK (Kaplan-Moll-Violante 2018):</span> {t("labs.macroV27.hankProse1")}</p>
            <p>{t("labs.macroV27.hankProse2")}</p>
            <p>{t("labs.macroV27.hankProse3")}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.macroV27.wealthDistTitle")}</h4>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dist}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="decile" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" stroke={CHART_GOLD} tick={{ fontSize: 10 }} label={{ value: t("labs.macroV27.wealthShareLabel"), angle: -90, position: "insideLeft", fill: CHART_GOLD, fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" stroke={CHART_RED} tick={{ fontSize: 10 }} label={{ value: t("labs.macroV27.mpcLabel"), angle: 90, position: "insideRight", fill: CHART_RED, fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="share" name={t("labs.macroV27.wealthShareLabel")} radius={[3, 3, 0, 0]}>
                  {dist.map((d, i) => (
                    <Cell key={i} fill={d.type === "HTM" ? CHART_RED : CHART_GOLD} fillOpacity={0.7} />
                  ))}
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="mpc" name={t("labs.macroV27.mpcLabel")} stroke={CHART_RED} strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground mt-2">
            {t("labs.macroV27.wealthLegend")}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.macroV27.rankVsHankIrf")}</h4>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={irf}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={0} stroke={CHART_TEXT} />
                <Line type="monotone" dataKey="rankX" name={t("labs.macroV27.rankX")} stroke={CHART_BLUE} strokeWidth={2} dot={false} strokeDasharray="4 3" />
                <Line type="monotone" dataKey="tankX" name={t("labs.macroV27.tankX")} stroke={CHART_GOLD} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground mt-2">
            {t("labs.macroV27.htmSensitivity")}
          </p>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   3. Real Options — Investment Deferral (Dixit-Pindyck binomial)
   ════════════════════════════════════════════════════════════ */
/**
 * Real Options à la Dixit-Pindyck (1994): a firm holds the perpetual (here
 * approximated by a long American/Bermudan window) right to invest cost I
 * and receive project value V_t ~ GBM(μ, σ). At each node we compare
 *   NPV_now = V − I   vs.   E[discounted continuation]
 * and exercise when NPV exceeds the value of waiting.  The critical
 * threshold V*(t) is the smallest V at which immediate investment dominates.
 */
function buildBinomialRO(opts: {
  V0: number; I: number; sigma: number; mu: number; r: number;
  T: number; steps: number;
}) {
  const { V0, I, sigma, mu, r, T, steps } = opts;
  const dt = T / steps;
  const u = Math.exp(sigma * Math.sqrt(dt));
  const d = 1 / u;
  const p = (Math.exp(mu * dt) - d) / (u - d);    // real-world prob for V
  const disc = Math.exp(-r * dt);

  // Build option value tree V_t lattice → backward induction
  // optVal[i][j] = option value at step i, j up-moves
  const optVal: number[][] = [];
  const exVal: number[][] = [];
  const Vgrid: number[][] = [];
  for (let i = 0; i <= steps; i++) {
    optVal.push(new Array(i + 1).fill(0));
    exVal.push(new Array(i + 1).fill(0));
    Vgrid.push(new Array(i + 1).fill(0));
    for (let j = 0; j <= i; j++) {
      Vgrid[i][j] = V0 * Math.pow(u, j) * Math.pow(d, i - j);
    }
  }
  // Terminal: option to invest expires worthless or = max(V−I, 0)
  for (let j = 0; j <= steps; j++) {
    optVal[steps][j] = Math.max(Vgrid[steps][j] - I, 0);
    exVal[steps][j] = Vgrid[steps][j] - I;
  }
  // Backward induction with early exercise
  for (let i = steps - 1; i >= 0; i--) {
    for (let j = 0; j <= i; j++) {
      const cont = disc * (p * optVal[i + 1][j + 1] + (1 - p) * optVal[i + 1][j]);
      const ex = Vgrid[i][j] - I;
      optVal[i][j] = Math.max(ex, cont);
      exVal[i][j] = ex;
    }
  }
  // Critical threshold V*(t) per step: smallest j s.t. optVal == ex
  const threshold: { t: number; vStar: number | null; expand: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    let v: number | null = null;
    for (let j = 0; j <= i; j++) {
      if (Math.abs(optVal[i][j] - (Vgrid[i][j] - I)) < 1e-8 && Vgrid[i][j] - I > 0) {
        v = Vgrid[i][j];
        break;
      }
    }
    threshold.push({ t: +(i * dt).toFixed(3), vStar: v, expand: v ? +(v / I).toFixed(3) : 0 });
  }

  return {
    optionValue: optVal[0][0],
    npvNaive: Math.max(V0 - I, 0),
    premium: optVal[0][0] - Math.max(V0 - I, 0),
    threshold,
    p, u, d,
  };
}

export const RealOptionsTool = () => {
  const { t } = useTranslation();
  const [V0, setV0] = useState(100);
  const [I, setI] = useState(100);
  const [sigma, setSigma] = useState(0.30);
  const [mu, setMu] = useState(0.05);
  const [r, setR] = useState(0.05);
  const [T, setT] = useState(5);
  const [steps, setSteps] = useState(50);

  const res = useMemo(() => buildBinomialRO({ V0, I, sigma, mu, r, T, steps }),
    [V0, I, sigma, mu, r, T, steps]);

  // Option value vs V0 curve (sensitivity)
  const sensCurve = useMemo(() => {
    const out: any[] = [];
    for (let v = 0.3 * I; v <= 2.0 * I; v += 0.05 * I) {
      const ro = buildBinomialRO({ V0: v, I, sigma, mu, r, T, steps: Math.min(steps, 40) });
      out.push({
        v: +v.toFixed(2),
        option: +ro.optionValue.toFixed(3),
        npv: +Math.max(v - I, 0).toFixed(3),
        premium: +ro.premium.toFixed(3),
      });
    }
    return out;
  }, [I, sigma, mu, r, T, steps]);

  // Dixit-Pindyck analytical perpetual benchmark (for context): V* = β/(β−1) · I
  // β = 1/2 − μ/σ² + sqrt((μ/σ² − 1/2)² + 2r/σ²)
  const beta = useMemo(() => {
    const m = mu / (sigma * sigma);
    return 0.5 - m + Math.sqrt(Math.pow(m - 0.5, 2) + 2 * r / (sigma * sigma));
  }, [mu, sigma, r]);
  const vStarPerp = beta > 1 ? (beta / (beta - 1)) * I : Infinity;

  const thresholdClean = res.threshold.map(t => ({ ...t, vStar: t.vStar ?? null }));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.macroV27.roAtmStandard"), description: t("labs.macroV27.roAtmStandardDesc"), apply: () => { setV0(100); setI(100); setSigma(0.30); setMu(0.05); setR(0.05); setT(5); } },
        { name: t("labs.macroV27.roDeepItm"), description: t("labs.macroV27.roDeepItmDesc"), apply: () => { setV0(180); setI(100); setSigma(0.20); } },
        { name: t("labs.macroV27.roHighUncertainty"), description: t("labs.macroV27.roHighUncertaintyDesc"), apply: () => { setSigma(0.6); setV0(100); setI(100); } },
        { name: t("labs.macroV27.roLongTermProject"), description: t("labs.macroV27.roLongTermProjectDesc"), apply: () => { setT(10); setSteps(60); } },
        { name: t("labs.macroV27.roNoGrowth"), description: t("labs.macroV27.roNoGrowthDesc"), apply: () => { setMu(0); setSigma(0.4); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.macroV27.v0Label")} value={V0} min={20} max={250} step={1} onChange={setV0} />
            <Slider label={t("labs.macroV27.iCostLabel")} value={I} min={20} max={250} step={1} onChange={setI} />
            <Slider label={t("labs.macroV27.sigmaVolatilityLabel")} value={sigma} min={0.05} max={0.8} step={0.01} onChange={setSigma} />
            <Slider label={t("labs.macroV27.muDriftLabel")} value={mu} min={-0.05} max={0.15} step={0.005} onChange={setMu} />
            <Slider label={t("labs.macroV27.rRiskFreeLabel")} value={r} min={0} max={0.12} step={0.005} onChange={setR} />
            <Slider label={t("labs.macroV27.tWindowLabel")} value={T} min={1} max={15} step={0.5} onChange={setT} />
          </div>
          <Slider label={t("labs.macroV27.stepsLabel")} value={steps} min={20} max={120} step={5} onChange={setSteps} />
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("labs.macroV27.optionValueF")} value={res.optionValue.toFixed(3)} color={CHART_GOLD} sub={t("labs.macroV27.deferredOption")} />
            <Stat label={t("labs.macroV27.naiveNpv")} value={res.npvNaive.toFixed(3)} color={CHART_BLUE} sub={t("labs.macroV27.maxVi")} />
            <Stat label={t("labs.macroV27.optionPremium")} value={res.premium.toFixed(3)} color={CHART_RED} sub={t("labs.macroV27.waitingValue")} />
            <Stat label={t("labs.macroV27.vStarPerpLabel")} value={isFinite(vStarPerp) ? vStarPerp.toFixed(2) : "∞"} color={CHART_PURPLE} sub={`β=${beta.toFixed(3)}`} />
            <Stat label={t("labs.macroV27.riskNeutralP")} value={res.p.toFixed(3)} sub={`u=${res.u.toFixed(3)}, d=${res.d.toFixed(3)}`} />
            <Stat label={t("labs.macroV27.decisionLabel")} value={V0 >= (isFinite(vStarPerp) ? vStarPerp : 1e9) ? t("labs.macroV27.invest") : t("labs.macroV27.wait")} color={V0 >= vStarPerp ? CHART_TEAL : CHART_RED} sub={`V₀/I=${(V0/I).toFixed(2)}`} />
          </div>
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">
            <p><span className="text-gold">Dixit-Pindyck (1994):</span> 投资具有期权性,σ↑ → 等待价值↑ → 触发阈值 V* &gt; I。</p>
            <p>{t("labs.macroV27.roProse2")}</p>
            <p>{t("labs.macroV27.roProse3")}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.macroV27.optionVsV0Title")}</h4>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sensCurve}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="v" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "V₀", position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="premium" name={t("labs.macroV27.waitingPremium")} stroke="none" fill={CHART_RED} fillOpacity={0.20} />
                <Line type="monotone" dataKey="option" name={t("labs.macroV27.optionFv")} stroke={CHART_GOLD} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="npv" name={t("labs.macroV27.naiveNpv")} stroke={CHART_BLUE} strokeWidth={2} dot={false} strokeDasharray="4 3" />
                <ReferenceLine x={I} stroke={CHART_TEAL} strokeDasharray="3 3" label={{ value: "V=I", fill: CHART_TEAL, fontSize: 10 }} />
                {isFinite(vStarPerp) && (
                  <ReferenceLine x={vStarPerp} stroke={CHART_PURPLE} strokeDasharray="3 3" label={{ value: "V*", fill: CHART_PURPLE, fontSize: 10 }} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.macroV27.optimalThresholdTitle")}</h4>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={thresholdClean}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: t("labs.macroV27.tYears"), position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="vStar" name={t("labs.macroV27.vStarThreshold")} stroke={CHART_GOLD} strokeWidth={2.5} dot={false} connectNulls />
                <ReferenceLine y={I} stroke={CHART_BLUE} strokeDasharray="3 3" label={{ value: "I", fill: CHART_BLUE, fontSize: 10 }} />
                {isFinite(vStarPerp) && (
                  <ReferenceLine y={vStarPerp} stroke={CHART_PURPLE} strokeDasharray="3 3" label={{ value: "V*_∞", fill: CHART_PURPLE, fontSize: 10 }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground mt-2">
            {t("labs.macroV27.roLegend")}
          </p>
        </div>
      </div>
    </div>
  );
};

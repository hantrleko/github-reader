import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { ols } from "@/lib/quant/ols";
import { C, Slider, Stat, makeRng, tooltipStyle } from "../frontier/ui";

function randn(rng: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// MacKinnon approximate ADF critical values (constant; constant+trend)
const ADF_CV = {
  c: { "1%": -3.43, "5%": -2.86, "10%": -2.57 },
  ct: { "1%": -3.96, "5%": -3.41, "10%": -3.13 },
};
// KPSS critical values (level; trend)
const KPSS_CV = {
  c: { "10%": 0.347, "5%": 0.463, "1%": 0.739 },
  ct: { "10%": 0.119, "5%": 0.146, "1%": 0.216 },
};

export const UnitRootTool = () => {
  const { t } = useTranslation();
  const [rho, setRho] = useState(1.0); // AR(1) coefficient: 1 = unit root
  const [drift, setDrift] = useState(0);
  const [n, setN] = useState(200);
  const [lags, setLags] = useState(1);
  const [trend, setTrend] = useState(false);
  const [seed, setSeed] = useState(3);

  const res = useMemo(() => {
    const rng = makeRng(seed);
    const N = Math.round(n);
    const y: number[] = [0];
    for (let t = 1; t < N; t++) y.push(drift + rho * y[t - 1] + randn(rng));

    // ── ADF: Δy_t = α (+ φ t) + γ y_{t-1} + Σ δ_i Δy_{t-i} + ε ──
    const dy = y.slice(1).map((v, i) => v - y[i]); // length N-1
    const p = Math.round(lags);
    const X: number[][] = [];
    const Y: number[] = [];
    for (let t = p; t < dy.length; t++) {
      const row: number[] = [y[t]]; // y_{t-1} relative to dy index (dy[t] uses y[t+1]-y[t]) → lag level is y[t]
      for (let i = 1; i <= p; i++) row.push(dy[t - i]);
      if (trend) row.push(t);
      X.push(row);
      Y.push(dy[t]);
    }
    const adf = ols(X, Y);
    const adfStat = adf.tStat[1]; // coefficient on y_{t-1}
    const adfCv = trend ? ADF_CV.ct : ADF_CV.c;
    const adfReject = adfStat < adfCv["5%"]; // reject unit root (stationary)

    // ── KPSS: residuals from regression on constant (+trend) ──
    const kX: number[][] = trend ? y.map((_, t) => [t]) : y.map(() => []);
    const kReg = ols(kX, y);
    const resid = y.map((v, t) => {
      let fit = kReg.beta[0];
      if (trend) fit += kReg.beta[1] * t;
      return v - fit;
    });
    // partial sums
    let cum = 0;
    let sumS2 = 0;
    for (let t = 0; t < N; t++) { cum += resid[t]; sumS2 += cum * cum; }
    // long-run variance (Bartlett / Newey-West)
    const l = Math.floor(4 * Math.pow(N / 100, 0.25));
    let s2 = resid.reduce((s, e) => s + e * e, 0) / N;
    for (let k = 1; k <= l; k++) {
      let gamma = 0;
      for (let t = k; t < N; t++) gamma += resid[t] * resid[t - k];
      gamma /= N;
      s2 += 2 * (1 - k / (l + 1)) * gamma;
    }
    const kpssStat = sumS2 / (N * N * s2);
    const kpssCv = trend ? KPSS_CV.ct : KPSS_CV.c;
    const kpssReject = kpssStat > kpssCv["5%"]; // reject stationarity (has unit root)

    const series = y.map((v, t) => ({ t, y: +v.toFixed(3) }));
    return { series, adfStat, adfCv, adfReject, kpssStat, kpssCv, kpssReject };
  }, [rho, drift, n, lags, trend, seed]);

  const conclusion =
    !res.adfReject && res.kpssReject ? t("labs.econ.unitroot.conclusion.unitRoot")
    : res.adfReject && !res.kpssReject ? t("labs.econ.unitroot.conclusion.stationary")
    : t("labs.econ.unitroot.conclusion.conflict");

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.econ.unitroot.presets.randomWalk.name"), description: t("labs.econ.unitroot.presets.randomWalk.desc"), apply: () => { setRho(1); setDrift(0); setTrend(false); } },
        { name: t("labs.econ.unitroot.presets.stationaryAr1.name"), description: t("labs.econ.unitroot.presets.stationaryAr1.desc"), apply: () => { setRho(0.6); setDrift(0); setTrend(false); } },
        { name: t("labs.econ.unitroot.presets.driftedWalk.name"), description: t("labs.econ.unitroot.presets.driftedWalk.desc"), apply: () => { setRho(1); setDrift(0.3); setTrend(true); } },
        { name: t("labs.econ.unitroot.presets.trendStationary.name"), description: t("labs.econ.unitroot.presets.trendStationary.desc"), apply: () => { setRho(0.5); setDrift(0.2); setTrend(true); } },
        { name: t("labs.econ.unitroot.presets.nearUnitRoot.name"), description: t("labs.econ.unitroot.presets.nearUnitRoot.desc"), apply: () => { setRho(0.95); setTrend(false); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.econ.unitroot.dgpParams")}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.econ.unitroot.rho.label")} sub={t("labs.econ.unitroot.rho.sub")} value={rho} min={0.3} max={1.05} step={0.01} onChange={setRho} />
            <Slider label={t("labs.econ.unitroot.driftLabel")} value={drift} min={0} max={0.5} step={0.05} onChange={setDrift} />
            <Slider label={t("labs.econ.unitroot.nLabel")} value={n} min={50} max={500} step={10} onChange={setN} />
            <Slider label={t("labs.econ.unitroot.lagsLabel")} value={lags} min={0} max={6} step={1} onChange={setLags} />
          </div>
          <button onClick={() => setTrend((v) => !v)} className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-colors ${trend ? "border-gold/40 bg-gold/10 text-gold" : "border-border bg-secondary/50 text-muted-foreground"}`}>
            {trend ? t("labs.econ.unitroot.trendOn") : t("labs.econ.unitroot.trendOff")}
          </button>
          <Slider label={t("labs.econ.unitroot.seedLabel")} value={seed} min={1} max={99} step={1} fmt={(v) => v.toFixed(0)} onChange={setSeed} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.econ.unitroot.stat.adfStat")} value={res.adfStat.toFixed(3)} color={res.adfReject ? C.green : C.red} sub={t("labs.econ.unitroot.stat.criticalAt5", { value: res.adfCv["5%"] })} />
          <Stat label={t("labs.econ.unitroot.stat.adfConclusion")} value={res.adfReject ? t("labs.econ.unitroot.stat.rejectUnitRoot") : t("labs.econ.unitroot.stat.cannotReject")} color={res.adfReject ? C.green : C.red} sub={t("labs.econ.unitroot.stat.h0UnitRoot")} />
          <Stat label={t("labs.econ.unitroot.stat.kpssStat")} value={res.kpssStat.toFixed(3)} color={res.kpssReject ? C.red : C.green} sub={t("labs.econ.unitroot.stat.criticalAt5", { value: res.kpssCv["5%"] })} />
          <Stat label={t("labs.econ.unitroot.stat.kpssConclusion")} value={res.kpssReject ? t("labs.econ.unitroot.stat.rejectStationary") : t("labs.econ.unitroot.stat.cannotReject")} color={res.kpssReject ? C.red : C.green} sub={t("labs.econ.unitroot.stat.h0Stationary")} />
        </div>
      </div>

      <div className="rounded-lg border border-gold/25 bg-gold/[0.04] p-3">
        <p className="text-xs font-mono text-gold">{t("labs.econ.unitroot.overallJudgment")}<span className="text-foreground">{conclusion}</span></p>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.econ.unitroot.simulatedSeries")}</h4>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={res.series}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={0} stroke={C.text} />
              <Line type="monotone" dataKey="y" name="y_t" stroke={C.gold} strokeWidth={1.6} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
        <p><span className="text-gold">{t("labs.econ.unitroot.notes.adfTitle")}</span>{t("labs.econ.unitroot.notes.adfBody")}</p>
        <p><span className="text-gold">{t("labs.econ.unitroot.notes.kpssTitle")}</span>{t("labs.econ.unitroot.notes.kpssBody")}</p>
        <p><span className="text-gold">{t("labs.econ.unitroot.notes.nearTitle")}</span>{t("labs.econ.unitroot.notes.nearBody")}</p>
      </div>
    </div>
  );
};

export default UnitRootTool;

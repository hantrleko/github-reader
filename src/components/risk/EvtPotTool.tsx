import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, BarChart, Bar, Cell,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { C, Slider, Stat, makeRng, tooltipStyle } from "../frontier/ui";

function randn(rng: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
/** Student-t draw = Z / sqrt(chi2_df/df), chi2 via sum of squared normals. */
function tDraw(rng: () => number, df: number) {
  const z = randn(rng);
  let chi2 = 0;
  for (let i = 0; i < df; i++) { const x = randn(rng); chi2 += x * x; }
  return z / Math.sqrt(chi2 / df);
}

/** Method-of-moments GPD fit to exceedances y_i = x_i − u (>0). */
function fitGPD(exc: number[]) {
  const n = exc.length;
  const m = exc.reduce((s, v) => s + v, 0) / n;
  const s2 = exc.reduce((s, v) => s + (v - m) ** 2, 0) / n;
  let xi = 0.5 * (1 - (m * m) / s2);
  let beta = 0.5 * m * (1 + (m * m) / s2);
  if (!isFinite(xi)) xi = 0.1;
  if (!isFinite(beta) || beta <= 0) beta = m;
  return { xi, beta, m, s2 };
}

export const EvtPotTool = () => {
  const { t } = useTranslation();
  const [df, setDf] = useState(4); // tail heaviness of the loss generator
  const [scale, setScale] = useState(1.5);
  const [thrPct, setThrPct] = useState(90); // threshold percentile u
  const [seed, setSeed] = useState(7);

  const res = useMemo(() => {
    const rng = makeRng(seed);
    const n = 4000;
    // losses (positive = loss). Heavy-tailed Student-t scaled.
    const losses = Array.from({ length: n }, () => tDraw(rng, df) * scale).map((x) => x);
    const sorted = [...losses].sort((a, b) => a - b);
    const q = (p: number) => sorted[Math.min(n - 1, Math.max(0, Math.floor(p * n)))];

    const u = q(thrPct / 100);
    const exceed = losses.filter((x) => x > u).map((x) => x - u);
    const Nu = exceed.length;
    const { xi, beta } = fitGPD(exceed);

    // POT VaR/ES:  VaR_α = u + (β/ξ)[((n/Nu)(1-α))^{-ξ} − 1]
    const potVaR = (alpha: number) => {
      const ratio = (n / Nu) * (1 - alpha);
      if (Math.abs(xi) < 1e-6) return u - beta * Math.log(ratio);
      return u + (beta / xi) * (Math.pow(ratio, -xi) - 1);
    };
    const potES = (alpha: number) => {
      const v = potVaR(alpha);
      return xi < 1 ? (v + (beta - xi * u)) / (1 - xi) : NaN;
    };

    // benchmarks
    const mean = losses.reduce((s, v) => s + v, 0) / n;
    const sd = Math.sqrt(losses.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
    const zNorm = (alpha: number) => mean + sd * (alpha === 0.99 ? 2.3263 : 3.0902);
    const histVaR = (alpha: number) => q(alpha);

    const rows = [0.99, 0.999].map((a) => ({
      level: (a * 100).toFixed(1) + "%",
      norm: +zNorm(a).toFixed(3),
      hist: +histVaR(a).toFixed(3),
      evt: +potVaR(a).toFixed(3),
      es: +potES(a).toFixed(3),
    }));

    // mean-excess plot e(u) = mean(exceedances above u)
    const me: { u: number; e: number }[] = [];
    for (let p = 70; p <= 98; p += 2) {
      const uu = q(p / 100);
      const ex = losses.filter((x) => x > uu).map((x) => x - uu);
      if (ex.length > 5) me.push({ u: +uu.toFixed(2), e: +(ex.reduce((s, v) => s + v, 0) / ex.length).toFixed(3) });
    }

    // tail fit: empirical vs GPD survival on exceedances
    const fit: { x: number; emp: number; gpd: number }[] = [];
    const maxE = Math.max(...exceed);
    const sortedExc = [...exceed].sort((a, b) => a - b);
    for (let i = 1; i <= 40; i++) {
      const y = (i / 40) * maxE;
      const emp = sortedExc.filter((e) => e > y).length / Nu;
      const gpd = xi !== 0 ? Math.pow(1 + (xi * y) / beta, -1 / xi) : Math.exp(-y / beta);
      fit.push({ x: +(u + y).toFixed(2), emp: +emp.toFixed(4), gpd: +Math.max(0, gpd).toFixed(4) });
    }

    return { u, Nu, xi, beta, rows, me, fit, n };
  }, [df, scale, thrPct, seed]);

  const tailLabel = res.xi > 0.25 ? t("labs.risk.evt.tailHeavy") : res.xi > 0 ? t("labs.risk.evt.tailMedium") : t("labs.risk.evt.tailLight");

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.risk.evt.presets.heavyTail.name"), description: t("labs.risk.evt.presets.heavyTail.description"), apply: () => { setDf(3); setScale(1.5); setThrPct(90); } },
        { name: t("labs.risk.evt.presets.mildMarket.name"), description: t("labs.risk.evt.presets.mildMarket.description"), apply: () => { setDf(10); setScale(1.2); setThrPct(92); } },
        { name: t("labs.risk.evt.presets.crisisTail.name"), description: t("labs.risk.evt.presets.crisisTail.description"), apply: () => { setDf(3); setScale(2.5); setThrPct(88); } },
        { name: t("labs.risk.evt.presets.highThreshold.name"), description: t("labs.risk.evt.presets.highThreshold.description"), apply: () => { setThrPct(95); } },
        { name: t("labs.risk.evt.presets.lowThreshold.name"), description: t("labs.risk.evt.presets.lowThreshold.description"), apply: () => { setThrPct(85); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.risk.evt.sectionLossDistribution")}</p>
          <Slider label={t("labs.risk.evt.sliders.dfLabel")} sub={t("labs.risk.evt.sliders.dfSub")} value={df} min={2.5} max={15} step={0.5} onChange={setDf} />
          <Slider label={t("labs.risk.evt.sliders.scaleLabel")} value={scale} min={0.5} max={3} step={0.1} onChange={setScale} />
          <Slider label={t("labs.risk.evt.sliders.thresholdLabel")} sub={t("labs.risk.evt.sliders.thresholdSub")} value={thrPct} min={80} max={98} step={1} fmt={(v) => v.toFixed(0) + "%"} onChange={setThrPct} />
          <Slider label={t("labs.risk.evt.sliders.seedLabel")} value={seed} min={1} max={99} step={1} fmt={(v) => v.toFixed(0)} onChange={setSeed} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.risk.evt.stats.threshold")} value={res.u.toFixed(3)} />
          <Stat label={t("labs.risk.evt.stats.exceedCount")} value={`${res.Nu} / ${res.n}`} color={C.blue} />
          <Stat label={t("labs.risk.evt.stats.shape")} value={res.xi.toFixed(3)} color={res.xi > 0.25 ? C.red : C.gold} sub={tailLabel} />
          <Stat label={t("labs.risk.evt.stats.scaleBeta")} value={res.beta.toFixed(3)} color={C.teal} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4 overflow-x-auto">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.risk.evt.comparisonTitle")}</h4>
        <table className="w-full text-xs font-mono border-collapse">
          <thead>
            <tr className="text-gold text-left">
              <th className="p-2 border-b border-border">{t("labs.risk.evt.table.confidenceLevel")}</th>
              <th className="p-2 border-b border-border">{t("labs.risk.evt.table.normalVaR")}</th>
              <th className="p-2 border-b border-border">{t("labs.risk.evt.table.historicalVaR")}</th>
              <th className="p-2 border-b border-border">{t("labs.risk.evt.table.evtVaR")}</th>
              <th className="p-2 border-b border-border">{t("labs.risk.evt.table.evtES")}</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            {res.rows.map((r) => (
              <tr key={r.level}>
                <td className="p-2 border-b border-border/40 text-foreground">{r.level}</td>
                <td className="p-2 border-b border-border/40">{r.norm.toFixed(3)}</td>
                <td className="p-2 border-b border-border/40">{r.hist.toFixed(3)}</td>
                <td className="p-2 border-b border-border/40" style={{ color: C.gold }}>{r.evt.toFixed(3)}</td>
                <td className="p-2 border-b border-border/40" style={{ color: C.red }}>{r.es.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[10px] font-mono text-muted-foreground mt-2">{t("labs.risk.evt.comparisonNote")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.risk.evt.meanExcessTitle")}</h4>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={res.me}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="u" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: t("labs.risk.evt.chart.thresholdAxis"), position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="e" name={t("labs.risk.evt.chart.meanExcess")} stroke={C.gold} strokeWidth={2.5} dot={false} />
                <ReferenceLine x={+res.u.toFixed(2)} stroke={C.red} strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.risk.evt.tailFitTitle")}</h4>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={res.fit}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="x" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: t("labs.risk.evt.chart.lossAxis"), position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="emp" name={t("labs.risk.evt.chart.empirical")} stroke={C.blue} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="gpd" name={t("labs.risk.evt.chart.gpdFit")} stroke={C.red} strokeWidth={2} dot={false} strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
        <p><span className="text-gold">{t("labs.risk.evt.notes.potLabel")}</span>{t("labs.risk.evt.notes.potText")}</p>
        <p><span className="text-gold">{t("labs.risk.evt.notes.xiLabel")}</span>{t("labs.risk.evt.notes.xiText")}</p>
      </div>
    </div>
  );
};

export default EvtPotTool;

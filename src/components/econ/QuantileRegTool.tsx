import { useState, useMemo, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Scatter, ComposedChart, ReferenceLine } from "recharts";
import PresetButtons from "../PresetButtons";
import { useTranslation } from "react-i18next";
import { bootstrapQuantileRegAsync, type QRBootPoint } from "@/lib/quant/panelEcon";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

const sliderClass =
  "w-full h-1.5 rounded-full appearance-none cursor-pointer bg-secondary accent-gold [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold";
const Slider = ({ label, sub, value, min, max, step, onChange }: { label: string; sub?: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) => (
  <div>
    <div className="flex justify-between items-baseline mb-2">
      <label className="text-xs text-secondary-foreground font-medium">{label}{sub && <span className="text-muted-foreground ml-1.5 text-[10px]">{sub}</span>}</label>
      <span className="text-xs font-mono text-gold tabular-nums">{value.toFixed(step >= 1 ? 0 : step >= 0.1 ? 2 : 3)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} className={sliderClass} />
  </div>
);

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function randn(rng: () => number) {
  let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Quantile regression via IRLS (Iteratively Reweighted Least Squares) with
 * the standard quantile-loss approximation:
 *   ρ_τ(u) = u·(τ − 1{u<0})
 * Use weights w_i = 1/max(|u_i|, ε) and pseudo-residual y_i + (sign(u_i)·(τ − 1{u<0})) — the
 * Schlossmacher (1973) IRLS for L1 / quantile regression. Converges for moderate n.
 *
 * Model: y_i = β0 + β1 x_i + ε_i, return (β0_τ, β1_τ).
 */
function quantileRegression(xs: number[], ys: number[], tau: number, iters = 60): { b0: number; b1: number } {
  const n = xs.length;
  // Init from OLS
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; }
  mx /= n; my /= n;
  let sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sxx += (xs[i] - mx) ** 2; sxy += (xs[i] - mx) * (ys[i] - my); }
  let b1 = sxx > 1e-12 ? sxy / sxx : 0;
  let b0 = my - b1 * mx;

  const eps = 1e-4;
  for (let it = 0; it < iters; it++) {
    // Compute residuals and asymmetric weights for quantile loss.
    let Sw = 0, Swx = 0, Swxx = 0, Swy = 0, Swxy = 0;
    for (let i = 0; i < n; i++) {
      const r = ys[i] - (b0 + b1 * xs[i]);
      const absR = Math.max(Math.abs(r), eps);
      // Asymmetric weight encoding ρ_τ:
      // for r > 0 weight by τ, for r < 0 weight by (1-τ); divided by |r| (IRLS for L1 generalisation).
      const wAsym = r >= 0 ? tau : (1 - tau);
      const w = wAsym / absR;
      Sw += w; Swx += w * xs[i]; Swxx += w * xs[i] * xs[i];
      Swy += w * ys[i]; Swxy += w * xs[i] * ys[i];
    }
    const det = Sw * Swxx - Swx * Swx;
    if (Math.abs(det) < 1e-14) break;
    const newB0 = (Swxx * Swy - Swx * Swxy) / det;
    const newB1 = (Sw * Swxy - Swx * Swy) / det;
    if (Math.abs(newB0 - b0) + Math.abs(newB1 - b1) < 1e-7) { b0 = newB0; b1 = newB1; break; }
    b0 = newB0; b1 = newB1;
  }
  return { b0, b1 };
}

type DGP = "homo" | "hetero" | "outlier" | "skew";

export const QuantileRegTool = () => {
  const { t } = useTranslation();
  const [n, setN] = useState(200);
  const [trueB0, setTrueB0] = useState(1.0);
  const [trueB1, setTrueB1] = useState(2.0);
  const [seed, setSeed] = useState(42);
  const [dgp, setDgp] = useState<DGP>("hetero");
  const [bootB, setBootB] = useState(200);
  const [boot, setBoot] = useState<QRBootPoint[] | null>(null);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootRunning, setBootRunning] = useState(false);
  const bootGen = useRef(0);

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    const xs: number[] = [], ys: number[] = [], pts: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const x = -2 + 4 * (i / (n - 1)) + 0.05 * randn(rng);
      let eps = randn(rng);
      if (dgp === "homo") eps = eps * 0.6;
      else if (dgp === "hetero") eps = eps * (0.2 + 0.6 * Math.abs(x));
      else if (dgp === "outlier") eps = (rng() < 0.08 ? randn(rng) * 4 : eps * 0.5);
      else if (dgp === "skew") eps = (Math.exp(eps * 0.6) - Math.exp(0.18)); // log-normal-ish, right skew
      const y = trueB0 + trueB1 * x + eps;
      xs.push(x); ys.push(y); pts.push({ x: +x.toFixed(3), y: +y.toFixed(3) });
    }
    // OLS
    let mx = 0, my = 0; for (let i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; } mx /= n; my /= n;
    let sxx = 0, sxy = 0;
    for (let i = 0; i < n; i++) { sxx += (xs[i] - mx) ** 2; sxy += (xs[i] - mx) * (ys[i] - my); }
    const olsB1 = sxx > 0 ? sxy / sxx : 0;
    const olsB0 = my - olsB1 * mx;

    // Quantile regressions for several taus
    const taus = [0.10, 0.25, 0.50, 0.75, 0.90];
    const fits = taus.map(tau => ({ tau, ...quantileRegression(xs, ys, tau) }));

    // Build prediction-line dataset
    const xMin = Math.min(...xs), xMax = Math.max(...xs);
    const STEPS = 60;
    const lines = Array.from({ length: STEPS + 1 }, (_, i) => {
      const x = xMin + ((xMax - xMin) * i) / STEPS;
      const row: any = { x: +x.toFixed(3), ols: +(olsB0 + olsB1 * x).toFixed(4) };
      fits.forEach(f => { row[`q${Math.round(f.tau * 100)}`] = +(f.b0 + f.b1 * x).toFixed(4); });
      return row;
    });

    // Coefficient path (β1 across tau ∈ [0.05, 0.95])
    const path: { tau: number; b1: number; b0: number; ols: number }[] = [];
    for (let i = 1; i <= 19; i++) {
      const tau = i / 20;
      const fit = quantileRegression(xs, ys, tau);
      path.push({ tau: +tau.toFixed(2), b1: +fit.b1.toFixed(4), b0: +fit.b0.toFixed(4), ols: +olsB1.toFixed(4) });
    }

    return { pts, fits, lines, path, olsB0, olsB1, xs, ys };
  }, [n, trueB0, trueB1, seed, dgp]);

  // Pairs bootstrap for the displayed τ grid — batched async so the page
  // stays responsive; same seeded RNG as the sync version (reproducible).
  useEffect(() => {
    const gen = ++bootGen.current;
    setBootRunning(true);
    setBootProgress(0);
    const taus = [0.10, 0.25, 0.50, 0.75, 0.90];
    const X = data.xs.map((x) => [x]);
    bootstrapQuantileRegAsync(X, data.ys, taus, bootB, 0.05, seed, (done, total) => {
      if (bootGen.current === gen) setBootProgress(done / total);
    }).then((res) => {
      if (bootGen.current === gen) { setBoot(res); setBootRunning(false); }
    });
    return () => { bootGen.current = gen; };
  }, [data, bootB, seed]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.econ.quantilereg.presets.hetero.name"), description: t("labs.econ.quantilereg.presets.hetero.desc"), apply: () => { setDgp("hetero"); setN(200); } },
        { name: t("labs.econ.quantilereg.presets.homo.name"), description: t("labs.econ.quantilereg.presets.homo.desc"), apply: () => { setDgp("homo"); } },
        { name: t("labs.econ.quantilereg.presets.outlier.name"), description: t("labs.econ.quantilereg.presets.outlier.desc"), apply: () => { setDgp("outlier"); } },
        { name: t("labs.econ.quantilereg.presets.skew.name"), description: t("labs.econ.quantilereg.presets.skew.desc"), apply: () => { setDgp("skew"); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.econ.quantilereg.nLabel")} value={n} min={50} max={600} step={50} onChange={setN} />
            <Slider label={t("labs.econ.quantilereg.trueB0Label")} value={trueB0} min={-2} max={3} step={0.1} onChange={setTrueB0} />
            <Slider label={t("labs.econ.quantilereg.trueB1Label")} value={trueB1} min={-1} max={4} step={0.1} onChange={setTrueB1} />
            <Slider label={t("labs.econ.quantilereg.seedLabel")} value={seed} min={1} max={999} step={1} onChange={setSeed} />
            <Slider label={t("labs.econ.quantilereg.bootBLabel")} sub={t("labs.econ.quantilereg.bootBSub")} value={bootB} min={50} max={500} step={50} onChange={setBootB} />
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] font-mono text-muted-foreground self-center uppercase tracking-wider">{t("labs.econ.quantilereg.dgpLabel")}</span>
            {(["homo", "hetero", "outlier", "skew"] as const).map(s => (
              <button key={s} onClick={() => setDgp(s)}
                className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-all ${dgp === s ? "bg-gold/20 border-gold text-gold" : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"}`}>
                {s === "homo" ? t("labs.econ.quantilereg.dgpNames.homo") : s === "hetero" ? t("labs.econ.quantilereg.dgpNames.hetero") : s === "outlier" ? t("labs.econ.quantilereg.dgpNames.outlier") : t("labs.econ.quantilereg.dgpNames.skew")}
              </button>
            ))}
          </div>
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
            <p><span className="text-gold">{t("labs.econ.quantilereg.notes.qrTitle")}</span>{t("labs.econ.quantilereg.notes.qrBody")}</p>
            <p>{t("labs.econ.quantilereg.notes.olsVsQr")}</p>
            <p>{t("labs.econ.quantilereg.notes.irls")}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-mono text-gold uppercase tracking-wider mb-1">{t("labs.econ.quantilereg.coefTableTitle")}</p>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs font-mono">
              <thead className="bg-secondary/60 text-muted-foreground">
                <tr><th className="py-1.5 px-2 text-left">τ</th><th className="py-1.5 px-2 text-right">β₀</th><th className="py-1.5 px-2 text-right">β₁</th><th className="py-1.5 px-2 text-right">{t("labs.econ.quantilereg.bootSe")}</th><th className="py-1.5 px-2 text-right">{t("labs.econ.quantilereg.bootCi")}</th></tr>
              </thead>
              <tbody>
                <tr className="border-t border-border bg-secondary/20">
                  <td className="py-1.5 px-2 text-foreground">OLS</td>
                  <td className="py-1.5 px-2 text-right text-gold tabular-nums">{data.olsB0.toFixed(3)}</td>
                  <td className="py-1.5 px-2 text-right text-gold tabular-nums">{data.olsB1.toFixed(3)}</td>
                  <td className="py-1.5 px-2 text-right text-muted-foreground">—</td>
                  <td className="py-1.5 px-2 text-right text-muted-foreground">—</td>
                </tr>
                {data.fits.map((f, i) => {
                  const b = boot?.[i];
                  return (
                    <tr key={f.tau} className="border-t border-border">
                      <td className="py-1.5 px-2 text-foreground">{f.tau.toFixed(2)}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums">{f.b0.toFixed(3)}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums" style={{ color: CHART_TEAL }}>{f.b1.toFixed(3)}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{b ? b.se[1].toFixed(3) : "…"}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{b ? `[${b.ciLo[1].toFixed(2)}, ${b.ciHi[1].toFixed(2)}]` : "…"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Scatter + quantile lines */}
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.econ.quantilereg.fitChartTitle")} τ ∈ {`{0.10, 0.25, 0.50, 0.75, 0.90}`}</h4>
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Scatter data={data.pts} dataKey="y" fill={CHART_TEXT} fillOpacity={0.4} name={t("labs.econ.quantilereg.sampleLegend")} />
              <Line data={data.lines} dataKey="ols" stroke={CHART_RED} strokeWidth={2.5} dot={false} name={t("labs.econ.quantilereg.olsLegend")} />
              <Line data={data.lines} dataKey="q10" stroke={CHART_BLUE} strokeWidth={1.5} dot={false} name="τ=0.10" strokeDasharray="3 3" />
              <Line data={data.lines} dataKey="q25" stroke={CHART_BLUE} strokeWidth={1.5} dot={false} name="τ=0.25" strokeDasharray="5 3" />
              <Line data={data.lines} dataKey="q50" stroke={CHART_GOLD} strokeWidth={2.5} dot={false} name={t("labs.econ.quantilereg.medianLegend")} />
              <Line data={data.lines} dataKey="q75" stroke={CHART_TEAL} strokeWidth={1.5} dot={false} name="τ=0.75" strokeDasharray="5 3" />
              <Line data={data.lines} dataKey="q90" stroke={CHART_TEAL} strokeWidth={1.5} dot={false} name="τ=0.90" strokeDasharray="3 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Coefficient path */}
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.econ.quantilereg.slopeChartTitle")}</h4>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.path}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="tau" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: "τ", position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="b1" name={t("labs.econ.quantilereg.b1Legend")} stroke={CHART_GOLD} strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="ols" name={t("labs.econ.quantilereg.olsB1Legend")} stroke={CHART_RED} strokeWidth={1.8} strokeDasharray="5 3" dot={false} />
              <ReferenceLine y={trueB1} stroke={CHART_TEAL} strokeDasharray="2 2" label={{ value: `${t("labs.econ.quantilereg.trueValue")} ${trueB1.toFixed(2)}`, fill: CHART_TEAL, fontSize: 10 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground mt-2 leading-relaxed">
          {t("labs.econ.quantilereg.slopeChartNote")}
        </p>
      </div>
    </div>
  );
};

export default QuantileRegTool;

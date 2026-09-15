import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, ScatterChart, Scatter,
} from "recharts";
import "katex/dist/katex.min.css";
import PresetButtons, { Preset } from "../PresetButtons";
import { useTranslation } from "react-i18next";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

/* ──────── shared rng ──────── */
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

const Slider = ({ label, sub, value, min, max, step, onChange }: {
  label: string; sub?: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) => (
  <div>
    <div className="flex justify-between items-baseline mb-2">
      <label className="text-xs text-secondary-foreground font-medium">
        {label}
        {sub && <span className="text-muted-foreground ml-1.5 text-[10px]">{sub}</span>}
      </label>
      <span className="text-xs font-mono text-gold tabular-nums">
        {value.toFixed(step >= 1 ? 0 : step >= 0.1 ? 1 : 3)}
      </span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className={sliderClass}
    />
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

/* ──────── normal pdf/cdf ──────── */
const SQRT_2PI = Math.sqrt(2 * Math.PI);
const phi = (z: number) => Math.exp(-0.5 * z * z) / SQRT_2PI;
function Phi(z: number) {
  // Abramowitz & Stegun 7.1.26
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = phi(z);
  const p = d * (0.319381530 * t - 0.356563782 * t * t + 1.781477937 * Math.pow(t, 3)
    - 1.821255978 * Math.pow(t, 4) + 1.330274429 * Math.pow(t, 5));
  return z >= 0 ? 1 - p : p;
}
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/* ──────── tiny linear algebra (3x3 invert) ──────── */
function solve3(A: number[][], b: number[]): number[] {
  // Gauss-Jordan on 3x3
  const M = A.map((row, i) => [...row, b[i]]);
  const n = 3;
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[piv][i])) piv = k;
    [M[i], M[piv]] = [M[piv], M[i]];
    const d = M[i][i] || 1e-12;
    for (let j = i; j <= n; j++) M[i][j] /= d;
    for (let k = 0; k < n; k++) if (k !== i) {
      const f = M[k][i];
      for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j];
    }
  }
  return [M[0][3], M[1][3], M[2][3]];
}

/** Newton-Raphson MLE for binary GLM with two regressors (intercept + x1 + x2).
 *  family: "logit" | "probit". Returns coefs and SE from -H^{-1}. */
function fitBinaryGLM(X: number[][], y: number[], family: "logit" | "probit") {
  let beta = [0, 0, 0];
  for (let it = 0; it < 50; it++) {
    const grad = [0, 0, 0];
    const H: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < X.length; i++) {
      const xi = X[i];
      const z = beta[0] * xi[0] + beta[1] * xi[1] + beta[2] * xi[2];
      let p: number, w: number, resid: number;
      if (family === "logit") {
        p = sigmoid(z);
        w = p * (1 - p);
        resid = y[i] - p;
      } else {
        p = Phi(z);
        const pdfz = phi(z);
        const denom = Math.max(p * (1 - p), 1e-9);
        // score: (y - p) * phi / [p (1-p)] * x  (probit MLE)
        const lambda = pdfz / denom;
        resid = (y[i] - p) * lambda;
        w = (pdfz * pdfz) / denom; // information weight (Amemiya)
      }
      for (let a = 0; a < 3; a++) {
        grad[a] += resid * xi[a];
        for (let b = 0; b < 3; b++) H[a][b] += w * xi[a] * xi[b];
      }
    }
    // solve H * delta = grad
    let delta: number[];
    try { delta = solve3(H, grad); } catch { break; }
    beta = beta.map((b, k) => b + delta[k]);
    const norm = Math.max(...delta.map(Math.abs));
    if (norm < 1e-7) break;
  }
  // SE from inverse Fisher info diag
  const I: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < X.length; i++) {
    const xi = X[i];
    const z = beta[0] * xi[0] + beta[1] * xi[1] + beta[2] * xi[2];
    const w = family === "logit"
      ? (() => { const p = sigmoid(z); return p * (1 - p); })()
      : (() => { const p = Phi(z); const pd = phi(z); return (pd * pd) / Math.max(p * (1 - p), 1e-9); })();
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) I[a][b] += w * xi[a] * xi[b];
  }
  // invert via solve3 column-by-column
  const inv = [0, 1, 2].map(k => solve3(I.map(r => [...r]), [k === 0 ? 1 : 0, k === 1 ? 1 : 0, k === 2 ? 1 : 0]));
  const se = [Math.sqrt(Math.max(inv[0][0], 0)), Math.sqrt(Math.max(inv[1][1], 0)), Math.sqrt(Math.max(inv[2][2], 0))];
  // log-likelihood
  let ll = 0;
  for (let i = 0; i < X.length; i++) {
    const xi = X[i];
    const z = beta[0] * xi[0] + beta[1] * xi[1] + beta[2] * xi[2];
    const p = family === "logit" ? sigmoid(z) : Phi(z);
    const pp = Math.min(Math.max(p, 1e-12), 1 - 1e-12);
    ll += y[i] === 1 ? Math.log(pp) : Math.log(1 - pp);
  }
  return { beta, se, ll };
}

export const LogitProbitTool = () => {
  const { t } = useTranslation();
  const [n, setN] = useState(500);
  const [b0, setB0] = useState(-0.5);
  const [b1, setB1] = useState(1.2);    // effect of x1 (continuous)
  const [b2, setB2] = useState(0.8);    // effect of x2 (binary)
  const [dgp, setDgp] = useState<"logit" | "probit">("logit");
  const [seed, setSeed] = useState(42);

  const data = useMemo(() => {
    const rng = mulberry32(seed);
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < n; i++) {
      const x1 = randn(rng);
      const x2 = rng() < 0.5 ? 0 : 1;
      const z = b0 + b1 * x1 + b2 * x2;
      const p = dgp === "logit" ? sigmoid(z) : Phi(z);
      const yi = rng() < p ? 1 : 0;
      X.push([1, x1, x2]);
      y.push(yi);
    }
    const logit = fitBinaryGLM(X, y, "logit");
    const probit = fitBinaryGLM(X, y, "probit");
    // OLS LPM (closed form via the same solve)
    const G: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const g: number[] = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const xi = X[i];
      for (let a = 0; a < 3; a++) {
        g[a] += xi[a] * y[i];
        for (let b = 0; b < 3; b++) G[a][b] += xi[a] * xi[b];
      }
    }
    const lpm = solve3(G, g);

    // Marginal effects:
    //  - AME (average marginal effect): mean over i of f(z_i) * beta_k
    //  - MEM (marginal effect at means): f(zbar) * beta_k
    const meanX1 = X.reduce((s, r) => s + r[1], 0) / n;
    const meanX2 = X.reduce((s, r) => s + r[2], 0) / n;
    const computeME = (b: number[], fam: "logit" | "probit") => {
      const f = (z: number) => fam === "logit" ? sigmoid(z) * (1 - sigmoid(z)) : phi(z);
      let ame1 = 0, ame2 = 0;
      for (let i = 0; i < n; i++) {
        const z = b[0] + b[1] * X[i][1] + b[2] * X[i][2];
        const fz = f(z);
        ame1 += fz * b[1];
        ame2 += fz * b[2];
      }
      ame1 /= n; ame2 /= n;
      const zbar = b[0] + b[1] * meanX1 + b[2] * meanX2;
      const fzbar = f(zbar);
      return { ame1, ame2, mem1: fzbar * b[1], mem2: fzbar * b[2] };
    };
    const meLogit = computeME(logit.beta, "logit");
    const meProbit = computeME(probit.beta, "probit");

    // Predicted-probability curve (vary x1, fix x2 at 0)
    const grid: { x1: number; logit: number; probit: number; lpm: number; truth: number }[] = [];
    for (let i = 0; i <= 60; i++) {
      const x1 = -3 + (6 * i) / 60;
      const zL = logit.beta[0] + logit.beta[1] * x1;
      const zP = probit.beta[0] + probit.beta[1] * x1;
      const zLPM = lpm[0] + lpm[1] * x1;
      const zT = b0 + b1 * x1;
      grid.push({
        x1: +x1.toFixed(3),
        logit: +sigmoid(zL).toFixed(4),
        probit: +Phi(zP).toFixed(4),
        lpm: +Math.min(Math.max(zLPM, -0.1), 1.1).toFixed(4),
        truth: +(dgp === "logit" ? sigmoid(zT) : Phi(zT)).toFixed(4),
      });
    }

    // Classification accuracy at p=0.5 cutoff
    const acc = (b: number[], fam: "logit" | "probit") => {
      let c = 0;
      for (let i = 0; i < n; i++) {
        const z = b[0] + b[1] * X[i][1] + b[2] * X[i][2];
        const p = fam === "logit" ? sigmoid(z) : Phi(z);
        if ((p >= 0.5 ? 1 : 0) === y[i]) c++;
      }
      return c / n;
    };
    const accL = acc(logit.beta, "logit");
    const accP = acc(probit.beta, "probit");
    // Pseudo-R² (McFadden)
    const ybar = y.reduce((s, v) => s + v, 0) / n;
    const ll0 = n * (ybar * Math.log(Math.max(ybar, 1e-12)) + (1 - ybar) * Math.log(Math.max(1 - ybar, 1e-12)));
    const r2L = 1 - logit.ll / ll0;
    const r2P = 1 - probit.ll / ll0;

    return { logit, probit, lpm, meLogit, meProbit, grid, accL, accP, r2L, r2P, ybar };
  }, [n, b0, b1, b2, dgp, seed]);

  const presets: Preset[] = [
    { name: t("labs.econ.logitprobit.presets.stdLogit.name"), description: t("labs.econ.logitprobit.presets.stdLogit.desc"), apply: () => { setN(500); setB0(-0.5); setB1(1.2); setB2(0.8); setDgp("logit"); } },
    { name: t("labs.econ.logitprobit.presets.probitDgp.name"), description: t("labs.econ.logitprobit.presets.probitDgp.desc"), apply: () => { setN(500); setDgp("probit"); setB0(-0.3); setB1(1.0); setB2(0.6); } },
    { name: t("labs.econ.logitprobit.presets.rareEvent.name"), description: t("labs.econ.logitprobit.presets.rareEvent.desc"), apply: () => { setB0(-2.5); setB1(1.0); setB2(0.5); setN(800); } },
    { name: t("labs.econ.logitprobit.presets.smallSample.name"), description: t("labs.econ.logitprobit.presets.smallSample.desc"), apply: () => { setN(80); setB0(0); setB1(1.0); setB2(0.6); } },
  ];

  return (
    <div className="space-y-6">
      <PresetButtons presets={presets} />
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{t("labs.econ.logitprobit.dgpLabel")}</span>
        {(["logit", "probit"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDgp(d)}
            className={`px-2.5 py-1 text-[11px] font-mono rounded-md border transition-all ${
              dgp === d ? "border-gold/40 bg-gold/10 text-gold" : "border-border bg-secondary/50 text-muted-foreground hover:text-gold"
            }`}
          >
            {d === "logit" ? t("labs.econ.logitprobit.logisticLabel") : t("labs.econ.logitprobit.probitLabel")}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <Slider label={t("labs.econ.logitprobit.nLabel")} value={n} min={50} max={2000} step={10} onChange={setN} />
          <Slider label={t("labs.econ.logitprobit.b0Label")} value={b0} min={-3} max={3} step={0.05} onChange={setB0} />
          <Slider label={t("labs.econ.logitprobit.b1Label")} sub={t("labs.econ.logitprobit.continuousVar")} value={b1} min={-3} max={3} step={0.05} onChange={setB1} />
          <Slider label={t("labs.econ.logitprobit.b2Label")} sub={t("labs.econ.logitprobit.binaryVar")} value={b2} min={-3} max={3} step={0.05} onChange={setB2} />
          <Slider label={t("labs.econ.logitprobit.seedLabel")} value={seed} min={1} max={200} step={1} onChange={setSeed} />

          <div className="space-y-2 mt-4">
            <Stat label={t("labs.econ.logitprobit.y1Share")} value={(data.ybar * 100).toFixed(1) + "%"} color={CHART_TEAL} />
            <Stat label={t("labs.econ.logitprobit.logitPseudoR2")} value={data.r2L.toFixed(3)} color={CHART_GOLD} sub="McFadden" />
            <Stat label={t("labs.econ.logitprobit.probitPseudoR2")} value={data.r2P.toFixed(3)} color={CHART_BLUE} />
            <Stat label={t("labs.econ.logitprobit.logitAccuracy")} value={(data.accL * 100).toFixed(1) + "%"} color={CHART_GOLD} sub={t("labs.econ.logitprobit.threshold05")} />
            <Stat label={t("labs.econ.logitprobit.probitAccuracy")} value={(data.accP * 100).toFixed(1) + "%"} color={CHART_BLUE} />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Coefficient table */}
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">{t("labs.econ.logitprobit.coefTableTitle")}</p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-[11px] font-mono tabular-nums">
                <thead className="bg-secondary/40 text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">{t("labs.econ.logitprobit.paramCol")}</th>
                    <th className="text-right px-3 py-2">{t("labs.econ.logitprobit.trueValueCol")}</th>
                    <th className="text-right px-3 py-2 text-gold">Logit</th>
                    <th className="text-right px-3 py-2 text-gold">SE</th>
                    <th className="text-right px-3 py-2" style={{ color: CHART_BLUE }}>Probit</th>
                    <th className="text-right px-3 py-2" style={{ color: CHART_BLUE }}>SE</th>
                    <th className="text-right px-3 py-2 text-muted-foreground">LPM (OLS)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: t("labs.econ.logitprobit.beta0Row"), truth: b0, idx: 0 },
                    { name: t("labs.econ.logitprobit.beta1Row"), truth: b1, idx: 1 },
                    { name: t("labs.econ.logitprobit.beta2Row"), truth: b2, idx: 2 },
                  ].map((row) => (
                    <tr key={row.idx} className="border-t border-border/60">
                      <td className="px-3 py-2 text-foreground">{row.name}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{row.truth.toFixed(3)}</td>
                      <td className="px-3 py-2 text-right text-gold">{data.logit.beta[row.idx].toFixed(3)}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{data.logit.se[row.idx].toFixed(3)}</td>
                      <td className="px-3 py-2 text-right" style={{ color: CHART_BLUE }}>{data.probit.beta[row.idx].toFixed(3)}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{data.probit.se[row.idx].toFixed(3)}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{data.lpm[row.idx].toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
              {t("labs.econ.logitprobit.coefNote")}
            </p>
          </div>

          {/* Marginal effects */}
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">
              {t("labs.econ.logitprobit.marginalEffectsTitle")}
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-[11px] font-mono tabular-nums">
                <thead className="bg-secondary/40 text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">{t("labs.econ.logitprobit.variableCol")}</th>
                    <th className="text-right px-3 py-2 text-gold">Logit AME</th>
                    <th className="text-right px-3 py-2 text-gold">Logit MEM</th>
                    <th className="text-right px-3 py-2" style={{ color: CHART_BLUE }}>Probit AME</th>
                    <th className="text-right px-3 py-2" style={{ color: CHART_BLUE }}>Probit MEM</th>
                    <th className="text-right px-3 py-2 text-muted-foreground">LPM β̂</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border/60">
                    <td className="px-3 py-2">{t("labs.econ.logitprobit.x1Row")}</td>
                    <td className="px-3 py-2 text-right text-gold">{data.meLogit.ame1.toFixed(4)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{data.meLogit.mem1.toFixed(4)}</td>
                    <td className="px-3 py-2 text-right" style={{ color: CHART_BLUE }}>{data.meProbit.ame1.toFixed(4)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{data.meProbit.mem1.toFixed(4)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{data.lpm[1].toFixed(4)}</td>
                  </tr>
                  <tr className="border-t border-border/60">
                    <td className="px-3 py-2">{t("labs.econ.logitprobit.x2Row")}</td>
                    <td className="px-3 py-2 text-right text-gold">{data.meLogit.ame2.toFixed(4)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{data.meLogit.mem2.toFixed(4)}</td>
                    <td className="px-3 py-2 text-right" style={{ color: CHART_BLUE }}>{data.meProbit.ame2.toFixed(4)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{data.meProbit.mem2.toFixed(4)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{data.lpm[2].toFixed(4)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
              {t("labs.econ.logitprobit.marginalEffectsNote")}
            </p>
          </div>

          {/* Predicted probability curve */}
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-2">
              {t("labs.econ.logitprobit.predictedProbTitle")}
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.grid} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="x1" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} domain={[-0.05, 1.1]} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <ReferenceLine y={0} stroke={CHART_GRID} />
                <ReferenceLine y={1} stroke={CHART_GRID} />
                <Line type="monotone" dataKey="truth" stroke={CHART_TEXT} strokeDasharray="4 3" dot={false} name={t("labs.econ.logitprobit.truthLegend")} />
                <Line type="monotone" dataKey="logit" stroke={CHART_GOLD} strokeWidth={2} dot={false} name={t("labs.econ.logitprobit.logitPredLegend")} />
                <Line type="monotone" dataKey="probit" stroke={CHART_BLUE} strokeWidth={2} dot={false} name={t("labs.econ.logitprobit.probitPredLegend")} />
                <Line type="monotone" dataKey="lpm" stroke={CHART_RED} strokeDasharray="2 2" dot={false} name="LPM (OLS)" />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
              {t("labs.econ.logitprobit.predictedProbNote")}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gold/20 bg-gradient-to-br from-secondary/30 to-transparent p-4 md:p-5 text-[12px] leading-relaxed text-muted-foreground space-y-2">
        <p className="text-gold/90 font-mono uppercase tracking-[0.2em] text-[10px]">{t("labs.econ.logitprobit.keyTakeawaysTitle")}</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><span className="text-foreground">{t("labs.econ.logitprobit.takeaways.linkFnTitle")}</span> {t("labs.econ.logitprobit.takeaways.linkFnBody")}</li>
          <li><span className="text-foreground">{t("labs.econ.logitprobit.takeaways.whyNotOlsTitle")}</span> {t("labs.econ.logitprobit.takeaways.whyNotOlsBody")}</li>
          <li><span className="text-foreground">{t("labs.econ.logitprobit.takeaways.marginalTitle")}</span> {t("labs.econ.logitprobit.takeaways.marginalBody")}</li>
          <li><span className="text-foreground">{t("labs.econ.logitprobit.takeaways.mleTitle")}</span> {t("labs.econ.logitprobit.takeaways.mleBody")}</li>
          <li><span className="text-foreground">{t("labs.econ.logitprobit.takeaways.pseudoR2Title")}</span> {t("labs.econ.logitprobit.takeaways.pseudoR2Body")}</li>
        </ul>
      </div>
    </div>
  );
};

export default LogitProbitTool;
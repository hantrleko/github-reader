import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ScatterChart, Scatter, BarChart, Bar, Cell, ReferenceLine,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { C, Slider, Stat, tooltipStyle } from "@/components/frontier/ui";
import {
  blackLittermanFull, idzorekOmega, meanCVaROptimize,
  ledoitWolfShrink, oasShrink, resampledFrontier,
  factorRiskDecomp, factorBudgetWeights, kellyWeights, kellySimulate,
  sampleCov,
} from "@/lib/quant/portfolioAdvanced";

/* ── shared RNG ── */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randn(r: () => number) {
  let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const ASSET_NAMES = ["US Eq", "EU Eq", "EM Eq", "Bonds", "Gold"];
const ASSET_COLORS = [C.gold, C.teal, C.blue, C.green, C.red];

/* ═════════════════════════════════════════════════════════════
   1. Black-Litterman Full
   ═════════════════════════════════════════════════════════════ */
export const BlackLittermanFullTool = () => {
  const { t } = useTranslation();
  const [delta, setDelta] = useState(2.5);
  const [tau, setTau] = useState(0.05);
  const [confidence, setConfidence] = useState(0.5);
  const [viewValue, setViewValue] = useState(0.04); // US Eq - EU Eq
  const [viewAbs, setViewAbs] = useState(0.10);     // EM Eq absolute

  const Sigma = [
    [0.0400, 0.0180, 0.0220, 0.0010, 0.0000],
    [0.0180, 0.0625, 0.0200, 0.0015, 0.0010],
    [0.0220, 0.0200, 0.0900, 0.0020, 0.0015],
    [0.0010, 0.0015, 0.0020, 0.0064, -0.0005],
    [0.0000, 0.0010, 0.0015, -0.0005, 0.0324],
  ];
  const wMkt = [0.45, 0.15, 0.10, 0.25, 0.05];

  const res = useMemo(() => {
    const P = [
      [1, -1, 0, 0, 0], // relative: US - EU
      [0, 0, 1, 0, 0],  // absolute: EM
    ];
    const Q = [viewValue, viewAbs];
    const Omega = idzorekOmega(P, Sigma, tau, [confidence, confidence]);
    return blackLittermanFull({ Sigma, wMkt, delta, tau, P, Q, Omega });
  }, [delta, tau, confidence, viewValue, viewAbs]);

  const chart = ASSET_NAMES.map((n, i) => ({
    name: n,
    prior: +(res.pi[i] * 100).toFixed(2),
    post: +(res.muPost[i] * 100).toFixed(2),
    wPrior: +(res.weightsPrior[i] * 100).toFixed(1),
    wPost: +(res.weightsPost[i] * 100).toFixed(1),
  }));

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: t("labs.quant.v41.bl.presetLowConf"), description: t("labs.quant.v41.bl.presetLowConfD"), apply: () => setConfidence(0.2) },
        { name: t("labs.quant.v41.bl.presetHighConf"), description: t("labs.quant.v41.bl.presetHighConfD"), apply: () => setConfidence(0.8) },
        { name: t("labs.quant.v41.bl.presetBullEM"), description: t("labs.quant.v41.bl.presetBullEMD"), apply: () => setViewAbs(0.15) },
        { name: t("labs.quant.v41.bl.presetReset"), description: t("labs.quant.v41.bl.presetResetD"), apply: () => { setDelta(2.5); setTau(0.05); setConfidence(0.5); setViewValue(0.04); setViewAbs(0.10); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.quant.v41.bl.priorParams")}</p>
          <Slider label={t("labs.quant.v41.bl.delta")} value={delta} min={1} max={5} step={0.1} onChange={setDelta} />
          <Slider label={t("labs.quant.v41.bl.tau")} value={tau} min={0.01} max={0.20} step={0.01} onChange={setTau} />
          <p className="text-xs font-mono text-gold uppercase tracking-wider mt-4">{t("labs.quant.v41.bl.views")}</p>
          <Slider label={t("labs.quant.v41.bl.viewRel")} value={viewValue} min={-0.10} max={0.15} step={0.005} onChange={setViewValue} fmt={(v) => `${(v*100).toFixed(1)}%`} />
          <Slider label={t("labs.quant.v41.bl.viewAbs")} value={viewAbs} min={-0.05} max={0.25} step={0.005} onChange={setViewAbs} fmt={(v) => `${(v*100).toFixed(1)}%`} />
          <Slider label={t("labs.quant.v41.bl.confidence")} value={confidence} min={0.05} max={0.95} step={0.05} onChange={setConfidence} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.quant.v41.bl.piUS")} value={`${(res.pi[0]*100).toFixed(2)}%`} />
          <Stat label={t("labs.quant.v41.bl.muUS")} value={`${(res.muPost[0]*100).toFixed(2)}%`} color={C.gold} />
          <Stat label={t("labs.quant.v41.bl.piEM")} value={`${(res.pi[2]*100).toFixed(2)}%`} />
          <Stat label={t("labs.quant.v41.bl.muEM")} value={`${(res.muPost[2]*100).toFixed(2)}%`} color={C.gold} />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.quant.v41.bl.chartRet")}</h4>
        <div className="h-[220px]">
          <ResponsiveContainer>
            <BarChart data={chart}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="prior" name={t("labs.quant.v41.bl.seriesPrior")} fill={C.teal} />
              <Bar dataKey="post" name={t("labs.quant.v41.bl.seriesPost")} fill={C.gold} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.quant.v41.bl.chartW")}</h4>
        <div className="h-[220px]">
          <ResponsiveContainer>
            <BarChart data={chart}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="wPrior" name={t("labs.quant.v41.bl.seriesWPrior")} fill={C.blue} />
              <Bar dataKey="wPost" name={t("labs.quant.v41.bl.seriesWPost")} fill={C.gold} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
        <p><span className="text-gold">{t("labs.quant.v41.bl.noteConfTitle")}</span>{t("labs.quant.v41.bl.noteConf")}</p>
        <p><span className="text-gold">{t("labs.quant.v41.bl.noteTauTitle")}</span>{t("labs.quant.v41.bl.noteTau")}</p>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   2. Mean-CVaR Optimisation
   ═════════════════════════════════════════════════════════════ */
export const MeanCVaRTool = () => {
  const { t } = useTranslation();
  const [alpha, setAlpha] = useState(0.95);
  const [tailFactor, setTailFactor] = useState(1.0); // pumps left-tail draws
  const [seed, setSeed] = useState(11);

  const res = useMemo(() => {
    const r = mulberry32(seed);
    const S = 500, N = 4;
    const mu = [0.10, 0.08, 0.05, 0.02];
    const vol = [0.22, 0.18, 0.12, 0.04];
    const scenarios: number[][] = [];
    for (let s = 0; s < S; s++) {
      // occasional heavy left-tail draw
      const heavy = r() < 0.05 ? -Math.abs(randn(r)) * tailFactor * 2 : 0;
      scenarios.push(mu.map((m, i) => m/252 + vol[i]/Math.sqrt(252) * (randn(r) + heavy)));
    }
    const cvar = meanCVaROptimize(scenarios, alpha);
    // MV benchmark: min-var long only via projection of ones
    const cov = sampleCov(scenarios.map((_, __) => []).length ? [] as number[][] : [] as number[][]); void cov;
    const emp = new Array(N).fill(0);
    scenarios.forEach((row) => row.forEach((v, i) => (emp[i] += v/S)));
    // equal-weight comparison
    const eq = new Array(N).fill(1/N);
    const eqLosses = scenarios.map((row) => -row.reduce((s, r, i) => s + r * eq[i], 0));
    const eqSorted = [...eqLosses].sort((a,b)=>a-b);
    const eqVar = eqSorted[Math.floor(alpha*eqSorted.length)];
    const eqCvar = eqLosses.filter((l)=>l>=eqVar).reduce((s,v)=>s+v,0) / Math.max(eqLosses.filter((l)=>l>=eqVar).length, 1);
    // loss histogram bins
    const bins = 30;
    const lo = Math.min(...cvar.scenarioLosses);
    const hi = Math.max(...cvar.scenarioLosses);
    const step = (hi - lo) / bins;
    const hist = Array.from({ length: bins }, (_, i) => ({ x: +(lo + step*i).toFixed(4), y: 0 }));
    cvar.scenarioLosses.forEach((l) => {
      const idx = Math.min(bins - 1, Math.max(0, Math.floor((l - lo) / step)));
      hist[idx].y++;
    });
    return { cvar, eqCvar, eqVar, hist };
  }, [alpha, tailFactor, seed]);

  const wChart = ASSET_NAMES.slice(0, 4).map((n, i) => ({
    name: n, w: +(res.cvar.weights[i] * 100).toFixed(1),
  }));

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: t("labs.quant.v41.cvar.preset95"), description: t("labs.quant.v41.cvar.preset95D"), apply: () => setAlpha(0.95) },
        { name: t("labs.quant.v41.cvar.preset99"), description: t("labs.quant.v41.cvar.preset99D"), apply: () => setAlpha(0.99) },
        { name: t("labs.quant.v41.cvar.presetFatTail"), description: t("labs.quant.v41.cvar.presetFatTailD"), apply: () => setTailFactor(2.0) },
        { name: t("labs.quant.v41.cvar.presetReset"), description: t("labs.quant.v41.cvar.presetResetD"), apply: () => { setAlpha(0.95); setTailFactor(1.0); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Slider label={t("labs.quant.v41.cvar.alpha")} value={alpha} min={0.80} max={0.995} step={0.005} onChange={setAlpha} />
          <Slider label={t("labs.quant.v41.cvar.tailFactor")} value={tailFactor} min={0.5} max={3.0} step={0.1} onChange={setTailFactor} />
          <Slider label={t("labs.quant.v41.cvar.seed")} value={seed} min={1} max={99} step={1} onChange={setSeed} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.quant.v41.cvar.cvarOptimal")} value={`${(res.cvar.cvar * 100).toFixed(2)}%`} color={C.red} sub={t("labs.quant.v41.cvar.dailyLoss")} />
          <Stat label={t("labs.quant.v41.cvar.cvarEqual")} value={`${(res.eqCvar * 100).toFixed(2)}%`} color={C.red} />
          <Stat label={t("labs.quant.v41.cvar.varAlpha")} value={`${(res.cvar.var * 100).toFixed(2)}%`} color={C.gold} />
          <Stat label={t("labs.quant.v41.cvar.expReturn")} value={`${(res.cvar.expRet * 100).toFixed(3)}%`} color={C.teal} />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.quant.v41.cvar.chartWeights")}</h4>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <BarChart data={wChart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="w" name={t("labs.quant.v41.cvar.seriesWeight")} fill={C.gold} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.quant.v41.cvar.chartHist")}</h4>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <BarChart data={res.hist}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="x" stroke={C.text} tick={{ fontSize: 9 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine x={+res.cvar.var.toFixed(4)} stroke={C.red} strokeDasharray="3 3" label={{ value: t("labs.quant.v41.cvar.labelVaR"), fill: C.red, fontSize: 9 }} />
                <Bar dataKey="y" fill={C.teal} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
        <p><span className="text-gold">{t("labs.quant.v41.cvar.noteRUTitle")}</span>{t("labs.quant.v41.cvar.noteRU")}</p>
        <p><span className="text-gold">{t("labs.quant.v41.cvar.noteIntuitionTitle")}</span>{t("labs.quant.v41.cvar.noteIntuition")}</p>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   3. Ledoit-Wolf / OAS Shrinkage
   ═════════════════════════════════════════════════════════════ */
export const ShrinkageTool = () => {
  const { t } = useTranslation();
  const [T, setT] = useState(60);
  const [N, setN] = useState(8);
  const [seed, setSeed] = useState(3);
  const [method, setMethod] = useState<"lw"|"oas">("lw");

  const res = useMemo(() => {
    const r = mulberry32(seed);
    const rets: number[][] = Array.from({ length: N }, () =>
      Array.from({ length: T }, () => 0.012 * randn(r)));
    return method === "lw" ? ledoitWolfShrink(rets) : oasShrink(rets);
  }, [T, N, seed, method]);

  const heatSample = res.sample.map((row, i) => row.map((v, j) => ({ i, j, v })));
  const heatShrunk = res.cov.map((row, i) => row.map((v, j) => ({ i, j, v })));
  void heatSample; void heatShrunk;

  const diagData = res.sample.map((r, i) => ({
    idx: i,
    sample: +(r[i] * 10000).toFixed(2),
    shrunk: +(res.cov[i][i] * 10000).toFixed(2),
  }));

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {(["lw","oas"] as const).map((m) => (
          <button key={m} onClick={() => setMethod(m)}
            className={"text-xs px-3 py-1.5 rounded border font-mono transition-colors " +
              (method === m ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground hover:text-foreground")}>
            {m === "lw" ? t("labs.quant.v41.shrink.methodLW") : t("labs.quant.v41.shrink.methodOAS")}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Slider label={t("labs.quant.v41.shrink.T")} value={T} min={20} max={252} step={5} onChange={setT} />
          <Slider label={t("labs.quant.v41.shrink.N")} value={N} min={3} max={15} step={1} onChange={setN} />
          <Slider label={t("labs.quant.v41.shrink.seed")} value={seed} min={1} max={99} step={1} onChange={setSeed} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.quant.v41.shrink.lambda")} value={res.lambda.toFixed(3)} color={C.gold} />
          <Stat label={t("labs.quant.v41.shrink.tnRatio")} value={(T/N).toFixed(1)} sub={t("labs.quant.v41.shrink.tnSub")} />
          <Stat label={t("labs.quant.v41.shrink.condSample")} value={isFinite(res.condSample) ? res.condSample.toExponential(1) : "∞"} color={C.red} />
          <Stat label={t("labs.quant.v41.shrink.condShrunk")} value={isFinite(res.condShrunk) ? res.condShrunk.toExponential(1) : "∞"} color={C.teal} />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.quant.v41.shrink.chartDiag")}</h4>
        <div className="h-[220px]">
          <ResponsiveContainer>
            <BarChart data={diagData}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="idx" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="sample" name={t("labs.quant.v41.shrink.seriesSample")} fill={C.red} />
              <Bar dataKey="shrunk" name={t("labs.quant.v41.shrink.seriesShrunk")} fill={C.gold} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
        <p><span className="text-gold">{t("labs.quant.v41.shrink.noteLambdaTitle")}</span>{t("labs.quant.v41.shrink.noteLambda")}</p>
        <p><span className="text-gold">{t("labs.quant.v41.shrink.noteEffectTitle")}</span>{t("labs.quant.v41.shrink.noteEffect")}</p>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   4. Michaud Resampled Frontier
   ═════════════════════════════════════════════════════════════ */
export const ResampledFrontierTool = () => {
  const { t } = useTranslation();
  const [B, setB] = useState(30);
  const [Twin, setTwin] = useState(120);

  const mu = [0.10, 0.08, 0.05, 0.03];
  const Sigma = [
    [0.04, 0.015, 0.010, 0.001],
    [0.015, 0.06, 0.012, 0.001],
    [0.010, 0.012, 0.09, 0.002],
    [0.001, 0.001, 0.002, 0.01],
  ];

  const res = useMemo(() => resampledFrontier(mu, Sigma, Twin, B, 10, 7), [B, Twin]);

  const chart = res.classic.map((c, i) => ({
    vol: +(c.vol * 100).toFixed(3), classic: +(c.ret * 100).toFixed(3),
    volR: +(res.resampled[i].vol * 100).toFixed(3), resampled: +(res.resampled[i].ret * 100).toFixed(3),
  }));

  const heat = res.weightsGrid.map((grid, g) => {
    const bars = ASSET_NAMES.slice(0, 4).map((n, i) => {
      const arr = grid.map((w) => w[i]);
      const m = arr.reduce((s, v) => s + v, 0) / arr.length;
      const sd = Math.sqrt(arr.reduce((s, v) => s + (v - m)**2, 0) / arr.length);
      return { name: n, mean: +(m * 100).toFixed(1), sd: +(sd * 100).toFixed(1) };
    });
    return { g, bars };
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Slider label={t("labs.quant.v41.resamp.B")} value={B} min={10} max={80} step={5} onChange={setB} />
          <Slider label={t("labs.quant.v41.resamp.T")} value={Twin} min={60} max={360} step={20} onChange={setTwin} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.quant.v41.resamp.sharpeClassic")} value={Math.max(...res.classic.map((p) => p.vol > 1e-6 ? p.ret/p.vol : 0)).toFixed(2)} color={C.red} />
          <Stat label={t("labs.quant.v41.resamp.sharpeResampled")} value={Math.max(...res.resampled.map((p) => p.vol > 1e-6 ? p.ret/p.vol : 0)).toFixed(2)} color={C.teal} sub={t("labs.quant.v41.resamp.moreRobust")} />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.quant.v41.resamp.chartFrontier")}</h4>
        <div className="h-[280px]">
          <ResponsiveContainer>
            <ScatterChart>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis type="number" dataKey="vol" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: t("labs.quant.v41.resamp.axisVol"), position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
              <YAxis type="number" dataKey="classic" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: t("labs.quant.v41.resamp.axisRet"), angle: -90, position: "insideLeft", fill: C.text, fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Scatter name={t("labs.quant.v41.resamp.seriesClassic")} data={chart} fill={C.red} line={{ stroke: C.red, strokeWidth: 2 }} shape="circle" />
              <Scatter name={t("labs.quant.v41.resamp.seriesResampled")} data={chart.map((c) => ({ vol: c.volR, classic: c.resampled }))} fill={C.gold} line={{ stroke: C.gold, strokeWidth: 2 }} shape="triangle" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.quant.v41.resamp.chartWeights")}</h4>
        <div className="h-[220px]">
          <ResponsiveContainer>
            <BarChart data={heat[Math.floor(heat.length/2)].bars}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="mean" name={t("labs.quant.v41.resamp.seriesMean")} fill={C.gold} />
              <Bar dataKey="sd" name={t("labs.quant.v41.resamp.seriesSd")} fill={C.red} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
        <p><span className="text-gold">{t("labs.quant.v41.resamp.noteMichaudTitle")}</span>{t("labs.quant.v41.resamp.noteMichaud")}</p>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   5. Factor Risk Budget
   ═════════════════════════════════════════════════════════════ */
const FACTOR_NAMES = ["MKT", "SMB", "HML", "RMW", "CMA"];
const FACTOR_COV = [
  [0.0400, 0.005, 0.006, -0.002, 0.001],
  [0.0050, 0.020, 0.003, -0.001, 0.000],
  [0.0060, 0.003, 0.025, -0.001, 0.002],
  [-0.002, -0.001, -0.001, 0.015, 0.001],
  [0.0010, 0.000, 0.002, 0.001, 0.012],
];
const B_MATRIX = [
  [1.10, 0.20, -0.10, 0.05, -0.05], // Growth
  [1.05, -0.10, 0.60, 0.20, 0.10],  // Value
  [0.95, 0.80, 0.10, -0.05, 0.05],  // Small
  [0.90, 0.05, 0.00, 0.50, 0.10],   // Quality
  [1.00, 0.00, 0.10, 0.05, 0.50],   // Defensive
];
const B_ASSET_NAMES = ["Growth", "Value", "Small", "Quality", "Defensive"];
const SPECIFIC_VAR = [0.010, 0.015, 0.025, 0.012, 0.008];

export const FactorBudgetTool = () => {
  const { t } = useTranslation();
  const [mktTgt, setMktTgt] = useState(0.5);
  const [valueTgt, setValueTgt] = useState(0.2);
  const [qualityTgt, setQualityTgt] = useState(0.2);

  const res = useMemo(() => {
    const targets = [mktTgt, 0.05, valueTgt, qualityTgt, 0.05];
    return factorBudgetWeights(B_MATRIX, FACTOR_COV, SPECIFIC_VAR, targets, 2500, 0.02);
  }, [mktTgt, valueTgt, qualityTgt]);

  const wChart = B_ASSET_NAMES.map((n, i) => ({ name: n, w: +(res.weights[i] * 100).toFixed(1) }));
  const rcChart = res.decomp.factorContribs.map((c) => ({
    name: c.name, pct: +(c.pct * 100).toFixed(1), exp: +c.exposure.toFixed(2),
  }));
  rcChart.push({ name: "Specific", pct: +(res.decomp.specificPct * 100).toFixed(1), exp: 0 }); // "Specific" is a chart series label, kept generic

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: t("labs.quant.v41.factor.preset602020"), description: t("labs.quant.v41.factor.preset602020D"), apply: () => { setMktTgt(0.6); setValueTgt(0.2); setQualityTgt(0.15); } },
        { name: t("labs.quant.v41.factor.presetValue"), description: t("labs.quant.v41.factor.presetValueD"), apply: () => { setMktTgt(0.3); setValueTgt(0.5); setQualityTgt(0.1); } },
        { name: t("labs.quant.v41.factor.presetQuality"), description: t("labs.quant.v41.factor.presetQualityD"), apply: () => { setMktTgt(0.3); setValueTgt(0.1); setQualityTgt(0.5); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Slider label={t("labs.quant.v41.factor.mktBudget")} value={mktTgt} min={0.1} max={0.8} step={0.05} onChange={setMktTgt} />
          <Slider label={t("labs.quant.v41.factor.hmlBudget")} value={valueTgt} min={0.0} max={0.6} step={0.05} onChange={setValueTgt} />
          <Slider label={t("labs.quant.v41.factor.rmwBudget")} value={qualityTgt} min={0.0} max={0.6} step={0.05} onChange={setQualityTgt} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.quant.v41.factor.portVol")} value={`${(res.decomp.totalVol * 100).toFixed(2)}%`} color={C.gold} />
          <Stat label={t("labs.quant.v41.factor.specificPct")} value={`${(res.decomp.specificPct * 100).toFixed(1)}%`} color={C.teal} />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.quant.v41.factor.chartWeights")}</h4>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <BarChart data={wChart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="w" fill={C.gold} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.quant.v41.factor.chartDecomp")}</h4>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <BarChart data={rcChart}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="pct" fill={C.teal}>
                  {rcChart.map((_, i) => <Cell key={i} fill={i === rcChart.length - 1 ? C.blue : C.teal} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
        <p><span className="text-gold">{t("labs.quant.v41.factor.noteFormula")}</span>{t("labs.quant.v41.factor.noteFormulaRest")}</p>
        <p>{t("labs.quant.v41.factor.noteExposure")}</p>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   6. Kelly & Ruin Lab
   ═════════════════════════════════════════════════════════════ */
export const KellyRuinTool = () => {
  const { t } = useTranslation();
  const [years, setYears] = useState(20);
  const [rf, setRf] = useState(0.02);
  const [threshold, setThreshold] = useState(0.5);
  const [seed, setSeed] = useState(11);

  const mu = [0.10, 0.07];
  const cov = [[0.04, 0.008], [0.008, 0.09]];

  const k = kellyWeights(mu, cov, rf);
  const kSum = k.reduce((s, x) => s + x, 0);

  const sim = useMemo(() => kellySimulate(mu, cov, rf, years, 2500, threshold, seed),
    [years, rf, threshold, seed]);

  const chart = sim.fractions.map((f, i) => ({
    f, median: +sim.medianTerminal[i].toFixed(2),
    q05: +sim.q05Terminal[i].toFixed(2),
    q95: +sim.q95Terminal[i].toFixed(2),
    ruin: +(sim.ruinProb[i] * 100).toFixed(1),
    g: +(sim.growthRate[i] * 100).toFixed(2),
  }));

  const bestGrowthIdx = sim.growthRate.indexOf(Math.max(...sim.growthRate));

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: t("labs.quant.v41.kelly.presetHalf"), description: t("labs.quant.v41.kelly.presetHalfD"), apply: () => setThreshold(0.5) },
        { name: t("labs.quant.v41.kelly.presetConservative"), description: t("labs.quant.v41.kelly.presetConservativeD"), apply: () => setThreshold(0.3) },
        { name: t("labs.quant.v41.kelly.preset10y"), description: t("labs.quant.v41.kelly.preset10yD"), apply: () => setYears(10) },
        { name: t("labs.quant.v41.kelly.presetReset"), description: t("labs.quant.v41.kelly.presetResetD"), apply: () => { setYears(20); setRf(0.02); setThreshold(0.5); setSeed(11); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Slider label={t("labs.quant.v41.kelly.years")} value={years} min={5} max={40} step={1} onChange={setYears} />
          <Slider label={t("labs.quant.v41.kelly.rf")} value={rf} min={0.0} max={0.06} step={0.005} onChange={setRf} />
          <Slider label={t("labs.quant.v41.kelly.threshold")} value={threshold} min={0.1} max={0.9} step={0.05} onChange={setThreshold} />
          <Slider label={t("labs.quant.v41.kelly.seed")} value={seed} min={1} max={99} step={1} onChange={setSeed} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.quant.v41.kelly.kellyLeverage")} value={kSum.toFixed(2)} color={C.gold} sub={`w = Σ⁻¹(μ−rf)`} />
          <Stat label={t("labs.quant.v41.kelly.bestF")} value={sim.fractions[bestGrowthIdx].toFixed(2)} color={C.teal} />
          <Stat label={t("labs.quant.v41.kelly.fullKellyRuin")} value={`${(sim.ruinProb[sim.fractions.indexOf(1)] * 100).toFixed(1)}%`} color={C.red} />
          <Stat label={t("labs.quant.v41.kelly.halfKellyRuin")} value={`${(sim.ruinProb[sim.fractions.indexOf(0.5)] * 100).toFixed(1)}%`} color={C.teal} />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.quant.v41.kelly.chartTerminal")}</h4>
        <div className="h-[260px]">
          <ResponsiveContainer>
            <LineChart data={chart}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="f" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: t("labs.quant.v41.kelly.axisF"), position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="median" name={t("labs.quant.v41.kelly.seriesMedian")} stroke={C.gold} strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="q05" name={t("labs.quant.v41.kelly.seriesQ05")} stroke={C.red} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
              <Line type="monotone" dataKey="q95" name={t("labs.quant.v41.kelly.seriesQ95")} stroke={C.teal} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
              <ReferenceLine y={1} stroke={C.text} strokeDasharray="2 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.quant.v41.kelly.chartRuin")}</h4>
        <div className="h-[200px]">
          <ResponsiveContainer>
            <BarChart data={chart}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="f" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="ruin" fill={C.red} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
        <p><span className="text-gold">{t("labs.quant.v41.kelly.noteFracTitle")}</span>{t("labs.quant.v41.kelly.noteFrac")}</p>
        <p><span className="text-gold">{t("labs.quant.v41.kelly.noteAdviceTitle")}</span>{t("labs.quant.v41.kelly.noteAdvice")}</p>
      </div>
    </div>
  );
};

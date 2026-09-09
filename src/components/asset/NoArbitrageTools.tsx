import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { AssetChrome, CHART, mulberry32, randn } from "./AssetChrome";
import {
  statePrices, sdfFromFactorPremia, evaluateFactorModel,
} from "@/lib/quant/assetPricingAdvanced";

const { GOLD, TEAL, RED, BLUE, GRID, TEXT } = CHART;
const { Slider, Stat, Note, ChartCard } = AssetChrome;

const numCls =
  "w-full bg-secondary/60 border border-border rounded px-2 py-1 text-xs font-mono tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-gold";

/* ════════════════════════════════════════════════════════════
   12. State prices, risk-neutral measure & completeness
   ════════════════════════════════════════════════════════════ */
export const StatePriceTool = () => {
  const { t } = useTranslation();
  const [nStates, setNStates] = useState(3);
  const [payoff, setPayoff] = useState<number[][]>([
    [1, 1, 1],
    [3, 2, 0.5],
    [0, 1.5, 2.5],
  ]);
  const [price, setPrice] = useState<number[]>([0.96, 1.6, 1.2]);
  const [prob, setProb] = useState<number[]>([0.3, 0.45, 0.25]);
  const [target, setTarget] = useState<number[]>([1, 0, 0]);
  const [nAssets, setNAssets] = useState(3);

  const res = useMemo(() => {
    const P = payoff.slice(0, nAssets).map((r) => r.slice(0, nStates));
    const pr = prob.slice(0, nStates);
    const total = pr.reduce((a, b) => a + b, 0) || 1;
    return statePrices({
      payoff: P,
      price: price.slice(0, nAssets),
      prob: pr.map((v) => v / total),
      target: target.slice(0, nStates),
    });
  }, [payoff, price, prob, target, nAssets, nStates]);

  const setCell = (i: number, j: number, v: number) =>
    setPayoff((p) => p.map((row, ri) => (ri === i ? row.map((c, ci) => (ci === j ? v : c)) : row)));

  const chartData = res.q
    ? res.q.map((q, s) => ({
        state: `s${s + 1}`,
        q: +q.toFixed(4),
        pi: +(prob[s] / (prob.slice(0, nStates).reduce((a, b) => a + b, 0) || 1)).toFixed(4),
        qn: +(res.qRiskNeutral?.[s] ?? 0).toFixed(4),
        SDF: +(res.m?.[s] ?? 0).toFixed(4),
      }))
    : [];

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.ap.stateprice.p1"), description: t("labs.ap.stateprice.p1d"), apply: () => { setNAssets(3); setNStates(3); setPayoff([[1,1,1],[3,2,0.5],[0,1.5,2.5]]); setPrice([0.96,1.6,1.2]); } },
        { name: t("labs.ap.stateprice.p2"), description: t("labs.ap.stateprice.p2d"), apply: () => { setNAssets(2); setNStates(3); setPrice([0.96,1.6,1.2]); } },
        { name: t("labs.ap.stateprice.p3"), description: t("labs.ap.stateprice.p3d"), apply: () => { setNAssets(2); setNStates(2); setPayoff([[1,1,1],[2,2,2],[0,1.5,2.5]]); setPrice([1.0,1.0,1.2]); } },
        { name: t("labs.ap.stateprice.p4"), description: t("labs.ap.stateprice.p4d"), apply: () => setTarget([1,0,0]) },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label={t("labs.ap.stateprice.nAssets")} value={nAssets} min={1} max={3} step={1} onChange={(v) => setNAssets(Math.round(v))} />
          <Slider label={t("labs.ap.stateprice.nStates")} value={nStates} min={2} max={3} step={1} onChange={(v) => setNStates(Math.round(v))} />
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left py-1">{t("labs.ap.stateprice.tblAsset")}</th>
                  {Array.from({ length: nStates }, (_, s) => <th key={s} className="px-1">s{s + 1}</th>)}
                  <th className="px-1 text-gold">{t("labs.ap.stateprice.tblPrice")}</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: nAssets }, (_, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-2 text-secondary-foreground">{i === 0 ? t("labs.ap.stateprice.bond") : t("labs.ap.stateprice.assetI", { i: i + 1 })}</td>
                    {Array.from({ length: nStates }, (_, j) => (
                      <td key={j} className="px-1">
                        <input type="number" step="0.1" className={numCls} value={payoff[i][j]}
                          onChange={(e) => setCell(i, j, +e.target.value)} />
                      </td>
                    ))}
                    <td className="px-1">
                      <input type="number" step="0.01" className={numCls} value={price[i]}
                        onChange={(e) => setPrice((p) => p.map((v, k) => (k === i ? +e.target.value : v)))} />
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="py-1 pr-2 text-secondary-foreground">{t("labs.ap.stateprice.probRow")}</td>
                  {Array.from({ length: nStates }, (_, j) => (
                    <td key={j} className="px-1">
                      <input type="number" step="0.05" className={numCls} value={prob[j]}
                        onChange={(e) => setProb((p) => p.map((v, k) => (k === j ? +e.target.value : v)))} />
                    </td>
                  ))}
                  <td />
                </tr>
                <tr>
                  <td className="py-1 pr-2 text-secondary-foreground">{t("labs.ap.stateprice.targetRow")}</td>
                  {Array.from({ length: nStates }, (_, j) => (
                    <td key={j} className="px-1">
                      <input type="number" step="0.5" className={numCls} value={target[j]}
                        onChange={(e) => setTarget((p) => p.map((v, k) => (k === j ? +e.target.value : v)))} />
                    </td>
                  ))}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.ap.stateprice.arbFree")} value={res.arbitrageFree ? t("labs.ap.stateprice.yes") : t("labs.ap.stateprice.noArb")} color={res.arbitrageFree ? TEAL : RED} />
          <Stat label={t("labs.ap.stateprice.complete")} value={res.complete ? t("labs.ap.stateprice.isComplete") : t("labs.ap.stateprice.incomplete")} color={res.complete ? TEAL : GOLD} />
          <Stat label={t("labs.ap.stateprice.rfGross")} value={res.rfGross ? res.rfGross.toFixed(4) : "—"} sub={res.rfGross ? `Rf = ${((res.rfGross - 1) * 100).toFixed(2)}%` : ""} />
          <Stat label={t("labs.ap.stateprice.vertices")} value={String(res.vertices.length)} color={BLUE} sub={t("labs.ap.stateprice.verticesSub")} />
          <Stat label={t("labs.ap.stateprice.lower")} value={res.targetBounds ? res.targetBounds.lower.toFixed(4) : "—"} color={BLUE} />
          <Stat label={t("labs.ap.stateprice.upper")} value={res.targetBounds ? res.targetBounds.upper.toFixed(4) : "—"} color={GOLD} />
        </div>
      </div>

      {res.q && (
        <ChartCard title={t("labs.ap.stateprice.chart")} hint={t("labs.ap.stateprice.chartHint")}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis dataKey="state" stroke={TEXT} tick={{ fontSize: 11 }} />
              <YAxis stroke={TEXT} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="q" name={t("labs.ap.stateprice.qSeries")} fill={GOLD} />
              <Bar dataKey="pi" name={t("labs.ap.stateprice.pSeries")} fill={TEAL} />
              <Bar dataKey="qn" name={t("labs.ap.stateprice.qnSeries")} fill={BLUE} />
              <Bar dataKey="SDF" fill={RED} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <Note>
        <p>{res.note}</p>
        <p>{t("labs.ap.stateprice.n1")}</p>
        <p>{t("labs.ap.stateprice.n2")}</p>
      </Note>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   13. SDF ⇄ 线性因子模型的等价
   ════════════════════════════════════════════════════════════ */
export const SdfFactorDualityTool = () => {
  const { t } = useTranslation();
  const [rf, setRf] = useState(3);
  const [lamMkt, setLamMkt] = useState(6);
  const [lamSmb, setLamSmb] = useState(2.5);
  const [volMkt, setVolMkt] = useState(18);
  const [volSmb, setVolSmb] = useState(11);
  const [corr, setCorr] = useState(0.15);
  const [betaMkt, setBetaMkt] = useState(1.1);
  const [betaSmb, setBetaSmb] = useState(0.6);

  const res = useMemo(() => {
    const sm = (volMkt / 100) * (volSmb / 100) * corr;
    const Sigma = [
      [(volMkt / 100) ** 2, sm],
      [sm, (volSmb / 100) ** 2],
    ];
    const r = sdfFromFactorPremia([lamMkt / 100, lamSmb / 100], Sigma, rf / 100);
    const betaPremium = (betaMkt * lamMkt + betaSmb * lamSmb) / 100;
    // same premium recovered through the SDF covariance representation
    const covWithFactors = [
      betaMkt * Sigma[0][0] + betaSmb * Sigma[1][0],
      betaMkt * Sigma[0][1] + betaSmb * Sigma[1][1],
    ];
    const covM = -(r.b[0] * covWithFactors[0] + r.b[1] * covWithFactors[1]) * r.eM;
    const sdfPremium = -covM / r.eM;
    return { ...r, Sigma, betaPremium, sdfPremium, covM };
  }, [rf, lamMkt, lamSmb, volMkt, volSmb, corr, betaMkt, betaSmb]);

  const data = [
    { name: t("labs.ap.duality.betaRep"), premium: +(res.betaPremium * 100).toFixed(3) },
    { name: t("labs.ap.duality.sdfRep"), premium: +(res.sdfPremium * 100).toFixed(3) },
  ];

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.ap.duality.p1"), description: t("labs.ap.duality.p1d"), apply: () => { setLamMkt(6); setLamSmb(2.5); setVolMkt(18); setVolSmb(11); setCorr(0.15); } },
        { name: t("labs.ap.duality.p2"), description: t("labs.ap.duality.p2d"), apply: () => { setLamSmb(0); setBetaSmb(0); } },
        { name: t("labs.ap.duality.p3"), description: t("labs.ap.duality.p3d"), apply: () => setCorr(0.7) },
        { name: t("labs.ap.duality.p4"), description: t("labs.ap.duality.p4d"), apply: () => { setBetaMkt(1.4); setBetaSmb(1.2); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.ap.duality.momentsHead")}</p>
          <Slider label={t("labs.ap.duality.rf")} value={rf} min={0} max={8} step={0.25} onChange={setRf} />
          <Slider label={t("labs.ap.duality.lamMkt")} value={lamMkt} min={0} max={12} step={0.25} onChange={setLamMkt} />
          <Slider label={t("labs.ap.duality.lamSmb")} value={lamSmb} min={-3} max={8} step={0.25} onChange={setLamSmb} />
          <Slider label="σ(MKT) (%)" value={volMkt} min={8} max={30} step={0.5} onChange={setVolMkt} />
          <Slider label="σ(SMB) (%)" value={volSmb} min={4} max={25} step={0.5} onChange={setVolSmb} />
          <Slider label={t("labs.ap.duality.corr")} value={corr} min={-0.9} max={0.9} step={0.05} onChange={setCorr} />
          <p className="text-xs font-mono text-gold uppercase tracking-wider pt-2">{t("labs.ap.duality.loadHead")}</p>
          <Slider label="β_MKT" value={betaMkt} min={0} max={2} step={0.05} onChange={setBetaMkt} />
          <Slider label="β_SMB" value={betaSmb} min={-1} max={2} step={0.05} onChange={setBetaSmb} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="E[m]" value={res.eM.toFixed(4)} color={TEAL} sub="= 1/(1+Rf)" />
          <Stat label="b₁ (MKT)" value={res.b[0].toFixed(3)} color={BLUE} />
          <Stat label="b₂ (SMB)" value={res.b[1].toFixed(3)} color={BLUE} />
          <Stat label="σ(m)" value={res.volM.toFixed(4)} color={GOLD} />
          <Stat label={t("labs.ap.duality.maxSharpe")} value={res.maxSharpe.toFixed(3)} color={RED} sub={t("labs.ap.duality.maxSharpeSub")} />
          <Stat label="cov(m, Rᵉ)" value={res.covM.toFixed(5)} sub={t("labs.ap.duality.covSub")} />
        </div>
      </div>

      <ChartCard title={t("labs.ap.duality.chart")} hint={t("labs.ap.duality.chartHint")}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 60 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis type="number" stroke={TEXT} tick={{ fontSize: 11 }} unit="%" />
            <YAxis type="category" dataKey="name" stroke={TEXT} tick={{ fontSize: 10 }} width={200} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 12 }} />
            <Bar dataKey="premium" name={t("labs.ap.duality.premium")} fill={GOLD} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <Note>
        <p>{t("labs.ap.duality.n1")}</p>
        <p>{t("labs.ap.duality.n2")}</p>
      </Note>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   14. HJ 距离与定价误差评价
   ════════════════════════════════════════════════════════════ */
export const HJDistanceTool = () => {
  const { t } = useTranslation();
  const [T, setT] = useState(360);
  const [alphaSize, setAlphaSize] = useState(0.15);
  const [valueLoad, setValueLoad] = useState(0.5);
  const [seed, setSeed] = useState(7);

  const models = useMemo(() => {
    const rng = mulberry32(seed);
    const N = 6;
    const mkt: number[] = [];
    const hml: number[] = [];
    const rmw: number[] = [];
    const excess: number[][] = [];
    const betaM = [0.8, 0.95, 1.0, 1.1, 1.2, 1.35];
    const betaH = [-0.4, -0.1, 0.1, 0.3, 0.6, 0.9];
    const betaR = [0.2, 0.1, 0.0, -0.1, -0.2, -0.3];
    for (let t = 0; t < T; t++) {
      const m = 0.5 + 4.2 * randn(rng);
      const h = 0.25 + 2.8 * randn(rng);
      const r = 0.2 + 2.2 * randn(rng);
      mkt.push(m); hml.push(h); rmw.push(r);
      excess.push(
        betaM.map((bm, i) =>
          alphaSize * (i - (N - 1) / 2) +
          bm * m + valueLoad * betaH[i] * h + betaR[i] * r + 1.4 * randn(rng),
        ),
      );
    }
    const F1 = mkt.map((v) => [v]);
    const F3 = mkt.map((v, t) => [v, hml[t]]);
    const F5 = mkt.map((v, t) => [v, hml[t], rmw[t]]);
    return [
      evaluateFactorModel("CAPM (MKT)", excess, F1),
      evaluateFactorModel("FF (MKT+HML)", excess, F3),
      evaluateFactorModel("FF (MKT+HML+RMW)", excess, F5),
    ];
  }, [T, alphaSize, valueLoad, seed]);

  const chartData = models.map((m) => ({
    name: m.name,
    hj: +m.hjDistance.toFixed(4),
    absAlpha: +m.meanAbsAlpha.toFixed(3),
    crossR2: +m.crossR2.toFixed(3),
  }));
  const best = models.reduce((a, b) => (b.hjDistance < a.hjDistance ? b : a));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.ap.hjdist.p1"), description: t("labs.ap.hjdist.p1d"), apply: () => { setAlphaSize(0); setValueLoad(0.6); } },
        { name: t("labs.ap.hjdist.p2"), description: t("labs.ap.hjdist.p2d"), apply: () => { setValueLoad(1.2); setAlphaSize(0.1); } },
        { name: t("labs.ap.hjdist.p3"), description: t("labs.ap.hjdist.p3d"), apply: () => setAlphaSize(0.5) },
        { name: t("labs.ap.hjdist.p4"), description: t("labs.ap.hjdist.p4d"), apply: () => setT(120) },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label={t("labs.ap.hjdist.T")} value={T} min={120} max={720} step={12} onChange={(v) => setT(Math.round(v))} />
          <Slider label={t("labs.ap.hjdist.alpha")} value={alphaSize} min={0} max={0.6} step={0.01} onChange={setAlphaSize} />
          <Slider label={t("labs.ap.hjdist.load")} value={valueLoad} min={0} max={1.5} step={0.05} onChange={setValueLoad} />
          <Slider label={t("labs.ap.hjdist.seed")} value={seed} min={1} max={40} step={1} onChange={(v) => setSeed(Math.round(v))} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.ap.hjdist.best")} value={best.name} color={GOLD} />
          <Stat label={t("labs.ap.hjdist.bestDist")} value={best.hjDistance.toFixed(4)} color={TEAL} sub="δ = √(α′E[RR′]⁻¹α)" />
          <Stat label={t("labs.ap.hjdist.meanAbsAlpha")} value={`${best.meanAbsAlpha.toFixed(3)}%`} color={BLUE} />
          <Stat label={t("labs.ap.hjdist.crossR2")} value={best.crossR2.toFixed(3)} color={RED} />
        </div>
      </div>

      <ChartCard title={t("labs.ap.hjdist.chart")} hint={t("labs.ap.hjdist.chartHint")}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke={TEXT} tick={{ fontSize: 10 }} />
            <YAxis stroke={TEXT} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="hj" name={t("labs.ap.hjdist.hjSeries")} fill={GOLD} />
            <Bar dataKey="absAlpha" name={t("labs.ap.hjdist.alphaSeries")} fill={TEAL} />
            <Bar dataKey="crossR2" name={t("labs.ap.hjdist.r2Series")} fill={BLUE} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={t("labs.ap.hjdist.chart2")} hint={t("labs.ap.hjdist.chart2Hint")}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={best.alphas.map((a, i) => ({ port: `P${i + 1}`, α: +a.toFixed(3) }))}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="port" stroke={TEXT} tick={{ fontSize: 11 }} />
            <YAxis stroke={TEXT} tick={{ fontSize: 11 }} unit="%" />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 12 }} />
            <Bar dataKey="α">
              {best.alphas.map((a, i) => <Cell key={i} fill={a >= 0 ? TEAL : RED} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <Note>
        <p>{t("labs.ap.hjdist.n1")}</p>
        <p>{t("labs.ap.hjdist.n2")}</p>
      </Note>
    </div>
  );
};
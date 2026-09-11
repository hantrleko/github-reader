import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, ScatterChart, Scatter, ReferenceLine, ComposedChart, Area, Cell,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { C, Slider, Stat, tooltipStyle } from "../frontier/ui";
import {
  frontierGeometry, singleIndexLab, estimationErrorLab, constraintRebalanceLab,
  activeManagementLab, downsideRiskLab, dynamicAllocationLab, regularizationLab,
} from "@/lib/quant/portfolioFrontier";

const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;

const Note = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">
    {children}
  </div>
);

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-secondary/20 p-4">
    <h4 className="text-sm font-semibold text-foreground mb-3">{title}</h4>
    {children}
  </div>
);

const Choice = <T extends string>({ value, options, onChange }: {
  value: T; options: { id: T; label: string }[]; onChange: (v: T) => void;
}) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map((o) => (
      <button key={o.id} onClick={() => onChange(o.id)}
        className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors ${
          value === o.id ? "border-gold text-gold bg-gold/10" : "border-border text-muted-foreground hover:text-foreground"
        }`}>{o.label}</button>
    ))}
  </div>
);

/* ═══════════ 1. 有效前沿几何与两基金分离 ═══════════ */

export const FrontierGeometryTool = () => {
  const { t } = useTranslation();
  const [rf, setRf] = useState(0.02);
  const [lev, setLev] = useState(1.6);
  const [mu3, setMu3] = useState(0.14);
  const [rho, setRho] = useState(0.2);
  const [longOnly, setLongOnly] = useState(false);

  const g = useMemo(() => {
    const mu = [0.06, 0.10, mu3];
    const sig = [0.12, 0.18, 0.28];
    const cov = sig.map((si, i) => sig.map((sj, j) => (i === j ? si * si : rho * si * sj)));
    return frontierGeometry(mu, cov, rf, lev);
  }, [rf, lev, mu3, rho]);

  const data = g.curve.map((p) => ({ vol: +(p.vol * 100).toFixed(2), ret: +(p.ret * 100).toFixed(2), eff: p.efficient ? +(p.ret * 100).toFixed(2) : null }));
  const cal = g.cal.map((p) => ({ vol: +(p.vol * 100).toFixed(2), cal: +(p.ret * 100).toFixed(2) }));
  const lo = g.constrained.map((p) => ({ vol: +(p.vol * 100).toFixed(2), lo: +(p.ret * 100).toFixed(2) }));
  const assets = g.assets.map((a, i) => ({ vol: +(a.vol * 100).toFixed(2), ret: +(a.ret * 100).toFixed(2), name: t("labs.quant.v56.geometry.assetName", { n: i + 1 }) }));
  const sml = g.assets.map((a, i) => ({ beta: +a.beta.toFixed(3), ret: +(a.ret * 100).toFixed(2), name: `A${i + 1}` }));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.quant.v56.geometry.preset1Name"), description: t("labs.quant.v56.geometry.preset1Desc"), apply: () => { setRf(0.02); setLev(1.6); setRho(0.2); } },
        { name: t("labs.quant.v56.geometry.preset2Name"), description: t("labs.quant.v56.geometry.preset2Desc"), apply: () => { setLev(1); } },
        { name: t("labs.quant.v56.geometry.preset3Name"), description: t("labs.quant.v56.geometry.preset3Desc"), apply: () => { setRho(0.8); } },
        { name: t("labs.quant.v56.geometry.preset4Name"), description: t("labs.quant.v56.geometry.preset4Desc"), apply: () => { setRho(-0.3); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Slider label={t("labs.quant.v56.geometry.rf")} value={rf} min={0} max={0.06} step={0.002} fmt={(v) => pct(v, 1)} onChange={setRf} />
        <Slider label={t("labs.quant.v56.geometry.lev")} sub={t("labs.quant.v56.geometry.levSub")} value={lev} min={1} max={2.5} step={0.1} onChange={setLev} />
        <Slider label={t("labs.quant.v56.geometry.mu3")} value={mu3} min={0.06} max={0.22} step={0.005} fmt={(v) => pct(v, 1)} onChange={setMu3} />
        <Slider label={t("labs.quant.v56.geometry.rho")} value={rho} min={-0.4} max={0.9} step={0.05} onChange={setRho} />
        <div className="lg:col-span-2 flex items-end">
          <Choice value={longOnly ? "lo" : "un"} onChange={(v) => setLongOnly(v === "lo")} options={[
            { id: "un", label: t("labs.quant.v56.geometry.unconstrained") }, { id: "lo", label: t("labs.quant.v56.geometry.longOnly") },
          ]} />
        </div>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={[...data, ...cal, ...(longOnly ? lo : []), ...assets]}>
            <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
            <XAxis type="number" dataKey="vol" stroke={C.text} tick={{ fontSize: 10 }} name={t("labs.quant.v56.geometry.volPct")} label={{ value: t("labs.quant.v56.geometry.volAxisLabel"), position: "insideBottom", offset: -4, fontSize: 10, fill: C.text }} />
            <YAxis stroke={C.text} tick={{ fontSize: 10 }} label={{ value: t("labs.quant.v56.geometry.retAxisLabel"), angle: -90, position: "insideLeft", fontSize: 10, fill: C.text }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="ret" name={t("labs.quant.v56.geometry.mvFrontier")} stroke={C.text} strokeWidth={1.2} dot={false} connectNulls />
            <Line type="monotone" dataKey="eff" name={t("labs.quant.v56.geometry.efficientFrontier")} stroke={C.gold} strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="cal" name={t("labs.quant.v56.geometry.cal")} stroke={C.teal} strokeWidth={1.6} strokeDasharray="5 3" dot={false} connectNulls />
            {longOnly && <Line type="monotone" dataKey="lo" name={t("labs.quant.v56.geometry.longOnlyFrontier")} stroke={C.blue} strokeWidth={1.6} dot={false} connectNulls />}
            <Scatter dataKey="ret" data={assets} name={t("labs.quant.v56.geometry.singleAsset")} fill={C.red} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label={t("labs.quant.v56.geometry.gmvVol")} value={pct(g.gmv.vol)} sub={t("labs.quant.v56.geometry.gmvRetSub", { v: pct(g.gmv.ret) })} />
        <Stat label={t("labs.quant.v56.geometry.tangencySharpe")} value={g.tangency ? g.tangency.sharpe.toFixed(3) : "—"} color={C.teal} sub={g.tangency ? t("labs.quant.v56.geometry.tangencyVolSub", { v: pct(g.tangency.vol) }) : ""} />
        <Stat label={t("labs.quant.v56.geometry.zeroBetaRet")} value={g.zeroBeta ? pct(g.zeroBeta.ret) : "—"} color={C.blue} sub={t("labs.quant.v56.geometry.zeroBetaSub")} />
        <Stat label={t("labs.quant.v56.geometry.hyperbolaD")} value={g.D.toFixed(2)} sub={`A=${g.A.toFixed(1)} B=${g.B.toFixed(2)} C=${g.C.toFixed(3)}`} />
      </div>

      <Panel title={t("labs.quant.v56.geometry.smlPanelTitle")}>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis type="number" dataKey="beta" stroke={C.text} tick={{ fontSize: 10 }} name="β" />
              <YAxis type="number" dataKey="ret" stroke={C.text} tick={{ fontSize: 10 }} name="E[R] %" />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={(g.zeroBeta ? g.zeroBeta.ret : rf) * 100} stroke={C.blue} strokeDasharray="4 3"
                label={{ value: t("labs.quant.v56.geometry.zeroBetaLine"), fontSize: 9, fill: C.blue, position: "insideTopLeft" }} />
              <ReferenceLine y={rf * 100} stroke={C.teal} strokeDasharray="4 3" label={{ value: "r_f", fontSize: 9, fill: C.teal }} />
              <Scatter data={sml} fill={C.gold} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Note>
        <p>· <span className="text-gold">{t("labs.quant.v56.geometry.note1Bold")}</span>{t("labs.quant.v56.geometry.note1")}</p>
        <p>· {t("labs.quant.v56.geometry.note2a")}<span className="text-gold">{t("labs.quant.v56.geometry.note2Bold")}</span>{t("labs.quant.v56.geometry.note2b")}</p>
        <p>· {t("labs.quant.v56.geometry.note3")}</p>
      </Note>
    </div>
  );
};

/* ═══════════ 2. 单指数模型降维 ═══════════ */

export const SingleIndexTool = () => {
  const { t } = useTranslation();
  const [n, setN] = useState(15);
  const [T, setT] = useState(60);
  const [disp, setDisp] = useState(0.35);
  const [seed, setSeed] = useState(7);

  const s = useMemo(() => singleIndexLab({ n, T, betaDisp: disp, seed }), [n, T, disp, seed]);
  const betas = s.betas.map((b, i) => ({ name: `A${i + 1}`, beta: +b.toFixed(2), r2: +(s.r2[i] * 100).toFixed(1) }));
  const cmp = [
    { name: t("labs.quant.v56.singleIndex.trueCov"), vol: +(s.oosVolTrue * 100).toFixed(2) },
    { name: t("labs.quant.v56.singleIndex.indexStructure"), vol: +(s.oosVolIndex * 100).toFixed(2) },
    { name: t("labs.quant.v56.singleIndex.sampleCov"), vol: +(s.oosVolSample * 100).toFixed(2) },
    { name: t("labs.quant.v56.singleIndex.equalWeight"), vol: +(s.oosVolEqual * 100).toFixed(2) },
  ];

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.quant.v56.singleIndex.preset1Name"), description: t("labs.quant.v56.singleIndex.preset1Desc"), apply: () => { setN(25); setT(48); } },
        { name: t("labs.quant.v56.singleIndex.preset2Name"), description: t("labs.quant.v56.singleIndex.preset2Desc"), apply: () => { setN(10); setT(240); } },
        { name: t("labs.quant.v56.singleIndex.preset3Name"), description: t("labs.quant.v56.singleIndex.preset3Desc"), apply: () => setDisp(0.7) },
      ]} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Slider label={t("labs.quant.v56.singleIndex.n")} value={n} min={5} max={40} step={1} fmt={(v) => v.toFixed(0)} onChange={setN} />
        <Slider label={t("labs.quant.v56.singleIndex.T")} value={T} min={24} max={360} step={12} fmt={(v) => v.toFixed(0)} onChange={setT} />
        <Slider label={t("labs.quant.v56.singleIndex.betaDisp")} value={disp} min={0.05} max={0.9} step={0.05} onChange={setDisp} />
        <Slider label={t("labs.quant.v56.singleIndex.seed")} value={seed} min={1} max={99} step={1} fmt={(v) => v.toFixed(0)} onChange={setSeed} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label={t("labs.quant.v56.singleIndex.sampleParams")} value={s.paramsSample.toFixed(0)} color={C.red} sub="N(N+1)/2" />
        <Stat label={t("labs.quant.v56.singleIndex.indexParams")} value={s.paramsIndex.toFixed(0)} color={C.teal} sub={t("labs.quant.v56.singleIndex.indexParamsSub")} />
        <Stat label={t("labs.quant.v56.singleIndex.tOverP")} value={(T / s.paramsSample).toFixed(2)} sub={t("labs.quant.v56.singleIndex.tOverPSub")} />
        <Stat label={t("labs.quant.v56.singleIndex.avgR2")} value={pct(s.r2.reduce((a, b) => a + b, 0) / s.r2.length)} sub={t("labs.quant.v56.singleIndex.avgR2Sub")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title={t("labs.quant.v56.singleIndex.betaPanelTitle")}>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={betas}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 9 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="beta" name="β̂" fill={C.gold} />
                <Bar dataKey="r2" name="R² (%)" fill={C.teal} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title={t("labs.quant.v56.singleIndex.oosPanelTitle")}>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cmp} layout="vertical">
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis type="number" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} width={92} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="vol" name={t("labs.quant.v56.singleIndex.trueVolPct")} fill={C.gold}>
                  {cmp.map((d, i) => <Cell key={i} fill={i === 1 ? C.teal : i === 2 ? C.red : C.gold} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Note>
        <p>· {t("labs.quant.v56.singleIndex.note1", { sample: s.meanAbsCovError.sample.toExponential(2), index: s.meanAbsCovError.index.toExponential(2) })}</p>
        <p>· {t("labs.quant.v56.singleIndex.note2a")}<span className="text-gold">{t("labs.quant.v56.singleIndex.note2Bold")}</span>{t("labs.quant.v56.singleIndex.note2b")}</p>
        <p>· {t("labs.quant.v56.singleIndex.note3")}</p>
      </Note>
    </div>
  );
};

/* ═══════════ 3. 估计误差与滚动优化 ═══════════ */

export const EstimationErrorTool = () => {
  const { t } = useTranslation();
  const [n, setN] = useState(8);
  const [T, setT] = useState(60);
  const [sims, setSims] = useState(80);
  const [seed, setSeed] = useState(11);

  const e = useMemo(() => estimationErrorLab({ n, T, sims, seed }), [n, T, sims, seed]);
  const chart = e.bySample.map((p) => ({
    T: p.T,
    [t("labs.quant.v56.estimationError.meanVariance")]: +p.mv.toFixed(3),
    [t("labs.quant.v56.estimationError.minVariance")]: +p.minvar.toFixed(3),
    [t("labs.quant.v56.estimationError.equalWeight")]: +p.equal.toFixed(3),
    [t("labs.quant.v56.estimationError.oracle")]: +p.oracle.toFixed(3),
  }));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.quant.v56.estimationError.preset1Name"), description: t("labs.quant.v56.estimationError.preset1Desc"), apply: () => { setN(8); setT(60); } },
        { name: t("labs.quant.v56.estimationError.preset2Name"), description: t("labs.quant.v56.estimationError.preset2Desc"), apply: () => setT(24) },
        { name: t("labs.quant.v56.estimationError.preset3Name"), description: t("labs.quant.v56.estimationError.preset3Desc"), apply: () => setT(480) },
      ]} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Slider label={t("labs.quant.v56.estimationError.n")} value={n} min={4} max={20} step={1} fmt={(v) => v.toFixed(0)} onChange={setN} />
        <Slider label={t("labs.quant.v56.estimationError.T")} value={T} min={24} max={480} step={12} fmt={(v) => v.toFixed(0)} onChange={setT} />
        <Slider label={t("labs.quant.v56.estimationError.sims")} value={sims} min={30} max={300} step={10} fmt={(v) => v.toFixed(0)} onChange={setSims} />
        <Slider label={t("labs.quant.v56.estimationError.seed")} value={seed} min={1} max={99} step={1} fmt={(v) => v.toFixed(0)} onChange={setSeed} />
      </div>

      <Panel title={t("labs.quant.v56.estimationError.tablePanelTitle")}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-2">{t("labs.quant.v56.estimationError.colMethod")}</th>
                <th className="text-right">{t("labs.quant.v56.estimationError.colTrueSharpe")}</th>
                <th className="text-right">{t("labs.quant.v56.estimationError.colVol")}</th>
                <th className="text-right">{t("labs.quant.v56.estimationError.colWeightError")}</th>
                <th className="text-right">{t("labs.quant.v56.estimationError.colMaxWeight")}</th>
                <th className="text-right">{t("labs.quant.v56.estimationError.colTurnover")}</th>
              </tr>
            </thead>
            <tbody>
              {e.rows.map((r) => (
                <tr key={r.method} className="border-b border-border/40">
                  <td className="py-2 text-foreground">{r.method}</td>
                  <td className="text-right text-gold">{r.trueSharpe.toFixed(3)}</td>
                  <td className="text-right">{pct(r.vol)}</td>
                  <td className="text-right">{r.weightError.toFixed(3)}</td>
                  <td className="text-right">{pct(r.maxWeight, 0)}</td>
                  <td className="text-right">{r.turnoverProxy.toFixed(2)}</td>
                </tr>
              ))}
              <tr>
                <td className="py-2 text-teal-400">{t("labs.quant.v56.estimationError.oracleRow")}</td>
                <td className="text-right text-teal-400">{e.oracleSharpe.toFixed(3)}</td>
                <td className="text-right" colSpan={4}>{t("labs.quant.v56.estimationError.oracleNote")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart}>
            <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
            <XAxis dataKey="T" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: t("labs.quant.v56.estimationError.xAxisLabel"), position: "insideBottom", offset: -4, fontSize: 10, fill: C.text }} />
            <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey={t("labs.quant.v56.estimationError.oracle")} stroke={C.text} strokeDasharray="4 3" dot={false} />
            <Line type="monotone" dataKey={t("labs.quant.v56.estimationError.meanVariance")} stroke={C.red} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey={t("labs.quant.v56.estimationError.minVariance")} stroke={C.teal} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey={t("labs.quant.v56.estimationError.equalWeight")} stroke={C.gold} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <Note>
        <p>· {t("labs.quant.v56.estimationError.note1a")}<span className="text-gold">{t("labs.quant.v56.estimationError.note1Bold")}</span>{t("labs.quant.v56.estimationError.note1b")}</p>
        <p>· {t("labs.quant.v56.estimationError.note2")}</p>
        <p>· {t("labs.quant.v56.estimationError.note3")}</p>
      </Note>
    </div>
  );
};

/* ═══════════ 4. 约束与再平衡成本 ═══════════ */

export const RebalanceCostTool = () => {
  const { t } = useTranslation();
  const [cost, setCost] = useState(20);
  const [thr, setThr] = useState(0.05);
  const [vol, setVol] = useState(0.2);
  const [corr, setCorr] = useState(0.3);

  const r = useMemo(() => constraintRebalanceLab({ n: 6, days: 1260, costBps: cost, threshold: thr, vol, corr, seed: 5 }), [cost, thr, vol, corr]);
  const fr = r.frontier.map((p) => ({ te: +(p.te * 100).toFixed(2), cost: +(p.cost * 100).toFixed(2), thr: `${(p.threshold * 100).toFixed(1)}%`, turnover: +(p.turnover * 100).toFixed(0) }));
  const drift = r.driftPath.map((p) => ({ t: p.t, drift: +(p.drift * 100).toFixed(2), band: +(p.band * 100).toFixed(2) }));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.quant.v56.rebalance.preset1Name"), description: t("labs.quant.v56.rebalance.preset1Desc"), apply: () => setCost(5) },
        { name: t("labs.quant.v56.rebalance.preset2Name"), description: t("labs.quant.v56.rebalance.preset2Desc"), apply: () => { setCost(80); setThr(0.1); } },
        { name: t("labs.quant.v56.rebalance.preset3Name"), description: t("labs.quant.v56.rebalance.preset3Desc"), apply: () => setVol(0.35) },
      ]} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Slider label={t("labs.quant.v56.rebalance.cost")} value={cost} min={0} max={100} step={5} fmt={(v) => v.toFixed(0)} onChange={setCost} />
        <Slider label={t("labs.quant.v56.rebalance.thr")} value={thr} min={0.01} max={0.2} step={0.01} fmt={(v) => pct(v, 0)} onChange={setThr} />
        <Slider label={t("labs.quant.v56.rebalance.vol")} value={vol} min={0.08} max={0.4} step={0.02} fmt={(v) => pct(v, 0)} onChange={setVol} />
        <Slider label={t("labs.quant.v56.rebalance.corr")} value={corr} min={0} max={0.85} step={0.05} onChange={setCorr} />
      </div>

      <Panel title={t("labs.quant.v56.rebalance.tablePanelTitle")}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-2">{t("labs.quant.v56.rebalance.colRule")}</th>
                <th className="text-right">{t("labs.quant.v56.rebalance.colTrades")}</th>
                <th className="text-right">{t("labs.quant.v56.rebalance.colTurnover")}</th>
                <th className="text-right">{t("labs.quant.v56.rebalance.colCost")}</th>
                <th className="text-right">{t("labs.quant.v56.rebalance.colTE")}</th>
                <th className="text-right">{t("labs.quant.v56.rebalance.colMaxDrift")}</th>
                <th className="text-right">{t("labs.quant.v56.rebalance.colNetCagr")}</th>
              </tr>
            </thead>
            <tbody>
              {r.rows.map((row) => (
                <tr key={row.rule} className="border-b border-border/40">
                  <td className="py-2 text-foreground">{row.rule}</td>
                  <td className="text-right">{row.trades}</td>
                  <td className="text-right">{pct(row.turnover, 0)}</td>
                  <td className="text-right text-red-400">{pct(row.cost, 2)}</td>
                  <td className="text-right">{pct(row.trackingError, 2)}</td>
                  <td className="text-right">{pct(row.maxDrift, 1)}</td>
                  <td className="text-right text-gold">{pct(row.netCagr, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title={t("labs.quant.v56.rebalance.tradeoffPanelTitle")}>
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis type="number" dataKey="te" name={t("labs.quant.v56.rebalance.tePct")} stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis type="number" dataKey="cost" name={t("labs.quant.v56.rebalance.costPct")} stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Scatter data={fr} fill={C.gold} line stroke={C.gold} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title={t("labs.quant.v56.rebalance.driftPanelTitle")}>
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={drift}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="drift" name={t("labs.quant.v56.rebalance.driftSeries")} stroke={C.teal} fill={C.teal} fillOpacity={0.18} />
                <Line type="monotone" dataKey="band" name={t("labs.quant.v56.rebalance.bandSeries")} stroke={C.red} strokeDasharray="4 3" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title={t("labs.quant.v56.rebalance.capPanelTitle")}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {r.capEffect.map((c) => (
            <Stat key={c.cap} label={t("labs.quant.v56.rebalance.capLabel", { v: pct(c.cap, 0) })} value={pct(c.vol)} sub={t("labs.quant.v56.rebalance.capSub", { v: c.effN.toFixed(2) })} />
          ))}
        </div>
      </Panel>

      <Note>
        <p>· {t("labs.quant.v56.rebalance.note1a")}<span className="text-gold">{t("labs.quant.v56.rebalance.note1Bold")}</span>{t("labs.quant.v56.rebalance.note1b")}</p>
        <p>· {t("labs.quant.v56.rebalance.note2")}</p>
        <p>· {t("labs.quant.v56.rebalance.note3")}</p>
      </Note>
    </div>
  );
};

/* ═══════════ 5. 主动管理与信息比率 ═══════════ */

export const ActiveManagementTool = () => {
  const { t } = useTranslation();
  const [ic, setIc] = useState(0.05);
  const [breadth, setBreadth] = useState(200);
  const [tc, setTc] = useState(0.6);
  const [lambda, setLambda] = useState(0.1);
  const [targetIR, setTargetIR] = useState(0.5);

  const a = useMemo(() => activeManagementLab({ ic, breadth, tc, lambda, targetIR }), [ic, breadth, tc, lambda, targetIR]);
  const grid = a.grid.map((g) => ({ breadth: g.breadth, "IC=0.03": +g.ic03.toFixed(2), "IC=0.05": +g.ic05.toFixed(2), "IC=0.10": +g.ic10.toFixed(2) }));
  const tb = a.treynorBlack;

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.quant.v56.active.preset1Name"), description: t("labs.quant.v56.active.preset1Desc"), apply: () => { setIc(0.05); setBreadth(200); } },
        { name: t("labs.quant.v56.active.preset2Name"), description: t("labs.quant.v56.active.preset2Desc"), apply: () => { setIc(0.15); setBreadth(12); } },
        { name: t("labs.quant.v56.active.preset3Name"), description: t("labs.quant.v56.active.preset3Desc"), apply: () => { setIc(0.02); setBreadth(5000); } },
        { name: t("labs.quant.v56.active.preset4Name"), description: t("labs.quant.v56.active.preset4Desc"), apply: () => setTc(0.3) },
      ]} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Slider label={t("labs.quant.v56.active.ic")} value={ic} min={0.005} max={0.2} step={0.005} onChange={setIc} />
        <Slider label={t("labs.quant.v56.active.breadth")} value={breadth} min={5} max={5000} step={5} fmt={(v) => v.toFixed(0)} onChange={setBreadth} />
        <Slider label={t("labs.quant.v56.active.tc")} sub={t("labs.quant.v56.active.tcSub")} value={tc} min={0.1} max={1} step={0.05} onChange={setTc} />
        <Slider label={t("labs.quant.v56.active.lambda")} value={lambda} min={0.02} max={0.4} step={0.02} onChange={setLambda} />
        <Slider label={t("labs.quant.v56.active.targetIR")} value={targetIR} min={0.2} max={1.5} step={0.1} onChange={setTargetIR} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label={t("labs.quant.v56.active.theoreticalIR")} value={a.ir.toFixed(3)} />
        <Stat label={t("labs.quant.v56.active.realizedIR")} value={a.irWithTC.toFixed(3)} color={C.teal} />
        <Stat label={t("labs.quant.v56.active.optimalTE")} value={pct(a.optimalTE)} sub="IR/(2λ)" />
        <Stat label={t("labs.quant.v56.active.valueAdded")} value={pct(a.valueAdded, 2)} color={C.gold} />
        <Stat label={t("labs.quant.v56.active.breakEvenLabel", { ir: targetIR.toFixed(1) })} value={a.breakEvenIC.toFixed(4)} color={a.breakEvenIC > ic ? C.red : C.green} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title={t("labs.quant.v56.active.gridPanelTitle")}>
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={grid}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="breadth" scale="log" domain={["dataMin", "dataMax"]} stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="IC=0.03" stroke={C.blue} dot={false} strokeWidth={1.6} />
                <Line type="monotone" dataKey="IC=0.05" stroke={C.gold} dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="IC=0.10" stroke={C.teal} dot={false} strokeWidth={1.6} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title={t("labs.quant.v56.active.tbPanelTitle")}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Stat label={t("labs.quant.v56.active.tbAlpha")} value={pct(tb.activeAlpha, 2)} />
            <Stat label={t("labs.quant.v56.active.tbAppraisal")} value={tb.appraisal.toFixed(3)} color={C.teal} />
            <Stat label={t("labs.quant.v56.active.tbWeight")} value={pct(tb.wActive, 1)} />
            <Stat label={t("labs.quant.v56.active.tbSharpe")} value={tb.sharpeCombined.toFixed(3)} color={C.gold} sub={t("labs.quant.v56.active.tbSharpeSub", { v: tb.sharpeMarket.toFixed(3) })} />
          </div>
          <table className="w-full text-xs font-mono">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border"><th className="text-left py-1.5">{t("labs.quant.v56.active.colPosition")}</th><th className="text-right">α</th><th className="text-right">σ(ε)</th><th className="text-right">{t("labs.quant.v56.active.colActiveWeight")}</th></tr>
            </thead>
            <tbody>
              {tb.positions.map((p) => (
                <tr key={p.name} className="border-b border-border/40">
                  <td className="py-1.5 text-foreground">{p.name}</td>
                  <td className="text-right">{pct(p.alpha, 1)}</td>
                  <td className="text-right">{pct(p.resid, 0)}</td>
                  <td className={`text-right ${p.weight < 0 ? "text-red-400" : "text-gold"}`}>{pct(p.weight, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <Note>
        <p>· {t("labs.quant.v56.active.note1a")}<span className="text-gold">{t("labs.quant.v56.active.note1Bold")}</span>{t("labs.quant.v56.active.note1b")}</p>
        <p>· {t("labs.quant.v56.active.note2")}</p>
        <p>· {t("labs.quant.v56.active.note3")}</p>
      </Note>
    </div>
  );
};

/* ═══════════ 6. 下行风险与随机占优 ═══════════ */

export const DownsideDominanceTool = () => {
  const { t } = useTranslation();
  const [gamma, setGamma] = useState(4);
  const [jumpProb, setJumpProb] = useState(0.03);
  const [jumpSize, setJumpSize] = useState(0.25);
  const [muB, setMuB] = useState(0.09);

  const d = useMemo(() => downsideRiskLab({ gamma, jumpProb, jumpSize, muB, n: 4000, seed: 9 }), [gamma, jumpProb, jumpSize, muB]);
  const cdf = d.cdf.filter((_, i) => i % 2 === 0).map((p) => ({ x: +(p.x * 100).toFixed(1), A: +p.A.toFixed(3), B: +p.B.toFixed(3), intA: +p.intA.toFixed(3), intB: +p.intB.toFixed(3) }));
  const util = d.utility.map((p) => ({ w: +(p.w * 100).toFixed(0), ceq: +(p.ceq * 100).toFixed(2), mv: +(p.meanVarCeq * 100).toFixed(2) }));

  const Row = ({ k, a, b, better }: { k: string; a: string; b: string; better?: "a" | "b" }) => (
    <tr className="border-b border-border/40">
      <td className="py-1.5 text-muted-foreground">{k}</td>
      <td className={`text-right ${better === "a" ? "text-gold" : "text-foreground"}`}>{a}</td>
      <td className={`text-right ${better === "b" ? "text-gold" : "text-foreground"}`}>{b}</td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.quant.v56.downside.preset1Name"), description: t("labs.quant.v56.downside.preset1Desc"), apply: () => { setJumpProb(0.03); setJumpSize(0.25); } },
        { name: t("labs.quant.v56.downside.preset2Name"), description: t("labs.quant.v56.downside.preset2Desc"), apply: () => { setJumpProb(0.06); setJumpSize(0.4); } },
        { name: t("labs.quant.v56.downside.preset3Name"), description: t("labs.quant.v56.downside.preset3Desc"), apply: () => setGamma(10) },
        { name: t("labs.quant.v56.downside.preset4Name"), description: t("labs.quant.v56.downside.preset4Desc"), apply: () => setGamma(1) },
      ]} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Slider label={t("labs.quant.v56.downside.gamma")} value={gamma} min={1} max={12} step={0.5} onChange={setGamma} />
        <Slider label={t("labs.quant.v56.downside.jumpProb")} value={jumpProb} min={0} max={0.15} step={0.005} fmt={(v) => pct(v, 1)} onChange={setJumpProb} />
        <Slider label={t("labs.quant.v56.downside.jumpSize")} value={jumpSize} min={0.05} max={0.6} step={0.05} fmt={(v) => pct(v, 0)} onChange={setJumpSize} />
        <Slider label={t("labs.quant.v56.downside.muB")} value={muB} min={0.04} max={0.16} step={0.005} fmt={(v) => pct(v, 1)} onChange={setMuB} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title={t("labs.quant.v56.downside.tablePanelTitle")}>
          <table className="w-full text-xs font-mono">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border"><th className="text-left py-1.5">{t("labs.quant.v56.downside.colMetric")}</th><th className="text-right">{t("labs.quant.v56.downside.colA")}</th><th className="text-right">{t("labs.quant.v56.downside.colB")}</th></tr>
            </thead>
            <tbody>
              <Row k={t("labs.quant.v56.downside.rowMeanRet")} a={pct(d.a.meanRet, 2)} b={pct(d.b.meanRet, 2)} better={d.b.meanRet > d.a.meanRet ? "b" : "a"} />
              <Row k={t("labs.quant.v56.downside.rowVol")} a={pct(d.a.vol, 2)} b={pct(d.b.vol, 2)} better={d.b.vol < d.a.vol ? "b" : "a"} />
              <Row k={t("labs.quant.v56.downside.rowSharpe")} a={d.a.sharpe.toFixed(3)} b={d.b.sharpe.toFixed(3)} better={d.b.sharpe > d.a.sharpe ? "b" : "a"} />
              <Row k={t("labs.quant.v56.downside.rowSemiDev")} a={pct(d.a.semiDev, 2)} b={pct(d.b.semiDev, 2)} better={d.b.semiDev < d.a.semiDev ? "b" : "a"} />
              <Row k={t("labs.quant.v56.downside.rowSortino")} a={d.a.sortino.toFixed(3)} b={d.b.sortino.toFixed(3)} better={d.b.sortino > d.a.sortino ? "b" : "a"} />
              <Row k={t("labs.quant.v56.downside.rowOmega")} a={d.a.omega.toFixed(2)} b={d.b.omega.toFixed(2)} better={d.b.omega > d.a.omega ? "b" : "a"} />
              <Row k={t("labs.quant.v56.downside.rowLpm2")} a={d.a.lpm2.toExponential(2)} b={d.b.lpm2.toExponential(2)} better={d.b.lpm2 < d.a.lpm2 ? "b" : "a"} />
              <Row k={t("labs.quant.v56.downside.rowVar95")} a={pct(d.a.var95, 2)} b={pct(d.b.var95, 2)} better={d.b.var95 < d.a.var95 ? "b" : "a"} />
              <Row k={t("labs.quant.v56.downside.rowCvar95")} a={pct(d.a.cvar95, 2)} b={pct(d.b.cvar95, 2)} better={d.b.cvar95 < d.a.cvar95 ? "b" : "a"} />
              <Row k={t("labs.quant.v56.downside.rowSkewKurt")} a={`${d.a.skew.toFixed(2)} / ${d.a.kurt.toFixed(1)}`} b={`${d.b.skew.toFixed(2)} / ${d.b.kurt.toFixed(1)}`} />
            </tbody>
          </table>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Stat label={t("labs.quant.v56.downside.fsdLabel")} value={d.fsd.dominates === "none" ? t("labs.quant.v56.downside.noDominance") : t("labs.quant.v56.downside.dominatesFmt", { p: d.fsd.dominates })} color={d.fsd.dominates === "none" ? C.text : C.gold} />
            <Stat label={t("labs.quant.v56.downside.ssdLabel")} value={d.ssd.dominates === "none" ? t("labs.quant.v56.downside.noDominance") : t("labs.quant.v56.downside.dominatesFmt", { p: d.ssd.dominates })} color={d.ssd.dominates === "none" ? C.text : C.teal} />
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel title={t("labs.quant.v56.downside.cdfPanelTitle")}>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cdf}>
                  <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="x" stroke={C.text} tick={{ fontSize: 10 }} />
                  <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="A" name="F_A" stroke={C.gold} dot={false} />
                  <Line type="monotone" dataKey="B" name="F_B" stroke={C.red} dot={false} />
                  <Line type="monotone" dataKey="intA" name="∫F_A" stroke={C.gold} strokeDasharray="4 3" dot={false} />
                  <Line type="monotone" dataKey="intB" name="∫F_B" stroke={C.red} strokeDasharray="4 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel title={t("labs.quant.v56.downside.ceqPanelTitle", { v: pct(d.bestWeight, 0) })}>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={util}>
                  <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="w" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: t("labs.quant.v56.downside.weightAxisLabel"), position: "insideBottom", offset: -4, fontSize: 9, fill: C.text }} />
                  <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="ceq" name={t("labs.quant.v56.downside.ceqSeries")} stroke={C.teal} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="mv" name={t("labs.quant.v56.downside.mvSeries")} stroke={C.gold} strokeDasharray="4 3" dot={false} />
                  <ReferenceLine x={+(d.bestWeight * 100).toFixed(0)} stroke={C.red} strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>

      <Note>
        <p>· {t("labs.quant.v56.downside.note1a")}<span className="text-gold">{t("labs.quant.v56.downside.note1Bold")}</span>{t("labs.quant.v56.downside.note1b")}</p>
        <p>· {t("labs.quant.v56.downside.note2")}</p>
        <p>· {t("labs.quant.v56.downside.note3")}</p>
      </Note>
    </div>
  );
};

/* ═══════════ 7. 多期与动态配置 ═══════════ */

export const DynamicAllocationTool = () => {
  const { t } = useTranslation();
  const [gamma, setGamma] = useState(4);
  const [horizon, setHorizon] = useState(20);
  const [mu, setMu] = useState(0.07);
  const [sigma, setSigma] = useState(0.16);
  const [phi, setPhi] = useState(0.15);

  const d = useMemo(() => dynamicAllocationLab({ gamma, horizon, mu, sigma, phi, sims: 3000, seed: 13 }), [gamma, horizon, mu, sigma, phi]);
  const glide = d.glide.map((g) => ({
    age: g.age,
    [t("labs.quant.v56.dynamic.humanCapitalRatio")]: +(g.humanRatio * 100).toFixed(1),
    [t("labs.quant.v56.dynamic.financialEquity")]: +(g.financialEquity * 100).toFixed(1),
    [t("labs.quant.v56.dynamic.totalEquity")]: +(g.totalEquity * 100).toFixed(1),
  }));
  const hz = d.horizonCurve.map((h) => ({
    horizon: h.horizon,
    [t("labs.quant.v56.dynamic.totalWeight")]: +(h.weight * 100).toFixed(1),
    [t("labs.quant.v56.dynamic.hedgingDemand")]: +(h.hedging * 100).toFixed(1),
  }));
  const paths = d.paths.map((p) => ({
    q: p.q,
    [t("labs.quant.v56.dynamic.annualRebalance")]: +p.rebalanced.toFixed(2),
    [t("labs.quant.v56.dynamic.buyHold")]: +p.buyHold.toFixed(2),
  }));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.quant.v56.dynamic.preset1Name"), description: t("labs.quant.v56.dynamic.preset1Desc"), apply: () => { setHorizon(30); setPhi(0.2); } },
        { name: t("labs.quant.v56.dynamic.preset2Name"), description: t("labs.quant.v56.dynamic.preset2Desc"), apply: () => setHorizon(3) },
        { name: t("labs.quant.v56.dynamic.preset3Name"), description: t("labs.quant.v56.dynamic.preset3Desc"), apply: () => setGamma(8) },
        { name: t("labs.quant.v56.dynamic.preset4Name"), description: t("labs.quant.v56.dynamic.preset4Desc"), apply: () => setPhi(0.01) },
      ]} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Slider label={t("labs.quant.v56.dynamic.gamma")} value={gamma} min={1.5} max={12} step={0.5} onChange={setGamma} />
        <Slider label={t("labs.quant.v56.dynamic.horizon")} value={horizon} min={1} max={40} step={1} fmt={(v) => v.toFixed(0)} onChange={setHorizon} />
        <Slider label={t("labs.quant.v56.dynamic.mu")} value={mu} min={0.03} max={0.12} step={0.005} fmt={(v) => pct(v, 1)} onChange={setMu} />
        <Slider label={t("labs.quant.v56.dynamic.sigma")} value={sigma} min={0.08} max={0.35} step={0.01} fmt={(v) => pct(v, 0)} onChange={setSigma} />
        <Slider label={t("labs.quant.v56.dynamic.phi")} value={phi} min={0.01} max={0.5} step={0.01} onChange={setPhi} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label={t("labs.quant.v56.dynamic.myopic")} value={pct(d.myopic, 0)} />
        <Stat label={t("labs.quant.v56.dynamic.hedgingDemandStat")} value={pct(d.hedgingDemand, 1)} color={d.hedgingDemand >= 0 ? C.teal : C.red} />
        <Stat label={t("labs.quant.v56.dynamic.totalWeightStat")} value={pct(d.totalWeight, 0)} color={C.gold} />
        <Stat label={t("labs.quant.v56.dynamic.volDragBonus")} value={d.volDragBonus.toFixed(3)} sub={t("labs.quant.v56.dynamic.volDragBonusSub")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title={t("labs.quant.v56.dynamic.horizonPanelTitle")}>
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hz}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="horizon" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: t("labs.quant.v56.dynamic.horizonAxisLabel"), position: "insideBottom", offset: -4, fontSize: 9, fill: C.text }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey={t("labs.quant.v56.dynamic.hedgingDemand")} stroke={C.teal} fill={C.teal} fillOpacity={0.2} />
                <Line type="monotone" dataKey={t("labs.quant.v56.dynamic.totalWeight")} stroke={C.gold} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title={t("labs.quant.v56.dynamic.glidePanelTitle")}>
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={glide}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="age" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey={t("labs.quant.v56.dynamic.financialEquity")} stroke={C.gold} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey={t("labs.quant.v56.dynamic.totalEquity")} stroke={C.teal} strokeDasharray="4 3" dot={false} />
                <Line type="monotone" dataKey={t("labs.quant.v56.dynamic.humanCapitalRatio")} stroke={C.blue} strokeWidth={1.4} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title={t("labs.quant.v56.dynamic.pathPanelTitle")}>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={paths}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="q" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey={t("labs.quant.v56.dynamic.annualRebalance")} fill={C.gold} />
              <Bar dataKey={t("labs.quant.v56.dynamic.buyHold")} fill={C.teal} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Note>
        <p>· {t("labs.quant.v56.dynamic.note1a")}<span className="text-gold">{t("labs.quant.v56.dynamic.note1Bold")}</span>{t("labs.quant.v56.dynamic.note1b")}</p>
        <p>· {t("labs.quant.v56.dynamic.note2a")}<span className="text-gold">{t("labs.quant.v56.dynamic.note2Bold")}</span>{t("labs.quant.v56.dynamic.note2b")}</p>
        <p>· {t("labs.quant.v56.dynamic.note3")}</p>
        <p>· {t("labs.quant.v56.dynamic.note4")}</p>
      </Note>
    </div>
  );
};

/* ═══════════ 8. 高维正则化与最大分散化 ═══════════ */

export const RegularizationTool = () => {
  const { t } = useTranslation();
  const [n, setN] = useState(20);
  const [T, setT] = useState(60);
  const [l1, setL1] = useState(0.02);
  const [l2, setL2] = useState(0.05);

  const r = useMemo(() => regularizationLab({ n, T, l1, l2, seed: 17 }), [n, T, l1, l2]);
  const path = r.path.map((p) => ({
    lambda: +p.lambda.toFixed(3),
    [t("labs.quant.v56.regularization.effN")]: +p.effN.toFixed(2),
    [t("labs.quant.v56.regularization.gross")]: +p.gross.toFixed(2),
    [t("labs.quant.v56.regularization.oosVol")]: +(p.vol * 100).toFixed(2),
  }));
  const wc = r.weightsChart.map((w) => ({
    asset: w.asset,
    [t("labs.quant.v56.regularization.unconstrained")]: +w.minvar.toFixed(3),
    L2: +w.l2.toFixed(3),
    L1: +w.l1.toFixed(3),
    MDP: +w.mdp.toFixed(3),
  }));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.quant.v56.regularization.preset1Name"), description: t("labs.quant.v56.regularization.preset1Desc"), apply: () => { setN(40); setT(48); } },
        { name: t("labs.quant.v56.regularization.preset2Name"), description: t("labs.quant.v56.regularization.preset2Desc"), apply: () => { setL1(0.05); setL2(0); } },
        { name: t("labs.quant.v56.regularization.preset3Name"), description: t("labs.quant.v56.regularization.preset3Desc"), apply: () => { setL2(0.15); setL1(0); } },
      ]} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Slider label={t("labs.quant.v56.regularization.n")} value={n} min={8} max={50} step={1} fmt={(v) => v.toFixed(0)} onChange={setN} />
        <Slider label={t("labs.quant.v56.regularization.T")} value={T} min={24} max={240} step={12} fmt={(v) => v.toFixed(0)} onChange={setT} />
        <Slider label={t("labs.quant.v56.regularization.l1")} value={l1} min={0} max={0.06} step={0.002} fmt={(v) => v.toFixed(3)} onChange={setL1} />
        <Slider label={t("labs.quant.v56.regularization.l2")} value={l2} min={0} max={0.2} step={0.005} fmt={(v) => v.toFixed(3)} onChange={setL2} />
      </div>

      <Panel title={t("labs.quant.v56.regularization.tablePanelTitle")}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-2">{t("labs.quant.v56.regularization.colScheme")}</th>
                <th className="text-right">{t("labs.quant.v56.regularization.colVol")}</th>
                <th className="text-right">{t("labs.quant.v56.regularization.colRet")}</th>
                <th className="text-right">{t("labs.quant.v56.regularization.colSharpe")}</th>
                <th className="text-right">{t("labs.quant.v56.regularization.colEffN")}</th>
                <th className="text-right">{t("labs.quant.v56.regularization.colGross")}</th>
                <th className="text-right">{t("labs.quant.v56.regularization.colShortShare")}</th>
                <th className="text-right">{t("labs.quant.v56.regularization.colDivRatio")}</th>
              </tr>
            </thead>
            <tbody>
              {r.rows.map((row) => (
                <tr key={row.name} className="border-b border-border/40">
                  <td className="py-2 text-foreground">{row.name}</td>
                  <td className="text-right">{pct(row.vol, 2)}</td>
                  <td className="text-right">{pct(row.ret, 2)}</td>
                  <td className="text-right text-gold">{row.sharpe.toFixed(3)}</td>
                  <td className="text-right">{row.effN.toFixed(2)}</td>
                  <td className={`text-right ${row.gross > 2 ? "text-red-400" : ""}`}>{row.gross.toFixed(2)}</td>
                  <td className="text-right">{pct(row.shortShare, 1)}</td>
                  <td className="text-right text-teal-400">{row.divRatio.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title={t("labs.quant.v56.regularization.pathPanelTitle")}>
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={path}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="lambda" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey={t("labs.quant.v56.regularization.gross")} stroke={C.red} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey={t("labs.quant.v56.regularization.effN")} stroke={C.teal} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey={t("labs.quant.v56.regularization.oosVol")} stroke={C.gold} strokeDasharray="4 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title={t("labs.quant.v56.regularization.weightsPanelTitle")}>
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wc}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="asset" stroke={C.text} tick={{ fontSize: 9 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <ReferenceLine y={0} stroke={C.text} />
                <Bar dataKey={t("labs.quant.v56.regularization.unconstrained")} fill={C.red} />
                <Bar dataKey="L1" fill={C.gold} />
                <Bar dataKey="MDP" fill={C.teal} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Note>
        <p>· {t("labs.quant.v56.regularization.note1a")}<span className="text-gold">{t("labs.quant.v56.regularization.note1Bold")}</span>{t("labs.quant.v56.regularization.note1b")}</p>
        <p>· {t("labs.quant.v56.regularization.note2")}</p>
        <p>· {t("labs.quant.v56.regularization.note3a")}<span className="text-gold">{t("labs.quant.v56.regularization.note3Bold")}</span>{t("labs.quant.v56.regularization.note3b")}</p>
      </Note>
    </div>
  );
};

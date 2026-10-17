import { useTranslation } from "react-i18next";
import { useMemo, useState, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Area, ComposedChart, Scatter, ReferenceLine, ReferenceArea, ErrorBar, Bar, BarChart, Cell,
} from "recharts";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import PresetButtons from "../PresetButtons";
import { useToast } from "@/hooks/use-toast";
import {
  eventStudyDID, panelUnitRoot, pedroniCointegration,
  bootstrapQuantileReg, quantileRegMulti,
} from "@/lib/quant/panelEcon";
import {
  olsDetail, breuschPagan, whiteTest, durbinWatson, breuschGodfrey,
  vif, conditionNumber, ramseyReset, robustSE, neweyWestSE, tTwoTail,
} from "@/lib/quant/econometrics";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

/* ───────── PRNG ───────── */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function randn(rng: () => number) {
  let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ───────── shared UI ───────── */
const sliderClass =
  "w-full h-1.5 rounded-full appearance-none cursor-pointer bg-secondary accent-gold [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:shadow-md";

const Slider = ({ label, sub, value, min, max, step, onChange, fmt }: {
  label: string; sub?: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; fmt?: (v: number) => string;
}) => (
  <div>
    <div className="flex justify-between items-baseline mb-2">
      <label className="text-xs text-secondary-foreground font-medium">
        {label}{sub && <span className="text-muted-foreground ml-1.5 text-[10px]">{sub}</span>}
      </label>
      <span className="text-xs font-mono text-gold tabular-nums">{fmt ? fmt(value) : value}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(+e.target.value)} className={sliderClass} />
  </div>
);

const Stat = ({ label, value, color = CHART_GOLD, sub }: {
  label: string; value: string; color?: string; sub?: string;
}) => (
  <div className="rounded-lg bg-secondary/40 border border-border p-3">
    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-base font-mono tabular-nums" style={{ color }}>{value}</p>
    {sub && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

const TestBadge = ({ reject, labels }: { reject: boolean; labels?: [string, string] }) => {
  const { t } = useTranslation();
  return (
  <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${reject ? "bg-red-500/15 text-red-500" : "bg-emerald-500/15 text-emerald-500"}`}>
    {reject ? (labels?.[0] ?? t("labs.econV39.text001", { defaultValue: "拒绝 H₀" })) : (labels?.[1] ?? t("labs.econV39.text002", { defaultValue: "不拒绝 H₀" }))}
  </span>
);
};

const Note = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">{children}</div>
);

const chartTooltip = { background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11, borderRadius: 8 };

/* ══════════════════════════════════════════════════════════════════
   1. Event-study DiD — parallel-trends test + dynamic ATT
   ══════════════════════════════════════════════════════════════════ */
type DIDMode = "clean" | "trend" | "anticip" | "dynamic";

export const EventStudyDIDTool = () => {
  const { t } = useTranslation();
  const [nUnits, setNUnits] = useState(40);
  const [nPeriods, setNPeriods] = useState(12);
  const [cohort, setCohort] = useState(7);
  const [effect, setEffect] = useState(2.0);
  const [noise, setNoise] = useState(0.4);
  const [seed, setSeed] = useState(42);
  const [mode, setMode] = useState<DIDMode>("dynamic");

  const { chartData, es, means } = useMemo(() => {
    const rng = mulberry32(seed);
    const unit: number[] = [], time: number[] = [], y: number[] = [], cohortArr: number[] = [];
    const treatN = Math.floor(nUnits / 2);
    // For group-mean trends chart
    const treatSum = Array(nPeriods).fill(0), ctrlSum = Array(nPeriods).fill(0);
    let tc = 0, cc = 0;
    for (let i = 0; i < nUnits; i++) {
      const treated = i < treatN;
      const ci = treated ? cohort : Infinity;
      const fe = randn(rng) * 1.2;
      for (let t = 0; t < nPeriods; t++) {
        let commonTrend = 0.12 * t;
        // Differential pre-trend violates parallel trends
        if (mode === "trend" && treated) commonTrend += 0.18 * t;
        let val = fe + commonTrend + noise * randn(rng);
        const rel = t - cohort;
        if (treated) {
          if (mode === "anticip" && rel === -1) val += effect * 0.5; // anticipation
          if (t >= cohort) {
            val += mode === "dynamic" ? effect * (rel + 1) / (nPeriods - cohort) : effect;
          }
        }
        unit.push(i); time.push(t); cohortArr.push(ci); y.push(val);
        if (treated) { treatSum[t] += val; tc = treatN; } else { ctrlSum[t] += val; cc = nUnits - treatN; }
      }
    }
    const es = eventStudyDID({ unit, time, y, cohort: cohortArr });
    const chartData = es.coefs.map((c) => ({
      k: c.k, coef: +c.coef.toFixed(3),
      err: c.k === -1 ? 0 : +(1.96 * c.se).toFixed(3),
      isPre: c.isPre,
    }));
    const means = Array.from({ length: nPeriods }, (_, t) => ({
      t, treated: +(treatSum[t] / tc).toFixed(3), control: +(ctrlSum[t] / cc).toFixed(3),
    }));
    return { chartData, es, means };
  }, [nUnits, nPeriods, cohort, effect, noise, seed, mode]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.econV39.text003", { defaultValue: "干净事件 (平行趋势成立)" }), description: t("labs.econV39.text004", { defaultValue: "动态处理效应" }), apply: () => { setMode("dynamic"); setEffect(2); setNoise(0.4); } },
        { name: t("labs.econV39.text005", { defaultValue: "违反平行趋势" }), description: t("labs.econV39.text006", { defaultValue: "处理组存在差异化预趋势" }), apply: () => { setMode("trend"); } },
        { name: t("labs.econV39.text007", { defaultValue: "预期效应" }), description: t("labs.econV39.text008", { defaultValue: "处理前一期已有反应" }), apply: () => { setMode("anticip"); } },
        { name: t("labs.econV39.text009", { defaultValue: "常数效应" }), description: t("labs.econV39.text010", { defaultValue: "固定 ATT" }), apply: () => { setMode("clean"); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.econV39.text011", { defaultValue: "单位数 N" })} value={nUnits} min={20} max={120} step={10} onChange={setNUnits} />
            <Slider label={t("labs.econV39.text012", { defaultValue: "期数 T" })} value={nPeriods} min={8} max={20} step={1} onChange={setNPeriods} />
            <Slider label={t("labs.econV39.text013", { defaultValue: "处理时点 g" })} value={cohort} min={3} max={nPeriods - 2} step={1} onChange={setCohort} />
            <Slider label={t("labs.econV39.text014", { defaultValue: "处理效应" })} value={effect} min={0} max={5} step={0.1} onChange={setEffect} fmt={(v) => v.toFixed(1)} />
            <Slider label={t("labs.econV39.text015", { defaultValue: "噪声 σ" })} value={noise} min={0.1} max={1.5} step={0.1} onChange={setNoise} fmt={(v) => v.toFixed(1)} />
            <Slider label={t("labs.econV39.text016", { defaultValue: "随机种子" })} value={seed} min={1} max={999} step={1} onChange={setSeed} />
          </div>
          <div className="flex flex-wrap gap-2">
            {([["dynamic", t("labs.econV39.text017", { defaultValue: "动态效应" })], ["clean", t("labs.econV39.text018", { defaultValue: "常数效应" })], ["trend", t("labs.econV39.text019", { defaultValue: "违反平行" })], ["anticip", t("labs.econV39.text020", { defaultValue: "预期效应" })]] as [DIDMode, string][]).map(([m, l]) => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-all ${mode === m ? "bg-gold/20 border-gold text-gold" : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 content-start">
          <Stat label={t("labs.econV39.text021", { defaultValue: "平均后期 ATT" })} value={Number.isFinite(es.attAvg) ? es.attAvg.toFixed(3) : "—"} />
          <Stat label={t("labs.econV39.text022", { defaultValue: "平行趋势检验 p" })} value={Number.isFinite(es.parallelTrend.pValue) ? es.parallelTrend.pValue.toFixed(3) : "—"}
            color={es.parallelTrend.reject ? CHART_RED : CHART_TEAL} sub={`χ²(${es.parallelTrend.df})=${es.parallelTrend.stat.toFixed(2)}`} />
          <div className="col-span-2">
            <Note>
              <p><span className="text-gold">{t("labs.econV39.text023", { defaultValue: "平行趋势检验：" })}</span>{t("labs.econV39.text024", { defaultValue: "联合检验所有 pre-period 系数 δ" })}<sub>k</sub>=0 (k&lt;−1)。 {" "}
                <TestBadge reject={es.parallelTrend.reject} labels={[t("labs.econV39.text025", { defaultValue: "拒绝 → 平行趋势可疑" }), t("labs.econV39.text026", { defaultValue: "不拒绝 → 支持平行趋势" })]} /></p>
              <p>{t("labs.econV39.text027", { defaultValue: "模型: y" })}<sub>it</sub>=α<sub>i</sub>+γ<sub>t</sub>+Σ<sub>k≠−1</sub> δ<sub>k</sub>·1{`{t−g_i=k}`}+ε<sub>it</sub>{t("labs.econV39.text028", { defaultValue: "，双向固定效应，单位聚类稳健 SE。" })}</p>
            </Note>
          </div>
        </div>
      </div>

      {/* Dynamic treatment effects (event-study plot) */}
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.econV39.text029", { defaultValue: "动态处理效应 δ" })}<sub>k</sub> {t("labs.econV39.text030", { defaultValue: "(事件研究图) — 95% 置信区间" })}</h4>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="k" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: t("labs.econV39.text031", { defaultValue: "事件时间 k (相对处理时点)" }), position: "insideBottom", offset: -4, fill: CHART_TEXT, fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltip} />
              <ReferenceLine y={0} stroke={CHART_TEXT} strokeDasharray="4 4" />
              <ReferenceLine x={-1} stroke={CHART_BLUE} strokeDasharray="3 3" label={{ value: t("labs.econV39.text032", { defaultValue: "基准 k=−1" }), fill: CHART_BLUE, fontSize: 9, position: "top" }} />
              <ReferenceArea x1={-1} x2={chartData[chartData.length - 1].k} fill={CHART_GOLD} fillOpacity={0.04} />
              <Line dataKey="coef" name="δ_k" stroke={CHART_GOLD} strokeWidth={2} dot={{ r: 3 }}>
                <ErrorBar dataKey="err" width={4} strokeWidth={1.2} stroke={CHART_GOLD} direction="y" />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground mt-2">{t("labs.econV39.text033", { defaultValue: "左侧 (k&lt;0) 应落在 0 附近 ⇒ 支持平行趋势；右侧 (k≥0) 为随时间演化的处理效应。" })}</p>
      </div>

      {/* Group means (raw parallel-trends visual) */}
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.econV39.text034", { defaultValue: "处理组 vs 对照组均值路径" })}</h4>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={means} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltip} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine x={cohort} stroke={CHART_RED} strokeDasharray="4 4" label={{ value: t("labs.econV39.text035", { defaultValue: "处理" }), fill: CHART_RED, fontSize: 9 }} />
              <Line dataKey="treated" name={t("labs.econV39.text036", { defaultValue: "处理组" })} stroke={CHART_GOLD} strokeWidth={2} dot={false} />
              <Line dataKey="control" name={t("labs.econV39.text037", { defaultValue: "对照组" })} stroke={CHART_TEAL} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   2. Panel unit-root & cointegration — LLC / IPS / Pedroni
   ══════════════════════════════════════════════════════════════════ */
type PanelTest = "root" | "coint";
type PanelDGP = "stationary" | "unitroot" | "coint" | "nocoint";

export const PanelRootTool = () => {
  const { t } = useTranslation();
  const [testType, setTestType] = useState<PanelTest>("root");
  const [N, setN] = useState(20);
  const [T, setT] = useState(60);
  const [rho, setRho] = useState(0.6);
  const [lags, setLags] = useState(1);
  const [seed, setSeed] = useState(7);

  const result = useMemo(() => {
    const rng = mulberry32(seed);
    if (testType === "root") {
      const series: number[][] = [];
      for (let i = 0; i < N; i++) {
        const s = [randn(rng)];
        for (let t = 1; t < T; t++) s.push(rho * s[t - 1] + randn(rng));
        series.push(s);
      }
      const r = panelUnitRoot(series, lags);
      return { kind: "root" as const, r, series };
    } else {
      const yS: number[][] = [], xS: number[][] = [];
      for (let i = 0; i < N; i++) {
        const x = [randn(rng)];
        for (let t = 1; t < T; t++) x.push(x[t - 1] + randn(rng)); // I(1) regressor
        const y: number[] = []; let e = 0;
        for (let t = 0; t < T; t++) { e = rho * e + randn(rng); y.push(1 + 0.8 * x[t] + e); }
        yS.push(y); xS.push(x);
      }
      const r = pedroniCointegration(yS, xS, lags);
      return { kind: "coint" as const, r, yS, xS };
    }
  }, [testType, N, T, rho, lags, seed]);

  const perUnitChart = result.kind === "root"
    ? result.r.perUnit.map((u) => ({ unit: u.unit, t: +u.tstat.toFixed(3) }))
    : result.r.perUnit.map((u) => ({ unit: u.unit, t: +u.adfT.toFixed(3) }));

  const seriesChart = useMemo(() => {
    const src = result.kind === "root" ? result.series : result.yS;
    const show = Math.min(6, src.length);
    return Array.from({ length: T }, (_, t) => {
      const row: Record<string, number> = { t };
      for (let i = 0; i < show; i++) row[`u${i}`] = +src[i][t].toFixed(3);
      return row;
    });
  }, [result, T]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.econV39.text038", { defaultValue: "平稳面板" }), description: t("labs.econV39.text039", { defaultValue: "LLC/IPS 应拒绝单位根" }), apply: () => { setTestType("root"); setRho(0.5); } },
        { name: t("labs.econV39.text040", { defaultValue: "单位根面板" }), description: t("labs.econV39.text041", { defaultValue: "随机游走" }), apply: () => { setTestType("root"); setRho(0.98); } },
        { name: t("labs.econV39.text042", { defaultValue: "协整面板" }), description: t("labs.econV39.text043", { defaultValue: "Pedroni 应拒绝无协整" }), apply: () => { setTestType("coint"); setRho(0.4); } },
        { name: t("labs.econV39.text044", { defaultValue: "无协整面板" }), description: t("labs.econV39.text045", { defaultValue: "残差为 I(1)" }), apply: () => { setTestType("coint"); setRho(0.98); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex gap-2">
            {([["root", t("labs.econV39.text046", { defaultValue: "面板单位根 (LLC / IPS)" })], ["coint", t("labs.econV39.text047", { defaultValue: "面板协整 (Pedroni)" })]] as [PanelTest, string][]).map(([v, l]) => (
              <button key={v} onClick={() => setTestType(v)}
                className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-all ${testType === v ? "bg-gold/20 border-gold text-gold" : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"}`}>{l}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.econV39.text048", { defaultValue: "单位数 N" })} value={N} min={8} max={40} step={2} onChange={setN} />
            <Slider label={t("labs.econV39.text049", { defaultValue: "期数 T" })} value={T} min={30} max={120} step={10} onChange={setT} />
            <Slider label={testType === "root" ? t("labs.econV39.text050", { defaultValue: "AR 系数 ρ" }) : t("labs.econV39.text051", { defaultValue: "残差自回归 ρ" })} sub={testType === "root" ? t("labs.econV39.text052", { defaultValue: "1=单位根" }) : t("labs.econV39.text053", { defaultValue: "1=无协整" })} value={rho} min={0.1} max={1.0} step={0.02} onChange={setRho} fmt={(v) => v.toFixed(2)} />
            <Slider label={t("labs.econV39.text054", { defaultValue: "ADF 滞后阶" })} value={lags} min={0} max={4} step={1} onChange={setLags} />
            <Slider label={t("labs.econV39.text055", { defaultValue: "随机种子" })} value={seed} min={1} max={999} step={1} onChange={setSeed} />
          </div>
        </div>

        <div className="space-y-3">
          {result.kind === "root" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Stat label={t("labs.econV39.text056", { defaultValue: "LLC 统计量 (共同根)" })} value={result.r.llc.stat.toFixed(3)} color={result.r.llc.reject ? CHART_TEAL : CHART_RED} sub={`p=${result.r.llc.pValue.toFixed(3)}`} />
                <Stat label={t("labs.econV39.text057", { defaultValue: "IPS W-tbar (异质根)" })} value={result.r.ips.stat.toFixed(3)} color={result.r.ips.reject ? CHART_TEAL : CHART_RED} sub={`p=${result.r.ips.pValue.toFixed(3)}`} />
              </div>
              <Note>
                <p><span className="text-gold">{t("labs.econV39.text058", { defaultValue: "H₀：所有单位存在单位根 (非平稳)。" })}</span>{t("labs.econV39.text059", { defaultValue: "左尾检验。" })}</p>
                <p>LLC: <TestBadge reject={result.r.llc.reject} labels={[t("labs.econV39.text060", { defaultValue: "拒绝 → 平稳" }), t("labs.econV39.text061", { defaultValue: "不拒绝 → 单位根" })]} /> ｜ IPS: <TestBadge reject={result.r.ips.reject} labels={[t("labs.econV39.text062", { defaultValue: "拒绝 → 至少部分平稳" }), t("labs.econV39.text063", { defaultValue: "不拒绝 → 单位根" })]} /></p>
                <p>t̄={result.r.ips.tbar.toFixed(3)}{t("labs.econV39.text064", { defaultValue: "。LLC 假设同质 ρ；IPS 允许各单位 ρ" })}<sub>i</sub> {t("labs.econV39.text065", { defaultValue: "不同（更稳健）。" })}</p>
              </Note>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Panel-ADF" value={result.r.panelADF.stat.toFixed(3)} color={result.r.panelADF.reject ? CHART_TEAL : CHART_RED} sub={`p=${result.r.panelADF.pValue.toFixed(3)}`} />
                <Stat label="Group-ADF" value={result.r.groupADF.stat.toFixed(3)} color={result.r.groupADF.reject ? CHART_TEAL : CHART_RED} sub={`p=${result.r.groupADF.pValue.toFixed(3)}`} />
              </div>
              <Note>
                <p><span className="text-gold">{t("labs.econV39.text066", { defaultValue: "H₀：无协整 (回归残差为 I(1))。" })}</span>{t("labs.econV39.text067", { defaultValue: "左尾检验。" })}</p>
                <p>Panel: <TestBadge reject={result.r.panelADF.reject} labels={[t("labs.econV39.text068", { defaultValue: "拒绝 → 存在协整" }), t("labs.econV39.text069", { defaultValue: "不拒绝 → 无协整" })]} /> ｜ Group: <TestBadge reject={result.r.groupADF.reject} labels={[t("labs.econV39.text070", { defaultValue: "拒绝 → 存在协整" }), t("labs.econV39.text071", { defaultValue: "不拒绝 → 无协整" })]} /></p>
                <p>{t("labs.econV39.text072", { defaultValue: "每单位先做协整回归 y=a+b·x+e，再对 ê 做 ADF。Panel 汇总(组内)、Group 平均(组间)。" })}</p>
              </Note>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.econV39.text073", { defaultValue: "各单位 ADF t 统计量" })}</h4>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perUnitChart} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="unit" stroke={CHART_TEXT} tick={{ fontSize: 9 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={chartTooltip} />
                <ReferenceLine y={-1.95} stroke={CHART_RED} strokeDasharray="4 4" label={{ value: t("labs.econV39.text074", { defaultValue: "≈临界 −1.95" }), fill: CHART_RED, fontSize: 9 }} />
                <Bar dataKey="t" name="ADF t">
                  {perUnitChart.map((d, i) => <Cell key={i} fill={d.t < -1.95 ? CHART_TEAL : CHART_GOLD} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.econV39.text075", { defaultValue: "样本序列 (前 6 个单位)" })}</h4>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seriesChart} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={CHART_TEXT} tick={{ fontSize: 9 }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={chartTooltip} />
                {Array.from({ length: 6 }, (_, i) => (
                  <Line key={i} dataKey={`u${i}`} stroke={[CHART_GOLD, CHART_TEAL, CHART_BLUE, CHART_RED, "#a855f7", "#f59e0b"][i]} strokeWidth={1.2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   3. Quantile regression + marginal effects with bootstrap CI
   ══════════════════════════════════════════════════════════════════ */
type QRDGP = "hetero" | "homo" | "locscale";

export const QuantileMfxTool = () => {
  const { t } = useTranslation();
  const [n, setN] = useState(300);
  const [b1, setB1] = useState(2.0);
  const [B, setB] = useState(150);
  const [dgp, setDgp] = useState<QRDGP>("hetero");
  const [seed, setSeed] = useState(42);

  const { taus, boot, scatter, fitLines, xEval } = useMemo(() => {
    const rng = mulberry32(seed);
    const X: number[][] = [], y: number[] = [], scatter: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const x = -2 + 4 * (i / (n - 1)) + 0.03 * randn(rng);
      let eps = randn(rng);
      if (dgp === "homo") eps *= 0.6;
      else if (dgp === "hetero") eps *= (0.25 + 0.55 * (x + 2)); // scale grows with x
      else eps *= (0.3 + 0.4 * Math.abs(x));
      const yv = 1 + b1 * x + eps;
      X.push([x]); y.push(yv); scatter.push({ x: +x.toFixed(3), y: +yv.toFixed(3) });
    }
    const taus = [0.1, 0.25, 0.5, 0.75, 0.9];
    const boot = bootstrapQuantileReg(X, y, taus, B);
    // Coefficient path over finer grid for the marginal-effect curve
    const grid = Array.from({ length: 19 }, (_, i) => (i + 1) / 20);
    const gridBoot = bootstrapQuantileReg(X, y, grid, Math.max(60, Math.floor(B / 2)), 0.05, seed + 1);
    const path = gridBoot.map((p) => ({
      tau: +p.tau.toFixed(2), me: +p.coef[1].toFixed(3),
      lo: +p.ciLo[1].toFixed(3), hi: +p.ciHi[1].toFixed(3),
      band: [+p.ciLo[1].toFixed(3), +p.ciHi[1].toFixed(3)] as [number, number],
    }));
    const xs = X.map((r) => r[0]);
    const xMin = Math.min(...xs), xMax = Math.max(...xs);
    const xEval = Array.from({ length: 40 }, (_, i) => xMin + ((xMax - xMin) * i) / 39);
    const fitLines = xEval.map((xv) => {
      const row: Record<string, number> = { x: +xv.toFixed(3) };
      boot.forEach((p) => { row[`q${Math.round(p.tau * 100)}`] = +(p.coef[0] + p.coef[1] * xv).toFixed(3); });
      return row;
    });
    (fitLines as any).path = path;
    return { taus, boot, scatter, fitLines, xEval };
  }, [n, b1, B, dgp, seed]);

  const path = (fitLines as any).path as { tau: number; me: number; lo: number; hi: number; band: [number, number] }[];

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.econV39.text076", { defaultValue: "异方差 (边际效应发散)" }), description: "scale ∝ x", apply: () => { setDgp("hetero"); } },
        { name: t("labs.econV39.text077", { defaultValue: "同方差 (退化为 OLS)" }), description: t("labs.econV39.text078", { defaultValue: "β(τ) 水平" }), apply: () => { setDgp("homo"); } },
        { name: t("labs.econV39.text079", { defaultValue: "位置-尺度" }), description: "scale ∝ |x|", apply: () => { setDgp("locscale"); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.econV39.text080", { defaultValue: "样本量 n" })} value={n} min={100} max={600} step={50} onChange={setN} />
            <Slider label={t("labs.econV39.text081", { defaultValue: "真实 β₁" })} value={b1} min={0} max={4} step={0.1} onChange={setB1} fmt={(v) => v.toFixed(1)} />
            <Slider label={t("labs.econV39.text082", { defaultValue: "Bootstrap 次数 B" })} value={B} min={50} max={400} step={50} onChange={setB} />
            <Slider label={t("labs.econV39.text083", { defaultValue: "随机种子" })} value={seed} min={1} max={999} step={1} onChange={setSeed} />
          </div>
          <div className="flex flex-wrap gap-2">
            {([["hetero", t("labs.econV39.text084", { defaultValue: "异方差" })], ["homo", t("labs.econV39.text085", { defaultValue: "同方差" })], ["locscale", t("labs.econV39.text086", { defaultValue: "位置-尺度" })]] as [QRDGP, string][]).map(([m, l]) => (
              <button key={m} onClick={() => setDgp(m)}
                className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-all ${dgp === m ? "bg-gold/20 border-gold text-gold" : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"}`}>{l}</button>
            ))}
          </div>
          <Note>
            <p><span className="text-gold">{t("labs.econV39.text087", { defaultValue: "分位数边际效应：" })}</span>{t("labs.econV39.text088", { defaultValue: "线性模型下 ∂Q" })}<sub>τ</sub>(y|x)/∂x = β₁(τ)。</p>
            <p>{t("labs.econV39.text089", { defaultValue: "Bootstrap: 对 (x,y) 成对重抽样 B 次，取百分位得 95% 置信区间与标准误。" })}</p>
            <p>{t("labs.econV39.text090", { defaultValue: "异方差下 β₁(τ) 随 τ 变化 ⇒ OLS 单一斜率会遗漏分布尾部信息。" })}</p>
          </Note>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.econV39.text091", { defaultValue: "分位系数与 Bootstrap 置信区间" })}</p>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs font-mono">
              <thead className="bg-secondary/60 text-muted-foreground">
                <tr><th className="py-1.5 px-2 text-left">τ</th><th className="py-1.5 px-2 text-right">β₁(τ)</th><th className="py-1.5 px-2 text-right">Boot SE</th><th className="py-1.5 px-2 text-right">95% CI</th></tr>
              </thead>
              <tbody>
                {boot.map((p) => (
                  <tr key={p.tau} className="border-t border-border">
                    <td className="py-1.5 px-2 text-foreground">{p.tau.toFixed(2)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums" style={{ color: CHART_TEAL }}>{p.coef[1].toFixed(3)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{p.se[1].toFixed(3)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">[{p.ciLo[1].toFixed(2)}, {p.ciHi[1].toFixed(2)}]</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Marginal-effect curve with bootstrap band */}
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.econV39.text092", { defaultValue: "分位边际效应 β₁(τ) — Bootstrap 95% 置信带" })}</h4>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={path} margin={{ top: 10, right: 20, bottom: 6, left: 0 }}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="tau" stroke={CHART_TEXT} tick={{ fontSize: 10 }} label={{ value: t("labs.econV39.text093", { defaultValue: "分位数 τ" }), position: "insideBottom", offset: -4, fill: CHART_TEXT, fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltip} />
              <Area dataKey="band" name="95% CI" stroke="none" fill={CHART_GOLD} fillOpacity={0.15} />
              <Line dataKey="me" name="β₁(τ)" stroke={CHART_GOLD} strokeWidth={2.5} dot={{ r: 2 }} />
              <ReferenceLine y={b1} stroke={CHART_TEAL} strokeDasharray="4 4" label={{ value: t("labs.econV39.text094", { defaultValue: "真值 {{var1}}", var1: b1.toFixed(1) }), fill: CHART_TEAL, fontSize: 9 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Scatter + quantile fits */}
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.econV39.text095", { defaultValue: "分位拟合线 τ ∈" })} {`{0.10 … 0.90}`}</h4>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart margin={{ top: 10, right: 20, bottom: 6, left: 0 }}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltip} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Scatter data={scatter} dataKey="y" fill={CHART_TEXT} fillOpacity={0.35} name={t("labs.econV39.text096", { defaultValue: "样本" })} />
              <Line data={fitLines} dataKey="q10" stroke={CHART_BLUE} strokeWidth={1.5} dot={false} name="τ=0.10" strokeDasharray="3 3" />
              <Line data={fitLines} dataKey="q50" stroke={CHART_GOLD} strokeWidth={2.5} dot={false} name="τ=0.50" />
              <Line data={fitLines} dataKey="q90" stroke={CHART_TEAL} strokeWidth={1.5} dot={false} name="τ=0.90" strokeDasharray="3 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   4. One-click diagnostic report + PDF export
   ══════════════════════════════════════════════════════════════════ */
type ReportDGP = "clean" | "hetero" | "autocorr" | "nonlinear" | "collinear";

export const DiagnosticReportTool = () => {
  const { t } = useTranslation();
  const [scenario, setScenario] = useState<ReportDGP>("hetero");
  const [n, setN] = useState(200);
  const [seed, setSeed] = useState(42);
  const [busy, setBusy] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const R = useMemo(() => {
    const rng = mulberry32(seed);
    const X: number[][] = [], y: number[] = [];
    for (let i = 0; i < n; i++) {
      const x1 = randn(rng);
      let x2 = randn(rng);
      if (scenario === "collinear") x2 = x1 + 0.05 * randn(rng);
      let eps = randn(rng);
      let yi = 1 + 1.5 * x1 - 0.8 * x2;
      if (scenario === "hetero") eps *= (0.3 + 1.2 * Math.abs(x1));
      if (scenario === "nonlinear") yi += 0.9 * x1 * x1;
      if (scenario === "autocorr") { /* handled below */ }
      yi += (scenario === "clean" || scenario === "collinear" || scenario === "nonlinear") ? 0.5 * eps : eps;
      X.push([x1, x2]); y.push(yi);
    }
    if (scenario === "autocorr") {
      let e = 0;
      for (let i = 0; i < n; i++) { e = 0.75 * e + 0.5 * randn(rng); y[i] = 1 + 1.5 * X[i][0] - 0.8 * X[i][1] + e; }
    }
    const fit = olsDetail(X, y);
    const bp = breuschPagan(fit);
    const wh = whiteTest(fit);
    const dw = durbinWatson(fit.resid);
    const bg = breuschGodfrey(fit, 1);
    const vifs = vif(X);
    const cond = conditionNumber(fit.Xd);
    const reset = ramseyReset(X, y, 3);
    const hc3 = robustSE(fit, "HC3");
    const nw = neweyWestSE(fit, 4);
    const names = [t("labs.econV39.text097", { defaultValue: "截距" }), "x₁", "x₂"];
    const coefRows = fit.beta.map((b, i) => ({
      name: names[i], beta: b, se: fit.se[i], hc3: hc3[i], nw: nw[i],
      t: b / fit.se[i], p: tTwoTail(Math.abs(b / fit.se[i]), fit.n - fit.k),
    }));
    const residChart = fit.fitted.map((f, i) => ({ fitted: +f.toFixed(3), resid: +fit.resid[i].toFixed(3) }));
    const sorted = [...fit.resid].sort((a, b) => a - b);
    const qq = sorted.map((r, i) => {
      const p = (i + 0.5) / sorted.length;
      // inverse normal (Acklam approx-lite via rational)
      const z = Math.sqrt(2) * erfInv(2 * p - 1);
      return { theo: +z.toFixed(3), samp: +r.toFixed(3) };
    });
    return { fit, bp, wh, dw, bg, vifs, cond, reset, coefRows, residChart, qq };
  }, [scenario, n, seed]);

  const conclusions: { label: string; ok: boolean; text: string }[] = [
    { label: t("labs.econV39.text098", { defaultValue: "异方差 (BP/White)" }), ok: !R.bp.reject && !R.wh.reject, text: R.bp.reject || R.wh.reject ? t("labs.econV39.text099", { defaultValue: "检测到异方差 → 建议采用 HC3 稳健标准误" }) : t("labs.econV39.text100", { defaultValue: "未检测到异方差 → 经典 OLS 标准误可用" }) },
    { label: t("labs.econV39.text101", { defaultValue: "自相关 (DW/BG)" }), ok: !R.bg.reject && R.dw > 1.6 && R.dw < 2.4, text: R.bg.reject ? t("labs.econV39.text102", { defaultValue: "残差存在序列相关 → 建议 Newey-West (HAC) 标准误" }) : t("labs.econV39.text103", { defaultValue: "未检测到显著序列相关" }) },
    { label: t("labs.econV39.text104", { defaultValue: "多重共线 (VIF/条件数)" }), ok: Math.max(...R.vifs) < 10 && R.cond < 30, text: Math.max(...R.vifs) >= 10 || R.cond >= 30 ? t("labs.econV39.text105", { defaultValue: "存在多重共线性 → 系数不稳定,考虑剔除/正则化" }) : t("labs.econV39.text106", { defaultValue: "共线性可接受" }) },
    { label: t("labs.econV39.text107", { defaultValue: "设定 (RESET)" }), ok: !R.reset.reject, text: R.reset.reject ? t("labs.econV39.text108", { defaultValue: "RESET 拒绝 → 可能遗漏非线性项/设定误" }) : t("labs.econV39.text109", { defaultValue: "未检测到明显设定误" }) },
  ];

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setBusy(true);
    try {
      const dark = document.documentElement.classList.contains("dark");
      const dataUrl = await toPng(reportRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: dark ? "#0a0a0a" : "#ffffff" });
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res) => { img.onload = res; });
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const iw = pw - margin * 2;
      const ih = (img.height / img.width) * iw;
      let remaining = ih, sourceY = 0;
      const pageH = ph - margin * 2;
      const pxPerPt = img.width / iw;
      // paginate the tall image
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      while (remaining > 0) {
        const sliceHpt = Math.min(pageH, remaining);
        const sliceHpx = sliceHpt * pxPerPt;
        canvas.width = img.width;
        canvas.height = sliceHpx;
        ctx.fillStyle = dark ? "#0a0a0a" : "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, sourceY, img.width, sliceHpx, 0, 0, img.width, sliceHpx);
        const slice = canvas.toDataURL("image/png");
        pdf.addImage(slice, "PNG", margin, margin, iw, sliceHpt);
        remaining -= sliceHpt; sourceY += sliceHpx;
        if (remaining > 0) pdf.addPage();
      }
      pdf.save(t("labs.econV39.text110", { defaultValue: "诊断报告-{{var1}}.pdf", var1: scenario }));
      toast({ title: t("labs.econV39.text111", { defaultValue: "已导出 PDF" }), description: t("labs.econV39.text112", { defaultValue: "计量诊断报告" }) });
    } catch {
      toast({ title: t("labs.econV39.text113", { defaultValue: "导出失败" }), variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.econV39.text114", { defaultValue: "干净模型" }), apply: () => setScenario("clean") },
        { name: t("labs.econV39.text115", { defaultValue: "异方差" }), apply: () => setScenario("hetero") },
        { name: t("labs.econV39.text116", { defaultValue: "自相关" }), apply: () => setScenario("autocorr") },
        { name: t("labs.econV39.text117", { defaultValue: "遗漏非线性" }), apply: () => setScenario("nonlinear") },
        { name: t("labs.econV39.text118", { defaultValue: "多重共线" }), apply: () => setScenario("collinear") },
      ]} />

      <div className="flex flex-wrap items-end gap-4 justify-between">
        <div className="grid grid-cols-2 gap-3 flex-1 min-w-[240px] max-w-md">
          <Slider label={t("labs.econV39.text119", { defaultValue: "样本量 n" })} value={n} min={80} max={500} step={20} onChange={setN} />
          <Slider label={t("labs.econV39.text120", { defaultValue: "随机种子" })} value={seed} min={1} max={999} step={1} onChange={setSeed} />
        </div>
        <button onClick={exportPDF} disabled={busy}
          className="px-4 py-2 text-xs font-mono rounded-md border border-gold/40 bg-gold/15 text-gold hover:bg-gold/25 transition-all disabled:opacity-50">
          {busy ? t("labs.econV39.text121", { defaultValue: "导出中…" }) : t("labs.econV39.text122", { defaultValue: "⬇ 导出 PDF 报告" })}
        </button>
      </div>

      {/* The captured report */}
      <div ref={reportRef} className="space-y-5 rounded-xl border border-border bg-card p-5">
        <div className="border-b border-border pb-3">
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold/80">Econometrics Diagnostic Report</p>
          <h3 className="text-lg font-display font-bold text-foreground">{t("labs.econV39.text123", { defaultValue: "一键式计量经济学诊断报告" })}</h3>
          <p className="text-[11px] font-mono text-muted-foreground mt-1">{t("labs.econV39.text124", { defaultValue: "模型: y = β₀ + β₁·x₁ + β₂·x₂ + ε ｜ 场景:" })} {scenario} ｜ n={n} ｜ R²={R.fit.r2.toFixed(3)}</p>
        </div>

        {/* Executive summary */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.econV39.text125", { defaultValue: "结论摘要" })}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {conclusions.map((c) => (
              <div key={c.label} className={`rounded-lg border p-3 ${c.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={c.ok ? "text-emerald-500" : "text-red-500"}>{c.ok ? "✓" : "✗"}</span>
                  <span className="text-xs font-semibold text-foreground">{c.label}</span>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground leading-snug">{c.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Coefficient table */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.econV39.text126", { defaultValue: "系数表 (含稳健标准误)" })}</h4>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs font-mono">
              <thead className="bg-secondary/60 text-muted-foreground">
                <tr>
                  <th className="py-1.5 px-2 text-left">{t("labs.econV39.text127", { defaultValue: "变量" })}</th><th className="py-1.5 px-2 text-right">{t("labs.econV39.text128", { defaultValue: "系数" })}</th>
                  <th className="py-1.5 px-2 text-right">OLS SE</th><th className="py-1.5 px-2 text-right">HC3</th>
                  <th className="py-1.5 px-2 text-right">Newey-West</th><th className="py-1.5 px-2 text-right">t</th><th className="py-1.5 px-2 text-right">p</th>
                </tr>
              </thead>
              <tbody>
                {R.coefRows.map((r) => (
                  <tr key={r.name} className="border-t border-border">
                    <td className="py-1.5 px-2 text-foreground">{r.name}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-gold">{r.beta.toFixed(3)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{r.se.toFixed(3)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{r.hc3.toFixed(3)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{r.nw.toFixed(3)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{r.t.toFixed(2)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums" style={{ color: r.p < 0.05 ? CHART_TEAL : CHART_TEXT }}>{r.p.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Test table */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.econV39.text129", { defaultValue: "关键检验" })}</h4>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs font-mono">
              <thead className="bg-secondary/60 text-muted-foreground">
                <tr><th className="py-1.5 px-2 text-left">{t("labs.econV39.text130", { defaultValue: "检验" })}</th><th className="py-1.5 px-2 text-right">{t("labs.econV39.text131", { defaultValue: "统计量" })}</th><th className="py-1.5 px-2 text-right">{t("labs.econV39.text132", { defaultValue: "p / 值" })}</th><th className="py-1.5 px-2 text-right">{t("labs.econV39.text133", { defaultValue: "结论" })}</th></tr>
              </thead>
              <tbody>
                {[
                  { k: t("labs.econV39.text134", { defaultValue: "Breusch-Pagan (异方差)" }), s: R.bp.stat, p: R.bp.pValue, r: R.bp.reject },
                  { k: t("labs.econV39.text135", { defaultValue: "White (异方差)" }), s: R.wh.stat, p: R.wh.pValue, r: R.wh.reject },
                  { k: t("labs.econV39.text136", { defaultValue: "Breusch-Godfrey (自相关)" }), s: R.bg.stat, p: R.bg.pValue, r: R.bg.reject },
                  { k: t("labs.econV39.text137", { defaultValue: "Ramsey RESET (设定)" }), s: R.reset.stat, p: R.reset.pValue, r: R.reset.reject },
                ].map((row) => (
                  <tr key={row.k} className="border-t border-border">
                    <td className="py-1.5 px-2 text-foreground">{row.k}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{row.s.toFixed(3)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{row.p.toFixed(3)}</td>
                    <td className="py-1.5 px-2 text-right"><TestBadge reject={row.r} /></td>
                  </tr>
                ))}
                <tr className="border-t border-border">
                  <td className="py-1.5 px-2 text-foreground">Durbin-Watson</td>
                  <td className="py-1.5 px-2 text-right tabular-nums">{R.dw.toFixed(3)}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{t("labs.econV39.text138", { defaultValue: "≈2 理想" })}</td>
                  <td className="py-1.5 px-2 text-right"><TestBadge reject={R.dw < 1.6 || R.dw > 2.4} labels={[t("labs.econV39.text139", { defaultValue: "偏离" }), t("labs.econV39.text140", { defaultValue: "正常" })]} /></td>
                </tr>
                <tr className="border-t border-border">
                  <td className="py-1.5 px-2 text-foreground">{t("labs.econV39.text141", { defaultValue: "VIF (max) / 条件数" })}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums">{Math.max(...R.vifs).toFixed(2)}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums">{R.cond.toFixed(1)}</td>
                  <td className="py-1.5 px-2 text-right"><TestBadge reject={Math.max(...R.vifs) >= 10 || R.cond >= 30} labels={[t("labs.econV39.text142", { defaultValue: "共线" }), t("labs.econV39.text143", { defaultValue: "正常" })]} /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-1">{t("labs.econV39.text144", { defaultValue: "残差 vs 拟合值" })}</h4>
            <div className="h-[200px] rounded-lg border border-border bg-secondary/20 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart margin={{ top: 8, right: 10, bottom: 4, left: -10 }}>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="fitted" stroke={CHART_TEXT} tick={{ fontSize: 9 }} />
                  <YAxis type="number" dataKey="resid" stroke={CHART_TEXT} tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={chartTooltip} />
                  <ReferenceLine y={0} stroke={CHART_RED} strokeDasharray="4 4" />
                  <Scatter data={R.residChart} dataKey="resid" fill={CHART_GOLD} fillOpacity={0.5} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-1">{t("labs.econV39.text145", { defaultValue: "残差 Q-Q 图" })}</h4>
            <div className="h-[200px] rounded-lg border border-border bg-secondary/20 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart margin={{ top: 8, right: 10, bottom: 4, left: -10 }}>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="theo" stroke={CHART_TEXT} tick={{ fontSize: 9 }} />
                  <YAxis type="number" dataKey="samp" stroke={CHART_TEXT} tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={chartTooltip} />
                  <Scatter data={R.qq} dataKey="samp" fill={CHART_TEAL} fillOpacity={0.5} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground border-t border-border pt-2">{t("labs.econV39.text146", { defaultValue: "由 Econ &amp; Finance Lab 生成 · 教学用途 · 稳健推断: BP/White → HC3, BG/DW → Newey-West" })}</p>
      </div>
    </div>
  );
};

/* Inverse error function (Winitzki approximation) for the Q-Q plot. */
function erfInv(x: number): number {
  const a = 0.147;
  const ln = Math.log(1 - x * x);
  const t1 = 2 / (Math.PI * a) + ln / 2;
  return Math.sign(x) * Math.sqrt(Math.sqrt(t1 * t1 - ln / a) - t1);
}
import { useMemo, useState } from "react";
import {
  ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, BarChart, Bar, Cell,
} from "recharts";
import { RefreshCw, Loader2 } from "lucide-react";
import PresetButtons from "../PresetButtons";
import SendToTool from "../common/SendToTool";
import {
  fitNS, fitNSS, sampleNS, sampleNSS,
  type CurvePoint, type NSFit, type NSSFit,
} from "@/lib/quant/termStructure";
import { useFredYieldCurve } from "@/lib/marketData";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

type Model = "ns" | "nss";

// A representative upward-sloping curve (US Treasury-like) as the default sample.
const SAMPLE_NORMAL: CurvePoint[] = [
  { tau: 0.25, yield: 4.55 }, { tau: 0.5, yield: 4.62 }, { tau: 1, yield: 4.35 },
  { tau: 2, yield: 4.10 }, { tau: 3, yield: 4.02 }, { tau: 5, yield: 4.05 },
  { tau: 7, yield: 4.18 }, { tau: 10, yield: 4.32 }, { tau: 20, yield: 4.65 },
  { tau: 30, yield: 4.58 },
];
const SAMPLE_INVERTED: CurvePoint[] = [
  { tau: 0.25, yield: 5.40 }, { tau: 0.5, yield: 5.35 }, { tau: 1, yield: 5.05 },
  { tau: 2, yield: 4.70 }, { tau: 3, yield: 4.45 }, { tau: 5, yield: 4.25 },
  { tau: 7, yield: 4.20 }, { tau: 10, yield: 4.18 }, { tau: 20, yield: 4.40 },
  { tau: 30, yield: 4.35 },
];
const SAMPLE_HUMPED: CurvePoint[] = [
  { tau: 0.25, yield: 3.10 }, { tau: 0.5, yield: 3.45 }, { tau: 1, yield: 3.95 },
  { tau: 2, yield: 4.45 }, { tau: 3, yield: 4.70 }, { tau: 5, yield: 4.80 },
  { tau: 7, yield: 4.65 }, { tau: 10, yield: 4.40 }, { tau: 20, yield: 4.05 },
  { tau: 30, yield: 3.85 },
];

const sliderText = (v: number) => (Number.isFinite(v) ? v.toFixed(3) : "—");

const Stat = ({ label, value, color = CHART_GOLD, sub }: { label: string; value: string; color?: string; sub?: string }) => (
  <div className="rounded-lg bg-secondary/40 border border-border p-3">
    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-base font-mono tabular-nums" style={{ color }}>{value}</p>
    {sub && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

export function NelsonSiegelTool() {
  const [model, setModel] = useState<Model>("ns");
  const [points, setPoints] = useState<CurvePoint[]>(SAMPLE_NORMAL);
  const [raw, setRaw] = useState<string>(
    SAMPLE_NORMAL.map((p) => `${p.tau}, ${p.yield}`).join("\n")
  );
  const [srcNote, setSrcNote] = useState<string>("示例数据 · 正常向上曲线");
  const fred = useFredYieldCurve(false);
  const [fredEnabled, setFredEnabled] = useState(false);
  const liveFred = useFredYieldCurve(fredEnabled);

  const applyRaw = (text: string) => {
    setRaw(text);
    const parsed = text
      .split(/\n/)
      .map((l) => l.split(/[,\t ]+/).map((s) => parseFloat(s.trim())))
      .filter((a) => a.length >= 2 && Number.isFinite(a[0]) && Number.isFinite(a[1]) && a[0] > 0)
      .map(([tau, y]) => ({ tau, yield: y }));
    if (parsed.length >= 3) setPoints(parsed);
  };

  const setSample = (p: CurvePoint[], note: string) => {
    setPoints(p);
    setRaw(p.map((q) => `${q.tau}, ${q.yield}`).join("\n"));
    setSrcNote(note);
  };

  const loadFred = () => {
    setFredEnabled(true);
  };

  // When live FRED data arrives, push it into the editable table.
  useMemo(() => {
    if (fredEnabled && liveFred.points.length >= 4) {
      const p = liveFred.points.map((q) => ({ tau: q.tau, yield: q.yield }));
      setPoints(p);
      setRaw(p.map((q) => `${q.tau.toFixed(3)}, ${q.yield}`).join("\n"));
      setSrcNote(`FRED 美国国债 CMT · ${liveFred.latestDate ?? "最新"}`);
      setFredEnabled(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveFred.points.length, liveFred.latestDate]);

  const fit = useMemo<NSFit | NSSFit | null>(() => {
    try {
      return model === "ns" ? fitNS(points) : fitNSS(points);
    } catch {
      return null;
    }
  }, [points, model]);

  const chartData = useMemo(() => {
    if (!fit) return [];
    const curve =
      model === "ns"
        ? sampleNS(fit as NSFit, 30, 80)
        : sampleNSS(fit as NSSFit, 30, 80);
    return curve;
  }, [fit, model]);

  const scatterData = useMemo(() => points.map((p) => ({ tau: p.tau, observed: p.yield })), [points]);

  const residualData = useMemo(() => {
    if (!fit) return [];
    return points.map((p, i) => ({
      tau: p.tau,
      label: p.tau < 1 ? `${Math.round(p.tau * 12)}M` : `${p.tau}Y`,
      residual: +((fit.residuals[i]) * 100).toFixed(1), // basis points
    }));
  }, [fit, points]);

  const nsFit = model === "ns" ? (fit as NSFit | null) : null;
  const nssFit = model === "nss" ? (fit as NSSFit | null) : null;

  // Short rate handed to the bus (as a decimal): fitted spot at 3M.
  const shortRate = fit ? (chartData[0]?.spot ?? 0) / 100 : 0;
  const longRate = fit ? (fit.b0 ?? 0) / 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Controls ── */}
        <div className="space-y-5">
          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">模型</p>
            <div className="flex gap-2">
              {([["ns", "Nelson-Siegel (3 因子)"], ["nss", "Svensson (4 因子)"]] as [Model, string][]).map(([m, l]) => (
                <button key={m} onClick={() => setModel(m)}
                  className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all ${model === m ? "bg-gold/20 text-gold border border-gold/30" : "bg-secondary text-muted-foreground"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">数据源</p>
            <PresetButtons presets={[
              { name: "正常曲线", description: "向上倾斜的国债曲线", apply: () => setSample(SAMPLE_NORMAL, "示例数据 · 正常向上曲线") },
              { name: "倒挂曲线", description: "短端高于长端", apply: () => setSample(SAMPLE_INVERTED, "示例数据 · 倒挂曲线") },
              { name: "驼峰曲线", description: "中段隆起", apply: () => setSample(SAMPLE_HUMPED, "示例数据 · 驼峰曲线") },
            ]} />
            <button onClick={loadFred} disabled={liveFred.isLoading && fredEnabled}
              className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded-lg border border-gold/30 bg-gold/10 text-gold hover:bg-gold/20 transition-colors disabled:opacity-50">
              {fredEnabled && liveFred.isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              从 FRED 拉取美国国债曲线
            </button>
            {fredEnabled && liveFred.isError && (
              <p className="text-[10px] font-mono text-red-400 mt-1">拉取失败,请稍后重试或使用示例数据。</p>
            )}
            <p className="text-[10px] font-mono text-muted-foreground mt-1">{srcNote}</p>
          </div>

          <div>
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2 block">
              期限(年), 收益率(%) — 每行一对
            </label>
            <textarea value={raw} onChange={(e) => applyRaw(e.target.value)} rows={6}
              spellCheck={false}
              className="w-full text-xs font-mono rounded-lg bg-secondary/40 border border-border p-3 text-foreground focus:border-gold/40 focus:outline-none resize-y tabular-nums" />
          </div>

          {/* Fitted parameters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Stat label="β₀ Level" value={sliderText(fit?.b0 ?? NaN)} sub="长端水平" />
            <Stat label="β₁ Slope" value={sliderText(fit?.b1 ?? NaN)} color={CHART_TEAL} sub="斜率" />
            <Stat label="β₂ Curv" value={sliderText(fit?.b2 ?? NaN)} color={CHART_BLUE} sub="曲率" />
            {nssFit && <Stat label="β₃ Curv2" value={sliderText(nssFit.b3)} color={CHART_RED} sub="第二驼峰" />}
            <Stat label={model === "ns" ? "λ" : "λ₁"} value={sliderText(nsFit?.lambda ?? nssFit?.lambda1 ?? NaN)} sub="衰减" />
            {nssFit && <Stat label="λ₂" value={sliderText(nssFit.lambda2)} sub="第二衰减" />}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="RMSE" value={fit ? `${(fit.rmse * 100).toFixed(1)} bp` : "—"} color={CHART_RED} sub="拟合误差" />
            <Stat label="R²" value={fit ? fit.r2.toFixed(4) : "—"} sub="拟合优度" />
          </div>

          <div className="flex justify-end">
            <SendToTool
              fromId="ns-curve"
              label="收益率曲线拟合"
              outputs={{ r: shortRate }}
              targets={["rate-model", "bond"]}
            />
          </div>
        </div>

        {/* ── Fitted curve chart ── */}
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
            拟合曲线 vs 观测点
          </p>
          <div className="rounded-xl bg-secondary/30 border border-border p-4">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="tau" type="number" domain={[0, 30]} stroke={CHART_TEXT}
                  tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
                  label={{ value: "期限 τ (年)", position: "insideBottom", offset: -2, style: { fontSize: 11, fill: CHART_TEXT, fontFamily: "var(--font-mono)" } }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} width={42}
                  label={{ value: "利率 (%)", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 11, fill: CHART_TEXT, fontFamily: "var(--font-mono)" } }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-mono)" }} />
                <Line type="monotone" dataKey="spot" name="拟合即期" stroke={CHART_GOLD} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="forward" name="瞬时远期" stroke={CHART_TEAL} strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                <Scatter data={scatterData} dataKey="observed" name="观测点" fill={CHART_RED} />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: "var(--font-mono)" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono mt-2 text-center">
            金色 = 拟合即期曲线 · 青色虚线 = 瞬时远期 · 红点 = 观测收益率
          </p>

          {/* Residuals */}
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mt-4 mb-2">拟合残差 (bp)</p>
          <div className="rounded-xl bg-secondary/30 border border-border p-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={residualData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="label" stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} />
                <YAxis stroke={CHART_TEXT} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} width={38} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-mono)" }} />
                <ReferenceLine y={0} stroke={CHART_TEXT} strokeOpacity={0.4} />
                <Bar dataKey="residual" name="残差">
                  {residualData.map((d, i) => (
                    <Cell key={i} fill={d.residual >= 0 ? CHART_GOLD : CHART_TEAL} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Interpretation */}
      <div className="rounded-xl border border-border bg-secondary/30 p-4">
        <p className="text-xs font-mono text-gold mb-2">因子与形态解读</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[11px] font-mono text-muted-foreground">
          <p>长端水平 β₀ ≈ <span className="text-gold">{fit ? fit.b0.toFixed(2) : "—"}%</span>(τ→∞ 收敛值)</p>
          <p>短端利率 ≈ <span className="text-gold">{(shortRate * 100).toFixed(2)}%</span>(3M 拟合值 → 可发送为 r)</p>
          <p>斜率 β₁ = <span className={fit && fit.b1 < 0 ? "text-emerald-400" : "text-red-400"}>{fit ? fit.b1.toFixed(2) : "—"}%</span> {fit ? (fit.b1 < 0 ? "(正常向上)" : "(平坦/倒挂)") : ""}</p>
          <p>曲率 β₂ = <span className="text-blue-400">{fit ? fit.b2.toFixed(2) : "—"}%</span> {fit ? (fit.b2 > 0 ? "(中段凸起)" : "(中段凹陷)") : ""}</p>
          <p>拟合优度 R² = <span className="text-foreground">{fit ? fit.r2.toFixed(4) : "—"}</span>,RMSE = <span className="text-foreground">{fit ? (fit.rmse * 100).toFixed(1) : "—"} bp</span></p>
          <p>数据来源:{srcNote}</p>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground mt-3 leading-relaxed">
          {model === "ns"
            ? "Nelson-Siegel:给定衰减 λ 时曲线对 β 线性,β 由 OLS 求解,λ 用一维网格搜索取残差最小者。三因子 = 水平 / 斜率 / 曲率。"
            : "Svensson 在 NS 上加入第二个曲率因子 β₃(衰减 λ₂),可刻画更复杂的双驼峰形态,常用于欧央行/美联储官方曲线拟合。"}
        </p>
      </div>
    </div>
  );
}

export default NelsonSiegelTool;
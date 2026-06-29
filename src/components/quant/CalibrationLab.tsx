import { useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, ScatterChart, Scatter, Line, ComposedChart,
  XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { Gauge, Activity, Loader2, RefreshCw } from "lucide-react";
import SectionHeader from "@/components/common/SectionHeader";
import EquationBlock from "@/components/common/EquationBlock";
import { Stat, C } from "@/components/frontier/ui";
import { AXIS_PROPS, GRID_PROPS, ThemedTooltip } from "@/components/common/ChartTheme";
import SendToTool from "@/components/common/SendToTool";
import {
  usePriceSeries, syntheticSeries, logReturns, type PriceSource, type PriceSeries,
} from "@/lib/priceSeries";
import { useFredSeries } from "@/lib/marketData";
import PriceSourceBar from "@/components/quant/PriceSourceBar";
import {
  fitGarch11, fitEwmaLambda, fitMertonJump, fitShortRate,
  standardizedResiduals, acf, qqNormal,
} from "@/lib/quant/calibration";

type ModelId = "garch" | "ewma" | "merton" | "vasicek" | "cir";
const VOL_MODELS: { id: ModelId; label: string; desc: string }[] = [
  { id: "garch", label: "GARCH(1,1) · MLE", desc: "高斯极大似然拟合 ω/α/β,估计条件波动与长期波动。" },
  { id: "ewma", label: "EWMA / RiskMetrics", desc: "网格搜索最优衰减因子 λ,对比 RiskMetrics 0.94。" },
  { id: "merton", label: "Merton 跳跃扩散", desc: "阈值分解出扩散波动与跳跃强度/幅度。" },
];
const RATE_MODELS: { id: ModelId; label: string; desc: string }[] = [
  { id: "vasicek", label: "Vasicek 短率", desc: "OU 均值回复,离散 OLS 估计 κ/θ/σ。" },
  { id: "cir", label: "CIR 短率", desc: "平方根扩散,√r 标准化残差估计。" },
];

const FRED_RATES: { id: string; label: string }[] = [
  { id: "DGS3MO", label: "3M 美债" },
  { id: "DGS1", label: "1Y 美债" },
  { id: "DGS2", label: "2Y 美债" },
  { id: "DGS5", label: "5Y 美债" },
];

const pct = (x: number) => (x * 100).toFixed(1) + "%";
const isRate = (m: ModelId) => m === "vasicek" || m === "cir";

export default function CalibrationLab() {
  const [model, setModel] = useState<ModelId>("garch");

  // --- volatility (price) data
  const [source, setSource] = useState<PriceSource>("yahoo");
  const [symbol, setSymbol] = useState("AAPL");
  const [range, setRange] = useState("5y");
  const [demo, setDemo] = useState<PriceSeries | null>(null);

  // --- rate (FRED) data
  const [rateSeries, setRateSeries] = useState("DGS3MO");

  const priceEnabled = !demo && !isRate(model);
  const { series: live, isFetching, error, refetch } = usePriceSeries(source, symbol, range, priceEnabled);
  const series = demo ?? live;
  const fred = useFredSeries(rateSeries, "2010-01-01", isRate(model));

  const returns = useMemo(() => (series ? logReturns(series.prices) : []), [series]);

  const garch = useMemo(() => (model === "garch" && returns.length > 60 ? fitGarch11(returns) : null), [model, returns]);
  const ewma = useMemo(() => (model === "ewma" && returns.length > 60 ? fitEwmaLambda(returns) : null), [model, returns]);
  const merton = useMemo(() => (model === "merton" && returns.length > 60 ? fitMertonJump(returns) : null), [model, returns]);

  const rates = useMemo(() => (fred.data?.values ?? []).map((v) => v / 100).filter(Number.isFinite), [fred.data]);
  const shortRate = useMemo(
    () => (isRate(model) && rates.length > 60 ? fitShortRate(rates, model === "cir" ? "cir" : "vasicek") : null),
    [model, rates]
  );

  // diagnostics from GARCH / EWMA conditional vol
  const diag = useMemo(() => {
    const condVol = garch?.condVol ?? ewma?.condVol;
    if (!condVol || !returns.length) return null;
    const dailyVol = condVol.map((v) => v / Math.sqrt(252));
    const z = standardizedResiduals(returns, dailyVol);
    if (z.length < 30) return null;
    const qq = qqNormal(z).filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 300)) === 0);
    const z2 = z.map((x) => x * x);
    const ac = acf(z2, 15);
    const conf = 1.96 / Math.sqrt(z.length);
    return { qq, ac, conf };
  }, [garch, ewma, returns]);

  const volChart = useMemo(() => {
    const condVol = garch?.condVol ?? ewma?.condVol;
    if (!condVol || !series) return [];
    const offset = series.dates.length - condVol.length;
    const step = Math.max(1, Math.floor(condVol.length / 400));
    const out: { date: string; vol: number }[] = [];
    for (let i = 0; i < condVol.length; i += step) {
      out.push({ date: series.dates[offset + i] ?? String(i), vol: condVol[i] * 100 });
    }
    return out;
  }, [garch, ewma, series]);

  const rateChart = useMemo(() => {
    if (!fred.data || !shortRate) return [];
    const dates = fred.data.dates;
    const step = Math.max(1, Math.floor(rates.length / 400));
    const out: { date: string; rate: number; theta: number }[] = [];
    for (let i = 0; i < rates.length; i += step) {
      out.push({ date: dates[i] ?? String(i), rate: rates[i] * 100, theta: shortRate.theta * 100 });
    }
    return out;
  }, [fred.data, shortRate, rates]);

  const busSigma =
    model === "garch" ? garch?.longRunVol :
    model === "ewma" ? ewma?.latestVol :
    model === "merton" ? merton?.sigmaDiffusion : undefined;
  const busR = isRate(model) ? shortRate?.theta : undefined;

  return (
    <section className="pb-12">
      <SectionHeader
        chapter="Lab"
        kicker="Calibration · Fit to Real Data"
        title="模型校准实验室"
        subtitle="把波动率与短率模型直接拟合到真实行情:GARCH/EWMA/Merton 用价格收益,Vasicek/CIR 用 FRED 真实利率序列。GARCH/EWMA 附标准化残差 QQ 图与 ACF 诊断,拟合得到的 σ / r 可一键发送到定价工具。"
      />

      <div className="container max-w-6xl px-6 space-y-5">
        {isRate(model) ? (
          <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold">FRED 短率序列</p>
            <div className="flex flex-wrap items-center gap-2">
              {FRED_RATES.map((r) => (
                <button key={r.id} onClick={() => setRateSeries(r.id)}
                  className={"px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors " +
                    (r.id === rateSeries ? "border-gold/50 bg-gold/10 text-gold" : "border-border text-muted-foreground hover:text-foreground")}>
                  {r.label}
                </button>
              ))}
              <button onClick={() => fred.refetch()} disabled={fred.isFetching}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono border border-border hover:border-gold/40 hover:text-gold transition-colors disabled:opacity-50">
                {fred.isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                拉取
              </button>
              {rates.length > 0 && <span className="text-[10px] font-mono text-muted-foreground">{rates.length} 个观测</span>}
            </div>
            <p className="text-[10px] font-mono text-muted-foreground">来自 FRED 的日频国债收益率,作为短率代理(已转为小数)。</p>
          </div>
        ) : (
          <PriceSourceBar
            source={source} symbol={symbol} range={range}
            isFetching={isFetching} error={demo ? null : error}
            n={series?.prices.length}
            onSource={(s) => { setSource(s); setDemo(null); }}
            onSymbol={(s) => { setSymbol(s); setDemo(null); }}
            onRange={(r) => { setRange(r); setDemo(null); }}
            onRefetch={() => { setDemo(null); refetch(); }}
            onUseDemo={() => setDemo(syntheticSeries(756, 0.08, 0.3, 23))}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
          <aside className="rounded-xl border border-border bg-card/60 p-4 space-y-3 h-fit">
            <div className="space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold">波动率模型</p>
              {VOL_MODELS.map((mo) => (
                <button key={mo.id} onClick={() => setModel(mo.id)}
                  className={"w-full text-left px-3 py-2 rounded-md border transition-colors " +
                    (mo.id === model ? "border-gold/50 bg-gold/10" : "border-border hover:border-gold/30")}>
                  <p className="text-xs font-medium">{mo.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{mo.desc}</p>
                </button>
              ))}
            </div>
            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold">短率模型</p>
              {RATE_MODELS.map((mo) => (
                <button key={mo.id} onClick={() => setModel(mo.id)}
                  className={"w-full text-left px-3 py-2 rounded-md border transition-colors " +
                    (mo.id === model ? "border-gold/50 bg-gold/10" : "border-border hover:border-gold/30")}>
                  <p className="text-xs font-medium">{mo.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{mo.desc}</p>
                </button>
              ))}
            </div>
          </aside>

          <div className="space-y-5">
            {isRate(model) ? (
              rates.length <= 60 ? (
                <div className="rounded-xl border border-border bg-card/60 p-10 text-center text-sm text-muted-foreground">
                  {fred.isFetching ? "正在拉取 FRED 利率…" : "请拉取至少约 60 个利率观测后再拟合。"}
                </div>
              ) : shortRate && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label="均值回复速度 κ" value={shortRate.kappa.toFixed(3)} color={C.blue} />
                    <Stat label="长期均值 θ" value={pct(shortRate.theta)} color={C.gold} />
                    <Stat label="波动 σ" value={pct(shortRate.sigma)} color={C.teal} />
                    <Stat label="半衰期(年)" value={Number.isFinite(shortRate.halfLife) ? shortRate.halfLife.toFixed(2) : "∞"} color={C.text} />
                  </div>
                  <div className="rounded-xl border border-border bg-card/60 p-4 space-y-2">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{model === "cir" ? "CIR" : "Vasicek"} 模型 SDE</p>
                    <EquationBlock variant="gold" math={model === "cir"
                      ? "dr_t = \\kappa(\\theta - r_t)\\,dt + \\sigma\\sqrt{r_t}\\,dW_t"
                      : "dr_t = \\kappa(\\theta - r_t)\\,dt + \\sigma\\,dW_t"} />
                    <p className="text-[11px] text-muted-foreground">
                      离散回归 r_t = a + b·r_{"{t-1}"} + ε,由 κ = −ln(b)/Δt、θ = a/(1−b) 还原参数;{model === "cir" ? "残差以 √r 标准化得到 σ。" : "由残差方差得到 σ。"}
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <SendToTool fromId="calibration" label={model === "cir" ? "CIR 校准" : "Vasicek 校准"} outputs={{ r: busR }} targets={["bs", "mc", "greeks-desk", "bond"]} />
                  </div>
                  <div className="rounded-xl border border-border bg-card/60 p-4">
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-gold" /> 短率序列 vs 长期均值 θ(%)
                    </p>
                    <ResponsiveContainer width="100%" height={280}>
                      <ComposedChart data={rateChart}>
                        <CartesianGrid {...GRID_PROPS} />
                        <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={48} />
                        <YAxis {...AXIS_PROPS} width={48} />
                        <Tooltip content={<ThemedTooltip />} />
                        <Area type="monotone" dataKey="rate" name="短率" stroke={C.gold} fill={C.gold} fillOpacity={0.12} />
                        <Line type="monotone" dataKey="theta" name="θ" stroke={C.text} dot={false} strokeDasharray="4 3" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground">FRED {rateSeries} · {rates.length} 个观测 · 教学用途,离散估计对采样频率敏感。</p>
                </>
              )
            ) : returns.length <= 60 ? (
              <div className="rounded-xl border border-border bg-card/60 p-10 text-center text-sm text-muted-foreground">
                {isFetching ? "正在拉取真实数据…" : "请拉取至少约 60 个交易日的价格数据后再拟合。"}
              </div>
            ) : (
              <>
                {garch && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label="ω" value={garch.omega.toExponential(2)} color={C.text} />
                    <Stat label="α (ARCH)" value={garch.alpha.toFixed(3)} color={C.blue} />
                    <Stat label="β (GARCH)" value={garch.beta.toFixed(3)} color={C.teal} />
                    <Stat label="持续性 α+β" value={garch.persistence.toFixed(3)} color={garch.persistence < 1 ? C.green : C.red} />
                    <Stat label="长期年化波动" value={pct(garch.longRunVol)} color={C.gold} />
                    <Stat label="对数似然" value={garch.logLik.toFixed(1)} color={C.text} />
                    <Stat label="最新条件波动" value={pct(garch.condVol[garch.condVol.length - 1])} color={C.gold} />
                    <Stat label="样本均值(日)" value={pct(garch.mu)} color={C.text} />
                  </div>
                )}
                {ewma && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label="最优 λ" value={ewma.lambda.toFixed(3)} color={C.gold} />
                    <Stat label="最新波动(拟合λ)" value={pct(ewma.latestVol)} color={C.blue} />
                    <Stat label="RiskMetrics(λ=0.94)" value={pct(ewma.riskMetricsVol)} color={C.teal} />
                    <Stat label="对数似然" value={ewma.logLik.toFixed(1)} color={C.text} />
                  </div>
                )}
                {merton && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label="扩散年化波动" value={pct(merton.sigmaDiffusion)} color={C.gold} />
                    <Stat label="跳跃强度 λ(年)" value={merton.lambda.toFixed(2)} color={C.blue} />
                    <Stat label="跳跃均值" value={pct(merton.jumpMean)} color={merton.jumpMean >= 0 ? C.green : C.red} />
                    <Stat label="跳跃标准差" value={pct(merton.jumpStd)} color={C.teal} />
                    <Stat label="跳跃次数" value={String(merton.nJumps)} color={C.text} sub={`阈值 ±${pct(merton.threshold)}`} />
                  </div>
                )}

                <div className="flex justify-end">
                  <SendToTool
                    fromId="calibration"
                    label="模型校准"
                    outputs={{ sigma: busSigma, mu: garch ? garch.mu * 252 : undefined }}
                    targets={["bs", "mc", "greeks-desk", "iv"]}
                  />
                </div>

                {volChart.length > 0 && (
                  <div className="rounded-xl border border-border bg-card/60 p-4">
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-gold" /> 条件波动率(年化 %)
                    </p>
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={volChart}>
                        <CartesianGrid {...GRID_PROPS} />
                        <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={48} />
                        <YAxis {...AXIS_PROPS} width={48} />
                        <Tooltip content={<ThemedTooltip />} />
                        {garch && <ReferenceLine y={garch.longRunVol * 100} stroke={C.text} strokeDasharray="4 3" />}
                        <Area type="monotone" dataKey="vol" name="条件波动" stroke={C.gold} fill={C.gold} fillOpacity={0.15} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {diag && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="rounded-xl border border-border bg-card/60 p-4">
                      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-gold" /> 标准化残差 Q-Q 图
                      </p>
                      <ResponsiveContainer width="100%" height={240}>
                        <ScatterChart>
                          <CartesianGrid {...GRID_PROPS} />
                          <XAxis type="number" dataKey="theoretical" name="理论分位" {...AXIS_PROPS} />
                          <YAxis type="number" dataKey="sample" name="样本分位" {...AXIS_PROPS} width={40} />
                          <ZAxis range={[12, 12]} />
                          <Tooltip content={<ThemedTooltip />} />
                          <ReferenceLine segment={[{ x: -4, y: -4 }, { x: 4, y: 4 }]} stroke={C.text} strokeDasharray="4 3" />
                          <Scatter data={diag.qq} fill={C.gold} fillOpacity={0.6} />
                        </ScatterChart>
                      </ResponsiveContainer>
                      <p className="text-[10px] text-muted-foreground mt-1">点贴近对角线说明残差接近正态;尾部偏离提示厚尾。</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card/60 p-4">
                      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">残差平方 ACF(检验剩余 ARCH)</p>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={diag.ac.map((v, i) => ({ lag: i + 1, acf: v }))}>
                          <CartesianGrid {...GRID_PROPS} />
                          <XAxis dataKey="lag" {...AXIS_PROPS} />
                          <YAxis {...AXIS_PROPS} width={40} domain={[-0.2, 0.4]} />
                          <Tooltip content={<ThemedTooltip />} />
                          <ReferenceLine y={diag.conf} stroke={C.red} strokeDasharray="3 3" />
                          <ReferenceLine y={-diag.conf} stroke={C.red} strokeDasharray="3 3" />
                          <Bar dataKey="acf" fill={C.teal} />
                        </BarChart>
                      </ResponsiveContainer>
                      <p className="text-[10px] text-muted-foreground mt-1">柱大多落在 ±1.96/√n(红线)内说明波动聚集已被模型吸收。</p>
                    </div>
                  </div>
                )}

                <p className="text-[10px] font-mono text-muted-foreground">
                  标的 {series?.symbol} · 数据源 {source} · {returns.length} 个日收益 · 教学用途,拟合结果对样本与窗口敏感。
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

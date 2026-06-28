import { useMemo, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Gauge } from "lucide-react";
import SectionHeader from "@/components/common/SectionHeader";
import { Stat, C } from "@/components/frontier/ui";
import { AXIS_PROPS, GRID_PROPS, ThemedTooltip } from "@/components/common/ChartTheme";
import SendToTool from "@/components/common/SendToTool";
import {
  usePriceSeries, syntheticSeries, logReturns, type PriceSource, type PriceSeries,
} from "@/lib/priceSeries";
import PriceSourceBar from "@/components/quant/PriceSourceBar";
import { fitGarch11, fitEwmaLambda, fitMertonJump } from "@/lib/quant/calibration";

type ModelId = "garch" | "ewma" | "merton";
const MODELS: { id: ModelId; label: string; desc: string }[] = [
  { id: "garch", label: "GARCH(1,1) · MLE", desc: "高斯极大似然拟合 ω/α/β,估计条件波动与长期波动。" },
  { id: "ewma", label: "EWMA / RiskMetrics", desc: "网格搜索最优衰减因子 λ,对比 RiskMetrics 0.94。" },
  { id: "merton", label: "Merton 跳跃扩散", desc: "阈值分解出扩散波动与跳跃强度/幅度。" },
];

const pct = (x: number) => (x * 100).toFixed(1) + "%";

export default function CalibrationLab() {
  const [source, setSource] = useState<PriceSource>("yahoo");
  const [symbol, setSymbol] = useState("AAPL");
  const [range, setRange] = useState("5y");
  const [demo, setDemo] = useState<PriceSeries | null>(null);
  const [model, setModel] = useState<ModelId>("garch");

  const { series: live, isFetching, error, refetch } = usePriceSeries(source, symbol, range, !demo);
  const series = demo ?? live;

  const returns = useMemo(() => (series ? logReturns(series.prices) : []), [series]);

  const garch = useMemo(() => (model === "garch" && returns.length > 60 ? fitGarch11(returns) : null), [model, returns]);
  const ewma = useMemo(() => (model === "ewma" && returns.length > 60 ? fitEwmaLambda(returns) : null), [model, returns]);
  const merton = useMemo(() => (model === "merton" && returns.length > 60 ? fitMertonJump(returns) : null), [model, returns]);

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

  // canonical sigma (annualised, decimal) for the bus
  const busSigma =
    model === "garch" ? garch?.longRunVol :
    model === "ewma" ? ewma?.latestVol :
    merton?.sigmaDiffusion;

  return (
    <section className="pb-12">
      <SectionHeader
        chapter="Lab"
        kicker="Calibration · Fit to Real Data"
        title="模型校准实验室"
        subtitle="把 GARCH、EWMA、Merton 跳跃扩散等教学模型直接拟合到真实行情。GARCH 用高斯极大似然(Nelder-Mead 优化)估计 ω/α/β,EWMA 网格搜索最优衰减因子,Merton 用阈值分解拆出扩散与跳跃。拟合得到的波动率可一键发送到 BS / 蒙特卡洛 / Greeks 定价工具。"
      />

      <div className="container max-w-6xl px-6 space-y-5">
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

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
          <aside className="rounded-xl border border-border bg-card/60 p-4 space-y-2 h-fit">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold">模型</p>
            {MODELS.map((mo) => (
              <button
                key={mo.id}
                onClick={() => setModel(mo.id)}
                className={
                  "w-full text-left px-3 py-2 rounded-md border transition-colors " +
                  (mo.id === model ? "border-gold/50 bg-gold/10" : "border-border hover:border-gold/30")
                }
              >
                <p className="text-xs font-medium">{mo.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{mo.desc}</p>
              </button>
            ))}
          </aside>

          <div className="space-y-5">
            {returns.length <= 60 ? (
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
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={volChart}>
                        <CartesianGrid {...GRID_PROPS} />
                        <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={48} />
                        <YAxis {...AXIS_PROPS} width={48} />
                        <Tooltip content={<ThemedTooltip />} />
                        {garch && (
                          <ReferenceLine y={garch.longRunVol * 100} stroke={C.text} strokeDasharray="4 3" />
                        )}
                        <Area type="monotone" dataKey="vol" name="条件波动" stroke={C.gold} fill={C.gold} fillOpacity={0.15} />
                      </AreaChart>
                    </ResponsiveContainer>
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
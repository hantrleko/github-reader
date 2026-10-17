import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import Reveal from "@/components/common/Reveal";
import SectionHeader from "@/components/common/SectionHeader";
import {
  ChartFrame,
  ChartToolbar,
  ThemedTooltip,
  CHART_PALETTES,
  useChartExport,
} from "@/components/common/ChartTheme";
import FanChart, { type FanPoint } from "@/components/common/FanChart";
import HistoKde from "@/components/common/HistoKde";
import TimeScrubber from "@/components/common/TimeScrubber";
import ColorblindToggle from "@/components/common/ColorblindToggle";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Brush,
  LineChart,
} from "recharts";
import { AXIS_PROPS, GRID_PROPS } from "@/components/common/ChartTheme";

/* ------------------------------------------------------------------ */
/* Deterministic synthetic data — no network calls; keeps demo stable. */
/* ------------------------------------------------------------------ */

function lcg(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function randn(rng: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function buildEquityCurve() {
  const rng = lcg(20260724);
  const rows: Array<{ t: string; nav: number; dd: number; bench: number }> = [];
  let nav = 100, bench = 100, peak = 100;
  const start = new Date("2019-01-31").getTime();
  for (let i = 0; i < 84; i++) {
    const r = 0.008 + 0.045 * randn(rng);
    const rb = 0.006 + 0.045 * randn(rng);
    nav *= 1 + r;
    bench *= 1 + rb;
    peak = Math.max(peak, nav);
    const dd = (nav / peak - 1) * 100;
    const d = new Date(start + i * 30 * 86400000);
    rows.push({
      t: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      nav: +nav.toFixed(3),
      bench: +bench.toFixed(3),
      dd: +dd.toFixed(3),
    });
  }
  return rows;
}

function buildFan(): FanPoint[] {
  const rng = lcg(42);
  const out: FanPoint[] = [];
  for (let timeIndex = 0; timeIndex <= 24; timeIndex++) {
    const samples: number[] = [];
    for (let k = 0; k < 400; k++) {
      // GBM: log-return N(mu·dt, sigma·sqrt(dt)); accumulate mean 0.04+0.3·randn
      let x = 100;
      for (let s = 0; s < timeIndex; s++) x *= Math.exp(0.005 + 0.06 * randn(rng));
      samples.push(x);
    }
    out.push({ x: timeIndex, samples });
  }
  return out;
}

function buildReturns() {
  const rng = lcg(7);
  return Array.from({ length: 1500 }, () => 0.0004 + 0.014 * randn(rng));
}

function buildIRF() {
  const rng = lcg(99);
  // IRF from AR(1) shock: y_t = 0.6·y_{t-1} + eps
  const rows: Array<{ t: number; irf: number; ci_lo: number; ci_hi: number }> = [];
  let y = 0;
  for (let timeIndex = 0; timeIndex <= 20; timeIndex++) {
    if (timeIndex === 0) y = 1;
    else y = 0.6 * y + 0.02 * randn(rng);
    rows.push({ timeIndex, irf: +y.toFixed(4), ci_lo: +(y - 0.15 * Math.exp(-timeIndex / 8)).toFixed(4), ci_hi: +(y + 0.15 * Math.exp(-timeIndex / 8)).toFixed(4) });
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* Panel components                                                    */
/* ------------------------------------------------------------------ */

function EquityBrushPanel() {
  const { t } = useTranslation();
  const data = useMemo(() => buildEquityCurve(), []);
  const nav = useChartExport();
  const dd = useChartExport();

  // NBER-like recession band (synthetic label kept honest)
  const recStart = "2020-02";
  const recEnd = "2020-04";

  return (
    <div className="grid gap-4">
      <ChartFrame
        title={t("labs.visualization.ui.text1", { defaultValue: "策略净值 vs 基准 (交互缩放 · 事件区间高亮)" })}
        subtitle={t("labs.visualization.ui.text2", { defaultValue: "拖动下方 Brush 局部放大 · 灰色区间 = 事件窗口 · 支持 PNG / CSV 导出" })}
        frameRef={nav.ref}
        toolbar={
          <ChartToolbar
            onPng={() => nav.exportPng("equity-nav")}
            onCsv={() => nav.exportCsv(data.map(d => ({ month: d.t, nav: d.nav, bench: d.bench })), "equity-nav")}
          />
        }
        footnote={t("labs.visualization.ui.text3", { defaultValue: "V4.8 — <Brush> + <ReferenceArea> + 统一工具条。SyncId 与下方回撤图共享 x 轴。" })}
        height={300}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} syncId="equity" margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="t" {...AXIS_PROPS} />
            <YAxis {...AXIS_PROPS} />
            <Tooltip content={<ThemedTooltip showDelta sort />} />
            <ReferenceArea x1={recStart} x2={recEnd} fill="hsl(var(--muted-foreground) / 0.18)" stroke="none"
              label={{ value: t("labs.visualization.ui.text4", { defaultValue: "事件窗口" }), position: "insideTop", fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
            <Line type="monotone" dataKey="nav" stroke="hsl(var(--gold))" strokeWidth={2} dot={false} name={t("labs.visualization.ui.text5", { defaultValue: "策略" })} isAnimationActive={false} />
            <Line type="monotone" dataKey="bench" stroke="hsl(var(--teal))" strokeWidth={1.6} dot={false} name={t("labs.visualization.ui.text6", { defaultValue: "基准" })} isAnimationActive={false} strokeDasharray="4 3" />
            <Brush dataKey="t" height={22} travellerWidth={10} stroke="hsl(var(--gold))" fill="hsl(var(--card))" />
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        title={t("labs.visualization.ui.text7", { defaultValue: "回撤 (联动缩放)" })}
        subtitle={t("labs.visualization.ui.text8", { defaultValue: "鼠标悬停时两张图共享游标 (Recharts syncId)" })}
        frameRef={dd.ref}
        toolbar={
          <ChartToolbar
            onPng={() => dd.exportPng("equity-drawdown")}
            onCsv={() => dd.exportCsv(data.map(d => ({ month: d.t, drawdown_pct: d.dd })), "equity-drawdown")}
          />
        }
        height={200}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} syncId="equity" margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="t" {...AXIS_PROPS} />
            <YAxis {...AXIS_PROPS} tickFormatter={(v) => `${v}%`} />
            <Tooltip content={<ThemedTooltip formatter={(v) => (typeof v === "number" ? `${v.toFixed(2)}%` : String(v))} />} />
            <ReferenceLine y={0} stroke="hsl(var(--border))" />
            <Area type="monotone" dataKey="dd" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.25)" isAnimationActive={false} name={t("labs.visualization.ui.text9", { defaultValue: "回撤" })} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  );
}

function FanPanel() {
  const { t } = useTranslation();
  const data = useMemo(() => buildFan(), []);
  const flat = useMemo(
    () => data.map(d => {
      const s = [...(d.samples ?? [])].sort((a, b) => a - b);
      const q = (p: number) => (s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] : NaN);
      return { t: d.x, p05: q(0.05), p25: q(0.25), p50: q(0.5), p75: q(0.75), p95: q(0.95) };
    }),
    [data]
  );
  const exp = useChartExport();
  return (
    <ChartFrame
      title={t("labs.visualization.ui.text10", { defaultValue: "蒙特卡洛 Fan Chart — GBM 24 期演化" })}
      subtitle={t("labs.visualization.ui.text11", { defaultValue: "50% / 90% 分位数带 + 中位数线 · 400 条样本" })}
      frameRef={exp.ref}
      toolbar={<ChartToolbar onCsv={() => exp.exportCsv(flat, "fan")} onPng={() => exp.exportPng("fan")} />}
      footnote={t("labs.visualization.ui.text12", { defaultValue: "V4.8 — FanChart 组件可直接接收 samples[] 或预算好的 quantiles。annotations 支持 band / line 两类。" })}
      height={300}
    >
      <FanChart
        data={data}
        xKey="t"
        yLabel={t("labs.visualization.ui.text13", { defaultValue: "价格" })}
        annotations={[{ type: "line", at: 12, label: t("labs.visualization.ui.text14", { defaultValue: "半年" }), color: "hsl(var(--teal))" }]}
      />
    </ChartFrame>
  );
}

function HistoPanel() {
  const { t } = useTranslation();
  const samples = useMemo(() => buildReturns(), []);
  const mean = samples.reduce((s, x) => s + x, 0) / samples.length;
  const sd = Math.sqrt(samples.reduce((s, x) => s + (x - mean) ** 2, 0) / samples.length);
  const var95 = mean - 1.645 * sd;
  const exp = useChartExport();
  return (
    <ChartFrame
      title={t("labs.visualization.ui.text15", { defaultValue: "日回报分布 · 直方图 + 高斯 KDE" })}
      subtitle={t("labs.visualization.ui.text16", { defaultValue: "Silverman 带宽 · 竖线标记 95% VaR" })}
      frameRef={exp.ref}
      toolbar={<ChartToolbar onPng={() => exp.exportPng("returns-hist")} />}
      footnote={t("labs.visualization.ui.text17", { defaultValue: "V4.8 — HistoKde 组件；markers 支持标注 VaR/ES/均值等临界值。" })}
      height={280}
    >
      <HistoKde
        samples={samples}
        bins={40}
        formatX={(v) => (v * 100).toFixed(1) + "%"}
        markers={[{ at: var95, label: "VaR95", color: "hsl(var(--destructive))" }]}
      />
    </ChartFrame>
  );
}

function ScrubberPanel() {
  const { t } = useTranslation();
  const irf = useMemo(() => buildIRF(), []);
  const [t, setT] = useState(0);
  const visible = irf.slice(0, t + 1);
  const exp = useChartExport();
  return (
    <ChartFrame
      title={t("labs.visualization.ui.text18", { defaultValue: "AR(1) 脉冲响应 — 时间轴 Scrubber" })}
      subtitle={t("labs.visualization.ui.text19", { defaultValue: "点击播放按钮或拖动滑块回放脉冲传导 · 置信带包络" })}
      frameRef={exp.ref}
      toolbar={<ChartToolbar onCsv={() => exp.exportCsv(irf, "irf")} onPng={() => exp.exportPng("irf")} />}
      footnote={t("labs.visualization.ui.text20", { defaultValue: "V4.8 — TimeScrubber 组件；适用于 Solow 收敛、Kyle 均衡、IRF 等动态过程展示。" })}
      height={280}
    >
      <div className="flex flex-col h-full gap-2">
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={visible} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="t" type="number" domain={[0, irf.length - 1]} {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} domain={[-0.2, 1.2]} />
              <Tooltip content={<ThemedTooltip />} />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              <Area type="monotone" dataKey="ci_hi" stroke="none" fill="hsl(var(--gold) / 0.15)" isAnimationActive={false} />
              <Area type="monotone" dataKey="ci_lo" stroke="none" fill="hsl(var(--card))" isAnimationActive={false} />
              <Line type="monotone" dataKey="irf" stroke="hsl(var(--gold))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--gold))" }} isAnimationActive={false} name="IRF" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <TimeScrubber value={t} min={0} max={irf.length - 1} step={1} onChange={setT} label="t" />
      </div>
    </ChartFrame>
  );
}

function PaletteShowcase() {
  const { t } = useTranslation();
  return (
    <ChartFrame
      title={t("labs.visualization.ui.text21", { defaultValue: "调色板体系 · categorical / sequential / diverging / colorblind-safe" })}
      subtitle={t("labs.visualization.ui.text22", { defaultValue: "所有图表调用同一组 token；开启右上角「CB」按钮切换 Okabe-Ito 色觉友好方案" })}
      height={200}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 h-full">
        {[
          { name: "Categorical", colors: CHART_PALETTES.categorical },
          { name: "Sequential", colors: CHART_PALETTES.sequential },
          { name: "Diverging", colors: [CHART_PALETTES.diverging.negative, CHART_PALETTES.diverging.neutral, CHART_PALETTES.diverging.positive] },
          { name: "Colorblind-safe", colors: CHART_PALETTES.colorblindSafe },
        ].map((p) => (
          <div key={p.name} className="rounded-md border border-border/50 bg-card/30 p-2 flex flex-col">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">{p.name}</p>
            <div className="flex-1 flex gap-1">
              {p.colors.map((c, i) => (
                <div key={i} className="flex-1 rounded" style={{ background: c }} title={c} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ChartFrame>
  );
}

/* ------------------------------------------------------------------ */

export default function VisualizationGuide() {
  const { t } = useTranslation();
  return (
    <section className="pb-16">
      <SectionHeader
        chapter="V4.8"
        kicker="Visualization Toolkit"
        title={t("labs.visualization.ui.text23", { defaultValue: "可视化组件工作台" })}
        subtitle={t("labs.visualization.ui.text24", { defaultValue: "Brush 联动缩放 · 事件标注 · Fan Chart 置信带 · 直方图 + KDE · 时间轴 Scrubber · PNG / CSV 一键导出 · 色觉友好模式。所有实验室工具将逐步接入这套组件库。" })}
      />
      <div className="container max-w-6xl px-6 space-y-6">
        <div className="flex items-center justify-end gap-2">
          <ColorblindToggle />
        </div>
        <Reveal><EquityBrushPanel /></Reveal>
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal delay={0.05}><FanPanel /></Reveal>
          <Reveal delay={0.1}><HistoPanel /></Reveal>
        </div>
        <Reveal delay={0.15}><ScrubberPanel /></Reveal>
        <Reveal delay={0.2}><PaletteShowcase /></Reveal>
      </div>
    </section>
  );
}
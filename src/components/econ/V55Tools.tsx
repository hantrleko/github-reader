import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, BarChart, Bar, Cell, ReferenceLine, ScatterChart, Scatter, ComposedChart, Area,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { C, Slider, Stat, tooltipStyle } from "../frontier/ui";
import {
  unitRootSuite, type SeriesKind,
  armaIdentLab, differencingLab, setarLab, baiPerron,
  densityEvalLab, mcsLab, svVsGarch,
} from "@/lib/quant/tsFrontier";
import { useFredSeries } from "@/lib/marketData";

const Note = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">
    {children}
  </div>
);

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-secondary/20 p-4">
    <h4 className="text-sm font-semibold text-foreground mb-2">{title}</h4>
    {children}
  </div>
);

const Choice = <T extends string>({ value, options, onChange }: {
  value: T; options: { id: T; label: string }[]; onChange: (v: T) => void;
}) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map((o) => (
      <button
        key={o.id}
        onClick={() => onChange(o.id)}
        className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors ${
          value === o.id
            ? "border-gold text-gold bg-gold/10"
            : "border-border text-muted-foreground hover:text-foreground"
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

/* ═══════════ 1. 单位根检验全家桶 ═══════════ */

const FRED_PRESETS = [
  { id: "GDPC1", label: "GDPC1 · 美国实际GDP" },
  { id: "CPIAUCSL", label: "CPIAUCSL · 美国CPI" },
  { id: "DGS10", label: "DGS10 · 10年期国债利率" },
] as const;

export const UnitRootSuiteTool = () => {
  const [kind, setKind] = useState<SeriesKind>("rw");
  const [n, setN] = useState(240);
  const [rho, setRho] = useState(0.7);
  const [lags, setLags] = useState(2);
  const [lagCrit, setLagCrit] = useState<"manual" | "aic" | "bic">("manual");
  const [trend, setTrend] = useState(false);
  const [seed, setSeed] = useState(3);
  const [source, setSource] = useState<"sim" | "fred">("sim");
  const [fredId, setFredId] = useState<string>("GDPC1");
  const [logTransform, setLogTransform] = useState(true);

  const fred = useFredSeries(fredId, "1990-01-01", source === "fred");
  const fredSeries = useMemo(() => {
    if (source !== "fred" || !fred.data?.closes?.length) return undefined;
    const raw = fred.data.closes.filter((v) => Number.isFinite(v) && v > 0);
    return logTransform ? raw.map((v) => Math.log(v)) : raw;
  }, [source, fred.data, logTransform]);

  const res = useMemo(
    () => unitRootSuite(
      source === "fred" && fredSeries && fredSeries.length > 30
        ? { series: fredSeries, lags, trend, lagCrit }
        : { kind, n, rho, lags, trend, seed, lagCrit }
    ),
    [kind, n, rho, lags, trend, seed, lagCrit, source, fredSeries]
  );
  const path = res.series.map((y, t) => ({ t, y: +y.toFixed(3) }));
  const zaPath = res.za.path.map((p) => ({ t: p.t, tstat: +p.tstat.toFixed(3) }));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "随机游走", description: "真实单位根", apply: () => { setKind("rw"); setTrend(false); } },
        { name: "近单位根 AR", description: "ρ=0.95 → 检验低功效", apply: () => { setKind("ar"); setRho(0.95); setTrend(false); } },
        { name: "趋势平稳", description: "含确定性趋势", apply: () => { setKind("trend"); setTrend(true); } },
        { name: "断点序列", description: "水平位移伪装成单位根", apply: () => { setKind("break"); setTrend(false); } },
        { name: "季节单位根", description: "y_t = y_{t-4} + e", apply: () => { setKind("seasonal"); setTrend(false); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">数据来源</p>
          <Choice value={source} onChange={setSource} options={[
            { id: "sim" as const, label: "模拟数据" }, { id: "fred" as const, label: "FRED 真实序列" },
          ]} />
          {source === "fred" && (
            <div className="space-y-2">
              <Choice value={fredId} onChange={setFredId} options={FRED_PRESETS.map((p) => ({ id: p.id as string, label: p.label }))} />
              <Choice value={logTransform ? "log" : "level"} onChange={(v) => setLogTransform(v === "log")} options={[
                { id: "log" as const, label: "取对数" }, { id: "level" as const, label: "原始水平" },
              ]} />
              <p className="text-[11px] font-mono text-muted-foreground">
                {fred.isLoading ? "正在从 FRED 载入…" : fred.isError ? "载入失败（检查网络或稍后重试），当前回退到模拟数据" : fredSeries ? `已载入 ${fredSeries.length} 个观测（1990 至今）` : ""}
              </p>
            </div>
          )}
          {source === "sim" && (
            <>
              <p className="text-xs font-mono text-gold uppercase tracking-wider">数据生成过程</p>
              <Choice<SeriesKind> value={kind} onChange={setKind} options={[
                { id: "rw", label: "随机游走" }, { id: "rwdrift", label: "带漂移" },
                { id: "trend", label: "趋势平稳" }, { id: "ar", label: "AR(1)" },
                { id: "break", label: "断点" }, { id: "seasonal", label: "季节单位根" },
              ]} />
              <div className="grid grid-cols-2 gap-3">
                <Slider label="样本量 T" value={n} min={80} max={600} step={20} fmt={(v) => v.toFixed(0)} onChange={setN} />
                <Slider label="AR 系数 ρ" sub="仅 AR / 断点" value={rho} min={0.1} max={0.99} step={0.01} onChange={setRho} />
                <Slider label="随机种子" value={seed} min={1} max={99} step={1} fmt={(v) => v.toFixed(0)} onChange={setSeed} />
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Slider label="ADF 差分滞后 p" sub={lagCrit === "manual" ? undefined : "由信息准则选定"} value={lags} min={0} max={8} step={1} fmt={(v) => v.toFixed(0)} onChange={setLags} />
          </div>
          <Choice value={lagCrit} onChange={setLagCrit} options={[
            { id: "manual" as const, label: "手动滞后" }, { id: "aic" as const, label: "AIC 自动" }, { id: "bic" as const, label: "BIC 自动" },
          ]} />
          <Choice value={trend ? "ct" : "c"} onChange={(v) => setTrend(v === "ct")} options={[
            { id: "c", label: "确定项：常数" }, { id: "ct", label: "常数 + 趋势" },
          ]} />
        </div>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={path}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="y" name="序列" stroke={C.gold} strokeWidth={1.5} dot={false} />
              <ReferenceLine x={res.za.breakIndex} stroke={C.red} strokeDasharray="4 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <Panel title="检验结论矩阵 — 同一序列、不同原假设">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-2">检验</th>
                <th className="text-right">统计量</th>
                <th className="text-right">p 值</th>
                <th className="text-right">1%</th>
                <th className="text-right">5%</th>
                <th className="text-right">10%</th>
                <th className="text-left pl-4">原假设</th>
                <th className="text-left pl-4">5% 结论</th>
              </tr>
            </thead>
            <tbody>
              {[...res.tests, res.za].map((t) => (
                <tr key={t.name} className="border-b border-border/40">
                  <td className="py-1.5 text-foreground">{t.name}</td>
                  <td className="text-right text-gold">{t.stat.toFixed(3)}</td>
                  <td className="text-right text-muted-foreground">{t.pValue != null ? (t.pValue <= 0.001 ? "<0.01" : t.pValue.toFixed(3)) : "—"}</td>
                  <td className="text-right">{t.cv.c1.toFixed(2)}</td>
                  <td className="text-right">{t.cv.c5.toFixed(2)}</td>
                  <td className="text-right">{t.cv.c10.toFixed(2)}</td>
                  <td className="pl-4">{t.h0}</td>
                  <td className="pl-4" style={{ color: t.reject5 ? C.green : C.red }}>{t.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] font-mono text-teal-500 mt-3" style={{ color: C.teal }}>
          ADF × KPSS 联合读法：{res.matrix}
        </p>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Zivot-Andrews：断点位置的 t 统计量曲线">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={zaPath}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="tstat" name="ADF t (含断点)" stroke={C.blue} strokeWidth={1.5} dot={false} />
                <ReferenceLine y={-4.8} stroke={C.red} strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="HEGY 季节单位根（按季度频率）">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="t(π₁) 零频率" value={res.hegy.tPi1.toFixed(2)} color={res.hegy.rejectZero ? C.green : C.red} sub="临界 -2.88" />
            <Stat label="t(π₂) 半年频率" value={res.hegy.tPi2.toFixed(2)} color={res.hegy.rejectSemi ? C.green : C.red} sub="临界 -1.95" />
            <Stat label="F(π₃,π₄) 年频率" value={res.hegy.fPi34.toFixed(2)} color={res.hegy.rejectAnnual ? C.green : C.red} sub="临界 6.60" />
          </div>
          <p className="text-[11px] font-mono text-muted-foreground mt-3">{res.hegy.note}</p>
        </Panel>
      </div>

      <Note>
        <p><span className="text-gold">互补而非替代：</span>ADF/PP/DF-GLS 以「有单位根」为原假设，KPSS 以「平稳」为原假设。四种组合里有两种是「证据不足」——这正是短样本与近单位根区域的真实状态，不应通过反复更换确定项设定来「试出」想要的结论。</p>
        <p><span className="text-gold">功效与设定：</span>DF-GLS 在 ρ→1 附近功效明显高于 ADF；断点会让常规 ADF 严重低估平稳性，需要 Zivot-Andrews；季度数据仅做 ADF 无法发现 (1−L⁴) 中的季节单位根。</p>
      </Note>
    </div>
  );
};

/* ═══════════ 2. Wold 分解与 ARMA 识别台 ═══════════ */

export const ArmaIdentTool = () => {
  const [ar1, setAr1] = useState(0.6);
  const [ar2, setAr2] = useState(0);
  const [ma1, setMa1] = useState(0.4);
  const [n, setN] = useState(400);
  const [seed, setSeed] = useState(11);

  const res = useMemo(
    () => armaIdentLab({ ar: ar2 === 0 ? [ar1] : [ar1, ar2], ma: ma1 === 0 ? [] : [ma1], n, seed, maxOrder: 3 }),
    [ar1, ar2, ma1, n, seed]
  );

  const acfData = res.sampleAcfV.map((v, i) => ({
    lag: i + 1, sample: +v.toFixed(3), theory: +res.theoryAcf[i].toFixed(3),
  }));
  const pacfData = res.samplePacfV.map((v, i) => ({
    lag: i + 1, sample: +v.toFixed(3), theory: +res.theoryPacf[i].toFixed(3),
  }));
  const psiData = res.psi.map((v, j) => ({ j, psi: +v.toFixed(4) }));
  const rootData = [
    ...res.arRoots.map((r) => ({ re: +r.re.toFixed(3), im: +r.im.toFixed(3), type: "AR 根" })),
    ...res.maRoots.map((r) => ({ re: +r.re.toFixed(3), im: +r.im.toFixed(3), type: "MA 根" })),
  ];
  const circle = Array.from({ length: 73 }, (_, i) => ({
    re: +Math.cos((i * Math.PI) / 36).toFixed(3), im: +Math.sin((i * Math.PI) / 36).toFixed(3),
  }));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "纯 AR(1)", description: "PACF 一阶截尾", apply: () => { setAr1(0.7); setAr2(0); setMa1(0); } },
        { name: "纯 MA(1)", description: "ACF 一阶截尾", apply: () => { setAr1(0); setAr2(0); setMa1(0.7); } },
        { name: "ARMA(1,1)", description: "两者皆拖尾", apply: () => { setAr1(0.6); setAr2(0); setMa1(0.4); } },
        { name: "AR(2) 周期", description: "复根 → 阻尼振荡", apply: () => { setAr1(1.2); setAr2(-0.7); setMa1(0); } },
        { name: "近单位根", description: "φ=0.97 ACF 缓慢衰减", apply: () => { setAr1(0.97); setAr2(0); setMa1(0); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">φ(L)(y − μ) = θ(L)ε</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="φ₁" value={ar1} min={-0.95} max={1.4} step={0.05} onChange={setAr1} />
            <Slider label="φ₂" value={ar2} min={-0.9} max={0.6} step={0.05} onChange={setAr2} />
            <Slider label="θ₁" value={ma1} min={-0.95} max={0.95} step={0.05} onChange={setMa1} />
            <Slider label="样本量 T" value={n} min={120} max={1000} step={40} fmt={(v) => v.toFixed(0)} onChange={setN} />
            <Slider label="随机种子" value={seed} min={1} max={99} step={1} fmt={(v) => v.toFixed(0)} onChange={setSeed} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="平稳性" value={res.stationary ? "平稳" : "非平稳"} color={res.stationary ? C.green : C.red} sub="AR 根全在单位圆外" />
          <Stat label="可逆性" value={res.invertible ? "可逆" : "不可逆"} color={res.invertible ? C.green : C.red} sub="MA 根全在单位圆外" />
          <Stat label="AIC 选阶" value={`ARMA(${res.bestAic.p},${res.bestAic.q})`} color={C.gold} />
          <Stat label="BIC 选阶" value={`ARMA(${res.bestBic.p},${res.bestBic.q})`} color={C.teal} sub="BIC 更简约" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="ACF：样本 vs 理论">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={acfData}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="lag" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="sample" name="样本 ACF" fill={C.gold} />
                <Line type="monotone" dataKey="theory" name="理论 ACF" stroke={C.teal} strokeWidth={2} dot={false} />
                <ReferenceLine y={res.band} stroke={C.red} strokeDasharray="3 3" />
                <ReferenceLine y={-res.band} stroke={C.red} strokeDasharray="3 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="PACF：样本 vs 理论">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={pacfData}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="lag" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="sample" name="样本 PACF" fill={C.blue} />
                <Line type="monotone" dataKey="theory" name="理论 PACF" stroke={C.teal} strokeWidth={2} dot={false} />
                <ReferenceLine y={res.band} stroke={C.red} strokeDasharray="3 3" />
                <ReferenceLine y={-res.band} stroke={C.red} strokeDasharray="3 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Wold 系数 ψⱼ — 一次冲击的传播路径">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={psiData}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="j" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="psi" name="ψⱼ" fill={C.gold} />
                <ReferenceLine y={0} stroke={C.text} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="特征根与单位圆">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis type="number" dataKey="re" domain={[-3, 3]} stroke={C.text} tick={{ fontSize: 10 }} name="Re" />
                <YAxis type="number" dataKey="im" domain={[-3, 3]} stroke={C.text} tick={{ fontSize: 10 }} name="Im" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Scatter name="单位圆" data={circle} fill={C.text} line shape={() => <g />} />
                <Scatter name="AR 根" data={rootData.filter((r) => r.type === "AR 根")} fill={C.gold} />
                <Scatter name="MA 根" data={rootData.filter((r) => r.type === "MA 根")} fill={C.blue} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="阶数网格 — AIC / BIC / HQ">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-2">(p, q)</th><th className="text-right">AIC</th>
                <th className="text-right">BIC</th><th className="text-right">HQ</th>
              </tr>
            </thead>
            <tbody>
              {res.grid.map((g) => {
                const isAic = g.p === res.bestAic.p && g.q === res.bestAic.q;
                const isBic = g.p === res.bestBic.p && g.q === res.bestBic.q;
                return (
                  <tr key={`${g.p}-${g.q}`} className="border-b border-border/40">
                    <td className="py-1" style={{ color: isAic || isBic ? C.gold : undefined }}>
                      ({g.p}, {g.q}){isAic ? " ← AIC" : ""}{isBic ? " ← BIC" : ""}
                    </td>
                    <td className="text-right">{g.aic.toFixed(1)}</td>
                    <td className="text-right">{g.bic.toFixed(1)}</td>
                    <td className="text-right">{g.hq.toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Note>
        <p><span className="text-gold">Wold 定理：</span>任一零均值、协方差平稳、纯非确定性过程都可写成 yₜ = Σψⱼεₜ₋ⱼ。这是关于二阶结构与线性投影的陈述，不等于经济机制是线性的，εₜ 也不自动等于结构冲击。</p>
        <p><span className="text-gold">识别规则的边界：</span>AR(p) 的 PACF p 阶截尾、MA(q) 的 ACF q 阶截尾只在平稳、线性、无断点、样本足够大时成立。近单位根下样本 ACF 缓慢衰减并不意味着高阶 AR；信息准则只能提供有限证据，不能替代制度背景与研究目的。</p>
      </Note>
    </div>
  );
};

/* ═══════════ 3. 差分决策实验室 ═══════════ */

export const DifferencingTool = () => {
  const [n, setN] = useState(200);
  const [sims, setSims] = useState(300);
  const [rho, setRho] = useState(0.7);
  const [seed, setSeed] = useState(5);

  const res = useMemo(() => differencingLab({ n, sims, rho, seed }), [n, sims, rho, seed]);
  const sp = res.spurious;

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "标准伪回归", description: "T=200, 300 次模拟", apply: () => { setN(200); setSims(300); } },
        { name: "长样本更糟", description: "T=500 → 拒绝率更高", apply: () => { setN(500); setSims(200); } },
        { name: "短样本", description: "T=60", apply: () => { setN(60); setSims(400); } },
        { name: "高持久 AR", description: "ρ=0.95 差分代价大", apply: () => { setRho(0.95); } },
        { name: "弱持久 AR", description: "ρ=0.3 过度差分明显", apply: () => { setRho(0.3); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Slider label="样本量 T" value={n} min={50} max={500} step={25} fmt={(v) => v.toFixed(0)} onChange={setN} />
            <Slider label="模拟次数" value={sims} min={100} max={600} step={50} fmt={(v) => v.toFixed(0)} onChange={setSims} />
            <Slider label="AR 持久度 ρ" value={rho} min={0.1} max={0.98} step={0.02} onChange={setRho} />
            <Slider label="随机种子" value={seed} min={1} max={99} step={1} fmt={(v) => v.toFixed(0)} onChange={setSeed} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="水平回归 5% 拒绝率" value={`${(100 * sp.rejectRate).toFixed(0)}%`} color={C.red} sub="名义水平应为 5%" />
          <Stat label="差分后拒绝率" value={`${(100 * sp.diffRejectRate).toFixed(0)}%`} color={C.green} sub="回到名义水平附近" />
          <Stat label="平均 |t|" value={sp.meanAbsT.toFixed(2)} color={C.gold} sub="随 T 发散 (不收敛)" />
          <Stat label="平均 R²" value={sp.meanR2.toFixed(2)} color={C.blue} sub={`差分后 ${sp.diffMeanR2.toFixed(2)}`} />
        </div>
      </div>

      <Panel title="伪回归：两条独立随机游走互相回归的 |t| 分布">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sp.tHist}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="bin" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "|t|", position: "insideBottom", offset: -2, fontSize: 10, fill: C.text }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="频数">
                {sp.tHist.map((d, i) => (
                  <Cell key={i} fill={d.bin > 1.96 ? C.red : C.teal} />
                ))}
              </Bar>
              <ReferenceLine x={1.96} stroke={C.gold} strokeDasharray="4 3" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="过度差分的代价（数据本身是平稳 AR(1)）">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="水平 ARMA(1,1) 的 θ̂" value={res.overDiff.maRootLevel.toFixed(3)} color={C.teal} />
            <Stat label="差分后的 θ̂" value={res.overDiff.maRootDiff.toFixed(3)} color={C.red} sub="趋近 −1 ⇒ MA 单位根" />
            <Stat label="水平模型一步 RMSE" value={res.overDiff.rmseLevel.toFixed(3)} color={C.green} />
            <Stat label="差分模型一步 RMSE" value={res.overDiff.rmseDiff.toFixed(3)} color={C.red} sub="过度差分放大误差" />
          </div>
        </Panel>
        <Panel title="趋势平稳 vs 差分平稳：同一序列的两种外推">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={res.fan}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="actual" name="实际" stroke={C.text} strokeWidth={1.5} dot={false} connectNulls={false} />
                <Line type="monotone" dataKey="tsMean" name="趋势平稳预测" stroke={C.gold} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="tsHi" name="TS 95%" stroke={C.gold} strokeDasharray="3 3" dot={false} />
                <Line type="monotone" dataKey="tsLo" name="" stroke={C.gold} strokeDasharray="3 3" dot={false} legendType="none" />
                <Line type="monotone" dataKey="rwMean" name="随机游走预测" stroke={C.blue} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="rwHi" name="RW 95%" stroke={C.blue} strokeDasharray="3 3" dot={false} />
                <Line type="monotone" dataKey="rwLo" name="" stroke={C.blue} strokeDasharray="3 3" dot={false} legendType="none" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Note>
        <p><span className="text-gold">差分不是免费的：</span>对数水平差分后研究对象已从「价格水平如何反应」变成「通胀如何反应」。对本应趋势平稳的序列过度差分，会引入接近 −1 的 MA 根、放大预测误差并丢掉长期信息。</p>
        <p><span className="text-gold">扇形的分岔：</span>趋势平稳下预测区间宽度趋于常数，单位根下按 √h 发散。二者对「一次冲击是否永久」给出完全不同的答案，而短样本往往无法区分——这时应报告两条路线的结果。</p>
      </Note>
    </div>
  );
};

/* ═══════════ 4. 门限与平滑转换 ═══════════ */

export const SetarTool = () => {
  const [arLow, setArLow] = useState(0.9);
  const [arHigh, setArHigh] = useState(0.1);
  const [cTrue, setCTrue] = useState(0);
  const [n, setN] = useState(400);
  const [boots, setBoots] = useState(100);
  const [seed, setSeed] = useState(21);

  const res = useMemo(
    () => setarLab({ n, seed, boots, arLow, arHigh, cTrue }),
    [n, seed, boots, arLow, arHigh, cTrue]
  );
  const grid = res.grid.map((g) => ({ c: +g.c.toFixed(2), ssr: +g.ssr.toFixed(1), f: +g.f.toFixed(2) }));
  const fitted = res.fitted.slice(-160);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "强非线性", description: "0.9 / 0.1 两制度", apply: () => { setArLow(0.9); setArHigh(0.1); } },
        { name: "线性真实", description: "两制度相同 → 检验不应拒绝", apply: () => { setArLow(0.5); setArHigh(0.5); } },
        { name: "爆炸/回复", description: "1.02 vs 0.3", apply: () => { setArLow(1.02); setArHigh(0.3); } },
        { name: "门限偏移", description: "c = 1", apply: () => { setCTrue(1); } },
        { name: "小样本", description: "T=150", apply: () => { setN(150); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">yₜ = (φ_L 或 φ_H)·yₜ₋₁ + εₜ，按 yₜ₋₁ ⋚ c 切换</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="低制度 φ_L" value={arLow} min={-0.5} max={1.05} step={0.05} onChange={setArLow} />
            <Slider label="高制度 φ_H" value={arHigh} min={-0.5} max={1.05} step={0.05} onChange={setArHigh} />
            <Slider label="真实门限 c" value={cTrue} min={-2} max={2} step={0.25} onChange={setCTrue} />
            <Slider label="样本量 T" value={n} min={120} max={800} step={40} fmt={(v) => v.toFixed(0)} onChange={setN} />
            <Slider label="自助次数" value={boots} min={40} max={300} step={20} fmt={(v) => v.toFixed(0)} onChange={setBoots} />
            <Slider label="随机种子" value={seed} min={1} max={99} step={1} fmt={(v) => v.toFixed(0)} onChange={setSeed} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="估计门限 ĉ" value={res.threshold.toFixed(3)} color={C.gold} sub={`真值 ${cTrue.toFixed(2)}`} />
          <Stat label="Hansen supF" value={res.supF.toFixed(2)} color={res.bootP < 0.05 ? C.green : C.red} sub={`自助 p = ${res.bootP.toFixed(3)}`} />
          <Stat label="低制度 φ̂_L" value={res.lowRegime.ar.toFixed(3)} color={C.blue} sub={`n = ${res.lowRegime.n}`} />
          <Stat label="高制度 φ̂_H" value={res.highRegime.ar.toFixed(3)} color={C.teal} sub={`n = ${res.highRegime.n}`} />
          <Stat label="线性 AR φ̂" value={res.linear.ar.toFixed(3)} color={C.text} sub="被平均掉的中间值" />
          <Stat label="SSR 改善" value={`${(100 * (1 - res.ssrSetar / res.ssrLinear)).toFixed(1)}%`} color={C.gold} sub="SETAR vs 线性" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="门限网格搜索：SSR 与 F 统计量">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={grid}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="c" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="l" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="r" orientation="right" stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="l" type="monotone" dataKey="ssr" name="SSR(c)" stroke={C.gold} strokeWidth={2} dot={false} />
                <Line yAxisId="r" type="monotone" dataKey="f" name="F(c)" stroke={C.blue} strokeWidth={1.5} dot={false} />
                <ReferenceLine yAxisId="l" x={+res.threshold.toFixed(2)} stroke={C.red} strokeDasharray="4 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="LSTAR 平滑转换函数 G(z; γ, c)">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={res.lstar.curve}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="z" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 1]} stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="g" name="G(z)" stroke={C.teal} strokeWidth={2} dot={false} />
                <ReferenceLine x={+res.lstar.c.toFixed(3)} stroke={C.red} strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] font-mono text-muted-foreground mt-2">
            γ̂ = {res.lstar.gamma.toFixed(2)}，ĉ = {res.lstar.c.toFixed(3)}；γ→∞ 退化为 SETAR 的硬切换。
          </p>
        </Panel>
      </div>

      <Panel title="制度分段拟合（末段样本）">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={fitted}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="y" name="实际" stroke={C.text} strokeWidth={1} dot={false} />
              <Line type="monotone" dataKey="setar" name="SETAR 拟合" stroke={C.gold} strokeWidth={1.8} dot={false} />
              <Line type="monotone" dataKey="linear" name="线性 AR 拟合" stroke={C.blue} strokeWidth={1.2} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Note>
        <p><span className="text-gold">Davies 问题：</span>门限 c 只有在非线性成立时才被识别，因此常规 F 分布不适用。Hansen (1996) 的自助检验在线性原假设下重复生成数据，得到 supF 的经验分布——这里的 p 值就是这样算出来的。</p>
        <p><span className="text-gold">经济含义：</span>门限模型刻画「状态依赖」：衰退中的持久性可能远高于扩张期，套利只在偏离超过交易成本时才启动。线性 AR 会把两个制度平均成一个中间参数，从而系统性低估极端状态下的动态。</p>
      </Note>
    </div>
  );
};

/* ═══════════ 5. Bai-Perron 多重断点 ═══════════ */

export const BaiPerronTool = () => {
  const [nBreaks, setNBreaks] = useState(2);
  const [shift, setShift] = useState(3);
  const [n, setN] = useState(240);
  const [maxM, setMaxM] = useState(4);
  const [seed, setSeed] = useState(33);

  const trueBreaks = useMemo(
    () => Array.from({ length: nBreaks }, (_, i) => (i + 1) / (nBreaks + 1)),
    [nBreaks]
  );
  const res = useMemo(
    () => baiPerron({ n, seed, maxBreaks: maxM, trueBreaks, shift }),
    [n, seed, maxM, trueBreaks, shift]
  );

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "两个断点", description: "标准场景", apply: () => { setNBreaks(2); setShift(3); } },
        { name: "三个断点", description: "考验序贯检验", apply: () => { setNBreaks(3); setShift(3); } },
        { name: "微弱位移", description: "shift=1 → 难以识别", apply: () => { setShift(1); } },
        { name: "无断点", description: "shift=0 → BIC 应选 0", apply: () => { setShift(0); } },
        { name: "长样本", description: "T=480", apply: () => { setN(480); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Slider label="真实断点个数" value={nBreaks} min={0} max={4} step={1} fmt={(v) => v.toFixed(0)} onChange={setNBreaks} />
            <Slider label="每次位移幅度" value={shift} min={0} max={5} step={0.25} onChange={setShift} />
            <Slider label="样本量 T" value={n} min={120} max={600} step={40} fmt={(v) => v.toFixed(0)} onChange={setN} />
            <Slider label="最大搜索断点数" value={maxM} min={1} max={5} step={1} fmt={(v) => v.toFixed(0)} onChange={setMaxM} />
            <Slider label="随机种子" value={seed} min={1} max={99} step={1} fmt={(v) => v.toFixed(0)} onChange={setSeed} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="BIC 选择断点数" value={res.mBIC.toFixed(0)} color={C.gold} sub={`真值 ${nBreaks}`} />
            <Stat label="序贯 supF 选择" value={res.mSequential.toFixed(0)} color={C.teal} sub="逐步检验 l+1 | l" />
          </div>
        </div>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={res.series}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="y" name="序列" stroke={C.text} strokeWidth={1} dot={false} />
              <Line type="stepAfter" dataKey="fit" name="分段均值" stroke={C.gold} strokeWidth={2} dot={false} />
              {res.breaks.map((b) => (
                <ReferenceLine key={b} x={b} stroke={C.red} strokeDasharray="4 3" />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="断点数选择：SSR / BIC / LWZ">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left py-2">断点数 m</th><th className="text-right">SSR</th>
                  <th className="text-right">BIC</th><th className="text-right">LWZ</th>
                </tr>
              </thead>
              <tbody>
                {res.ssrByM.map((r) => (
                  <tr key={r.m} className="border-b border-border/40">
                    <td className="py-1" style={{ color: r.m === res.mBIC ? C.gold : undefined }}>
                      {r.m}{r.m === res.mBIC ? " ← BIC 最小" : ""}
                    </td>
                    <td className="text-right">{r.ssr.toFixed(1)}</td>
                    <td className="text-right">{r.bic.toFixed(4)}</td>
                    <td className="text-right">{r.lwz.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="序贯 supF(l+1 | l) 检验">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left py-2">检验</th><th className="text-right">F</th>
                  <th className="text-right">5% 临界</th><th className="text-left pl-4">结论</th>
                </tr>
              </thead>
              <tbody>
                {res.sequential.map((s) => (
                  <tr key={s.test} className="border-b border-border/40">
                    <td className="py-1">{s.test}</td>
                    <td className="text-right text-gold">{s.f.toFixed(2)}</td>
                    <td className="text-right">{s.cv5.toFixed(2)}</td>
                    <td className="pl-4" style={{ color: s.reject ? C.green : C.red }}>
                      {s.reject ? "拒绝 → 再加一个断点" : "不拒绝 → 停止"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] font-mono text-muted-foreground mt-3">
            分段区间：{res.segments.map((s) => `[${s.start},${s.end}] μ̂=${s.mean.toFixed(2)}`).join("  ")}
          </p>
        </Panel>
      </div>

      <Note>
        <p><span className="text-gold">为什么要动态规划：</span>m 个断点的穷举是 O(Tᵐ)，Bai-Perron (1998, 2003) 用分段 SSR 的动态规划把它压到 O(T²)，从而能同时估计断点位置与个数。</p>
        <p><span className="text-gold">把稳定性当作待检验对象：</span>用整段样本估一组「稳定参数」是最常见的隐含假设。断点检验把这一假设显式化：一次危机或政策框架转换足以让全样本估计成为无意义的平均。</p>
      </Note>
    </div>
  );
};

/* ═══════════ 6. 密度预测评价台 ═══════════ */

export const DensityEvalTool = () => {
  const [n, setN] = useState(700);
  const [alpha, setAlpha] = useState(0.1);
  const [beta, setBeta] = useState(0.85);
  const [nu, setNu] = useState(5);
  const [fat, setFat] = useState(false);
  const [seed, setSeed] = useState(17);

  const res = useMemo(
    () => densityEvalLab({ n, alpha, beta, nu, fatTails: fat, seed }),
    [n, alpha, beta, nu, fat, seed]
  );
  const pitData = res.models[0].pitHist.map((h, i) => ({
    bin: h.bin,
    正态: +res.models[0].pitHist[i].freq.toFixed(3),
    t分布: +res.models[1].pitHist[i].freq.toFixed(3),
    GARCH: +res.models[2].pitHist[i].freq.toFixed(3),
  }));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "典型股票", description: "α=0.1, β=0.85", apply: () => { setAlpha(0.1); setBeta(0.85); setFat(false); } },
        { name: "高持久波动", description: "α+β≈0.99", apply: () => { setAlpha(0.09); setBeta(0.9); } },
        { name: "厚尾冲击", description: "t(5) 创新", apply: () => { setFat(true); setNu(5); } },
        { name: "近乎同方差", description: "α=0.02, β=0.5", apply: () => { setAlpha(0.02); setBeta(0.5); setFat(false); } },
        { name: "极端厚尾", description: "t(3)", apply: () => { setFat(true); setNu(3); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">DGP：GARCH(1,1)，可选 t 创新</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="ARCH α" value={alpha} min={0.02} max={0.25} step={0.01} onChange={setAlpha} />
            <Slider label="GARCH β" value={beta} min={0.5} max={0.95} step={0.01} onChange={setBeta} />
            <Slider label="自由度 ν" value={nu} min={3} max={15} step={1} fmt={(v) => v.toFixed(0)} onChange={setNu} />
            <Slider label="样本量 T" value={n} min={300} max={1200} step={100} fmt={(v) => v.toFixed(0)} onChange={setN} />
            <Slider label="随机种子" value={seed} min={1} max={99} step={1} fmt={(v) => v.toFixed(0)} onChange={setSeed} />
          </div>
          <Choice value={fat ? "t" : "n"} onChange={(v) => setFat(v === "t")} options={[
            { id: "n", label: "正态创新" }, { id: "t", label: `t(${nu}) 厚尾创新` },
          ]} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="对数得分最优" value={res.bestBy.logScore} color={C.gold} sub="越大越好" />
          <Stat label="CRPS 最优" value={res.bestBy.crps} color={C.teal} sub="越小越好" />
          <Stat label="α + β (真实)" value={(alpha + beta).toFixed(2)} color={C.blue} sub="波动持久度" />
          <Stat label="样本波动率" value={(Math.sqrt(res.returns.reduce((s, r) => s + r * r, 0) / res.returns.length) * Math.sqrt(252) * 100).toFixed(1) + "%"} color={C.text} sub="年化" />
        </div>
      </div>

      <Panel title="评分卡：对数得分 / CRPS / PIT 均匀性 / 覆盖率 / pinball">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-2">预测密度</th>
                <th className="text-right">平均对数得分</th>
                <th className="text-right">CRPS</th>
                <th className="text-right">PIT χ²</th>
                <th className="text-right">p 值</th>
                <th className="text-right">90% 覆盖率</th>
                <th className="text-right">pinball</th>
              </tr>
            </thead>
            <tbody>
              {res.models.map((m) => (
                <tr key={m.name} className="border-b border-border/40">
                  <td className="py-1.5 text-foreground">{m.name}</td>
                  <td className="text-right" style={{ color: m.name === res.bestBy.logScore ? C.green : undefined }}>{m.logScore.toFixed(3)}</td>
                  <td className="text-right" style={{ color: m.name === res.bestBy.crps ? C.green : undefined }}>{(m.crps * 1e3).toFixed(3)}e−3</td>
                  <td className="text-right">{m.uniformityChi2.toFixed(1)}</td>
                  <td className="text-right" style={{ color: m.uniformityP < 0.05 ? C.red : C.green }}>{m.uniformityP.toFixed(3)}</td>
                  <td className="text-right">{(100 * m.coverage90).toFixed(1)}%</td>
                  <td className="text-right">{(m.pinball * 1e3).toFixed(3)}e−3</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="PIT 直方图 — 校准良好的密度应接近均匀 (10%)">
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pitData}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="bin" stroke={C.text} tick={{ fontSize: 9 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="正态" fill={C.blue} />
              <Bar dataKey="t分布" fill={C.teal} />
              <Bar dataKey="GARCH" fill={C.gold} />
              <ReferenceLine y={0.1} stroke={C.red} strokeDasharray="4 3" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Note>
        <p><span className="text-gold">点预测不够：</span>风险管理关心的是整条条件分布。PIT = F̂ₜ(yₜ) 在密度正确设定时服从均匀分布；U 型直方图说明区间过窄（低估风险），倒 U 型说明过宽。</p>
        <p><span className="text-gold">得分规则：</span>对数得分与 CRPS 都是严格适当评分规则——诚实报告真实密度才最优。CRPS 与 pinball loss 同族，对整条分布加权，比只看 VaR 命中率更稳健。</p>
      </Note>
    </div>
  );
};

/* ═══════════ 7. 模型置信集与预测组合 ═══════════ */

export const McsTool = () => {
  const [n, setN] = useState(300);
  const [alpha, setAlpha] = useState(0.1);
  const [boots, setBoots] = useState(300);
  const [block, setBlock] = useState(6);
  const [seed, setSeed] = useState(41);

  const res = useMemo(
    () => mcsLab({ n, alpha, boots, block, seed }),
    [n, alpha, boots, block, seed]
  );
  const comboData = res.combos.map((c) => ({ name: c.name, mse: +c.mse.toFixed(4) }));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "标准设置", description: "α=10%, 300 次自助", apply: () => { setAlpha(0.1); setBoots(300); } },
        { name: "严格筛选", description: "α=25% → 集合更小", apply: () => { setAlpha(0.25); } },
        { name: "宽松筛选", description: "α=5% → 集合更大", apply: () => { setAlpha(0.05); } },
        { name: "短评估期", description: "T=100 → 区分不出模型", apply: () => { setN(100); } },
        { name: "长块自助", description: "block=12 处理强相关损失", apply: () => { setBlock(12); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Slider label="评估期长度 T" value={n} min={80} max={600} step={20} fmt={(v) => v.toFixed(0)} onChange={setN} />
            <Slider label="显著性 α" value={alpha} min={0.05} max={0.3} step={0.05} onChange={setAlpha} />
            <Slider label="自助次数" value={boots} min={100} max={600} step={50} fmt={(v) => v.toFixed(0)} onChange={setBoots} />
            <Slider label="块长度" value={block} min={1} max={20} step={1} fmt={(v) => v.toFixed(0)} onChange={setBlock} />
            <Slider label="随机种子" value={seed} min={1} max={99} step={1} fmt={(v) => v.toFixed(0)} onChange={setSeed} />
          </div>
          <Note>
            <p>淘汰顺序：{res.eliminationOrder.length ? res.eliminationOrder.join(" → ") : "无（所有模型都保留）"}</p>
          </Note>
        </div>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comboData} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis type="number" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} width={90} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="mse" name="组合 MSE">
                {comboData.map((d, i) => (
                  <Cell key={i} fill={i === 0 ? C.blue : C.gold} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <Panel title={`模型置信集 (α = ${(100 * res.alpha).toFixed(0)}%)`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-2">模型</th><th className="text-right">MSE</th>
                <th className="text-right">MCS p 值</th><th className="text-left pl-4">是否入选</th>
                <th className="text-right">逆 MSE 权重</th><th className="text-right">最优权重</th>
              </tr>
            </thead>
            <tbody>
              {res.models.map((m) => (
                <tr key={m.name} className="border-b border-border/40">
                  <td className="py-1.5 text-foreground">{m.name}</td>
                  <td className="text-right text-gold">{m.mse.toFixed(4)}</td>
                  <td className="text-right">{m.pElim.toFixed(3)}</td>
                  <td className="pl-4" style={{ color: m.inMCS ? C.green : C.red }}>{m.inMCS ? "在集合内" : "已淘汰"}</td>
                  <td className="text-right">{(100 * m.weightInv).toFixed(1)}%</td>
                  <td className="text-right">{(100 * m.weightOpt).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="成对 Diebold-Mariano 检验矩阵">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-2">模型 A</th><th className="text-left">模型 B</th>
                <th className="text-right">DM</th><th className="text-right">p 值</th><th className="text-left pl-4">结论</th>
              </tr>
            </thead>
            <tbody>
              {res.pairwiseDM.map((d, i) => (
                <tr key={i} className="border-b border-border/40">
                  <td className="py-1">{d.a}</td><td>{d.b}</td>
                  <td className="text-right" style={{ color: Math.abs(d.dm) > 1.96 ? C.gold : undefined }}>{d.dm.toFixed(2)}</td>
                  <td className="text-right">{d.p.toFixed(3)}</td>
                  <td className="pl-4">{d.p < 0.05 ? (d.dm < 0 ? `${d.a} 更优` : `${d.b} 更优`) : "无显著差异"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Note>
        <p><span className="text-gold">为什么需要 MCS：</span>对 M 个模型做成对 DM 检验会带来严重的多重比较问题。Hansen、Lunde 与 Nason (2011) 的模型置信集通过序贯等价检验与自助分布，给出一个以 1−α 概率包含最优模型的集合——「选不出唯一冠军」本身就是有信息的结论。</p>
        <p><span className="text-gold">组合往往更强：</span>预测组合谜题：等权组合常常打败任何单一模型与「最优」估计权重，因为后者的权重估计误差在小样本里代价高昂。</p>
      </Note>
    </div>
  );
};

/* ═══════════ 8. 随机波动率 vs GARCH ═══════════ */

export const SVGarchTool = () => {
  const [phi, setPhi] = useState(0.97);
  const [sigmaEta, setSigmaEta] = useState(0.2);
  const [n, setN] = useState(400);
  const [particles, setParticles] = useState(200);
  const [seed, setSeed] = useState(23);

  const res = useMemo(
    () => svVsGarch({ n, seed, phi, sigmaEta, particles }),
    [n, seed, phi, sigmaEta, particles]
  );
  const path = res.trueVol.map((v, t) => ({
    t,
    真实: +(v * Math.sqrt(252) * 100).toFixed(2),
    SV: +((res.svVol[t] ?? 0) * Math.sqrt(252) * 100).toFixed(2),
    GARCH: +((res.garchVol[t] ?? 0) * Math.sqrt(252) * 100).toFixed(2),
  }));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "典型金融序列", description: "φ=0.97, σ_η=0.2", apply: () => { setPhi(0.97); setSigmaEta(0.2); } },
        { name: "极持久波动", description: "φ=0.99", apply: () => { setPhi(0.99); setSigmaEta(0.15); } },
        { name: "波动的波动大", description: "σ_η=0.45", apply: () => { setSigmaEta(0.45); } },
        { name: "弱持久", description: "φ=0.8", apply: () => { setPhi(0.8); } },
        { name: "高精度滤波", description: "400 粒子", apply: () => { setParticles(400); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">hₜ = μ + φ(hₜ₋₁ − μ) + σ_η ηₜ，yₜ = e^{"{hₜ/2}"} εₜ</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="持久度 φ" value={phi} min={0.7} max={0.995} step={0.005} onChange={setPhi} />
            <Slider label="波动的波动 σ_η" value={sigmaEta} min={0.05} max={0.6} step={0.05} onChange={setSigmaEta} />
            <Slider label="样本量 T" value={n} min={200} max={800} step={50} fmt={(v) => v.toFixed(0)} onChange={setN} />
            <Slider label="粒子数" value={particles} min={100} max={500} step={50} fmt={(v) => v.toFixed(0)} onChange={setParticles} />
            <Slider label="随机种子" value={seed} min={1} max={99} step={1} fmt={(v) => v.toFixed(0)} onChange={setSeed} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="SV 网格估计 φ̂" value={res.params.phi.toFixed(3)} color={C.gold} sub={`真值 ${phi.toFixed(3)}`} />
          <Stat label="SV σ̂_η" value={res.params.sigmaEta.toFixed(2)} color={C.gold} sub={`真值 ${sigmaEta.toFixed(2)}`} />
          <Stat label="GARCH α + β" value={res.garchParams.persistence.toFixed(3)} color={C.blue} sub={`α=${res.garchParams.alpha.toFixed(3)}`} />
          <Stat label="粒子滤波对数似然" value={res.params.logLik.toFixed(1)} color={C.text} />
          <Stat label="SV 与真实波动相关" value={res.corrSV.toFixed(3)} color={res.corrSV > res.corrGarch ? C.green : C.red} sub={`RMSE ${(res.rmseSV * 1e2).toFixed(3)}e−2`} />
          <Stat label="GARCH 与真实波动相关" value={res.corrGarch.toFixed(3)} color={res.corrGarch > res.corrSV ? C.green : C.red} sub={`RMSE ${(res.rmseGarch * 1e2).toFixed(3)}e−2`} />
        </div>
      </div>

      <Panel title="滤波波动率路径（年化 %）">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={path}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="真实" stroke={C.text} strokeWidth={1.6} dot={false} />
              <Line type="monotone" dataKey="SV" stroke={C.gold} strokeWidth={1.6} dot={false} />
              <Line type="monotone" dataKey="GARCH" stroke={C.blue} strokeWidth={1.4} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="SV 平均对数得分" value={res.logScoreSV.toFixed(3)} color={res.logScoreSV > res.logScoreGarch ? C.green : C.red} sub="条件正态密度" />
        <Stat label="GARCH 平均对数得分" value={res.logScoreGarch.toFixed(3)} color={res.logScoreGarch > res.logScoreSV ? C.green : C.red} sub="条件正态密度" />
      </div>

      <Note>
        <p><span className="text-gold">两种波动率哲学：</span>GARCH 把条件方差写成过去观测的确定性函数，似然可直接写出；SV 把对数波动当作潜在状态，似然需要积分掉整条状态路径——这里用自举粒子滤波近似，并在 (φ, σ_η) 网格上取最大似然。</p>
        <p><span className="text-gold">取舍：</span>SV 对波动冲击的刻画更灵活、与连续时间随机波动模型（Heston 等）衔接自然，但估计成本高（MCMC / 粒子 MCMC）；GARCH 估计便宜、样本外常常不落下风，是风险管理的实用默认。</p>
      </Note>
    </div>
  );
};
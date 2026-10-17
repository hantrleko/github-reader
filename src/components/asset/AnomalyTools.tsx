import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine, ScatterChart, Scatter, ZAxis,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { AssetChrome, CHART, mulberry32, randn } from "./AssetChrome";
import { anomalySort, grsTest } from "@/lib/quant/assetPricing";

const { GOLD, TEAL, RED, BLUE, GRID, TEXT } = CHART;
const { Slider, Stat, Note, ChartCard } = AssetChrome;

type Anomaly = "size" | "value" | "momentum" | "lowvol";


/* ════════════════════════════════════════════════════════════
   10. Anomaly quantile-sort long-short portfolio
   ════════════════════════════════════════════════════════════ */
export const AnomalySortTool = () => {
  const { t } = useTranslation();
  const ANOMALY_META: Record<Anomaly, { label: string; premium: number; desc: string }> = {
  size: { label: t("labs.asset.anomaly.text1", { defaultValue: "规模 (小减大)" }), premium: 0.25, desc: t("labs.asset.anomaly.text2", { defaultValue: "小盘股平均收益高于大盘 (Banz 1981)" }) },
  value: { label: t("labs.asset.anomaly.text3", { defaultValue: "价值 (高减低 B/M)" }), premium: 0.35, desc: t("labs.asset.anomaly.text4", { defaultValue: "高账面市值比 (价值) 跑赢成长 (Fama-French 1992)" }) },
  momentum: { label: t("labs.asset.anomaly.text5", { defaultValue: "动量 (赢家减输家)" }), premium: 0.55, desc: t("labs.asset.anomaly.text6", { defaultValue: "过去赢家延续跑赢 (Jegadeesh-Titman 1993)" }) },
  lowvol: { label: t("labs.asset.anomaly.text7", { defaultValue: "低波动 (低减高)" }), premium: 0.30, desc: t("labs.asset.anomaly.text8", { defaultValue: "低波动股风险调整后跑赢 (Ang et al. 2006)" }) },
};
  const [anomaly, setAnomaly] = useState<Anomaly>("value");
  const [nGroups, setNGroups] = useState(5);
  const [nStocks, setNStocks] = useState(200);
  const [T, setT] = useState(120);
  const [strength, setStrength] = useState(0.35);
  const [noise, setNoise] = useState(5);
  const [seed, setSeed] = useState(21);

  const res = useMemo(() => {
    const rng = mulberry32(seed);
    const N = Math.round(nStocks);
    const periods = Math.round(T);
    // cross-sectional characteristic (standardized rank)
    const raw = Array.from({ length: N }, () => randn(rng));
    const sorted = [...raw].sort((a, b) => a - b);
    const rankOf = (x: number) => (sorted.indexOf(x) / (N - 1)) - 0.5; // −0.5..0.5
    const char = raw.map(rankOf);
    // returns panel: characteristic premium + market + idiosyncratic
    const returns: number[][] = [];
    for (let period = 0; period < periods; period++) {
      const mkt = randn(rng) * 4;
      returns.push(char.map((c) => strength * (c * 12) + 0.4 * mkt + randn(rng) * noise));
    }
    return anomalySort(returns, char, Math.round(nGroups));
  }, [anomaly, nGroups, nStocks, T, strength, noise, seed, t]);

  const chartData = res.portfolios.map((p) => ({
    name: p.rank === 1 ? t("labs.asset.anomaly.text9", { defaultValue: "Q1 (低)" }) : p.rank === Math.round(nGroups) ? t("labs.asset.anomaly.text10", { defaultValue: `Q${p.rank} (高)`, value: p.rank }) : `Q${p.rank}`,
    收益: +p.avgReturn.toFixed(3),
  }));

  const applyAnomaly = (a: Anomaly) => {
    setAnomaly(a);
    setStrength(ANOMALY_META[a].premium);
  };

  return (
    <div className="space-y-6">
      <PresetButtons presets={(Object.keys(ANOMALY_META) as Anomaly[]).map((a) => ({
        name: ANOMALY_META[a].label, description: ANOMALY_META[a].desc, apply: () => applyAnomaly(a),
      }))} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.asset.anomaly.text11", { defaultValue: "排序与面板参数" })}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.asset.anomaly.text12", { defaultValue: "分位组数" })} value={nGroups} min={3} max={10} step={1} onChange={setNGroups} />
            <Slider label={t("labs.asset.anomaly.text13", { defaultValue: "股票数 N" })} value={nStocks} min={50} max={500} step={10} onChange={setNStocks} />
            <Slider label={t("labs.asset.anomaly.text14", { defaultValue: "期数 T" })} value={T} min={36} max={360} step={12} onChange={setT} />
            <Slider label={t("labs.asset.anomaly.text15", { defaultValue: "异象强度" })} value={strength} min={0} max={0.8} step={0.05} onChange={setStrength} />
            <Slider label={t("labs.asset.anomaly.text16", { defaultValue: "特异波动" })} value={noise} min={1} max={10} step={0.5} onChange={setNoise} />
            <Slider label={t("labs.asset.anomaly.text17", { defaultValue: "随机种子" })} value={seed} min={1} max={99} step={1} onChange={setSeed} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.asset.anomaly.text18", { defaultValue: "当前异象" })} value={ANOMALY_META[anomaly].label.split(" ")[0]} sub={t("labs.asset.anomaly.text19", { defaultValue: `${Math.round(nGroups)} 分位`, value: Math.round(nGroups) })} />
          <Stat label={t("labs.asset.anomaly.text20", { defaultValue: "多空价差" })} value={`${res.longShort >= 0 ? "+" : ""}${res.longShort.toFixed(3)}%`} color={res.longShort >= 0 ? TEAL : RED} sub={t("labs.asset.anomaly.text21", { defaultValue: "高分位 − 低分位" })} />
          <Stat label={t("labs.asset.anomaly.text22", { defaultValue: "t 统计量" })} value={res.tStat.toFixed(2)} color={Math.abs(res.tStat) > 2 ? GOLD : undefined} sub={Math.abs(res.tStat) > 2 ? t("labs.asset.anomaly.text23", { defaultValue: "显著" }) : t("labs.asset.anomaly.text24", { defaultValue: "不显著" })} />
          <Stat label={t("labs.asset.anomaly.text25", { defaultValue: "单调性" })} value={res.monotonic ? t("labs.asset.anomaly.text26", { defaultValue: "单调 ✓" }) : t("labs.asset.anomaly.text27", { defaultValue: "非单调" })} color={res.monotonic ? TEAL : RED} sub={t("labs.asset.anomaly.text28", { defaultValue: "分位收益递增" })} />
        </div>
      </div>

      <ChartCard title={t("labs.asset.anomaly.text29", { defaultValue: "各分位组合平均收益 (%)" })} hint={t("labs.asset.anomaly.text30", { defaultValue: "把股票按特征值排序分组，等权持有各组。若高分位组合收益单调高于低分位，且多空价差 t>2，则该异象在样本内显著——这正是 SMB/HML/UMD 等因子的构建逻辑。" })}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke={TEXT} tick={{ fontSize: 10 }} />
            <YAxis stroke={TEXT} tick={{ fontSize: 10 }} unit="%" />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 11 }} />
            <ReferenceLine y={0} stroke={GRID} />
            <Bar dataKey="收益" name={t("labs.asset.anomaly.text31", { defaultValue: "收益" })} radius={[3, 3, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={i === 0 ? RED : i === chartData.length - 1 ? TEAL : GOLD} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <Note>
        <p><span className="text-gold">{ANOMALY_META[anomaly].label}：</span>{ANOMALY_META[anomaly].desc}。</p>
        <p><span className="text-gold">{t("labs.asset.anomaly.text32", { defaultValue: "多空组合：" })}</span>{t("labs.asset.anomaly.text33", { defaultValue: "做多最高分位、做空最低分位，剥离市场暴露得到纯异象收益。" })}</p>
        <p><span className="text-gold">{t("labs.asset.anomaly.text34", { defaultValue: "显著性：" })}</span>{t("labs.asset.anomaly.text35", { defaultValue: "t = 均值/标准误；|t|&gt;2 视为统计显著。异象既是因子构建基础，也是市场效率争论焦点。" })}</p>
      </Note>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   11. GRS joint test (Gibbons-Ross-Shanken 1989)
   ════════════════════════════════════════════════════════════ */
export const GRSTool = () => {
  const { t } = useTranslation();
  const [nAssets, setNAssets] = useState(10);
  const [T, setT] = useState(240);
  const [nFactors, setNFactors] = useState(3);
  const [trueAlpha, setTrueAlpha] = useState(0);
  const [noise, setNoise] = useState(2);
  const [seed, setSeed] = useState(17);

  const res = useMemo(() => {
    const rng = mulberry32(seed);
    const N = Math.round(nAssets);
    const periods = Math.round(T);
    const K = Math.round(nFactors);
    // factor realizations (mean ~0.4% per month, vol ~3%)
    const factors: number[][] = [];
    for (let period = 0; period < periods; period++)
      factors.push(Array.from({ length: K }, () => 0.4 + randn(rng) * 3));
    // asset betas
    const betas = Array.from({ length: N }, () =>
      Array.from({ length: K }, () => 0.4 + rng() * 1.2),
    );
    // alphas: inject trueAlpha with small dispersion
    const alphas = Array.from({ length: N }, () => trueAlpha + randn(rng) * (trueAlpha === 0 ? 0.05 : 0.1));
    const excess: number[][] = [];
    for (let period = 0; period < periods; period++) {
      excess.push(betas.map((b, i) => {
        let r = alphas[i];
        for (let k = 0; k < K; k++) r += b[k] * factors[period][k];
        return r + randn(rng) * noise;
      }));
    }
    return grsTest(excess, factors);
  }, [nAssets, T, nFactors, trueAlpha, noise, seed, t]);

  const scatter = res.alphas.map((a, i) => ({ i: i + 1, alpha: +a.toFixed(3) }));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.asset.anomaly.text36", { defaultValue: "模型成立 (α=0)" }), description: t("labs.asset.anomaly.text37", { defaultValue: "不应拒绝" }), apply: () => { setTrueAlpha(0); setNoise(2); setNAssets(10); setT(240); } },
        { name: t("labs.asset.anomaly.text38", { defaultValue: "定价失败 (α=0.4)" }), description: t("labs.asset.anomaly.text39", { defaultValue: "应拒绝" }), apply: () => { setTrueAlpha(0.4); setNoise(2); } },
        { name: t("labs.asset.anomaly.text40", { defaultValue: "多测试组合" }), description: "N=25", apply: () => { setNAssets(25); setT(300); } },
        { name: t("labs.asset.anomaly.text41", { defaultValue: "五因子" }), description: "K=5", apply: () => { setNFactors(5); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.asset.anomaly.text42", { defaultValue: "测试组合与因子" })}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.asset.anomaly.text43", { defaultValue: "测试组合数 N" })} value={nAssets} min={4} max={30} step={1} onChange={setNAssets} />
            <Slider label={t("labs.asset.anomaly.text44", { defaultValue: "期数 T" })} value={T} min={60} max={480} step={12} onChange={setT} />
            <Slider label={t("labs.asset.anomaly.text45", { defaultValue: "因子数 K" })} value={nFactors} min={1} max={5} step={1} onChange={setNFactors} />
            <Slider label={t("labs.asset.anomaly.text46", { defaultValue: "真实 α (%/期)" })} value={trueAlpha} min={0} max={0.8} step={0.05} onChange={setTrueAlpha} />
            <Slider label={t("labs.asset.anomaly.text47", { defaultValue: "特异波动" })} value={noise} min={0.5} max={5} step={0.5} onChange={setNoise} />
            <Slider label={t("labs.asset.anomaly.text48", { defaultValue: "随机种子" })} value={seed} min={1} max={99} step={1} onChange={setSeed} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.asset.anomaly.text49", { defaultValue: "GRS F 统计量" })} value={res.grs.toFixed(3)} color={GOLD} sub={`F(${res.df1}, ${res.df2})`} />
          <Stat label={t("labs.asset.anomaly.text50", { defaultValue: "p 值" })} value={res.pValue < 0.001 ? "<0.001" : res.pValue.toFixed(3)} color={res.pValue < 0.05 ? RED : TEAL} />
          <Stat label={t("labs.asset.anomaly.text51", { defaultValue: "平均 |α|" })} value={`${res.meanAbsAlpha.toFixed(3)}%`} color={BLUE} sub={t("labs.asset.anomaly.text52", { defaultValue: "定价误差" })} />
          <Stat label={t("labs.asset.anomaly.text53", { defaultValue: "结论 (5%)" })} value={res.pValue < 0.05 ? t("labs.asset.anomaly.text54", { defaultValue: "拒绝模型 ✗" }) : t("labs.asset.anomaly.text55", { defaultValue: "不拒绝 ✓" })} color={res.pValue < 0.05 ? RED : TEAL} sub={t("labs.asset.anomaly.text56", { defaultValue: "H0: 所有 α=0" })} />
        </div>
      </div>

      <ChartCard title={t("labs.asset.anomaly.text57", { defaultValue: "各测试组合的定价误差 α" })} hint={t("labs.asset.anomaly.text58", { defaultValue: "GRS 联合检验所有 α 是否同时为零。F 统计量大 (p<0.05) ⟹ 拒绝，说明因子模型无法定价这些组合 (存在系统性 α)。散点越贴近 0 线，模型定价越好。" })}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="i" name={t("labs.asset.anomaly.text59", { defaultValue: "组合" })} stroke={TEXT} tick={{ fontSize: 10 }} />
            <YAxis dataKey="alpha" name="α" stroke={TEXT} tick={{ fontSize: 10 }} unit="%" />
            <ZAxis range={[60, 60]} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 11 }} cursor={{ strokeDasharray: "3 3" }} />
            <ReferenceLine y={0} stroke={RED} strokeDasharray="4 3" />
            <Scatter data={scatter} fill={GOLD} />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>

      <Note>
        <p><span className="text-gold">{t("labs.asset.anomaly.text60", { defaultValue: "GRS 检验 (Gibbons-Ross-Shanken 1989)：" })}</span>{t("labs.asset.anomaly.text61", { defaultValue: "联合检验一组测试组合的定价误差 α 是否全为零。" })}</p>
        <p><span className="text-gold">F = (T/N)·((T−N−K)/(T−K−1))·(α′Σ⁻¹α)/(1+μ_f′Ω⁻¹μ_f) ~ F(N, T−N−K)。</span></p>
        <p><span className="text-gold">{t("labs.asset.anomaly.text62", { defaultValue: "解读：" })}</span>{t("labs.asset.anomaly.text63", { defaultValue: "p&lt;0.05 拒绝「因子模型完全定价」；即使个别 α 不显著，联合检验仍可能拒绝。" })}</p>
      </Note>
    </div>
  );
};
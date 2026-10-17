import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Cell,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { AssetChrome, CHART, mulberry32, randn } from "./AssetChrome";
import { campbellShiller, factorZoo, currencyCarry } from "@/lib/quant/assetPricingAdvanced";

const { GOLD, TEAL, RED, BLUE, GRID, TEXT } = CHART;
const { Slider, Stat, Note, ChartCard } = AssetChrome;

/* ════════════════════════════════════════════════════════════
   19. Campbell-Shiller 分解与收益可预测性
   ════════════════════════════════════════════════════════════ */
export const CampbellShillerTool = () => {
  const { t } = useTranslation();
  const [T, setT] = useState(300);
  const [persist, setPersist] = useState(0.94);
  const [retLoad, setRetLoad] = useState(0.12);
  const [dgLoad, setDgLoad] = useState(0.0);
  const [seed, setSeed] = useState(3);

  const { res, series } = useMemo(() => {
    const rng = mulberry32(seed);
    const dp: number[] = [-3.4];
    const ret: number[] = [0];
    const dg: number[] = [0];
    for (let period = 1; period < T; period++) {
      const dev = dp[period - 1] + 3.4;
      ret.push(0.02 + retLoad * dev + 0.14 * randn(rng));
      dg.push(0.015 + dgLoad * dev + 0.05 * randn(rng));
      dp.push(-3.4 + persist * dev + 0.16 * randn(rng));
    }
    return {
      res: campbellShiller({ dp, ret, dg }),
      series: dp.map((v, period) => ({ period, dp: +v.toFixed(3), ret: +(ret[period] * 100).toFixed(2) })),
    };
  }, [T, persist, retLoad, dgLoad, seed, t]);

  const shares = [
    { name: t("labs.asset.frontier.text1", { defaultValue: "折现率新闻" }), value: +(res.drNewsShare * 100).toFixed(1) },
    { name: t("labs.asset.frontier.text2", { defaultValue: "现金流新闻" }), value: +(res.cfNewsShare * 100).toFixed(1) },
  ];

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.asset.frontier.text3", { defaultValue: "美国股市风格" }), description: t("labs.asset.frontier.text4", { defaultValue: "折现率新闻主导" }), apply: () => { setRetLoad(0.12); setDgLoad(0); setPersist(0.94); } },
        { name: t("labs.asset.frontier.text5", { defaultValue: "现金流驱动" }), description: t("labs.asset.frontier.text6", { defaultValue: "股利可预测" }), apply: () => { setRetLoad(0.02); setDgLoad(-0.1); } },
        { name: t("labs.asset.frontier.text7", { defaultValue: "高持续性 dp" }), description: "φ = 0.98", apply: () => setPersist(0.98) },
        { name: t("labs.asset.frontier.text8", { defaultValue: "短样本" }), description: "T = 120", apply: () => setT(120) },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label={t("labs.asset.frontier.text9", { defaultValue: "样本长度 T (季)" })} value={T} min={80} max={600} step={20} onChange={(v) => setT(Math.round(v))} />
          <Slider label={t("labs.asset.frontier.text10", { defaultValue: "dp 的 AR(1) 持续性 φ" })} value={persist} min={0.7} max={0.99} step={0.01} onChange={setPersist} />
          <Slider label={t("labs.asset.frontier.text11", { defaultValue: "收益对 dp 的载荷" })} value={retLoad} min={-0.05} max={0.3} step={0.01} onChange={setRetLoad} />
          <Slider label={t("labs.asset.frontier.text12", { defaultValue: "股利增长对 dp 的载荷" })} value={dgLoad} min={-0.25} max={0.1} step={0.01} onChange={setDgLoad} />
          <Slider label={t("labs.asset.frontier.text13", { defaultValue: "随机种子" })} value={seed} min={1} max={40} step={1} onChange={(v) => setSeed(Math.round(v))} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.asset.frontier.text14", { defaultValue: "线性化常数 ρ" })} value={res.rho.toFixed(4)} sub="≈ 1/(1+D/P)" />
          <Stat label={t("labs.asset.frontier.text15", { defaultValue: "dp 持续性 φ̂" })} value={res.phi.toFixed(3)} color={BLUE} />
          <Stat label={t("labs.asset.frontier.text16", { defaultValue: "b_r (收益预测系数)" })} value={res.bReturn.toFixed(3)} color={GOLD} />
          <Stat label={t("labs.asset.frontier.text17", { defaultValue: "b_d (股利增长系数)" })} value={res.bDividend.toFixed(3)} color={TEAL} />
          <Stat label={t("labs.asset.frontier.text18", { defaultValue: "恒等式 b_r − b_d + ρφ" })} value={res.identity.toFixed(3)} color={Math.abs(res.identityGap) < 0.1 ? TEAL : RED} sub={t("labs.asset.frontier.text19", { defaultValue: "理论值 = 1" })} />
          <Stat label={t("labs.asset.frontier.text20", { defaultValue: "折现率新闻占比" })} value={`${(res.drNewsShare * 100).toFixed(0)}%`} color={RED} />
        </div>
      </div>

      <ChartCard title={t("labs.asset.frontier.text21", { defaultValue: "长期收益预测回归：系数、R² 与 Hodrick t 值" })}
        hint={t("labs.asset.frontier.text22", { defaultValue: "随着期限拉长，β 与 R² 上升——但这主要来自重叠样本的机械叠加。Hodrick (1992) 标准误对重叠做了正确修正，通常让 t 值明显缩水。" })}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={res.horizons.map((h) => ({
            期限: t("labs.asset.frontier.text23", { defaultValue: `${h.h} 期`, value: h.h }),
            β: +h.beta.toFixed(3),
            "R²": +h.r2.toFixed(3),
            "t (Hodrick)": +(h.tHodrick || 0).toFixed(2),
          }))}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="期限" name={t("labs.asset.frontier.text24", { defaultValue: "期限" })} stroke={TEXT} tick={{ fontSize: 11 }} />
            <YAxis stroke={TEXT} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={2} stroke={RED} strokeDasharray="4 4" label={{ value: "t = 2", fill: RED, fontSize: 10 }} />
            <Bar dataKey="β" fill={GOLD} />
            <Bar dataKey="R²" fill={TEAL} />
            <Bar dataKey="t (Hodrick)" fill={BLUE} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title={t("labs.asset.frontier.text25", { defaultValue: "股利价格比与实现收益" })} hint={t("labs.asset.frontier.text26", { defaultValue: "dp 高（价格相对股利便宜）时随后的收益偏高——这正是折现率在时间上变动的直接证据。" })}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke={TEXT} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="l" stroke={GOLD} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="r" orientation="right" stroke={TEAL} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="l" type="monotone" dataKey="dp" stroke={GOLD} dot={false} />
              <Line yAxisId="r" type="monotone" dataKey="ret" stroke={TEAL} dot={false} strokeOpacity={0.5} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title={t("labs.asset.frontier.text27", { defaultValue: "dp 波动的来源分解" })} hint={t("labs.asset.frontier.text28", { defaultValue: "美国数据中折现率新闻解释了绝大部分 dp 变动 ⇒ 股价波动主要不是对未来现金流的重新预期，而是风险溢价本身在变（Shiller 超额波动之谜的现代表述）。" })}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={shares} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis type="number" stroke={TEXT} tick={{ fontSize: 11 }} unit="%" />
              <YAxis type="category" dataKey="name" stroke={TEXT} tick={{ fontSize: 11 }} width={90} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 12 }} />
              <Bar dataKey="value">
                {shares.map((s, i) => <Cell key={i} fill={i === 0 ? RED : TEAL} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Note>
        <p>{t("labs.asset.frontier.text29", { defaultValue: "对数线性化恒等式：dp_t ≈ Σ ρ^j (r_(t+1+j) − Δd_(t+1+j))。价格相对股利便宜，要么未来收益高，要么未来股利差——二者必居其一。" })}</p>
        <p>{t("labs.asset.frontier.text30", { defaultValue: "因此「收益不可预测」与「股利可预测」不能同时成立：Cochrane 的 b_r − b_d + ρφ = 1 就是这条约束的回归版本。" })}</p>
      </Note>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   20. 因子动物园与高维筛选
   ════════════════════════════════════════════════════════════ */

export const FactorZooTool = () => {
  const { t } = useTranslation();
  const ZOO_NAMES = ["MKT", "SMB", "HML", "RMW", "CMA", "UMD", "BAB", "QMJ", "LIQ", t("labs.asset.frontier.text31", { defaultValue: "噪声因子" })];
  const [K, setK] = useState(8);
  const [T, setT] = useState(360);
  const [commonality, setCommonality] = useState(0.55);
  const [ridgeLambda, setRidgeLambda] = useState(0.05);
  const [lassoLambda, setLassoLambda] = useState(0.25);
  const [seed, setSeed] = useState(9);

  const res = useMemo(() => {
    const rng = mulberry32(seed);
    const names = ZOO_NAMES.slice(0, K);
    const factors: number[][] = [];
    const y: number[] = [];
    const trueLoad = names.map((_, k) => (k < 3 ? [0.9, 0.45, 0.3][k] : 0));
    for (let period = 0; period < T; period++) {
      const common = randn(rng);
      const row = names.map(() => commonality * common + Math.sqrt(1 - commonality ** 2) * randn(rng));
      factors.push(row);
      y.push(row.reduce((s, v, k) => s + trueLoad[k] * v, 0) + 0.8 * randn(rng));
    }
    return factorZoo({ factors, names, y, ridgeLambda, lassoLambda });
  }, [K, T, commonality, ridgeLambda, lassoLambda, seed, t]);

  const survivors = res.ols.filter((o) => o.survivesHLZ).length;

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.asset.frontier.text32", { defaultValue: "标准动物园" }), description: t("labs.asset.frontier.text33", { defaultValue: "8 因子 / 高共性" }), apply: () => { setK(8); setCommonality(0.55); } },
        { name: t("labs.asset.frontier.text34", { defaultValue: "近乎正交" }), description: t("labs.asset.frontier.text35", { defaultValue: "共性 0.1" }), apply: () => setCommonality(0.1) },
        { name: t("labs.asset.frontier.text36", { defaultValue: "强共线" }), description: t("labs.asset.frontier.text37", { defaultValue: "共性 0.85" }), apply: () => setCommonality(0.85) },
        { name: t("labs.asset.frontier.text38", { defaultValue: "激进 LASSO" }), description: "λ = 0.5", apply: () => setLassoLambda(0.5) },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label={t("labs.asset.frontier.text39", { defaultValue: "候选因子数 K" })} value={K} min={4} max={10} step={1} onChange={(v) => setK(Math.round(v))} />
          <Slider label={t("labs.asset.frontier.text40", { defaultValue: "样本长度 T (月)" })} value={T} min={120} max={720} step={12} onChange={(v) => setT(Math.round(v))} />
          <Slider label={t("labs.asset.frontier.text41", { defaultValue: "因子共性 (相关强度)" })} value={commonality} min={0} max={0.9} step={0.05} onChange={setCommonality} />
          <Slider label="Ridge λ" value={ridgeLambda} min={0} max={0.5} step={0.01} onChange={setRidgeLambda} />
          <Slider label="LASSO λ" value={lassoLambda} min={0} max={0.8} step={0.01} onChange={setLassoLambda} />
          <Slider label={t("labs.asset.frontier.text42", { defaultValue: "随机种子" })} value={seed} min={1} max={40} step={1} onChange={(v) => setSeed(Math.round(v))} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.asset.frontier.text43", { defaultValue: "有效因子数 (95% 方差)" })} value={String(res.effectiveFactors)} color={GOLD} sub={t("labs.asset.frontier.text44", { defaultValue: `名义 ${K} 个`, value: K })} />
          <Stat label={t("labs.asset.frontier.text45", { defaultValue: "PC1 解释比例" })} value={`${(res.pcaExplained[0].share * 100).toFixed(1)}%`} color={BLUE} />
          <Stat label={t("labs.asset.frontier.text46", { defaultValue: "通过 HLZ 门槛 (|t|>3)" })} value={`${survivors} / ${K}`} color={TEAL} />
          <Stat label={t("labs.asset.frontier.text47", { defaultValue: "Bonferroni 临界值" })} value={res.bonferroniT.toFixed(2)} color={RED} sub={t("labs.asset.frontier.text48", { defaultValue: "α=5% / K 次检验" })} />
          <Stat label={t("labs.asset.frontier.text49", { defaultValue: "LASSO 选中数" })} value={String(res.lasso.filter((l) => l.selected).length)} color={GOLD} />
          <Stat label={t("labs.asset.frontier.text50", { defaultValue: "Ridge 最大系数" })} value={Math.max(...res.ridge.map((r) => Math.abs(r.coef))).toFixed(3)} />
        </div>
      </div>

      <ChartCard title={t("labs.asset.frontier.text51", { defaultValue: "主成分方差分解：名义因子数 ≫ 有效维度" })}
        hint={t("labs.asset.frontier.text52", { defaultValue: "高共性下前 2–3 个主成分就能吃掉大部分方差，说明「几百个因子」在统计上远没有那么多独立信息。" })}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={res.pcaExplained.map((p) => ({ PC: `PC${p.pc}`, 方差占比: +(p.share * 100).toFixed(1), 累计: +(p.cumulative * 100).toFixed(1) }))}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="PC" stroke={TEXT} tick={{ fontSize: 11 }} />
            <YAxis stroke={TEXT} tick={{ fontSize: 11 }} unit="%" />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={95} stroke={RED} strokeDasharray="4 4" label={{ value: "95%", fill: RED, fontSize: 10 }} />
            <Bar dataKey="方差占比" name={t("labs.asset.frontier.text53", { defaultValue: "方差占比" })} fill={GOLD} />
            <Bar dataKey="累计" name={t("labs.asset.frontier.text54", { defaultValue: "累计" })} fill={TEAL} fillOpacity={0.4} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead className="bg-secondary/50 text-muted-foreground">
            <tr>
              <th className="text-left p-2 font-mono">{t("labs.asset.frontier.text55", { defaultValue: "因子" })}</th>
              <th className="p-2 font-mono">{t("labs.asset.frontier.text56", { defaultValue: "OLS 系数" })}</th>
              <th className="p-2 font-mono">{t("labs.asset.frontier.text57", { defaultValue: "t 值" })}</th>
              <th className="p-2 font-mono">|t|&gt;1.96</th>
              <th className="p-2 font-mono">HLZ |t|&gt;3</th>
              <th className="p-2 font-mono">Bonferroni</th>
              <th className="p-2 font-mono">Ridge</th>
              <th className="p-2 font-mono">LASSO</th>
            </tr>
          </thead>
          <tbody>
            {res.ols.map((o, k) => (
              <tr key={o.name} className="border-t border-border">
                <td className="p-2 font-medium text-foreground">{o.name}</td>
                <td className="p-2 text-center font-mono tabular-nums">{o.coef.toFixed(3)}</td>
                <td className="p-2 text-center font-mono tabular-nums" style={{ color: Math.abs(o.period) > 1.96 ? TEAL : TEXT }}>{o.period.toFixed(2)}</td>
                <td className="p-2 text-center">{Math.abs(o.period) > 1.96 ? "✓" : "—"}</td>
                <td className="p-2 text-center" style={{ color: o.survivesHLZ ? TEAL : RED }}>{o.survivesHLZ ? "✓" : "✗"}</td>
                <td className="p-2 text-center" style={{ color: o.survivesBonferroni ? TEAL : RED }}>{o.survivesBonferroni ? "✓" : "✗"}</td>
                <td className="p-2 text-center font-mono tabular-nums">{res.ridge[k].coef.toFixed(3)}</td>
                <td className="p-2 text-center font-mono tabular-nums" style={{ color: res.lasso[k].selected ? GOLD : TEXT }}>
                  {res.lasso[k].coef.toFixed(3)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Note>
        <p>{t("labs.asset.frontier.text58", { defaultValue: "Harvey-Liu-Zhu (2016)：数百篇论文在同一批数据上搜索因子，单次 t&gt;2 的门槛已失效，应提高到 |t| &gt; 3。" })}</p>
        <p>{t("labs.asset.frontier.text59", { defaultValue: "Ridge 处理共线（把相关因子的系数摊薄），LASSO 直接做选择（把噪声因子压到零）。二者都不能替代经济理论——「被选中」不等于「被定价」。" })}</p>
      </Note>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   21. 国际定价与货币风险
   ════════════════════════════════════════════════════════════ */
const DEFAULT_CCY = [
  { name: "JPY", iForeign: 0.1, depreciation: 0.3, fxVol: 9 },
  { name: "CHF", iForeign: 0.6, depreciation: -0.4, fxVol: 8.5 },
  { name: "EUR", iForeign: 2.5, depreciation: 0.4, fxVol: 8 },
  { name: "GBP", iForeign: 4.0, depreciation: 0.7, fxVol: 9.5 },
  { name: "AUD", iForeign: 4.5, depreciation: 0.9, fxVol: 11 },
  { name: "BRL", iForeign: 11.0, depreciation: 3.5, fxVol: 16 },
];

export const CarryTool = () => {
  const { t } = useTranslation();
  const [domestic, setDomestic] = useState(2);
  const [uipStrength, setUipStrength] = useState(0.15);
  const [volScale, setVolScale] = useState(1);

  const res = useMemo(() => {
    const ccys = DEFAULT_CCY.map((c) => ({
      ...c,
      depreciation: uipStrength * (c.iForeign - domestic),
      fxVol: c.fxVol * volScale,
    }));
    return currencyCarry(domestic, ccys);
  }, [domestic, uipStrength, volScale, t]);

  const scatter = res.legs.map((l) => ({
    x: +l.forwardDiscount.toFixed(2),
    y: +(uipStrength * l.forwardDiscount).toFixed(2),
    name: l.name,
    z: 100,
  }));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.asset.frontier.text60", { defaultValue: "历史 Fama 回归" }), description: "β ≈ −0.1 ~ 0.2", apply: () => setUipStrength(0.15) },
        { name: t("labs.asset.frontier.text61", { defaultValue: "UIP 成立" }), description: "β = 1", apply: () => setUipStrength(1) },
        { name: t("labs.asset.frontier.text62", { defaultValue: "UIP 反向" }), description: "β = −0.8", apply: () => setUipStrength(-0.8) },
        { name: t("labs.asset.frontier.text63", { defaultValue: "高汇率波动" }), description: "σ × 1.8", apply: () => setVolScale(1.8) },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label={t("labs.asset.frontier.text64", { defaultValue: "本币短端利率 i (%)" })} value={domestic} min={0} max={6} step={0.25} onChange={setDomestic} />
          <Slider label={t("labs.asset.frontier.text65", { defaultValue: "Fama 斜率 β (贬值对利差的响应)" })} value={uipStrength} min={-1} max={1.5} step={0.05} onChange={setUipStrength} />
          <Slider label={t("labs.asset.frontier.text66", { defaultValue: "汇率波动缩放" })} value={volScale} min={0.5} max={2} step={0.1} onChange={setVolScale} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.asset.frontier.text67", { defaultValue: "Fama 斜率 β̂" })} value={res.uipSlope.toFixed(2)} color={res.uipSlope < 0.5 ? RED : TEAL} sub={t("labs.asset.frontier.text68", { defaultValue: "UIP 要求 β = 1" })} />
          <Stat label={t("labs.asset.frontier.text69", { defaultValue: "Carry 多空收益 (H−L)" })} value={`${res.highMinusLow.toFixed(2)}%`} color={GOLD} />
          <Stat label={t("labs.asset.frontier.text70", { defaultValue: "最高息货币" })} value={res.legs.reduce((a, b) => (b.forwardDiscount > a.forwardDiscount ? b : a)).name} color={BLUE} />
          <Stat label={t("labs.asset.frontier.text71", { defaultValue: "最佳单腿 Sharpe" })} value={Math.max(...res.legs.map((l) => l.sharpe)).toFixed(2)} color={TEAL} />
        </div>
      </div>

      <ChartCard title={t("labs.asset.frontier.text72", { defaultValue: "Fama (1984) 回归：利差 vs 实现贬值" })}
        hint={t("labs.asset.frontier.text73", { defaultValue: "UIP 预测 45° 线（β=1，利差完全被贬值抵消）。数据长期给出 β<1 甚至为负——高息货币不但没贬值，还常升值，Carry 因此系统性赚钱。" })}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ left: 10, bottom: 12 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" name={t("labs.asset.frontier.text74", { defaultValue: "利差 i*−i" })} stroke={TEXT} tick={{ fontSize: 11 }} unit="%" />
            <YAxis type="number" dataKey="y" name={t("labs.asset.frontier.text75", { defaultValue: "实现贬值 Δs" })} stroke={TEXT} tick={{ fontSize: 11 }} unit="%" />
            <ZAxis dataKey="z" range={[80, 80]} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 12 }}
              formatter={(v: number, n: string) => [`${v}%`, n]} />
            <ReferenceLine segment={[{ x: -3, y: -3 }, { x: 10, y: 10 }]} stroke={TEAL} strokeDasharray="4 4"
              label={{ value: "UIP: β = 1", fill: TEAL, fontSize: 10 }} />
            <Scatter data={scatter} fill={GOLD} />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={t("labs.asset.frontier.text76", { defaultValue: "按利差排序的 Carry 收益" })} hint={t("labs.asset.frontier.text77", { defaultValue: "按前向贴水排序建组合：做多高息、做空低息。收益的另一面是崩盘风险——Carry 在全球避险时集中亏损，与坏状态高度相关。" })}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...res.legs].sort((a, b) => a.forwardDiscount - b.forwardDiscount)
            .map((l) => ({ name: l.name, "Carry 收益 (%)": +l.carryReturn.toFixed(2), Sharpe: +l.sharpe.toFixed(2) }))}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke={TEXT} tick={{ fontSize: 11 }} />
            <YAxis stroke={TEXT} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Carry 收益 (%)" name={t("labs.asset.frontier.text79", { defaultValue: "Carry 收益 (%)" })} fill={GOLD} />
            <Bar dataKey="Sharpe" fill={BLUE} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <Note>
        <p>{res.uipVerdict}</p>
        <p>{t("labs.asset.frontier.text80", { defaultValue: "完全市场下 Δs = ln m* − ln m：汇率变动就是两国定价核之差。Carry 溢价因此等价于「两国 SDF 波动率不对称」——高息国的定价核波动更小。" })}</p>
        <p>{t("labs.asset.frontier.text81", { defaultValue: "解释路线：崩盘风险与灾难暴露 (Brunnermeier-Nagel-Pedersen)、全球美元因子 (Lustig-Roussanov-Verdelhan)、以及不完全市场下的国际风险分担缺口。" })}</p>
      </Note>
    </div>
  );
};
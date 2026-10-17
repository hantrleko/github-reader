import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, ReferenceDot, BarChart, Bar, Cell, ScatterChart, Scatter,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { EquationBlock } from "@/components/common/EquationBlock";
import { linearSDF, ccapm, hjFrontier, hjBound } from "@/lib/quant/assetPricing";
import { AssetChrome, CHART } from "./AssetChrome";

const { GOLD, TEAL, RED, BLUE, GRID, TEXT } = CHART;
const { Slider, Stat, Note, ChartCard } = AssetChrome;

/* ════════════════════════════════════════════════════════════
   5. Stochastic Discount Factor — p = E[M X], M = a − b·Rm
   ════════════════════════════════════════════════════════════ */
export const SDFTool = () => {
  const { t } = useTranslation();
  const [rf, setRf] = useState(3);
  const [erm, setErm] = useState(9);
  const [volm, setVolm] = useState(18);
  const [rhoValue, setRhoValue] = useState(0.9);
  const [rhoGrowth, setRhoGrowth] = useState(-0.2);

  const res = useMemo(() => {
    const assets = [
      { name: t("labs.sdf.text1", { defaultValue: "价值股" }), er: 11, vol: 24, rho: rhoValue },
      { name: t("labs.sdf.text2", { defaultValue: "成长股" }), er: 8, vol: 26, rho: 0.75 },
      { name: t("labs.sdf.text3", { defaultValue: "防御股" }), er: 6, vol: 12, rho: 0.4 },
      { name: t("labs.sdf.text4", { defaultValue: "黄金 (对冲)" }), er: 4, vol: 16, rho: rhoGrowth },
    ];
    return linearSDF({ rf, erm, volm, assets });
  }, [rf, erm, volm, rhoValue, rhoGrowth, t]);

  const kernelCurve = useMemo(() => {
    const out: { rm: number; M: number }[] = [];
    for (let rmPct = -30; rmPct <= 40; rmPct += 2) {
      const rm = 1 + rmPct / 100;
      out.push({ rm: rmPct, M: +(res.a - res.b * rm).toFixed(4) });
    }
    return out;
  }, [res, t]);

  const barData = res.assets.map((a) => ({
    name: a.name,
    模型: +a.premiumModel.toFixed(2),
    输入: +a.premiumInput.toFixed(2),
  }));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.sdf.text5", { defaultValue: "教科书" }), description: "Rf=3, ERm=9", apply: () => { setRf(3); setErm(9); setVolm(18); setRhoValue(0.9); setRhoGrowth(-0.2); } },
        { name: t("labs.sdf.text6", { defaultValue: "高风险溢价" }), description: "ERm=13", apply: () => { setErm(13); setVolm(22); } },
        { name: t("labs.sdf.text7", { defaultValue: "低利率环境" }), description: "Rf=0.5", apply: () => { setRf(0.5); setErm(7); } },
        { name: t("labs.sdf.text8", { defaultValue: "强对冲资产" }), description: "ρ=−0.5", apply: () => { setRhoGrowth(-0.5); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.sdf.text9", { defaultValue: "定价核参数" })}</p>
          <Slider label={t("labs.sdf.text10", { defaultValue: "无风险利率 Rf (%)" })} value={rf} min={0} max={8} step={0.25} onChange={setRf} />
          <Slider label={t("labs.sdf.text11", { defaultValue: "市场预期收益 E(Rm) (%)" })} value={erm} min={4} max={16} step={0.5} onChange={setErm} />
          <Slider label={t("labs.sdf.text12", { defaultValue: "市场波动 σm (%)" })} value={volm} min={8} max={30} step={1} onChange={setVolm} />
          <Slider label={t("labs.sdf.text13", { defaultValue: "价值股 ρ(与市场)" })} value={rhoValue} min={-1} max={1} step={0.05} onChange={setRhoValue} />
          <Slider label={t("labs.sdf.text14", { defaultValue: "对冲资产 ρ(与市场)" })} value={rhoGrowth} min={-1} max={1} step={0.05} onChange={setRhoGrowth} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.sdf.text15", { defaultValue: "a (常数项)" })} value={res.a.toFixed(3)} sub="M = a − b·Rm" />
          <Stat label={t("labs.sdf.text16", { defaultValue: "b (风险价格)" })} value={res.b.toFixed(3)} color={BLUE} sub={t("labs.sdf.text17", { defaultValue: "定价核斜率" })} />
          <Stat label="E[M]" value={res.eM.toFixed(4)} color={TEAL} sub="= 1/(1+Rf)" />
          <Stat label="σ(M)" value={res.volM.toFixed(4)} color={GOLD} sub={t("labs.sdf.text18", { defaultValue: "定价核波动" })} />
          <Stat label={t("labs.sdf.text19", { defaultValue: "隐含 Rf" })} value={`${res.rfImplied.toFixed(2)}%`} sub="= 1/E[M] − 1" />
          <Stat label="σ(M)/E[M]" value={(res.volM / res.eM).toFixed(3)} color={RED} sub={t("labs.sdf.text20", { defaultValue: "HJ 下界 = maxSR" })} />
        </div>
      </div>

      <ChartCard title={t("labs.sdf.text21", { defaultValue: "定价核 M 随市场收益变化" })} hint={t("labs.sdf.text22", { defaultValue: "M 在「坏时期」(市场大跌) 取高值——与坏时期正相关的资产 (高 cov(M,R)) 风险低、溢价小；对冲资产 (负 ρ) 反而要求负溢价。" })}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={kernelCurve}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="rm" stroke={TEXT} tick={{ fontSize: 10 }} unit="%" />
            <YAxis stroke={TEXT} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 11 }} />
            <ReferenceLine x={0} stroke={GRID} />
            <Line type="monotone" dataKey="M" name="M(Rm)" stroke={GOLD} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={t("labs.sdf.text23", { defaultValue: "模型隐含溢价 vs 输入溢价 (%)" })} hint={t("labs.sdf.text24", { defaultValue: "beta 表示：E[Ri]−Rf = −(1+Rf)·cov(M,Ri)。模型溢价与输入溢价越接近，说明该线性 SDF 对该资产定价越准确。" })}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke={TEXT} tick={{ fontSize: 10 }} />
            <YAxis stroke={TEXT} tick={{ fontSize: 10 }} unit="%" />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="模型" name={t("labs.sdf.text25", { defaultValue: "模型" })} fill={GOLD} radius={[3, 3, 0, 0]} />
            <Bar dataKey="输入" name={t("labs.sdf.text26", { defaultValue: "输入" })} fill={BLUE} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <Note>
        <p><span className="text-gold">{t("labs.sdf.text27", { defaultValue: "SDF 统一框架 (Cochrane 2005)：" })}</span>{t("labs.sdf.text28", { defaultValue: "一切资产定价模型都可写成 p = E[M·X]，M 为随机折现因子/定价核。" })}</p>
        <p><span className="text-gold">{t("labs.sdf.text29", { defaultValue: "beta 表示：" })}</span>{t("labs.sdf.text30", { defaultValue: "E[Ri]−Rf = −Rf·cov(M,Ri) = −(1+Rf)·cov(M,Ri)。与「坏时期」(M 高) 正相关的资产风险低。" })}</p>
        <p><span className="text-gold">{t("labs.sdf.text31", { defaultValue: "特例：" })}</span>{t("labs.sdf.text32", { defaultValue: "M = a − b·Rm ⟹ CAPM；M = δ(C′/C)^(−γ) ⟹ CCAPM。二者只是 M 的不同设定。" })}</p>
      </Note>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   6. Consumption CAPM + Equity Premium Puzzle
   ════════════════════════════════════════════════════════════ */
export const CCAPMTool = () => {
  const { t } = useTranslation();
  const [delta, setDelta] = useState(0.98);
  const [gamma, setGamma] = useState(2);
  const [muC, setMuC] = useState(2);
  const [sigmaC, setSigmaC] = useState(3.6);
  const [sigmaM, setSigmaM] = useState(20);
  const [rho, setRho] = useState(0.2);
  const targetERP = 6;

  const res = useMemo(
    () => ccapm({ delta, gamma, muC, sigmaC, sigmaM, rho, targetERP }),
    [delta, gamma, muC, sigmaC, sigmaM, rho],
  );

  const sweep = useMemo(() => {
    const out: { gamma: number; premium: number }[] = [];
    for (let g = 0; g <= 80; g += 2) {
      const r = ccapm({ delta, gamma: g, muC, sigmaC, sigmaM, rho, targetERP });
      out.push({ gamma: g, premium: +r.equityPremium.toFixed(3) });
    }
    return out;
  }, [delta, muC, sigmaC, sigmaM, rho, t]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.sdf.text33", { defaultValue: "标准校准" }), description: "γ=2", apply: () => { setDelta(0.98); setGamma(2); setMuC(2); setSigmaC(3.6); setSigmaM(20); setRho(0.2); } },
        { name: t("labs.sdf.text34", { defaultValue: "谜题 (γ 需≈50)" }), description: t("labs.sdf.text35", { defaultValue: "看 gap" }), apply: () => { setGamma(2); setSigmaC(3.6); setRho(0.2); } },
        { name: t("labs.sdf.text36", { defaultValue: "高 γ 尝试" }), description: "γ=40", apply: () => { setGamma(40); } },
        { name: t("labs.sdf.text37", { defaultValue: "高消费波动" }), description: "σc=6", apply: () => { setSigmaC(6); setRho(0.4); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.sdf.text38", { defaultValue: "偏好与消费参数" })}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.sdf.text39", { defaultValue: "δ 主观折现" })} value={delta} min={0.9} max={1} step={0.005} onChange={setDelta} />
            <Slider label={t("labs.sdf.text40", { defaultValue: "γ 风险厌恶" })} value={gamma} min={0.5} max={80} step={0.5} onChange={setGamma} />
            <Slider label={t("labs.sdf.text41", { defaultValue: "μc 消费增长" })} sub="%" value={muC} min={0} max={4} step={0.1} onChange={setMuC} />
            <Slider label={t("labs.sdf.text42", { defaultValue: "σc 消费波动" })} sub="%" value={sigmaC} min={1} max={8} step={0.1} onChange={setSigmaC} />
            <Slider label={t("labs.sdf.text43", { defaultValue: "σm 市场波动" })} sub="%" value={sigmaM} min={10} max={30} step={1} onChange={setSigmaM} />
            <Slider label={t("labs.sdf.text44", { defaultValue: "ρ(消费,市场)" })} value={rho} min={0} max={1} step={0.05} onChange={setRho} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.sdf.text45", { defaultValue: "模型无风险利率" })} value={`${res.rf.toFixed(2)}%`} sub="−lnδ+γμc−½γ²σc²" />
          <Stat label={t("labs.sdf.text46", { defaultValue: "模型股权溢价" })} value={`${res.equityPremium.toFixed(2)}%`} color={res.equityPremium >= targetERP ? TEAL : RED} sub={t("labs.sdf.text47", { defaultValue: `目标 ${targetERP}%`, value: targetERP })} />
          <Stat label="σ(M)/E(M)" value={res.volM.toFixed(3)} color={GOLD} sub="≈ γσc" />
          <Stat label={t("labs.sdf.text48", { defaultValue: "匹配 6% 所需 γ" })} value={isFinite(res.gammaToMatch) ? res.gammaToMatch.toFixed(0) : "∞"} color={res.gammaToMatch > 10 ? RED : TEAL} sub={t("labs.sdf.text49", { defaultValue: "实证 γ≈2−4" })} />
          <Stat label={t("labs.sdf.text50", { defaultValue: "溢价缺口" })} value={`${(targetERP - res.equityPremium).toFixed(2)}%`} color={RED} sub={t("labs.sdf.text51", { defaultValue: "谜题大小" })} />
          <Stat label={t("labs.sdf.text52", { defaultValue: "结论" })} value={res.gammaToMatch > 10 ? t("labs.sdf.text53", { defaultValue: "谜题存在" }) : t("labs.sdf.text54", { defaultValue: "可解释" })} color={res.gammaToMatch > 10 ? RED : TEAL} />
        </div>
      </div>

      <ChartCard title={t("labs.sdf.text55", { defaultValue: "股权溢价随风险厌恶 γ 变化" })} hint={t("labs.sdf.text56", { defaultValue: "标准消费模型在合理 γ (2–4) 下只能产生极小的溢价；要匹配历史 6% 需要 γ≈50——这就是 Mehra-Prescott (1985) 的股权溢价之谜。" })}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sweep}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="gamma" stroke={TEXT} tick={{ fontSize: 10 }} label={{ value: "γ", position: "insideBottom", offset: -2, fill: TEXT, fontSize: 11 }} />
            <YAxis stroke={TEXT} tick={{ fontSize: 10 }} unit="%" />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 11 }} />
            <ReferenceLine y={targetERP} stroke={RED} strokeDasharray="4 3" label={{ value: t("labs.sdf.text57", { defaultValue: "历史 6%" }), fill: RED, fontSize: 10 }} />
            <ReferenceLine x={gamma} stroke={BLUE} strokeDasharray="2 2" label={{ value: t("labs.sdf.text58", { defaultValue: "当前 γ" }), fill: BLUE, fontSize: 10 }} />
            <Line type="monotone" dataKey="premium" name={t("labs.sdf.text59", { defaultValue: "模型溢价" })} stroke={GOLD} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <Note>
        <p><span className="text-gold">CCAPM (Breeden 1979, Lucas 1978)：</span>{t("labs.sdf.text60", { defaultValue: "风险溢价 = 收益与消费增长协方差 × 风险厌恶；M = δ(C′/C)^(−γ)。" })}</p>
        <p><span className="text-gold">{t("labs.sdf.text61", { defaultValue: "股权溢价之谜 (Mehra-Prescott 1985)：" })}</span>{t("labs.sdf.text62", { defaultValue: "消费太平滑 (σc≈3.6%)，标准 γ 无法解释 6% 的历史溢价。" })}</p>
        <p><span className="text-gold">{t("labs.sdf.text63", { defaultValue: "无风险利率之谜：" })}</span>{t("labs.sdf.text64", { defaultValue: "为匹配溢价而调高 γ，又会推高模型无风险利率，与现实 (~1%) 矛盾。" })}</p>
      </Note>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   7. Hansen-Jagannathan bound
   ════════════════════════════════════════════════════════════ */
export const HJBoundTool = () => {
  const { t } = useTranslation();
  const [rf, setRf] = useState(3);
  const [maxSharpe, setMaxSharpe] = useState(0.45);
  const [gamma, setGamma] = useState(2);
  const [sigmaC, setSigmaC] = useState(3.6);

  const res = useMemo(() => {
    const frontier = hjFrontier(rf, Math.max(maxSharpe * 1.4, 0.6), 30);
    const requiredVolM = hjBound(maxSharpe, rf); // min σ(M) to support observed max Sharpe
    const ccapmVolM = (gamma * sigmaC) / 100 * (1 / (1 + rf / 100)); // σ(M)≈γσc, scaled to σ(M) not ratio
    const ratioBound = maxSharpe; // σ(M)/E(M) ≥ Sharpe
    const ccapmRatio = (gamma * sigmaC) / 100;
    const satisfied = ccapmRatio >= ratioBound;
    return { frontier, requiredVolM, ccapmVolM, ccapmRatio, ratioBound, satisfied };
  }, [rf, maxSharpe, gamma, sigmaC, t]);

  const eM = 1 / (1 + rf / 100);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.sdf.text65", { defaultValue: "美股历史" }), description: "SR≈0.45", apply: () => { setRf(3); setMaxSharpe(0.45); setGamma(2); setSigmaC(3.6); } },
        { name: t("labs.sdf.text66", { defaultValue: "高 Sharpe" }), description: "SR=0.8", apply: () => { setMaxSharpe(0.8); } },
        { name: t("labs.sdf.text67", { defaultValue: "高 γ 通过边界" }), description: "γ=15", apply: () => { setGamma(15); } },
        { name: t("labs.sdf.text68", { defaultValue: "低消费波动" }), description: "σc=2", apply: () => { setSigmaC(2); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.sdf.text69", { defaultValue: "市场与定价核参数" })}</p>
          <Slider label={t("labs.sdf.text70", { defaultValue: "无风险利率 Rf (%)" })} value={rf} min={0} max={8} step={0.25} onChange={setRf} />
          <Slider label={t("labs.sdf.text71", { defaultValue: "观测最大 Sharpe" })} value={maxSharpe} min={0.1} max={1.2} step={0.05} onChange={setMaxSharpe} />
          <Slider label={t("labs.sdf.text72", { defaultValue: "γ 风险厌恶 (CCAPM)" })} value={gamma} min={0.5} max={40} step={0.5} onChange={setGamma} />
          <Slider label={t("labs.sdf.text73", { defaultValue: "σc 消费波动 (%)" })} value={sigmaC} min={1} max={8} step={0.1} onChange={setSigmaC} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.sdf.text74", { defaultValue: "HJ 下界 σ(M)/E(M)" })} value={res.ratioBound.toFixed(3)} sub={t("labs.sdf.text75", { defaultValue: "= 最大 Sharpe" })} />
          <Stat label={t("labs.sdf.text76", { defaultValue: "所需最小 σ(M)" })} value={res.requiredVolM.toFixed(4)} color={GOLD} sub={`E[M]=${eM.toFixed(3)}`} />
          <Stat label="CCAPM σ(M)/E(M)" value={res.ccapmRatio.toFixed(3)} color={res.satisfied ? TEAL : RED} sub="≈ γσc" />
          <Stat label={t("labs.sdf.text77", { defaultValue: "是否满足边界" })} value={res.satisfied ? t("labs.sdf.text78", { defaultValue: "满足 ✓" }) : t("labs.sdf.text79", { defaultValue: "违反 ✗" })} color={res.satisfied ? TEAL : RED} />
        </div>
      </div>

      <ChartCard title={t("labs.sdf.text80", { defaultValue: "Hansen-Jagannathan 可行区域" })} hint={t("labs.sdf.text81", { defaultValue: "金线为 HJ 下界 σ(M) = Sharpe·E(M)。任何合法定价核必须落在金线上方 (阴影区)。红点为 CCAPM 校准的 σ(M)：落在下方即违反边界，说明消费波动不足以解释高 Sharpe。" })}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={res.frontier}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="sharpe" type="number" stroke={TEXT} tick={{ fontSize: 10 }} label={{ value: t("labs.sdf.text82", { defaultValue: "最大 Sharpe" }), position: "insideBottom", offset: -2, fill: TEXT, fontSize: 11 }} />
            <YAxis stroke={TEXT} tick={{ fontSize: 10 }} label={{ value: "σ(M)", angle: -90, position: "insideLeft", fill: TEXT, fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 11 }} />
            <Line type="monotone" dataKey="minVolM" name={t("labs.sdf.text83", { defaultValue: "HJ 下界" })} stroke={GOLD} strokeWidth={2} dot={false} />
            <ReferenceLine x={maxSharpe} stroke={BLUE} strokeDasharray="2 2" label={{ value: t("labs.sdf.text84", { defaultValue: "观测 SR" }), fill: BLUE, fontSize: 10 }} />
            <ReferenceDot x={maxSharpe} y={res.ccapmVolM} r={5} fill={res.satisfied ? TEAL : RED} stroke="#fff" strokeWidth={1} label={{ value: "CCAPM σ(M)", fill: res.satisfied ? TEAL : RED, fontSize: 10, position: "top" }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <Note>
        <p><span className="text-gold">{t("labs.sdf.text85", { defaultValue: "HJ 边界 (Hansen-Jagannathan 1991)：" })}</span>{t("labs.sdf.text86", { defaultValue: "σ(M)/E(M) ≥ |E(Rᵉ)|/σ(Rᵉ) = 最大 Sharpe 比率。" })}</p>
        <p><span className="text-gold">{t("labs.sdf.text87", { defaultValue: "诊断意义：" })}</span>{t("labs.sdf.text88", { defaultValue: "任何合法定价核的波动率必须足够大以匹配观测到的 Sharpe——给模型 M 设定了下界。" })}</p>
        <p><span className="text-gold">{t("labs.sdf.text89", { defaultValue: "股权溢价之谜等价表述：" })}</span>{t("labs.sdf.text90", { defaultValue: "标准消费 SDF 的 σ(M)≈γσc 太小，无法达到边界，除非 γ 极大。" })}</p>
      </Note>
    </div>
  );
};
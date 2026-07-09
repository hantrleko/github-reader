import { useMemo, useState } from "react";
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ComposedChart, Scatter,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { AssetChrome, CHART } from "./AssetChrome";

const { GOLD, TEAL, RED, BLUE, GRID, TEXT } = CHART;
const { Slider, Stat, Note, ChartCard } = AssetChrome;

/* ════════════════════════════════════════════════════════════
   8. Zero-Beta (Black) CAPM — no risk-free asset
   E(Ri) = E(Rz) + βi·[E(Rm) − E(Rz)]
   ════════════════════════════════════════════════════════════ */
export const ZeroBetaTool = () => {
  const [rf, setRf] = useState(3);
  const [rz, setRz] = useState(5);
  const [erm, setErm] = useState(9);
  const [beta, setBeta] = useState(1.2);

  const r = useMemo(() => {
    const stdReq = rf + beta * (erm - rf); // standard CAPM
    const zbReq = rz + beta * (erm - rz); // zero-beta CAPM
    return { stdReq, zbReq, gap: zbReq - stdReq };
  }, [rf, rz, erm, beta]);

  const lines = useMemo(() => {
    const out: { beta: number; std: number; zb: number }[] = [];
    for (let b = 0; b <= 2.5; b += 0.1) {
      out.push({
        beta: +b.toFixed(2),
        std: +(rf + b * (erm - rf)).toFixed(2),
        zb: +(rz + b * (erm - rz)).toFixed(2),
      });
    }
    return out;
  }, [rf, rz, erm]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "教科书", description: "Rz=5", apply: () => { setRf(3); setRz(5); setErm(9); setBeta(1.2); } },
        { name: "更平坦 SML", description: "Rz=6.5", apply: () => { setRz(6.5); setErm(9); } },
        { name: "无摩擦极限", description: "Rz→Rf", apply: () => { setRz(3.2); } },
        { name: "高 β 资产", description: "β=1.8", apply: () => { setBeta(1.8); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label="无风险利率 Rf (%)" value={rf} min={0} max={6} step={0.25} onChange={setRf} />
          <Slider label="零 β 组合收益 E(Rz) (%)" sub="替代 Rf" value={rz} min={0} max={9} step={0.25} onChange={setRz} />
          <Slider label="市场预期收益 E(Rm) (%)" value={erm} min={5} max={16} step={0.5} onChange={setErm} />
          <Slider label="资产 β" value={beta} min={0} max={2.5} step={0.05} onChange={setBeta} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="标准 CAPM 要求收益" value={`${r.stdReq.toFixed(2)}%`} color={BLUE} sub="Rf + β(ERm−Rf)" />
          <Stat label="零β CAPM 要求收益" value={`${r.zbReq.toFixed(2)}%`} color={GOLD} sub="Rz + β(ERm−Rz)" />
          <Stat label="低β端差异" value={`+${(rz - rf).toFixed(2)}%`} color={TEAL} sub="截距抬高" />
          <Stat label="SML 斜率变化" value={`${(erm - rz - (erm - rf)).toFixed(2)}%`} color={RED} sub="更平坦" />
        </div>
      </div>

      <ChartCard title="标准 SML vs 零β SML" hint="Black (1972)：无风险借贷不可得时，用零β组合收益 E(Rz) 替代 Rf。因 E(Rz)>Rf，SML 截距抬高、斜率变平——正好解释实证中「低β收益偏高、高β偏低」的平坦 SML 现象。">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={lines}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="beta" stroke={TEXT} tick={{ fontSize: 10 }} label={{ value: "β", position: "insideBottom", offset: -2, fill: TEXT, fontSize: 11 }} />
            <YAxis stroke={TEXT} tick={{ fontSize: 10 }} unit="%" />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="std" name="标准 SML" stroke={BLUE} strokeWidth={1.8} dot={false} />
            <Line type="monotone" dataKey="zb" name="零β SML" stroke={GOLD} strokeWidth={2} dot={false} />
            <Scatter data={[{ beta, std: r.stdReq, zb: r.zbReq }]} dataKey="zb" fill={RED} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <Note>
        <p><span className="text-gold">零β CAPM (Black 1972)：</span>放松「存在无风险资产」假设。零β组合是与市场组合协方差为零的最小方差组合。</p>
        <p><span className="text-gold">E(Ri) = E(Rz) + βi·[E(Rm)−E(Rz)]：</span>Rf 被 E(Rz) 替代，通常 E(Rz)&gt;Rf。</p>
        <p><span className="text-gold">实证意义：</span>解释了 Black-Jensen-Scholes (1972) 发现的「SML 比理论更平坦」。</p>
      </Note>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   9. Intertemporal CAPM (Merton 1973) — two-factor pricing
   E(Ri)−Rf = βim·λm + βih·λh   (h = state-variable / hedge factor)
   ════════════════════════════════════════════════════════════ */
export const ICAPMTool = () => {
  const [rf, setRf] = useState(3);
  const [lambdaM, setLambdaM] = useState(6);
  const [lambdaH, setLambdaH] = useState(2.5);
  const [betaM, setBetaM] = useState(1.1);
  const [betaH, setBetaH] = useState(0.6);

  const r = useMemo(() => {
    const capmReq = rf + betaM * lambdaM;
    const icapmReq = rf + betaM * lambdaM + betaH * lambdaH;
    const hedgeContribution = betaH * lambdaH;
    return { capmReq, icapmReq, hedgeContribution };
  }, [rf, lambdaM, lambdaH, betaM, betaH]);

  const decomp = useMemo(() => ([
    { name: "Rf", value: +rf.toFixed(2), fill: TEAL },
    { name: "市场因子 βm·λm", value: +(betaM * lambdaM).toFixed(2), fill: BLUE },
    { name: "对冲因子 βh·λh", value: +(betaH * lambdaH).toFixed(2), fill: GOLD },
  ]), [rf, lambdaM, lambdaH, betaM, betaH]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "教科书", description: "两因子", apply: () => { setRf(3); setLambdaM(6); setLambdaH(2.5); setBetaM(1.1); setBetaH(0.6); } },
        { name: "退化为 CAPM", description: "λh=0", apply: () => { setLambdaH(0); } },
        { name: "强状态变量", description: "λh=5", apply: () => { setLambdaH(5); setBetaH(0.9); } },
        { name: "负对冲暴露", description: "βh=−0.5", apply: () => { setBetaH(-0.5); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">因子溢价与暴露</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="Rf (%)" value={rf} min={0} max={6} step={0.25} onChange={setRf} />
            <Slider label="市场溢价 λm (%)" value={lambdaM} min={2} max={10} step={0.5} onChange={setLambdaM} />
            <Slider label="状态变量溢价 λh (%)" value={lambdaH} min={-2} max={6} step={0.25} onChange={setLambdaH} />
            <Slider label="市场暴露 βm" value={betaM} min={0} max={2} step={0.05} onChange={setBetaM} />
            <Slider label="对冲暴露 βh" value={betaH} min={-1} max={1.5} step={0.05} onChange={setBetaH} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="CAPM 要求收益" value={`${r.capmReq.toFixed(2)}%`} color={BLUE} sub="仅市场因子" />
          <Stat label="ICAPM 要求收益" value={`${r.icapmReq.toFixed(2)}%`} color={GOLD} sub="+ 对冲因子" />
          <Stat label="对冲需求贡献" value={`${r.hedgeContribution >= 0 ? "+" : ""}${r.hedgeContribution.toFixed(2)}%`} color={r.hedgeContribution >= 0 ? TEAL : RED} sub="βh·λh" />
          <Stat label="占总溢价比" value={`${((r.hedgeContribution / (r.icapmReq - rf || 1)) * 100).toFixed(0)}%`} color={GOLD} sub="状态风险权重" />
        </div>
      </div>

      <p className="text-xs font-mono text-gold uppercase tracking-wider">要求收益分解 (Merton 1973 · 多期对冲需求)</p>
      <div className="grid grid-cols-3 gap-3">
        {decomp.map((d) => (
          <div key={d.name} className="rounded-lg border border-border bg-secondary/30 p-4 text-center">
            <div className="h-2 rounded-full mb-3" style={{ background: d.fill }} />
            <p className="text-[11px] font-mono text-muted-foreground mb-1">{d.name}</p>
            <p className="text-xl font-mono tabular-nums" style={{ color: d.fill }}>{d.value}%</p>
          </div>
        ))}
      </div>

      <Note>
        <p><span className="text-gold">ICAPM (Merton 1973)：</span>E(Ri)−Rf = βim·λm + Σ βih·λh，额外因子来自对冲投资机会集变化。</p>
        <p><span className="text-gold">对冲需求：</span>与坏投资环境 (机会集恶化) 正相关的资产提供对冲价值，可要求更低/更高溢价。</p>
        <p><span className="text-gold">桥梁作用：</span>当 λh=0 退化为 CAPM；λh≠0 为多因子模型 (FF3/FF5、q 因子) 提供理论解释。</p>
      </Note>
    </div>
  );
};
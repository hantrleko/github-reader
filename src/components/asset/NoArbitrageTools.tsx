import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { AssetChrome, CHART, mulberry32, randn } from "./AssetChrome";
import {
  statePrices, sdfFromFactorPremia, evaluateFactorModel,
} from "@/lib/quant/assetPricingAdvanced";

const { GOLD, TEAL, RED, BLUE, GRID, TEXT } = CHART;
const { Slider, Stat, Note, ChartCard } = AssetChrome;

const numCls =
  "w-full bg-secondary/60 border border-border rounded px-2 py-1 text-xs font-mono tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-gold";

/* ════════════════════════════════════════════════════════════
   12. State prices, risk-neutral measure & completeness
   ════════════════════════════════════════════════════════════ */
export const StatePriceTool = () => {
  const [nStates, setNStates] = useState(3);
  const [payoff, setPayoff] = useState<number[][]>([
    [1, 1, 1],
    [3, 2, 0.5],
    [0, 1.5, 2.5],
  ]);
  const [price, setPrice] = useState<number[]>([0.96, 1.6, 1.2]);
  const [prob, setProb] = useState<number[]>([0.3, 0.45, 0.25]);
  const [target, setTarget] = useState<number[]>([1, 0, 0]);
  const [nAssets, setNAssets] = useState(3);

  const res = useMemo(() => {
    const P = payoff.slice(0, nAssets).map((r) => r.slice(0, nStates));
    const pr = prob.slice(0, nStates);
    const total = pr.reduce((a, b) => a + b, 0) || 1;
    return statePrices({
      payoff: P,
      price: price.slice(0, nAssets),
      prob: pr.map((v) => v / total),
      target: target.slice(0, nStates),
    });
  }, [payoff, price, prob, target, nAssets, nStates]);

  const setCell = (i: number, j: number, v: number) =>
    setPayoff((p) => p.map((row, ri) => (ri === i ? row.map((c, ci) => (ci === j ? v : c)) : row)));

  const chartData = res.q
    ? res.q.map((q, s) => ({
        state: `s${s + 1}`,
        状态价格: +q.toFixed(4),
        物理概率: +(prob[s] / (prob.slice(0, nStates).reduce((a, b) => a + b, 0) || 1)).toFixed(4),
        风险中性概率: +(res.qRiskNeutral?.[s] ?? 0).toFixed(4),
        SDF: +(res.m?.[s] ?? 0).toFixed(4),
      }))
    : [];

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "完备市场", description: "3 资产 × 3 状态", apply: () => { setNAssets(3); setNStates(3); setPayoff([[1,1,1],[3,2,0.5],[0,1.5,2.5]]); setPrice([0.96,1.6,1.2]); } },
        { name: "不完备市场", description: "2 资产 × 3 状态", apply: () => { setNAssets(2); setNStates(3); setPrice([0.96,1.6,1.2]); } },
        { name: "存在套利", description: "被支配资产更便宜", apply: () => { setNAssets(2); setNStates(2); setPayoff([[1,1,1],[2,2,2],[0,1.5,2.5]]); setPrice([1.0,1.0,1.2]); } },
        { name: "Arrow 证券", description: "目标 = 状态 1 索取权", apply: () => setTarget([1,0,0]) },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label="资产数 N" value={nAssets} min={1} max={3} step={1} onChange={(v) => setNAssets(Math.round(v))} />
          <Slider label="状态数 S" value={nStates} min={2} max={3} step={1} onChange={(v) => setNStates(Math.round(v))} />
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left py-1">资产 / 支付</th>
                  {Array.from({ length: nStates }, (_, s) => <th key={s} className="px-1">s{s + 1}</th>)}
                  <th className="px-1 text-gold">价格</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: nAssets }, (_, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-2 text-secondary-foreground">{i === 0 ? "债券" : `资产 ${i + 1}`}</td>
                    {Array.from({ length: nStates }, (_, j) => (
                      <td key={j} className="px-1">
                        <input type="number" step="0.1" className={numCls} value={payoff[i][j]}
                          onChange={(e) => setCell(i, j, +e.target.value)} />
                      </td>
                    ))}
                    <td className="px-1">
                      <input type="number" step="0.01" className={numCls} value={price[i]}
                        onChange={(e) => setPrice((p) => p.map((v, k) => (k === i ? +e.target.value : v)))} />
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="py-1 pr-2 text-secondary-foreground">物理概率 π</td>
                  {Array.from({ length: nStates }, (_, j) => (
                    <td key={j} className="px-1">
                      <input type="number" step="0.05" className={numCls} value={prob[j]}
                        onChange={(e) => setProb((p) => p.map((v, k) => (k === j ? +e.target.value : v)))} />
                    </td>
                  ))}
                  <td />
                </tr>
                <tr>
                  <td className="py-1 pr-2 text-secondary-foreground">待定价支付 X</td>
                  {Array.from({ length: nStates }, (_, j) => (
                    <td key={j} className="px-1">
                      <input type="number" step="0.5" className={numCls} value={target[j]}
                        onChange={(e) => setTarget((p) => p.map((v, k) => (k === j ? +e.target.value : v)))} />
                    </td>
                  ))}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="无套利" value={res.arbitrageFree ? "是" : "否 (存在套利)"} color={res.arbitrageFree ? TEAL : RED} />
          <Stat label="市场完备" value={res.complete ? "完备" : "不完备"} color={res.complete ? TEAL : GOLD} />
          <Stat label="隐含无风险毛收益 1/Σq" value={res.rfGross ? res.rfGross.toFixed(4) : "—"} sub={res.rfGross ? `Rf = ${((res.rfGross - 1) * 100).toFixed(2)}%` : ""} />
          <Stat label="状态价格顶点数" value={String(res.vertices.length)} color={BLUE} sub="不完备时 >1" />
          <Stat label="X 价格下界" value={res.targetBounds ? res.targetBounds.lower.toFixed(4) : "—"} color={BLUE} />
          <Stat label="X 价格上界" value={res.targetBounds ? res.targetBounds.upper.toFixed(4) : "—"} color={GOLD} />
        </div>
      </div>

      {res.q && (
        <ChartCard title="状态价格 q、物理概率 π、风险中性概率 Q 与 SDF m = q/π"
          hint="风险中性测度只是把「坏状态更贵」这一信息塞进概率里：Q 相对 π 在坏状态被放大，比值正是 (1+Rf)·m。">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis dataKey="state" stroke={TEXT} tick={{ fontSize: 11 }} />
              <YAxis stroke={TEXT} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="状态价格" fill={GOLD} />
              <Bar dataKey="物理概率" fill={TEAL} />
              <Bar dataKey="风险中性概率" fill={BLUE} />
              <Bar dataKey="SDF" fill={RED} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <Note>
        <p>{res.note}</p>
        <p>P = Σ q·X = E[m·X]，其中 m = q/π。无套利 ⇔ 存在严格为正的状态价格向量；完备 ⇔ 支付矩阵满秩（rank = S）。</p>
        <p>不完备时任何落在 [下界, 上界] 内的价格都不产生套利；要选出唯一价格必须再加均衡、偏好或摩擦结构。</p>
      </Note>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   13. SDF ⇄ 线性因子模型的等价
   ════════════════════════════════════════════════════════════ */
export const SdfFactorDualityTool = () => {
  const [rf, setRf] = useState(3);
  const [lamMkt, setLamMkt] = useState(6);
  const [lamSmb, setLamSmb] = useState(2.5);
  const [volMkt, setVolMkt] = useState(18);
  const [volSmb, setVolSmb] = useState(11);
  const [corr, setCorr] = useState(0.15);
  const [betaMkt, setBetaMkt] = useState(1.1);
  const [betaSmb, setBetaSmb] = useState(0.6);

  const res = useMemo(() => {
    const sm = (volMkt / 100) * (volSmb / 100) * corr;
    const Sigma = [
      [(volMkt / 100) ** 2, sm],
      [sm, (volSmb / 100) ** 2],
    ];
    const r = sdfFromFactorPremia([lamMkt / 100, lamSmb / 100], Sigma, rf / 100);
    const betaPremium = (betaMkt * lamMkt + betaSmb * lamSmb) / 100;
    // same premium recovered through the SDF covariance representation
    const covWithFactors = [
      betaMkt * Sigma[0][0] + betaSmb * Sigma[1][0],
      betaMkt * Sigma[0][1] + betaSmb * Sigma[1][1],
    ];
    const covM = -(r.b[0] * covWithFactors[0] + r.b[1] * covWithFactors[1]) * r.eM;
    const sdfPremium = -covM / r.eM;
    return { ...r, Sigma, betaPremium, sdfPremium, covM };
  }, [rf, lamMkt, lamSmb, volMkt, volSmb, corr, betaMkt, betaSmb]);

  const data = [
    { name: "β 表示 E(Rᵉ)=β'λ", 溢价: +(res.betaPremium * 100).toFixed(3) },
    { name: "SDF 表示 −cov(m,R)/E(m)", 溢价: +(res.sdfPremium * 100).toFixed(3) },
  ];

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "FF2 因子", description: "MKT 6% / SMB 2.5%", apply: () => { setLamMkt(6); setLamSmb(2.5); setVolMkt(18); setVolSmb(11); setCorr(0.15); } },
        { name: "单因子 CAPM", description: "SMB 溢价 = 0", apply: () => { setLamSmb(0); setBetaSmb(0); } },
        { name: "高相关因子", description: "ρ = 0.7", apply: () => setCorr(0.7) },
        { name: "小盘成长股", description: "βmkt 1.4 / βsmb 1.2", apply: () => { setBetaMkt(1.4); setBetaSmb(1.2); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">因子矩</p>
          <Slider label="无风险利率 Rf (%)" value={rf} min={0} max={8} step={0.25} onChange={setRf} />
          <Slider label="MKT 溢价 λ₁ (%)" value={lamMkt} min={0} max={12} step={0.25} onChange={setLamMkt} />
          <Slider label="SMB 溢价 λ₂ (%)" value={lamSmb} min={-3} max={8} step={0.25} onChange={setLamSmb} />
          <Slider label="σ(MKT) (%)" value={volMkt} min={8} max={30} step={0.5} onChange={setVolMkt} />
          <Slider label="σ(SMB) (%)" value={volSmb} min={4} max={25} step={0.5} onChange={setVolSmb} />
          <Slider label="因子相关系数 ρ" value={corr} min={-0.9} max={0.9} step={0.05} onChange={setCorr} />
          <p className="text-xs font-mono text-gold uppercase tracking-wider pt-2">测试资产载荷</p>
          <Slider label="β_MKT" value={betaMkt} min={0} max={2} step={0.05} onChange={setBetaMkt} />
          <Slider label="β_SMB" value={betaSmb} min={-1} max={2} step={0.05} onChange={setBetaSmb} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="E[m]" value={res.eM.toFixed(4)} color={TEAL} sub="= 1/(1+Rf)" />
          <Stat label="b₁ (MKT)" value={res.b[0].toFixed(3)} color={BLUE} />
          <Stat label="b₂ (SMB)" value={res.b[1].toFixed(3)} color={BLUE} />
          <Stat label="σ(m)" value={res.volM.toFixed(4)} color={GOLD} />
          <Stat label="最大 Sharpe = σ(m)/E(m)" value={res.maxSharpe.toFixed(3)} color={RED} sub="HJ 下界的另一面" />
          <Stat label="cov(m, Rᵉ)" value={res.covM.toFixed(5)} sub="负协方差 ⇒ 正溢价" />
        </div>
      </div>

      <ChartCard title="同一个溢价的两种写法" hint="b = Σ⁻¹λ/E(m)：把因子溢价投影成定价核载荷。β 表示与 SDF 协方差表示在数值上完全一致——线性因子模型只是 SDF 在因子空间上的投影。">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 60 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis type="number" stroke={TEXT} tick={{ fontSize: 11 }} unit="%" />
            <YAxis type="category" dataKey="name" stroke={TEXT} tick={{ fontSize: 10 }} width={200} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 12 }} />
            <Bar dataKey="溢价" fill={GOLD} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <Note>
        <p>m = E[m] − b'(f − E f)，其中 b = Σ_f⁻¹ λ / E[m]。</p>
        <p>因此「找因子」和「找定价核」是同一件事：APT / Fama-French 的多因子回归，本质是把 m 限制在因子张成的线性空间里。</p>
      </Note>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   14. HJ 距离与定价误差评价
   ════════════════════════════════════════════════════════════ */
export const HJDistanceTool = () => {
  const [T, setT] = useState(360);
  const [alphaSize, setAlphaSize] = useState(0.15);
  const [valueLoad, setValueLoad] = useState(0.5);
  const [seed, setSeed] = useState(7);

  const models = useMemo(() => {
    const rng = mulberry32(seed);
    const N = 6;
    const mkt: number[] = [];
    const hml: number[] = [];
    const rmw: number[] = [];
    const excess: number[][] = [];
    const betaM = [0.8, 0.95, 1.0, 1.1, 1.2, 1.35];
    const betaH = [-0.4, -0.1, 0.1, 0.3, 0.6, 0.9];
    const betaR = [0.2, 0.1, 0.0, -0.1, -0.2, -0.3];
    for (let t = 0; t < T; t++) {
      const m = 0.5 + 4.2 * randn(rng);
      const h = 0.25 + 2.8 * randn(rng);
      const r = 0.2 + 2.2 * randn(rng);
      mkt.push(m); hml.push(h); rmw.push(r);
      excess.push(
        betaM.map((bm, i) =>
          alphaSize * (i - (N - 1) / 2) +
          bm * m + valueLoad * betaH[i] * h + betaR[i] * r + 1.4 * randn(rng),
        ),
      );
    }
    const F1 = mkt.map((v) => [v]);
    const F3 = mkt.map((v, t) => [v, hml[t]]);
    const F5 = mkt.map((v, t) => [v, hml[t], rmw[t]]);
    return [
      evaluateFactorModel("CAPM (MKT)", excess, F1),
      evaluateFactorModel("FF (MKT+HML)", excess, F3),
      evaluateFactorModel("FF (MKT+HML+RMW)", excess, F5),
    ];
  }, [T, alphaSize, valueLoad, seed]);

  const chartData = models.map((m) => ({
    name: m.name,
    "HJ 距离": +m.hjDistance.toFixed(4),
    "平均 |α| (%)": +m.meanAbsAlpha.toFixed(3),
    "横截面 R²": +m.crossR2.toFixed(3),
  }));
  const best = models.reduce((a, b) => (b.hjDistance < a.hjDistance ? b : a));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "模型正确", description: "α = 0", apply: () => { setAlphaSize(0); setValueLoad(0.6); } },
        { name: "价值异象", description: "HML 载荷强", apply: () => { setValueLoad(1.2); setAlphaSize(0.1); } },
        { name: "严重误定价", description: "α 谱系发散", apply: () => setAlphaSize(0.5) },
        { name: "短样本", description: "T = 120", apply: () => setT(120) },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label="样本长度 T (月)" value={T} min={120} max={720} step={12} onChange={(v) => setT(Math.round(v))} />
          <Slider label="注入 α 幅度 (%/月)" value={alphaSize} min={0} max={0.6} step={0.01} onChange={setAlphaSize} />
          <Slider label="真实 HML 载荷强度" value={valueLoad} min={0} max={1.5} step={0.05} onChange={setValueLoad} />
          <Slider label="随机种子" value={seed} min={1} max={40} step={1} onChange={(v) => setSeed(Math.round(v))} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="最优模型 (最小 HJ 距离)" value={best.name} color={GOLD} />
          <Stat label="其 HJ 距离" value={best.hjDistance.toFixed(4)} color={TEAL} sub="δ = √(α′E[RR′]⁻¹α)" />
          <Stat label="平均 |α|" value={`${best.meanAbsAlpha.toFixed(3)}%`} color={BLUE} />
          <Stat label="横截面 R²" value={best.crossR2.toFixed(3)} color={RED} />
        </div>
      </div>

      <ChartCard title="模型横向比较：HJ 距离 / 平均 |α| / 横截面 R²"
        hint="HJ 距离度量「候选 SDF 距离合法定价核有多远」，与 GRS 不同的是它不依赖样本长度对统计功效的放大，因此适合跨模型比较。">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke={TEXT} tick={{ fontSize: 10 }} />
            <YAxis stroke={TEXT} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="HJ 距离" fill={GOLD} />
            <Bar dataKey="平均 |α| (%)" fill={TEAL} />
            <Bar dataKey="横截面 R²" fill={BLUE} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="各测试组合的定价误差 α" hint="正负 α 呈单调谱系 ⇒ 模型遗漏了一个与该排序相关的系统性因子。">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={best.alphas.map((a, i) => ({ port: `P${i + 1}`, α: +a.toFixed(3) }))}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="port" stroke={TEXT} tick={{ fontSize: 11 }} />
            <YAxis stroke={TEXT} tick={{ fontSize: 11 }} unit="%" />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 12 }} />
            <Bar dataKey="α">
              {best.alphas.map((a, i) => <Cell key={i} fill={a >= 0 ? TEAL : RED} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <Note>
        <p>工作流：时序回归取 α → 用二阶矩矩阵 E[RR′] 加权 → δ = √(α′E[RR′]⁻¹α)。δ 越小，候选 SDF 越接近能给全部测试资产正确定价的合法核。</p>
        <p>δ 与 GRS 的差别：GRS 是统计检验（问「α 是否显著非零」），HJ 距离是经济度量（问「定错了多少钱」）。样本一长，GRS 几乎必然拒绝，而 δ 仍可比较。</p>
      </Note>
    </div>
  );
};
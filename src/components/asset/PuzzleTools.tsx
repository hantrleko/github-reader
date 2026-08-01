import { useMemo, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Cell,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { AssetChrome, CHART } from "./AssetChrome";
import { longRunRisk, habitModel, disasterModel } from "@/lib/quant/assetPricingAdvanced";
import { ccapm } from "@/lib/quant/assetPricing";

const { GOLD, TEAL, RED, BLUE, GRID, TEXT } = CHART;
const { Slider, Stat, Note, ChartCard } = AssetChrome;

/* ════════════════════════════════════════════════════════════
   15. Epstein-Zin 与长期风险 (Bansal-Yaron)
   ════════════════════════════════════════════════════════════ */
export const LongRunRiskTool = () => {
  const [gamma, setGamma] = useState(10);
  const [psi, setPsi] = useState(1.5);
  const [delta, setDelta] = useState(0.998);
  const [rho, setRho] = useState(0.979);
  const [phiE, setPhiE] = useState(0.044);
  const [leverage, setLeverage] = useState(3);

  const base = { delta, gamma, psi, muC: 1.8, sigma: 2.7, rho, phiE, leverage, kappa1: 0.997 };
  const res = useMemo(() => longRunRisk(base), [delta, gamma, psi, rho, phiE, leverage]);

  const psiCurve = useMemo(() => {
    const out: { psi: number; ERP: number; Rf: number }[] = [];
    for (let p = 0.2; p <= 2.5; p += 0.05) {
      if (Math.abs(p - 1) < 0.03) continue;
      const r = longRunRisk({ ...base, psi: p });
      out.push({ psi: +p.toFixed(2), ERP: +r.equityPremium.toFixed(2), Rf: +r.rf.toFixed(2) });
    }
    return out;
  }, [delta, gamma, rho, phiE, leverage]);

  const early = psi > 1 / gamma;

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "BY (2004) 校准", description: "γ=10, ψ=1.5", apply: () => { setGamma(10); setPsi(1.5); setRho(0.979); setPhiE(0.044); } },
        { name: "退化为 CRRA", description: "ψ = 1/γ", apply: () => setPsi(+(1 / gamma).toFixed(3)) },
        { name: "低持续性", description: "ρ = 0.90", apply: () => setRho(0.9) },
        { name: "高杠杆股利", description: "φ = 4.5", apply: () => setLeverage(4.5) },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">Epstein-Zin 偏好</p>
          <Slider label="风险厌恶 γ" value={gamma} min={2} max={20} step={0.5} onChange={setGamma} />
          <Slider label="跨期替代弹性 ψ" value={psi} min={0.2} max={2.5} step={0.05} onChange={setPsi} />
          <Slider label="时间折现 δ" value={delta} min={0.985} max={0.999} step={0.001} onChange={setDelta} />
          <p className="text-xs font-mono text-gold uppercase tracking-wider pt-2">长期风险过程</p>
          <Slider label="持续性 ρ (长期成分)" value={rho} min={0.9} max={0.995} step={0.001} onChange={setRho} />
          <Slider label="长期冲击幅度 φₑ" value={phiE} min={0.01} max={0.12} step={0.002} onChange={setPhiE} />
          <Slider label="股利杠杆 φ" value={leverage} min={1} max={6} step={0.1} onChange={setLeverage} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="θ = (1−γ)/(1−1/ψ)" value={res.theta.toFixed(2)} color={BLUE} sub={early ? "偏好早期解决不确定性" : "偏好晚期解决"} />
          <Stat label="短期风险价格 λ_η" value={res.lambdaEta.toFixed(2)} sub="= γ" />
          <Stat label="长期风险价格 λ_e" value={res.lambdaE.toFixed(2)} color={GOLD} sub="CRRA 下为 0" />
          <Stat label="股权溢价" value={`${res.equityPremium.toFixed(2)}%`} color={TEAL} />
          <Stat label="无风险利率" value={`${res.rf.toFixed(2)}%`} color={RED} />
          <Stat label="σ(m)" value={res.volM.toFixed(3)} color={GOLD} sub="HJ 下界需 ≥ 0.4" />
        </div>
      </div>

      <ChartCard title="EIS 如何同时定住溢价与利率" hint="γ 与 ψ 分离后：γ 控制风险溢价，ψ 控制无风险利率。ψ>1 时消费的跨期替代足够灵活，长期风险的存在压低而不是抬高 Rf——这正是股权溢价与无风险利率之谜可以同时被解决的关键。">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={psiCurve}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="psi" stroke={TEXT} tick={{ fontSize: 11 }} label={{ value: "ψ (EIS)", position: "insideBottom", offset: -4, fill: TEXT, fontSize: 11 }} />
            <YAxis stroke={TEXT} tick={{ fontSize: 11 }} unit="%" />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine x={1} stroke={GRID} strokeDasharray="4 4" />
            <ReferenceLine y={6} stroke={TEAL} strokeDasharray="4 4" label={{ value: "历史 ERP ≈ 6%", fill: TEAL, fontSize: 10 }} />
            <Line type="monotone" dataKey="ERP" stroke={GOLD} dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="Rf" stroke={BLUE} dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <Note>
        <p>m = θ·lnδ − (θ/ψ)Δc + (θ−1)r_c；冲击载荷给出 λ_η = γ 与 λ_e = (1−θ)κ₁A₁φₑ。</p>
        <p>当 ψ = 1/γ 时 θ = 1，长期风险价格消失，模型退化为幂效用 CCAPM——这说明「谜题」的关键不是消费风险本身，而是投资者是否在意增长率的持久性。</p>
      </Note>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   16. 习惯形成 (Campbell-Cochrane)
   ════════════════════════════════════════════════════════════ */
export const HabitTool = () => {
  const [gamma, setGamma] = useState(2);
  const [phi, setPhi] = useState(0.87);
  const [sigma, setSigma] = useState(1.5);
  const [delta, setDelta] = useState(0.97);
  const [g, setG] = useState(1.9);

  const res = useMemo(() => habitModel({ delta, gamma, g, sigma, phi }), [delta, gamma, g, sigma, phi]);
  const curve = res.curve.map((p) => ({
    surplus: +(p.surplus * 100).toFixed(2),
    有效风险厌恶: +Math.min(p.riskAversion, 200).toFixed(1),
    Sharpe: +p.sharpe.toFixed(3),
  }));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "CC (1999) 校准", description: "γ=2, φ=0.87", apply: () => { setGamma(2); setPhi(0.87); setSigma(1.5); } },
        { name: "缓慢习惯", description: "φ = 0.95", apply: () => setPhi(0.95) },
        { name: "高消费波动", description: "σ = 3%", apply: () => setSigma(3) },
        { name: "更强曲率", description: "γ = 4", apply: () => setGamma(4) },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label="效用曲率 γ" value={gamma} min={1} max={6} step={0.25} onChange={setGamma} />
          <Slider label="习惯持续性 φ" value={phi} min={0.6} max={0.98} step={0.01} onChange={setPhi} />
          <Slider label="消费波动 σ (%)" value={sigma} min={0.5} max={4} step={0.1} onChange={setSigma} />
          <Slider label="消费增长 g (%)" value={g} min={0.5} max={4} step={0.1} onChange={setG} />
          <Slider label="时间折现 δ" value={delta} min={0.9} max={0.995} step={0.005} onChange={setDelta} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="稳态盈余消费比 S̄" value={`${(res.sBar * 100).toFixed(2)}%`} color={GOLD} sub="= σ√(γ/(1−φ))" />
          <Stat label="稳态有效风险厌恶 γ/S̄" value={res.steady.riskAversion.toFixed(1)} color={RED} sub="曲率 γ 很小也能很高" />
          <Stat label="稳态 Sharpe" value={res.steady.sharpe.toFixed(3)} color={TEAL} />
          <Stat label="衰退期 Sharpe (S→0)" value={res.curve[0].sharpe.toFixed(3)} color={GOLD} sub="风险价格时变" />
          <Stat label="无风险利率" value={`${res.rf.toFixed(2)}%`} color={BLUE} />
          <Stat label="S 上界 S_max" value={`${(res.sMax * 100).toFixed(2)}%`} />
        </div>
      </div>

      <ChartCard title="盈余消费比 S 与有效风险厌恶 / Sharpe"
        hint="消费只要略微逼近习惯水平，S 就急剧下降、有效风险厌恶 γ/S 飙升。因此同一批投资者在衰退中要求高得多的风险补偿——这就是可预测性与「波动率之谜」的机制来源。">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={curve}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="surplus" stroke={TEXT} tick={{ fontSize: 11 }} unit="%" label={{ value: "盈余消费比 S", position: "insideBottom", offset: -4, fill: TEXT, fontSize: 11 }} />
            <YAxis yAxisId="l" stroke={TEXT} tick={{ fontSize: 11 }} />
            <YAxis yAxisId="r" orientation="right" stroke={TEAL} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line yAxisId="l" type="monotone" dataKey="有效风险厌恶" stroke={RED} dot={false} strokeWidth={2} />
            <Line yAxisId="r" type="monotone" dataKey="Sharpe" stroke={TEAL} dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <Note>
        <p>外部习惯 X_t 缓慢跟随过去消费；S = (C−X)/C。效用曲率保持温和 (γ≈2)，但有效风险厌恶 γ/S 在坏时期放大数十倍。</p>
        <p>CC 的敏感函数 λ(s) 被设计成让无风险利率保持常数，从而在解释高股权溢价的同时不制造无风险利率之谜。</p>
      </Note>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   17. 罕见灾难 (Rietz-Barro)
   ════════════════════════════════════════════════════════════ */
export const DisasterTool = () => {
  const [gamma, setGamma] = useState(4);
  const [p, setP] = useState(1.7);
  const [b, setB] = useState(40);
  const [leverage, setLeverage] = useState(1);
  const [delta, setDelta] = useState(0.97);

  const inp = { delta, gamma, g: 2.5, sigma: 2, p: p / 100, b: b / 100, leverage };
  const res = useMemo(() => disasterModel(inp), [delta, gamma, p, b, leverage]);
  const noDisaster = useMemo(() => disasterModel({ ...inp, p: 0 }), [delta, gamma, b, leverage]);

  const curve = useMemo(() => {
    const out: { b: number; ERP: number; Rf: number }[] = [];
    for (let bb = 5; bb <= 70; bb += 2.5) {
      const r = disasterModel({ ...inp, b: bb / 100 });
      out.push({ b: bb, ERP: +r.equityPremium.toFixed(2), Rf: +r.rf.toFixed(2) });
    }
    return out;
  }, [delta, gamma, p, leverage]);

  const decomp = [
    { name: "扩散风险项 γσ²φ", value: +res.diffusiveTerm.toFixed(3) },
    { name: "灾难风险项", value: +res.disasterTerm.toFixed(3) },
  ];

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "Barro (2006)", description: "p=1.7%, b=40%", apply: () => { setP(1.7); setB(40); setGamma(4); } },
        { name: "无灾难 (CRRA)", description: "p = 0", apply: () => setP(0) },
        { name: "温和灾难", description: "b = 20%", apply: () => setB(20) },
        { name: "杠杆股权", description: "φ = 2", apply: () => setLeverage(2) },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Slider label="风险厌恶 γ" value={gamma} min={1} max={10} step={0.25} onChange={setGamma} />
          <Slider label="年度灾难概率 p (%)" value={p} min={0} max={5} step={0.1} onChange={setP} />
          <Slider label="灾难中消费跌幅 b (%)" value={b} min={5} max={70} step={1} onChange={setB} />
          <Slider label="股权杠杆 φ" value={leverage} min={1} max={3} step={0.1} onChange={setLeverage} />
          <Slider label="时间折现 δ" value={delta} min={0.9} max={0.995} step={0.005} onChange={setDelta} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="股权溢价" value={`${res.equityPremium.toFixed(2)}%`} color={GOLD} />
          <Stat label="其中灾难贡献" value={`${res.disasterTerm.toFixed(2)}%`} color={RED} />
          <Stat label="无风险利率" value={`${res.rf.toFixed(2)}%`} color={BLUE} />
          <Stat label="无灾难基准 Rf" value={`${noDisaster.rf.toFixed(2)}%`} sub="灾难压低 Rf" />
          <Stat label="E[m]" value={res.eM.toFixed(4)} color={TEAL} />
          <Stat label="σ(m)/E(m)" value={(res.volM / res.eM).toFixed(3)} color={GOLD} sub="HJ 下界需 ≥ 0.4" />
        </div>
      </div>

      <ChartCard title="灾难幅度 b 对溢价与利率的双重作用"
        hint="灾难同时把股权溢价推高、把无风险利率压低——一个参数解释两个谜题。代价是这些事件在样本内几乎观察不到，识别高度依赖跨国长历史数据（Barro 的 20 世纪灾难样本）。">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={curve}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="b" stroke={TEXT} tick={{ fontSize: 11 }} unit="%" label={{ value: "灾难跌幅 b", position: "insideBottom", offset: -4, fill: TEXT, fontSize: 11 }} />
            <YAxis stroke={TEXT} tick={{ fontSize: 11 }} unit="%" />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={6} stroke={TEAL} strokeDasharray="4 4" label={{ value: "历史 ERP ≈ 6%", fill: TEAL, fontSize: 10 }} />
            <Line type="monotone" dataKey="ERP" stroke={GOLD} dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="Rf" stroke={BLUE} dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="溢价分解" hint="常规扩散风险只能贡献极小的溢价；绝大部分来自尾部分支的边际效用暴涨 (1−b)^{−γ}。">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={decomp} layout="vertical" margin={{ left: 60 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis type="number" stroke={TEXT} tick={{ fontSize: 11 }} unit="%" />
            <YAxis type="category" dataKey="name" stroke={TEXT} tick={{ fontSize: 10 }} width={160} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 12 }} />
            <Bar dataKey="value">
              {decomp.map((d, i) => <Cell key={i} fill={i === 0 ? TEAL : RED} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <Note>
        <p>R_f = δ⁻¹·e^{"{γg−γ²σ²/2}"} / [(1−p) + p(1−b)^(−γ)]：灾难分支抬高 E[m]，把无风险利率压下去。</p>
        <p>批评：结论对 b 的尾部形状极其敏感，且难以与期权市场隐含的灾难保险价格同时匹配（Backus-Chernov-Martin）。</p>
      </Note>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   18. 三大谜题对照面板
   ════════════════════════════════════════════════════════════ */
export const PuzzleScoreboardTool = () => {
  const [targetERP, setTargetERP] = useState(6);
  const [targetRf, setTargetRf] = useState(1);
  const [gammaCRRA, setGammaCRRA] = useState(10);

  const rows = useMemo(() => {
    const crra = ccapm({ delta: 0.98, gamma: gammaCRRA, muC: 1.8, sigmaC: 2.7, sigmaM: 20, rho: 0.2, targetERP });
    const lrr = longRunRisk({ delta: 0.998, gamma: 10, psi: 1.5, muC: 1.8, sigma: 2.7, rho: 0.979, phiE: 0.044, leverage: 3, kappa1: 0.997 });
    const hab = habitModel({ delta: 0.97, gamma: 2, g: 1.9, sigma: 1.5, phi: 0.87 });
    const dis = disasterModel({ delta: 0.97, gamma: 4, g: 2.5, sigma: 2, p: 0.017, b: 0.4, leverage: 2 });
    return [
      { name: "CRRA-CCAPM", ERP: crra.equityPremium, Rf: crra.rf, sdfVol: crra.volM, timeVarying: false,
        verdict: "溢价过小、Rf 过高：提高 γ 会同时把 Rf 推向两位数（无风险利率之谜）。" },
      { name: "长期风险 (EZ)", ERP: lrr.equityPremium, Rf: lrr.rf, sdfVol: lrr.volM, timeVarying: false,
        verdict: "ψ>1 分离风险厌恶与替代弹性，同时匹配高溢价与低利率；依赖难以直接检验的持久成分。" },
      { name: "习惯形成 (CC)", ERP: hab.steady.premium, Rf: hab.rf, sdfVol: hab.steady.sharpe, timeVarying: true,
        verdict: "有效风险厌恶时变，天然解释可预测性与超额波动；对 S 的动态设定敏感。" },
      { name: "罕见灾难 (RB)", ERP: dis.equityPremium, Rf: dis.rf, sdfVol: dis.volM / dis.eM, timeVarying: false,
        verdict: "一个尾部参数同时抬高溢价、压低利率；识别依赖样本外的跨国灾难历史。" },
    ];
  }, [gammaCRRA]);

  const chart = rows.map((r) => ({
    name: r.name,
    "股权溢价 (%)": +r.ERP.toFixed(2),
    "无风险利率 (%)": +r.Rf.toFixed(2),
    "σ(m)/E(m)": +r.sdfVol.toFixed(3),
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Slider label="目标股权溢价 (%)" value={targetERP} min={2} max={9} step={0.25} onChange={setTargetERP} />
        <Slider label="目标无风险利率 (%)" value={targetRf} min={0} max={4} step={0.1} onChange={setTargetRf} />
        <Slider label="CRRA 基准的 γ" value={gammaCRRA} min={2} max={50} step={1} onChange={setGammaCRRA} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead className="bg-secondary/50 text-muted-foreground">
            <tr>
              <th className="text-left p-3 font-mono">机制</th>
              <th className="p-3 font-mono">股权溢价</th>
              <th className="p-3 font-mono">无风险利率</th>
              <th className="p-3 font-mono">σ(m)/E(m)</th>
              <th className="p-3 font-mono">时变风险价格</th>
              <th className="text-left p-3 font-mono">评价</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const okERP = Math.abs(r.ERP - targetERP) < 2;
              const okRf = Math.abs(r.Rf - targetRf) < 2;
              return (
                <tr key={r.name} className="border-t border-border">
                  <td className="p-3 font-medium text-foreground">{r.name}</td>
                  <td className="p-3 text-center font-mono tabular-nums" style={{ color: okERP ? TEAL : RED }}>{r.ERP.toFixed(2)}%</td>
                  <td className="p-3 text-center font-mono tabular-nums" style={{ color: okRf ? TEAL : RED }}>{r.Rf.toFixed(2)}%</td>
                  <td className="p-3 text-center font-mono tabular-nums" style={{ color: r.sdfVol >= 0.4 ? TEAL : RED }}>{r.sdfVol.toFixed(3)}</td>
                  <td className="p-3 text-center font-mono">{r.timeVarying ? "✓" : "—"}</td>
                  <td className="p-3 text-muted-foreground leading-relaxed">{r.verdict}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ChartCard title="四条解释路线并排比较" hint="判据有三条：溢价够不够高、利率够不够低、σ(m)/E(m) 是否越过 Hansen-Jagannathan 下界（历史最大 Sharpe ≈ 0.4）。">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke={TEXT} tick={{ fontSize: 10 }} />
            <YAxis stroke={TEXT} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${GRID}`, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={0.4} stroke={RED} strokeDasharray="4 4" label={{ value: "HJ 下界 0.4", fill: RED, fontSize: 10 }} />
            <Bar dataKey="股权溢价 (%)" fill={GOLD} />
            <Bar dataKey="无风险利率 (%)" fill={BLUE} />
            <Bar dataKey="σ(m)/E(m)" fill={TEAL} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <Note>
        <p>三大谜题其实是同一个约束的三个侧面：定价核必须足够波动 (股权溢价)、平均水平不能太低 (无风险利率)、并且波动本身要随状态变化 (超额波动与可预测性)。</p>
        <p>没有哪条路线单独胜出。当前主流做法是把长期风险、时变风险厌恶与尾部风险放进同一个 SDF，再用期权、债券与横截面数据联合识别。</p>
      </Note>
    </div>
  );
};
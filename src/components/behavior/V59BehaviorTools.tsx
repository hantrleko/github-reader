import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, BarChart, Bar, ComposedChart, Area,
} from "recharts";
import { C, Slider, Stat, tooltipStyle } from "@/components/frontier/ui";
import PresetButtons from "@/components/PresetButtons";
import {
  cptGamble, cptValue, cptWeight, fourfoldPattern,
  myopicLossAversion, bsvBeliefs, dhsOverconfidence, hongSteinDiffusion,
  limitsToArbitrage, sentimentCrossSection, behavioralCorporate,
} from "@/lib/quant/behaviorFinance";

/* ─────────── shared shell ─────────── */

const Panel = ({ id, title, en, desc, children }: {
  id: string; title: string; en: string; desc: string; children: React.ReactNode;
}) => (
  <section id={id} className="rounded-2xl border border-border bg-card/40 p-5 space-y-5 scroll-mt-24">
    <header>
      <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold">{en}</p>
      <h3 className="font-display text-xl text-foreground mt-1">{title}</h3>
      <p className="text-xs text-foreground/60 mt-1.5 leading-relaxed max-w-3xl">{desc}</p>
    </header>
    {children}
  </section>
);

const Note = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[11px] font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">
    {children}
  </div>
);

const Chart = ({ title, height = 240, children }: { title: string; height?: number; children: React.ReactElement }) => (
  <div className="rounded-xl border border-border bg-secondary/20 p-4">
    <h4 className="text-sm font-semibold text-foreground mb-2">{title}</h4>
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
    </div>
  </div>
);

type Group = "beliefs" | "preferences" | "arbitrage" | "corporate";

const GROUPS: { id: Group; label: string; en: string; desc: string }[] = [
  { id: "preferences", label: "偏好偏离", en: "Preferences", desc: "累积前景理论 · 短视损失厌恶" },
  { id: "beliefs", label: "信念偏差", en: "Beliefs", desc: "BSV · DHS · Hong-Stein" },
  { id: "arbitrage", label: "有限套利与异象", en: "Limits & Anomalies", desc: "套利约束 · 投资者情绪截面" },
  { id: "corporate", label: "行为公司金融", en: "Behavioral Corporate", desc: "管理者过度自信 · 市场时机" },
];

export default function V59BehaviorTools() {
  const [group, setGroup] = useState<Group>("preferences");
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-card/50 p-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-1">V5.9 · Behavioral Finance Lab</p>
        <h2 className="text-2xl font-display text-foreground">行为金融实验室</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl leading-relaxed">
          按「心理机制 → 信念/偏好扭曲 → 交易与公司决策 → 在套利约束下的价格后果」这条因果链组织的八个可交互实验：
          从累积前景理论与短视损失厌恶，到 BSV / DHS / Hong-Stein 三大信念模型，再到有限套利、投资者情绪截面与行为公司金融。
          每个实验都给出理性基准，用于区分「行为解释」与「风险解释」。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <button key={g.id} onClick={() => setGroup(g.id)}
              className={`px-3.5 py-2 rounded-lg border text-xs font-mono text-left transition-colors ${
                group === g.id ? "bg-gold/15 border-gold/60 text-gold"
                               : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
              }`}>
              <span className="uppercase tracking-wider mr-2">{g.en}</span>{g.label}
              <span className="block text-[10px] opacity-70 mt-0.5">{g.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <motion.div key={group} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {group === "preferences" && <><CptPanel /><MlaPanel /></>}
        {group === "beliefs" && <><BsvPanel /><DhsPanel /><HsPanel /></>}
        {group === "arbitrage" && <><LimitsPanel /><SentimentPanel /></>}
        {group === "corporate" && <CorporatePanel />}
      </motion.div>

      <div className="rounded-lg border border-border bg-card/60 p-4 text-[11px] font-mono text-muted-foreground leading-relaxed">
        <p className="text-gold uppercase tracking-wider mb-2">参考文献</p>
        <p>
          Kahneman &amp; Tversky (1979); Tversky &amp; Kahneman (1992) Cumulative Prospect Theory ·
          Benartzi &amp; Thaler (1995) Myopic Loss Aversion and the Equity Premium Puzzle ·
          Barberis, Shleifer &amp; Vishny (1998) A Model of Investor Sentiment ·
          Daniel, Hirshleifer &amp; Subrahmanyam (1998) Investor Psychology and Security Market Under- and Overreactions ·
          Hong &amp; Stein (1999) A Unified Theory of Underreaction, Momentum Trading and Overreaction ·
          Shleifer &amp; Vishny (1997) The Limits of Arbitrage · Baker &amp; Wurgler (2006) Investor Sentiment and the
          Cross-Section of Stock Returns · Malmendier &amp; Tate (2005); Baker &amp; Wurgler (2002) Market Timing and Capital Structure.
        </p>
      </div>
    </section>
  );
}

/* ═══════════════ 1. Cumulative Prospect Theory ═══════════════ */
function CptPanel() {
  const [alpha, setAlpha] = useState(0.88);
  const [beta, setBeta] = useState(0.88);
  const [lambda, setLambda] = useState(2.25);
  const [gamma, setGamma] = useState(0.61);
  const [gain, setGain] = useState(100);
  const [loss, setLoss] = useState(100);
  const [p, setP] = useState(0.5);

  const par = { alpha, beta, lambda, gamma };
  const g = useMemo(() => cptGamble(gain, loss, p, par), [gain, loss, p, alpha, beta, lambda, gamma]);
  const cells = useMemo(() => fourfoldPattern(1000, par), [alpha, beta, lambda, gamma]);
  const valueCurve = useMemo(() => {
    const out: { x: number; v: number; eu: number }[] = [];
    for (let x = -100; x <= 100; x += 4) out.push({ x, v: +cptValue(x, par).toFixed(3), eu: x });
    return out;
  }, [alpha, beta, lambda]);
  const weightCurve = useMemo(() => {
    const out: { p: number; w: number; lin: number }[] = [];
    for (let i = 0; i <= 100; i++) out.push({ p: i / 100, w: +cptWeight(i / 100, gamma).toFixed(4), lin: i / 100 });
    return out;
  }, [gamma]);

  return (
    <Panel id="cpt" en="Cumulative Prospect Theory" title="累积前景理论：价值函数、概率权重与四重风险态度"
      desc="v(x) 相对参照点定义，收益域凹、损失域凸、损失侧更陡 (λ>1)；w(p) 高估小概率、低估中高概率。二者叠加产生四重风险态度，也是彩票与保险同时存在的解释。">
      <PresetButtons presets={[
        { name: "TK 1992 标定", description: "α=β=.88, λ=2.25, γ=.61", apply: () => { setAlpha(0.88); setBeta(0.88); setLambda(2.25); setGamma(0.61); } },
        { name: "期望效用基准", description: "α=β=λ=γ=1", apply: () => { setAlpha(1); setBeta(1); setLambda(1); setGamma(1); } },
        { name: "强损失厌恶", description: "λ=3.5", apply: () => setLambda(3.5) },
        { name: "彩票型", description: "p=.02 大奖", apply: () => { setP(0.02); setGain(5000); setLoss(100); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Slider label="α 收益凹性" value={alpha} min={0.3} max={1} step={0.01} onChange={setAlpha} />
            <Slider label="β 损失凸性" value={beta} min={0.3} max={1} step={0.01} onChange={setBeta} />
            <Slider label="λ 损失厌恶" value={lambda} min={1} max={4} step={0.05} onChange={setLambda} />
            <Slider label="γ 概率加权" value={gamma} min={0.3} max={1} step={0.01} onChange={setGamma} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Slider label="赢 G" value={gain} min={10} max={5000} step={10} fmt={(v) => v.toFixed(0)} onChange={setGain} />
            <Slider label="输 L" value={loss} min={10} max={5000} step={10} fmt={(v) => v.toFixed(0)} onChange={setLoss} />
            <Slider label="p(赢)" value={p} min={0.01} max={0.99} step={0.01} onChange={setP} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="前景价值 V" value={g.prospectValue.toFixed(2)} color={g.prospectValue >= 0 ? C.green : C.red} />
          <Stat label="期望值 EV" value={g.expectedValue.toFixed(2)} color={C.blue} sub="理性基准" />
          <Stat label="确定性等值 CE" value={g.certaintyEquivalent.toFixed(2)} color={C.gold} sub="v(CE)=V" />
          <Stat label="行为风险溢价" value={g.riskPremium.toFixed(2)} color={C.red} sub="EV − CE" />
          <Stat label="w(p) 决策权重" value={g.wGain.toFixed(3)} color={C.teal} sub={`客观 p=${p.toFixed(2)}`} />
          <Stat label="w(1−p)" value={g.wLoss.toFixed(3)} color={C.teal} sub={`客观 ${(1 - p).toFixed(2)}`} />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Chart title="价值函数 v(x) vs 线性效用">
          <LineChart data={valueCurve}>
            <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
            <XAxis dataKey="x" stroke={C.text} tick={{ fontSize: 10 }} />
            <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine x={0} stroke={C.text} /><ReferenceLine y={0} stroke={C.text} />
            <Line type="monotone" dataKey="v" name="v(x)" stroke={C.gold} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="eu" name="线性效用" stroke={C.text} strokeWidth={1} dot={false} strokeDasharray="4 3" />
          </LineChart>
        </Chart>
        <Chart title="概率权重 w(p)">
          <LineChart data={weightCurve}>
            <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
            <XAxis dataKey="p" stroke={C.text} tick={{ fontSize: 10 }} />
            <YAxis stroke={C.text} tick={{ fontSize: 10 }} domain={[0, 1]} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="w" name="w(p)" stroke={C.blue} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="lin" name="45°" stroke={C.text} strokeWidth={1} dot={false} strokeDasharray="4 3" />
          </LineChart>
        </Chart>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {cells.map((c, i) => (
          <div key={i} className="rounded-lg border border-border bg-secondary/30 p-3">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              {c.domain === "gain" ? "收益域" : "损失域"} · p={c.probability.toFixed(2)}
            </p>
            <p className="text-sm font-mono mt-1" style={{ color: c.attitude === "risk-seeking" ? C.red : C.green }}>
              {c.attitude === "risk-seeking" ? "风险寻求" : c.attitude === "risk-averse" ? "风险厌恶" : "风险中性"}
            </p>
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">CE {c.ce.toFixed(1)} vs EV {c.ev.toFixed(1)}</p>
          </div>
        ))}
      </div>
      <Note>
        <p><span className="text-gold">局限：</span>参照点 r 不可直接观察，也非外生；不同参照点会导出完全不同的预测。把「不愿止损」一律归为损失厌恶，会忽略税收、交易成本、私有信息与学习等理性解释。</p>
      </Note>
    </Panel>
  );
}

/* ═══════════════ 2. Myopic loss aversion ═══════════════ */
function MlaPanel() {
  const [lambda, setLambda] = useState(2.25);
  const [sigma, setSigma] = useState(0.2);
  const [freq, setFreq] = useState(12);
  const o = useMemo(() => myopicLossAversion({ lambda, sigmaAnnual: sigma, evaluationsPerYear: freq, riskFree: 0.02 }), [lambda, sigma, freq]);
  const sweep = useMemo(() => [1, 2, 4, 12, 52, 252].map((n) => ({
    n: n === 1 ? "年" : n === 2 ? "半年" : n === 4 ? "季" : n === 12 ? "月" : n === 52 ? "周" : "日",
    premium: +(myopicLossAversion({ lambda, sigmaAnnual: sigma, evaluationsPerYear: n, riskFree: 0.02 }).impliedEquityPremium * 100).toFixed(2),
  })), [lambda, sigma]);

  return (
    <Panel id="mla" en="Myopic Loss Aversion" title="短视损失厌恶与股权溢价之谜"
      desc="Benartzi-Thaler：损失厌恶 λ 与「评估频率」结合，就能内生出很高的股票要求回报。评估越频繁，看到亏损的概率越大，心理成本越高——这为股权溢价之谜提供了一种行为解释。">
      <PresetButtons presets={[
        { name: "BT 1995 基准", description: "λ=2.25, 年度评估", apply: () => { setLambda(2.25); setFreq(1); setSigma(0.2); } },
        { name: "每日盯盘", description: "252 次/年", apply: () => setFreq(252) },
        { name: "无损失厌恶", description: "λ=1 → 溢价归零", apply: () => setLambda(1) },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Slider label="λ 损失厌恶" value={lambda} min={1} max={4} step={0.05} onChange={setLambda} />
          <Slider label="σ 股票年化波动" value={sigma} min={0.05} max={0.5} step={0.01} fmt={(v) => `${(v * 100).toFixed(0)}%`} onChange={setSigma} />
          <Slider label="评估频率 (次/年)" value={freq} min={1} max={252} step={1} fmt={(v) => v.toFixed(0)} onChange={setFreq} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="隐含股权溢价" value={`${(o.impliedEquityPremium * 100).toFixed(2)}%`} color={C.gold} sub="使前景效用=0" />
          <Stat label="单期见亏概率" value={`${(o.lossProbability * 100).toFixed(1)}%`} color={C.red} />
          <Stat label="单期波动" value={`${(o.periodSigma * 100).toFixed(2)}%`} color={C.blue} sub="σ/√n" />
          <Stat label="理性基准溢价" value="0%" color={C.text} sub="λ=1 时" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Chart title="评估频率 → 隐含股权溢价 (%)">
          <BarChart data={sweep}>
            <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
            <XAxis dataKey="n" stroke={C.text} tick={{ fontSize: 10 }} />
            <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="premium" name="隐含溢价 %" fill={C.gold} />
          </BarChart>
        </Chart>
        <Chart title="前景效用随溢价的变化（零点即均衡溢价）">
          <LineChart data={o.utilityCurve}>
            <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
            <XAxis dataKey="premium" stroke={C.text} tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
            <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <ReferenceLine y={0} stroke={C.red} strokeDasharray="4 3" />
            <Line type="monotone" dataKey="utility" name="前景效用" stroke={C.blue} strokeWidth={2.5} dot={false} />
          </LineChart>
        </Chart>
      </div>
      <Note><p><span className="text-gold">争议：</span>评估频率并不可观测，且长期投资者未必按日结算；实证上机构与散户的评估周期差异是否真的映射到定价，仍有分歧。</p></Note>
    </Panel>
  );
}

/* ═══════════════ 3. BSV ═══════════════ */
function BsvPanel() {
  const [piL, setPiL] = useState(0.8);
  const [piH, setPiH] = useState(0.7);
  const [lambda1, setLambda1] = useState(0.6);
  const o = useMemo(() => bsvBeliefs({ piL, piH, lambda1, shock: 1, horizon: 48 }), [piL, piH, lambda1]);
  const data = o.t.map((t, i) => ({ t, car: +o.car[i].toFixed(4), rational: o.rationalCar[i] }));
  return (
    <Panel id="bsv" en="Barberis-Shleifer-Vishny (1998)" title="BSV：保守主义 + 代表性 → 反应不足接过度反应"
      desc="投资者以为盈利在「均值回复」与「趋势」两个制度间切换。保守主义使公告当期反应不足，随后缓慢漂移；代表性使连续好消息被外推，价格冲过基本面，长期再反转。">
      <PresetButtons presets={[
        { name: "BSV 原始标定", description: "π_L=.8, π_H=.7, λ₁=.6", apply: () => { setPiL(0.8); setPiH(0.7); setLambda1(0.6); } },
        { name: "纯保守主义", description: "λ₁=1 → 只有漂移", apply: () => setLambda1(1) },
        { name: "纯代表性", description: "λ₁=0 → 强过度反应", apply: () => setLambda1(0) },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Slider label="π_L 均值回复制度持续性" value={piL} min={0.5} max={0.99} step={0.01} onChange={setPiL} />
          <Slider label="π_H 趋势制度持续性" value={piH} min={0.5} max={0.99} step={0.01} onChange={setPiH} />
          <Slider label="λ₁ 保守主义权重" value={lambda1} min={0} max={1} step={0.01} onChange={setLambda1} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="短期反应不足" value={o.underreaction.toFixed(3)} color={C.blue} sub="理性 CAR − 实际" />
          <Stat label="峰值过度反应" value={o.overreaction.toFixed(3)} color={C.red} sub="max CAR − 基本面" />
          <Stat label="是否长期反转" value={o.reversal ? "是" : "否"} color={o.reversal ? C.gold : C.text} />
          <Stat label="终值 CAR" value={o.car[o.car.length - 1].toFixed(3)} color={C.green} />
        </div>
      </div>
      <Chart title="事件后累计异常收益 CAR vs 理性基准" height={280}>
        <LineChart data={data}>
          <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
          <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
          <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="car" name="行为 CAR" stroke={C.gold} strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="rational" name="理性基准" stroke={C.text} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
        </LineChart>
      </Chart>
      <Note><p><span className="text-gold">检验要点：</span>BSV 的可证伪含义在截面——在信息更模糊、分析师覆盖更少的股票上，漂移与反转都应更强。这才是与「风险溢价解释」的分水岭。</p></Note>
    </Panel>
  );
}

/* ═══════════════ 4. DHS ═══════════════ */
function DhsPanel() {
  const [k, setK] = useState(2);
  const [psi, setPsi] = useState(0.6);
  const [corr, setCorr] = useState(0.15);
  const o = useMemo(() => dhsOverconfidence({ overconfidence: k, selfAttribution: psi, signal: 1, horizon: 48, correctionRate: corr }), [k, psi, corr]);
  const data = o.t.map((t, i) => ({ t, price: +o.price[i].toFixed(4), fundamental: o.fundamental[i] }));
  return (
    <Panel id="dhs" en="Daniel-Hirshleifer-Subrahmanyam (1998)" title="DHS：过度自信与自我归因偏差"
      desc="投资者高估私有信号精度 (k>1) 造成即时过度反应；自我归因使确认性公开信息进一步强化信念（延续的动量），而最终公开信息把价格拉回基本面——长期反转。">
      <PresetButtons presets={[
        { name: "标准过度自信", description: "k=2, ψ=.6", apply: () => { setK(2); setPsi(0.6); setCorr(0.15); } },
        { name: "理性基准", description: "k=1, ψ=0", apply: () => { setK(1); setPsi(0); } },
        { name: "极端自我归因", description: "ψ=.95", apply: () => setPsi(0.95) },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Slider label="k 过度自信（信号精度膨胀）" value={k} min={1} max={4} step={0.05} onChange={setK} />
          <Slider label="ψ 自我归因强度" value={psi} min={0} max={0.95} step={0.01} onChange={setPsi} />
          <Slider label="λ 公开信息纠偏速度" value={corr} min={0.02} max={0.6} step={0.01} onChange={setCorr} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="动量持续期" value={`${o.momentumPhase} 期`} color={C.blue} />
          <Stat label="峰值过冲" value={o.peakOvershoot.toFixed(3)} color={C.red} />
          <Stat label="长期反转幅度" value={o.longRunReversal.toFixed(3)} color={C.gold} />
          <Stat label="终值 / 基本面" value={o.price[o.price.length - 1].toFixed(3)} color={C.green} sub="基本面 = 1.000" />
        </div>
      </div>
      <Chart title="价格路径：过度反应 → 动量 → 反转" height={280}>
        <ComposedChart data={data}>
          <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
          <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
          <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="price" name="价格" stroke={C.gold} fill={C.gold} fillOpacity={0.12} strokeWidth={2.5} />
          <Line type="monotone" dataKey="fundamental" name="基本面" stroke={C.text} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
        </ComposedChart>
      </Chart>
    </Panel>
  );
}

/* ═══════════════ 5. Hong-Stein ═══════════════ */
function HsPanel() {
  const [z, setZ] = useState(6);
  const [mu, setMu] = useState(0.6);
  const [j, setJ] = useState(3);
  const o = useMemo(() => hongSteinDiffusion({ diffusionPeriods: z, momentumShare: mu, momentumLookback: j, shock: 1, horizon: 48 }), [z, mu, j]);
  const data = o.t.map((t, i) => ({ t, price: +o.price[i].toFixed(4), fundamental: o.fundamental[i] }));
  return (
    <Panel id="hs" en="Hong-Stein (1999)" title="信息缓慢扩散 + 动量交易者的统一解释"
      desc="新闻在 z 期内逐步扩散到「新闻观察者」，造成天然的反应不足；动量交易者观察到过去 j 期的价格趋势并追随，把反应不足放大为过冲，最终反转。无需任何个体层面的认知偏差。">
      <PresetButtons presets={[
        { name: "HS 基准", description: "z=6, μ=.6, j=3", apply: () => { setZ(6); setMu(0.6); setJ(3); } },
        { name: "无动量交易者", description: "μ=0 → 只有反应不足", apply: () => setMu(0) },
        { name: "信息瞬时扩散", description: "z=1", apply: () => setZ(1) },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Slider label="z 信息扩散期数" value={z} min={1} max={20} step={1} fmt={(v) => v.toFixed(0)} onChange={setZ} />
          <Slider label="μ 动量交易者占比" value={mu} min={0} max={0.95} step={0.01} onChange={setMu} />
          <Slider label="j 动量回看窗口" value={j} min={1} max={12} step={1} fmt={(v) => v.toFixed(0)} onChange={setJ} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="过冲幅度" value={o.momentumStrength.toFixed(3)} color={o.overshoot ? C.red : C.text} />
          <Stat label="是否过冲" value={o.overshoot ? "是" : "否"} color={o.overshoot ? C.gold : C.text} />
          <Stat label="扩散完成期" value={`${z} 期`} color={C.blue} />
          <Stat label="终值" value={o.price[o.price.length - 1].toFixed(3)} color={C.green} sub="基本面 = 1.000" />
        </div>
      </div>
      <Chart title="缓慢扩散 + 趋势追随的价格路径" height={280}>
        <LineChart data={data}>
          <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
          <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
          <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="price" name="价格" stroke={C.blue} strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="fundamental" name="基本面" stroke={C.text} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
        </LineChart>
      </Chart>
    </Panel>
  );
}

/* ═══════════════ 6. Limits to arbitrage ═══════════════ */
function LimitsPanel() {
  const [noise, setNoise] = useState(0.12);
  const [kappa, setKappa] = useState(0.2);
  const [margin, setMargin] = useState(0.4);
  const [beta, setBeta] = useState(0.5);
  const o = useMemo(() => limitsToArbitrage({
    mispricing: 1, noiseVol: noise, convergenceRate: kappa, capital: 100,
    marginRequirement: margin, redemptionSensitivity: beta, horizon: 40,
  }), [noise, kappa, margin, beta]);
  const data = o.t.map((t, i) => ({
    t, mis: +o.mispricing[i].toFixed(4), unc: +o.unconstrained[i].toFixed(4), cap: +o.capitalPath[i].toFixed(2),
  }));
  return (
    <Panel id="limits" en="Limits of Arbitrage" title="有限套利：保证金、赎回与被迫平仓"
      desc="Shleifer-Vishny：正确识别错价不等于能纠正它。噪声交易者风险使错价先扩大，浮亏触发赎回并侵蚀资本，保证金进一步压缩头寸——错价因此可以在经济上重要的时间尺度内持续存在。">
      <PresetButtons presets={[
        { name: "正常市况", description: "低噪声、宽保证金", apply: () => { setNoise(0.05); setMargin(0.25); setBeta(0.2); } },
        { name: "1998 LTCM 式", description: "高噪声 + 高赎回敏感", apply: () => { setNoise(0.28); setMargin(0.8); setBeta(1.2); } },
        { name: "无摩擦基准", description: "噪声=0, 赎回=0", apply: () => { setNoise(0); setBeta(0); setMargin(0.2); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3 grid grid-cols-2 gap-3">
          <Slider label="σ 噪声交易者风险" value={noise} min={0} max={0.4} step={0.01} onChange={setNoise} />
          <Slider label="κ 自然收敛速度" value={kappa} min={0.02} max={0.6} step={0.01} onChange={setKappa} />
          <Slider label="m 保证金要求" value={margin} min={0.05} max={1} step={0.01} onChange={setMargin} />
          <Slider label="β 赎回敏感度" value={beta} min={0} max={2} step={0.05} onChange={setBeta} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="错价半衰期" value={Number.isFinite(o.halfLife) ? `${o.halfLife} 期` : "未收敛"} color={Number.isFinite(o.halfLife) ? C.green : C.red} />
          <Stat label="是否被迫平仓" value={o.forcedLiquidation ? `是 (t=${o.liquidationPeriod})` : "否"} color={o.forcedLiquidation ? C.red : C.green} />
          <Stat label="最大头寸" value={o.maxPosition.toFixed(1)} color={C.blue} sub="资本/保证金上限" />
          <Stat label="期末资本" value={o.capitalPath[o.capitalPath.length - 1].toFixed(1)} color={C.gold} sub="初始 100" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Chart title="错价路径：受约束 vs 无摩擦套利">
          <LineChart data={data}>
            <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
            <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="mis" name="受约束错价" stroke={C.red} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="unc" name="无摩擦基准" stroke={C.text} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
          </LineChart>
        </Chart>
        <Chart title="套利者资本路径">
          <ComposedChart data={data}>
            <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
            <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="cap" name="资本" stroke={C.gold} fill={C.gold} fillOpacity={0.15} strokeWidth={2} />
          </ComposedChart>
        </Chart>
      </div>
      <Note><p><span className="text-gold">异质性检验：</span>行为解释可信度的关键，是在「套利更难」的截面（卖空成本高、替代证券差、机构持股低）上效应更强；否则很难排除风险溢价解释。</p></Note>
    </Panel>
  );
}

/* ═══════════════ 7. Sentiment cross-section ═══════════════ */
function SentimentPanel() {
  const [sent, setSent] = useState(1.2);
  const [b, setB] = useState(0.05);
  const [cost, setCost] = useState(0.3);
  const o = useMemo(() => sentimentCrossSection({ sentiment: sent, sensitivity: b, arbitrageCost: cost, baseReturn: 0.08, horizon: 12 }), [sent, b, cost]);
  const data = o.path.map((r) => ({ t: r.t, hard: +(r.hard * 100).toFixed(2), easy: +(r.easy * 100).toFixed(2) }));
  return (
    <Panel id="sentiment" en="Baker-Wurgler Sentiment" title="投资者情绪与截面收益"
      desc="情绪高涨时，难以估值、难以套利的股票（小盘、年轻、不盈利、高波动、极端成长）被推高，随后收益更低；情绪低迷时相反。情绪本身不定价风险，但决定谁的错价能存活。">
      <PresetButtons presets={[
        { name: "情绪高涨", description: "S=+1.5，泡沫期", apply: () => setSent(1.5) },
        { name: "情绪低迷", description: "S=−1.5，恐慌期", apply: () => setSent(-1.5) },
        { name: "中性基准", description: "S=0 → 无价差", apply: () => setSent(0) },
        { name: "套利受阻", description: "卖空成本高", apply: () => setCost(0.8) },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Slider label="S 情绪指数（标准化）" value={sent} min={-2} max={2} step={0.05} onChange={setSent} />
          <Slider label="b 投机腿情绪敏感度" value={b} min={0} max={0.15} step={0.005} onChange={setB} />
          <Slider label="c 套利摩擦（卖空限制）" value={cost} min={0} max={1} step={0.01} onChange={setCost} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="难估值腿后续收益" value={`${(o.hardToValueReturn * 100).toFixed(2)}%`} color={o.hardToValueReturn < 0.08 ? C.red : C.green} />
          <Stat label="易估值腿后续收益" value={`${(o.easyToValueReturn * 100).toFixed(2)}%`} color={C.blue} />
          <Stat label="多空价差" value={`${(o.spread * 100).toFixed(2)}%`} color={C.gold} sub="难 − 易" />
          <Stat label="情绪区间" value={o.regime === "high" ? "高情绪" : o.regime === "low" ? "低情绪" : "中性"} color={C.teal} />
        </div>
      </div>
      <Chart title="后续 12 个月累计收益（%）" height={260}>
        <LineChart data={data}>
          <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
          <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
          <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={0} stroke={C.text} />
          <Line type="monotone" dataKey="hard" name="难估值 / 难套利" stroke={C.red} strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="easy" name="易估值 / 易套利" stroke={C.blue} strokeWidth={2.5} dot={false} />
        </LineChart>
      </Chart>
      <Note><p><span className="text-gold">测度问题：</span>情绪代理变量（封闭式基金折价、IPO 首日收益、换手率、消费者信心）各自都有噪声与内生性，稳健做法是多代理交叉验证，而不是单一指数。</p></Note>
    </Panel>
  );
}

/* ═══════════════ 8. Behavioral corporate ═══════════════ */
function CorporatePanel() {
  const [kappa, setKappa] = useState(1.2);
  const [wedge, setWedge] = useState(0.25);
  const [timing, setTiming] = useState(0.5);
  const [sentAmp, setSentAmp] = useState(1);

  const cashFlow = useMemo(() => Array.from({ length: 20 }, (_, i) => Math.sin(i / 3) * 1.2), []);
  const sentiment = useMemo(() => cashFlow.map((_, i) => sentAmp * Math.sin(i / 4 + 1)), [cashFlow, sentAmp]);
  const o = useMemo(() => behavioralCorporate({
    overconfidence: kappa, cashFlow, externalFinanceCost: wedge, sentiment, timingIntensity: timing,
  }), [kappa, wedge, timing, sentiment, cashFlow]);

  const data = o.investment.map((v, i) => ({
    t: i,
    inv: +v.toFixed(3),
    rat: +o.rationalInvestment[i].toFixed(3),
    cf: +cashFlow[i].toFixed(3),
    issue: +o.equityIssuance[i].toFixed(3),
    lev: +o.leverage[i].toFixed(3),
  }));

  return (
    <Panel id="corporate" en="Behavioral Corporate Finance" title="管理者过度自信与市场时机"
      desc="双向框架：一边是「非理性管理者 + 理性市场」——过度自信的 CEO 认为外部融资被低估，因而投资对内部现金流高度敏感、并购溢价过高；另一边是「理性管理者 + 非理性市场」——管理者择时发行，使资本结构成为历史市值的累积产物。">
      <PresetButtons presets={[
        { name: "Malmendier-Tate", description: "高过度自信 κ=2", apply: () => { setKappa(2); setTiming(0); } },
        { name: "Baker-Wurgler 择时", description: "κ=0，强市场时机", apply: () => { setKappa(0); setTiming(1); } },
        { name: "理性基准", description: "κ=0，无择时", apply: () => { setKappa(0); setTiming(0); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="grid grid-cols-2 gap-3">
          <Slider label="κ 管理者过度自信" value={kappa} min={0} max={3} step={0.05} onChange={setKappa} />
          <Slider label="外部融资成本楔子" value={wedge} min={0} max={1} step={0.01} onChange={setWedge} />
          <Slider label="市场时机强度" value={timing} min={0} max={1.5} step={0.05} onChange={setTiming} />
          <Slider label="市场情绪振幅" value={sentAmp} min={0} max={2} step={0.05} onChange={setSentAmp} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="投资—现金流敏感性" value={o.investmentCashFlowSensitivity.toFixed(3)} color={C.gold} />
          <Stat label="理性基准敏感性" value={o.rationalSensitivity.toFixed(3)} color={C.text} />
          <Stat label="累计股权发行" value={o.equityIssuance.reduce((s, v) => s + v, 0).toFixed(2)} color={C.blue} sub="择时窗口内" />
          <Stat label="期末杠杆" value={o.leverage[o.leverage.length - 1].toFixed(3)} color={C.teal} sub="初始 0.400" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Chart title="投资路径 vs 理性基准（现金流为灰线）">
          <ComposedChart data={data}>
            <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
            <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="inv" name="过度自信投资" stroke={C.gold} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="rat" name="理性投资" stroke={C.blue} strokeWidth={2} dot={false} strokeDasharray="4 3" />
            <Line type="monotone" dataKey="cf" name="内部现金流" stroke={C.text} strokeWidth={1} dot={false} />
          </ComposedChart>
        </Chart>
        <Chart title="市场时机：股权发行与杠杆演化">
          <ComposedChart data={data}>
            <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
            <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="issue" name="股权发行" fill={C.green} />
            <Line type="monotone" dataKey="lev" name="账面杠杆" stroke={C.red} strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </Chart>
      </div>
      <Note>
        <p><span className="text-gold">识别难点：</span>投资—现金流敏感性同时可由融资约束解释；过度自信的代理变量（推迟行权、内部人增持、媒体措辞）都可能捕捉私有信息而非偏差。可信设计需要外生冲击或制度变化。</p>
      </Note>
    </Panel>
  );
}
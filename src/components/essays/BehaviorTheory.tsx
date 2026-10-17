import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

/**
 * Structured reading guide for behavioral finance (V5.9).
 * Chain: framing question → two pillars → prospect theory → bias atlas →
 * emotion & herding → limits of arbitrage → anomalies → corporate → frontier.
 */

const H = ({ n, en, zh }: { n: string; en: string; zh: string }) => {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  return (
  <div className="flex items-baseline gap-3 mt-14 mb-5 border-b border-border/50 pb-3">
    <span className="text-[10px] font-mono tracking-[0.3em] text-gold">PART {n}</span>
    <h3 className="font-display text-2xl md:text-[26px] text-foreground leading-tight">{isEn ? en : zh}</h3>
    <span className="ml-auto text-[11px] font-mono text-muted-foreground hidden md:inline">{en}</span>
  </div>
  );
};

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[15px] leading-[1.85] text-foreground/80 mb-4">{children}</p>
);

const Eq = ({ children, note }: { children: React.ReactNode; note?: string }) => (
  <div className="my-5 rounded-xl border border-border bg-secondary/25 px-5 py-4">
    <p className="font-mono text-[15px] text-gold text-center">{children}</p>
    {note && <p className="text-[11px] font-mono text-muted-foreground text-center mt-2">{note}</p>}
  </div>
);

const Caution = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="my-5 rounded-xl border border-border/70 bg-card/40 px-4 py-3">
    <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold mb-1.5">{title}</p>
    <p className="text-[13px] leading-[1.75] text-foreground/70">{children}</p>
  </div>
);

const ToolLink = ({ label, note, to }: { label: string; note: string; to: string }) => (
  <Link
    to={to}
    className="group inline-flex items-start gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2 mr-2 mb-2 hover:border-gold/50 hover:bg-card/60 transition-all"
  >
    <span>
      <span className="block text-sm text-foreground group-hover:text-gold transition-colors">{label}</span>
      <span className="block text-[11px] text-foreground/55">{note}</span>
    </span>
    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-gold transition-colors mt-0.5 shrink-0" />
  </Link>
);

const LAB = "/s/behavior-lab";
const MICRO = "/s/behavior-microstructure";





export default function BehaviorTheory() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const biasAtlas = [
  { n: "B1", t: ({ zh: "过度自信", en: "Overconfidence" })[isEn ? "en" : "zh"], d: ({ zh: "高估信号精度与控制力，叠加自我归因后自我强化", en: "Overestimating signal precision and control, reinforced by self-attribution" })[isEn ? "en" : "zh"], out: ({ zh: "换手率上升、分散化不足、净 alpha 被交易成本吞噬", en: "Higher turnover, underdiversification, and trading costs consuming net alpha" })[isEn ? "en" : "zh"] },
  { n: "B2", t: ({ zh: "代表性", en: "Representativeness" })[isEn ? "en" : "zh"], d: ({ zh: "以相似性替代基准率，忽略样本量与均值回归", en: "Substituting similarity for base rates, ignoring sample size and mean reversion" })[isEn ? "en" : "zh"], out: ({ zh: "外推近期增长 → 成长股高估 → 长期反转", en: "Extrapolated growth → overvalued growth stocks → long-run reversal" })[isEn ? "en" : "zh"] },
  { n: "B3", t: ({ zh: "保守主义", en: "Conservatism" })[isEn ? "en" : "zh"], d: ({ zh: "对抽象统计信息更新过慢", en: "Updating too slowly in response to abstract statistical information" })[isEn ? "en" : "zh"], out: ({ zh: "盈余公告后漂移 PEAD、分析师预测粘性", en: "Post-earnings-announcement drift (PEAD), sticky analyst forecasts" })[isEn ? "en" : "zh"] },
  { n: "B4", t: ({ zh: "锚定与调整", en: "Anchoring and adjustment" })[isEn ? "en" : "zh"], d: ({ zh: "以任意起点为锚，调整幅度不足", en: "Anchoring on an arbitrary starting point and adjusting too little" })[isEn ? "en" : "zh"], out: ({ zh: "52 周高点效应、目标价粘着", en: "52-week-high effect, sticky price targets" })[isEn ? "en" : "zh"] },
  { n: "B5", t: ({ zh: "有限注意", en: "Limited attention" })[isEn ? "en" : "zh"], d: ({ zh: "注意力是稀缺资源，显著性决定信息进入价格的顺序", en: "Attention is scarce; salience determines when information enters prices" })[isEn ? "en" : "zh"], out: ({ zh: "周五公告反应弱、分心日漂移更长", en: "Weaker Friday-announcement reactions, longer drift on distracting days" })[isEn ? "en" : "zh"] },
  { n: "B6", t: ({ zh: "心理账户", en: "Mental accounting" })[isEn ? "en" : "zh"], d: ({ zh: "资金按来源与用途分账，违反可替代性", en: "Separating money by source and use, violating fungibility" })[isEn ? "en" : "zh"], out: ({ zh: "股利偏好、持有亏损仓位同时融资消费", en: "Dividend preference, borrowing to consume while holding losing positions" })[isEn ? "en" : "zh"] },
  { n: "B7", t: ({ zh: "处置效应", en: "Disposition effect" })[isEn ? "en" : "zh"], d: ({ zh: "参照点依赖 + 敏感性递减", en: "Reference dependence + diminishing sensitivity" })[isEn ? "en" : "zh"], out: ({ zh: "过早止盈、过久持亏，放大 PEAD", en: "Taking profits too soon, holding losses too long, amplifying PEAD" })[isEn ? "en" : "zh"] },
];
  const anomalies = [
  { a: ({ zh: "动量", en: "Momentum" })[isEn ? "en" : "zh"], beh: ({ zh: "信息缓慢扩散 + 趋势追随（HS）、自我归因（DHS）", en: "Slow information diffusion + trend following (HS), self-attribution (DHS)" })[isEn ? "en" : "zh"], rival: ({ zh: "风险载荷时变、拥挤交易溢价", en: "Time-varying risk loadings, crowded-trade premia" })[isEn ? "en" : "zh"] },
  { a: ({ zh: "长期反转", en: "Long-run reversal" })[isEn ? "en" : "zh"], beh: ({ zh: "代表性外推后的均值回归（BSV）", en: "Mean reversion after representative extrapolation (BSV)" })[isEn ? "en" : "zh"], rival: ({ zh: "价值因子、困境风险", en: "Value factor, distress risk" })[isEn ? "en" : "zh"] },
  { a: "PEAD", beh: ({ zh: "保守主义 + 有限注意", en: "Conservatism + limited attention" })[isEn ? "en" : "zh"], rival: ({ zh: "流动性与信息成本", en: "Liquidity and information costs" })[isEn ? "en" : "zh"] },
  { a: ({ zh: "彩票型股票低收益", en: "Low returns on lottery-like stocks" })[isEn ? "en" : "zh"], beh: ({ zh: "概率权重高估小概率大奖", en: "Probability weighting overvalues unlikely jackpots" })[isEn ? "en" : "zh"], rival: ({ zh: "杠杆约束下的 beta 套利", en: "Beta arbitrage under leverage constraints" })[isEn ? "en" : "zh"] },
  { a: ({ zh: "封闭式基金折价", en: "Closed-end fund discounts" })[isEn ? "en" : "zh"], beh: ({ zh: "散户情绪的直接代理", en: "A direct proxy for retail sentiment" })[isEn ? "en" : "zh"], rival: ({ zh: "费率、税负与流动性", en: "Fees, taxes, and liquidity" })[isEn ? "en" : "zh"] },
  { a: ({ zh: "IPO 长期跑输", en: "Long-run IPO underperformance" })[isEn ? "en" : "zh"], beh: ({ zh: "情绪窗口发行 + 择时", en: "Issuing in sentiment windows + market timing" })[isEn ? "en" : "zh"], rival: ({ zh: "样本与基准设定敏感", en: "Sensitivity to sample and benchmark choices" })[isEn ? "en" : "zh"] },
];

  return (
    <article className="container max-w-4xl px-6 pb-24">
      <header className="pt-4">
        <p className="text-[10px] font-mono tracking-[0.3em] text-gold uppercase">Reading Guide · V5.9</p>
        <h1 className="font-display text-3xl md:text-4xl text-foreground mt-3 leading-tight">
          {({ zh: "\n          行为金融导读：有限理性与有限套利\n        ", en: "A Guide to Behavioral Finance: Bounded Rationality and Limits to Arbitrage" })[isEn ? "en" : "zh"]}</h1>
        <p className="text-[15px] text-foreground/70 mt-4 leading-[1.85]">
          {({ zh: "\n          行为金融的核心不是宣布「投资者不理性」，而是把有限认知、情绪与社会互动放进定价、交易、公司决策与制度之中。\n          它的两根支柱是心理学意义的", en: "Behavioral finance is not about declaring investors irrational; it integrates limited cognition, emotions, and social interaction into pricing, trading, corporate decisions, and institutions. Its two pillars are psychological " })[isEn ? "en" : "zh"]}<strong className="text-foreground">{({ zh: "有限理性", en: "bounded rationality" })[isEn ? "en" : "zh"]}</strong>{({ zh: "与金融制度意义的\n          ", en: " and institutional " })[isEn ? "en" : "zh"]}<strong className="text-foreground">{({ zh: "有限套利", en: "limits to arbitrage" })[isEn ? "en" : "zh"]}</strong>{({ zh: "：前者说明偏差为何有方向，后者说明错价为何能持续。\n        ", en: ": the former explains why biases have direction; the latter why mispricing can persist." })[isEn ? "en" : "zh"]}</p>
        <div className="mt-5 rounded-xl border border-gold/30 bg-gold/5 px-5 py-4">
          <p className="text-[13px] font-mono text-foreground/80 leading-[1.9]">
            {({ zh: "\n            可检验的因果链条：心理机制 → 信念 / 偏好 / 注意力的扭曲 → 交易与公司决策 →\n            在特定套利约束下的价格与配置后果 → 与风险、数据挖掘和制度解释的竞争性检验。\n          ", en: "A testable causal chain: psychological mechanism → distorted beliefs / preferences / attention → trading and corporate decisions → pricing and allocation consequences under specific arbitrage constraints → competing tests against risk, data-mining, and institutional explanations." })[isEn ? "en" : "zh"]}</p>
        </div>
      </header>

      <H n="01" en="The Framing Question" zh={({ zh: "行为金融究竟在问什么", en: "What Is Behavioral Finance Actually Asking?" })[isEn ? "en" : "zh"]} />
      <P>
        {({ zh: "\n        传统基准由三层假设构成：偏好稳定连贯、按贝叶斯更新；约束下最大化期望效用；竞争性套利把价格推向基本面均衡。\n        行为金融不要求这些假设处处错误，它问的是：当它们作为", en: "The traditional benchmark has three layers: stable, coherent preferences and Bayesian updating; constrained expected-utility maximization; and competitive arbitrage pushing prices toward fundamental equilibrium. Behavioral finance does not claim these assumptions are always wrong. It asks what happens when they systematically fail as " })[isEn ? "en" : "zh"]}<strong className="text-foreground">{({ zh: "描述性前提", en: "descriptive premises" })[isEn ? "en" : "zh"]}</strong>{({ zh: "系统性失效时，价格、资源配置与公司政策会发生什么。\n      ", en: "—to prices, resource allocation, and corporate policies." })[isEn ? "en" : "zh"]}</P>
      <Eq note={({ zh: "把「行为」翻译成可观察变量，是全部实证工作的起点", en: "Translating behavior into observable variables is the starting point of empirical work" })[isEn ? "en" : "zh"]}>
        {({ zh: "\n        行为主体（偏好·信念·注意力） + 市场摩擦（风险·约束·制度） + 反馈机制 = 可检验的金融结果\n      ", en: "Agents (preferences · beliefs · attention) + Market frictions (risk · constraints · institutions) + Feedback = Testable financial outcomes" })[isEn ? "en" : "zh"]}</Eq>
      <Caution title={t("essays.behaviorTheory.label51", { defaultValue: "联合假设问题" })}>
        {({ zh: "\n        发现「异常收益」时，被同时检验的是市场效率与资产定价模型是否正确。Fama 对长期收益异常的回应指出，\n        过度反应与反应不足的证据大致并存，且结论对基准模型与统计方法高度敏感——单个异象不构成对效率市场的决定性证伪。\n      ", en: "Finding abnormal returns jointly tests market efficiency and the correctness of the asset-pricing model. Fama's response to long-run return anomalies notes roughly balanced evidence of overreaction and underreaction, with conclusions highly sensitive to benchmarks and statistical methods. A single anomaly does not decisively falsify efficient markets." })[isEn ? "en" : "zh"]}</Caution>

      <H n="02" en="Two Pillars" zh={({ zh: "两大支柱：有限理性与有限套利", en: "Two Pillars: Bounded Rationality and Limits to Arbitrage" })[isEn ? "en" : "zh"]} />
      <P>
        {({ zh: "\n        有限理性的关键不是「人会犯错」，而是错误具有", en: "Bounded rationality matters not simply because people make mistakes, but because those mistakes exhibit " })[isEn ? "en" : "zh"]}<strong className="text-foreground">{({ zh: "方向性、稳定性与情境依赖性", en: "direction, stability, and context dependence" })[isEn ? "en" : "zh"]}</strong>{({ zh: "：\n        信念偏差（过度自信、代表性、锚定、可得性）、偏好偏离（损失厌恶、概率加权、现时偏好、心理账户）、\n        注意力与社会机制（有限注意、显著性、从众、信息瀑布）。\n      ", en: ": belief biases (overconfidence, representativeness, anchoring, availability), preference departures (loss aversion, probability weighting, present bias, mental accounting), and attention and social mechanisms (limited attention, salience, conformity, information cascades)." })[isEn ? "en" : "zh"]}</P>
      <P>
        {({ zh: "\n        但偏差要影响价格，还须满足三个条件：偏差在主体间相关、影响足够大的边际交易者、反向交易受到约束。\n        第三条正是有限套利：专业套利者使用外部资金，面临赎回、保证金、业绩排名与职业声誉约束；当错价扩大而非收敛时，长期判断正确也可能被迫平仓。\n      ", en: "For biases to affect prices, three conditions must hold: they are correlated across agents, influence sufficiently important marginal traders, and face constrained countertrading. The third is limits to arbitrage: professionals using outside capital face redemptions, margin calls, performance rankings, and career concerns. When mispricing widens instead of converging, they may be forced to liquidate despite being right in the long run." })[isEn ? "en" : "zh"]}</P>
      <div className="mt-4">
        <ToolLink label={t("essays.behaviorTheory.label58", { defaultValue: "有限套利与被迫平仓" })} note={({ zh: "保证金 / 赎回敏感度 / 错价半衰期", en: "Margin / redemption sensitivity / mispricing half-life" })[isEn ? "en" : "zh"]} to={`${LAB}#limits`} />
        <ToolLink label={t("essays.behaviorTheory.label60", { defaultValue: "DSSW 噪声交易者 IRF" })} note={({ zh: "噪声交易者风险的持续性", en: "Persistence of noise-trader risk" })[isEn ? "en" : "zh"]} to={MICRO} />
      </div>

      <H n="03" en="Prospect Theory" zh={({ zh: "前景理论：行为金融的偏好基础", en: "Prospect Theory: The Preference Foundations of Behavioral Finance" })[isEn ? "en" : "zh"]} />
      <Eq note={({ zh: "r 是参照点，v(·) 为价值函数，π(·) 为决策权重", en: "r is the reference point, v(·) the value function, and π(·) the decision weight" })[isEn ? "en" : "zh"]}>
        V = Σᵢ π(pᵢ) · v(xᵢ − r)
      </Eq>
      <P>
        {({ zh: "\n        价值函数在收益域凹（敏感性递减、倾向锁定收益）、损失域凸（为避免确定损失而冒险）、损失侧更陡（损失厌恶 λ&gt;1）。\n        概率权重则高估小概率、低估高概率但非确定的结果，产生「四重风险态度」：\n        高概率收益风险厌恶、高概率损失风险寻求、低概率收益风险寻求、低概率损失风险厌恶。\n      ", en: "The value function is concave over gains (diminishing sensitivity and a tendency to lock in profits), convex over losses (risk-taking to avoid a certain loss), and steeper on the loss side (loss aversion λ>1). Probability weights overweight small probabilities and underweight high but uncertain probabilities, producing the fourfold pattern: risk aversion for high-probability gains, risk seeking for high-probability losses, risk seeking for low-probability gains, and risk aversion for low-probability losses." })[isEn ? "en" : "zh"]}</P>
      <P>
        {({ zh: "\n        市场含义：以买入价、历史高点或账户盈亏为参照点，会产生处置效应；\n        损失厌恶叠加频繁评估形成「短视损失厌恶」，可为股权溢价之谜提供一种行为解释；\n        小概率高收益被过度加权，则连接彩票型股票需求与保险需求。\n      ", en: "Market implications: purchase prices, historical highs, or account profit/loss as reference points produce the disposition effect. Loss aversion with frequent evaluation creates myopic loss aversion, a behavioral explanation for the equity-premium puzzle. Overweighting unlikely high payoffs links demand for lottery-like stocks and insurance." })[isEn ? "en" : "zh"]}</P>
      <div className="mt-4">
        <ToolLink label={t("essays.behaviorTheory.label66", { defaultValue: "累积前景理论 CPT" })} note={({ zh: "价值函数 / 概率权重 / 四重态度矩阵", en: "Value function / probability weighting / fourfold attitude matrix" })[isEn ? "en" : "zh"]} to={`${LAB}#cpt`} />
        <ToolLink label={t("essays.behaviorTheory.label68", { defaultValue: "短视损失厌恶" })} note={({ zh: "评估频率 → 隐含股权溢价", en: "Evaluation frequency → implied equity premium" })[isEn ? "en" : "zh"]} to={`${LAB}#mla`} />
        <ToolLink label={t("essays.behaviorTheory.label70", { defaultValue: "处置效应模拟" })} note={({ zh: "PGR / PLR 比率", en: "PGR / PLR ratio" })[isEn ? "en" : "zh"]} to={MICRO} />
      </div>
      <Caution title={t("essays.behaviorTheory.label72", { defaultValue: "局限" })}>
        {({ zh: "\n        参照点既非外生也不可直接观察，不同参照点导出不同预测；概率加权函数的形状与参数在不同实验、资产与时间尺度上并不稳定。\n        从实验室的单次选择外推到长期组合投资，需要额外论证。\n      ", en: "Reference points are neither exogenous nor directly observable, and different choices yield different predictions. Probability-weighting shapes and parameters vary across experiments, assets, and time scales. Extrapolating single laboratory choices to long-term portfolio investment requires further justification." })[isEn ? "en" : "zh"]}</Caution>

      <H n="04" en="Bias Atlas" zh={({ zh: "认知偏差图谱：从心理机制到交易后果", en: "Cognitive Bias Atlas: From Psychological Mechanisms to Trading Outcomes" })[isEn ? "en" : "zh"]} />
      <div className="space-y-2 mt-2">
        {biasAtlas.map((b) => (
          <div key={b.n} className="rounded-xl border border-border bg-card/40 px-4 py-3">
            <div className="flex items-baseline gap-3">
              <span className="text-[10px] font-mono text-gold">{b.n}</span>
              <span className="text-[15px] text-foreground">{b.t}</span>
            </div>
            <p className="text-[13px] text-foreground/70 mt-1 leading-[1.75]">{b.d}</p>
            <p className="text-[12px] font-mono text-muted-foreground mt-1">{({ zh: "市场后果：", en: "Market consequences: " })[isEn ? "en" : "zh"]}{b.out}</p>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <ToolLink label={t("essays.behaviorTheory.label76", { defaultValue: "过度自信换手率" })} note={({ zh: "k 膨胀 → 净 alpha 下降", en: "Inflated k → lower net alpha" })[isEn ? "en" : "zh"]} to={MICRO} />
        <ToolLink label={t("essays.behaviorTheory.label78", { defaultValue: "DHS 过度自信模型" })} note={({ zh: "自我归因 → 动量后反转", en: "Self-attribution → momentum followed by reversal" })[isEn ? "en" : "zh"]} to={`${LAB}#dhs`} />
      </div>

      <H n="05" en="Emotion, Herding, Contagion" zh={({ zh: "情绪、羊群与社会传染", en: "Emotion, Herding, and Social Contagion" })[isEn ? "en" : "zh"]} />
      <P>
        {({ zh: "\n        情绪不是认知偏差的附属品：恐惧与兴奋改变风险感知本身，而非只是改变计算精度。\n        群体层面上，理性的信息瀑布（后来者忽略私有信号、跟随公开行动）与委托代理下的声誉性从众，\n        都能在无人「非理性」的情况下产生羊群行为。社交媒体与零售投资者的注意力共振，则把这一机制的时间尺度压缩到了以小时计。\n      ", en: "Emotions are not merely an appendage to cognitive biases: fear and excitement change risk perception itself, not just computational accuracy. Rational information cascades (later agents ignoring private signals and following public actions) and delegated-management reputation concerns can generate herding without anyone being irrational. Social media and retail-attention resonance compress this mechanism's time scale to hours." })[isEn ? "en" : "zh"]}</P>

      <H n="06" en="Limits of Arbitrage & Noise Trading" zh={({ zh: "有限套利、噪声交易与错价的持续性", en: "Limits to Arbitrage, Noise Trading, and Persistent Mispricing" })[isEn ? "en" : "zh"]} />
      <P>
        {({ zh: "\n        纠偏的速度与规模是内生的：错价越难界定、替代证券越不匹配、卖空越受限、资金越短期化，偏差越可能成为均衡的一部分。\n        DSSW 进一步说明，噪声交易者风险本身就是一种风险——套利者担心错价在收敛前先扩大，因此不会以无限规模下注，噪声交易者反而可能获得更高的期望回报。\n      ", en: "The speed and scale of correction are endogenous: harder-to-identify mispricing, imperfect substitutes, tighter short-sale restrictions, and shorter funding horizons make biases more likely to enter equilibrium. DSSW shows that noise-trader risk is itself a risk: arbitrageurs fear mispricing widening before convergence and therefore do not bet without limit; noise traders may even earn higher expected returns." })[isEn ? "en" : "zh"]}</P>
      <div className="mt-4">
        <ToolLink label={t("essays.behaviorTheory.label84", { defaultValue: "有限套利实验" })} note={({ zh: "资本路径 / 被迫平仓临界点", en: "Capital paths / forced-liquidation thresholds" })[isEn ? "en" : "zh"]} to={`${LAB}#limits`} />
        <ToolLink label="Kyle & Glosten-Milgrom" note={({ zh: "信息如何通过订单流进入价格", en: "How information enters prices through order flow" })[isEn ? "en" : "zh"]} to={MICRO} />
      </div>

      <H n="07" en="Anomalies" zh={({ zh: "经典异象与竞争性解释", en: "Classic Anomalies and Competing Explanations" })[isEn ? "en" : "zh"]} />
      <div className="overflow-x-auto mt-2 rounded-xl border border-border">
        <table className="w-full text-[13px]">
          <thead className="bg-secondary/40">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-gold">{t("essays.behaviorTheory.label88", { defaultValue: "异象" })}</th>
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-gold">{t("essays.behaviorTheory.label89", { defaultValue: "行为机制" })}</th>
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-gold">{t("essays.behaviorTheory.label90", { defaultValue: "竞争性解释" })}</th>
            </tr>
          </thead>
          <tbody>
            {anomalies.map((r) => (
              <tr key={r.a} className="border-t border-border/60">
                <td className="px-4 py-2.5 text-foreground">{r.a}</td>
                <td className="px-4 py-2.5 text-foreground/70">{r.beh}</td>
                <td className="px-4 py-2.5 text-foreground/55">{r.rival}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <ToolLink label={t("essays.behaviorTheory.label91", { defaultValue: "BSV 信念模型" })} note={({ zh: "反应不足 → 过度反应 → 反转", en: "Underreaction → overreaction → reversal" })[isEn ? "en" : "zh"]} to={`${LAB}#bsv`} />
        <ToolLink label={t("essays.behaviorTheory.label93", { defaultValue: "Hong-Stein 缓慢扩散" })} note={({ zh: "无需个体偏差的动量", en: "Momentum without individual biases" })[isEn ? "en" : "zh"]} to={`${LAB}#hs`} />
        <ToolLink label={t("essays.behaviorTheory.label95", { defaultValue: "投资者情绪截面" })} note={({ zh: "难估值 / 难套利腿的后续收益", en: "Subsequent returns of hard-to-value / hard-to-arbitrage legs" })[isEn ? "en" : "zh"]} to={`${LAB}#sentiment`} />
      </div>

      <H n="08" en="Behavioral Corporate Finance" zh={({ zh: "行为公司金融：双向框架", en: "Behavioral Corporate Finance: A Two-Way Framework" })[isEn ? "en" : "zh"]} />
      <P>
        {({ zh: "\n        一个方向是「非理性管理者 + 理性市场」：过度自信的 CEO 高估自身项目、认为外部融资被低估，\n        表现为投资对内部现金流高度敏感、并购溢价过高、推迟行使自身期权。\n        另一个方向是「理性管理者 + 非理性市场」：管理者在市场高估时发行、低估时回购，\n        资本结构因此成为历史市值的累积产物，而非静态权衡的解。\n      ", en: "One direction is irrational managers with rational markets: overconfident CEOs overvalue their projects and believe external financing is underpriced, producing high investment–cash-flow sensitivity, excessive acquisition premia, and delayed exercise of personal options. The other is rational managers with irrational markets: issue when overpriced, repurchase when underpriced. Capital structure then accumulates past market valuations rather than solving a static trade-off." })[isEn ? "en" : "zh"]}</P>
      <div className="mt-4">
        <ToolLink label={t("essays.behaviorTheory.label99", { defaultValue: "管理者过度自信与市场时机" })} note={({ zh: "投资—现金流敏感性 / 杠杆演化", en: "Investment–cash-flow sensitivity / leverage dynamics" })[isEn ? "en" : "zh"]} to={`${LAB}#corporate`} />
      </div>
      <Caution title={t("essays.behaviorTheory.label101", { defaultValue: "识别难点" })}>
        {({ zh: "\n        投资—现金流敏感性同样可由融资约束解释；过度自信的代理变量可能捕捉的是私有信息而非偏差。\n        可信设计需要外生冲击、制度变化或高质量的管理者层面面板数据。\n      ", en: "Financing constraints can also explain investment–cash-flow sensitivity; overconfidence proxies may capture private information rather than bias. Credible designs require exogenous shocks, institutional changes, or high-quality manager-level panels." })[isEn ? "en" : "zh"]}</Caution>

      <H n="09" en="Frontier & Research Design" zh={({ zh: "前沿方向与研究设计守则", en: "Frontiers and Research-Design Principles" })[isEn ? "en" : "zh"]} />
      <P>
        {({ zh: "\n        当前的活跃边界包括：机构投资者是否真的更理性（委托代理可能把偏差放大而非消解）、\n        社交媒体与注意力驱动的零售交易、用机器学习识别行为模式并评估异象的可持续性（发表后衰减）、\n        行为宏观金融与信念外推驱动的信用周期，以及监管与投资者保护中的规范性问题（默认选项、助推与信息披露格式）。\n      ", en: "Active frontiers include whether institutions are truly more rational (delegation may amplify biases), social-media and attention-driven retail trading, machine learning to identify behavioral patterns and anomaly persistence (post-publication decay), behavioral macro-finance and extrapolative-belief credit cycles, and normative issues in regulation and investor protection (defaults, nudges, disclosure formats)." })[isEn ? "en" : "zh"]}</P>
      <div className="space-y-2 mt-4">
        {[
          [({ zh: "明确反事实与竞争机制", en: "Specify counterfactuals and competing mechanisms" })[isEn ? "en" : "zh"], ({ zh: "先写下「如果是风险解释，会看到什么」，再检验哪一个被数据拒绝", en: "First state what a risk explanation would predict, then test which prediction the data reject" })[isEn ? "en" : "zh"]],
          [({ zh: "测度不能只靠单一代理", en: "Do not rely on a single proxy" })[isEn ? "en" : "zh"], ({ zh: "情绪、注意力、过度自信都应有多个独立代理交叉验证", en: "Cross-validate sentiment, attention, and overconfidence with multiple independent proxies" })[isEn ? "en" : "zh"]],
          [({ zh: "把有限套利作为异质性检验", en: "Use limits to arbitrage as a heterogeneity test" })[isEn ? "en" : "zh"], ({ zh: "效应应在套利更难的截面更强，这是最有力的机制证据", en: "Effects should be stronger where arbitrage is harder—the strongest mechanism evidence" })[isEn ? "en" : "zh"]],
          [({ zh: "区分统计、经济与可交易显著", en: "Distinguish statistical, economic, and tradable significance" })[isEn ? "en" : "zh"], ({ zh: "扣除交易成本、容量约束与做空成本后是否还存在", en: "Does the effect survive trading costs, capacity constraints, and shorting costs?" })[isEn ? "en" : "zh"]],
          [({ zh: "追踪学习与制度变化", en: "Track learning and institutional change" })[isEn ? "en" : "zh"], ({ zh: "机制被削弱后效应应当减弱，否则更像数据挖掘", en: "Effects should weaken when their mechanism weakens; otherwise data mining is more plausible" })[isEn ? "en" : "zh"]],
        ].map(([title, d]) => (
          <div key={title} className="rounded-lg border border-border/60 bg-card/30 px-4 py-2.5">
            <p className="text-[14px] text-foreground">{title}</p>
            <p className="text-[12px] text-foreground/60 mt-0.5 leading-relaxed">{d}</p>
          </div>
        ))}
      </div>

      <div className="mt-14 rounded-2xl border border-border bg-card/40 p-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold mb-2">{({ zh: "学习路线图", en: "Learning Roadmap" })[isEn ? "en" : "zh"]}</p>
        <p className="text-[13px] text-foreground/70 leading-[1.9]">
          {({ zh: "\n          阶段一（2—4 周）建立规范基准：EMH、CAPM/多因子、联合假设问题。\n          阶段二（3—5 周）心理学微观基础：前景理论、启发式与偏差、实验方法。\n          阶段三（4—6 周）有限套利与均衡行为模型：DSSW、Shleifer-Vishny、BSV / DHS / HS。\n          阶段四（4—8 周）把理论映射到数据：事件研究、截面回归、情绪代理与机制检验。\n          阶段五（持续）行为公司金融与前沿：管理者偏差、市场时机、行为宏观金融。\n        ", en: "Stage 1 (2–4 weeks): Establish the normative benchmark—EMH, CAPM / multifactor models, and the joint-hypothesis problem. Stage 2 (3–5 weeks): Psychological microfoundations—prospect theory, heuristics and biases, experimental methods. Stage 3 (4–6 weeks): Limits to arbitrage and behavioral equilibrium models—DSSW, Shleifer–Vishny, BSV / DHS / HS. Stage 4 (4–8 weeks): Map theory to data—event studies, cross-sectional regressions, sentiment proxies, and mechanism tests. Stage 5 (ongoing): Behavioral corporate finance and frontiers—managerial biases, market timing, behavioral macro-finance." })[isEn ? "en" : "zh"]}</p>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card/60 p-4 text-[11px] font-mono text-muted-foreground leading-relaxed">
        <p className="text-gold uppercase tracking-wider mb-2">{({ zh: "参考文献", en: "References" })[isEn ? "en" : "zh"]}</p>
        <p>
          Fama (1998) Market Efficiency, Long-Term Returns, and Behavioral Finance · Shleifer &amp; Vishny (1997)
          The Limits of Arbitrage · Barberis, Shleifer &amp; Vishny (1998) · Hong &amp; Stein (1999) ·
          Kahneman &amp; Tversky (1979); Tversky &amp; Kahneman (1992) · Benartzi &amp; Thaler (1995) ·
          Odean (1998); Barber &amp; Odean (2001) · De Long, Shleifer, Summers &amp; Waldmann (1990) ·
          Baker &amp; Wurgler (2006, 2002) · Malmendier &amp; Tate (2005) · Barberis (2018) Psychology-Based Models of Asset Prices.
        </p>
      </div>
    </article>
  );
}
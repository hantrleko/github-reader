import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

/**
 * Reading guide for microeconomics: preferences → production → market
 * structure → games → information → mechanism design.
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

const LAB = "/s/micro";
const BEHAVIOR = "/s/behavior-theory";
const MICROSTRUCTURE = "/s/microstructure-theory";



export default function MicroTheory() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const structures = [
  { k: ({ zh: "完全竞争", en: "Perfect competition" })[isEn ? "en" : "zh"], d: ({ zh: "无穷多个体、同质产品、自由进出", en: "Infinitely many agents, homogeneous products, free entry and exit" })[isEn ? "en" : "zh"], p: ({ zh: "P = MC，长期经济利润为零", en: "P = MC; long-run economic profit is zero" })[isEn ? "en" : "zh"] },
  { k: ({ zh: "垄断", en: "Monopoly" })[isEn ? "en" : "zh"], d: ({ zh: "单一卖方与向下倾斜的需求曲线", en: "A single seller facing a downward-sloping demand curve" })[isEn ? "en" : "zh"], p: ({ zh: "MR = MC，加成由需求弹性决定", en: "MR = MC; the markup depends on demand elasticity" })[isEn ? "en" : "zh"] },
  { k: ({ zh: "垄断竞争", en: "Monopolistic competition" })[isEn ? "en" : "zh"], d: ({ zh: "差异化产品 + 自由进入", en: "Differentiated products + free entry" })[isEn ? "en" : "zh"], p: ({ zh: "P > MC 但长期利润仍被进入抹平", en: "P > MC, but entry still eliminates long-run profit" })[isEn ? "en" : "zh"] },
  { k: ({ zh: "寡头", en: "Oligopoly" })[isEn ? "en" : "zh"], d: ({ zh: "少数厂商、策略互动", en: "A few firms interacting strategically" })[isEn ? "en" : "zh"], p: ({ zh: "Cournot 产量竞争 / Bertrand 价格竞争结果迥异", en: "Cournot quantity competition / Bertrand price competition yield very different outcomes" })[isEn ? "en" : "zh"] },
];

  return (
    <article className="container max-w-4xl px-6 pb-24">
      <header className="pt-4">
        <p className="text-[10px] font-mono tracking-[0.3em] text-gold uppercase">Reading Guide · Microeconomics</p>
        <h1 className="font-display text-3xl md:text-4xl text-foreground mt-3 leading-tight">
          {({ zh: "\n          微观经济学导读：从偏好排序，到价格信号、策略互动与机制设计\n        ", en: "A Guide to Microeconomics: From Preferences to Price Signals, Strategic Interaction, and Mechanism Design" })[isEn ? "en" : "zh"]}</h1>
        <p className="text-[15px] text-foreground/70 mt-4 leading-[1.85]">
          {({ zh: "\n          微观经济学只研究一件事：\n          ", en: "Microeconomics studies one thing: " })[isEn ? "en" : "zh"]}<strong className="text-foreground">{({ zh: "在约束下做选择，以及这些选择如何在互动中汇总成价格与配置", en: "choosing under constraints, and how those choices interact to produce prices and allocations" })[isEn ? "en" : "zh"]}</strong>{({ zh: "。\n          金融里的每一个模型——效用最大化、风险溢价、做市商报价、信息不对称——都在这套语言里有原型。\n        ", en: ". Every financial model—utility maximization, risk premia, market-maker quotes, asymmetric information—has a prototype in this language." })[isEn ? "en" : "zh"]}</p>
        <div className="mt-6">
          <ToolLink label={t("essays.microTheory.label16", { defaultValue: "微观经济学实验室" })} note={({ zh: "供需均衡 · 消费者与生产者最优 · 市场结构", en: "Supply and demand · Consumer and producer optimization · Market structure" })[isEn ? "en" : "zh"]} to={LAB} />
        </div>
      </header>

      <H n="1" en="Preferences & Utility" zh={({ zh: "偏好与效用：选择的公理化基础", en: "Preferences and Utility: The Axiomatic Foundations of Choice" })[isEn ? "en" : "zh"]} />
      <P>
        {({ zh: "\n        效用函数不是「幸福感的度量」，它只是对一组满足完备性、传递性、连续性的偏好排序的数值表示。\n        这一点非常重要：效用是序数的，任何单调变换都表示同一个偏好，因此「效用翻倍」本身没有意义。\n      ", en: "A utility function is not a measure of happiness; it is a numerical representation of preferences satisfying completeness, transitivity, and continuity. Crucially, utility is ordinal: any monotonic transformation represents the same preferences, so ‘doubling utility’ is meaningless on its own." })[isEn ? "en" : "zh"]}</P>
      <Eq note={({ zh: "边际替代率等于价格比 —— 消费者最优的一阶条件", en: "The marginal rate of substitution equals the price ratio—the first-order condition for consumer optimization" })[isEn ? "en" : "zh"]}>
        MRS₁₂ = MU₁ / MU₂ = p₁ / p₂，s.t. p·x = m
      </Eq>
      <P>
        {({ zh: "\n        由此得到需求函数，并可将价格变化分解为替代效应（相对价格改变）与收入效应（实际购买力改变）。\n        Slutsky 分解正是后来资产定价里跨期替代与财富效应分离的原型。\n      ", en: "This yields demand functions and decomposes price changes into substitution effects (relative prices) and income effects (real purchasing power). The Slutsky decomposition foreshadows the separation of intertemporal substitution and wealth effects in asset pricing." })[isEn ? "en" : "zh"]}</P>
      <Caution title={t("essays.microTheory.label22", { defaultValue: "到金融的桥" })}>
        {({ zh: "\n        把商品换成「不同状态下的消费」，消费者最优条件就变成了随机贴现因子 m = δ·u′(c₁)/u′(c₀)——\n        资产定价方程 p = E[mx] 只是微观最优化的状态空间版本。\n      ", en: "Replace goods with consumption in different states, and the consumer's optimality condition becomes the stochastic discount factor m = δ·u′(c₁)/u′(c₀). The asset-pricing equation p = E[mx] is simply microeconomic optimization in state space." })[isEn ? "en" : "zh"]}</Caution>
      <ToolLink label={t("essays.microTheory.label24", { defaultValue: "消费者最优与需求" })} note={({ zh: "预算约束下的无差异曲线切点", en: "Indifference-curve tangency under a budget constraint" })[isEn ? "en" : "zh"]} to={LAB} />

      <H n="2" en="Production & Cost" zh={({ zh: "生产、成本与供给", en: "Production, Costs, and Supply" })[isEn ? "en" : "zh"]} />
      <P>
        {({ zh: "\n        厂商问题是同一套最优化的对偶面：给定技术（生产函数）与要素价格，先解成本最小化得到成本函数，\n        再解利润最大化得到供给。规模报酬决定长期成本曲线形状，也决定行业能否被少数厂商主导。\n      ", en: "The firm's problem is the dual side of the same optimization: given technology (the production function) and input prices, solve cost minimization to obtain the cost function, then profit maximization to obtain supply. Returns to scale determine the shape of long-run cost curves and whether a few firms can dominate an industry." })[isEn ? "en" : "zh"]}</P>
      <Eq note={({ zh: "竞争性厂商的供给条件；边际成本曲线在平均可变成本之上的部分即供给曲线", en: "Competitive supply: the marginal-cost curve above average variable cost is the supply curve" })[isEn ? "en" : "zh"]}>
        max π = p·q − C(q) ⟹ p = MC(q)
      </Eq>
      <P>
        {({ zh: "\n        沉没成本与固定成本的区别决定了短期停产点与长期退出点不同——这也是理解产能过剩与价格战的关键。\n      ", en: "The distinction between sunk and fixed costs separates the short-run shutdown point from the long-run exit point—a key to understanding excess capacity and price wars." })[isEn ? "en" : "zh"]}</P>

      <H n="3" en="Market Structure" zh={({ zh: "市场结构：从完全竞争到寡头", en: "Market Structure: From Perfect Competition to Oligopoly" })[isEn ? "en" : "zh"]} />
      <div className="my-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-secondary/40 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">{t("essays.microTheory.label31", { defaultValue: "结构" })}</th>
              <th className="px-4 py-3">{t("essays.microTheory.label32", { defaultValue: "条件" })}</th>
              <th className="px-4 py-3">{t("essays.microTheory.label33", { defaultValue: "定价结果" })}</th>
            </tr>
          </thead>
          <tbody>
            {structures.map((s) => (
              <tr key={s.k} className="border-t border-border/60 align-top">
                <td className="px-4 py-3 font-mono text-gold whitespace-nowrap">{s.k}</td>
                <td className="px-4 py-3 text-foreground/80">{s.d}</td>
                <td className="px-4 py-3 text-foreground/60">{s.p}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Eq note={({ zh: "Lerner 指数：加成幅度由需求弹性倒数决定", en: "Lerner index: the markup equals inverse demand elasticity" })[isEn ? "en" : "zh"]}>
        (P − MC) / P = 1 / |ε|
      </Eq>
      <ToolLink label={t("essays.microTheory.label35", { defaultValue: "市场结构对比" })} note={({ zh: "Cournot / Bertrand 与垄断加成", en: "Cournot / Bertrand and monopoly markups" })[isEn ? "en" : "zh"]} to={LAB} />

      <H n="4" en="Games & Strategy" zh={({ zh: "博弈与策略互动", en: "Games and Strategic Interaction" })[isEn ? "en" : "zh"]} />
      <P>
        {({ zh: "\n        当参与者足够少，价格不再是外生的：每个人的最优反应依赖别人的选择。纳什均衡是「没有人愿意单方面偏离」的状态，\n        而非「集体最优」——囚徒困境正是二者背离的最小例子。\n      ", en: "With sufficiently few participants, prices are no longer exogenous: each best response depends on others' choices. A Nash equilibrium is a state where nobody wants to deviate unilaterally, not a collective optimum—the prisoner's dilemma is the simplest example of that gap." })[isEn ? "en" : "zh"]}</P>
      <P>
        {({ zh: "\n        动态博弈要用子博弈完美均衡（逆向归纳）剔除不可置信威胁；重复博弈则说明为何长期关系能支撑合作，\n        这正是做市商声誉、清算所违约管理与承销关系的理论基础。\n      ", en: "Dynamic games use subgame-perfect equilibrium (backward induction) to eliminate noncredible threats; repeated games explain why long-term relationships sustain cooperation. This underpins market-maker reputation, clearinghouse default management, and underwriting relationships." })[isEn ? "en" : "zh"]}</P>

      <H n="5" en="Information Asymmetry" zh={({ zh: "信息不对称：逆向选择与道德风险", en: "Asymmetric Information: Adverse Selection and Moral Hazard" })[isEn ? "en" : "zh"]} />
      <P>
        {({ zh: "\n        信息经济学是微观与金融交叉最密的地带。\n        ", en: "Information economics is where microeconomics and finance overlap most closely. " })[isEn ? "en" : "zh"]}<strong className="text-foreground">{({ zh: "逆向选择", en: "Adverse selection" })[isEn ? "en" : "zh"]}</strong>{({ zh: "发生在签约之前（柠檬市场：低质量把高质量挤出去），\n        ", en: " occurs before contracting (the lemons market: low quality drives out high quality); " })[isEn ? "en" : "zh"]}<strong className="text-foreground">{({ zh: "道德风险", en: "moral hazard" })[isEn ? "en" : "zh"]}</strong>{({ zh: "发生在签约之后（行为不可观测导致努力不足或过度冒险）。\n      ", en: " occurs after contracting (unobservable actions cause insufficient effort or excessive risk-taking)." })[isEn ? "en" : "zh"]}</P>
      <Eq note={({ zh: "信号传递要求成本单交叉：高类型付出的信号成本更低", en: "Signaling requires single-crossing costs: high types pay less to signal" })[isEn ? "en" : "zh"]}>
        {({ zh: "\n        分离均衡存在 ⟺ ∂²c(s,θ)/∂s∂θ &lt; 0\n      ", en: "A separating equilibrium exists ⟺ ∂²c(s,θ)/∂s∂θ < 0" })[isEn ? "en" : "zh"]}</Eq>
      <P>
        {({ zh: "\n        对应的三条解法：信号传递（教育、股利、抵押）、筛选（保险自付额、贷款条款菜单）、激励合约（股权、递延奖金）。\n        市场微观结构里的买卖价差，本质就是做市商对逆向选择的定价。\n      ", en: "Three corresponding solutions are signaling (education, dividends, collateral), screening (insurance deductibles, loan-contract menus), and incentive contracts (equity, deferred bonuses). In market microstructure, the bid–ask spread fundamentally prices the market maker's adverse-selection exposure." })[isEn ? "en" : "zh"]}</P>
      <div>
        <ToolLink label={t("essays.microTheory.label49", { defaultValue: "做市商与信息不对称" })} note={({ zh: "Glosten-Milgrom 的价差即逆向选择成本", en: "Glosten–Milgrom: the spread is the cost of adverse selection" })[isEn ? "en" : "zh"]} to={MICROSTRUCTURE} />
        <ToolLink label={t("essays.microTheory.label51", { defaultValue: "行为金融导读" })} note={({ zh: "当理性假设被放松后会发生什么", en: "What happens when rationality assumptions are relaxed" })[isEn ? "en" : "zh"]} to={BEHAVIOR} />
      </div>

      <H n="6" en="Welfare & Mechanism Design" zh={({ zh: "福利与机制设计", en: "Welfare and Mechanism Design" })[isEn ? "en" : "zh"]} />
      <P>
        {({ zh: "\n        两条福利定理界定了市场的能力边界：竞争均衡是帕累托有效的（第一定理），任何帕累托有效配置都能通过初始禀赋再分配加市场实现（第二定理）。\n        它们的前提——完全竞争、无外部性、无公共品、信息完全——恰好列出了所有市场失灵的清单。\n      ", en: "The two welfare theorems define the market's limits: competitive equilibrium is Pareto efficient (the first theorem), and any Pareto-efficient allocation can be implemented through initial-endowment redistribution and markets (the second). Their assumptions—perfect competition, no externalities, no public goods, and complete information—list precisely the sources of market failure." })[isEn ? "en" : "zh"]}</P>
      <P>
        {({ zh: "\n        机制设计把问题反过来问：给定人们会策略性谎报，如何设计规则让说真话成为最优？\n        Vickrey 二价拍卖、双边拍卖的开盘集合竞价、频谱拍卖都是这一思想的落地。\n      ", en: "Mechanism design reverses the question: knowing people may strategically misreport, how can rules make truth-telling optimal? Vickrey second-price auctions, opening call auctions, and spectrum auctions put this idea into practice." })[isEn ? "en" : "zh"]}</P>
      <Caution title={t("essays.microTheory.label56", { defaultValue: "研究流程" })}>
        {({ zh: "\n        分析任何微观问题按五步走：① 谁是参与者、行动集是什么；② 目标函数与约束；③ 均衡概念（竞争 / 纳什 / 贝叶斯纳什）；\n        ④ 比较静态（参数变动的方向）；⑤ 福利评价与政策含义。\n      ", en: "Analyze any microeconomic problem in five steps: ① Identify participants and action sets; ② Specify objectives and constraints; ③ Choose an equilibrium concept (competitive / Nash / Bayesian Nash); ④ Perform comparative statics (the direction of parameter effects); ⑤ Evaluate welfare and policy implications." })[isEn ? "en" : "zh"]}</Caution>
      <div className="mt-6">
        <ToolLink label={t("essays.microTheory.label58", { defaultValue: "进入微观经济学实验室" })} note={({ zh: "把上面每一节的比较静态调一遍", en: "Explore comparative statics for every section above" })[isEn ? "en" : "zh"]} to={LAB} />
      </div>
    </article>
  );
}

import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Structured reading guide for market microstructure (V6.1).
 * Chain: object & core questions → market organisation → inventory vs information →
 * limit order book → liquidity measurement → price discovery → HFT & market design →
 * history & frontier → research design checklist.
 */

const H = ({ n, en, zh }: { n: string; en: string; zh: string }) => (
  <div className="flex items-baseline gap-3 mt-14 mb-5 border-b border-border/50 pb-3">
    <span className="text-[10px] font-mono tracking-[0.3em] text-gold">PART {n}</span>
    <h3 className="font-display text-2xl md:text-[26px] text-foreground leading-tight">{zh}</h3>
    <span className="ml-auto text-[11px] font-mono text-muted-foreground hidden md:inline">{en}</span>
  </div>
);

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

const LAB = "/s/microstructure-lab";
const CLASSIC = "/s/behavior-microstructure";

const eras = [
  { y: "1968–1980", s: { zh: "存货范式", en: "Inventory Paradigm" }, core: { zh: "Demsetz 即时性价格、Garman 存货流、Stoll / Ho-Stoll 最优报价", en: "Demsetz's price of immediacy, Garman's inventory flow, Stoll / Ho-Stoll optimal quotes" }, legacy: { zh: "价差是做市商承担库存风险的补偿", en: "The spread is compensation for the dealer's inventory risk" } },
  { y: "1985–1996", s: { zh: "信息范式", en: "Information Paradigm" }, core: { zh: "Kyle 连续拍卖、Glosten-Milgrom 序贯交易、Easley-O'Hara PIN", en: "Kyle's continuous auction, Glosten-Milgrom sequential trading, Easley-O'Hara PIN" }, legacy: { zh: "价差是对逆向选择的定价, 交易本身携带信息", en: "The spread prices adverse selection; trades themselves carry information" } },
  { y: "1993–2005", s: { zh: "度量与实证", en: "Measurement & Empirics" }, core: { zh: "Roll 隐含价差、有效/已实现价差分解、Hasbrouck 信息份额、Amihud 非流动性", en: "Roll's implied spread, effective/realized spread decomposition, Hasbrouck information share, Amihud illiquidity" }, legacy: { zh: "流动性成为可测量、可比较的变量", en: "Liquidity became a measurable, comparable variable" } },
  { y: "2000–2010", s: { zh: "限价订单簿", en: "Limit Order Book" }, core: { zh: "make-or-take 决策、排队价值、零智能仿真、Hawkes 自激", en: "Make-or-take decisions, queue value, zero-intelligence simulation, Hawkes self-excitation" }, legacy: { zh: "报价驱动 → 订单驱动市场的建模语言", en: "The modeling language shifted from quote-driven to order-driven markets" } },
  { y: "2010–", s: { zh: "高频与市场设计", en: "HFT & Market Design" }, core: { zh: "VPIN 与闪崩、tick size 试点、熔断、暗池分流、批量拍卖", en: "VPIN and the Flash Crash, tick-size pilots, circuit breakers, dark-pool fragmentation, batch auctions" }, legacy: { zh: "微观规则如何塑造宏观流动性与韧性", en: "How micro rules shape macro liquidity and resilience" } },
];

const measures = [
  { k: { zh: "报价价差", en: "Quoted spread" }, d: { zh: "Ask − Bid", en: "Ask − Bid" }, pit: { zh: "只反映挂牌意愿, 大单实际成交往往更差", en: "Reflects only posted intent; large orders usually fill worse" } },
  { k: { zh: "有效价差", en: "Effective spread" }, d: { zh: "2·D·(P − M)", en: "2·D·(P − M)" }, pit: { zh: "捕捉真实成交位置, 但需要正确的成交方向标注", en: "Captures the true execution location, but needs correct trade-signing" } },
  { k: { zh: "已实现价差", en: "Realized spread" }, d: { zh: "2·D·(P − M₊τ)", en: "2·D·(P − M₊τ)" }, pit: { zh: "做市商的事后毛利, 对 τ 的选择敏感", en: "The dealer's ex-post gross profit; sensitive to the choice of τ" } },
  { k: { zh: "价格冲击", en: "Price impact" }, d: { zh: "2·D·(M₊τ − M)", en: "2·D·(M₊τ − M)" }, pit: { zh: "逆向选择成分; 有效 = 已实现 + 冲击 是恒等式", en: "The adverse-selection component; effective = realized + impact is an identity" } },
  { k: { zh: "Amihud", en: "Amihud" }, d: { zh: "|r| / 成交额", en: "|r| / dollar volume" }, pit: { zh: "低频可得但混杂波动率, 跨市场不可直接比较", en: "Available at low frequency but mixes in volatility; not directly comparable across markets" } },
];

export default function MicrostructureTheory() {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const L = (o: { zh: string; en: string }) => (isEn ? o.en : o.zh);

  return (
    <article className="container max-w-4xl px-6 pb-24">
      <header className="pt-4">
        <p className="text-[10px] font-mono tracking-[0.3em] text-gold uppercase">Reading Guide · V6.1</p>
        <h1 className="font-display text-3xl md:text-4xl text-foreground mt-3 leading-tight">
          {isEn
            ? "Market Microstructure Reading Guide: From Dealer Inventory to Order Books, Price Discovery and Market Design"
            : "市场微观结构导读：从做市商库存，到订单簿、价格发现与市场设计"}
        </h1>
        <p className="text-[15px] text-foreground/70 mt-4 leading-[1.85]">
          {isEn ? (
            <>
              Asset pricing tells you “what the price should be”; microstructure answers
              <strong className="text-foreground">“how the price is made, who bears the cost, and how fast information gets reflected”</strong>.
              It treats the trading mechanism itself as the object of study: matching rules, tick sizes, order types and trader composition all change the price you see on screen.
            </>
          ) : (
            <>
              资产定价告诉你「价格应该是多少」，微观结构回答的是
              <strong className="text-foreground">「价格如何被造出来、由谁承担成本、以多快的速度反映信息」</strong>。
              它把交易机制本身当作研究对象：撮合规则、报价单位、订单类型与交易者构成，都会改变你在屏幕上看到的价格。
            </>
          )}
        </p>
        <div className="mt-6">
          <ToolLink label={isEn ? "Microstructure Lab" : "微观结构实验室"} note={isEn ? "17 interactive panels · inventory / information / order book / costs / market design" : "17 个交互面板 · 库存 / 信息 / 订单簿 / 成本 / 市场设计"} to={LAB} />
          <ToolLink label={isEn ? "Behavior & Microstructure (Classic)" : "行为 & 微观结构 (经典)"} note="Kyle · Glosten-Milgrom · Roll · Almgren-Chriss · Amihud" to={CLASSIC} />
        </div>
      </header>

      <H n="1" en="Object & Four Core Questions" zh={isEn ? "The Object of Study: Four Unavoidable Questions" : "学科对象：四个绕不开的问题"} />
      <P>
        {isEn
          ? "Microstructure studies “how prices and volumes form under a given trading mechanism.” It repeatedly answers four questions: where liquidity comes from and how it is priced; how fast private information enters prices; who bears transaction costs and how they decompose; and how the design of trading rules changes the first three."
          : "微观结构研究「在给定交易机制下，价格与交易量如何形成」。它反复回答四个问题：流动性从哪里来并如何定价；私人信息以多快的速度进入价格；交易成本由谁承担、如何拆解；交易规则的设计如何改变前三者。"}
      </P>
      <Eq note={isEn ? "The price deviation of any trade can be decomposed into these three blocks" : "任何一笔成交的价格偏离都可以拆成这三块"}>
        {isEn
          ? "spread = order-processing cost + inventory-risk compensation + adverse-selection cost"
          : "价差 = 订单处理成本 + 库存风险补偿 + 逆向选择成本"}
      </Eq>
      <P>
        {isEn
          ? "This decomposition is the skeleton of the whole field: the inventory paradigm explains the second term, the information paradigm explains the third, and market design studies how to compress the first without amplifying the other two."
          : "这条分解是全学科的骨架：存货范式解释第二项，信息范式解释第三项，市场设计研究如何压低第一项而不放大后两项。"}
      </P>
      <ToolLink label={isEn ? "Stoll Three-Component Decomposition" : "Stoll 三成分分解"} note={isEn ? "Split the spread into three blocks using serial covariance" : "用序列协方差把价差拆成三块"} to={LAB} />

      <H n="2" en="Market Organisation" zh={isEn ? "How Markets Are Organised: Quote-Driven vs Order-Driven" : "市场是怎么组织的：报价驱动 vs 订单驱动"} />
      <P>
        {isEn
          ? "In quote-driven markets (dealer markets), designated market makers quote both sides and absorb order flow with their own inventory; in order-driven markets (limit order books), all participants submit limit orders that form a price–quantity ladder, matched by price-time priority. Most markets today are hybrids: a continuous limit book + market-making obligations + opening/closing call auctions + off-exchange dark pools."
          : "报价驱动市场（做市商制）由指定做市商双边报价、以自有库存承接订单流；订单驱动市场（限价订单簿）由所有参与者提交限价单构成价格—数量阶梯，价格优先、时间优先撮合。今天多数市场是混合体：连续限价簿 + 做市义务 + 开收盘集合竞价 + 场外暗池。"}
      </P>
      <Caution title={isEn ? "The mechanism determines what is observable" : "机制决定可观测量"}>
        {isEn
          ? "The “spread” of the same stock in a dealer market and in an order-book market is not the same thing: the former is the dealer's willingness to quote, the latter a function of queue depth. Before comparing liquidity across markets, confirm the matching mechanism and data conventions."
          : "同一只股票在做市商市场与订单簿市场的「价差」并不是同一个东西：前者是做市商的报价意愿，后者是队列深度的函数。跨市场比较流动性前，先确认撮合机制与数据口径。"}
      </Caution>

      <H n="3" en="Inventory vs Information" zh={isEn ? "Two Classic Lines: Inventory and Information" : "两条经典线：库存与信息"} />
      <P>
        {isEn ? (
          <>
            <strong className="text-foreground">The inventory line</strong> (Garman, Stoll, Ho-Stoll) treats the market maker as a risk-averse inventory manager:
            when inventory deviates from target, he “skews” the whole quote to attract offsetting orders; the spread compensates for price risk over the holding period.
          </>
        ) : (
          <>
            <strong className="text-foreground">库存线</strong>（Garman、Stoll、Ho-Stoll）把做市商看成风险厌恶的存货管理者：
            库存偏离目标时，他把报价整体「歪斜」以吸引反向订单，价差补偿的是持仓期的价格风险。
          </>
        )}
      </P>
      <Eq note={isEn ? "Ho-Stoll: the further inventory I deviates from target, the larger the quote-midpoint shift" : "Ho-Stoll：库存 I 越偏离目标, 报价中枢偏移越大"}>
        {isEn
          ? "midpoint shift ≈ −γ σ² T · (I − I*), spread ≈ c + γ σ² T q"
          : "中枢偏移 ≈ −γ σ² T · (I − I*)，价差 ≈ c + γ σ² T q"}
      </Eq>
      <P>
        {isEn ? (
          <>
            <strong className="text-foreground">The information line</strong> (Kyle, Glosten-Milgrom) treats the market maker as a Bayesian learner: he cannot distinguish informed from noise traders
            and can only update beliefs on the event of “being bought from.” The spread prices adverse selection under competitive zero profit, and the price impact λ is the price of information.
          </>
        ) : (
          <>
            <strong className="text-foreground">信息线</strong>（Kyle、Glosten-Milgrom）把做市商看成贝叶斯学习者：他无法区分知情与噪声交易者，
            只能对「被买走」这一事件更新信念。价差是在竞争性零利润条件下对逆向选择的定价，价格冲击 λ 是信息的价格。
          </>
        )}
      </P>
      <Eq note={isEn ? "Kyle's λ: the informed trader's optimal order size and market depth are reciprocals" : "Kyle λ：知情交易者的最优下单量与市场深度互为倒数"}>
        {isEn
          ? "λ = σᵥ / (2 σᵤ), depth 1/λ rises with noise-trading volume"
          : "λ = σᵥ / (2 σᵤ)，深度 1/λ 随噪声交易量上升"}
      </Eq>
      <div className="mt-2">
        <ToolLink label={isEn ? "Ho-Stoll Quote Shifts" : "Ho-Stoll 报价偏移"} note={isEn ? "How inventory skews two-sided quotes" : "库存如何歪斜双边报价"} to={LAB} />
        <ToolLink label={isEn ? "PIN Estimation" : "PIN 估计"} note={isEn ? "Invert α, μ, ε from the EHO likelihood" : "EHO 似然反解 α, μ, ε"} to={LAB} />
        <ToolLink label={isEn ? "VPIN Time Series" : "VPIN 时序"} note={isEn ? "Order-flow toxicity in volume buckets" : "成交量桶下的订单流毒性"} to={LAB} />
      </div>

      <H n="4" en="Limit Order Book" zh={isEn ? "The Limit Order Book: The Language of Modern Markets" : "限价订单簿：现代市场的语言"} />
      <P>
        {isEn ? (
          <>
            In an order-book world, the trader's first decision is not buy or sell but <strong className="text-foreground">make or take</strong>:
            submitting a limit order is like selling a free “option to be filled” — you earn the spread and rebates, but bear non-execution risk and the risk of being run over by informed orders;
            a market order pays the immediacy cost for certain execution. Queue position, cancellation intensity and trade clustering (Hawkes self-excitation) jointly determine the value of this option.
          </>
        ) : (
          <>
            在订单簿世界里，交易者的第一决策不是买或卖，而是 <strong className="text-foreground">make or take</strong>：
            提交限价单等于免费卖出一个「被成交」的期权——赚回价差与返佣，但承担不成交风险与被知情单打穿的风险；
            市价单支付即时性成本换确定执行。排队位置、撤单强度与成交聚集（Hawkes 自激）共同决定这个期权的价值。
          </>
        )}
      </P>
      <Caution title={isEn ? "Zero intelligence also generates realistic shapes" : "零智能也能生成真实形状"}>
        {isEn
          ? "A purely random order book with three Poisson flows — limit orders, market orders, cancellations — already reproduces the empirical spread distribution and the “hump-shaped” depth curve. Many supposedly “strategic” patterns actually come from the mechanism's constraints themselves; don't mistake mechanism assumptions for behavioral findings."
          : "限价单 / 市价单 / 撤单三条泊松流的纯随机订单簿，就能复现实证中价差分布与「驼峰形」深度曲线。这说明许多所谓「策略性」的形态其实来自机制约束本身，别把机制假设当成行为发现。"}
      </Caution>
      <div>
        <ToolLink label={isEn ? "Make-or-Take Decision" : "make-or-take 决策"} note={isEn ? "Limit-order option value vs market-order cost" : "限价单期权价值 vs 市价单成本"} to={LAB} />
        <ToolLink label={isEn ? "Zero-Intelligence Book Simulation" : "零智能订单簿仿真"} note={isEn ? "Mechanism-generated spreads and depth" : "价差与深度的机制生成"} to={LAB} />
        <ToolLink label={isEn ? "Hawkes Self-Exciting Intensity" : "Hawkes 自激强度"} note={isEn ? "Trade clustering and liquidity droughts" : "成交聚集与流动性枯竭"} to={LAB} />
      </div>

      <H n="5" en="Measuring Liquidity" zh={isEn ? "Liquidity and Costs: A Checklist of Measurement Pitfalls" : "流动性与成本：口径陷阱清单"} />
      <div className="my-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-secondary/30">
            <tr className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">{isEn ? "Measure" : "度量"}</th>
              <th className="px-4 py-3">{isEn ? "Definition" : "定义"}</th>
              <th className="px-4 py-3">{isEn ? "Pitfall" : "陷阱"}</th>
            </tr>
          </thead>
          <tbody>
            {measures.map((m) => (
              <tr key={m.k.zh} className="border-t border-border/60 align-top">
                <td className="px-4 py-3 text-foreground">{L(m.k)}</td>
                <td className="px-4 py-3 font-mono text-foreground/70">{L(m.d)}</td>
                <td className="px-4 py-3 text-foreground/60">{L(m.pit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <P>
        {isEn
          ? "With only daily data, Roll infers the spread from the negative autocovariance of adjacent returns, and Corwin-Schultz infers it from high-low price ratios; both fail under strong trends or frequent jumps (positive covariance → Roll has no solution). Trade-signing algorithms (Lee-Ready, tick rule) themselves have 5%–20% misclassification rates, which systematically bias estimated impact components downward."
          : "当只有日频数据时，Roll 用相邻收益的负自协方差反解价差，Corwin-Schultz 用高低价比推断价差；两者在趋势强或跳跃多时会失效（协方差为正 → Roll 无解）。成交方向标注（Lee-Ready、tick rule）本身有 5%–20% 误判率，会系统性压低估计的冲击成分。"}
      </P>
      <div>
        <ToolLink label={isEn ? "Effective/Realized Spread Waterfall" : "有效/已实现价差瀑布"} note={isEn ? "Identity check: effective = realized + impact" : "有效 = 已实现 + 冲击 的恒等式检查"} to={LAB} />
        <ToolLink label={isEn ? "Corwin-Schultz & Roll" : "Corwin-Schultz & Roll"} note={isEn ? "Low-frequency proxies and their failure conditions" : "低频代理与失效条件"} to={LAB} />
        <ToolLink label={isEn ? "Square-Root Impact Law" : "平方根冲击定律"} note={isEn ? "impact ∝ σ√(Q/V) and the Almgren calibration" : "impact ∝ σ√(Q/V) 与 Almgren 校准"} to={LAB} />
      </div>

      <H n="6" en="Price Discovery" zh={isEn ? "Price Discovery: Who Learns the Price First" : "价格发现：谁先知道价格"} />
      <P>
        {isEn
          ? "When the same asset trades in multiple venues (spot and futures, multiple exchanges, ADR and home shares), the common efficient price is the same random walk. Hasbrouck's information share measures each market's contribution to the innovation variance of that random walk; Gonzalo-Granger's common-factor weights measure each market's weight in the long-run equilibrium. The two give different answers: the former is contaminated by contemporaneous correlation and only yields bounds; the latter ignores noise size. Report both."
          : "同一资产在多个场所交易时（现货与期货、多交易所、ADR 与本地股），共同有效价格是同一个随机游走，Hasbrouck 信息份额度量各市场对该随机游走创新方差的贡献，Gonzalo-Granger 共同因子权重度量各市场在长期均衡中的权重。两者答案不同：前者受同期相关污染只能给上下界，后者忽略噪声大小。报告结果时两个都给。"}
      </P>
      <Eq note={isEn ? "A trade's information content = permanent impact as a share of total impact" : "交易的信息含量 = 永久冲击占全部冲击的比例"}>
        {isEn
          ? "permanent / (permanent + transitory) → the higher, the more “informed” the flow"
          : "永久冲击 / (永久 + 临时冲击) → 越高说明该笔流动越「知情」"}
      </Eq>
      <ToolLink label={isEn ? "Hasbrouck Information Share" : "Hasbrouck 信息份额"} note={isEn ? "Upper/lower bounds + Gonzalo-Granger weights" : "上下界 + Gonzalo-Granger 权重"} to={LAB} />

      <H n="7" en="HFT & Market Design" zh={isEn ? "High-Frequency Trading and Market Design: Rules as Variables" : "高频交易与市场设计：规则即变量"} />
      <P>
        {isEn
          ? "The most practical part of microstructure treats trading rules as tunable parameters: a tick size too large inflates spreads, too small weakens the queueing incentive from time priority; call auctions sacrifice immediacy for more concentrated price discovery; circuit breakers and volatility interruptions cut feedback loops in extreme markets but may trigger “magnet effects”; dark pools divert undisplayed liquidity, improving large-order execution while weakening displayed-book depth and price-discovery quality."
          : "微观结构最实用的部分是把交易规则当成可调参数：最小报价单位（tick size）过大抬高价差、过小削弱时间优先带来的排队激励；集合竞价以牺牲即时性换取更集中的价格发现；熔断与波动中断在极端行情下切断反馈但可能引发「磁吸效应」；暗池分流未显示流动性，改善大单执行却削弱显示簿的深度与价格发现质量。"}
      </P>
      <Caution title={isEn ? "Resilience matters more than the spread" : "韧性比价差更重要"}>
        {isEn
          ? "In a crisis, what determines losses is not the usual spread but how fast liquidity recovers after a shock (the resilience half-life). Monitoring “how long until depth recovers to 50% of pre-shock” is more informative than staring at the average daily spread."
          : "危机时决定损失的不是平时的价差，而是流动性被冲击后恢复的速度（韧性半衰期）。把「深度恢复到冲击前 50% 需要多久」纳入常规监控，比盯着日均价差更有信息量。"}
      </Caution>
      <div>
        <ToolLink label={isEn ? "Tick-Size Mechanism Effects" : "Tick size 机制效应"} note={isEn ? "Spread / queueing / depth trade-offs" : "价差 / 排队 / 深度权衡"} to={LAB} />
        <ToolLink label={isEn ? "Call Auction vs Continuous Trading" : "集合竞价 vs 连续交易"} note={isEn ? "Price-discovery efficiency compared" : "价格发现效率对比"} to={LAB} />
        <ToolLink label={isEn ? "Circuit Breakers & Dark-Pool Diversion" : "熔断与暗池分流"} note={isEn ? "Trigger simulation and the effect on displayed liquidity" : "触发仿真与显示流动性影响"} to={LAB} />
      </div>

      <H n="8" en="History & Frontier" zh={isEn ? "Historical Arc and Contemporary Frontiers" : "历史脉络与当代前沿"} />
      <div className="my-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-secondary/30">
            <tr className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">{isEn ? "Period" : "时期"}</th>
              <th className="px-4 py-3">{isEn ? "Paradigm" : "范式"}</th>
              <th className="px-4 py-3">{isEn ? "Core contributions" : "核心贡献"}</th>
              <th className="px-4 py-3">{isEn ? "Legacy" : "遗产"}</th>
            </tr>
          </thead>
          <tbody>
            {eras.map((e) => (
              <tr key={e.y} className="border-t border-border/60 align-top">
                <td className="px-4 py-3 font-mono text-gold whitespace-nowrap">{e.y}</td>
                <td className="px-4 py-3 text-foreground">{L(e.s)}</td>
                <td className="px-4 py-3 text-foreground/70">{L(e.core)}</td>
                <td className="px-4 py-3 text-foreground/60">{L(e.legacy)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <P>
        {isEn
          ? "Four current frontiers: using machine learning to predict short-term prices and fill probabilities directly from order-book state (but beware overfitting to microstructure noise); crypto and DeFi markets writing market-making into contracts (an AMM's constant-function curve is an explicit spread–depth function, and impermanent loss is inventory risk written another way); systemic resilience and flash-crash mechanisms; and how emerging-market features — price limits, T+1, retail-dominated structure — modify the classic conclusions."
          : "当前前沿有四条：用机器学习直接从订单簿状态预测短期价格与成交概率（但要警惕微观结构噪声的过拟合）；加密与 DeFi 市场把做市写进合约（AMM 的常数函数曲线是显式的价差—深度函数，无常损失是库存风险的另一种写法）；系统性韧性与闪崩机制；以及新兴市场特有的涨跌停、T+1 与散户主导结构对经典结论的修正。"}
      </P>

      <H n="9" en="Research Design" zh={isEn ? "Research Design and a Four-Stage Learning Path" : "研究设计与四阶段学习路线"} />
      <P>
        {isEn
          ? "Before running microstructure empirics, walk this checklist: are timestamp precision and matching latency consistent; how does trade-signing error affect the conclusions; are opening/closing and call-auction samples excluded; is intraday periodicity (the U-shaped spread) removed; are tick sizes and fee structures harmonized for cross-market comparison; does the sample cover at least one stress event. Missing any one of these can systematically bias spread and impact estimates."
          : "做微观结构实证前先过一遍这份清单：时间戳精度与撮合延迟是否一致；成交方向标注误差如何影响结论；是否剔除开收盘与集合竞价样本；日内周期性（U 形价差）是否已去除；跨市场比较是否统一了 tick size 与费率结构；样本是否覆盖至少一次压力事件。缺任何一条，价差与冲击的估计都可能被系统性偏移。"}
      </P>
      <P>
        {isEn
          ? "Learning path: ① first get the three-way spread decomposition and the four liquidity measures solid; ② then walk the two classic model lines, inventory and information (Ho-Stoll / Kyle / GM / PIN); ③ then enter the order book: make-or-take, queue value, simulation and self-excitation; ④ finally do market design and resilience: ticks, auctions, circuit breakers, dark pools, liquidity evaporation."
          : "学习路线：① 先把价差三分解与四类流动性度量算清楚；② 再走库存与信息两条经典模型线（Ho-Stoll / Kyle / GM / PIN）；③ 然后进入订单簿：make-or-take、排队价值、仿真与自激；④ 最后做市场设计与韧性：tick、拍卖、熔断、暗池、流动性蒸发。"}
      </P>
      <div className="mt-6">
        <ToolLink label={isEn ? "Enter the Microstructure Lab" : "进入微观结构实验室"} note={isEn ? "Reproduce each stage in the four-stage order" : "按上述四阶段顺序逐个复现"} to={LAB} />
      </div>
    </article>
  );
}

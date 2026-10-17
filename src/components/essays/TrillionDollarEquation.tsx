import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Sigma, TrendingUp, Activity, Clock } from "lucide-react";
import EquationBlock from "@/components/common/EquationBlock";
import Reveal from "@/components/common/Reveal";

/**
 * Frontier Essay — "The Trillion-Dollar Equation"
 * Editorial long-form walkthrough of the Black-Scholes argument, the four
 * Greeks, the variance risk premium, and why the model keeps being extended.
 * Links out to the interactive tools that let the reader reproduce every
 * claim (BS pricer, IV solver, Greeks desk, Heston, SVI, calibration lab).
 */







const Callout = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <aside className="rounded-xl border-l-2 border-gold/70 bg-card/40 pl-4 pr-4 py-3 my-4">
    <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold/80 mb-1">{label}</p>
    <p className="text-sm text-foreground/75 leading-relaxed">{children}</p>
  </aside>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[15px] leading-[1.85] text-foreground/80">{children}</p>
);

const H = ({ n, en, zh }: { n: string; en: string; zh: string }) => {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  return (
  <div className="flex items-baseline gap-3 mt-14 mb-5 border-b border-border/50 pb-3">
    <span className="text-[10px] font-mono tracking-[0.3em] text-gold">CHAPTER {n}</span>
    <h3 className="font-display text-2xl md:text-[26px] text-foreground leading-tight">
      {isEn ? en : zh}
    </h3>
    <span className="ml-auto text-[11px] font-mono text-muted-foreground hidden md:inline">{en}</span>
  </div>
  );
};

const TrillionDollarEquation = () => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const chapters = [
  { n: "01", en: "The Argument", zh: ({ zh: "让价格唯一的论证", en: "The Argument That Makes the Price Unique" })[isEn ? "en" : "zh"] },
  { n: "02", en: "Building the Hedge", zh: ({ zh: "构建公式所假设的对冲", en: "Building the Hedge the Formula Assumes" })[isEn ? "en" : "zh"] },
  { n: "03", en: "The Cost That Was Always There", zh: ({ zh: "离散再平衡的必然成本", en: "The Inevitable Cost of Discrete Rebalancing" })[isEn ? "en" : "zh"] },
  { n: "04", en: "Volatility Risk Premium", zh: ({ zh: "波动率风险溢价", en: "The Volatility Risk Premium" })[isEn ? "en" : "zh"] },
  { n: "05", en: "Why It's Still Extended Today", zh: ({ zh: "为什么至今仍在延伸这个模型", en: "Why the Model Is Still Being Extended" })[isEn ? "en" : "zh"] },
];
  const greekCards = [
  {
    icon: TrendingUp,
    name: "Δ  Delta",
    tag: "Direction",
    math: "\\Delta = N(d_1)",
    body: ({ zh: "股价每变动 1 美元，期权价值近似变动的美元数——也是保持组合方向中性所需的股数。", en: "The approximate dollar change in option value for each $1 stock-price move—and the share count needed to keep the portfolio directionally neutral." })[isEn ? "en" : "zh"],
  },
  {
    icon: Activity,
    name: "Γ  Gamma",
    tag: "Curvature",
    math: "\\Gamma = \\dfrac{N'(d_1)}{S\\,\\sigma\\sqrt{T}}",
    body: ({ zh: "Delta 自身的变化速度。离散再平衡下，卖方每天为 ½·Γ·(ΔS)² 付出 Gamma 成本。", en: "How fast Delta itself changes. With discrete rebalancing, the seller pays the Gamma cost of ½·Γ·(ΔS)² each day." })[isEn ? "en" : "zh"],
  },
  {
    icon: Sigma,
    name: "ν  Vega",
    tag: "Volatility",
    math: "\\nu = S\\sqrt{T}\\,N'(d_1)",
    body: ({ zh: "隐含波动率变动 1 个点带来的价格变化——即便股价没动，波动预期本身就在被交易。", en: "The price change for a one-point move in implied volatility—even when the stock stands still, volatility expectations are being traded." })[isEn ? "en" : "zh"],
  },
  {
    icon: Clock,
    name: "Θ  Theta",
    tag: "Time",
    math: "\\Theta = -\\dfrac{S\\,N'(d_1)\\,\\sigma}{2\\sqrt{T}} - rK e^{-rT} N(d_2)",
    body: ({ zh: "时间价值的每日流失。卖方每天默默收 Theta，买方每天默默付 Theta。", en: "The daily erosion of time value. Sellers quietly collect Theta each day; buyers quietly pay it." })[isEn ? "en" : "zh"],
  },
];
  const linkedTools: { to: string; label: string; note: string }[] = [
  { to: "/s/calculator", label: ({ zh: "Black–Scholes 定价器", en: "Black–Scholes Pricer" })[isEn ? "en" : "zh"], note: ({ zh: "五个输入，闭式解与 Greeks", en: "Five inputs, closed-form prices and Greeks" })[isEn ? "en" : "zh"] },
  { to: "/s/implied-vol", label: ({ zh: "隐含波动率求解", en: "Implied Volatility Solver" })[isEn ? "en" : "zh"], note: ({ zh: "Newton–Raphson 从市场价反推 σ", en: "Newton–Raphson: infer σ from the market price" })[isEn ? "en" : "zh"] },
  { to: "/s/derivatives", label: "Heston / SVI / Local Vol", note: ({ zh: "把 σ 从常数扩展为曲面/过程", en: "Extend σ from a constant to a surface / process" })[isEn ? "en" : "zh"] },
  { to: "/s/calibration", label: ({ zh: "模型校准实验室", en: "Model Calibration Lab" })[isEn ? "en" : "zh"], note: ({ zh: "GARCH / EWMA / Merton 拟合真实行情", en: "Fit GARCH / EWMA / Merton to real market data" })[isEn ? "en" : "zh"] },
];

  const reduce = useReducedMotion();

  return (
    <div className="container max-w-3xl px-6 pt-6 pb-24">
      {/* Editorial masthead */}
      <Reveal>
        <div className="border-t border-b border-border/60 py-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="h-px w-10 bg-gold" />
            <span className="text-[10px] font-mono tracking-[0.3em] text-gold uppercase font-bold">
              Frontier Essay / Derivatives
            </span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.1] text-foreground">
            {({ zh: "\n            万亿美元的方程\n          ", en: "The Trillion-Dollar Equation" })[isEn ? "en" : "zh"]}</h1>
          <p className="mt-2 font-display text-lg md:text-xl text-foreground/60 italic">
            The Only Way You Could Actually Understand the Trillion-Dollar Equation
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-muted-foreground">
            <span>Adapted from Ruuj</span>
            <span className="text-gold/50">·</span>
            <span>~14 min read</span>
            <span className="text-gold/50">·</span>
            <span>{({ zh: "五章 · 定价 $844.6 T 衍生品市场的那条论证链", en: "Five chapters · The argument pricing an $844.6 T derivatives market" })[isEn ? "en" : "zh"]}</span>
          </div>
        </div>
      </Reveal>

      {/* Lede */}
      <Reveal>
        <p className="font-display text-[19px] md:text-[21px] leading-[1.65] text-foreground/85 mb-6">
          {({ zh: "\n          本文重建 Black–Scholes 背后的实际论证，逐步给出为什么它至今仍在运行全球期权做市台，以及卖方那份可测量的统计边际到底藏在哪里。\n        ", en: "This essay reconstructs the actual argument behind Black–Scholes: why it still runs options market-making desks worldwide, and where the seller's measurable statistical edge is hidden." })[isEn ? "en" : "zh"]}</p>
        <P>
          {({ zh: "\n          大多数交易期权的人从未真正坐下来问过：为什么这个公式成立。他们记得该往里塞什么、会吐出什么。这不是\"理解\"，而这两者之间的差距，正是本文要填的地方。\n        ", en: "Most options traders have never really sat down to ask why the formula works. They remember what goes in and what comes out. That is not understanding, and this essay fills the gap between the two." })[isEn ? "en" : "zh"]}</P>
      </Reveal>

      {/* Nav strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 my-10">
        {chapters.map((c, i) => (
          <motion.a
            key={c.n}
            href={`#ch-${c.n}`}
            initial={reduce ? undefined : { opacity: 0, y: 8 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: i * 0.05 }}
            className="rounded-lg border border-border/60 bg-card/30 p-3 hover:border-gold/50 hover:bg-card/50 transition-colors"
          >
            <p className="text-[9px] font-mono tracking-[0.25em] text-gold/80">CH {c.n}</p>
            <p className="text-xs text-foreground/80 mt-1 leading-snug">{c.zh}</p>
          </motion.a>
        ))}
      </div>

      {/* Chapter 1 */}
      <div id="ch-01" className="scroll-mt-20" />
      <H n="01" en="The Argument That Makes the Price Unique" zh={chapters[0].zh} />
      <P>{({ zh: "先看公式：", en: "Start with the formula:" })[isEn ? "en" : "zh"]}</P>
      <div className="my-4">
        <EquationBlock variant="gold" math="C = S\,N(d_1) - K e^{-rT}\,N(d_2)" tag="(BS)" />
      </div>
      <div className="my-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <EquationBlock math="d_1 = \dfrac{\ln(S/K) + (r + \tfrac12\sigma^2)T}{\sigma\sqrt{T}}" />
        <EquationBlock math="d_2 = d_1 - \sigma\sqrt{T}" />
      </div>
      <P>
        {({ zh: "\n        五个输入：现价 ", en: "Five inputs: spot price " })[isEn ? "en" : "zh"]}<em>S</em>{({ zh: "、行权价 ", en: ", strike " })[isEn ? "en" : "zh"]}<em>K</em>{({ zh: "、到期时间 ", en: ", time to expiry " })[isEn ? "en" : "zh"]}<em>T</em>{({ zh: "、无风险利率 ", en: ", risk-free rate " })[isEn ? "en" : "zh"]}<em>r</em>{({ zh: "、波动率 ", en: ", volatility " })[isEn ? "en" : "zh"]}<em>σ</em>。<strong className="text-foreground">{({ zh: "没有任何一项是对方向的预测。", en: "Not one is a directional forecast." })[isEn ? "en" : "zh"]}</strong>{({ zh: "这不是遗漏，而是整个发现的核心。\n      ", en: " This is not an omission; it is the heart of the discovery." })[isEn ? "en" : "zh"]}</P>
      <P>
        {({ zh: "\n        1973 年之前，每个交易员都假定价格必须依赖方向：看涨的人给 call 更高的价格，看空的人更低。两个理性的人可以对同一份合约给出完全不同的公允价值，而没人能判定谁对，因为分歧关于未来。\n      ", en: "Before 1973, every trader assumed price must depend on direction: bulls priced calls higher, bears lower. Two rational people could assign entirely different fair values to the same contract, with no way to decide who was right, because their disagreement concerned the future." })[isEn ? "en" : "zh"]}</P>
      <P>
        {({ zh: "\n        Black、Scholes 与 Merton 找到了让这场分歧无关紧要的论证：如果构造一个持有期权 + 恰好数量的股票的组合，这个组合在某个瞬间对股价方向", en: "Black, Scholes, and Merton found an argument that made this disagreement irrelevant: construct a portfolio of an option plus exactly the right number of shares, and at an instant it is " })[isEn ? "en" : "zh"]}<em>{({ zh: "完全不敏感", en: "completely insensitive" })[isEn ? "en" : "zh"]}</em>{({ zh: "——那么它的价格只能由所有人不争议的量决定：股价变动", en: " to stock-price direction—so its price can depend only on quantities everyone agrees on: the " })[isEn ? "en" : "zh"]}<em>{({ zh: "幅度", en: "magnitude" })[isEn ? "en" : "zh"]}</em>{({ zh: "、时间、无风险回报。不是方向，是幅度。\n      ", en: " of stock-price moves, time, and the risk-free return. Not direction, but magnitude." })[isEn ? "en" : "zh"]}</P>
      <Callout label="The Hedge Ratio">
        {({ zh: "\n        使这一对消成立的股数比例，恰好是公式里的 ", en: "The share ratio that makes this cancellation work is precisely " })[isEn ? "en" : "zh"]}<em>N(d₁)</em>{({ zh: "——它的名字叫 ", en: " in the formula—its name is " })[isEn ? "en" : "zh"]}<strong className="text-gold">Delta</strong>{({ zh: "。Delta 不是一个统计量，而是这套推导得以成立的机制本身。\n      ", en: ". Delta is not a statistic; it is the mechanism that makes the derivation possible." })[isEn ? "en" : "zh"]}</Callout>

      {/* Chapter 2 */}
      <div id="ch-02" className="scroll-mt-20" />
      <H n="02" en="Building the Hedge That the Math Assumes" zh={chapters[1].zh} />
      <P>
        {({ zh: "\n        你卖出 100 股期权的 call，Delta = 0.50，于是买入 50 股对冲。此刻你是平的。股价动一美元，期权亏约 0.50，股票赚约 0.50，净变化接近零。\n      ", en: "Sell a call covering 100 shares with Delta = 0.50, then buy 50 shares to hedge. You are flat at that moment. For a one-dollar stock move, the option loses about 0.50 and the stock gains about 0.50, leaving almost no net change." })[isEn ? "en" : "zh"]}</P>
      <P>
        {({ zh: "\n        然后时间流逝，股价再变，Delta 本身已经变了——比如变成了 0.58。你手里持有的股数，对你现在真正的头寸来说，已经不对了。五分钟前还精确的对冲，此刻已经悄悄漂移。\n      ", en: "Then time passes, the stock moves again, and Delta itself changes—say to 0.58. Your share count no longer matches your actual position. A hedge that was exact five minutes ago has quietly drifted." })[isEn ? "en" : "zh"]}</P>
      <P>
        {({ zh: "\n        整套推导要求你在", en: "The entire derivation requires constant rebalancing in " })[isEn ? "en" : "zh"]}<em>{({ zh: "连续时间", en: "continuous time" })[isEn ? "en" : "zh"]}</em>{({ zh: "中不断再平衡，让 Delta 永远匹配。这不是可以用\"更快的算法\"逼近的近似——它是数学理想化。任何真实对冲都活在离散时间里，而在你两次调仓之间，股价已经动了。\n      ", en: " so Delta always matches. This is not an approximation solved by a faster algorithm—it is a mathematical idealization. Every real hedge lives in discrete time, and the stock has already moved between adjustments." })[isEn ? "en" : "zh"]}</P>

      {/* Chapter 3 */}
      <div id="ch-03" className="scroll-mt-20" />
      <H n="03" en="The Cost That Was Always Going to Be There" zh={chapters[2].zh} />
      <P>{({ zh: "Delta 自己也有变化率——它随股价变化的速度就是 Gamma：", en: "Delta has its own rate of change—its sensitivity to the stock price is Gamma:" })[isEn ? "en" : "zh"]}</P>
      <div className="my-4">
        <EquationBlock variant="gold" math="\Gamma = \dfrac{N'(d_1)}{S\,\sigma\,\sqrt{T}}" tag="(Γ)" />
      </div>
      <P>
        {({ zh: "\n        直线型的对冲可以完美追踪直线型的 Delta 移动，但没法完美追踪一条曲线。而 Delta 在任意两次再平衡之间不是直线——它是弯的，Gamma 就是那条弯的曲率。\n      ", en: "A straight-line hedge can track a straight-line Delta move perfectly, but cannot perfectly follow a curve. Between any two rebalances Delta is not straight: it bends, and Gamma measures that curvature." })[isEn ? "en" : "zh"]}</P>
      <P>
        {({ zh: "\n        期权价值随小幅股价变动的展开里，有一项恰好是 ", en: "In the expansion of option value for small stock-price moves, one term is exactly " })[isEn ? "en" : "zh"]}<strong className="text-foreground">½·Γ·(ΔS)²</strong>{({ zh: "。把 ΔS 平方之后，你立刻看到这一项为什么不会消失：调仓频率翻倍，(ΔS)² 缩小，但只要时间步不为零，它就永远不为零。\n      ", en: ". Squaring ΔS immediately shows why this term persists: doubling the rebalancing frequency reduces (ΔS)², but as long as the time step is nonzero, so is the term." })[isEn ? "en" : "zh"]}</P>
      <Callout label="Structural Tax">
        {({ zh: "\n        这就是\"用离散复制连续\"要付的税——不是执行误差，而是每个卖方每天都在付的、结构性的、可计算的成本。\n      ", en: "This is the tax on replicating the continuous with the discrete—not an execution error, but a structural, calculable cost every seller pays each day." })[isEn ? "en" : "zh"]}</Callout>

      {/* Chapter 4 */}
      <div id="ch-04" className="scroll-mt-20" />
      <H n="04" en="The Volatility Risk Premium" zh={chapters[3].zh} />
      <P>
        {({ zh: "\n        拉出任意长区间的历史期权数据，都会看到同一个关系：", en: "Look at any long history of options data and the same relationship appears: " })[isEn ? "en" : "zh"]}<strong className="text-gold">{({ zh: "隐含波动率长期高于事后实现的波动率。", en: "implied volatility persistently exceeds subsequently realized volatility." })[isEn ? "en" : "zh"]}</strong>{({ zh: "大型股指上，长期窗口里隐含 σ 均值约 19%，实现 σ 均值约 16%——三个点的缺口，几十年不同市场环境里稳定存在。\n      ", en: " For major equity indices over long windows, average implied σ is about 19% and realized σ about 16%—a three-point gap that has persisted across decades and market regimes." })[isEn ? "en" : "zh"]}</P>
      <div className="my-6 grid grid-cols-3 gap-3 text-center">
        {[
          { k: "≈ 19%", v: ({ zh: "长期平均隐含波动率", en: "Long-run average implied volatility" })[isEn ? "en" : "zh"] },
          { k: "≈ 16%", v: ({ zh: "长期平均实现波动率", en: "Long-run average realized volatility" })[isEn ? "en" : "zh"] },
          { k: "≈ 3 pts", v: ({ zh: "VRP · 卖方结构性补偿", en: "VRP · Structural compensation for sellers" })[isEn ? "en" : "zh"] },
        ].map((s) => (
          <div key={s.v} className="rounded-lg border border-gold/25 bg-card/40 py-4">
            <p className="font-display text-2xl text-gold">{s.k}</p>
            <p className="text-[11px] font-mono text-muted-foreground mt-1">{s.v}</p>
          </div>
        ))}
      </div>
      <P>
        {({ zh: "\n        这就是", en: "This is the " })[isEn ? "en" : "zh"]}<strong className="text-foreground">{({ zh: "波动率风险溢价 (VRP)", en: "volatility risk premium (VRP)" })[isEn ? "en" : "zh"]}</strong>{({ zh: "——对第 3 章那笔 Gamma 成本的市场补偿。系统性地卖期权、辅以真实风控，长期历史上产生正的预期回报，不是因为卖方能预测方向，而是因为他们被结构性地为承担一个必然存在的成本而付钱。\n      ", en: "—market compensation for the Gamma cost in Chapter 3. Systematically selling options with genuine risk controls has historically produced positive expected returns, not because sellers predict direction, but because they are structurally paid to bear an unavoidable cost." })[isEn ? "en" : "zh"]}</P>
      <P>
        {({ zh: "\n        专业台面还会跟踪另外两个 Greek——它们和 Δ、Γ 一起，把\"一次模糊的方向下注\"拆成四个可独立管理的风险维度：\n      ", en: "Professional desks track two more Greeks. Together with Δ and Γ, they split a vague directional bet into four independently manageable dimensions of risk:" })[isEn ? "en" : "zh"]}</P>

      {/* Greek cards */}
      <div className="my-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        {greekCards.map((g) => {
          const Icon = g.icon;
          return (
            <div
              key={g.name}
              className="rounded-xl border border-border/60 bg-card/40 p-4 hover:border-gold/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-gold" />
                  <span className="font-display text-base text-foreground">{g.name}</span>
                </div>
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-gold/70">
                  {g.tag}
                </span>
              </div>
              <EquationBlock math={g.math} />
              <p className="mt-2 text-[13px] text-foreground/70 leading-relaxed">{g.body}</p>
            </div>
          );
        })}
      </div>

      {/* Chapter 5 */}
      <div id="ch-05" className="scroll-mt-20" />
      <H n="05" en="Why the Model Still Gets Extended Today" zh={chapters[4].zh} />
      <P>
        {({ zh: "\n        每一节的每一个数字都依赖同一个输入保持不变：Black–Scholes 需要 σ 是整段生命期内一个固定的数。市场从未配合过这个要求——恐慌时暴涨，平静时压低；同一到期日不同行权价上的隐含 σ 也不同。\n      ", en: "Every number in every section depends on the same input staying fixed: Black–Scholes requires σ to remain constant throughout the contract's life. Markets never complied—volatility surges in panics and falls in calm periods; implied σ also differs across strikes at the same expiry." })[isEn ? "en" : "zh"]}</P>
      <P>
        {({ zh: "\n        如果 BS 完全正确，从市场价反推每个行权价的隐含 σ，应该得到一条平线。你实际得到的是", en: "If BS were completely correct, inferring implied σ from market prices at every strike would produce a flat line. What you actually get is a " })[isEn ? "en" : "zh"]}<strong className="text-foreground">{({ zh: "波动率微笑 / 偏斜", en: "volatility smile / skew" })[isEn ? "en" : "zh"]}</strong>{({ zh: "——市场在实时反驳\"单一 σ\"的假设。\n      ", en: "—the market rebutting the single-σ assumption in real time." })[isEn ? "en" : "zh"]}</P>
      <P>
        {({ zh: "\n        行业的回应不是把方程扔掉，而是围着它建：", en: "The industry's response was not to discard the equation but to build around it: " })[isEn ? "en" : "zh"]}<strong className="text-foreground">Local Vol</strong> {({ zh: " 让 σ 随 S 和 t 变化，", en: " lets σ vary with S and t; " })[isEn ? "en" : "zh"]}<strong className="text-foreground">Heston</strong> {({ zh: " 把 σ 本身建成一个均值回复的随机过程。二者都是围绕原始洞察打的补丁，而不是替代品。\n      ", en: " models σ itself as a mean-reverting stochastic process. Both patch the original insight rather than replace it." })[isEn ? "en" : "zh"]}</P>
      <Callout label="LTCM, 1998">
        {({ zh: "\n        BS 假设股价连续、收益近似正态。真实市场跳跃，尾部远比正态厚。LTCM 用几年平静数据校准模型，把\"极小概率\"当成\"近似不可能\"来给头寸定 size——俄罗斯违约之后，所有他们预期收敛的价差反向扩大，保证金瞬间消失。那不是方程的失败，是不尊重方程从未承诺过的东西。\n      ", en: "BS assumes continuous stock prices and approximately normal returns. Real markets jump, and their tails are much fatter. LTCM calibrated models on a few calm years and sized positions as if very unlikely meant nearly impossible. After Russia defaulted, every spread they expected to converge widened instead, and margin vanished. That was not the equation failing; it was a failure to respect what the equation never promised." })[isEn ? "en" : "zh"]}</Callout>

      {/* Coda */}
      <div className="mt-16 pt-8 border-t border-border/60">
        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-3">Coda</p>
        <p className="font-display text-xl md:text-2xl leading-snug text-foreground/85">
          {({ zh: "\n          方程从来不会给你确定性。它给你的，是有史以来最精确的、为\"确定性的缺席\"定价的工具——而知道这个工具在哪里仍然会碎，才是\"用得对的人\"与\"往里塞数字然后祈祷的人\"之间的分野。\n        ", en: "An equation never gives you certainty. It gives you the most precise tool ever built for pricing the absence of certainty. Knowing where that tool can still break separates those who use it well from those who feed in numbers and pray." })[isEn ? "en" : "zh"]}</p>
      </div>

      {/* Reproduce in the lab */}
      <div className="mt-14">
        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-4">
          Reproduce in the Lab
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {linkedTools.map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              className="group rounded-xl border border-border/60 bg-card/40 p-4 hover:border-gold/50 hover:bg-card/60 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-20px_hsl(var(--gold)/0.35)] transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-base text-foreground group-hover:text-gold transition-colors">
                    {tool.label}
                  </p>
                  <p className="mt-1 text-xs text-foreground/60">{tool.note}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-gold group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Next essay */}
      <div className="mt-12">
        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-3">Next Essay</p>
        <Link
          to="/s/ai-quant-strategy"
          className="group flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-card/40 p-5 hover:border-gold/50 hover:bg-card/60 transition-all"
        >
          <div>
            <p className="font-display text-lg text-foreground group-hover:text-gold transition-colors">
              {({ zh: "\n              当 AI 告诉我：你的想法是反的\n            ", en: "When the AI Told Me: Your Idea Is Backward" })[isEn ? "en" : "zh"]}</p>
            <p className="mt-1 text-xs text-foreground/60">
              {({ zh: "\n              一句话生成的量化策略、四年亏损的因子组合，以及 +1047% 回测背后的 40% 回撤。\n            ", en: "A quant strategy from one sentence, a factor portfolio that lost money for four years, and the 40% drawdown behind a +1047% backtest." })[isEn ? "en" : "zh"]}</p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-gold transition-all shrink-0 mt-1" />
        </Link>
      </div>
    </div>
  );
};

export default TrillionDollarEquation;
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, AlertTriangle } from "lucide-react";
import EquationBlock from "@/components/common/EquationBlock";
import Reveal from "@/components/common/Reveal";

/**
 * Frontier Essay — "When the AI Told Me I Was Wrong"
 * A methodology case study built around a real AI-generated quant strategy
 * session: a value+quality cross-sectional portfolio that lost money for four
 * years, the regime diagnosis that explained why, and the momentum rebuild that
 * printed +1047% — with every drawdown kept on screen.
 * Every claim maps to a tool on this site that lets the reader test it.
 */



type Version = {
  tag: string;
  name: string;
  ret: string;
  sharpe: string;
  mdd: string;
  note: string;
  negative?: boolean;
};





const Callout = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <aside className="rounded-xl border-l-2 border-gold/70 bg-card/40 pl-4 pr-4 py-3 my-4">
    <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold/80 mb-1">{label}</p>
    <p className="text-sm text-foreground/75 leading-relaxed">{children}</p>
  </aside>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[15px] leading-[1.85] text-foreground/80 mb-4">{children}</p>
);

const H = ({ n, en, zh }: { n: string; en: string; zh: string }) => {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  return (
  <div className="flex items-baseline gap-3 mt-14 mb-5 border-b border-border/50 pb-3">
    <span className="text-[10px] font-mono tracking-[0.3em] text-gold">CHAPTER {n}</span>
    <h3 className="font-display text-2xl md:text-[26px] text-foreground leading-tight">{isEn ? en : zh}</h3>
    <span className="ml-auto text-[11px] font-mono text-muted-foreground hidden md:inline">{en}</span>
  </div>
  );
};

const AiQuantStrategyEssay = () => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const chapters = [
  { n: "01", en: "One Sentence In, A Strategy Out", zh: ({ zh: "一句话进，一个策略出", en: "One Sentence In, a Strategy Out" })[isEn ? "en" : "zh"] },
  { n: "02", en: "Four Trades Is Not A Track Record", zh: ({ zh: "四笔交易的样本量陷阱", en: "The Four-Trade Sample-Size Trap" })[isEn ? "en" : "zh"] },
  { n: "03", en: "Structural Failure, Not Bad Luck", zh: ({ zh: "结构性失效，而非运气不好", en: "Structural Failure, Not Bad Luck" })[isEn ? "en" : "zh"] },
  { n: "04", en: "Where The Sharpe Actually Came From", zh: ({ zh: "夏普比从 0.17 到 1.74 的来源", en: "Where the Sharpe Jump from 0.17 to 1.74 Came From" })[isEn ? "en" : "zh"] },
  { n: "05", en: "A Backtest Is Not A Forecast", zh: ({ zh: "冷水：回测不是预测", en: "Cold Water: A Backtest Is Not a Forecast" })[isEn ? "en" : "zh"] },
];
  const versions: Version[] = [
  {
    tag: "V1",
    name: ({ zh: "价值 + 质量，多空各 10", en: "Value + quality, 10 longs and 10 shorts" })[isEn ? "en" : "zh"],
    ret: "−21.17%",
    sharpe: "−0.22",
    mdd: "−33.83%",
    note: ({ zh: "CAGR −5.77%，四年跑输标普指数", en: "CAGR −5.77%; underperformed the S&P for four years" })[isEn ? "en" : "zh"],
    negative: true,
  },
  {
    tag: "V2",
    name: ({ zh: "信号反转 · 去掉空头腿", en: "Reverse the signal · Remove the short leg" })[isEn ? "en" : "zh"],
    ret: "+829.20%",
    sharpe: "1.53",
    mdd: "≈ −42%",
    note: ({ zh: "胜率 80%，超越买入持有 726 个百分点", en: "80% win rate; beat buy-and-hold by 726 percentage points" })[isEn ? "en" : "zh"],
  },
  {
    tag: "V3",
    name: ({ zh: "叠加 200 日趋势过滤", en: "Add a 200-day trend filter" })[isEn ? "en" : "zh"],
    ret: "+1047.39%",
    sharpe: "1.74",
    mdd: "−40.53%",
    note: ({ zh: "Calmar 2.07，跌破 200 日线即减仓至现金", en: "Calmar 2.07; move to cash below the 200-day average" })[isEn ? "en" : "zh"],
  },
  {
    tag: "BM",
    name: ({ zh: "买入持有（同一宇宙）", en: "Buy-and-hold (same universe)" })[isEn ? "en" : "zh"],
    ret: ({ zh: "基准", en: "Benchmark" })[isEn ? "en" : "zh"],
    sharpe: "—",
    mdd: "—",
    note: ({ zh: "2022–2026 为 AI 大盘科技单边行情", en: "2022–2026 was a one-way AI mega-cap tech market" })[isEn ? "en" : "zh"],
  },
];
  const linkedTools: { to: string; label: string; note: string }[] = [
  { to: "/s/backtest", label: ({ zh: "真实数据回测引擎", en: "Real-Data Backtest Engine" })[isEn ? "en" : "zh"], note: ({ zh: "用真实历史价格复现 V1 / V3 的净值与回撤", en: "Reproduce V1 / V3 equity curves and drawdowns with actual historical prices" })[isEn ? "en" : "zh"] },
  { to: "/s/quant", label: ({ zh: "Walk-Forward 样本外检验", en: "Walk-Forward Out-of-Sample Tests" })[isEn ? "en" : "zh"], note: ({ zh: "量化 IS 与 OOS 的夏普缺口，识别过拟合", en: "Measure the IS–OOS Sharpe gap to detect overfitting" })[isEn ? "en" : "zh"] },
  { to: "/s/asset-pricing", label: ({ zh: "Fama-French 多因子归因", en: "Fama–French Multifactor Attribution" })[isEn ? "en" : "zh"], note: ({ zh: "拆解 +1047% 里有多少只是市场与动量暴露", en: "Determine how much of +1047% is simply market and momentum exposure" })[isEn ? "en" : "zh"] },
  { to: "/s/quant", label: ({ zh: "Kelly & 破产风险实验室", en: "Kelly & Risk-of-Ruin Lab" })[isEn ? "en" : "zh"], note: ({ zh: "40% 回撤下，杠杆与仓位的理论上限在哪", en: "The theoretical limits on leverage and position size with a 40% drawdown" })[isEn ? "en" : "zh"] },
  { to: "/s/quant", label: ({ zh: "Michaud 重采样前沿", en: "Michaud Resampled Frontier" })[isEn ? "en" : "zh"], note: ({ zh: "参数不确定性会把最优权重摊平到什么程度", en: "How much parameter uncertainty flattens optimal weights" })[isEn ? "en" : "zh"] },
  { to: "/s/calibration", label: ({ zh: "模型校准实验室", en: "Model Calibration Lab" })[isEn ? "en" : "zh"], note: ({ zh: "把波动率与跳跃参数拟合到真实行情再定 size", en: "Fit volatility and jump parameters to real data before sizing positions" })[isEn ? "en" : "zh"] },
];

  const reduce = useReducedMotion();

  return (
    <div className="container max-w-3xl px-6 pt-6 pb-24">
      {/* Masthead */}
      <Reveal>
        <div className="border-t border-b border-border/60 py-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="h-px w-10 bg-gold" />
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold font-bold">
              Frontier Essay / AI &amp; Quant
            </span>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">≈ 12 min read</span>
          </div>
          <h2 className="font-display text-3xl md:text-[40px] leading-[1.15] text-foreground">
            {({ zh: "\n            当 AI 告诉我：你的想法是反的\n          ", en: "When the AI Told Me: Your Idea Is Backward" })[isEn ? "en" : "zh"]}</h2>
          <p className="mt-2 text-sm font-mono text-muted-foreground">
            One sentence in, a quant strategy out — then it proved me wrong.
          </p>
          <p className="mt-5 text-[15px] leading-[1.85] text-foreground/75">
            {({ zh: "\n            一句自然语言描述，换来一份真实 Python、四年行情、一次完整回测——以及一个亏钱的策略。真正值得记录的不是它写代码的速度，而是它接下来做的事：诊断我的因子在这个宇宙里为什么是反的，跑第二次测试来证明，再把策略重建成能用的东西，最后主动把 40% 的回撤摆在我面前。这篇是那次会话的复盘，红色数字一个不删。\n          ", en: "One natural-language description produced real Python, four years of market data, a complete backtest—and a money-losing strategy. What matters is not how fast it coded, but what it did next: diagnose why my factors were backward in this universe, run a second test to prove it, rebuild the strategy into something usable, and voluntarily put a 40% drawdown in front of me. This is a review of that session, with every red number intact." })[isEn ? "en" : "zh"]}</p>
        </div>
      </Reveal>

      {/* Scorecard */}
      <Reveal>
        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-3">
          Scorecard — TradFi 30 Universe, Jun 2022 → Jun 2026
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {versions.map((v, i) => (
            <motion.div
              key={v.tag}
              initial={reduce ? undefined : { opacity: 0, y: 12 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-xl border border-border/60 bg-card/40 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-gold/80">
                  {v.tag}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-foreground/70 leading-snug min-h-[2.4em]">{v.name}</p>
              <p
                className={`mt-3 font-mono tabular-nums text-xl ${
                  v.negative ? "text-destructive" : "text-gold"
                }`}
              >
                {v.ret}
              </p>
              <div className="mt-2 space-y-1 text-[11px] font-mono tabular-nums">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sharpe</span>
                  <span className="text-foreground/85">{v.sharpe}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max DD</span>
                  <span className="text-destructive">{v.mdd}</span>
                </div>
              </div>
              <p className="mt-3 text-[10px] text-foreground/55 leading-relaxed">{v.note}</p>
            </motion.div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
          {({ zh: "\n          回报与回撤同等字号并列显示——一个只报收益、不报回撤的排行榜，本质上不是业绩表，而是广告。\n        ", en: "Returns and drawdowns appear side by side in the same font size. A leaderboard reporting gains without drawdowns is not a performance table; it is advertising." })[isEn ? "en" : "zh"]}</p>
      </Reveal>

      {/* Chapter 1 */}
      <H n="01" en={chapters[0].en} zh={chapters[0].zh} />
      <P>
        {({ zh: "\n        起手是最小的那个实验：单标的模式，输入只有一句「基于近期市场状况，为我的 BTC 仓位设计一个 15 分钟动量策略」。\n      ", en: "The opening experiment was the smallest: single-asset mode, with just one sentence—‘Based on recent market conditions, design a 15-minute momentum strategy for my BTC position.’" })[isEn ? "en" : "zh"]}</P>
      <P>
        {({ zh: "\n        在写下第一行代码之前，它先读了市场：拉取约 200 根近期 K 线，概括出「急跌—反弹—高波动—转入区间」的状态，判定当前属于「动量 + 过滤器」环境，然后才落到具体实现——EMA 动量为主信号，RSI 与成交量做过滤。两个月窗口、10 倍杠杆下的结果是 +3.47%，4 笔交易，最大回撤 −1.87%，胜率 75%，盈亏比 6.84，夏普 3.51。\n      ", en: "Before writing any code, it read the market: fetched roughly 200 recent candles, summarized the regime as selloff–rebound–high volatility–range, judged it a momentum-plus-filter environment, and only then implemented EMA momentum with RSI and volume filters. Over two months at 10× leverage: +3.47%, 4 trades, maximum drawdown −1.87%, win rate 75%, profit/loss ratio 6.84, Sharpe 3.51." })[isEn ? "en" : "zh"]}</P>
      <P>
        {({ zh: "\n        +3.47% 本身毫无谈资。但同期 BTC 下跌 21.63%。这个策略没有试图打全垒打，它只是在一次 21% 的下跌里赚了几个点。这是这类工具的真实卖点：不是「赚大钱」，而是「别被碾过去」。\n      ", en: "+3.47% alone is unremarkable. But BTC fell 21.63% over the same period. The strategy did not swing for a home run; it made a few points during a 21% decline. That is the real selling point of these tools: not making a fortune, but avoiding being crushed." })[isEn ? "en" : "zh"]}</P>
      <Callout label="Workflow">
        {({ zh: "\n        读市场状态 → 从因子库中选取信号 → 生成可读的 Python → 回测 → 展示净值与指标 → 用自然语言继续迭代。链路里每一步都能被检查，这正是它区别于黑箱信号机的地方。\n      ", en: "Read the market regime → select signals from the factor library → generate readable Python → backtest → show equity and metrics → iterate in natural language. Every step is inspectable, unlike a black-box signal machine." })[isEn ? "en" : "zh"]}</Callout>

      {/* Chapter 2 */}
      <H n="02" en={chapters[1].en} zh={chapters[1].zh} />
      <P>
        {({ zh: "\n        然后必须泼第一盆冷水：两个月、4 笔交易。夏普 3.51 建立在 4 个观测上，它的置信区间宽到几乎覆盖所有可能的真值。夏普比的标准误近似为\n      ", en: "Then comes the first cold shower: two months, 4 trades. A Sharpe of 3.51 rests on four observations; its confidence interval is wide enough to cover almost every plausible true value. The approximate standard error of the Sharpe ratio is" })[isEn ? "en" : "zh"]}</P>
      <div className="my-5 text-foreground katex-display-gold">
        <EquationBlock math={String.raw`\mathrm{SE}(\widehat{SR}) \approx \sqrt{\dfrac{1 + \tfrac{1}{2}SR^{2}}{n}}`} />
      </div>
      <P>
        {({ zh: "\n        当 n 只有个位数时，分母把一切都放大。这个数字是工作流的演示，不是业绩记录——把它当成「这条流水线跑通了」，而不是「这个策略有效」。\n      ", en: "With single-digit n, the denominator magnifies everything. This number demonstrates a workflow, not a track record. Read it as ‘the pipeline runs,’ not ‘the strategy works.’" })[isEn ? "en" : "zh"]}</P>
      <Callout label="Sample Size">
        {({ zh: "\n        判断一个策略是否有效，需要的不是漂亮的点估计，而是足够长的样本外窗口与稳定的参数邻域。四笔交易连「参数是否敏感」都无法回答。\n      ", en: "Validating a strategy requires more than a pretty point estimate: it needs a sufficiently long out-of-sample window and a stable neighborhood of parameters. Four trades cannot even answer whether parameters are sensitive." })[isEn ? "en" : "zh"]}</Callout>

      {/* Chapter 3 */}
      <H n="03" en={chapters[2].en} zh={chapters[2].zh} />
      <P>
        {({ zh: "\n        真正的测试在横截面。切到多资产模式，选 TradFi 30 宇宙（NVDA、MU、MRVL 等大盘科技），提出一个教科书式的机构配置：按「价值 + 质量」复合得分排序，做多前 10、做空后 10，等权，月度再平衡。\n      ", en: "The real test was cross-sectional. In multi-asset mode, I selected the TradFi 30 universe (mega-cap tech such as NVDA, MU, and MRVL) and proposed a textbook institutional allocation: rank by a value-plus-quality composite score, long the top 10 and short the bottom 10, equal-weighted, rebalanced monthly." })[isEn ? "en" : "zh"]}</P>
      <P>
        {({ zh: "\n        四年（2022 年 6 月 → 2026 年 6 月）回测结果是一场灾难：总回报 −21.17%，CAGR −5.77%，最大回撤 −33.83%，夏普 −0.22，并且大幅跑输一个什么都不做的指数。一个标准的价值加质量因子组合，连亏四年。\n      ", en: "The four-year backtest (June 2022 → June 2026) was a disaster: total return −21.17%, CAGR −5.77%, maximum drawdown −33.83%, Sharpe −0.22, and substantial underperformance against a do-nothing index. A standard value-plus-quality portfolio lost money for four straight years." })[isEn ? "en" : "zh"]}</P>
      <P>
        {({ zh: "\n        我把这个结果直接甩回去，问它：这套方法在这里到底能不能跑赢指数，还是结构上就不行。它的回答是这次会话真正的转折点——价值 + 质量在", en: "I sent the result straight back and asked whether this approach could beat the index here or was structurally wrong. Its answer was the session's turning point: value + quality was structurally failing in " })[isEn ? "en" : "zh"]}<strong className="text-foreground">{({ zh: "这个宇宙、这个窗口", en: "this universe, this window" })[isEn ? "en" : "zh"]}</strong>{({ zh: "里是结构性失效的：TradFi 30 是动量驱动的大盘科技牛市，按「便宜 + 高质量」排序，等于系统性地做空赢家、做多落后者，方向完全相反。\n      ", en: ": TradFi 30 was a momentum-driven mega-cap tech bull market. Ranking by cheapness and quality systematically shorted winners and bought laggards—the opposite direction." })[isEn ? "en" : "zh"]}</P>
      <P>
        {({ zh: "\n        更关键的是，它没有停在断言上。它说要通过", en: "More importantly, it did not stop at asserting this. It proposed " })[isEn ? "en" : "zh"]}<strong className="text-foreground">{({ zh: "反转信号", en: "reversing the signal" })[isEn ? "en" : "zh"]}</strong>{({ zh: "来证明这个诊断——先证明，再修复。\n      ", en: " to prove the diagnosis—prove first, repair second." })[isEn ? "en" : "zh"]}</P>
      <Callout label="Regime Dependence">
        {({ zh: "\n        因子收益是条件性的，不是常数。同一个 HML/QMJ 组合在 2000–2007 与 2020–2026 的符号可以完全相反。任何不声明「宇宙 + 窗口 + 状态」的因子结论，都是没有定义域的函数。\n      ", en: "Factor returns are conditional, not constant. The same HML/QMJ portfolio can have opposite signs in 2000–2007 and 2020–2026. Any factor conclusion without a universe, window, and regime is a function without a domain." })[isEn ? "en" : "zh"]}</Callout>

      {/* Chapter 4 */}
      <H n="04" en={chapters[3].en} zh={chapters[3].zh} />
      <P>
        {({ zh: "\n        反转之后，它进一步拿掉了拖后腿的空头腿，只留下多头的动量 + 质量。同样的宇宙、同样的四年：+829.20%，夏普 1.53，胜率 80%，超越买入持有 726 个百分点。仅仅是删掉空头腿这一步，夏普就从 0.17 抬到 1.53。\n      ", en: "After reversal, it removed the underperforming short leg, leaving long-only momentum + quality. Same universe, same four years: +829.20%, Sharpe 1.53, win rate 80%, beating buy-and-hold by 726 percentage points. Removing the short leg alone lifted Sharpe from 0.17 to 1.53." })[isEn ? "en" : "zh"]}</P>
      <P>
        {({ zh: "\n        这句话值得单独拿出来读：在一个单边上涨的宇宙里，空头腿贡献的几乎全是负收益与额外波动。所谓「市场中性」在结构性趋势里并不中性，它只是稳定地站在趋势的反面。\n      ", en: "Read that again: in a one-way rising universe, the short leg mostly added losses and volatility. So-called market neutrality is not neutral in a structural trend; it consistently stands against it." })[isEn ? "en" : "zh"]}</P>
      <P>
        {({ zh: "\n        然后是它主动说出口的那句：−42% 的最大回撤是真实的，且集中在同时期的三四只票上。一个工具主动劝你别太相信它自己刚打出的好成绩，比这个成绩本身更值钱。\n      ", en: "Then it volunteered the warning: the −42% maximum drawdown was real and concentrated in three or four stocks at the same time. A tool warning you not to trust its own impressive result too much is worth more than the result itself." })[isEn ? "en" : "zh"]}</P>
      <P>
        {({ zh: "\n        我问它怎么处理这个回撤，它加了 200 日趋势过滤：只持有站在自身 200 日均线之上的标的，赢家开始走坏就逐步转向现金。V3：+1047.39%，夏普 1.74，Calmar 2.07，回撤约 −40%。\n      ", en: "When I asked how to handle the drawdown, it added a 200-day trend filter: hold only names above their own 200-day average, moving gradually into cash as winners deteriorate. V3: +1047.39%, Sharpe 1.74, Calmar 2.07, drawdown about −40%." })[isEn ? "en" : "zh"]}</P>
      <P>
        {({ zh: "\n        而这些超额收益到底是 alpha 还是暴露，需要一个回归来回答，而不是一句「跑赢了」：\n      ", en: "Whether those excess returns are alpha or exposure requires a regression, not the phrase ‘it outperformed’:" })[isEn ? "en" : "zh"]}</P>
      <div className="my-5 text-foreground katex-display-gold">
        <EquationBlock
          math={String.raw`R_{p,t}-R_{f,t}=\alpha+\beta_{\mathrm{MKT}}\mathrm{MKT}_t+\beta_{\mathrm{SMB}}\mathrm{SMB}_t+\beta_{\mathrm{HML}}\mathrm{HML}_t+\beta_{\mathrm{RMW}}\mathrm{RMW}_t+\beta_{\mathrm{CMA}}\mathrm{CMA}_t+\varepsilon_t`}
        />
      </div>
      <P>
        {({ zh: "\n        把 V3 的净值序列丢进多因子归因，若 α 在扣除交易成本后不再显著，那 1047% 讲述的就只是一段被杠杆化的市场暴露史。\n      ", en: "Feed V3's equity series into multifactor attribution. If α becomes insignificant after trading costs, that 1047% is simply a history of leveraged market exposure." })[isEn ? "en" : "zh"]}</P>

      {/* Chapter 5 */}
      <H n="05" en={chapters[4].en} zh={chapters[4].zh} />
      <P>
        {({ zh: "\n        +829% 与 +1047% 都是回测，而且是在一个百年难遇的窗口上做的回测。2022–2026 是 AI 大盘科技的融涨期，动量策略在这样的趋势内部一定会打印出漂亮的曲线——并在趋势结束时剧烈反转。\n      ", en: "+829% and +1047% are both backtests in an extraordinarily rare window. 2022–2026 was an AI mega-cap tech melt-up. Momentum strategies inevitably print attractive curves within such trends—and reverse violently when the trend ends." })[isEn ? "en" : "zh"]}</P>
      <P>
        {({ zh: "\n        40% 以上的回撤不是假设，它就写在同一张结果表里，并且集中在少数几只标的上。回测不是预测；真实交易还要叠加手续费、滑点与资金费率，而这些在回测里通常被系统性低估。\n      ", en: "Drawdowns above 40% are not hypothetical: they appear in the same result table, concentrated in a few names. A backtest is not a forecast; real trading adds fees, slippage, and funding rates, usually systematically underestimated in backtests." })[isEn ? "en" : "zh"]}</P>
      <P>
        {({ zh: "\n        所以诚实的结论不是「这东西能印钱」。而是：它的推理方式像一个量化研究员——它告诉我我的想法是反的，用一次测试证明它，重建策略，并且拒绝把风险藏起来。可调用的判断力，而不是一台老虎机，才是这里真正的产品。\n      ", en: "The honest conclusion is not ‘this prints money.’ It is that the tool reasoned like a quant researcher: told me my idea was backward, proved it with a test, rebuilt the strategy, and refused to hide risk. Callable judgment, not a slot machine, is the real product." })[isEn ? "en" : "zh"]}</P>
      <P>
        {({ zh: "\n        本文的案例来自 Minara 的 Strategy Studio 会话记录，本站不做任何产品推荐；此处只保留它在方法论上可被检验的部分。\n      ", en: "This case comes from a Minara Strategy Studio session transcript. This site endorses no product; only its methodologically testable elements are retained here." })[isEn ? "en" : "zh"]}</P>

      {/* Coda */}
      <div className="mt-16 pt-8 border-t border-border/60">
        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-3">Coda</p>
        <p className="font-display text-xl md:text-2xl leading-snug text-foreground/85">
          {({ zh: "\n          一个永远同意你的工具不是智能，它只是一面镜子。它第一次告诉我「你错了」的那一刻，它才从玩具变成了工具。\n        ", en: "A tool that always agrees with you is not intelligence; it is a mirror. The first time it told me ‘you are wrong,’ it stopped being a toy and became a tool." })[isEn ? "en" : "zh"]}</p>
      </div>

      {/* Reproduce in the lab */}
      <div className="mt-14">
        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-4">
          Reproduce in the Lab
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {linkedTools.map((tool) => (
            <Link
              key={tool.label}
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

      {/* Disclaimer */}
      <div className="mt-10 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
        <p className="text-xs text-foreground/70 leading-relaxed">
          {({ zh: "\n          Backtest ≠ forecast. 本文所有数字均为历史回测结果，不构成任何投资建议。杠杆交易可能导致本金全部损失。\n        ", en: "Backtest ≠ forecast. All figures here are historical backtest results, not investment advice. Leveraged trading can result in the total loss of principal." })[isEn ? "en" : "zh"]}</p>
      </div>
    </div>
  );
};

export default AiQuantStrategyEssay;

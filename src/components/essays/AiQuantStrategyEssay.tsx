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

const chapters = [
  { n: "01", en: "One Sentence In, A Strategy Out", zh: "一句话进，一个策略出" },
  { n: "02", en: "Four Trades Is Not A Track Record", zh: "四笔交易的样本量陷阱" },
  { n: "03", en: "Structural Failure, Not Bad Luck", zh: "结构性失效，而非运气不好" },
  { n: "04", en: "Where The Sharpe Actually Came From", zh: "夏普比从 0.17 到 1.74 的来源" },
  { n: "05", en: "A Backtest Is Not A Forecast", zh: "冷水：回测不是预测" },
];

type Version = {
  tag: string;
  name: string;
  ret: string;
  sharpe: string;
  mdd: string;
  note: string;
  negative?: boolean;
};

const versions: Version[] = [
  {
    tag: "V1",
    name: "价值 + 质量，多空各 10",
    ret: "−21.17%",
    sharpe: "−0.22",
    mdd: "−33.83%",
    note: "CAGR −5.77%，四年跑输标普指数",
    negative: true,
  },
  {
    tag: "V2",
    name: "信号反转 · 去掉空头腿",
    ret: "+829.20%",
    sharpe: "1.53",
    mdd: "≈ −42%",
    note: "胜率 80%，超越买入持有 726 个百分点",
  },
  {
    tag: "V3",
    name: "叠加 200 日趋势过滤",
    ret: "+1047.39%",
    sharpe: "1.74",
    mdd: "−40.53%",
    note: "Calmar 2.07，跌破 200 日线即减仓至现金",
  },
  {
    tag: "BM",
    name: "买入持有（同一宇宙）",
    ret: "基准",
    sharpe: "—",
    mdd: "—",
    note: "2022–2026 为 AI 大盘科技单边行情",
  },
];

const linkedTools: { to: string; label: string; note: string }[] = [
  { to: "/s/backtest", label: "真实数据回测引擎", note: "用真实历史价格复现 V1 / V3 的净值与回撤" },
  { to: "/s/quant", label: "Walk-Forward 样本外检验", note: "量化 IS 与 OOS 的夏普缺口，识别过拟合" },
  { to: "/s/asset-pricing", label: "Fama-French 多因子归因", note: "拆解 +1047% 里有多少只是市场与动量暴露" },
  { to: "/s/quant", label: "Kelly & 破产风险实验室", note: "40% 回撤下，杠杆与仓位的理论上限在哪" },
  { to: "/s/quant", label: "Michaud 重采样前沿", note: "参数不确定性会把最优权重摊平到什么程度" },
  { to: "/s/calibration", label: "模型校准实验室", note: "把波动率与跳跃参数拟合到真实行情再定 size" },
];

const Callout = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <aside className="rounded-xl border-l-2 border-gold/70 bg-card/40 pl-4 pr-4 py-3 my-4">
    <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold/80 mb-1">{label}</p>
    <p className="text-sm text-foreground/75 leading-relaxed">{children}</p>
  </aside>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[15px] leading-[1.85] text-foreground/80 mb-4">{children}</p>
);

const H = ({ n, en, zh }: { n: string; en: string; zh: string }) => (
  <div className="flex items-baseline gap-3 mt-14 mb-5 border-b border-border/50 pb-3">
    <span className="text-[10px] font-mono tracking-[0.3em] text-gold">CHAPTER {n}</span>
    <h3 className="font-display text-2xl md:text-[26px] text-foreground leading-tight">{zh}</h3>
    <span className="ml-auto text-[11px] font-mono text-muted-foreground hidden md:inline">{en}</span>
  </div>
);

const AiQuantStrategyEssay = () => {
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
            当 AI 告诉我：你的想法是反的
          </h2>
          <p className="mt-2 text-sm font-mono text-muted-foreground">
            One sentence in, a quant strategy out — then it proved me wrong.
          </p>
          <p className="mt-5 text-[15px] leading-[1.85] text-foreground/75">
            一句自然语言描述，换来一份真实 Python、四年行情、一次完整回测——以及一个亏钱的策略。真正值得记录的不是它写代码的速度，而是它接下来做的事：诊断我的因子在这个宇宙里为什么是反的，跑第二次测试来证明，再把策略重建成能用的东西，最后主动把 40% 的回撤摆在我面前。这篇是那次会话的复盘，红色数字一个不删。
          </p>
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
          回报与回撤同等字号并列显示——一个只报收益、不报回撤的排行榜，本质上不是业绩表，而是广告。
        </p>
      </Reveal>

      {/* Chapter 1 */}
      <H n="01" en={chapters[0].en} zh={chapters[0].zh} />
      <P>
        起手是最小的那个实验：单标的模式，输入只有一句「基于近期市场状况，为我的 BTC 仓位设计一个 15 分钟动量策略」。
      </P>
      <P>
        在写下第一行代码之前，它先读了市场：拉取约 200 根近期 K 线，概括出「急跌—反弹—高波动—转入区间」的状态，判定当前属于「动量 + 过滤器」环境，然后才落到具体实现——EMA 动量为主信号，RSI 与成交量做过滤。两个月窗口、10 倍杠杆下的结果是 +3.47%，4 笔交易，最大回撤 −1.87%，胜率 75%，盈亏比 6.84，夏普 3.51。
      </P>
      <P>
        +3.47% 本身毫无谈资。但同期 BTC 下跌 21.63%。这个策略没有试图打全垒打，它只是在一次 21% 的下跌里赚了几个点。这是这类工具的真实卖点：不是「赚大钱」，而是「别被碾过去」。
      </P>
      <Callout label="Workflow">
        读市场状态 → 从因子库中选取信号 → 生成可读的 Python → 回测 → 展示净值与指标 → 用自然语言继续迭代。链路里每一步都能被检查，这正是它区别于黑箱信号机的地方。
      </Callout>

      {/* Chapter 2 */}
      <H n="02" en={chapters[1].en} zh={chapters[1].zh} />
      <P>
        然后必须泼第一盆冷水：两个月、4 笔交易。夏普 3.51 建立在 4 个观测上，它的置信区间宽到几乎覆盖所有可能的真值。夏普比的标准误近似为
      </P>
      <div className="my-5 text-foreground katex-display-gold">
        <EquationBlock math={String.raw`\mathrm{SE}(\widehat{SR}) \approx \sqrt{\dfrac{1 + \tfrac{1}{2}SR^{2}}{n}}`} />
      </div>
      <P>
        当 n 只有个位数时，分母把一切都放大。这个数字是工作流的演示，不是业绩记录——把它当成「这条流水线跑通了」，而不是「这个策略有效」。
      </P>
      <Callout label="Sample Size">
        判断一个策略是否有效，需要的不是漂亮的点估计，而是足够长的样本外窗口与稳定的参数邻域。四笔交易连「参数是否敏感」都无法回答。
      </Callout>

      {/* Chapter 3 */}
      <H n="03" en={chapters[2].en} zh={chapters[2].zh} />
      <P>
        真正的测试在横截面。切到多资产模式，选 TradFi 30 宇宙（NVDA、MU、MRVL 等大盘科技），提出一个教科书式的机构配置：按「价值 + 质量」复合得分排序，做多前 10、做空后 10，等权，月度再平衡。
      </P>
      <P>
        四年（2022 年 6 月 → 2026 年 6 月）回测结果是一场灾难：总回报 −21.17%，CAGR −5.77%，最大回撤 −33.83%，夏普 −0.22，并且大幅跑输一个什么都不做的指数。一个标准的价值加质量因子组合，连亏四年。
      </P>
      <P>
        我把这个结果直接甩回去，问它：这套方法在这里到底能不能跑赢指数，还是结构上就不行。它的回答是这次会话真正的转折点——价值 + 质量在<strong className="text-foreground">这个宇宙、这个窗口</strong>里是结构性失效的：TradFi 30 是动量驱动的大盘科技牛市，按「便宜 + 高质量」排序，等于系统性地做空赢家、做多落后者，方向完全相反。
      </P>
      <P>
        更关键的是，它没有停在断言上。它说要通过<strong className="text-foreground">反转信号</strong>来证明这个诊断——先证明，再修复。
      </P>
      <Callout label="Regime Dependence">
        因子收益是条件性的，不是常数。同一个 HML/QMJ 组合在 2000–2007 与 2020–2026 的符号可以完全相反。任何不声明「宇宙 + 窗口 + 状态」的因子结论，都是没有定义域的函数。
      </Callout>

      {/* Chapter 4 */}
      <H n="04" en={chapters[3].en} zh={chapters[3].zh} />
      <P>
        反转之后，它进一步拿掉了拖后腿的空头腿，只留下多头的动量 + 质量。同样的宇宙、同样的四年：+829.20%，夏普 1.53，胜率 80%，超越买入持有 726 个百分点。仅仅是删掉空头腿这一步，夏普就从 0.17 抬到 1.53。
      </P>
      <P>
        这句话值得单独拿出来读：在一个单边上涨的宇宙里，空头腿贡献的几乎全是负收益与额外波动。所谓「市场中性」在结构性趋势里并不中性，它只是稳定地站在趋势的反面。
      </P>
      <P>
        然后是它主动说出口的那句：−42% 的最大回撤是真实的，且集中在同时期的三四只票上。一个工具主动劝你别太相信它自己刚打出的好成绩，比这个成绩本身更值钱。
      </P>
      <P>
        我问它怎么处理这个回撤，它加了 200 日趋势过滤：只持有站在自身 200 日均线之上的标的，赢家开始走坏就逐步转向现金。V3：+1047.39%，夏普 1.74，Calmar 2.07，回撤约 −40%。
      </P>
      <P>
        而这些超额收益到底是 alpha 还是暴露，需要一个回归来回答，而不是一句「跑赢了」：
      </P>
      <div className="my-5 text-foreground katex-display-gold">
        <EquationBlock
          math={String.raw`R_{p,t}-R_{f,t}=\alpha+\beta_{\mathrm{MKT}}\mathrm{MKT}_t+\beta_{\mathrm{SMB}}\mathrm{SMB}_t+\beta_{\mathrm{HML}}\mathrm{HML}_t+\beta_{\mathrm{RMW}}\mathrm{RMW}_t+\beta_{\mathrm{CMA}}\mathrm{CMA}_t+\varepsilon_t`}
        />
      </div>
      <P>
        把 V3 的净值序列丢进多因子归因，若 α 在扣除交易成本后不再显著，那 1047% 讲述的就只是一段被杠杆化的市场暴露史。
      </P>

      {/* Chapter 5 */}
      <H n="05" en={chapters[4].en} zh={chapters[4].zh} />
      <P>
        +829% 与 +1047% 都是回测，而且是在一个百年难遇的窗口上做的回测。2022–2026 是 AI 大盘科技的融涨期，动量策略在这样的趋势内部一定会打印出漂亮的曲线——并在趋势结束时剧烈反转。
      </P>
      <P>
        40% 以上的回撤不是假设，它就写在同一张结果表里，并且集中在少数几只标的上。回测不是预测；真实交易还要叠加手续费、滑点与资金费率，而这些在回测里通常被系统性低估。
      </P>
      <P>
        所以诚实的结论不是「这东西能印钱」。而是：它的推理方式像一个量化研究员——它告诉我我的想法是反的，用一次测试证明它，重建策略，并且拒绝把风险藏起来。可调用的判断力，而不是一台老虎机，才是这里真正的产品。
      </P>
      <P>
        本文的案例来自 Minara 的 Strategy Studio 会话记录，本站不做任何产品推荐；此处只保留它在方法论上可被检验的部分。
      </P>

      {/* Coda */}
      <div className="mt-16 pt-8 border-t border-border/60">
        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-3">Coda</p>
        <p className="font-display text-xl md:text-2xl leading-snug text-foreground/85">
          一个永远同意你的工具不是智能，它只是一面镜子。它第一次告诉我「你错了」的那一刻，它才从玩具变成了工具。
        </p>
      </div>

      {/* Reproduce in the lab */}
      <div className="mt-14">
        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-4">
          Reproduce in the Lab
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {linkedTools.map((t) => (
            <Link
              key={t.label}
              to={t.to}
              className="group rounded-xl border border-border/60 bg-card/40 p-4 hover:border-gold/50 hover:bg-card/60 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-20px_hsl(var(--gold)/0.35)] transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-base text-foreground group-hover:text-gold transition-colors">
                    {t.label}
                  </p>
                  <p className="mt-1 text-xs text-foreground/60">{t.note}</p>
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
          Backtest ≠ forecast. 本文所有数字均为历史回测结果，不构成任何投资建议。杠杆交易可能导致本金全部损失。
        </p>
      </div>
    </div>
  );
};

export default AiQuantStrategyEssay;

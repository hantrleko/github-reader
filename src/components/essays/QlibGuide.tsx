import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

/**
 * Reading guide for Microsoft Qlib: what the framework standardises, how its
 * layers fit together, and which parts are reproducible inside this site.
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

const Code = ({ children }: { children: string }) => (
  <pre className="my-5 overflow-x-auto rounded-xl border border-border bg-secondary/25 px-5 py-4 text-[12.5px] font-mono leading-[1.7] text-foreground/80">
    {children}
  </pre>
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

const LAB = "/s/qlib-lab";
const QUANT = "/s/quant";
const BACKTEST = "/s/backtest";
const THEORY = "/s/quant-theory";





export default function QlibGuide() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const layers = [
  { k: "Data Layer", zh: ({ zh: "数据层", en: "Data layer" })[isEn ? "en" : "zh"], d: ({ zh: "把行情、财务与另类数据统一成 (instrument, datetime) 的面板，并用表达式引擎在其上定义因子。", en: "Unify market, financial, and alternative data into an (instrument, datetime) panel, then define factors through an expression engine." })[isEn ? "en" : "zh"] },
  { k: "Expression", zh: ({ zh: "表达式引擎", en: "Expression engine" })[isEn ? "en" : "zh"], d: ({ zh: "$close / Ref($close,20) - 1 这类算子组合，Alpha158 / Alpha360 就是一整套预置表达式。", en: "Operator combinations such as $close / Ref($close,20) - 1; Alpha158 / Alpha360 are complete sets of predefined expressions." })[isEn ? "en" : "zh"] },
  { k: "Processor", zh: ({ zh: "预处理", en: "Preprocessing" })[isEn ? "en" : "zh"], d: ({ zh: "去极值、缺失填补、CSZScoreNorm 截面标准化、DropnaLabel，保证跨日期可比。", en: "Outlier treatment, missing-value imputation, CSZScoreNorm cross-sectional standardization, and DropnaLabel ensure comparability across dates." })[isEn ? "en" : "zh"] },
  { k: "Model", zh: ({ zh: "模型层", en: "Model layer" })[isEn ? "en" : "zh"], d: ({ zh: "LightGBM、线性模型、MLP、Transformer 共用同一 fit/predict 接口，可整体替换。", en: "LightGBM, linear models, MLPs, and Transformers share the same fit/predict interface and can be swapped as a whole." })[isEn ? "en" : "zh"] },
  { k: "Strategy", zh: ({ zh: "策略层", en: "Strategy layer" })[isEn ? "en" : "zh"], d: ({ zh: "TopkDropoutStrategy 等把预测分数转成持仓，是「信号 → 组合」的落点。", en: "TopkDropoutStrategy and similar strategies turn prediction scores into positions—the point where signals become portfolios." })[isEn ? "en" : "zh"] },
  { k: "Backtest", zh: ({ zh: "回测与执行", en: "Backtesting and execution" })[isEn ? "en" : "zh"], d: ({ zh: "嵌套执行器模拟日频决策与分钟级成交，含成本、涨跌停与成交量约束。", en: "Nested executors simulate daily decisions and minute-level fills, including costs, price limits, and volume constraints." })[isEn ? "en" : "zh"] },
  { k: "Workflow", zh: ({ zh: "工作流", en: "Workflow" })[isEn ? "en" : "zh"], d: ({ zh: "qrun + YAML 把上面全部串成可复现实验，记录到 MLflow 风格的 Recorder。", en: "qrun + YAML connect all layers into a reproducible experiment, logged in an MLflow-style Recorder." })[isEn ? "en" : "zh"] },
];
  const metrics = [
  { k: "IC", d: ({ zh: "预测值与未来收益的截面 Pearson 相关", en: "Cross-sectional Pearson correlation between predictions and future returns" })[isEn ? "en" : "zh"], g: ({ zh: "日频 0.03 以上即有价值", en: "Daily IC above 0.03 can be valuable" })[isEn ? "en" : "zh"] },
  { k: "RankIC", d: ({ zh: "改用秩相关，对极值稳健", en: "Rank correlation instead, robust to extremes" })[isEn ? "en" : "zh"], g: ({ zh: "通常比 IC 更稳定，优先看它", en: "Usually more stable than IC; examine it first" })[isEn ? "en" : "zh"] },
  { k: "ICIR", d: ({ zh: "mean(IC) / std(IC)，信号的稳定性", en: "mean(IC) / std(IC), measuring signal stability" })[isEn ? "en" : "zh"], g: ({ zh: "> 0.3 视为可用", en: "> 0.3 is considered usable" })[isEn ? "en" : "zh"] },
  { k: ({ zh: "IC 胜率", en: "IC hit rate" })[isEn ? "en" : "zh"], d: ({ zh: "IC 为正的交易日占比", en: "Share of trading days with positive IC" })[isEn ? "en" : "zh"], g: ({ zh: "> 55% 说明不是靠少数日子", en: "> 55% suggests results do not depend on just a few days" })[isEn ? "en" : "zh"] },
  { k: ({ zh: "分组单调性", en: "Group monotonicity" })[isEn ? "en" : "zh"], d: ({ zh: "按分数分 5 组后未来收益是否递增", en: "Whether future returns rise across five score-sorted groups" })[isEn ? "en" : "zh"], g: ({ zh: "只有头尾有效通常是噪声", en: "Only the extremes working is usually noise" })[isEn ? "en" : "zh"] },
];

  return (
    <article className="container max-w-4xl px-6 pb-24">
      <header className="pt-4">
        <p className="text-[10px] font-mono tracking-[0.3em] text-gold uppercase">Reading Guide · Microsoft Qlib</p>
        <h1 className="font-display text-3xl md:text-4xl text-foreground mt-3 leading-tight">
          {({ zh: "\n          Qlib 导读：把量化研究从脚本堆，变成一条可复现的流水线\n        ", en: "A Guide to Qlib: Turn Quant Research from a Pile of Scripts into a Reproducible Pipeline" })[isEn ? "en" : "zh"]}</h1>
        <p className="text-[15px] text-foreground/70 mt-4 leading-[1.85]">
          {({ zh: "\n          Qlib 是微软开源的 AI 量化投资平台。它真正解决的问题不是「多给你几个模型」，而是\n          ", en: "Qlib is Microsoft's open-source AI quantitative-investment platform. Its real contribution is not a few more models, but " })[isEn ? "en" : "zh"]}<strong className="text-foreground">{({ zh: "把数据、因子、模型、策略、回测固定成同一套接口", en: "a common set of interfaces for data, factors, models, strategies, and backtests" })[isEn ? "en" : "zh"]}</strong>{({ zh: "，\n          让一次实验可以被完整重跑、被别人复现、被逐层替换。这篇导读拆解它的七层结构，\n          并对应到本站可交互复现的实验室。\n        ", en: ", allowing complete reruns, independent reproduction, and layer-by-layer replacement. This guide unpacks its seven layers and links them to interactive labs on this site." })[isEn ? "en" : "zh"]}</p>
        <div className="mt-6">
          <ToolLink label={t("essays.qlibGuide.label30", { defaultValue: "Qlib 流水线实验室" })} note={({ zh: "因子 → 模型 → IC → TopK-Dropout 回测", en: "Factors → Model → IC → TopK-Dropout backtest" })[isEn ? "en" : "zh"]} to={LAB} />
        </div>
      </header>

      <H n="1" en="Why a framework" zh={({ zh: "为什么需要框架：研究的瓶颈不在模型", en: "Why a Framework: The Research Bottleneck Is Not the Model" })[isEn ? "en" : "zh"]} />
      <P>
        {({ zh: "\n        绝大多数量化研究失败于工程细节：标签对齐错位、训练集里混入了未来信息、成本没算、\n        换一个模型就要重写一遍数据管道。Qlib 的设计前提是——模型只是流水线里可替换的一环，\n        真正决定结论是否可信的是它前后的数据契约与评估协议。\n      ", en: "Most quant research fails on engineering details: misaligned labels, future information leaking into training, omitted costs, or a data pipeline rewritten for every model. Qlib assumes the model is just one replaceable link; the data contracts and evaluation protocols around it determine whether conclusions are credible." })[isEn ? "en" : "zh"]}</P>
      <P>
        {({ zh: "\n        因此它先规定数据形状：所有内容都是以 ", en: "It therefore specifies the data shape first: everything is a panel with a two-level " })[isEn ? "en" : "zh"]}<code className="font-mono text-gold text-[13px]">(instrument, datetime)</code>
        {({ zh: "\n        为双重索引的面板；再规定因子怎么写、标签怎么对齐、样本怎么切分，最后才谈模型。\n      ", en: " index; then it defines factor expressions, label alignment, and sample splits, and only afterward discusses models." })[isEn ? "en" : "zh"]}</P>

      <H n="2" en="Seven layers" zh={({ zh: "七层结构：一次实验经过哪些环节", en: "Seven Layers: The Stages of an Experiment" })[isEn ? "en" : "zh"]} />
      <div className="my-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-[13px]">
          <thead className="bg-secondary/30">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-gold">Layer</th>
              <th className="px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-gold">{t("essays.qlibGuide.label37", { defaultValue: "中文" })}</th>
              <th className="px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-gold">{t("essays.qlibGuide.label38", { defaultValue: "职责" })}</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((l) => (
              <tr key={l.k} className="border-t border-border/60">
                <td className="px-4 py-2.5 font-mono text-foreground/90 whitespace-nowrap">{l.k}</td>
                <td className="px-4 py-2.5 text-foreground/70 whitespace-nowrap">{l.zh}</td>
                <td className="px-4 py-2.5 text-foreground/70">{l.d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <H n="3" en="Alpha158 / Alpha360" zh={({ zh: "表达式因子：Alpha158 到底是什么", en: "Expression Factors: What Exactly Is Alpha158?" })[isEn ? "en" : "zh"]} />
      <P>
        {({ zh: "\n        Alpha158 是一组用表达式引擎写成的 158 个价量因子（K 线形态、滚动统计、动量、波动、量能），\n        Alpha360 则直接把过去 60 天的 6 类原始价量序列摊平成 360 维特征交给模型自己学。\n        前者是「人给结构」，后者是「模型找结构」。\n      ", en: "Alpha158 contains 158 expression-based price–volume factors (candlestick patterns, rolling statistics, momentum, volatility, and volume). Alpha360 instead flattens six raw price–volume series over the past 60 days into 360 features for the model to learn from. The former supplies human-designed structure; the latter asks the model to discover it." })[isEn ? "en" : "zh"]}</P>
      <Code>{({ zh: "# Qlib 表达式风格的因子定义\nROC20  : $close / Ref($close, 20) - 1\nMA20   : Mean($close, 20) / $close\nSTD20  : Std($close / Ref($close, 1) - 1, 20)\nRSV20  : ($close - Min($low, 20)) / (Max($high, 20) - Min($low, 20))\nLABEL  : Ref($close, -5) / Ref($close, -1) - 1   # 未来 5 日收益", en: "# Qlib expression-style factor definitions\nROC20  : $close / Ref($close, 20) - 1\nMA20   : Mean($close, 20) / $close\nSTD20  : Std($close / Ref($close, 1) - 1, 20)\nRSV20  : ($close - Min($low, 20)) / (Max($high, 20) - Min($low, 20))\nLABEL  : Ref($close, -5) / Ref($close, -1) - 1   # Forward 5-day return" })[isEn ? "en" : "zh"]}</Code>
      <Caution title={t("essays.qlibGuide.label42", { defaultValue: "标签对齐" })}>
        {({ zh: "\n        注意 Qlib 的标签常写成 ", en: "Qlib labels are often written as " })[isEn ? "en" : "zh"]}<code className="font-mono">Ref($close,-5)/Ref($close,-1)-1</code> {({ zh: " 而不是\n        除以今日收盘：假设 T 日收盘后出信号、T+1 开盘建仓，因此收益要从 T+1 起算。\n        少这一步，回测里就混进了当天收盘可交易的假设。\n      ", en: " rather than divided by today's close: a signal generated after the close on T enters at the open on T+1, so returns must start at T+1. Omitting this step slips an assumption of trading at that day's close into the backtest." })[isEn ? "en" : "zh"]}</Caution>
      <ToolLink label={t("essays.qlibGuide.label45", { defaultValue: "在实验室里切换因子" })} note={({ zh: "勾选 8 个 Alpha158 式因子并看权重变化", en: "Select eight Alpha158-style factors and observe weight changes" })[isEn ? "en" : "zh"]} to={LAB} />

      <H n="4" en="Cross-sectional normalisation" zh={({ zh: "截面归一化：让不同日期可比", en: "Cross-Sectional Normalization: Make Dates Comparable" })[isEn ? "en" : "zh"]} />
      <P>
        {({ zh: "\n        因子的绝对值在牛熊市里量纲完全不同，所以每个交易日都要在横截面上做一次标准化，\n        Qlib 里对应 ", en: "Absolute factor values have very different scales in bull and bear markets, so standardize the cross-section each trading day. In Qlib this is " })[isEn ? "en" : "zh"]}<code className="font-mono text-gold text-[13px]">CSZScoreNorm</code>{({ zh: "。\n        标签同样要做，否则模型会把「市场整体涨跌」当成可预测信号学进去。\n      ", en: ". Labels need the same treatment; otherwise the model learns broad market moves as if they were a predictable signal." })[isEn ? "en" : "zh"]}</P>
      <Eq note={({ zh: "z 在 ±3σ 处截断，抑制极值对回归的杠杆效应", en: "Clip z at ±3σ to reduce the leverage of extreme observations in regression" })[isEn ? "en" : "zh"]}>
        z<sub>i,t</sub> = ( f<sub>i,t</sub> − mean<sub>t</sub>(f) ) / std<sub>t</sub>(f)
      </Eq>
      <P>
        {({ zh: "\n        做完这一步，模型学到的是「谁比谁更好」，即纯横截面的相对排序，这正是多空组合真正交易的东西。\n      ", en: "The model then learns who ranks above whom—a purely cross-sectional relative ordering, exactly what a long–short portfolio actually trades." })[isEn ? "en" : "zh"]}</P>

      <H n="5" en="Model & evaluation" zh={({ zh: "模型与评估：先看 IC，再看净值", en: "Models and Evaluation: IC Before the Equity Curve" })[isEn ? "en" : "zh"]} />
      <P>
        {({ zh: "\n        Qlib 里 LightGBM 是默认强基线，但换成线性模型、MLP 或 Transformer 只是改一行配置。\n        评估顺序永远是：先确认信号本身有信息（IC / RankIC / 分组单调性），再看策略层能不能把它变成钱。\n      ", en: "LightGBM is Qlib's strong default baseline, but switching to a linear model, MLP, or Transformer takes one configuration line. Always evaluate in this order: verify that the signal contains information (IC / RankIC / group monotonicity), then ask whether the strategy layer can monetize it." })[isEn ? "en" : "zh"]}</P>
      <div className="my-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-[13px]">
          <thead className="bg-secondary/30">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-gold">{t("essays.qlibGuide.label54", { defaultValue: "指标" })}</th>
              <th className="px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-gold">{t("essays.qlibGuide.label55", { defaultValue: "含义" })}</th>
              <th className="px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-gold">{t("essays.qlibGuide.label56", { defaultValue: "经验阈值" })}</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.k} className="border-t border-border/60">
                <td className="px-4 py-2.5 font-mono text-foreground/90 whitespace-nowrap">{m.k}</td>
                <td className="px-4 py-2.5 text-foreground/70">{m.d}</td>
                <td className="px-4 py-2.5 text-foreground/70 whitespace-nowrap">{m.g}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Caution title={t("essays.qlibGuide.label57", { defaultValue: "常见误用" })}>
        {({ zh: "\n        用全样本训练再回测全样本，IC 会漂亮得离谱。Qlib 的 YAML 里\n        train / valid / test 三段时间是硬切分的，本站实验室同样按时间切分，所有展示指标均为样本外。\n      ", en: "Train and backtest on the full sample and IC becomes implausibly good. Qlib's YAML enforces separate train / valid / test periods. This site's lab also splits chronologically, and all displayed metrics are out of sample." })[isEn ? "en" : "zh"]}</Caution>

      <H n="6" en="TopK-Dropout" zh={({ zh: "TopK-Dropout：从分数到持仓", en: "TopK-Dropout: From Scores to Positions" })[isEn ? "en" : "zh"]} />
      <P>
        {({ zh: "\n        直接「每期买分数最高的 K 只」会带来极高换手。Qlib 的\n        ", en: "Buying the highest-scoring K names every period creates enormous turnover. Qlib's " })[isEn ? "en" : "zh"]}<code className="font-mono text-gold text-[13px]"> TopkDropoutStrategy </code>
        {({ zh: "\n        改为：保留现有持仓，每次只换掉排名最差的 n_drop 只，再从未持有的名单里补进最好的几只。\n        换手因此被 n_drop / K 直接控制住。\n      ", en: " instead retains existing positions, replaces only the worst-ranked n_drop holdings, and fills the vacancies with the best unheld names. Turnover is directly controlled by n_drop / K." })[isEn ? "en" : "zh"]}</P>
      <Eq note={({ zh: "每次调仓的单边换手上限，成本预算由此可控", en: "Upper bound on one-way turnover per rebalance, making the cost budget controllable" })[isEn ? "en" : "zh"]}>
        turnover ≈ n_drop / K
      </Eq>
      <P>
        {({ zh: "\n        这也解释了一个常见现象：IC 明明为正、净值却跑不赢基准——问题多半在 n_drop 太大或调仓太频繁，\n        成本吃掉了全部 alpha。在实验室里把 n_drop 从 2 调到 1 通常立刻能看出来。\n      ", en: "This explains a common puzzle: positive IC but an equity curve that trails the benchmark. Usually n_drop is too large or rebalancing too frequent, so costs consume all the alpha. Reducing n_drop from 2 to 1 in the lab often makes this immediately visible." })[isEn ? "en" : "zh"]}</P>
      <div>
        <ToolLink label={t("essays.qlibGuide.label64", { defaultValue: "Qlib 流水线实验室" })} note={({ zh: "调 TopK / n_drop / 成本看净值变化", en: "Adjust TopK / n_drop / costs and observe the equity curve" })[isEn ? "en" : "zh"]} to={LAB} />
        <ToolLink label={t("essays.qlibGuide.label66", { defaultValue: "量化策略实验室" })} note={({ zh: "单标的择时与因子分组的另一条线", en: "An alternative path: single-asset timing and factor groups" })[isEn ? "en" : "zh"]} to={QUANT} />
        <ToolLink label={t("essays.qlibGuide.label68", { defaultValue: "真实数据回测引擎" })} note={({ zh: "把结论搬到真实历史价格上", en: "Test the conclusions on actual historical prices" })[isEn ? "en" : "zh"]} to={BACKTEST} />
      </div>

      <H n="7" en="Workflow & reproducibility" zh={({ zh: "工作流：可复现才叫研究", en: "Workflow: Research Must Be Reproducible" })[isEn ? "en" : "zh"]} />
      <Code>{({ zh: "# qrun 配置骨架（简化）\ntask:\n  model:   {class: LGBModel, kwargs: {learning_rate: 0.05, num_leaves: 64}}\n  dataset:\n    handler: {class: Alpha158, kwargs: {start_time: 2010-01-01, ...}}\n    segments:\n      train: [2010-01-01, 2017-12-31]\n      valid: [2018-01-01, 2019-12-31]\n      test:  [2020-01-01, 2023-12-31]\n  record:\n    - SignalRecord          # 保存预测\n    - SigAnaRecord          # IC / RankIC / ICIR\n    - PortAnaRecord         # 组合回测与风险分析", en: "# qrun configuration skeleton (simplified)\ntask:\n  model:   {class: LGBModel, kwargs: {learning_rate: 0.05, num_leaves: 64}}\n  dataset:\n    handler: {class: Alpha158, kwargs: {start_time: 2010-01-01, ...}}\n    segments:\n      train: [2010-01-01, 2017-12-31]\n      valid: [2018-01-01, 2019-12-31]\n      test:  [2020-01-01, 2023-12-31]\n  record:\n    - SignalRecord          # Save predictions\n    - SigAnaRecord          # IC / RankIC / ICIR\n    - PortAnaRecord         # Portfolio backtesting and risk analysis" })[isEn ? "en" : "zh"]}</Code>
      <P>
        {({ zh: "\n        整份 YAML 就是实验的全部定义：换模型改一行、换因子集改一行、换时间段改三行，\n        其余保持不变。这种「配置即实验」的约束，比任何单个模型都更能提高研究的可信度。\n      ", en: "The YAML defines the entire experiment: change one line for a model, one for a factor set, or three for a time range; everything else stays fixed. This configuration-as-experiment discipline strengthens research credibility more than any individual model." })[isEn ? "en" : "zh"]}</P>
      <Caution title={t("essays.qlibGuide.label73", { defaultValue: "迁移到本站" })}>
        {({ zh: "\n        本站实验室用 TypeScript 复刻了这条流水线的核心环节（表达式因子、截面标准化、Ridge 拟合、\n        IC/RankIC/ICIR、TopK-Dropout），在浏览器里即可交互；真正的生产研究仍建议用 Qlib 本体，\n        它的数据缓存、嵌套执行器与在线服务是本站不涵盖的部分。\n      ", en: "This site's lab recreates the pipeline's core in TypeScript—expression factors, cross-sectional standardization, Ridge fitting, IC/RankIC/ICIR, and TopK-Dropout—interactively in the browser. For production research, use Qlib itself: its data caching, nested executors, and online serving are outside this site's scope." })[isEn ? "en" : "zh"]}</Caution>
      <div className="mt-8">
        <ToolLink label={t("essays.qlibGuide.label75", { defaultValue: "量化策略导读" })} note={({ zh: "信号 → 组合 → 成本 → 偏误的通用方法论", en: "A general methodology: signals → portfolios → costs → biases" })[isEn ? "en" : "zh"]} to={THEORY} />
      </div>

      <div className="mt-12 rounded-xl border border-border bg-card/40 px-5 py-4">
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold mb-2">Reference</p>
        <a
          href="https://github.com/microsoft/qlib"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-foreground hover:text-gold transition-colors inline-flex items-center gap-1.5"
        >
          microsoft/qlib — An AI-oriented Quantitative Investment Platform
          <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </article>
  );
}

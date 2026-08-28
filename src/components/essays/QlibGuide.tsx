import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

/**
 * Reading guide for Microsoft Qlib: what the framework standardises, how its
 * layers fit together, and which parts are reproducible inside this site.
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

const layers = [
  { k: "Data Layer", zh: "数据层", d: "把行情、财务与另类数据统一成 (instrument, datetime) 的面板，并用表达式引擎在其上定义因子。" },
  { k: "Expression", zh: "表达式引擎", d: "$close / Ref($close,20) - 1 这类算子组合，Alpha158 / Alpha360 就是一整套预置表达式。" },
  { k: "Processor", zh: "预处理", d: "去极值、缺失填补、CSZScoreNorm 截面标准化、DropnaLabel，保证跨日期可比。" },
  { k: "Model", zh: "模型层", d: "LightGBM、线性模型、MLP、Transformer 共用同一 fit/predict 接口，可整体替换。" },
  { k: "Strategy", zh: "策略层", d: "TopkDropoutStrategy 等把预测分数转成持仓，是「信号 → 组合」的落点。" },
  { k: "Backtest", zh: "回测与执行", d: "嵌套执行器模拟日频决策与分钟级成交，含成本、涨跌停与成交量约束。" },
  { k: "Workflow", zh: "工作流", d: "qrun + YAML 把上面全部串成可复现实验，记录到 MLflow 风格的 Recorder。" },
];

const metrics = [
  { k: "IC", d: "预测值与未来收益的截面 Pearson 相关", g: "日频 0.03 以上即有价值" },
  { k: "RankIC", d: "改用秩相关，对极值稳健", g: "通常比 IC 更稳定，优先看它" },
  { k: "ICIR", d: "mean(IC) / std(IC)，信号的稳定性", g: "> 0.3 视为可用" },
  { k: "IC 胜率", d: "IC 为正的交易日占比", g: "> 55% 说明不是靠少数日子" },
  { k: "分组单调性", d: "按分数分 5 组后未来收益是否递增", g: "只有头尾有效通常是噪声" },
];

export default function QlibGuide() {
  return (
    <article className="container max-w-4xl px-6 pb-24">
      <header className="pt-4">
        <p className="text-[10px] font-mono tracking-[0.3em] text-gold uppercase">Reading Guide · Microsoft Qlib</p>
        <h1 className="font-display text-3xl md:text-4xl text-foreground mt-3 leading-tight">
          Qlib 导读：把量化研究从脚本堆，变成一条可复现的流水线
        </h1>
        <p className="text-[15px] text-foreground/70 mt-4 leading-[1.85]">
          Qlib 是微软开源的 AI 量化投资平台。它真正解决的问题不是「多给你几个模型」，而是
          <strong className="text-foreground">把数据、因子、模型、策略、回测固定成同一套接口</strong>，
          让一次实验可以被完整重跑、被别人复现、被逐层替换。这篇导读拆解它的七层结构，
          并对应到本站可交互复现的实验室。
        </p>
        <div className="mt-6">
          <ToolLink label="Qlib 流水线实验室" note="因子 → 模型 → IC → TopK-Dropout 回测" to={LAB} />
        </div>
      </header>

      <H n="1" en="Why a framework" zh="为什么需要框架：研究的瓶颈不在模型" />
      <P>
        绝大多数量化研究失败于工程细节：标签对齐错位、训练集里混入了未来信息、成本没算、
        换一个模型就要重写一遍数据管道。Qlib 的设计前提是——模型只是流水线里可替换的一环，
        真正决定结论是否可信的是它前后的数据契约与评估协议。
      </P>
      <P>
        因此它先规定数据形状：所有内容都是以 <code className="font-mono text-gold text-[13px]">(instrument, datetime)</code>
        为双重索引的面板；再规定因子怎么写、标签怎么对齐、样本怎么切分，最后才谈模型。
      </P>

      <H n="2" en="Seven layers" zh="七层结构：一次实验经过哪些环节" />
      <div className="my-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-[13px]">
          <thead className="bg-secondary/30">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-gold">Layer</th>
              <th className="px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-gold">中文</th>
              <th className="px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-gold">职责</th>
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

      <H n="3" en="Alpha158 / Alpha360" zh="表达式因子：Alpha158 到底是什么" />
      <P>
        Alpha158 是一组用表达式引擎写成的 158 个价量因子（K 线形态、滚动统计、动量、波动、量能），
        Alpha360 则直接把过去 60 天的 6 类原始价量序列摊平成 360 维特征交给模型自己学。
        前者是「人给结构」，后者是「模型找结构」。
      </P>
      <Code>{`# Qlib 表达式风格的因子定义
ROC20  : $close / Ref($close, 20) - 1
MA20   : Mean($close, 20) / $close
STD20  : Std($close / Ref($close, 1) - 1, 20)
RSV20  : ($close - Min($low, 20)) / (Max($high, 20) - Min($low, 20))
LABEL  : Ref($close, -5) / Ref($close, -1) - 1   # 未来 5 日收益`}</Code>
      <Caution title="标签对齐">
        注意 Qlib 的标签常写成 <code className="font-mono">Ref($close,-5)/Ref($close,-1)-1</code> 而不是
        除以今日收盘：假设 T 日收盘后出信号、T+1 开盘建仓，因此收益要从 T+1 起算。
        少这一步，回测里就混进了当天收盘可交易的假设。
      </Caution>
      <ToolLink label="在实验室里切换因子" note="勾选 8 个 Alpha158 式因子并看权重变化" to={LAB} />

      <H n="4" en="Cross-sectional normalisation" zh="截面归一化：让不同日期可比" />
      <P>
        因子的绝对值在牛熊市里量纲完全不同，所以每个交易日都要在横截面上做一次标准化，
        Qlib 里对应 <code className="font-mono text-gold text-[13px]">CSZScoreNorm</code>。
        标签同样要做，否则模型会把「市场整体涨跌」当成可预测信号学进去。
      </P>
      <Eq note="z 在 ±3σ 处截断，抑制极值对回归的杠杆效应">
        z<sub>i,t</sub> = ( f<sub>i,t</sub> − mean<sub>t</sub>(f) ) / std<sub>t</sub>(f)
      </Eq>
      <P>
        做完这一步，模型学到的是「谁比谁更好」，即纯横截面的相对排序，这正是多空组合真正交易的东西。
      </P>

      <H n="5" en="Model & evaluation" zh="模型与评估：先看 IC，再看净值" />
      <P>
        Qlib 里 LightGBM 是默认强基线，但换成线性模型、MLP 或 Transformer 只是改一行配置。
        评估顺序永远是：先确认信号本身有信息（IC / RankIC / 分组单调性），再看策略层能不能把它变成钱。
      </P>
      <div className="my-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-[13px]">
          <thead className="bg-secondary/30">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-gold">指标</th>
              <th className="px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-gold">含义</th>
              <th className="px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-gold">经验阈值</th>
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
      <Caution title="常见误用">
        用全样本训练再回测全样本，IC 会漂亮得离谱。Qlib 的 YAML 里
        train / valid / test 三段时间是硬切分的，本站实验室同样按时间切分，所有展示指标均为样本外。
      </Caution>

      <H n="6" en="TopK-Dropout" zh="TopK-Dropout：从分数到持仓" />
      <P>
        直接「每期买分数最高的 K 只」会带来极高换手。Qlib 的
        <code className="font-mono text-gold text-[13px]"> TopkDropoutStrategy </code>
        改为：保留现有持仓，每次只换掉排名最差的 n_drop 只，再从未持有的名单里补进最好的几只。
        换手因此被 n_drop / K 直接控制住。
      </P>
      <Eq note="每次调仓的单边换手上限，成本预算由此可控">
        turnover ≈ n_drop / K
      </Eq>
      <P>
        这也解释了一个常见现象：IC 明明为正、净值却跑不赢基准——问题多半在 n_drop 太大或调仓太频繁，
        成本吃掉了全部 alpha。在实验室里把 n_drop 从 2 调到 1 通常立刻能看出来。
      </P>
      <div>
        <ToolLink label="Qlib 流水线实验室" note="调 TopK / n_drop / 成本看净值变化" to={LAB} />
        <ToolLink label="量化策略实验室" note="单标的择时与因子分组的另一条线" to={QUANT} />
        <ToolLink label="真实数据回测引擎" note="把结论搬到真实历史价格上" to={BACKTEST} />
      </div>

      <H n="7" en="Workflow & reproducibility" zh="工作流：可复现才叫研究" />
      <Code>{`# qrun 配置骨架（简化）
task:
  model:   {class: LGBModel, kwargs: {learning_rate: 0.05, num_leaves: 64}}
  dataset:
    handler: {class: Alpha158, kwargs: {start_time: 2010-01-01, ...}}
    segments:
      train: [2010-01-01, 2017-12-31]
      valid: [2018-01-01, 2019-12-31]
      test:  [2020-01-01, 2023-12-31]
  record:
    - SignalRecord          # 保存预测
    - SigAnaRecord          # IC / RankIC / ICIR
    - PortAnaRecord         # 组合回测与风险分析`}</Code>
      <P>
        整份 YAML 就是实验的全部定义：换模型改一行、换因子集改一行、换时间段改三行，
        其余保持不变。这种「配置即实验」的约束，比任何单个模型都更能提高研究的可信度。
      </P>
      <Caution title="迁移到本站">
        本站实验室用 TypeScript 复刻了这条流水线的核心环节（表达式因子、截面标准化、Ridge 拟合、
        IC/RankIC/ICIR、TopK-Dropout），在浏览器里即可交互；真正的生产研究仍建议用 Qlib 本体，
        它的数据缓存、嵌套执行器与在线服务是本站不涵盖的部分。
      </Caution>
      <div className="mt-8">
        <ToolLink label="量化策略导读" note="信号 → 组合 → 成本 → 偏误的通用方法论" to={THEORY} />
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

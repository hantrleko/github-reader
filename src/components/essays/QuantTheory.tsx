import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

/**
 * Reading guide for quantitative strategy: signal → construction → costs →
 * backtest biases → evaluation → live slippage.
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

const QUANT = "/s/quant";
const BACKTEST = "/s/backtest";
const CALIB = "/s/calibration";
const FRONTIER = "/s/frontier";



export default function QuantTheory() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const biases = [
  { k: ({ zh: "前视偏误", en: "Look-ahead bias" })[isEn ? "en" : "zh"], d: ({ zh: "使用了当时不可得的信息", en: "Using information unavailable at the time" })[isEn ? "en" : "zh"], f: ({ zh: "所有特征加上发布滞后（财报按 filing date 对齐）", en: "Apply publication lags to every feature (align financial reports by filing date)" })[isEn ? "en" : "zh"] },
  { k: ({ zh: "幸存者偏误", en: "Survivorship bias" })[isEn ? "en" : "zh"], d: ({ zh: "样本只含今天仍存活的标的", en: "The sample includes only assets still alive today" })[isEn ? "en" : "zh"], f: ({ zh: "使用含退市/并购的全历史成分股", en: "Use full historical constituents, including delistings and mergers" })[isEn ? "en" : "zh"] },
  { k: ({ zh: "过拟合", en: "Overfitting" })[isEn ? "en" : "zh"], d: ({ zh: "在同一份数据上反复搜索参数", en: "Repeatedly searching parameters on the same data" })[isEn ? "en" : "zh"], f: ({ zh: "样本外、Walk-Forward、Deflated Sharpe", en: "Out-of-sample tests, Walk-Forward, Deflated Sharpe" })[isEn ? "en" : "zh"] },
  { k: ({ zh: "成本忽略", en: "Ignoring costs" })[isEn ? "en" : "zh"], d: ({ zh: "按收盘价无摩擦成交", en: "Assuming frictionless fills at the closing price" })[isEn ? "en" : "zh"], f: ({ zh: "价差 + 冲击 + 融券费的显式建模", en: "Explicitly model spreads + impact + stock-borrow fees" })[isEn ? "en" : "zh"] },
  { k: ({ zh: "容量幻觉", en: "Capacity illusion" })[isEn ? "en" : "zh"], d: ({ zh: "小市值上的高换手信号", en: "High-turnover signals in small-cap stocks" })[isEn ? "en" : "zh"], f: ({ zh: "按 ADV 限仓，做容量-收益曲线", en: "Cap positions by ADV and plot capacity–return curves" })[isEn ? "en" : "zh"] },
];

  return (
    <article className="container max-w-4xl px-6 pb-24">
      <header className="pt-4">
        <p className="text-[10px] font-mono tracking-[0.3em] text-gold uppercase">Reading Guide · Quant Strategy</p>
        <h1 className="font-display text-3xl md:text-4xl text-foreground mt-3 leading-tight">
          {({ zh: "\n          量化策略导读：从一个信号，到组合、成本、回测偏误与实盘落差\n        ", en: "A Guide to Quant Strategies: From Signals to Portfolios, Costs, Backtest Biases, and Live Trading" })[isEn ? "en" : "zh"]}</h1>
        <p className="text-[15px] text-foreground/70 mt-4 leading-[1.85]">
          {({ zh: "\n          量化策略不是「找到一个能预测的指标」，而是\n          ", en: "A quant strategy is not about finding a predictive indicator; it is about " })[isEn ? "en" : "zh"]}<strong className="text-foreground">{({ zh: "把一个微弱的统计优势，在成本、容量与风险约束下稳定地重复很多次", en: "repeating a weak statistical edge reliably, many times, under cost, capacity, and risk constraints" })[isEn ? "en" : "zh"]}</strong>{({ zh: "。\n          这篇导读按研究流水线的真实顺序展开，每一节都指向站内可复现的实验。\n        ", en: ". This guide follows the actual research pipeline, linking each stage to reproducible experiments on this site." })[isEn ? "en" : "zh"]}</p>
        <div className="mt-6">
          <ToolLink label={t("essays.quantTheory.label19", { defaultValue: "量化策略实验室" })} note={({ zh: "因子构建 · 分组回测 · 信号评估", en: "Factor construction · Group backtests · Signal evaluation" })[isEn ? "en" : "zh"]} to={QUANT} />
        </div>
      </header>

      <H n="1" en="Signal Construction" zh={({ zh: "信号构建：从假设出发，而不是从数据出发", en: "Signal Construction: Start with a Hypothesis, Not the Data" })[isEn ? "en" : "zh"]} />
      <P>
        {({ zh: "\n        先写下经济学理由（风险补偿、行为偏差还是结构性摩擦），再去数据里检验。反过来做——先扫描再编故事——\n        几乎必然得到一个只存在于样本内的信号。原始特征要经过去极值、行业与市值中性化、截面标准化，\n        才能变成可比的 z-score。\n      ", en: "Write down the economic rationale first—risk compensation, behavioral bias, or structural friction—then test it in the data. Scanning first and inventing a story afterward almost guarantees an in-sample-only signal. Raw features need outlier treatment, industry and size neutralization, and cross-sectional standardization to become comparable z-scores." })[isEn ? "en" : "zh"]}</P>
      <Eq note={({ zh: "信息系数：预测值与未来收益的截面相关；IC_IR = mean(IC)/std(IC)", en: "Information coefficient: cross-sectional correlation of predictions with future returns; IC_IR = mean(IC)/std(IC)" })[isEn ? "en" : "zh"]}>
        IC_t = corr( z_{"{i,t}"} , r_{"{i,t+1}"} )
      </Eq>
      <P>
        {({ zh: "\n        用「基本面法则」判断一个信号值不值得做：IR ≈ IC × √Breadth。IC 只有 0.03 并不致命，\n        前提是你能在足够多的独立标的上重复它。\n      ", en: "Use the fundamental law to judge whether a signal is worth trading: IR ≈ IC × √Breadth. An IC of just 0.03 is not fatal if you can repeat it across enough independent assets." })[isEn ? "en" : "zh"]}</P>
      <ToolLink label={t("essays.quantTheory.label25", { defaultValue: "因子分组与 IC 检验" })} note={({ zh: "分位数分组、多空组合、IC 衰减", en: "Quantile groups, long–short portfolios, IC decay" })[isEn ? "en" : "zh"]} to={QUANT} />

      <H n="2" en="Portfolio Construction" zh={({ zh: "组合构建：从预测到权重", en: "Portfolio Construction: From Predictions to Weights" })[isEn ? "en" : "zh"]} />
      <P>
        {({ zh: "\n        预测值不是权重。把 α 变成持仓要经过风险模型与约束：行业/风格暴露上限、单票权重上限、换手预算。\n        均值-方差是骨架，但对 μ 的估计误差极其敏感，实盘更常用收缩协方差、风险平价或带换手惩罚的目标函数。\n      ", en: "Predictions are not weights. Turning α into positions requires a risk model and constraints: industry/style exposure limits, single-name weight caps, and a turnover budget. Mean–variance is the skeleton, but it is highly sensitive to estimation error in μ; live portfolios more often use covariance shrinkage, risk parity, or objectives with turnover penalties." })[isEn ? "en" : "zh"]}</P>
      <Eq note={({ zh: "加入换手惩罚后的组合目标；λ 控制风险厌恶，γ 控制交易摩擦", en: "Portfolio objective with a turnover penalty; λ controls risk aversion and γ controls trading friction" })[isEn ? "en" : "zh"]}>
        max<sub>w</sub> wᵀμ − (λ/2)·wᵀΣw − γ·‖w − w₋‖₁
      </Eq>
      <div>
        <ToolLink label={t("essays.quantTheory.label30", { defaultValue: "有效前沿与稳健优化" })} note={({ zh: "收缩估计、风险平价、Black-Litterman", en: "Shrinkage estimation, risk parity, Black–Litterman" })[isEn ? "en" : "zh"]} to={FRONTIER} />
      </div>

      <H n="3" en="Transaction Costs" zh={({ zh: "交易成本：策略死亡的第一现场", en: "Transaction Costs: Where Strategies First Die" })[isEn ? "en" : "zh"]} />
      <P>
        {({ zh: "\n        成本由三部分构成：显性费用、买卖价差、以及随成交量非线性上升的冲击成本。经验上冲击近似平方根律，\n        这意味着规模翻倍时单位成本上升，容量天花板由此产生。\n      ", en: "Costs have three components: explicit fees, bid–ask spreads, and impact costs that rise nonlinearly with volume. Empirically, impact approximately follows a square-root law, so doubling size raises unit costs and creates a capacity ceiling." })[isEn ? "en" : "zh"]}</P>
      <Eq note={({ zh: "平方根冲击模型：Q 为订单量，ADV 为日均成交量", en: "Square-root impact model: Q is order size and ADV is average daily volume" })[isEn ? "en" : "zh"]}>
        Impact ≈ η · σ · √(Q / ADV)
      </Eq>
      <Caution title={t("essays.quantTheory.label35", { defaultValue: "经验法则" })}>
        {({ zh: "\n        把毛收益减去成本后再看排名。很多「高换手高 Sharpe」的信号在 10bp 双边成本下净收益即归零——\n        先算成本盈亏平衡换手率，再决定要不要继续研究。\n      ", en: "Rank signals after subtracting costs from gross returns. Many high-turnover, high-Sharpe signals have zero net returns with 10bp round-trip costs. Calculate break-even turnover before deciding whether to continue research." })[isEn ? "en" : "zh"]}</Caution>

      <H n="4" en="Backtest Pitfalls" zh={({ zh: "回测偏误清单：默认自己错了", en: "Backtest Bias Checklist: Assume You Are Wrong" })[isEn ? "en" : "zh"]} />
      <div className="my-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-secondary/40 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">{t("essays.quantTheory.label38", { defaultValue: "偏误" })}</th>
              <th className="px-4 py-3">{t("essays.quantTheory.label39", { defaultValue: "表现" })}</th>
              <th className="px-4 py-3">{t("essays.quantTheory.label40", { defaultValue: "对策" })}</th>
            </tr>
          </thead>
          <tbody>
            {biases.map((b) => (
              <tr key={b.k} className="border-t border-border/60 align-top">
                <td className="px-4 py-3 font-mono text-gold whitespace-nowrap">{b.k}</td>
                <td className="px-4 py-3 text-foreground/80">{b.d}</td>
                <td className="px-4 py-3 text-foreground/60">{b.f}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Eq note={({ zh: "多重检验修正：N 次独立尝试后，最优 Sharpe 的期望本身就是正的", en: "Multiple-testing correction: after N independent attempts, the expected best Sharpe is already positive" })[isEn ? "en" : "zh"]}>
        Deflated SR = SR<sub>obs</sub> {({ zh: " 经 N 次试验与偏度峰度调整后的显著性\n      ", en: " significance adjusted for N trials, skewness, and kurtosis" })[isEn ? "en" : "zh"]}</Eq>
      <ToolLink label={t("essays.quantTheory.label43", { defaultValue: "回测实验室" })} note={({ zh: "Walk-Forward、样本外切分、参数热力图", en: "Walk-Forward, out-of-sample splits, parameter heatmaps" })[isEn ? "en" : "zh"]} to={BACKTEST} />

      <H n="5" en="Evaluation" zh={({ zh: "评价指标：不要只看 Sharpe", en: "Evaluation: Look Beyond Sharpe" })[isEn ? "en" : "zh"]} />
      <P>
        {({ zh: "\n        Sharpe 假设收益近似正态且独立，但策略收益常有负偏与厚尾。至少同时看：最大回撤与回撤持续期、\n        Sortino、Calmar、换手与容量、收益的集中度（是否由少数几天贡献）、以及与主流因子的回归 α。\n      ", en: "Sharpe assumes approximately normal, independent returns, but strategy returns often have negative skew and fat tails. Also examine maximum drawdown and duration, Sortino, Calmar, turnover and capacity, return concentration (whether a few days drive performance), and regression α against established factors." })[isEn ? "en" : "zh"]}</P>
      <Eq note={({ zh: "剥离已知因子后的真实增量；t(α) 才是判断标准", en: "True incremental performance after removing known factors; t(α) is the criterion" })[isEn ? "en" : "zh"]}>
        r<sub>p,t</sub> − r<sub>f</sub> = α + Σ βₖ·Fₖ,t + ε
      </Eq>
      <ToolLink label={t("essays.quantTheory.label48", { defaultValue: "参数标定与稳健性" })} note={({ zh: "似然/矩估计、参数敏感性", en: "Likelihood / moment estimation, parameter sensitivity" })[isEn ? "en" : "zh"]} to={CALIB} />

      <H n="6" en="Live Implementation" zh={({ zh: "实盘落差：回测与现实之间的那 30%", en: "Live Trading: The 30% Gap Between Backtests and Reality" })[isEn ? "en" : "zh"]} />
      <P>
        {({ zh: "\n        落差来自四处：成交假设（收盘价 vs VWAP vs 实际排队）、数据修订（宏观与财报会被回溯修改）、\n        制度变化（涨跌停、融券可得性、监管窗口），以及策略拥挤（同类资金同时进出把 α 提前吃掉）。\n      ", en: "The gap has four sources: fill assumptions (close vs VWAP vs actual queue position), data revisions (macro and financial reports are revised retrospectively), changing rules (price limits, stock-borrow availability, regulatory windows), and strategy crowding (similar funds entering and exiting together consume α early)." })[isEn ? "en" : "zh"]}</P>
      <Caution title={t("essays.quantTheory.label52", { defaultValue: "上线检查清单" })}>
        {({ zh: "\n        ① 纸上交易跑满一个完整市场周期；② 设定信号衰减监控与自动降杠杆阈值；\n        ③ 记录每笔实际成交与回测假设的差异，形成 slippage 归因；④ 事先写好停用条件，而不是亏损后再讨论。\n      ", en: "① Paper-trade through a full market cycle; ② Monitor signal decay and set automatic deleveraging thresholds; ③ Record differences between actual fills and backtest assumptions for slippage attribution; ④ Write shutdown conditions in advance, not after losses." })[isEn ? "en" : "zh"]}</Caution>
      <div className="mt-6">
        <ToolLink label={t("essays.quantTheory.label54", { defaultValue: "进入量化策略实验室" })} note={({ zh: "把上面每一步都跑一遍", en: "Run every step above" })[isEn ? "en" : "zh"]} to={QUANT} />
        <ToolLink label={t("essays.quantTheory.label56", { defaultValue: "回测与稳健性检验" })} note={({ zh: "Walk-Forward 与偏误诊断", en: "Walk-Forward and bias diagnostics" })[isEn ? "en" : "zh"]} to={BACKTEST} />
      </div>
    </article>
  );
}

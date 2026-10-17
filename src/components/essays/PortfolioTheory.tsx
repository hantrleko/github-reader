import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import EquationBlock from "@/components/common/EquationBlock";
import Reveal from "@/components/common/Reveal";

/**
 * Structured reading guide for the portfolio-theory toolkit (V5.6).
 * Chain: the allocation problem → MPT → equilibrium pricing → constraints &
 * execution → extensions → history → frontier → workflow → misuse checklist.
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

const ToolLink = ({ label, note }: { label: string; note: string }) => (
  <Link
    to="/s/quant"
    className="group inline-flex items-start gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2 mr-2 mb-2 hover:border-gold/50 hover:bg-card/60 transition-all"
  >
    <span>
      <span className="block text-sm text-foreground group-hover:text-gold transition-colors">{label}</span>
      <span className="block text-[11px] text-foreground/55">{note}</span>
    </span>
    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-gold transition-colors mt-0.5 shrink-0" />
  </Link>
);

const chainContent = {
  zh: [
  { k: "目标", v: "效用 / 风险预算", note: "先问投资者是谁、约束是什么，再谈优化" },
  { k: "输入", v: "μ, Σ 与观点", note: "均值最难估，协方差次之，结构假设决定成败" },
  { k: "优化", v: "目标函数 + 约束", note: "约束不是技术细节，而是投资主张的一部分" },
  { k: "执行", v: "再平衡与成本", note: "纸面最优减去交易摩擦才是可实现收益" },
  { k: "评价", v: "样本外与归因", note: "区分运气、beta 暴露与真正的 alpha" },
],
  en: [
  { k: "Objective", v: "Utility / risk budget", note: "Identify the investor and constraints before optimizing" },
  { k: "Inputs", v: "μ, Σ, and views", note: "Means are hardest to estimate, covariances next; structural assumptions determine success" },
  { k: "Optimization", v: "Objective function + constraints", note: "Constraints are part of the investment thesis, not technical details" },
  { k: "Execution", v: "Rebalancing and costs", note: "Paper-optimal returns minus trading frictions yield achievable returns" },
  { k: "Evaluation", v: "Out-of-sample results and attribution", note: "Distinguish luck, beta exposure, and genuine alpha" },
],
};

const layersContent = {
  zh: [
  { n: "L1", t: "选择与几何", d: "均值—方差前沿、CAL、两基金分离与零贝塔 CAPM", tools: "前沿几何台 · 单指数模型" },
  { n: "L2", t: "均衡定价", d: "CAPM、受限借贷、因子定价与可投资组合", tools: "Fama-French 归因 · 因子风险预算" },
  { n: "L3", t: "估计与稳健", d: "估计误差、收缩、贝叶斯先验、重采样", tools: "估计误差实验室 · 收缩协方差 · Black-Litterman · Michaud 重采样" },
  { n: "L4", t: "风险与约束", d: "下行风险、尾部优化、约束设计与再平衡执行", tools: "下行风险与随机占优 · Mean-CVaR · 约束与再平衡成本" },
  { n: "L5", t: "主动与增长", d: "基本法则、Treynor-Black、Kelly 与破产约束", tools: "主动管理与信息比率 · Kelly 破产实验室" },
  { n: "L6", t: "动态与高维", d: "多期最优、对冲需求、生命周期、正则化与分散化", tools: "多期动态配置 · 高维正则化与 MDP · 风险平价" },
],
  en: [
  { n: "L1", t: "Choice and geometry", d: "Mean–variance frontier, CAL, two-fund separation, and zero-beta CAPM", tools: "Frontier geometry · Single-index model" },
  { n: "L2", t: "Equilibrium pricing", d: "CAPM, restricted borrowing, factor pricing, and investable portfolios", tools: "Fama–French attribution · Factor risk budgeting" },
  { n: "L3", t: "Estimation and robustness", d: "Estimation error, shrinkage, Bayesian priors, and resampling", tools: "Estimation error lab · Covariance shrinkage · Black–Litterman · Michaud resampling" },
  { n: "L4", t: "Risk and constraints", d: "Downside risk, tail optimization, constraint design, and rebalancing execution", tools: "Downside risk and stochastic dominance · Mean-CVaR · Constraints and rebalancing costs" },
  { n: "L5", t: "Active management and growth", d: "Fundamental law, Treynor–Black, Kelly, and ruin constraints", tools: "Active management and information ratio · Kelly ruin lab" },
  { n: "L6", t: "Dynamics and high dimensions", d: "Multiperiod optimization, hedging demand, lifecycle, regularization, and diversification", tools: "Dynamic allocation · High-dimensional regularization and MDP · Risk parity" },
],
};

const measuresContent = {
  zh: [
  { name: "方差 / 波动率", use: "对称、可加、优化友好", limit: "把上行波动也当成风险；对肥尾与偏度视而不见" },
  { name: "半方差 / LPM", use: "只惩罚低于目标的结果", limit: "估计噪声更大，目标 τ 的选择带有主观性" },
  { name: "VaR", use: "监管与限额沟通的通用语言", limit: "不次可加，忽略超出分位点的尾部形状" },
  { name: "CVaR / ES", use: "一致性风险度量，可线性规划优化", limit: "对尾部样本极其敏感，需要足够的情景数" },
  { name: "最大回撤", use: "路径风险与投资者行为约束", limit: "统计性质差、样本依赖强，难以直接优化" },
  { name: "跟踪误差", use: "主动风险预算与授权约束", limit: "相对基准的安全≠绝对安全，基准本身也可能崩塌" },
],
  en: [
  { name: "Variance / volatility", use: "Symmetric, additive, optimization-friendly", limit: "Treats upside volatility as risk; ignores fat tails and skewness" },
  { name: "Semivariance / LPM", use: "Penalizes only outcomes below the target", limit: "Noisier estimates; choosing target τ is subjective" },
  { name: "VaR", use: "Common language for regulation and limit communication", limit: "Not subadditive; ignores tail shape beyond the quantile" },
  { name: "CVaR / ES", use: "Coherent risk measure; supports linear-programming optimization", limit: "Extremely sensitive to tail samples; requires enough scenarios" },
  { name: "Maximum drawdown", use: "Path risk and investor behavioral constraints", limit: "Poor statistical properties, strong sample dependence, difficult to optimize directly" },
  { name: "Tracking error", use: "Active risk budgets and mandate constraints", limit: "Safety relative to a benchmark ≠ absolute safety; the benchmark can also collapse" },
],
};

const timelineContent = {
  zh: [
  { y: "1952", t: "Markowitz 组合选择", d: "把「风险」形式化为方差与协方差，分散化第一次有了数学定义" },
  { y: "1958", t: "Tobin 分离定理", d: "无风险资产的引入让风险偏好与组合构建彻底分离" },
  { y: "1963", t: "Sharpe 单指数模型", d: "N(N+1)/2 个协方差压缩为 2N+1 个参数，让优化在计算上可行" },
  { y: "1964–66", t: "CAPM", d: "Sharpe-Lintner-Mossin：只有系统性风险被定价，β 成为核心语言" },
  { y: "1972", t: "Black 零贝塔 CAPM", d: "放松无限借贷假设：SML 截距抬升、斜率变平，实证异象随之出现" },
  { y: "1976", t: "Ross APT", d: "无套利而非均衡：多因子定价打开了因子投资的大门" },
  { y: "1980s", t: "Grinold 基本法则与主动管理", d: "IR ≈ IC·√BR，把「能力」与「广度」变成可核算的量" },
  { y: "1990–92", t: "Black-Litterman 与 Fama-French", d: "贝叶斯先验驯服优化器；三因子模型挑战单因子 CAPM" },
  { y: "2003–09", t: "收缩、重采样与范数约束", d: "Ledoit-Wolf、Michaud、DeMiguel：稳健性成为一等公民，1/N 成为强基准" },
  { y: "2010s", t: "风险平价与智能贝塔", d: "从分资金到分风险；因子被工业化、被拥挤、也被质疑" },
  { y: "2020s", t: "高维、机器学习与可持续", d: "正则化与交叉验证进入组合构建，气候与 ESG 成为新的约束维度" },
],
  en: [
  { y: "1952", t: "Markowitz portfolio selection", d: "Formalized risk as variance and covariance, giving diversification its first mathematical definition" },
  { y: "1958", t: "Tobin separation theorem", d: "Introducing a risk-free asset completely separates risk preferences from portfolio construction" },
  { y: "1963", t: "Sharpe single-index model", d: "Compresses N(N+1)/2 covariances into 2N+1 parameters, making optimization computationally feasible" },
  { y: "1964–66", t: "CAPM", d: "Sharpe–Lintner–Mossin: only systematic risk is priced; β becomes the core language" },
  { y: "1972", t: "Black zero-beta CAPM", d: "Relaxing unlimited borrowing raises the SML intercept and flattens its slope; empirical anomalies follow" },
  { y: "1976", t: "Ross APT", d: "No arbitrage rather than equilibrium: multifactor pricing opens the door to factor investing" },
  { y: "1980s", t: "Grinold's fundamental law and active management", d: "IR ≈ IC·√BR makes skill and breadth quantifiable" },
  { y: "1990–92", t: "Black–Litterman and Fama–French", d: "Bayesian priors tame the optimizer; three factors challenge single-factor CAPM" },
  { y: "2003–09", t: "Shrinkage, resampling, and norm constraints", d: "Ledoit–Wolf, Michaud, DeMiguel: robustness becomes central, and 1/N a strong benchmark" },
  { y: "2010s", t: "Risk parity and smart beta", d: "From allocating capital to allocating risk; factors become industrialized, crowded, and contested" },
  { y: "2020s", t: "High dimensions, machine learning, and sustainability", d: "Regularization and cross-validation enter portfolio construction; climate and ESG add constraint dimensions" },
],
};

const checklistContent = {
  zh: [
  "不要把点估计当真值：任何 μ 都应带着标准误进入优化器，最好再加一层收缩或先验。",
  "先看 1/N 与最小方差的基准表现，再判断复杂模型是否真的创造了价值。",
  "报告样本外结果时明确窗口方案（滚动 / 递归），并把再平衡成本扣掉。",
  "分散化看的是风险来源而非资产名称：检查因子暴露与压力期相关性，而不是持仓数量。",
  "约束要写成投资主张：为什么设这个上限、这个换手预算，而不是「优化器不收敛所以加约束」。",
  "主动风险预算应由 IC 与广度支撑，而不是由业绩目标倒推。",
  "尾部相关的应用（杠杆、期权、私募）用 CVaR 或随机占优复核，不要只看方差。",
  "多期问题不要用单期解硬套：先问收益是否可预测、负债与人力资本是什么形状。",
  "回测中的任何参数选择都要计入多重比较成本，样本外验证与模型置信集是最低标准。",
],
  en: [
  "Do not treat point estimates as truth: every μ should enter the optimizer with a standard error, preferably with shrinkage or a prior as well.",
  "Examine 1/N and minimum-variance benchmarks before deciding whether a complex model truly adds value.",
  "Specify the window scheme (rolling / recursive) when reporting out-of-sample results, and deduct rebalancing costs.",
  "Diversification concerns sources of risk, not asset names: inspect factor exposures and stressed correlations, not the number of holdings.",
  "Express constraints as investment theses: explain each cap and turnover budget, rather than adding constraints because the optimizer will not converge.",
  "Support active risk budgets with IC and breadth, rather than reverse-engineering them from performance targets.",
  "For tail-sensitive applications (leverage, options, private investments), cross-check with CVaR or stochastic dominance rather than variance alone.",
  "Do not force single-period solutions onto multiperiod problems: first examine return predictability and the structure of liabilities and human capital.",
  "Account for multiple comparisons in every backtest parameter choice; out-of-sample validation and model confidence sets are minimum standards.",
],
};

const PortfolioTheory = () => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const chain = chainContent[isEn ? "en" : "zh"];
  const layers = layersContent[isEn ? "en" : "zh"];
  const measures = measuresContent[isEn ? "en" : "zh"];
  const timeline = timelineContent[isEn ? "en" : "zh"];
  const checklist = checklistContent[isEn ? "en" : "zh"];
  return (
  <div className="container max-w-3xl px-6 pt-6 pb-24">
    <Reveal>
      <p className="text-[10px] font-mono tracking-[0.3em] text-gold uppercase mb-3">Reading Guide · V5.6</p>
      <h1 className="font-display text-3xl md:text-[42px] leading-[1.15] text-foreground mb-4">
        {t("essays.portfolio.text1", { defaultValue: "投资组合理论导读 · 从均值—方差到稳健与动态配置" })}
      </h1>
      <p className="text-[15px] leading-[1.85] text-foreground/70">
        {({ zh: "组合问题从来不是「找到收益最高的资产」，而是在不确定性、约束与交易摩擦下，把有限且噪声很大的信息，\n        转化为可持续承担的风险暴露。本文按九个层次组织理论地图，每一块都可以跳到资产配置版块的实验室里复现。", en: "Portfolio choice is never simply finding the highest-returning asset. It means turning limited, noisy information into sustainable risk exposures under uncertainty, constraints, and trading frictions. This guide organizes the theory map into nine layers, each reproducible in the asset-allocation labs." })[isEn ? "en" : "zh"]}
      </p>
    </Reveal>

    <Reveal>
      <H n="01" en="The Allocation Problem" zh={t("essays.portfolio.text2", { defaultValue: "一、组合理论究竟在解决什么" })} />
      <P>
        {({ zh: "设有 N 个风险资产、权重向量 w 满足预算约束，投资者面对的不是确定收益而是条件分布。所有配置问题都可以拆成四问：\n        风险—收益如何权衡、什么时候才算真分散、给定目标与约束资本如何分配、以及当所有人同时优化时市场会给什么风险定价。", en: "With N risky assets and a weight vector w satisfying the budget constraint, investors face conditional distributions, not certain returns. Every allocation problem reduces to four questions: how to balance risk and return, what constitutes real diversification, how to allocate capital given objectives and constraints, and which risks markets price when everyone optimizes simultaneously." })[isEn ? "en" : "zh"]}
      </P>
      <EquationBlock math={String.raw`\mu_p = w^{\!\top}\mu,\qquad \sigma_p^{2} = w^{\!\top}\Sigma w = \sum_i w_i^2\sigma_i^2 + \sum_{i\neq j} w_i w_j \rho_{ij}\sigma_i\sigma_j`} />
      <P>
        {({ zh: "最后一项才是分散化的钥匙。只要相关系数小于 1，混合就能降低波动；反过来说，持有几十个名称各异、\n        却同时暴露于同一增长或流动性因子的资产，并不构成分散化。", en: "The final term is the key to diversification. When correlation is below 1, combining assets can reduce volatility. Conversely, owning dozens of differently named assets all exposed to the same growth or liquidity factor is not diversification." })[isEn ? "en" : "zh"]}
      </P>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 my-6">
        {chain.map((c) => (
          <div key={c.k} className="rounded-lg border border-border/60 bg-card/30 p-3">
            <p className="text-[10px] font-mono text-gold uppercase tracking-wider">{c.k}</p>
            <p className="text-sm text-foreground mt-1">{c.v}</p>
            <p className="text-[11px] text-foreground/55 mt-1 leading-relaxed">{c.note}</p>
          </div>
        ))}
      </div>
    </Reveal>

    <Reveal>
      <H n="02" en="Modern Portfolio Theory" zh={t("essays.portfolio.text3", { defaultValue: "二、经典 MPT：前沿、分离与降维" })} />
      <P>
        {({ zh: "在给定 μ 与 Σ 下，最小方差前沿是一条双曲线，其解析式由三个二次型常数完全刻画。加入无风险资产后，\n        有效边界退化为一条直线（资本配置线），所有投资者只需持有无风险资产与切点组合两只基金——这就是两基金分离定理。", en: "Given μ and Σ, the minimum-variance frontier is a hyperbola fully described by three quadratic-form constants. Adding a risk-free asset turns the efficient frontier into a straight capital allocation line. Every investor needs only two funds: the risk-free asset and the tangency portfolio—the two-fund separation theorem." })[isEn ? "en" : "zh"]}
      </P>
      <EquationBlock math={String.raw`\sigma_p^2(m) = \frac{A m^2 - 2Bm + C}{D},\quad A = \mathbf 1^{\!\top}\Sigma^{-1}\mathbf 1,\ B = \mathbf 1^{\!\top}\Sigma^{-1}\mu,\ C = \mu^{\!\top}\Sigma^{-1}\mu,\ D = AC - B^2`} />
      <P>
        {({ zh: "Sharpe 单指数模型是历史上第一次「降维」：把 N(N+1)/2 个协方差参数压缩为 2N+1 个，代价是假设残差互不相关。\n        多因子模型则把资产名单转译成风险暴露，这一步至今仍是所有现代组合系统的骨架。", en: "Sharpe's single-index model was the first historical dimension reduction: it compresses N(N+1)/2 covariance parameters into 2N+1 by assuming uncorrelated residuals. Multifactor models translate asset lists into risk exposures, still the backbone of every modern portfolio system." })[isEn ? "en" : "zh"]}
      </P>
      <ToolLink label={t("essays.portfolio.text4", { defaultValue: "有效前沿几何与两基金分离" })} note={t("essays.portfolio.text5", { defaultValue: "双曲线、CAL、切点、零贝塔与长仓约束前沿" })} />
      <ToolLink label={t("essays.portfolio.text6", { defaultValue: "单指数模型降维台" })} note={t("essays.portfolio.text7", { defaultValue: "参数个数、R²、结构化协方差的样本外收益" })} />
    </Reveal>

    <Reveal>
      <H n="03" en="From Choice to Equilibrium" zh={t("essays.portfolio.text8", { defaultValue: "三、从个人选择到均衡定价" })} />
      <P>
        {({ zh: "当所有投资者都做均值—方差优化且预期一致时，市场组合本身就是切点组合，CAPM 随之成立：只有系统性风险被补偿。\n        但一旦取消无限借贷假设，切点组合的角色被", en: "When all investors optimize mean–variance portfolios with homogeneous expectations, the market portfolio is the tangency portfolio and CAPM follows: only systematic risk is rewarded. Once unlimited borrowing is removed, however, the tangency portfolio's role is taken by the " })[isEn ? "en" : "zh"]}<strong className="text-foreground/90">{t("essays.portfolio.text9", { defaultValue: "零贝塔组合" })}</strong>{({ zh: "取代（Black 1972），\n        SML 截距抬升、斜率变平——这恰好是低贝塔异象的一种结构性解释。", en: " (Black 1972), raising the SML intercept and flattening its slope—a structural explanation for the low-beta anomaly." })[isEn ? "en" : "zh"]}
      </P>
      <EquationBlock math={String.raw`E[R_i] = R_f + \beta_i\bigl(E[R_m]-R_f\bigr)\quad\longrightarrow\quad E[R_i] = E[R_z] + \beta_i\bigl(E[R_m]-E[R_z]\bigr)`} />
      <P>
        {({ zh: "从 CAPM 到 APT 与多因子模型，定价核心从「一个市场因子」变成「一组可投资的风险溢价」，\n        而组合构建的语言也随之从资产权重转向因子暴露与因子风险预算。", en: "From CAPM to APT and multifactor models, the pricing core shifts from one market factor to a set of investable risk premia. Portfolio construction likewise moves from asset weights to factor exposures and factor risk budgets." })[isEn ? "en" : "zh"]}
      </P>
      <ToolLink label={t("essays.portfolio.text10", { defaultValue: "Fama-French 5 因子归因" })} note={t("essays.portfolio.text11", { defaultValue: "把业绩拆成因子暴露与残差 α" })} />
      <ToolLink label={t("essays.portfolio.text12", { defaultValue: "因子风险预算" })} note={t("essays.portfolio.text13", { defaultValue: "B F Bᵀ + 特质：按因子而非资产分配风险" })} />
    </Reveal>

    <Reveal>
      <H n="04" en="Estimation Error" zh={t("essays.portfolio.text14", { defaultValue: "四、理论最优为何常常样本外失灵" })} />
      <P>
        {({ zh: "均值的标准误按 σ/√T 收缩，要把年化 15% 波动资产的预期收益估到 1% 精度，需要数百年数据。\n        优化器却把这些噪声当作信号，给估计误差最大的资产分配最极端的权重——这就是「误差最大化器」之名的由来。", en: "The standard error of the mean shrinks at σ/√T. Estimating expected returns to 1% precision for an asset with 15% annual volatility requires centuries of data. Yet optimizers treat this noise as signal, assigning the most extreme weights to assets with the largest estimation errors—hence the name error maximizer." })[isEn ? "en" : "zh"]}
      </P>
      <P>
        {({ zh: "应对方式有三条互补路径：收缩估计（Ledoit-Wolf、OAS）、贝叶斯先验（Black-Litterman）与直接施加约束或正则化。\n        在许多现实设定下，1/N 依然是难以战胜的强基准，任何复杂模型都应先跨过这道门槛。", en: "Three complementary responses are shrinkage estimation (Ledoit–Wolf, OAS), Bayesian priors (Black–Litterman), and direct constraints or regularization. In many realistic settings, 1/N remains a formidable benchmark that every complex model must first beat." })[isEn ? "en" : "zh"]}
      </P>
      <ToolLink label={t("essays.portfolio.text15", { defaultValue: "估计误差与滚动优化" })} note={t("essays.portfolio.text16", { defaultValue: "蒙特卡洛复现 1/N 强基准与样本长度效应" })} />
      <ToolLink label={t("essays.portfolio.text17", { defaultValue: "稳健协方差收缩" })} note={t("essays.portfolio.text18", { defaultValue: "Ledoit-Wolf / OAS 的最优收缩强度" })} />
      <ToolLink label={t("essays.portfolio.text19", { defaultValue: "Michaud 重采样前沿" })} note={t("essays.portfolio.text20", { defaultValue: "对参数不确定性积分而非点估计" })} />
      <ToolLink label={t("essays.portfolio.text21", { defaultValue: "Black-Litterman 完整版" })} note={t("essays.portfolio.text22", { defaultValue: "市场均衡先验 + 观点不确定性" })} />
    </Reveal>

    <Reveal>
      <H n="05" en="Risk, Constraints & Execution" zh={t("essays.portfolio.text23", { defaultValue: "五、风险、约束与执行" })} />
      <P>{({ zh: "风险不是一个数字。每种度量都对应一类问题，也都有它失效的地方：", en: "Risk is not one number. Every measure addresses a class of problems and has its own failure modes:" })[isEn ? "en" : "zh"]}</P>
      <div className="rounded-xl border border-border/60 overflow-hidden my-5">
        <table className="w-full text-[13px]">
          <thead className="bg-secondary/40 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            <tr><th className="text-left px-3 py-2">{t("essays.portfolio.text24", { defaultValue: "度量" })}</th><th className="text-left px-3 py-2">{t("essays.portfolio.text25", { defaultValue: "适用" })}</th><th className="text-left px-3 py-2">{t("essays.portfolio.text26", { defaultValue: "边界" })}</th></tr>
          </thead>
          <tbody>
            {measures.map((m) => (
              <tr key={m.name} className="border-t border-border/40">
                <td className="px-3 py-2 text-foreground whitespace-nowrap">{m.name}</td>
                <td className="px-3 py-2 text-foreground/70">{m.use}</td>
                <td className="px-3 py-2 text-foreground/60">{m.limit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <P>
        {({ zh: "约束（权重上限、行业限额、换手预算、流动性与合规规则）不是技术细节，而是投资主张的一部分；\n        它们同时充当隐性正则化。再平衡则是用交易成本换取风险敞口控制：日历规则可审计，阈值规则在高波动期自动加密。", en: "Constraints—weight caps, sector limits, turnover budgets, liquidity, and compliance rules—are part of the investment thesis, not technical details; they also provide implicit regularization. Rebalancing trades transaction costs for exposure control: calendar rules are auditable, while threshold rules automatically trigger more often during volatile periods." })[isEn ? "en" : "zh"]}
      </P>
      <ToolLink label={t("essays.portfolio.text27", { defaultValue: "约束与再平衡成本" })} note={t("essays.portfolio.text28", { defaultValue: "日历 / 阈值规则的成本—跟踪误差前沿" })} />
      <ToolLink label={t("essays.portfolio.text29", { defaultValue: "Mean-CVaR 尾部优化" })} note={t("essays.portfolio.text30", { defaultValue: "Rockafellar-Uryasev 线性规划形式" })} />
      <ToolLink label={t("essays.portfolio.text31", { defaultValue: "下行风险与随机占优" })} note={t("essays.portfolio.text32", { defaultValue: "LPM、Sortino、Omega 与 FSD/SSD 判据" })} />
    </Reveal>

    <Reveal>
      <H n="06" en="Active Management" zh={t("essays.portfolio.text33", { defaultValue: "六、主动管理：从预测能力到信息比率" })} />
      <P>
        {({ zh: "Grinold 基本法则把主动管理拆成两件事：每次判断有多准（IC）、每年有多少次独立判断（BR），\n        再乘以约束造成的实现损耗（转换系数 TC）。它的价值不在于精确预测 IR，而在于逼迫我们回答「能力从哪来」。", en: "Grinold's fundamental law separates active management into accuracy per decision (IC) and independent decisions per year (BR), multiplied by implementation losses from constraints (transfer coefficient TC). Its value is not precise IR prediction, but forcing us to explain where skill comes from." })[isEn ? "en" : "zh"]}
      </P>
      <EquationBlock math={String.raw`\mathrm{IR} \approx \mathrm{TC}\cdot\mathrm{IC}\cdot\sqrt{\mathrm{BR}},\qquad \mathrm{VA}^{*}=\frac{\mathrm{IR}^{2}}{4\lambda},\qquad \omega^{*}=\frac{\mathrm{IR}}{2\lambda}`} />
      <ToolLink label={t("essays.portfolio.text34", { defaultValue: "主动管理与信息比率" })} note={t("essays.portfolio.text35", { defaultValue: "基本法则网格 + Treynor-Black 主动组合" })} />
    </Reveal>

    <Reveal>
      <H n="07" en="Extensions & Dynamics" zh={t("essays.portfolio.text36", { defaultValue: "七、扩展框架与多期视角" })} />
      <P>
        {({ zh: "Black-Litterman 把市场均衡当先验、把观点当带不确定性的信号；风险平价放弃收益预测、只均衡风险贡献；\n        最小方差、最大分散化与等权则以极简结构换取稳健性。再往前一步是超越均值—方差：下行风险、随机占优与直接效用最大化。", en: "Black–Litterman uses market equilibrium as a prior and views as uncertain signals; risk parity abandons return forecasts and equalizes risk contributions. Minimum variance, maximum diversification, and equal weighting trade simplicity for robustness. Beyond mean–variance lie downside risk, stochastic dominance, and direct utility maximization." })[isEn ? "en" : "zh"]}
      </P>
      <EquationBlock math={({ zh: String.raw`w^{*}=\underbrace{\frac{\mu-r}{\gamma\sigma^{2}}}_{\text{短视需求}}+\underbrace{\Bigl(1-\frac{1}{\gamma}\Bigr)\cdot\text{对冲项}}_{\text{跨期对冲需求}}`, en: String.raw`w^{*}=\underbrace{\frac{\mu-r}{\gamma\sigma^{2}}}_{\text{Myopic demand}}+\underbrace{\Bigl(1-\frac{1}{\gamma}\Bigr)\cdot\text{Hedging term}}_{\text{Intertemporal hedging demand}}` })[isEn ? "en" : "zh"]} />
      <P>
        {({ zh: "Merton 的多期解告诉我们：在 iid 收益下最优比例与期限无关，「年轻人该多配股票」需要额外假设——\n        收益可预测带来的对冲需求，或者债券性质的人力资本。", en: "Merton's multiperiod solution says that with iid returns, optimal proportions do not depend on horizon. The claim that young investors should hold more stocks requires extra assumptions: hedging demand from predictable returns, or bond-like human capital." })[isEn ? "en" : "zh"]}
      </P>
      <ToolLink label={t("essays.portfolio.text37", { defaultValue: "多期与动态配置" })} note={t("essays.portfolio.text38", { defaultValue: "Merton 解、对冲需求、生命周期与路径依赖" })} />
      <ToolLink label="Risk Parity / HRP" note={t("essays.portfolio.text39", { defaultValue: "平衡风险贡献而非平分资金" })} />
      <ToolLink label={t("essays.portfolio.text40", { defaultValue: "Kelly & 破产风险" })} note={t("essays.portfolio.text41", { defaultValue: "长期增长率与破产约束的取舍" })} />
    </Reveal>

    <Reveal>
      <H n="08" en="Frontier: Robustness over Optimality" zh={t("essays.portfolio.text42", { defaultValue: "八、前沿方向：最优不如稳健" })} />
      <P>
        {({ zh: "高维环境下，样本协方差不可逆、权重发散，正则化（L1/L2、范数约束）与收缩成为标配；\n        机器学习的正确位置通常不是直接预测收益，而是估计协方差结构、筛选特征、以及做严谨的样本外验证。\n        气候风险与 ESG 则以新的约束与情景维度进入组合，压力测试比静态评分更有信息量。", en: "In high dimensions, sample covariances become singular and weights explode; regularization (L1/L2, norm constraints) and shrinkage become standard. Machine learning usually belongs in estimating covariance structure, selecting features, and rigorous out-of-sample validation—not direct return prediction. Climate risk and ESG add constraint and scenario dimensions; stress tests are more informative than static scores." })[isEn ? "en" : "zh"]}
      </P>
      <ToolLink label={t("essays.portfolio.text43", { defaultValue: "高维正则化与最大分散化" })} note={t("essays.portfolio.text44", { defaultValue: "L1/L2 路径、稀疏解与 MDP 对照" })} />
      <div className="mt-6 space-y-2">
        {layers.map((l) => (
          <div key={l.n} className="flex gap-3 rounded-lg border border-border/50 bg-card/30 p-3">
            <span className="text-[10px] font-mono text-gold pt-1 w-6 shrink-0">{l.n}</span>
            <div>
              <p className="text-sm text-foreground">{l.t}</p>
              <p className="text-[12px] text-foreground/60 leading-relaxed">{l.d}</p>
              <p className="text-[11px] font-mono text-foreground/45 mt-1">{l.tools}</p>
            </div>
          </div>
        ))}
      </div>
    </Reveal>

    <Reveal>
      <H n="09" en="Timeline" zh={t("essays.portfolio.text45", { defaultValue: "九、发展脉络：从分散化到稳健决策" })} />
      <div className="space-y-3 border-l border-border/60 pl-5 mt-6">
        {timeline.map((event) => (
          <div key={event.y} className="relative">
            <span className="absolute -left-[27px] top-2 w-2 h-2 rounded-full bg-gold" />
            <p className="text-[11px] font-mono text-gold">{event.y}</p>
            <p className="text-sm text-foreground">{event.t}</p>
            <p className="text-[12px] text-foreground/60 leading-relaxed">{event.d}</p>
          </div>
        ))}
      </div>
    </Reveal>

    <Reveal>
      <H n="10" en="Checklist" zh={t("essays.portfolio.text46", { defaultValue: "十、最低报告清单与常见误用" })} />
      <ol className="space-y-2 list-decimal list-inside">
        {checklist.map((c) => (
          <li key={c} className="text-[14px] leading-[1.8] text-foreground/75">{c}</li>
        ))}
      </ol>
      <div className="mt-10 rounded-xl border border-gold/30 bg-gold/5 p-5">
        <p className="text-sm text-foreground/80 leading-relaxed">
          {({ zh: "一句话总结：组合理论的进步方向不是让最优解更精确，而是让决策在参数错、模型错、市场变的情况下仍然可承受。", en: "In short: progress in portfolio theory is not about making the optimum more precise, but keeping decisions tolerable when parameters are wrong, models fail, and markets change." })[isEn ? "en" : "zh"]}
        </p>
        <div className="mt-4">
          <ToolLink label={t("essays.portfolio.text47", { defaultValue: "进入资产配置实验室" })} note={t("essays.portfolio.text48", { defaultValue: "19 个工具：从前沿几何到高维正则化" })} />
        </div>
      </div>
    </Reveal>
  </div>
  );
};

export default PortfolioTheory;
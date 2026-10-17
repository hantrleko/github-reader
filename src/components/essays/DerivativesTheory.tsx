import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import EquationBlock from "@/components/common/EquationBlock";
import Reveal from "@/components/common/Reveal";

/**
 * Structured reading guide for the derivatives toolkit (V5.7).
 * Chain: no-arbitrage → replication & measures → models → curves & credit →
 * numerics → calibration & model risk → frontier → history → checklist.
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

const ToolLink = ({ label, note, to = "/s/derivatives" }: { label: string; note: string; to?: string }) => (
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

const chainContent = {
  zh: [
  { k: "前提", v: "无套利", note: "一价定律先于任何模型，价格是复制成本" },
  { k: "工具", v: "复制与测度", note: "自融资组合 ↔ 等价鞅测度，两种语言同一件事" },
  { k: "模型", v: "状态动力学", note: "扩散 / 跳跃 / 随机波动决定风险中性密度形状" },
  { k: "计算", v: "树 / PDE / MC / FFT", note: "同一价格四条路径，选择取决于维度与路径依赖" },
  { k: "校准", v: "反解与模型风险", note: "拟合市场只是起点，参数不确定性才是真风险" },
],
  en: [
  { k: "Premise", v: "No arbitrage", note: "The law of one price precedes every model; price equals replication cost" },
  { k: "Tools", v: "Replication and measures", note: "Self-financing portfolios ↔ equivalent martingale measures: two languages for one idea" },
  { k: "Models", v: "State dynamics", note: "Diffusions / jumps / stochastic volatility determine the risk-neutral density" },
  { k: "Computation", v: "Trees / PDE / MC / FFT", note: "Four paths to one price; choose by dimension and path dependence" },
  { k: "Calibration", v: "Inversion and model risk", note: "Market fit is only the starting point; parameter uncertainty is the real risk" },
],
};

const layersContent = {
  zh: [
  { n: "L1", t: "无套利与状态价格", d: "一价定律、Arrow-Debreu 价格、完全 vs 不完全市场的价格区间", tools: "状态价格与无套利区间实验室" },
  { n: "L2", t: "复制与测度变换", d: "自融资组合、Girsanov、计价单位变换与远期测度", tools: "二叉树 · BSM 与 Greeks 台" },
  { n: "L3", t: "路径依赖与提前行权", d: "最优停时、Snell 包络、LSMC 与 PSOR 自由边界", tools: "美式/百慕大 LSMC 定价台 · Crank-Nicolson PSOR" },
  { n: "L4", t: "波动率曲面工程", d: "隐含波动率不是波动率，是价格的坐标；SVI 与 Dupire 反解", tools: "SVI 曲面拟合与无套利检查 · 局部波动率" },
  { n: "L5", t: "曲线与信用", d: "短率闭式解、HJM 漂移约束、危险率自举与 CDS 平价利差", tools: "短期利率与 HJM 台 · 信用曲线与 CDS 台" },
  { n: "L6", t: "数值与前沿", d: "Fourier 定价、方差缩减、粗糙波动率与不完全市场最优对冲", tools: "数值方法实验室 · 粗糙波动率与最优对冲" },
],
  en: [
  { n: "L1", t: "No arbitrage and state prices", d: "Law of one price, Arrow–Debreu prices, and price bounds in complete vs incomplete markets", tools: "State Prices and No-Arbitrage Bounds Lab" },
  { n: "L2", t: "Replication and measure changes", d: "Self-financing portfolios, Girsanov, changes of numeraire, and forward measures", tools: "Binomial trees · BSM and Greeks desk" },
  { n: "L3", t: "Path dependence and early exercise", d: "Optimal stopping, Snell envelope, LSMC, and PSOR free boundaries", tools: "American/Bermudan LSMC pricing · Crank–Nicolson PSOR" },
  { n: "L4", t: "Volatility surface engineering", d: "Implied volatility is a price coordinate, not volatility itself; SVI and Dupire inversion", tools: "SVI fitting and no-arbitrage checks · Local volatility" },
  { n: "L5", t: "Curves and credit", d: "Short-rate closed forms, HJM drift restrictions, hazard bootstrapping, and CDS par spreads", tools: "Short rates and HJM · Credit curves and CDS" },
  { n: "L6", t: "Numerics and frontiers", d: "Fourier pricing, variance reduction, rough volatility, and optimal incomplete-market hedging", tools: "Numerical methods lab · Rough volatility and optimal hedging" },
],
};

const methodsContent = {
  zh: [
  { name: "二叉/三叉树", use: "教学直观、美式期权、离散分红", limit: "维度诅咒，希腊值精度有限" },
  { name: "有限差分 PDE", use: "低维、障碍与自由边界问题", limit: "维度 ≥3 后网格成本爆炸" },
  { name: "蒙特卡洛", use: "高维、路径依赖、复杂结构化产品", limit: "收敛 O(1/√N)，提前行权需要回归" },
  { name: "Fourier / COS / FFT", use: "已知特征函数的模型，整条行权价链一次算完", limit: "仅限欧式；积分参数需谨慎调校" },
  { name: "半解析近似", use: "SABR 隐含波动率、快速校准循环", limit: "在极端行权价或长期限下会产生套利" },
],
  en: [
  { name: "Binomial/trinomial trees", use: "Intuitive teaching, American options, discrete dividends", limit: "Curse of dimensionality; limited Greek accuracy" },
  { name: "Finite-difference PDE", use: "Low-dimensional barrier and free-boundary problems", limit: "Grid costs explode at dimension ≥3" },
  { name: "Monte Carlo", use: "High dimensions, path dependence, complex structured products", limit: "O(1/√N) convergence; early exercise requires regression" },
  { name: "Fourier / COS / FFT", use: "Models with known characteristic functions; price a full strike chain at once", limit: "European only; integration parameters require careful tuning" },
  { name: "Semi-analytical approximations", use: "SABR implied volatility and fast calibration loops", limit: "Can generate arbitrage at extreme strikes or long maturities" },
],
};

const timelineContent = {
  zh: [
  { y: "1900", t: "Bachelier 投机理论", d: "第一次用布朗运动为期权定价，比物理学的布朗运动理论还早五年" },
  { y: "1973", t: "Black-Scholes-Merton", d: "复制论证让偏好与漂移消失，衍生品定价成为工程学科" },
  { y: "1979", t: "Cox-Ross-Rubinstein 树", d: "离散化让无套利与风险中性测度变得可视、可算" },
  { y: "1987", t: "黑色星期一与波动率微笑", d: "对数正态假设被市场否定，微笑成为常态而非异常" },
  { y: "1992-94", t: "HJM 与 BGM/LMM", d: "从短率转向整条曲线，漂移被无套利条件唯一决定" },
  { y: "1993-2002", t: "Heston / Dupire / SABR", d: "随机波动、局部波动与其混合，成为曲面工程的三大支柱" },
  { y: "2008 后", t: "多曲线与 XVA", d: "OIS 折现、抵押品、CVA/DVA/FVA：交易对手与融资进入价格本身" },
  { y: "2014-", t: "粗糙波动率与机器学习", d: "H≈0.1 的分数噪声解释短期偏斜幂律；神经网络用于校准加速与对冲" },
],
  en: [
  { y: "1900", t: "Bachelier's Theory of Speculation", d: "First use of Brownian motion for option pricing, five years before its physical theory" },
  { y: "1973", t: "Black-Scholes-Merton", d: "Replication removes preferences and drift, turning derivatives pricing into engineering" },
  { y: "1979", t: "Cox–Ross–Rubinstein tree", d: "Discretization makes no arbitrage and risk-neutral measures visible and computable" },
  { y: "1987", t: "Black Monday and the volatility smile", d: "Markets reject lognormality; smiles become the norm rather than anomalies" },
  { y: "1992-94", t: "HJM and BGM/LMM", d: "From short rates to entire curves; no arbitrage uniquely determines drift" },
  { y: "1993-2002", t: "Heston / Dupire / SABR", d: "Stochastic volatility, local volatility, and hybrids become the three pillars of surface engineering" },
  { y: "After 2008", t: "Multiple curves and XVA", d: "OIS discounting, collateral, CVA/DVA/FVA: counterparties and funding enter prices themselves" },
  { y: "2014-", t: "Rough volatility and machine learning", d: "Fractional noise with H≈0.1 explains short-term skew power laws; neural networks accelerate calibration and hedging" },
],
};

const misuseContent = {
  zh: [
  "把隐含波动率当作对未来波动的无偏预测——它同时包含风险溢价与供需失衡。",
  "在未做蝶式/日历检查的曲面上做插值，然后用 Dupire 反解出负的局部方差。",
  "用连续对冲的教科书结论解释离散再平衡的盈亏，忽略 Gamma 项与交易成本。",
  "校准得到的参数天天大幅跳动，仍宣称模型「拟合良好」——那是过拟合而非稳定。",
  "在不完全市场里报出单一价格，而不给出超复制—次复制区间与残余风险。",
  "用历史违约率而非风险中性危险率给 CDS 定价，或者同时自由估计 λ 与回收率 R。",
],
  en: [
  "Treating implied volatility as an unbiased forecast of future volatility, despite its risk-premium and supply–demand components.",
  "Interpolating a surface without butterfly/calendar checks, then using Dupire to recover negative local variance.",
  "Explaining discrete-rebalancing P&L with continuous-hedging textbook results, ignoring Gamma terms and transaction costs.",
  "Claiming a model fits well despite large daily jumps in calibrated parameters: that is overfitting, not stability.",
  "Quoting a single price in an incomplete market without super/sub-replication bounds and residual risk.",
  "Pricing CDS with historical default rates rather than risk-neutral hazards, or freely estimating both λ and recovery R.",
],
};

const checklistContent = {
  zh: [
  "写明测度：定价在风险中性测度下，风险管理在真实测度下，两者不可混用。",
  "报告用于校准的工具集合、目标函数与权重，以及样本外重定价误差。",
  "对曲面做无套利检查（蝶式 g(k)≥0、总方差随期限单调）后再使用。",
  "给出希腊值的计算方式（解析 / 有限差分 / bump-and-revalue）与步长。",
  "蒙特卡洛结果附标准误与方差缩减方法，而非只给一个点估计。",
  "对关键参数做敏感性与不确定性区间，报告模型风险准备金的量级。",
  "对含提前行权的产品说明基函数与路径数，并与树/PDE 交叉验证。",
  "结构化产品披露最坏情形与路径依赖，而不仅仅是票息与年化收益。",
],
  en: [
  "Specify the measure: pricing uses the risk-neutral measure; risk management uses the physical measure. Do not mix them.",
  "Report calibration instruments, objective function, weights, and out-of-sample repricing errors.",
  "Check surface no arbitrage (butterfly g(k)≥0 and total variance increasing with maturity) before use.",
  "State Greek calculation methods (analytical / finite differences / bump-and-revalue) and step sizes.",
  "Include Monte Carlo standard errors and variance-reduction methods, not just point estimates.",
  "Provide sensitivities and uncertainty intervals for key parameters, and quantify model-risk reserves.",
  "For early-exercise products, state basis functions and path counts and cross-check against trees/PDE.",
  "Disclose worst cases and path dependence for structured products, not merely coupons and annualized returns.",
],
};

const DerivativesTheory = () => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const chain = chainContent[isEn ? "en" : "zh"];
  const layers = layersContent[isEn ? "en" : "zh"];
  const methods = methodsContent[isEn ? "en" : "zh"];
  const timeline = timelineContent[isEn ? "en" : "zh"];
  const misuse = misuseContent[isEn ? "en" : "zh"];
  const checklist = checklistContent[isEn ? "en" : "zh"];
  return (
  <div className="container max-w-3xl px-6 pt-6 pb-24">
    <Reveal>
      <p className="text-[10px] font-mono tracking-[0.3em] text-gold uppercase mb-3">Reading Guide · V5.7</p>
      <h1 className="font-display text-3xl md:text-[42px] leading-[1.15] text-foreground mb-4">
        {t("essays.derivatives.text1", { defaultValue: "衍生品定价理论导读 · 从一价定律到粗糙波动率" })}
      </h1>
      <p className="text-[15px] leading-[1.85] text-foreground/70">
        {({ zh: "衍生品定价的全部逻辑可以浓缩成一句话：价格等于复制成本。本文按六个层次组织理论地图——\n        无套利与状态价格、复制与测度、模型谱系、曲线与信用、数值方法、校准与前沿——每一块都可以跳到衍生品版块的实验室里复现。", en: "All derivatives pricing logic reduces to one statement: price equals replication cost. This guide organizes the theory into six layers—no arbitrage and state prices, replication and measures, model genealogy, curves and credit, numerical methods, and calibration and frontiers—each reproducible in the derivatives labs." })[isEn ? "en" : "zh"]}
      </p>
    </Reveal>

    <Reveal>
      <H n="01" en="No-Arbitrage First" zh={t("essays.derivatives.text2", { defaultValue: "一、先有无套利，才有模型" })} />
      <P>
        {({ zh: "资产定价基本定理给出两句话：无套利 ⇔ 存在等价鞅测度；市场完全 ⇔ 该测度唯一。\n        于是任何可复制的支付都有唯一价格，它等于状态价格与支付的内积；而当市场不完全时，价格塌缩为一个区间。", en: "The fundamental theorems of asset pricing give two statements: no arbitrage ⇔ an equivalent martingale measure exists; market completeness ⇔ that measure is unique. Every replicable payoff therefore has a unique price, the inner product of state prices and payoffs; in incomplete markets, prices become an interval." })[isEn ? "en" : "zh"]}
      </P>
      <EquationBlock math={String.raw`V_0=\sum_s \psi_s X_s = e^{-rT}\,\mathbb E^{\mathbb Q}[X_T],\qquad \sum_s \psi_s = e^{-rT},\quad \sum_s \psi_s S_T^{(s)} = S_0`} />
      <P>
        {({ zh: "次复制价格是「不亏钱地卖出」的下界，超复制价格是「稳赚地买入」的上界。两者之差不是计算误差，\n        而是不可对冲风险的市场价格——这正是做市商报价点差的理论来源。", en: "The sub-replication price is the lower bound for selling without loss, and the super-replication price the upper bound for buying with a sure gain. Their difference is not numerical error but the market price of unhedgeable risk—the theoretical source of market-maker spreads." })[isEn ? "en" : "zh"]}
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
      <ToolLink label={t("essays.derivatives.text3", { defaultValue: "状态价格与无套利区间实验室" })} note={t("essays.derivatives.text4", { defaultValue: "Arrow-Debreu 价格、鞅测度集合、超/次复制区间" })} />
    </Reveal>

    <Reveal>
      <H n="02" en="Replication & Measure Change" zh={t("essays.derivatives.text5", { defaultValue: "二、复制论证与测度变换：同一件事的两种语言" })} />
      <P>
        {({ zh: "构造 Δ 份标的加现金的自融资组合，使其瞬时盈亏与期权一致，方向性风险即被消掉；Itô 引理把这一要求写成 PDE。\n        等价地，Girsanov 定理把漂移换成无风险利率，价格变成折现期望——两条路径给出同一个数字。", en: "Construct a self-financing portfolio of Δ underlying units plus cash with the same instantaneous P&L as the option, eliminating directional risk; Itô's lemma expresses this as a PDE. Equivalently, Girsanov replaces the drift with the risk-free rate and turns price into a discounted expectation. Both routes give the same number." })[isEn ? "en" : "zh"]}
      </P>
      <EquationBlock math={String.raw`\frac{\partial V}{\partial t}+\tfrac12\sigma^2S^2\frac{\partial^2V}{\partial S^2}+rS\frac{\partial V}{\partial S}-rV=0\;\;\Longleftrightarrow\;\;V_t=e^{-r(T-t)}\mathbb E^{\mathbb Q}_t[V_T]`} />
      <P>
        {({ zh: "期望收益 μ 从公式中消失，是整个学科最反直觉也最重要的结论：多空双方对方向的分歧不影响价格，\n        他们真正交易的是波动率。选择合适的计价单位（远期测度、年金测度）能让利率、汇率与互换期权的定价同样干净。", en: "Expected return μ vanishes from the formula—the field's most counterintuitive and important result. Directional disagreement between buyers and sellers does not affect price; what they really trade is volatility. Appropriate numeraires (forward and annuity measures) make rates, FX, and swaption pricing equally clean." })[isEn ? "en" : "zh"]}
      </P>
      <ToolLink label={t("essays.derivatives.text6", { defaultValue: "二叉树与风险中性概率" })} note={t("essays.derivatives.text7", { defaultValue: "离散复制 → CRR 参数 → 收敛到 BSM" })} />
      <ToolLink label={t("essays.derivatives.text8", { defaultValue: "Greeks 交易台" })} note={t("essays.derivatives.text9", { defaultValue: "Delta/Gamma/Vega/Theta 的曲面与对冲含义" })} />
    </Reveal>

    <Reveal>
      <H n="03" en="Model Genealogy" zh={t("essays.derivatives.text10", { defaultValue: "三、模型谱系：微笑逼出来的扩展" })} />
      <P>
        {({ zh: "BSM 假设常数波动率，市场却给出微笑。三条修补路线各自解释了一部分事实：局部波动率完美拟合今天的曲面但预测动态失真；\n        随机波动率给出内生的微笑期限结构；跳跃解释短期限的陡峭偏斜。", en: "BSM assumes constant volatility, but markets exhibit smiles. Three extensions each explain part of the evidence: local volatility fits today's surface perfectly but distorts predicted dynamics; stochastic volatility generates an endogenous smile term structure; jumps explain steep short-maturity skew." })[isEn ? "en" : "zh"]}
      </P>
      <div className="rounded-xl border border-border/60 bg-card/20 p-4 my-5 overflow-x-auto">
        <pre className="text-[11px] font-mono leading-relaxed text-foreground/75">{({ zh: `Black-Scholes (常数 σ)
   ├── 局部波动率 σ(S,t) ── Dupire 反解 ── 完美拟合曲面 / 动态失真
   ├── 随机波动率 dv ────── Heston (闭式 CF) / SABR (近似式)
   │        └── 混合 LSV ── 曲面拟合 + 合理动态
   ├── 跳跃 ─────────────── Merton (正态跳) / Kou (双指数) / Bates (SV+J)
   └── 粗糙波动率 ───────── rBergomi, H≈0.1, 短期偏斜 ~ T^(H-1/2)`, en: "Black-Scholes (constant σ)\n   ├── Local volatility σ(S,t) ── Dupire inversion ── Perfect surface fit / distorted dynamics\n   ├── Stochastic volatility dv ── Heston (closed-form CF) / SABR (approximation)\n   │        └── Hybrid LSV ── Surface fit + reasonable dynamics\n   ├── Jumps ── Merton (normal jumps) / Kou (double exponential) / Bates (SV+J)\n   └── Rough volatility ── rBergomi, H≈0.1, short-term skew ~ T^(H-1/2)" })[isEn ? "en" : "zh"]}</pre>
      </div>
      <EquationBlock math={String.raw`\sigma_{\mathrm{loc}}^2(K,T)=\frac{\partial_T C+ (r-q)K\,\partial_K C + qC}{\tfrac12 K^2\,\partial^2_{KK}C}`} />
      <ToolLink label={t("essays.derivatives.text11", { defaultValue: "Heston / SABR 对照台" })} note={t("essays.derivatives.text12", { defaultValue: "参数如何分别控制水平、偏斜与凸度" })} />
      <ToolLink label={t("essays.derivatives.text13", { defaultValue: "跳跃扩散与方差互换" })} note={t("essays.derivatives.text14", { defaultValue: "Merton / Kou / Bates 与公允方差" })} />
      <ToolLink label={t("essays.derivatives.text15", { defaultValue: "SVI 曲面拟合与无套利检查" })} note={t("essays.derivatives.text16", { defaultValue: "蝶式 g(k)≥0、日历单调、Dupire 反解" })} />
    </Reveal>

    <Reveal>
      <H n="04" en="Curves & Credit" zh={t("essays.derivatives.text17", { defaultValue: "四、曲线与信用：当利率与违约本身随机" })} />
      <P>
        {({ zh: "股票衍生品可以把利率当常数，利率衍生品不行——标的就是曲线本身。短率模型给出闭式解与直觉，\n        HJM 则证明远期利率的漂移不是自由参数，而被波动率结构与无套利条件唯一决定。", en: "Equity derivatives can treat rates as constant; rate derivatives cannot—the underlying is the curve itself. Short-rate models offer closed forms and intuition, while HJM shows that forward-rate drift is not a free parameter: volatility structure and no arbitrage uniquely determine it." })[isEn ? "en" : "zh"]}
      </P>
      <EquationBlock math={String.raw`\mu_f(t,T)=\sigma_f(t,T)\int_t^{T}\sigma_f(t,u)\,du,\qquad P(t,T)=A(t,T)e^{-B(t,T)r_t}`} />
      <P>
        {({ zh: "信用侧的约化式框架把违约视为强度为 λ 的首次跳跃事件：CDS 平价利差使保护腿与保费腿现值相等，\n        逐期自举得到分段常数危险率曲线。信用三角 s ≈ λ(1−R) 提醒我们，λ 与回收率 R 无法从利差中同时识别。", en: "Reduced-form credit models treat default as the first jump with intensity λ. The CDS par spread equates protection- and premium-leg present values; sequential bootstrapping gives a piecewise-constant hazard curve. The credit triangle s ≈ λ(1−R) reminds us that λ and recovery R cannot both be identified from spreads." })[isEn ? "en" : "zh"]}
      </P>
      <ToolLink label={t("essays.derivatives.text18", { defaultValue: "短期利率与 HJM 台" })} note={t("essays.derivatives.text19", { defaultValue: "Vasicek / CIR / Hull-White 与漂移条件" })} />
      <ToolLink label={t("essays.derivatives.text20", { defaultValue: "信用曲线与 CDS 定价台" })} note={t("essays.derivatives.text21", { defaultValue: "危险率自举、存活曲线、信用三角" })} />
      <ToolLink label={t("essays.derivatives.text22", { defaultValue: "XVA 台" })} note={t("essays.derivatives.text23", { defaultValue: "CVA / DVA / FVA：交易对手与融资的价格" })} />
    </Reveal>

    <Reveal>
      <H n="05" en="Numerics" zh={t("essays.derivatives.text24", { defaultValue: "五、数值方法：同一价格的四条路径" })} />
      <P>{({ zh: "选择方法本质上是在维度、路径依赖与提前行权三个维度上做取舍：", en: "Method selection trades off dimension, path dependence, and early exercise:" })[isEn ? "en" : "zh"]}</P>
      <div className="rounded-xl border border-border/60 overflow-hidden my-5">
        <table className="w-full text-[13px]">
          <thead className="bg-secondary/40 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            <tr><th className="text-left px-3 py-2">{t("essays.derivatives.text25", { defaultValue: "方法" })}</th><th className="text-left px-3 py-2">{t("essays.derivatives.text26", { defaultValue: "适用" })}</th><th className="text-left px-3 py-2">{t("essays.derivatives.text27", { defaultValue: "边界" })}</th></tr>
          </thead>
          <tbody>
            {methods.map((m) => (
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
        {({ zh: "方差缩减常常比加大路径数更划算：对偶变量消掉奇数阶噪声，控制变量借用已知闭式解，\n        拟蒙特卡洛用低偏差点列把收敛阶从 O(N^(−1/2)) 推向接近 O(N^(−1))。提前行权则交给 Longstaff-Schwartz 的回归型继续持有价值。", en: "Variance reduction often beats adding paths: antithetic variables cancel odd-order noise, control variates exploit known closed forms, and quasi-Monte Carlo uses low-discrepancy sequences to improve convergence from O(N^(−1/2)) toward O(N^(−1)). Early exercise uses Longstaff–Schwartz regression estimates of continuation value." })[isEn ? "en" : "zh"]}
      </P>
      <ToolLink label={t("essays.derivatives.text28", { defaultValue: "数值方法实验室" })} note={t("essays.derivatives.text29", { defaultValue: "FFT vs MC vs 对偶/控制变量/QMC 的效率对比" })} />
      <ToolLink label={t("essays.derivatives.text30", { defaultValue: "美式/百慕大 LSMC 定价台" })} note={t("essays.derivatives.text31", { defaultValue: "行权边界、早行权溢价、与树交叉验证" })} />
    </Reveal>

    <Reveal>
      <H n="06" en="Calibration & Model Risk" zh={t("essays.derivatives.text32", { defaultValue: "六、校准与模型风险：拟合不等于正确" })} />
      <P>
        {({ zh: "校准是反问题：给定市场价格反解参数。它天然不适定——不同参数组合可以给出几乎相同的拟合误差，\n        却对奇异期权给出显著不同的价格。判断模型好坏的标准不是今天的 RMSE，而是参数的时间稳定性与样本外重定价能力。", en: "Calibration is an inverse problem: recover parameters from market prices. It is inherently ill-posed—different parameters can give nearly identical fit errors yet materially different exotic-option prices. Judge models by temporal parameter stability and out-of-sample repricing, not today's RMSE." })[isEn ? "en" : "zh"]}
      </P>
      <EquationBlock math={String.raw`\hat\theta=\arg\min_\theta \sum_i w_i\bigl(C^{\text{mkt}}_i-C^{\theta}_i\bigr)^2+\lambda\lVert\theta-\theta_{t-1}\rVert^2`} />
      <ToolLink label={t("essays.derivatives.text33", { defaultValue: "校准实验室" })} note={t("essays.derivatives.text34", { defaultValue: "目标函数、权重与参数稳定性诊断" })} to="/s/calibration" />
      <ToolLink label={t("essays.derivatives.text35", { defaultValue: "Delta 对冲盈亏归因" })} note={t("essays.derivatives.text36", { defaultValue: "离散再平衡下的 Gamma 税与波动率风险溢价" })} />
    </Reveal>

    <Reveal>
      <H n="07" en="Layers" zh={t("essays.derivatives.text37", { defaultValue: "七、六层知识地图与对应实验室" })} />
      <div className="space-y-3 mt-6">
        {layers.map((l) => (
          <div key={l.n} className="rounded-lg border border-border/60 bg-card/30 p-4">
            <div className="flex items-baseline gap-3">
              <span className="text-[11px] font-mono text-gold">{l.n}</span>
              <p className="text-sm text-foreground font-medium">{l.t}</p>
            </div>
            <p className="text-[13px] text-foreground/70 mt-1 leading-relaxed">{l.d}</p>
            <p className="text-[11px] text-foreground/50 mt-1 font-mono">{l.tools}</p>
          </div>
        ))}
      </div>
    </Reveal>

    <Reveal>
      <H n="08" en="Frontier" zh={t("essays.derivatives.text38", { defaultValue: "八、前沿：粗糙波动率与不完全市场" })} />
      <P>
        {({ zh: "实证发现已实现波动率的路径比布朗运动更粗糙（Hurst 指数 H≈0.1），rBergomi 等粗糙模型无需跳跃即可复现\n        短期限 ATM 偏斜的幂律爆炸 T^(H−1/2)。另一条主线是承认市场不完全：完美对冲不存在，\n        于是目标从「复制」变成「最小化残余风险」或「效用无差别」。", en: "Evidence suggests realized-volatility paths are rougher than Brownian motion (Hurst exponent H≈0.1). Rough models such as rBergomi reproduce the short-maturity ATM skew power-law explosion T^(H−1/2) without jumps. Another thread acknowledges incompleteness: perfect hedging does not exist, so the objective shifts from replication to residual-risk minimization or utility indifference." })[isEn ? "en" : "zh"]}
      </P>
      <EquationBlock math={String.raw`\min_{\Delta}\ \mathbb E\bigl[(X_T-\Delta\,\Delta S_T)^2\bigr]\ \Rightarrow\ \Delta^{*}=\frac{\mathrm{Cov}(X_T,\Delta S_T)}{\mathrm{Var}(\Delta S_T)},\qquad p^{\,U}:\ \mathbb E[U(W-p+H)]=\mathbb E[U(W)]`} />
      <ToolLink label={t("essays.derivatives.text39", { defaultValue: "粗糙波动率与最优对冲实验室" })} note={t("essays.derivatives.text40", { defaultValue: "rBergomi 微笑、偏斜幂律、均方对冲与无差别价格" })} />
    </Reveal>

    <Reveal>
      <H n="09" en="Timeline" zh={t("essays.derivatives.text41", { defaultValue: "九、发展脉络：从 Bachelier 到粗糙波动率" })} />
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
      <H n="10" en="Checklist" zh={t("essays.derivatives.text42", { defaultValue: "十、常见误用与最低报告清单" })} />
      <p className="text-[13px] font-mono uppercase tracking-wider text-muted-foreground mb-3">{t("essays.derivatives.text43", { defaultValue: "常见误用" })}</p>
      <ul className="space-y-2 list-disc list-inside mb-8">
        {misuse.map((m) => (
          <li key={m} className="text-[14px] leading-[1.8] text-foreground/75">{m}</li>
        ))}
      </ul>
      <p className="text-[13px] font-mono uppercase tracking-wider text-muted-foreground mb-3">{t("essays.derivatives.text44", { defaultValue: "最低报告清单" })}</p>
      <ol className="space-y-2 list-decimal list-inside">
        {checklist.map((c) => (
          <li key={c} className="text-[14px] leading-[1.8] text-foreground/75">{c}</li>
        ))}
      </ol>
      <div className="mt-10 rounded-xl border border-gold/30 bg-gold/5 p-5">
        <p className="text-sm text-foreground/80 leading-relaxed">
          {({ zh: "一句话总结：衍生品定价不是预测未来，而是给「复制未来」这件事标价；模型越复杂，越要把不确定性显式报出来。", en: "In short: derivatives pricing does not predict the future; it prices the act of replicating it. The more complex the model, the more explicitly uncertainty must be reported." })[isEn ? "en" : "zh"]}
        </p>
        <div className="mt-4">
          <ToolLink label={t("essays.derivatives.text45", { defaultValue: "进入衍生品实验室" })} note={t("essays.derivatives.text46", { defaultValue: "25 个工具：从状态价格到粗糙波动率" })} />
        </div>
      </div>
    </Reveal>
  </div>
  );
};

export default DerivativesTheory;

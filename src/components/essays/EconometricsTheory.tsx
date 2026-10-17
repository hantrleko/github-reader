import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import EquationBlock from "@/components/common/EquationBlock";
import Reveal from "@/components/common/Reveal";

/**
 * Structured reading guide for the econometrics section (V5.4).
 * Organises the whole toolkit along the chain
 * DGP → identification → estimation → inference → interpretation.
 */

const content = {
  text0: { zh: "先问数据是怎么生成的：谁决定了 x，谁进了误差项", en: "Start with the data-generating process: what determines x, and what enters the error term?" },
  text1: { zh: "识别", en: "Identification" },
  text2: { zh: "参数在总体层面能否被唯一确定——样本再大也救不了识别失败", en: "Can the parameter be uniquely determined in the population? No sample size can rescue failed identification." },
  text3: { zh: "估计", en: "Estimation" },
  text4: { zh: "OLS / GMM / MLE / 正则化，都是不同的目标函数", en: "OLS / GMM / MLE / regularization differ in their objective functions" },
  text5: { zh: "推断", en: "Inference" },
  text6: { zh: "标准误的假设比点估计更容易出错", en: "Assumptions behind standard errors are easier to get wrong than point estimates" },
  text7: { zh: "解释", en: "Interpretation" },
  text8: { zh: "对谁的效应？", en: "Whose treatment effect?" },
  text9: { zh: "ATE / ATT / LATE / CATE 是不同的估计对象", en: "ATE / ATT / LATE / CATE target different estimands" },
  text10: { zh: "随机化", en: "Randomization" },
  text11: { zh: "分配与潜在结果独立", en: "Assignment is independent of potential outcomes" },
  text12: { zh: "外部有效性、依从性", en: "External validity, compliance" },
  text13: { zh: "GATES / BLP 异质性诊断", en: "GATES / BLP heterogeneity diagnostics" },
  text14: { zh: "条件独立 (选择可观测)", en: "Conditional independence (selection on observables)" },
  text15: { zh: "控制住全部混淆变量", en: "Control for all confounders" },
  text16: { zh: "高维、遗漏变量", en: "High dimensionality, omitted variables" },
  text17: { zh: "倾向得分匹配 · 双重选择 LASSO · Double ML", en: "Propensity score matching · Double-selection LASSO · Double ML" },
  text18: { zh: "工具变量", en: "Instrumental variables" },
  text19: { zh: "相关性 + 排他性", en: "Relevance + exclusion" },
  text20: { zh: "弱工具、异质 LATE", en: "Weak instruments, heterogeneous LATE" },
  text21: { zh: "弱工具变量诊断 (F / AR)", en: "Weak-instrument diagnostics (F / AR)" },
  text22: { zh: "面板固定效应", en: "Panel fixed effects" },
  text23: { zh: "混淆不随时间变", en: "Confounding is time-invariant" },
  text24: { zh: "时变冲击、动态面板偏误", en: "Time-varying shocks, dynamic panel bias" },
  text25: { zh: "FE vs RE · 动态面板 GMM", en: "FE vs RE · Dynamic panel GMM" },
  text26: { zh: "平行趋势 (DID)", en: "Parallel trends (DID)" },
  text27: { zh: "无处理时趋势相同", en: "Identical trends in the absence of treatment" },
  text28: { zh: "交错处理的负权重", en: "Negative weights under staggered treatment" },
  text29: { zh: "事件研究式 DID · 合成 DID", en: "Event-study DID · Synthetic DID" },
  text30: { zh: "断点 (RD)", en: "Discontinuity (RD)" },
  text31: { zh: "阈值附近连续", en: "Continuity around the cutoff" },
  text32: { zh: "操纵、带宽选择", en: "Manipulation, bandwidth selection" },
  text33: { zh: "断点回归", en: "Regression discontinuity" },
  text34: { zh: "样本选择", en: "Sample selection" },
  text35: { zh: "存在排除约束", en: "An exclusion restriction exists" },
  text36: { zh: "识别只靠函数形式", en: "Identification rests solely on functional form" },
  text37: { zh: "Heckman 两步法", en: "Heckman two-step estimator" },
  text38: { zh: "同方差 OLS 标准误", en: "Homoskedastic OLS standard errors" },
  text39: { zh: "只有在误差同方差且独立时才正确，实证中几乎不成立", en: "Valid only with homoskedastic, independent errors—conditions rarely met in empirical work" },
  text40: { zh: "异方差稳健 HC1 / HC3", en: "Heteroskedasticity-robust HC1 / HC3" },
  text41: { zh: "修正方差异质，小样本用 HC3；不处理相关性", en: "Corrects for heterogeneous variance; use HC3 in small samples. Does not address correlation." },
  text42: { zh: "聚类稳健", en: "Cluster-robust" },
  text43: { zh: "处理变量在簇层面变动时的默认选择，需要足够多的簇", en: "The default when treatment varies at the cluster level; requires enough clusters" },
  text44: { zh: "簇数少于约 30 时的救命稻草，施加原假设重抽样", en: "A lifeline with fewer than roughly 30 clusters: resample under the null" },
  text45: { zh: "弱识别稳健", en: "Weak-identification robust" },
  text46: { zh: "Anderson-Rubin 等反转检验，在工具很弱时仍保持正确水平", en: "Inverted tests such as Anderson-Rubin retain correct size even with very weak instruments" },
  text47: { zh: "识别与推断内核", en: "Identification and inference foundations" },
  text48: { zh: "工具强度、选择偏误、三大检验、方差估计的正确性", en: "Instrument strength, selection bias, the three major tests, and valid variance estimation" },
  text49: { zh: "弱工具诊断 · Heckman · Wald/LR/LM · 标准误实验室", en: "Weak-instrument diagnostics · Heckman · Wald/LR/LM · Standard Errors Lab" },
  text50: { zh: "面板与几何", en: "Panels and geometry" },
  text51: { zh: "个体效应的处理方式与共线性的代价", en: "How to handle individual effects, and the cost of collinearity" },
  text52: { zh: "FE vs RE (Hausman/Mundlak) · FWL 定理", en: "FE vs RE (Hausman/Mundlak) · FWL theorem" },
  text53: { zh: "因果设计", en: "Causal designs" },
  text54: { zh: "DID、RD、合成控制、匹配等准实验设计", en: "Quasi-experimental designs: DID, RD, synthetic control, and matching" },
  text55: { zh: "事件研究 DID · 合成 DID · RDD · PSM", en: "Event-study DID · Synthetic DID · RDD · PSM" },
  text56: { zh: "时间序列与波动率", en: "Time series and volatility" },
  text57: { zh: "平稳性、协整、VAR/SVAR、GARCH 家族、谱分析", en: "Stationarity, cointegration, VAR/SVAR, the GARCH family, spectral analysis" },
  text58: { zh: "单位根 · 协整 · SVAR · GARCH/DCC · 谱分析", en: "Unit roots · Cointegration · SVAR · GARCH/DCC · Spectral analysis" },
  text59: { zh: "机器学习计量", en: "Machine learning econometrics" },
  text60: { zh: "高维选择、正交化与异质性", en: "High-dimensional selection, orthogonalization, and heterogeneity" },
  text61: { zh: "双重选择 LASSO · Double ML · 因果森林 · GATES", en: "Double-selection LASSO · Double ML · Causal forests · GATES" },
  text62: { zh: "计量经济学会与联立方程", en: "The Econometric Society and simultaneous equations" },
  text63: { zh: "Frisch、Haavelmo：概率论进入经济学，识别问题被正式提出", en: "Frisch, Haavelmo: probability enters economics, and identification becomes a formal problem" },
  text64: { zh: "Cowles 委员会范式", en: "The Cowles Commission paradigm" },
  text65: { zh: "结构方程、两阶段最小二乘、工具变量", en: "Structural equations, two-stage least squares, instrumental variables" },
  text66: { zh: "批判与时间序列转向", en: "Critiques and the turn to time series" },
  text67: { zh: "Lucas 批判、Sims VAR、Box-Jenkins", en: "Lucas critique, Sims VAR, Box-Jenkins" },
  text68: { zh: "GMM 与半参数", en: "GMM and semiparametric methods" },
  text69: { zh: "Hansen GMM、White 稳健标准误、Engle ARCH、Granger 协整", en: "Hansen GMM, White robust standard errors, Engle ARCH, Granger cointegration" },
  text70: { zh: "可信性革命", en: "The credibility revolution" },
  text71: { zh: "Angrist-Imbens LATE、自然实验、DID/RD 的普及", en: "Angrist-Imbens LATE, natural experiments, and the spread of DID/RD" },
  text72: { zh: "面板与稳健推断", en: "Panels and robust inference" },
  text73: { zh: "聚类标准误、动态面板 GMM、wild bootstrap", en: "Clustered standard errors, dynamic panel GMM, wild bootstrap" },
  text74: { zh: "2014–今", en: "2014–present" },
  text75: { zh: "高维与机器学习", en: "High dimensions and machine learning" },
  text76: { zh: "双重选择 LASSO、Double ML、因果森林、交错 DID 的重估", en: "Double-selection LASSO, Double ML, causal forests, and reassessing staggered DID" },
  text77: { zh: "计量经济学导读：从数据生成过程到可信推断", en: "A Guide to Econometrics: From Data Generation to Credible Inference" },
  text78: { zh: "计量经济学不是「跑回归」的技巧集合，而是一条推理链：先写下数据生成过程，再问参数是否可识别，然后才轮到估计量的选择，最后是标准误是否配得上这个设计。这篇导读按这条链把版块里五十余个工具串起来，每一节都能直接跳到实验室复现。", en: "Econometrics is not a collection of tricks for running regressions. It is a chain of reasoning: specify the data-generating process, ask whether the parameter is identified, choose an estimator, then check whether the standard errors fit the design. This guide connects more than fifty tools along that chain, with direct links to reproduce each section in the lab." },
  text79: { zh: "推理链：五个必答问题", en: "The reasoning chain: five essential questions" },
  text80: { zh: "任何一篇实证论文的可信度，都可以用五个问题拆解。绝大多数争议不发生在「用哪个估计量」，而发生在第二步：识别假设成不成立。", en: "Five questions can unpack the credibility of any empirical paper. Most disputes are not about which estimator to use, but about the second step: whether the identification assumptions hold." },
  text81: { zh: "OLS 的全部内容其实就是一个投影：把 y 投到解释变量张成的空间上。FWL 定理告诉我们，多元回归的每个系数都等价于「先剔除其他变量，再做一元回归」——固定效应去均值、双向固定效应 DID、部分线性模型都是同一台机器的不同外壳。", en: "OLS is, at heart, a projection of y onto the space spanned by the explanatory variables. The FWL theorem tells us that each coefficient in a multiple regression is equivalent to first partialling out the other variables, then running a univariate regression. Fixed-effects demeaning, two-way fixed-effects DID, and partially linear models are different shells around the same machinery." },
  text82: { zh: "FWL 定理与共线性几何", en: "The FWL theorem and the geometry of collinearity" },
  text83: { zh: "残差化散点、VIF 与方差膨胀的可视化", en: "Residualized scatterplots, VIF, and visualizing variance inflation" },
  text84: { zh: "回归诊断套件", en: "Regression Diagnostics Suite" },
  text85: { zh: "BP / White / DW / BG / RESET 一次跑完", en: "Run BP / White / DW / BG / RESET together" },
  text86: { zh: "识别：七条主流策略与它们的软肋", en: "Identification: seven mainstream strategies and their weak points" },
  text87: { zh: "识别是总体层面的性质：即使样本无限大，识别失败也无法修复。每一种设计都是在用一个可检验性较弱的假设，换取因果解释的权利。", en: "Identification is a population property: even an infinite sample cannot repair its failure. Every design trades an assumption with limited testability for the right to make a causal interpretation." },
  text88: { zh: "工具变量是最容易被高估的一种。一阶段太弱时，2SLS 不但方差爆炸，还会被偏向 OLS：偏误近似 ρ·m/F，工具越多越糟。", en: "Instrumental variables are particularly easy to overrate. When the first stage is too weak, 2SLS variance explodes and estimates are biased toward OLS: the bias is approximately ρ·m/F, and more instruments make matters worse." },
  text89: { zh: "弱工具变量诊断", en: "Weak-Instrument Diagnostics" },
  text90: { zh: "一阶段 F / Cragg-Donald / Stock-Yogo 与 AR 稳健置信集", en: "First-stage F / Cragg-Donald / Stock-Yogo and AR-robust confidence sets" },
  text91: { zh: "Heckman 样本选择", en: "Heckman Sample Selection" },
  text92: { zh: "逆米尔斯比修正与排除约束的重要性", en: "The inverse Mills ratio correction and why exclusion restrictions matter" },
  text93: { zh: "事件研究式 DID", en: "Event-Study DID" },
  text94: { zh: "平行趋势检验与动态处理效应", en: "Parallel-trends tests and dynamic treatment effects" },
  text95: { zh: "估计：一个目标函数的不同外衣", en: "Estimation: different forms of one objective-function framework" },
  text96: { zh: "OLS、GMM、MLE 与正则化方法的差别，本质上只是最小化的目标函数不同。OLS 是矩条件 E[xu]=0 的恰好识别 GMM；MLE 换成对数似然；LASSO 在平方损失上加 ℓ₁ 罚。", en: "OLS, GMM, MLE, and regularization differ fundamentally in the objective function they minimize. OLS is exactly identified GMM with moment conditions E[xu]=0; MLE uses the log-likelihood; LASSO adds an ℓ₁ penalty to squared loss." },
  text97: { zh: "面板数据里最经典的抉择是固定效应还是随机效应：RE 更有效但要求个体效应与解释变量无关，FE 牺牲效率换取一致性。Hausman 检验比较两者差异，Mundlak 的等价做法是把组均值加进回归——后者能配聚类稳健标准误，是现代更推荐的写法。", en: "The classic panel-data choice is fixed versus random effects. RE is more efficient but requires individual effects to be uncorrelated with the regressors; FE trades efficiency for consistency. The Hausman test compares the two. Mundlak's equivalent approach adds group means to the regression—and accommodates cluster-robust standard errors, making it the preferred modern specification." },
  text98: { zh: "固定效应 vs 随机效应", en: "Fixed Effects vs Random Effects" },
  text99: { zh: "Hausman χ²、Mundlak CRE、θ 准去均值系数", en: "Hausman χ², Mundlak CRE, and the θ quasi-demeaning coefficient" },
  text100: { zh: "动态面板 GMM", en: "Dynamic Panel GMM" },
  text101: { zh: "Nickell 偏误与 Arellano-Bond / Blundell-Bond", en: "Nickell bias and Arellano-Bond / Blundell-Bond" },
  text102: { zh: "分位数回归实验室", en: "Quantile Regression Lab" },
  text103: { zh: "分布不同位置上的边际效应", en: "Marginal effects at different points in the distribution" },
  text104: { zh: "推断：标准误比点估计更容易错", en: "Inference: standard errors are easier to get wrong than point estimates" },
  text105: { zh: "同一个 β̂ 配不同的方差估计，结论可以完全相反。误设的标准误是实证研究中最常见、也最难被审稿人发现的错误。", en: "The same β̂ paired with different variance estimates can yield opposite conclusions. Misspecified standard errors are among the most common errors in empirical research—and among the hardest for referees to detect." },
  text106: { zh: "Wald、LR 与 LM 是同一个原假设的三种几何视角：分别衡量「参数离约束多远」「拟合损失多少」「约束点上的得分是否为零」。渐近等价，但小样本会分歧，而且 Wald 不具参数化不变性。", en: "Wald, LR, and LM offer three geometric views of the same null: how far the parameters lie from the restriction, how much fit is lost, and whether the score at the restricted point is zero. They are asymptotically equivalent but can diverge in small samples; Wald is also not invariant to reparameterization." },
  text107: { zh: "标准误实验室", en: "Standard Errors Lab" },
  text108: { zh: "蒙特卡洛覆盖率：iid / HC1 / HC3 / 聚类 / wild bootstrap", en: "Monte Carlo coverage: iid / HC1 / HC3 / clustered / wild bootstrap" },
  text109: { zh: "Wald / LR / LM 三大检验", en: "The Three Major Tests: Wald / LR / LM" },
  text110: { zh: "小样本分歧与经典排序 W ≥ LR ≥ LM", en: "Small-sample divergence and the classical ordering W ≥ LR ≥ LM" },
  text111: { zh: "高维与异质性：机器学习计量", en: "High dimensions and heterogeneity: machine learning econometrics" },
  text112: { zh: "当控制变量数量与样本量同阶，变量选择本身会污染推断。Belloni-Chernozhukov-Hansen 的双重选择给出了修复：分别对结果方程和处理方程做 LASSO，取并集再回归，从而对选择错误免疫。", en: "When the number of controls is of the same order as the sample size, variable selection itself contaminates inference. Belloni-Chernozhukov-Hansen double selection offers a remedy: run LASSO separately for the outcome and treatment equations, take the union of selected variables, and regress again to protect against selection mistakes." },
  text113: { zh: "异质性的另一面是「效应对谁最大」。GATES 把人群按样本外 CATE 预测分位分组比较实际效应，BLP 校准回归则用一个系数回答学习器是否真的有预测力：β₂≈1 为良好校准，β₂≈0 说明只是噪声。", en: "The other side of heterogeneity is asking who benefits most. GATES groups the population by quantiles of out-of-sample CATE predictions and compares realized effects. A BLP calibration regression uses one coefficient to test whether the learner has genuine predictive power: β₂≈1 signals good calibration; β₂≈0 signals noise." },
  text114: { zh: "双重选择 LASSO", en: "Double-Selection LASSO" },
  text115: { zh: "高维控制下的 α 无偏推断与朴素选择的对比", en: "Unbiased inference for α with high-dimensional controls, compared with naive selection" },
  text116: { zh: "异质性处理效应诊断", en: "Heterogeneous Treatment Effect Diagnostics" },
  text117: { zh: "GATES 分位组效应与 BLP 校准检验", en: "GATES quantile-group effects and BLP calibration tests" },
  text118: { zh: "Neyman 正交与交叉拟合", en: "Neyman orthogonality and cross-fitting" },
  text119: { zh: "五层知识地图与演进时间轴", en: "A five-layer knowledge map and timeline" },
  text120: { zh: "没有识别假设的回归只是相关性的复杂写法；没有正确标准误的显著性只是精心包装的运气。", en: "Regression without identification assumptions is merely an elaborate description of correlation; significance without correct standard errors is luck in polished packaging." },
  text121: { zh: "计量经济学实验室 · 49 个工具", en: "Econometrics Lab · 49 Tools" },
  text122: { zh: "识别与推断 / 因果推断 / 时间序列 / 波动率 / 离散选择与面板 / 机器学习计量 / 诊断", en: "Identification and inference / Causal inference / Time series / Volatility / Discrete choice and panels / Machine learning econometrics / Diagnostics" },
};

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
    to="/s/econometrics"
    className="group inline-flex items-start gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2 mr-2 mb-2 hover:border-gold/50 hover:bg-card/60 transition-all"
  >
    <span>
      <span className="block text-sm text-foreground group-hover:text-gold transition-colors">{label}</span>
      <span className="block text-[11px] text-foreground/55">{note}</span>
    </span>
    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-gold transition-colors mt-0.5 shrink-0" />
  </Link>
);

const getChain = (locale: "zh" | "en") => [
  { k: "DGP", v: "y = f(x, u)", note: content.text0[locale] },
  { k: content.text1[locale], v: "E[u | x] = 0 ?", note: content.text2[locale] },
  { k: content.text3[locale], v: "argmin Q_n(θ)", note: content.text4[locale] },
  { k: content.text5[locale], v: "V̂(θ̂)", note: content.text6[locale] },
  { k: content.text7[locale], v: content.text8[locale], note: content.text9[locale] },
];

const getIdentification = (locale: "zh" | "en") => [
  { name: content.text10[locale], assume: content.text11[locale], risk: content.text12[locale], tool: content.text13[locale] },
  { name: content.text14[locale], assume: content.text15[locale], risk: content.text16[locale], tool: content.text17[locale] },
  { name: content.text18[locale], assume: content.text19[locale], risk: content.text20[locale], tool: content.text21[locale] },
  { name: content.text22[locale], assume: content.text23[locale], risk: content.text24[locale], tool: content.text25[locale] },
  { name: content.text26[locale], assume: content.text27[locale], risk: content.text28[locale], tool: content.text29[locale] },
  { name: content.text30[locale], assume: content.text31[locale], risk: content.text32[locale], tool: content.text33[locale] },
  { name: content.text34[locale], assume: content.text35[locale], risk: content.text36[locale], tool: content.text37[locale] },
];

const getInference = (locale: "zh" | "en") => [
  { n: "I1", t: content.text38[locale], d: content.text39[locale] },
  { n: "I2", t: content.text40[locale], d: content.text41[locale] },
  { n: "I3", t: content.text42[locale], d: content.text43[locale] },
  { n: "I4", t: "Wild cluster bootstrap", d: content.text44[locale] },
  { n: "I5", t: content.text45[locale], d: content.text46[locale] },
];

const getLayers = (locale: "zh" | "en") => [
  { n: "L1", t: content.text47[locale], d: content.text48[locale], tools: content.text49[locale] },
  { n: "L2", t: content.text50[locale], d: content.text51[locale], tools: content.text52[locale] },
  { n: "L3", t: content.text53[locale], d: content.text54[locale], tools: content.text55[locale] },
  { n: "L4", t: content.text56[locale], d: content.text57[locale], tools: content.text58[locale] },
  { n: "L5", t: content.text59[locale], d: content.text60[locale], tools: content.text61[locale] },
];

const getTimeline = (locale: "zh" | "en") => [
  { y: "1930s", t: content.text62[locale], d: content.text63[locale] },
  { y: "1950s", t: content.text64[locale], d: content.text65[locale] },
  { y: "1970s", t: content.text66[locale], d: content.text67[locale] },
  { y: "1980s", t: content.text68[locale], d: content.text69[locale] },
  { y: "1990s", t: content.text70[locale], d: content.text71[locale] },
  { y: "2000s", t: content.text72[locale], d: content.text73[locale] },
  { y: content.text74[locale], t: content.text75[locale], d: content.text76[locale] },
];

const EconometricsTheory = () => {
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en" : "zh";
  const chain = getChain(locale);
  const identification = getIdentification(locale);
  const inference = getInference(locale);
  const layers = getLayers(locale);
  const timeline = getTimeline(locale);
  return (
  <div className="container max-w-3xl px-6 pt-6 pb-24">
    <Reveal>
      <div className="border-t border-b border-border/60 py-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="h-px w-10 bg-gold" />
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold font-bold">
            Reading Guide / Econometrics
          </span>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">≈ 15 min read</span>
        </div>
        <h2 className="font-display text-3xl md:text-[40px] leading-[1.15] text-foreground">
          {content.text77[locale]}
        </h2>
        <p className="mt-2 text-sm font-mono text-muted-foreground">
          Identification first, estimation second, standard errors always.
        </p>
        <p className="mt-5 text-[15px] leading-[1.85] text-foreground/75">
          {content.text78[locale]}
        </p>
      </div>
    </Reveal>

    <H n="01" en="The Chain" zh={content.text79[locale]} />
    <P>
      {content.text80[locale]}
    </P>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-6">
      {chain.map((b) => (
        <div key={b.k} className="rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold/80">{b.k}</p>
          <p className="mt-1 font-mono text-sm text-foreground">{b.v}</p>
          <p className="mt-2 text-[11px] text-foreground/60 leading-relaxed">{b.note}</p>
        </div>
      ))}
    </div>
    <P>
      {content.text81[locale]}
    </P>
    <div className="my-5 text-foreground katex-display-gold">
      <EquationBlock math={String.raw`\hat\beta_1=\frac{\tilde x_1'\tilde y}{\tilde x_1'\tilde x_1},\qquad \tilde x_1=M_{X_2}x_1=(I-X_2(X_2'X_2)^{-1}X_2')x_1`} />
    </div>
    <div>
      <ToolLink label={content.text82[locale]} note={content.text83[locale]} />
      <ToolLink label={content.text84[locale]} note={content.text85[locale]} />
    </div>

    <H n="02" en="Identification Strategies" zh={content.text86[locale]} />
    <P>
      {content.text87[locale]}
    </P>
    <div className="space-y-2 my-6">
      {identification.map((s) => (
        <div key={s.name} className="rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="font-display text-lg text-foreground">{s.name}</p>
          <p className="mt-2 text-[12px] text-foreground/70 leading-relaxed"><span className="text-gold/80 font-mono text-[10px] uppercase tracking-wider mr-2">Assume</span>{s.assume}</p>
          <p className="mt-1 text-[12px] text-foreground/70 leading-relaxed"><span className="text-gold/80 font-mono text-[10px] uppercase tracking-wider mr-2">Risk</span>{s.risk}</p>
          <p className="mt-1 text-[11px] font-mono text-muted-foreground">{s.tool}</p>
        </div>
      ))}
    </div>
    <P>
      {content.text88[locale]}
    </P>
    <div className="my-5 text-foreground katex-display-gold">
      <EquationBlock math={String.raw`\mathrm{Bias}(\hat\beta_{2SLS})\approx \frac{\rho\, m}{F},\qquad AR(\beta_0)=\frac{(y-\beta_0 d)'P_Z(y-\beta_0 d)/m}{(y-\beta_0 d)'M_Z(y-\beta_0 d)/(n-m)}`} />
    </div>
    <div>
      <ToolLink label={content.text89[locale]} note={content.text90[locale]} />
      <ToolLink label={content.text91[locale]} note={content.text92[locale]} />
      <ToolLink label={content.text93[locale]} note={content.text94[locale]} />
    </div>

    <H n="03" en="Estimation" zh={content.text95[locale]} />
    <P>
      {content.text96[locale]}
    </P>
    <div className="my-5 text-foreground katex-display-gold">
      <EquationBlock math={String.raw`\hat\theta=\arg\min_{\theta}\;g_n(\theta)'W g_n(\theta),\qquad g_n(\theta)=\frac1n\sum_i z_i\,u_i(\theta)`} />
    </div>
    <P>
      {content.text97[locale]}
    </P>
    <div>
      <ToolLink label={content.text98[locale]} note={content.text99[locale]} />
      <ToolLink label={content.text100[locale]} note={content.text101[locale]} />
      <ToolLink label={content.text102[locale]} note={content.text103[locale]} />
    </div>

    <H n="04" en="Inference" zh={content.text104[locale]} />
    <P>
      {content.text105[locale]}
    </P>
    <div className="my-5 text-foreground katex-display-gold">
      <EquationBlock math={String.raw`\hat V_{cl}=(X'X)^{-1}\Big(\sum_{g=1}^{G}X_g'\hat u_g\hat u_g'X_g\Big)(X'X)^{-1},\qquad W\ \ge\ LR\ \ge\ LM`} />
    </div>
    <div className="space-y-2 my-6">
      {inference.map((l) => (
        <div key={l.n} className="flex gap-4 rounded-xl border border-border/60 bg-card/40 p-4">
          <span className="font-mono text-gold text-sm shrink-0">{l.n}</span>
          <div>
            <p className="font-display text-base text-foreground">{l.t}</p>
            <p className="mt-1 text-[12px] text-foreground/65 leading-relaxed">{l.d}</p>
          </div>
        </div>
      ))}
    </div>
    <P>
      {content.text106[locale]}
    </P>
    <div>
      <ToolLink label={content.text107[locale]} note={content.text108[locale]} />
      <ToolLink label={content.text109[locale]} note={content.text110[locale]} />
    </div>

    <H n="05" en="High Dimensions & Heterogeneity" zh={content.text111[locale]} />
    <P>
      {content.text112[locale]}
    </P>
    <div className="my-5 text-foreground katex-display-gold">
      <EquationBlock math={String.raw`\hat S=\hat S_y\cup\hat S_d,\qquad y=\alpha d+X_{\hat S}'\beta+\varepsilon\ \Rightarrow\ \sqrt n(\hat\alpha-\alpha)\rightsquigarrow N(0,\sigma^2)`} />
    </div>
    <P>
      {content.text113[locale]}
    </P>
    <div>
      <ToolLink label={content.text114[locale]} note={content.text115[locale]} />
      <ToolLink label={content.text116[locale]} note={content.text117[locale]} />
      <ToolLink label="Double Machine Learning" note={content.text118[locale]} />
    </div>

    <H n="06" en="Reading Map" zh={content.text119[locale]} />
    <div className="space-y-3 my-6">
      {layers.map((l) => (
        <div key={l.n} className="flex gap-4 rounded-xl border border-border/60 bg-card/40 p-4">
          <span className="font-mono text-gold text-sm shrink-0">{l.n}</span>
          <div>
            <p className="font-display text-lg text-foreground">{l.t}</p>
            <p className="mt-1 text-[12px] text-foreground/65 leading-relaxed">{l.d}</p>
            <p className="mt-2 text-[11px] font-mono text-muted-foreground">{l.tools}</p>
          </div>
        </div>
      ))}
    </div>

    <div className="mt-10">
      <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-4">Timeline</p>
      <div className="space-y-2">
        {timeline.map((t) => (
          <div key={t.y} className="flex gap-4 items-baseline border-b border-border/40 pb-2">
            <span className="font-mono text-xs text-gold shrink-0 w-20">{t.y}</span>
            <span className="text-sm text-foreground">{t.t}</span>
            <span className="ml-auto text-[11px] text-foreground/55 text-right hidden sm:block">{t.d}</span>
          </div>
        ))}
      </div>
    </div>

    <div className="mt-16 pt-8 border-t border-border/60">
      <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-3">Coda</p>
      <p className="font-display text-xl md:text-2xl leading-snug text-foreground/85">
        {content.text120[locale]}
      </p>
    </div>

    <div className="mt-14">
      <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-4">Enter The Lab</p>
      <Link
        to="/s/econometrics"
        className="group flex items-center justify-between rounded-xl border border-gold/40 bg-card/40 p-5 hover:border-gold hover:bg-card/60 transition-all"
      >
        <span>
          <span className="block font-display text-lg text-foreground group-hover:text-gold transition-colors">
            {content.text121[locale]}
          </span>
          <span className="block mt-1 text-xs text-foreground/60">
            {content.text122[locale]}
          </span>
        </span>
        <ArrowUpRight className="w-5 h-5 text-gold shrink-0" />
      </Link>
    </div>
  </div>
  );
};

export default EconometricsTheory;
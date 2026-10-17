import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import EquationBlock from "@/components/common/EquationBlock";
import Reveal from "@/components/common/Reveal";

/**
 * Structured reading guide for the time-series toolkit (V5.5).
 * Chain: data features → stationarity → identification → estimation →
 * dynamics & regimes → forecasting → evaluation.
 */

const content = {
  text0: { zh: "看数据", en: "Inspect the data" },
  text1: { zh: "趋势 / 季节 / 断点", en: "Trend / Seasonality / Breaks" },
  text2: { zh: "先画图：单位根检验解决不了肉眼可见的结构变化", en: "Plot first: unit-root tests cannot resolve structural changes visible to the eye" },
  text3: { zh: "平稳性", en: "Stationarity" },
  text4: { zh: "I(0) 还是 I(1)?", en: "I(0) or I(1)?" },
  text5: { zh: "决定用水平、差分还是协整框架，也决定推断的分布", en: "Determines levels, differences, or cointegration—and the distribution used for inference" },
  text6: { zh: "识别阶数", en: "Identify the order" },
  text7: { zh: "ACF / PACF / 信息准则", en: "ACF / PACF / Information criteria" },
  text8: { zh: "Wold 定理保证线性表示存在，但不保证它就是机制", en: "Wold guarantees a linear representation, not that it is the underlying mechanism" },
  text9: { zh: "估计", en: "Estimation" },
  text10: { zh: "MLE / 条件 LS / 滤波", en: "MLE / Conditional LS / Filtering" },
  text11: { zh: "潜在状态模型要么卡尔曼滤波，要么粒子滤波", en: "Latent-state models require Kalman or particle filtering" },
  text12: { zh: "评价", en: "Evaluation" },
  text13: { zh: "样本内拟合与样本外密度校准是两回事", en: "In-sample fit and out-of-sample density calibration are different questions" },
  text14: { zh: "有单位根", en: "Unit root" },
  text15: { zh: "最常用，但在 ρ→1 与存在断点时功效很低", en: "The most widely used, but has low power as ρ→1 and in the presence of breaks" },
  text16: { zh: "单位根检验全家桶", en: "Unit-Root Test Suite" },
  text17: { zh: "用 Newey-West 非参数修正自相关，不加差分滞后项", en: "Uses a Newey-West nonparametric correction for autocorrelation, without lagged differences" },
  text18: { zh: "先 GLS 去趋势，近单位根区域功效明显优于 ADF", en: "GLS detrending first delivers substantially more power than ADF near a unit root" },
  text19: { zh: "平稳", en: "Stationarity" },
  text20: { zh: "原假设反过来，与 ADF 组合才能读出「证据不足」", en: "Reverses the null; combine with ADF to recognize insufficient evidence" },
  text21: { zh: "有单位根（含内生断点）", en: "Unit root (with an endogenous break)" },
  text22: { zh: "断点会让常规 ADF 系统性不拒绝单位根", en: "Breaks cause conventional ADF tests to systematically fail to reject a unit root" },
  text23: { zh: "季节单位根", en: "Seasonal unit roots" },
  text24: { zh: "季度/月度数据在 π、±π/2 等频率上也可能有单位根", en: "Quarterly/monthly data may also have unit roots at frequencies such as π and ±π/2" },
  text25: { zh: "平稳性与预处理", en: "Stationarity and preprocessing" },
  text26: { zh: "单位根、季节单位根、断点、差分与去趋势的取舍", en: "Unit roots, seasonal unit roots, breaks, and the choice between differencing and detrending" },
  text27: { zh: "单位根全家桶 · 差分决策实验室", en: "Unit-Root Suite · Differencing Decision Lab" },
  text28: { zh: "线性表示与识别", en: "Linear representation and identification" },
  text29: { zh: "Wold 分解、ARMA 阶数、特征根与可逆性", en: "Wold decomposition, ARMA orders, characteristic roots, and invertibility" },
  text30: { zh: "Wold / ARMA 识别台 · ARIMA", en: "Wold / ARMA Identification Workbench · ARIMA" },
  text31: { zh: "多变量动态", en: "Multivariate dynamics" },
  text32: { zh: "VAR/SVAR、Granger 因果、协整与误差修正、局部投影", en: "VAR/SVAR, Granger causality, cointegration and error correction, local projections" },
  text33: { zh: "SVAR · 协整/VECM · Granger · 局部投影", en: "SVAR · Cointegration/VECM · Granger · Local projections" },
  text34: { zh: "非线性与制度", en: "Nonlinearity and regimes" },
  text35: { zh: "门限、平滑转换、马尔可夫切换、多重断点", en: "Thresholds, smooth transitions, Markov switching, multiple breaks" },
  text36: { zh: "SETAR/LSTAR · Bai-Perron · 马尔可夫切换", en: "SETAR/LSTAR · Bai-Perron · Markov switching" },
  text37: { zh: "波动率与状态空间", en: "Volatility and state space" },
  text38: { zh: "GARCH 家族、随机波动率、卡尔曼与粒子滤波", en: "The GARCH family, stochastic volatility, Kalman and particle filtering" },
  text39: { zh: "GARCH/DCC · SV vs GARCH · 卡尔曼滤波 · HAR-RV", en: "GARCH/DCC · SV vs GARCH · Kalman filtering · HAR-RV" },
  text40: { zh: "预测与评价", en: "Forecasting and evaluation" },
  text41: { zh: "点预测、密度预测、组合与模型置信集", en: "Point forecasts, density forecasts, combinations, and model confidence sets" },
  text42: { zh: "指数平滑 · 密度预测评价 · 模型置信集 · DM 检验", en: "Exponential smoothing · Density forecast evaluation · Model confidence sets · DM test" },
  text43: { zh: "Yule 与 Slutsky", en: "Yule and Slutsky" },
  text44: { zh: "自回归与移动平均：随机冲击的累积就能造出周期，不需要「真实的周期机制」", en: "Autoregression and moving averages: accumulated random shocks can generate cycles without a genuine cyclical mechanism" },
  text45: { zh: "Wold 分解定理", en: "Wold decomposition theorem" },
  text46: { zh: "任何协方差平稳、纯非确定性过程都有 MA(∞) 表示——线性时间序列建模的基石", en: "Every covariance-stationary, purely nondeterministic process has an MA(∞) representation—the foundation of linear time-series modeling" },
  text47: { zh: "卡尔曼滤波与状态空间", en: "Kalman Filtering and State Space" },
  text48: { zh: "把不可观测状态与观测方程分离，递归更新最优线性预测", en: "Separate unobserved states from observation equations and recursively update optimal linear predictions" },
  text49: { zh: "Box-Jenkins 方法论", en: "The Box-Jenkins methodology" },
  text50: { zh: "识别—估计—诊断的迭代循环，把 ARIMA 变成工业标准", en: "An iterative identification–estimation–diagnostics cycle makes ARIMA an industry standard" },
  text51: { zh: "Granger-Newbold 伪回归", en: "Granger-Newbold spurious regression" },
  text52: { zh: "两条独立随机游走互相回归会得到高 R² 与发散的 t——非平稳数据的警钟", en: "Regressing independent random walks on each other produces high R² and divergent t statistics—a warning about nonstationary data" },
  text53: { zh: "Dickey-Fuller 与 Sims VAR", en: "Dickey-Fuller and Sims VAR" },
  text54: { zh: "单位根检验的非标准分布；VAR 取代大型联立方程系统", en: "Nonstandard distributions for unit-root tests; VAR replaces large simultaneous-equation systems" },
  text55: { zh: "Engle 与 Bollerslev：条件方差本身可以被建模、被预测", en: "Engle and Bollerslev: conditional variance can itself be modeled and forecast" },
  text56: { zh: "Engle-Granger 协整", en: "Engle-Granger cointegration" },
  text57: { zh: "非平稳变量之间可以存在平稳的长期关系，误差修正机制随之而来", en: "Nonstationary variables can share a stationary long-run relationship, giving rise to error correction" },
  text58: { zh: "非线性与断点", en: "Nonlinearity and breaks" },
  text59: { zh: "Hansen 门限模型的自助推断、Bai-Perron 多重断点的动态规划", en: "Bootstrap inference for Hansen threshold models; dynamic programming for Bai-Perron multiple breaks" },
  text60: { zh: "预测评价的规范化", en: "Formalizing forecast evaluation" },
  text61: { zh: "Diebold-Mariano 检验、PIT 与严格适当评分规则、Hansen 模型置信集", en: "Diebold-Mariano tests, PIT and strictly proper scoring rules, Hansen model confidence sets" },
  text62: { zh: "2000s–今", en: "2000s–present" },
  text63: { zh: "高维与机器学习", en: "High dimensions and machine learning" },
  text64: { zh: "因子增广 VAR、大维协方差、MIDAS 混频、状态空间与深度学习的融合", en: "Factor-augmented VAR, large covariance matrices, MIDAS mixed frequencies, and the convergence of state space and deep learning" },
  text65: { zh: "画图先于检验：趋势、季节、断点、异常值一眼可见的东西不要交给统计量去发现。", en: "Plot before testing: do not ask a statistic to discover trends, seasonality, breaks, and outliers already visible to the eye." },
  text66: { zh: "同时报告 ADF 与 KPSS，并接受「证据不足」这个诚实结论。", en: "Report both ADF and KPSS, and accept insufficient evidence as an honest conclusion." },
  text67: { zh: "差分之前问一句：研究对象是水平还是增速？过度差分会引入 −1 附近的 MA 根。", en: "Before differencing, ask whether the target is a level or a growth rate. Overdifferencing introduces an MA root near −1." },
  text68: { zh: "季度/月度数据检查季节单位根，不要用季节虚拟变量掩盖 (1−L^s) 的问题。", en: "Check quarterly/monthly data for seasonal unit roots; seasonal dummies cannot hide a (1−L^s) problem." },
  text69: { zh: "结构断点检验作为常规步骤，而不是审稿人质疑后才补。", en: "Make structural-break tests routine, not an afterthought prompted by a referee." },
  text70: { zh: "样本外评价用滚动或递归窗口，并明确区分伪样本外与真样本外。", en: "Use rolling or recursive windows for out-of-sample evaluation, clearly distinguishing pseudo-out-of-sample from genuine out-of-sample results." },
  text71: { zh: "风险相关的应用报告密度预测的 PIT 与 CRPS，不要只报 RMSE。", en: "For risk applications, report PIT and CRPS for density forecasts, not just RMSE." },
  text72: { zh: "比较多个模型时用模型置信集控制多重比较，并同时报告等权组合的表现。", en: "When comparing multiple models, use a model confidence set to control multiple comparisons, and report equal-weight combinations alongside them." },
  text73: { zh: "时间序列导读：从平稳性到密度预测评价", en: "A Guide to Time Series: From Stationarity to Density Forecast Evaluation" },
  text74: { zh: "时间序列分析的困难来自一个事实：我们只观测到历史的一条实现路径，却要谈论这条路径背后的概率结构。平稳性是让「一条路径」能替代「多次重复」的桥梁；识别、估计与预测评价，都建立在这座桥是否稳固之上。这篇导读沿着「看数据 → 平稳性 → 识别 → 动态与制度 → 预测 → 评价」的链条，把版块中的时间序列工具串起来。", en: "The difficulty of time-series analysis starts with a fact: we observe only one realized path through history, yet seek to describe the probability structure behind it. Stationarity is the bridge that lets one path stand in for repeated observations; identification, estimation, and forecast evaluation depend on that bridge holding. This guide connects the time-series tools along the chain: inspect the data → stationarity → identification → dynamics and regimes → forecasting → evaluation." },
  text75: { zh: "推理链：一条路径，五个问题", en: "The reasoning chain: one path, five questions" },
  text76: { zh: "横截面计量的核心焦虑是内生性，时间序列的核心焦虑是", en: "The central concern in cross-sectional econometrics is endogeneity; in time series, it is " },
  text77: { zh: "遍历性与稳定性", en: "ergodicity and stability" },
  text78: { zh: "：样本矩能否收敛到总体矩，以及这个「总体」在样本期内是否只有一个。", en: ": whether sample moments converge to population moments, and whether that population remains the same throughout the sample." },
  text79: { zh: "Wold 分解是整个线性框架的出发点：任何零均值、协方差平稳、纯非确定性的过程都可以写成白噪声的无穷加权和。它保证了 ARMA 逼近的合法性，但也划定了边界——这是关于二阶矩与线性投影的定理，εₜ 是线性预测误差，不是结构冲击。", en: "Wold decomposition is the starting point for the entire linear framework: every zero-mean, covariance-stationary, purely nondeterministic process can be written as an infinite weighted sum of white noise. It justifies ARMA approximation but also defines its limits: this is a theorem about second moments and linear projections. εₜ is a linear forecast error, not a structural shock." },
  text80: { zh: "Wold 分解与 ARMA 识别台", en: "Wold Decomposition and ARMA Identification Workbench" },
  text81: { zh: "理论 vs 样本 ACF/PACF、ψ 权重、特征根与单位圆", en: "Theoretical vs sample ACF/PACF, ψ weights, characteristic roots, and the unit circle" },
  text82: { zh: "ARIMA 建模", en: "ARIMA Modeling" },
  text83: { zh: "Box-Jenkins 循环与预测区间", en: "The Box-Jenkins cycle and forecast intervals" },
  text84: { zh: "平稳性：六个检验、两个原假设", en: "Stationarity: six tests, two null hypotheses" },
  text85: { zh: "单位根不是一个统计细节，而是关于「冲击是否永久」的经济命题。若 GDP 含单位根，一次衰退会永久改变产出水平；若它是趋势平稳，经济终将回到趋势线。两种世界观对应完全不同的预测扇形与政策含义。", en: "A unit root is not a statistical detail but an economic proposition about whether shocks are permanent. If GDP has a unit root, a recession permanently changes the level of output; if it is trend-stationary, the economy eventually returns to trend. These views imply very different forecast fans and policy conclusions." },
  text86: { zh: "检验", en: "Test" },
  text87: { zh: "原假设", en: "Null hypothesis" },
  text88: { zh: "要点", en: "Key points" },
  text89: { zh: "检验的功效在 ρ = 0.95 与 ρ = 1.00 之间几乎无法区分，这不是技术缺陷而是信息的真实限度。此时正确的做法不是反复更换确定项设定直到得到想要的结论，而是把两条路线（水平与差分）的结果都报告出来。", en: "Tests have almost no power to distinguish ρ = 0.95 from ρ = 1.00. This is not a technical flaw but a genuine limit of the information available. The right response is not to keep changing deterministic terms until the desired result appears, but to report both approaches: levels and differences." },
  text90: { zh: "ADF / PP / DF-GLS / KPSS / Zivot-Andrews / HEGY 一次跑完", en: "Run ADF / PP / DF-GLS / KPSS / Zivot-Andrews / HEGY together" },
  text91: { zh: "面板单位根与协整", en: "Panel Unit Roots and Cointegration" },
  text92: { zh: "差分：伪回归的代价与过度差分的代价", en: "Differencing: the costs of spurious regression and overdifferencing" },
  text93: { zh: "Granger 与 Newbold (1974) 的模拟是时间序列教学史上最著名的警告：两条完全独立的随机游走互相回归，t 统计量会随样本量发散，R² 可以高得离谱。原因是残差本身是 I(1)，OLS 的标准误公式彻底失效。", en: "The simulations of Granger and Newbold (1974) offer one of time-series teaching's best-known warnings: regress two entirely independent random walks on each other, and t statistics diverge with sample size while R² can be implausibly high. The residuals are themselves I(1), rendering the OLS standard-error formula invalid." },
  text94: { zh: "x_t,y_t\\ \\text{独立 }I(1)\\ \\Rightarrow\\ \\hat t_\\beta=O_p(\\sqrt T)\\ \\nrightarrow\\ N(0,1)", en: "x_t,y_t\\ \\text{independent }I(1)\\ \\Rightarrow\\ \\hat t_\\beta=O_p(\\sqrt T)\\ \\nrightarrow\\ N(0,1)" },
  text95: { zh: "但反方向的错误同样常见：对本来就平稳的序列做差分，会引入接近 −1 的 MA 根（不可逆），放大高频噪声、恶化样本外预测，还会丢掉水平关系中的长期信息。协整框架的价值正在于此——它允许在保留长期关系的同时得到平稳的误差修正项。", en: "The opposite mistake is just as common: differencing an already stationary series introduces an MA root near −1 (noninvertible), amplifies high-frequency noise, worsens out-of-sample forecasts, and discards long-run information in levels. This is the value of cointegration: it preserves long-run relationships while delivering a stationary error-correction term." },
  text96: { zh: "差分决策实验室", en: "Differencing Decision Lab" },
  text97: { zh: "伪回归拒绝率蒙特卡洛、过度差分的 MA 根与 RMSE、两种预测扇形", en: "Monte Carlo spurious-regression rejection rates, MA roots and RMSE under overdifferencing, and two forecast fans" },
  text98: { zh: "协整与 VECM", en: "Cointegration and VECM" },
  text99: { zh: "Engle-Granger / Johansen 与误差修正速度", en: "Engle-Granger / Johansen and the speed of error correction" },
  text100: { zh: "非线性与断点：一个模型不够用的时候", en: "Nonlinearity and breaks: when one model is not enough" },
  text101: { zh: "线性 ARMA 假设动态在整个样本期是同一套参数。现实里，衰退期的持久性可能远高于扩张期，套利只在偏离超过交易成本时启动，货币政策框架会整体转换。门限模型与断点模型分别刻画这两类偏离：前者是", en: "Linear ARMA assumes the same dynamic parameters throughout the sample. In practice, persistence can be much stronger in recessions than expansions, arbitrage may begin only when deviations exceed transaction costs, and monetary-policy frameworks can shift wholesale. Threshold and break models capture two kinds of departure: the former is " },
  text102: { zh: "状态依赖", en: "state-dependent" },
  text103: { zh: "（由变量取值触发），后者是", en: " (triggered by a variable's value), while the latter is " },
  text104: { zh: "时间依赖", en: "time-dependent" },
  text105: { zh: "（在某个日期发生）。", en: " (occurring at a particular date)." },
  text106: { zh: "两者都有同一个技术难点：门限 c 或断点日期 T_j 在原假设下不被识别（Davies 问题），常规 F 分布不再适用。Hansen 的自助检验与 Bai-Perron 的动态规划分别给出了可操作的解法。", en: "Both face the same technical difficulty: the threshold c or break date T_j is unidentified under the null (the Davies problem), so the usual F distribution no longer applies. Hansen's bootstrap tests and Bai-Perron's dynamic programming offer practical solutions, respectively." },
  text107: { zh: "门限自回归 SETAR / LSTAR", en: "Threshold Autoregression SETAR / LSTAR" },
  text108: { zh: "门限网格搜索、Hansen 自助 supF、平滑转换函数", en: "Threshold grid search, Hansen bootstrap supF, and smooth-transition functions" },
  text109: { zh: "Bai-Perron 多重断点", en: "Bai-Perron Multiple Breaks" },
  text110: { zh: "动态规划、BIC/LWZ 与序贯 supF(l+1|l)", en: "Dynamic programming, BIC/LWZ, and sequential supF(l+1|l)" },
  text111: { zh: "马尔可夫制度切换", en: "Markov Regime Switching" },
  text112: { zh: "不可观测状态与转移概率", en: "Unobserved states and transition probabilities" },
  text113: { zh: "波动率：确定性递归还是潜在状态", en: "Volatility: deterministic recursion or latent state?" },
  text114: { zh: "GARCH 把条件方差写成过去可观测量的确定性函数，因此似然可以直接写出来、估计成本极低；随机波动率把对数波动当作一个潜在状态过程，似然需要对整条状态路径积分，必须借助粒子滤波或 MCMC。两条路线对应两种哲学，也对应两种与连续时间模型的衔接方式。", en: "GARCH expresses conditional variance as a deterministic function of past observables, making the likelihood explicit and estimation inexpensive. Stochastic volatility treats log volatility as a latent-state process; the likelihood requires integration over the entire state path, calling for particle filtering or MCMC. These approaches reflect different philosophies and different links to continuous-time models." },
  text115: { zh: "随机波动率 vs GARCH", en: "Stochastic Volatility vs GARCH" },
  text116: { zh: "自举粒子滤波、参数网格 MLE、滤波路径与对数得分对比", en: "Bootstrap particle filtering, parameter-grid MLE, filtered paths, and log-score comparisons" },
  text117: { zh: "GARCH 家族与 DCC", en: "The GARCH Family and DCC" },
  text118: { zh: "非对称、厚尾与动态相关", en: "Asymmetry, heavy tails, and dynamic correlations" },
  text119: { zh: "可观测方程与状态方程的分离", en: "Separating observation and state equations" },
  text120: { zh: "预测评价：点预测之外", en: "Forecast evaluation: beyond point forecasts" },
  text121: { zh: "样本内 R² 与样本外表现几乎没有可靠联系。更进一步，风险管理关心的从来不是一个点，而是整条条件分布。概率积分变换 PIT 给出了检验密度校准的通用工具：若密度设定正确，uₜ = F̂ₜ(yₜ) 应服从均匀分布；U 型直方图说明区间过窄，系统性低估尾部风险。", en: "In-sample R² has little reliable connection to out-of-sample performance. More fundamentally, risk management concerns the entire conditional distribution, not a single point. The probability integral transform, PIT, provides a general tool for testing density calibration: if the density is correctly specified, uₜ = F̂ₜ(yₜ) should be uniform. A U-shaped histogram signals intervals that are too narrow and systematically understated tail risk." },
  text122: { zh: "比较多个模型时，成对 Diebold-Mariano 检验会带来严重的多重比较问题。Hansen、Lunde 与 Nason 的模型置信集通过序贯等价检验给出一个以 1−α 概率包含最优模型的集合；「无法选出唯一冠军」本身就是有价值的结论。与此同时，预测组合谜题依然成立：等权组合常常打败任何单一模型和「最优」估计权重。", en: "When comparing multiple models, pairwise Diebold-Mariano tests create a serious multiple-comparisons problem. The Hansen, Lunde, and Nason model confidence set uses sequential equivalence tests to produce a set containing the best model with probability 1−α. Being unable to name a single winner is itself informative. Meanwhile, the forecast-combination puzzle persists: equal weights often beat both individual models and estimated optimal weights." },
  text123: { zh: "密度预测评价", en: "Density Forecast Evaluation" },
  text124: { zh: "PIT 直方图、对数得分、CRPS、pinball 与覆盖率", en: "PIT histograms, log scores, CRPS, pinball loss, and coverage" },
  text125: { zh: "模型置信集与预测组合", en: "Model Confidence Sets and Forecast Combinations" },
  text126: { zh: "块自助 MCS、成对 DM 矩阵、逆 MSE 与最优权重", en: "Block-bootstrap MCS, pairwise DM matrices, inverse-MSE and optimal weights" },
  text127: { zh: "Diebold-Mariano 检验", en: "Diebold-Mariano Test" },
  text128: { zh: "两模型预测精度的正式比较", en: "A formal comparison of two models' forecast accuracy" },
  text129: { zh: "方法地图：六层结构", en: "Method map: six layers" },
  text130: { zh: "发展史：从 Yule 到严格适当评分规则", en: "A history: from Yule to strictly proper scoring rules" },
  text131: { zh: "最低报告清单", en: "Minimum reporting checklist" },
  text132: { zh: "一句话总结：时间序列建模的价值不在于把历史拟合得多好，而在于诚实地说明", en: "In short, the value of time-series modeling lies not in fitting history well, but in stating honestly " },
  text133: { zh: "哪些结构在样本期内是稳定的", en: "which structures remain stable within the sample" },
  text134: { zh: "、以及这种稳定性在预测期还能不能指望。平稳性检验、断点检验与样本外密度评价，分别在三个层面回答这个问题。", en: ", and whether that stability can be expected to persist into the forecast period. Stationarity tests, break tests, and out-of-sample density evaluation address this question at three distinct levels." },
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
  { k: content.text0[locale], v: content.text1[locale], note: content.text2[locale] },
  { k: content.text3[locale], v: content.text4[locale], note: content.text5[locale] },
  { k: content.text6[locale], v: content.text7[locale], note: content.text8[locale] },
  { k: content.text9[locale], v: content.text10[locale], note: content.text11[locale] },
  { k: content.text12[locale], v: "PIT / CRPS / MCS", note: content.text13[locale] },
];

const getStationarity = (locale: "zh" | "en") => [
  { name: "ADF", h0: content.text14[locale], note: content.text15[locale], tool: content.text16[locale] },
  { name: "Phillips-Perron", h0: content.text14[locale], note: content.text17[locale], tool: content.text16[locale] },
  { name: "DF-GLS", h0: content.text14[locale], note: content.text18[locale], tool: content.text16[locale] },
  { name: "KPSS", h0: content.text19[locale], note: content.text20[locale], tool: content.text16[locale] },
  { name: "Zivot-Andrews", h0: content.text21[locale], note: content.text22[locale], tool: content.text16[locale] },
  { name: "HEGY", h0: content.text23[locale], note: content.text24[locale], tool: content.text16[locale] },
];

const getLayers = (locale: "zh" | "en") => [
  { n: "L1", t: content.text25[locale], d: content.text26[locale], tools: content.text27[locale] },
  { n: "L2", t: content.text28[locale], d: content.text29[locale], tools: content.text30[locale] },
  { n: "L3", t: content.text31[locale], d: content.text32[locale], tools: content.text33[locale] },
  { n: "L4", t: content.text34[locale], d: content.text35[locale], tools: content.text36[locale] },
  { n: "L5", t: content.text37[locale], d: content.text38[locale], tools: content.text39[locale] },
  { n: "L6", t: content.text40[locale], d: content.text41[locale], tools: content.text42[locale] },
];

const getTimeline = (locale: "zh" | "en") => [
  { y: "1927", t: content.text43[locale], d: content.text44[locale] },
  { y: "1938", t: content.text45[locale], d: content.text46[locale] },
  { y: "1960s", t: content.text47[locale], d: content.text48[locale] },
  { y: "1970", t: content.text49[locale], d: content.text50[locale] },
  { y: "1974", t: content.text51[locale], d: content.text52[locale] },
  { y: "1979–81", t: content.text53[locale], d: content.text54[locale] },
  { y: "1982–86", t: "ARCH / GARCH", d: content.text55[locale] },
  { y: "1987", t: content.text56[locale], d: content.text57[locale] },
  { y: "1993–98", t: content.text58[locale], d: content.text59[locale] },
  { y: "1995–2011", t: content.text60[locale], d: content.text61[locale] },
  { y: content.text62[locale], t: content.text63[locale], d: content.text64[locale] },
];

const getChecklist = (locale: "zh" | "en") => [
  content.text65[locale],
  content.text66[locale],
  content.text67[locale],
  content.text68[locale],
  content.text69[locale],
  content.text70[locale],
  content.text71[locale],
  content.text72[locale],
];

const TimeSeriesTheory = () => {
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en" : "zh";
  const chain = getChain(locale);
  const stationarity = getStationarity(locale);
  const layers = getLayers(locale);
  const timeline = getTimeline(locale);
  const checklist = getChecklist(locale);
  return (
  <div className="container max-w-3xl px-6 pt-6 pb-24">
    <Reveal>
      <div className="border-t border-b border-border/60 py-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="h-px w-10 bg-gold" />
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold font-bold">
            Reading Guide / Time Series
          </span>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">≈ 16 min read</span>
        </div>
        <h2 className="font-display text-3xl md:text-[40px] leading-[1.15] text-foreground">
          {content.text73[locale]}
        </h2>
        <p className="mt-2 text-sm font-mono text-muted-foreground">
          Plot first, test second, evaluate out of sample always.
        </p>
        <p className="mt-5 text-[15px] leading-[1.85] text-foreground/75">
          {content.text74[locale]}
        </p>
      </div>
    </Reveal>

    <H n="01" en="The Chain" zh={content.text75[locale]} />
    <P>
      {content.text76[locale]}<span className="text-gold">{content.text77[locale]}</span>{content.text78[locale]}
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
      {content.text79[locale]}
    </P>
    <div className="my-5 text-foreground katex-display-gold">
      <EquationBlock math={String.raw`y_t=\mu+\sum_{j=0}^{\infty}\psi_j\varepsilon_{t-j}+\kappa_t,\qquad \psi_0=1,\ \sum_{j}\psi_j^2<\infty`} />
    </div>
    <div>
      <ToolLink label={content.text80[locale]} note={content.text81[locale]} />
      <ToolLink label={content.text82[locale]} note={content.text83[locale]} />
    </div>

    <H n="02" en="Stationarity" zh={content.text84[locale]} />
    <P>
      {content.text85[locale]}
    </P>
    <div className="my-5 text-foreground katex-display-gold">
      <EquationBlock math={String.raw`\Delta y_t=\alpha+\delta t+\gamma y_{t-1}+\sum_{i=1}^{p}\phi_i\Delta y_{t-i}+\varepsilon_t,\qquad H_0:\gamma=0`} />
    </div>
    <div className="overflow-x-auto my-6 rounded-xl border border-border/60">
      <table className="w-full text-[13px]">
        <thead className="bg-card/60 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="text-left py-2.5 px-3">{content.text86[locale]}</th>
            <th className="text-left px-3">{content.text87[locale]}</th>
            <th className="text-left px-3">{content.text88[locale]}</th>
          </tr>
        </thead>
        <tbody>
          {stationarity.map((s) => (
            <tr key={s.name} className="border-t border-border/40">
              <td className="py-2.5 px-3 text-foreground whitespace-nowrap">{s.name}</td>
              <td className="px-3 text-foreground/70 whitespace-nowrap">{s.h0}</td>
              <td className="px-3 text-foreground/70">{s.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <P>
      {content.text89[locale]}
    </P>
    <div>
      <ToolLink label={content.text16[locale]} note={content.text90[locale]} />
      <ToolLink label={content.text91[locale]} note="LLC / IPS / Pedroni" />
    </div>

    <H n="03" en="Differencing" zh={content.text92[locale]} />
    <P>
      {content.text93[locale]}
    </P>
    <div className="my-5 text-foreground katex-display-gold">
      <EquationBlock math={content.text94[locale]} />
    </div>
    <P>
      {content.text95[locale]}
    </P>
    <div>
      <ToolLink label={content.text96[locale]} note={content.text97[locale]} />
      <ToolLink label={content.text98[locale]} note={content.text99[locale]} />
    </div>

    <H n="04" en="Nonlinearity & Breaks" zh={content.text100[locale]} />
    <P>
      {content.text101[locale]}<span className="text-gold">{content.text102[locale]}</span>{content.text103[locale]}<span className="text-gold">{content.text104[locale]}</span>{content.text105[locale]}
    </P>
    <div className="my-5 text-foreground katex-display-gold">
      <EquationBlock math={String.raw`y_t=\big[\phi_L'x_t\big]\mathbf 1\{z_{t-d}\le c\}+\big[\phi_H'x_t\big]\mathbf 1\{z_{t-d}>c\},\qquad G(z;\gamma,c)=\frac{1}{1+e^{-\gamma(z-c)}}`} />
    </div>
    <P>
      {content.text106[locale]}
    </P>
    <div>
      <ToolLink label={content.text107[locale]} note={content.text108[locale]} />
      <ToolLink label={content.text109[locale]} note={content.text110[locale]} />
      <ToolLink label={content.text111[locale]} note={content.text112[locale]} />
    </div>

    <H n="05" en="Volatility & State Space" zh={content.text113[locale]} />
    <P>
      {content.text114[locale]}
    </P>
    <div className="my-5 text-foreground katex-display-gold">
      <EquationBlock math={String.raw`\sigma_t^2=\omega+\alpha\varepsilon_{t-1}^2+\beta\sigma_{t-1}^2\qquad\text{vs}\qquad h_t=\mu+\phi(h_{t-1}-\mu)+\sigma_\eta\eta_t,\ y_t=e^{h_t/2}\varepsilon_t`} />
    </div>
    <div>
      <ToolLink label={content.text115[locale]} note={content.text116[locale]} />
      <ToolLink label={content.text117[locale]} note={content.text118[locale]} />
      <ToolLink label={content.text47[locale]} note={content.text119[locale]} />
    </div>

    <H n="06" en="Forecast Evaluation" zh={content.text120[locale]} />
    <P>
      {content.text121[locale]}
    </P>
    <div className="my-5 text-foreground katex-display-gold">
      <EquationBlock math={String.raw`u_t=\hat F_t(y_t)\sim U(0,1);\qquad \mathrm{CRPS}(\hat F,y)=\int_{-\infty}^{\infty}\big[\hat F(z)-\mathbf 1\{z\ge y\}\big]^2\,dz`} />
    </div>
    <P>
      {content.text122[locale]}
    </P>
    <div>
      <ToolLink label={content.text123[locale]} note={content.text124[locale]} />
      <ToolLink label={content.text125[locale]} note={content.text126[locale]} />
      <ToolLink label={content.text127[locale]} note={content.text128[locale]} />
    </div>

    <H n="07" en="Method Map" zh={content.text129[locale]} />
    <div className="space-y-2 my-6">
      {layers.map((l) => (
        <div key={l.n} className="rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="flex items-baseline gap-3">
            <span className="text-[10px] font-mono text-gold">{l.n}</span>
            <span className="text-sm text-foreground">{l.t}</span>
          </div>
          <p className="mt-1.5 text-[13px] text-foreground/70 leading-relaxed">{l.d}</p>
          <p className="mt-1.5 text-[11px] font-mono text-foreground/50">{l.tools}</p>
        </div>
      ))}
    </div>

    <H n="08" en="Timeline" zh={content.text130[locale]} />
    <div className="space-y-3 my-6 border-l border-border/60 pl-5">
      {timeline.map((e) => (
        <div key={e.y} className="relative">
          <span className="absolute -left-[27px] top-2 h-1.5 w-1.5 rounded-full bg-gold" />
          <p className="text-[11px] font-mono text-gold">{e.y}</p>
          <p className="text-sm text-foreground">{e.t}</p>
          <p className="text-[13px] text-foreground/65 leading-relaxed">{e.d}</p>
        </div>
      ))}
    </div>

    <H n="09" en="Checklist" zh={content.text131[locale]} />
    <ol className="my-6 space-y-2 list-none">
      {checklist.map((c, i) => (
        <li key={i} className="flex gap-3 text-[14px] leading-[1.8] text-foreground/80">
          <span className="text-[11px] font-mono text-gold mt-1 shrink-0">{String(i + 1).padStart(2, "0")}</span>
          <span>{c}</span>
        </li>
      ))}
    </ol>

    <div className="mt-10 rounded-xl border border-gold/30 bg-gold/5 p-5">
      <p className="text-[13px] leading-[1.85] text-foreground/80">
        {content.text132[locale]}<span className="text-gold">{content.text133[locale]}</span>{content.text134[locale]}
      </p>
    </div>
  </div>
  );
};

export default TimeSeriesTheory;
## 各模块现状回顾

- **衍生品 (Derivatives)**：BS、隐含波动率、SVI 曲面、美式 LSM、Caps/Floors/Swaptions、MC 定价
- **固定收益 (Bond)**：DCF 定价、久期/凸性、Nelson-Siegel
- **风险 (Risk)**：Merton 信用、Copula 联合 VaR、压力情景、（基础 VaR/ES）
- **组合/量化 (Quant)**：Markowitz、有效前沿、Black-Litterman、回测、FF5 归因
- **利率 (Rates)**：Vasicek、CIR
- **计量 (Econ)**：OLS/IV、DID、RDD（Sharp/Fuzzy/Donut/CCT）、GMM、SVAR/IRF、GARCH/EGARCH、DCC、协整/VECM、Kalman/HP、MIDAS、Synthetic Control、Staggered DID、Markov Regime-Switching

下面按学科列出**仍缺的重要模型**。

---

## A. 衍生品 / 期权（结构性缺口大）

1. **Heston 随机波动率模型** — `dv = κ(θ−v)dt + ξ√v dW₂`，半解析（Carr-Madan FFT）定价 + 波动率曲面拟合，对比 BS 平坦 IV 的失败
2. **SABR 模型** — `dF = σ F^β dW₁`，Hagan 隐含波动率近似公式，IR/Swaption 行业标准
3. **Bates / Merton 跳跃扩散** — 加入 Poisson 跳跃，捕捉股指左尾与短期 smile
4. **Local Volatility (Dupire)** — 由 IV 曲面反推 σ(S,t)，与 SVI 工具天然衔接
5. **变分/障碍/亚式期权** — Barrier (UO/DO/UI/DI)、Asian (算术/几何) 解析+MC
6. **Greeks 完整工作台** — Delta/Gamma/Vega/Theta/Rho/Vanna/Volga 热图

## B. 固定收益 / 利率期限结构

7. **Hull-White (扩展 Vasicek)** — 校准到当前零息曲线，trinomial tree
8. **HJM / LMM (LIBOR Market Model)** — 远期利率框架，与 Vasicek/CIR 并列
9. **Bootstrapping 即期曲线** — 从息票债 → spot/forward 曲线（教学经典）
10. **OAS (Option-Adjusted Spread)** — 含赎回条款债券，配合 Hull-White 树
11. **Svensson 曲线** — Nelson-Siegel 的 6 参数扩展（央行常用）

## C. 信用风险 / 风险管理

12. **CreditMetrics / CreditRisk+** — 组合层面信用 VaR
13. **Reduced-Form (Jarrow-Turnbull, Duffie-Singleton)** — 强度模型，与 Merton 结构模型对照
14. **CVA / DVA / FVA** — 交易对手信用估值调整（巴塞尔 III 必修）
15. **Expected Shortfall + Cornish-Fisher VaR** — 巴塞尔 FRTB 主推度量
16. **EVT / POT (Peaks-Over-Threshold)** — 极值理论尾部建模
17. **Backtesting VaR** — Kupiec POF + Christoffersen 独立性检验

## D. 投资组合 / 量化（中等优先级）

18. **Risk Parity / HRP (Hierarchical Risk Parity)** — Lopez de Prado，无需 Σ⁻¹ 的现代分散
19. **Mean-CVaR 优化 (Rockafellar-Uryasev)** — 用 CVaR 替代方差作为风险度量
20. **Kelly Criterion / 凯利下注** — 对数效用最优杠杆
21. **Carhart 4 因子 / Q-Factor / Hou-Xue-Zhang** — FF5 之外的主流因子模型
22. **Performance Attribution (Brinson)** — 资产配置 vs 选股贡献分解

## E. 计量（仍未覆盖）

23. **Logit / Probit + 边际效应** — 离散选择必修
24. **Quantile Regression** — 分位数路径
25. **Local Projections (Jordà 2005)** — IRF 的回归式替代
26. **Double / Debiased ML (Chernozhukov 2018)** — 现代因果推断
27. **PSM / IPW / AIPW** — 倾向得分三件套

## F. 宏观 / 经济学

28. **Solow 增长模型** — 资本动力学 + 黄金率
29. **DSGE 简化版 (3 方程 New Keynesian)** — IS / Phillips / Taylor 规则
30. **Ramsey-Cass-Koopmans** — 最优消费跨期
31. **Mundell-Fleming** — 开放经济 IS-LM-BP

---

## 推荐路线（如果只挑下一波 5 个）

跨学科补关键缺口、避免单一模块膨胀：

1. **Heston 随机波动率**（衍生品 — 最大缺口，与 SVI/IV 工具构成完整曲面体系）
2. **Hull-White + Bootstrapping 曲线**（固收 — 完整利率期限结构闭环）
3. **Expected Shortfall + Backtesting (Kupiec/Christoffersen)**（风险 — FRTB 标配）
4. **Risk Parity / HRP**（组合 — Markowitz 之外的现代主流）
5. **Logit / Probit + 边际效应**（计量 — 离散选择经典缺口）

如果想要更激进的扩展，可以再加 **SABR**（衍生品）、**DSGE 三方程**（宏观）、**Double ML**（计量现代）。

---

## 请你确认

- 选哪几个（编号）？例如 "1, 2, 7, 12, 23"
- 是否仍按现有标准实现：preset / LaTeX 公式 / 中文教学卡 / 可视化 + 稳健性
- 新增宏观模块需要单独建一个 section（`MacroTools.tsx`）吗，还是只在计量内追加？

## 现状

计量模块已覆盖：OLS/IV、DID（含事件研究）、RDD（Sharp/Fuzzy/Donut/CCT）、GMM、SVAR/IRF、GARCH/EGARCH、DCC-GARCH、协整/VECM、Kalman/HP 滤波、MIDAS。

下面按"教学价值 × 实现可行性"分四个梯队列出可加入的模型，供你勾选。

---

## A. 面板数据 / 因果识别（最高优先级，补齐缺口）

1. **Synthetic Control (Abadie-Diamond-Hainmueller 2010)**
   合成对照法。单一处理单元，构造加权"合成对照"。可视化：真实 vs 合成路径、Placebo in-space/in-time、permutation p-value、leave-one-out 稳健性。
2. **Staggered DID — Callaway-Sant'Anna (2021) / Sun-Abraham (2021)**
   交错处理下的异质性 ATT(g,t)。对比 TWFE 偏误（Goodman-Bacon 分解）、绘制群组-时间效应矩阵。
3. **PSM / IPW / Doubly-Robust (AIPW)**
   倾向得分匹配 + 加权 + 双稳健 ATE。可视化共同支撑、协变量平衡（SMD 图）、ATT/ATE 对比。
4. **Panel Fixed/Random Effects + Hausman 检验**
   FE / RE / Pooled OLS 三种估计 + Hausman χ² 决策。

## B. 时间序列 / 预测

5. **ARIMA(p,d,q) + 自动定阶（AIC/BIC）**
   ACF/PACF 图、Ljung-Box 残差检验、out-of-sample 滚动预测带。
6. **State-Space / DLM（局部水平 + 季节）**
   已有 Kalman，可扩展为完整结构时序模型（Harvey 1989）。
7. **Markov Regime-Switching (Hamilton 1989)**
   双状态均值/方差切换，平滑概率图（识别衰退期）。
8. **Local Projections (Jordà 2005)**
   IRF 的回归式替代方案，与 SVAR IRF 并排对比。

## C. 离散选择 / 微观计量

9. **Logit / Probit + 边际效应**
   ROC、混淆矩阵、AME vs MEM。
10. **Tobit / Heckman 两步法**
    截断 / 样本选择偏差校正。
11. **Quantile Regression (Koenker-Bassett 1978)**
    多分位数系数路径图。

## D. 现代/机器学习计量

12. **Double / Debiased Machine Learning (Chernozhukov et al. 2018)**
    DML 的 partialling-out 演示，对比 OLS 偏误。
13. **Causal Forest / GRF (Athey-Wager)**
    异质性处理效应（HTE）的简化版可视化。
14. **LASSO / Ridge / Elastic Net + 交叉验证**
    系数路径与 CV 误差曲线。

---

## 推荐组合（如果只挑 3 个）

- **Synthetic Control**（最经典且 RDD/DID 之后的自然延伸）
- **Staggered DID (Callaway-Sant'Anna)**（修正现有 DID 的核心已知偏误）
- **Markov Regime-Switching**（与 GARCH/SVAR 形成时序三件套）

---

## 请你确认

请告诉我：
- 想加入哪几个（编号即可，例如 "1, 2, 7"）
- 是否需要为新增模型保持与现有 RDD 同等深度（presets / CCT 级别的稳健性检验 / 教学公式 + 中文解读）
- 是否需要拆分到独立文件（如 `src/components/econ/CausalAdvanced.tsx`），避免 `EconometricsTools.tsx` 继续膨胀

确认后我会输出实现计划并进入构建。
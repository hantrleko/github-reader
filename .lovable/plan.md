## 当前状态盘点

经过 V2.1 → V2.3,计量经济模块已有 22 个工具,覆盖:
- **面板/因果**: Synthetic Control, Staggered DID (CS), PSM/IPW/AIPW, RDD, IV/2SLS
- **时序**: ARIMA, GARCH, DCC-GARCH, SVAR, Markov Regime-Switching, **DLM/状态空间** ✅
- **离散/选择**: Logit/Probit, Tobit, Heckman, Quantile Reg
- **机器学习计量**: LASSO/Ridge/Elastic Net
- **基础**: Panel FE/RE + Hausman, MIDAS

---

## 可扩展方向(按优先级排序)

### 🅰 V2.4 — 完成机器学习计量三件套(最高 ROI)

承接 V2.3 路线图原本的收尾:

1. **Double / Debiased Machine Learning (Chernozhukov 2018)**
   - Partialling-out: 用 ML(LASSO/RF)拟合 E[Y|X], E[D|X] 残差化后再回归
   - Cross-fitting (K-fold) 消除过拟合偏误
   - 可视化: 朴素 OLS 偏误 vs DML 一致估计、不同 ML learner 对比、覆盖率仿真

2. **Causal Forest / GRF (Athey-Wager 2018)**
   - 基于诚实分裂的随机森林估计 CATE τ(x)
   - 可视化: HTE 热力图(2D 协变量切片)、变量重要性、置信区间瀑布图

3. **Bayesian Linear Regression / BVAR**
   - 共轭先验 + Gibbs 采样,后验分布带
   - Minnesota prior BVAR 用于宏观预测

### 🅱 V2.5 — 高频与微观结构(新维度)

4. **Realized Volatility / HAR-RV (Corsi 2009)**
   - 5-min RV、bipower variation、跳跃成分识别
   - HAR(日/周/月)三尺度回归预测

5. **Hawkes Process(自激点过程)**
   - 高频订单流/违约聚集建模,MLE 拟合 + 强度路径

6. **Order Book / Kyle Lambda**
   - 价格冲击模型、PIN(知情交易概率)

### 🅲 V2.6 — 衍生品 & 风险深化

7. **CVA / XVA 计算器** — Wrong-way risk, Bilateral CVA
8. **Copula 信用组合 (Vasicek/Li)** — 已有 Gaussian Copula 可扩展 t-Copula、违约相关性曲面
9. **Bermudan Swaption (LMM)** — Libor Market Model 蒙特卡洛
10. **Path-dependent Exotics** — Asian/Barrier/Lookback 蒙特卡洛 + 控制变量

### 🅳 V2.7 — 宏观与公司金融(横向拓展)

11. **DSGE 简化版(RBC / 三方程 NK)** — 脉冲响应可视化
12. **HANK 异质代理人模型(教学版)**
13. **Merton 结构化违约模型** — 资本结构 + 违约距离 DD
14. **Real Options(实物期权)** — 投资递延决策树

### 🅴 V2.8 — 平台/体验增强(非工具类)

15. **Notebook 模式** — 用户可自由组合工具,导出 PDF 报告
16. **真实数据基准库** — FRED/Yahoo 一键加载到任意工具
17. **跨工具对比仪表盘** — 同一份数据并行跑 OLS/IV/DID
18. **LLM 解读助手** — 调用 Lovable AI 自动解释结果系数与诊断

---

## 推荐组合(只挑 3 个,投入最小、收益最大)

如果只做一个 Sprint,推荐 **🅰 V2.4 完整收官**:
- Double ML(填补 ML 因果空白)
- Causal Forest(HTE 可视化是教学亮点)
- Bayesian Regression(贝叶斯学派代表)

这样计量模块达到 25 个工具,**完整覆盖经典 + 现代 + 贝叶斯三大学派**,可以正式打包发布 v3.0。

之后再开 V2.5 高频/微观结构作为新的横向拓展。

---

## 文件改动预估(以 V2.4 为例)

```text
新建: src/components/econ/V24Tools.tsx           (~1000 行,3 个工具)
修改: src/components/EconometricsTools.tsx       (注册 dml / causal_forest / bayes)
修改: src/components/Changelog.tsx               (V2.4 条目)
修改: src/i18n/locales/{en,zh}.json              (版本号 → V2.4)
```

请选择推进方向(🅰/🅱/🅲/🅳/🅴 或自定义组合)。

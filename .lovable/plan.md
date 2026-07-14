# V4.1 投资组合理论模块强化

## 现状盘点

现有工具集中在 `src/components/EfficientFrontier.tsx`、`src/components/quant/{PortfolioBacktest, RiskParityTool, Sprint4Tools, BacktestLab, WalkForwardTool}`，底层数学在 `src/lib/quant/portfolio.ts`：

- 已有：等权 / 最小方差 / 均值方差 / 风险平价 / HRP / Black-Litterman（简化） / 回测与再平衡 / 交易成本 / 走前向。
- 缺口：稳健优化、下行风险、参数不确定性、因子层面的风险预算、增长率视角、约束优化。

## 目标（选 6 个新工具，覆盖"稳健、下行、因子、增长"四类前沿主题）

### 1. Black-Litterman 完整版（升级现有简化实现）
- 提供市场隐含超额收益 π = δΣw_mkt、绝对/相对观点矩阵 P、观点不确定性 Ω（可选 Idzorek 置信度反解）
- 输出：后验 μ̃、Σ̃、以及最优权重与"仅先验/仅观点/融合"三条前沿对比

### 2. Mean-CVaR / Mean-Semi-Variance 优化
- 用历史或蒙特卡洛情景，最小化 CVaR@α（Rockafellar-Uryasev 线性化的凸投影梯度求解）
- 输出：CVaR 前沿 vs 均值方差前沿叠加、尾部对齐后的权重差异

### 3. 稳健协方差与收缩估计
- Ledoit-Wolf 常相关目标收缩、Oracle 近似收缩（OAS）、Minimum Covariance Determinant 稳健估计
- 展示：条件数、样本外方差预测误差、收缩强度 λ* 网格
- 直接改善 min-var / MV / RP 的样本外表现

### 4. Michaud 重采样有效前沿（参数不确定性）
- 对 (μ, Σ) 做 B 次 bootstrap，求每次前沿上等风险分位点，求平均权重
- 输出：经典前沿 vs 重采样前沿、权重稳定性热力图（B 次分布）

### 5. 因子风险预算 / 因子中性组合
- 给定因子暴露矩阵 B（MKT/SMB/HML/RMW/CMA 或用户自定义），分解组合风险为因子风险 + 特异风险
- 支持：因子风险预算目标（例如 60% MKT / 20% Value / 20% Quality）、因子中性约束（β_f = 0）
- 输出：因子风险贡献瀑布图、因子暴露条形图

### 6. Kelly & 破产风险实验室
- 完整 Kelly：f\* = Σ⁻¹(μ − r) 组合形式；分数 Kelly 曲线
- 蒙特卡洛终值分布 + 破产概率 P(min W_t < 阈值)
- 与 log-utility / 均值方差最优点在增长率-风险空间的对比

## 落地结构

### 新增数学库 `src/lib/quant/portfolioAdvanced.ts`
- `blackLittermanFull(pi, tau, Sigma, P, Q, Omega)` → { muPost, SigmaPost }
- `idzorekOmega(P, Sigma, tau, confidences)` → Omega
- `meanCVaROptimize(scenarios, alpha, targetReturn?)` → weights, CVaR, VaR
- `ledoitWolfShrink(returns)` / `oasShrink(returns)` / `mcdEstimate(returns)`
- `resampledFrontier(mu, Sigma, B, gridPts)` → { classic, resampled, weightDist }
- `factorRiskDecomp(w, B, factorCov, specificVar)` → { total, factorRC[], specificRC }
- `factorBudgetWeights(B, factorCov, specificVar, targets)` → weights
- `kellyWeights(mu, Sigma, rf)` / `kellySimulate(weights, mu, Sigma, N, T)` → { terminal, ruinProb }

### 新增 UI `src/components/quant/V41PortfolioTools.tsx`
六个 Tool 组件，复用现有 `PresetButtons` / `Slider` / `Stat` / `ShareExportToolbar` / `EquationBlock` 样式。所有工具使用 Recharts + gold 主题，遵循 Bloomberg-editorial 记忆规范。

### 挂载
- 在 `src/components/QuantStrategyTools.tsx` 引入 `CategorizedToolNav`（复用资产定价的分类导航），将现有 5 个工具 + 新 6 个工具划分为 3 类：
  ```
  经典与稳健：backtest, walkforward, minvar-shrink*, resampled*
  贝叶斯与因子：bl-full*, ff5, factor-budget*
  下行与增长：rp, cvar*, kelly*
  ```
- `src/data/toolsCatalog.ts` 追加 6 条元数据（zh/en + category = "portfolio"）
- Command palette 与 workflows 自动接入（读 catalog）

### 测试
- 新增 `src/lib/quant/__tests__/portfolioAdvanced.test.ts`：
  - BL 后验在 Ω→∞ 时回到先验、Ω→0 时回到观点
  - Ledoit-Wolf 收缩后条件数下降
  - Mean-CVaR 前沿单调性：更高目标收益 ⇒ 更高 CVaR
  - 因子分解总和 = 组合方差
  - Kelly 全额 vs 半 Kelly：半 Kelly 破产概率严格更低

### 版本与文档
- `package.json` bump → `4.1.0`
- `src/components/Changelog.tsx` + `CHANGELOG.md`：V4.1 条目
- `src/lib/buildVersion.ts` 更新
- i18n：`en.json` / `zh.json` 增加 `sections.quant.subtitle` 更新 + 6 个工具名/描述键

## 技术细节

- Mean-CVaR 用 Rockafellar-Uryasev 表述：min VaR + (1/((1-α)N))Σ max(−r_s·w − VaR, 0)，用投影次梯度（长仓单纯形）+ VaR 内点更新收敛，避免引入 LP 求解器依赖。
- Ledoit-Wolf 用 Schäfer-Strimmer 简化：λ* = min(1, ΣVar(s_ij)/Σ(s_ij − t_ij)²)，目标 t = 常相关 × 样本方差。
- Michaud 重采样：对每个 bootstrap 样本重新估 (μ̂,Σ̂) → 20 点均值方差前沿 → 按 σ 分位对齐后平均权重。
- 因子协方差假设块对角（因子间协方差 + 特异残差协方差对角化）。
- Kelly 蒙特卡洛使用几何布朗运动近似，log 收益服从 N(μ − σ²/2, σ²)。

## 交付顺序（一次实现）

1. `portfolioAdvanced.ts` + 测试
2. 六个 UI 工具组件 + `QuantStrategyTools.tsx` 分类导航接入
3. `toolsCatalog.ts` / i18n / changelog / buildVersion / package.json
4. `tsgo` 类型校验 + `vitest run` 通过

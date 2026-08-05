# V5.6 投资组合理论补全：从均值—方差到稳健与动态配置

对照《投资组合理论框架报告》，现有 11 个组合工具已覆盖 Black-Litterman、Mean-CVaR、收缩协方差、Michaud 重采样、因子风险预算、Kelly、风险平价。缺口集中在四块：**均衡与几何基础**、**估计误差与约束/执行**、**主动管理与下行风险**、**多期与高维前沿**。

## 新增 8 个交互工具

**经典基础与均衡**
1. 有效前沿几何与两基金分离台 — 前沿双曲线、CAL / 切点组合、无风险利率与借贷约束滑杆，展示分离定理与零贝塔 CAPM（受限借贷下切点被零贝塔组合替代）。
2. 单指数 / 多指数降维实验室 — Sharpe 单指数模型估计 β 与残差方差，对比"全样本协方差 vs 单指数结构化协方差"的参数个数与样本外表现。

**估计误差与执行**
3. 估计误差与滚动优化实验室 — 蒙特卡洛真实参数 → 有限样本估计 → 最优权重误差；对比 MV / 最小方差 / 等权的样本外 Sharpe 衰减（"等权是强基准"的可验证展示）。
4. 约束与再平衡成本实验室 — 权重上下限、行业与换手约束，以及无 / 日历 / 阈值三种再平衡规则的成本—跟踪误差权衡曲线。

**主动管理与下行风险**
5. 主动管理与信息比率台 — Grinold 基本法则 IR ≈ IC·√Breadth、Treynor-Black 主动/被动混合、跟踪误差预算。
6. 下行风险与随机占优台 — 半方差、下偏矩 LPM(n)、Sortino / Omega、一阶与二阶随机占优检验，以及 CRRA 期望效用最优配置对比。

**多期与高维前沿**
7. 多期与动态配置实验室 — Merton 连续时间最优比例、跨期对冲需求、生命周期下滑轨道、路径依赖（再平衡 vs 买入持有）模拟。
8. 高维正则化与最大分散化台 — L1/L2 惩罚组合、稀疏权重路径、最大分散化比率组合（MDP），与最小方差 / 等权同台比较。

## 理论导读专题

新增 `/s/portfolio-theory` 页面：按报告十节结构组织（根本问题 → MPT → 均衡定价 → 实务约束 → 扩展框架 → 历史脉络 → 前沿 → 统一工作流 → 常见误用清单），每个理论点带"到实验室复现"链接，风格与 `/s/asset-pricing-theory`、`/s/time-series-theory` 一致。

## 技术方案

- 新建 `src/lib/quant/portfolioFrontier.ts`：纯函数实现前沿解析解、单指数估计、估计误差 MC、约束再平衡引擎、IR / Treynor-Black、LPM 与随机占优、Merton 动态配置、L1/L2 与 MDP 优化（复用 `portfolioAdvanced.ts` 的矩阵与单纯形工具）。
- 新建 `src/lib/quant/__tests__/portfolioFrontier.test.ts`：约 20 项单测（前沿解析解与数值解一致、单指数协方差半正定、等权基准优于噪声 MV、IR 公式、SSD 传递性、Merton 闭式解、MDP 分散比率 ≥ 1）。
- 新建 `src/components/quant/V56PortfolioTools.tsx`：8 个交互组件，沿用现有卡片 + Recharts + Tool Bus 参数联动模式。
- 新建 `src/components/essays/PortfolioTheory.tsx`，在 `src/lib/sections.ts` 注册路由并加入 Navbar 导读菜单。
- 在 `src/components/QuantStrategyTools.tsx` 注册新工具，二级分类扩为：经典与均衡 / 估计与执行 / 贝叶斯与因子 / 主动与下行 / 动态与高维。
- `src/data/toolsCatalog.ts` 增加 8 条目录条目。
- 版本统一升至 **5.6.0**：`package.json`、`Changelog.tsx`、i18n 中英文 latestUpdate 文案、首页动态加载界面版本号。
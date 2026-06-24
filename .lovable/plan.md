# 优化计划 · 功能修复 + 模型补足（广覆盖）

目标：先清掉删除「研究剧本」后留下的失效链接，再围绕"模型补足"在多个板块各补一批高价值标准模型，把前沿概念卡升级为可交互工具，并统一缺失的工具元能力（预设 / Notebook 导出 / 验证测试）。本轮以广覆盖为主，每个板块补 1–2 个最关键缺口。

---

## 阶段 1 · 清理失效链接与发现死路（先做，低风险）

1. `src/data/toolsCatalog.ts` — 删除 5 个指向已删除 `/#research-playbooks` 的条目：研究剧本工作台 / 研究冲刺生成器 / 证据包构建器 / 研究运营看板 / 决策备忘录工作室（行 66–130）。
2. `src/components/HeroToolStrip.tsx` — 删除 `UNIT_00 "Research Ops"` 死链格子，并把网格从 9 列回退为 8 列重新排布。
3. `src/components/ModelShowcase.tsx` — 当前 8 张模型卡是"展示死路"，没有任何入口。为每张卡加一个「打开计算器」链接，跳转到对应交互工具（CAPM/FF→`/s/asset-pricing`，BS/MC→`/s/calculator`、`/s/mc-pricer`，GARCH→`/s/econometrics`，Markowitz→`/s/frontier`，Vasicek/CIR→`/s/rate-model`），用 `sectionHref` 统一生成。

## 阶段 2 · 前沿模型互动化（FrontierConcepts）

把 `FrontierConcepts.tsx` 中可计算的 4 个范式从静态卡升级为带滑杆的迷你交互工具（其余 3 个 AI-SDF / ABM / CBDC-DSGE 保留为概念卡，因实现成本过高）：

- **DeFi · AMM**：恒积做市商 `x·y=k`，输入交易规模 → 输出滑点、成交均价与无常损失曲线。
- **复杂网络 · 传染**：小型银行间网络上的 DebtRank / 违约级联模拟，可调网络密度与冲击规模，展示级联失效数。
- **气候金融 · Climate VaR**：在 NGFS 情景（有序 / 无序 / 温室世界）下重估贴现现金流，输出分位损失。
- **神经经济学 · 前景理论**：价值函数 `v(x)` 与概率加权 `π(p)` 可视化，可调 α/β/λ/γ。

每个迷你工具复用现有 `PresetButtons` 与 `EquationBlock` 约定。

## 阶段 3 · 补足经典模型（各板块各 1–2 个高价值缺口）

- **衍生品**：CRR 二叉树收敛可视化（对比 BS 闭式解）；为奇异期权工具新增解析「障碍 / 数字期权」闭式解标签（Rubinstein-Reiner）。
- **固定收益**：在 `BondCalculator` 增加关键利率久期（KRD）分解标签。
- **风险**：为 Copula 工具新增 Archimedean 族（Clayton / Gumbel）；新增 EVT / POT（GPD 尾部拟合）工具；VaR 工具增加边际 VaR / 成分 VaR。
- **资产定价**：新增 Fama-MacBeth 两阶段横截面回归（含 Shanken 修正）。
- **计量经济**：把协整工具补成 Johansen 迹 / 最大特征值检验；新增独立的单位根检验（ADF / KPSS）标签。
- **量化**：回测工具增加 walk-forward / 样本外滚动重估拆分。

## 阶段 4 · 统一工具元能力与验证

- `MundellFlemingTool`（`ClassicMacroTools.tsx`）补上缺失的 `PresetButtons`（全站唯一缺预设的交互工具）。
- 把 `notebookSeed`（"Open in Notebook"）从仅 `CalculatorSection` 推广到其余板块的 `ShareExportToolbar` 调用。
- 为本轮新增模型与若干现有工具补充对照闭式解的单元测试，并把通过的工具在 `toolsCatalog.ts` 标记 `verified: true`（当前仅 4/63）。

---

## 技术说明

- 所有新计算放在 TypeScript 前端，沿用现有 `src/lib/quant`、`PresetButtons`、`EquationBlock`、`ShareExportToolbar` 模式，不引入后端。
- 新交互工具按现有 `TOOLS` 数组模式挂到对应容器组件（如 `DerivativesTools.tsx`、`RiskTools.tsx`、`EconometricsTools.tsx` 的 tab 注册）。
- 新增的目录条目用真实 `/s/<section>` 锚点；前沿迷你工具留在前沿板块内部 tab。
- 数学实现要点：
  - KRD：对各关键期限做局部 ±Δ 冲击重估并归一。
  - Johansen：构造 VECM 残差矩阵 S00/S11/S01，解广义特征值得到迹与最大特征值统计量，配 MacKinnon-Haug-Michelis 临界值表。
  - EVT/POT：阈值以上超额拟合 GPD（极大似然），输出 VaR/ES 尾部估计。
  - Fama-MacBeth：第一阶段时序回归得 β，第二阶段逐期横截面回归取均值，标准误加 Shanken 修正。
  - AMM 无常损失：`IL = 2√r/(1+r) − 1`，r 为价格比变化。
- LaTeX 推导与 Newton-Raphson / 离散化等沿用项目既有约定。
- 验证：构建通过 + 关键新算法对照闭式解/已知基准的单元测试（`bunx vitest run`）。

## 范围之外（本轮不做，后续可续）

AI/ML 神经 SDF 训练、多智能体 ABM 仿真、CBDC-DSGE 求解、系统 GMM（Arellano-Bond）、BEKK 多元 GARCH、OLG / ZLB 宏观、交易成本 Almgren-Chriss 模型。

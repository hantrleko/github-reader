# 补全研报模型 — V3.1 模型扩展

对照《经济与金融模型基础》研报，把网站缺失的经典模型补齐。范围：金融核心 + 计量核心 + 宏观 + 新增微观经济学分类；前沿章节只做概念卡片；所有新工具按**轻量版**实现（核心计算 + 1~2 张图表 + LaTeX 公式 + 参数预设），后续可迭代。

所有新工具沿用现有模式：`EquationBlock`(LaTeX) + `PresetButtons`(教材/市场预设) + `ShareExportToolbar` + recharts 图表 + 引用脚注，并登记进 `toolsCatalog.ts`(驱动 /tools 索引与 Today's Pick)。

---

## 1. 新增「微观经济学」分类（整章缺失）

- `toolsCatalog.ts` 新增 `micro` 分类（zh: 微观经济, en: Microeconomics）。
- 新建 `src/components/MicroTools.tsx`（tab 切换，结构同 `MacroTools.tsx`）+ `src/components/micro/` 子工具：
  1. **供需均衡** — 线性供需曲线交点，滑杆调需求/供给斜率与截距、税收/补贴，显示均衡 P*/Q*、税收归宿与无谓损失。
  2. **消费者选择** — Cobb-Douglas 效用，预算线 + 无差异曲线，最优点 MRS=Px/Py，价格变化分解收入/替代效应。
  3. **生产者理论** — 等产量线 + 等成本线，成本最小化 MPL/MPK=w/r，短期成本曲线 (MC/AC/AVC)。
  4. **市场结构博弈** — 古诺/伯特兰/斯塔克尔伯格/垄断 同屏对比均衡产量、价格与利润。
  5. **信息经济学** — 逆向选择(柠檬市场)、道德风险、信号传递 的交互演示 + 概念表。
- `Index.tsx` 在「基础定价」前插入新章节 `#micro`，挂 `MicroTools`(走 `DeferMount`)。

## 2. 宏观补全（加入现有 `MacroTools` tab）

新建 `src/components/macro/ClassicMacroTools.tsx`，新增 5 个工具并入宏观 tab：
- **IS-LM** — IS/LM 曲线交点，财政(G)/货币(M)冲击移动曲线，显示挤出效应、流动性陷阱。
- **AD-AS** — AD + SRAS + LRAS，需求/供给冲击下产出与价格调整路径。
- **菲利普斯曲线** — 附加预期版与 NKPC，演示长期垂直与曲线平坦化。
- **蒙代尔-弗莱明** — 开放经济 IS-LM-BP，固定 vs 浮动汇率下政策有效性 + 不可能三角图示。
- **拉姆齐模型** — Euler 方程相位图，消费/资本鞍点路径。

## 3. 金融核心补全

新建 `src/components/AssetPricingTools.tsx`（资产定价 tab 组），挂到「固收 & 资产配置」章节 `#asset-pricing`：
- **CAPM / SML** — 证券市场线，输入 β、Rf、E(Rm)，定位资产、计算 Jensen's α。
- **APT 多因子** — 自定义 2~3 因子载荷与溢价，线性合成预期收益。
- **Fama-French 回归** — 对粘贴/示例收益数据跑 3 因子(可选 5 因子)OLS，输出 α 与因子载荷（复用现有 `ols.ts`，可对接已有 `famafrench-factors` 取数函数）。

风险章节 `RiskTools` 新增 tab：
- **VaR 三法** — 参数法 / 历史模拟 / 蒙特卡洛 并排对比，叠加损失分布直方图与 VaR/ES 分位线。

## 4. 计量核心补全（加入现有 `EconometricsTools` tab）

新建 `src/components/econ/ClassicEconTools.tsx`：
- **ARIMA / Box-Jenkins** — AR/MA 项数可调，ACF/PACF 图 + 拟合与一步预测。
- **VAR / SVAR** — 双变量 VAR，脉冲响应函数(IRF) + Granger 因果检验。
- **面板数据 FE/RE** — 固定效应(组内去均值) vs 随机效应(GLS) + Hausman 检验。

## 5. 前沿范式（仅概念卡片）

新建 `src/components/FrontierConcepts.tsx`，纯展示卡片网格（无交互计算），挂到平台章节后 `#frontier`，覆盖研报第六章 7 个方向：AI/ML 资产定价(深度 SDF / LLM Agents)、ABM 智能体仿真、复杂网络与 GNN 系统性风险、气候金融(Climate VaR / ESG-CAPM)、行为与神经经济学、DeFi/AMM、宏观金融 CBDC。每张卡片含：核心思想、关键发现、代表文献(2024-2026)。

## 6. 收尾

- `toolsCatalog.ts`：登记全部新工具（micro/asset-pricing/新宏观/新计量/VaR），版本标 `V3.1`，类型 `version` 联合新增 `"V3.1"`。
- `ModelShowcase.tsx`：补上 CAPM、Fama-French 等已登记但展示区可丰富的卡片（可选）。
- `public/sitemap.xml` + `scripts/generate-sitemap.ts`：新增 `#micro`、`#asset-pricing`、`#frontier` 锚点。
- 页脚导航补「微观经济」「资产定价」链接。

---

## 技术说明

- 所有算法为纯客户端 TypeScript，标记 `offline` 可用；无需后端改动（Fama-French 取数沿用现有 edge function，不新建表）。
- 轻量版聚焦闭式解/小规模数值（线性代数走现有 `ols.ts` 工具函数），不引入新依赖。
- 每个工具走 `lazy` + `DeferMount`，避免拖慢首屏；沿用 `SectionErrorBoundary` 包裹。
- 新分类 `micro` 与 `version: "V3.1"` 需同步更新 `toolsCatalog.ts` 的类型联合与 `CATEGORY_LABEL`。
- 不改动数据库 / RLS / 认证。

预计新增约 18 个交互工具 + 7 张前沿概念卡片，工具总数从 43 增至约 61。
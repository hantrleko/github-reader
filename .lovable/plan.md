# 结构 / 布局 / 导航优化方案

## 问题诊断（基于代码）

每个板块（计量、风险、衍生品、宏观…）都用同一套模式渲染工具：一行 `flex flex-wrap justify-center gap-2` 的扁平按钮墙，外加 `useState<ToolId>` 单选。各板块工具数量：

```text
计量经济学  29 个   ← 严重拥挤，按钮墙占满整屏，难找
衍生品高阶  11 个   ← 偏多
宏观经济    9 个
风险管理    8 个
其余        ≤ 5 个   ← 正常
```

29 个按钮平铺无分组、无层级、无搜索，是「很多很杂」的根源。其它板块尚可接受，但缺少统一的可扩展导航骨架。

## 方案总览

引入「**两级工具导航**」：先按学科主题分类（一级 chip），再在所选分类内展示具体工具（二级 tab），并加入即时搜索过滤。优先解决计量经济学，同时做成可复用组件，让所有板块共享同一骨架。

```text
┌─────────────────────────────────────────────┐
│  [因果推断] [时间序列] [波动率/高频] [离散/面板] [机器学习计量]   ← 一级分类 chips
├─────────────────────────────────────────────┤
│  🔍 搜索工具…                                  ← 即时过滤
├─────────────────────────────────────────────┤
│  OLS/IV  DID  SDID  RDD  合成控制  PSM           ← 二级 tab（当前分类内）
├─────────────────────────────────────────────┤
│  公式条 + Python 参考 + 交互工具                  ← 不变
└─────────────────────────────────────────────┘
```

## 计量经济学 29 工具分类

| 分类 | 工具 |
|---|---|
| **因果推断** | OLS/IV、DID、交错 DID、RDD、合成控制、PSM/IPW/AIPW |
| **时间序列** | SVAR、协整/VECM、单位根 (ADF/KPSS)、Kalman/HP、MIDAS、ARIMA、Local Projections、DLM |
| **波动率 / 高频** | GARCH、DCC-GARCH、Regime-Switching、HAR-RV、Hawkes、Kyle λ |
| **离散选择 / 面板** | GMM、Logit/Probit、分位数回归、面板 (FE/RE)、Tobit |
| **机器学习计量** | LASSO/Ridge/ElasticNet、Double ML、Causal Forest、贝叶斯回归 |

## 实施步骤

### 1. 新建可复用组件 `src/components/common/CategorizedToolNav.tsx`
- 输入：`categories`（分类 → 工具 id 列表）、当前 `toolId`、`onSelect`、可选 `enableSearch`。
- 渲染一级分类 chip、分类内二级 tab、搜索框；选中工具属于哪个分类自动高亮对应 chip。
- 保留现有键盘可达性与 `font-mono` / gold 选中态视觉，沿用设计 token（不硬编码颜色）。
- 工具数 ≤ 6 时自动退化为单层扁平 tab（衍生品/宏观/风险等无需强行分类）。

### 2. 接入计量经济学 `EconometricsTools.tsx`
- 在 `TOOLS` 旁新增 `ECON_CATEGORIES`（上表映射，纯数据）。
- 用 `CategorizedToolNav` 替换第 2946–2961 行的扁平按钮墙。
- `useState<ToolId>` / `useSharedState` / 分享导出 / 公式条逻辑全部保持不变（深链 `?tool=` 仍可用）。

### 3. 顺带应用到衍生品（11 个）
- 衍生品分 3 组：波动率曲面 (SVI/Heston/SABR/SABR-Heston/Local Vol)、希腊字母与格点 (Greeks/Binomial/American)、利率与奇异 (Rates/LMM/Exotic)。
- 其余 ≤9 工具的板块仅接入组件（自动单层模式），获得搜索能力但不强制分类。

### 4. 板块内「概览/锚点」轻量增强（可选）
- 在 `SectionPage` 顶部分类切换后平滑滚动定位，配合既有 ScrollManager，不改动其行为。

## 技术说明
- 纯前端 / 展示层改动：新增一个组件 + 各板块的分类数据数组，不触碰任何计算逻辑、`src/lib/quant`、状态分享或路由。
- 复用现有 `PresetButtons`、`EquationBlock`、`ShareExportToolbar` 样式语言，保持 Bloomberg 终端编辑风。
- i18n：分类名加入 `en.json` / `zh.json` 的 `sections.econ.categories.*`（及衍生品对应键）。
- 不改全局顶部导航 `Navbar`（其分组下拉已合理）；本次聚焦「板块内部」工具查找体验。

## 不在本次范围
- 不新增 / 删除任何计量或其它工具模型。
- 不改后端、数据源板块、认证或路由结构。
- 不重做全局顶部导航栏（除非后续要求）。

## 涉及文件
- 新建：`src/components/common/CategorizedToolNav.tsx`
- 修改：`src/components/EconometricsTools.tsx`、`src/components/DerivativesTools.tsx`（接入），其余板块按需接入单层模式
- 修改：`src/i18n/locales/en.json`、`src/i18n/locales/zh.json`（分类名）

# 模块 03「定价 / Pricing」升级方案

域 `03 定价 · Pricing` 含 5 个板块：`calculator`、`implied-vol`、`mc-pricer`、`derivatives`、`derivatives-theory`。

## 现状（已核对代码）

- **衍生品实验室有 25 个工具，目录只收录 14 个**。`DerivativesTools.tsx` 的 `TOOLS` 列了 25 条；`toolsCatalog.ts` 里能查到 `svi / heston / sabr / local-vol / greeks-desk / lmm / exotic / binomial / jump / bates_var / pde / hedge_pnl / autocall / xva` 共 14 条（`carry` 挂在别的板块）。缺 11 个：美式期权 LSM、利率衍生品、SABR vs Heston 对比、状态价格边界、LSMC、SVI 无套利、短率曲线、信用曲线、数值方法实验室、粗糙波动率对冲、波动率曲面（`vol` 与 `svi` 条目 anchor 混用）——目录、搜索、命令面板里都找不到。
- **衍生品实验室不支持深链**。工具切换只在组件内部 `useState`（初值受 Tool Bus 影响），URL 不带工具标识；模块 02 已建好的 `useToolTab` 尚未接入，目录里 14 条衍生品条目的 anchor 也都只指到板块级 `/#derivatives`、`/s/derivatives`。
- **三个核心计算器完全没有双语**。`CalculatorSection.tsx`（1637 行）、`ImpliedVolTool.tsx`、`MCOptionPricer.tsx` 里没有任何 `t("...")` 调用，中文字面量分别有约 102 / 41 / 51 处；这是全站流量最高的三个工具，英文用户看到的仍是中文界面。
- **分类导航条的分类名硬编码中文**。`DERIV_CATEGORIES` 的 9 个分类标签（"无套利与复制"、"波动率曲面" 等）与 `CategorizedToolNav.tsx` 里的 `aria-label="搜索工具"`、"清空搜索" 都写死中文。
- 导读页 `DerivativesTheory` 结构完好，本轮不动。

## 建议改动（按优先级）

### 1. 衍生品工具进目录 + 深链
为缺失的 11 个工具补 `TOOLS_CATALOG` 条目（中英名、公式、难度、分类、引用），并把全部衍生品条目的 anchor 改成 `/#derivatives?t=<toolId>`，与模块 02 的宏观条目保持一致。

### 2. 衍生品实验室接 `useToolTab`
用模块 02 建的 `useToolTab` 替换内部 state：URL 有 `?t=` 时优先，否则保留现有 Tool Bus 落点逻辑（有期权参数时落 Greeks Desk，默认 `vol`）；切换工具时 `replace` 更新 URL。分类导航同步高亮所属分类。

### 3. 三大计算器双语化
把 `CalculatorSection`、`ImpliedVolTool`、`MCOptionPricer` 的标题、导语、参数标签、按钮、图例、解读文案迁进 `en.json` / `zh.json`（沿用 V6.6 的 key 规范，`scripts/check-copy-consistency.ts` 会校验中英键一致）。计算器的模型定义已有英文名的沿用，缺的补 `nameEn`。

### 4. 导航条与分类名双语
`DERIV_CATEGORIES` 的 9 个分类标签改为 i18n key；`CategorizedToolNav` 的搜索框 `aria-label`、清空按钮文案改用 `t()`，一次修好所有用到该组件的板块。

### 5. 计算器深链（可选，随手做）
`CalculatorSection` 的 `active` 也接 `useToolTab`，让 `/s/calculator?t=capm` 这类链接可分享，目录条目同步带上参数。

## 技术说明

- 新增目录条目只加数据，不动任何定价计算逻辑；`searchIndex.test.ts` 的数量下界随之上调，`toolsCatalogLinks.test.ts` 会自动覆盖新 anchor。
- 深链沿用模块 02 的 `src/lib/useToolTab.ts` 与已支持查询串的 `sectionHref`，与 `useSharedState`（Tool Bus）并存：Tool Bus 应用状态时同步写回 URL。
- 计算器文案量大，i18n 分三批提交（Calculator → ImpliedVol → MCPricer），每批跑一次类型检查与文案一致性脚本。
- 版本走 V6.9，同步 `CHANGELOG.md`、`Changelog.tsx` 与首页最新更新卡片。

## 执行顺序

先做 1 与 2（目录与深链，改动集中），再做 4（顺带修全站导航条），然后 3 分批推进，最后 5 与版本更新。

确认后我按这个顺序落地；也可以只先做其中某几条。

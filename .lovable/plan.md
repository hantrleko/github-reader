# 模块 05「资产定价与组合 / Asset Pricing & Portfolio」升级方案

域 `05 资产定价与组合` 含 4 个板块：`asset-pricing`、`frontier`、`asset-pricing-theory`、`portfolio-theory`。

## 现状（已核对代码）

- **21 个资产定价工具全部指向板块级锚点**。`toolsCatalog.ts` 里 `category: "asset-pricing"` 的条目 anchor 都是 `/#asset-pricing` 或 `/s/asset-pricing`，没有一个带 `?t=`，从目录点进去只能落在默认的 CAPM 面板。
- **`AssetPricingTools.tsx` 没有深链**。它用 `useState<ToolId>("capm")` 管理当前工具，模块 02–04 已经在用的 `useToolTab` 尚未接入，分享链接无法定位工具。
- **6 个分类标签硬编码中文**（`无套利基础`、`均衡定价`、`因子与实证`、`现代框架 · SDF`、`谜题与结构模型`、`实证前沿`），`CategorizedToolNav` 支持 `labelEn` 但未提供；工具卡只有中文 `name`，`nameEn` 仅用于公式区标题。
- **资产定价面板基本没有双语**。`AssetPricingTools.tsx` 及 `asset/` 下 7 个工具文件共约 460 处中文字面量，`t(` 调用寥寥（V31 7 处、其余各 4 处），标题、导语、参数标签、指标卡、解读文案都是中文。
- **有效前沿 `EfficientFrontier.tsx` 已部分双语**（24 处 `t(`），但仍有 34 行中文残留；它同样没有 `useToolTab`（该页无子工具，可只做文案）。
- **组合类工具 anchor 全部指向 `/s/quant`**，与本域的 `frontier` 板块无关联；导读页 `asset-pricing-theory`、`portfolio-theory` 结构完好，本轮不动。

## 建议改动（按优先级）

### 1. 资产定价工具深链
`AssetPricingTools` 接入 `useToolTab`（URL `?t=` 优先，非法值回退 `capm`，切换用 `replace`），并把 21 条目录条目的 anchor 改成 `/#asset-pricing?t=<toolId>`。

### 2. 分类与工具名双语
给 6 个分类补 `labelEn`，`CategorizedToolNav` 在英文下显示英文分类；工具列表的中英名按语言切换（复用已有 `nameEn`）。

### 3. 板块头部与前沿页文案双语
`AssetPricingTools` 的标题、导语迁进 `labs.assetPricing.*`；`EfficientFrontier` 残留的 34 行中文一并迁进 `labs.frontier.*`。

### 4. 七个工具文件双语化（分批）
按分类分三批：无套利+均衡（NoArbitrageTools、CapmFamilyTools）→ 因子与实证（V31AssetTools、AnomalyTools）→ SDF+谜题+前沿（SDFTools、PuzzleTools、FrontierAssetTools）。每批迁移参数标签、指标卡、图表说明与解读文案。

### 5. 版本与发布
版本走 V7.1，同步 `CHANGELOG.md`、`Changelog.tsx` 与首页最新更新卡片。

## 技术说明

- 只改展示层与目录数据，不触碰 `src/lib/quant/assetPricing*.ts` 任何计算逻辑，相关测试保持不变。
- 深链沿用 `src/lib/useToolTab.ts` 与支持查询串的 `sectionHref`；`useSharedState("asset")` 的 Tool Bus 行为保留，`apply` 改为调用 `useToolTab` 的 setter。
- `toolsCatalogLinks.test.ts` 会自动覆盖新 anchor；文案迁移每批后跑 `tsgo --noEmit` 与 `scripts/check-copy-consistency.ts`。
- 收尾统一跑：类型检查、完整 Vitest、文案一致性脚本，Playwright 抽查 `/tools`、`/s/asset-pricing?t=hjdist`、`/s/asset-pricing?t=zoo`、`/s/frontier`。

## 执行顺序

先做 1 与 2（深链与导航，改动集中），再做 3，然后 4 分三批推进，最后版本更新与验证。

# 模块 06「量化交易 / Quant Trading」升级方案

域 `06 量化交易` 含 6 个板块：`qlib-guide`、`qlib-lab`、`quant-theory`、`quant`、`backtest`、`calibration`。

## 现状（已核对代码）

- **量化策略板块 19 个工具，目录只收录了一小部分**。`QuantStrategyTools.tsx` 定义 19 个 `ToolId`（回测、Walk-Forward、BL、BL 完整版、Risk Parity、FF5、Mean-CVaR、收缩、重采样前沿、因子预算、Kelly、前沿几何、单指数、估计误差、再平衡成本、主动管理、下行风险、动态配置、正则化），而 `toolsCatalog.ts` 里 `category: "quant"` 仅 4 条、`category: "portfolio"` 4 条，且组合类条目 anchor 全部是 `/s/quant`（无 `?t=`），点进去只落在默认的「策略回测引擎」。
- **`QuantStrategyTools` 没有深链**：用 `useState<ToolId>("backtest")`，未接入 `useToolTab`，切换工具不改 URL，无法分享。
- **5 个分类标签硬编码中文**（`经典与均衡`、`估计与执行`、`贝叶斯与因子`、`主动与下行`、`动态与高维`），`CategorizedToolNav` 支持 `labelEn` 但未提供；历史抽屉摘要 `工具: ${s.tool}` 也是中文硬编码。
- **量化面板中文占比很高**：`V56PortfolioTools`（约 8380 个中文字符、42 处 `t(`）、`V41PortfolioTools`（约 4097，7 处）、`Sprint4Tools`（约 2689，12 处）、`BacktestLab`（1754，20 处）、`CalibrationLab`（1567，13 处）、`QlibLab`（1494，7 处）、`PortfolioBacktest`、`RiskParityTool`、`WalkForwardTool`、`PriceSourceBar` 均以中文为主。
- **`backtest` / `calibration` / `qlib-lab` 三页内部视图也无深链**：`BacktestLab` 用 `useState<View>("single")` + `strategy`，`CalibrationLab` 用 `useState<ModelId>("garch")`，`QlibLab` 用 `useState<ModelId>("ridge")`，都不进 URL。
- 导读页 `quant-theory`、`qlib-guide` 结构完好，本轮不动。

## 建议改动（按优先级）

### 1. 量化工具深链
`QuantStrategyTools` 接入 `useToolTab`（`?t=` 优先，非法值回退 `backtest`，`replace` 更新），`useSharedState("quant")` 与历史抽屉改为调用同一个 setter。

### 2. 目录补全与 anchor 修正
把 19 个量化/组合工具在目录中补齐并统一改为 `/#quant?t=<toolId>`；`backtest`、`calibration` 两条保持指向各自板块，并为 `BacktestLab` 的视图、`CalibrationLab` 的模型加 `?t=` 深链（`qlib-lab` 的模型同样处理）。ID 冲突（如已有 `backtest`、`frontier`）沿用固收模块的做法加 `q-` 前缀。

### 3. 分类与工具名双语
给 5 个分类补 `labelEn`；导航使用简短英文名（公式区仍显示完整英文标题）；历史摘要文案迁进 i18n。

### 4. 板块头部与面板文案双语（分批）
- 第一批：`QuantStrategyTools` 头部 + `Sprint4Tools`（回测、BL、FF5）+ `WalkForwardTool` + `RiskParityTool`。
- 第二批：`V41PortfolioTools`（BL 完整版、Mean-CVaR、收缩、重采样、因子预算、Kelly）。
- 第三批：`V56PortfolioTools`（8 个工具，量最大）。
- 第四批：`BacktestLab`、`CalibrationLab`、`QlibLab`、`PortfolioBacktest`、`PriceSourceBar`。
词条统一放 `labs.quant.*`。

### 5. 版本与发布
版本走 V7.2，同步 `CHANGELOG.md`、`Changelog.tsx` 与首页最新更新卡片。

## 技术说明

- 只改展示层与目录数据，不触碰 `src/lib/quant/portfolio*.ts`、`backtest.ts`、`calibration.ts`、`qlibPipeline.ts` 的计算逻辑，相关测试不变。
- 深链沿用 `src/lib/useToolTab.ts` 与支持查询串的 `sectionHref`；`toolsCatalogLinks.test.ts` 自动覆盖新 anchor。
- 每批改动后跑 `bunx tsgo --noEmit -p tsconfig.app.json` 与 `scripts/check-copy-consistency.ts`。
- 收尾统一跑：类型检查、完整 Vitest、文案一致性脚本，Playwright 抽查 `/tools`、`/s/quant?t=kelly`、`/s/quant?t=frontier-geo`、`/s/backtest`、`/s/calibration`、`/s/qlib-lab`。

## 执行顺序

先做 1 与 2（深链与目录），再做 3，然后 4 分四批推进，最后版本更新与验证。

> 备注：模块 05 还剩 CAPM/APT、异象与 GRS、SDF、谜题、实证前沿 5 个面板的中文文案未迁移；如果你更想先收尾 05，可以告诉我调整顺序。

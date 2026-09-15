# 模块 07「计量经济学 / Econometrics」升级方案

域 `07 计量经济` 含板块：`econometrics`（主实验室）、`econometrics-theory`、`time-series-theory`（两页导读，本轮不动）。

## 现状（已核对代码）

- **主实验室有 57 个工具，目录只收录 25 条**。`EconometricsTools.tsx` 的 `ToolId` 联合类型共 57 个工具（OLS/IV、DID、Staggered DID、RDD、合成对照、GMM、SVAR、GARCH、DCC、制度转换、协整、单位根、Kalman、MIDAS、Logit、分位回归、PSM、ARIMA、局部投影、LASSO、面板、Tobit、DLM、DML、因果森林、贝叶斯回归、HAR-RV、Hawkes、Kyle、诊断、动态面板、DM 检验、核回归、事件研究 DID、面板单位根、分位边际、诊断报告、Granger、谱分析、指数平滑、长记忆、弱工具、Heckman、三位一体检验、标准误实验室、Hausman、FWL、PDS-LASSO、HTE 诊断、单位根套件、ARMA 识别、差分实验室、SETAR、Bai-Perron、密度预测评价、MCS、SV-GARCH），而 `toolsCatalog.ts` 中指向 `/#econometrics` 的条目仅 25 条。
- **全部条目没有工具级深链**：25 个 anchor 都是裸的 `/#econometrics`，点进去只落在默认的 OLS/IV。
- **实验室没有 URL 深链**：用 `useState<ToolId>("olsiv")`，未接入 `useToolTab`，切工具不改 URL，无法分享。
- **8 个分类标签硬编码中文**（识别与推断、因果推断、时间序列、非线性/断点/预测评价、波动率/高频、离散选择/面板、机器学习计量、诊断/非参数），`CategorizedToolNav` 支持 `labelEn` 但未提供。
- **中文文案量大**：`EconometricsTools.tsx` 本体约 9768 个中文字符（含副标题、历史摘要 `工具: ${s.tool}` 硬编码）；子面板中文字符数分别为 `V55Tools` 7791、`V54Tools` 6793、`V39Tools` 4458、`V24Tools` 3971、`V40Tools` 3745、`V22Tools` 3719、`CausalAdvancedTools` 3714、`DCCGarchTool` 3668、`Sprint1Tools` 3188、`V21Tools` 3127、`MIDASTool` 3090、`V25Tools` 2750、`V38Tools` 2514、`V23Tools` 2055、`LogitProbitTool` 1280、`UnitRootTool` 786、`QuantileRegTool` 700。

## 建议改动（按优先级）

### 1. 实验室深链
`EconometricsTools` 接入 `useToolTab`（`?t=` 优先，非法值回退 `olsiv`，`replace` 更新），`useSharedState("econ")` 与历史抽屉共用同一 setter。

### 2. 目录补全与 anchor 修正
把 57 个工具在目录中补齐，统一改为 `/#econometrics?t=<toolId>`。ID 冲突（如 `panel`、`garch`、`kalman` 等已被其他模块占用）沿用固收/量化的做法加 `ec-` 前缀，`related` 引用同步更新。

### 3. 分类与工具名双语
给 8 个分类补 `labelEn`；导航中文/英文按语言切换（公式区仍显示完整英文标题）；历史摘要文案迁进 i18n（`labs.econ.historySummary`）。

### 4. 面板文案双语（分批，词条统一放 `labs.econ.*`）
- 第一批：`EconometricsTools.tsx` 头部与副标题 + `UnitRootTool`、`QuantileRegTool`、`LogitProbitTool`。
- 第二批：`Sprint1Tools`、`MIDASTool`、`DCCGarchTool`、`CausalAdvancedTools`。
- 第三批：`V21Tools`、`V22Tools`、`V23Tools`、`V24Tools`、`V25Tools`。
- 第四批：`V38Tools`、`V39Tools`、`V40Tools`。
- 第五批：`V54Tools`、`V55Tools`（量最大）。

### 5. 版本与发布
版本走 V7.3，同步 `package.json`、`CHANGELOG.md`、`Changelog.tsx` 与首页最新更新卡片；`toolsCatalog.ts` 的 `version` 联合类型补齐至 V7.3。

## 技术说明

- 只改展示层与目录数据，不触碰 `src/lib/quant/econometrics.ts`、`econAdvanced.ts`、`tsAdvanced.ts`、`tsFrontier.ts`、`panelEcon.ts`、`ols.ts` 的计算逻辑，相关测试不变。
- 深链沿用 `src/lib/useToolTab.ts` 与支持查询串的 `sectionHref`；`toolsCatalogLinks.test.ts` 自动覆盖新 anchor。
- 每批改动后跑 `bunx tsgo --noEmit -p tsconfig.app.json` 与 `scripts/check-copy-consistency.ts`。
- 收尾统一跑类型检查、完整 Vitest、文案一致性脚本，并用 Playwright 抽查 `/tools`、`/s/econometrics?t=rdd`、`?t=urootsuite`、`?t=denseval`、`?t=htediag`。

## 执行顺序

先做 1 与 2（深链与目录），再做 3，然后 4 分五批推进，最后版本更新与验证。

> 备注：模块 05 仍剩 CAPM/APT、异象与 GRS、SDF、谜题、实证前沿 5 个面板的中文文案未迁移；如想先补完 05 再进 07，可以告诉我调整顺序。

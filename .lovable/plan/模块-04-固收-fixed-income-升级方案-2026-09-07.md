# 模块 04「固收 / Fixed Income」升级方案

域 `04 固收 · Fixed Income` 含 5 个板块：`bond`、`rate-model`、`fixed-income-lab`、`fixed-income-frontier`、`fixed-income-theory`。

## 现状（已核对代码）

- **固收工具几乎没进目录**。`toolsCatalog.ts` 里 `category: "fixed-income"` 只有 4 条：`bond`、`rate-model`、`ns-curve`、`krd`。而 `V62FixedIncomeTools.tsx` 的 `TABS` 有 18 个工具（自举、插值、carry-roll、利差四口径、有效久期、KRD 对冲、免疫、含权债、可转债、信用利差分解、评级迁移、瀑布、copula 分层、CDS 基差、MBS 负凸性、回购螺旋、RFR 改革、绿色溢价），`V45FixedIncomeLab.tsx` 有 4 个实验（信用债/CDS、短率模型、OAS 与含权债、通胀与曲线策略）。这 20 多个工具在目录、搜索、命令面板里都找不到。
- **四个板块都不支持深链**。`V45FixedIncomeLab` 用 `useState<Tab>("credit")`、`V62FixedIncomeTools` 用内部 `useState`，URL 不带工具标识；模块 02 建好的 `useToolTab` 尚未接入；现有 4 条目录 anchor 也只指到板块级 `/#bond`、`/#rate-model`。
- **四个交互板块基本没有双语**。`BondCalculator.tsx`（716 行）、`RateModelSimulator.tsx`（640 行）、`V45FixedIncomeLab.tsx`（433 行）、`V62FixedIncomeTools.tsx`（1026 行）里几乎没有 `t("...")`（仅 Bond 里 2 处），标题、参数标签、按钮、图例、解读文案都是中文字面量。
- **两个高阶实验室没有用统一导航组件**。V45 与 V62 各写了一套自制 tab / 分类条，没有共享 `CategorizedToolNav`（模块 03 已给它做过双语与搜索），分类标签 `曲线与口径`、`利差与风险` 等也硬编码中文。
- 导读页 `fixed-income-theory` 结构完好，本轮不动。

## 建议改动（按优先级）

### 1. 固收工具进目录 + 深链
为 V62 的 18 个工具与 V45 的 4 个实验补 `TOOLS_CATALOG` 条目（中英名、公式、难度、分类、引用），并把全部固收条目的 anchor 改成 `/#fixed-income-frontier?t=<toolId>`、`/#fixed-income-lab?t=<tab>`，与模块 02/03 保持一致。既有 `ns-curve`、`krd` 条目 anchor 一并指到真实工具。

### 2. 两个实验室接 `useToolTab` + 统一导航
`V45FixedIncomeLab`、`V62FixedIncomeTools` 用 `useToolTab` 替换内部 state（URL `?t=` 优先，非法值回退默认），切换工具时 `replace` 更新 URL；V62 按 URL tab 自动同步所属分类。把 V62 的自制分类条换成共享 `CategorizedToolNav`（带搜索），V45 的 4 个实验条同步用同一组件。

### 3. 债券与短率模拟器双语化
把 `BondCalculator`、`RateModelSimulator` 的标题、导语、参数标签、按钮、图例、结论文案迁进 `en.json` / `zh.json`（沿用 `labs.*` key 规范）。

### 4. 两个高阶实验室双语化
V45 的 4 个实验标题/描述、V62 的 5 个分类名与 18 个工具标题/描述改为 i18n key；面板内的参数标签与解读文案同批迁移（V62 文案量大，按分类分批）。

### 5. 版本与发布
版本走 V7.0，同步 `CHANGELOG.md`、`Changelog.tsx` 与首页最新更新卡片。

## 技术说明

- 新增目录条目只加数据，不改任何定价/曲线计算逻辑；`searchIndex.test.ts` 的数量下界随之上调，`toolsCatalogLinks.test.ts` 会自动覆盖新 anchor。
- 深链沿用 `src/lib/useToolTab.ts` 与已支持查询串的 `sectionHref`，与 `useSharedState`（Tool Bus）并存：`bond`、`rate-model` 现有 Tool Bus 行为保留。
- V62 文案量最大，i18n 分三批提交（curve+spread → option+credit → book），每批跑一次类型检查与 `scripts/check-copy-consistency.ts`。
- 收尾统一跑：`tsgo --noEmit`、完整 Vitest、文案一致性脚本，以及 Playwright 抽查 `/tools`、`/s/fixed-income-frontier?t=copula`、`/s/fixed-income-lab?t=oas`。

## 执行顺序

先做 1 与 2（目录与深链，改动集中），再做 3，然后 4 分批推进，最后版本更新与验证。

确认后我按这个顺序落地；也可以只先做其中某几条。

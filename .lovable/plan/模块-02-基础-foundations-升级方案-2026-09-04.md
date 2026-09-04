# 模块 02「基础 / Foundations」升级方案

域 `02 基础 · Foundations` 包含 6 个板块：`micro`、`micro-theory`、`macro`、`macro-lab`、`macro-frontier`、`macro-theory`。

## 现状（已核对代码）

- **工具目录链接是坏的**：`ToolsCatalog.tsx:247` 直接用 `tool.anchor` 作为 `to`，而 `toolsCatalog.ts` 里 86 条工具的 anchor 仍是旧的首页锚点（其中 14 条属于本域，如 `/#micro`、`/#macro`）。首页只保留 `hero/topics/models`，所以点这些卡片会跳到首页顶部而不是对应实验室。搜索页走的是 `sectionHref(t.anchor)`，所以只有目录页出问题。
- **高阶宏观工具没有进目录**：`macro-lab`（Blanchard r−g、Dornbusch 超调、BOP 三缺口、BGG 金融加速器、ZLB / 前瞻指引）与 `macro-frontier`（V60，1058 行）的工具在 `toolsCatalog.ts` 中没有任何条目，目录与搜索都找不到，只能靠导航偶遇。
- **无法深链到具体工具**：`MicroTools` / `MacroTools` 的工具切换只存在组件内部 state，URL 不带工具标识，分享链接总是回到默认工具（micro 默认供需、macro 默认 Solow）。
- **双语缺口**：`MicroTools.tsx`、`MacroTools.tsx` 的标题、导语、工具按钮名全为硬编码中文（每个工具已有 `nameEn`，但只用在公式卡片的小标题上）；与 V6.6/V6.7 已双语化的首页、学习路径、主线页不一致。
- 导读页 `MicroTheory` / `MacroTheory` 结构完好，本轮不动。

## 建议改动（按优先级）

### 1. 修复工具目录跳转（收益最大、改动最小）
`ToolsCatalog.tsx` 改用 `sectionHref(tool.anchor)`，一次性修好全站 86 条工具卡片的链接；补一条 vitest 断言：目录中每条工具的 anchor 都能解析成真实路由。

### 2. 高阶宏观工具进目录
为 `macro-lab` 的 5 个工具与 `macro-frontier` 的工具补 `TOOLS_CATALOG` 条目（中英名、公式、难度、category `macro`、anchor 指向各自板块），让它们出现在工具目录、搜索与命令面板中。

### 3. 工具级深链
给 `MicroTools` / `MacroTools` 加 URL 查询参数（`?t=<toolId>`）：初始化时读取，切换工具时 `replace` 更新，非法值回落默认。这样目录卡片可以直接落到指定工具，分享链接也保真。

### 4. 双语补齐
把两个板块的标题、导语迁进 `en.json` / `zh.json`；工具按钮在英文界面显示 `nameEn` 的短名（在工具定义里补一个 `shortEn` 字段，避免按钮里塞长标题）。沿用 V6.6 的 key 规范，`scripts/check-copy-consistency.ts` 会校验中英键一致。

## 技术说明

- 目录链接修复只改渲染层，`toolsCatalog.ts` 的 anchor 数据保持不变（`sectionHref` 已能把 `/#micro` 正确解析为 `/s/micro`）。
- 深链参数用 `useSearchParams`，与既有 `useSharedState`（Tool Bus）并存：Tool Bus 应用状态时同步写回 URL。
- 新增目录条目只加数据，不动任何计算逻辑；`searchIndex.test.ts` 的数量下界随之上调。
- 版本走 V6.8，同步 `CHANGELOG.md`、`Changelog.tsx` 与首页最新更新卡片。

## 执行顺序

先做 1（几行改动，修全站坏链），再做 2 与 3，最后做 4 与版本更新。

确认后我按这个顺序落地；也可以只先做其中某几条。

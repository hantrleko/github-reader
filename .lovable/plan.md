## V3.7 提升方案 · 四线并进（深广均衡）

你选了全部四个方向、深广度居中(3/5)。下面是一份四条线各取一个高价值切口、彼此还能串成闭环的 V3.7 方案，不涉及破坏性后端改动。

---

### 线 1 · 新增模型/工具深度 —— 期限结构建模

新增 **Nelson-Siegel / Svensson 收益率曲线拟合器**，补上目前固收板块缺失的"曲线建模"一环。

- 新纯函数库 `src/lib/quant/termStructure.ts`：NS/NSS 参数化(β0/β1/β2/λ)、对给定期限-收益率点做最小二乘拟合、导出瞬时远期曲线与拟合残差。配 `__tests__` 单测(用已知参数生成→回收)。
- 新组件 `src/components/bond/NelsonSiegelTool.tsx`：滑杆调 β/λ 观察水平/斜率/曲率三因子对曲线形状的贡献；可粘贴或从 FRED 真实国债利率拟合；输出拟合优度与远期曲线图。
- 挂到 `bond` 板块(或 `rate-model`)的两级导航中。

### 线 2 · 跨工具工作流与联动 —— 打通"曲线→短率→债券"闭环

- 让 NS 拟合出的曲线通过既有 **Tool Bus**「发送到…」把关键利率/短端 r 传给短率模型模拟与债券定价工具。
- 新增一条 **Workflow 剧本**(`src/data/workflows.ts`)：`FRED 真实利率 → NS/Svensson 拟合 → 短率校准 → 债券久期/凸性定价`，与现有"数据→校准→定价→回测"剧本对齐。

### 线 3 · 数据源与真实数据 —— 让真实数据贯穿工具

- 复用已配置的 `FRED_API_KEY`，在 NS 工具内直接拉取多条国债期限利率(DGS1/2/5/10/30 等)一键填充拟合，而不仅停留在数据浏览器里看图。
- 在 `RatesTermStructure` / `KeyRateDurationTool` 中也接受来自 Tool Bus 的真实曲线输入，形成"真实数据穿透多个工具"的体验。

### 线 4 · UX/性能/可发现性 —— 命令面板与目录补全

- 把新工具与新剧本登记进 `src/data/toolsCatalog.ts`、`CommandPalette.tsx` 搜索索引与 `sections.ts`，确保 ⌘K 与 `/tools` 能发现。
- 小幅性能项：确认新组件走 `lazy` 懒加载，图表复用 `ChartTheme`，避免首屏体积增长。

### 收尾 · 版本与日志

- 全站版本号升到 **V3.7**(`HeroSection.tsx`、i18n `en.json`/`zh.json` 的 `hero.latestUpdate`、`buildVersion.ts`、`toolsCatalog.ts` 的 version 联合类型)。
- 更新 `CHANGELOG.md` 与 `Changelog.tsx` 写入 V3.7 条目，V3.6 标记 Stable。

---

### 技术要点(可跳过)

- 纯前端 + 数学模拟，无数据库/RLS 改动；FRED 拉取走既有 `fred-series` edge function,不新增密钥。
- NSS 拟合用现有 `src/lib/quant/ols.ts` 思路做线性化最小二乘(给定 λ 时 β 为线性),λ 用一维网格搜索,保持数值可复现。
- 校验：`tsgo` 类型检查 + `vitest` 跑 `termStructure` 新单测 + Playwright 截图核对曲线渲染与两级导航。

### 范围说明

本轮聚焦"期限结构"这一主题作为四条线的公共载体——既补模型深度,又天然串起数据→拟合→校准→定价的联动闭环,同时带动目录/命令面板的可发现性。若你更想把某条线单独做重(例如线 1 一次补 3 个模型),告诉我我再调整配比。
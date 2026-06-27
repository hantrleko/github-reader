# Phase 1 收尾:对比模式 + 工作流页

把已有的 Tool Bus(IV→BS→MC→Greeks)和未接线的对比组件真正落地为两块用户可见能力:**A/B 对比模式**与**场景工作流页**。纯前端、零新增依赖、不改后端。

---

## 一、对比模式(Compare Mode)

现状:`src/components/common/CompareToggle.tsx` 已有 `useCompareState` + `CompareToolbar`,但没有任何工具在用。本期把它做成可复用的「单工具内 A/B 双栏」,并接入 3 个旗舰工具。

### 1. 通用渲染容器 `CompareTray`
在 `CompareToggle.tsx` 旁新增 `CompareTray`(或同文件导出):
- 接收 `enabled`、左右两栏的 `render(side: "A"|"B")` 渲染函数与一个 `metrics` 数组(`{label, a, b, fmt}`)。
- 开启时并排两列(窄屏上下堆叠),底部渲染**指标差异表**:同名指标对齐,B 相对 A 的变化用 ↑↓ + 色标(涨绿/跌红,走设计 token,不硬编码颜色)。
- 关闭时只渲染 A 栏,等同现状,零行为变化。

### 2. 接入旗舰工具(3 个)
选已支持参数化、且有清晰标量结果的工具:
- **Black-Scholes**(`CalculatorSection.tsx`):对比两套 `{S0,K,σ,r,T}` → 价格 / Δ / Γ / ν / Θ。
- **债券计算器**(`BondCalculator.tsx`):对比两套票息/期限/YTM → 价格 / 久期 / 凸度。
- **VaR**(`risk/VaRTool.tsx`):对比两套持仓/置信度/窗口 → VaR / ES。

每个工具:把现有参数 state 收进 `useCompareState` 的 A,顶部放 `CompareToolbar`(开关 / A→B 复制 / 重置 B),开启后用 `CompareTray` 渲染。默认关闭,保证现有体验不变。

### 3. 与历史记录联动(轻量)
在 `CompareToolbar` 增加「从历史载入 B」入口:读取该工具 `useCalcHistory` 的收藏项,选一条注入 B 栏。无需新存储。

---

## 二、场景工作流页(Workflows)

把零散工具按教学/实务顺序串成「剧本」,逐步走查,步骤间用 Tool Bus 自动传参。

### 1. 数据 `src/data/workflows.ts`
```text
Workflow = {
  id, title(zh/en), blurb, difficulty,
  steps: [{ toolId, title, note, passes?: BusKey[] }]
}
```
首批 4 条剧本(全部复用现有工具 id 与 `toolsCatalog` 的 `related`):
- **期权做市台**:IV → SVI 曲面 → Greeks Desk → MC 定价
- **利率到债券**:短率模型 → 债券计算器(传利率/曲线)
- **组合构建**:有效前沿 → Risk Parity → 策略回测
- **信用风险链**:Merton PD → 信用组合 Copula → 压力测试

### 2. 页面 `src/pages/Workflows.tsx` + 路由 `/workflows`
- 在 `App.tsx` 的 catch-all 之上加 `<Route path="/workflows" element={<Workflows/>} />`(用 `lazyWithRetry`)。
- 列表视图:剧本卡片网格(Bloomberg 终端风,金色 kicker + 步骤数 + 难度)。
- 详情视图:竖向步骤条,每步一张卡(序号 / 工具名 / 说明 / 传递的总线变量徽章),「打开此工具 ↗」按钮跳到 `sectionHref(toolId 对应 section)`。
- 「按顺序开始」:依次跳转,前一步结果经 `pushBus` 自动预填下一步(复用现有 `SendToTool` 推送逻辑)。

### 3. 入口接线
- `/tools` 页(`ToolsCatalog.tsx`)顶部加「目录 / 工作流」两个 tab,工作流 tab 渲染剧本卡片(或直接链到 `/workflows`)。
- `Navbar.tsx` 的「More」下拉新增「工作流」链接。
- `sitemap` 生成脚本 `scripts/generate-sitemap.ts` 加入 `/workflows`。

---

## 三、收尾

- **i18n**:对比模式按钮、工作流页标题/剧本名补 `en.json` / `zh.json`。
- **版本与日志**:升到 **V3.3**(badge、Hero、SiteFooter、ChangelogPage、`Changelog.tsx`、`CHANGELOG.md`),记一条「对比模式 + 场景工作流」。`toolsCatalog.ts` 的 version 联合类型加 `"V3.3"`。
- **验证**:`tsgo --noEmit` 通过;Playwright 跑两条路径——(a) BS 开启 A/B 并改 B 参数,确认差异表 ↑↓ 正确;(b) 打开 `/workflows` 某剧本「按顺序开始」,确认第二步收到上一步的总线参数。

---

## 技术要点
- 纯前端,无新依赖、无数据库、无边缘函数改动。
- 复用既有:`useCompareState`/`CompareToolbar`、`toolBus`(`pushBus`/`useBusConsume`)、`SendToTool`、`useCalcHistory`、`sectionHref`、`Seo`。
- 颜色/涨跌一律用设计 token(`text-gold`、`--teal-glow` 等),不硬编码 `text-green/red`。
- 默认关闭对比、不改动各工具既有默认渲染,零回归风险。

建议从**对比模式**先做(改动集中、立刻可见),再做工作流页。如需调整首批剧本或对比工具的选择,告诉我即可。
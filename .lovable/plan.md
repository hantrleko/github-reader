## 目标

把当前"单一超长页面 + 锚点滚动"改为"每个页签 = 一个独立、有边界的功能页面"。点击导航不再滚动到长页面的某个位置，而是跳转到该功能的专属路由，页面只渲染那一个板块（含标题头 + 工具 + 页脚）。

## 路由设计

新增一个动态路由承载所有功能板块：

```text
/                     → 着陆页（Hero / 简介 / 主题 / 模型 / 精选 Notebook + 板块目录）
/s/:sectionId         → 单个功能页面（只渲染该板块）
```

`sectionId` 取现有锚点 id：micro, calculator, implied-vol, mc-pricer, derivatives, bond, rate-model, frontier, asset-pricing, econometrics, risk, quant, macro, fred, worldbank, ecb-bis, coingecko, alphavantage, platform, frontier-concepts, quiz, learning。

保留 hero / topics / models 作为着陆页内容（不单独成页）。

## 实施步骤

1. **新建板块注册表** `src/lib/sections.ts`
   - 数组 `SECTIONS`：每项含 `{ id, kicker, label, subtitle, Component(lazy) }`，从现有 Index.tsx 的分节文案迁移。
   - `SECTION_MAP`、`HOME_IDS = ["hero","topics","models"]`。
   - 工具函数 `sectionHref(idOrAnchor)`：把 `id` 或旧的 `/#id` 统一解析为正确路由（home 三项 → `/#id`，其余 → `/s/id`）。

2. **新建** `src/pages/SectionPage.tsx`
   - 读取 `:sectionId`，无效则重定向回 `/`。
   - 渲染 Navbar + 板块标题头（复用 SectionHeader）+ Suspense/ErrorBoundary 包裹的对应组件 + 页脚。
   - 路由切换时滚动到顶部。每个页面独立 SEO 标题。

3. **改造** `src/App.tsx`：新增 `/s/:sectionId` 路由。

4. **精简** `src/pages/Index.tsx` 为着陆页
   - 保留：Hero、Editorial Briefing、ResearchPlaybooks、TodaysPick、TopicCards、ModelShowcase、FeaturedNotebooks、Footer。
   - 移除所有重型板块的内联挂载（迁移到 SectionPage）。
   - 新增"板块目录"网格：用 `SECTIONS` 渲染卡片，链接到各 `/s/:id`，方便总览。

5. **改造导航** `src/components/Navbar.tsx`
   - `scrollTo` 改为路由跳转：home 项 → `/` 或 `/#id`，其余 → `/s/id`。
   - active 高亮基于 `location.pathname`（`/s/:id`）而非滚动监听；移除 scrollspy 滚动计算逻辑。

6. **更新锚点消费方**（统一改用 `sectionHref`）
   - `HeroToolStrip.tsx`、`ResearchPlaybooks.tsx`、`TodaysPick.tsx`、`HeroSection.tsx`、`LearningPath.tsx`、`CommandPalette.tsx`、`TopicDetail.tsx`。
   - `toolsCatalog.ts` 的 `/#xxx` 锚点保持不变，由 `sectionHref` 在消费时转换，避免逐条改动。

## 技术说明

- 每个 SectionPage 只挂载一个板块，天然解决"长页面卡顿/迷失定位"，也不再需要 `DeferMount` 懒挂载（单板块直接 Suspense 即可）。
- 旧的 `/#id` 深链仍可用：着陆页保留 hash 滚动用于 home 三项；其余通过 `sectionHref` 指向新页。
- BrowserRouter + Lovable SPA 回退已支持 `/s/:id` 深链刷新。

## 验证

- 逐一点击导航各组，确认跳转到对应独立页面且只显示该板块。
- 着陆页目录、HeroToolStrip、Playbooks、命令面板（⌘K）跳转正确。
- 移动端菜单跳转正确，active 高亮正确。

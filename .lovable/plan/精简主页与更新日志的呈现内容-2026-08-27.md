# 精简主页与更新日志的呈现内容

## 目标
让首页「最新更新」卡片更克制，并把完整的更新日志改成交互可折叠、可快速扫读的形式，避免一进入页面就被大段文字淹没。

## 当前状态
- `src/i18n/locales/zh.json` 与 `en.json` 中的 `hero.latestUpdate.description` 把 V6.4、V6.3、V6.2、V6.1、V6.0 乃至更早的多版内容全部堆叠在首页卡片里，导致卡片文本极长。
- `src/components/Changelog.tsx` 在 `/changelog` 页面把所有历史 release 全部平铺展开，每个 release 下又有 2-3 个卡片、每个卡片 5-10 条要点，整体形成一堵「文字墙」。

## 改动方案

### 1. 首页「最新更新」卡片
- 仅保留当前版本（V6.4）的 2-3 句核心摘要：TradingView 跨市场筛选器上线，支持的市场/筛选维度/导出能力。
- 删除对 V6.3、V6.2、V6.1、V6.0 等旧版本的复述（这些内容完整保留在 `/changelog` 页面）。
- 在 `HeroSection.tsx` 的描述文字上加 `line-clamp-3` 与 `max-h` 样式兜底，确保即使未来文案变长也不会撑开卡片。
- CTA 「查看更新日志 / View Changelog」保持不变。

### 2. `/changelog` 页面可折叠化
- 将 `Changelog.tsx` 中每个 release 改为手风琴/折叠面板，默认仅展开最新 release，其余全部折叠。
- 在页面顶部增加「展开全部 / 折叠全部」切换按钮。
- 折叠态只显示：版本号、日期、tag、以及每个 highlight 的标题（或一行摘要），展开后才显示具体 bullet 列表。
- 不删除任何 release 数据，只是改变默认展示形态。

### 3. i18n 补充
- 在 `changelog` 命名空间下新增：
  - `expandAll`: 展开全部
  - `collapseAll`: 折叠全部
- 同步更新 zh/en。

### 4. 验证
- `bun run build` 通过。
- 运行测试套件，确保无回归。
- 使用 Playwright 截图确认：
  - 首页「最新更新」卡片高度合理、CTA 可见。
  - `/changelog` 页面初始仅展开 V6.4，点击可展开其他 release，「展开全部」按钮工作正常。

## 不在本次范围
- 不调整 `/changelog` 路由或 release 数据内容。
- 不修改版本号与 CHANGELOG.md（本次是展示层优化，非新功能发布）。

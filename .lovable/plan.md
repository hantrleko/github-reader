

# 进一步可优化点（按收益/成本排序）

按"收益高 / 改动小"优先排列。你可以挑选要做的项，我再统一实施。

---

## 🔴 高收益（推荐优先）

### 1. 路由级代码分割（最大单项收益）
当前 `App.tsx` 把 `Index` / `TopicDetail` / `NotFound` 全部静态导入，首屏 bundle 一次性带上了 **所有 12 个计算器**（即使 `DeferMount` 延迟了挂载，JS 文件本身仍被加载）。

**做法**：把 3 个 page 改成 `lazy()` + `Suspense`，并在 `vite.config.ts` 里加 `manualChunks` 把 `recharts` / `katex` / `framer-motion` / `html-to-image` 拆成独立 vendor chunk。
**预估**：首包 JS 体积下降 40%-60%，TTI 显著改善。

### 2. Recharts 按需引入 / 懒加载图表
12+ 组件都 `from "recharts"`，Recharts 体积约 400KB。
**做法**：把每个 Tool 里的 Chart 子树抽成 `lazy()` 子组件，只有当卡片真正进入视口才加载图表代码。
**预估**：再砍 ~150KB 关键路径 JS。

### 3. Framer Motion 的 `motion.*` 改用更轻量方案
`HeroSection`、几个 Tools 仅用 fade-in / translate，引入了完整的 framer-motion（~50KB gz）。
**做法**：换成纯 CSS `animate-fade-in` keyframe（已有 Tailwind 配置），删除 framer-motion 依赖或改为只在真正需要的地方引入 `m`/`LazyMotion`。
**预估**：-50KB，无视觉差异。

### 4. i18n 资源懒加载
当前 `src/i18n/index.ts` 把 zh + en 两份 JSON 都同步打进首包。
**做法**：用 `i18next-http-backend` 或动态 `import()`，按当前语言只加载对应 JSON。
**预估**：小量但纯净的优化（-3-7KB），并为后续加更多语言铺路。

---

## 🟡 中等收益

### 5. Navbar 滚动监听节流升级
`recomputeActive()` 每次 rAF 都对 19 个 section 做 `getBoundingClientRect()`（强制 layout）。
**做法**：改用一个长期持有的 `IntersectionObserver`（每个 section 一个 observer），active 状态由 entry 回调更新；移除 scroll 监听。
**预估**：滚动时主线程开销 ↓，长列表/低端设备明显更顺。

### 6. `DeferMount` 卸载策略 + 占位高度精确化
当前 mount 后永不 unmount，长时间停留在底部时所有计算器仍在内存。
**做法**：
- 给每个 Section 设置更接近真实高度的 `minHeight`（避免快速滚动时跳动）
- 可选：当 section 离开视口 > 2 屏时，`unmount` 并恢复占位（用 `content-visibility: auto` 的 CSS 替代 JS 也是一个选择）

### 7. `EconometricsTools.tsx`（1936 行）和 `CalculatorSection.tsx`（1328 行）拆分
单文件过大 → 编辑器/HMR 慢、Tree-shaking 差。
**做法**：每个 Tab/子工具拆出独立文件，主文件只做 layout + lazy 装配。

### 8. 给所有 section 容器加 `content-visibility: auto`
浏览器原生跳过视口外的渲染/布局，几乎零代码代价。
**做法**：在 `index.css` 加一条 `.cv-auto { content-visibility: auto; contain-intrinsic-size: 600px; }`，套到 Index 中每个章节 wrapper。

---

## 🟢 体验/质量提升（非性能）

### 9. 错误边界 & 数据请求失败 UI
`market-quotes` 等 Edge Function 失败时目前只 `toast`，部分组件可能崩溃。
**做法**：在每个 lazy section 外包 `<ErrorBoundary>`（react-error-boundary），失败显示 retry 按钮。

### 10. SEO / 元信息
首页只有 1 个 `<title>`，没有 OpenGraph / 结构化数据 / sitemap。
**做法**：用 `react-helmet-async` 注入 per-route meta，加 `/sitemap.xml`、`og:image`。

### 11. 无障碍 & 键盘导航补完
- 移动端菜单缺 `role="dialog"` + focus trap
- 部分按钮 hover 才显示状态，没有 `aria-pressed`
- 公式 LaTeX 缺 `aria-label`（屏幕阅读器读不出）

### 12. 测试覆盖
项目里有 `vitest` 和 `playwright` 配置，但只有 `example.test.ts`。
**做法**：给数值算法（BS、Newton-Raphson、Vasicek、Sharpe）补关键单元测试，防止重构回归。

---

## 我的建议

如果只挑 3 项做一次性收尾，按性价比我会推荐：
**#1 路由分包 + manualChunks** → **#3 移除 framer-motion** → **#8 content-visibility**。
三项加起来预计首屏 JS -50% 左右，且改动可控（约 5-8 个文件）、无视觉退化。

告诉我你想做哪几项，我直接开干。


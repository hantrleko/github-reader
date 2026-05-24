# PWA 离线 + 性能优化方案

目标：让核心计算器在离线状态下可用，并把首页 Lighthouse 推到 95+。

> ⚠️ PWA 提醒：service worker 仅在 **publish 后的正式域名** 上生效，Lovable 预览 iframe 中会被显式禁用，否则会缓存住旧版本导致预览不刷新。

---

## 一、PWA 离线（仅纯前端计算器）

### 1. 依赖与配置
- 安装 `vite-plugin-pwa` + `workbox-window`
- `vite.config.ts` 增加 `VitePWA({...})`：
  - `registerType: "autoUpdate"`
  - `devOptions.enabled: false`（开发预览不注册）
  - `workbox.navigateFallbackDenylist: [/^\/~oauth/, /^\/auth/]`
  - HTML 导航走 **NetworkFirst**（`networkTimeoutSeconds: 3`），避免锁死旧 shell
  - 静态资源 `js/css/font/image` 走 **StaleWhileRevalidate**
  - Supabase / FRED / market-quotes 等动态接口**不缓存**

### 2. Manifest
- `public/manifest.json` 已存在，补全：`name`、`short_name`、`theme_color = #064e3b`、`background_color = #0d0d0d`、`display: "standalone"`、`start_url: "/"`、`icons`（192/512 + maskable）
- 用 imagegen 生成两张品牌 icon（深绿底 + 金色衬线 "EF"）

### 3. 注册守卫（`src/main.tsx`）
检测 iframe / `id-preview--*` / `lovableproject.com` 域名，命中则**卸载已有 SW**且不注册；只有正式域名才允许注册。与现有 `checkBuildVersion()` 协同：版本变更时主动 `caches.delete()` + `registration.unregister()` 后再 reload。

### 4. 离线可用范围
- 标记**纯客户端**计算器（Black-Scholes / Bond / OLS / Greeks / Heston / SABR 等）为离线可用
- 在 `/tools` 列表卡片上加 ✓ Offline 徽章
- 涉及网络（FRED、market-quotes、ai-explain、Notebook 云同步）的工具显示 ⚠ Online only，离线时禁用提交按钮并提示

### 5. 离线提示 UI
- 全局 `useOnlineStatus()` Hook，离线时顶部出现一条 emerald 细条："Offline mode · 已切换到本地缓存"
- 新版本可用时（workbox `onNeedRefresh`）复用现有 sonner toast 风格，"新版本就绪 · 立即刷新"

---

## 二、首页性能优化（Lighthouse 95+ 目标）

### 1. LCP
- 找出 `HeroSection` 的 LCP 元素，给主图加 `<link rel="preload" as="image" fetchpriority="high">`
- 字体 preload：Libre Baskerville / IBM Plex Sans 的 woff2 子集 + `font-display: swap`
- 移除/延迟 HeroSection 中非首屏装饰渐变与动画（低端机降级）

### 2. 图片
- 引入 `vite-imagetools`，把 `src/assets` 下 PNG/JPG 全部产出 `.avif` + `.webp` 版本
- 用 `<picture>` 提供 avif → webp → 原图回退
- 所有 `<img>` 强制 `width` / `height` 属性消除 CLS，离屏图加 `loading="lazy"` + `decoding="async"`

### 3. 代码分割
- 审查 `vite.config.ts` 的 `manualChunks`：`recharts`、`mathjs`、`katex`、`@radix-ui/*` 分别独立 chunk
- 首页仅加载 `HeroSection` + `TopTicker`，其余 section（CalculatorSection、ModelShowcase、FeaturedNotebooks…）改为 `lazyWithRetry` + `IntersectionObserver` 懒挂载（已有 `lazyWithRetry`，复用）
- KaTeX CSS 改为按需引入，仅在 EquationBlock 首次渲染时动态 `import("katex/dist/katex.min.css")`

### 4. INP / 长任务
- 用 `browser--performance_profile` 跑一遍现状，定位长任务
- 重计算的 Monte Carlo / Heston / Local Vol 用 `useDeferredValue` + `useTransition` 包装，避免输入卡顿
- 必要时把最重的模拟挪到 Web Worker（仅 MC / Heston 两个）

### 5. 第三方
- 检查 `index.html` 中所有 `<script>` / 像素，全部 `defer` 或 `async`
- 移除未使用的 Radix UI 组件 imports（用 `knip` 报表）

### 6. 监控
- 复用现有 `client-error-log` edge function，新增 `type: "web-vitals"` 上报 LCP / INP / CLS（`web-vitals` 库，<2KB），便于上线后持续观测

---

## 三、技术细节

```text
vite.config.ts
  ├── VitePWA({ registerType, devOptions, workbox })
  ├── imagetools()
  └── manualChunks: { recharts, mathjs, katex, radix, charts-common }

src/
  ├── main.tsx               // 注册 SW（带 iframe/preview 守卫）
  ├── hooks/useOnlineStatus.ts
  ├── components/
  │   ├── OfflineBanner.tsx
  │   └── SwUpdatePrompt.tsx  // 复用 sonner
  ├── lib/
  │   ├── webVitals.ts        // 上报到 client-error-log
  │   └── buildVersion.ts     // 已有，新增 SW 清理钩子
  └── workers/
      └── mcSimulator.worker.ts  // 可选第二阶段

public/
  ├── manifest.json           // 补全字段
  ├── icon-192.png / icon-512.png / icon-maskable.png
  └── sw.js                   // workbox 自动生成
```

---

## 四、分两步交付

- **Step 1（本轮）**：vite-plugin-pwa 接入 + manifest + 注册守卫 + 离线徽章 + LCP/字体/图片优化 + manualChunks
- **Step 2（下轮，按需）**：Web Worker 化 MC/Heston + web-vitals 上报 + knip 清理未用依赖

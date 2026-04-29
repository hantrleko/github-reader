# V1.7 — 把 V1.6 留下的尾巴收掉

V1.6 把基础设施铺满了，但有两块推荐组合里的内容**没真正落地**，本次专门收尾，不引入新方向。

---

## 1. CompareToggle A/B 对比真正接入（核心）

`useCompareState` + `CompareToolbar` 早就写好但没人用。本次接入 3 个最适合对比的计算器：

### 1.1 Black-Scholes（`CalculatorSection.tsx`）
- 工具栏旁加 `CompareToolbar`
- 开启后参数面板分 A / B 两列（S, K, T, r, σ, type）
- 结果区双列：Call/Put 价格 + Δ Γ Vega Θ Rho 表格并排
- 价格-标的曲线图叠加 A（金）/ B（青）两条线

### 1.2 BondCalculator
- 双列参数：face, coupon%, ytm%, maturity, freq
- 双列结果：Price / Duration / Modified Duration / Convexity
- 现金流表保持单组（避免移动端崩），用顶部 tab 切 A/B

### 1.3 EfficientFrontier
- 双列协方差/收益输入
- 同一张图叠加两条前沿曲线（不同颜色 + 图例）
- 切线组合点用空心 vs 实心区分

**实现要点**：A/B 状态用 `useCompareState`；关闭对比时只渲染 A，零成本回退；B 面板用 `Collapsible` 折叠减少视觉负担。

## 2. 375px 移动端走查（一次性扫尾）

按文件清单走查 + 修复：

| 文件 | 问题 | 修复 |
|---|---|---|
| `Navbar.tsx` | 版本徽章 + Lang/Theme 在 < 400px 挤 | 版本徽章 `hidden xs:inline-flex`，新增 `xs: 400px` 断点 |
| `HeroSection.tsx` | 标题在 375px 偏大 | `text-4xl sm:text-5xl md:text-7xl` 梯度 |
| `BondCalculator.tsx` 现金流表 | `grid-cols-4` 在 375px 字号被压扁 | `text-[9px] sm:text-[10px]`，前两列加 `truncate` |
| `CalculatorSection.tsx` 输入网格 | `grid-cols-2 md:grid-cols-4` 在窄屏标签换行 | label 加 `truncate`，input 加 `min-w-0` |
| `Index.tsx` Footer | 4 列在 < 640px 拥挤 | `grid-cols-2 sm:grid-cols-2 md:grid-cols-4` |
| `Onboarding.tsx` | 卡片可能溢出 | 外层加 `max-w-[92vw]` |
| `CommandPalette.tsx` | iOS 底部安全区 | `pb-[env(safe-area-inset-bottom)]` |
| `EquationBlock` 已有横向滚动 | 无需改 | — |

## 3. 版本号同步 V1.7

- `src/i18n/locales/{en,zh}.json` — `nav.version` 字段
- `src/pages/Index.tsx` Footer
- `src/components/Changelog.tsx` — 新增 V1.7 条目（A/B 对比落地 + 移动端走查），V1.6 转 Stable

---

## 技术细节

**新增文件**：无（复用现有 `CompareToggle.tsx`）

**修改文件**（约 9 个）
- `src/components/CalculatorSection.tsx` — Black-Scholes 接入 A/B
- `src/components/BondCalculator.tsx` — A/B + 现金流表移动端
- `src/components/EfficientFrontier.tsx` — A/B 双前沿叠加
- `src/components/Navbar.tsx` — 版本徽章窄屏隐藏
- `src/components/HeroSection.tsx` — 标题字号梯度
- `src/components/Onboarding.tsx` — 宽度限制
- `src/components/CommandPalette.tsx` — 安全区
- `src/pages/Index.tsx` — Footer 网格 + 版本号
- `src/components/Changelog.tsx` — V1.7 条目
- `src/i18n/locales/{en,zh}.json` — 版本字符串 + A/B 文案
- `tailwind.config.ts` — 加 `xs: 400px` 断点

**不做**（继续延后）
- AI 助教、PDF 笔记导出、知识图谱、图表十字光标 / SVG 导出 — 都是独立大功能

**预期效果**
- A/B 对比从"有 hook"升级为"3 个核心计算器可用"，闭环完成
- 375px 屏幕全站不再破版
- 版本号统一 V1.7

确认无误请回复"开始"。

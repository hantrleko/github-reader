## 重构目标

把当前"满屏巨型标题 + 拥挤导航"的首页，重构为 **Bloomberg 终端编辑型** 杂志布局：
深翠绿底 + 金色重音 + 衬线大标题 + 终端式右侧数据栏 + 编辑型工具网格。

## 设计 Token 改造（全站基调，一次到位）

**`src/index.css` — 替换 `:root` + `.dark` HSL 变量**

| Token | 浅色 (米白纸) | 深色 (终端) |
|---|---|---|
| `--background` | `42 40% 94%` (#f5f0e0) | `158 78% 17%` (#064e3b) |
| `--foreground` | `158 78% 12%` | `42 40% 94%` |
| `--card` | `42 30% 97%` | `158 50% 22%` (#0d7a5f 暗) |
| `--primary` (金) | `43 53% 54%` (#c9a84c) | `43 53% 54%` |
| `--accent` (翠绿亮) | `158 56% 27%` (#0d7a5f) | `158 56% 33%` |
| `--border` | `158 30% 75%` | `158 40% 28%` |

**`tailwind.config.ts`** —
- 字体：`--font-display` → `'Libre Baskerville', Georgia, serif`；`--font-body` → `'IBM Plex Sans', system-ui`；`--font-mono` → `'IBM Plex Mono'`。
- 保留 `gold/teal` 别名，重新指向新 token。

**`index.html`** — 替换 Google Fonts 链接为 `Libre Baskerville` + `IBM Plex Sans` + `IBM Plex Mono`。

## 顶栏重构 — `src/components/Navbar.tsx`

```
┌─────────────────────────────────────────────────────────────────────┐
│ THE QUANTITATIVE REPORT                              [V2.9] EN ⟳ ☀  │
│ Econ & Finance Lab          PRICING DERIV PORTFOLIO ECONOM QUANT … │
└─────────────────────────────────────────────────────────────────────┘
```
- 双层：小字眉（kicker）+ 衬线 brandmark；右侧 5 个大类一级菜单（uppercase + 字距 0.15em + hover 金色下划线）。
- 二级（V2.x 子工具）改为 hover 抽屉/dropdown，缓解拥挤。
- 语言/主题/Changelog 折叠到右侧小图标组。

## Hero 重构 — `src/components/HeroSection.tsx`

12 列网格：
```
┌────────────────────────── 8 cols ──────────┬── 4 cols ─────────┐
│ ── EMPIRICAL RESEARCH CORE                 │ LAB METRICS       │
│                                            │ ───────────────── │
│  Mastering [Economics] &                   │ Topics      07    │
│  Empirical Finance Models                  │ Formulas   133 ▲  │
│  (Libre Baskerville 衬线, 5xl→7xl)         │ Concepts   133    │
│                                            │                   │
│  正文 IBM Plex 1.5rem max-w-xl             │ │ LATEST UPDATE   │
│                                            │ │ Black-Litterman │
│  [LAUNCH TOOLS ↓]  [BROWSE LIBRARY]        │ │ → Changelog     │
└────────────────────────────────────────────┴───────────────────┘
```
- 移除当前的"K线 SVG + blur 光斑"，换成极淡的金色点阵网格（已有 `bg-grid-pattern` 可改色）。
- 右侧 sidebar 从现有 `topicsData` 计算 metrics；Latest Update 取 `changelog` 最近一条。

## 紧随其后的 4 列工具直达栏（新组件）

`src/components/HeroToolStrip.tsx` —
```
┌──────────┬──────────┬──────────┬──────────┐
│ UNIT_01  │ UNIT_02  │ UNIT_03  │ UNIT_04  │
│ Pricing  │ Econome- │ Portfolio│ Risk     │
│ Engine   │ trics    │ Lab      │ Metrics  │
└──────────┴──────────┴──────────┴──────────┘
```
- 单像素翠绿描边，hover 整格 `bg-accent/20`；点击 scroll 到对应 section。
- 用 `toolsCatalog` 里每个 dimension 的 featured 工具填充。

## 下方模块重排序与编辑型包装

`src/pages/Index.tsx` 顺序调整：
1. Hero（含 sidebar）
2. HeroToolStrip
3. **TodaysPick**（保留，但改用"今日特写"编辑卡样式：左大图右文，金色 kicker）
4. TopicCards → 改为 3 列编辑卡（kicker + 衬线标题 + 描述 + "Read →"）
5. CalculatorSection / DerivativesTools …（每个 Section 前加 magazine-style section header：`SECTION 01 / PRICING`）
6. LearningPath / Changelog / Footer

新增统一 section header 组件 `src/components/common/SectionHeader.tsx`：
```
─────  SECTION 02 / DERIVATIVES
Interactive Greeks & Volatility Surfaces
```

## 受影响文件清单

- 改：`src/index.css`（token + grid pattern 配色）
- 改：`tailwind.config.ts`（字体）
- 改：`index.html`（fonts）
- 改：`src/components/Navbar.tsx`（双层 + dropdown）
- 改：`src/components/HeroSection.tsx`（12 列 hero + sidebar）
- 改：`src/components/TopicCards.tsx`（编辑卡样式）
- 改：`src/components/TodaysPick.tsx`（特写卡样式）
- 改：`src/pages/Index.tsx`（顺序 + section header 注入）
- 新：`src/components/HeroToolStrip.tsx`
- 新：`src/components/common/SectionHeader.tsx`
- 内存更新：`mem://index.md` Core 改为 Emerald + Libre Baskerville × IBM Plex，金色 #c9a84c 保留。

## 不在本次范围

- 不改任何计算器内部逻辑、公式、`src/lib/quant/*`、Supabase / edge functions、i18n 文案（只补少量新键）。
- 不动 V2.x roadmap 功能本身，只换外观与组织方式。

## 验收

- `/` 首屏 1183×742 视口内：顶栏 + hero 完整可见，标题不再压满屏。
- 全站浅/深双主题色都跑通 Emerald Prestige。
- `vitest` 仍全绿（不动业务逻辑）。

确认即按此实施。
# 继续升级方案（四方向合并 · 分阶段）

在锁定风格（Emerald Prestige 配色、Libre Baskerville × IBM Plex 字体、编辑部式排版）内，把你勾选的四个方向合并为四个阶段推进。全程仅动前端/展示层，尊重 `prefers-reduced-motion`，颜色继续用语义 token，不硬编码。

---

## 阶段 1 · 无障碍可达性（延续之前工作）

延续键盘/屏幕阅读器改造，把之前只覆盖到 Navbar 的能力扩展到卡片与动态内容：

- **修复嵌套交互 bug**：`FeaturedNotebooks.tsx` 中 `@handle` 是放在 `<Link>` 内部、用 `<span onClick>` + `window.location.href` 触发跳转的非语义交互元素（键盘不可达、interactive-in-interactive）。改为把作者句柄移出主链接、用真正的 `<Link to={/u/handle}>`，避免链接嵌套并恢复键盘可达。
- **卡片链接可达性**：为 `TopicCards` / `HeroToolStrip` / `SectionDirectory` / `FeaturedNotebooks` 的卡片链接补充清晰的 `aria-label`（含板块名/主题名），让屏幕阅读器逐条播报不再只念图标或“Explore”。
- **首页地标与标题层级**：检查 `Index.tsx` 各 section 的标题层级是否从 h2 连续（不跳级），必要时为无标题的 section 补 `aria-labelledby` 或 `aria-label`。
- **动态区域**：`FeaturedNotebooks` 加载态用 `aria-busy` / `aria-live="polite"`，让加载完成对屏幕阅读器可感知。

## 阶段 2 · 首页视觉与动效精修（按 `.lovable/plan.md` 收尾，动效强度 3）

对照已存在的 `.lovable/plan.md`，把尚未完全统一的卡片视觉与节奏收敛：

- **统一卡片语言**：`EditorialBriefing` / `TopicCards` / `SectionDirectory` / `FeaturedNotebooks` / `HeroToolStrip` 的圆角、内边距、边框与 hover 态（轻微上浮 + 金色边框渐显 + 柔和阴影）统一到同一规范，消除当前深浅/圆角不一。
- **纵向节奏**：收敛各 section 的 `py-*` 间距，让首页从 Hero 到 Footer 呼吸均匀。
- **进场动效补齐**：`EditorialBriefing`、`TodaysPick`、`ModelShowcase` 等仍缺进场动效的区块统一走 `Reveal` 组件（已存在），交错淡入；`HeroToolStrip` hover 顶部金色指示线保留并统一时序。
- 全部动效在减少动态偏好开启时静态显示。

## 阶段 3 · 内容与文案扩充

在不改数据结构的前提下润色/补充展示文案：

- **首页文案**：精修 `EditorialBriefing`、`TopicCards`、各 `SectionHeader` 的副标题，使中英文表述更一致、专业、可读。
- **板块目录说明**：为 `SECTIONS`（`src/lib/sections.ts`）中缺 `subtitle` 的板块补一句到位的中文导语，让目录卡片信息更完整。
- 保持既有的 LaTeX/公式讲解与教育内容风格一致（记忆中的知识库要求）。

## 阶段 4 · 新增功能板块（首页）

新增一个契合定位的首页展示板块（二选一，实施时确认）：

- 方案 A · **“研究工作流速览”**：从现有 `src/data/workflows.ts` 读取，做一个横向卡片带，展示 3–4 条推荐工作流并链接到 `/workflows`。
- 方案 B · **“术语速查入口”**：从 `src/data/glossary.ts` 抽取高频术语，做一个紧凑的 chips 网格并链接到 `/glossary`。

新板块沿用阶段 2 的统一卡片规范与 `Reveal` 进场动效。

---

## 技术要点与范围

- 涉及文件（展示层）：`src/pages/Index.tsx`、`src/components/HeroSection.tsx`、`HeroToolStrip.tsx`、`TopicCards.tsx`、`FeaturedNotebooks.tsx`、`common/SectionHeader.tsx`、`common/Reveal.tsx`、`src/lib/sections.ts`，以及阶段 4 新增的板块组件。
- 不触碰业务逻辑、数据获取契约、路由与后端；不改 `supabase/client.ts` 等自动生成文件。
- 完成后用 Playwright 截图核对首页各区块视觉与进场表现，并做一次 Tab 键盘走查验证可达性。

## 建议确认项

1. 阶段 4 想要哪个新板块（工作流速览 / 术语速查 / 两者都要）？
2. 是否希望我按 1→2→3→4 顺序一次性全部实现，还是先做其中某一两个阶段？

（未确认时我将默认：四阶段全做，阶段 4 采用“研究工作流速览”。）
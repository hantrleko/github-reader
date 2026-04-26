
# V1.3 全方位升级实施计划

把上一轮提出的 28 项建议**全部落地**，并把版本号从 V1.2 升到 **V1.3**。鉴于工作量巨大（涉及 20+ 文件、新增 10+ 组件），我会按 **5 个 Phase** 分批提交，每个 Phase 都是可独立运行的完整功能集。

---

## 📦 Phase A — 通用基础设施（1 次提交，5 文件）

为后续功能铺底，**先做这一层后面才能复用**。

### A1. 新增 `src/lib/calculatorTools.tsx`
统一的「**导出 PNG / 复制参数链接**」工具栏组件 `<ShareExportToolbar>`：
- `html-to-image` 把指定 ref 节点导出 PNG
- 把当前 state 序列化为 base64 写入 URL hash（`#calculator?s=eyJTIjox...`），加载时自动 hydrate
- 复制成功 toast + ✓ 反馈

### A2. 新增 `src/components/common/ChartTheme.tsx`
统一的 Recharts 主题配置（CartesianGrid 颜色、Tooltip 卡片样式、轴字体、tabular-nums）。导出 `<ThemedTooltip>`、`CHART_COLORS`、`AXIS_PROPS`，所有图表后续替换。

### A3. 新增 `src/components/common/CompareToggle.tsx`
通用 A/B 对比开关：左右双栏 state + 「同步参数」「重置 B」按钮，作为 hook `useCompareState(initial)` 提供。

### A4. 新增 `src/components/common/InfoBadges.tsx`
- `<DifficultyBadge level="basic|intermediate|advanced" />` — 🟢🟡🔴
- `<WhyItMatters>{children}</WhyItMatters>` — 工具顶部说明卡片
- `<TermTooltip cn="久期" en="Duration">久期</TermTooltip>` — 中英术语 hover

### A5. 新增 `src/lib/calcHistory.ts`
localStorage 历史记录 + 收藏夹（最多 10 条），暴露 `useCalcHistory(toolKey)` hook。

---

## 📦 Phase B — 全局交互升级（1 次提交，6 文件）

### B1. **命令面板** `src/components/CommandPalette.tsx`
- 用现成的 `cmdk`（已在 ui/command.tsx）
- `⌘K` / `Ctrl+K` 触发；搜索 19 个 section + 12 个工具
- 在 `App.tsx` 全局挂载

### B2. **快捷键 Hook** `src/hooks/useHotkeys.ts`
- `?` 显示帮助 modal
- `←/→` 在同章节工具间跳转

### B3. **回到顶部 + 进度条** `src/components/ScrollUtilities.tsx`
- 滚动 > 800px 显示浮动按钮
- 右侧 fixed mini progress bar（章节位置）
- 在 `Index.tsx` 挂载

### B4. **Navbar 优化** `src/components/Navbar.tsx`
- 章节 dropdown 已分组；增加 ⭐ 收藏入口、⌘K 提示
- 移动端菜单加 `role="dialog"` + focus trap

### B5. **首次访问 onboarding** `src/components/Onboarding.tsx`
- 自写 3 步轻量引导（不引入 react-joyride，省体积）
- localStorage flag 防重复

### B6. **错误边界** `src/components/SectionErrorBoundary.tsx`
- 包裹 `Index.tsx` 中每个 lazy section
- 失败显示 retry 按钮 + 友好文案

---

## 📦 Phase C — 计算器增强（按工具改造，多次提交，~12 文件）

对每个主要计算器套用 Phase A 的基础设施。**不修改算法**，只加壳：

每个工具改造清单：
1. 顶部加 `<DifficultyBadge>` + `<WhyItMatters>`（两句话讲清"为什么重要"）
2. 关键参数 input 旁加 `<Slider>`（双向绑定）
3. 数字 input 加 `+/-` 步进按钮
4. 底部加 `<ShareExportToolbar>`（导出 PNG + 分享链接）
5. 重型计算（MC、Frontier）加 loading skeleton
6. Recharts 替换为统一的 `ChartTheme`

涉及文件：
- `CalculatorSection.tsx`、`ImpliedVolTool.tsx`、`MCOptionPricer.tsx`
- `BondCalculator.tsx`、`RateModelSimulator.tsx`、`EfficientFrontier.tsx`
- `RiskTools.tsx`、`QuantStrategyTools.tsx`
- `EconometricsTools.tsx`、`DerivativesTools.tsx`

> A/B 对比模式只接入 **3 个最具教学价值的工具**（BS 定价、Frontier、Bond），其余保留入口但默认关闭，避免一次性改动过大。

---

## 📦 Phase D — 内容与学习路径（1 次提交，4 文件）

### D1. `LearningPath.tsx` — 完成度勾选
localStorage 记录每个 topic 完成状态，进度条显示总进度。

### D2. `QuizSection.tsx` — 完成后打勾 + 错题回顾
答完一题后保存结果，章节顶部显示「已完成 3/8」。

### D3. `RealDataLoader.tsx` — 数据时间戳 + 来源角标 + retry
失败时显示「使用示例数据」按钮，永不崩溃。

### D4. 公式视图三 Tab `src/components/common/FormulaCodeView.tsx`
**「公式 | Python 代码 | 结果」** 三视图组件，先在 BS 定价、Bond YTM、Vasicek 三处接入示例。Python 代码用 `react-syntax-highlighter`（按需懒加载，加入 vite manualChunks）。

---

## 📦 Phase E — 视觉打磨 + 版本号（1 次提交，6 文件）

### E1. `src/index.css` — 全局视觉规则
- `body` `transition-colors duration-300`
- 数字 `font-feature-settings: "tnum"`
- 中文 `letter-spacing: 0.02em`，行高 1.7
- 减弱金色滥用（部分 `text-gold` → `text-foreground hover:text-gold`）
- 加大 section padding（`py-20` → `py-24`）

### E2. `HeroSection.tsx` — 抽象金融背景
低透明度 SVG 收益率曲线 / K 线作为背景层。

### E3. `Footer` 升级（在 `Index.tsx` 内）
导航链接 + GitHub + 反馈邮箱 + 订阅占位。

### E4. `NotFound.tsx` — 趣味化
"找不到这个金融模型" + 返回首页 CTA。

### E5. `ThemeToggle.tsx` — sun/moon morph 过渡
180ms rotate + scale 动画。

### E6. **版本号 V1.3**
- `src/components/Changelog.tsx` 新增 V1.3 条目（详细列出 28 项）
- Footer Version 1.1 → **Version 1.3**
- Changelog 顶部 "V1.0 → V1.2" → "V1.0 → V1.3"

---

## 📊 预计成果

| 维度 | 改进 |
|---|---|
| 功能 | +导出/分享、+A/B 对比、+收藏历史、+命令面板、+完成度追踪 |
| 交互 | +Slider/步进、+⌘K、+快捷键、+回到顶部、+进度条 |
| 体验 | +onboarding、+难度标签、+"为什么重要"、+中英术语、+错误恢复 |
| 美观 | 统一 ChartTheme、字体细节、金色克制、微动效、Hero 背景 |

新增依赖（轻量）：
- `react-syntax-highlighter` （懒加载分包，不影响首屏）

涉及文件预计 **~25 个修改 + ~10 个新增**。

---

## ⏭️ 实施顺序

我会按 **A → B → E → D → C** 的顺序提交（先把基础设施和视觉打磨做完，最后做计算器逐个套壳，因为 C 体量最大、最容易需要分批）。每个 Phase 提交后你可以即时预览。

approved 后我立即从 Phase A 开始动工。


# 继续优化方案 — 对标国际同类站点

## 一、对标参考

| 站点 | 强项 | 我们可借鉴 |
|---|---|---|
| **QuantPedia** | 海量策略库 + 论文检索 + 因子分类 | 策略卡片库、论文引用层 |
| **Hudson & Thames (MlFinLab)** | 工业级 Python 库 + 严谨文档 + Notebook | 可下载 Notebook、API 文档化 |
| **Wilmott.com** | 高质量论坛 + 专家专栏 | 评论/讨论、专家署名文章 |
| **QuantStart** | 教程路径 + 实战项目 | Project-based learning |
| **Bloomberg Terminal** | 数据密度 + 快捷键 + 终端美学 | 已有 ✓，继续强化 ticker / heatmap |
| **Observable / Pluto.jl** | Reactive notebook，公式即所得 | 单页 reactive cell |
| **AQR / Two Sigma Insights** | 研究简报排版 + 图表叙事 | Long-form research 模板 |
| **Macrosynergy / Koyfin** | 宏观仪表盘 + 数据可视化 | Macro dashboard 升级 |

## 二、四条优化主线

### 1. 内容深度 — 从「计算器」走向「研究平台」
- **策略库 (Strategy Library)**：新建 `/strategies`，每个策略含：摘要 / 论文链接 / 参数 / 一键回测 / 历史绩效卡。先做 12 个经典（动量、价值、波动率风险溢价、Carry、Pairs、PEAD、Low-Vol、Quality、HRP、Risk Parity、Trend、Mean-Reversion）。
- **论文索引层 (Paper Index)**：每个公式/计算器底部增加 `Source Papers` 区，BibTeX + DOI + 一句关键贡献。已有 `CitationFooter`，扩展为可检索的 `/papers` 页。
- **Research Notes**：长文模板（封面图 + 摘要 + LaTeX + 嵌入计算器 + 数据图 + 引用），对标 AQR Insights / Two Sigma。

### 2. 交互范式 — Reactive Notebook
- **Notebook 模式 v2**：当前 `V28Platform` 已有 notebook 雏形，升级为：
  - 真正的 reactive cell（修改输入参数，下游图表自动重算）
  - 支持 Markdown + LaTeX + Code (受限沙箱 JS) + Chart
  - 一键 Fork 到「我的 Notebook」（已有 Supabase，加 `user_notebooks` 表）
  - 导出 `.ipynb` / `.md`
- **跨工具数据管道**：把 BondCalculator 的收益率曲线直接喂给 RateModelSimulator；EfficientFrontier 的权重可发送到 RiskTools 做 VaR。统一 `useToolBus()` 事件总线。

### 3. 社区与可信度
- **评论 / 讨论**：每个工具 & 知识点页面底部加 Disqus 风格讨论（新表 `discussions` + RLS），对标 Wilmott。
- **专家署名**：作者档案页 `/authors/[slug]`，文章/工具标注作者。
- **公开个人主页**：`/u/[username]` 展示用户的公开 notebook、收藏策略、学习徽章。
- **学习徽章 (Achievements)**：完成 LearningPath 章节解锁徽章，写入 `user_achievements` 表。

### 4. 数据与可信度
- **真实市场数据 ticker 条**：顶部 Bloomberg 风格滚动条（已有 FRED / market-quotes edge function，扩到 SPX/VIX/UST10Y/DXY/BTC）。
- **基准对照默认开启**：所有定价工具默认显示「我们 vs 教材闭式解 vs 市场报价」三列对照（部分已有 `BenchmarkDrawer`，升级为常驻面板）。
- **可重现性徽章**：每个计算器顶部显示 ✓ Reproducible / 单元测试覆盖率 / 闭式解校验通过。

## 三、技术与体验小项（横切）

- **国际化补全**：英文翻译目前覆盖率低，补齐 zh/en 双语，新增 `/en` 路由前缀，对标全球受众。
- **SEO**：每个工具页独立 meta + JSON-LD `SoftwareApplication` schema；策略库走 `Article` schema。
- **性能**：首页 LCP 优化（HeroSection 字体 preload、移除装饰渐变在低端机），目标 Lighthouse 95+。
- **键盘导航增强**：`g s` 跳 strategies、`g n` 新 notebook，对标 Linear / GitHub。
- **暗色模式微调**：金色辅色在长时间阅读时略刺眼，增加「Reading Mode」（降饱和 + 行距加大）。
- **PWA + 离线**：核心计算器离线可用（纯客户端算法，无需后端）。

## 四、建议的执行顺序（4 个迭代）

```text
Sprint A (1-2 周):  策略库 v1 (12 个策略卡) + 论文索引页 + ticker 条
Sprint B (1-2 周):  Reactive Notebook v2 + Fork/保存到云
Sprint C (1 周):    评论系统 + 作者主页 + 学习徽章
Sprint D (1 周):    SEO + i18n 补齐 + Reading Mode + PWA
```

## 五、需要您确认

请挑选**优先做哪一条主线**（或允许我按 Sprint A → D 全量推进）：

1. **内容深度优先** — 先做策略库 + 论文索引（差异化最大，对标 QuantPedia）
2. **交互优先** — 先做 Reactive Notebook（最酷炫，对标 Observable）
3. **社区优先** — 先做评论 + 作者主页（对标 Wilmott，但需要冷启动用户）
4. **全量按 Sprint A→D 执行**

也欢迎告知您最想对标的那一个站点，我会把方案进一步聚焦。

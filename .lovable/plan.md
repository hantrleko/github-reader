# V6.6 提升方案：为「从 X 进来的第一次访客」优化落地体验

上一轮改的是分享卡片、行情带、片头、标题文案——都是入口层。这一轮建议往里走一层：新访客真正落到页面之后的前 30 秒。

## 一、双语一致性（最优先，已核实）

首页 Hero 已经走 i18n，但下面的内容仍是硬编码中文：

- `src/pages/Index.tsx`：`editorialPillars` 三段（先建立理论语言 / 再进入交互实验 / 最后沉淀研究资产）、Editorial Briefing 标题与正文、Directory 的标题与副标题，全部写死中文。
- `src/components/SiteFooter.tsx`：品牌描述、「板块导航」「快速链接」「返回顶部」、版权行，以及 `navLinks` 里六个中文板块名，全部写死中文。

结果：英文访客把语言切到 EN，标题是英文，往下滚全变中文。建议把这些字符串迁进 `en.json` / `zh.json`，与 Hero 同一套 key 规范。

## 二、首屏信息密度：把「目录」提前

首页目前顺序是 Hero → 工具条 → 编辑导读 → 今日推荐 → 主题卡 → 模型展示 → Notebook → 工作流 → 板块目录，第一次来的人要滚过 7 个板块才看到「这站到底有什么」。

建议：

- 在 Hero 下方直接放一排 10 个一级域入口（复用 `NAV_GROUPS` 与 `/d/:groupId`），一屏内让人看懂全站范围。
- 把 Editorial Briefing 与 ModelShowcase 合并/压缩为一段，减少同质化的「介绍性」板块。
- 完整的 56 项 Directory 保留在页面底部作为详表。

## 三、单页入口体验

新访客大多是从 X 的链接直接落到某个 `/s/:id`，而不是首页。建议每个板块页顶部补一条统一的定位条：

```text
[域名] › [板块名]     难度：基础/进阶/前沿
一句话：这个页面回答什么问题
建议先看：<prereq 链接>      同域相关：<2-3 个链接>
```

`level` 与 `prereq` 字段在 V6.3 已经写进 `sections.ts`，但目前只在学科主线页用到，板块页本身没有渲染。

## 四、页面模板：「怎么读这张图」

之前提过、尚未落地的一条：各实验室面板只有「参数 + 图」，缺「怎么读」与「常见误用」。建议先给流量最大的 6 个页面（Black–Scholes、隐含波动率、Qlib 实验室、有效前沿、VaR、TradingView 筛选器）各补两段固定文案，验证效果后再铺开。

## 五、性能与首屏加载（需先测量）

首页当前一次性挂载 8 个重组件（含 Framer Motion 与 Recharts 相关子树）。是否真的拖慢首屏尚未测量——建议第一步先跑一次构建产物体积与首屏渲染测量，再决定是否对 ModelShowcase / FeaturedNotebooks / Directory 做懒加载与代码分割，不凭猜测改结构。

## 技术说明

- i18n 迁移：新增 `home.briefing.*`、`home.directory.*`、`footer.*` 命名空间；`scripts/check-copy-consistency.ts` 会校验 zh/en 键一致。
- 域入口排：复用 `sectionsByGroup()` 已有数据，新增 `src/components/DomainStrip.tsx`，不改 `SECTIONS` 数据形状。
- 板块页定位条：在 `SectionPage.tsx` 统一渲染，读 `SectionDef.level` / `prereq`，缺字段则不渲染，向后兼容。
- 版本号统一到 V6.6，同步 `CHANGELOG.md` 与首页最新更新卡片。

## 建议顺序

先做第一部分（双语一致性）——这是英文访客当下最直接的断点；再做第二、第三部分；第四部分按页面逐个补；第五部分先测量再决定。

# 功能强化方案

围绕你选定的三个方向落地:**工具深度与互联**、**真实数据与场景**、**工程优化**。已对齐现有模式(`RealDataLoader`、`calcToNotebook`、`calcHistory`、`CategorizedToolNav`、`marketData` 边缘函数)。

---

## 方向一:工具深度与互联

让 50+ 工具从「孤岛」变成「工作流」。

### 1. 跨工具数据总线(Tool Bus)
现状:`RealDataLoader` 能把 `{S0, σ, μ}` 注入单个计算器,但工具之间无法传值。

- 新建轻量全局 store(`src/lib/toolBus.ts`,Zustand 或 Context),保存「最近一次关键输出」:如 BS 的 σ、IV 的隐含波动率、GARCH 的预测波动率、债券的收益率曲线、有效前沿的协方差矩阵。
- 每个工具结果区加一枚 **「↗ 发送到…」** 按钮:把当前输出推入总线并跳转到目标工具,目标工具开场即预填。
- 典型链路:`IV → SVI 曲面`、`GARCH 预测 σ → BS/MC 定价`、`有效前沿协方差 → Risk Parity`、`利率模型曲线 → 债券定价`、`Merton PD → 信用组合 Copula`。
- 复用 `toolsCatalog.ts` 已有的 `related` 字段驱动「可发送目标」列表。

### 2. 对比模式(Compare Mode)
- 通用 `CompareTray` 组件:同一工具不同参数集并排对比(2–3 列),指标差异高亮(↑↓ 色标)。
- 数据源直接复用 `calcHistory` 的收藏项 —— 勾选两条历史即可对比。

### 3. 结果导出增强
- 扩展 `calcToNotebook`:把总线传入的真实数据序列一并写入 Notebook seed(目前只带参数滑块)。
- 每个工具增加 **「复制为 Markdown / 截图」**:输出结果表 + 公式 + 引用(复用 `citations.tsx`),便于贴入报告。

### 4. 「场景剧本」串联
- 在 `toolsCatalog` 之上新增 `workflows.ts`:把若干工具按教学/实务顺序串成一条剧本(如「期权做市台:IV→SVI→Greeks Desk→对冲」)。
- `/tools` 页新增「工作流」标签页,点击逐步走查。

---

## 方向二:真实数据与场景

把现有 Yahoo/FRED/World Bank 数据源做深。

### 1. 数据源扩展与统一
- 现有边缘函数:行情(Yahoo)、FRED、World Bank;已配置 `ALPHAVANTAGE_API_KEY`、`FRED_API_KEY`。
- 新增/增强边缘函数:基本面(AlphaVantage overview/财报)、多资产批量行情(组合类工具用)、收益率曲线(FRED 多期限国债一次拉取喂给利率/债券工具)。
- `RealDataLoader` 升级为 `DataPanel`:支持多标的、显示数据质量(样本数/区间/缺失)、一键切换数据源。

### 2. 自选清单 / 组合持久化
- 新表 `watchlists`(`user_id, symbols[], name`)+ 完整 RLS + GRANT。
- 组合类工具(有效前沿、Risk Parity、回测、压测)可保存/载入组合,登录后云端同步(复用现有 `cloudStore`)。

### 3. 实时校准
- 「用真实数据校准模型」:GARCH/Heston/SABR/Vasicek 直接以拉取的历史序列估参,并展示拟合优度。
- 校准结果可经**方向一的数据总线**直送定价工具。

### 4. 案例数据集库
- `src/data/datasets/` 内置精选数据集(2008 危机、2020 疫情、2022 加息),离线可用、可复现教学。
- 工具的预设系统(记忆要求的 textbook/market 预设)增加「历史场景」预设组。

---

## 方向三:工程优化

### 性能
- 审计首屏 LCP:`index.html` 预加载关键资源;Hero 图走 `vite-imagetools` 转 AVIF/WebP。
- recharts 已升级到 3.x —— 复核大图表的 `ResponsiveContainer` 与重渲染,重计算用 `useMemo` + 必要时 web worker(MC/LSM 路径模拟)。
- 路由已 lazy;补充 `toolsCatalog`/`sections` 的按需预取(hover 预取下一节)。

### 可访问性(a11y)
- 工具 tab/滑块补 `aria-label`、键盘可达;焦点环统一走设计 token。
- 图表加文本替代(数据表 `<caption>` / `aria-describedby`)。

### SEO
- 每个 `/s/:sectionId`、`/tools`、`/glossary` 用 `Seo.tsx` 补齐 title(<60)/desc(<160)/canonical + JSON-LD(`LearningResource` / `SoftwareApplication`)。
- 复核 `sitemap.xml` 覆盖全部 section 路由。

### 测试
- 现有 `src/lib/quant/__tests__` 已有数值基准测试;补充 `toolBus`、`calcToNotebook`、`watchlists` 序列化的单测。
- 关键工具加 1–2 个渲染冒烟测试(vitest + RTL)。

### 移动端
- 两级 `CategorizedToolNav` 在窄屏改为横向滚动 chips + 下拉;终端式侧栏指标在移动端折叠为可展开面板。

---

## 实施顺序(建议)

```text
阶段 1  工具总线 + 对比模式 + 导出增强   ← 互联立刻见效,纯前端
阶段 2  数据面板升级 + 自选/组合持久化(建表+RLS) + 实时校准
阶段 3  案例数据集库 + 场景剧本/工作流页
阶段 4  工程优化:性能审计 / a11y / SEO / 测试 / 移动端
```

## 技术要点
- 数据总线:`src/lib/toolBus.ts`(Zustand,已在依赖中)+ 各工具结果区 hook 注入。
- 持久化:新增 `public.watchlists`,迁移内含 `GRANT` + RLS(`auth.uid()` 作用域);云同步复用 `cloudStore.ts`。
- 边缘函数:沿用现有 `marketData.ts` 调用约定与 CORS;新增函数 `verify_jwt=false` 默认即可。
- 不改动自动生成文件(`client.ts`/`types.ts`/`.env`/`config.toml`)。

---

先确认范围与优先级,我建议从**阶段 1(工具互联,纯前端、风险低、体验提升最直接)**开始落地。你也可以指定先做某一阶段或某条具体链路。
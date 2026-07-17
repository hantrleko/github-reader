
# V4.4 · External Data Ecosystem Integration

把用户列出的 10 个外部资源按"可否直接取数"分成三层，全部收敛进 `/s/data`（Data Hub），既有可交互的数据浏览器，也有精选的外链工作台，避免堆砌无用超链接。

## 分层策略

### Tier A — 直接接数据 API（新增 Edge Function + Explorer）
这些站点提供公开/半公开 API，可以做成和现有 `FredExplorer / CoinGeckoExplorer / AlphaVantageExplorer` 同款的交互卡片。

1. **FRED（已存在）** — 复用 `FredExplorer`，在新的"宏观数据宝库"分组中作为锚点。
2. **Cboe 市场情绪** — 通过既有 `market-quotes` (Yahoo) 拉 `^VIX / ^VIX9D / ^VVIX / ^SKEW`，新建 `CboeSentimentExplorer.tsx`：
   - VIX Term Structure（9D vs 30D 曲线，判断 contango/backwardation）
   - VIX vs SKEW 双轴时序
   - Put/Call Ratio：Cboe 无免费实时 API，用 FRED 代理序列 `CPCE`（Equity Put/Call）+ 静态外链回落
3. **Trading Economics 日历** — 免费 API 只允许 guest key 查 `country=mexico,sweden`。方案：
   - 新建 `econ-calendar` Edge Function：优先尝试 TE guest 端点，失败/受限时回退到 `nfp.fyi` 的 ICS 或 `investpy` 静态列表
   - `EconCalendarPanel.tsx`：本周 7 日 CPI/NFP/GDP/FOMC 事件表，含重要性星级、上次值、预期值
   - 若限流则显示"下一次 FOMC/CPI 公布倒计时"+ TE 外链
4. **Quiver Quantitative** — 有免费层但需登录 key。方案：先做 **只读概览**（Congress trading top-10、WSB mentions top-10），通过 `quiver-signals` Edge Function 请求；若用户后续提供 key 存 `QUIVER_API_KEY`，否则组件降级为"需要配置 API Key"占位 + 外链。

### Tier B — 结构化数据但需要抓取（爬取 + 缓存）
5. **ETF Database (etfdb.com)** — 无公开 API。新建 `etf-lookup` Edge Function：
   - 用户输入 ticker（SPY/QQQ/...），后端抓 etfdb.com 的 `/etf/{TICKER}/` 页解析费率、AUM、YTD、Top Holdings
   - 4 小时缓存进 `edge_kv`（用 in-memory Map + timestamp，避免加表）
   - `EtfLookupCard.tsx`：单只 ETF 详情 + 对比模式（最多 3 只并排）
6. **Finviz Heatmap** — Finviz 反爬严格。方案：不做抓取，做 **Sector Heatmap 自制版**：用现有 `market-quotes` 拉 11 个 SPDR sector ETF (`XLK/XLF/XLE/...`) 的 1D/1W/1M 涨跌，用 D3-style treemap（`recharts` Treemap）绘制，视觉对齐 Finviz 但数据自采；页脚保留 Finviz 外链。
7. **CompaniesMarketCap** — 无 API 且反爬。方案：静态维护 Top-50 全球公司 JSON（`src/data/topMarketCap.ts`，每季度手更）+ 用 Alpha Vantage `OVERVIEW` 端点在用户点击时刷新单只市值。做成 `MarketCapRanking.tsx` 排行榜。

### Tier C — 精选外链工作台（不抓数据，只做导航）
剩下的站点更适合作为"深度分析目的地"：**StockAnalysis / Koyfin / Seeking Alpha / Finviz screener** 等。做一个 `ExternalWorkbench.tsx` 卡片墙：
- 每张卡片：Logo、一句话中文说明、"擅长做什么"标签（基本面初筛/多空观点/横向对比…）、直接跳深链模板（如 `stockanalysis.com/stocks/{ticker}/financials/`）
- 支持用户在顶部输入 ticker 后，所有卡片的链接自动带上该 ticker → 一键跨站研究工作流
- 与 Tool Bus 打通：读取当前 `selectedTicker`

## Data Hub 页面结构（`/s/data`）

```text
Data Hub
├─ Section 1 · 宏观数据宝库
│    ├─ FredExplorer            (已有)
│    ├─ EconCalendarPanel       (新, Trading Economics)
│    └─ WorldBankExplorer       (已有)
├─ Section 2 · 市场行情 & 情绪
│    ├─ CboeSentimentExplorer   (新, VIX/SKEW/PCR)
│    ├─ SectorHeatmap           (新, Finviz-style)
│    └─ AlphaVantageExplorer    (已有)
├─ Section 3 · 公司 & ETF
│    ├─ EtfLookupCard           (新, ETF Database 抓取)
│    ├─ MarketCapRanking        (新, CompaniesMarketCap)
│    └─ CoinGeckoExplorer       (已有)
├─ Section 4 · 另类数据
│    └─ QuiverSignalsCard       (新, 需可选 API key)
└─ Section 5 · 外部分析工作台
     └─ ExternalWorkbench       (新, StockAnalysis/Koyfin/SA/Finviz 深链墙)
```

Navbar / CommandPalette / `toolsCatalog.ts` 同步增加子锚点，可直接跳到某个 Section。

## 技术细节

**新增 Edge Functions**（全部走 corsHeaders + 8s AbortController + 内存缓存，与既有 fred-series 模式一致）：
- `supabase/functions/econ-calendar/index.ts`
- `supabase/functions/etf-lookup/index.ts`（HTML parse via regex on cheerio-free deno DOMParser）
- `supabase/functions/quiver-signals/index.ts`（读取可选 `QUIVER_API_KEY`，未配置时返回 `{configured:false}`）

**新增前端文件**：
- `src/components/data/CboeSentimentExplorer.tsx`
- `src/components/data/EconCalendarPanel.tsx`
- `src/components/data/EtfLookupCard.tsx`
- `src/components/data/SectorHeatmap.tsx`
- `src/components/data/MarketCapRanking.tsx`
- `src/components/data/QuiverSignalsCard.tsx`
- `src/components/data/ExternalWorkbench.tsx`
- `src/data/externalWorkbenchLinks.ts`（Tier C 卡片配置）
- `src/data/topMarketCap.ts`（Top-50 静态种子）
- `src/lib/marketData.ts` 追加 `useCboeSentiment / useEconCalendar / useEtfLookup / useQuiverSignals` hooks

**页面级改动**：
- `src/pages/SectionPage.tsx`：`data` section 改为渲染上面 5 段的 tab / anchored sections
- `src/components/Navbar.tsx` + `CommandPalette.tsx`：新增子菜单锚点
- `src/data/toolsCatalog.ts`：登记新工具，让全站搜索能命中"ETF 查询""经济日历"等关键词

**版本**：更新到 **V4.4**，`Changelog.tsx` / `CHANGELOG.md` / `HeroSection` i18n 同步。

## 已知取舍
- Trading Economics 免费 API 限量，如果 guest key 拒绝，则回退为静态 FOMC/CPI 时间表；组件仍可用。
- Finviz、Seeking Alpha、StockAnalysis、Koyfin 服务条款禁止抓取，只做外链，不采数据。
- Quiver 未配置 key 时组件不隐藏，而是显示"配置后启用"引导，避免破坏布局。

需要我按这个方案直接进入构建吗？如果你希望砍掉 Tier B/C 的某一块（比如不做 ETF 抓取，只保留外链），告诉我我调整后再执行。

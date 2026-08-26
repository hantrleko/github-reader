# V6.4 · TradingView Screener 集成

把 GitHub 上的 `tvscreener` 能力以「零 API Key、直接在浏览器可用」的方式接入站点：在 Lovable Cloud Edge Function 里复现它对 TradingView Screener 的 HTTP 调用，前端提供跨市场筛选面板。

## 为什么用 Edge Function 而不是直接跑 Python

`tvscreener` 是 Python 库，项目 Deno Edge Function 无法直接执行它。但它本质上只是对 TradingView 公开 scanner 端点 `https://scanner.tradingview.com/<market>/scan` 的封装。新功能将用 TypeScript/Deno 复现同样的请求体与响应解析，保持与现有 `us-screener`、`coingecko-series` 等数据源一致的架构。

## 新增后端

1. **Edge Function: `supabase/functions/tv-screener/index.ts`**
   - 入口：`POST /tv-screener`（CORS 预检同现有函数）。
   - 参数：
     - `market`: `america` | `forex` | `crypto` | `bond` | `futures`
     - `columns`: 字段数组，默认 `["name","close","change","volume","market_cap_basic"]`
     - `filters`: TradingView 风格的 filter 对象数组
     - `sortBy`, `sortOrder`, `range[0]`, `range[1]`
     - `search`: 对 `name` / `description` 的模糊过滤
   - 行为：构造 JSON body 调用 `https://scanner.tradingview.com/${market}/scan`，解析 `data[].d` 数组，按列名映射成结构化行返回。
   - 错误处理：上游 429/5xx 时降级提示，返回可读错误。
   - 在 `supabase/config.toml` 增加 `[functions.tv-screener] verify_jwt = false`。

## 新增前端

2. **Typed hook: `src/lib/tvScreener.ts`**
   - 复刻 `src/lib/usData.ts` 的 `callFn` + `useQuery` 模式。
   - 导出类型：`TvScreenerRow`, `TvScreenerResponse`, `TvMarket`, `TvFilter`。
   - 导出 `useTvScreener(market, columns, filters, sort, range, search)`。

3. **UI 组件: `src/components/data/TvScreenerSuite.tsx`**
   - 布局参考 `USSuite.tsx` 的 screener tab，但独立成页。
   - 控件：
     - 市场切换（股票 / 加密 / 外汇 / 债券 / 期货）
     - 预设筛选（市值 Top 100、涨幅榜、成交量榜、高波动、高股息等）
     - 自定义字段选择器（支持 130+ 常用字段的子集，避免一次性展示全部）
     - 排序与分页
   - 表格：虚拟滚动或分页，显示字段值并做格式化（价格、百分比、大数缩写）。
   - 动作：刷新、CSV 导出、复制选中 symbol、跳转到 TradingView 原始页面。

4. **站点注册**
   - 在 `src/lib/sections.ts` 新增 `id: "tv-screener"`，`chapter: "Data"`，`kicker: "TradingView Screener"`，`group: "数据源"`。
   - 加入 `LEVELS.data` 与 `NAV_GROUPS[7]`（数据域）的 `items` 列表。
   - 在 `scripts/generate-sitemap.ts` 加入 `/s/tv-screener`。

5. **多语言与文案**
   - 在 `src/i18n/locales/zh.json` 与 `en.json` 的 data 命名空间下添加 TradingView Screener 标签与描述。
   - 更新首页「最新更新」为 V6.4 文案，突出跨市场筛选能力。

6. **版本与日志**
   - 版本号升至 `6.4.0`。
   - 在 `CHANGELOG.md` 与 `src/lib/appVersion.ts` 新增 V6.4 条目。

## 验证

- `bunx tsgo` 或 `bun run build` 通过。
- `bunx vitest run` 全绿（至少保持现有测试通过；新增 tv-screener 响应解析单元测试可选）。
- `bunx tsx scripts/check-copy-consistency.ts` 通过。
- 部署 edge function 后，在 `/s/tv-screener` 页面能正常加载股票、加密、外汇三个市场的默认结果。

## 范围外（不做）

- 不引入 Python runtime 或 Pyodide 来直接跑 `tvscreener`。
- 不保存用户自定义筛选器到后端（仅本地状态）。
- 不接入需要登录的 TradingView 高级字段。

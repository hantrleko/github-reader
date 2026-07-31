## 目标

参照已有的 A 股全栈板块（V5.0），把 `global-stock-data` 的美股数据能力以同样的架构有机接入本站，并把全站版本升到 **V5.2**（含首页开屏动画处的版本号）。

## 一、新增 Edge Functions（零密钥、公开数据源）

按合规分级优先取用官方源（tier S 优先，其余标注"个人研究"）：

| 函数 | 数据源 | 输出 |
| --- | --- | --- |
| `us-quote` | Yahoo chart（Stooq 备援） | 实时价/涨跌/日K（OHLCV）+ 本地计算 MA/EMA/MACD/RSI/KDJ/布林 |
| `us-fundamentals` | SEC XBRL `companyconcept`/`companyfacts` + Yahoo quoteSummary | 三大报表要点、关键指标（PE/PB/ROE/毛利率等） |
| `us-filings` | SEC EDGAR submissions + 全文检索 | 10-K/10-Q/8-K/Form 4 列表，含直达链接 |
| `us-options` | Yahoo options（自动 crumb），CBOE 只做延迟只读快照 | 期权链、IV、到期日、成交量/OI 比值（异动标记）；本地 BS 反解 Greeks |
| `us-screener` | SEC EDGAR frames | 单个 XBRL 标签的全市场横截面排名（免费筛选器） |

统一实现要点（沿用 `ashare-*` 的模式）：CORS 头、多 host 回退重试（避免 TLS EOF 500）、SEC 请求带声明式 User-Agent 并限速 ≤8 req/s、`verify_jwt = false` 写入 `supabase/config.toml`（这是 V5.0 踩过的坑）。

## 二、前端：US Suite 工作台

新建 `src/components/data/USSuite.tsx`，五个页签，风格与 `AShareSuite.tsx` 一致（SectionHeader + ChartTheme + Recharts + 刷新/错误态）：

1. **行情与技术面** — 价格头卡、日K + 均线、MACD/RSI 副图，支持 Brush 联动
2. **基本面** — SEC XBRL 三表摘要 + 关键指标卡 + 多标的横向对比
3. **披露流** — 最近备案列表（表单类型过滤）+ 全文检索框
4. **期权** — 到期日选择、链表、IV 微笑曲线、0DTE 与异动高亮
5. **全市场筛选** — XBRL 标签 + 期间选择，输出排名表（可导出 CSV）

配套：`src/lib/usData.ts`（react-query hooks，沿用 `marketData.ts` 的 `callFn` 风格）、每个页签底部标注数据源与合规层级。

## 三、与现有系统的有机连接

- 顶部 ticker 输入接入 **Tool Bus**：拉到的 σ / μ / 价格可一键送入 Black-Scholes、隐含波动率、回测引擎、组合优化
- 期权页签的链数据可直接"送到"隐含波动率与 SABR/Heston 校准实验室
- SEC 收益日历/披露流与 `EconCalendarPanel` 并列在「数据源」组

## 四、注册与导航

- `src/lib/sections.ts` 新增 `us-suite`（chapter `V5.2`，group `数据源`）
- `Navbar.tsx` 数据源下拉 + `zh.json` / `en.json` 文案
- `toolsCatalog.ts` 收录新工具条目

## 五、版本号统一到 5.2（多处更新点）

- `package.json` → `5.2.0`（Vite 注入 `__APP_VERSION_TAG__`，Navbar/Footer 徽章自动跟随）
- `HeroSection.tsx` + i18n 的「最新更新」文案改写为 V5.2 美股全栈
- **`SplashIntro.tsx` 开屏加载界面**加入 `VersionBadge`（改为从构建常量读取，杜绝再次不同步）
- `Changelog.tsx` 与 `CHANGELOG.md` 新增 V5.2 条目
- 全仓检索残留的硬编码 "V5.0/V5.1" 字样并清理

## 技术说明

- 全部数据经 Edge Function 代理，浏览器不直连第三方（绕过 CORS + 隐藏 UA 细节）
- 技术指标与 Greeks 在前端/函数内用纯 TS 计算，不引入新依赖
- 页面底部加合规声明：Yahoo/CBOE/Nasdaq 属个人研究用途，SEC/Treasury/CFTC 可商用
- 新增 `src/lib/quant/__tests__` 下的技术指标单测（MACD/RSI/布林），保证数值正确

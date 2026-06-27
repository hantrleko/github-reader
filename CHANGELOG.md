# EF Lab 版本日志

## V3.3 — 互联层收尾 (对比模式 + 工作流)

### 新增

- **A/B 对比模式**:模型计算器 (Black-Scholes / VaR·ES / CAPM / Sharpe) 新增对比面板,A 为实时参数、B 可独立编辑,差异表用 ↑↓ 与色标标注变化;通用组件 `CompareDiff` / `CompareToolbar` (`src/components/common/CompareToggle.tsx`),默认折叠零影响。
- **研究工作流页** (`/workflows`, `src/data/workflows.ts`):4 条剧本——期权做市台 (IV→SVI→Greeks→MC)、利率到债券、组合构建、信用风险链;每步含工具说明与 Tool Bus 变量徽章,支持「打开」直达与「从第一步开始」。
- 工具目录页、导航 More 菜单与 sitemap 同步收录工作流入口。

### 变更

- 全站版本号同步至 **V3.3**,V3.2 标记为 Stable。至此 Phase 1『工具互联』完成。

## V3.2 — 工具互联层 (Tool Bus)

### 新增

- **Tool Bus 跨工具参数直传** (`src/lib/toolBus.ts`):依赖无关的全局总线,以 `useSyncExternalStore` 维护 S₀/σ/r/T/K/μ 等规范变量,并镜像到 sessionStorage。
- **「发送到…」下拉** (`src/components/common/SendToTool.tsx`):把当前工具输出推上总线并跳转到相关工具自动预填,接收端落地后弹出确认 toast。
- 已打通 **隐含波动率 ↔ Black-Scholes ↔ 蒙特卡洛 ↔ Greeks Desk** 四工具回路;打开衍生品页若总线携带期权参数会自动定位到 Greeks 工作台。
- **Markdown 报告导出**:`ShareExportToolbar` 新增「复制 MD」,把工具输入与关键输出整理为可直接粘贴的 Markdown 片段(隐含波动率工具率先接入)。

## V3.1 — 分类导航 · 模型补足 · 安全加固

### 新增

- **两级分类导航** (`CategorizedToolNav`):计量经济学 29 个工具分 5 类,衍生品 11 个工具分 3 类,内嵌搜索;首页导航子菜单同步更新。
- **模型补足**:Fama-MacBeth(Shanken 修正)、CRR 二叉树收敛、极值理论 EVT/POT、关键利率久期 KRD、单位根检验 (ADF/KPSS)、Walk-Forward 样本外检验;前沿实验室四张概念卡升级为互动工具。
- 核心算法抽取至 `src/lib/quant/extraModels.ts` 并配套单元测试,新增 10 个工具标记 `verified`。

### 变更

- 升级 `@supabase/supabase-js`、`react-router-dom`;`recharts` 升至 v3(移除 lodash);`package.json` overrides 锁定 ws/lodash,依赖扫描归零高危项。
- 精简研究运营类冗余板块 (Research Ops Board / Playbooks / Decision Memo)。

## 0.10.0 — 多页面架构重构

### 变更

- **每个功能板块独立成页**:原本的"单一超长页面 + 锚点滚动"改为按路由分页。点击导航直接进入该功能的专属页面(`/s/:sectionId`),只渲染单一板块,不再定位到长页面的某个位置。
  - 新增板块注册表 `src/lib/sections.ts`(板块元数据 + `sectionHref` 路由解析工具)。
  - 新增单板块页面 `src/pages/SectionPage.tsx`:含返回首页链接、章节标题头、上一/下一板块导航与独立 SEO。
  - 新增可复用页脚 `src/components/SiteFooter.tsx`。
  - 着陆页(`/`)精简为 Hero / 简介 / 主题 / 模型 / 精选 Notebook,并新增"功能板块目录"网格。
  - 导航栏改为路由跳转,active 高亮基于当前路由(移除滚动监听 scrollspy)。
  - 同步更新 HeroToolStrip、ResearchPlaybooks、TodaysPick、HeroSection、LearningPath、CommandPalette、TopicDetail 的入口链接,统一指向新页面路由。

## 0.9.0 — Alpha Vantage 个股与外汇数据源

### 新增

- **Alpha Vantage 数据浏览器** (`src/components/data/AlphaVantageExplorer.tsx`)
  - 接入 Alpha Vantage API,覆盖美股日线行情与外汇汇率两大维度。
  - 精选标的按主题分组:美股科技(AAPL/MSFT/NVDA/GOOGL)、宽基与蓝筹(SPY/QQQ/JPM/BRK.A)、外汇货币对(EUR/USD、GBP/USD、USD/JPY、USD/CNY)。
  - 支持自定义股票代码查询(回车或搜索按钮)。
  - 区间窗口切换(3M/6M/1Y/MAX),自动计算年化波动率与区间涨跌。
  - 每个序列附直达 Alpha Vantage 官方文档的外部链接。
  - 新增边缘函数 `supabase/functions/alphavantage-series`,统一代理并清洗 `TIME_SERIES_DAILY`(个股)与 `FX_DAILY`(外汇),并显式处理免费版限流(5 次/分钟、25 次/天)与错误响应。
  - API Key 经 `ALPHAVANTAGE_API_KEY` 密钥安全存储,仅在后端边缘函数中使用,不暴露给前端。
  - 「数据源」导航分组新增 Alpha Vantage 入口及中英文本地化词条。

## 0.8.0 — CoinGecko 加密资产数据源

### 新增

- **CoinGecko 加密市场浏览器** (`src/components/data/CoinGeckoExplorer.tsx`)
  - 接入 CoinGecko 公共 API,免费、无需 API Key,提供历史价格、市值与成交量。
  - 精选币种按主题分组:主流币(BTC/ETH/BNB/SOL)、稳定币(USDT/USDC)、生态与应用(XRP/ADA/DOGE/LINK)。
  - 区间窗口切换(1M/3M/6M/1Y/MAX),自动计算年化波动率与区间涨跌。
  - 每个币种附直达 CoinGecko 官方详情页的外部链接。
  - 新增边缘函数 `supabase/functions/coingecko-series`,代理并清洗 CoinGecko market_chart 数据。
  - 「数据源」导航分组新增 CoinGecko 入口及中英文本地化词条。

## 0.7.0 — ECB / BIS 央行数据源

### 新增

- **ECB / BIS 数据浏览器** (`src/components/data/EcbBisExplorer.tsx`)
  - 接入欧洲央行(ECB Data Portal)与国际清算银行(BIS Stats)开放数据,免费、无需 API Key。
  - ECB:主要再融资/存款便利/边际贷款政策利率、欧元参考汇率(USD/GBP/JPY/CNY)、HICP 总体与核心通胀。
  - BIS:美/欧/英/日/中各国政策利率、信贷/GDP 缺口、住宅地产价格指数、美元名义有效汇率。
  - 区间窗口切换(2Y/5Y/10Y/20Y),实时显示最新值与区间涨跌。
  - 每个序列附直达 ECB / BIS 官方页面的外部链接。
  - 新增边缘函数 `supabase/functions/ecb-bis-series`,统一解析 ECB(SDMX-JSON v1)与 BIS(SDMX-JSON v2)。
  - 「数据源」导航分组新增 ECB / BIS 入口及中英文本地化词条。

## 0.6.0 — 全球数据源拓展

### 新增

- **World Bank 全球发展指标浏览器** (`src/components/data/WorldBankExplorer.tsx`)
  - 接入世界银行公开数据库（World Bank Open Data，免费、无需 API Key）。
  - 15+ 精选指标按主题分组：增长产出、通胀货币、贸易外部、人口社会。
  - 支持最多 5 个经济体的横向时间序列对比（14 个主要经济体可选）。
  - 使用 Recharts 多线图可视化，自动对齐年份并连接缺失值。
  - 每个指标提供直达 World Bank 官网详情页的外部链接。
  - 新增边缘函数 `supabase/functions/worldbank-series`,代理并清洗 World Bank API 数据。
  - 「数据源」导航分组新增 World Bank 入口及中英文本地化词条。

## 0.5.0 — 数据源与前沿拓展

### 新增

- **FRED 宏观数据浏览器** (`src/components/data/FredExplorer.tsx`)
  - 集成圣路易斯联储 FRED API，支持 20+ 精选宏观指标（10Y 国债收益率、CPI、失业率、VIX 等）。
  - 按宏观主题分组（利率、通胀、就业、市场波动、货币、增长）。
  - 使用 Recharts 可视化历史走势，支持 1Y / 3Y / 5Y / 10Y 时间窗口切换。
  - 实时计算最新值、日期、区间涨跌幅（绝对值 + 百分比）。
  - 每个指标提供直达 FRED 官网详情页的外部链接。
  - 新增导航栏「数据源」分组及对应中英文本地化词条。

- **前沿章节深度拓展** (`src/components/FrontierConcepts.tsx`)
  - 7 大前沿方向（AI/ML 量化、ABM 多主体、GNN 网络、气候金融、神经 SDE、DeFi、CBDC）均新增可展开的交互式详情卡片。
  - 每张卡片包含：方法论、数学直觉（含 LaTeX 公式与推导说明）、应用场景、局限与争议。
  - 使用 Framer Motion `AnimatePresence` 实现平滑展开/收起动画。

### 改进

- **工具目录补全**
  - 资产定价、微观经济学、宏观经济学、风险管理四大板块新增多款交互式计算器与教学组件。
  - 所有计算器均内置「教材场景 / 市场场景」参数预设系统。

### 安全

- **数据库权限收紧**
  - 撤销 `PUBLIC`、`anon`、`authenticated` 对触发器专用 `SECURITY DEFINER` 函数的 `EXECUTE` 权限，消除 linter 0029 误报。
  - 文档化 `award_badge` RPC 的安全设计意图（基于 `auth.uid()` 的身份验证、严格的 slug 白名单、服务端资格校验）。

---

## 0.4.0 — 风险管理与计量工具

### 新增

- **VaR / ES 计算工具** (`src/components/risk/VaRTool.tsx`)
  - 支持参数法（方差-协方差）、历史模拟法、蒙特卡洛法三种计算路径。
  - 可视化收益率分布与风险阈值线。
- **计量经济学交互组件**
  - OLS、IV、GMM、GARCH、Kalman 滤波等模型的参数实验界面。

---

## 0.3.0 — 衍生品与固收工具

### 新增

- **Black-Scholes 期权定价计算器**
  - 实时希腊值（Greeks）计算与图表展示。
  - 隐含波动率反解（Newton-Raphson 迭代）。
- **蒙特卡洛期权定价**
  - 支持路径依赖型奇异期权（亚式、回望、障碍）。
- **固定收益工具集**
  - 债券现金流分析、收益率曲线构建、Vasicek / CIR 短率模型模拟。

---

## 0.2.0 — 平台框架与 Notebook

### 新增

- **Research Playbooks**
  - 论文复现、期权校准、风险简报、互动课程四大场景剧本。
  - 步骤化执行、交付物追踪与完成度仪表盘。
- **Sprint Composer**
  - 按研究者 / 授课教师 / 量化分析师角色自动生成 3/5/10 日行动简报。
- **Evidence Pack Builder**
  - 基于当前剧本与完成度生成可审计交付包。
- **Research Ops Board**
  - Readiness / Evidence / Handoff 三类评分与下一步行动队列。
- **Decision Memo Studio**
  - 一键生成导师评审、课堂复盘、风险委员会汇报用的决策备忘录。

### 基础设施

- Supabase 后端集成（Auth、RLS、Edge Functions）。
- 多语言 i18n 框架（中英文）。
- Playwright E2E 与 Vitest 单元测试套件。

---

## 0.1.0 — 项目启动

### 初始功能

- 首页导览与学科领域卡片（资产定价、衍生品、固定收益、风险管理、计量经济学、宏观模型）。
- Bloomberg Terminal 风格视觉系统（深翠绿 + 金色 + 奶油色）。
- 响应式布局与暗/亮模式支持。

---

## 版本号规则

本项目遵循 **语义化版本**（SemVer）：

- `MAJOR`：不兼容的 API 或数据结构变更。
- `MINOR`：向后兼容的新功能、新模块、新工具。
- `PATCH`：向后兼容的问题修复、性能优化、文案调整。

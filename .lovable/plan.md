

# Sprint 5 补完计划：真实数据接入 + i18n 双语切换

把 Sprint 5 剩余两块一次性做完。版本升至 **V1.2**。

---

## Part A：真实世界数据接入

### 架构
所有外部 API 通过 Lovable Cloud 的 Edge Function 代理，避免 CORS 和密钥泄露；前端用 React Query 缓存 + 失败时回退到合成数据。

```text
[Calculator UI] ──invoke──> [Edge Function] ──fetch──> [Yahoo / FRED / Ken French]
       ↑                          │
       └──── React Query 缓存 ←───┘
```

### 三个 Edge Function

| 函数 | 数据源 | 用途 | 接入工具 |
|---|---|---|---|
| `market-quotes` | Yahoo Finance v8 chart API（公开端点，无需 Key） | 拉股票/ETF 历史日线、隐含波动率链 | BS Pricer, Implied Vol, MC Pricer, Backtester |
| `fred-series` | FRED API（需 API Key） | 国债收益率曲线（DGS1/2/5/10/30）、CPI、失业率 | Vasicek/CIR/HW, GARCH, Kalman |
| `famafrench-factors` | Ken French CSV ZIP（公开） | F-F 5 因子月度数据 | Fama-French 归因工具 |

### 前端集成模式
每个相关计算器顶部新增一个小工具栏：

```text
[ 加载真实数据 ▾ ]  AAPL ▼  [2020-01-01] → [2024-12-31]  [拉取]   状态: ✓ 252 条
```

- 成功 → 数据填入参数，自动重算
- 失败 → toast 提示 + 回退到原合成数据，不阻塞使用
- 加 React Query (`@tanstack/react-query` 已在项目中) 做 5 分钟缓存

### 需要的密钥
- **FRED_API_KEY**：免费申请 https://fred.stlouisfed.org/docs/api/api_key.html，我会在切换到执行模式后通过 `add_secret` 工具向你索取
- Yahoo / Ken French 无需密钥

---

## Part B：i18n 中英双语

### 技术方案
- `react-i18next` + `i18next` + `i18next-browser-languagedetector`
- 翻译文件：`src/i18n/locales/zh.json` 和 `en.json`（按 namespace 拆分：`common`, `nav`, `tools`, `quiz`, `changelog`）
- Navbar 加语言切换按钮（🌐 中 / EN），选择持久化到 localStorage
- 默认根据浏览器语言自动判断，fallback = zh

### 改造范围
| 模块 | 文案量 | 备注 |
|---|---|---|
| Navbar + 6 个分组菜单 | ~30 keys | 全部 key 化 |
| HeroSection / TopicCards / LearningPath | ~80 keys | |
| 12 个计算器的标题/参数标签/按钮/解读卡 | ~600 keys | 主体工作量 |
| QuizSection（17 题题干+解析） | ~200 keys | 题目本身保留中英两版 |
| Changelog | ~80 keys | |
| 公式 LaTeX 不翻译 | — | 数学符号通用 |

### KaTeX 公式处理
公式不动，只翻译公式上下文说明文字。

---

## 文件改动清单

**新建：**
- `supabase/functions/market-quotes/index.ts`
- `supabase/functions/fred-series/index.ts`
- `supabase/functions/famafrench-factors/index.ts`
- `src/lib/marketData.ts`（前端调用封装 + React Query hooks）
- `src/components/RealDataLoader.tsx`（通用数据加载工具栏）
- `src/i18n/index.ts`（i18next 初始化）
- `src/i18n/locales/zh.json`
- `src/i18n/locales/en.json`
- `src/components/LanguageToggle.tsx`

**修改：**
- `src/main.tsx`（引入 i18n + QueryClientProvider — 若未引入）
- `src/components/Navbar.tsx`（加 LanguageToggle，文案 key 化）
- 12 个计算器组件：嵌入 `RealDataLoader` + 文案 key 化
- `src/components/QuizSection.tsx` / `Changelog.tsx` / `HeroSection.tsx` / `TopicCards.tsx` / `LearningPath.tsx`：文案 key 化
- `src/components/Changelog.tsx`：新增 V1.2 条目

**密钥：**
- 启用 Lovable Cloud（如未启用）
- 添加 `FRED_API_KEY`

---

## 实施顺序（任务列表）

1. 启用 Lovable Cloud + 添加 FRED API Key
2. 实现 3 个 Edge Function（market-quotes / fred-series / famafrench-factors）
3. 建 `marketData.ts` + `RealDataLoader` 通用组件
4. 把真实数据接入 12 个计算器（按优先级：BS → Vasicek → Backtest → Fama-French → 其余）
5. 安装并初始化 react-i18next，建 zh/en JSON 骨架
6. 加 LanguageToggle 到 Navbar
7. 全站文案 key 化（按 namespace 分批：common → nav → tools → quiz → changelog）
8. 写 V1.2 Changelog 条目，版本号升级
9. 自测：切换语言、拉数据成功/失败回退、缓存命中

---

## 风险与回退

- Yahoo Finance 非官方 API，可能限流 → Edge Function 加 5 秒超时 + 失败回退合成数据
- FRED 免费 Key 限 120 req/min → React Query 缓存 + 用户手动触发拉取（非自动）
- i18n 工作量大 → 翻译先用准确直译，后续可由你 review 调优；不阻塞功能上线
- 公式 LaTeX 与翻译解耦，零风险


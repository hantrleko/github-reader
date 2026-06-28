# 真实数据回测引擎 + 模型校准实验室

把现有 50+ 工具从"算单点"升级为"用真实数据出参数 / 测策略"。新增两个独立路由板块,完全复用已接入的数据源(Yahoo / CoinGecko / Alpha Vantage)、工具总线(Tool Bus)和量化库,所有数值算法提炼为带单元测试的纯函数。

---

## 板块一:回测实验室(Backtest Lab) · `/s/backtest`

用真实价格序列跑可审计的单标的(+ 基准)策略回测,把"算夏普"升级为"测策略"。

**数据来源**:复用 `useMarketQuotes`(Yahoo)/`useCoinGecko`/`useAlphaVantage`,通过现有的数据加载条选标的与区间,得到日频收盘价。

**内置策略**(参数全部可调,带 textbook/market 预设):
- 买入持有(Buy & Hold)— 基准
- SMA 双均线交叉(快/慢窗口)
- 时序动量(回看窗口 + 持有期)
- 均值回归(滚动 z-score 阈值进出)
- 波动率目标(按目标年化波动调整仓位)
- 等风险贡献 / 风险平价(复用已有 RiskParityTool 逻辑)

**输出指标**:净值曲线 vs 基准、CAGR、年化波动、夏普、索提诺、最大回撤、Calmar、胜率、换手率、暴露时间。回撤区间高亮 + 月度收益热力图(可选)。

**互联**:回测得到的年化波动 σ、漂移 μ 一键推送 Tool Bus(`pushBus`),并提供"发送到…"(SendToTool)到 BS/MC/Greeks。

---

## 板块二:校准实验室(Calibration Lab) · `/s/calibration`

把教学模型用真实行情拟合出参数,从"演示"变"出参数的实战工具"。

**内置校准器**(每个含 LaTeX 公式 + 推导 + 拟合诊断图):
- **GARCH(1,1)** — 对数收益的极大似然估计(MLE),输出 ω/α/β、持续性 α+β、长期年化波动;画条件波动率 vs 已实现波动。
- **EWMA(RiskMetrics)** — 网格搜索最优衰减因子 λ,对比固定 λ=0.94。
- **Vasicek / CIR 短率** — 对真实短率序列(经 FRED/ECB 数据源)做 OLS/MLE 估计 κ、θ、σ。
- **Merton 跳跃扩散** — 矩估计法分离扩散与跳跃成分(λ、跳跃均值/方差)。

**互联**:每个校准器把拟合出的 σ(或 r)推送 Tool Bus,供定价 / 风险工具直接消费,形成"真实数据 → 校准 → 定价"闭环。

---

## 技术实现细节

**纯函数库(带单测)** — 遵循项目"算法入库 + 测试"约定:
- `src/lib/quant/backtest.ts`:策略信号生成 + 净值/指标引擎(`runBacktest(prices, strategy, params)` → equity, metrics)。
- `src/lib/quant/calibration.ts`:`fitGarch11`(Newton/数值优化 MLE)、`fitEwmaLambda`、`fitVasicek`/`fitCIR`、`fitMertonJump`。
- 测试:`src/lib/quant/__tests__/backtest.test.ts`、`calibration.test.ts`(用合成已知参数数据验证拟合可还原)。

**UI 组件**:
- `src/components/quant/BacktestLab.tsx`、`src/components/quant/CalibrationLab.tsx`(复用 `frontier/ui.tsx` 的 Slider/Stat、`common/SectionHeader`、`common/SendToTool`、`PresetButtons`、Recharts 主题、`EquationBlock` 渲染 LaTeX)。

**注册与导航**:
- `src/lib/sections.ts`:新增两个 `SectionDef`(group「量化与学习」)。
- `src/components/Navbar.tsx` 的 More 下拉、`src/data/toolsCatalog.ts`、`scripts/generate-sitemap.ts` + `public/sitemap.xml` 加入新板块。
- `src/data/workflows.ts`:新增剧本「真实数据 → 校准 → 定价 → 回测」串联 calibration→BS→backtest。
- `src/i18n/locales/en.json` & `zh.json`:补全标签与文案。

**版本与日志**:升级到 **V3.4**,同步 `buildVersion.ts`、`HeroSection`、`Changelog.tsx`、`CHANGELOG.md`,记录两大新板块。

```text
真实价格序列 ──> [回测实验室] ──> σ, μ ──┐
真实价格/利率 ─> [校准实验室] ──> σ, r ──┤── Tool Bus ──> BS / MC / Greeks / Bond
                                          └──> 定价回灌 ──> 回测验证
```

## 范围之外(本次不做)
- 多资产组合级回测优化器、交易成本/滑点精细建模(可作为下一阶段)。
- 需要期权链报价的 Heston/SABR 曲面校准(免费数据源不足,暂以已实现波动类校准替代)。
- 数据库持久化回测结果(先用 sessionStorage / 导出,后续可接 Cloud)。
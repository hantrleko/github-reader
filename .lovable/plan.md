# V3.5 — 组合回测与优化引擎(旗舰深化)

把现有 `/s/backtest` 回测实验室从「单标的、无成本」升级为可审计、可对比、可优化的**组合级回测与优化引擎**,作为本轮唯一旗舰功能做透;同时顺带补全校准实验室缺失的短率校准与诊断图。所有数值算法仍提炼为带单元测试的纯函数,完全复用已接入的三大免费数据源与 Tool Bus。

---

## 一、回测引擎进阶(单标的)

在 `src/lib/quant/backtest.ts` 与 `BacktestLab.tsx` 上扩展:

- **交易成本 / 滑点建模**:新增按换手计费的成本模型——单边手续费(bps)+ 滑点(bps),在每次仓位变动 `|Δposition|` 上扣减,净值同时给出毛/净两条曲线与成本拖累(cost drag)指标。
- **多策略对比**:同一标的/区间下并排跑多个策略(买入持有 / 双均线 / 动量 / 均值回归 / 波动目标),输出净值叠加图 + 指标对比表(夏普/卡玛/最大回撤排序),复用 V3.3 的对比表样式。
- **参数网格扫描 + 热力图**:对所选策略的 2 个参数(如双均线快/慢、动量回看/持有期)做网格扫描,以颜色热力图展示某一指标(夏普/CAGR/卡玛),点选格子即把该参数应用到主回测——直观看过拟合与稳健区。
- **月度收益热力图**:把净值日收益聚合成「年×月」收益矩阵,色标渲染,辅助识别季节性与回撤集中期。

## 二、组合级回测 / 优化(核心新增)

新增纯函数库 `src/lib/quant/portfolio.ts` + 新组件区块「组合回测」:

- **多资产载入**:在 PriceSourceBar 基础上支持加多个标的(同源),按交易日对齐取交集、构建收益矩阵。
- **配置方法**(全部可调,带 textbook/market 预设):
  - 等权(Equal Weight)
  - 风险平价 / 等风险贡献(复用 `RiskParityTool` 逻辑迁入纯函数)
  - 最小方差(Min-Variance,带无空头约束的投影梯度)
  - 均值方差 / 切点组合(Mean-Variance,目标收益或最大夏普)
- **再平衡**:按周期(月/季/年)或阈值再平衡,叠加第一部分的交易成本模型。
- **输出**:组合净值 vs 等权基准、权重随时间堆叠面积图、各资产**风险贡献分解**(MCR/PCR)、协方差/相关热力图,以及完整指标(年化收益/波动/夏普/最大回撤/换手)。
- **互联**:组合年化波动 σ、收益 μ 一键经「发送到…」推送 Tool Bus 给 BS/MC/Greeks。

## 三、校准器扩展(支撑性补全)

在 `src/lib/quant/calibration.ts` 与 `CalibrationLab.tsx` 补全 plan 里遗留项:

- **Vasicek / CIR 短率校准**:对真实短率序列(FRED 数据源)做离散 OLS/MLE 估计 κ、θ、σ,输出均值回复速度与长期均值;含 LaTeX 公式与推导。
- **拟合诊断图**:为 GARCH/EWMA 加入残差标准化 QQ 图、ACF(自相关)柱状图与对数似然收敛轨迹,提升「拟合可信度」可视化。
- **互联**:校准出的 σ / r 推送 Tool Bus,延续「真实数据 → 校准 → 定价 → 回测」闭环。

---

## 技术实现细节

**纯函数库(均带单测)**
- `src/lib/quant/backtest.ts`:`runBacktest` 增加 `costBps`、`slippageBps` 参数并返回 gross/net + costDrag;新增 `gridScan(prices, strategy, sweep)` 与 `monthlyReturns(dates, equity)`。
- `src/lib/quant/portfolio.ts`(新):`alignSeries`、`covMatrix`、`equalWeight`/`riskParityWeights`/`minVarianceWeights`/`meanVarianceWeights`、`runPortfolioBacktest`(再平衡 + 成本)、`riskContributions`(MCR/PCR)。
- `src/lib/quant/calibration.ts`:新增 `fitVasicek`、`fitCIR`、`standardizedResiduals`、`acf`。
- 测试:`portfolio.test.ts`(合成已知协方差验证权重)、扩展 `backtest.test.ts`(成本单调性、网格维度)、`calibration.test.ts`(合成 OU 过程回收 κ/θ/σ)。

**UI**
- 扩展 `src/components/quant/BacktestLab.tsx`:Tab 化为「单标的 / 组合 / 参数扫描」三视图,复用 `frontier/ui.tsx` 的 Slider/Stat、`common/SectionHeader`、`common/SendToTool`、`PresetButtons`、ChartTheme、`EquationBlock`。
- 新增轻量 `HeatmapGrid` 展示组件(参数扫描 + 月度收益 + 相关矩阵共用)。
- 扩展 `CalibrationLab.tsx`:新增 Vasicek/CIR 卡片与诊断图区。

**注册 / 导航 / 文案**
- `src/data/workflows.ts`:新增剧本「组合构建 → 校准 → 定价 → 组合回测」。
- `src/i18n/locales/en.json` & `zh.json`:补全新参数、策略、配置方法标签。
- sitemap 无新增路由(沿用 `/s/backtest`、`/s/calibration`),如新增 catalog 条目则同步 `toolsCatalog.ts`。

**版本与日志**
- 升级到 **V3.5**,同步 `buildVersion.ts`、`HeroSection`、`toolsCatalog.ts`、`Workflows.tsx`、`Changelog.tsx`、`CHANGELOG.md`,记录三块升级,V3.4 标记为 Stable。

```text
多标的真实价格 ─> [组合回测/优化] ─> 权重·净值·风险贡献 ─┐
单标的 ─> [回测进阶: 成本/网格/月度热图] ─> σ, μ ─────────┤─ Tool Bus ─> BS/MC/Greeks
真实短率 ─> [校准: Vasicek/CIR + 诊断] ─> κ,θ,σ,r ─────────┘
```

## 范围之外(本次不做)
- 期权链曲面校准(Heston/SABR,免费数据不足)。
- 多因子组合归因(Brinson)与做空融券成本精细建模。
- 回测结果云端持久化(先用 sessionStorage / 导出)。
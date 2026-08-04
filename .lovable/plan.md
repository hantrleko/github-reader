# V5.5 时间序列补全 · 从平稳性到密度预测

对照《时间序列分析理论与方法框架报告》，现有「时间序列」分类已有 14 个工具（SVAR/IRF/FEVD、协整/VECM、ADF/KPSS、面板单位根、Kalman/HP、MIDAS、ARIMA、局部投影、动态线性模型、DM 检验、Granger/Toda-Yamamoto、谱分析、指数平滑、长记忆），波动率分类另有 GARCH/DCC/Markov 转换/HAR-RV/Hawkes。真正缺口集中在**平稳性检验族的互补性、非线性与结构变化、密度预测评价、模型不确定性**四处。

## 阶段一：平稳性与识别内核（新增 3 个工具）
- **单位根检验全家桶**：在现有 ADF/KPSS 之上补 Phillips-Perron（Newey-West 非参数校正）、DF-GLS（Elliott-Rothenberg-Stock）、Zivot-Andrews（内生断点）、HEGY 季节单位根；同一序列并排给出结论矩阵，演示「未拒绝 ≠ 有单位根」与低功效区域。
- **Wold 分解与 ARMA 识别台**：理论 ACF/PACF vs 样本 ACF/PACF 对照、AR/MA 阶数网格的 AIC/BIC/HQ 热力图、Wold 系数 ψ_j 冲击权重、平稳性与可逆性的单位圆根图。
- **差分决策实验室**：伪回归蒙特卡洛（两条独立随机游走的 t 值与 R² 分布）、过度差分引入 MA 单位根并放大预测误差、趋势平稳 vs 差分平稳的预测扇形对比。

## 阶段二：非线性与结构变化（新增 2 个工具）
- **门限与平滑转换模型**：SETAR（门限网格搜索）与 LSTAR/ESTAR，配 Hansen 门限自助检验和制度分段拟合图。
- **Bai-Perron 多重断点**：动态规划定位多个断点、序贯 supF(l+1|l) 检验、BIC/LWZ 选断点数，与现有单断点 / CUSUM 工具形成完整链条。

## 阶段三：预测评价与波动率前沿（新增 3 个工具）
- **密度预测评价台**：PIT 直方图与均匀性检验、对数得分与 CRPS、区间覆盖率与 pinball loss，对比正态 / t / GARCH 条件密度。
- **模型置信集与预测组合**：Hansen MCS（自助法）、等权 / 逆 MSE / 最优组合权重、与现有 DM 检验联动的成对比较矩阵。
- **随机波动率 vs GARCH**：SV 模型（粒子滤波估计潜在对数波动）与 GARCH 的滤波路径及样本外密度得分对照，呼应报告第四章第 5 节。

## 阶段四：理论导读专题
新增路由 `/s/time-series-theory`（分组「计量经济学」），结构对齐资产定价与计量导读：
- 主线知识地图：DGP 特征识别 → 平稳性处理 → 单变量/多变量设定 → 诊断 → 预测或结构解释
- 四类任务分栏：描述 / 预测 / 结构传导 / 因果政策，各附证据标准与常见误用卡片
- 发展史时间轴：Yule-Slutsky-Wold → Box-Jenkins → 1980s 三场革命（单位根、协整、ARCH）→ 非线性与断点 → 高维 / 机器学习 / 混频
- 「尺度—问题—方法」决策表与时间序列论文最低报告清单
- 每个知识块带「到实验室复现」按钮，跳转对应工具

## 技术说明
- 新增 `src/lib/quant/tsFrontier.ts` 承载全部新算法（PP / DF-GLS / ZA / HEGY、理论 ACF-PACF 与 Wold 系数、伪回归模拟、SETAR/STAR、Bai-Perron 动态规划、PIT/CRPS/log-score、MCS 自助、SV 粒子滤波），配套 `src/lib/quant/__tests__/tsFrontier.test.ts` 单元测试。
- 交互层新增 `src/components/econ/V55Tools.tsx`（8 个工具），沿用 `frontier/ui.tsx` 的 Slider / Stat、统一图表主题与 PresetButtons。
- 在 `EconometricsTools.tsx` 的 TOOLS 中登记，并把新工具归入既有「时间序列」与「波动率 / 高频」分类。
- 专题页 `src/components/essays/TimeSeriesTheory.tsx`，在 `src/lib/sections.ts` 与 `Navbar.tsx` 注册；`src/data/toolsCatalog.ts` 同步登记 8 个新工具。
- 版本号升至 **V5.5**：`package.json`、更新日志（`Changelog.tsx` / `ChangelogPage.tsx`）、首页「最新更新」中英文案、启动加载页版本号全部同步。
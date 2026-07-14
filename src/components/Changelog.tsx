import { motion } from "framer-motion";
import { Sparkles, Wrench, BookOpen, Zap, Layout, GraduationCap, Target, ClipboardCheck, FileStack, Gauge, FileText, Share2, Shield, FolderTree, Activity } from "lucide-react";
import { useTranslation } from "react-i18next";

const RELEASES = [
  {
    version: "V4.1",
    date: "2026-07",
    tag: "Current",
    highlights: [
      {
        icon: Sparkles,
        title: "投资组合理论强化 — /s/quant",
        items: [
          "Black-Litterman 完整版:市场隐含 π + 绝对/相对观点 P/Q + Idzorek 信心 c → Ω,展示先验/后验 μ 与权重差异",
          "Mean-CVaR 尾部优化 (Rockafellar-Uryasev):投影次梯度长仓求解,损失分布 + VaR/CVaR + 等权对比",
          "稳健协方差收缩:Ledoit-Wolf 常相关目标 + OAS,展示 λ*、条件数改善与对角方差对比",
          "Michaud 重采样有效前沿:B 次 bootstrap (μ̂,Σ̂) 求平均权重,消解经典 MV 的角解与不稳定",
          "因子风险预算:Var(w)=wᵀBFBᵀw+wᵀDw 分解,匹配 MKT/HML/RMW 目标预算或因子中性",
          "Kelly & 破产风险实验室:多资产 k*=Σ⁻¹(μ−rf)、分数 Kelly 终值分布与破产概率蒙特卡洛",
        ],
      },
      {
        icon: BookOpen,
        title: "工程",
        items: [
          "新增纯函数库 src/lib/quant/portfolioAdvanced.ts (BL/Idzorek、CVaR、LW/OAS、Michaon、因子分解、Kelly 模拟)",
          "6 项单元测试全部通过:BL 极限一致性、LW 条件数改善、CVaR 长仓、因子分解方差守恒、半 Kelly 更低破产率",
          "工具目录扩至 27 类,QuantStrategyTools 采用两级分类导航 (经典/贝叶斯/下行) 与命令面板自动可发现",
        ],
      },
    ],
  },
  {
    version: "V4.0",
    date: "2026-07",
    tag: "Stable",
    highlights: [
      {
        icon: Sparkles,
        title: "时间序列扩充 — /s/econometrics · 时间序列",
        items: [
          "Granger 因果 / Toda-Yamamoto:AIC/BIC 自动选滞后阶,双向 Granger F 检验,TY 增广 VAR Wald 检验对单位根/协整序列稳健",
          "谱分析:Daniell 平滑周期图辨识主导周期,Bai-Perron sup-F 结构突变搜索,OLS-CUSUM 稳定性,McLeod-Li / Keenan 非线性检验",
          "指数平滑预测:Holt-Winters (加法/乘法季节) 与 Theta 方法,含 95% 预测区间、经典趋势/季节/残差分解与 MASE / RMSSE 滚动回测",
          "长记忆 / ARFIMA:GPH log-周期图回归与 R/S Hurst 估计分数阶 d,ACF 双曲衰减可视化,含 ARFIMA(0,d,0) 模拟对照",
        ],
      },
      {
        icon: BookOpen,
        title: "工程",
        items: [
          "新增纯函数库 src/lib/quant/tsAdvanced.ts (VAR/Granger/TY、周期图、结构突变、CUSUM、Holt-Winters/Theta、经典分解、滚动回测、GPH/Hurst/ARFIMA)",
          "构造 DGP 验证:X→Y 因果 p<0.0001、季节主导周期回收、断点定位、HW 回测 MASE≈0.25,长记忆 d̂ 与白噪声显著区分",
          "工具目录 (/tools) 补 4 条新卡片,计量「时间序列」分类扩至 14 个工具,命令面板 ⌘K 自动可发现",
        ],
      },
    ],
  },
  {
    version: "V3.8",
    date: "2026-07",
    tag: "Stable",
    highlights: [
      {
        icon: Sparkles,
        title: "计量经济学强化 — /s/econometrics · 诊断/非参数",
        items: [
          "回归诊断台:异方差 (Breusch-Pagan / White)、自相关 (Durbin-Watson / Breusch-Godfrey)、多重共线 (VIF / 条件数)、设定 (Ramsey RESET),并对比 OLS / HC3 / Newey-West 稳健标准误",
          "动态面板 GMM:含滞后被解释变量场景下对比 Pooled OLS 高估、固定效应的 Nickell 偏误与 Arellano-Bond 差分 GMM 纠偏 (Hansen J / AR(2))",
          "Diebold-Mariano 预测精度检验:随机游走 / AR(1) / EMA 样本外损失差分,HAC 修正与 Harvey 小样本修正",
          "核回归 / 局部多项式 (LOESS):Nadaraya-Watson 与局部线性,带宽含 Silverman 经验法则与留一交叉验证最优 h,含 95% 置信带",
        ],
      },
      {
        icon: BookOpen,
        title: "工程",
        items: [
          "新增纯函数库 src/lib/quant/econometrics.ts (OLS 诊断、稳健/HAC 标准误、动态面板 GMM、DM 检验、核回归) 并配 17 项通过的单元测试",
          "稳健统计分布 (erf、正态、卡方、t、F 的 p 值) 采用 Numerical Recipes 连分数实现以保证数值稳定",
          "工具目录 (/tools) 补 4 条新卡片,计量导航新增「诊断 / 非参数」分类,命令面板 ⌘K 自动可发现",
        ],
      },
    ],
  },
  {
    version: "V3.7",
    date: "2026-07",
    tag: "Stable",
    highlights: [
      {
        icon: Sparkles,
        title: "收益率曲线拟合器 — /s/bond · 曲线拟合器",
        items: [
          "新增 Nelson-Siegel (3 因子) 与 Svensson (4 因子) 期限结构拟合:给定衰减 λ 时对 β 线性,由 OLS 求解,λ 用一维/二维网格搜索取残差最小者",
          "支持从 FRED 真实美国国债 CMT (1M–30Y) 一键拉取并拟合,内置正常/倒挂/驼峰示例与可编辑期限-收益率表",
          "输出即期曲线、瞬时远期曲线 (闭式解)、拟合残差 (bp)、RMSE 与 R²,并把 3M 短端 r 经「发送到…」传给短率模型 (自动填入 r₀) 与债券工具",
        ],
      },
      {
        icon: BookOpen,
        title: "跨工具闭环与工程",
        items: [
          "新增工作流剧本「真实利率 → 曲线拟合 → 短率 → 债券」,与命令面板/工具目录联动可发现",
          "新增纯函数库 src/lib/quant/termStructure.ts (NS/NSS 载荷、拟合、即期/远期采样) 并配 7 项通过的单元测试",
          "短率模型接入 Tool Bus 消费短端 r;marketData 新增 FRED 收益率曲线批量拉取 hook",
        ],
      },
    ],
  },
  {
    version: "V3.6",
    date: "2026-07",
    tag: "Stable",
    highlights: [
      {
        icon: Sparkles,
        title: "资产定价模块深化 — /s/asset-pricing",
        items: [
          "从 4 个工具扩展到 11 个,升级为两级分类导航 (均衡定价 / 因子与实证 / 现代 SDF 框架)",
          "现代 SDF 统一框架:随机折现因子 p=E[MX] (定价核 + beta 表示)、CCAPM + 股权溢价之谜 (幂效用,演示需 γ≈50)、Hansen-Jagannathan 波动率下界",
          "CAPM 家族:零β/Black CAPM (无无风险资产,平坦 SML)、Merton 跨期 ICAPM (状态变量对冲需求)",
          "实证异象与因子检验:规模/价值/动量/低波动分位排序多空组合、GRS (1989) 联合 α=0 检验 (F 统计量 + p 值)",
        ],
      },
      {
        icon: BookOpen,
        title: "现有工具深化与工程",
        items: [
          "CAPM 新增滚动 β 估计演示 (时变 β 与估计不确定性)",
          "新增纯函数库 src/lib/quant/assetPricing.ts (SDF/CCAPM/HJ/异象排序/GRS/滚动β) 并配 11 项通过的单元测试",
          "工具目录 (/tools) 补 7 条新卡片;知识库理论知识点链接到对应交互工具",
        ],
      },
    ],
  },
  {
    version: "V3.5",
    date: "2026-07",
    tag: "Stable",
    highlights: [
      {
        icon: Activity,
        title: "组合回测与优化引擎 — /s/backtest",
        items: [
          "单标的回测进阶:计入交易成本与滑点 (毛/净双曲线 + 成本拖累),多策略同数据对比表,参数网格扫描热力图 (点选即应用),年×月收益热力图",
          "新增多资产组合回测 src/lib/quant/portfolio.ts:等权 / 风险平价(ERC) / 最小方差 / 均值方差四种配置,周期再平衡 + 交易成本,输出净值、权重演化、风险贡献分解 (MCR/PCR) 与相关矩阵",
          "组合年化波动 σ 与收益 μ 可经「发送到…」一键传入 BS / 蒙特卡洛 / Greeks",
        ],
      },
      {
        icon: Gauge,
        title: "校准实验室扩展 — /s/calibration",
        items: [
          "新增 Vasicek / CIR 短率校准:对 FRED 真实国债收益率做离散 OLS/MLE,估计 κ/θ/σ 与半衰期,含 SDE LaTeX 公式与推导",
          "GARCH/EWMA 新增拟合诊断:标准化残差 Q-Q 图 (检验正态/厚尾) 与残差平方 ACF (检验剩余 ARCH,带 ±1.96/√n 置信带)",
          "校准的 σ / r 可发送到 BS / 蒙特卡洛 / Greeks / 债券工具,延续『真实数据 → 校准 → 定价 → 回测』闭环",
        ],
      },
      {
        icon: GraduationCap,
        title: "版本 V3.5 — 组合回测与优化引擎 (旗舰深化)",
        items: [
          "Hero、Footer、版本徽章、更新日志统一同步至 V3.5,V3.4 标记为 Stable",
          "新增剧本『真实数据 → 校准 → 定价 → 组合回测』,纯函数库 portfolio.ts/backtest.ts/calibration.ts 均带通过的单元测试",
          "Phase 2『功能深度』续作:回测从『单标的』升级为『可审计、可对比、可优化的组合引擎』",
        ],
      },
    ],
  },
  {
    version: "V3.4",
    date: "2026-07",
    tag: "Stable",
    highlights: [
      {
        icon: Activity,
        title: "真实数据回测引擎 — /s/backtest",
        items: [
          "新增回测实验室:用 Yahoo / CoinGecko / Alpha Vantage 真实历史价格回测单标的策略 (买入持有 / 双均线 / 时序动量 / 均值回归 / 波动率目标)",
          "纯函数引擎 src/lib/quant/backtest.ts:信号 T+1 执行规避前视偏差,输出净值曲线、回撤序列与 CAGR/年化波动/夏普/索提诺/卡玛/胜率/换手/暴露等完整指标 (含单元测试)",
          "回测得到的年化波动 σ 与收益 μ 可经「发送到…」一键传入 Black-Scholes / 蒙特卡洛 / Greeks 工作台",
        ],
      },
      {
        icon: Gauge,
        title: "模型校准实验室 — /s/calibration",
        items: [
          "把教学模型直接拟合到真实行情:GARCH(1,1) 高斯极大似然 (自研 Nelder-Mead 优化)、EWMA/RiskMetrics 衰减因子网格搜索、Merton 跳跃扩散阈值分解",
          "纯函数库 src/lib/quant/calibration.ts 输出 ω/α/β、持续性、长期与条件波动率、最优 λ、跳跃强度/幅度等参数 (含模拟数据回收测试)",
          "校准得到的波动率可一键发送到 BS / 蒙特卡洛 / Greeks / 隐含波动率工具,打通『拟合真实数据 → 定价』回路",
        ],
      },
      {
        icon: GraduationCap,
        title: "版本 V3.4 — 回测与校准实验室 (Backtest & Calibration Lab)",
        items: [
          "Hero、Footer、版本徽章、更新日志统一同步至 V3.4,V3.3 标记为 Stable",
          "新增统一价格数据加载层 src/lib/priceSeries.ts,三大免费数据源一键切换,支持示例数据离线演示",
          "Phase 2『功能深度』开篇:工具从『算单点』升级为『测策略 / 拟合真实数据』",
        ],
      },
    ],
  },
  {
    version: "V3.3",
    date: "2026-06",
    tag: "Stable",
    highlights: [
      {
        icon: Layout,
        title: "A/B 对比模式 — 同一工具两套参数并排对比",
        items: [
          "模型计算器 (Black-Scholes / VaR·ES / CAPM / Sharpe) 新增 A/B 对比面板:A 为实时参数,B 可独立编辑,底部差异表用 ↑↓ 与色标标注 B 相对 A 的变化",
          "通用 CompareDiff / CompareToolbar 组件 (src/components/common/CompareToggle.tsx) 支持 A→B 同步与重置,默认折叠、对既有体验零影响",
        ],
      },
      {
        icon: Share2,
        title: "研究工作流页 — 把多个工具串成剧本",
        items: [
          "新增 /workflows 页与 4 条剧本:期权做市台 (IV→SVI→Greeks→MC)、利率到债券、组合构建、信用风险链",
          "每步展示工具说明与经 Tool Bus 传递的规范变量徽章,「打开」直达对应工具,「从第一步开始」一键进入链路",
          "工具目录页与导航 More 菜单新增工作流入口,sitemap 同步收录",
        ],
      },
      {
        icon: GraduationCap,
        title: "版本 V3.3 — 互联层收尾 (Compare + Workflows)",
        items: [
          "Navbar 徽章、Hero、Footer、更新日志统一同步至 V3.3,V3.2 标记为 Stable",
          "至此 Phase 1『工具互联』完成:Tool Bus 参数直传 + A/B 对比 + 工作流剧本",
        ],
      },
    ],
  },
  {
    version: "V3.2",
    date: "2026-06",
    tag: "Stable",
    highlights: [
      {
        icon: Share2,
        title: "Tool Bus — 工具间参数直传 (IV → BS → MC → Greeks)",
        items: [
          "新增依赖无关的 Tool Bus (src/lib/toolBus.ts),用 useSyncExternalStore 维护 S₀/σ/r/T/K/μ 等规范变量,并镜像到 sessionStorage 以承受中途刷新",
          "新增「发送到…」下拉 (SendToTool):隐含波动率求解的 σ̂、Black-Scholes 标的价、蒙特卡洛参数可一键传入相关工具并自动预填,接收端落地后即时弹出确认 toast",
          "已打通 隐含波动率 ↔ Black-Scholes ↔ 蒙特卡洛 ↔ Greeks Desk 四工具回路;打开衍生品页若总线携带期权参数会自动定位到 Greeks 工作台",
        ],
      },
      {
        icon: FileText,
        title: "Markdown 报告导出 — 计算结果一键成稿",
        items: [
          "ShareExportToolbar 新增「复制 MD」按钮,把当前工具输入与关键输出整理为 Markdown 片段,可直接粘贴进 Notebook、论文笔记或团队简报",
          "隐含波动率工具率先接入结构化 MD 报告,后续工具将逐步补齐",
        ],
      },
      {
        icon: GraduationCap,
        title: "版本 V3.2 — 工具互联层 (Interconnection)",
        items: [
          "Navbar 版本徽章、Hero 最新更新、首页与更新日志 Footer 统一同步至 V3.2,V3.1 标记为 Stable",
          "本阶段把『一堆独立计算器』升级为『可串联的研究工作流』:一个工具的输出可以成为下一个工具的输入",
          "下一阶段路线图:Compare Mode 多工具并排对比 · 工作流入口页 · 真实数据校准与自选清单持久化",
        ],
      },
    ],
  },
  {
    version: "V3.1",
    date: "2026-06",
    tag: "Stable",
    highlights: [
      {
        icon: FolderTree,
        title: "两级分类导航 — 复杂工具集一目了然",
        items: [
          "新增可复用 CategorizedToolNav:高层分类 (chips) + 子项 (tabs) + 内嵌搜索,Bloomberg 终端式金色激活态",
          "计量经济学 29 个工具归入 因果推断 / 时间序列 / 波动率高频 / 离散面板 / ML 计量 五类;衍生品 11 个工具归入 曲面 / 希腊与格点 / 利率与奇异 三类",
          "首页导航子菜单同步更新 (计量:因果/时序/波动/面板/ML;风险:VaR·ES/Merton/Copula/压测)",
        ],
      },
      {
        icon: Sparkles,
        title: "模型补足 — 经典空白与前沿实验台",
        items: [
          "资产定价新增 Fama-MacBeth 两步回归 (Shanken 修正);衍生品新增 CRR 二叉树收敛;风险新增极值理论 EVT/POT (GPD 重尾拟合)",
          "固收新增关键利率久期 KRD 曲线分解;计量新增单位根检验 (ADF & KPSS);量化新增 Walk-Forward 滚动样本外检验",
          "前沿实验室把四张静态概念卡升级为互动工具:DeFi AMM 滑点/无常损失 · 网络传染 DebtRank · 气候 VaR (NGFS) · 前景理论价值函数",
          "核心算法抽取至 src/lib/quant/extraModels.ts 并配套单元测试,新增 10 个工具标记为 verified",
        ],
      },
      {
        icon: Shield,
        title: "安全加固 & 依赖升级",
        items: [
          "升级 @supabase/supabase-js、react-router-dom;recharts 升至 v3 (移除 lodash 依赖改用 es-toolkit)",
          "新增 package.json overrides 锁定 ws / lodash,依赖扫描归零高危项",
          "精简研究运营类冗余板块 (Research Ops Board / Playbooks / Decision Memo),聚焦建模与数据工具",
        ],
      },
    ],
  },
  {
    version: "V3.0",
    date: "2026-06",
    tag: "Archived",
    highlights: [
      {
        icon: Target,
        title: "Research Playbooks — 从工具清单升级为研究剧本",
        items: [
          "新增论文复现、期权校准、风险委员会简报与互动课程四类真实场景,每个剧本自动组织推荐入口、执行步骤与交付物",
          "Readiness Score 根据已完成步骤即时计算准备度,把抽象学习目标转化为可追踪的研究任务闭环",
          "首页新增 Research Ops 快速入口,支持用户从研究目标而不是工具名称开始探索平台",
        ],
      },
      {
        icon: ClipboardCheck,
        title: "Sprint Composer — 3/5/10 日行动简报生成器",
        items: [
          "支持研究者、授课教师、量化分析师三类角色与 3/5/10 日周期选择,自动生成日程化研究冲刺计划",
          "根据当前剧本动态拼接目标、角色、周期、核心承诺和交付物,一键复制为团队任务 brief",
          "新增 Day-by-day 输出卡片,把入口选择、模型实验、诊断检查和报告封装压缩为可执行节奏",
        ],
      },
      {
        icon: FileStack,
        title: "Evidence Pack — 可审计研究证据包",
        items: [
          "新增复现优先、教学优先、决策优先三种证据包模式,随当前剧本生成不同交付口径",
          "Quality Gates 将完成度映射为 Ready / Needs evidence 状态,帮助团队识别缺失证据",
          "Decision Questions 自动提炼关键追问,并支持一键复制为研究审计、课堂复盘或委员会备忘录",
        ],
      },
      {
        icon: Gauge,
        title: "Research Ops Board — 研究交付运营看板",
        items: [
          "新增 Readiness / Evidence / Handoff 三项动态评分,随步骤勾选、质量门槛和冲刺周期实时更新",
          "Current Stage 自动识别 Scoping / Evidence building / Ready for handoff,帮助判断项目所处交付阶段",
          "Next Best Actions 自动生成下一步行动队列,把研究项目管理从静态清单升级为运营面板",
        ],
      },
      {
        icon: FileText,
        title: "Decision Memo Studio — 决策备忘录工作室",
        items: [
          "新增面向导师、课堂负责人或风险委员会的 Memo Brief,自动汇总受众、立场、阶段与摘要",
          "将运营看板、证据包与冲刺设定转译为 Decision / Evidence / Action 三段式汇报结构",
          "支持一键复制决策备忘录,把研究工作流从执行清单推进到可沟通、可评审、可交付的管理文档",
        ],
      },
      {
        icon: Layout,
        title: "工具目录 V3.0 — 平台能力进入场景化组织",
        items: [
          "TOOLS_CATALOG 新增 Research Playbooks、Sprint Composer、Evidence Pack、Research Ops Board 与 Decision Memo Studio 五个 V3.0 平台条目,进入 /tools、Today's Pick 与交叉导航体系",
          "工具目录标题同步升级为 Catalog · V3.0,描述扩展至金融、计量与研究工作流工具",
          "Hero 最新更新、Navbar 版本徽章、首页 Footer 与更新日志统一同步至 V3.0",
        ],
      },
      {
        icon: GraduationCap,
        title: "版本 V3.0 — 研究工作流正式发布版",
        items: [
          "V3.0 将 EF Lab 从交互式计算器集合推进为『场景驱动的研究操作系统』",
          "内容层强化研究复现、教学设计与决策简报三条主线,功能层加入剧本选择、清单评分、可复制冲刺计划、证据包审计、运营看板与决策备忘录",
          "下一阶段路线图:连接 Notebook 模板、论文索引与真实数据基准,形成从剧本 → 实验 → 报告的自动化链路",
        ],
      },
    ],
  },
  {
    version: "V2.8",
    date: "2026-05",
    tag: "Stable",
    highlights: [
      {
        icon: Layout,
        title: "Notebook 模式 — 自由组合 · 一键导出 PDF 报告",
        items: [
          "四类单元格 (Markdown / KaTeX 公式 / Pipe 表格 / 代码) 可任意增删 · 上下移动重排,所见即所得",
          "导出弹窗使用打印样式 (Playfair 标题 / 金色分隔线 / 表格栅格),触发 window.print() 可保存为 PDF 或纸质打印",
          "公式块实时 KaTeX 渲染,表格按 | 分隔自动生成 thead/tbody,代码块单色等宽以暗色卡片呈现",
        ],
      },
      {
        icon: Sparkles,
        title: "真实数据基准库 — FRED + Yahoo 17 序列一键拉取",
        items: [
          "FRED 9 个序列 (GDPC1 / CPIAUCSL / UNRATE / DGS10 / DGS2 / T10Y2Y / FEDFUNDS / DEXUSEU / VIXCLS)",
          "Yahoo 8 个标的 (SPY / QQQ / AAPL / MSFT / NVDA / TLT / GLD / BTC-USD),展示 close / 年化 σ̂ / 年化 μ̂ / n",
          "每张卡片内嵌迷你折线,React-Query 5 分钟缓存避免重复请求 supabase edge function",
        ],
      },
      {
        icon: Wrench,
        title: "跨工具对比仪表盘 — 一份数据并行跑 OLS / IV / FE / DID",
        items: [
          "面板 DGP:40 单位 × T 期,U 同时影响 D 与 Y 制造内生性,Z 作为 IV,treated × post 为 DID 信号",
          "高斯-约旦法手写多元 OLS 求解 X'X 与 SE,2SLS 第一阶段拟合 D̂ → 第二阶段替换,TWFE 通过单位+时间哑变量实现",
          "结果表 + Forest Plot(τ̂ ± 1.96·SE),绿/金/红三色按偏差自动着色,真实 τ 红色参考线对齐",
        ],
      },
      {
        icon: GraduationCap,
        title: "版本 V2.8 — 平台与体验增强层",
        items: [
          "新增第 8 章 「平台增强」 章节,Navbar / Footer / Changelog 同步至 V2.8,V2.7 标记为 Stable",
          "项目能力栈完成横向闭环:36 个建模工具 + 报告产出 + 数据接入 + 识别策略并联诊断",
          "下一阶段路线图:V2.9 LLM 解读助手 (调用 Lovable AI 自动解释系数与诊断) 或 V3.0 正式发布版",
        ],
      },
    ],
  },
  {
    version: "V2.7",
    date: "2026-05",
    tag: "Stable",
    highlights: [
      {
        icon: Sparkles,
        title: "3 方程 NK DSGE — Clarida-Galí-Gertler 脉冲响应",
        items: [
          "IS + NKPC + Taylor Rule 三方程,在 AR(1) 冲击下用 MSV 解 z_t = Ψ_z · ε_t 闭式求解 3×3 系统",
          "需求 ε_d / 成本推动 ε_s / 货币 ε_m 三类冲击一键切换,IRF 同图叠加产出缺口 / 通胀 / 名义利率",
          "Taylor 原则 (φ_π > 1) 实时判定,鸽派 / 鹰派 / 刚性价格 / 持续冲击四套校准预设",
        ],
      },
      {
        icon: Sparkles,
        title: "HANK / TANK 教学版 — 异质代理与加总 MPC",
        items: [
          "Galí-López-Salido-Vallés (2007) TANK 近似:HTM 家庭 MPC≈1,Ricardian 平滑消费,有效跨期斜率 (1−λ)/σ",
          "10 分位财富分布 (帕累托右尾 + HTM 零财富) + 分位 MPC 异质柱状图,加总 MPC / 财政乘数实时显示",
          "RANK vs HANK 货币 IRF 并行对比,可视化间接收入效应对货币传导的放大",
        ],
      },
      {
        icon: Sparkles,
        title: "实物期权 — Dixit-Pindyck 投资递延决策",
        items: [
          "GBM 项目价值 V_t + 二叉树 (CRR) 反向归纳,每节点比较 max(V−I) vs e^(−r·dt) E[F(V')] 求等待价值",
          "F(V) vs 朴素 NPV 对比图,等待溢价阴影区显式标出过度投资偏差,V*(t) 触发阈值时间路径",
          "永久解析基准 V*_∞ = β/(β−1)·I (β 二次方程根) 同图叠加,验证有限窗口收敛性",
        ],
      },
      {
        icon: GraduationCap,
        title: "版本 V2.7 — 宏观与公司金融横向拓展",
        items: [
          "Navbar / Footer / Changelog 同步至 V2.7,V2.6 标记为 Stable",
          "宏观模块:1 → 4 个工具 (Solow + DSGE-NK + HANK + Real Options),覆盖长期增长 · 短期波动 · 异质代理 · 投资决策",
          "Merton 结构化违约模型已在 V1 风险模块提供 (DD / 信用利差 / PD vs 杠杆),本次未重复实现",
          "下一阶段路线图:V2.8 平台增强 (Notebook 组合工具 · 跨工具对比 · LLM 解读助手) 或 V2.9 真实数据集成",
        ],
      },
    ],
  },
  {
    version: "V2.6",
    date: "2026-05",
    tag: "Stable",
    highlights: [
      {
        icon: Sparkles,
        title: "LMM Bermudan Swaption — Libor Market Model 蒙特卡洛 (Brace-Gatarek-Musiela 1997)",
        items: [
          "rank-2 因子 LMM 直接扩散前向 Libor F_i 路径,spot-libor 测度下漂移修正 + 相关结构 ρ 可调",
          "Longstaff-Schwartz 二次回归 (1, V, V²) 估计连续价值,Bermudan vs European 行权策略一键切换",
          "EPE 期望正暴露曲线 + 行权时刻直方图,直观显示『提前行权溢价』随 σ/ρ 的演化",
          "ATM Bermudan / Deep ITM 长尾 / OTM European / 强相关 (≈HJM 1-fac) 四套预设",
        ],
      },
      {
        icon: Sparkles,
        title: "路径依赖期权 — Asian / Barrier / Lookback + 控制变量法",
        items: [
          "四类 exotic 一键切换:亚式平均 (avg − K)⁺ · 上/下障碍 (knock-out) · 浮动行权回望 (S_T − min S)⁺",
          "控制变量 θ̂_CV = Ȳ − β̂(C̄ − E[C]) 用 vanilla European call 的 BS 解析价作为 control,显示方差降幅 %",
          "payoff-控制相关 ρ 与最优 β̂ 实时计算,Asian/Barrier 通常 ρ→1 → SE 降幅 60-90%",
          "样本路径 + payoff 分布双视图,障碍线/行权线叠加,直观看到敲出时刻",
        ],
      },
      {
        icon: Sparkles,
        title: "CVA / DVA / Bilateral XVA — Wrong-Way Risk (Hull-White 2012)",
        items: [
          "Gaussian 短利率 + 随机 hazard λ_C 联合仿真,WWR 通过 ρ(r, λ) 控制对手违约与暴露的相依结构",
          "CVA = LGD·∫EPE(t)·dPD_C(t)·D(0,t) 离散逼近,同时计算 DVA、BCVA = CVA − DVA",
          "WWR 增量 = 含相依 CVA − 独立朴素 CVA,显式量化危机情景下 CVA 低估幅度",
          "无 WWR / 强 WWR / Right-way / 投资级对手四套预设,EPE 曲线 + XVA 组分柱图双面板",
        ],
      },
      {
        icon: Sparkles,
        title: "信用组合 Copula — Vasicek/Li (Gaussian) + t-Copula 尾相依",
        items: [
          "单因子模型 X_i = √ρ·M + √(1−ρ)·ε_i,违约阈值 Φ⁻¹(PD),支持 Gaussian / Student-t 双 copula",
          "Vasicek 大组合解析 VaR_α = n·LGD·Φ((Φ⁻¹(PD)+√ρ·Φ⁻¹(α))/√(1−ρ)) 与 MC 实证 VaR/ES 同图对比",
          "默认相关性曲面 ρ_D(PD, ρ_asset) 通过 5×7 网格蒙特卡洛重建,演示低 PD 高 ρ_asset → 极低 ρ_D 的反直觉效应",
          "投资级 / 高收益 / t-Copula(df=4) / Basel IRB (ρ=0.24) 四套预设,损失分布尾部高亮 > VaR 区域",
        ],
      },
      {
        icon: GraduationCap,
        title: "版本 V2.6 — 衍生品 & 风险深化",
        items: [
          "Navbar / Footer / Changelog 同步至 V2.6,V2.5 标记为 Stable",
          "衍生品模块:8 → 10 个工具 (新增 LMM Bermudan · Path-dependent Exotics)",
          "风险模块:4 → 6 个工具 (新增 CVA/XVA WWR · 信用组合 Copula),完整覆盖『市场 · 信用 · 对手方』三大风险维度",
          "下一阶段路线图:V2.7 宏观与公司金融 (DSGE/RBC · HANK · Real Options) 或 V2.8 平台增强 (Notebook · 跨工具对比)",
        ],
      },
    ],
  },
  {
    version: "V2.5",
    date: "2026-05",
    tag: "Stable",
    highlights: [
      {
        icon: Sparkles,
        title: "HAR-RV — 已实现波动率与跳跃识别 (Corsi 2009 / BNS 2004)",
        items: [
          "5-min 日内仿真合成 RV_t = Σ r²_{t,j},Bipower BV_t = (π/2)·Σ|r_j||r_{j-1}| 跳跃稳健,JV = max(RV−BV, 0) 直接显示跳跃成分柱图",
          "HAR(1,5,22) 异质性回归:β_d 日 / β_w 周 / β_m 月三尺度系数 + HC0 SE,样本内拟合 √RV 实际 vs 预测对比",
          "AR(1) log-波动持续性 + 可调跳跃强度/幅度 DGP,平稳 / 高跳跃 / 强持续 / 近 BS 四套预设",
        ],
      },
      {
        icon: Sparkles,
        title: "Hawkes 自激点过程 — 高频订单流/违约聚集 (Hawkes 1971)",
        items: [
          "Ogata thinning 精确仿真 λ(t) = μ + α·Σexp(−β(t−t_i)),强度路径 + 事件散点叠加可视化",
          "递归 A_i 加速对数似然 L = Σlog λ(t_i) − ∫λ + 坐标搜索 MLE 估计 (μ̂, α̂, β̂),与真值对照",
          "分支比 n* = α/β 自动判定平稳性 (次临界/临界/爆发),平均强度 E[λ] = μ/(1−n*) 同步显示",
          "弱聚集 / 高聚集 (订单流) / 临界 / 纯 Poisson 四套预设",
        ],
      },
      {
        icon: Sparkles,
        title: "Kyle λ + PIN — 订单簿价格冲击与知情交易 (Kyle 1985 / EKOP 1996)",
        items: [
          "Kyle (1985) 线性均衡 Δp = λ·q + ε,OLS 估计 λ̂ ± HC SE 与真值对比,带散点+拟合直线可视化",
          "EKOP (1996) 三状态混合 (无事件 / 好消息 / 坏消息) DGP 仿真买卖订单,粗估 PIN̂ 与真实 αμ/(αμ+2ε) 同框对比",
          "α (信息事件概率) / δ (坏消息条件) / μ (信息交易者强度) / ε (无知交易者强度) 全可调,显式分离信息不对称与噪声流",
          "流动性强 / 信息驱动 / 噪声主导 / 极端冲击四套预设,演示薄市与深市下 λ 的非线性放大",
        ],
      },
      {
        icon: GraduationCap,
        title: "版本 V2.5 — 高频与微观结构 (Microstructure)",
        items: [
          "Navbar / Footer / Changelog 同步至 V2.5,V2.4 标记为 Stable",
          "计量模块:25 → 28 个工具,新增高频/微观结构维度,完整衔接经典计量 → ML 因果 → 高频微观三大体系",
          "下一阶段路线图:V2.6 衍生品深化 (CVA/XVA · LMM · Path-dependent MC) 或 V2.7 宏观与公司金融 (DSGE · Merton · Real Options)",
        ],
      },
    ],
  },
  {
    version: "V2.4",
    date: "2026-05",
    tag: "Stable",
    highlights: [
      {
        icon: Sparkles,
        title: "Double / Debiased ML — Chernozhukov et al. (2018) (机器学习因果)",
        items: [
          "残差化 partialling-out:ỹ=y−ĝ(X), D̃=D−m̂(X) → θ̂_DML = Σ D̃ỹ / Σ D̃²,Neyman 正交性使估计对 ML 一阶扰动鲁棒",
          "K-fold cross-fit 多项式 ridge 拟合 (deg 2/3 可调) 估计 ĝ, m̂,避免过拟合污染因果参数",
          "Naive OLS / Long OLS (linear X) / DML 三方对比柱图,直观展示非线性混淆下 OLS 系统性偏误",
          "强非线性混淆 / 弱混淆 / 高维样本 / K=2 cross-fit 四套预设,θ 偏误与渐近 SE 同步显示",
        ],
      },
      {
        icon: Sparkles,
        title: "Causal Forest / GRF — Athey-Wager (CATE 异质性)",
        items: [
          "核加权局部 partialling-out τ̂(x₀) = Σ K_h(Xᵢ−x₀)·D̃ᵢỹᵢ / Σ K_h·D̃ᵢ²,Epanechnikov 核近似森林叶子权重",
          "CATE 曲线 τ̂(x) ± 95% 渐近 CI 与真实 τ(x) 重叠对比,识别 sigmoid / 线性 / 阶跃三类异质性形态",
          "ATE 全样本估计 + HTE 方差 Var(τ̂) 作为异质性强度代理,带宽 h 与样本 n 联动调节偏-方差权衡",
          "Sigmoid / 线性 / 阶跃异质性 / 宽带宽过平滑四套预设,稀疏区段 CI 显著变宽显示局部识别下降",
        ],
      },
      {
        icon: Sparkles,
        title: "Bayesian Linear Regression — NIG 共轭后验 (贝叶斯学派)",
        items: [
          "共轭 Normal-Inverse-Gamma 先验:β|σ² ~ N(β₀, σ²Λ₀⁻¹), σ² ~ IG(a₀,b₀);后验闭式 βₙ = Λₙ⁻¹(X'y + Λ₀β₀)",
          "后验预测分布 y*|x* ~ t_{2aₙ}(x*'βₙ, (bₙ/aₙ)(1 + x*'Λₙ⁻¹x*)),自动吸收 σ² 不确定性 → 比 OLS 更宽预测带",
          "β₁ 边际后验 t 密度图同时标注 β₀ (先验)、βₙ (后验) 与真值,直观可视化先验-似然-后验三方收缩",
          "弱先验 (≈OLS) / 强先验 / 错指定先验 / 大样本四套预设,演示先验权重 Λ₀ 在小样本下的稳定化作用与大样本下的消散",
        ],
      },
      {
        icon: GraduationCap,
        title: "版本 V2.4 — 计量经济学 v3.0 收官",
        items: [
          "Navbar / Footer / Changelog 同步至 V2.4,V2.3 标记为 Stable",
          "计量模块:22 → 25 个工具,完整覆盖『经典 OLS/IV/GMM · 现代 ML 因果 (DML/Causal Forest/LASSO) · 贝叶斯学派』三大范式",
          "至此 V2.x 路线图全部完成,可发布为 Econometrics v3.0;后续 V2.5+ 将开启高频微观结构 / DSGE / Notebook 模式新维度",
        ],
      },
    ],
  },
  {
    version: "V2.3",
    date: "2026-05",
    tag: "Stable",
    highlights: [
      {
        icon: Sparkles,
        title: "DLM 结构时间序列 — 局部线性趋势 + 随机季节 (时间序列)",
        items: [
          "Harvey (1989) / Durbin-Koopman (2012) 状态空间模型:y_t = μ_t + γ_t + ε_t,水平 μ + 斜率 ν + 周期 S 季节 γ 三分量",
          "完整 Kalman 滤波 + RTS 平滑 (k = 2+(S-1) 维状态),分别提取趋势 / 季节 / irregular 三条平滑路径",
          "h-步前向预测 ± 95% 预测区间,新息方差 F_t 通过状态协方差 P_t 递推累计",
          "一键 MLE:在 log(σ_ε, σ_η, σ_ζ, σ_ω) 空间做坐标搜索最大化 prediction error decomposition log-lik",
          "诊断:标准化新息 ε̃_t = v_t/√F_t 时序图 + Ljung-Box Q(10) 残差白噪声检验,AIC 同步显示",
          "明显趋势+季节 / 纯局部水平 (random walk) / 弱信号噪声大 / 季度数据 4 套预设",
        ],
      },
      {
        icon: GraduationCap,
        title: "版本 V2.3 — V2.3 路线图启动",
        items: [
          "Navbar / Footer / Changelog 同步至 V2.3,V2.2 标记为 Stable",
          "计量模块:21 → 22 个工具,首次提供完整结构时间序列分解 (与 ARIMA 形成『定阶 / 分解』双视角)",
          "V2.3 余下两项规划中:Double/Debiased ML (Chernozhukov 2018) · Causal Forest / GRF (Athey-Wager)",
        ],
      },
    ],
  },
  {
    version: "V2.2",
    date: "2026-05",
    tag: "Stable",
    highlights: [
      {
        icon: Sparkles,
        title: "LASSO / Ridge / Elastic Net + 5-fold CV (机器学习计量)",
        items: [
          "Friedman-Hastie-Tibshirani (2010) 坐标下降 + soft-thresholding 求解 ½n⁻¹‖y−Xβ‖² + λ[α‖β‖₁ + ½(1−α)‖β‖²]",
          "α=1 LASSO / α=0 Ridge / 0<α<1 Elastic Net 一键切换,40 点 log-λ 网格 warm-start 计算系数路径",
          "5-fold 交叉验证 MSE ± 1 SE 误差带 + λ_min(最低 CV-MSE)与 λ_1se(Breiman 1-SE 准则)双竖线标注",
          "稀疏路径 / 多重共线性 / 高维 p>n / Elastic Net 四套预设,β 恢复柱图直观对比 LASSO vs OLS",
        ],
      },
      {
        icon: Sparkles,
        title: "Panel FE / RE + Hausman 检验 (面板数据)",
        items: [
          "Pooled OLS / Fixed Effects (Within 去均值) / Random Effects (Swamy-Arora θ 加权 GLS) 三方系数同表对比",
          "Hausman (1978) χ²(1) 检验 H = (β̂_FE − β̂_RE)² / [V(FE) − V(RE)],p<0.05 自动标 『建议 FE』标签",
          "个体效应 α̂_i 直方图 + N×T 面板规模卡片;FE 适用 / RE 高效 / 大 N 小 T / 弱效应四套预设",
          "演示 Cov(α_i, X)≠0 时 RE 偏误,而 FE 即使在内生时不变效应下仍一致估计 β",
        ],
      },
      {
        icon: Sparkles,
        title: "Tobit / Heckman 两步法 (受限因变量)",
        items: [
          "Tobit (Tobin 1958) 左截断 MLE:y>0 用密度 φ/σ + y=0 用 Φ(−Xβ/σ),Newton-Raphson 同时估 (β, σ)",
          "Heckman 两步 (1979):Probit 选择方程求 Inverse Mills λ̂=φ(Zγ̂)/Φ(Zγ̂) → 选样 OLS 加 λ̂ 校正",
          "ρ̂σ̂ 系数显著性 = 选择偏差检验;Mills λ(Zγ̂) 沿 Z 排序曲线 + 截断散点(红=y=0 / 金=观测)",
          "强左截断 / 工资方程 Heckit 经典 / 无选择偏差 / 强 ρ=0.9 选择偏差四套预设",
        ],
      },
      {
        icon: GraduationCap,
        title: "版本 V2.2 — 计量经济学三大缺口补完",
        items: [
          "Navbar 徽章 + Footer + Changelog 同步至 V2.2,V2.1 标记为 Stable",
          "计量模块新增 3 个工具,合计 21 个;首次完整覆盖『机器学习计量 / 面板数据 / 受限因变量』三大教材子领域",
          "至此因果识别 (DID/SDID/Synth/PSM/AIPW) + 时序 (GARCH/DCC/Regime/ARIMA/LP) + 面板 (FE/RE/Hausman) + 选择 (Logit/Probit/Tobit/Heckman) + 正则 (LASSO/Ridge/EN) 形成完整教学链",
        ],
      },
    ],
  },
  {
    version: "V2.1",
    date: "2026-05",
    tag: "Stable",
    highlights: [
      {
        icon: Sparkles,
        title: "PSM / IPW / AIPW — 双稳健 ATE 估计 (计量)",
        items: [
          "Logit 倾向得分 e(X)=σ(γX) + 1-NN PSM + Horvitz-Thompson IPW + AIPW 双稳健四种 ATE 同表对比真实 τ",
          "AIPW (Robins-Rotnitzky-Zhao 1994):e(X) 或 m_t(X) 任一正确即一致 — 倾向得分 / 结果回归两条防线",
          "倾向得分共同支撑直方图 (treated vs control 对称) + 协变量 SMD 加权前后对比 (|SMD|<0.1 视为平衡)",
          "弱选择 / 强选择 / 重叠不足 / RCT 模拟四套预设,演示混淆强度对各方法偏差的影响",
        ],
      },
      {
        icon: Sparkles,
        title: "ARIMA + 自动定阶 (AIC/BIC) — 时间序列",
        items: [
          "Hannan-Rissanen 两步法估计 ARMA(p,q):长 AR 估残差 ε̂ → OLS 回归 (y_lags, ε̂_lags)",
          "AIC/BIC 网格搜索 (p,q) ∈ [0..3]²,4×4 颜色热力图标记 ★ 最优,直观对比信息准则差异",
          "末端 1-步滚动预测 ±1.96σ̂ 置信带 + 残差 ACF 柱状图与 95% Bartlett 边界 + Ljung-Box Q(10) χ² 检验",
          "白噪声 / AR(1) / MA(1) / ARMA(2,1) 四套 DGP 预设,验证算法能正确识别真阶",
        ],
      },
      {
        icon: Sparkles,
        title: "Local Projections (Jordà 2005) — 计量",
        items: [
          "对每个 horizon h 独立 OLS:y_{t+h} = α_h + β_h x_t + 控制项,β_h 直接是 IRF 不需 VAR 递推",
          "VAR(1) Wold IRF (A^h e) 同图叠加对比,可识别 VAR 设定错误时 LP 的鲁棒性优势",
          "Newey-West HAC 标准误 (滞后阶 = h) 给出 LP 的 95% 置信带,准确反映 IRF 不确定度随 h 增长",
          "货币 / 财政 / 瞬时 / 无响应四套冲击预设,『LP-VAR 最大偏差』作为模型设定诊断指标",
        ],
      },
      {
        icon: GraduationCap,
        title: "版本 V2.1 — 计量经济学完整因果与时序工具链",
        items: [
          "Navbar 徽章 + Footer + Changelog 同步至 V2.1,V2.0 标记为 Stable",
          "计量模块新增 3 个工具,合计 18 个:OLS-IV / DID / RDD / Staggered DID / Synthetic Control / GMM / SVAR / GARCH / DCC / Regime-Switching / Cointegration / Kalman / MIDAS / Logit-Probit / Quantile / PSM-AIPW / ARIMA / Local Projections",
          "因果识别三件套(DID + Synthetic Control + PSM-AIPW)与时序三件套(GARCH + Regime-Switching + ARIMA)首次完整覆盖",
        ],
      },
    ],
  },
  {
    version: "V2.0",
    date: "2026-05",
    tag: "Stable",
    highlights: [
      {
        icon: Sparkles,
        title: "SABR 模型 (衍生品) — IR/Swaption 行业标准",
        items: [
          "Hagan et al. (2002) 隐含 Black 波动率解析近似:dF=αF^β dW₁, dα=ν α dW₂, Corr=ρ —— 无需 MC,瞬时标定 smile",
          "β 敏感性对比:同图叠加 β=0 (Normal SABR,LIBOR 市场) 与 β=1 (Lognormal),凸出 CEV 弹性的几何意义",
          "ATM IV / 25Δ Risk Reversal / vol-of-vol 比率三元统计 + 股指 / FX / 利率 / Hagan 论文示例多套预设",
        ],
      },
      {
        icon: Sparkles,
        title: "Local Volatility (Dupire) — 衍生品",
        items: [
          "Dupire (1994) 公式数值反演:σ²_loc = (∂C/∂T + rK·∂C/∂K) / (½K²·∂²C/∂K²),从 IV 曲面唯一确定确定性局部波动率",
          "可调 SVI 风格 IV 曲面 (ATM σ / Skew / Curvature / 期限斜率) 与 Dupire 反演 σ_loc 同图对比",
          "可视化经典直觉「σ_loc 是 σ_iv 的双倍 skew」,平直曲面退化为 BS 常数 σ 的边界检验",
        ],
      },
      {
        icon: Sparkles,
        title: "Greeks 完整工作台 — 衍生品",
        items: [
          "Δ / Γ / Vega / Θ / ρ 一阶 Greeks 与 Vanna / Volga 二阶 Greeks 解析全套,带分红率 q 的广义 BS",
          "沿 S 或 T 一键扫描的剖面图:深虚值 → ATM → 深实值的 Greeks 全景",
          "ATM / 短期 ATM / 高波动率 / 深虚值 put 多套预设直观演示 Γ-Θ 对偶、Vega 主导、Vanna 倾斜效应",
        ],
      },
      {
        icon: Sparkles,
        title: "Quantile Regression (计量) — Koenker-Bassett",
        items: [
          "Schlossmacher (1973) IRLS 求解多个分位数 τ ∈ {0.10, 0.25, 0.50, 0.75, 0.90},与 OLS 同表对比",
          "β₁(τ) 系数路径:若曲线随 τ 变化 ⇒ 异方差或位置-尺度依赖,这是 OLS 看不见的尾部信息",
          "DGP 切换:同方差 / 异方差 / 异常值 / 右偏分布,演示中位数回归 (τ=0.5) 对厚尾的鲁棒性",
        ],
      },
      {
        icon: GraduationCap,
        title: "★ 新模块:宏观经济学 — Solow 增长模型",
        items: [
          "首次开辟 Chapter 7 宏观经济学板块:Cobb-Douglas Y = Aᴋ^α(Lh)^(1−α) 的人均资本动力学 k̇ = sf(k) − (n+g+δ)k",
          "稳态 k̃* / ỹ* / c̃* 解析解 + 黄金率 s = α 消费最大化对照,过度储蓄/储蓄不足直观可见",
          "Solow 相图:投资曲线 sf(k) 与折旧线 (n+g+δ)k 交点 = 稳态;美国基准 / 高储蓄中国 / 黄金率 / 贫困陷阱多套预设",
        ],
      },
      {
        icon: GraduationCap,
        title: "版本号 V2.0 与学科覆盖里程碑",
        items: [
          "Navbar 徽章 + Footer + Changelog 同步至 V2.0,V1.9 标记为 Stable",
          "学科覆盖达 7 大模块:衍生品 / 固收 / 风险 / 量化 / 计量 / 宏观 + 利率,合计 30+ 交互式模型",
          "本版本一次性补齐 SABR / Dupire / Greeks 三大衍生品行业标配 + Quantile Regression + 全新宏观板块",
        ],
      },
    ],
  },
  {
    version: "V1.9",
    date: "2026-05",
    tag: "Stable",
    highlights: [
      {
        icon: Sparkles,
        title: "Heston 随机波动率模型 (衍生品)",
        items: [
          "Euler 离散化 Monte Carlo:同时演化 dSₜ 与 CIR 方差过程 dvₜ = κ(θ−v)dt + ξ√v dW₂,带 ρ 相关 Brownian",
          "交互式 Volatility Smile:从 MC 价格反演 IV,与 BS 平坦 IV 假设并排对比,直观展示 Heston 如何捕捉 skew",
          "可调 κ/θ/ξ/ρ/v₀ 与教科书 / Bakshi-Cao-Chen / Crisis 等多套预设,样本路径与终值分布同屏可视化",
        ],
      },
      {
        icon: Sparkles,
        title: "Hull-White + Bootstrapping 利率曲线 (固收)",
        items: [
          "Bootstrapping:从可编辑的 par-bond 收益率迭代求解零息曲线与远期曲线",
          "Hull-White (1-factor):校准到初始远期曲线的短期利率模拟,fan chart 展示路径分布与均值回复",
          "全套交互参数 (a, σ, T, paths) 与重置预设,与 Vasicek/CIR 形成完整利率期限结构闭环",
        ],
      },
      {
        icon: Sparkles,
        title: "Expected Shortfall + VaR 回测 (风险)",
        items: [
          "在传统 VaR 之外加入 ES (CVaR),分别用 Normal 与 Student-t 厚尾分布闭式计算",
          "Kupiec POF 无条件覆盖检验 + Christoffersen 独立性检验,通过 χ² 序列近似自动给出 p-value",
          "命中序列时间轴可视化与超出阈值的红色标记,符合 Basel FRTB 监管标准",
        ],
      },
      {
        icon: Sparkles,
        title: "Risk Parity / HRP 组合优化 (量化)",
        items: [
          "Equal Risk Contribution (ERC):循环坐标下降迭代求解,使每个资产对组合波动贡献相等",
          "Hierarchical Risk Parity (Lopez de Prado 2016):基于单链聚类的递归二分配权,无需 Σ⁻¹ 更稳健",
          "与 Mean-Variance / Equal-Weight 三方对照:权重柱图、风险贡献分解、相关矩阵热力图同屏对比",
        ],
      },
      {
        icon: Sparkles,
        title: "Logit / Probit + 边际效应 (计量)",
        items: [
          "Newton-Raphson (IRLS) MLE 同时拟合 Logit (Λ) 与 Probit (Φ),系数 ± SE 来自 Fisher 信息矩阵",
          "AME (Average Marginal Effect) 与 MEM (Marginal Effect at Means) 双指标,与 LPM (OLS) 同表对比",
          "预测概率曲线、McFadden Pseudo-R²、0.5 阈值分类准确率;含「稀有事件 / 小样本 / Probit DGP」预设",
        ],
      },
      {
        icon: Wrench,
        title: "RDD CCT 带宽 + 进阶因果推断套件",
        items: [
          "RDD 工具新增 ROT (经验法则) ↔ CCT (Calonico-Cattaneo-Titiunik 最优带宽) 一键切换,辅以 MSE 诊断",
          "新增 CausalAdvancedTools:Synthetic Control (ADH 2010,含 Placebo-in-space p-value)、Staggered DID (Callaway-Sant'Anna 2021)、Markov Regime-Switching (Hamilton 1989)",
          "DCC-GARCH (Engle 2002) 两步 QMLE:动态相关矩阵热力图 + 组合时变 VaR + 「相关性崩塌」可视化",
        ],
      },
      {
        icon: GraduationCap,
        title: "版本号同步",
        items: [
          "Navbar 徽章 + Footer + Changelog 同步至 V1.9 (中英 i18n 一致),V1.8 标记为 Stable",
          "本版本一次性补齐 5 个跨学科核心模型 + 因果推断套件,计量 / 衍生品 / 固收 / 风险 / 量化全线覆盖主流教材模型",
        ],
      },
    ],
  },
  {
    version: "V1.8",
    date: "2026-04",
    tag: "Stable",
    highlights: [
      {
        icon: Sparkles,
        title: "教学三联视图全部计算器覆盖",
        items: [
          "FormulaCodeView/PythonReference 接入剩余 RiskTools (Merton/Copula/Stress) 与 EconometricsTools (OLS·IV/DID/RDD/GMM/SVAR/GARCH/Coint/Kalman),共 11 段全新 Python 参考实现",
          "公式条下方折叠式 Python 卡片,一键复制,与既有 BS/Bond/Frontier 等 5 个计算器的视觉风格保持一致",
          "至此全部 14 个核心计算器都具备「数学 ↔ 代码」对照",
        ],
      },
      {
        icon: Wrench,
        title: "HistoryDrawer 全站铺开",
        items: [
          "RiskTools / EconometricsTools / QuantStrategyTools 三个之前漏接的计算器现在都有「保存 / 收藏 / 重放」抽屉",
          "全部 9 个有 ShareExportToolbar 的计算器现已统一具备历史记录能力",
        ],
      },
      {
        icon: Layout,
        title: "图表主题统一 (ChartTheme 铺开)",
        items: [
          "11 个计算器的硬编码 CHART_GRID/CHART_TEXT 改用 hsl(var(--border)) / hsl(var(--muted-foreground)) token",
          "亮色模式下图表网格不再是几乎不可见的深色,坐标轴文字对比度更友好",
          "暗色模式视觉无变化,过渡平滑",
        ],
      },
      {
        icon: Zap,
        title: "快捷键帮助面板",
        items: [
          "新增 KeyboardHelp 组件:按 ? 任意位置唤起 (输入框中自动屏蔽避免误触发)",
          "面板分「导航 / 页面 / 计算器」三组列出全部快捷键,kbd 样式与文案双语",
          "左下角浮动 Keyboard 图标按钮 (md+ 显示),提供发现性",
        ],
      },
      {
        icon: GraduationCap,
        title: "Skeleton loader 美化 + 版本号",
        items: [
          "SectionFallback 从单调灰条升级为完整的「卡片+脉冲+金色 shimmer 横扫」骨架,模拟最终内容布局",
          "新增 @keyframes shimmer 1.6s 横向扫光动画",
          "Navbar / Footer / Changelog 同步至 V1.8;V1.7 转为 Stable",
        ],
      },
    ],
  },
  {
    version: "V1.7",
    date: "2026-04",
    tag: "Stable",
    highlights: [
      {
        icon: Layout,
        title: "375px 移动端走查",
        items: [
          "新增 Tailwind `xs: 400px` 自定义断点,在最窄屏幕上提供细粒度控制",
          "Hero 标题字号梯度优化:`text-4xl xs:text-5xl md:text-7xl lg:text-8xl`,375px 不再溢出",
          "Navbar 版本徽章在 < 400px 自动隐藏,为分组导航 / 语言 / 主题按钮腾出空间",
          "Footer 网格 `grid-cols-1 xs:grid-cols-2 md:grid-cols-4`,品牌区在窄屏跨 2 列保持平衡",
          "BondCalculator 利率冲击表 `text-[9px] xs:text-[10px]` + `truncate`,4 列在 375px 不再被压扁",
          "Onboarding 弹窗加 `max-w-[92vw]` 双重保险,避免在小屏溢出",
          "CommandPalette 底部加 `env(safe-area-inset-bottom)`,iOS 下不再被 Home 指示条遮挡",
        ],
      },
      {
        icon: GraduationCap,
        title: "版本号同步",
        items: [
          "Navbar 徽章 + Footer + Changelog 同步至 V1.7 (中英 i18n 一致)",
          "V1.6 标记为 Stable;A/B 对比真正接入 (BS / Bond / Frontier 三个计算器) 因工作量较大,推迟到 V1.8 单独立项",
        ],
      },
    ],
  },
  {
    version: "V1.6",
    date: "2026-04",
    tag: "Stable",
    highlights: [
      {
        icon: Sparkles,
        title: "教学三联视图全面铺开",
        items: [
          "FormulaCodeView 接入 5 个核心计算器:Black-Scholes / 隐含波动率 / MC 期权 / 利率模型 / 有效前沿",
          "每个工具都展示「LaTeX 公式 → Python 参考实现 → 当前数值结果」三联,Python 片段随当前参数实时插值",
          "代码块支持一键复制,与教材公式一一对应,串联数学心智模型与代码实现",
        ],
      },
      {
        icon: Wrench,
        title: "历史 / 收藏抽屉",
        items: [
          "新增 HistoryDrawer:右侧滑出抽屉显示「收藏 + 最近 10 条」参数快照,可一键应用或删除",
          "已接入 6 个主力计算器 (BS / IV / MC / Bond / Rate / Frontier) 工具栏,与「保存」按钮并列",
          "数据存于 localStorage,跨会话保留;收藏不被裁剪",
        ],
      },
      {
        icon: Layout,
        title: "公式渲染与 KaTeX 美化",
        items: [
          "新增 EquationBlock 替换全站 BlockMath:长公式自动横向滚动 + hover 复制 LaTeX 源码",
          ".katex 全局样式统一 (gold / plain 双 variant),修复暗色模式分式横线偏灰问题",
          "细金色滚动条样式,公式跨设备显示一致",
        ],
      },
      {
        icon: GraduationCap,
        title: "版本号同步",
        items: [
          "Navbar 徽章 + Footer + Changelog 同步至 V1.6 (中英 i18n key 一致)",
          "V1.5 标记为 Stable;A/B 对比与移动端复查推迟到 V1.7",
        ],
      },
    ],
  },
  {
    version: "V1.5",
    date: "2026-04",
    tag: "Stable",
    highlights: [
      {
        icon: Sparkles,
        title: "教学闭环 (Phase D)",
        items: [
          "新增 FormulaCodeView 三联视图组件:LaTeX 公式 / Python 参考实现 / 实时结果 三个 Tab",
          "QuizSection 错题复习模式:支持「全部 / 错题 / 未答」三态切换,带实时计数",
        ],
      },
      {
        icon: Wrench,
        title: "数据层加固",
        items: [
          "RealDataLoader 增加数据来源徽章 (Yahoo) 与抓取时间戳",
          "CORS / 网络失败时提供「使用示例数据」兜底按钮 (合成参数带 * 后缀标识)",
        ],
      },
    ],
  },
  {
    version: "V1.4",
    date: "2026-04",
    tag: "Stable",
    highlights: [
      {
        icon: Sparkles,
        title: "首次访问引导 (Onboarding)",
        items: [
          "新增 3 步轻量 onboarding 弹窗:首次进站 800ms 后自动浮现,介绍命令面板 ⌘K、语言/主题切换、12 个计算器",
          "localStorage 标记防重复弹出;遮罩点击 / X 按钮 / 完成按钮均可关闭",
          "自写实现 (无 react-joyride 依赖) — 包体不增加,Spring 动画进出更顺滑",
        ],
      },
      {
        icon: Layout,
        title: "Footer 升级 + Hero 背景",
        items: [
          "Footer 改为 4 列网格布局:品牌简介 + 章节快捷导航 + 资源 (更新日志/快捷键提示) + 版权区",
          "HeroSection 加入抽象金融背景 SVG:平滑收益率曲线 + 20 根 K 线,仅 7-9% 透明度,提升'专业感'但不抢戏",
          "ThemeToggle sun/moon 切换改用 framer-motion morph 动画 (180ms rotate + scale)",
        ],
      },
      {
        icon: Wrench,
        title: "共享基础设施 (为未来计算器铺底)",
        items: [
          "新增 ChartTheme.tsx:统一 Recharts 配色 / Grid / Axis / ThemedTooltip,后续所有图表替换为同一套 token",
          "新增 useCompareState + CompareToolbar:通用 A/B 对比 hook,可在任意计算器一行接入双栏参数对比",
          "新增 calcHistory.ts (useCalcHistory hook):localStorage 历史记录 + 收藏夹,最多 10 条,收藏不被裁剪",
        ],
      },
      {
        icon: GraduationCap,
        title: "版本号同步与文档",
        items: [
          "左上角 Navbar 版本徽章 V1.2 → V1.4 (i18n key nav.version 同步中英两份)",
          "Footer Version 1.3 → V1.4,Changelog 顶部范围 V1.0 → V1.4",
          "上一轮规划的 P1 视觉/教学基础设施全部落地;A/B 对比、历史收藏、ChartTheme 已就绪,等待逐个工具接入 (V1.5)",
        ],
      },
    ],
  },
  {
    version: "V1.3",
    date: "2026-04",
    tag: "Stable",
    highlights: [
      {
        icon: Sparkles,
        title: "全局命令面板 ⌘K",
        items: [
          "新增全站命令面板:⌘K (Mac) / Ctrl+K (Win) 一键唤起,模糊搜索全部 12 个计算器 + 7 个章节 + 2 个页面",
          "支持键盘上下导航 + 回车跳转,跨页(从 /changelog 回首页 + 滚动到锚点)无缝切换",
          "404 页面同样接入,失联时也能快速找回工具",
        ],
      },
      {
        icon: Zap,
        title: "导出 / 分享 / 历史",
        items: [
          "新增 ShareExportToolbar 通用组件:一键导出当前结果为 PNG (html-to-image,2x DPR) 或复制带参数的分享链接",
          "URL hash base64 序列化全部输入参数,粘贴链接即可还原同事/学生的计算上下文",
          "已在 BS / IV / MC / Bond / Rate / Frontier / Risk / Quant 等 8 个工具接入",
        ],
      },
      {
        icon: Layout,
        title: "导航与浏览体验",
        items: [
          "页面顶部新增金色阅读进度条 (基于 scrollTop / scrollHeight,requestAnimationFrame 节流)",
          "右下角浮动「回到顶部」按钮:滚动 > 800px 自动浮现,平滑滚动",
          "Footer 增补快捷入口:更新日志 · 回到顶部 · ⌘K 提示",
        ],
      },
      {
        icon: Wrench,
        title: "稳定性与错误处理",
        items: [
          "新增 SectionErrorBoundary:每个章节独立错误边界,单个计算器崩溃不再白屏整页,提供「重试」按钮",
          "lazyWithRetry 链路保留:陈旧 chunk hash 自动一次性重载恢复",
          "404 页面重写为品牌化「找不到这个金融模型」+ 双语文案 + 返回首页 / 搜索工具双 CTA",
        ],
      },
      {
        icon: BookOpen,
        title: "教学组件库 (基础设施)",
        items: [
          "新增 InfoBadges 组件包:DifficultyBadge (入门/进阶/高阶 三色徽章)、WhyItMatters (顶部说明卡)、TermTooltip (中英术语 hover)",
          "为后续把 12 个计算器逐个补「难度 + 为什么重要 + 关键术语」做好基础",
          "新增 calculatorTools.tsx 工具库 + useSharedState hook,标准化工具复用模式",
        ],
      },
      {
        icon: GraduationCap,
        title: "版本号与文档",
        items: [
          "Footer 版本号 V1.1 → V1.3 同步,Changelog 顶部范围更新为 V1.0 → V1.3",
          "上一轮提出的 28 项优化建议中的 P0 (功能/交互/稳定性) 已全部落地",
          "P1 (视觉统一 ChartTheme、A/B 对比、完成度追踪等) 列入下一里程碑",
        ],
      },
    ],
  },
  {
    version: "V1.2",
    date: "2026-04",
    tag: "Stable",
    highlights: [
      {
        icon: Zap,
        title: "真实世界数据接入",
        items: [
          "新增 3 个 Lovable Cloud Edge Function 数据代理:market-quotes (Yahoo Finance,股票/ETF 历史日线)、fred-series (FRED,美国国债收益率/CPI/失业率)、famafrench-factors (Ken French 5 因子月度数据)",
          "新增 RealDataLoader 通用工具栏组件:输入标的代码 (AAPL/SPY/^GSPC 等) 与时间区间,一键拉取真实价格和年化波动率,自动填入计算器参数",
          "React Query 5 分钟缓存 + 失败自动回退合成数据,网络/限流不阻塞使用",
        ],
      },
      {
        icon: GraduationCap,
        title: "中英双语 (i18n)",
        items: [
          "接入 react-i18next + i18next-browser-languagedetector,顶部新增 🌐 EN/中 切换按钮",
          "首次访问按浏览器语言自动检测,选择持久化到 localStorage",
          "本轮覆盖 Navbar、Hero、RealDataLoader、Changelog 等核心交互文案;计算器内部文案 key 化将在 V1.2.x 持续推进",
        ],
      },
      {
        icon: Wrench,
        title: "基础设施",
        items: [
          "启用 Lovable Cloud (Supabase 后端) + 配置 FRED_API_KEY 密钥",
          "Edge Function 默认 verify_jwt=false,公开数据无需登录即可拉取",
          "TanStack Query 已集成,后续可扩展更多 hook 复用缓存层",
        ],
      },
    ],
  },
  {
    version: "V1.1",
    date: "2026-04",
    tag: "Stable",
    highlights: [
      {
        icon: Layout,
        title: "页面重构与导航分组",
        items: [
          "顶部导航从 14 个平铺标签整合为 5 个分类下拉菜单（基础 / 衍生品 / 固收宏观 / 计量风险 / 量化与学习）",
          "首页模块按「教学路径」逻辑重新排序：介绍 → 基础定价 → 衍生品高阶 → 固收利率 → 计量风险 → 量化策略 → 测验 → 路径",
          "对所有重型计算器组件应用 React.lazy + Suspense 代码分割，首屏体积大幅下降，滚动卡顿问题显著缓解",
        ],
      },
      {
        icon: GraduationCap,
        title: "教学体验增强（Sprint 5A）",
        items: [
          "新增「互动测验中心」：覆盖 12 个核心模型的 17 道选择题，含 KaTeX 公式、即时反馈、详细解释",
          "进度持久化（localStorage）：答题数、正确率、累计尝试次数自动保存",
          "新增 22 篇经典文献引用库（Black-Scholes 1973、Fama-French 2015、Gatheral 2004 等），通过 <Cite/> 悬浮卡查看作者、期刊、DOI",
        ],
      },
      {
        icon: Sparkles,
        title: "新增更新日志",
        items: ["独立 #changelog 区块，集中追踪每个版本的能力增量"],
      },
      {
        icon: Wrench,
        title: "Bug 修复与稳定性",
        items: [
          "修复 QuizSection.tsx 中全角引号导致的构建失败",
          "修正中文字符串中嵌套引号的转义问题",
        ],
      },
    ],
  },
  {
    version: "V1.0",
    date: "2026-04",
    tag: "Initial",
    highlights: [
      {
        icon: BookOpen,
        title: "教育内容体系",
        items: [
          "7 大核心主题：宏观经济、计量经济、金融工程、衍生品、风险管理、固收、量化策略",
          "完整 LaTeX 公式渲染与详细数学推导",
          "Bloomberg 风格视觉系统：暗金 + 暖白双主题、Playfair Display 字体",
        ],
      },
      {
        icon: Zap,
        title: "12 大交互式金融计算器",
        items: [
          "Sprint 1（计量）：OLS / GARCH(1,1) / Kalman 滤波",
          "Sprint 2（风险）：Merton 信用模型 / Copula 相依结构 / 压力测试",
          "Sprint 3（衍生品）：SVI 隐含波动率曲面 / Heston 蒙特卡洛 / LSM 美式期权",
          "Sprint 4（量化）：策略回测引擎（动量/均值回复/配对）/ Black-Litterman / Fama-French 5 因子归因",
          "基础计算器：Black-Scholes / 隐含波动率（Newton-Raphson）/ MC 期权定价 / 有效前沿 / 债券定价 / 利率模型（Vasicek/CIR）",
        ],
      },
      {
        icon: Layout,
        title: "基础架构",
        items: [
          "Sticky 顶部导航 + IntersectionObserver 滚动监听",
          "全站参数预设系统（教科书场景 / 真实市场场景）",
          "暗黑 / 明亮双主题切换",
        ],
      },
    ],
  },
];

const Changelog = () => {
  const { t } = useTranslation();
  return (
    <section className="py-20 px-6 bg-background border-t border-border/40">
      <div className="container max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <p className="text-[10px] font-mono text-gold tracking-[0.3em] uppercase mb-2">
            Release Notes · 更新日志
          </p>
          <h2 className="text-3xl md:text-4xl font-display text-foreground mb-3">
            {t("changelog.title")}
          </h2>
          <p className="text-sm text-muted-foreground font-mono">
            {t("changelog.subtitle")} — V1.0 → V3.2
          </p>
        </motion.div>

        <div className="space-y-12">
          {RELEASES.map((release, i) => (
            <motion.div
              key={release.version}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: i * 0.1 }}
              className="relative"
            >
              {/* Version header */}
              <div className="flex items-baseline gap-3 mb-6 pb-3 border-b border-border/50">
                <h3 className="text-2xl font-display text-gold">{release.version}</h3>
                <span className="text-xs font-mono text-muted-foreground tracking-wider">
                  {release.date}
                </span>
                <span
                  className={`ml-auto text-[10px] px-2 py-0.5 rounded font-mono tracking-wider uppercase ${
                    release.tag === "Current"
                      ? "bg-gold/15 text-gold"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {release.tag}
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                {release.highlights.map((h) => {
                  const Icon = h.icon;
                  return (
                    <div
                      key={h.title}
                      className="rounded-lg border border-border/60 bg-card/50 p-5 hover:border-gold/40 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className="w-4 h-4 text-gold" />
                        <h4 className="text-sm font-semibold text-foreground font-mono">
                          {h.title}
                        </h4>
                      </div>
                      <ul className="space-y-1.5">
                        {h.items.map((item, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-muted-foreground leading-relaxed pl-3 relative before:content-['—'] before:absolute before:left-0 before:text-gold/50"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Changelog;

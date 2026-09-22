import { motion } from "framer-motion";
import { Sparkles, Wrench, BookOpen, Zap, Layout, GraduationCap, Target, ClipboardCheck, FileStack, Gauge, FileText, Share2, Shield, FolderTree, Activity, ChevronDown, ChevronsUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";

const RELEASES = [
  {
    version: "V7.5",
    date: "2026-09",
    tag: "Current",
    highlights: [
      {
        icon: Sparkles,
        title: "行为金融工具深链",
        items: [
          "行为金融实验室 8 个模型支持 /#behavior-lab?t=<toolId> 深链",
          "行为与微观结构实验室支持 /#behavior-microstructure?t=behavior|micro 深链",
        ],
      },
      {
        icon: FileText,
        title: "行为金融目录与双语化",
        items: [
          "工具目录新增“行为金融”分类，补入 17 条先前完全缺失的行为金融条目",
          "两个实验室标题、副标题、分组与标签迁入 labs.behavior.* / labs.behaviorMicro.* 中英词条",
        ],
      },
    ],
  },
  {
    version: "V7.4",
    date: "2026-09",
    highlights: [
      {
        icon: Shield,
        title: "风险工具深链与分类导航",
        items: [
          "22 个风险工具改为 /#risk?t=<toolId> 深链，目录可直达具体工具",
          "导航重构为市场、信用、流动性、监管资本、治理韧性五大主线，并支持搜索",
        ],
      },
      {
        icon: FileText,
        title: "风险目录补全与双语化",
        items: [
          "目录补入一致性度量、FHS、A-IRB、评级迁移、去杠杆螺旋、Basel 资本栈、模型风险、韧性 8 个条目",
          "板块副标题与历史摘要迁入 labs.risk.* 中英词条，工具补齐英文导航名",
        ],
      },
    ],
  },
  {
    version: "V7.3",
    date: "2026-09",
    highlights: [
      {
        icon: Sparkles,
        title: "计量经济学工具深链",
        items: [
          "57 个计量工具改为 /#econometrics?t=<toolId> 深链，目录可直达具体工具",
          "目录补入 RDD、交错 DID、合成对照、DML、因果森林、面板单位根等 16 个条目",
        ],
      },
      {
        icon: FileText,
        title: "计量模块双语化",
        items: [
          "8 个导航分类补齐英文标签，随语言切换",
          "计量面板文案分批迁入 labs.econ.* 中英词条",
        ],
      },
    ],
  },
  {
    version: "V7.2",
    date: "2026-09",
    highlights: [
      {
        icon: Sparkles,
        title: "量化交易工具深链",
        items: [
          "19 个量化 / 组合工具改为 /#quant?t=<toolId> 深链，目录可直达具体工具",
          "回测引擎、校准实验室、Qlib 流水线的视图与模型进入 URL，可分享",
        ],
      },
      {
        icon: FileText,
        title: "量化模块双语化",
        items: [
          "量化导航分类与工具名补齐英文，随语言切换",
          "策略回测、Walk-Forward、风险平价、V4.1 与 V5.6 组合工具面板文案迁入中英词条",
        ],
      },
    ],
  },
  {
    version: "V7.1",
    date: "2026-09",
    highlights: [
      {
        icon: Sparkles,
        title: "资产定价工具深链",
        items: [
          "资产定价目录 21 个条目改为 ?t=<toolId> 深链，可直达具体工具",
          "工具导航分类与名称补齐英文，随语言切换",
        ],
      },
      {
        icon: FileText,
        title: "资产定价与前沿页双语化",
        items: [
          "有效前沿（Markowitz）页面文案全部迁入中英词条",
          "零β CAPM、ICAPM、状态价格、SDF–因子对偶、HJ 距离面板双语化",
        ],
      },
    ],
  },
  {
    version: "V7.0",
    date: "2026-09",
    highlights: [
      {
        icon: Sparkles,
        title: "固收工具全进目录",
        items: [
          "固收实验室与固收前沿实验室共 22 个工具补入工具目录",
          "债券、短率、两个固收实验室支持 ?t=<toolId> 深链",
        ],
      },
      {
        icon: FileText,
        title: "固收模块双语化",
        items: [
          "债券计算器与利率模型模拟器的界面文案迁入中英词条",
          "固收实验室分类名、工具名与描述支持中英文",
        ],
      },
    ],
  },
  {
    version: "V6.9",
    date: "2026-09",
    highlights: [
      {
        icon: Sparkles,
        title: "衍生品工具全进目录",
        items: [
          "美式期权、利率结构、SABR–Heston、状态价格、LSMC 等 11 个实验补入工具目录",
          "衍生品实验室支持 ?t=<toolId> 深链，25 个实验都可直达",
        ],
      },
      {
        icon: FileText,
        title: "定价模块双语化",
        items: [
          "模型计算器、隐含波动率工具、蒙特卡洛定价器的界面文案迁入中英词条",
          "分类工具导航的搜索、清空与分类名支持中英文",
        ],
      },
    ],
  },
  {
    version: "V6.8",
    date: "2026-09",
    tag: "Past",
    highlights: [
      {
        icon: Wrench,
        title: "工具目录直达实验室",
        items: [
          "工具卡片改用统一路由解析，86 条工具不再跳回首页顶部",
          "6 条衍生品工具的坏锚点 /s/deriv 更正为 /s/derivatives",
          "新增测试：每条工具锚点都必须解析成真实板块页",
        ],
      },
      {
        icon: Sparkles,
        title: "高阶宏观工具进目录",
        items: [
          "宏观高阶实验室 4 个工具（债务动态 / 汇率超调 / BGG / ZLB）补入工具目录",
          "宏观前沿实验室 12 个实验（内生增长、RBC、Calvo、政策规则、QE/YCC、气候等）可被搜索",
          "支持 ?t=<toolId> 深链，目录卡片直达具体工具，分享链接保真",
        ],
      },
      {
        icon: FileText,
        title: "基础模块双语化",
        items: [
          "微观 / 宏观板块标题与导语迁入中英词条",
          "英文界面下工具按钮显示英文短名",
        ],
      },
    ],
  },
  {
    version: "V6.7",
    date: "2026-09",
    tag: "Past",
    highlights: [
      {
        icon: GraduationCap,
        title: "学习路线绑定真实板块",
        items: [
          "六个阶段各列出 2–4 个真实板块页，点击直达 /s/:id，已读自动打勾",
          "「继续」按钮跳到当前阶段第一个未读板块，而不是旧的页面锚点",
          "登录后阶段与已读进度同步到账号，未登录仍保存在本地，登录时取并集合并",
        ],
      },
      {
        icon: Target,
        title: "测验错题进入间隔重复",
        items: [
          "答题结果按 SM-2 排期，答错的题很快回到队列",
          "/review 新增「测验错题」牌组，与术语卡分开存储",
          "每题解析下方直接链到对应实验室页面",
        ],
      },
      {
        icon: FileText,
        title: "导览模块双语化与题库外置",
        items: [
          "学习路线、主题卡、学科主线页层级标签与导航文案全部迁入中英词条",
          "17 道题移入 src/data/quizQuestions.ts，新增 sectionId 与英文主题标签",
          "/d/overview 顶部新增「三分钟看懂本站」六阶段速览",
        ],
      },
    ],
  },
  {
    version: "V6.6",
    date: "2026-09",
    tag: "Past",
    highlights: [
      {
        icon: Layout,
        title: "首屏结构 — 十条学科主线入口",
        items: [
          "Hero 下方新增学科主线入口带，一屏看清全站十个一级域，点击直达 /d/:groupId",
          "首页目录分组标题与入口带共用同一套 NAV_GROUPS 分类",
        ],
      },
      {
        icon: FileText,
        title: "双语一致性 — 首页与页脚全量迁入词条",
        items: [
          "编辑导读三段（Concept / Experiment / Research）、板块目录标题与副标题改为中英双语词条",
          "页脚品牌简介、导航列、版权行与「返回顶部」不再硬编码中文",
          "页脚板块导航改为按一级域链接到学科主线页",
        ],
      },
      {
        icon: FolderTree,
        title: "板块页定位条 — 难度与相关链接",
        items: [
          "每个 /s/:id 顶部显示难度徽章：导读 / 基础 / 进阶 / 前沿 / 数据",
          "「建议先看」前置链之外新增「同域相关」链接，最多三条同域板块",
        ],
      },
    ],
  },
  {
    version: "V6.5",
    date: "2026-08",
    tag: "Past",
    highlights: [
      {
        icon: FolderTree,
        title: "新增一级域「量化交易」 — Quant Trading",
        items: [
          "把 Qlib 导读、Qlib 流水线实验室、量化策略导读、策略实验室、回测引擎与模型校准整合为独立学科主线",
          "域编号重排为 01–10，导航、首页目录与学科主页共用同一套分类",
        ],
      },
      {
        icon: BookOpen,
        title: "Qlib 导读 — /s/qlib-guide",
        items: [
          "七节精读：数据层与表达式引擎、Alpha158 / Alpha360、CSZScoreNorm 截面归一化、模型层、IC 评估协议、TopK-Dropout、qrun 工作流",
          "标签对齐、样本切分与换手成本三类常见误用的成因与修法",
        ],
      },
      {
        icon: Activity,
        title: "Qlib 流水线实验室 — /s/qlib-lab",
        items: [
          "浏览器内复现完整研究闭环：模拟股票池 → 8 个 Alpha158 式表达式因子 → 截面 z-score → Ridge / 等权 / 单因子模型 → 样本外 IC",
          "评估面板：IC / RankIC 时间序列、ICIR、IC 胜率、五分组未来收益单调性",
          "TopK-Dropout 组合回测：TopK、n_drop、调仓频率与成本可调，输出净值、超额、最大回撤与平均换手",
          "训练 / 测试按时间硬切分，所有展示指标均为样本外",
        ],
      },
    ],
  },
  {
    version: "V6.4",
    date: "2026-08",
    tag: "Past",
    highlights: [
      {
        icon: Activity,
        title: "TradingView Cross-Market Screener — /s/tv-screener",
        items: [
          "零 API Key 接入 TradingView 公开 Scanner：通过 Lovable Cloud Edge Function 代理股票、外汇、加密货币、债券与期货五大市场",
          "九组预设筛选：市值 Top 100、涨幅榜、成交量榜、高波动、高股息等，支持 130+ 常用字段组合与排序",
          "交互表格：字段格式化、分页、刷新、CSV 导出、复制选中 symbol、跳转 TradingView 原始页面",
        ],
      },
      {
        icon: FolderTree,
        title: "数据源架构扩展",
        items: [
          "新增 src/lib/tvScreener.ts 类型化 hook，复用 callFn + useQuery 模式，与 us-screener / coingecko-series 保持一致",
          "supabase/functions/tv-screener 处理 CORS、请求体构造与上游 429/5xx 降级提示",
        ],
      },
    ],
  },
  {
    version: "V6.3",
    date: "2026-08",
    tag: "Past",
    highlights: [
      {
        icon: Layout,
        title: "学科主线升级 — Domain Hubs /d/:groupId",
        items: [
          "为九大一级域建立独立主页：一句话定位、学习顺序（导读 → 基础 → 进阶 → 前沿）、核心公式速查卡、真实数据源入口与相关长文",
          "新增 SectionDef level（basic / advanced / frontier）与 prereq 字段，支持「建议先看」前置知识链与全站依赖图",
          "首页从 56 个扁平条目压缩为 9 张学科卡片，路径从「找页面」变成「走主线」",
        ],
      },
      {
        icon: BookOpen,
        title: "量化策略与微观经济学导读",
        items: [
          "新增 /s/quant-theory：信号构建 → 组合构建 → 交易成本 → 回测偏误清单 → 实盘落差",
          "新增 /s/micro-theory：偏好与效用 → 生产与成本 → 市场结构 → 博弈与信息 → 机制设计",
          "清理用户可见文案中的内部版本前缀（V4.x 等），改为能力描述；实验室统一为「基础工具 / 进阶实验室 / 前沿实验室」三级命名法",
        ],
      },
    ],
  },
  {
    version: "V6.2",
    date: "2026-08",
    tag: "Past",
    highlights: [
      {
        icon: Activity,
        title: "固定收益补全 — /s/fixed-income-frontier (18 个交互面板)",
        items: [
          "曲线与口径: par 曲线自举剥离贴现因子、线性零率/分段常数远期/三次样条三种插值的远期粗糙度对比、远期利率与 carry / roll-down 分解、应计利息与净价脏价换算",
          "利差与风险: 名义 / Z-spread / ASW / OAS 四口径同券对照与期权成本、有效久期与有效凸性、美元久期与 DV01、关键利率久期对冲求解、Redington 免疫条件",
          "含权与可转债: 二叉树可赎回/可回售债定价、可转债债底 + 转换期权分解、转换平价与债性/混合/股性区间判定",
          "信用与结构化: 信用利差四成分分解与信用利差之谜、评级迁移矩阵与迁移 VaR、CDS-债券基差、分层瀑布与超额抵押触发、单因子高斯 copula 分层、MBS 负凸性",
          "杠杆与制度前沿: 回购杠杆 ROE 与击穿冲击、haircut 保证金螺旋、Hull-White θ(t) 校准、RFR 后视复利与 fallback 利差、位移对数正态 caplet、绿色溢价、债券流动性溢价",
        ],
      },
      {
        icon: BookOpen,
        title: "固定收益导读 — /s/fixed-income-theory (九节)",
        items: [
          "利率概念体系 → 久期凸性 → 利差语言 → 期限结构与曲线构建 → 动态模型谱系 (Vasicek→CIR→HW→HJM→LMM) → 信用与结构化 → 组合免疫与杠杆 → 历史脉络 → 制度前沿与八步研究流程",
        ],
      },
    ],
  },
  {
    version: "V6.1",
    date: "2026-08",
    tag: "Past",
    highlights: [
      {
        icon: Activity,
        title: "市场微观结构补全 — /s/microstructure-lab (17 个交互面板)",
        items: [
          "做市与库存: Garman 存货流、Stoll 三成分价差分解 (订单处理/库存/逆向选择)、Ho-Stoll 库存偏离下的最优报价偏移",
          "信息与毒性: Easley-O'Hara PIN 对数似然估计 (α, μ, ε) 与 VPIN 成交量桶订单流毒性时序",
          "限价订单簿: make-or-take 决策 (限价单期权价值 vs 市价单即时成本)、排队价值与成交概率、零智能三泊松流订单簿仿真、Hawkes 自激成交强度",
          "成本口径: 报价/有效/已实现价差与价格冲击分解恒等式、Corwin-Schultz 与 Roll 低频代理及失效条件、Lee-Ready / tick rule 方向标注误判率",
          "价格发现: 平方根冲击定律与 Almgren 校准对照、Hasbrouck 信息份额上下界与 Gonzalo-Granger 共同因子权重、交易信息含量 (永久冲击占比)",
          "市场设计与韧性: tick size 对价差/排队/深度的权衡、集合竞价 vs 连续交易、熔断触发仿真、暗池分流对显示流动性的影响、流动性蒸发半衰期、Amihud-Mendelson 流动性溢价",
        ],
      },
      {
        icon: BookOpen,
        title: "《市场微观结构导读》专题 — /s/microstructure-theory",
        items: [
          "九节结构: 四个核心问题 → 市场组织形式 → 库存与信息两条经典线 → 限价订单簿语言 → 流动性度量陷阱 → 价格发现 → HFT 与市场设计 → 历史脉络与前沿 → 研究设计清单与四阶段学习路线",
          "流动性度量对照表与 1968 至今的范式演进表, 每节配「到实验室复现」链接",
        ],
      },
    ],
  },
  {
    version: "V6.0",
    date: "2026-08",
    highlights: [
      {
        icon: Activity,
        title: "宏观经济学补全 — /s/macro-frontier (12 个新实验室)",
        items: [
          "内生增长引擎: AK / Lucas 人力资本 / Romer 品种扩张 / Schumpeter 创造性破坏 与 Solow 过渡动态对照, 规模效应判定",
          "增长核算与 TFP: Solow 残差分解 (资本/劳动/人力资本/残差) + Hall-Jones 发展核算, 跨国收入差距中 TFP 的解释份额",
          "乘数—加速数与财政乘数: Samuelson 内生周期区制判定 + 松弛度 / ZLB / 货币抵消 / 李嘉图程度下的状态依赖乘数",
          "RBC 校准与周期矩: 技术冲击驱动的模拟, 相对波动率与顺周期相关性对照典型事实",
          "Calvo 定价与 NKPC 微观基础: θ → κ 映射、指数化的前瞻/回顾权重、牺牲率与货币非中性半衰期",
          "规则 vs 相机抉择: Barro-Gordon 通胀偏差 λαk 与可信度曲线 + 泰勒 / 通胀目标 / 价格水平 / 名义 GDP 四规则对比",
          "平价条件与 Carry: PPP 漂移、CIP 基差、UIP 的 Fama 回归散点与远期溢价之谜判定",
          "突然停止与外部调整: 储备覆盖 (Greenspan-Guidotti)、经常账户逆转路径、货币错配下的资产负债表损失",
          "行为宏观预期形成: 理性 / 适应性学习 / 黏性信息 / 诊断性预期四条路径与 Coibion-Gorodnichenko 系数",
          "非常规货币政策: QE 组合再平衡与信号渠道分解、央行资产负债表路径、YCC 上限可守性与隐含购债量",
          "宏观金融银行资本: 资本损失 × 目标杠杆 → 信贷收缩 → 产出, 抛售价格冲击与最低资本触发判定",
          "气候转型宏观路径: 碳价路径与减排、绿色通胀、物理损害与转型成本的净权衡与跨越年份",
        ],
      },
      {
        icon: BookOpen,
        title: "《宏观经济学导读》专题 — /s/macro-theory",
        items: [
          "九节结构: 对象与微观基础 → 长期增长 → 短期波动 → 货币政策 → 财政政策 → 开放经济 → 思想史主线 → 当代前沿 → 宏观判断力四步框架",
          "冲击类型识别表 (需求/供给/金融/预期) 与 1776 至今的学派演进表, 每节配「到实验室复现」链接",
        ],
      },
    ],
  },
  {
    version: "V5.9",
    date: "2026-08",
    highlights: [
      {
        icon: Activity,
        title: "行为金融补全 — /s/behavior-lab (8 个新实验室)",
        items: [
          "累积前景理论 CPT: 价值函数 v(x)、TK 概率权重 w(p)、确定性等价与行为风险溢价、四重风险态度矩阵",
          "短视损失厌恶: 评估频率 × 损失厌恶 λ 求解隐含股权溢价, 前景效用零点与频率敏感性扫描",
          "BSV 信念模型: 保守主义 + 代表性的制度切换, 短期反应不足与长期过度反应/反转的 CAR 路径",
          "DHS 过度自信与自我归因: 私有信号过度反应 → 动量延续 → 公开信息纠偏的长期反转",
          "Hong-Stein 信息缓慢扩散: 新闻观察者与动量交易者互动, 无需个体偏差即产生动量与过冲",
          "有限套利: 保证金约束、噪声交易者风险与赎回敏感度下的资本路径、错价半衰期与被迫平仓临界点",
          "投资者情绪截面: 难估值/难套利腿在高低情绪期的后续收益差 (Baker-Wurgler 式)",
          "行为公司金融: 管理者过度自信的投资—现金流敏感性 + 市场时机对股权发行与杠杆的路径影响",
        ],
      },
      {
        icon: BookOpen,
        title: "《行为金融导读》专题 — /s/behavior-theory",
        items: [
          "九节结构: 核心问题与框架 → 两大支柱 → 前景理论 → 认知偏差图谱 → 情绪与羊群 → 有限套利与噪声交易 → 异象的行为解释 → 行为公司金融 → 前沿与研究设计守则",
          "每节配「到实验室复现」链接、竞争性解释对照表与识别难点提示卡",
        ],
      },
    ],
  },
  {
    version: "V5.8",
    date: "2026-08",
    highlights: [
      {
        icon: Shield,
        title: "风险管理补全 — /s/risk (15 → 23 个工具)",
        items: [
          "风险度量公理台: 一致性四公理与 VaR 次可加性反例、谱风险测度、扭曲测度 (Wang 变换)、ES 可引出性与 Fissler-Ziegel 联合打分",
          "波动率与过滤式历史模拟: EWMA / GARCH(1,1) 极大似然 / HAR 对比, 标准化残差 FHS 生成条件 VaR/ES 与多日 √h 缩放",
          "PD / LGD / EAD 与 IRB 资本台: EL/UL 分解、Vasicek 单因子分位损失、Basel 相关性函数与期限调整、RWA=12.5·K·EAD、PIT 与 TTC 顺周期对比",
          "评级迁移与 CreditMetrics: 迁移矩阵 n 期外推与生成元、阈值法组合估值分布、信用 VaR/ES 与迁移 vs 违约损失分解",
          "融资流动性与去杠杆螺旋: 保证金/折扣冲击、Brunnermeier-Pedersen 式反馈循环、抛售价格冲击、生存天数与现金缺口路径",
          "Basel 资本栈与 LCR/NSFR: CET1/AT1/T2、CCB/CCyB/G-SIB 缓冲、杠杆率、MDA 分红限制、流动性两比率一体化达标检查",
          "模型风险与稳健决策: 模型分歧带、ε-污染最坏情形、模型平均与资本缓冲量化、SR 11-7 三道防线检查表",
          "韧性与恢复计划: 多期资本轨道压力路径、PPNR 与损失吸收顺序、逆周期缓冲释放、恢复触发点与管理层行动效果",
        ],
      },
      {
        icon: FileText,
        title: "理论导读专题 — /s/risk-theory",
        items: [
          "十节结构: 风险本质与管理闭环 → 分类与相互作用 → 市场风险计量 → 信用框架 → 流动性/操作/模型风险 → Basel 与 FRTB → 危机史 (1952–2019) → 系统性与前沿 → 稳健性判断框架 → 五阶段学习路线图",
          "五类风险度量的适用与边界对照表 (VaR / ES / 谱测度 / 扭曲测度 / 回撤与生存天数), 七条常见误用与八条最低报告清单",
        ],
      },
    ],
  },
  {
    version: "V5.7",
    date: "2026-08",
    highlights: [
      {
        icon: Target,
        title: "衍生品定价补全 — /s/derivatives (17 → 25 个工具)",
        items: [
          "状态价格与无套利区间: Arrow-Debreu 状态价格 (Σψ=e^{-rT}, Σψ·S_T=S₀), 三态两资产的不完全市场中等价鞅测度集合与超复制/次复制价格区间",
          "美式与百慕大 LSMC: 最小二乘蒙特卡洛 + 对偶变量, 行权边界 S*(t) 可视化, 百慕大→美式的行权日阶梯与早行权溢价分解",
          "期货—远期与持有成本: F=S·e^{(r+u−y−q)T} 分解、Contango/Backwardation 判读、隐含便利收益反解与盯市引起的凸性差异",
          "SVI 曲面工程: 五参数拟合、Gatheral 蝶式条件 g(k)≥0、日历总方差单调性检查, 以及从曲面到 Dupire 局部波动率的反解对照",
          "利率曲线三层: Vasicek / CIR 闭式债券与 Feller 条件、Hull-White 债券期权 (满足平价)、HJM 漂移被无套利唯一决定、Black-76 Caplet",
          "信用曲线: 分段常数危险率自举 (逐期重定价至 par)、存活与累计违约概率曲线、信用三角 s/(1−R) 近似与 λ–R 联合识别提醒",
          "数值方法实验室: Carr-Madan 傅里叶定价 (Heston 特征函数, Simpson 积分) vs 朴素 MC / 对偶变量 / 控制变量 / 拟蒙特卡洛的收敛与效率对比",
          "前沿与不完全市场: rBergomi 粗糙波动率微笑与 T^(H−1/2) 偏斜幂律, 跳跃市场中的均方最优对冲比、残余风险与效用无差别定价曲线",
        ],
      },
      {
        icon: FileText,
        title: "理论导读专题 — /s/derivatives-theory",
        items: [
          "十节结构: 无套利与状态价格 → 复制与测度变换 → 模型谱系 (LV/SV/跳跃/粗糙) → 曲线与信用 → 数值方法 → 校准与模型风险 → 六层地图 → 前沿 → 1900–2020s 时间轴 → 六条误用与八条最低报告清单",
          "五种数值方法的适用与边界对照表 (树 / PDE / MC / Fourier-FFT / 半解析近似)",
          "每个知识块配「到实验室复现」入口, 与衍生品版块 25 个工具一一对应",
        ],
      },
    ],
  },
  {
    version: "V5.6",
    date: "2026-08",
    tag: "",
    highlights: [
      {
        icon: Target,
        title: "投资组合补全 — /s/quant (11 → 19 个工具)",
        items: [
          "有效前沿几何与两基金分离: 解析双曲线 σ²(m)=(Am²−2Bm+C)/D、资本配置线与切点组合、杠杆上限截断后的零贝塔 CAPM (Black 1972) 与 SML 读法, 并可叠加长仓约束前沿",
          "Sharpe 单指数降维台: β 与残差方差估计、N(N+1)/2 → 2N+1 的参数压缩, 以及结构化协方差在 T<5N 时的样本外波动优势",
          "估计误差与滚动优化: 蒙特卡洛比较插件式均值-方差 / 最小方差 / 等权的真实样本外 Sharpe, 复现 DeMiguel 等 (2009) 的 1/N 强基准与「误差最大化器」现象",
          "约束与再平衡成本: 买入持有 / 日历 (月-季-年) / 阈值带三类规则的换手、成本、跟踪误差与净 CAGR 对照, 阈值带宽的成本—TE 前沿, 以及权重上限对最小方差解的隐性正则化效应",
          "主动管理与信息比率: Grinold 基本法则 IR ≈ TC·IC·√BR 的广度网格、最优跟踪误差 IR/(2λ) 与附加价值 IR²/(4λ), 配 Treynor-Black 主动组合 (评价比率与 Sharpe² 可加性)",
          "下行风险与随机占优: 半方差、LPM(1/2/3)、Sortino、Omega、Kappa₃、VaR/CVaR 与偏度峰度对照, 一阶/二阶随机占优判据, 以及 CRRA 确定性等价 vs 均值-方差近似的最优混合",
          "多期与动态配置: Merton 短视需求 (μ−r)/γσ² 与跨期对冲需求的期限结构、人力资本驱动的生命周期下滑轨道、年度再平衡 vs 买入持有的终值分位数分布",
          "高维正则化与最大分散化: L1/L2 范数约束的权重路径与稀疏解、长仓约束、最大分散化 MDP (相关矩阵最小方差再按波动率还原) 与等权的样本外六方对照",
        ],
      },
      {
        icon: FileText,
        title: "理论导读专题 — /s/portfolio-theory",
        items: [
          "十节结构: 配置问题 → 经典 MPT → 均衡定价 → 风险约束与执行 → 主动管理 → 扩展与多期 → 稳健前沿 → 1952–2020s 时间轴 → 九条最低报告清单",
          "六种风险度量的适用与边界对照表 (方差 / 半方差-LPM / VaR / CVaR / 最大回撤 / 跟踪误差)",
          "每个知识块配「到实验室复现」入口, 与资产配置版块 19 个工具一一对应",
        ],
      },
      {
        icon: BookOpen,
        title: "工程",
        items: [
          "新增 src/lib/quant/portfolioFrontier.ts 纯函数计算层 (解析前沿 / 零贝塔 / 单指数 / 估计误差 MC / 阈值再平衡引擎 / 带上限单纯形投影 / 基本法则与 Treynor-Black / LPM 与 FSD-SSD / Merton 动态解 / 近端梯度 L1-L2 / MDP), 配 30 项单元测试全绿",
          "新增 src/components/quant/V56PortfolioTools.tsx 八个交互实验组件, 资产配置版块两级导航重排为「经典与均衡 / 估计与执行 / 贝叶斯与因子 / 主动与下行 / 动态与高维」",
          "工具目录同步登记 8 个新条目, 版本统一至 V5.6",
        ],
      },
    ],
  },
  {
    version: "V5.5",
    date: "2026-08",
    tag: "",
    highlights: [
      {
        icon: Activity,
        title: "时间序列补全 — /s/econometrics (49 → 57 个工具)",
        items: [
          "单位根检验全家桶: ADF / Phillips-Perron (Newey-West) / DF-GLS / KPSS / Zivot-Andrews 内生断点 / HEGY 季节单位根, 并给出 ADF × KPSS 四象限联合读法",
          "Wold 分解与 ARMA 识别台: 理论 vs 样本 ACF/PACF、ψ 冲击传播权重、AR/MA 特征根与单位圆、AIC/BIC/HQ 阶数网格 (Hannan-Rissanen 两步估计)",
          "差分决策实验室: Granger-Newbold 伪回归拒绝率蒙特卡洛、过度差分的 −1 附近 MA 根与 RMSE 代价、趋势平稳 vs 随机游走的两种预测扇形",
          "非线性与断点: SETAR 门限网格搜索 + Hansen (1996) 自助 supF 检验、LSTAR 平滑转换函数、Bai-Perron 多重断点动态规划 (BIC/LWZ + 序贯 supF(l+1|l))",
          "预测评价: PIT 直方图与均匀性 χ²、对数得分、CRPS、pinball 与区间覆盖率; Hansen 模型置信集 (块自助序贯等价检验) 与等权 / 逆 MSE / 最优权重组合对比",
          "波动率: 随机波动率自举粒子滤波 vs GARCH(1,1), 在滤波精度、相关性与对数得分上正面对比",
        ],
      },
      {
        icon: FileText,
        title: "理论导读专题 — /s/time-series-theory",
        items: [
          "六层方法地图: 平稳性与预处理 → 线性表示 → 多变量动态 → 非线性与制度 → 波动率与状态空间 → 预测评价",
          "单位根检验对照表 (两种原假设、六个检验) 与 1927–2026 时间序列方法演进时间轴",
          "八条最低报告清单, 每个知识块配「到实验室复现」入口",
        ],
      },
      {
        icon: BookOpen,
        title: "工程",
        items: [
          "新增 src/lib/quant/tsFrontier.ts 纯函数计算层 (PP / DF-GLS / ZA / HEGY / Durand-Kerner 求根 / Hannan-Rissanen / SETAR-LSTAR / Bai-Perron DP / PIT-CRPS / MCS / 粒子滤波 SV), 配 20 项单元测试全绿",
          "新增 src/components/econ/V55Tools.tsx 八个交互实验组件, 计量版块两级导航新增「非线性 / 断点 / 预测评价」分类",
          "工具目录同步登记 8 个新条目, 版本统一至 V5.5",
        ],
      },
    ],
  },
  {
    version: "V5.4",
    date: "2026-08",
    tag: "",
    highlights: [
      {
        icon: Target,
        title: "计量经济学补全 — /s/econometrics (41 → 49 个工具)",
        items: [
          "识别与推断内核: 弱工具变量诊断 (一阶段 F / Cragg-Donald / Stock-Yogo 临界值 + Anderson-Rubin 反转检验置信集)、Heckman 样本选择两步法 (probit + 逆米尔斯比, 排除约束强度可调)",
          "Wald / LR / LM 三大检验: 同一原假设的三种几何视角, 可视化小样本分歧与 W ≥ LR ≥ LM 排序",
          "标准误实验室: 蒙特卡洛比较 iid / HC1 / HC3 / 聚类 / Wild cluster bootstrap-t 的真实 95% 覆盖率, 复现少簇场景下的过度自信",
          "面板与几何: 固定效应 vs 随机效应 (Hausman χ² + Mundlak CRE 等价检验 + θ 准去均值)、FWL 定理与共线性几何 (残差化散点、VIF 方差膨胀)",
          "高维与异质性: 双重选择 LASSO (Belloni-Chernozhukov-Hansen) 对比朴素单次选择与 Oracle、GATES 分位组效应与 BLP 校准回归",
        ],
      },
      {
        icon: FileText,
        title: "理论导读专题 — /s/econometrics-theory",
        items: [
          "以 DGP → 识别 → 估计 → 推断 → 解释 五步推理链为主线的结构化导读",
          "七条识别策略对照表 (随机化 / 条件独立 / IV / 面板 FE / 平行趋势 / 断点 / 样本选择) 及其软肋",
          "五级标准误阶梯与 1930s–2026 计量方法演进时间轴, 每块配「到实验室复现」入口",
        ],
      },
      {
        icon: BookOpen,
        title: "工程",
        items: [
          "新增 src/lib/quant/econAdvanced.ts 纯函数计算层 (2SLS / AR / probit / Heckman / 三大检验 / 聚类与 wild bootstrap / FE-RE / FWL / LASSO / GATES), 配 14 项单元测试",
          "新增 src/components/econ/V54Tools.tsx 八个交互实验组件, 复用统一 Slider / Stat / 图表配色",
          "计量版块两级导航新增「识别与推断」分类, 工具目录同步登记 8 个新条目",
          "版本统一至 V5.4 (Navbar 徽章 / SplashIntro / 首页最新更新 / 更新日志页脚)",
        ],
      },
    ],
  },
  {
    version: "V5.3",
    date: "2026-08",
    tag: "Stable",
    highlights: [
      {
        icon: Target,
        title: "资产定价补全 — /s/asset-pricing (11 → 21 个工具)",
        items: [
          "无套利基础: 状态价格与风险中性测度 (无套利/完备性判定、不完备市场价格区间)、SDF–因子对偶、HJ 距离与 CAPM/FF3/FF5 模型比较",
          "谜题与结构模型: 长期风险 (Epstein-Zin / Bansal-Yaron)、习惯形成 (Campbell-Cochrane)、罕见灾难 (Rietz-Barro)",
          "三大谜题对照面板: CRRA / 长期风险 / 习惯 / 灾难 四条路线对股权溢价、无风险利率与超额波动的解释力并排比较",
          "实证前沿: Campbell-Shiller 分解与长期收益预测、因子动物园 (PCA / Ridge / LASSO + Harvey-Liu-Zhu t>3 门槛)、货币 Carry 与 UIP 偏离",
        ],
      },
      {
        icon: FileText,
        title: "理论导读专题 — /s/asset-pricing-theory",
        items: [
          "以 p=E[mx] 为主线的四层知识地图: 无套利骨架 → 偏好与均衡 → 实证检验 → 前沿扩展",
          "1952–2026 模型演进时间轴与三大谜题卡片 (Fact / Gap / Fix 三段式)",
          "每个理论块配「到实验室复现」入口, 直接跳转对应工具",
        ],
      },
      {
        icon: BookOpen,
        title: "工程",
        items: [
          "新增 src/lib/quant/assetPricingAdvanced.ts 纯函数计算层, 配 18 项单元测试",
          "新增 NoArbitrageTools / PuzzleTools / FrontierAssetTools 三个组件族, 复用 AssetChrome 与统一图表配色",
          "AssetPricingTools 两级导航新增「无套利基础」「谜题与结构模型」「实证前沿」三类, 工具目录同步登记",
          "版本统一至 V5.3 (Navbar 徽章 / SplashIntro / 首页最新更新 / 更新日志页脚)",
        ],
      },
    ],
  },
  {
    version: "V5.2",
    date: "2026-07",
    tag: "Stable",
    highlights: [
      {
        icon: Activity,
        title: "美股全栈数据工作台 — /s/us-suite",
        items: [
          "行情 · 技术面: Yahoo chart v8 日 K 线 + 本地 MA/EMA/MACD/RSI/KDJ/Bollinger, Brush 联动缩放",
          "基本面: SEC XBRL companyconcept 三表 (利润 / 资产负债 / 现金流) + Yahoo quoteSummary 关键指标",
          "SEC 披露流: EDGAR submissions 表单过滤 (10-K / 10-Q / 8-K / 4 / 13F / S-1) 与 2001 至今全库 EFTS 检索",
          "期权链: 到期日切换、IV 微笑散点、Black–Scholes Greeks 与 Vol/OI 异动高亮、Put/Call 比率",
          "全市场筛选: EDGAR XBRL frames 横截面排名 (Assets / Revenues / R&D…), 支持 CSV 导出",
        ],
      },
      {
        icon: BookOpen,
        title: "工程",
        items: [
          "新增 5 个 Deno edge functions: us-quote / us-fundamentals / us-filings / us-options / us-screener",
          "supabase/functions/_shared/us.ts 统一 Yahoo cookie+crumb、host fallback 重试与指标数学",
          "新增 src/lib/usData.ts 数据层与 src/components/data/USSuite.tsx 五页签工作台",
          "行情结果可经 Tool Bus 一键发送 S₀ / σ 至定价、隐含波动率与回测实验室",
          "SplashIntro 版本号改为读取 APP_VERSION_TAG, 不再硬编码; 版本统一至 V5.2",
        ],
      },
    ],
  },
  {
    version: "V5.1",
    date: "2026-07",
    tag: "Stable",
    highlights: [
      {
        icon: FileText,
        title: "前沿长文 · 当 AI 告诉我你的想法是反的 — /s/ai-quant-strategy",
        items: [
          "五章方法论复盘: 一句话生成的量化策略、四笔交易的样本量陷阱、因子的状态依赖失效",
          "Scorecard 条形卡: V1 −21.17% / V2 +829.20% / V3 +1047.39%, 回撤与回报同等字号并列",
          "两个方法论 Callout: Sample Size (夏普标准误) 与 Regime Dependence (因子符号反转)",
          "六个「在实验室里复现」入口: 回测引擎 / Walk-Forward / FF 归因 / Kelly / Michaud / 校准",
          "底部固定风险声明条 Backtest ≠ forecast, 全文不含任何推广链接",
        ],
      },
      {
        icon: BookOpen,
        title: "工程",
        items: [
          "新增 src/components/essays/AiQuantStrategyEssay.tsx, 沿用长文编辑体例 (H / P / Callout)",
          "sections.ts 注册「前沿」组第二篇长文, 万亿美元的方程页尾增加 Next Essay 跳转卡",
          "Navbar 前沿分组补齐两篇长文入口, zh/en i18n 同步",
        ],
      },
    ],
  },
  {
    version: "V5.0",
    date: "2026-07",
    tag: "Stable",
    highlights: [
      {
        icon: Sparkles,
        title: "A 股全栈接入 — /s/ashare-suite",
        items: [
          "腾讯行情 qt.gtimg.cn 实时报价 + 东方财富 push2his 日 K 线, 前复权",
          "东方财富 push2 fflow 主力/超大/大/中/小单资金流向, 90 日累计与柱状图",
          "沪深北交易所每日龙虎榜聚合 (RPT_DAILYBILLBOARD_DETAILS), 净买额排序",
          "巨潮资讯网公告流, 支持个股/全市场切换, PDF 原件直链",
          "四合一 Tab 界面 + 6 只经典 ticker preset (茅台/平安/宁德时代/中芯国际...)",
        ],
      },
      {
        icon: BookOpen,
        title: "工程",
        items: [
          "新增 4 个 Deno edge functions: ashare-quote / ashare-fundflow / ashare-longhu / ashare-news",
          "统一 sh/sz/bj 前缀归一化, 60/68/9 → sh, 4/8 → bj, 其余 → sz",
          "新增 src/components/data/AShareSuite.tsx, Navbar「数据源」组置顶入口, zh/en i18n 同步",
          "版本号自动同步至 V5.0, package.json → __APP_VERSION_TAG__ → Navbar/Footer/Hero",
        ],
      },
    ],
  },
  {
    version: "V4.9",
    date: "2026-07",
    tag: "Stable",
    highlights: [
      {
        icon: Sparkles,
        title: "品牌级开场动画 SplashIntro",
        items: [
          "首页首访全屏视频背景 + 金色 vignette + 大字标题「Theory, measured.」",
          "Enter / Skip / 静音切换三按钮, 键盘可达 (Enter/Space 进入, Esc 跳过)",
          "sessionStorage 记忆首访状态, 后续访问直达主页, 不打扰工作流",
          "循环静音自动播放, 兼容移动端 autoplay 限制, 视频加载失败自动降级为静态背景",
        ],
      },
      {
        icon: BookOpen,
        title: "工程",
        items: [
          "新增 src/components/SplashIntro.tsx (全屏 <video> + framer-motion 分层动效)",
          "Index.tsx 挂载 SplashIntro, 与 Hero/Onboarding 层级隔离, 首屏 CLS 无回归",
          "Navbar 版本徽章 / Hero 最新更新 / Footer / 更新日志统一同步至 V4.9, V4.8 标记为 Stable",
        ],
      },
    ],
  },
  {
    version: "V4.8",
    date: "2026-07",
    tag: "Stable",
    highlights: [
      {
        icon: Sparkles,
        title: "可视化组件工作台 — /s/visualization-guide",
        items: [
          "Brush + syncId 联动缩放: 策略净值与回撤面板共享 x 轴游标",
          "事件标注层: <ReferenceArea> 高亮衰退/政策窗口, <ReferenceLine> 标记结构断点",
          "Fan Chart: 蒙特卡洛/bootstrap 输出 50% / 90% 分位数带 + 中位数, 支持 samples[] 或预算 quantiles",
          "直方图 + 高斯 KDE: Silverman 带宽, 可标注 VaR/ES 临界值",
          "TimeScrubber: 播放/暂停/拖拽的动态过程回放 (IRF · Solow · Kyle)",
          "四套调色板: categorical / sequential / diverging / Okabe-Ito 色觉友好, 全部走 HSL token",
          "PNG · SVG · CSV 一键导出 (原生 XMLSerializer + <canvas>, 零新增依赖)",
          "打印友好样式: @media print 白底 · 隐藏工具条, 一键报告导出可读",
        ],
      },
      {
        icon: BookOpen,
        title: "工程",
        items: [
          "升级 src/components/common/ChartTheme.tsx: CHART_PALETTES / ThemedTooltip (formatter/sort/delta) / ChartToolbar / useChartExport / 五段式 ChartFrame",
          "新增 FanChart.tsx / HistoKde.tsx / TimeScrubber.tsx / ColorblindToggle.tsx 共享组件",
          "新增 VisualizationGuide 页面, SECTIONS 注册 /s/visualization-guide, Navbar「理论」组新增入口, zh/en i18n 同步",
          "全局 CSS: html.cb-safe 色觉友好覆盖 · @media print 图表白底 · shimmer 骨架态复用",
        ],
      },
    ],
  },
  {
    version: "V4.7",
    date: "2026-07",
    tag: "Stable",
    highlights: [
      {
        icon: Sparkles,
        title: "行为金融 & 市场微观结构实验室 — /s/behavior-microstructure",
        items: [
          "双曲贴现 (Laibson β-δ): D(t)=β·δᵗ vs 指数基线, 显式检测偏好反转",
          "DSSW 噪声交易者 IRF: mispricing = (1−σ_arb)·ρ_t, AR(1) 情绪冲击",
          "过度自信换手-α 侵蚀 (Barber-Odean): 净 α = α − k·turnover₀·cost 扫描曲线",
          "处置效应蒙特卡洛: PGR/PLR 与持有天数-回报散点",
          "Kyle 1985 均衡: λ=σ_v/(2σ_u), x*=(v−p₀)/(2λ), 深度-利润联动图",
          "Glosten-Milgrom 序贯交易: 知情比例 α → Bid/Ask 价差 (α=0 → spread=0)",
          "Roll 1984 有效价差反推: ŝ = 2√(−cov(Δpₜ,Δpₜ₋₁)) 合成 tick 验证",
          "Almgren-Chriss 最优执行: sinh(κ(T−t))/sinh(κT)·X 轨迹 + λ 扫描有效前沿 + Amihud ILLIQ",
        ],
      },
      {
        icon: BookOpen,
        title: "工程",
        items: [
          "新增纯函数库 src/lib/quant/behaviorMicro.ts (8 个模型)",
          "10 项单元测试: λ=0→VWAP, α=0→spread=0, 2λx*=v−p₀, β<1→偏好反转",
          "新增 UI 组件 V47BehaviorMicroLab.tsx (两 Tab, ScatterChart 有效前沿)",
          "SECTIONS 注册 /s/behavior-microstructure, Navbar 「理论」组新增入口, zh/en i18n 同步",
        ],
      },
    ],
  },
  {
    version: "V4.6",
    date: "2026-07",
    tag: "Stable",
    highlights: [
      {
        icon: Sparkles,
        title: "宏观经济学高阶实验室 — /s/macro-lab",
        items: [
          "财政与债务动态: b_{t+1}=(1+r)/(1+g)·b_t−s 迭代 + Blanchard (r−g) 财政空间温度计 (safe/watch/danger)",
          "Dornbusch 汇率超调: 粘性价格 + UIP 闭式解, 展示 e(0)=Δm·(1+1/(λθ)) 短期超调后向长期 PPP 回归",
          "BOP 三缺口: 会计恒等 CA ≡ (S−I)+(T−G), 一眼看穿盈余/赤字体制",
          "Bernanke-Gertler-Gilchrist 金融加速器: 净值冲击 → EFP → 投资/产出放大, 对比 RBC 无摩擦基线",
          "ZLB + 前瞻指引 Puzzle: 后向归纳求解 NK 3 方程在 i_t=0 约束下的路径, 记录 Del Negro 式放大倍数",
        ],
      },
      {
        icon: BookOpen,
        title: "工程",
        items: [
          "新增纯函数库 src/lib/quant/macroAdvanced.ts (debtDynamics / dornbuschIRF / bopGaps / bggAccelerator / zlbNKSolve)",
          "11 项单元测试全部通过: 稳定 s* 保持债务不变、汇率超调、BGG 放大 > RBC、ZLB 期数延长 → 当期 x 单调恶化",
          "新增 UI 组件 V46MacroLab.tsx (四 Tab, Recharts ComposedChart + Area 高亮 ZLB 生效期)",
          "SECTIONS 注册 /s/macro-lab, Navbar 「理论」组新增入口, zh/en i18n 同步",
        ],
      },
    ],
  },
  {
    version: "V4.4",
    date: "2026-07",
    tag: "Stable",
    highlights: [
      {
        icon: Sparkles,
        title: "外部数据生态整合 — 7 个新数据入口",
        items: [
          "CBOE 市场情绪 (/s/cboe-sentiment): VIX / VIX9D / VVIX / SKEW 一年时间序列 + VIX 期限结构 (contango/backwardation) + FRED CPCE 股票 Put/Call Ratio",
          "经济日历 (/s/econ-calendar): 未来 14 天 CPI / NFP / GDP / FOMC 等高影响事件, Trading Economics guest API + 精选静态时间表回退",
          "ETF 查询 (/s/etf-lookup): 输入代码即时抓取 etfdb.com 费率 / AUM / 类别 / YTD / 股息率, 4 小时缓存",
          "板块热力图 (/s/sector-heatmap): 11 只 SPDR 行业 ETF 一月涨跌 Finviz 风格热力图, 自采 Yahoo 数据",
          "全球市值 Top 50 (/s/market-cap): 季度快照, 行业与国别分布, 一键跳转 StockAnalysis",
          "Quiver 另类数据 (/s/quiver-signals): 议员交易 + WSB 散户热度 (需 QUIVER_API_KEY, 未配置时给指引卡)",
          "外部研究工作台 (/s/external-workbench): StockAnalysis / Finviz / Koyfin / Seeking Alpha / Cboe / Trading Economics / ETFdb / Quiver / FRED / CompaniesMarketCap 10 站 ticker-aware 深链, 输入代码全部卡片同步",
        ],
      },
      {
        icon: BookOpen,
        title: "工程",
        items: [
          "新增 3 个 Edge Function: econ-calendar / etf-lookup / quiver-signals (CORS + 缓存 + 上游失败回退)",
          "新增数据模块: src/data/topMarketCap.ts (Top 50) 与 externalWorkbenchLinks.ts (10 站 URL 模板)",
          "marketData.ts 补 useEconCalendar / useEtfLookup / useQuiverSignals 三个 React Query hook",
          "Navbar「数据源」组扩至 12 项, 命令面板与 SECTIONS 目录自动登记, i18n (zh/en) 同步",
        ],
      },
    ],
  },
  {
    version: "V4.3",
    date: "2026-07",
    tag: "Stable",
    highlights: [
      {
        icon: Sparkles,
        title: "风险管理强化 — /s/risk",
        items: [
          "系统性风险: Adrian-Brunnermeier CoVaR/ΔCoVaR (分位数回归) + Acharya MES + SRISK 资本短缺",
          "流动性 VaR: 外生 spread LVaR + Almgren-Chriss 最优清算轨迹与成本-风险有效前沿",
          "FRTB IMA: 97.5% Expected Shortfall + 10/20/40/60/120 天流动性区间加权 + Kupiec/Christoffersen 回测与 Basel 交通灯",
          "操作风险 LDA: Poisson × Lognormal 蒙特卡洛卷积 → 99.9% OpVaR/ES (Basel III AMA)",
          "反向压力测试: 闭式 δ*=(L*/bᵀΣb)·Σb, Mahalanobis 最小的可信情景",
          "集中度 & Component VaR: HHI + Euler 分解 ∑CVaRᵢ=VaR, 识别单一资产尾部贡献",
        ],
      },
      {
        icon: BookOpen,
        title: "工程",
        items: [
          "新增纯函数库 src/lib/quant/riskAdvanced.ts (CoVaR/MES/SRISK, Almgren-Chriss, FRTB LH scaling, Kupiec/Christoffersen, LDA, 反向压测, Component VaR)",
          "9 项单元测试全部通过: CoVaR 单调于 ρ、MES ≤ 无条件均值、AC λ→0 → TWAP、Euler 求和守恒等",
          "风险模块扩至 14 工具，目录 + 命令面板自动可发现",
        ],
      },
    ],
  },
  {
    version: "V4.2",
    date: "2026-07",
    tag: "Stable",
    highlights: [
      {
        icon: Sparkles,
        title: "衍生品定价强化 — /s/deriv",
        items: [
          "跳跃扩散: Merton 级数闭式 + Kou 双指数 MC, 与 BS 对比揭示短期 OTM 溢价与偏度",
          "Bates SVJ + 方差互换静态复制: VIX 隐含波与 Realized Vol 的方差风险溢价",
          "Crank-Nicolson PDE: Thomas 三对角求解, PSOR 处理美式早行权与敲出障碍",
          "Delta 对冲 P&L 归因: 分解 Γ·Θ 平衡 / Vega·Δσ / 离散误差 / 交易成本",
          "Autocallable / Phoenix 结构化票据: 赎回概率、期望存续期与 KI 命中率",
          "XVA (CVA / DVA / FVA): 利率互换 EE/NE/PFE95 暴露曲线 + 双边信用与融资调整",
        ],
      },
      {
        icon: BookOpen,
        title: "工程",
        items: [
          "新增纯函数库 src/lib/quant/derivAdvanced.ts (Merton/Kou、Bates MC、CN-PSOR、Hedge PnL、Autocall、XVA)",
          "10 项单元测试全部通过: Merton→BS 极限、CN 与 BS 对齐、美式≥欧式、CVA 单调于 λ_C 等",
          "衍生品导航扩至 6 类 17 工具, 目录 + 命令面板自动可发现",
        ],
      },
    ],
  },
  {
    version: "V4.1",
    date: "2026-07",
    tag: "Stable",
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
  const allVersions = useMemo(() => RELEASES.map((r) => r.version), []);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set([RELEASES[0]?.version].filter(Boolean) as string[])
  );

  const isAllExpanded = expanded.size === allVersions.length;

  const toggle = (version: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(version)) next.delete(version);
      else next.add(version);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(allVersions));
  const collapseAll = () => setExpanded(new Set());

  return (
    <section className="py-20 px-6 bg-background border-t border-border/40">
      <div className="container max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-6"
        >
          <p className="text-[10px] font-mono text-gold tracking-[0.3em] uppercase mb-2">
            Release Notes · 更新日志
          </p>
          <h2 className="text-3xl md:text-4xl font-display text-foreground mb-3">
            {t("changelog.title")}
          </h2>
          <p className="text-sm text-muted-foreground font-mono">
            {t("changelog.subtitle")} — V1.0 → V7.2
          </p>
        </motion.div>

        <div className="flex justify-end mb-8">
          <button
            type="button"
            onClick={isAllExpanded ? collapseAll : expandAll}
            className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-gold hover:text-gold/80 transition-colors"
            aria-label={isAllExpanded ? t("changelog.collapseAll") : t("changelog.expandAll")}
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
            {isAllExpanded ? t("changelog.collapseAll") : t("changelog.expandAll")}
          </button>
        </div>

        <div className="space-y-6">
          {RELEASES.map((release, i) => {
            const isOpen = expanded.has(release.version);
            return (
              <motion.div
                key={release.version}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border/60 bg-card/35 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggle(release.version)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-card/55 transition-colors"
                  aria-expanded={isOpen}
                  aria-controls={`release-${release.version}`}
                >
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
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <div
                  id={`release-${release.version}`}
                  className={`px-5 pb-5 ${isOpen ? "" : "hidden"}`}
                >
                  <div className="grid md:grid-cols-2 gap-4">
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
                </div>

                {!isOpen && (
                  <div className="px-5 pb-4">
                    <div className="flex flex-wrap gap-2">
                      {release.highlights.map((h) => (
                        <span
                          key={h.title}
                          className="text-[10px] font-mono text-foreground/60 bg-accent/30 px-2 py-1 rounded"
                        >
                          {h.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Changelog;

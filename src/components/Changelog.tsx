import { motion } from "framer-motion";
import { Sparkles, Wrench, BookOpen, Zap, Layout, GraduationCap } from "lucide-react";
import { useTranslation } from "react-i18next";

const RELEASES = [
  {
    version: "V1.8",
    date: "2026-04",
    tag: "Current",
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
            {t("changelog.subtitle")} — V1.0 → V1.8
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

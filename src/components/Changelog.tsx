import { motion } from "framer-motion";
import { Sparkles, Wrench, BookOpen, Zap, Layout, GraduationCap } from "lucide-react";
import { useTranslation } from "react-i18next";

const RELEASES = [
  {
    version: "V1.3",
    date: "2026-04",
    tag: "Current",
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
            {t("changelog.subtitle")} — V1.0 → V1.2
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

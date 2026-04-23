import { motion } from "framer-motion";
import { Sparkles, Wrench, BookOpen, Zap, Layout, GraduationCap } from "lucide-react";

const RELEASES = [
  {
    version: "V1.1",
    date: "2026-04",
    tag: "Current",
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
            Changelog
          </h2>
          <p className="text-sm text-muted-foreground font-mono">
            追踪平台每次迭代的能力增量，从 V1.0 到 V1.1 的完整升级路径。
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

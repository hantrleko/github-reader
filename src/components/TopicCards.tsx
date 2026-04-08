import { motion } from "framer-motion";
import {
  TrendingUp,
  PieChart,
  BarChart3,
  Activity,
  Layers,
  GitBranch,
} from "lucide-react";

const topics = [
  {
    icon: TrendingUp,
    title: "资产定价",
    subtitle: "Asset Pricing",
    desc: "CAPM、Fama-French 三因子/五因子、APT 套利定价理论",
    tags: ["CAPM", "FF3", "APT"],
  },
  {
    icon: BarChart3,
    title: "计量经济学",
    subtitle: "Econometrics",
    desc: "OLS 回归、面板数据、工具变量、GMM 估计方法",
    tags: ["OLS", "IV", "GMM"],
  },
  {
    icon: Activity,
    title: "时间序列",
    subtitle: "Time Series",
    desc: "ARIMA、GARCH 波动率建模、协整与向量自回归",
    tags: ["ARIMA", "GARCH", "VAR"],
  },
  {
    icon: PieChart,
    title: "投资组合理论",
    subtitle: "Portfolio Theory",
    desc: "均值-方差优化、有效前沿、Black-Litterman 模型",
    tags: ["MVO", "EF", "BL"],
  },
  {
    icon: GitBranch,
    title: "衍生品定价",
    subtitle: "Derivatives",
    desc: "Black-Scholes、二叉树模型、蒙特卡洛模拟",
    tags: ["BS", "Binomial", "MC"],
  },
  {
    icon: Layers,
    title: "风险管理",
    subtitle: "Risk Management",
    desc: "VaR、CVaR、信用风险模型、压力测试方法论",
    tags: ["VaR", "CVaR", "Stress"],
  },
];

const TopicCards = () => {
  return (
    <section className="py-24 px-6">
      <div className="container">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold mb-3">
            Core Disciplines
          </p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
            学科领域
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {topics.map((topic, i) => (
            <motion.div
              key={i}
              className="group relative p-6 rounded-xl bg-card border border-border hover:border-gold/30 transition-all duration-500 cursor-pointer overflow-hidden"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-gold/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <topic.icon className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-semibold text-foreground">
                      {topic.title}
                    </h3>
                    <p className="text-xs font-mono text-muted-foreground">
                      {topic.subtitle}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-secondary-foreground leading-relaxed mb-4">
                  {topic.desc}
                </p>
                <div className="flex flex-wrap gap-2">
                  {topic.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 text-[11px] font-mono rounded-md bg-secondary text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TopicCards;

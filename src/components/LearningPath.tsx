import { motion } from "framer-motion";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";

const steps = [
  { title: "概率论与数理统计基础", desc: "随机变量、分布、假设检验、大数定律与中心极限定理", done: true },
  { title: "微观经济学与博弈论", desc: "消费者理论、厂商理论、一般均衡、纳什均衡", done: true },
  { title: "金融经济学基础", desc: "无套利原理、风险中性定价、随机折现因子", done: false },
  { title: "计量经济学方法", desc: "OLS、MLE、IV、面板数据、因果推断", done: false },
  { title: "实证资产定价", desc: "因子模型构建、Fama-MacBeth 回归、异象研究", done: false },
  { title: "高级专题", desc: "机器学习在金融中的应用、高频数据分析、文本分析", done: false },
];

const LearningPath = () => {
  return (
    <section className="py-24 px-6">
      <div className="container max-w-3xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold mb-3">
            Learning Roadmap
          </p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
            学习路径
          </h2>
        </motion.div>

        <div className="space-y-0">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              className="relative flex gap-5"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                {step.done ? (
                  <CheckCircle2 className="w-6 h-6 text-gold shrink-0" />
                ) : (
                  <Circle className="w-6 h-6 text-muted-foreground shrink-0" />
                )}
                {i < steps.length - 1 && (
                  <div className="w-px flex-1 bg-border my-1" />
                )}
              </div>

              {/* Content */}
              <div className="pb-10">
                <div className="flex items-center gap-2 mb-1">
                  <h3
                    className={`text-lg font-display font-semibold ${
                      step.done ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </h3>
                  {!step.done && i === 2 && (
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-gold/10 text-gold border border-gold/20">
                      当前阶段
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <button className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm transition-transform hover:scale-105">
            开始学习
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default LearningPath;

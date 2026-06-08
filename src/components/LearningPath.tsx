import { motion } from "framer-motion";
import { CheckCircle2, Circle, ArrowRight, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const STEPS = [
  { id: "prob", title: "概率论与数理统计基础", desc: "掌握随机变量、分布、假设检验、LLN 与 CLT，为估计一致性和推断有效性打底", target: "topics" },
  { id: "micro", title: "微观经济学与博弈论", desc: "理解偏好、约束、均衡与策略互动，为资产需求和市场机制建立微观基础", target: "topics" },
  { id: "fin", title: "金融经济学基础", desc: "串联无套利、风险中性定价、SDF 与均值-方差框架，形成金融模型的共同语言", target: "models" },
  { id: "econ", title: "计量经济学方法", desc: "从 OLS、MLE、IV、GMM 到面板与因果推断，学会识别假设、估计参数和验证结论", target: "topics" },
  { id: "ap", title: "实证资产定价", desc: "构建因子、执行 Fama-MacBeth 回归、检验异象，并将理论溢价转化为可复现实证流程", target: "calculator" },
  { id: "adv", title: "高级专题与研究产出", desc: "探索机器学习、高频数据、文本分析与 Notebook 复现，把工具链沉淀为课程项目或研究原型", target: "mc-pricer" },
];

const STORAGE_KEY = "learning-progress-v1";

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const LearningPath = () => {
  const { t } = useTranslation();
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDone(JSON.parse(raw));
    } catch {
      // Ignore malformed local progress and start fresh.
    }
  }, []);

  const persist = (next: Record<string, boolean>) => {
    setDone(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Local storage can be unavailable in private or restricted contexts.
    }
  };

  const toggle = (id: string) => persist({ ...done, [id]: !done[id] });
  const reset = () => persist({});

  const completed = STEPS.filter((s) => done[s.id]).length;
  const pct = Math.round((completed / STEPS.length) * 100);
  const firstUndone = STEPS.find((s) => !done[s.id]) ?? STEPS[0];
  const allDone = completed === STEPS.length;

  return (
    <section className="py-24 px-6">
      <div className="container max-w-3xl">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold mb-3">
            {t("sections.learning.tag")}
          </p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
            {t("sections.learning.title")}
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-sm md:text-base text-foreground/65 leading-relaxed">
            这条路线把数学基础、经济直觉、金融定价和实证研究串成连续阶梯，适合按阶段打卡，也适合快速定位当前薄弱环节。
          </p>
        </motion.div>

        {/* Progress bar */}
        <div className="mb-10 p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-muted-foreground">
              已完成 {completed} / {STEPS.length}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-gold font-semibold">{pct}%</span>
              <button
                onClick={reset}
                title="重置进度"
                aria-label="重置学习进度"
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-gold/70 to-gold"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <div className="space-y-0">
          {STEPS.map((step, i) => {
            const isDone = !!done[step.id];
            const isCurrent = !isDone && step.id === firstUndone.id;
            return (
              <motion.div
                key={step.id}
                className="relative flex gap-5"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => toggle(step.id)}
                    className="shrink-0 transition-transform hover:scale-110"
                    title={isDone ? "标记为未完成" : "标记为完成"}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-6 h-6 text-gold" />
                    ) : (
                      <Circle className="w-6 h-6 text-muted-foreground" />
                    )}
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className="w-px flex-1 bg-border my-1" />
                  )}
                </div>

                <div className="pb-10 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <button
                      onClick={() => toggle(step.id)}
                      className={`text-lg font-display font-semibold text-left transition-colors ${
                        isDone ? "text-foreground line-through decoration-gold/50" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {step.title}
                    </button>
                    {isCurrent && (
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
            );
          })}
        </div>

        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <button
            onClick={() => scrollTo(allDone ? "topics" : firstUndone.target)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm transition-transform hover:scale-105"
          >
            {allDone ? "全部完成 — 复习一下" : completed === 0 ? "开始学习" : "继续：" + firstUndone.title}
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default LearningPath;

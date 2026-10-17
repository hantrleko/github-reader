import { motion } from "framer-motion";
import { CheckCircle2, Circle, ArrowRight, RotateCcw, Cloud } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { LEARNING_STAGES, stageSections } from "@/lib/learningPath";
import { sectionHref, sectionLabel } from "@/lib/sections";
import { useAuth } from "@/hooks/useAuth";
import {
  getProgress,
  resetProgress,
  subscribeUserProgress,
  syncProgress,
  toggleProgress,
} from "@/lib/userProgress";

const LearningPath = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [, force] = useState(0);
  const rerender = useCallback(() => force((n) => n + 1), []);

  useEffect(() => subscribeUserProgress(rerender), [rerender]);

  useEffect(() => {
    if (user) void syncProgress(user.id);
  }, [user]);

  const doneStages = getProgress("learning");
  const seenSections = getProgress("section");

  const stages = useMemo(
    () => LEARNING_STAGES.map((s) => ({ stage: s, items: stageSections(s) })),
    []
  );

  const completed = stages.filter(({ stage }) => doneStages[stage.id]).length;
  const pct = Math.round((completed / stages.length) * 100);
  const current = stages.find(({ stage }) => !doneStages[stage.id]) ?? stages[0];
  const allDone = completed === stages.length;

  /** Where "continue" should take you: first unread section of the current stage. */
  const nextSectionId =
    current.items.find((s) => !seenSections[s.id])?.id ??
    current.items[0]?.id ??
    "topics";
  const currentTitle = t(`learning.stages.${current.stage.id}.title`);

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
            {t("learning.intro")}
          </p>
        </motion.div>

        {/* Progress bar */}
        <div className="mb-10 p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-muted-foreground inline-flex items-center gap-2">
              {t("sections.learning.progress", { done: completed, total: stages.length })}
              {user && (
                <span
                  className="inline-flex items-center gap-1 text-gold/80"
                  title={t("learning.synced")}
                >
                  <Cloud className="w-3 h-3" />
                  {t("learning.synced")}
                </span>
              )}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-gold font-semibold">{pct}%</span>
              <button
                onClick={() => resetProgress("learning")}
                title={t("sections.learning.reset")}
                aria-label={t("sections.learning.reset")}
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
          {stages.map(({ stage, items }, i) => {
            const isDone = !!doneStages[stage.id];
            const isCurrent = !isDone && stage.id === current.stage.id;
            const title = t(`learning.stages.${stage.id}.title`);
            const readCount = items.filter((s) => seenSections[s.id]).length;
            return (
              <motion.div
                key={stage.id}
                className="relative flex gap-5"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => toggleProgress("learning", stage.id)}
                    className="shrink-0 transition-transform hover:scale-110"
                    title={isDone ? t("learning.markUndone") : t("learning.markDone")}
                    aria-pressed={isDone}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-6 h-6 text-gold" />
                    ) : (
                      <Circle className="w-6 h-6 text-muted-foreground" />
                    )}
                  </button>
                  {i < stages.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
                </div>

                <div className="pb-10 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <button
                      onClick={() => toggleProgress("learning", stage.id)}
                      className={`text-lg font-display font-semibold text-left transition-colors ${
                        isDone
                          ? "text-foreground line-through decoration-gold/50"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {title}
                    </button>
                    {isCurrent && (
                      <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-gold/10 text-gold border border-gold/20">
                        {t("sections.learning.current")}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-muted-foreground/70">
                      {t("learning.read", { done: readCount, total: items.length })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(`learning.stages.${stage.id}.desc`)}
                  </p>

                  {/* Real section links for this stage */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {items.map((s) => {
                      const seen = !!seenSections[s.id];
                      return (
                        <Link
                          key={s.id}
                          to={sectionHref(s.id)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                            seen
                              ? "border-gold/40 text-gold bg-gold/5"
                              : "border-border/70 text-foreground/70 hover:border-gold/40 hover:text-gold"
                          }`}
                        >
                          {seen && <CheckCircle2 className="w-3 h-3" />}
                          {sectionLabel(t, s)}
                        </Link>
                      );
                    })}
                    <Link
                      to={`/d/${stage.group}`}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground hover:text-gold transition-colors"
                    >
                      {t("learning.domainLink")}
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
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
            onClick={() => navigate(sectionHref(allDone ? "quiz" : nextSectionId))}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm transition-transform hover:scale-105"
          >
            {allDone
              ? t("sections.learning.allDone")
              : completed === 0
              ? t("sections.learning.start")
              : t("sections.learning.continue", { title: currentTitle })}
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default LearningPath;

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Trophy, RotateCcw, ChevronRight, Sparkles } from "lucide-react";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import { Cite } from "@/lib/citations";
import { useTranslation } from "react-i18next";
import { EquationBlock } from "@/components/common/EquationBlock";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { QUIZ_QUESTIONS as QUESTIONS } from "@/data/quizQuestions";
import { SECTION_MAP, sectionHref } from "@/lib/sections";
import { loadStates, saveStates, newCard, review } from "@/lib/srs";

const STORAGE_KEY = "quiz-progress-v1";

interface Progress {
  answered: Record<string, { correct: boolean; chosen: number }>;
  totalAttempts: number;
}

const loadProgress = (): Progress => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { answered: {}, totalAttempts: 0 };
};
const saveProgress = (p: Progress) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
};

const QuizSection = () => {
  const { t, i18n } = useTranslation();
  const [topic, setTopic] = useState<string>("__all__");
  const [filterMode, setFilterMode] = useState<"all" | "wrong" | "unanswered">("all");
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const isEn = i18n.language?.startsWith("en");
  const ALL = "__all__";
  const topicLabel = (id: string) => {
    if (id === ALL) return t("quiz.allTopics");
    const found = QUESTIONS.find((q) => q.topic === id);
    return isEn && found ? found.topicEn : id;
  };
  const topics = useMemo(() => [ALL, ...Array.from(new Set(QUESTIONS.map(q => q.topic)))], []);
  const filtered = useMemo(() => {
    let list = topic === ALL ? QUESTIONS : QUESTIONS.filter(q => q.topic === topic);
    if (filterMode === "wrong") {
      list = list.filter(q => progress.answered[q.id] && !progress.answered[q.id].correct);
    } else if (filterMode === "unanswered") {
      list = list.filter(q => !progress.answered[q.id]);
    }
    return list.length > 0 ? list : (topic === ALL ? QUESTIONS : QUESTIONS.filter(q => q.topic === topic));
  }, [topic, filterMode, progress.answered]);

  const wrongCount = useMemo(
    () => Object.values(progress.answered).filter(a => !a.correct).length,
    [progress.answered]
  );
  const unansweredCount = QUESTIONS.length - Object.keys(progress.answered).length;

  // Reset when topic changes
  useEffect(() => { setIdx(0); setChosen(null); setRevealed(false); }, [topic, filterMode]);

  const q = filtered[idx % Math.max(filtered.length, 1)];

  const stats = useMemo(() => {
    const total = QUESTIONS.length;
    const answered = Object.keys(progress.answered).length;
    const correct = Object.values(progress.answered).filter(a => a.correct).length;
    const accuracy = answered ? correct / answered : 0;
    return { total, answered, correct, accuracy };
  }, [progress]);

  const handleSelect = (i: number) => {
    if (revealed) return;
    setChosen(i);
    setRevealed(true);
    const isCorrect = i === q.answer;
    const next: Progress = {
      ...progress,
      totalAttempts: progress.totalAttempts + 1,
      answered: { ...progress.answered, [q.id]: { correct: isCorrect, chosen: i } },
    };
    setProgress(next);
    saveProgress(next);

    // Feed the spaced-repetition deck: wrong answers come back soon, right
    // answers get pushed further out (SM-2).
    const states = loadStates("quiz");
    const card = states[q.id] ?? newCard(q.id);
    states[q.id] = review(card, isCorrect ? 4 : 1);
    saveStates(states, "quiz");
  };

  const next = () => {
    setChosen(null);
    setRevealed(false);
    setIdx((i) => (i + 1) % filtered.length);
  };

  const reset = () => {
    const fresh = { answered: {}, totalAttempts: 0 };
    setProgress(fresh);
    saveProgress(fresh);
    setChosen(null);
    setRevealed(false);
    setIdx(0);
  };

  const optionStyle = (i: number) => {
    if (!revealed) return "border-border hover:border-gold/60 hover:bg-gold/5";
    if (i === q.answer) return "border-emerald-500/60 bg-emerald-500/10";
    if (i === chosen) return "border-destructive/60 bg-destructive/10";
    return "border-border opacity-50";
  };

  return (
    <section className="py-24 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/20 to-transparent pointer-events-none" />
      <div className="container relative z-10 max-w-4xl">
        <motion.div className="text-center mb-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold mb-3">{t("sections.quiz.tag")}</p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">{t("sections.quiz.title")}</h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto">{t("sections.quiz.subtitle")}</p>
        </motion.div>

        {/* Progress dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{t("sections.quiz.answered")}</p>
            <p className="text-2xl font-mono text-gold tabular-nums">{stats.answered}<span className="text-sm text-muted-foreground">/{stats.total}</span></p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{t("sections.quiz.correct")}</p>
            <p className="text-2xl font-mono text-emerald-400 tabular-nums">{stats.correct}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{t("sections.quiz.accuracy")}</p>
            <p className="text-2xl font-mono text-gold tabular-nums">{(stats.accuracy * 100).toFixed(0)}%</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{t("sections.quiz.attempts")}</p>
              <p className="text-2xl font-mono text-foreground tabular-nums">{progress.totalAttempts}</p>
            </div>
            <button onClick={reset} title={t("quiz.reset")} aria-label={t("quiz.reset")}
              className="p-2 rounded border border-border hover:border-destructive hover:text-destructive transition-colors">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Topic filter */}
        <div className="flex flex-wrap gap-2 mb-6 justify-center">
          {topics.map(tp => (
            <button key={tp} onClick={() => setTopic(tp)}
              className={"text-xs px-3 py-1.5 rounded border font-mono transition-colors " +
                (topic === tp ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground hover:text-foreground")}>
              {topicLabel(tp)}
            </button>
          ))}
        </div>

        {/* Mode filter — 错题回顾 / 仅未答 */}
        <div className="flex flex-wrap gap-2 mb-6 justify-center">
          {[
            { id: "all" as const, label: `${t("quiz.modeAll")} · ${QUESTIONS.length}` },
            { id: "wrong" as const, label: `${t("quiz.modeWrong")} · ${wrongCount}`, disabled: wrongCount === 0 },
            { id: "unanswered" as const, label: `${t("quiz.modeUnanswered")} · ${unansweredCount}`, disabled: unansweredCount === 0 },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => !m.disabled && setFilterMode(m.id)}
              disabled={m.disabled}
              className={"text-xs px-3 py-1.5 rounded border font-mono transition-colors disabled:opacity-40 disabled:cursor-not-allowed " +
                (filterMode === m.id
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-border/60 text-muted-foreground hover:text-foreground")}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Question card */}
        <motion.div
          key={q.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-border bg-card p-6 md:p-10 glow-gold"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold/80 border border-gold/30 px-2 py-0.5 rounded">{isEn ? q.topicEn : q.topic}</span>
            <span className="text-[10px] font-mono text-muted-foreground">{t("sections.quiz.question", { i: idx + 1, n: filtered.length })}</span>
          </div>
          <h3 className="text-lg md:text-xl font-display font-semibold text-foreground leading-relaxed mb-4">{q.question}</h3>
          {q.formula && (
            <div className="my-4 py-3 px-4 rounded-lg bg-secondary/40 border border-gold/20 text-foreground katex-display-gold text-center">
              <EquationBlock math={q.formula} />
            </div>
          )}

          <div className="space-y-2 mb-6">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={revealed}
                className={"w-full text-left p-3 md:p-4 rounded-lg border transition-all flex items-start gap-3 " + optionStyle(i)}
              >
                <span className="font-mono text-xs text-muted-foreground mt-0.5">{String.fromCharCode(65 + i)}.</span>
                <span className="flex-1 text-sm">{opt}</span>
                {revealed && i === q.answer && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                {revealed && i === chosen && i !== q.answer && <XCircle className="w-5 h-5 text-destructive shrink-0" />}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {revealed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className={"rounded-lg p-4 border " + (chosen === q.answer
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-destructive/40 bg-destructive/5")}>
                  <div className="flex items-center gap-2 mb-2">
                    {chosen === q.answer
                      ? <><Trophy className="w-4 h-4 text-emerald-400" /><span className="text-sm font-semibold text-emerald-400">{t("quiz.correctAnswer")}</span></>
                      : <><Sparkles className="w-4 h-4 text-gold" /><span className="text-sm font-semibold text-gold">{t("quiz.explanation")}</span></>}
                  </div>
                  <p className="text-sm text-secondary-foreground leading-relaxed">{q.explanation}</p>
                  {SECTION_MAP[q.sectionId] && (
                    <Link
                      to={sectionHref(q.sectionId)}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-mono text-gold hover:underline"
                    >
                      {t("quiz.gotoLab", { name: SECTION_MAP[q.sectionId].label })}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                  {q.citeId && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {t("quiz.reference")}<Cite id={q.citeId} />
                    </p>
                  )}
                </div>
                <div className="flex justify-end mt-4">
                  <button onClick={next}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gold text-background hover:bg-gold/90 font-mono text-sm transition-colors">
                    {t("sections.quiz.next")} <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};

export default QuizSection;

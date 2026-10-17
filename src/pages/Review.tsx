/**
 * /review — 间隔重复复习 (SM-2) over the glossary deck.
 * 看中文术语 → 回忆定义/公式 → 翻面 → 自评 1/3/4/5 → SM-2 排期。
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import SectionHeader from "@/components/common/SectionHeader";
import { GLOSSARY } from "@/data/glossary";
import { QUIZ_QUESTIONS } from "@/data/quizQuestions";
import { sectionHref, SECTION_MAP, sectionLabel } from "@/lib/sections";
import { useTranslation } from "react-i18next";
import {
  type CardState, type Grade, type Deck,
  loadStates, saveStates, newCard, review, buildQueue, deckStats,
} from "@/lib/srs";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import { Brain, RotateCcw, CheckCircle2, Flame, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const Review = () => {
  const { t, i18n } = useTranslation();
  const GRADE_BTNS: { grade: Grade; label: string; hint: string; cls: string }[] = [
    { grade: 1, label: t("review.grades.forgot", { defaultValue: "忘了" }), hint: t("review.grades.forgotHint", { defaultValue: "10 分钟后重来" }), cls: "border-rose-500/60 text-rose-400 hover:bg-rose-500/10" },
    { grade: 3, label: t("review.grades.hard", { defaultValue: "模糊" }), hint: t("review.grades.hardHint", { defaultValue: "缩短间隔" }), cls: "border-amber-500/60 text-amber-400 hover:bg-amber-500/10" },
    { grade: 4, label: t("review.grades.good", { defaultValue: "想起来了" }), hint: t("review.grades.goodHint", { defaultValue: "正常间隔" }), cls: "border-emerald-500/60 text-emerald-400 hover:bg-emerald-500/10" },
    { grade: 5, label: t("review.grades.easy", { defaultValue: "秒答" }), hint: t("review.grades.easyHint", { defaultValue: "拉长间隔" }), cls: "border-gold/60 text-gold hover:bg-gold/10" },
  ];
  
  const CAT_LABEL: Record<string, string> = {
    pricing: t("review.categories.pricing", { defaultValue: "定价" }), risk: t("review.categories.risk", { defaultValue: "风险" }), econ: t("review.categories.econ", { defaultValue: "计量" }), macro: t("review.categories.macro", { defaultValue: "宏观" }), stats: t("review.categories.stats", { defaultValue: "统计" }), quant: t("review.categories.quant", { defaultValue: "量化" }),
  };
  

  const [deck, setDeck] = useState<Deck>("glossary");
  const allSlugs = useMemo(
    () => (deck === "glossary" ? GLOSSARY.map((g) => g.slug) : QUIZ_QUESTIONS.map((q) => q.id)),
    [deck]
  );
  const [states, setStates] = useState<Record<string, CardState>>(() => loadStates("glossary"));
  const [queue, setQueue] = useState<string[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);

  // Rebuild the session queue whenever the deck changes (states are per-deck).
  useEffect(() => {
    const loaded = loadStates(deck);
    setStates(loaded);
    const q = buildQueue(
      deck === "glossary" ? GLOSSARY.map((g) => g.slug) : QUIZ_QUESTIONS.map((x) => x.id),
      loaded
    );
    setQueue([...q.due, ...q.fresh]);
    setDone(0);
    setFlipped(false);
  }, [deck]);

  const stats = useMemo(() => deckStats(allSlugs, states), [allSlugs, states]);
  const currentSlug = queue[0];
  const term = useMemo(
    () => (deck === "glossary" ? GLOSSARY.find((g) => g.slug === currentSlug) : undefined),
    [currentSlug, deck]
  );
  const quizCard = useMemo(
    () => (deck === "quiz" ? QUIZ_QUESTIONS.find((q) => q.id === currentSlug) : undefined),
    [currentSlug, deck]
  );
  const card = term ?? quizCard;

  const grade = (g: Grade) => {
    if (!currentSlug) return;
    const prev = states[currentSlug] ?? newCard(currentSlug);
    const next = review(prev, g);
    const nextStates = { ...states, [currentSlug]: next };
    setStates(nextStates);
    saveStates(nextStates, deck);
    setFlipped(false);
    setDone((d) => d + 1);
    setQueue((q) => {
      const rest = q.slice(1);
      // lapsed card goes to the back of this session's queue
      return g < 3 ? [...rest, currentSlug] : rest;
    });
  };

  const restart = () => {
    const q = buildQueue(allSlugs, states);
    setQueue([...q.due, ...q.fresh]);
    setDone(0);
    setFlipped(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={t("review.seo.title", { defaultValue: "间隔重复复习 · EF Lab" })}
        description={t("review.seo.description", { defaultValue: "用 SM-2 间隔重复算法复习量化金融与计量经济学核心术语:45+ 张卡片,含 KaTeX 公式,按遗忘曲线自动排期。" })}
        path="/review"
      />
      <Navbar />
      <main id="main-content" className="pt-14">
        <SectionHeader
          chapter="Review"
          kicker="SPACED REPETITION"
          title={t("review.heading", { defaultValue: "间隔重复复习" })}
          subtitle={t("review.subtitle", { defaultValue: "SM-2 算法按你的遗忘曲线排期 · 术语卡片来自全站术语表 · 每天几分钟,长期记住核心概念。" })}
        />

        <section className="container max-w-3xl px-6 pb-16 space-y-6">
          {/* Deck stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
            {[
              { k: t("review.stats.mastered", { defaultValue: "已掌握" }), v: stats.mastered, icon: CheckCircle2, cls: "text-emerald-400" },
              { k: t("review.stats.learning", { defaultValue: "学习中" }), v: stats.learning, icon: Flame, cls: "text-amber-400" },
              { k: t("review.stats.fresh", { defaultValue: "未学习" }), v: stats.fresh, icon: Sparkles, cls: "text-muted-foreground" },
              { k: t("review.stats.due", { defaultValue: "本次待复习" }), v: queue.length, icon: Brain, cls: "text-gold" },
            ].map(({ k, v, icon: Icon, cls }) => (
              <div key={k} className="border border-border/40 bg-card/40 px-2 py-2">
                <p className={cn("text-lg font-mono tabular-nums", cls)}>
                  <Icon className="inline w-4 h-4 mr-1 -mt-0.5" />
                  {v}
                </p>
                <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{k}</p>
              </div>
            ))}
          </div>

          {/* Deck switch */}
          <div className="flex justify-center gap-2">
            {([
              { id: "glossary" as const, label: t("review.decks.glossary", { defaultValue: "术语卡 · {{total}}", total: GLOSSARY.length }) },
              { id: "quiz" as const, label: t("review.decks.quiz", { defaultValue: "测验错题 · {{total}}", total: QUIZ_QUESTIONS.length }) },
            ]).map((d) => (
              <button
                key={d.id}
                onClick={() => setDeck(d.id)}
                className={cn(
                  "px-3 py-1.5 border text-xs font-mono transition-colors",
                  deck === d.id
                    ? "border-gold text-gold bg-gold/10"
                    : "border-border/60 text-muted-foreground hover:text-foreground"
                )}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Card */}
          {!card ? (
            <div className="border border-border/60 bg-card/40 p-10 text-center space-y-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="text-foreground font-display text-lg">
                {done > 0 ? t("review.empty.completed", { defaultValue: "本次复习完成 — {{total}} 张卡片", total: done }) : t("review.empty.noDue", { defaultValue: "当前没有到期卡片" })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("review.empty.nextReview", { defaultValue: "SM-2 已根据你的自评安排下次复习时间。明天再来,或去 " })}<Link to="/glossary" className="text-gold underline">{t("review.glossary", { defaultValue: "术语表" })}</Link>{t("review.empty.browse", { defaultValue: " 浏览全部术语。" })}
              </p>
              <button onClick={restart} className="inline-flex items-center gap-1 px-3 py-1.5 border border-border/60 text-xs font-mono hover:border-gold/60">
                <RotateCcw className="w-3 h-3" /> {t("review.restart", { defaultValue: "重新抽取队列" })}
              </button>
            </div>
          ) : quizCard ? (
            <div className="border border-border/60 bg-card/40">
              <div className="px-6 pt-8 pb-6 space-y-3">
                <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-muted-foreground text-center">
                  {quizCard.topic}{t("review.cardProgress", { defaultValue: " · 卡片 {{current}} / {{total}}", current: done + 1, total: done + queue.length })}
                </p>
                <h2 className="font-display text-xl text-foreground leading-relaxed text-center">
                  {quizCard.question}
                </h2>
                <ul className="space-y-1.5 text-sm text-foreground/80">
                  {quizCard.options.map((opt, i) => (
                    <li
                      key={i}
                      className={cn(
                        "border border-border/50 px-3 py-2",
                        flipped && i === quizCard.answer && "border-emerald-500/60 bg-emerald-500/10"
                      )}
                    >
                      <span className="font-mono text-xs text-muted-foreground mr-2">
                        {String.fromCharCode(65 + i)}.
                      </span>
                      {opt}
                    </li>
                  ))}
                </ul>
              </div>

              {!flipped ? (
                <div className="px-6 pb-8 text-center">
                  <button
                    onClick={() => setFlipped(true)}
                    className="px-6 py-2.5 bg-gold text-background text-xs font-mono uppercase tracking-wider hover:bg-gold/85"
                  >
                    {t("review.showAnswer", { defaultValue: "显示答案" })}
                  </button>
                </div>
              ) : (
                <div className="border-t border-accent/30">
                  <div className="px-6 py-5 space-y-3 text-left">
                    <p className="text-sm text-foreground/85 leading-relaxed">{quizCard.explanation}</p>
                    {SECTION_MAP[quizCard.sectionId] && (
                      <Link
                        to={sectionHref(quizCard.sectionId)}
                        className="text-[10px] font-mono text-gold underline"
                      >
                        {t("review.openLab", { defaultValue: "去对应实验室：" })}{sectionLabel(t, SECTION_MAP[quizCard.sectionId])}
                      </Link>
                    )}
                  </div>
                  <div className="grid grid-cols-4 border-t border-accent/30">
                    {GRADE_BTNS.map(({ grade: g, label, hint, cls }) => (
                      <button
                        key={g}
                        onClick={() => grade(g)}
                        className={cn("px-2 py-3 border-r last:border-r-0 border-accent/30 text-center transition-colors", cls)}
                      >
                        <span className="block text-xs font-mono">{label}</span>
                        <span className="block text-[9px] font-mono opacity-70">{hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : term ? (
            <div className="border border-border/60 bg-card/40">
              {/* front */}
              <div className="px-6 pt-8 pb-6 text-center space-y-2">
                <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
                  {CAT_LABEL[term.category] ?? term.category}{t("review.cardProgress", { defaultValue: " · 卡片 {{current}} / {{total}}", current: done + 1, total: done + queue.length })}
                </p>
                <h2 className="font-display text-2xl text-foreground">{term.zh}</h2>
                <p className="text-sm font-mono text-muted-foreground">{term.en}</p>
              </div>

              {!flipped ? (
                <div className="px-6 pb-8 text-center">
                  <button
                    onClick={() => setFlipped(true)}
                    className="px-6 py-2.5 bg-gold text-background text-xs font-mono uppercase tracking-wider hover:bg-gold/85"
                  >
                    {t("review.showAnswer", { defaultValue: "显示答案" })}
                  </button>
                  <p className="mt-3 text-[10px] font-mono text-muted-foreground">{t("review.recallHint", { defaultValue: "先在脑中回忆定义与公式,再翻面自评。" })}</p>
                </div>
              ) : (
                <div className="border-t border-accent/30">
                  <div className="px-6 py-5 space-y-3 text-left">
                    <p className="text-sm text-foreground/85 leading-relaxed">{term.def}</p>
                    {term.formula && (
                      <div className="py-2 text-center overflow-x-auto">
                        <InlineMath math={term.formula} />
                      </div>
                    )}
                    {term.tools && term.tools.length > 0 && (
                      <p className="text-[10px] font-mono text-muted-foreground">
                        {t("review.relatedTools", { defaultValue: "相关工具: " })}{term.tools.join(" · ")}{t("review.toolsAvailable", { defaultValue: " — 可在 " })}<Link to="/tools" className="text-gold underline">{t("review.toolDirectory", { defaultValue: "工具目录" })}</Link>{t("review.openTools", { defaultValue: " 打开" })}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-4 border-t border-accent/30">
                    {GRADE_BTNS.map(({ grade: g, label, hint, cls }) => (
                      <button
                        key={g}
                        onClick={() => grade(g)}
                        className={cn("px-2 py-3 border-r last:border-r-0 border-accent/30 text-center transition-colors", cls)}
                      >
                        <span className="block text-xs font-mono">{label}</span>
                        <span className="block text-[9px] font-mono opacity-70">{hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <p className="text-[10px] font-mono text-muted-foreground text-center">
            {t("review.schedulingNote", { defaultValue: "SM-2:答对间隔按 1 天 → 6 天 → 间隔×EF 增长;答错重置并 10 分钟后重现。进度保存在本地浏览器。" })}
          </p>
        </section>
      </main>
    </div>
  );
};

export default Review;

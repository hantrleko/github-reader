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
import {
  type CardState, type Grade,
  loadStates, saveStates, newCard, review, buildQueue, deckStats,
} from "@/lib/srs";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import { Brain, RotateCcw, CheckCircle2, Flame, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const GRADE_BTNS: { grade: Grade; label: string; hint: string; cls: string }[] = [
  { grade: 1, label: "忘了", hint: "10 分钟后重来", cls: "border-rose-500/60 text-rose-400 hover:bg-rose-500/10" },
  { grade: 3, label: "模糊", hint: "缩短间隔", cls: "border-amber-500/60 text-amber-400 hover:bg-amber-500/10" },
  { grade: 4, label: "想起来了", hint: "正常间隔", cls: "border-emerald-500/60 text-emerald-400 hover:bg-emerald-500/10" },
  { grade: 5, label: "秒答", hint: "拉长间隔", cls: "border-gold/60 text-gold hover:bg-gold/10" },
];

const CAT_LABEL: Record<string, string> = {
  pricing: "定价", risk: "风险", econ: "计量", macro: "宏观", stats: "统计", quant: "量化",
};

const Review = () => {
  const allSlugs = useMemo(() => GLOSSARY.map((g) => g.slug), []);
  const [states, setStates] = useState<Record<string, CardState>>(() => loadStates());
  const [queue, setQueue] = useState<string[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);

  useEffect(() => {
    const q = buildQueue(allSlugs, states);
    setQueue([...q.due, ...q.fresh]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => deckStats(allSlugs, states), [allSlugs, states]);
  const currentSlug = queue[0];
  const term = useMemo(() => GLOSSARY.find((g) => g.slug === currentSlug), [currentSlug]);

  const grade = (g: Grade) => {
    if (!currentSlug) return;
    const prev = states[currentSlug] ?? newCard(currentSlug);
    const next = review(prev, g);
    const nextStates = { ...states, [currentSlug]: next };
    setStates(nextStates);
    saveStates(nextStates);
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
        title="间隔重复复习 · EF Lab"
        description="用 SM-2 间隔重复算法复习量化金融与计量经济学核心术语:45+ 张卡片,含 KaTeX 公式,按遗忘曲线自动排期。"
        path="/review"
      />
      <Navbar />
      <main id="main-content" className="pt-14">
        <SectionHeader
          chapter="Review"
          kicker="SPACED REPETITION"
          title="间隔重复复习"
          subtitle="SM-2 算法按你的遗忘曲线排期 · 术语卡片来自全站术语表 · 每天几分钟,长期记住核心概念。"
        />

        <section className="container max-w-3xl px-6 pb-16 space-y-6">
          {/* Deck stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
            {[
              { k: "已掌握", v: stats.mastered, icon: CheckCircle2, cls: "text-emerald-400" },
              { k: "学习中", v: stats.learning, icon: Flame, cls: "text-amber-400" },
              { k: "未学习", v: stats.fresh, icon: Sparkles, cls: "text-muted-foreground" },
              { k: "本次待复习", v: queue.length, icon: Brain, cls: "text-gold" },
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

          {/* Card */}
          {!term ? (
            <div className="border border-border/60 bg-card/40 p-10 text-center space-y-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="text-foreground font-display text-lg">
                {done > 0 ? `本次复习完成 — ${done} 张卡片` : "当前没有到期卡片"}
              </p>
              <p className="text-xs text-muted-foreground">
                SM-2 已根据你的自评安排下次复习时间。明天再来,或去 <Link to="/glossary" className="text-gold underline">术语表</Link> 浏览全部术语。
              </p>
              <button onClick={restart} className="inline-flex items-center gap-1 px-3 py-1.5 border border-border/60 text-xs font-mono hover:border-gold/60">
                <RotateCcw className="w-3 h-3" /> 重新抽取队列
              </button>
            </div>
          ) : (
            <div className="border border-border/60 bg-card/40">
              {/* front */}
              <div className="px-6 pt-8 pb-6 text-center space-y-2">
                <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
                  {CAT_LABEL[term.category] ?? term.category} · 卡片 {done + 1} / {done + queue.length}
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
                    显示答案
                  </button>
                  <p className="mt-3 text-[10px] font-mono text-muted-foreground">先在脑中回忆定义与公式,再翻面自评。</p>
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
                        相关工具: {term.tools.join(" · ")} — 可在 <Link to="/tools" className="text-gold underline">工具目录</Link> 打开
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
          )}

          <p className="text-[10px] font-mono text-muted-foreground text-center">
            SM-2:答对间隔按 1 天 → 6 天 → 间隔×EF 增长;答错重置并 10 分钟后重现。进度保存在本地浏览器。
          </p>
        </section>
      </main>
    </div>
  );
};

export default Review;

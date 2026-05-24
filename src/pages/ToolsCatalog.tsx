import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, BadgeCheck, ExternalLink, X, WifiOff, Wifi } from "lucide-react";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import { cn } from "@/lib/utils";
import {
  TOOLS_CATALOG,
  CATEGORY_LABEL,
  DIFFICULTY_LABEL,
  type ToolCategory,
  type Difficulty,
  type ToolEntry,
} from "@/data/toolsCatalog";

const ALL_CATEGORIES = Object.keys(CATEGORY_LABEL) as ToolCategory[];
const ALL_DIFFICULTIES = Object.keys(DIFFICULTY_LABEL) as Difficulty[];

const ToolsCatalog = () => {
  const [q, setQ] = useState("");
  const [cats, setCats] = useState<Set<ToolCategory>>(new Set());
  const [diffs, setDiffs] = useState<Set<Difficulty>>(new Set());
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const toggle = <T,>(set: Set<T>, val: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    next.has(val) ? next.delete(val) : next.add(val);
    setter(next);
  };

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return TOOLS_CATALOG.filter((t) => {
      if (cats.size && !cats.has(t.category)) return false;
      if (diffs.size && !diffs.has(t.difficulty)) return false;
      if (verifiedOnly && !t.verified) return false;
      if (!ql) return true;
      const hay = `${t.name} ${t.nameEn} ${t.blurb} ${t.tags.join(" ")} ${t.refs.join(" ")}`.toLowerCase();
      return hay.includes(ql);
    });
  }, [q, cats, diffs, verifiedOnly]);

  // group by category for display
  const grouped = useMemo(() => {
    const m = new Map<ToolCategory, ToolEntry[]>();
    for (const t of filtered) {
      if (!m.has(t.category)) m.set(t.category, []);
      m.get(t.category)!.push(t);
    }
    return Array.from(m.entries());
  }, [filtered]);

  const verifiedCount = TOOLS_CATALOG.filter((t) => t.verified).length;

  return (
    <div className="min-h-screen bg-background">
      <Seo title="工具目录 · EF Lab" description="完整的量化金融与计量经济学交互工具索引：按主题、难度与可验证性筛选。" path="/tools" />
      <Navbar />
      <main className="container max-w-6xl px-6 pt-20 pb-24">
        {/* Hero */}
        <header className="mb-10">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-gold transition-colors mb-6"
          >
            <ArrowLeft className="w-3 h-3" /> 返回首页
          </Link>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-mono text-gold tracking-[0.3em] uppercase">
              Catalog · V2.9
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-gold/40 to-transparent" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display text-foreground mb-3">
            全部工具索引
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {TOOLS_CATALOG.length} 个交互式金融与计量工具，按章节 / 难度 / 引用文献组织。
            {" "}
            <span className="text-foreground/80">
              <BadgeCheck className="inline w-3.5 h-3.5 text-emerald-500 mb-0.5" />{" "}
              {verifiedCount} 个已通过闭式解单元测试
            </span>
            。
          </p>
        </header>

        {/* Filters */}
        <section className="rounded-xl border border-border/60 bg-card/40 p-5 mb-8">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜索工具名 / 标签 / 论文…（如 Heston、动量、Vasicek）"
                className="w-full pl-9 pr-9 py-2.5 rounded-lg bg-background border border-border text-sm font-body focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/40 transition"
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label="清除搜索"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-gold/80 mb-2">
                  章节
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_CATEGORIES.map((c) => {
                    const on = cats.has(c);
                    return (
                      <button
                        key={c}
                        onClick={() => toggle(cats, c, setCats)}
                        className={cn(
                          "px-2 py-1 rounded text-[11px] font-mono transition-colors border",
                          on
                            ? "bg-gold/15 border-gold/60 text-gold"
                            : "bg-background border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                        )}
                      >
                        {CATEGORY_LABEL[c].zh}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-gold/80 mb-2">
                  难度
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_DIFFICULTIES.map((d) => {
                    const on = diffs.has(d);
                    return (
                      <button
                        key={d}
                        onClick={() => toggle(diffs, d, setDiffs)}
                        className={cn(
                          "px-2 py-1 rounded text-[11px] font-mono transition-colors border",
                          on
                            ? "bg-gold/15 border-gold/60 text-gold"
                            : "bg-background border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                        )}
                      >
                        {DIFFICULTY_LABEL[d].zh}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-gold/80 mb-2">
                  质量
                </p>
                <label className="inline-flex items-center gap-2 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="accent-gold"
                  />
                  <span className="text-foreground/80">仅显示</span>
                  <span className="inline-flex items-center gap-1 text-emerald-500">
                    <BadgeCheck className="w-3.5 h-3.5" /> 已验证
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
            <p className="text-[11px] font-mono text-muted-foreground">
              匹配 <span className="text-gold">{filtered.length}</span> /{" "}
              {TOOLS_CATALOG.length} 个工具
            </p>
            {(q || cats.size || diffs.size || verifiedOnly) && (
              <button
                onClick={() => {
                  setQ("");
                  setCats(new Set());
                  setDiffs(new Set());
                  setVerifiedOnly(false);
                }}
                className="text-[11px] font-mono text-muted-foreground hover:text-gold transition-colors"
              >
                清除筛选 ×
              </button>
            )}
          </div>
        </section>

        {/* Grouped results */}
        {grouped.length === 0 && (
          <div className="py-20 text-center text-sm text-muted-foreground font-mono">
            没有匹配的工具 — 试试调整筛选条件。
          </div>
        )}

        <div className="space-y-10">
          {grouped.map(([cat, items]) => (
            <section key={cat}>
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="text-lg font-display text-foreground">
                  {CATEGORY_LABEL[cat].zh}
                </h2>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70">
                  {CATEGORY_LABEL[cat].en} · {items.length}
                </span>
                <div className="flex-1 h-px bg-border/60" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((t) => (
                  <ToolCard key={t.id} tool={t} query={q} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
};

const ToolCard = ({ tool, query }: { tool: ToolEntry; query: string }) => {
  const diff = DIFFICULTY_LABEL[tool.difficulty];
  // Pure-client categories work offline; only Platform tools (Notebook sync,
  // real-data loaders) require the network.
  const offlineCapable = tool.category !== "platform";
  return (
    <Link
      to={tool.anchor}
      className="group block rounded-xl border border-border/60 bg-card/30 p-4 hover:border-gold/50 hover:bg-card/60 transition-all hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <h3 className="text-sm font-display text-foreground group-hover:text-gold transition-colors leading-tight">
            <Highlight text={tool.name} query={query} />
          </h3>
          <p className="text-[10px] font-mono text-muted-foreground/80 mt-0.5">
            {tool.nameEn}
          </p>
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-gold shrink-0 mt-0.5" />
      </div>

      <p className="text-xs text-foreground/70 leading-relaxed mb-3 line-clamp-2">
        <Highlight text={tool.blurb} query={query} />
      </p>

      <div className="flex flex-wrap gap-1 mb-3">
        {tool.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted/50 text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono pt-2 border-t border-border/40">
        <div className="flex items-center gap-2">
          <span className={cn("uppercase tracking-wider", diff.tone)}>
            {diff.zh}
          </span>
          <span className="text-muted-foreground/60">{tool.version}</span>
          {offlineCapable ? (
            <span
              className="inline-flex items-center gap-0.5 text-[hsl(var(--teal-glow))]"
              title="纯客户端算法,离线可用"
            >
              <WifiOff className="w-3 h-3" /> offline
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-0.5 text-muted-foreground/70"
              title="依赖网络服务(数据源 / 云同步)"
            >
              <Wifi className="w-3 h-3" /> online
            </span>
          )}
        </div>
        {tool.verified && (
          <span
            className="inline-flex items-center gap-0.5 text-emerald-500"
            title="已通过闭式解单元测试"
          >
            <BadgeCheck className="w-3 h-3" /> verified
          </span>
        )}
      </div>

      {tool.refs.length > 0 && (
        <p className="text-[10px] font-mono text-muted-foreground/60 mt-2 italic line-clamp-1">
          {tool.refs[0]}
          {tool.refs.length > 1 && ` · +${tool.refs.length - 1}`}
        </p>
      )}
    </Link>
  );
};

/** Lightweight match highlighter for the search query. */
const Highlight = ({ text, query }: { text: string; query: string }) => {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-gold/25 text-gold rounded px-0.5">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
};

export default ToolsCatalog;
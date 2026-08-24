import { Navigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import ScrollUtilities from "@/components/ScrollUtilities";
import SectionHeader from "@/components/common/SectionHeader";
import SiteFooter from "@/components/SiteFooter";
import { NAV_GROUPS, SECTION_MAP, type SectionDef, type SectionLevel } from "@/lib/sections";

/** Learning order shown on every domain hub. */
const LEVEL_ORDER: SectionLevel[] = ["guide", "basic", "advanced", "frontier", "data"];

const LEVEL_META: Record<SectionLevel, { zh: string; en: string; hint: string }> = {
  guide: { zh: "导读", en: "Reading Guide", hint: "先建立语言与直觉" },
  basic: { zh: "基础工具", en: "Basic", hint: "把核心公式跑一遍" },
  advanced: { zh: "进阶实验室", en: "Advanced", hint: "放松假设、加入摩擦" },
  frontier: { zh: "前沿实验室", en: "Frontier", hint: "研究级模型与新范式" },
  data: { zh: "真实数据", en: "Live Data", hint: "把模型接到真实市场" },
};

const SectionCard = ({ s }: { s: SectionDef }) => (
  <Link
    to={`/s/${s.id}`}
    aria-label={`${s.label}${s.subtitle ? ` — ${s.subtitle}` : ""}`}
    className="group block h-full rounded-xl border border-border/60 bg-card/35 p-4 hover:border-gold/40 hover:bg-card/55 hover:-translate-y-0.5 transition-all duration-300"
  >
    <div className="flex items-start justify-between gap-2">
      <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-gold/70">{s.chapter}</span>
      <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-gold transition-all shrink-0" />
    </div>
    <h3 className="mt-2 font-display text-base text-foreground leading-snug group-hover:text-gold transition-colors">
      {s.label}
    </h3>
    {s.subtitle && (
      <p className="mt-1.5 text-xs text-foreground/60 leading-relaxed line-clamp-2">{s.subtitle}</p>
    )}
    {s.prereq?.length ? (
      <p className="mt-2 text-[10px] font-mono text-muted-foreground">
        建议先看：{s.prereq.map((p) => SECTION_MAP[p]?.kicker ?? p).join(" · ")}
      </p>
    ) : null}
  </Link>
);

const DomainPage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const group = NAV_GROUPS.find((g) => g.id === groupId);
  if (!group) return <Navigate to="/" replace />;

  const sections = group.items
    .map((id) => SECTION_MAP[id])
    .filter((s): s is SectionDef => Boolean(s));

  const buckets = LEVEL_ORDER.map((level) => ({
    level,
    items: sections.filter((s) => (s.level ?? "basic") === level),
  })).filter((b) => b.items.length > 0);

  const title = `${group.label} · ${group.kicker}`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title={`${group.label}学科主线 · ${group.kicker} | 经济与金融实验室`}
        description={`${group.desc}。按导读 → 基础 → 进阶 → 前沿的顺序学习 ${group.label} 领域的 ${sections.length} 个板块。`}
        path={`/d/${group.id}`}
      />
      <Navbar />
      <ScrollUtilities />

      <main id="main-content" className="flex-1 pt-14">
        <div className="container max-w-6xl px-6 pt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-gold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回首页
          </Link>
        </div>

        <SectionHeader
          chapter={`Domain ${group.code}`}
          kicker={group.kicker}
          title={title}
          subtitle={`${group.desc}。按下面的顺序推进：导读建立语言，基础跑通公式，进阶放松假设，前沿进入研究现场。`}
        />

        <div className="container max-w-6xl px-6 space-y-10 pb-8">
          {buckets.map(({ level, items }) => (
            <section key={level}>
              <div className="flex items-baseline gap-3 mb-3">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold/80">
                  {LEVEL_META[level].en}
                </p>
                <h2 className="font-display text-lg text-foreground">{LEVEL_META[level].zh}</h2>
                <span className="text-[11px] text-muted-foreground">{LEVEL_META[level].hint}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((s) => (
                  <SectionCard key={s.id} s={s} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <nav className="container max-w-6xl px-6 mt-6 mb-12">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-3">
            其他学科主线
          </p>
          <div className="flex flex-wrap gap-2">
            {NAV_GROUPS.filter((g) => g.id !== group.id).map((g) => (
              <Link
                key={g.id}
                to={`/d/${g.id}`}
                className="rounded-full border border-border/60 bg-card/35 px-3 py-1.5 text-xs text-foreground/75 hover:border-gold/40 hover:text-gold transition-colors"
              >
                {g.code} {g.label}
              </Link>
            ))}
          </div>
        </nav>
      </main>

      <SiteFooter />
    </div>
  );
};

export default DomainPage;

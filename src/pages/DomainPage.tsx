import { Navigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import ScrollUtilities from "@/components/ScrollUtilities";
import SectionHeader from "@/components/common/SectionHeader";
import SiteFooter from "@/components/SiteFooter";
import { useTranslation } from "react-i18next";
import { NAV_GROUPS, SECTION_MAP, sectionHref, sectionLabel, sectionSubtitle, groupDesc, type SectionDef, type SectionLevel } from "@/lib/sections";
import { LEARNING_STAGES, stageSections } from "@/lib/learningPath";

/** Learning order shown on every domain hub. */
const LEVEL_ORDER: SectionLevel[] = ["guide", "basic", "advanced", "frontier", "data"];

const LEVEL_EN: Record<SectionLevel, string> = {
  guide: "Reading Guide",
  basic: "Basic",
  advanced: "Advanced",
  frontier: "Frontier",
  data: "Live Data",
};

/** Overview hub only: a three-minute tour of the whole site via the learning path. */
const OverviewQuickstart = () => {
  const { t } = useTranslation();
  return (
    <section className="container max-w-6xl px-6 pb-8">
      <div className="rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/5 to-transparent p-6 md:p-8">
        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-2">
          {t("domain.quickstart.eyebrow")}
        </p>
        <h2 className="font-display text-2xl text-foreground">{t("domain.quickstart.title")}</h2>
        <p className="mt-2 text-sm text-foreground/70 leading-relaxed max-w-2xl">
          {t("domain.quickstart.lead")}
        </p>
        <ol className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          {LEARNING_STAGES.map((stage, i) => {
            const first = stageSections(stage)[0];
            return (
              <li key={stage.id} className="rounded-xl border border-border/60 bg-background/40 p-4">
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-gold/80">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 font-display text-base text-foreground leading-snug">
                  {t(`learning.stages.${stage.id}.title`)}
                </h3>
                {first && (
                  <Link
                    to={sectionHref(first.id)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-mono text-gold hover:underline"
                  >
                    {sectionLabel(t, first)}
                    <ArrowUpRight className="w-3 h-3" />
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
};

const SectionCard = ({ s, prereqLabel }: { s: SectionDef; prereqLabel: string }) => {
  const { t } = useTranslation();
  return (
  <Link
    to={`/s/${s.id}`}
    aria-label={`${sectionLabel(t, s)}${s.subtitle ? ` — ${sectionSubtitle(t, s)}` : ""}`}
    className="group block h-full rounded-xl border border-border/60 bg-card/35 p-4 hover:border-gold/40 hover:bg-card/55 hover:-translate-y-0.5 transition-all duration-300"
  >
    <div className="flex items-start justify-between gap-2">
      <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-gold/70">{s.chapter}</span>
      <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-gold transition-all shrink-0" />
    </div>
    <h3 className="mt-2 font-display text-base text-foreground leading-snug group-hover:text-gold transition-colors">
      {sectionLabel(t, s)}
    </h3>
    {s.subtitle && (
      <p className="mt-1.5 text-xs text-foreground/60 leading-relaxed line-clamp-2">{sectionSubtitle(t, s)}</p>
    )}
    {s.prereq?.length ? (
      <p className="mt-2 text-[10px] font-mono text-muted-foreground">
        {prereqLabel}{s.prereq.map((p) => SECTION_MAP[p]?.kicker ?? p).join(" · ")}
      </p>
    ) : null}
  </Link>
  );
};

const DomainPage = () => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language.startsWith("en");
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

  const groupLabel = t(`nav.groups.${group.id}`, { defaultValue: group.label });
  const title = `${groupLabel} · ${group.kicker}`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title={isEn
          ? `${groupLabel} Track · ${group.kicker} | EF LAB`
          : `${group.label}学科主线 · ${group.kicker} | EF LAB`}
        description={isEn
          ? `${groupDesc(t, group)}. Learn the ${groupLabel} domain through ${sections.length} sections ordered guide → basic → advanced → frontier.`
          : `${group.desc}。按导读 → 基础 → 进阶 → 前沿的顺序学习 ${group.label} 领域的 ${sections.length} 个板块。`}
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
            {t("section.backHome")}
          </Link>
        </div>

        <SectionHeader
          chapter={`Domain ${group.code}`}
          kicker={group.kicker}
          title={title}
          subtitle={`${groupDesc(t, group)}${t("domain.orderHint")}`}
        />

        {group.id === "overview" && <OverviewQuickstart />}

        <div className="container max-w-6xl px-6 space-y-10 pb-8">
          {buckets.map(({ level, items }) => (
            <section key={level}>
              <div className="flex items-baseline gap-3 mb-3">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold/80">
                  {LEVEL_EN[level]}
                </p>
                <h2 className="font-display text-lg text-foreground">{t(`domain.level.${level}.label`)}</h2>
                <span className="text-[11px] text-muted-foreground">{t(`domain.level.${level}.hint`)}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((s) => (
                  <SectionCard key={s.id} s={s} prereqLabel={t("domain.prereq")} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <nav className="container max-w-6xl px-6 mt-6 mb-12">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-3">
            {t("domain.otherTracks")}
          </p>
          <div className="flex flex-wrap gap-2">
            {NAV_GROUPS.filter((g) => g.id !== group.id).map((g) => (
              <Link
                key={g.id}
                to={`/d/${g.id}`}
                className="rounded-full border border-border/60 bg-card/35 px-3 py-1.5 text-xs text-foreground/75 hover:border-gold/40 hover:text-gold transition-colors"
              >
                {g.code} {t(`nav.groups.${g.id}`, { defaultValue: g.label })}
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

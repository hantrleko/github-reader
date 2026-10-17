import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import SectionHeader from "@/components/common/SectionHeader";
import { sectionsByGroup, groupDesc } from "@/lib/sections";

/**
 * Ten domain entries right below the hero — a first-time visitor should see
 * the whole scope of the site without scrolling past seven marketing blocks.
 */
const DomainStrip = () => {
  const { t } = useTranslation();
  const groups = sectionsByGroup().filter(({ sections }) => sections.length > 0);

  return (
    <section id="domains" className="scroll-mt-16 px-6 pt-8 pb-4">
      <SectionHeader
        chapter={t("home.domains.chapter")}
        kicker={t("home.domains.kicker")}
        title={t("home.domains.title")}
        subtitle={t("home.domains.subtitle")}
      />
      <div className="container max-w-6xl mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {groups.map(({ group, sections }) => (
          <Link
            key={group.id}
            to={`/d/${group.id}`}
            className="group rounded-xl border border-border/60 bg-card/35 p-4 hover:border-gold/40 hover:bg-card/55 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-20px_hsl(var(--gold)/0.35)] transition-all duration-300"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-gold/70">
                {group.code} / {group.kicker}
              </span>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-gold group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
            </div>
            <h3 className="mt-2 font-display text-base text-foreground leading-snug group-hover:text-gold transition-colors">
              {t(`nav.groups.${group.id}`, { defaultValue: group.label })}
            </h3>
            <p className="mt-1.5 text-xs text-foreground/60 leading-relaxed line-clamp-2">
              {groupDesc(t, group)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default DomainStrip;

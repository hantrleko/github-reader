import { Link } from "react-router-dom";
import { ArrowUpRight, FlaskConical, GraduationCap, Route } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Three primary entry paths shown right after the hero. */
const EntryCards = () => {
  const { t } = useTranslation();
  const card = "group flex flex-col rounded-xl border border-border/60 bg-card/45 p-5 hover:border-gold/50 hover:bg-card/70 transition-colors";
  const items = [
    { key: "demo", icon: FlaskConical, to: "/s/econometrics?t=olsiv" },
    { key: "homework", icon: GraduationCap, to: "/s/asset-pricing", secondary: "/s/backtest" },
    { key: "playbooks", icon: Route, to: "/workflows" },
  ];
  return (
    <section id="start" aria-labelledby="entry-title" className="scroll-mt-16 px-6 py-10">
      <div className="container max-w-6xl">
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold/80">{t("home.entry.kicker")}</p>
        <h2 id="entry-title" className="mt-1 font-display text-2xl md:text-3xl text-foreground">{t("home.entry.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("home.entry.subtitle")}</p>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map(({ key, icon: Icon, to, secondary }) => (
            <div key={key} className={card}>
              <Icon className="w-6 h-6 text-gold" aria-hidden />
              <h3 className="mt-3 font-display text-lg text-foreground">{t(`home.entry.${key}.title`)}</h3>
              <p className="mt-1.5 flex-1 text-sm text-foreground/70 leading-relaxed">{t(`home.entry.${key}.desc`)}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link to={to} className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-mono uppercase tracking-wider text-background hover:opacity-90">
                  {t(`home.entry.${key}.cta`)} <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
                {secondary && (
                  <Link to={secondary} className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-gold">
                    {t(`home.entry.${key}.secondary`)} →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EntryCards;

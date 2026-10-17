import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { NAV_GROUPS, groupEntryHref, groupLabel, groupDesc } from "@/lib/sections";

/** Domain entries derived from the unified IA (same order/names as navbar). */
const HeroToolStrip = () => {
  const reduce = useReducedMotion();
  const { t } = useTranslation();
  return (
    <section className="px-6 -mt-2 pb-12">
      <div className="container max-w-7xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-9 gap-0 border border-accent/40 bg-card/30">
          {NAV_GROUPS.map((g, i) => {
            const label = groupLabel(t, g);
            const desc = groupDesc(t, g);
            return (
              <motion.div
                key={g.code}
                initial={reduce ? undefined : { opacity: 0, y: 12 }}
                whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className={`${
                  i < NAV_GROUPS.length - 1 ? "border-r border-accent/30" : ""
                } border-b xl:border-b-0 border-accent/30`}
              >
                <Link
                  to={groupEntryHref(g)}
                  aria-label={`${label} ${g.kicker} — ${desc}`}
                  className="group relative block p-4 h-full transition-all duration-300 hover:bg-accent/25 hover:shadow-[0_14px_36px_-24px_hsl(var(--gold)/0.4)]"
                >
                  <span className="absolute top-0 left-0 h-0.5 w-0 bg-gold transition-all duration-300 group-hover:w-full" />
                  <span className="block text-[9px] font-mono text-gold tracking-[0.18em] mb-2">
                    {g.code} / {g.kicker.toUpperCase()}
                  </span>
                  <h5 className="text-[12px] font-mono font-bold uppercase tracking-wider text-foreground group-hover:text-gold transition-colors mb-1 leading-tight">
                    {label}
                  </h5>
                  <p className="text-[10px] text-foreground/55 leading-snug">{desc}</p>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HeroToolStrip;

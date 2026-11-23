import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import { LEGAL_UPDATED, PRIVACY, TERMS } from "@/pages/legal/content";

const LegalPage = ({ kind }: { kind: "terms" | "privacy" }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("en") ? "en" : "zh";
  const doc = (kind === "terms" ? TERMS : PRIVACY)[lang];

  return (
    <div className="min-h-screen bg-background">
      <Seo title={`${doc.title} · EF LAB`} description={doc.intro} path={`/${kind}`} />
      <Navbar />
      <main id="main-content" className="pt-20 pb-20">
        <article className="container max-w-3xl px-6">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-2">LEGAL</p>
          <h1 className="font-display text-3xl md:text-4xl text-foreground mb-2">{doc.title}</h1>
          <p className="text-xs font-mono text-muted-foreground mb-6">{t("authFlow.legalUpdated", { date: LEGAL_UPDATED })}</p>
          <p className="text-base text-foreground/90 mb-8">{doc.intro}</p>
          {doc.sections.map((s) => (
            <section key={s.h} className="mb-6">
              <h2 className="font-display text-xl text-foreground mb-2">{s.h}</h2>
              {s.p.map((p) => (
                <p key={p} className="text-sm leading-relaxed text-muted-foreground mb-2">{p}</p>
              ))}
            </section>
          ))}
        </article>
      </main>
    </div>
  );
};

export const TermsPage = () => <LegalPage kind="terms" />;
export const PrivacyPage = () => <LegalPage kind="privacy" />;
export default LegalPage;

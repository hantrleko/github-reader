import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";

const LanguageToggle = () => {
  const { i18n, t } = useTranslation();
  const cur = i18n.language?.startsWith("en") ? "en" : "zh";
  const next = cur === "zh" ? "en" : "zh";
  return (
    <button
      onClick={() => i18n.changeLanguage(next)}
      aria-label={t("nav.lang")}
      title={t("nav.lang")}
      className={cn(
        "p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 flex items-center gap-1"
      )}
    >
      <Languages className="w-4 h-4" />
      <span className="text-[10px] font-mono tracking-wider uppercase">{cur}</span>
    </button>
  );
};

export default LanguageToggle;
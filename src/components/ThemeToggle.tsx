import { useTranslation } from "react-i18next";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/**
 * Theme toggle — intentionally framer-motion-free: this component sits in the
 * navbar (entry chunk), and importing framer-motion here would force the whole
 * vendor-framer chunk into first-load. A tiny CSS transition does the same job.
 */
const ThemeToggle = () => {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative p-1.5 rounded-md text-muted-foreground hover:text-gold hover:bg-accent transition-colors overflow-hidden w-7 h-7 flex items-center justify-center"
      title={isDark ? t("labs.themeToggle.text1", { defaultValue: "切换到浅色模式" }) : t("labs.themeToggle.text2", { defaultValue: "切换到深色模式" })}
      aria-label={isDark ? t("labs.themeToggle.text1", { defaultValue: "切换到浅色模式" }) : t("labs.themeToggle.text2", { defaultValue: "切换到深色模式" })}
      aria-pressed={isDark}
    >
      <span
        key={isDark ? "sun" : "moon"}
        className="absolute inset-0 flex items-center justify-center animate-in fade-in-0 zoom-in-50 spin-in-90 duration-200"
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </span>
    </button>
  );
};

export default ThemeToggle;

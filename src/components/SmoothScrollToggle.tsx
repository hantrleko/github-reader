import { useEffect, useState } from "react";
import { MoveVertical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getSmoothScrollEnabled } from "@/lib/scrollSettings";

const KEY = "ef:smooth-scroll";

const SmoothScrollToggle = () => {
  const { t } = useTranslation();
  const [on, setOn] = useState(getSmoothScrollEnabled);

  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === KEY) setOn(e.newValue === "1");
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const toggle = () => {
    const next = !on;
    setOn(next);
    localStorage.setItem(KEY, next ? "1" : "0");
  };

  return (
    <button
      onClick={toggle}
      className="relative p-1.5 rounded-md text-muted-foreground hover:text-gold hover:bg-accent transition-colors w-7 h-7 flex items-center justify-center"
      title={on ? t("nav.smoothScroll.on") : t("nav.smoothScroll.off")}
      aria-label={on ? t("nav.smoothScroll.on") : t("nav.smoothScroll.off")}
      aria-pressed={on}
    >
      <MoveVertical className={`w-4 h-4 ${on ? "text-gold" : ""}`} />
    </button>
  );
};

export default SmoothScrollToggle;

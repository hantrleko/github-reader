import { useTranslation } from "react-i18next";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/**
 * Slim emerald strip that appears at the very top of the page when the
 * browser reports `navigator.onLine === false`. Pure-client calculators
 * still work; network-bound tools (FRED, AI explain, Notebook sync) will
 * surface their own errors.
 */
const OfflineBanner = () => {
  const { t } = useTranslation();
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[60] bg-[hsl(var(--teal))] text-[hsl(var(--accent-foreground))] text-[11px] font-mono uppercase tracking-[0.18em] py-1.5 px-4 flex items-center justify-center gap-2 shadow-md"
    >
      <WifiOff className="w-3.5 h-3.5" />
      {t("labs.offlineBanner.text1", { defaultValue: "Offline mode · 已切换到本地缓存,核心计算器仍可使用" })}
    </div>
  );
};

export default OfflineBanner;
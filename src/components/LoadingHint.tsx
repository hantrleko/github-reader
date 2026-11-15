import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export const SLOW_LOAD_MS = 6000;

/**
 * Visible "loading" text for lazy pages/tools. After SLOW_LOAD_MS it adds a
 * plain note that the download is slow. It never gives up or retries by itself:
 * a real failure is shown by SectionErrorBoundary.
 */
const LoadingHint = ({ what = "tool" }: { what?: "tool" | "page" }) => {
  const { t } = useTranslation();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setSlow(true), SLOW_LOAD_MS);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div role="status" aria-live="polite" className="text-center text-xs text-muted-foreground font-mono">
      <p>
        {what === "page"
          ? t("common.loadingHint.page", { defaultValue: "正在加载页面…" })
          : t("common.loadingHint.tool", { defaultValue: "正在加载交互工具…" })}
      </p>
      {slow && (
        <p className="mt-1.5">
          {t("common.loadingHint.slow", { defaultValue: "下载比平时慢，可能是网络较慢。下载完成后会自动显示。" })}
        </p>
      )}
    </div>
  );
};

export default LoadingHint;

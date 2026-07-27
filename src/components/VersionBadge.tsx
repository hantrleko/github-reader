import { APP_VERSION_TAG, BUILD_DATE } from "@/lib/appVersion";
import { cn } from "@/lib/utils";

interface VersionBadgeProps {
  className?: string;
  showBuildDate?: boolean;
}

/**
 * Small gold version chip derived from package.json (single source of truth).
 * Used by Navbar and SiteFooter. Hover title exposes the build date.
 */
export function VersionBadge({ className, showBuildDate = false }: VersionBadgeProps) {
  return (
    <span
      title={BUILD_DATE ? `Build ${BUILD_DATE}` : undefined}
      className={cn(
        "inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 border border-gold/60 text-gold tracking-wider whitespace-nowrap",
        className,
      )}
    >
      {APP_VERSION_TAG}
      {showBuildDate && BUILD_DATE ? (
        <span className="text-gold/60">· {BUILD_DATE}</span>
      ) : null}
    </span>
  );
}
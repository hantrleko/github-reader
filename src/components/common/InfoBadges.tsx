import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

type Level = "basic" | "intermediate" | "advanced";

const LEVEL_META: Record<Level, { dot: string; label: string; ring: string }> = {
  basic:        { dot: "bg-emerald-500",  label: "入门 · Basic",        ring: "border-emerald-500/30 text-emerald-500" },
  intermediate: { dot: "bg-amber-500",    label: "进阶 · Intermediate", ring: "border-amber-500/30 text-amber-500" },
  advanced:     { dot: "bg-rose-500",     label: "高阶 · Advanced",     ring: "border-rose-500/30 text-rose-500" },
};

export const DifficultyBadge = ({ level }: { level: Level }) => {
  const m = LEVEL_META[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider ${m.ring}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
};

export const WhyItMatters = ({
  title = "为什么重要 · Why it matters",
  children,
}: {
  title?: string;
  children: ReactNode;
}) => (
  <div className="rounded-lg border border-gold/20 bg-gradient-to-br from-gold/5 to-transparent p-4 my-4 flex gap-3">
    <Sparkles className="w-4 h-4 text-gold shrink-0 mt-0.5" />
    <div>
      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold/80 mb-1">{title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{children}</p>
    </div>
  </div>
);

export const TermTooltip = ({
  cn: cnTerm,
  en,
  children,
}: {
  cn: string;
  en: string;
  children: ReactNode;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="underline decoration-dotted decoration-gold/50 underline-offset-2 cursor-help inline-flex items-center gap-0.5">
        {children}
        <Info className="w-3 h-3 text-gold/60" />
      </span>
    </TooltipTrigger>
    <TooltipContent>
      <div className="text-xs">
        <div className="font-mono font-semibold">{cnTerm}</div>
        <div className="font-mono text-muted-foreground">{en}</div>
      </div>
    </TooltipContent>
  </Tooltip>
);
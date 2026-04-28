import { useState } from "react";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import { Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  /** KaTeX source (no $ delimiters) */
  math: string;
  /** Optional equation tag e.g. (1.2) shown right-aligned */
  tag?: string;
  /** Visual variant. `gold` = primary formula bar, `plain` = derivation step. */
  variant?: "gold" | "plain";
  className?: string;
}

/**
 * EquationBlock — drop-in replacement for <BlockMath math=... />
 * Adds:
 *  - horizontal scroll for long formulas (no layout break on mobile)
 *  - click-to-copy LaTeX source (toast feedback)
 *  - optional equation tag
 *  - unified gold / plain variants tied to design tokens
 */
export const EquationBlock = ({ math, tag, variant = "plain", className }: Props) => {
  const [copied, setCopied] = useState(false);

  const onCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(math);
      setCopied(true);
      toast({ title: "已复制 LaTeX 源码" });
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast({ title: "复制失败", variant: "destructive" });
    }
  };

  return (
    <div
      className={cn(
        "group relative",
        variant === "gold" ? "katex-gold" : "katex-plain",
        className
      )}
    >
      <div className="overflow-x-auto overflow-y-hidden katex-scroll px-1 py-0.5">
        <BlockMath math={math} />
      </div>

      {tag && (
        <span className="hidden sm:block absolute right-10 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground tabular-nums select-none">
          {tag}
        </span>
      )}

      <button
        type="button"
        onClick={onCopy}
        title="复制 LaTeX 源码"
        aria-label="Copy LaTeX source"
        className="absolute top-1 right-1 inline-flex items-center justify-center w-6 h-6 rounded text-muted-foreground/60 hover:text-gold hover:bg-accent opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
};

export default EquationBlock;
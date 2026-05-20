import { useState } from "react";
import { Copy, Check, BookMarked } from "lucide-react";
import { REFS } from "@/lib/citations";
import { formatAPA, formatBibTeX } from "@/lib/citationFormat";

/**
 * Standardized citation footer for a tool: shows each reference inline (APA-style)
 * with one-click "Copy APA" / "Copy BibTeX" buttons — exports the entire reference
 * list at once. Drop into any tool's bottom region.
 */
interface Props {
  /** Citation ids from src/lib/citations.tsx REFS. */
  refs: string[];
  /** Optional title; defaults to "参考文献". */
  title?: string;
}

type Mode = "apa" | "bib";

const CitationFooter = ({ refs, title = "参考文献" }: Props) => {
  const [copied, setCopied] = useState<Mode | null>(null);
  const cites = refs.map((id) => REFS[id]).filter(Boolean);
  if (cites.length === 0) return null;

  const handleCopy = async (mode: Mode) => {
    const text = cites
      .map((c) => (mode === "apa" ? formatAPA(c) : formatBibTeX(c)))
      .join(mode === "apa" ? "\n\n" : "\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(mode);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="mt-8 rounded-lg border border-border bg-card/60 p-4">
      <header className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <BookMarked className="w-3.5 h-3.5 text-gold" />
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold">
            {title}
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => handleCopy("apa")}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono border border-border bg-secondary/60 text-muted-foreground hover:text-foreground hover:border-gold/40 transition-colors"
          >
            {copied === "apa" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            复制 APA
          </button>
          <button
            onClick={() => handleCopy("bib")}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono border border-border bg-secondary/60 text-muted-foreground hover:text-foreground hover:border-gold/40 transition-colors"
          >
            {copied === "bib" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            复制 BibTeX
          </button>
        </div>
      </header>
      <ol className="space-y-1.5 list-decimal list-inside text-[11px] text-muted-foreground leading-relaxed">
        {cites.map((c) => (
          <li key={c.id}>
            <span className="text-foreground">{c.authors}</span> ({c.year}).{" "}
            <span className="italic">{c.title}</span>
            {c.journal && <>. {c.journal}</>}
            {c.doi && (
              <>
                {" · "}
                <a
                  href={`https://doi.org/${c.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold hover:underline"
                >
                  doi:{c.doi}
                </a>
              </>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
};

export default CitationFooter;
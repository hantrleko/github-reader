import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy } from "lucide-react";

/** Live one-sentence conclusion + copyable Markdown parameter summary. */
export function paramsToMarkdown(title: string, params: Record<string, string | number | boolean>, conclusion: string) {
  const lines = Object.entries(params).map(([k, v]) => `- ${k}: ${v}`);
  return `### ${title}\n\n${lines.join("\n")}\n\n> ${conclusion}\n`;
}

const FlagshipSummary = ({ title, params, conclusion }: {
  title: string;
  params: Record<string, string | number | boolean>;
  conclusion: string;
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(paramsToMarkdown(title, params, conclusion));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-gold/30 bg-gold/5 px-4 py-3">
      <p className="flex-1 text-sm text-foreground" aria-live="polite">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold mr-2">{t("flagship.conclusion")}</span>
        {conclusion}
      </p>
      <button type="button" onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-gold hover:border-gold/40 shrink-0">
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? t("flagship.copied") : t("flagship.copyParams")}
      </button>
    </div>
  );
};

export default FlagshipSummary;

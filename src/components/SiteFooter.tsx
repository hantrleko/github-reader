import { Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { sectionHref } from "@/lib/sections";
import { VersionBadge } from "./VersionBadge";

/** Section anchors — mirror the navbar's grouped section links. */
const navLinks = [
  { id: "micro", label: "微观经济学" },
  { id: "calculator", label: "期权与隐含波动率" },
  { id: "bond", label: "固收 & 组合" },
  { id: "asset-pricing", label: "资产定价" },
  { id: "risk", label: "风险管理" },
  { id: "quant", label: "量化策略" },
];

/** Standalone pages — mirror the navbar's "More" dropdown. */
const pageLinks = [
  { to: "/tools", label: "Tools" },
  { to: "/workflows", label: "Workflows" },
  { to: "/glossary", label: "Glossary" },
  { to: "/strategies", label: "Strategies" },
  { to: "/papers", label: "Papers" },
  { to: "/notebook", label: "Notebook" },
  { to: "/github", label: "GitHub" },
  { to: "/changelog", label: "Changelog" },
];

const SiteFooter = () => {
  const { t } = useTranslation();
  return (
    <footer className="mt-16 px-6 border-t border-accent/40 bg-background/90 backdrop-blur-lg">
      <div className="container max-w-6xl py-12">
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand — mirrors the navbar masthead */}
          <div className="xs:col-span-2">
            <span className="block text-[8px] font-mono uppercase tracking-[0.25em] text-gold/80 mb-1">
              The Quantitative Report
            </span>
            <p className="text-base font-display font-bold text-foreground tracking-tight mb-3">
              Econ&nbsp;&amp;&nbsp;Finance <em className="not-italic text-gold">Lab</em>
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              系统化的实证方法学习平台 · 将资产定价、计量经济学与量化研究拆解为可推导、可实验、可复现的工作流。
            </p>
            <p className="text-[10px] font-mono text-muted-foreground/70 mt-3 tracking-wider">
              A systematic approach to empirical methods in economics and finance.
            </p>
          </div>

          {/* Sections */}
          <nav aria-label="Sections">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-3">板块导航</p>
            <ul className="space-y-1.5">
              {navLinks.map((l) => (
                <li key={l.id}>
                  <Link
                    to={sectionHref(l.id)}
                    className="text-[11px] font-mono text-muted-foreground hover:text-gold transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Quick links — pages + resources */}
          <nav aria-label="Quick links">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-3">快速链接</p>
            <ul className="space-y-1.5">
              {pageLinks.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-gold transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-accent/40">
          <p className="text-[10px] font-mono text-muted-foreground/70 tracking-wider">
            © 2026 Econ &amp; Finance Lab · 仅供学习研究 · 不构成投资建议
          </p>
          <div className="flex items-center gap-3">
            <VersionBadge showBuildDate />
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-border/60 hover:text-gold hover:border-gold/50 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
            >
              <ArrowUp className="w-3 h-3" />
              返回顶部
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;

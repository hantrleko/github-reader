import { Link } from "react-router-dom";
import { sectionHref } from "@/lib/sections";

const navLinks = [
  { id: "micro", label: "微观经济学" },
  { id: "calculator", label: "期权与隐含波动率" },
  { id: "bond", label: "固收 & 组合" },
  { id: "asset-pricing", label: "资产定价" },
  { id: "risk", label: "风险管理" },
  { id: "quant", label: "量化策略" },
];

const SiteFooter = () => (
  <footer className="mt-16 px-6 border-t border-border bg-card/30">
    <div className="container max-w-6xl py-12">
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
        {/* Brand */}
        <div className="xs:col-span-2 md:col-span-2">
          <p className="text-sm font-display font-semibold text-foreground mb-2">
            Econ &amp; Finance Lab
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
            系统化的实证方法学习平台 · 将资产定价、计量经济学与量化研究拆解为可推导、可实验、可复现的工作流。
          </p>
          <p className="text-[10px] font-mono text-muted-foreground/70 mt-3 tracking-wider">
            A systematic approach to empirical methods in economics and finance.
          </p>
        </div>

        {/* Navigation */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-3">导航</p>
          <ul className="space-y-1.5 text-xs">
            {navLinks.map((l) => (
              <li key={l.id}>
                <Link
                  to={sectionHref(l.id)}
                  className="text-muted-foreground hover:text-gold transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Resources */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-3">资源</p>
          <ul className="space-y-1.5 text-xs">
            <li>
              <Link to="/changelog" className="text-muted-foreground hover:text-gold transition-colors">
                更新日志
              </Link>
            </li>
            <li>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="text-muted-foreground hover:text-gold transition-colors"
              >
                回到顶部 ↑
              </button>
            </li>
            <li><span className="text-muted-foreground/70">⌘K · 快速搜索</span></li>
            <li><span className="text-muted-foreground/70">? · 快捷键帮助</span></li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-border/60">
        <p className="text-[10px] font-mono text-muted-foreground/70 tracking-wider">
          © 2026 Econ &amp; Finance Lab · 仅供学习研究 · 不构成投资建议
        </p>
        <p className="text-[10px] font-mono text-gold/80 tracking-[0.2em] uppercase">
          Version 3.2
        </p>
      </div>
    </div>
  </footer>
);

export default SiteFooter;

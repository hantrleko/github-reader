import { useState } from "react";
import { Beaker, X, Check, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface BenchmarkRow {
  /** What is being compared, e.g. "BS call price" or "Modified Duration" */
  metric: string;
  /** Value produced by this platform's implementation. */
  ours: number;
  /** Reference value from textbook / paper / closed-form. */
  reference: number;
  /** Cite where the reference came from, e.g. "Hull 10e, Tbl 15.2". */
  source: string;
  /** Decimals for display; defaults to 4. */
  digits?: number;
  /** Absolute tolerance for green ✓ badge; defaults to 1e-3. */
  tol?: number;
}

interface Props {
  /** Short label shown on the trigger button, e.g. "BS-call". */
  label?: string;
  /** Title at the top of the drawer. */
  title: string;
  /** Brief description: what scenario was benchmarked, params used. */
  description?: string;
  rows: BenchmarkRow[];
}

/**
 * Reusable benchmark drawer — shows "our value vs reference value vs absolute error"
 * for each metric, with a status pill (✓ within tolerance / ⚠ check).
 * Drop into any verified tool's footer to surface algorithmic credibility.
 */
const BenchmarkDrawer = ({ label = "Benchmark", title, description, rows }: Props) => {
  const [open, setOpen] = useState(false);

  const fmt = (v: number, d: number) =>
    Number.isFinite(v) ? v.toFixed(d) : String(v);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-gold/30 bg-gold/5 text-gold text-[11px] font-mono hover:bg-gold/10 transition-colors"
      >
        <Beaker className="w-3 h-3" />
        📐 {label}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-background border-l border-border z-50 flex flex-col"
            >
              <header className="flex items-start justify-between gap-3 p-5 border-b border-border">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold mb-1">
                    Benchmark · 对照表
                  </p>
                  <h3 className="text-xl font-display font-semibold text-foreground">
                    {title}
                  </h3>
                  {description && (
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-5">
                <table className="w-full text-xs font-mono">
                  <thead className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="text-left py-2 pr-2">指标</th>
                      <th className="text-right px-2">本实现</th>
                      <th className="text-right px-2">参考</th>
                      <th className="text-right px-2">|误差|</th>
                      <th className="text-center pl-2">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {rows.map((r, idx) => {
                      const d = r.digits ?? 4;
                      const tol = r.tol ?? 1e-3;
                      const err = Math.abs(r.ours - r.reference);
                      const ok = err <= tol;
                      return (
                        <tr key={idx} className="hover:bg-secondary/40">
                          <td className="py-2 pr-2 text-foreground">
                            {r.metric}
                            <div className="text-[10px] text-muted-foreground font-sans mt-0.5">
                              {r.source}
                            </div>
                          </td>
                          <td className="px-2 text-right text-foreground tabular-nums">
                            {fmt(r.ours, d)}
                          </td>
                          <td className="px-2 text-right text-muted-foreground tabular-nums">
                            {fmt(r.reference, d)}
                          </td>
                          <td
                            className={`px-2 text-right tabular-nums ${
                              ok ? "text-emerald-500" : "text-orange-500"
                            }`}
                          >
                            {err < 1e-6 ? "≈0" : err.toExponential(1)}
                          </td>
                          <td className="pl-2 text-center">
                            {ok ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                                <Check className="w-3 h-3" /> 通过
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-orange-500/10 text-orange-500 border border-orange-500/30">
                                <AlertTriangle className="w-3 h-3" /> 检查
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <p className="mt-4 text-[10px] font-mono text-muted-foreground leading-relaxed">
                  容差默认 1e-3。误差越小表明本平台实现与原始文献 / 闭式解越吻合。
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default BenchmarkDrawer;
import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/**
 * Floating "back to top" button + thin reading-progress bar at the very top.
 * Mounted once on the homepage; pure presentation, no business logic.
 */
const ScrollUtilities = () => {
  const [progress, setProgress] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let raf = 0;
    const compute = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const p = max > 0 ? Math.min(1, h.scrollTop / max) : 0;
      setProgress(p);
      setShow(h.scrollTop > 800);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      {/* Reading progress — sits just under sticky navbar */}
      <div
        className="fixed left-0 right-0 top-0 h-[2px] z-[60] pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="h-full bg-gradient-to-r from-gold via-gold-glow to-gold origin-left transition-transform duration-150"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      {/* Back to top */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="回到顶部 / Back to top"
        className={`fixed bottom-6 right-6 z-50 h-11 w-11 rounded-full border border-gold/40 bg-card/90 backdrop-blur shadow-lg flex items-center justify-center text-gold hover:bg-gold hover:text-primary-foreground transition-all duration-300 ${
          show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </>
  );
};

export default ScrollUtilities;
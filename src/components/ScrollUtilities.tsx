import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/**
 * Floating "back to top" button + thin reading-progress bar at the very top.
 * Mounted once on the homepage; pure presentation, no business logic.
 */
const ScrollUtilities = () => {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let raf = 0;
    const compute = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const p = max > 0 ? Math.min(1, h.scrollTop / max) : 0;
      setProgress(p);
      // Reveal once the user has scrolled past a full viewport AND there is
      // still a meaningful distance left to scroll back up — avoids the button
      // flickering on short pages or appearing at a fixed, arbitrary pixel.
      const scrolledPastViewport = h.scrollTop > h.clientHeight * 0.75;
      const hasRoom = max > h.clientHeight * 0.5;
      setShow(scrolledPastViewport && hasRoom);
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

  const scrollToTop = useCallback(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
    // Move focus to the top of the document so keyboard users continue from
    // the start rather than being stranded mid-page.
    requestAnimationFrame(() => {
      const target = document.getElementById("hero") ?? document.body;
      if (target instanceof HTMLElement) {
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
    });
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
        onClick={scrollToTop}
        aria-label={t("labs.scrollUtilities.text1", { defaultValue: "回到顶部 / Back to top" })}
        title={t("labs.scrollUtilities.text2", { defaultValue: "回到顶部" })}
        tabIndex={show ? 0 : -1}
        aria-hidden={!show}
        className={`fixed bottom-6 right-6 z-50 h-11 w-11 rounded-full border border-gold/40 bg-card/90 backdrop-blur shadow-lg flex items-center justify-center text-gold hover:bg-gold hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all duration-300 ${
          show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <ArrowUp className="w-5 h-5" aria-hidden="true" />
      </button>
    </>
  );
};

export default ScrollUtilities;
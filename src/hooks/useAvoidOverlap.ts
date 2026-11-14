import { useEffect, useState, type RefObject } from "react";

/**
 * Floating controls (newcomer Introduction button, back-to-top) step aside
 * while they would sit on top of content marked with this attribute — the
 * teaching-path question/answer blocks and the live takeaway — so they never
 * cover answers, Reset or Next on a phone.
 */
export const FLOAT_AVOID_ATTR = "data-float-avoid";

export interface Box { top: number; bottom: number; left: number; right: number }

/** True when two boxes overlap, counting `pad` px of breathing room around `a`. */
export function boxesOverlap(a: Box, b: Box, pad = 8): boolean {
  return a.left - pad < b.right && a.right + pad > b.left && a.top - pad < b.bottom && a.bottom + pad > b.top;
}

/** True while the element would cover any [data-float-avoid] block. Never true while it has focus. */
export function useAvoidOverlap<T extends HTMLElement>(ref: RefObject<T>): boolean {
  const [covering, setCovering] = useState(false);
  useEffect(() => {
    let raf = 0;
    const check = () => {
      const el = ref.current;
      if (!el || el === document.activeElement) { setCovering(false); return; }
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) { setCovering(false); return; }
      const targets = document.querySelectorAll<HTMLElement>(`[${FLOAT_AVOID_ATTR}]`);
      setCovering(Array.from(targets).some((t) => boxesOverlap(r, t.getBoundingClientRect())));
    };
    const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(check); };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("focusin", schedule);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    ro?.observe(document.body);
    // Route changes and revealed answers can move blocks without a scroll.
    const poll = window.setInterval(schedule, 700);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("focusin", schedule);
      ro?.disconnect();
      window.clearInterval(poll);
    };
  }, [ref]);
  return covering;
}

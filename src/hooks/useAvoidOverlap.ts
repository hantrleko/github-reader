import { useEffect, useState, type RefObject } from "react";

/**
 * Floating controls (newcomer Introduction button, back-to-top) step aside
 * whenever they would sit on top of real page content: text, links, buttons,
 * form controls, charts, images and tables anywhere on the page. They stay
 * visible over empty space (margins, gaps between sections, card padding).
 *
 * The rule is global — no per-component list. Two optional markers:
 *  - `data-float-avoid` forces a whole block to count as content (teaching
 *    path, flagship takeaway), padding included;
 *  - `data-float` marks the floating controls themselves so they are ignored.
 */
export const FLOAT_AVOID_ATTR = "data-float-avoid";
export const FLOAT_ATTR = "data-float";

/** Elements that count as content the floats must never sit on. */
export const CONTENT_SELECTOR = [
  `[${FLOAT_AVOID_ATTR}]`,
  "a[href]", "button", "input", "select", "textarea", "summary", "label", "[contenteditable='true']",
  "[role='button']", "[role='link']", "[role='slider']", "[role='tab']", "[role='switch']",
  "[role='checkbox']", "[role='radio']", "[role='menuitem']", "[role='option']", "[role='combobox']",
  "[role='img']", "[tabindex]:not([tabindex='-1'])",
  "svg", "canvas", "img", "video", "picture", "iframe", "table", "pre", "code",
].join(",");

export interface Box { top: number; bottom: number; left: number; right: number }

/** Breathing room kept around a float, in px. */
export const FLOAT_PAD = 8;
/**
 * One visibility rule for every float. Hidden = fully transparent and click-through
 * at once (no fade-out), so a float is never visible-but-unclickable while it fades;
 * it stays focusable, and focus brings it back. Shown = opaque and clickable; the
 * component's own transition fades it in. `data-float-hidden` lets QA tell a
 * stepped-aside float from a shown one (automation treats opacity 0 as "visible").
 */
export const FLOAT_HIDDEN_ATTR = "data-float-hidden";
export function floatStateClass(hidden: boolean): string {
  return hidden ? "opacity-0 pointer-events-none !transition-none" : "opacity-100";
}

/** How long a float waits on clear space before reappearing (avoids flicker while scrolling). */
export const FLOAT_SHOW_DELAY_MS = 160;

/** True when two boxes overlap, counting `pad` px of breathing room around `a`. */
export function boxesOverlap(a: Box, b: Box, pad = FLOAT_PAD): boolean {
  return a.left - pad < b.right && a.right + pad > b.left && a.top - pad < b.bottom && a.bottom + pad > b.top;
}

/**
 * Probe points over the padded float, clamped to the viewport: at most 10px
 * apart vertically and 24px horizontally, so thin slider tracks and single
 * text lines cannot slip between rows.
 */
export function probePoints(r: Box, vw: number, vh: number, pad = FLOAT_PAD): Array<[number, number]> {
  const clamp = (v: number, max: number) => Math.min(Math.max(v, 1), max - 1);
  const span = (a: number, b: number, step: number) => {
    const n = Math.max(1, Math.ceil((b - a) / step));
    return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
  };
  const xs = span(r.left - pad, r.right + pad, 24).map((x) => clamp(x, vw));
  const ys = span(r.top - pad, r.bottom + pad, 10).map((y) => clamp(y, vh));
  return xs.flatMap((x) => ys.map((y) => [x, y] as [number, number]));
}

/** True for elements (or their ancestors) that are interactive, media, charts or forced blocks. */
export function isContentElement(el: Element | null): boolean {
  if (!el || el === document.documentElement || el === document.body) return false;
  if (el.closest(`[${FLOAT_ATTR}]`)) return false;
  return el.closest(CONTENT_SELECTOR) !== null;
}

/**
 * Line boxes of visible text inside `el` near `near`. Subtrees whose box is far
 * from the float are skipped, so even page-sized containers stay cheap.
 */
export function textBoxes(el: Element, near: Box, maxNodes = 400): Box[] {
  if (typeof document.createRange !== "function" || typeof document.createTreeWalker !== "function") return [];
  const out: Box[] = [];
  const range = document.createRange();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (n.nodeType === Node.TEXT_NODE) return n.textContent && n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      const b = (n as Element).getBoundingClientRect();
      // Zero-size boxes (display: contents, inline wrappers) may still hold text: look inside.
      if (!b.width && !b.height) return NodeFilter.FILTER_SKIP;
      return boxesOverlap(near, b, FLOAT_PAD * 2) ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_REJECT;
    },
  });
  let count = 0;
  for (let n = walker.nextNode(); n && count < maxNodes; n = walker.nextNode(), count++) {
    range.selectNodeContents(n);
    const rects = range.getClientRects?.();
    if (rects) for (const b of Array.from(rects)) if (b.width && b.height) out.push(b);
  }
  return out;
}

/** How many layers under a probe point are inspected (chart legends and tooltips sit on top of the chart). */
export const FLOAT_STACK_DEPTH = 4;

/**
 * Decide whether a float at `box` covers content.
 * `hitAt` returns the elements under a viewport point, topmost first, ignoring floats.
 */
export function floatCoversContent(
  box: Box,
  hitAt: (x: number, y: number) => Element[] | Element | null,
  textOf: (el: Element, near: Box) => Box[] = textBoxes,
  viewport: { w: number; h: number } = { w: window.innerWidth, h: window.innerHeight },
): boolean {
  const seen = new Set<Element>();
  for (const [x, y] of probePoints(box, viewport.w, viewport.h)) {
    const hit = hitAt(x, y);
    const stack = (Array.isArray(hit) ? hit : hit ? [hit] : []).slice(0, FLOAT_STACK_DEPTH);
    if (stack.some(isContentElement)) return true;
    const top = stack[0];
    if (!top || seen.has(top) || top === document.body || top === document.documentElement) continue;
    seen.add(top);
    if (textOf(top, box).some((t) => boxesOverlap(box, t))) return true;
  }
  return false;
}

/** Elements under a point, topmost first (floats are made see-through by the caller). */
function hitIgnoringFloats(x: number, y: number): Element[] {
  if (typeof document.elementsFromPoint === "function") return document.elementsFromPoint(x, y);
  if (typeof document.elementFromPoint === "function") { const e = document.elementFromPoint(x, y); return e ? [e] : []; }
  return [];
}

/** True while the element would cover page content. Never true while it has focus. */
export function useAvoidOverlap<T extends HTMLElement>(ref: RefObject<T>): boolean {
  const [covering, setCovering] = useState(false);
  useEffect(() => {
    let raf = 0;
    let showTimer = 0;
    let current = false;
    const apply = (next: boolean) => {
      if (next) {
        window.clearTimeout(showTimer); showTimer = 0;
        if (!current) { current = true; setCovering(true); }
      } else if (current && !showTimer) {
        showTimer = window.setTimeout(() => { showTimer = 0; current = false; setCovering(false); }, FLOAT_SHOW_DELAY_MS);
      }
    };
    const check = () => {
      const el = ref.current;
      if (!el) return;
      if (el === document.activeElement) {
        window.clearTimeout(showTimer); showTimer = 0; current = false; setCovering(false); return;
      }
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) { apply(false); return; }
      // Let hit-testing see through all floats for this synchronous probe.
      const floats = Array.from(document.querySelectorAll<HTMLElement>(`[${FLOAT_ATTR}]`));
      const prev = floats.map((f) => f.style.pointerEvents);
      floats.forEach((f) => { f.style.pointerEvents = "none"; });
      let hit = false;
      try {
        const forced = Array.from(document.querySelectorAll<HTMLElement>(`[${FLOAT_AVOID_ATTR}]`))
          .some((t) => boxesOverlap(r, t.getBoundingClientRect()));
        hit = forced || floatCoversContent(r, hitIgnoringFloats);
      } finally {
        floats.forEach((f, i) => { f.style.pointerEvents = prev[i]; });
      }
      apply(hit);
    };
    const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(check); };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("focusin", schedule);
    document.addEventListener("focusout", schedule);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    ro?.observe(document.body);
    // Route changes, charts and revealed answers can move content without a scroll.
    const poll = window.setInterval(schedule, 700);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(showTimer);
      window.removeEventListener("scroll", schedule, { capture: true } as EventListenerOptions);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("focusin", schedule);
      document.removeEventListener("focusout", schedule);
      ro?.disconnect();
      window.clearInterval(poll);
    };
  }, [ref]);
  return covering;
}

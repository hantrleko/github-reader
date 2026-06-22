import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { getSmoothScrollEnabled } from "@/lib/scrollSettings";

/**
 * Global scroll-position restoration + focus management for client-side routing.
 *
 * - On PUSH/REPLACE (entering a new page): scroll to the top (or to the #hash
 *   target if present) so each section page starts cleanly at its own boundary.
 * - On POP (browser back/forward): restore the scroll position the user had on
 *   that history entry, retrying briefly while lazy content streams in.
 * - Moves keyboard/screen-reader focus to <main> on every navigation so users
 *   don't stay focused on the previous page's controls.
 *
 * Positions are keyed by location.key and persisted in sessionStorage so they
 * survive lazy chunk loads and reloads within a session.
 */
const STORE_KEY = "ef:scrollpos";

type PosMap = Record<string, number>;

const readStore = (): PosMap => {
  try {
    return JSON.parse(sessionStorage.getItem(STORE_KEY) || "{}") as PosMap;
  } catch {
    return {};
  }
};

const writeStore = (map: PosMap) => {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
};

const ScrollManager = () => {
  const location = useLocation();
  const navType = useNavigationType(); // "PUSH" | "REPLACE" | "POP"
  const prevKeyRef = useRef<string | null>(null);

  // Disable the browser's native scroll restoration so it never fights ours.
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      const prev = window.history.scrollRestoration;
      window.history.scrollRestoration = "manual";
      return () => {
        window.history.scrollRestoration = prev;
      };
    }
  }, []);

  // Continuously record the scroll position for the current history entry.
  useEffect(() => {
    const key = location.key;
    let raf = 0;
    const save = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const map = readStore();
        map[key] = window.scrollY;
        writeStore(map);
      });
    };
    window.addEventListener("scroll", save, { passive: true });
    return () => {
      // Persist final position before unmount/route change.
      const map = readStore();
      map[key] = window.scrollY;
      writeStore(map);
      window.removeEventListener("scroll", save);
      cancelAnimationFrame(raf);
    };
  }, [location.key]);

  // Apply scroll + focus on every navigation.
  useEffect(() => {
    const isSameKey = prevKeyRef.current === location.key;
    prevKeyRef.current = location.key;
    if (isSameKey) return;

    const focusMain = () => {
      const main = document.querySelector<HTMLElement>("main");
      if (!main) return;
      if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
      // Avoid an extra scroll jump from .focus() — we handle scroll ourselves.
      main.focus({ preventScroll: true });
    };

    // Hash anchors take priority (e.g. /#section links on the home page).
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: getSmoothScrollEnabled() ? "smooth" : "auto", block: "start" });
        focusMain();
        return;
      }
    }

    const scrollBehavior = getSmoothScrollEnabled() ? "smooth" : "auto";

    if (navType === "POP") {
      // Restore saved position, retrying while lazy content expands the page.
      const target = readStore()[location.key] ?? 0;
      const smooth = scrollBehavior === "smooth";

      const apply = (behavior: ScrollBehavior) => {
        const maxScroll =
          document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo({ top: Math.min(target, Math.max(0, maxScroll)), behavior });
      };

      if (smooth) {
        // Smooth restoration: animate once, then auto-correct if lazy content
        // expanded the page after the animation has had time to finish.
        apply("smooth");
        let lastHeight = document.documentElement.scrollHeight;
        setTimeout(() => {
          const currentHeight = document.documentElement.scrollHeight;
          const maxScroll = currentHeight - window.innerHeight;
          const dest = Math.min(target, Math.max(0, maxScroll));
          if (currentHeight !== lastHeight || Math.abs(window.scrollY - dest) > 2) {
            window.scrollTo({ top: dest, behavior: "auto" });
          }
        }, 350);
      } else {
        let tries = 0;
        const tick = () => {
          apply("auto");
          if (window.scrollY < target - 2 && tries < 20) {
            tries += 1;
            requestAnimationFrame(tick);
          }
        };
        requestAnimationFrame(tick);
      }
      focusMain();
      return;
    }

    // New navigation (PUSH/REPLACE): start at the top of the new page.
    window.scrollTo({ top: 0, behavior: scrollBehavior });
    focusMain();
  }, [location.key, location.hash, navType]);

  return null;
};

export default ScrollManager;
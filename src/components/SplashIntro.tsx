import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, Play, VolumeX, Volume2 } from "lucide-react";
import introVideo from "@/assets/intro.mp4.asset.json";
import { APP_VERSION_TAG } from "@/lib/appVersion";
import { SPLASH_SESSION_KEY, shouldShowSplash } from "@/lib/introPolicy";

const AUTO_DISMISS_MS = 4500;

/**
 * Cinematic brand splash. Shown once per browser session and
 * auto-dismissed after a few seconds — the Lab is always the default landing.
 * Replay manually with ?intro=1.
 */
const SplashIntro = () => {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState<boolean>(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const forced = new URLSearchParams(window.location.search).get("intro") === "1";
    let seen = false;
    try {
      seen = sessionStorage.getItem(SPLASH_SESSION_KEY) === "1";
      if (!seen) sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
    } catch {
      /* storage unavailable — treat as seen to avoid blocking */
      seen = true;
    }
    if (shouldShowSplash(forced, seen, Boolean(reduce))) setVisible(true);
    const replay = () => setVisible(true);
    window.addEventListener("lab:replay-intro", replay);
    return () => window.removeEventListener("lab:replay-intro", replay);
  }, [reduce]);

  useEffect(() => {
    if (!visible) return;
    window.dispatchEvent(new Event("lab:splash-open"));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") dismiss();
    };
    window.addEventListener("keydown", onKey);
    const timer = window.setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
      window.dispatchEvent(new Event("lab:splash-close"));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const dismiss = () => {
    setVisible(false);
  };


  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          role="dialog"
          aria-modal="true"
          aria-label="Eugene Finance Lab — Welcome"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}
          transition={{ duration: 0.5 }}
          onClick={dismiss}
          className="fixed inset-0 z-[100] overflow-hidden bg-background cursor-pointer"
        >
          {/* Video layer */}
          <div className="absolute inset-0">
            <video
              ref={videoRef}
              src={introVideo.url}
              autoPlay
              muted
              playsInline
              loop
              preload="auto"
              className="w-full h-full object-cover opacity-60"
            />
            {/* Vignette + gradient overlays for legibility */}
            <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/45 to-background/95" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/25 to-background/70" />
            <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_35%,hsl(var(--background))_95%)]" />
          </div>

          {/* Fine grain overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
            }}
          />

          {/* Top chrome */}
          <div className="relative z-10 flex items-center justify-between px-6 md:px-10 py-6">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="flex items-center gap-3"
            >
              <span className="h-2 w-2 rounded-full bg-gold shadow-[0_0_16px_hsl(var(--gold)/0.9)] animate-pulse-gold" />
              <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-foreground/70">
                Eugene Finance · Est. 2026
              </span>
            </motion.div>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              onClick={dismiss}
              className="font-mono text-[10px] uppercase tracking-[0.35em] text-foreground/60 hover:text-gold transition-colors"
              aria-label="Skip intro"
            >
              Skip →
            </motion.button>
          </div>

          {/* Main content */}
          <div className="relative z-10 flex flex-col justify-center items-start h-[calc(100vh-8rem)] px-6 md:px-16 max-w-6xl">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
              className="font-mono text-[10px] md:text-xs uppercase tracking-[0.5em] text-gold mb-6"
            >
              — Econ &amp; Finance Lab / {APP_VERSION_TAG}
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-5xl sm:text-6xl md:text-8xl leading-[0.95] tracking-tight text-foreground"
            >
              Theory,
              <br />
              <span className="italic text-gold">measured.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.8 }}
              className="mt-8 max-w-xl text-base md:text-lg text-foreground/75 leading-relaxed"
            >
              一座把经济与金融理论转译为可运行实验的研究工作台 —— 从 SDF 到 GARCH，从投资组合到衍生品定价，全部在同一条工作流里被验证、可视化并归档。
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.25, duration: 0.7 }}
              className="mt-12 flex flex-wrap items-center gap-4"
            >
              <button
                onClick={dismiss}
                className="group relative inline-flex items-center gap-3 rounded-full bg-gold px-8 py-4 text-background font-mono text-xs uppercase tracking-[0.28em] shadow-[0_10px_40px_-10px_hsl(var(--gold)/0.7)] hover:shadow-[0_16px_60px_-8px_hsl(var(--gold)/0.9)] transition-all hover:-translate-y-0.5"
                autoFocus
              >
                Enter the Lab
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={toggleMute}
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 backdrop-blur px-5 py-3 text-foreground/80 hover:text-gold hover:border-gold/50 font-mono text-[10px] uppercase tracking-[0.28em] transition-colors"
                aria-label={muted ? "Unmute intro video" : "Mute intro video"}
              >
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                {muted ? "Sound off" : "Sound on"}
              </button>
            </motion.div>

            {/* Stat strip */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6, duration: 0.9 }}
              className="mt-16 grid grid-cols-3 gap-8 md:gap-14 border-t border-border/40 pt-6 w-full max-w-2xl"
            >
              {[
                { k: "60+", v: "Quant Models" },
                { k: "13", v: "Live Data Feeds" },
                { k: APP_VERSION_TAG, v: "Latest Release" },
              ].map((s) => (
                <div key={s.v}>
                  <div className="font-display text-2xl md:text-3xl text-gold">{s.k}</div>
                  <div className="mt-1 font-mono text-[9px] md:text-[10px] uppercase tracking-[0.28em] text-foreground/55">
                    {s.v}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Bottom chrome */}
          <div className="absolute inset-x-0 bottom-0 z-10 px-6 md:px-10 pb-6 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.35em] text-foreground/50">
            <span className="flex items-center gap-2">
              <Play className="w-3 h-3 text-gold" /> Intro reel · loop
            </span>
            <span className="hidden sm:block">Auto-entering the Lab · click anywhere to skip</span>
            <span>© Eugene Finance Lab</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashIntro;
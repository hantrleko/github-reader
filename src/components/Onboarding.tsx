import { useEffect, useRef, useState } from "react";
import { useAvoidOverlap, FLOAT_ATTR, FLOAT_HIDDEN_ATTR, floatStateClass } from "@/hooks/useAvoidOverlap";
import { useTranslation } from "react-i18next";
import { ArrowRight, Play, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import landscape from "@/assets/ef-promo-16x9.mp4.asset.json";
import portraitVideo from "@/assets/ef-promo-9x16.mp4.asset.json";
import landscapePoster from "@/assets/ef-promo-16x9-poster.jpg.asset.json";
import portraitPoster from "@/assets/ef-promo-9x16-poster.jpg.asset.json";
import { safeLocalStorage, getStorageItem, setStorageItem } from "@/lib/storage";
import { canPlayIntro, isStalled, INTRO_STALL_MS, type IntroVideoFailure } from "@/lib/introVideo";

const STORAGE_KEY = "lov.onboarded.video.v2";

const FAILURE_COPY: Record<IntroVideoFailure, { en: string; zh: string }> = {
  unsupported: {
    en: "This browser can't play the introduction film (MP4 / H.264). Nothing else is affected — choose Enter the Lab to start.",
    zh: "当前浏览器无法播放介绍短片（MP4 / H.264）。不影响其他功能，点击「开始探索」即可进入。",
  },
  error: {
    en: "The introduction film couldn't load. Check your connection and retry, or enter the lab now.",
    zh: "介绍短片加载失败。可检查网络后重试，或直接开始探索。",
  },
  stalled: {
    en: "The introduction film is taking too long to load. Retry, or enter the lab now.",
    zh: "介绍短片加载过慢。可重试，或直接开始探索。",
  },
};

const IntroFilm = ({ portrait, english }: { portrait: boolean; english: boolean }) => {
  const [failure, setFailure] = useState<IntroVideoFailure | null>(() => (canPlayIntro() ? null : "unsupported"));
  const [attempt, setAttempt] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stallTimer = useRef(0);
  const poster = portrait ? portraitPoster.url : landscapePoster.url;
  const frame = portrait ? "aspect-[9/16] max-h-[62dvh] w-auto max-w-full" : "aspect-video w-full";

  const clearStall = () => { window.clearTimeout(stallTimer.current); stallTimer.current = 0; };
  // Counted from the first sign of buffering; repeated waiting/stalled events must not restart the clock.
  const armStall = () => {
    if (stallTimer.current) return;
    stallTimer.current = window.setTimeout(() => {
      stallTimer.current = 0;
      const v = videoRef.current;
      if (v && isStalled(v)) setFailure("stalled");
    }, INTRO_STALL_MS);
  };
  useEffect(() => clearStall, []);

  if (failure) {
    return (
      <div role="alert" data-testid="intro-fallback" data-reason={failure}
        className={`relative mx-auto overflow-hidden rounded-md border border-gold/30 bg-card ${frame}`}>
        <img src={poster} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="relative flex h-full flex-col items-center justify-center gap-3 bg-background/70 p-4 text-center">
          <p className="font-display text-lg text-foreground">{english ? "Film unavailable" : "短片暂不可播放"}</p>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{english ? FAILURE_COPY[failure].en : FAILURE_COPY[failure].zh}</p>
          {failure !== "unsupported" && (
            <Button variant="outline" size="sm" className="min-h-11" onClick={() => { setFailure(null); setAttempt((n) => n + 1); }}>
              <RefreshCw />{english ? "Retry" : "重试"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <video key={attempt} ref={videoRef} src={portrait ? portraitVideo.url : landscape.url} poster={poster}
      controls playsInline preload="none"
      onError={() => { clearStall(); setFailure("error"); }}
      onPlay={armStall} onWaiting={armStall} onStalled={armStall}
      onPlaying={clearStall} onCanPlay={clearStall} onPause={clearStall} onEnded={clearStall}
      aria-label={english ? "EF LAB introduction" : "EF LAB 新手介绍视频"}
      data-testid="intro-film"
      className={`mx-auto rounded-md bg-background object-contain ${frame}`} />
  );
};

const Onboarding = () => {
  const { i18n } = useTranslation();
  const english = Boolean(i18n.resolvedLanguage?.startsWith("en"));
  const [open, setOpen] = useState(false);
  const [portrait, setPortrait] = useState(() => window.matchMedia("(orientation: portrait)").matches);
  const floatRef = useRef<HTMLButtonElement>(null);
  const enterRef = useRef<HTMLButtonElement>(null);
  const covering = useAvoidOverlap(floatRef);

  useEffect(() => {
    const media = window.matchMedia("(orientation: portrait)");
    const update = () => setPortrait(media.matches);
    media.addEventListener("change", update);
    let splashOpen = false;
    const show = () => {
      if (!splashOpen && !getStorageItem(safeLocalStorage, STORAGE_KEY)) setOpen(true);
    };
    const onSplashOpen = () => { splashOpen = true; setOpen(false); };
    const onSplashClose = () => { splashOpen = false; timer = window.setTimeout(show, 650); };
    // Wait for the opening animation, including its exit transition.
    let timer = window.setTimeout(show, 5500);
    window.addEventListener("lab:splash-open", onSplashOpen);
    window.addEventListener("lab:splash-close", onSplashClose);
    return () => {
      window.clearTimeout(timer);
      media.removeEventListener("change", update);
      window.removeEventListener("lab:splash-open", onSplashOpen);
      window.removeEventListener("lab:splash-close", onSplashClose);
    };
  }, []);

  const changeOpen = (value: boolean) => {
    setOpen(value);
    if (!value) setStorageItem(safeLocalStorage, STORAGE_KEY, "1");
  };

  return (
    <>
      {/* Stays focusable while stepped aside; focusing it brings it back. */}
      <Button ref={floatRef} variant="outline" size="sm" onClick={() => changeOpen(true)} data-testid="float-intro" {...{ [FLOAT_ATTR]: "" }} {...(covering ? { [FLOAT_HIDDEN_ATTR]: "" } : {})}
        className={`fixed bottom-4 left-4 md:left-[72px] z-40 h-11 px-4 border-gold/40 bg-card/95 text-gold shadow-lg transition-opacity duration-200 ${floatStateClass(covering)}`}>
        <Play />{english ? "Introduction" : "新手介绍"}
      </Button>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent
          onOpenAutoFocus={(e) => { e.preventDefault(); enterRef.current?.focus(); }}
          className={`w-[calc(100%-2rem)] max-h-[92dvh] overflow-y-auto rounded-lg p-4 sm:p-6 ${portrait ? "max-w-sm" : "max-w-4xl"}`}>
          <div className="pr-7 space-y-1">
            <DialogTitle className="font-display text-xl">{english ? "Welcome to EF LAB" : "欢迎来到 EF LAB"}</DialogTitle>
            <DialogDescription>
              {english
                ? "EF LAB turns economics and finance theory into experiments you can run, check and explain."
                : "EF LAB 把经济与金融理论变成可以动手运行、检验和讲清楚的实验。"}
            </DialogDescription>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {english ? "Introduction film" : "新手介绍短片"} · 00:38
            </p>
          </div>
          <IntroFilm key={portrait ? "portrait" : "landscape"} portrait={portrait} english={english} />
          <div className="flex flex-wrap justify-between gap-2">
            <Button variant="ghost" size="sm" className="min-h-11" onClick={() => {
              changeOpen(false);
              if (window.location.pathname === "/") window.dispatchEvent(new Event("lab:replay-intro"));
              else window.location.assign("/?intro=1");
            }}><RotateCcw />{english ? "Opening animation" : "重播开场动画"}</Button>
            <Button variant="ghost" size="sm" className="min-h-11" onClick={() => changeOpen(false)}>{english ? "Don't show again" : "不再显示"}</Button>
            <Button ref={enterRef} size="sm" className="min-h-11" onClick={() => changeOpen(false)} data-testid="intro-enter">{english ? "Enter the Lab" : "开始探索"}<ArrowRight /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Onboarding;

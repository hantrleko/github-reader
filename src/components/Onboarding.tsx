import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import landscape from "@/assets/ef-promo-16x9.mp4.asset.json";
import portraitVideo from "@/assets/ef-promo-9x16.mp4.asset.json";
import { safeLocalStorage, getStorageItem, setStorageItem } from "@/lib/storage";

const STORAGE_KEY = "lov.onboarded.video.v2";

const Onboarding = () => {
  const { i18n } = useTranslation();
  const english = i18n.resolvedLanguage?.startsWith("en");
  const [open, setOpen] = useState(false);
  const [portrait, setPortrait] = useState(() => window.matchMedia("(orientation: portrait)").matches);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(orientation: portrait)");
    const update = () => { setPortrait(media.matches); setFailed(false); };
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
    setFailed(false);
    if (!value) setStorageItem(safeLocalStorage, STORAGE_KEY, "1");
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => changeOpen(true)}
        className="fixed bottom-4 left-4 md:left-16 z-40 border-gold/40 bg-card/95 text-gold shadow-lg">
        <Play />{english ? "Introduction" : "新手介绍"}
      </Button>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent className={`w-[calc(100%-2rem)] max-h-[92dvh] overflow-y-auto rounded-lg p-4 sm:p-6 ${portrait ? "max-w-sm" : "max-w-4xl"}`}>
          <div className="pr-7 space-y-1">
            <DialogTitle className="font-display text-xl">{english ? "Welcome to EF LAB" : "欢迎来到 EF LAB"}</DialogTitle>
            <DialogDescription>{english ? "Introduction film" : "新手介绍短片"} · 00:38</DialogDescription>
          </div>
          <video key={portrait ? "portrait" : "landscape"} src={portrait ? portraitVideo.url : landscape.url}
            controls playsInline preload="none" onError={() => setFailed(true)}
            aria-label={english ? "EF LAB introduction" : "EF LAB 新手介绍视频"}
            className={`mx-auto rounded-md bg-background object-contain ${portrait ? "aspect-[9/16] max-h-[62dvh] w-auto max-w-full" : "aspect-video w-full"}`} />
          {failed && <p role="alert" className="text-sm text-destructive">{english ? "Video unavailable. Please close and retry." : "视频暂时无法加载，请关闭后重试。"}</p>}
          <div className="flex flex-wrap justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => {
              changeOpen(false);
              if (window.location.pathname === "/") window.dispatchEvent(new Event("lab:replay-intro"));
              else window.location.assign("/?intro=1");
            }}><RotateCcw />{english ? "Opening animation" : "重播开场动画"}</Button>
            <Button variant="ghost" size="sm" onClick={() => changeOpen(false)}>{english ? "Don't show again" : "不再显示"}</Button>
            <Button size="sm" onClick={() => changeOpen(false)}>{english ? "Enter the Lab" : "开始探索"}<ArrowRight /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Onboarding;

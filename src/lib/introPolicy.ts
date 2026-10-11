export const SPLASH_SESSION_KEY = "splash:intro:v3:session";

export function shouldShowSplash(forced: boolean, seenThisSession: boolean, reducedMotion: boolean) {
  return forced || (!seenThisSession && !reducedMotion);
}
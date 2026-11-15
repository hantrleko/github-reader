/**
 * Intro film playback rules. The films are H.264 High + AAC-LC MP4s with the
 * index at the front (fast start), which every current desktop and mobile
 * browser plays — but some builds (e.g. Firefox without system codecs, some
 * Linux Chromium builds) cannot. Those visitors get the welcome text and a
 * clear fallback instead of a black box.
 */
export const INTRO_MP4_TYPE = 'video/mp4; codecs="avc1.640028, mp4a.40.2"';

/** Seconds of buffering after pressing play before we offer the fallback. */
export const INTRO_STALL_MS = 12000;

export type IntroVideoFailure = "unsupported" | "error" | "stalled";

/** True when the browser says it may play the intro film format. */
export function canPlayIntro(probe?: Pick<HTMLVideoElement, "canPlayType"> | null): boolean {
  try {
    const v = probe ?? (typeof document !== "undefined" ? document.createElement("video") : null);
    return Boolean(v && typeof v.canPlayType === "function" && v.canPlayType(INTRO_MP4_TYPE) !== "");
  } catch {
    return false;
  }
}

/** A stall only counts while the visitor still wants to watch and nothing is buffered to play. */
export function isStalled(v: Pick<HTMLVideoElement, "paused" | "ended" | "readyState">): boolean {
  return !v.paused && !v.ended && v.readyState < 3; // HAVE_FUTURE_DATA
}

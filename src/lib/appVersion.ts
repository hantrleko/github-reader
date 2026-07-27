/**
 * Single source of truth for the app's version.
 *
 * Values are injected at build time by Vite (see `vite.config.ts`) from
 * `package.json`. Bump `version` in package.json and every surface
 * (Navbar badge, Footer badge, Hero "Latest Update", Changelog header)
 * updates automatically.
 */
declare const __APP_VERSION__: string;
declare const __APP_VERSION_TAG__: string;
declare const __BUILD_TIME__: string;

export const APP_VERSION: string =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";

/** Short marketing tag, e.g. "V4.9" — derived from major.minor. */
export const APP_VERSION_TAG: string =
  typeof __APP_VERSION_TAG__ !== "undefined"
    ? __APP_VERSION_TAG__
    : `V${APP_VERSION.split(".").slice(0, 2).join(".")}`;

export const BUILD_TIME: string =
  typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "";

export const BUILD_DATE: string = BUILD_TIME ? BUILD_TIME.slice(0, 10) : "";
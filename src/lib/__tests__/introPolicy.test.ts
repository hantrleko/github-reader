import { describe, expect, it } from "vitest";
import { shouldShowSplash } from "../introPolicy";

describe("opening animation", () => {
  it("shows at the start of a new session", () => {
    expect(shouldShowSplash(false, false, false)).toBe(true);
  });
  it("does not repeat within the same session", () => {
    expect(shouldShowSplash(false, true, false)).toBe(false);
  });
  it("respects reduced motion for automatic playback", () => {
    expect(shouldShowSplash(false, false, true)).toBe(false);
  });
  it("allows explicit replay", () => {
    expect(shouldShowSplash(true, true, true)).toBe(true);
  });
});
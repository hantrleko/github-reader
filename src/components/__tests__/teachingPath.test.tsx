import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import i18n from "@/i18n";
import zh from "@/i18n/locales/zh.json";
import en from "@/i18n/locales/en.json";
import EntryCards from "@/components/EntryCards";
import { CAPMTool } from "@/components/asset/V31AssetTools";
import { HedgePnLTool } from "@/components/deriv/V42Tools";
import { OLSvsIV } from "@/components/EconometricsTools";
import AssetPricingTools from "@/components/AssetPricingTools";
import EconometricsTools from "@/components/EconometricsTools";
import DerivativesTools from "@/components/DerivativesTools";
import { SECTION_MAP } from "@/lib/sections";
import {
  TEACHING_PATH, PATH_HOME, nextStep, capmChecks, CAPM_DEFAULT, hedgeChecks, HEDGE_DEFAULT,
  olsivChecks, OLSIV_DEFAULT, hedgeDelta, hedgeConclusion,
} from "@/lib/teachingPath";
import { boxesOverlap, FLOAT_AVOID_ATTR, FLOAT_ATTR, isContentElement, probePoints, floatCoversContent } from "@/hooks/useAvoidOverlap";
import { canPlayIntro, isStalled, INTRO_MP4_TYPE } from "@/lib/introVideo";
import Onboarding from "@/components/Onboarding";
import ScrollUtilities from "@/components/ScrollUtilities";

beforeAll(() => {
  class RO { observe() {} unobserve() {} disconnect() {} }
  (globalThis as any).ResizeObserver ??= RO;
  (globalThis as any).IntersectionObserver ??= class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
});
beforeEach(async () => { cleanup(); await i18n.changeLanguage("en"); });

const inRouter = (ui: React.ReactNode, url = "/") => render(<MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>);

describe("teaching path routes", () => {
  it("runs OLS/IV → CAPM → options hedge and then back home", () => {
    expect(TEACHING_PATH.map((s) => s.to)).toEqual([
      "/s/econometrics?t=olsiv", "/s/asset-pricing?t=capm", "/s/derivatives?t=hedge_pnl",
    ]);
    expect(nextStep("olsiv")?.id).toBe("capm");
    expect(nextStep("capm")?.id).toBe("hedge");
    expect(nextStep("hedge")).toBeNull();
    expect(PATH_HOME).toBe("/#start");
    for (const s of TEACHING_PATH) expect(SECTION_MAP[s.section]).toBeTruthy();
  });

  it.each([
    [EconometricsTools, "/s/econometrics?t=olsiv", "olsiv"],
    [AssetPricingTools, "/s/asset-pricing?t=capm", "capm"],
    [DerivativesTools, "/s/derivatives?t=hedge_pnl", "hedge"],
  ] as const)("deep link %# opens the matching lab tab", async (Lab, url, id) => {
    inRouter(<Lab />, url);
    expect(await screen.findByTestId(`path-intro-${id}`)).toBeInTheDocument();
  });
});

describe("homepage questions", () => {
  it("shows three questions linking to the real lab routes", () => {
    inRouter(<EntryCards />);
    for (const s of TEACHING_PATH) {
      const link = screen.getByTestId(`home-question-${s.id}`);
      expect(link).toHaveAttribute("href", s.to);
      expect(link).toHaveTextContent(en.home.questions[s.id].q);
    }
  });
  it("renders the Chinese questions in zh", async () => {
    await i18n.changeLanguage("zh");
    inRouter(<EntryCards />);
    expect(screen.getByTestId("home-question-hedge")).toHaveTextContent(zh.home.questions.hedge.q);
  });
});

describe("CAPM lab learning loop", () => {
  it("default scenario, live interpretation, answer reveal, reset and next step", () => {
    inRouter(<CAPMTool />);
    expect(screen.getByText(en.path.capm.question)).toBeInTheDocument();
    const takeaway = () => screen.getByText(/the SML/, { selector: "p[aria-live]" });
    expect(takeaway()).toHaveTextContent("above the SML");

    const check = screen.getByTestId("path-check-capm");
    const btn = within(check).getAllByRole("button", { name: en.path.showAnswer })[0];
    const answer = document.getElementById(btn.getAttribute("aria-controls")!)!;
    expect(answer).not.toBeVisible();
    fireEvent.click(btn);
    expect(answer).toBeVisible();
    expect(answer).toHaveTextContent("10.20%"); // 3 + 1.2 × 6

    // β slider → 2.0: required 15% > 12% input → below the line
    fireEvent.change(screen.getAllByRole("slider")[2], { target: { value: "2" } });
    expect(takeaway()).toHaveTextContent("below the SML");
    expect(answer).toHaveTextContent("15.00%");

    fireEvent.click(within(check).getByRole("button", { name: en.path.reset }));
    expect(takeaway()).toHaveTextContent("above the SML");
    expect(within(check).getByTestId("path-next")).toHaveAttribute("href", "/s/derivatives?t=hedge_pnl");
  });
});

describe("OLS/IV lab learning loop", () => {
  it("interpretation follows the endogeneity slider", () => {
    inRouter(<OLSvsIV />);
    expect(screen.getByText(en.path.olsiv.question)).toBeInTheDocument();
    const takeaway = () => screen.getAllByText(/OLS β̂=/, { selector: "p[aria-live]" })[0];
    expect(takeaway()).toHaveTextContent("biased upward");
    fireEvent.change(screen.getAllByRole("slider")[2], { target: { value: "0" } });
    expect(takeaway()).toHaveTextContent("Cov(x,ε)≈0");
    expect(screen.getByTestId("path-next")).toHaveAttribute("href", "/s/asset-pricing?t=capm");
  });
});

describe("Options hedge lab learning loop", () => {
  it("explains the hedge ratio change for the current pricing vol and ends with review link", () => {
    inRouter(<HedgePnLTool />);
    expect(screen.getByText(en.path.hedge.question)).toBeInTheDocument();
    const check = screen.getByTestId("path-check-hedge");
    const btn = within(check).getAllByRole("button", { name: en.path.showAnswer })[0];
    fireEvent.click(btn);
    const answer = document.getElementById(btn.getAttribute("aria-controls")!)!;
    expect(answer).toHaveTextContent(`Δ(100)=${hedgeDelta(100, 0.2).toFixed(3)}`);
    fireEvent.change(screen.getAllByRole("slider")[0], { target: { value: "0.4" } });
    expect(answer).toHaveTextContent(`Δ(100)=${hedgeDelta(100, 0.4).toFixed(3)}`);
    expect(within(check).getByTestId("path-next")).toHaveAttribute("href", "/#start");
  });
});

describe("path controls after the polish pass", () => {
  it("hedge lab ends with both restart-at-step-1 and back-home links", () => {
    inRouter(<HedgePnLTool />);
    const check = screen.getByTestId("path-check-hedge");
    expect(within(check).getByTestId("path-restart")).toHaveAttribute("href", "/s/econometrics?t=olsiv");
    expect(within(check).getByTestId("path-next")).toHaveAttribute("href", "/#start");
  });
  it("the intro Reset restores the default scenario, same as the check Reset", () => {
    inRouter(<HedgePnLTool />);
    const real = () => screen.getAllByRole("slider")[1] as HTMLInputElement;
    fireEvent.change(real(), { target: { value: "0.05" } });
    expect(real().value).toBe("0.05");
    fireEvent.click(within(screen.getByTestId("path-intro-hedge")).getByTestId("path-reset"));
    expect(real().value).toBe(String(HEDGE_DEFAULT.sigmaReal));
  });
  it("switching language relabels the answer toggle and keeps it open", async () => {
    inRouter(<CAPMTool />);
    const check = screen.getByTestId("path-check-capm");
    const btn = within(check).getAllByRole("button", { name: en.path.showAnswer })[0];
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    await act(async () => { await i18n.changeLanguage("zh"); });
    expect(btn).toHaveTextContent(zh.path.hideAnswer);
    expect(document.getElementById(btn.getAttribute("aria-controls")!)).toHaveTextContent("10.20%");
  });
});

describe("Reset clears stale quiz feedback", () => {
  it("check-block Reset closes revealed answers and restores the default numbers", () => {
    inRouter(<CAPMTool />);
    const check = screen.getByTestId("path-check-capm");
    fireEvent.click(within(check).getAllByRole("button", { name: en.path.showAnswer })[0]);
    fireEvent.change(screen.getAllByRole("slider")[3], { target: { value: "0" } }); // asset return 0%
    const open = within(check).getByRole("button", { name: en.path.hideAnswer });
    expect(document.getElementById(open.getAttribute("aria-controls")!)).toHaveTextContent("α=-10.20%");
    fireEvent.click(within(check).getByTestId("path-reset"));
    expect(within(check).queryByRole("button", { name: en.path.hideAnswer })).toBeNull();
    expect(within(check).getAllByRole("button", { name: en.path.showAnswer })).toHaveLength(3);
    const first = within(check).getAllByRole("button", { name: en.path.showAnswer })[0];
    fireEvent.click(first);
    expect(document.getElementById(first.getAttribute("aria-controls")!)).toHaveTextContent("α=+1.80%");
  });
  it("intro Reset also closes answers in the check block of the same lab", () => {
    inRouter(<HedgePnLTool />);
    const check = screen.getByTestId("path-check-hedge");
    fireEvent.click(within(check).getAllByRole("button", { name: en.path.showAnswer })[1]);
    expect(within(check).getAllByRole("button", { name: en.path.hideAnswer })).toHaveLength(1);
    fireEvent.click(within(screen.getByTestId("path-intro-hedge")).getByTestId("path-reset"));
    expect(within(check).queryByRole("button", { name: en.path.hideAnswer })).toBeNull();
  });
});

describe("floating controls step aside over path blocks", () => {
  it("overlap test counts the padding and ignores separated boxes", () => {
    const float = { top: 700, bottom: 744, left: 16, right: 150 };
    expect(boxesOverlap(float, { top: 100, bottom: 705, left: 29, right: 331 })).toBe(true);
    expect(boxesOverlap(float, { top: 100, bottom: 695, left: 29, right: 331 })).toBe(true); // within 8px pad
    expect(boxesOverlap(float, { top: 100, bottom: 680, left: 29, right: 331 })).toBe(false);
    expect(boxesOverlap(float, { top: 600, bottom: 900, left: 170, right: 331 })).toBe(false);
  });
  it("teaching-path blocks carry the avoid marker", () => {
    inRouter(<OLSvsIV />);
    expect(screen.getByTestId("path-intro-olsiv")).toHaveAttribute(FLOAT_AVOID_ATTR);
    expect(screen.getByTestId("path-check-olsiv")).toHaveAttribute(FLOAT_AVOID_ATTR);
  });
});

describe("scenario-specific answers", () => {
  it("CAPM position answer flips with β", () => {
    expect(capmChecks(CAPM_DEFAULT)[0].answerKey).toBe("path.capm.a.position.above");
    expect(capmChecks({ ...CAPM_DEFAULT, beta: 2 })[0].answerKey).toBe("path.capm.a.position.below");
    expect(capmChecks({ ...CAPM_DEFAULT, actual: 10.2 })[0].answerKey).toBe("path.capm.a.position.on");
  });
  it("OLS/IV answers track endogeneity and instrument strength", () => {
    const r = { olsBeta: 1.41, ivBeta: 1.08, olsSe: 0.05, ivSe: 0.1 };
    expect(olsivChecks(OLSIV_DEFAULT, r)[0].answerKey).toBe("path.olsiv.a.direction.up");
    expect(olsivChecks({ ...OLSIV_DEFAULT, endo: 0 }, r)[0].answerKey).toBe("path.olsiv.a.direction.none");
    expect(olsivChecks({ ...OLSIV_DEFAULT, zStrength: 0.15 }, r)[1].answerKey).toBe("path.olsiv.a.instrument.weak");
    expect(olsivChecks(OLSIV_DEFAULT, r)[1].vars.ratio).toBe("2.0");
  });
  it("hedge: delta rises with the stock, and matched vol is never called riskless", () => {
    expect(hedgeDelta(110, 0.2)).toBeGreaterThan(hedgeDelta(100, 0.2));
    const r = { meanPnL: 0, stdPnL: 0.5 };
    expect(hedgeChecks({ ...HEDGE_DEFAULT, sigmaReal: 0.2 }, r)[1].answerKey).toBe("path.hedge.a.riskless.match");
    expect(hedgeChecks(HEDGE_DEFAULT, r)[1].answerKey).toBe("path.hedge.a.riskless.mismatch");
    expect(hedgeConclusion(HEDGE_DEFAULT, r).key).toBe("flagship.hedge.loss");
  });
});

describe("i18n coverage", () => {
  const flat = (o: any, p = ""): Record<string, string> =>
    Object.entries(o).reduce((acc, [k, v]) => (typeof v === "object" ? { ...acc, ...flat(v, `${p}${k}.`) } : { ...acc, [`${p}${k}`]: v as string }), {});
  const pick = (d: any) => ({ path: d.path, q: d.home.questions, h: d.flagship.hedge, l: d.labs.hedgePnl });
  it("zh and en have the same non-empty keys, en without Chinese", () => {
    const z = flat(pick(zh)), e = flat(pick(en));
    expect(Object.keys(e).sort()).toEqual(Object.keys(z).sort());
    for (const [k, v] of Object.entries(e)) {
      expect(v, k).toBeTruthy();
      expect(/[\u4e00-\u9fff]/.test(v), k).toBe(false);
    }
  });
  it("every answer key produced by the labs exists in both languages", () => {
    const keys = [
      ...capmChecks(CAPM_DEFAULT), ...capmChecks({ ...CAPM_DEFAULT, beta: 2 }), ...capmChecks({ ...CAPM_DEFAULT, actual: 10.2 }),
      ...olsivChecks(OLSIV_DEFAULT, { olsBeta: 1.4, ivBeta: 1, olsSe: 1, ivSe: 1 }),
      ...olsivChecks({ ...OLSIV_DEFAULT, endo: 0, zStrength: 0.1 }, { olsBeta: 0.8, ivBeta: 1, olsSe: 1, ivSe: 1 }),
      ...olsivChecks(OLSIV_DEFAULT, { olsBeta: 0.8, ivBeta: 1, olsSe: 1, ivSe: 1 }),
      ...olsivChecks(OLSIV_DEFAULT, { olsBeta: 1.01, ivBeta: 1, olsSe: 1, ivSe: 1 }),
      ...hedgeChecks(HEDGE_DEFAULT, { meanPnL: 0, stdPnL: 1 }), ...hedgeChecks({ ...HEDGE_DEFAULT, sigmaReal: 0.2 }, { meanPnL: 0, stdPnL: 1 }),
    ].map((c) => c.answerKey);
    for (const k of new Set(keys)) {
      expect(i18n.exists(k, { lng: "en" }), k).toBe(true);
      expect(i18n.exists(k, { lng: "zh" }), k).toBe(true);
    }
  });
});

describe("global float rule: content anywhere, not a component list", () => {
  const float = { top: 700, bottom: 744, left: 16, right: 150 };
  const vp = { w: 390, h: 780 };
  const make = (html: string) => { const d = document.createElement("div"); d.innerHTML = html; document.body.appendChild(d); return d; };
  it("treats links, buttons, sliders, charts, images and tables as content", () => {
    const d = make(`<a href="/x">l</a><button>b</button><div role="slider"></div><svg></svg><img alt=""><table><tbody><tr><td><span id="cell">1</span></td></tr></tbody></table><div id="plain"></div><div ${FLOAT_ATTR}><span id="inside-float">i</span></div>`);
    for (const sel of ["a", "button", "[role=slider]", "svg", "img"]) expect(isContentElement(d.querySelector(sel))).toBe(true);
    expect(isContentElement(d.querySelector("#cell"))).toBe(true);
    expect(isContentElement(d.querySelector("#plain"))).toBe(false);
    expect(isContentElement(d.querySelector("#inside-float"))).toBe(false);
    expect(isContentElement(document.body)).toBe(false);
    d.remove();
  });
  it("probe points cover the padded float and stay inside the viewport", () => {
    const pts = probePoints({ top: 740, bottom: 784, left: 0, right: 44 }, 390, 780);
    for (const [x, y] of pts) { expect(x).toBeGreaterThanOrEqual(1); expect(x).toBeLessThanOrEqual(389); expect(y).toBeLessThanOrEqual(779); }
    // Rows no more than 10px apart, so a 4px slider track under the float is always probed.
    const ys = [...new Set(pts.map(([, y]) => y))].sort((a, b) => a - b);
    for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeLessThanOrEqual(10);
    const xs = [...new Set(pts.map(([x]) => x))].sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeLessThanOrEqual(24);
  });
  it("hides over a chart or a text line, shows over empty space", () => {
    const d = make(`<div id="card"><p id="para">text</p></div><svg id="chart"></svg>`);
    const card = d.querySelector("#card")!, para = d.querySelector("#para")!, chart = d.querySelector("#chart")!;
    expect(floatCoversContent(float, () => chart, () => [], vp)).toBe(true);
    // A paragraph whose line box sits right under the float.
    expect(floatCoversContent(float, () => para, () => [{ top: 710, bottom: 730, left: 20, right: 300 }], vp)).toBe(true);
    // Same paragraph, but its text ends well above the float: safe.
    expect(floatCoversContent(float, () => para, () => [{ top: 500, bottom: 520, left: 20, right: 300 }], vp)).toBe(false);
    // Empty card padding / page background: safe.
    expect(floatCoversContent(float, () => card, () => [], vp)).toBe(false);
    expect(floatCoversContent(float, () => null, () => [], vp)).toBe(false);
    d.remove();
  });
  it("floats are marked so hit-testing sees through them", () => {
    render(<MemoryRouter><Onboarding /><ScrollUtilities /></MemoryRouter>);
    expect(screen.getByTestId("float-intro")).toHaveAttribute(FLOAT_ATTR);
    expect(screen.getByTestId("float-top")).toHaveAttribute(FLOAT_ATTR);
  });
});

describe("intro film playback fallback", () => {
  it("format probe accepts maybe/probably and rejects empty or throwing probes", () => {
    expect(canPlayIntro({ canPlayType: () => "probably" } as any)).toBe(true);
    expect(canPlayIntro({ canPlayType: () => "maybe" } as any)).toBe(true);
    expect(canPlayIntro({ canPlayType: () => "" } as any)).toBe(false);
    expect(canPlayIntro({ canPlayType: () => { throw new Error("x"); } } as any)).toBe(false);
    expect(INTRO_MP4_TYPE).toContain("avc1");
  });
  it("only counts a stall while playing with nothing buffered", () => {
    expect(isStalled({ paused: false, ended: false, readyState: 2 })).toBe(true);
    expect(isStalled({ paused: true, ended: false, readyState: 0 })).toBe(false);
    expect(isStalled({ paused: false, ended: false, readyState: 4 })).toBe(false);
    expect(isStalled({ paused: false, ended: true, readyState: 1 })).toBe(false);
  });
  it("unplayable browser: welcome text, fallback message and Enter still work (EN and ZH)", async () => {
    const spy = vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("");
    vi.useFakeTimers();
    try {
      localStorage.removeItem("lov.onboarded.video.v2");
      render(<MemoryRouter><Onboarding /></MemoryRouter>);
      act(() => { vi.advanceTimersByTime(6000); });
      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText(/turns economics and finance theory/)).toBeInTheDocument();
      expect(within(dialog).getByTestId("intro-fallback")).toHaveAttribute("data-reason", "unsupported");
      expect(within(dialog).queryByTestId("intro-film")).toBeNull();
      fireEvent.click(within(dialog).getByTestId("intro-enter"));
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(localStorage.getItem("lov.onboarded.video.v2")).toBe("1");
      cleanup();
      await act(async () => { await i18n.changeLanguage("zh"); });
      fireEvent.click(render(<MemoryRouter><Onboarding /></MemoryRouter>).getByTestId("float-intro"));
      expect(within(screen.getByRole("dialog")).getByText(/当前浏览器无法播放介绍短片/)).toBeInTheDocument();
    } finally { vi.useRealTimers(); spy.mockRestore(); }
  });
  it("load error swaps the film for a retryable fallback", () => {
    const spy = vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("probably");
    try {
      fireEvent.click(render(<MemoryRouter><Onboarding /></MemoryRouter>).getByTestId("float-intro"));
      const dialog = screen.getByRole("dialog");
      const film = within(dialog).getByTestId("intro-film");
      expect(film).toHaveAttribute("poster");
      fireEvent.error(film);
      expect(within(dialog).getByTestId("intro-fallback")).toHaveAttribute("data-reason", "error");
      fireEvent.click(within(dialog).getByRole("button", { name: /Retry/ }));
      expect(within(dialog).getByTestId("intro-film")).toBeInTheDocument();
    } finally { spy.mockRestore(); }
  });
});

describe("intro film stall timer", () => {
  it("repeated buffering events do not postpone the stalled fallback", () => {
    const spy = vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("probably");
    vi.useFakeTimers();
    try {
      fireEvent.click(render(<MemoryRouter><Onboarding /></MemoryRouter>).getByTestId("float-intro"));
      const film = screen.getByTestId("intro-film") as HTMLVideoElement;
      Object.defineProperty(film, "paused", { configurable: true, get: () => false });
      Object.defineProperty(film, "readyState", { configurable: true, get: () => 0 });
      fireEvent.play(film);
      act(() => { vi.advanceTimersByTime(5000); });
      fireEvent.waiting(film); fireEvent.stalled(film);
      act(() => { vi.advanceTimersByTime(7100); });
      expect(screen.getByTestId("intro-fallback")).toHaveAttribute("data-reason", "stalled");
    } finally { vi.useRealTimers(); spy.mockRestore(); }
  });
});

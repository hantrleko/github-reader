import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
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

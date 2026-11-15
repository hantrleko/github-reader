import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent, within, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import i18n from "@/i18n";
import zh from "@/i18n/locales/zh.json";
import en from "@/i18n/locales/en.json";
import { CAPMTool } from "@/components/asset/V31AssetTools";
import { HedgePnLTool } from "@/components/deriv/V42Tools";
import { OLSvsIV } from "@/components/EconometricsTools";
import { CAPM_DEFAULT, HEDGE_DEFAULT, OLSIV_DEFAULT } from "@/lib/teachingPath";

beforeAll(() => {
  class RO { observe() {} unobserve() {} disconnect() {} }
  (globalThis as any).ResizeObserver ??= RO;
});
beforeEach(async () => { cleanup(); await i18n.changeLanguage("en"); });

const inRouter = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);
const panel = (lab: string) => screen.getByTestId(`compare-${lab}`);
const cell = (lab: string, row: string, c: "base" | "cur" | "diff" | "kind") =>
  within(within(panel(lab)).getByTestId(`compare-row-${row}`)).getByTestId(`cell-${c}`);
const slider = (i: number) => screen.getAllByRole("slider")[i] as HTMLInputElement;
const MINUS = "\u2212";

describe("CAPM baseline vs current", () => {
  it("pins, updates current and pp differences, and names the changed input", () => {
    inRouter(<CAPMTool />);
    expect(panel("capm")).toHaveAttribute("data-baseline", "none");
    expect(within(panel("capm")).queryByTestId("compare-table")).toBeNull();
    fireEvent.click(within(panel("capm")).getByTestId("compare-pin"));
    expect(within(panel("capm")).getByTestId("compare-status")).toHaveTextContent(en.compare.statusPinned);
    expect(cell("capm", "required", "diff")).toHaveTextContent("0.00 pp"); // real zero shown
    expect(within(panel("capm")).getByTestId("compare-changed")).toHaveTextContent(en.compare.same);

    fireEvent.change(slider(2), { target: { value: "2" } }); // β 1.2 → 2
    expect(cell("capm", "required", "base")).toHaveTextContent("10.20%");
    expect(cell("capm", "required", "cur")).toHaveTextContent("15.00%");
    expect(cell("capm", "required", "diff")).toHaveTextContent("+4.80 pp");
    expect(cell("capm", "required", "kind")).toHaveTextContent(en.compare.kind.pp);
    expect(cell("capm", "alpha", "cur")).toHaveTextContent(`${MINUS}3.00%`);
    expect(cell("capm", "alpha", "diff")).toHaveTextContent(`${MINUS}4.80 pp`);
    expect(cell("capm", "treynor", "kind")).toHaveTextContent(en.compare.kind.abs);
    expect(cell("capm", "treynor", "diff")).not.toHaveTextContent("pp");
    expect(within(panel("capm")).getByTestId("compare-changed")).toHaveTextContent("Changed since baseline: Asset β 1.20 → 2.00.");
    expect(within(panel("capm")).queryByTestId("compare-joint")).toBeNull();
  });

  it("does not attribute the difference to one input when several changed", () => {
    inRouter(<CAPMTool />);
    fireEvent.click(within(panel("capm")).getByTestId("compare-pin"));
    fireEvent.change(slider(2), { target: { value: "2" } });
    fireEvent.change(slider(3), { target: { value: "14" } });
    expect(within(panel("capm")).getByTestId("compare-changed")).toHaveTextContent("2 inputs changed since baseline");
    expect(within(panel("capm")).getByTestId("compare-joint")).toHaveTextContent(en.compare.jointNote);
  });

  it("shows no result (not 0) for Treynor at β = 0", () => {
    inRouter(<CAPMTool />);
    fireEvent.click(within(panel("capm")).getByTestId("compare-pin"));
    fireEvent.change(slider(2), { target: { value: "0" } });
    expect(cell("capm", "treynor", "base")).toHaveTextContent("7.50");
    expect(cell("capm", "treynor", "cur")).toHaveTextContent(`—${en.compare.missing}`);
    expect(cell("capm", "treynor", "diff")).toHaveTextContent(`—${en.compare.missing}`);
  });

  it("Reset restores defaults, closes revealed answers and clears the baseline", () => {
    inRouter(<CAPMTool />);
    const check = screen.getByTestId("path-check-capm");
    const ans = within(check).getAllByRole("button", { name: en.path.showAnswer })[0];
    fireEvent.click(ans);
    fireEvent.click(within(panel("capm")).getByTestId("compare-pin"));
    fireEvent.change(slider(2), { target: { value: "2" } });
    fireEvent.click(within(check).getByTestId("path-reset"));
    expect(slider(2).value).toBe(String(CAPM_DEFAULT.beta));
    expect(panel("capm")).toHaveAttribute("data-baseline", "none");
    expect(within(check).getAllByRole("button", { name: en.path.showAnswer })[0]).toHaveAttribute("aria-expanded", "false");
    // the intro Reset follows the same rule
    fireEvent.click(within(panel("capm")).getByTestId("compare-pin"));
    fireEvent.click(within(screen.getByTestId("path-intro-capm")).getByTestId("path-reset"));
    expect(panel("capm")).toHaveAttribute("data-baseline", "none");
  });

  it("switching language relabels the comparison and keeps the baseline", async () => {
    inRouter(<CAPMTool />);
    fireEvent.click(within(panel("capm")).getByTestId("compare-pin"));
    fireEvent.change(slider(2), { target: { value: "2" } });
    await act(async () => { await i18n.changeLanguage("zh"); });
    expect(within(panel("capm")).getByText(zh.compare.colDiff)).toBeInTheDocument();
    expect(within(panel("capm")).getByTestId("compare-status")).toHaveTextContent(zh.compare.statusPinned);
    expect(cell("capm", "required", "base")).toHaveTextContent("10.20%");
    expect(cell("capm", "required", "diff")).toHaveTextContent("+4.80 个百分点");
    expect(cell("capm", "required", "kind")).toHaveTextContent(zh.compare.kind.pp);
    expect(cell("capm", "treynor", "kind")).toHaveTextContent(zh.compare.kind.abs);
    expect(within(panel("capm")).getByTestId("compare-changed")).toHaveTextContent("相对基准改动了：资产 β 1.20 → 2.00。");
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(cell("capm", "required", "diff")).toHaveTextContent("+4.80 pp");
  });
});

describe("OLS/IV and hedge baselines use the labs' own outputs", () => {
  it("OLS/IV: removing endogeneity gives a negative absolute bias difference", () => {
    inRouter(<OLSvsIV />);
    fireEvent.click(within(panel("olsiv")).getByTestId("compare-pin"));
    const before = cell("olsiv", "olsBeta", "base").textContent;
    expect(cell("olsiv", "olsBeta", "cur").textContent).toBe(before);
    fireEvent.change(slider(2), { target: { value: "0" } });
    expect(cell("olsiv", "olsBias", "diff").textContent!.startsWith(MINUS)).toBe(true);
    expect(cell("olsiv", "olsBias", "kind")).toHaveTextContent(en.compare.kind.abs);
    expect(cell("olsiv", "olsBeta", "base").textContent).toBe(before);
    fireEvent.click(within(screen.getByTestId("path-check-olsiv")).getByTestId("path-reset"));
    expect(slider(2).value).toBe(String(OLSIV_DEFAULT.endo));
    expect(panel("olsiv")).toHaveAttribute("data-baseline", "none");
  });

  it("hedge: matching realised to pricing vol raises mean P&L; Clear removes the baseline", () => {
    inRouter(<HedgePnLTool />);
    fireEvent.click(within(panel("hedge")).getByTestId("compare-pin"));
    fireEvent.change(slider(1), { target: { value: "0.2" } });
    expect(cell("hedge", "meanPnL", "diff").textContent!.startsWith("+")).toBe(true);
    expect(within(panel("hedge")).getByTestId("compare-changed")).toHaveTextContent("σ_real 28% → 20%");
    fireEvent.click(within(panel("hedge")).getByTestId("compare-clear"));
    expect(panel("hedge")).toHaveAttribute("data-baseline", "none");
    expect(slider(1).value).toBe("0.2"); // Clear keeps the scenario; only Reset restores defaults
    fireEvent.click(within(screen.getByTestId("path-intro-hedge")).getByTestId("path-reset"));
    expect(slider(1).value).toBe(String(HEDGE_DEFAULT.sigmaReal));
  });
});

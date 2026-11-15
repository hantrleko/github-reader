import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent, within, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import i18n from "@/i18n";
import zh from "@/i18n/locales/zh.json";
import en from "@/i18n/locales/en.json";
import { CAPMTool } from "@/components/asset/V31AssetTools";
import { HedgePnLTool } from "@/components/deriv/V42Tools";
import { OLSvsIV } from "@/components/EconometricsTools";

beforeAll(() => {
  class RO { observe() {} unobserve() {} disconnect() {} }
  (globalThis as any).ResizeObserver ??= RO;
});
beforeEach(async () => { cleanup(); await i18n.changeLanguage("en"); });

const inRouter = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);
const panel = (lab: string) => screen.getByTestId(`compare-${lab}`);
const explain = (lab: string) => within(panel(lab)).queryByTestId("compare-explain");
const slider = (i: number) => screen.getAllByRole("slider")[i] as HTMLInputElement;
const pin = (lab: string) => fireEvent.click(within(panel(lab)).getByTestId("compare-pin"));

describe("explanation beside the baseline comparison", () => {
  it("is absent until a baseline is pinned, then says results match", () => {
    inRouter(<CAPMTool />);
    expect(explain("capm")).toBeNull();
    pin("capm");
    expect(explain("capm")).toHaveAttribute("data-kind", "same");
    expect(within(explain("capm")!).getByTestId("explain-summary")).toHaveTextContent(en.compare.explain.summary.same);
    expect(within(explain("capm")!).queryByTestId("explain-details")).toBeNull();
  });

  it("one change: summary visible, details collapsed by default", () => {
    inRouter(<CAPMTool />);
    pin("capm");
    fireEvent.change(slider(2), { target: { value: "2" } });
    const box = explain("capm")!;
    expect(box).toHaveAttribute("data-kind", "one");
    expect(within(box).getByTestId("explain-summary")).toHaveTextContent("Only one input changed: Asset β 1.20 → 2.00.");
    const details = within(box).getByTestId("explain-details") as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(within(box).getByText(en.compare.explain.toggle)).toBeInTheDocument();
    expect(within(box).getByTestId("explain-observed")).toHaveTextContent("CAPM required return: 10.20% → 15.00% (+4.80 pp, percentage-point diff.)");
  });

  it("β = 0 in the lab: Treynor stays no result in the explanation", () => {
    inRouter(<CAPMTool />);
    pin("capm");
    fireEvent.change(slider(2), { target: { value: "0" } });
    const obs = within(explain("capm")!).getByTestId("explain-observed");
    expect(obs).toHaveTextContent("Treynor ratio (% per unit of β): baseline 7.50, current has no result");
    expect(within(explain("capm")!).getByTestId("explain-limits")).toHaveTextContent(en.compare.explain.limit.capm.treynorZero);
  });

  it("several changes: joint wording, no theory block", () => {
    inRouter(<OLSvsIV />);
    pin("olsiv");
    fireEvent.change(slider(2), { target: { value: "0" } });
    fireEvent.change(slider(4), { target: { value: "7" } });
    const box = explain("olsiv")!;
    expect(box).toHaveAttribute("data-kind", "many");
    expect(within(box).getByTestId("explain-summary")).toHaveTextContent("cannot be attributed to, or ranked across, any single input");
    expect(within(box).queryByTestId("explain-theory")).toBeNull();
    expect(within(box).getByTestId("explain-limits")).toHaveTextContent(en.compare.explain.limit.samplingInMix);
  });

  it("language switch keeps the baseline and relabels the explanation", async () => {
    inRouter(<CAPMTool />);
    pin("capm");
    fireEvent.change(slider(2), { target: { value: "2" } });
    await act(async () => { await i18n.changeLanguage("zh"); });
    expect(panel("capm")).toHaveAttribute("data-baseline", "pinned");
    const box = explain("capm")!;
    expect(within(box).getByTestId("explain-summary")).toHaveTextContent("只改动了一个参数：资产 β 1.20 → 2.00。");
    expect(within(box).getByText(zh.compare.explain.toggle)).toBeInTheDocument();
    expect(within(box).getByTestId("explain-observed")).toHaveTextContent("+4.80 个百分点");
  });

  it("Reset and Clear both remove the explanation with the baseline", () => {
    inRouter(<HedgePnLTool />);
    pin("hedge");
    fireEvent.change(slider(1), { target: { value: "0.2" } });
    expect(within(explain("hedge")!).getByTestId("explain-observed")).toHaveTextContent("short-call book");
    fireEvent.click(within(screen.getByTestId("path-intro-hedge")).getByTestId("path-reset"));
    expect(explain("hedge")).toBeNull();
    pin("hedge");
    fireEvent.change(slider(1), { target: { value: "0.2" } });
    fireEvent.click(within(panel("hedge")).getByTestId("compare-clear"));
    expect(explain("hedge")).toBeNull();
    expect(slider(1).value).toBe("0.2");
  });
});

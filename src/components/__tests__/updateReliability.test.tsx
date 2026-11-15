/**
 * V7.6.2 update reliability. Everything here is simulated in jsdom with a
 * mocked service worker container, mocked fetch and mocked registerSW — not a
 * real production service-worker upgrade.
 */
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import { render, screen, fireEvent, cleanup, act, within } from "@testing-library/react";
import { Suspense } from "react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "fs";
import path from "path";
import i18n from "@/i18n";
import { createUpdateController, fetchServerBuild, parseBuildVersion } from "@/lib/appUpdate";
import { isBlockedHost, setupServiceWorker } from "@/lib/registerSW";
import { classifyLoadError, resetFailedLazies, retryableLazy } from "@/lib/lazyLoad";
import SectionErrorBoundary from "@/components/SectionErrorBoundary";
import LoadingHint, { SLOW_LOAD_MS } from "@/components/LoadingHint";
import { HedgePnLTool } from "@/components/deriv/V42Tools";

const CHUNK_ERR = () => new TypeError("Failed to fetch dynamically imported module: /assets/DerivativesTools-abc.js");
const html = (v: string) => `<html><head><meta name="build-version" content="${v}" /></head></html>`;
const okFetch = (v: string) => vi.fn(async () => new Response(html(v), { status: 200 })) as unknown as typeof fetch;

function mockServiceWorker() {
  const listeners: Record<string, Array<() => void>> = {};
  const unregister = vi.fn(async () => true);
  const sw = {
    controller: {},
    addEventListener: (type: string, fn: () => void) => { (listeners[type] ??= []).push(fn); },
    getRegistrations: vi.fn(async () => [{ active: { scriptURL: "https://eugenefinance.tech/sw.js" }, unregister }]),
  };
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: sw });
  return { fire: (type: string) => (listeners[type] ?? []).forEach((f) => f()), unregister };
}

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

beforeAll(() => {
  class RO { observe() {} unobserve() {} disconnect() {} }
  (globalThis as any).ResizeObserver ??= RO;
});
beforeEach(async () => { cleanup(); await i18n.changeLanguage("en"); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("stale page reaches the new version through a user-controlled prompt", () => {
  it("prompts once when the server build is newer and reloads only after Refresh is clicked", async () => {
    const reload = vi.fn();
    const notify = vi.fn();
    const c = createUpdateController({ running: "100", probe: () => fetchServerBuild("100", okFetch("200")), notify, reload });
    await c.check();
    await c.check();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith({ server: "200" });
    expect(reload).not.toHaveBeenCalled();
    c.accept();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("does not prompt when the page already runs the server's build", async () => {
    const notify = vi.fn();
    const c = createUpdateController({ running: "200", probe: () => fetchServerBuild("200", okFetch("200")), notify, reload: vi.fn() });
    expect((await c.onWorkerUpdated()).status).toBe("same");
    expect(notify).not.toHaveBeenCalled();
  });

  it("offline version check is 'unknown', never a fake new version", async () => {
    const notify = vi.fn();
    const failing = vi.fn(async () => { throw new TypeError("Failed to fetch"); }) as unknown as typeof fetch;
    const c = createUpdateController({ running: "100", probe: () => fetchServerBuild("100", failing), notify, reload: vi.fn() });
    expect((await c.check()).status).toBe("unknown");
    expect(notify).not.toHaveBeenCalled();
  });

  it("probe bypasses HTTP cache and the worker precache", async () => {
    const f = okFetch("1");
    await fetchServerBuild("1", f);
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toMatch(/^\/index\.html\?build-probe=\d+$/);
    expect(init).toMatchObject({ cache: "no-store" });
    expect(parseBuildVersion('<meta name="build-version" content="%BUILD_VERSION%" />')).toBeNull();
  });

  it("old worker swap (controllerchange / plugin reload hook) prompts instead of reloading", async () => {
    const sw = mockServiceWorker();
    const reload = vi.fn();
    const notify = vi.fn();
    let opts: any;
    await setupServiceWorker({
      isProd: true,
      inIframe: false,
      location: { hostname: "eugenefinance.tech", search: "", reload },
      probe: () => fetchServerBuild("dev", okFetch("7.6.2-build")),
      notify,
      loadRegister: async () => ({ registerSW: (o: any) => { opts = o; return async () => {}; } }),
    });
    sw.fire("controllerchange");
    opts.onNeedReload();
    opts.onNeedRefresh();
    await flush();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
    expect(sw.unregister).not.toHaveBeenCalled();
  });

  it("guards draft previews such as id-preview-3--*.lovable.app but not the custom domain", () => {
    expect(isBlockedHost("id-preview-3--4b99ecca.lovable.app")).toBe(true);
    expect(isBlockedHost("id-preview--4b99ecca.lovable.app")).toBe(true);
    expect(isBlockedHost("preview--shop.lovable.app")).toBe(true);
    expect(isBlockedHost("eugenefinance.tech")).toBe(false);
    expect(isBlockedHost("my-repo-mind.lovable.app")).toBe(false);
    expect(isBlockedHost("preview-v2--shop.example.com")).toBe(false);
  });

  it("build-version bookkeeping never reloads or wipes Cache Storage", () => {
    const src = readFileSync(path.resolve(__dirname, "../../lib/buildVersion.ts"), "utf8");
    expect(src).not.toMatch(/location\.reload\(|caches\.keys\(|caches\.delete\(/);
  });

  it("service worker config: no precached NavigationRoute, page visits go to the network first", () => {
    const cfg = readFileSync(path.resolve(__dirname, "../../../vite.config.ts"), "utf8");
    expect(cfg).toMatch(/navigateFallback:\s*null/);
    expect(cfg).toMatch(/directoryIndex:\s*""/);
    expect(cfg).toMatch(/handler:\s*"NetworkOnly"[\s\S]*fallbackURL:\s*"\/index\.html"/);
  });
});

describe("pinned baseline survives an update", () => {
  it("a newer build + worker swap leaves the pinned hedge baseline in place and does not reload", async () => {
    const sw = mockServiceWorker();
    const reload = vi.fn();
    let opts: any;
    render(<MemoryRouter><HedgePnLTool /></MemoryRouter>);
    const panel = screen.getByTestId("compare-hedge");
    fireEvent.click(within(panel).getByTestId("compare-pin"));
    expect(panel).not.toHaveAttribute("data-baseline", "none");
    await setupServiceWorker({
      isProd: true,
      inIframe: false,
      location: { hostname: "eugenefinance.tech", search: "", reload },
      probe: () => fetchServerBuild("dev", okFetch("new")),
      notify: vi.fn(),
      loadRegister: async () => ({ registerSW: (o: any) => { opts = o; return async () => {}; } }),
    });
    sw.fire("controllerchange");
    opts.onNeedReload();
    await flush();
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByTestId("compare-hedge")).not.toHaveAttribute("data-baseline", "none");
  });
});

describe("lazy tool load failures are understandable and recover via Retry", () => {
  it("classifies offline vs failed download", () => {
    expect(classifyLoadError(CHUNK_ERR(), false)).toBe("offline");
    expect(classifyLoadError(CHUNK_ERR(), true)).toBe("chunk");
    expect(classifyLoadError(new Error("x is undefined"), true)).toBe("other");
  });

  it("shows an offline message (not 'new version') and Retry loads the tool once the network is back", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    let calls = 0;
    const Tool = retryableLazy(async () => {
      calls++;
      if (calls === 1) throw CHUNK_ERR();
      return { default: () => <p>Hedge tool ready</p> };
    });
    render(
      <SectionErrorBoundary name="Derivatives">
        <Suspense fallback={<LoadingHint />}><Tool /></Suspense>
      </SectionErrorBoundary>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(/offline/i);
    expect(screen.getByRole("alert")).not.toHaveTextContent(/new version is available/i);
    await flush();
    expect(calls).toBe(1); // no automatic retry
    online.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByText("Hedge tool ready")).toBeInTheDocument();
    expect(calls).toBe(2);
  });

  it("a download failure while online offers Retry and Reload page; repeated failures never loop", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let calls = 0;
    const Tool = retryableLazy(async () => { calls++; throw CHUNK_ERR(); });
    render(
      <SectionErrorBoundary name="Derivatives">
        <Suspense fallback={<LoadingHint />}><Tool /></Suspense>
      </SectionErrorBoundary>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(/didn't finish downloading/i);
    expect(screen.getByRole("button", { name: /reload page/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await flush();
    expect(calls).toBe(2);
    expect(resetFailedLazies()).toBeGreaterThanOrEqual(1);
  });
});

describe("slow lazy load shows a loading hint", () => {
  it("shows loading text at once and a slow-connection note later, without failing", async () => {
    vi.useFakeTimers();
    render(<LoadingHint />);
    expect(screen.getByRole("status")).toHaveTextContent(/loading the interactive tool/i);
    expect(screen.queryByText(/taking longer than usual/i)).toBeNull();
    act(() => { vi.advanceTimersByTime(SLOW_LOAD_MS + 10); });
    expect(screen.getByText(/taking longer than usual/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("Chinese copy exists for the new messages", async () => {
    await i18n.changeLanguage("zh");
    render(<LoadingHint what="page" />);
    expect(screen.getByRole("status")).toHaveTextContent("正在加载页面");
  });
});

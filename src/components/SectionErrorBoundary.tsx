import { Translation } from "react-i18next";
import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCw, WifiOff } from "lucide-react";
import { classifyLoadError, resetFailedLazies, type LoadErrorKind } from "@/lib/lazyLoad";
import { reportClientError } from "@/lib/errorReport";

interface Props {
  name?: string;
  /** "page" = whole-route boundary (centred, full height). */
  variant?: "section" | "page";
  children: ReactNode;
}
interface State {
  err: Error | null;
  kind: LoadErrorKind;
}

const isOnline = () => (typeof navigator === "undefined" ? true : navigator.onLine !== false);

/**
 * Catches render and lazy-load errors so a broken or undownloaded tool never
 * blanks the page. Explains whether the tab is offline or a download failed,
 * and offers a Retry that re-downloads failed parts (and, for download
 * failures, a Reload page button). Nothing retries or reloads on its own.
 */
export default class SectionErrorBoundary extends Component<Props, State> {
  state: State = { err: null, kind: "other" };

  static getDerivedStateFromError(err: Error): State {
    return { err, kind: classifyLoadError(err, isOnline()) };
  }

  componentDidCatch(err: Error) {
    console.error("[SectionErrorBoundary]", this.props.name, err);
    if (this.state.kind !== "other" || classifyLoadError(err, true) === "chunk") {
      reportClientError({
        type: "chunk-load",
        message: String(err?.message ?? err),
        stack: err?.stack,
        extra: { boundary: this.props.name ?? this.props.variant ?? "section", online: isOnline() },
      });
    }
  }

  reset = () => {
    resetFailedLazies();
    this.setState({ err: null, kind: "other" });
  };

  render() {
    if (!this.state.err) return this.props.children;
    const { kind } = this.state;
    const page = this.props.variant === "page";
    return (
      <Translation>{(t) => (
      <div
        className={page ? "min-h-screen flex items-center justify-center px-6 py-16" : "container max-w-3xl py-16 px-6"}
      >
        <div
          role="alert"
          className="w-full max-w-xl mx-auto rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center"
        >
          {kind === "offline" ? (
            <WifiOff className="w-8 h-8 text-destructive mx-auto mb-3" aria-hidden />
          ) : (
            <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-3" aria-hidden />
          )}
          <h3 className="font-mono text-sm text-foreground mb-1">
            {kind === "offline"
              ? t("common.loadError.offlineTitle", { defaultValue: "离线 · 这部分尚未下载" })
              : kind === "chunk"
                ? t("common.loadError.chunkTitle", { defaultValue: "这部分页面没能下载完成" })
                : t("common.sectionError.title", { defaultValue: "模块加载失败 · Module failed to load" })}
          </h3>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            {this.props.name ? `「${this.props.name}」` : null}
            {kind === "offline"
              ? t("common.loadError.offlineBody", { defaultValue: "当前处于离线状态，这部分页面还没有下载到本机。连接网络后点「重试」。" })
              : kind === "chunk"
                ? t("common.loadError.chunkBody", { defaultValue: "可能是网络中断，也可能是网站刚发布了新版本。请先点「重试」；仍失败再刷新页面（刷新会清空未保存的输入和已固定的基准）。" })
                : <>{this.props.name ? null : t("common.sectionError.module", { defaultValue: "此模块" })}{t("common.sectionError.message", { defaultValue: "遇到错误，可重试或刷新页面。" })}</>}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={this.reset}
              className="inline-flex min-h-[44px] items-center gap-2 px-4 py-2 rounded-md border border-gold/40 text-gold text-xs font-mono hover:bg-gold/10 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" aria-hidden />
              {t("common.sectionError.retry", { defaultValue: "重试 · Retry" })}
            </button>
            {kind === "chunk" && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex min-h-[44px] items-center gap-2 px-4 py-2 rounded-md border border-border text-foreground/80 text-xs font-mono hover:bg-muted/40 transition-colors"
              >
                {t("common.loadError.reload", { defaultValue: "刷新页面" })}
              </button>
            )}
          </div>
        </div>
      </div>
      )}</Translation>
    );
  }
}

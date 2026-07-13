import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportClientError } from "@/lib/errorReport";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Root-level error boundary. Without this, any uncaught render error in the
 * provider tree (Auth, Theme, Index, Navbar…) unmounts React entirely and the
 * user only sees the CSS background colour — the classic "pure colour blank
 * page" on Lovable / production.
 */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AppErrorBoundary]", error, info?.componentStack);
    reportClientError({
      type: "manual",
      message: error?.message ?? String(error),
      stack: error?.stack,
      extra: {
        source: "AppErrorBoundary",
        componentStack: info?.componentStack?.slice(0, 1500),
      },
    });
  }

  private reload = () => {
    try {
      // Clear SW caches that can pin a broken deploy.
      if ("caches" in window) {
        void caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
      }
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  private dismiss = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    const msg = this.state.error?.message || "Unknown render error";

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl border border-destructive/30 bg-card/80 p-6 shadow-lg">
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold mb-3">
            Application Error
          </p>
          <h1 className="font-display text-2xl text-foreground mb-2">
            页面渲染失败
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            应用在加载过程中遇到错误。这通常由过期缓存、缺失配置或最新部署的代码异常引起。
            请尝试刷新；若持续出现，清除站点数据后再试。
          </p>
          <pre className="text-[11px] font-mono text-destructive/90 bg-destructive/5 border border-destructive/20 rounded-md p-3 mb-5 overflow-x-auto whitespace-pre-wrap break-words max-h-40">
            {msg}
          </pre>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={this.reload}
              className="px-4 py-2 bg-gold text-background text-xs font-mono uppercase tracking-wider font-bold hover:bg-gold/85 transition-colors"
            >
              刷新页面
            </button>
            <button
              type="button"
              onClick={this.dismiss}
              className="px-4 py-2 border border-border text-foreground text-xs font-mono uppercase tracking-wider hover:bg-accent/30 transition-colors"
            >
              重试渲染
            </button>
          </div>
        </div>
      </div>
    );
  }
}

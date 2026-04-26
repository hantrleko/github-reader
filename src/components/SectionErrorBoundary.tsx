import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

interface Props {
  name?: string;
  children: ReactNode;
}
interface State {
  err: Error | null;
}

/**
 * Catches render errors inside a single homepage section so a broken
 * calculator never blanks the whole page. Shows a small retry card.
 */
export default class SectionErrorBoundary extends Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error) {
    console.error("[SectionErrorBoundary]", this.props.name, err);
  }

  reset = () => this.setState({ err: null });

  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="container max-w-3xl py-16 px-6">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-3" />
          <h3 className="font-mono text-sm text-foreground mb-1">
            模块加载失败 · Module failed to load
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {this.props.name ? `「${this.props.name}」` : "此模块"}遇到错误，可重试或刷新页面。
          </p>
          <button
            onClick={this.reset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gold/40 text-gold text-xs font-mono hover:bg-gold/10 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
            重试 · Retry
          </button>
        </div>
      </div>
    );
  }
}
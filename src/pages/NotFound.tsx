import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { TrendingDown, Home, Search } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-lg text-center">
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <TrendingDown className="w-16 h-16 text-gold" strokeWidth={1.2} />
            <div className="absolute -top-1 -right-2 text-[10px] font-mono text-destructive">
              -100%
            </div>
          </div>
        </div>
        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-3">
          Error 404 · Asset Not Found
        </p>
        <h1 className="text-3xl md:text-4xl font-display text-foreground mb-3">
          找不到这个金融模型
        </h1>
        <p className="text-sm text-muted-foreground mb-2">
          We couldn't price this page — it may have been delisted or never existed.
        </p>
        <p className="text-xs font-mono text-muted-foreground/70 mb-8">
          路径 <code className="text-gold">{location.pathname}</code> 没有对应的工具或章节。
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-mono hover:opacity-90 transition-opacity"
          >
            <Home className="w-4 h-4" />
            返回首页 · Home
          </Link>
          <button
            onClick={() => {
              const evt = new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true });
              window.dispatchEvent(evt);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-gold/40 text-gold text-sm font-mono hover:bg-gold/10 transition-colors"
          >
            <Search className="w-4 h-4" />
            ⌘K 搜索工具
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

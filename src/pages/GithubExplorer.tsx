import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Folder,
  FolderOpen,
  FileText,
  Loader2,
  Github,
  ExternalLink,
  Star,
  StickyNote,
  History,
  X,
  Save,
  Trash2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  recordGithubVisit,
  listGithubHistory,
  removeGithubHistory,
  listGithubStars,
  isGithubStarred,
  toggleGithubStar,
  getFileNote,
  saveFileNote,
  deleteFileNote,
  listFileNotesForRepo,
  type FileNoteKey,
} from "@/lib/cloudStore";

type GhEntry = { path: string; type: "blob" | "tree"; size?: number; sha: string };
type TreeNode = {
  name: string;
  path: string;
  type: "blob" | "tree";
  size?: number;
  children: TreeNode[];
};

type HistoryRow = { id: string; owner: string; repo: string; branch: string; last_opened_at: string };
type StarRow = {
  id: string;
  owner: string;
  repo: string;
  default_branch: string | null;
  description: string | null;
  stars: number | null;
};

function parseRepoUrl(input: string): { owner: string; repo: string; branch?: string } | null {
  const s = input.trim();
  if (!s) return null;
  const short = s.match(/^([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
  if (short) return { owner: short[1], repo: short[2] };
  try {
    const u = new URL(s);
    if (!/github\.com$/i.test(u.hostname)) return null;
    const parts = u.pathname.replace(/^\/+|\/+$/g, "").split("/");
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, "");
    let branch: string | undefined;
    if ((parts[2] === "tree" || parts[2] === "blob") && parts[3]) branch = parts[3];
    return { owner, repo, branch };
  } catch {
    return null;
  }
}

function buildTree(entries: GhEntry[]): TreeNode {
  const root: TreeNode = { name: "", path: "", type: "tree", children: [] };
  const map = new Map<string, TreeNode>();
  map.set("", root);
  const sorted = [...entries].sort((a, b) => a.path.localeCompare(b.path));
  for (const e of sorted) {
    const segs = e.path.split("/");
    const name = segs[segs.length - 1];
    const parentPath = segs.slice(0, -1).join("/");
    const parent = map.get(parentPath) ?? root;
    const node: TreeNode = {
      name,
      path: e.path,
      type: e.type,
      size: e.size,
      children: [],
    };
    parent.children.push(node);
    if (e.type === "tree") map.set(e.path, node);
  }
  const sortNode = (n: TreeNode) => {
    n.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    n.children.forEach(sortNode);
  };
  sortNode(root);
  return root;
}

function formatBytes(n?: number) {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

const GH_HEADERS: HeadersInit = {
  Accept: "application/vnd.github+json",
};

if (import.meta.env.VITE_GITHUB_TOKEN) {
  (GH_HEADERS as Record<string, string>).Authorization = `Bearer ${import.meta.env.VITE_GITHUB_TOKEN}`;
}

const getRepoError = (res: Response, op: string) => {
  if (res.status === 404) return `${op}不存在或不可访问`;
  if (res.status === 403) {
    const reset = res.headers.get("x-ratelimit-reset");
    if (reset) {
      const resetAt = Number(reset) * 1000;
      const mins = Math.max(0, Math.ceil((resetAt - Date.now()) / 60000));
      return `GitHub API 访问受限，约 ${mins} 分钟后恢复`;
    }
    return "GitHub API 请求受限，请稍后重试";
  }
  return `加载失败 (${res.status})`;
};

const TreeRow = ({
  node,
  depth,
  expanded,
  toggle,
  repoUrl,
  branch,
  notedPaths,
  onOpenNote,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  toggle: (p: string) => void;
  repoUrl: string;
  branch: string;
  notedPaths: Set<string>;
  onOpenNote: (path: string) => void;
}) => {
  const isOpen = expanded.has(node.path);
  const isDir = node.type === "tree";
  const hasNote = notedPaths.has(node.path);
  return (
    <>
      <div
        className="group flex items-center gap-2 px-2 py-1 hover:bg-accent/40 rounded-sm cursor-pointer text-[12px] font-mono"
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={() => (isDir ? toggle(node.path) : onOpenNote(node.path))}
      >
        {isDir ? (
          isOpen ? (
            <FolderOpen className="w-3.5 h-3.5 text-gold shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-gold shrink-0" />
          )
        ) : (
          <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
        <span className="truncate flex-1 text-foreground">{node.name}</span>
        {hasNote && !isDir && (
          <StickyNote className="w-3 h-3 text-gold shrink-0" aria-label="Has note" />
        )}
        {!isDir && (
          <>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {formatBytes(node.size)}
            </span>
            <a
              href={`${repoUrl}/blob/${branch}/${node.path}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-gold transition-opacity"
              aria-label="Open on GitHub"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </>
        )}
      </div>
      {isDir &&
        isOpen &&
        node.children.map((c) => (
          <TreeRow
            key={c.path}
            node={c}
            depth={depth + 1}
            expanded={expanded}
            toggle={toggle}
            repoUrl={repoUrl}
            branch={branch}
            notedPaths={notedPaths}
            onOpenNote={onOpenNote}
          />
        ))}
    </>
  );
};

const GithubExplorer = () => {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [meta, setMeta] = useState<{
    owner: string;
    repo: string;
    branch: string;
    truncated: boolean;
    count: number;
    description?: string;
    stars?: number;
  } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set([""]));
  const [starred, setStarred] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [stars, setStars] = useState<StarRow[]>([]);
  const [notedPaths, setNotedPaths] = useState<Set<string>>(new Set());

  // file note drawer
  const [noteOpen, setNoteOpen] = useState(false);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteTags, setNoteTags] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);

  const requestId = useRef(0);
  const pendingRequest = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const latestNoteRequest = useRef("");

  const repoUrl = useMemo(
    () => (meta ? `https://github.com/${meta.owner}/${meta.repo}` : ""),
    [meta]
  );

  useEffect(() => {
    return () => {
      mounted.current = false;
      pendingRequest.current?.abort();
    };
  }, []);

  const refreshSidebar = useCallback(async () => {
    if (!user) {
      setHistory([]);
      setStars([]);
      return;
    }
    const [h, s] = await Promise.all([
      listGithubHistory(user.id, 10),
      listGithubStars(user.id),
    ]);
    if (!mounted.current) return;
    setHistory(h as HistoryRow[]);
    setStars(s as StarRow[]);
  }, [user]);

  useEffect(() => {
    refreshSidebar();
  }, [refreshSidebar]);

  const toggle = useCallback((p: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }, []);

  const expandAll = () => {
    if (!tree) return;
    const all = new Set<string>([""]);
    const walk = (n: TreeNode) => {
      if (n.type === "tree") all.add(n.path);
      n.children.forEach(walk);
    };
    walk(tree);
    setExpanded(all);
  };
  const collapseAll = () => setExpanded(new Set([""]));

  const load = async (override?: string) => {
    const raw = override ?? input;
    const parsed = parseRepoUrl(raw);
    if (!parsed) {
      setError("无法解析仓库地址。请输入 https://github.com/owner/repo 或 owner/repo");
      return;
    }

    const nextRequestId = requestId.current + 1;
    requestId.current = nextRequestId;

    const prevRequest = pendingRequest.current;
    prevRequest?.abort();
    const controller = new AbortController();
    pendingRequest.current = controller;

    setLoading(true);
    setError(null);
    setTree(null);
    setMeta(null);
    setStarred(false);
    setNotedPaths(new Set());

    try {
      const repoRes = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
        { headers: GH_HEADERS, signal: controller.signal }
      );
      if (!repoRes.ok) {
        throw new Error(getRepoError(repoRes, "仓库"));
      }
      const repoData = await repoRes.json();

      if (nextRequestId !== requestId.current || !mounted.current) return;

      const branch = parsed.branch || repoData.default_branch || "main";
      const treeRes = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${branch}?recursive=1`,
        { headers: GH_HEADERS, signal: controller.signal }
      );
      if (!treeRes.ok) {
        throw new Error(getRepoError(treeRes, `分支 ${branch}`));
      }
      const treeData = await treeRes.json();
      if (nextRequestId !== requestId.current || !mounted.current) return;

      const entries: GhEntry[] = (treeData.tree || []).filter(
        (e: GhEntry) => e.type === "blob" || e.type === "tree"
      );
      const built = buildTree(entries);

      setTree(built);
      setMeta({
        owner: parsed.owner,
        repo: parsed.repo,
        branch,
        truncated: !!treeData.truncated,
        count: entries.length,
        description: repoData.description,
        stars: repoData.stargazers_count,
      });
      setExpanded(new Set([""]));

      if (user) {
        try {
          await recordGithubVisit(user.id, parsed.owner, parsed.repo, branch);
          const [isStar, notes] = await Promise.all([
            isGithubStarred(user.id, parsed.owner, parsed.repo),
            listFileNotesForRepo(user.id, parsed.owner, parsed.repo, branch),
          ]);
          if (nextRequestId !== requestId.current || !mounted.current) return;
          setStarred(isStar);
          setNotedPaths(new Set(notes.map((n) => n.path)));
          refreshSidebar();
        } catch (e) {
          // non-fatal
          console.warn("cloud sync failed", e);
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        return;
      }
      if (nextRequestId !== requestId.current || !mounted.current) return;
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      if (nextRequestId === requestId.current && mounted.current) {
        setLoading(false);
      }
    }
  };

  const onToggleStar = async () => {
    if (!user) {
      toast({ title: "请先登录", description: "登录后即可收藏仓库" });
      return;
    }
    if (!meta) return;
    const next = await toggleGithubStar(user.id, {
      owner: meta.owner,
      repo: meta.repo,
      default_branch: meta.branch,
      description: meta.description,
      stars: meta.stars,
    });
    setStarred(next);
    refreshSidebar();
    toast({ title: next ? "已收藏" : "已取消收藏" });
  };

  const openNote = async (path: string) => {
    if (!user) {
      toast({ title: "请先登录", description: "登录后即可为文件添加笔记" });
      return;
    }
    if (!meta) return;
    const k: FileNoteKey = { owner: meta.owner, repo: meta.repo, branch: meta.branch, path };
    const requestKey = `${k.owner}/${k.repo}:${k.branch}:${k.path}`;
    latestNoteRequest.current = requestKey;

    setActivePath(path);
    setNoteText("");
    setNoteTags("");
    setNoteOpen(true);

    const existing = await getFileNote(user.id, k);
    if (latestNoteRequest.current !== requestKey) return;

    if (existing) {
      setNoteText(existing.note ?? "");
      setNoteTags((existing.tags ?? []).join(", "));
    }
  };

  const saveNote = async () => {
    if (!user || !meta || !activePath) return;
    setNoteBusy(true);
    try {
      const tags = noteTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await saveFileNote(
        user.id,
        { owner: meta.owner, repo: meta.repo, branch: meta.branch, path: activePath },
        noteText,
        tags
      );
      setNotedPaths((prev) => new Set(prev).add(activePath));
      toast({ title: "笔记已保存" });
      setNoteOpen(false);
    } finally {
      setNoteBusy(false);
    }
  };

  const removeNote = async () => {
    if (!user || !meta || !activePath) return;
    setNoteBusy(true);
    try {
      await deleteFileNote(user.id, {
        owner: meta.owner,
        repo: meta.repo,
        branch: meta.branch,
        path: activePath,
      });
      setNotedPaths((prev) => {
        const n = new Set(prev);
        n.delete(activePath);
        return n;
      });
      toast({ title: "笔记已删除" });
      setNoteOpen(false);
    } finally {
      setNoteBusy(false);
    }
  };

  const quickLoad = (owner: string, repo: string, branch?: string) => {
    const url = `https://github.com/${owner}/${repo}${branch ? `/tree/${branch}` : ""}`;
    setInput(url);
    load(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-6xl pt-20 pb-24 px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-gold transition-colors mb-4"
        >
          <ArrowLeft className="w-3 h-3" />
          BACK
        </Link>

        <header className="border-b border-accent pb-6 mb-6">
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold mb-2">
            SECTION / GITHUB EXPLORER
          </p>
          <h1 className="font-display text-3xl md:text-4xl text-foreground mb-2">
            GitHub Repository Explorer
          </h1>
          <p className="text-sm text-muted-foreground font-body max-w-2xl">
            输入 GitHub 仓库地址，浏览其文件与目录结构。登录后可收藏仓库、记录浏览历史并为文件添加中文笔记。
          </p>
        </header>

        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <div className="flex items-center gap-2 flex-1 px-3 border border-accent rounded-md bg-card">
            <Github className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="https://github.com/facebook/react  或  facebook/react"
              className="border-0 bg-transparent focus-visible:ring-0 px-0 font-mono text-sm"
            />
          </div>
          <Button onClick={() => load()} disabled={loading} className="font-mono uppercase tracking-wider">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load"}
          </Button>
        </div>

        {error && (
          <div className="border border-destructive/50 bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm font-mono mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          <div>
            {meta && tree && (
              <section className="border border-accent rounded-md bg-card">
                <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-accent">
                  <div className="min-w-0">
                    <a
                      href={repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-display text-lg text-foreground hover:text-gold transition-colors inline-flex items-center gap-1.5"
                    >
                      {meta.owner}/{meta.repo}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    {meta.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {meta.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    <span>
                      BRANCH · <span className="text-gold">{meta.branch}</span>
                    </span>
                    <span>{meta.count} ITEMS</span>
                    {meta.stars != null && <span>★ {meta.stars.toLocaleString()}</span>}
                    {meta.truncated && <span className="text-destructive">TRUNCATED</span>}
                    <button
                      onClick={onToggleStar}
                      className={`inline-flex items-center gap-1 px-2 py-1 border rounded transition-colors ${
                        starred
                          ? "border-gold bg-gold/15 text-gold"
                          : "border-accent text-muted-foreground hover:text-gold hover:border-gold/60"
                      }`}
                    >
                      <Star className={`w-3 h-3 ${starred ? "fill-gold" : ""}`} />
                      {starred ? "STARRED" : "STAR"}
                    </button>
                  </div>
                </header>
                <div className="flex items-center gap-2 px-4 py-2 border-b border-accent/60">
                  <button
                    onClick={expandAll}
                    className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-gold"
                  >
                    Expand all
                  </button>
                  <span className="text-muted-foreground/40">·</span>
                  <button
                    onClick={collapseAll}
                    className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-gold"
                  >
                    Collapse all
                  </button>
                  {user && (
                    <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                      点击文件以添加笔记 ✎
                    </span>
                  )}
                </div>
                <div className="py-2 max-h-[70vh] overflow-auto">
                  {tree.children.map((c) => (
                    <TreeRow
                      key={c.path}
                      node={c}
                      depth={0}
                      expanded={expanded}
                      toggle={toggle}
                      repoUrl={repoUrl}
                      branch={meta.branch}
                      notedPaths={notedPaths}
                      onOpenNote={openNote}
                    />
                  ))}
                </div>
                {meta.truncated && (
                  <p className="px-4 py-2 text-[11px] font-mono text-muted-foreground border-t border-accent">
                    注意：仓库过大，GitHub API 返回的树已被截断，部分文件可能未显示。
                  </p>
                )}
              </section>
            )}

            {!meta && !loading && !error && (
              <div className="border border-dashed border-accent rounded-md p-10 text-center">
                <Github className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-body">
                  在上方输入 GitHub 仓库地址以加载目录结构
                </p>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            {!user ? (
              <div className="border border-accent rounded-md bg-card p-4">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-2">
                  SYNC OFF
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  登录后可保存浏览历史、收藏仓库、为文件写中文笔记并跨设备同步。
                </p>
                <Link
                  to="/auth?next=/github"
                  className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-gold hover:underline"
                >
                  Sign in →
                </Link>
              </div>
            ) : (
              <>
                <div className="border border-accent rounded-md bg-card">
                  <header className="flex items-center gap-2 px-3 py-2 border-b border-accent">
                    <Star className="w-3 h-3 text-gold" />
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-foreground">
                      Starred ({stars.length})
                    </span>
                  </header>
                  <div className="max-h-64 overflow-auto">
                    {stars.length === 0 ? (
                      <p className="px-3 py-3 text-[11px] font-mono text-muted-foreground">
                        暂无收藏
                      </p>
                    ) : (
                      stars.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => quickLoad(s.owner, s.repo, s.default_branch ?? undefined)}
                          className="block w-full text-left px-3 py-2 hover:bg-accent/40 border-b border-accent/40 last:border-0"
                        >
                          <p className="text-[11px] font-mono text-foreground truncate">
                            {s.owner}/{s.repo}
                          </p>
                          {s.description && <p className="text-[10px] text-muted-foreground truncate">{s.description}</p>}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="border border-accent rounded-md bg-card">
                  <header className="flex items-center gap-2 px-3 py-2 border-b border-accent">
                    <History className="w-3 h-3 text-gold" />
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-foreground">
                      Recent ({history.length})
                    </span>
                  </header>
                  <div className="max-h-64 overflow-auto">
                    {history.length === 0 ? (
                      <p className="px-3 py-3 text-[11px] font-mono text-muted-foreground">
                        暂无历史
                      </p>
                    ) : (
                      history.map((h) => (
                        <div
                          key={h.id}
                          className="group flex items-center gap-1 px-3 py-2 hover:bg-accent/40 border-b border-accent/40 last:border-0"
                        >
                          <button
                            onClick={() => quickLoad(h.owner, h.repo, h.branch)}
                            className="flex-1 text-left min-w-0"
                          >
                            <p className="text-[11px] font-mono text-foreground truncate">
                              {h.owner}/{h.repo}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {h.branch} · {new Date(h.last_opened_at).toLocaleDateString()}
                            </p>
                          </button>
                          <button
                            onClick={async () => {
                              await removeGithubHistory(h.id);
                              refreshSidebar();
                            }}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                            aria-label="Remove"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>
      </main>

      <Sheet open={noteOpen} onOpenChange={setNoteOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-display">File Note</SheetTitle>
            <SheetDescription className="font-mono text-[11px] break-all">
              {meta?.owner}/{meta?.repo} · {meta?.branch}
              <br />
              {activePath}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Note (中文/英文均可)
              </label>
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={10}
                placeholder="例如：这里实现了 ……；关键函数 …… 在 line 42"
                className="mt-1 font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Tags (逗号分隔)
              </label>
              <Input
                value={noteTags}
                onChange={(e) => setNoteTags(e.target.value)}
                placeholder="entry, important, todo"
                className="mt-1 font-mono text-xs"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button onClick={saveNote} disabled={noteBusy} className="font-mono uppercase tracking-wider">
                <Save className="w-3.5 h-3.5 mr-1.5" /> Save
              </Button>
              {activePath && notedPaths.has(activePath) && (
                <Button
                  onClick={removeNote}
                  disabled={noteBusy}
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive font-mono uppercase tracking-wider"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                </Button>
              )}
              {activePath && (
                <a
                  href={`${repoUrl}/blob/${meta?.branch}/${activePath}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto text-[11px] font-mono text-muted-foreground hover:text-gold inline-flex items-center gap-1"
                >
                  View on GitHub <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default GithubExplorer;

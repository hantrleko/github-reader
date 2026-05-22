import { useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Folder, FolderOpen, FileText, Loader2, Github, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type GhEntry = { path: string; type: "blob" | "tree"; size?: number; sha: string };
type TreeNode = {
  name: string;
  path: string;
  type: "blob" | "tree";
  size?: number;
  children: TreeNode[];
};

function parseRepoUrl(input: string): { owner: string; repo: string; branch?: string } | null {
  const s = input.trim();
  if (!s) return null;
  // owner/repo shorthand
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
  // sort so parents come before children
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

const TreeRow = ({
  node,
  depth,
  expanded,
  toggle,
  repoUrl,
  branch,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  toggle: (p: string) => void;
  repoUrl: string;
  branch: string;
}) => {
  const isOpen = expanded.has(node.path);
  const isDir = node.type === "tree";
  return (
    <>
      <div
        className="group flex items-center gap-2 px-2 py-1 hover:bg-accent/40 rounded-sm cursor-pointer text-[12px] font-mono"
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={() => isDir && toggle(node.path)}
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
          />
        ))}
    </>
  );
};

const GithubExplorer = () => {
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

  const repoUrl = useMemo(
    () => (meta ? `https://github.com/${meta.owner}/${meta.repo}` : ""),
    [meta]
  );

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

  const load = async () => {
    const parsed = parseRepoUrl(input);
    if (!parsed) {
      setError("无法解析仓库地址。请输入 https://github.com/owner/repo 或 owner/repo");
      return;
    }
    setLoading(true);
    setError(null);
    setTree(null);
    setMeta(null);
    try {
      const headers: HeadersInit = { Accept: "application/vnd.github+json" };
      const repoRes = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
        { headers }
      );
      if (!repoRes.ok) {
        throw new Error(
          repoRes.status === 404
            ? "仓库不存在或为私有仓库"
            : repoRes.status === 403
            ? "GitHub API 速率限制，请稍后重试"
            : `加载失败 (${repoRes.status})`
        );
      }
      const repoData = await repoRes.json();
      const branch = parsed.branch || repoData.default_branch || "main";
      const treeRes = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${branch}?recursive=1`,
        { headers }
      );
      if (!treeRes.ok) throw new Error(`无法读取分支 ${branch}`);
      const treeData = await treeRes.json();
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
      // expand top-level by default
      const top = new Set<string>([""]);
      built.children.filter((c) => c.type === "tree").slice(0, 0).forEach((c) => top.add(c.path));
      setExpanded(top);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-5xl pt-20 pb-24 px-6">
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
            输入 GitHub 仓库地址，浏览其文件与目录结构。支持 <code className="font-mono text-foreground">owner/repo</code>、完整 URL 或带分支的 URL。
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
          <Button onClick={load} disabled={loading} className="font-mono uppercase tracking-wider">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load"}
          </Button>
        </div>

        {error && (
          <div className="border border-destructive/50 bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm font-mono mb-6">
            {error}
          </div>
        )}

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
                <span>BRANCH · <span className="text-gold">{meta.branch}</span></span>
                <span>{meta.count} ITEMS</span>
                {meta.stars != null && <span>★ {meta.stars.toLocaleString()}</span>}
                {meta.truncated && (
                  <span className="text-destructive">TRUNCATED</span>
                )}
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
      </main>
    </div>
  );
};

export default GithubExplorer;
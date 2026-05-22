import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { MessageSquare, Trash2, Send } from "lucide-react";

type Row = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  profile?: { username: string | null; display_name: string | null; is_public: boolean };
};

const DiscussionPanel = ({
  resourceType,
  resourceId,
}: {
  resourceType: "notebook" | "strategy" | "paper" | "tool";
  resourceId: string;
}) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("discussions")
      .select("id,user_id,body,created_at")
      .eq("resource_type", resourceType)
      .eq("resource_id", resourceId)
      .order("created_at", { ascending: true });

    const list = (data || []) as Row[];
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, display_name, is_public")
        .in("id", ids);
      const byId = Object.fromEntries((profs || []).map((p) => [p.id, p]));
      list.forEach((r) => (r.profile = byId[r.user_id]));
    }
    setRows(list);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [resourceType, resourceId]);

  const post = async () => {
    const body = draft.trim();
    if (!body) return;
    if (!user) { toast({ title: "请先登录", variant: "destructive" }); return; }
    const { error } = await supabase.from("discussions").insert({
      user_id: user.id, resource_type: resourceType, resource_id: resourceId, body,
    });
    if (error) { toast({ title: "发送失败", description: error.message, variant: "destructive" }); return; }
    setDraft("");
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("discussions").delete().eq("id", id);
    load();
  };

  return (
    <section className="border border-border/60 bg-card/30 mt-8" aria-label="Discussion">
      <header className="flex items-center justify-between border-b border-accent/30 px-4 py-2">
        <p className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-gold">
          <MessageSquare className="w-3 h-3" /> Discussion · {rows.length}
        </p>
      </header>

      <div className="p-4 space-y-3 max-h-[480px] overflow-y-auto">
        {loading && <p className="text-xs text-muted-foreground">加载中…</p>}
        {!loading && rows.length === 0 && (
          <p className="text-xs text-muted-foreground">还没有评论 · Be the first to comment.</p>
        )}
        {rows.map((r) => {
          const handle = r.profile?.username || r.profile?.display_name || r.user_id.slice(0, 8);
          const linkable = r.profile?.username && r.profile?.is_public;
          return (
            <article key={r.id} className="border-l-2 border-accent/40 pl-3">
              <header className="flex items-center justify-between text-[10px] font-mono mb-1">
                {linkable ? (
                  <Link to={`/u/${r.profile!.username}`} className="text-gold hover:underline">@{handle}</Link>
                ) : (
                  <span className="text-muted-foreground">@{handle}</span>
                )}
                <span className="text-muted-foreground/60">
                  {new Date(r.created_at).toLocaleString()}
                  {user?.id === r.user_id && (
                    <button onClick={() => remove(r.id)} className="ml-2 text-rose-400 hover:text-rose-300" aria-label="删除">
                      <Trash2 className="inline w-3 h-3" />
                    </button>
                  )}
                </span>
              </header>
              <p className="text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed">{r.body}</p>
            </article>
          );
        })}
      </div>

      <footer className="border-t border-accent/30 p-3">
        {user ? (
          <div className="flex gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="留下你的看法..."
              rows={2}
              className="flex-1 bg-background border border-border/60 px-2 py-1.5 text-sm focus:outline-none focus:border-gold resize-y"
            />
            <button
              onClick={post}
              className="self-end inline-flex items-center gap-1 px-3 py-1.5 bg-gold text-background text-[10px] font-mono uppercase tracking-wider hover:bg-gold/85"
            >
              <Send className="w-3 h-3" /> Post
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            <Link to="/auth" className="text-gold underline">登录</Link> 后参与讨论
          </p>
        )}
      </footer>
    </section>
  );
};

export default DiscussionPanel;
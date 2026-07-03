import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import SectionHeader from "@/components/common/SectionHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Globe, Lock, ExternalLink, NotebookPen, Star, BookOpen } from "lucide-react";
import { BADGES } from "@/lib/achievements";

const Account = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [myNotebooks, setMyNotebooks] = useState<Array<{ id: string; title: string; is_public: boolean; updated_at: string }>>([]);
  const [badges, setBadges] = useState<string[]>([]);
  const [favs, setFavs] = useState<Array<{ id: string; tool_id: string; label: string }>>([]);
  const [progress, setProgress] = useState<Array<{ section_id: string; topic_id: string; status: string }>>([]);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: prof }, { data: nbs }, { data: ach }, { data: fav }, { data: lp }] = await Promise.all([
        supabase.from("profiles").select("username, display_name, bio, is_public").eq("id", user.id).maybeSingle(),
        supabase.from("user_notebooks").select("id,title,is_public,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(20),
        supabase.from("user_achievements").select("slug").eq("user_id", user.id),
        supabase.from("calc_favorites").select("id,tool_id,label").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(12),
        supabase.from("learning_progress").select("section_id,topic_id,status").eq("user_id", user.id).limit(50),
      ]);
      if (prof) {
        setUsername(prof.username || "");
        setDisplayName(prof.display_name || "");
        setBio(prof.bio || "");
        setIsPublic(!!prof.is_public);
      }
      setMyNotebooks(nbs ?? []);
      setBadges((ach ?? []).map((a: { slug: string }) => a.slug));
      setFavs(fav ?? []);
      setProgress(lp ?? []);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const clean = username.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const { error } = await supabase.from("profiles").update({
      username: clean || null,
      display_name: displayName || null,
      bio: bio || null,
      is_public: isPublic,
    }).eq("id", user.id);
    setSaving(false);
    if (error) { toast({ title: "保存失败", description: error.message, variant: "destructive" }); return; }
    setUsername(clean);
    toast({ title: "已保存" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo title="账号设置 · EF Lab" description="管理你的 EF Lab 账号、username 与公开主页可见性。" path="/account" noindex />
      <Navbar />
      <main id="main-content" className="pt-14">
        <SectionHeader chapter="ACCOUNT" kicker="PROFILE" title="账号与公开主页" subtitle="设置 username 后,他人可访问 /u/your-name。" />
        <section className="container max-w-2xl px-6 pb-16">
          {user && (
            <div className="border border-border/60 bg-card/30 p-6 space-y-5">
              <Field label="Email">
                <input value={user.email || ""} disabled className="w-full bg-background/40 border border-border/40 px-3 py-2 text-sm font-mono text-muted-foreground" />
              </Field>
              <Field label="Username (a-z, 0-9, _ -)">
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="quant-cat"
                  className="w-full bg-background border border-border/60 px-3 py-2 text-sm font-mono focus:outline-none focus:border-gold"
                />
              </Field>
              <Field label="Display Name">
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-background border border-border/60 px-3 py-2 text-sm focus:outline-none focus:border-gold"
                />
              </Field>
              <Field label="Bio">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full bg-background border border-border/60 px-3 py-2 text-sm focus:outline-none focus:border-gold resize-y"
                />
              </Field>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="accent-gold" />
                <span className="text-sm text-foreground inline-flex items-center gap-1">
                  {isPublic ? <Globe className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                  公开个人主页 (Public profile)
                </span>
              </label>

              <div className="flex items-center justify-between border-t border-accent/30 pt-4">
                {isPublic && username ? (
                  <Link to={`/u/${username}`} className="text-[10px] font-mono uppercase tracking-wider text-gold inline-flex items-center gap-1">
                    /u/{username} <ExternalLink className="w-3 h-3" />
                  </Link>
                ) : <span />}
                <button
                  onClick={save}
                  disabled={saving}
                  className="px-4 py-2 bg-gold text-background text-[10px] font-mono uppercase tracking-wider hover:bg-gold/85 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          )}
        </section>

        {user && (
          <section className="container max-w-5xl px-6 pb-20 space-y-10">
            {/* My Notebooks */}
            <div>
              <div className="flex items-end justify-between border-b border-accent/30 pb-2 mb-4">
                <h2 className="font-display text-xl text-foreground inline-flex items-center gap-2">
                  <NotebookPen className="w-4 h-4 text-gold" /> 我的 Notebooks
                  <span className="text-[10px] font-mono text-muted-foreground/70">({myNotebooks.length})</span>
                </h2>
                <Link to="/notebook" className="text-[10px] font-mono uppercase tracking-wider text-gold hover:underline">+ 新建</Link>
              </div>
              {myNotebooks.length === 0 ? (
                <p className="text-sm text-muted-foreground">还没有 Notebook · <Link to="/notebook/templates" className="text-gold hover:underline">浏览模板</Link></p>
              ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {myNotebooks.map((nb) => (
                    <li key={nb.id}>
                      <Link to={`/notebook?id=${nb.id}`} className="flex items-center justify-between border border-border/50 hover:border-gold/50 bg-card/30 px-3 py-2 text-sm">
                        <span className="truncate">{nb.title || "Untitled"}</span>
                        <span className="text-[10px] font-mono text-muted-foreground inline-flex items-center gap-1">
                          {nb.is_public ? <Globe className="w-3 h-3 text-emerald-400" /> : <Lock className="w-3 h-3" />}
                          {new Date(nb.updated_at).toLocaleDateString()}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Badges */}
            <div>
              <h2 className="font-display text-xl text-foreground border-b border-accent/30 pb-2 mb-4">🏅 徽章 <span className="text-[10px] font-mono text-muted-foreground/70">({badges.length}/{Object.keys(BADGES).length})</span></h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(BADGES).map(([slug, meta]) => {
                  const owned = badges.includes(slug);
                  return (
                    <span
                      key={slug}
                      title={meta.description}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 border text-xs ${owned ? "border-gold/60 bg-gold/10 text-foreground" : "border-border/40 text-muted-foreground/50 opacity-60"}`}
                    >
                      <span className="text-base leading-none">{meta.emoji}</span>
                      {meta.label}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Favorite Calculators */}
            <div>
              <h2 className="font-display text-xl text-foreground border-b border-accent/30 pb-2 mb-4 inline-flex items-center gap-2"><Star className="w-4 h-4 text-gold" /> 收藏的计算器</h2>
              {favs.length === 0 ? (
                <p className="text-sm text-muted-foreground">在计算器面板上点击 ⭐ 即可保存参数预设。</p>
              ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {favs.map((f) => (
                    <li key={f.id} className="border border-border/50 bg-card/30 px-3 py-2 text-sm">
                      <p className="text-foreground truncate">{f.label}</p>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{f.tool_id}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Learning Progress */}
            <div>
              <h2 className="font-display text-xl text-foreground border-b border-accent/30 pb-2 mb-4 inline-flex items-center gap-2"><BookOpen className="w-4 h-4 text-gold" /> 学习进度 <span className="text-[10px] font-mono text-muted-foreground/70">({progress.filter(p => p.status === "completed").length}/{progress.length} completed)</span></h2>
              {progress.length === 0 ? (
                <p className="text-sm text-muted-foreground">浏览章节内容时会自动记录阅读与完成状态。</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {progress.map((p, i) => (
                    <span
                      key={i}
                      title={`${p.section_id} / ${p.topic_id}`}
                      className={`text-[10px] font-mono px-2 py-1 border ${p.status === "completed" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-border/40 text-muted-foreground"}`}
                    >
                      {p.topic_id}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="block text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">{label}</span>
    {children}
  </label>
);

export default Account;
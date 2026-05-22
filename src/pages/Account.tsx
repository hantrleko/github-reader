import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import SectionHeader from "@/components/common/SectionHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Globe, Lock, ExternalLink } from "lucide-react";

const Account = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, display_name, bio, is_public")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setUsername(data.username || "");
        setDisplayName(data.display_name || "");
        setBio(data.bio || "");
        setIsPublic(!!data.is_public);
      }
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
      <main className="pt-14">
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
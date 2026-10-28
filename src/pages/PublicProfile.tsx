import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SectionHeader from "@/components/common/SectionHeader";
import { supabase } from "@/integrations/supabase/client";
import { FileText, BookOpen, Award } from "lucide-react";
import Seo from "@/components/Seo";
import { BADGES } from "@/lib/achievements";

type Profile = { id: string; username: string; display_name: string | null; bio: string | null; is_public: boolean; created_at: string };
type Nb = { id: string; title: string; updated_at: string };
type Ach = { slug: string; awarded_at: string };

const PublicProfile = () => {
  const { t } = useTranslation();
  const { username = "" } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notebooks, setNotebooks] = useState<Nb[]>([]);
  const [achs, setAchs] = useState<Ach[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio, is_public, created_at")
        .eq("username", username)
        .eq("is_public", true)
        .maybeSingle();
      if (!p) { setNotFound(true); return; }
      setProfile(p as Profile);
      const [{ data: nbs }, { data: as }] = await Promise.all([
        supabase.from("user_notebooks").select("id,title,updated_at")
          .eq("user_id", p.id).eq("is_public", true).order("updated_at", { ascending: false }).limit(20),
        supabase.from("user_achievements").select("slug,awarded_at").eq("user_id", p.id),
      ]);
      setNotebooks(nbs || []);
      setAchs(as || []);
    })();
  }, [username]);

  return (
    <div className="min-h-screen bg-background">
      {profile && (
        <Seo
          title={`@${profile.username} · EF LAB`}
          description={profile.bio || t("pages.publicProfile.copy1", { defaultValue: "{{value1}} 的公开 Notebook 与徽章。", value1: profile.display_name || profile.username })}
          path={`/u/${profile.username}`}
          type="article"
          jsonLd={{
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            mainEntity: {
              "@type": "Person",
              name: profile.display_name || profile.username,
              alternateName: `@${profile.username}`,
              description: profile.bio || undefined,
            },
          }}
        />
      )}
      <Navbar />
      <main id="main-content" className="pt-14">
        {notFound ? (
          <div className="container max-w-3xl px-6 py-24 text-center">
            <h1 className="font-display text-2xl text-foreground mb-2">{t("pages.publicProfile.copy2", { defaultValue: "用户不存在或未公开" })}</h1>
            <p className="text-sm text-muted-foreground">User not found or profile is private.</p>
            <Link to="/" className="inline-block mt-6 text-gold text-sm">{t("pages.publicProfile.copy3", { defaultValue: "← 返回首页" })}</Link>
          </div>
        ) : profile && (
          <>
            <SectionHeader
              chapter="USER"
              kicker={`@${profile.username}`}
              title={profile.display_name || profile.username}
              subtitle={profile.bio || "—"}
            />
            <section className="container max-w-5xl px-6 pb-16 grid md:grid-cols-3 gap-6">
              {/* Notebooks */}
              <div className="md:col-span-2 border border-border/60 bg-card/30 p-5">
                <p className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-3">
                  <BookOpen className="w-3 h-3" /> Public Notebooks · {notebooks.length}
                </p>
                {notebooks.length === 0 && <p className="text-xs text-muted-foreground">{t("pages.publicProfile.copy4", { defaultValue: "尚未发布公开 Notebook。" })}</p>}
                <ul className="divide-y divide-border/40">
                  {notebooks.map((n) => (
                    <li key={n.id} className="py-2 flex items-center justify-between">
                      <Link to={`/notebook?id=${n.id}`} className="text-sm text-foreground hover:text-gold inline-flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" /> {n.title}
                      </Link>
                      <span className="text-[10px] font-mono text-muted-foreground">{new Date(n.updated_at).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Achievements */}
              <aside className="border border-border/60 bg-card/30 p-5">
                <p className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-3">
                  <Award className="w-3 h-3" /> Badges · {achs.length}
                </p>
                {achs.length === 0 && <p className="text-xs text-muted-foreground">No badges yet.</p>}
                <ul className="space-y-1.5">
                  {achs.map((a) => (
                    <li key={a.slug} className="text-xs font-mono text-foreground/85 flex items-center justify-between gap-2" title={BADGES[a.slug]?.description || a.slug}>
                      <span className="truncate">{BADGES[a.slug]?.emoji ?? "🏅"} {BADGES[a.slug]?.label ?? a.slug}</span>
                      <span className="text-muted-foreground/60 text-[10px] shrink-0">{new Date(a.awarded_at).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[10px] font-mono text-muted-foreground border-t border-accent/20 pt-2">
                  Joined {new Date(profile.created_at).toLocaleDateString()}
                </p>
              </aside>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default PublicProfile;
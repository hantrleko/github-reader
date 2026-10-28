import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/** Badge catalog — slug → display metadata. Update both sides when adding new badges. */
export const BADGES: Record<string, { label: string; emoji: string; description: string }> = {
  "first-notebook":      { emoji: "📓", label: "First Notebook",      description: "保存了你的第一个 Notebook" },
  "notebook-published":  { emoji: "🌐", label: "Notebook Published",  description: "公开发布了一个 Notebook" },
  "notebook-forked":     { emoji: "🍴", label: "Forked a Notebook",   description: "Fork 了一个公开 Notebook" },
  "first-comment":       { emoji: "💬", label: "First Comment",       description: "发表了第一条讨论" },
  "notebook-explorer":   { emoji: "🧭", label: "Notebook Explorer",   description: "保存了 5 个 Notebook" },
  "early-adopter":       { emoji: "⚡", label: "Early Adopter",       description: "EF LAB Beta 期注册用户" },
};

export type BadgeSlug = keyof typeof BADGES;

/**
 * Award a badge to the current user (idempotent — duplicates are ignored).
 * Awarding happens server-side via the `award_badge` function, which verifies
 * the badge was genuinely earned before inserting. Silent on error / when not
 * earned; shows a toast only when a new badge is unlocked.
 */
export async function awardBadge(slug: BadgeSlug | string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Server verifies the badge was earned and de-dupes; returns true only on a
  // brand-new award.
  const { data: awarded, error } = await supabase.rpc("award_badge", { _slug: slug });
  if (error || awarded !== true) return;

  const meta = BADGES[slug];
  toast({
    title: `🏅 解锁徽章：${meta?.label ?? slug}`,
    description: meta?.description ?? "Achievement unlocked",
  });
}

/** Returns true once the user has saved n or more notebooks. */
export async function checkNotebookCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase
    .from("user_notebooks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  return count ?? 0;
}
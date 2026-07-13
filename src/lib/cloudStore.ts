import { supabase } from "@/integrations/supabase/client";
import { reportClientError } from "@/lib/errorReport";

function logDbError(op: string, error: unknown) {
  const msg = (error as { message?: string })?.message ?? String(error);
  reportClientError({ type: "manual", message: `cloudStore ${op}: ${msg}` });
}

/* ------------------------------------------------------------------ */
/*  GitHub: history                                                    */
/* ------------------------------------------------------------------ */
export async function recordGithubVisit(
  userId: string,
  owner: string,
  repo: string,
  branch: string
) {
  const { data: existing, error: selErr } = await supabase
    .from("github_history")
    .select("id, open_count")
    .eq("user_id", userId)
    .eq("owner", owner)
    .eq("repo", repo)
    .eq("branch", branch)
    .maybeSingle();
  if (selErr) logDbError("recordGithubVisit/select", selErr);
  if (existing) {
    const { error } = await supabase
      .from("github_history")
      .update({ open_count: existing.open_count + 1, last_opened_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) logDbError("recordGithubVisit/update", error);
  } else {
    const { error } = await supabase
      .from("github_history")
      .insert({ user_id: userId, owner, repo, branch });
    if (error) logDbError("recordGithubVisit/insert", error);
  }
}

export async function listGithubHistory(userId: string, limit = 20) {
  const { data } = await supabase
    .from("github_history")
    .select("*")
    .eq("user_id", userId)
    .order("last_opened_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function removeGithubHistory(id: string) {
  await supabase.from("github_history").delete().eq("id", id);
}

/* ------------------------------------------------------------------ */
/*  GitHub: starred                                                    */
/* ------------------------------------------------------------------ */
export async function listGithubStars(userId: string) {
  const { data } = await supabase
    .from("github_starred")
    .select("*")
    .eq("user_id", userId)
    .order("starred_at", { ascending: false });
  return data ?? [];
}

export async function isGithubStarred(
  userId: string,
  owner: string,
  repo: string
) {
  const { data } = await supabase
    .from("github_starred")
    .select("id")
    .eq("user_id", userId)
    .eq("owner", owner)
    .eq("repo", repo)
    .maybeSingle();
  return !!data;
}

export async function toggleGithubStar(
  userId: string,
  payload: {
    owner: string;
    repo: string;
    default_branch?: string;
    description?: string;
    stars?: number;
  }
) {
  const { owner, repo } = payload;
  const { data: existing } = await supabase
    .from("github_starred")
    .select("id")
    .eq("user_id", userId)
    .eq("owner", owner)
    .eq("repo", repo)
    .maybeSingle();
  if (existing) {
    await supabase.from("github_starred").delete().eq("id", existing.id);
    return false;
  }
  await supabase.from("github_starred").insert({ user_id: userId, ...payload });
  return true;
}

/* ------------------------------------------------------------------ */
/*  GitHub: file notes                                                 */
/* ------------------------------------------------------------------ */
export type FileNoteKey = {
  owner: string;
  repo: string;
  branch: string;
  path: string;
};

export async function getFileNote(userId: string, k: FileNoteKey) {
  const { data } = await supabase
    .from("github_file_notes")
    .select("*")
    .eq("user_id", userId)
    .eq("owner", k.owner)
    .eq("repo", k.repo)
    .eq("branch", k.branch)
    .eq("path", k.path)
    .maybeSingle();
  return data;
}

export async function saveFileNote(
  userId: string,
  k: FileNoteKey,
  note: string,
  tags: string[]
) {
  // upsert by composite unique key
  const { data } = await supabase
    .from("github_file_notes")
    .upsert(
      { user_id: userId, ...k, note, tags },
      { onConflict: "user_id,owner,repo,branch,path" }
    )
    .select()
    .maybeSingle();
  return data;
}

export async function deleteFileNote(userId: string, k: FileNoteKey) {
  await supabase
    .from("github_file_notes")
    .delete()
    .eq("user_id", userId)
    .eq("owner", k.owner)
    .eq("repo", k.repo)
    .eq("branch", k.branch)
    .eq("path", k.path);
}

export async function listFileNotesForRepo(
  userId: string,
  owner: string,
  repo: string,
  branch: string
) {
  const { data } = await supabase
    .from("github_file_notes")
    .select("path,note,tags,updated_at")
    .eq("user_id", userId)
    .eq("owner", owner)
    .eq("repo", repo)
    .eq("branch", branch);
  return data ?? [];
}

/* ------------------------------------------------------------------ */
/*  Glossary bookmarks                                                 */
/* ------------------------------------------------------------------ */
export async function listGlossaryBookmarks(userId: string) {
  const { data } = await supabase
    .from("glossary_bookmarks")
    .select("slug")
    .eq("user_id", userId);
  return new Set((data ?? []).map((r) => r.slug));
}

export async function toggleGlossaryBookmark(userId: string, slug: string) {
  const { data: existing, error: selErr } = await supabase
    .from("glossary_bookmarks")
    .select("id")
    .eq("user_id", userId)
    .eq("slug", slug)
    .maybeSingle();
  if (selErr) logDbError("toggleGlossaryBookmark/select", selErr);
  if (existing) {
    const { error } = await supabase.from("glossary_bookmarks").delete().eq("id", existing.id);
    if (error) logDbError("toggleGlossaryBookmark/delete", error);
    return false;
  }
  const { error } = await supabase.from("glossary_bookmarks").insert({ user_id: userId, slug });
  if (error) logDbError("toggleGlossaryBookmark/insert", error);
  return true;
}

/* ------------------------------------------------------------------ */
/*  Learning progress                                                  */
/* ------------------------------------------------------------------ */
export async function listLearningProgress(userId: string, topicId = "main") {
  const { data } = await supabase
    .from("learning_progress")
    .select("section_id,status,score,updated_at")
    .eq("user_id", userId)
    .eq("topic_id", topicId);
  return data ?? [];
}

export async function setLearningProgress(
  userId: string,
  topicId: string,
  sectionId: string,
  status: "reading" | "done"
) {
  const { error } = await supabase
    .from("learning_progress")
    .upsert(
      { user_id: userId, topic_id: topicId, section_id: sectionId, status },
      { onConflict: "user_id,topic_id,section_id" }
    );
  if (error) logDbError("setLearningProgress", error);
}

export async function clearLearningProgress(userId: string, topicId = "main") {
  await supabase
    .from("learning_progress")
    .delete()
    .eq("user_id", userId)
    .eq("topic_id", topicId);
}
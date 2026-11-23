// Permanently deletes the signed-in user's account and everything they own.
// Security: JWT validated in code, origin-whitelisted CORS, 5 attempts/hour per user.
// When a new user-owned table is added, add it to USER_TABLES.
import { createClient } from "npm:@supabase/supabase-js@2";
import { adminClient, checkRateLimit, corsHeadersFor, rateLimitResponse } from "../_shared/security.ts";

const USER_TABLES = [
  "calc_favorites",
  "calc_history",
  "discussions",
  "github_file_notes",
  "github_history",
  "github_starred",
  "glossary_bookmarks",
  "learning_progress",
  "notebook_versions",
  "user_achievements",
  "user_notebooks",
  "user_progress",
] as const;

function json(cors: Record<string, string>, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json(cors, { error: "method_not_allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(cors, { error: "unauthorized", code: "auth_required" }, 401);
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await anon.auth.getClaims(authHeader.replace("Bearer ", ""));
    const uid = claims?.claims?.sub as string | undefined;
    if (claimsErr || !uid) return json(cors, { error: "unauthorized", code: "auth_required" }, 401);

    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== "DELETE") return json(cors, { error: "confirmation_required" }, 400);

    const rl = await checkRateLimit(`delete-account:${uid}`, 5, 3600);
    if (!rl.allowed) return rateLimitResponse(cors, rl.retryAfter);

    const admin = adminClient();

    // Comments other people left on this user's notebooks go with the notebooks.
    const { data: nbs } = await admin.from("user_notebooks").select("id").eq("user_id", uid);
    const nbIds = (nbs ?? []).map((n: { id: string }) => n.id);
    if (nbIds.length) {
      const { error } = await admin.from("discussions").delete().eq("resource_type", "notebook").in("resource_id", nbIds);
      if (error) throw new Error(`discussions(notebooks): ${error.message}`);
    }
    for (const table of USER_TABLES) {
      const { error } = await admin.from(table).delete().eq("user_id", uid);
      if (error) throw new Error(`${table}: ${error.message}`);
    }
    const { error: profErr } = await admin.from("profiles").delete().eq("id", uid);
    if (profErr) throw new Error(`profiles: ${profErr.message}`);

    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) throw new Error(`auth: ${delErr.message}`);

    return json(cors, { ok: true });
  } catch (e) {
    console.error("delete-account failed", e);
    return json(cors, { error: "delete_failed" }, 500);
  }
});

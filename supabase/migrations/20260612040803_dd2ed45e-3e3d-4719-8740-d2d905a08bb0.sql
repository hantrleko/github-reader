-- Revoke direct EXECUTE on trigger-only SECURITY DEFINER functions.
-- These run only via triggers and should never be callable directly by clients.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trim_notebook_versions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- award_badge is intentionally an RPC called by authenticated users; it verifies
-- eligibility server-side, so it keeps EXECUTE for authenticated only.
REVOKE EXECUTE ON FUNCTION public.award_badge(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_badge(text) TO authenticated;
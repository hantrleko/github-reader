REVOKE ALL ON FUNCTION public.award_badge(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.award_badge(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.award_badge(text) TO authenticated;
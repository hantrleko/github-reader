-- 1) Tighten read access: only owner or owners with a public profile
DROP POLICY IF EXISTS "ach: select own or others" ON public.user_achievements;
CREATE POLICY "ach: select own or public profile"
ON public.user_achievements
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_achievements.user_id
      AND p.is_public = true
  )
);

-- 2) Remove the ability for users to award themselves arbitrary badges
DROP POLICY IF EXISTS "ach: insert own" ON public.user_achievements;

-- 3) Trusted server-side awarding with earned-condition verification
CREATE OR REPLACE FUNCTION public.award_badge(_slug text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _earned boolean := false;
  _inserted boolean := false;
BEGIN
  IF _uid IS NULL THEN
    RETURN false;
  END IF;

  -- Only known badge slugs are accepted
  IF _slug NOT IN (
    'first-notebook','notebook-published','notebook-forked',
    'first-comment','notebook-explorer','early-adopter'
  ) THEN
    RETURN false;
  END IF;

  -- Verify the badge was genuinely earned (server-side)
  IF _slug = 'first-notebook' THEN
    SELECT EXISTS(SELECT 1 FROM public.user_notebooks WHERE user_id = _uid) INTO _earned;
  ELSIF _slug = 'notebook-explorer' THEN
    SELECT (COUNT(*) >= 5) INTO _earned FROM public.user_notebooks WHERE user_id = _uid;
  ELSIF _slug = 'notebook-published' THEN
    SELECT EXISTS(SELECT 1 FROM public.user_notebooks WHERE user_id = _uid AND is_public = true) INTO _earned;
  ELSIF _slug = 'notebook-forked' THEN
    SELECT EXISTS(SELECT 1 FROM public.user_notebooks WHERE user_id = _uid AND forked_from IS NOT NULL) INTO _earned;
  ELSIF _slug = 'first-comment' THEN
    SELECT EXISTS(SELECT 1 FROM public.discussions WHERE user_id = _uid) INTO _earned;
  ELSIF _slug = 'early-adopter' THEN
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = _uid AND created_at < '2026-12-31') INTO _earned;
  END IF;

  IF NOT _earned THEN
    RETURN false;
  END IF;

  WITH ins AS (
    INSERT INTO public.user_achievements (user_id, slug)
    SELECT _uid, _slug
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_achievements WHERE user_id = _uid AND slug = _slug
    )
    RETURNING 1
  )
  SELECT EXISTS(SELECT 1 FROM ins) INTO _inserted;

  RETURN _inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_badge(text) TO authenticated;
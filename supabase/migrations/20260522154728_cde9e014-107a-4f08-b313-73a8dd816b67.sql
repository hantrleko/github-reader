
-- 1) profiles 升级
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text UNIQUE,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Replace restrictive SELECT policy with public-aware one
DROP POLICY IF EXISTS "Profiles: select own" ON public.profiles;
CREATE POLICY "profiles: select own or public"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR is_public = true);

-- 2) discussions
CREATE TABLE public.discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resource_type text NOT NULL,          -- 'notebook' | 'strategy' | 'paper' | 'tool'
  resource_id text NOT NULL,
  body text NOT NULL,
  parent_id uuid REFERENCES public.discussions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read discussions — public discourse.
CREATE POLICY "disc: select all" ON public.discussions FOR SELECT USING (true);
CREATE POLICY "disc: insert own" ON public.discussions
  FOR INSERT WITH CHECK (auth.uid() = user_id AND length(body) BETWEEN 1 AND 4000);
CREATE POLICY "disc: update own" ON public.discussions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "disc: delete own" ON public.discussions
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_discussions_updated
  BEFORE UPDATE ON public.discussions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_discussions_resource ON public.discussions(resource_type, resource_id, created_at DESC);
CREATE INDEX idx_discussions_user ON public.discussions(user_id, created_at DESC);

-- 3) user achievements
CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  slug text NOT NULL,                   -- e.g. 'first-notebook', 'topic-options-complete'
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ach: select own or others" ON public.user_achievements FOR SELECT USING (true);
CREATE POLICY "ach: insert own" ON public.user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ach: delete own" ON public.user_achievements
  FOR DELETE USING (auth.uid() = user_id);

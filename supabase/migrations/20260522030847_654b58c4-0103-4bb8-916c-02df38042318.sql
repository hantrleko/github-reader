
-- ============================================================
-- Shared updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- profiles
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles: select own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profiles: insert own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles: update own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Profiles: delete own" ON public.profiles FOR DELETE USING (auth.uid() = id);

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- github_history
-- ============================================================
CREATE TABLE public.github_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  branch TEXT NOT NULL,
  last_opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  open_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, owner, repo, branch)
);
ALTER TABLE public.github_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gh_history: select own" ON public.github_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "gh_history: insert own" ON public.github_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gh_history: update own" ON public.github_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "gh_history: delete own" ON public.github_history FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER github_history_updated_at BEFORE UPDATE ON public.github_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_gh_history_user_recent ON public.github_history(user_id, last_opened_at DESC);

-- ============================================================
-- github_starred
-- ============================================================
CREATE TABLE public.github_starred (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  default_branch TEXT,
  description TEXT,
  stars INTEGER,
  starred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, owner, repo)
);
ALTER TABLE public.github_starred ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gh_star: select own" ON public.github_starred FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "gh_star: insert own" ON public.github_starred FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gh_star: update own" ON public.github_starred FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "gh_star: delete own" ON public.github_starred FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER github_starred_updated_at BEFORE UPDATE ON public.github_starred
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- github_file_notes
-- ============================================================
CREATE TABLE public.github_file_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  branch TEXT NOT NULL,
  path TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, owner, repo, branch, path)
);
ALTER TABLE public.github_file_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gh_note: select own" ON public.github_file_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "gh_note: insert own" ON public.github_file_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gh_note: update own" ON public.github_file_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "gh_note: delete own" ON public.github_file_notes FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER github_file_notes_updated_at BEFORE UPDATE ON public.github_file_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- calc_history
-- ============================================================
CREATE TABLE public.calc_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL,
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  outputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.calc_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calc_h: select own" ON public.calc_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "calc_h: insert own" ON public.calc_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "calc_h: update own" ON public.calc_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "calc_h: delete own" ON public.calc_history FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_calc_history_user_tool ON public.calc_history(user_id, tool_id, created_at DESC);

-- ============================================================
-- calc_favorites
-- ============================================================
CREATE TABLE public.calc_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL,
  label TEXT NOT NULL,
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tool_id, label)
);
ALTER TABLE public.calc_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calc_fav: select own" ON public.calc_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "calc_fav: insert own" ON public.calc_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "calc_fav: update own" ON public.calc_favorites FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "calc_fav: delete own" ON public.calc_favorites FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER calc_favorites_updated_at BEFORE UPDATE ON public.calc_favorites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- glossary_bookmarks
-- ============================================================
CREATE TABLE public.glossary_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);
ALTER TABLE public.glossary_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gl_bm: select own" ON public.glossary_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "gl_bm: insert own" ON public.glossary_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gl_bm: delete own" ON public.glossary_bookmarks FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- learning_progress
-- ============================================================
CREATE TABLE public.learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'reading' CHECK (status IN ('reading', 'done')),
  score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_id, section_id)
);
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lp: select own" ON public.learning_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "lp: insert own" ON public.learning_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lp: update own" ON public.learning_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "lp: delete own" ON public.learning_progress FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER learning_progress_updated_at BEFORE UPDATE ON public.learning_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

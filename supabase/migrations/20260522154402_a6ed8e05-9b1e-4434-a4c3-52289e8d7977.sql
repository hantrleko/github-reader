
CREATE TABLE public.user_notebooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Untitled Notebook',
  cells jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_public boolean NOT NULL DEFAULT false,
  forked_from uuid REFERENCES public.user_notebooks(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nb: select own or public" ON public.user_notebooks
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "nb: insert own" ON public.user_notebooks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nb: update own" ON public.user_notebooks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "nb: delete own" ON public.user_notebooks
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_user_notebooks_updated
  BEFORE UPDATE ON public.user_notebooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_user_notebooks_user ON public.user_notebooks(user_id, updated_at DESC);
CREATE INDEX idx_user_notebooks_public ON public.user_notebooks(is_public, updated_at DESC) WHERE is_public = true;

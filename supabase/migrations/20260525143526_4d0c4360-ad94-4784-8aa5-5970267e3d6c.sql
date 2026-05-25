
CREATE TABLE public.notebook_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notebook_id uuid NOT NULL REFERENCES public.user_notebooks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  cells jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notebook_versions_notebook ON public.notebook_versions(notebook_id, created_at DESC);

ALTER TABLE public.notebook_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nbv: select own"
  ON public.notebook_versions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "nbv: insert own"
  ON public.notebook_versions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "nbv: delete own"
  ON public.notebook_versions FOR DELETE
  USING (auth.uid() = user_id);

-- Keep only the most recent 20 versions per notebook
CREATE OR REPLACE FUNCTION public.trim_notebook_versions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notebook_versions
  WHERE notebook_id = NEW.notebook_id
    AND id NOT IN (
      SELECT id FROM public.notebook_versions
      WHERE notebook_id = NEW.notebook_id
      ORDER BY created_at DESC
      LIMIT 20
    );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_trim_notebook_versions
AFTER INSERT ON public.notebook_versions
FOR EACH ROW EXECUTE FUNCTION public.trim_notebook_versions();

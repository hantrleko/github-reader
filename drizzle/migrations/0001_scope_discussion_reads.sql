DROP POLICY IF EXISTS "disc: select all" ON public.discussions;

CREATE POLICY "disc: select visible" ON public.discussions
FOR SELECT
USING (
  auth.uid() = user_id
  OR resource_type IN ('tool', 'paper', 'strategy')
  OR (
    resource_type = 'notebook'
    AND EXISTS (
      SELECT 1 FROM public.user_notebooks n
      WHERE n.id::text = discussions.resource_id
    )
  )
);

GRANT SELECT ON public.discussions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discussions TO authenticated;
GRANT ALL ON public.discussions TO service_role;
CREATE TABLE public.rate_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  count int NOT NULL DEFAULT 0
);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.edge_cache (
  key text PRIMARY KEY,
  payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL
);
GRANT ALL ON public.edge_cache TO service_role;
ALTER TABLE public.edge_cache ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_limit int, p_window_sec int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
  v_count int;
  v_now timestamptz := now();
BEGIN
  INSERT INTO rate_limits(key, window_start, count) VALUES (p_key, v_now, 0)
  ON CONFLICT (key) DO NOTHING;
  SELECT window_start, count INTO v_start, v_count FROM rate_limits WHERE key = p_key FOR UPDATE;
  IF v_now - v_start > make_interval(secs => p_window_sec) THEN
    UPDATE rate_limits SET window_start = v_now, count = 1 WHERE key = p_key;
    RETURN jsonb_build_object('allowed', true, 'retry_after', 0);
  END IF;
  IF v_count >= p_limit THEN
    RETURN jsonb_build_object('allowed', false, 'retry_after', greatest(1, extract(epoch from (v_start + make_interval(secs => p_window_sec) - v_now))::int));
  END IF;
  UPDATE rate_limits SET count = count + 1 WHERE key = p_key;
  RETURN jsonb_build_object('allowed', true, 'retry_after', 0);
END;
$$;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, int, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, int, int) TO service_role;
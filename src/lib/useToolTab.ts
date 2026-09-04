/**
 * Keep a lab's active sub-tool in the URL (`?t=<toolId>`) so catalog cards and
 * shared links can deep-link straight to a specific tool tab.
 *
 * Falls back to `fallback` when the param is missing or not a known id, and
 * updates the URL with `replace` so tab switching does not pollute history.
 */
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export function useToolTab<T extends string>(
  valid: readonly T[],
  fallback: T,
  param = "t"
): [T, (next: T) => void] {
  const [search, setSearch] = useSearchParams();
  const fromUrl = search.get(param) as T | null;
  const [tab, setTabState] = useState<T>(
    fromUrl && valid.includes(fromUrl) ? fromUrl : fallback
  );

  // React to back/forward navigation or external links changing the param.
  useEffect(() => {
    if (fromUrl && valid.includes(fromUrl) && fromUrl !== tab) setTabState(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromUrl]);

  const setTab = useCallback(
    (next: T) => {
      setTabState(next);
      const params = new URLSearchParams(search);
      params.set(param, next);
      setSearch(params, { replace: true });
    },
    [search, setSearch, param]
  );

  return [tab, setTab];
}

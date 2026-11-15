import { createElement, lazy, type ComponentProps, type ComponentType, type LazyExoticComponent } from "react";

/**
 * Lazy components that can be retried.
 *
 * React.lazy remembers a rejected import forever, so an error boundary's
 * "Retry" would just re-throw the same error. Each retryable lazy keeps a
 * replaceable inner React.lazy; resetFailedLazies() swaps in a fresh one for
 * every import that failed, so the next render downloads the chunk again.
 * Nothing retries on its own — only a visitor's click calls the reset.
 */

export type LoadErrorKind = "offline" | "chunk" | "other";

export const CHUNK_ERR_RE =
  /error loading dynamically imported module|dynamically imported module|Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk [\w-]+ failed|Unable to preload CSS/i;

export function classifyLoadError(err: unknown, online: boolean): LoadErrorKind {
  const msg = String((err as { message?: string })?.message ?? err ?? "");
  const isChunk = CHUNK_ERR_RE.test(msg) || (err as { name?: string })?.name === "ChunkLoadError";
  if (!online) return isChunk || /fetch|network/i.test(msg) ? "offline" : "other";
  return isChunk ? "chunk" : "other";
}

interface Entry {
  failed: boolean;
  reset: () => void;
}
const registry = new Set<Entry>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function retryableLazy<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  onError?: (err: unknown) => void,
): ComponentType<ComponentProps<T>> {
  const entry: Entry = { failed: false, reset: () => {} };
  const make = (): LazyExoticComponent<T> =>
    lazy(() =>
      factory().catch((err) => {
        entry.failed = true;
        onError?.(err);
        throw err;
      }),
    );
  let current = make();
  entry.reset = () => {
    entry.failed = false;
    current = make();
  };
  registry.add(entry);
  const Retryable = (props: ComponentProps<T>) => createElement(current, props);
  return Retryable as ComponentType<ComponentProps<T>>;
}

/** Re-arm every lazy import that failed. Returns how many were reset. */
export function resetFailedLazies(): number {
  let n = 0;
  registry.forEach((e) => {
    if (e.failed) {
      e.reset();
      n++;
    }
  });
  return n;
}

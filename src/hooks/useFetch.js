import { useCallback, useEffect, useState } from "react";

/**
 * Shared in-memory query cache keyed by dependency hash or explicit cacheKey.
 * Prevents flashing loaders and redundant network roundtrips on tab switching.
 */
const globalCache = new Map();

/**
 * Universal async data-fetching hook with caching, status state machine,
 * and safe default fallbacks.
 *
 * @template T
 * @param {() => Promise<T>} fetcher Async fetch function returning payload
 * @param {Array} [deps=[]] React dependency array triggering re-fetch on change
 * @param {(data: T) => boolean} [emptyCheck=() => false] Custom predicate for empty state
 * @param {string|null} [cacheKey=null] Optional explicit cache key override
 * @param {T|null} [initialData=null] Safe fallback schema to prevent undefined evaluations
 * @returns {{
 *   data: T,
 *   status: "loading" | "success" | "empty" | "error",
 *   error: Error | null,
 *   reload: (forceSilent?: boolean) => Promise<void>
 * }}
 */
export function useFetch(
  fetcher,
  deps = [],
  emptyCheck = () => false,
  cacheKey = null,
  initialData = null
) {
  const key = cacheKey || JSON.stringify(deps);

  const [data, setData] = useState(() => globalCache.get(key) || initialData);
  const [status, setStatus] = useState(() => {
    if (globalCache.has(key)) {
      const cached = globalCache.get(key);
      return emptyCheck(cached) ? "empty" : "success";
    }
    return "loading";
  });
  const [error, setError] = useState(null);

  /**
   * Execute fetch operation and synchronize memory cache.
   * @param {boolean} [forceSilent=false] If true, omits setting loading status
   */
  const load = useCallback(
    async (forceSilent = false) => {
      if (!globalCache.has(key) && !forceSilent) {
        setStatus("loading");
      }
      setError(null);
      try {
        const result = await fetcher();
        globalCache.set(key, result);
        setData(result);
        setStatus(emptyCheck(result) ? "empty" : "success");
      } catch (err) {
        setError(err);
        if (!globalCache.has(key)) {
          setStatus("error");
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );

  useEffect(() => {
    load();
  }, [load]);

  return { data, status, error, reload: () => load(true) };
}

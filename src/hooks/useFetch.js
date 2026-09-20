import { useCallback, useEffect, useState } from "react";

const globalCache = new Map();

/**
 * Generic loading/success/error/empty wrapper around any async fetcher.
 * `emptyCheck` decides whether a successful-but-empty result should render
 * the empty state instead of the data state.
 */
export function useFetch(fetcher, deps = [], emptyCheck = () => false, cacheKey = null, initialData = null) {
  const key = cacheKey || JSON.stringify(deps);
  
  const [data, setData] = useState(globalCache.get(key) || initialData);
  const [status, setStatus] = useState(globalCache.has(key) ? (emptyCheck(globalCache.get(key)) ? "empty" : "success") : "loading");
  const [error, setError] = useState(null);

  const load = useCallback(async (forceSilent = false) => {
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
      if (!globalCache.has(key)) setStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, status, error, reload: () => load(true) };
}

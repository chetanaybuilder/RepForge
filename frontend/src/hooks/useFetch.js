/**
 * frontend\src\hooks\useFetch.js
 * Implements this RepForge module's single responsibility while preserving its existing public behavior.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_CACHE_SIZE = 50;
const CACHE_TTL_MS = 5 * 60 * 1000;
const globalCache = new Map();

function getCachedValue(key) {
  const entry = globalCache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    globalCache.delete(key);
    return undefined;
  }
  globalCache.delete(key);
  globalCache.set(key, entry);
  return entry.value;
}

function setBoundedCache(key, value) {
  if (globalCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = globalCache.keys().next().value;
    if (oldestKey) globalCache.delete(oldestKey);
  }
  globalCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function clearFetchCache() {
  globalCache.clear();
}

export function useFetch(
  fetcher,
  deps = [],
  emptyCheck = () => false,
  cacheKey = null,
  initialData = null
) {
  const key = cacheKey || JSON.stringify(deps);
  const requestId = useRef(0);
  const mounted = useRef(true);

  const [data, setData] = useState(() => {
    const cached = getCachedValue(key);
    return cached !== undefined ? cached : initialData;
  });
  const [status, setStatus] = useState(() => {
    const cached = getCachedValue(key);
    if (cached === undefined) return "loading";
    return emptyCheck(cached) ? "empty" : "success";
  });
  const [error, setError] = useState(null);

  // fetcher/emptyCheck are supplied by the caller alongside cacheKey/key.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(
    async (forceSilent = false) => {
      forceSilent = forceSilent === true;
      const id = ++requestId.current;
      const cached = getCachedValue(key);
      if (cached === undefined && !forceSilent) setStatus("loading");
      setError(null);

      try {
        const result = await fetcher();
        if (!mounted.current || id !== requestId.current) return;
        setBoundedCache(key, result);
        setData(result);
        setStatus(emptyCheck(result) ? "empty" : "success");
      } catch (err) {
        if (!mounted.current || id !== requestId.current) return;
        setError(err);
        if (getCachedValue(key) === undefined) setStatus("error");
      }
    },
    // Keep dependencies tied to the cache key; fetcher and emptyCheck are caller-selected for that key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  ); // fetcher is intentionally selected by the caller's cache/dependency key.

  useEffect(() => {
    mounted.current = true;
    const cached = getCachedValue(key);
    setData(cached !== undefined ? cached : initialData);
    setStatus(cached !== undefined ? (emptyCheck(cached) ? "empty" : "success") : "loading");
    setError(null);
    load();
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      requestId.current++;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () => () => {
      mounted.current = false;
      requestId.current++;
    },
    []
  );

  return { data, status, error, reload: load };
}

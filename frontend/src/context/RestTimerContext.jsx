/**
 * frontend\src\context\RestTimerContext.jsx
 * Implements this RepForge module's single responsibility while preserving its existing public behavior.
 */

import { createContext, useContext, useState, useCallback, useRef, useMemo } from "react";

const RestTimerContext = createContext(null);

/**
 * Guarantees only one RestTimer is visible at a time across the whole app
 * (modal timers in DayFormModal/ExerciseEditModal and the global AppShell timer).
 */
export function RestTimerProvider({ children }) {
  const [activeKey, setActiveKey] = useState(null);
  const activeRef = useRef(null);

  const acquire = useCallback((key) => {
    activeRef.current = key;
    setActiveKey(key);
    return true;
  }, []);

  const release = useCallback((key) => {
    if (activeRef.current === key) {
      activeRef.current = null;
      setActiveKey((current) => (current === key ? null : current));
    }
  }, []);

  const value = useMemo(() => ({ activeKey, acquire, release }), [activeKey, acquire, release]);

  return <RestTimerContext.Provider value={value}>{children}</RestTimerContext.Provider>;
}

export function useRestTimer() {
  const ctx = useContext(RestTimerContext);
  if (!ctx) throw new Error("useRestTimer must be used within a RestTimerProvider");
  return ctx;
}

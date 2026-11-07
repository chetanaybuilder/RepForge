/**
 * frontend\src\context\ToastContext.jsx
 * Implements this RepForge module's single responsibility while preserving its existing public behavior.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";

const ToastContext = createContext(null);
let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  useEffect(
    () => () => {
      Object.values(timers.current).forEach((timer) => clearTimeout(timer));
      timers.current = {};
    },
    []
  );

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback(
    (message, { type = "info", duration = 4500 } = {}) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      push,
      dismiss,
      success: (msg, opts) => push(msg, { ...opts, type: "success" }),
      error: (msg, opts) => push(msg, { ...opts, type: "error" }),
      info: (msg, opts) => push(msg, { ...opts, type: "info" }),
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div className="rf-toast-stack">
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`rf-toast rf-toast--${t.type}`}
                role={t.type === "error" ? "alert" : "status"}
                aria-live={t.type === "error" ? "assertive" : "polite"}
              >
                <span style={{ flex: 1 }}>{t.message}</span>
                <button
                  type="button"
                  aria-label="Dismiss notification"
                  onClick={() => dismiss(t.id)}
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--rf-text-faint)",
                    marginLeft: 8,
                    opacity: 0.7,
                    border: 0,
                    background: "transparent",
                  }}
                >
                  ✕
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

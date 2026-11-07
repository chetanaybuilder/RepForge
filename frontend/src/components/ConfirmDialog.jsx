/**
 * frontend\src\components\ConfirmDialog.jsx
 * Implements this RepForge module's single responsibility while preserving its existing public behavior.
 */

import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { PrimaryButton } from "./PrimaryButton";
import { useModalBodyLock } from "../hooks/useModalBodyLock";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
  danger = true,
}) {
  useModalBodyLock(open);
  const cancelRef = useRef(null);
  const confirmingRef = useRef(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) {
      confirmingRef.current = false;
      setConfirming(false);
      return undefined;
    }
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    cancelRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <div className="rf-modal-overlay" onClick={onCancel}>
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="rf-modal rf-modal--sm"
          onClick={(e) => e.stopPropagation()}
          role="alertdialog"
          aria-modal="true"
        >
          <div className="rf-confirm-dialog">
            <div className="rf-confirm-icon">{danger ? "⚠" : "◈"}</div>
            <h3 className="rf-modal-title" style={{ fontSize: "1.25rem" }}>
              {title}
            </h3>
            {message && (
              <p style={{ color: "var(--rf-text-sub)", fontSize: "0.9rem", lineHeight: 1.5 }}>
                {message}
              </p>
            )}
            <div style={{ display: "flex", gap: 12, width: "100%", marginTop: 8 }}>
              <button
                type="button"
                className="rf-btn rf-btn--ghost"
                style={{ flex: 1 }}
                onClick={onCancel}
                ref={cancelRef}
              >
                Cancel
              </button>
              <PrimaryButton
                variant={danger ? "danger" : "cyan"}
                style={{ flex: 1 }}
                disabled={confirming}
                onClick={() => {
                  if (confirmingRef.current) return;
                  confirmingRef.current = true;
                  setConfirming(true);
                  Promise.resolve(onConfirm()).finally(() => {
                    confirmingRef.current = false;
                    setConfirming(false);
                  });
                }}
              >
                {confirmLabel}
              </PrimaryButton>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

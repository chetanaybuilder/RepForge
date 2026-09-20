import { motion, AnimatePresence } from "framer-motion";
import { PrimaryButton } from "./PrimaryButton";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
  danger = true,
}) {
  if (!open) return null;

  return (
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
            <div className="rf-confirm-icon">
              {danger ? "⚠" : "◈"}
            </div>
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
              >
                Cancel
              </button>
              <PrimaryButton
                variant={danger ? "danger" : "cyan"}
                style={{ flex: 1 }}
                onClick={onConfirm}
              >
                {confirmLabel}
              </PrimaryButton>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Delete", onConfirm, onCancel, danger = true }) {
  if (!open) return null;
  return (
    <div className="rf-modal-overlay" onClick={onCancel}>
      <div className="rf-modal rf-modal--sm" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
        <h3>{title}</h3>
        <p className="rf-modal-message">{message}</p>
        <div className="rf-modal-actions">
          <button className="rf-btn rf-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className={`rf-btn ${danger ? "rf-btn--danger" : "rf-btn--primary"}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

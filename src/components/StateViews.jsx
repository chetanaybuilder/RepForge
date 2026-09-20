export function LoadingState({ label = "Loading…" }) {
  return (
    <div className="rf-state rf-state--loading">
      <div className="rf-spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({ message = "Something went wrong.", onRetry }) {
  return (
    <div className="rf-state rf-state--error">
      <div className="rf-state-icon">!</div>
      <p>{message}</p>
      {onRetry && (
        <button className="rf-btn rf-btn--ghost" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="rf-state rf-state--empty">
      <div className="rf-state-icon">○</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

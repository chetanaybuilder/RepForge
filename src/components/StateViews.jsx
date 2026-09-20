import { PrimaryButton } from "./PrimaryButton";

export function LoadingState({ label = "Synthesizing biometric telemetry…" }) {
  return (
    <div className="rf-state">
      <div className="rf-state-radar" aria-hidden="true" />
      <div className="rf-telemetry-tag" style={{ marginBottom: 8 }}>
        ANALYZING TELEMETRY
      </div>
      <p style={{ color: "var(--rf-text-sub)", fontSize: "0.9rem" }}>{label}</p>
    </div>
  );
}

export function ErrorState({ message = "Neural subsystem synchronization error.", onRetry }) {
  return (
    <div className="rf-state rf-state--error">
      <div className="rf-state-glyph rf-state-glyph--error">⚠</div>
      <h3 className="rf-state-title" style={{ color: "var(--rf-ember)" }}>
        Telemetry Interruption
      </h3>
      <p className="rf-state-desc">{message}</p>
      {onRetry && (
        <PrimaryButton variant="ghost" onClick={onRetry}>
          Re-establish Connection
        </PrimaryButton>
      )}
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="rf-state">
      <div className="rf-state-glyph">◈</div>
      <h3 className="rf-state-title">{title}</h3>
      {description && <p className="rf-state-desc">{description}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

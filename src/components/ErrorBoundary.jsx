import { ErrorBoundary } from "react-error-boundary";
import { PrimaryButton } from "./PrimaryButton";

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div
      style={{
        minHeight: "65vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        padding: "32px 20px",
        textAlign: "center",
      }}
    >
      <div className="rf-confirm-icon" style={{ fontSize: "1.6rem" }}>
        ⚠
      </div>
      <div className="rf-telemetry-tag" style={{ color: "var(--rf-ember)" }}>
        SUBSYSTEM EXCEPTION DETECTED
      </div>
      <h2 style={{ margin: 0, color: "var(--rf-text-pure)", fontSize: "1.6rem" }}>
        Neural Anomaly Interruption
      </h2>
      <p style={{ color: "var(--rf-text-sub)", maxWidth: "460px", lineHeight: 1.6, fontSize: "0.9rem" }}>
        An unexpected execution exception occurred in the presentation layer. Telemetry state has been recorded for diagnostics.
      </p>

      <details
        style={{
          color: "var(--rf-text-sub)",
          fontSize: "0.82rem",
          maxWidth: "600px",
          width: "100%",
          textAlign: "left",
          background: "rgba(10,10,20,0.8)",
          padding: "16px",
          borderRadius: "var(--rf-radius-md)",
          border: "1px solid rgba(255,51,102,0.3)",
          marginTop: 10,
        }}
      >
        <summary
          style={{
            cursor: "pointer",
            marginBottom: "10px",
            fontWeight: 700,
            color: "var(--rf-ember)",
            fontFamily: "var(--rf-font-mono)",
          }}
        >
          ► Expand Crash Stack Trace
        </summary>
        <div
          style={{
            color: "var(--rf-ember)",
            fontWeight: 600,
            fontFamily: "var(--rf-font-mono)",
            marginBottom: "8px",
            wordBreak: "break-word",
          }}
        >
          {error?.message || String(error) || "Unidentified anomaly"}
        </div>
        {error?.stack && (
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              margin: 0,
              fontSize: "0.75rem",
              color: "var(--rf-text-faint)",
              maxHeight: "180px",
              overflowY: "auto",
              padding: "10px",
              background: "rgba(0,0,0,0.5)",
              borderRadius: "6px",
              fontFamily: "var(--rf-font-mono)",
            }}
          >
            {error.stack}
          </pre>
        )}
      </details>

      <div style={{ display: "flex", gap: "12px", marginTop: "14px" }}>
        <PrimaryButton onClick={resetErrorBoundary}>
          Re-initialize Subsystem
        </PrimaryButton>
        <button
          className="rf-btn rf-btn--ghost"
          onClick={() => {
            window.location.href = "/";
          }}
        >
          Return to Deck
        </button>
      </div>
    </div>
  );
}

function logErrorToConsole(error, info) {
  console.error("[RepForge 2040 ErrorBoundary] Caught rendering error:", error);
  console.error("[RepForge 2040 ErrorBoundary] Component stack:", info?.componentStack);
}

export function AppErrorBoundary({ children }) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={logErrorToConsole}
      onReset={() => {
        window.location.reload();
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export function PageErrorBoundary({ children }) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={logErrorToConsole}
      onReset={() => {
        // Re-render children
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

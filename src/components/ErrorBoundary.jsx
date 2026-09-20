import { ErrorBoundary } from "react-error-boundary";
import { PrimaryButton } from "./PrimaryButton";

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="rf-state rf-state--error" style={{
      minHeight: "60vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "16px",
      padding: "32px",
      textAlign: "center",
    }}>
      <div className="rf-state-icon" style={{ fontSize: "2.4rem" }}>⚠</div>
      <h2 style={{ margin: 0, color: "var(--rf-text, #fff)", fontSize: "1.6rem" }}>Something went wrong</h2>
      <p style={{ color: "var(--rf-text-dim, #9c99ab)", maxWidth: "460px", lineHeight: 1.5 }}>
        An unexpected error occurred. This has been logged for debugging.
      </p>

      <details open style={{
        color: "var(--rf-text-dim, #9c99ab)",
        fontSize: "0.85rem",
        maxWidth: "600px",
        width: "100%",
        textAlign: "left",
        background: "rgba(0,0,0,0.4)",
        padding: "16px",
        borderRadius: "10px",
        border: "1px solid rgba(249,87,93,0.3)",
      }}>
        <summary style={{ cursor: "pointer", marginBottom: "10px", fontWeight: 600, color: "var(--rf-danger, #f9575d)" }}>
          Error details
        </summary>
        <div style={{
          color: "var(--rf-danger, #f9575d)",
          fontWeight: 600,
          fontFamily: "monospace",
          marginBottom: "8px",
          wordBreak: "break-word",
        }}>
          {error?.message || String(error) || "Unknown error"}
        </div>
        {error?.stack && (
          <pre style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            margin: 0,
            fontSize: "0.75rem",
            color: "var(--rf-text-faint, #6b6878)",
            maxHeight: "180px",
            overflowY: "auto",
            padding: "8px",
            background: "rgba(0,0,0,0.3)",
            borderRadius: "6px",
          }}>
            {error.stack}
          </pre>
        )}
      </details>

      <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
        <PrimaryButton onClick={resetErrorBoundary}>Try again</PrimaryButton>
        <button
          className="rf-btn rf-btn--ghost"
          onClick={() => {
            window.location.href = "/";
          }}
        >
          Return Home
        </button>
      </div>
    </div>
  );
}

function logErrorToConsole(error, info) {
  console.error("[RepForge ErrorBoundary] Caught rendering error:", error);
  console.error("[RepForge ErrorBoundary] Component stack:", info?.componentStack);
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

/**
 * Page-level error boundary — wraps individual pages so a crash
 * in one page doesn't take down the whole app shell.
 */
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

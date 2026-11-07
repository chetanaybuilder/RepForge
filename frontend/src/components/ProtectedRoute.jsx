/**
 * frontend\src\components\ProtectedRoute.jsx
 * Implements this RepForge module's single responsibility while preserving its existing public behavior.
 */

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoadingState, ErrorState } from "./StateViews";

export function ProtectedRoute({ children }) {
  const { status, refresh } = useAuth();
  const location = useLocation();

  if (status === "checking") {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--rf-void)",
        }}
      >
        <LoadingState label="Verifying your session…" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
    );
  }

  if (status === "error") {
    return (
      <div
        style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <ErrorState message="Can't reach RepForge right now." onRetry={refresh} />
      </div>
    );
  }

  return children;
}

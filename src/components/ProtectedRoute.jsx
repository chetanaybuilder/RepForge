import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoadingState } from "./StateViews";

export function ProtectedRoute({ children }) {
  const { status } = useAuth();

  if (status === "checking") {
    return (
      <div className="rf-full-page-loading">
        <LoadingState label="Restoring your session…" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  return children;
}

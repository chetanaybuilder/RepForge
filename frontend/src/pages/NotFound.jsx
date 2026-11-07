/**
 * frontend\src\pages\NotFound.jsx
 * Implements this RepForge module's single responsibility while preserving its existing public behavior.
 */

import { useNavigate } from "react-router-dom";
import { PrimaryButton } from "../components/PrimaryButton";

export function NotFound() {
  const navigate = useNavigate();
  return (
    <div
      style={{
        minHeight: "75vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 24,
      }}
    >
      <div className="rf-telemetry-tag" style={{ color: "var(--rf-ember)", marginBottom: 12 }}>
        COORDINATES UNRESOLVED · ERROR 404
      </div>
      <h1
        className="rf-gradient-text-ember"
        style={{
          fontSize: "clamp(3.5rem, 3rem + 3vw, 5.5rem)",
          fontWeight: 800,
          margin: 0,
          lineHeight: 1,
        }}
      >
        404
      </h1>
      <p style={{ color: "var(--rf-text-sub)", maxWidth: 420, margin: "16px 0 28px" }}>
        The telemetry sector you are attempting to query does not exist in the neural registry.
      </p>
      <PrimaryButton className="rf-btn--sm" onClick={() => navigate("/dashboard")}>
        Return to Command Deck →
      </PrimaryButton>
    </div>
  );
}

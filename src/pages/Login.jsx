import { useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { motion } from "framer-motion";

const ERROR_MESSAGES = {
  access_denied: "Authentication request cancelled by user.",
  invalid_state: "Security handshake expired. Please re-authenticate.",
  missing_code: "OAuth provider response incomplete.",
  auth_failed: "Biometric identity verification unsuccessful.",
};

export function Login() {
  const { loginWithGoogle, status } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const toast = useToast();

  useEffect(() => {
    if (status === "authenticated") navigate("/dashboard", { replace: true });
  }, [status, navigate]);

  useEffect(() => {
    const error = params.get("error");
    if (error) {
      toast.error(ERROR_MESSAGES[error] || "Authentication handshake error.");
    }
  }, [params, toast]);

  return (
    <div className="rf-auth-page">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="rf-auth-card"
      >
        <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div className="rf-brand-glyph" style={{ width: 38, height: 38, fontSize: "1rem" }}>
            RF
          </div>
          <span className="rf-brand-text" style={{ fontSize: "1.3rem" }}>
            RepForge
          </span>
        </Link>

        <div className="rf-telemetry-tag" style={{ marginBottom: 8, justifyContent: "center" }}>
          BIOMETRIC AUTHENTICATION TERMINAL
        </div>

        <h1 style={{ fontSize: "1.6rem", marginBottom: 8, color: "var(--rf-text-pure)" }}>
          Access Your Telemetry
        </h1>
        <p style={{ color: "var(--rf-text-sub)", fontSize: "0.88rem", marginBottom: 24 }}>
          Connect securely via Google to synchronize your workout logs, PR milestones, and AI models.
        </p>

        <button
          type="button"
          className="rf-google-btn"
          onClick={loginWithGoogle}
        >
          <GoogleIcon />
          <span>Authenticate with Google</span>
        </button>

        <div
          style={{
            marginTop: 28,
            paddingTop: 18,
            borderTop: "1px solid var(--rf-border-subtle)",
            fontSize: "0.74rem",
            color: "var(--rf-text-faint)",
            lineHeight: 1.5,
          }}
        >
          RepForge utilizes verified OAuth identity protocols. Your credentials and training logs are encrypted in isolation.
        </div>
      </motion.div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.09-1.8 2.73v2.27h2.92c1.7-1.57 2.68-3.88 2.68-6.64z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.27c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33C2.44 15.98 5.48 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.7c-.18-.54-.28-1.11-.28-1.7s.1-1.16.28-1.7V4.97H.96C.35 6.17 0 7.55 0 9s.35 2.83.96 4.03l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.97l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

import { useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const ERROR_MESSAGES = {
  access_denied: "Google sign-in was cancelled.",
  invalid_state: "Your sign-in attempt expired. Please try again.",
  missing_code: "Google didn't return a valid response. Please try again.",
  auth_failed: "We couldn't verify your Google account. Please try again.",
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
      toast.error(ERROR_MESSAGES[error] || "Something went wrong signing in.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  return (
    <div className="rf-auth-page">
      <div className="rf-auth-glow" aria-hidden="true" />
      <div className="rf-auth-card">
        <Link to="/" className="rf-sidebar-brand" style={{ padding: 0, marginBottom: 32 }}>
          <span className="rf-brand-mark">RF</span>
          <span className="rf-brand-word">RepForge</span>
        </Link>

        <h1 className="rf-auth-title">Welcome back</h1>
        <p className="rf-auth-subtitle">Sign in to keep tracking your training.</p>

        <button className="rf-btn rf-btn--primary rf-btn--full rf-google-btn" onClick={loginWithGoogle}>
          <GoogleIcon />
          Continue with Google
        </button>

        <p className="rf-auth-fineprint">
          By continuing you agree to let RepForge store your workout data securely.
          We only ever use your Google account to verify who you are — never to post
          or access anything else on your behalf.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.09-1.8 2.73v2.27h2.92c1.7-1.57 2.68-3.88 2.68-6.64z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.27c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33C2.44 15.98 5.48 18 9 18z"/>
      <path fill="#FBBC05" d="M3.97 10.7c-.18-.54-.28-1.11-.28-1.7s.1-1.16.28-1.7V4.97H.96C.35 6.17 0 7.55 0 9s.35 2.83.96 4.03l3.01-2.33z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.97l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
    </svg>
  );
}

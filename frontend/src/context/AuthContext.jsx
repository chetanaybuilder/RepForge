/**
 * frontend\src\context\AuthContext.jsx
 * Implements this RepForge module's single responsibility while preserving its existing public behavior.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api, setCsrfToken, API_URL, setUnauthorizedHandler } from "../services/api";
import { clearFetchCache } from "../hooks/useFetch";

/**
 * Provides the current authenticated athlete, session state, and login/logout actions.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("checking"); // "checking" | "authenticated" | "unauthenticated"
  const [authError, setAuthError] = useState(null);
  const authRequestId = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++authRequestId.current;
    setStatus((current) => (current === "error" ? "checking" : current));
    try {
      const data = await api.get("/api/me");
      if (id !== authRequestId.current) return;
      if (data.authenticated) {
        setUser(data.user);
        setCsrfToken(data.csrf_token);
        setStatus("authenticated");
        setAuthError(null);
      } else {
        setUser(null);
        setCsrfToken(null);
        setStatus("unauthenticated");
        setAuthError(null);
      }
    } catch (error) {
      if (id !== authRequestId.current) return;
      setAuthError(error);
      if (error.status === 401) {
        setUser(null);
        setCsrfToken(null);
        setStatus("unauthenticated");
      } else {
        setStatus("error");
      }
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      authRequestId.current++;
      setUser(null);
      setCsrfToken(null);
      setStatus("unauthenticated");
      setAuthError(null);
      clearFetchCache();
      window.dispatchEvent(new Event("repforge:auth-reset"));
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const loginWithGoogle = useCallback(() => {
    // Full navigation, not fetch — this needs to be a real browser redirect
    // so Google's consent screen and cookies work normally.
    window.location.href = `${API_URL}/auth/google`;
  }, []);

  const logout = useCallback(async () => {
    authRequestId.current++;
    try {
      await api.post("/auth/logout");
    } catch {
      // Keep local logout reliable when the server is offline.
    } finally {
      setUser(null);
      setCsrfToken(null);
      setStatus("unauthenticated");
      setAuthError(null);
      clearFetchCache();
      window.dispatchEvent(new Event("repforge:auth-reset"));
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, authError, loginWithGoogle, logout, refresh }),
    [user, status, authError, loginWithGoogle, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

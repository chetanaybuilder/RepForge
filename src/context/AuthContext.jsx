import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, setCsrfToken, API_URL } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("checking"); // "checking" | "authenticated" | "unauthenticated"

  const refresh = useCallback(async () => {
    try {
      const data = await api.get("/api/me");
      if (data.authenticated) {
        setUser(data.user);
        setCsrfToken(data.csrf_token);
        setStatus("authenticated");
      } else {
        setUser(null);
        setCsrfToken(null);
        setStatus("unauthenticated");
      }
    } catch {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loginWithGoogle = useCallback(() => {
    // Full navigation, not fetch — this needs to be a real browser redirect
    // so Google's consent screen and cookies work normally.
    window.location.href = "/auth/google";
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
      setCsrfToken(null);
      setStatus("unauthenticated");
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, loginWithGoogle, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppShell } from "./components/AppShell";
import { AppErrorBoundary, PageErrorBoundary } from "./components/ErrorBoundary";

import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Workouts } from "./pages/Workouts";
import { AIAnalysis } from "./pages/AIAnalysis";
import { Progress } from "./pages/Progress";
import { Goals } from "./pages/Goals";
import { NotFound } from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,       // 2 minutes — cached data is fresh
      gcTime: 10 * 60 * 1000,          // 10 minutes — keep in cache
      retry: 1,                         // retry once on failure
      refetchOnWindowFocus: false,      // don't spam the API on tab switch
    },
  },
});

export default function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<PageErrorBoundary><Landing /></PageErrorBoundary>} />
                <Route path="/login" element={<PageErrorBoundary><Login /></PageErrorBoundary>} />

                <Route
                  element={
                    <ProtectedRoute>
                      <AppShell />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<PageErrorBoundary><Dashboard /></PageErrorBoundary>} />
                  <Route path="/workouts" element={<PageErrorBoundary><Workouts /></PageErrorBoundary>} />
                  <Route path="/ai-analysis" element={<PageErrorBoundary><AIAnalysis /></PageErrorBoundary>} />
                  <Route path="/progress" element={<PageErrorBoundary><Progress /></PageErrorBoundary>} />
                  <Route path="/goals" element={<PageErrorBoundary><Goals /></PageErrorBoundary>} />
                </Route>

                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

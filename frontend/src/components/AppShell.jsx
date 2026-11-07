/**
 * frontend\src\components\AppShell.jsx
 * Implements this RepForge module's single responsibility while preserving its existing public behavior.
 */

import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { AmbientBackground3D } from "./3d/AmbientBackground3D";
import { AnimatePresence, motion } from "framer-motion";
import { RestTimer, unlockAudio } from "./RestTimer";
import { useModalBodyLock } from "../hooks/useModalBodyLock";

/**
 * Shared navigation shell for the authenticated app.
 * Keeps the global layout, destination rail, and widget states consistent.
 */

export const APP_SECTIONS = [
  {
    to: "/workouts",
    number: "01",
    label: "LOG WORKOUT",
    desc: "Tactical training logging & exercise execution",
    icon: "▦",
  },
  {
    to: "/dashboard",
    number: "02",
    label: "DASHBOARD",
    desc: "Total volume, statistics & progression telemetry",
    icon: "◧",
  },
  {
    to: "/exercises",
    number: "03",
    label: "EXERCISES",
    desc: "800+ movements, anatomical targets & form guides",
    icon: "✦",
  },
  {
    to: "/coach",
    number: "04",
    label: "COACH",
    desc: "Ask about your training",
    icon: "◈",
  },
  {
    to: "/progress",
    number: "05",
    label: "PROGRESS",
    desc: "Training trends and performance analytics",
    icon: "⌁",
  },
  {
    to: "/goals",
    number: "06",
    label: "GOALS",
    desc: "Performance objectives and milestones",
    icon: "◎",
  },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showGlobalTimer, setShowGlobalTimer] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [menuOpen]);

  // Find active destination
  const activeSection = APP_SECTIONS.find((sec) => sec.to === location.pathname) || {
    number: "404",
    label: "NOT FOUND",
  };

  // Lock body scroll when mobile full-screen menu is open (ref-counted, shared with modals)
  useModalBodyLock(menuOpen);

  // Handle mobile destination tap: close navigation immediately and navigate to full-screen page
  const handleSelectDestination = (to) => {
    setMenuOpen(false);
    navigate(to);
  };

  return (
    <div className="rf-shell">
      <AmbientBackground3D />

      {/* Desktop navigation rail */}
      <aside className="rf-desktop-rail" aria-label="Primary navigation">
        <div className="rf-rail-header">
          <div className="rf-brand-group">
            <div className="rf-brand-glyph">RF</div>
            <div>
              <div className="rf-brand-text">RepForge</div>
              <div className="rf-telemetry-tag" style={{ fontSize: "0.62rem" }}>
                Training Platform
              </div>
            </div>
          </div>
          <div className="rf-status-beacon" title="Subsystem online" />
        </div>

        <nav className="rf-rail-nav" aria-label="App sections">
          {APP_SECTIONS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `rf-rail-item${isActive ? " rf-rail-item--active" : ""}`}
            >
              <span className="rf-rail-num">{item.number}</span>
              <span className="rf-rail-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="rf-rail-footer">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: "var(--rf-radius-md)",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--rf-border-subtle)",
            }}
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "1px solid rgba(0, 242, 254, 0.4)",
                }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--rf-violet), var(--rf-cyan))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "0.85rem",
                  color: "#fff",
                }}
              >
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div
                style={{
                  fontSize: "0.86rem",
                  fontWeight: 600,
                  color: "var(--rf-text-pure)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user?.name || "Athlete"}
              </div>
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "var(--rf-text-faint)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user?.email || "Connected"}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="rf-btn rf-btn--outline rf-btn--sm rf-btn--full"
            onClick={() => {
              unlockAudio();
              setShowGlobalTimer((prev) => !prev);
            }}
            style={{
              borderColor: "rgba(0, 242, 254, 0.3)",
              color: "var(--rf-cyan)",
              fontSize: "0.78rem",
            }}
          >
            ⏱️ Rest Timer
          </button>

          <button
            type="button"
            className="rf-btn rf-btn--ghost rf-btn--sm rf-btn--full"
            onClick={() => logout()}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="rf-topbar">
        <div className="rf-brand-group">
          <div className="rf-brand-glyph">RF</div>
          <div className="rf-brand-info">
            <div className="rf-brand-text">RepForge</div>
            <div className="rf-brand-breadcrumb">
              {activeSection.number} · {activeSection.label}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              unlockAudio();
              setShowGlobalTimer((prev) => !prev);
            }}
            style={{
              padding: "6px 10px",
              fontFamily: "var(--rf-font-mono)",
              fontSize: "0.75rem",
              borderRadius: "var(--rf-radius-sm)",
              border: "1px solid rgba(0, 242, 254, 0.3)",
              background: "rgba(0, 242, 254, 0.08)",
              color: "var(--rf-cyan)",
              display: "flex",
              alignItems: "center",
              gap: 4,
              cursor: "pointer",
            }}
            title="Open Inter-Set Rest Timer"
          >
            ⏱️ Rest
          </button>

          <button
            type="button"
            className="rf-hamburger-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Open Navigation Menu"
          >
            ☰
          </button>
        </div>
      </header>

      {/* ====================================================================
          FULL-SCREEN MOBILE NAVIGATION MENU OVERLAY
          ==================================================================== */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="rf-fullscreen-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Menu Header */}
            <div className="rf-menu-topbar">
              <div className="rf-brand-group">
                <div className="rf-brand-glyph">RF</div>
                <div>
                  <div className="rf-brand-text" style={{ fontSize: "1.2rem" }}>
                    RepForge OS
                  </div>
                  <div className="rf-telemetry-tag" style={{ fontSize: "0.66rem" }}>
                    NAVIGATION MATRIX
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="rf-menu-close-btn"
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation"
              >
                ✕
              </button>
            </div>

            {/* The Four Large Destinations */}
            <div className="rf-menu-destinations">
              {APP_SECTIONS.map((sec, idx) => {
                const isActive = location.pathname === sec.to;

                return (
                  <motion.div
                    key={sec.to}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 24,
                      delay: idx * 0.06,
                    }}
                  >
                    <button
                      type="button"
                      className={`rf-menu-card${isActive ? " rf-menu-card--active" : ""}`}
                      onClick={() => handleSelectDestination(sec.to)}
                    >
                      <div>
                        <div className="rf-menu-num">
                          {sec.number} — {sec.icon}
                        </div>
                        <div className="rf-menu-title">{sec.label}</div>
                        <div className="rf-menu-desc">{sec.desc}</div>
                      </div>

                      <div className="rf-menu-arrow">→</div>
                    </button>
                  </motion.div>
                );
              })}
            </div>

            {/* Menu Footer with Athlete Info & Disconnect */}
            <div className="rf-menu-footer">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: "50%",
                      border: "2px solid var(--rf-cyan)",
                    }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, var(--rf-violet), var(--rf-cyan))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      color: "#fff",
                    }}
                  >
                    {user?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
                <div>
                  <div
                    style={{ fontWeight: 700, color: "var(--rf-text-pure)", fontSize: "0.95rem" }}
                  >
                    {user?.name || "Athlete Station"}
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--rf-text-faint)" }}>
                    {user?.email}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="rf-btn rf-btn--danger rf-btn--sm"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
              >
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====================================================================
          FULL-SCREEN APPLICATION VIEWPORT (Edge-to-Edge Canvas)
          ==================================================================== */}
      <main className="rf-shell-main">
        <div className="rf-page-canvas">
          <AnimatePresence initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{
                width: "100%",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
              }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {showGlobalTimer && <RestTimer onClose={() => setShowGlobalTimer(false)} />}
    </div>
  );
}

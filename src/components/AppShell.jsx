import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { AmbientBackground3D } from "./3d/AmbientBackground3D";
import { AnimatePresence, motion } from "framer-motion";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", shortLabel: "Deck", icon: "◧" },
  { to: "/workouts", label: "Workouts", shortLabel: "Train", icon: "▦" },
  { to: "/ai-analysis", label: "AI Coach", shortLabel: "Neural", icon: "◈" },
  { to: "/progress", label: "Progress", shortLabel: "Metrics", icon: "◱" },
  { to: "/goals", label: "Goals", shortLabel: "Targets", icon: "◎" },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const location = useLocation();

  const currentNav = NAV_ITEMS.find((item) => item.to === location.pathname) || {
    label: "RepForge OS",
    shortLabel: "RepForge",
  };

  return (
    <div className="rf-shell">
      <AmbientBackground3D />

      {/* ====================================================================
          DESKTOP COMMAND RAIL (>= 768px)
          ==================================================================== */}
      <aside className="rf-desktop-rail">
        <div className="rf-rail-header">
          <div className="rf-telemetry-brand">
            <div className="rf-brand-glyph">RF</div>
            <div>
              <div className="rf-brand-text">RepForge</div>
              <div className="rf-telemetry-tag" style={{ fontSize: "0.62rem" }}>
                AI OS v2.4
              </div>
            </div>
          </div>
          <div className="rf-status-beacon" title="Core Online — Synced" />
        </div>

        <nav className="rf-rail-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rf-rail-link${isActive ? " rf-rail-link--active" : ""}`
              }
            >
              <span className="rf-dock-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="rf-rail-footer">
          <div className="rf-rail-user">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="rf-avatar-thumb"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="rf-avatar-placeholder">
                {user?.name?.[0] || "U"}
              </div>
            )}
            <div className="rf-rail-user-info">
              <span className="rf-rail-user-name">{user?.name || "Athlete"}</span>
              <span className="rf-rail-user-email">{user?.email || "Connected"}</span>
            </div>
          </div>
          <button
            className="rf-btn rf-btn--ghost rf-btn--sm rf-btn--full"
            onClick={logout}
          >
            Disconnect
          </button>
        </div>
      </aside>

      {/* ====================================================================
          MOBILE TOP TELEMETRY STRIP (< 768px)
          ==================================================================== */}
      <header className="rf-mobile-telemetry">
        <div className="rf-telemetry-brand">
          <div className="rf-brand-glyph">RF</div>
          <div>
            <div className="rf-brand-text" style={{ fontSize: "1rem" }}>
              {currentNav.label}
            </div>
            <div className="rf-telemetry-tag" style={{ fontSize: "0.6rem" }}>
              TELEMETRY LIVE
            </div>
          </div>
        </div>

        <div className="rf-telemetry-status">
          <div className="rf-status-beacon" />
          <button
            className="rf-user-trigger"
            aria-label="User station menu"
            onClick={() => setProfileModalOpen(true)}
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="rf-avatar-thumb"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="rf-avatar-placeholder">
                {user?.name?.[0] || "U"}
              </div>
            )}
          </button>
        </div>
      </header>

      {/* ====================================================================
          MOBILE PROFILE & STATION BOTTOM SHEET
          ==================================================================== */}
      <AnimatePresence>
        {profileModalOpen && (
          <div
            className="rf-modal-overlay"
            onClick={() => setProfileModalOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="rf-modal"
              style={{ maxWidth: 420 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rf-modal-handle" />
              <div className="rf-modal-header">
                <h3 className="rf-modal-title">Athlete Station</h3>
                <button
                  className="rf-icon-btn"
                  onClick={() => setProfileModalOpen(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="rf-modal-body" style={{ textAlign: "center" }}>
                <div style={{ display: "inline-block", position: "relative", marginBottom: 14 }}>
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt=""
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        border: "2px solid var(--rf-cyan)",
                        boxShadow: "0 0 20px -2px rgba(0, 242, 254, 0.4)",
                      }}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, var(--rf-violet), var(--rf-cyan))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: "1.4rem",
                      }}
                    >
                      {user?.name?.[0] || "U"}
                    </div>
                  )}
                </div>

                <h4 style={{ fontSize: "1.1rem", marginBottom: 4 }}>
                  {user?.name || "Verified Lifter"}
                </h4>
                <p style={{ fontSize: "0.84rem", color: "var(--rf-text-faint)", marginBottom: 20 }}>
                  {user?.email}
                </p>

                <div
                  className="rf-pod"
                  style={{
                    padding: 14,
                    marginBottom: 20,
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div className="rf-status-beacon" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.74rem", color: "var(--rf-text-faint)", textTransform: "uppercase" }}>
                      Neural Sync State
                    </div>
                    <div style={{ fontSize: "0.86rem", color: "var(--rf-text-pure)", fontWeight: 600 }}>
                      Connected to Quantum Mesh
                    </div>
                  </div>
                </div>

                <button
                  className="rf-btn rf-btn--danger rf-btn--full"
                  onClick={() => {
                    setProfileModalOpen(false);
                    logout();
                  }}
                >
                  Disconnect Session
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ====================================================================
          MAIN VIEWPORT (Responsive Offset)
          ==================================================================== */}
      <main className="rf-shell-main">
        <div className="rf-page-container">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              style={{ width: "100%" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ====================================================================
          MOBILE SPATIAL BOTTOM DOCK (< 768px)
          ==================================================================== */}
      <nav className="rf-spatial-dock" aria-label="Mobile Navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `rf-dock-item${isActive ? " rf-dock-item--active" : ""}`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="rf-dock-pill"
                    className="rf-dock-active-pill"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                )}
                <span className="rf-dock-icon">{item.icon}</span>
                <span>{item.shortLabel}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

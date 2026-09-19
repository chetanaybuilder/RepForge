import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { AmbientBackground3D } from "./3d/AmbientBackground3D";
import { AnimatePresence, motion } from "framer-motion";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: "◧" },
  { to: "/workouts", label: "Workouts", icon: "▦" },
  { to: "/ai-analysis", label: "AI Trainer", icon: "◈" },
  { to: "/progress", label: "Progress", icon: "◱" },
  { to: "/goals", label: "Goals", icon: "◎" },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="rf-shell">
      <AmbientBackground3D />
      <aside className="rf-sidebar" style={{ zIndex: 10 }}>
        <div className="rf-sidebar-brand">
          <span className="rf-brand-mark">RF</span>
          <span className="rf-brand-word">RepForge</span>
        </div>

        <nav className="rf-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `rf-nav-link${isActive ? " rf-nav-link--active" : ""}`}
            >
              <span className="rf-nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="rf-sidebar-footer">
          <div className="rf-user-chip">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="rf-avatar" referrerPolicy="no-referrer" />
            ) : (
              <div className="rf-avatar rf-avatar--placeholder">{user?.name?.[0] || "?"}</div>
            )}
            <div className="rf-user-chip-text">
              <span className="rf-user-name">{user?.name}</span>
              <span className="rf-user-email">{user?.email}</span>
            </div>
          </div>
          <button className="rf-btn rf-btn--ghost rf-btn--full" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <div className="rf-mobile-topbar">
        <div className="rf-sidebar-brand">
          <span className="rf-brand-mark">RF</span>
          <span className="rf-brand-word">RepForge</span>
        </div>
        <button
          className="rf-icon-btn"
          aria-label="Open menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="rf-avatar rf-avatar--sm" referrerPolicy="no-referrer" />
          ) : (
            <div className="rf-avatar rf-avatar--placeholder rf-avatar--sm">{user?.name?.[0] || "?"}</div>
          )}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="rf-mobile-menu" 
            onClick={() => setMenuOpen(false)}
          >
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="rf-mobile-menu-panel" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rf-user-chip">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="rf-avatar" referrerPolicy="no-referrer" />
                ) : (
                  <div className="rf-avatar rf-avatar--placeholder">{user?.name?.[0] || "?"}</div>
                )}
                <div className="rf-user-chip-text">
                  <span className="rf-user-name">{user?.name}</span>
                  <span className="rf-user-email">{user?.email}</span>
                </div>
              </div>
              <button className="rf-btn rf-btn--ghost rf-btn--full" onClick={logout}>
                Log out
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="rf-main" style={{ zIndex: 10, position: 'relative' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="rf-mobile-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `rf-mobile-nav-link${isActive ? " rf-mobile-nav-link--active" : ""}`}
          >
            <span className="rf-nav-icon">{item.icon}</span>
            <span className="rf-mobile-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

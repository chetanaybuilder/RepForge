import React, { Suspense, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import { PrimaryButton } from "../components/PrimaryButton";

const LandingScene = React.lazy(() => import("../components/3d/LandingScene"));

const FEATURES = [
  {
    icon: "◈",
    title: "AI Training Analysis",
    body: "Gemini reads your real training history — sets, reps, weight, and time — and surfaces plateaus, momentum, and what to target next. Never invented, always grounded in your data.",
  },
  {
    icon: "▦",
    title: "Effortless Logging",
    body: "Log a session in seconds. Search, filter, and sort your entire history the way a real training log should work.",
  },
  {
    icon: "◱",
    title: "Real Progress Charts",
    body: "Volume trends, exercise progression, and personal records — computed straight from your logged sets, not guesses.",
  },
  {
    icon: "◎",
    title: "Goals That Mean Something",
    body: "Set a weekly frequency, a PR target, or a volume goal, and watch honest progress bars move as you train.",
  },
];

const METRICS = [
  { value: "100%", label: "Your data, your account" },
  { value: "0", label: "Fake statistics" },
  { value: "24/7", label: "AI analysis on demand" },
];

export function Landing() {
  const { status } = useAuth();
  const navigate = useNavigate();
  const [isLiteMode, setIsLiteMode] = useState(false);

  useEffect(() => {
    try {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      const checkMode = () => {
        setIsLiteMode(Boolean(mediaQuery?.matches));
      };
      checkMode();

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", checkMode);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(checkMode);
      }
      window.addEventListener("resize", checkMode);

      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener("change", checkMode);
        } else if (mediaQuery.removeListener) {
          mediaQuery.removeListener(checkMode);
        }
        window.removeEventListener("resize", checkMode);
      };
    } catch {
      setIsLiteMode(true);
    }
  }, []);

  const handleStartTraining = () => {
    if (status === "authenticated") navigate("/dashboard");
    else navigate("/login");
  };

  return (
    <div className="rf-landing">
      <nav className="rf-landing-nav" style={{ zIndex: 10 }}>
        <div className="rf-sidebar-brand" style={{ padding: 0 }}>
          <span className="rf-brand-mark">RF</span>
          <span className="rf-brand-word">RepForge</span>
        </div>
        <div className="rf-landing-nav-actions">
          <PrimaryButton
            className="rf-btn--sm"
            onClick={handleStartTraining}
          >
            Start Training
          </PrimaryButton>
        </div>
      </nav>

      <header className="rf-hero" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="rf-hero-bg" style={{ zIndex: 1 }} />

        {!isLiteMode && (
          <Suspense fallback={<div className="rf-hero-bg" />}>
            <LandingScene />
          </Suspense>
        )}

        <motion.div
          className="rf-hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
          style={{ zIndex: 10, position: 'relative', textShadow: '0 4px 24px rgba(0,0,0,0.8)' }}
        >
          <span className="rf-hero-eyebrow">AI-powered training intelligence</span>
          <h1 className="rf-hero-title">
            Train. Track.<br />
            <span className="rf-gradient-text">Evolve.</span>
          </h1>
          <p className="rf-hero-sub">
            RepForge turns every set you log into real signal — strength trends, plateaus,
            and personal records, analyzed by AI that only ever looks at your actual training.
          </p>
          <div className="rf-hero-actions">
            <PrimaryButton
              className="rf-hero-btn-lg"
              onClick={handleStartTraining}
            >
              Start Training
            </PrimaryButton>
          </div>
        </motion.div>
      </header>

      <section className="rf-metric-strip" style={{ position: 'relative', zIndex: 10 }}>
        {METRICS.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", delay: i * 0.1 }}
          >
            <div className="rf-metric-value rf-gradient-text">{m.value}</div>
            <div className="rf-metric-label">{m.label}</div>
          </motion.div>
        ))}
      </section>

      <section className="rf-section" style={{ position: 'relative', zIndex: 10 }}>
        <span className="rf-section-eyebrow">Built for lifters who track everything</span>
        <h2 className="rf-section-heading">Everything a serious training log should do — and the analysis a coach would give you.</h2>
        <p className="rf-section-lead">
          No placeholder charts, no invented statistics. Every number on RepForge traces back to a set you actually logged.
        </p>
        <div className="rf-feature-grid">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              className="rf-feature-card"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(138,92,246,0.3)" }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: i * 0.1 }}
            >
              <div className="rf-feature-icon">{f.icon}</div>
              <h3 className="rf-feature-title">{f.title}</h3>
              <p>{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="rf-cta-banner" style={{ position: 'relative', zIndex: 10 }}>
        <h2 className="rf-cta-title">Your next PR starts with logging today's set.</h2>
        <p style={{ marginBottom: 28 }}>Sign in with Google — no passwords, no setup, just training.</p>
        <PrimaryButton
          className="rf-hero-btn-lg"
          onClick={handleStartTraining}
        >
          Start Training
        </PrimaryButton>
      </section>

      <footer className="rf-landing-footer" style={{ position: 'relative', zIndex: 10 }}>
        <div className="rf-sidebar-brand" style={{ padding: 0 }}>
          <span className="rf-brand-mark" style={{ width: 26, height: 26, fontSize: "0.7rem" }}>RF</span>
          <span style={{ fontSize: "0.95rem" }}>RepForge</span>
        </div>
        <span>© {new Date().getFullYear()} RepForge. Train with intention.</span>
        <Link to="/login" className="rf-text-dim">Sign in</Link>
      </footer>
    </div>
  );
}

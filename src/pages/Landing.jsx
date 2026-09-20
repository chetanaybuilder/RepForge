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

const WORKFLOW_STEPS = [
  {
    num: "01",
    label: "LOG WORKOUT",
    desc: "Capture sets, reps, and loads effortlessly with high-speed thumb controls.",
  },
  {
    num: "02",
    label: "DASHBOARD",
    desc: "Observe cumulative volume, streak momentum, and empirical overload metrics.",
  },
  {
    num: "03",
    label: "AI TRAINER",
    desc: "Receive conversational coach diagnostics that interpret your real fatigue and milestones.",
  },
  {
    num: "04",
    label: "GOALS & ACHIEVEMENTS",
    desc: "Advance towards validated milestones and unlock 3D performance crystals.",
  },
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

  const handleContinue = () => {
    if (status === "authenticated") navigate("/dashboard");
    else navigate("/login");
  };

  return (
    <div className="rf-landing">
      {/* Navigation Header */}
      <nav className="rf-landing-nav" style={{ zIndex: 20 }}>
        <div className="rf-brand-group">
          <div className="rf-brand-glyph">RF</div>
          <span className="rf-brand-text">RepForge</span>
        </div>
        <div>
          <PrimaryButton className="rf-btn--sm" onClick={handleContinue}>
            CONTINUE
          </PrimaryButton>
        </div>
      </nav>

      {/* Cinematic Hero */}
      <header className="rf-hero">
        <div className="rf-hero-bg" style={{ zIndex: 1 }} />

        {!isLiteMode && (
          <Suspense fallback={<div className="rf-hero-bg" />}>
            <LandingScene />
          </Suspense>
        )}

        <motion.div
          className="rf-hero-content"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.15 }}
          style={{ zIndex: 10, position: "relative" }}
        >
          <span className="rf-hero-badge" style={{ marginBottom: 14 }}>
            AI-POWERED TRAINING INTELLIGENCE
          </span>
          <h1 className="rf-hero-title">
            Train. Track.<br />
            <span className="rf-gradient-text">Evolve.</span>
          </h1>
          <p className="rf-hero-sub">
            RepForge turns every set you log into real signal — strength trends, plateaus,
            and personal records, analyzed by AI that only ever looks at your actual training.
          </p>
          <div className="rf-hero-actions">
            <PrimaryButton className="rf-btn--lg" onClick={handleContinue} style={{ minWidth: 180, letterSpacing: "0.04em", fontWeight: 800 }}>
              CONTINUE
            </PrimaryButton>
          </div>
        </motion.div>
      </header>

      {/* Metric Strip */}
      <section className="rf-metric-strip" style={{ position: "relative", zIndex: 10 }}>
        {METRICS.map((m, i) => (
          <motion.div
            key={m.label}
            className="rf-metric-cell"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", delay: i * 0.1 }}
          >
            <div className="rf-metric-num rf-gradient-text">{m.value}</div>
            <div className="rf-metric-desc" style={{ color: "var(--rf-text-bright)", fontWeight: 600 }}>
              {m.label}
            </div>
          </motion.div>
        ))}
      </section>

      {/* Features Showcase */}
      <section className="rf-page-container" style={{ padding: "clamp(48px, 8vw, 88px) 20px", position: "relative", zIndex: 10 }}>
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 40px" }}>
          <div className="rf-telemetry-tag" style={{ marginBottom: 8 }}>
            BUILT FOR LIFTERS WHO TRACK EVERYTHING
          </div>
          <h2 style={{ fontSize: "var(--rf-text-2xl)", marginBottom: 14, color: "var(--rf-text-pure)" }}>
            Everything a serious training log should do — and the analysis a coach would give you.
          </h2>
          <p style={{ color: "var(--rf-text-sub)", fontSize: "0.95rem" }}>
            No placeholder charts, no invented statistics. Every number on RepForge traces back to a set you actually logged.
          </p>
        </div>

        <div className="rf-feature-grid">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              className="rf-feature-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: i * 0.08 }}
            >
              <div className="rf-feature-icon">{f.icon}</div>
              <h3 style={{ fontSize: "1.2rem", color: "var(--rf-text-pure)", marginBottom: 8 }}>
                {f.title}
              </h3>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--rf-text-sub)", lineHeight: 1.6 }}>
                {f.body}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Cinematic Architecture Flow (Makes page feel more complete & cinematic) */}
      <section
        style={{
          padding: "clamp(48px, 8vw, 88px) 20px",
          background: "linear-gradient(180deg, transparent 0%, rgba(138, 92, 246, 0.04) 50%, transparent 100%)",
          borderTop: "1px solid var(--rf-border-subtle)",
          borderBottom: "1px solid var(--rf-border-subtle)",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div className="rf-page-container">
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 44px" }}>
            <div className="rf-telemetry-tag" style={{ color: "var(--rf-violet)", marginBottom: 8 }}>
              THE REVOLUTIONARY FOUR-PILLAR ENGINE
            </div>
            <h2 style={{ fontSize: "var(--rf-text-xl)", color: "var(--rf-text-pure)" }}>
              One Cohesive Intelligence Platform
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 20,
            }}
          >
            {WORKFLOW_STEPS.map((step, idx) => (
              <motion.div
                key={step.num}
                className="rf-pod"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", delay: idx * 0.08 }}
                style={{ padding: 24 }}
              >
                <div className="rf-telemetry-tag" style={{ color: "var(--rf-cyan)", marginBottom: 8 }}>
                  {step.num}
                </div>
                <h3 style={{ fontSize: "1.05rem", color: "var(--rf-text-pure)", marginBottom: 8 }}>
                  {step.label}
                </h3>
                <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--rf-text-sub)", lineHeight: 1.55 }}>
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section
        className="rf-page-container"
        style={{
          padding: "clamp(48px, 8vw, 88px) 20px",
          textAlign: "center",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2 style={{ fontSize: "var(--rf-text-xl)", color: "var(--rf-text-pure)", marginBottom: 12 }}>
            Your next PR starts with logging today's set.
          </h2>
          <p style={{ color: "var(--rf-text-sub)", marginBottom: 28, fontSize: "0.95rem" }}>
            Sign in with Google — no passwords, no setup, just training.
          </p>
          <PrimaryButton className="rf-btn--lg" onClick={handleContinue} style={{ minWidth: 180, letterSpacing: "0.04em", fontWeight: 800 }}>
            CONTINUE
          </PrimaryButton>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="rf-landing-footer"
        style={{
          padding: "28px 24px",
          borderTop: "1px solid var(--rf-border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          maxWidth: "var(--rf-container-max)",
          margin: "0 auto",
          width: "100%",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="rf-brand-glyph" style={{ width: 28, height: 28, fontSize: "0.75rem" }}>
            RF
          </div>
          <span style={{ fontSize: "0.92rem", color: "var(--rf-text-pure)" }}>RepForge</span>
        </div>
        <span style={{ fontSize: "0.82rem", color: "var(--rf-text-faint)" }}>
          © {new Date().getFullYear()} RepForge. Train with intention.
        </span>
        <Link to="/login" style={{ fontSize: "0.85rem", color: "var(--rf-cyan)" }}>
          Sign in
        </Link>
      </footer>
    </div>
  );
}

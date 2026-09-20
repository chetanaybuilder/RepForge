import React, { Suspense, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import { PrimaryButton } from "../components/PrimaryButton";

const LandingScene = React.lazy(() => import("../components/3d/LandingScene"));

const FEATURES = [
  {
    glyph: "◈",
    tag: "NEURAL COGNITION",
    title: "AI Biomechanical Intelligence",
    body: "Gemini interprets your complete training trajectory — real volume overloads, movement frequency, and Push/Pull balance — surfacing genuine plateaus and prescriptive overload cues.",
  },
  {
    glyph: "▦",
    tag: "HIGH-SPEED LOGGING",
    title: "Tactical Input Protocol",
    body: "Engineered for rapid gym thumb operation. Quick steppers, set completion chips, and zero friction mean you spend your focus on the barbell, not entering numbers.",
  },
  {
    glyph: "◱",
    tag: "OBJECTIVE TELEMETRY",
    title: "Empirical Progression Curves",
    body: "12-week volume trends, estimated 1RM trajectories, and personal record milestones computed strictly from verified sets. Zero invented graphs or fake algorithms.",
  },
  {
    glyph: "◎",
    tag: "PERFORMANCE TARGETS",
    title: "Active Objectives & Milestones",
    body: "Establish weekly frequency targets, peak personal record goals, and cumulative volume quotas with honest live telemetry meters that advance as you train.",
  },
];

const TELEMETRY_METRICS = [
  { value: "100%", label: "Verified Data Authenticity", desc: "TRACED DIRECTLY TO LOGGED SETS" },
  { value: "0", label: "Invented Statistics", desc: "NO PLACEHOLDERS OR GUESSES" },
  { value: "2040", label: "Architecture Standard", desc: "MOBILE-FIRST BIOMECHANICS" },
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
      }
      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener("change", checkMode);
        }
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
      {/* Top Navigation Bar */}
      <nav className="rf-landing-nav">
        <div className="rf-telemetry-brand">
          <div className="rf-brand-glyph">RF</div>
          <div>
            <div className="rf-brand-text">RepForge</div>
            <div className="rf-telemetry-tag" style={{ fontSize: "0.62rem" }}>
              BIO-INTELLIGENCE OS
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {status === "authenticated" ? (
            <Link to="/dashboard">
              <PrimaryButton className="rf-btn--sm">
                Open Command Deck →
              </PrimaryButton>
            </Link>
          ) : (
            <PrimaryButton className="rf-btn--sm" onClick={handleStartTraining}>
              Access Terminal
            </PrimaryButton>
          )}
        </div>
      </nav>

      {/* Cinematic 3D Hero */}
      <header className="rf-hero">
        {!isLiteMode && (
          <Suspense fallback={null}>
            <LandingScene />
          </Suspense>
        )}

        <motion.div
          className="rf-hero-content"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 22, delay: 0.15 }}
        >
          <div className="rf-hero-badge">
            ◈ NEXT-GEN TRAINING INTELLIGENCE
          </div>

          <h1 className="rf-hero-title">
            Train with Intention.<br />
            <span className="rf-gradient-text">Evolve Beyond Limits.</span>
          </h1>

          <p className="rf-hero-sub">
            RepForge transforms every set you execute into objective biomechanical telemetry —
            strength momentum, plateau detection, and AI coaching grounded exclusively in your verified data.
          </p>

          <div className="rf-hero-actions">
            <PrimaryButton className="rf-btn--lg" onClick={handleStartTraining}>
              Initiate Training System →
            </PrimaryButton>
            <Link to="/login">
              <button className="rf-btn rf-btn--ghost rf-btn--lg">
                Sign In
              </button>
            </Link>
          </div>
        </motion.div>
      </header>

      {/* Telemetry Metric Strip */}
      <section className="rf-metric-strip">
        {TELEMETRY_METRICS.map((m, i) => (
          <div key={m.label} className="rf-metric-cell">
            <div className="rf-metric-num rf-gradient-text">
              {m.value}
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--rf-text-bright)", fontWeight: 600, marginTop: 4 }}>
              {m.label}
            </div>
            <div className="rf-metric-desc">
              {m.desc}
            </div>
          </div>
        ))}
      </section>

      {/* Feature Showcase Grid */}
      <section className="rf-page-container" style={{ padding: "clamp(40px, 8vw, 80px) 20px" }}>
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 40px" }}>
          <div className="rf-telemetry-tag" style={{ marginBottom: 8 }}>
            BIOMECHANICAL SUBSYSTEMS
          </div>
          <h2 style={{ fontSize: "var(--rf-text-2xl)", marginBottom: 12 }}>
            Engineered for Serious Lifters
          </h2>
          <p style={{ color: "var(--rf-text-sub)" }}>
            A unified intelligence layer designed for lifters who demand objective empirical feedback rather than generic advice.
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
              <div className="rf-feature-icon">{f.glyph}</div>
              <div className="rf-telemetry-tag" style={{ marginBottom: 6 }}>
                {f.tag}
              </div>
              <h3 style={{ fontSize: "1.2rem", marginBottom: 8, color: "var(--rf-text-pure)" }}>
                {f.title}
              </h3>
              <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.6 }}>
                {f.body}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Mission Deck */}
      <section
        style={{
          padding: "clamp(40px, 8vw, 80px) 20px",
          background: "linear-gradient(180deg, transparent 0%, rgba(0, 242, 254, 0.04) 50%, transparent 100%)",
          textAlign: "center",
          borderTop: "1px solid var(--rf-border-subtle)",
          borderBottom: "1px solid var(--rf-border-subtle)",
        }}
      >
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div className="rf-telemetry-tag" style={{ color: "var(--rf-ember)", marginBottom: 10 }}>
            NEXT PROGRESSIVE OVERLOAD
          </div>
          <h2 style={{ fontSize: "var(--rf-text-xl)", marginBottom: 14 }}>
            Your Next Personal Record Begins Today
          </h2>
          <p style={{ color: "var(--rf-text-sub)", marginBottom: 28 }}>
            Authenticate instantly via Google OAuth. Zero passwords, zero manual setup — immediate access to your fitness telemetry.
          </p>
          <PrimaryButton className="rf-btn--lg" onClick={handleStartTraining}>
            Connect Your Account →
          </PrimaryButton>
        </div>
      </section>

      {/* Futuristic Footer */}
      <footer
        style={{
          padding: "28px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          fontSize: "0.82rem",
          color: "var(--rf-text-faint)",
          maxWidth: "var(--rf-container-max)",
          margin: "0 auto",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="rf-brand-glyph" style={{ width: 26, height: 26, fontSize: "0.72rem" }}>
            RF
          </div>
          <span>© {new Date().getFullYear()} RepForge OS. All rights reserved.</span>
        </div>
        <div className="rf-telemetry-tag" style={{ color: "var(--rf-emerald)" }}>
          ALL SUBSYSTEMS NOMINAL
        </div>
      </footer>
    </div>
  );
}

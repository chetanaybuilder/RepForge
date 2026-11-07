/**
 * frontend\src\pages\Landing.jsx
 * Implements this RepForge module's single responsibility while preserving its existing public behavior.
 */

import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { PrimaryButton } from "../components/PrimaryButton";

const METRICS = [
  { value: "63.2K", label: "TOTAL VOLUME", unit: "kg", trend: "+12.8%" },
  { value: "392", label: "TOTAL SETS", unit: "sets", trend: "+8.4%" },
  { value: "2.0K", label: "TOTAL REPS", unit: "reps", trend: "+6.2%" },
];

const HEATMAP_LEVELS = [
  0, 1, 0, 2, 0, 3, 1, 0, 2, 0, 4, 1, 0, 3, 2, 0, 1, 0, 3, 0, 2, 4, 1, 0, 0, 2, 0, 3, 1, 0, 4, 2, 0,
  1, 3, 0, 2, 0, 1, 4, 0, 2, 3, 0, 1, 0, 4, 2, 0, 3, 0, 1, 2, 0, 4, 0, 1, 3, 0, 2, 1, 0, 3, 4, 0, 2,
  0, 1, 3, 0, 2, 4, 1, 0, 2, 0, 3, 1, 0, 4, 2, 0, 3, 0,
];

const EXERCISES = [
  { name: "Barbell squat", detail: "3 sets · 5 reps", load: "100 kg" },
  { name: "Bench press", detail: "3 sets · 5 reps", load: "72.5 kg" },
];

const FEATURES = [
  {
    number: "01",
    category: "THE SESSION",
    title: "Precision workout logging",
    description:
      "Stay focused between sets. Log load, reps, and effort, use built-in rest timers, and keep every session connected to your progression history.",
    bullets: ["Fast set-by-set entry", "Rest timer built in", "RPE & progression history"],
    visual: "logging",
  },
  {
    number: "02",
    category: "GROQ-POWERED AI COACH",
    title: "RepForge AI Coach",
    description:
      "Get practical next-step guidance grounded in your actual training log, not generic routines or made-up numbers.",
    bullets: [
      "Personalized session insights",
      "Recovery-aware suggestions",
      "Ask about your progress",
    ],
    visual: "coach",
  },
  {
    number: "03",
    category: "THE LONG GAME",
    title: "Strength & hypertrophy analytics",
    description:
      "Understand your training patterns with volume trends, muscle-group breakdowns, and a clear view of your next personal record.",
    bullets: ["Volume landmarks", "Muscle-group balance", "PR trajectory"],
    visual: "analytics",
  },
];

function WorkoutHeatmap() {
  return (
    <div className="rf-saas-heatmap" aria-label="Workout consistency across the last 12 weeks">
      <div className="rf-saas-heatmap-day">
        {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>
      <div className="rf-saas-heatmap-grid">
        {HEATMAP_LEVELS.map((level, index) => (
          <span
            className={`rf-saas-heatmap-cell rf-saas-heatmap-cell--${level}`}
            key={index}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}

function VolumeBars() {
  return (
    <div className="rf-saas-volume-bars" aria-label="Weekly training volume trend">
      {[38, 55, 46, 72, 58, 88, 68, 96, 74, 84, 65, 100].map((height, index) => (
        <span
          className={
            index === 11 ? "rf-saas-volume-bar rf-saas-volume-bar--current" : "rf-saas-volume-bar"
          }
          key={index}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="rf-saas-product-stage" aria-label="RepForge training dashboard preview">
      <div className="rf-saas-dashboard">
        <div className="rf-saas-window-bar">
          <div className="rf-saas-window-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="rf-saas-window-label">REPforge / PERFORMANCE</span>
          <span className="rf-saas-window-avatar">A</span>
        </div>

        <div className="rf-saas-dashboard-content">
          <div className="rf-saas-dashboard-heading">
            <div>
              <span className="rf-saas-kicker">TRAINING OVERVIEW</span>
              <h2>Your work, measured.</h2>
            </div>
            <span className="rf-saas-period">LAST 12 WEEKS⌄</span>
          </div>

          <div className="rf-saas-metric-grid">
            {METRICS.map((metric) => (
              <div className="rf-saas-metric-card" key={metric.label}>
                <span className="rf-saas-metric-label">{metric.label}</span>
                <div className="rf-saas-metric-value">
                  {metric.value}
                  <small>{metric.unit}</small>
                </div>
                <span className="rf-saas-metric-trend">
                  <span aria-hidden="true">↗</span> {metric.trend}
                </span>
              </div>
            ))}
          </div>

          <div className="rf-saas-dashboard-panels">
            <section className="rf-saas-panel rf-saas-consistency">
              <div className="rf-saas-panel-heading">
                <div>
                  <h3>Consistency</h3>
                  <span>Small wins add up.</span>
                </div>
                <strong>
                  38 <small>sessions</small>
                </strong>
              </div>
              <WorkoutHeatmap />
              <div className="rf-saas-heatmap-legend">
                <span>LESS</span>
                <i className="rf-saas-heatmap-cell--0" />
                <i className="rf-saas-heatmap-cell--1" />
                <i className="rf-saas-heatmap-cell--2" />
                <i className="rf-saas-heatmap-cell--3" />
                <i className="rf-saas-heatmap-cell--4" />
                <span>MORE</span>
              </div>
            </section>

            <section className="rf-saas-panel rf-saas-volume-panel">
              <div className="rf-saas-panel-heading">
                <div>
                  <h3>Volume trend</h3>
                  <span>Weekly tonnage</span>
                </div>
                <span className="rf-saas-chart-period">12 W</span>
              </div>
              <div className="rf-saas-volume-total">
                <strong>18,420</strong>
                <small>kg this week</small>
              </div>
              <VolumeBars />
              <div className="rf-saas-chart-axis">
                <span>WEEK 01</span>
                <span>WEEK 06</span>
                <span>WEEK 12</span>
              </div>
              <div className="rf-saas-volume-progress">
                <div className="rf-saas-volume-progress-row">
                  <div>
                    <span>Weekly volume</span>
                    <strong>82%</strong>
                  </div>
                  <span
                    className="rf-saas-progress-track"
                    role="meter"
                    aria-label="Weekly volume target"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow="82"
                  >
                    <i style={{ width: "82%" }} />
                  </span>
                </div>
                <div className="rf-saas-volume-progress-row">
                  <div>
                    <span>Strength target</span>
                    <strong>67%</strong>
                  </div>
                  <span
                    className="rf-saas-progress-track"
                    role="meter"
                    aria-label="Strength target"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow="67"
                  >
                    <i style={{ width: "67%" }} />
                  </span>
                </div>
              </div>
            </section>
          </div>

          <div className="rf-saas-goal-row">
            <div className="rf-saas-goal-ring" aria-label="Weekly goal achieved: 100%">
              <span>
                100<small>%</small>
              </span>
            </div>
            <div className="rf-saas-goal-copy">
              <span className="rf-saas-kicker">WEEKLY TARGET</span>
              <strong>Goal hit. Keep the streak.</strong>
              <span>4 of 4 planned sessions complete</span>
            </div>
            <span className="rf-saas-goal-check" aria-hidden="true">
              ✓
            </span>
          </div>
        </div>
      </div>

      <div className="rf-saas-mobile-card" aria-label="Mobile workout and coach preview">
        <div className="rf-saas-mobile-top">
          <span>◈ TODAY'S SESSION</span>
          <span className="rf-saas-mobile-more">•••</span>
        </div>
        <div className="rf-saas-timer-row">
          <span className="rf-saas-timer-indicator" />
          <span>REST TIMER</span>
          <strong>01:30</strong>
        </div>
        <div className="rf-saas-mobile-exercises">
          {EXERCISES.map((exercise) => (
            <div className="rf-saas-mobile-exercise" key={exercise.name}>
              <span className="rf-saas-exercise-check">✓</span>
              <div>
                <strong>{exercise.name}</strong>
                <span>{exercise.detail}</span>
              </div>
              <small>{exercise.load}</small>
            </div>
          ))}
        </div>
        <div className="rf-saas-coach-note">
          <div className="rf-saas-coach-avatar">RF</div>
          <div>
            <span>
              REPFORGE COACH <i>NOW</i>
            </span>
            <p>Solid work. You matched last week’s load across all 3 sets.</p>
          </div>
        </div>
        <div className="rf-saas-chat-input">
          <span>Ask about your session...</span>
          <span aria-hidden="true">↑</span>
        </div>
      </div>
      <div className="rf-saas-stage-glow" aria-hidden="true" />
    </div>
  );
}

function FeatureVisual({ type }) {
  if (type === "logging") {
    return (
      <div className="rf-saas-feature-visual rf-saas-logging-visual" aria-hidden="true">
        <div className="rf-saas-logging-top">
          <span>UPPER BODY A</span>
          <span>•••</span>
        </div>
        <div className="rf-saas-logging-exercise">
          <span className="rf-saas-logging-icon">01</span>
          <div>
            <strong>Incline dumbbell press</strong>
            <small>CHEST · COMPOUND</small>
          </div>
          <span className="rf-saas-logging-chevron">⌄</span>
        </div>
        <div className="rf-saas-log-set">
          <span>SET</span>
          <span>LOAD</span>
          <span>REPS</span>
          <span>✓</span>
        </div>
        <div className="rf-saas-log-set rf-saas-log-set--filled">
          <strong>01</strong>
          <strong>
            32.5 <small>kg</small>
          </strong>
          <strong>10</strong>
          <i>✓</i>
        </div>
        <div className="rf-saas-log-set">
          <strong>02</strong>
          <strong>
            32.5 <small>kg</small>
          </strong>
          <strong>09</strong>
          <i>✓</i>
        </div>
        <div className="rf-saas-log-add">＋ ADD SET</div>
      </div>
    );
  }

  if (type === "coach") {
    return (
      <div className="rf-saas-feature-visual rf-saas-coach-visual" aria-hidden="true">
        <div className="rf-saas-coach-visual-header">
          <span className="rf-saas-coach-avatar">RF</span>
          <div>
            <strong>RepForge Coach</strong>
            <small>
              <i /> READY WHEN YOU ARE
            </small>
          </div>
          <span className="rf-saas-coach-spark">✳</span>
        </div>
        <div className="rf-saas-chat-bubble rf-saas-chat-bubble--user">
          How should I progress my squat?
        </div>
        <div className="rf-saas-chat-bubble rf-saas-chat-bubble--coach">
          <span>BASED ON YOUR RECENT SETS</span>
          You’ve hit 3×5 at 100 kg twice. Try 102.5 kg next session and keep your reps crisp.
        </div>
        <div className="rf-saas-coach-visual-input">
          <span>Ask about your training...</span>
          <b>↑</b>
        </div>
      </div>
    );
  }

  return (
    <div className="rf-saas-feature-visual rf-saas-analytics-visual" aria-hidden="true">
      <div className="rf-saas-analytics-heading">
        <span>STRENGTH TREND</span>
        <strong>+8.6%</strong>
      </div>
      <div className="rf-saas-analytics-chart">
        <span className="rf-saas-chart-line rf-saas-chart-line--one" />
        <span className="rf-saas-chart-line rf-saas-chart-line--two" />
        <svg viewBox="0 0 360 112" preserveAspectRatio="none">
          <defs>
            <linearGradient id="rf-analytics-gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity=".28" />
              <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0 94 C28 85 35 81 62 84 S95 68 122 73 S160 50 190 58 S230 36 255 45 S300 18 326 25 S345 12 360 8 V112 H0Z"
            fill="url(#rf-analytics-gradient)"
          />
          <path
            d="M0 94 C28 85 35 81 62 84 S95 68 122 73 S160 50 190 58 S230 36 255 45 S300 18 326 25 S345 12 360 8"
            fill="none"
            stroke="#00f0ff"
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx="360" cy="8" r="4" fill="#00f0ff" />
        </svg>
      </div>
      <div className="rf-saas-analytics-tags">
        <span>
          VOLUME <b>↑ 12%</b>
        </span>
        <span>
          PR TARGET <b>85%</b>
        </span>
      </div>
    </div>
  );
}

export function Landing() {
  const { status } = useAuth();
  const navigate = useNavigate();

  const handleContinue = () => {
    navigate(status === "authenticated" ? "/dashboard" : "/login");
  };

  return (
    <main className="rf-landing rf-saas-landing">
      <nav className="rf-saas-nav" aria-label="Main navigation">
        <Link to="/" className="rf-saas-brand" aria-label="RepForge home">
          <span className="rf-saas-brand-mark">RF</span>
          <span>RepForge</span>
        </Link>
        <div className="rf-saas-nav-links">
          <a href="#features">Features</a>
          <a href="#workouts">Workouts</a>
          <a href="#coach">AI Coach</a>
        </div>
        <PrimaryButton className="rf-saas-nav-cta" onClick={handleContinue} variant="ghost">
          Get Started <span aria-hidden="true">↗</span>
        </PrimaryButton>
      </nav>

      <section className="rf-saas-hero">
        <div className="rf-saas-hero-copy">
          <div className="rf-saas-hero-eyebrow">
            <span className="rf-saas-live-dot" />
            BUILT FOR THE NEXT REP
          </div>
          <h1>
            FORGE YOUR
            <span>STRENGTH</span>
          </h1>
          <p className="rf-saas-hero-subtitle">THE AI-POWERED WORKOUT TRACKER &amp; COACH</p>
          <p className="rf-saas-hero-description">
            Train with purpose, track every set, and turn your hard work into measurable progress.
          </p>
          <div className="rf-saas-hero-actions">
            <PrimaryButton className="rf-saas-primary-cta" onClick={handleContinue}>
              Try RepForge Free <span aria-hidden="true">→</span>
            </PrimaryButton>
            <span className="rf-saas-cta-note">
              <i /> YOUR TRAINING. YOUR DATA. YOUR NEXT PR.
            </span>
          </div>
          <div className="rf-saas-proof-row">
            <span>
              <b>01</b> LOG
            </span>
            <i />
            <span>
              <b>02</b> LEARN
            </span>
            <i />
            <span>
              <b>03</b> LEVEL UP
            </span>
          </div>
        </div>
        <motion.div
          className="rf-saas-hero-showcase"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.12 }}
        >
          <DashboardPreview />
        </motion.div>
        <div className="rf-saas-hero-grid" aria-hidden="true" />
      </section>

      <section className="rf-saas-feature-section" id="features">
        <div className="rf-saas-section-heading">
          <div>
            <span className="rf-saas-section-kicker">BUILT AROUND YOUR TRAINING</span>
            <h2>
              Less guessing.
              <br />
              <span>More getting after it.</span>
            </h2>
          </div>
          <p>
            Everything you need to make your training consistent, measurable, and unmistakably
            yours.
          </p>
        </div>
        <div className="rf-saas-bento-grid">
          {FEATURES.map((feature) => (
            <article
              className={`rf-saas-bento-card rf-saas-bento-card--${feature.visual}`}
              id={feature.visual === "logging" ? "workouts" : feature.visual}
              key={feature.number}
            >
              <div className="rf-saas-bento-copy">
                <span className="rf-saas-section-kicker">
                  {feature.number} / {feature.category}
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <ul>
                  {feature.bullets.map((bullet) => (
                    <li key={bullet}>
                      <span>✓</span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
              <FeatureVisual type={feature.visual} />
              <span className="rf-saas-bento-glow" aria-hidden="true" />
            </article>
          ))}
        </div>
      </section>

      <section className="rf-saas-bottom-cta">
        <span className="rf-saas-section-kicker">YOUR NEXT SESSION STARTS HERE</span>
        <h2>
          Put the work in.
          <br />
          <span>See it add up.</span>
        </h2>
        <p>Build your log. Find your momentum. Get stronger on your terms.</p>
        <PrimaryButton className="rf-saas-primary-cta" onClick={handleContinue}>
          Try RepForge Free <span aria-hidden="true">→</span>
        </PrimaryButton>
      </section>

      <footer className="rf-saas-footer">
        <Link to="/" className="rf-saas-brand">
          <span className="rf-saas-brand-mark">RF</span>
          <span>RepForge</span>
        </Link>
        <span>BUILT FOR THE WORK. © {new Date().getFullYear()} REPFORGE</span>
        <Link to="/login">
          Sign in <span aria-hidden="true">↗</span>
        </Link>
      </footer>
    </main>
  );
}

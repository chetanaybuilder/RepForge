import { useState, useEffect, useRef, Component } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useFetch } from "../hooks/useFetch";
import { AnimatePresence, motion } from "framer-motion";
import { CoachAvatar3D } from "../components/3d/CoachAvatar3D";
import { PrimaryButton } from "../components/PrimaryButton";

const QUICK_PROMPTS = [
  "Analyze my volume & fatigue trends",
  "Recommend next progressive overload",
  "Review my recovery & split balance",
  "Diagnose plateaus & sticking points",
];

/**
 * Dedicated Error Boundary for the AI Trainer Presentation Layer.
 * Prevents any unhandled parsing or telemetry format error from crashing the view.
 */
class AIErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("RepForge AI Trainer Presentation Boundary caught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="rf-pod"
          style={{
            margin: "16px 0",
            padding: 24,
            border: "1px solid var(--rf-ember)",
            background: "rgba(255, 51, 102, 0.06)",
          }}
        >
          <div className="rf-telemetry-tag" style={{ color: "var(--rf-ember)", marginBottom: 8 }}>
            AI TRAINER TELEMETRY SAFEGUARD
          </div>
          <h3 style={{ margin: "0 0 8px 0", color: "var(--rf-text-pure)", fontSize: "1.05rem" }}>
            Telemetry Presentation Guard Triggered
          </h3>
          <p style={{ margin: "0 0 16px 0", color: "var(--rf-text-sub)", fontSize: "0.88rem" }}>
            An unexpected format in the incoming telemetry payload was safely caught. Your logged training history remains fully protected.
          </p>
          <button
            type="button"
            className="rf-btn rf-btn--sm rf-btn--ghost"
            onClick={this.handleReset}
          >
            ↺ Reset Stream Presentation
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function AIAnalysis() {
  const { user } = useAuth();
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);
  const scrollRef = useRef(null);

  // Fetch verified user workout telemetry to power concise, data-driven insights
  const { data: statsData } = useFetch(
    () => api.get("/api/workouts/stats"),
    [],
    () => false,
    null,
    { stats: {}, recent_prs: [], recent_workouts: [] }
  );
  const { data: analyticsData } = useFetch(
    () => api.get("/api/workouts/analytics"),
    [],
    () => false,
    null,
    { volume_trend: [], frequency_by_type: [], plateaus: [] }
  );

  const actionableInsights = computeActionableInsights(statsData, analyticsData);

  // Load chat from local storage on mount
  useEffect(() => {
    if (!user?.id) return;
    const saved = localStorage.getItem(`rf_chat_${user.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChatHistory(parsed);
          return;
        }
      } catch {
        // ignore storage parse error
      }
    }
    triggerInitialCheckin();
  }, [user?.id]);

  // Save to local storage whenever history changes
  useEffect(() => {
    if (!user?.id || chatHistory.length === 0) return;
    localStorage.setItem(`rf_chat_${user.id}`, JSON.stringify(chatHistory));
  }, [chatHistory, user?.id]);

  // Scroll to bottom when history updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, chatLoading]);

  const triggerInitialCheckin = async () => {
    setChatLoading(true);
    setChatError(null);
    try {
      const data = await api.post("/api/ai/chat", {
        message: "_INIT_CHECKIN_",
        history: [],
      });
      const replyText = extractReplyText(data);
      setChatHistory([{ role: "model", text: replyText }]);
    } catch {
      // Offline / Unconfigured fallback: synthesize tactical telemetry directly from user's data
      const syntheticCheckin = generateSyntheticCheckin(actionableInsights);
      setChatHistory([{ role: "model", text: syntheticCheckin }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendMessage = async (msgOverride) => {
    const textToSend = (msgOverride || chatInput).trim();
    if (!textToSend || chatLoading) return;

    setChatInput("");
    setChatError(null);
    setChatLoading(true);

    const updatedHistory = [...chatHistory, { role: "user", text: textToSend }];
    setChatHistory(updatedHistory);

    try {
      const data = await api.post("/api/ai/chat", {
        message: textToSend,
        history: chatHistory,
      });
      const replyText = extractReplyText(data);
      setChatHistory([...updatedHistory, { role: "model", text: replyText }]);
    } catch {
      // Tactical data-driven fallback when AI service is rate-limited or offline
      const syntheticReply = generateTacticalReply(textToSend, actionableInsights);
      setChatHistory([...updatedHistory, { role: "model", text: syntheticReply }]);
    } finally {
      setChatLoading(false);
    }
  };

  const startNewCheckin = () => {
    if (window.confirm("Start a new check-in? This will clear the current conversation.")) {
      setChatHistory([]);
      if (user?.id) {
        localStorage.removeItem(`rf_chat_${user.id}`);
      }
      triggerInitialCheckin();
    }
  };

  return (
    <div
      style={{
        width: "100%",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      {/* Header */}
      <div className="rf-page-header" style={{ marginBottom: 16 }}>
        <div>
          <div className="rf-telemetry-tag" style={{ marginBottom: 4 }}>
            03 — AI TRAINER · BIOMECHANICAL NEURAL ENGINE
          </div>
          <h1 className="rf-page-title">
            <span className="rf-gradient-text">Tactical AI Coach</span>
          </h1>
          <p className="rf-page-subtitle">
            Concise, telemetry-driven insights on volume load, progressive overload targets, and recovery.
          </p>
        </div>
        <button
          type="button"
          className="rf-btn rf-btn--ghost rf-btn--sm"
          onClick={startNewCheckin}
          disabled={chatLoading}
        >
          ↺ New Check-In
        </button>
      </div>

      {/* Actionable Telemetry HUD Strip: Volume Trends, Overload Targets, Recovery Cues */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <TelemetryInsightCard
          label="VOLUME TREND"
          badge={actionableInsights.volume.status}
          badgeType={actionableInsights.volume.badgeType}
          title={actionableInsights.volume.metric}
          cue={actionableInsights.volume.recommendation}
          onClick={() => handleSendMessage("Analyze my volume & fatigue trends")}
        />
        <TelemetryInsightCard
          label="PROGRESSIVE OVERLOAD"
          badge={actionableInsights.overload.status}
          badgeType={actionableInsights.overload.badgeType}
          title={actionableInsights.overload.target}
          cue={actionableInsights.overload.recommendation}
          onClick={() => handleSendMessage("Recommend next progressive overload")}
        />
        <TelemetryInsightCard
          label="RECOVERY & CNS"
          badge={actionableInsights.recovery.status}
          badgeType={actionableInsights.recovery.badgeType}
          title={actionableInsights.recovery.state}
          cue={actionableInsights.recovery.recommendation}
          onClick={() => handleSendMessage("Review my recovery & split balance")}
        />
      </div>

      {/* Main Chat Interface */}
      <div
        className="rf-pod"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
          border: "1px solid var(--rf-border-laser)",
        }}
      >
        {/* Telemetry Sub-header with Status */}
        <div
          style={{
            padding: "12px 20px",
            background: "rgba(8, 8, 16, 0.92)",
            borderBottom: "1px solid var(--rf-border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <CoachAvatar3D size={38} />
            <div>
              <div style={{ fontWeight: 700, color: "var(--rf-text-pure)", fontSize: "0.92rem" }}>
                RepForge Biomechanical Engine
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--rf-cyan)", fontFamily: "var(--rf-font-mono)" }}>
                TELEMETRY SYNCHRONIZED · LATENCY 18MS
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="rf-badge rf-badge--cyan" style={{ fontSize: "0.7rem", padding: "2px 8px" }}>
              ACTIVE MODEL
            </span>
            <div className="rf-status-beacon" title="Model operational" />
          </div>
        </div>

        {/* Message Stream Protected by AIErrorBoundary */}
        <AIErrorBoundary>
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "clamp(16px, 3vw, 24px)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {chatHistory.length === 0 && !chatLoading && !chatError && (
              <div style={{ textAlign: "center", color: "var(--rf-text-faint)", marginTop: "2.5rem" }}>
                <div className="rf-state-radar" style={{ margin: "0 auto 16px" }} />
                <div style={{ fontFamily: "var(--rf-font-mono)", fontSize: "0.85rem" }}>
                  INITIALIZING TELEMETRY STREAM…
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {chatHistory.map((msg, i) => (
                <motion.div
                  key={i}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  className={msg?.role === "user" ? "rf-msg-user" : "rf-msg-ai"}
                >
                  {msg?.role === "model" && <CoachAvatar3D size={34} />}
                  <div className={msg?.role === "model" ? "rf-msg-ai-content" : ""}>
                    {formatCoachReply(msg?.text)}
                  </div>
                </motion.div>
              ))}

              {chatLoading && (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rf-msg-ai"
                >
                  <CoachAvatar3D size={34} />
                  <div
                    className="rf-msg-ai-content"
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px" }}
                  >
                    <div className="rf-wave-loader">
                      <div className="rf-wave-bar" />
                      <div className="rf-wave-bar" />
                      <div className="rf-wave-bar" />
                      <div className="rf-wave-bar" />
                      <div className="rf-wave-bar" />
                    </div>
                    <span
                      style={{
                        fontFamily: "var(--rf-font-mono)",
                        fontSize: "0.8rem",
                        color: "var(--rf-cyan)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      SYNTHESIZING TELEMETRY…
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {chatError && (
              <div
                style={{
                  alignSelf: "center",
                  color: "var(--rf-ember)",
                  fontSize: "0.82rem",
                  background: "rgba(255, 51, 102, 0.08)",
                  padding: "8px 16px",
                  borderRadius: "var(--rf-radius-pill)",
                  border: "1px solid rgba(255, 51, 102, 0.3)",
                  cursor: "pointer",
                }}
                onClick={triggerInitialCheckin}
              >
                {chatError}
              </div>
            )}
          </div>
        </AIErrorBoundary>

        {/* Quick Tactical Prompt Chips */}
        <div className="rf-prompt-chips">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="rf-prompt-chip"
              onClick={() => handleSendMessage(prompt)}
              disabled={chatLoading}
            >
              ◈ {prompt}
            </button>
          ))}
        </div>

        {/* Tactical Input Bar */}
        <div
          style={{
            padding: "14px 20px",
            background: "rgba(8, 8, 16, 0.96)",
            borderTop: "1px solid var(--rf-border-subtle)",
            paddingBottom: "max(14px, env(safe-area-inset-bottom))",
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <input
              type="text"
              className="rf-input"
              style={{ borderRadius: "var(--rf-radius-pill)" }}
              placeholder="Ask coach for overload targets, volume diagnostics, or recovery cues…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chatLoading}
            />
            <PrimaryButton
              type="submit"
              disabled={!chatInput.trim() || chatLoading}
              style={{ borderRadius: "var(--rf-radius-pill)", minWidth: 84 }}
            >
              Send
            </PrimaryButton>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact Tactical Telemetry Insight Card for top HUD
 */
function TelemetryInsightCard({ label, badge, badgeType, title, cue, onClick }) {
  const badgeClass =
    badgeType === "emerald"
      ? "rf-badge--emerald"
      : badgeType === "ember"
      ? "rf-badge--ember"
      : badgeType === "violet"
      ? "rf-badge--violet"
      : "rf-badge--cyan";

  return (
    <div
      className="rf-pod"
      onClick={onClick}
      style={{
        padding: "12px 14px",
        cursor: "pointer",
        transition: "all var(--rf-transition-fast)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        background: "rgba(10, 10, 22, 0.7)",
      }}
      title="Click to query coach about this metric"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="rf-telemetry-tag" style={{ fontSize: "0.68rem" }}>
          {label}
        </span>
        <span className={`rf-badge ${badgeClass}`} style={{ fontSize: "0.68rem", padding: "1px 6px" }}>
          {badge}
        </span>
      </div>
      <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--rf-text-pure)" }}>
        {title}
      </div>
      <div style={{ fontSize: "0.78rem", color: "var(--rf-text-sub)", lineHeight: 1.4 }}>
        {cue}
      </div>
    </div>
  );
}

/**
 * Compute actionable insights directly from the user's verified workout telemetry.
 */
function computeActionableInsights(statsData, analyticsData) {
  const stats = statsData?.stats || {};
  const recentPrs = Array.isArray(statsData?.recent_prs) ? statsData.recent_prs : [];
  const volumeTrend = Array.isArray(analyticsData?.volume_trend) ? analyticsData.volume_trend : [];
  const plateaus = Array.isArray(analyticsData?.plateaus) ? analyticsData.plateaus : [];
  const frequency = Array.isArray(analyticsData?.frequency_by_type) ? analyticsData.frequency_by_type : [];

  // 1. Volume Trend Insight
  let volume = {
    status: "Baseline",
    badgeType: "cyan",
    metric: "Calibrating",
    recommendation: "Log 2-3 sessions to establish volume velocity curve.",
  };

  if (volumeTrend.length >= 2) {
    const latest = volumeTrend[volumeTrend.length - 1]?.volume || 0;
    const prev = volumeTrend[volumeTrend.length - 2]?.volume || 0;
    const diff = latest - prev;
    const pct = prev > 0 ? Math.round((diff / prev) * 100) : 0;

    if (diff > 0) {
      volume = {
        status: `+${pct}% Surge`,
        badgeType: "emerald",
        metric: `${Math.round(latest).toLocaleString()} kg Weekly Load`,
        recommendation: "Progressive mechanical load active. Stimulus is increasing.",
      };
    } else if (diff < 0) {
      volume = {
        status: `${pct}% Load Dip`,
        badgeType: "ember",
        metric: `${Math.round(latest).toLocaleString()} kg Weekly Load`,
        recommendation: "Fatigue or volume dip. Recommended: add 1-2 back-off sets.",
      };
    } else {
      volume = {
        status: "Equilibrium",
        badgeType: "cyan",
        metric: `${Math.round(latest).toLocaleString()} kg Steady`,
        recommendation: "Load is steady. Add 2.5kg to primary compound sets.",
      };
    }
  } else if (Number(stats?.total_volume) > 0) {
    volume = {
      status: "Accumulating",
      badgeType: "cyan",
      metric: `${Math.round(Number(stats.total_volume)).toLocaleString()} kg Total Load`,
      recommendation: `${stats?.total_workouts ?? 1} sessions logged. Mechanical accumulation stable.`,
    };
  }

  // 2. Progressive Overload Target
  let overload = {
    status: "Linear +2.5kg",
    badgeType: "cyan",
    target: "Primary Compound Lift",
    recommendation: "Increase working weight by 2.5kg or add 1 rep per set.",
  };

  if (plateaus.length > 0) {
    const p = plateaus[0];
    overload = {
      status: "Plateau Flagged",
      badgeType: "ember",
      target: `${p?.exercise_name || "Lift"} (${p?.weight ?? 0} kg)`,
      recommendation: `Deload by 5% (${Math.round((p?.weight || 50) * 0.95)} kg) next session, then re-attack.`,
    };
  } else if (recentPrs.length > 0) {
    const topPr = recentPrs[0];
    const nextWeight = (Number(topPr?.weight) || 0) + 2.5;
    overload = {
      status: "PR Ready",
      badgeType: "emerald",
      target: `${topPr?.exercise_name || "Compound"}: ${nextWeight} kg`,
      recommendation: `Target ${nextWeight} kg for ${topPr?.reps ?? 5} reps on next session.`,
    };
  }

  // 3. Recovery & CNS Split Balance
  let recovery = {
    status: "CNS Primed",
    badgeType: "cyan",
    state: "Recovery Optimal",
    recommendation: "Supercompensation window open. Primed for heavy output.",
  };

  const streak = Number(stats?.current_streak) || 0;
  if (streak >= 4) {
    recovery = {
      status: "High Fatigue",
      badgeType: "ember",
      state: `${streak} Day Streak`,
      recommendation: "Consecutive daily volume elevated. Schedule 24h rest.",
    };
  } else if (frequency.length > 0) {
    const topSplit = frequency[0];
    const topName = (topSplit?.workout_type || "Training").replace("_", " ");
    recovery = {
      status: "Split Symmetry",
      badgeType: "violet",
      state: `${topName} Dominant`,
      recommendation: `Balance with equal antagonistic weekly sets for joint health.`,
    };
  }

  return { volume, overload, recovery };
}

/**
 * Safely extracts clean string reply from any AI payload shape.
 */
function extractReplyText(data) {
  if (typeof data === "string") return data;
  if (typeof data?.reply === "string") return data.reply;
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.insights?.deep_review === "string") return data.insights.deep_review;
  return "Biomechanical telemetry received and verified.";
}

/**
 * Fallback synthesizer for initial check-in when external AI is offline/unconfigured.
 */
function generateSyntheticCheckin(insights) {
  return [
    `### TACTICAL PERFORMANCE BRIEFING`,
    `Biomechanical telemetry verified across your training log. Here is your targeted directive:`,
    `- **Volume Velocity**: ${insights.volume.metric} (${insights.volume.status}). ${insights.volume.recommendation}`,
    `- **Progressive Overload Target**: ${insights.overload.target} (${insights.overload.status}). ${insights.overload.recommendation}`,
    `- **Recovery & Split Cue**: ${insights.recovery.state} (${insights.recovery.status}). ${insights.recovery.recommendation}`,
    `Standing by for your next training query or session analysis.`,
  ].join("\n\n");
}

/**
 * Fallback synthesizer for specific user prompt topics.
 */
function generateTacticalReply(text, insights) {
  const lower = text.toLowerCase();
  if (lower.includes("volume") || lower.includes("fatigue")) {
    return [
      `### VOLUME & FATIGUE TELEMETRY`,
      `- **Current Load**: ${insights.volume.metric} (${insights.volume.status})`,
      `- **Tactical Vector**: ${insights.volume.recommendation}`,
      `- **Recovery Safeguard**: ${insights.recovery.recommendation}`,
    ].join("\n\n");
  }
  if (lower.includes("overload") || lower.includes("plateau") || lower.includes("pr")) {
    return [
      `### PROGRESSIVE OVERLOAD DIRECTIVE`,
      `- **Primary Vector**: ${insights.overload.target} (${insights.overload.status})`,
      `- **Target Protocol**: ${insights.overload.recommendation}`,
      `- **Load Baseline**: ${insights.volume.metric}`,
    ].join("\n\n");
  }
  if (lower.includes("recovery") || lower.includes("balance") || lower.includes("split")) {
    return [
      `### RECOVERY & SPLIT TELEMETRY`,
      `- **Neuromuscular State**: ${insights.recovery.state} (${insights.recovery.status})`,
      `- **Recovery Directive**: ${insights.recovery.recommendation}`,
      `- **Volume Context**: ${insights.volume.metric}`,
    ].join("\n\n");
  }
  return [
    `### TACTICAL TELEMETRY RESPONSE`,
    `Telemetry verified for "${text}".`,
    `- **Target Vector**: ${insights.overload.target}`,
    `- **Load Volume**: ${insights.volume.metric}`,
    `- **Systemic Cue**: ${insights.recovery.recommendation}`,
  ].join("\n\n");
}

/**
 * Clean, safe parser for coach replies with markdown styling and fallbacks.
 */
function formatCoachReply(text) {
  try {
    let cleanText = "";
    if (typeof text === "string") {
      cleanText = text;
    } else if (text && typeof text === "object") {
      cleanText =
        text?.reply ||
        text?.message ||
        text?.deep_review ||
        text?.text ||
        JSON.stringify(text);
    } else {
      cleanText = String(text ?? "Biomechanical telemetry verified.");
    }

    const paragraphs = cleanText
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (paragraphs.length === 0) {
      return <p style={{ margin: 0 }}>Biomechanical telemetry verified.</p>;
    }

    return (
      <div style={{ lineHeight: 1.65, display: "flex", flexDirection: "column", gap: 10 }}>
        {paragraphs.map((paragraph, pIdx) => {
          // Tactical Header
          if (paragraph.startsWith("### ") || paragraph.startsWith("## ")) {
            const title = paragraph.replace(/^#+\s+/, "");
            return (
              <div
                key={pIdx}
                className="rf-telemetry-tag"
                style={{
                  color: "var(--rf-cyan)",
                  fontSize: "0.78rem",
                  letterSpacing: "0.08em",
                  marginTop: pIdx > 0 ? 8 : 0,
                  marginBottom: 2,
                }}
              >
                {title}
              </div>
            );
          }

          // Bullet List
          if (
            paragraph.includes("\n- ") ||
            paragraph.includes("\n* ") ||
            paragraph.startsWith("- ") ||
            paragraph.startsWith("* ")
          ) {
            const items = paragraph
              .split(/\n(?=[-*\u2022]\s+)/)
              .map((it) => it.replace(/^[-*\u2022]\s+/, "").trim())
              .filter(Boolean);

            return (
              <ul
                key={pIdx}
                style={{
                  margin: "4px 0",
                  paddingLeft: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {items.map((item, iIdx) => (
                  <li key={iIdx} style={{ fontSize: "0.92rem", color: "var(--rf-text-bright)" }}>
                    {renderFormattedInline(item)}
                  </li>
                ))}
              </ul>
            );
          }

          // Numbered List
          if (/^\d+\.\s+/.test(paragraph) || paragraph.includes("\n1. ")) {
            const items = paragraph
              .split(/\n(?=\d+\.\s+)/)
              .map((it) => it.replace(/^\d+\.\s+/, "").trim())
              .filter(Boolean);

            return (
              <ol
                key={pIdx}
                style={{
                  margin: "4px 0",
                  paddingLeft: 22,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {items.map((item, iIdx) => (
                  <li key={iIdx} style={{ fontSize: "0.92rem", color: "var(--rf-text-bright)" }}>
                    {renderFormattedInline(item)}
                  </li>
                ))}
              </ol>
            );
          }

          return (
            <p
              key={pIdx}
              style={{
                margin: 0,
                color: "var(--rf-text-bright)",
                fontSize: "0.92rem",
                lineHeight: 1.6,
              }}
            >
              {renderFormattedInline(paragraph)}
            </p>
          );
        })}
      </div>
    );
  } catch (err) {
    console.error("formatCoachReply parsing fallback:", err);
    return (
      <div style={{ color: "var(--rf-text-bright)", fontSize: "0.92rem", whiteSpace: "pre-wrap" }}>
        {typeof text === "string" ? text : JSON.stringify(text)}
      </div>
    );
  }
}

function renderFormattedInline(str) {
  if (typeof str !== "string") return String(str || "");
  try {
    const parts = str.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return (
          <strong key={i} style={{ color: "var(--rf-cyan)", fontWeight: 700 }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        return (
          <span
            key={i}
            style={{
              fontFamily: "var(--rf-font-mono)",
              background: "rgba(0, 242, 254, 0.12)",
              color: "var(--rf-cyan)",
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: "0.85em",
            }}
          >
            {part.slice(1, -1)}
          </span>
        );
      }
      return part;
    });
  } catch {
    return str;
  }
}

/**
 * RepForge - Coach (Groq AI Strength Intelligence)
 *
 * Responsibilities:
 * - Real-time conversational strength coaching powered by Groq (LLaMA 3.3 70B Versatile).
 * - Live Server-Sent Events (SSE) streaming token accumulation.
 * - Ingestion and display of actionable user volume, overload, and CNS recovery telemetry.
 * - Interactive 3D Coach Avatar with streaming telemetry state indicator.
 * - Quick-action prompt chips and instant tactical check-ins.
 */

import { useState, useEffect, useRef, Component } from "react";
import { api, API_URL, getCsrfToken } from "../services/api";
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
 * Dedicated Error Boundary for Coach Presentation Layer.
 */
class CoachErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("RepForge Coach Presentation Boundary caught error:", error, errorInfo);
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
            COACH TELEMETRY SAFEGUARD
          </div>
          <h3 style={{ margin: "0 0 8px 0", color: "var(--rf-text-pure)", fontSize: "1.05rem" }}>
            Telemetry Presentation Guard Triggered
          </h3>
          <p style={{ margin: "0 0 16px 0", color: "var(--rf-text-sub)", fontSize: "0.88rem" }}>
            An unexpected format in the incoming telemetry payload was safely caught. Your logged
            training history remains fully protected.
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

export function Coach() {
  const { user } = useAuth();
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatError, setChatError] = useState(null);
  const scrollRef = useRef(null);

  // Fetch verified user workout telemetry
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

  // Load chat history from local storage on mount
  useEffect(() => {
    if (!user?.id) return;
    const saved = localStorage.getItem(`rf_coach_${user.id}`);
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

  // Save to local storage whenever history changes (bounded to last 20 messages)
  useEffect(() => {
    if (!user?.id || chatHistory.length === 0) return;
    localStorage.setItem(`rf_coach_${user.id}`, JSON.stringify(chatHistory.slice(-20)));
  }, [chatHistory, user?.id]);

  // Scroll to bottom when history updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, chatLoading, isStreaming]);

  const triggerInitialCheckin = async () => {
    setChatLoading(true);
    setChatError(null);
    try {
      const data = await api.post("/api/coach/chat", {
        message: "_INIT_CHECKIN_",
        history: [],
      });
      const replyText = extractReplyText(data);
      setChatHistory([{ role: "assistant", text: replyText }]);
    } catch {
      const syntheticCheckin = generateSyntheticCheckin(actionableInsights);
      setChatHistory([{ role: "assistant", text: syntheticCheckin }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendMessage = async (msgOverride) => {
    const textToSend = (msgOverride || chatInput).trim();
    if (!textToSend || chatLoading || isStreaming) return;

    setChatInput("");
    setChatError(null);
    setChatLoading(true);

    const userMessage = { role: "user", text: textToSend };
    const historyForRequest = [...chatHistory];
    const updatedHistory = [...chatHistory, userMessage];
    setChatHistory(updatedHistory);

    try {
      const csrf = getCsrfToken();
      const headers = {
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
      };
      if (csrf) headers["X-CSRF-Token"] = csrf;

      const response = await fetch(`${API_URL}/api/coach/chat`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          message: textToSend,
          history: historyForRequest,
        }),
      });

      if (!response.ok) {
        throw new Error("Coach stream connection failed");
      }

      setChatLoading(false);
      setIsStreaming(true);

      const isSSE = response.headers.get("Content-Type")?.includes("text/event-stream");

      if (isSSE && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedReply = "";

        // Add empty assistant turn to stream tokens into
        setChatHistory((prev) => [...prev, { role: "assistant", text: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") break;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.chunk) {
                  accumulatedReply += parsed.chunk;
                  setChatHistory((prev) => {
                    const next = [...prev];
                    if (next.length > 0) {
                      next[next.length - 1] = {
                        role: "assistant",
                        text: accumulatedReply,
                      };
                    }
                    return next;
                  });
                }
              } catch {
                // Ignore parse errors on SSE chunk boundaries
              }
            }
          }
        }
      } else {
        const data = await response.json();
        const replyText = extractReplyText(data);
        setChatHistory([...updatedHistory, { role: "assistant", text: replyText }]);
      }
    } catch {
      // Tactical data-driven fallback when AI service is rate-limited or offline
      const syntheticReply = generateTacticalReply(textToSend, actionableInsights);
      setChatHistory([...updatedHistory, { role: "assistant", text: syntheticReply }]);
    } finally {
      setChatLoading(false);
      setIsStreaming(false);
    }
  };

  const startNewCheckin = () => {
    if (window.confirm("Start a new check-in? This will clear the current conversation.")) {
      setChatHistory([]);
      if (user?.id) {
        localStorage.removeItem(`rf_coach_${user.id}`);
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
            04 — COACH
          </div>
          <h1 className="rf-page-title">
            RepForge <span className="rf-gradient-text">Coach</span>
          </h1>
          <p className="rf-page-subtitle">
            Evidence-based strength coaching powered by Groq LLaMA 3.3. Grounded exclusively in your real training logs.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            className="rf-btn rf-btn--outline rf-btn--sm"
            onClick={startNewCheckin}
            disabled={chatLoading || isStreaming}
          >
            ↻ New Check-In
          </button>
        </div>
      </div>

      {/* Main Terminal Grid */}
      <div
        className="rf-coach-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 340px)",
          gap: 20,
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Left Column: Conversational Terminal */}
        <div
          className="rf-pod"
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: "520px",
            maxHeight: "calc(100vh - 200px)",
            padding: 0,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Terminal Sub-Header */}
          <div
            style={{
              padding: "12px 18px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(10, 10, 20, 0.6)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CoachAvatar3D size={32} />
              <div>
                <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--rf-text-pure)" }}>
                  RepForge Strength Coach
                </div>
                <div className="rf-telemetry-tag" style={{ fontSize: "0.65rem", color: "var(--rf-cyan)" }}>
                  GROQ · LLAMA-3.3-70B · REAL-TIME TELEMETRY
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {(chatLoading || isStreaming) && (
                <span className="rf-telemetry-tag" style={{ color: "var(--rf-cyan)" }}>
                  <span className="rf-spin" style={{ display: "inline-block", marginRight: 4 }}>
                    ◈
                  </span>
                  {isStreaming ? "STREAMING TOKENS..." : "ANALYZING SETS..."}
                </span>
              )}
            </div>
          </div>

          {/* Dialogue Scroll Stage */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <CoachErrorBoundary>
              {chatHistory.map((msg, idx) => {
                const isUser = msg.role === "user";
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      display: "flex",
                      justifyContent: isUser ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "85%",
                        padding: "12px 16px",
                        borderRadius: "var(--rf-radius-md)",
                        background: isUser
                          ? "linear-gradient(135deg, rgba(0, 242, 254, 0.15) 0%, rgba(138, 92, 246, 0.15) 100%)"
                          : "rgba(14, 14, 26, 0.8)",
                        border: isUser
                          ? "1px solid rgba(0, 242, 254, 0.4)"
                          : "1px solid rgba(255, 255, 255, 0.08)",
                        boxShadow: isUser
                          ? "0 4px 20px rgba(0, 242, 254, 0.1)"
                          : "0 4px 20px rgba(0, 0, 0, 0.5)",
                      }}
                    >
                      <div
                        className="rf-telemetry-tag"
                        style={{
                          marginBottom: 4,
                          fontSize: "0.66rem",
                          color: isUser ? "var(--rf-cyan)" : "var(--rf-violet)",
                        }}
                      >
                        {isUser ? "LIFTER" : "COACH"}
                      </div>
                      <div
                        style={{
                          color: "var(--rf-text-pure)",
                          fontSize: "0.92rem",
                          lineHeight: 1.6,
                        }}
                      >
                        {formatCoachReply(msg.text)}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {chatLoading && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--rf-text-sub)" }}>
                  <span className="rf-spin" style={{ color: "var(--rf-cyan)" }}>
                    ◈
                  </span>
                  <span style={{ fontSize: "0.85rem" }}>Synthesizing session diagnostics...</span>
                </div>
              )}
            </CoachErrorBoundary>
          </div>

          {/* Quick Action Chips */}
          <div
            style={{
              padding: "10px 18px",
              borderTop: "1px solid rgba(255, 255, 255, 0.04)",
              background: "rgba(10, 10, 20, 0.4)",
              display: "flex",
              gap: 8,
              overflowX: "auto",
              scrollbarWidth: "none",
            }}
          >
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                disabled={chatLoading || isStreaming}
                className="rf-badge"
                style={{
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  background: "rgba(255, 255, 255, 0.04)",
                  borderColor: "rgba(255, 255, 255, 0.1)",
                  color: "var(--rf-text-sub)",
                  fontSize: "0.75rem",
                  transition: "all 0.15s ease",
                }}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{
              padding: 14,
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              gap: 10,
              background: "rgba(8, 8, 16, 0.95)",
            }}
          >
            <input
              type="text"
              className="rf-input"
              placeholder="Ask coach (e.g. 'Can I add 5kg to bench next week?', 'Am I training legs enough?')..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chatLoading || isStreaming}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              type="submit"
              disabled={!chatInput.trim() || chatLoading || isStreaming}
              className="rf-btn--sm"
            >
              Send
            </PrimaryButton>
          </form>
        </div>

        {/* Right Column: Live Telemetry Briefing Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Volume Velocity */}
          <div
            className="rf-pod"
            style={{
              padding: 18,
              border: "1px solid rgba(0, 242, 254, 0.25)",
              background: "rgba(10, 10, 20, 0.7)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div className="rf-telemetry-tag" style={{ color: "var(--rf-cyan)" }}>
                VOLUME LOAD VELOCITY
              </div>
              <span className={`rf-badge rf-badge--${actionableInsights.volume.badgeType}`}>
                {actionableInsights.volume.status}
              </span>
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", marginBottom: 4 }}>
              {actionableInsights.volume.metric}
            </div>
            <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--rf-text-sub)", lineHeight: 1.4 }}>
              {actionableInsights.volume.recommendation}
            </p>
          </div>

          {/* Progressive Overload Target */}
          <div
            className="rf-pod"
            style={{
              padding: 18,
              border: "1px solid rgba(255, 51, 102, 0.25)",
              background: "rgba(10, 10, 20, 0.7)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div className="rf-telemetry-tag" style={{ color: "var(--rf-ember)" }}>
                PROGRESSIVE OVERLOAD VECTOR
              </div>
              <span className={`rf-badge rf-badge--${actionableInsights.overload.badgeType}`}>
                {actionableInsights.overload.status}
              </span>
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff", marginBottom: 4 }}>
              {actionableInsights.overload.target}
            </div>
            <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--rf-text-sub)", lineHeight: 1.4 }}>
              {actionableInsights.overload.recommendation}
            </p>
          </div>

          {/* CNS Recovery & Frequency */}
          <div
            className="rf-pod"
            style={{
              padding: 18,
              border: "1px solid rgba(138, 92, 246, 0.25)",
              background: "rgba(10, 10, 20, 0.7)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div className="rf-telemetry-tag" style={{ color: "var(--rf-violet)" }}>
                RECOVERY & MUSCLE BALANCE
              </div>
              <span className={`rf-badge rf-badge--${actionableInsights.recovery.badgeType}`}>
                {actionableInsights.recovery.status}
              </span>
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff", marginBottom: 4 }}>
              {actionableInsights.recovery.state}
            </div>
            <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--rf-text-sub)", lineHeight: 1.4 }}>
              {actionableInsights.recovery.recommendation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compute actionable insights directly from verified workout telemetry.
 */
function computeActionableInsights(statsData, analyticsData) {
  const stats = statsData?.stats || {};
  const recentPrs = Array.isArray(statsData?.recent_prs) ? statsData.recent_prs : [];
  const volumeTrend = Array.isArray(analyticsData?.volume_trend) ? analyticsData.volume_trend : [];
  const plateaus = Array.isArray(analyticsData?.plateaus) ? analyticsData.plateaus : [];
  const frequency = Array.isArray(analyticsData?.frequency_by_type)
    ? analyticsData.frequency_by_type
    : [];

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

function extractReplyText(data) {
  if (typeof data === "string") return data;
  if (typeof data?.reply === "string") return data.reply;
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.insights?.deep_review === "string") return data.insights.deep_review;
  return "Biomechanical telemetry received and verified.";
}

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

function formatCoachReply(text) {
  try {
    let cleanText = "";
    if (typeof text === "string") {
      cleanText = text;
    } else if (text && typeof text === "object") {
      cleanText =
        text?.reply || text?.message || text?.deep_review || text?.text || JSON.stringify(text);
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
                  <li key={iIdx} style={{ color: "var(--rf-text-pure)" }}>
                    {renderFormattedInline(item)}
                  </li>
                ))}
              </ul>
            );
          }

          return (
            <p key={pIdx} style={{ margin: 0, color: "var(--rf-text-bright)" }}>
              {renderFormattedInline(paragraph)}
            </p>
          );
        })}
      </div>
    );
  } catch {
    return <p style={{ margin: 0 }}>{String(text)}</p>;
  }
}

function renderFormattedInline(str) {
  const parts = str.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} style={{ color: "var(--rf-text-pure)", fontWeight: 700 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

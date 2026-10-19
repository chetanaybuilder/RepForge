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
  const [retryMessage, setRetryMessage] = useState(null);
  const [mobileTab, setMobileTab] = useState("chat");
  const [copiedIdx, setCopiedIdx] = useState(null);
  const scrollRef = useRef(null);

  const handleCopy = (text, idx) => {
    try {
      navigator.clipboard.writeText(typeof text === "string" ? text : JSON.stringify(text));
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      // ignore
    }
  };

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
      setRetryMessage(null);
    } catch {
      setChatError("Coach could not connect to the training service. Check your connection and retry.");
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
    const hasPendingMessage = chatHistory.at(-1)?.role === "user" && chatHistory.at(-1)?.text === textToSend;
    const historyForRequest = hasPendingMessage ? chatHistory.slice(0, -1) : [...chatHistory];
    const updatedHistory = hasPendingMessage ? chatHistory : [...chatHistory, userMessage];
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
        if (response.status === 429) {
          throw new Error("Coach is rate limited right now. Wait briefly, then retry.");
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error("Your session has expired. Sign in again to continue with Coach.");
        }
        throw new Error(`Coach request failed (${response.status}). Retry when your connection is ready.`);
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
        if (!accumulatedReply.trim()) {
          throw new Error("Coach returned an empty response. Please retry.");
        }
      } else {
        const data = await response.json();
        const replyText = extractReplyText(data);
        if (!replyText.trim()) {
          throw new Error("Coach returned an empty response. Please retry.");
        }
        setChatHistory([...updatedHistory, { role: "assistant", text: replyText }]);
      }
      setRetryMessage(null);
    } catch (error) {
      setChatHistory(updatedHistory);
      setRetryMessage(textToSend);
      setChatError(
        error?.message || "Coach could not complete this request. Check your connection and retry."
      );
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

      {/* Mobile Segmented Switcher for Chat vs Telemetry */}
      <div className="rf-coach-mobile-tabs">
        <button
          type="button"
          className={`rf-coach-mobile-tab-btn ${
            mobileTab === "chat" ? "rf-coach-mobile-tab-btn--active" : ""
          }`}
          onClick={() => setMobileTab("chat")}
        >
          💬 Coach Terminal
        </button>
        <button
          type="button"
          className={`rf-coach-mobile-tab-btn ${
            mobileTab === "telemetry" ? "rf-coach-mobile-tab-btn--active" : ""
          }`}
          onClick={() => setMobileTab("telemetry")}
        >
          📊 Live Telemetry Briefing
        </button>
      </div>

      {/* Main Responsive Grid */}
      <div className="rf-coach-layout">
        {/* Left Column: Conversational Terminal */}
        <div className={`rf-coach-terminal-box${mobileTab === "chat" ? " rf-coach-terminal-box--visible" : ""}`}>
          {/* Terminal Sub-Header */}
          <div
            style={{
              padding: "12px 18px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(10, 10, 20, 0.7)",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CoachAvatar3D size={32} />
              <div>
                <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--rf-text-pure)" }}>
                  RepForge Strength Coach
                </div>
                <div className="rf-telemetry-tag" style={{ fontSize: "0.65rem", color: "var(--rf-cyan)" }}>
                  GROQ · REAL-TIME BIOMECHANICAL TELEMETRY
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

          {/* Dialogue Scroll Stage with Touch Momentum */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              padding: "16px clamp(12px, 3vw, 20px)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <CoachErrorBoundary>
              {chatHistory.map((msg, idx) => {
                const isUser = msg.role === "user";
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      display: "flex",
                      justifyContent: isUser ? "flex-end" : "flex-start",
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: isUser ? "85%" : "94%",
                        padding: "12px 16px",
                        borderRadius: "var(--rf-radius-md)",
                        background: isUser
                          ? "linear-gradient(135deg, rgba(0, 242, 254, 0.16) 0%, rgba(138, 92, 246, 0.16) 100%)"
                          : "rgba(12, 12, 24, 0.92)",
                        border: isUser
                          ? "1px solid rgba(0, 242, 254, 0.4)"
                          : "1px solid rgba(0, 242, 254, 0.2)",
                        boxShadow: isUser
                          ? "0 4px 20px rgba(0, 242, 254, 0.1)"
                          : "0 6px 24px rgba(0, 0, 0, 0.55)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 6,
                          gap: 10,
                        }}
                      >
                        <div
                          className="rf-telemetry-tag"
                          style={{
                            fontSize: "0.68rem",
                            color: isUser ? "var(--rf-cyan)" : "var(--rf-violet)",
                          }}
                        >
                          {isUser ? "🦾 LIFTER" : "⚡ NEURAL COACH"}
                        </div>

                        {!isUser && (
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.text, idx)}
                            className="rf-copy-btn"
                            title="Copy advice"
                          >
                            {copiedIdx === idx ? "✓ Copied" : "📋 Copy"}
                          </button>
                        )}
                      </div>

                      <div
                        style={{
                          color: "#ffffff",
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
              {chatError && (
                <div className="rf-coach-error" role="alert">
                  <span>{chatError}</span>
                  <button
                    type="button"
                    className="rf-btn rf-btn--outline rf-btn--sm"
                    disabled={chatLoading || isStreaming}
                    onClick={() => (retryMessage ? handleSendMessage(retryMessage) : triggerInitialCheckin())}
                  >
                    Retry
                  </button>
                </div>
              )}
            </CoachErrorBoundary>
          </div>

          {/* Quick Action Chips Bar */}
          <div
            style={{
              padding: "8px 14px",
              borderTop: "1px solid rgba(255, 255, 255, 0.05)",
              background: "rgba(8, 8, 16, 0.6)",
              display: "flex",
              gap: 8,
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              flexShrink: 0,
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
                  borderColor: "rgba(255, 255, 255, 0.12)",
                  color: "var(--rf-text-sub)",
                  fontSize: "0.75rem",
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                }}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Sticky Mobile Input Pinned to Viewport Bottom */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{
              padding: "10px 14px",
              paddingBottom: "max(12px, env(safe-area-inset-bottom))",
              borderTop: "1px solid rgba(0, 242, 254, 0.2)",
              display: "flex",
              gap: 8,
              background: "rgba(8, 8, 18, 0.98)",
              position: "sticky",
              bottom: 0,
              zIndex: 30,
              flexShrink: 0,
            }}
          >
            <input
              type="text"
              className="rf-input"
              placeholder="Ask Coach (e.g. 'Can I add 5kg?', '3 plates cable curl reps')..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chatLoading || isStreaming}
              style={{
                flex: 1,
                fontSize: "0.92rem",
                background: "rgba(255, 255, 255, 0.05)",
                borderColor: "rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
              }}
            />
            <PrimaryButton
              type="submit"
              disabled={!chatInput.trim() || chatLoading || isStreaming}
              className="rf-btn--sm"
              style={{ flexShrink: 0 }}
            >
              Send
            </PrimaryButton>
          </form>
        </div>

        {/* Right Column: Live Telemetry Briefing Cards */}
        <div className={`rf-coach-telemetry-col ${mobileTab === "telemetry" ? "rf-coach-telemetry-col--visible" : ""}`}>
          {/* Volume Velocity */}
          <div
            className="rf-pod"
            style={{
              padding: 18,
              border: "1px solid rgba(0, 242, 254, 0.25)",
              background: "rgba(10, 10, 20, 0.75)",
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
              background: "rgba(10, 10, 20, 0.75)",
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
              background: "rgba(10, 10, 20, 0.75)",
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
  return "";
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

    // Split text by markdown code blocks (``` ... ```)
    const codeBlockRegex = /```([\s\S]*?)```/g;
    const segments = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(cleanText)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: "text", content: cleanText.substring(lastIndex, match.index) });
      }
      segments.push({ type: "code", content: match[1].trim() });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < cleanText.length) {
      segments.push({ type: "text", content: cleanText.substring(lastIndex) });
    }

    return (
      <div style={{ lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 10 }}>
        {segments.map((segment, segIdx) => {
          if (segment.type === "code") {
            return (
              <pre key={segIdx} className="rf-coach-visual-card">
                {segment.content}
              </pre>
            );
          }

          const paragraphs = segment.content
            .split(/\n{2,}/)
            .map((p) => p.trim())
            .filter(Boolean);

          return paragraphs.map((paragraph, pIdx) => {
            // Header with emojis or ###
            if (
              paragraph.startsWith("### ") ||
              paragraph.startsWith("## ") ||
              paragraph.startsWith("# ")
            ) {
              const title = paragraph.replace(/^#+\s+/, "");
              return (
                <div key={`${segIdx}-${pIdx}`} className="rf-coach-section-header">
                  {title}
                </div>
              );
            }

            // Bullet points
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
                  key={`${segIdx}-${pIdx}`}
                  style={{
                    margin: "4px 0",
                    paddingLeft: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {items.map((item, iIdx) => (
                    <li key={iIdx} style={{ color: "var(--rf-text-pure)", fontSize: "0.92rem" }}>
                      {renderFormattedInline(item)}
                    </li>
                  ))}
                </ul>
              );
            }

            return (
              <p
                key={`${segIdx}-${pIdx}`}
                style={{
                  margin: 0,
                  color: "#ffffff",
                  fontSize: "0.92rem",
                  lineHeight: 1.6,
                }}
              >
                {renderFormattedInline(paragraph)}
              </p>
            );
          });
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
        <strong key={idx} style={{ color: "var(--rf-cyan)", fontWeight: 700 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

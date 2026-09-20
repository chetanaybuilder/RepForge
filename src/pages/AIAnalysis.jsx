import { useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { AnimatePresence, motion } from "framer-motion";
import { CoachAvatar3D } from "../components/3d/CoachAvatar3D";
import { PrimaryButton } from "../components/PrimaryButton";

const QUICK_PROMPTS = [
  "Analyze volume & fatigue trends",
  "Where are my plateaus?",
  "Recommend next progressive overload",
  "Review my Push vs Pull split",
];

export function AIAnalysis() {
  const { user } = useAuth();
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);
  const scrollRef = useRef(null);

  // Load from local storage on mount
  useEffect(() => {
    if (!user?.id) return;
    const saved = localStorage.getItem(`rf_chat_${user.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setChatHistory(parsed);
          return;
        }
      } catch {
        // ignore parse error
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
      const replyText =
        typeof data?.reply === "string"
          ? data.reply
          : data?.message || "Biomechanical neural model ready.";
      setChatHistory([{ role: "model", text: replyText }]);
    } catch {
      setChatError("Neural diagnostic service offline or rate-limited. Tap to retry.");
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
      const replyText =
        typeof data?.reply === "string"
          ? data.reply
          : data?.message || "Telemetry received and synthesized.";
      setChatHistory([...updatedHistory, { role: "model", text: replyText }]);
    } catch (err) {
      setChatError(err.message || "Failed to communicate with neural coach.");
      setChatHistory(chatHistory);
      setChatInput(textToSend);
    } finally {
      setChatLoading(false);
    }
  };

  const startNewCheckin = () => {
    if (window.confirm("Purge active conversation memory and initiate a fresh biomechanical scan?")) {
      setChatHistory([]);
      if (user?.id) {
        localStorage.removeItem(`rf_chat_${user.id}`);
      }
      triggerInitialCheckin();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Page Header */}
      <div className="rf-page-header" style={{ marginBottom: 16 }}>
        <div>
          <div className="rf-telemetry-tag" style={{ marginBottom: 4 }}>
            NEURAL BIOMECHANICAL INTELLIGENCE LAYER
          </div>
          <h1 className="rf-page-title">
            <span className="rf-gradient-text">AI Coach</span> Telemetry
          </h1>
          <p className="rf-page-subtitle">
            Gemini parses your real training history to identify fatigue, momentum, and overload directives.
          </p>
        </div>
        <button
          type="button"
          className="rf-btn rf-btn--ghost rf-btn--sm"
          onClick={startNewCheckin}
          disabled={chatLoading}
        >
          ↺ Reset Conversation
        </button>
      </div>

      {/* AI Command Center Box */}
      <div className="rf-ai-command-center">
        {/* Telemetry Header */}
        <div className="rf-ai-header">
          <div className="rf-ai-identity">
            <CoachAvatar3D size={42} />
            <div className="rf-ai-meta">
              <div className="rf-ai-title">
                <span>RepForge Neural Core</span>
                <span className="rf-badge rf-badge--cyan" style={{ padding: "2px 8px", fontSize: "0.68rem" }}>
                  Active
                </span>
              </div>
              <div className="rf-ai-status-row">
                <span>LATENCY: 12ms</span>
                <span>·</span>
                <span>PRECISION: MAX</span>
              </div>
            </div>
          </div>

          <div className="rf-status-beacon" title="Model operational" />
        </div>

        {/* Message Stream */}
        <div ref={scrollRef} className="rf-ai-stream">
          {chatHistory.length === 0 && !chatLoading && !chatError && (
            <div style={{ textAlign: "center", color: "var(--rf-text-faint)", marginTop: "3rem" }}>
              <div className="rf-state-radar" style={{ margin: "0 auto 16px" }} />
              <div>Initializing Neural Feedback Subsystem…</div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {chatHistory.map((msg, i) => (
              <motion.div
                key={i}
                layout
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className={msg.role === "user" ? "rf-msg-user" : "rf-msg-ai"}
              >
                {msg.role === "model" && <CoachAvatar3D size={36} />}
                <div className={msg.role === "model" ? "rf-msg-ai-content" : ""}>
                  {formatCoachReply(msg.text)}
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
                <CoachAvatar3D size={36} />
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
                      fontSize: "0.82rem",
                      color: "var(--rf-cyan)",
                    }}
                  >
                    SYNTHESIZING TRAINING TELEMETRY…
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
                fontSize: "0.84rem",
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

        {/* Quick Suggestion Chips */}
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
        <div className="rf-ai-input-bar">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="rf-ai-input-wrapper"
          >
            <input
              type="text"
              className="rf-input"
              style={{ borderRadius: "var(--rf-radius-pill)" }}
              placeholder="Query coach on intensity, progression, fatigue…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chatLoading}
            />
            <PrimaryButton
              type="submit"
              disabled={!chatInput.trim() || chatLoading}
              style={{ borderRadius: "var(--rf-radius-pill)" }}
            >
              Execute
            </PrimaryButton>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * Format coach response with structured telemetry styling
 */
function formatCoachReply(text) {
  if (typeof text !== "string") {
    text = text?.reply || text?.message || JSON.stringify(text || "");
  }

  return (
    <div style={{ lineHeight: 1.65 }}>
      {text.split("\n\n").map((paragraph, pIdx) => {
        // Detect bullet points or structured advice
        if (paragraph.startsWith("- ") || paragraph.startsWith("* ")) {
          const items = paragraph.split("\n").filter(Boolean);
          return (
            <ul key={pIdx} style={{ margin: "8px 0", paddingLeft: 20 }}>
              {items.map((item, iIdx) => (
                <li key={iIdx} style={{ marginBottom: 6 }}>
                  {renderFormattedInline(item.replace(/^[-*]\s+/, ""))}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={pIdx} style={{ margin: "0 0 10px 0", color: "inherit", fontSize: "inherit" }}>
            {renderFormattedInline(paragraph)}
          </p>
        );
      })}
    </div>
  );
}

function renderFormattedInline(str) {
  // Simple bold highlighting for key takeaways
  const parts = str.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} style={{ color: "var(--rf-cyan)", fontWeight: 700 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

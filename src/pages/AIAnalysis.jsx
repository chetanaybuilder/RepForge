import { useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { AnimatePresence, motion } from "framer-motion";
import { CoachAvatar3D } from "../components/3d/CoachAvatar3D";
import { PrimaryButton } from "../components/PrimaryButton";

const QUICK_PROMPTS = [
  "Analyze my volume & fatigue trends",
  "Where are my plateaus?",
  "Recommend next progressive overload",
  "Review my Push vs Pull balance",
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
      setChatError("AI Trainer service offline or rate-limited. Tap to retry.");
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
      setChatError(err.message || "Failed to communicate with AI Trainer.");
      setChatHistory(chatHistory);
      setChatInput(textToSend);
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
      <div className="rf-page-header" style={{ marginBottom: 14 }}>
        <div>
          <div className="rf-telemetry-tag" style={{ marginBottom: 4 }}>
            03 — AI TRAINER
          </div>
          <h1 className="rf-page-title">
            <span className="rf-gradient-text">Embedded AI Coach</span>
          </h1>
          <p className="rf-page-subtitle">
            Observing your verified training history to provide real biomechanical guidance.
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

      {/* Full-Screen Chat Interface */}
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
        {/* Sub-header with Status */}
        <div
          style={{
            padding: "14px 20px",
            background: "rgba(8, 8, 16, 0.9)",
            borderBottom: "1px solid var(--rf-border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <CoachAvatar3D size={40} />
            <div>
              <div style={{ fontWeight: 700, color: "var(--rf-text-pure)", fontSize: "0.95rem" }}>
                RepForge AI Intelligence
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--rf-cyan)", fontFamily: "var(--rf-font-mono)" }}>
                SYNCHRONIZED WITH YOUR TRAINING DATA
              </div>
            </div>
          </div>

          <div className="rf-status-beacon" title="Model operational" />
        </div>

        {/* Message Stream */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "clamp(16px, 3.5vw, 24px)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {chatHistory.length === 0 && !chatLoading && !chatError && (
            <div style={{ textAlign: "center", color: "var(--rf-text-faint)", marginTop: "3rem" }}>
              <div className="rf-state-radar" style={{ margin: "0 auto 16px" }} />
              <div>Initializing AI Trainer Session…</div>
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
                    AI TRAINER IS SYNTHESIZING…
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
        <div
          style={{
            padding: "14px 20px",
            background: "rgba(8, 8, 16, 0.95)",
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
              placeholder="Ask your coach anything about your training…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chatLoading}
            />
            <PrimaryButton
              type="submit"
              disabled={!chatInput.trim() || chatLoading}
              style={{ borderRadius: "var(--rf-radius-pill)" }}
            >
              Send
            </PrimaryButton>
          </form>
        </div>
      </div>
    </div>
  );
}

function formatCoachReply(text) {
  if (typeof text !== "string") {
    text = text?.reply || text?.message || JSON.stringify(text || "");
  }

  return (
    <div style={{ lineHeight: 1.65 }}>
      {text.split("\n\n").map((paragraph, pIdx) => {
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

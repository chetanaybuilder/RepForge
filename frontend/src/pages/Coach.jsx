/**
 * RepForge - conversational strength coach
 *
 * Responsibilities:
 * - Conversational strength coaching powered by the secured Groq backend.
 * - Live Server-Sent Events (SSE) streaming token accumulation.
 * - Conversation history stored locally per athlete.
 */

import { useState, useEffect, useRef, Component } from "react";
import { API_URL, getCsrfToken } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import { PrimaryButton } from "../components/PrimaryButton";

const QUICK_PROMPTS = [
  "How should I progress my bench?",
  "Help me plan a leg day",
  "How many reps should I do for strength?",
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
          <div className="rf-coach-kicker rf-coach-kicker--error">
            CHAT DISPLAY ERROR
          </div>
          <h3 style={{ margin: "0 0 8px 0", color: "var(--rf-text-pure)", fontSize: "1.05rem" }}>
            This reply could not be displayed
          </h3>
          <p style={{ margin: "0 0 16px 0", color: "var(--rf-text-sub)", fontSize: "0.88rem" }}>
            Your conversation is still here. Reset the chat display to continue.
          </p>
          <button
            type="button"
            className="rf-btn rf-btn--sm rf-btn--ghost"
            onClick={this.handleReset}
          >
            ↺ Reset chat display
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

  // Restore saved conversation when the athlete opens Coach.
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
        let streamBuffer = "";
        let streamFinished = false;

        // Add empty assistant turn to stream tokens into
        setChatHistory((prev) => [...prev, { role: "assistant", text: "" }]);

        while (!streamFinished) {
          const { done, value } = await reader.read();
          if (done) {
            streamBuffer += decoder.decode();
            streamFinished = true;
          } else {
            streamBuffer += decoder.decode(value, { stream: true });
          }
          const lines = streamBuffer.split("\n");
          streamBuffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") {
                streamFinished = true;
                break;
              }
              try {
                const parsed = JSON.parse(dataStr);
                const tokenText = parsed.text || parsed.chunk || "";
                if (tokenText) {
                  accumulatedReply += tokenText;
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
          <div className="rf-coach-kicker">
            STRENGTH COACH
          </div>
          <h1 className="rf-page-title">
            RepForge <span className="rf-gradient-text">Coach</span>
          </h1>
          <p className="rf-page-subtitle">
            Ask about lifting, programming, recovery, or your logged training.
          </p>
        </div>
      </div>

      <div className="rf-coach-layout rf-coach-layout--chat-only">
        {/* Left Column: Conversational Terminal */}
        <div className="rf-coach-terminal-box rf-coach-terminal-box--visible">
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
              <div className="rf-coach-mark" aria-hidden="true">RF</div>
              <div>
                <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--rf-text-pure)" }}>
                  RepForge Coach
                </div>
                <div className="rf-coach-provider">
                  STRENGTH TRAINING · GROQ
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {(chatLoading || isStreaming) && (
                <span className="rf-coach-provider rf-coach-provider--active">
                  <span className="rf-spin" style={{ display: "inline-block", marginRight: 4 }}>
                    ◈
                  </span>
                  {isStreaming ? "Replying..." : "Thinking..."}
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
              {chatHistory.length === 0 && !chatLoading && (
                <div className="rf-coach-empty-state">
                  <div className="rf-coach-mark rf-coach-mark--large" aria-hidden="true">RF</div>
                  <h2>What are you working on?</h2>
                  <p>Ask about lifting, programming, recovery, or your training history.</p>
                </div>
              )}
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
                          className="rf-coach-message-label"
                          style={{
                            fontSize: "0.68rem",
                            color: isUser ? "var(--rf-cyan)" : "var(--rf-violet)",
                          }}
                        >
                          {isUser ? "YOU" : "COACH"}
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
                  <span style={{ fontSize: "0.85rem" }}>Coach is thinking...</span>
                </div>
              )}
              {chatError && (
                <div className="rf-coach-error" role="alert">
                  <span>{chatError}</span>
                  <button
                    type="button"
                    className="rf-btn rf-btn--outline rf-btn--sm"
                    disabled={chatLoading || isStreaming}
                    onClick={() => retryMessage && handleSendMessage(retryMessage)}
                  >
                    Retry
                  </button>
                </div>
              )}
            </CoachErrorBoundary>
          </div>

          {/* Natural-language conversation starters */}
          {chatHistory.length === 0 && <div
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
          </div>}

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
              placeholder="Message your strength coach..."
              aria-label="Message your strength coach"
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

      </div>
    </div>
  );
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
      cleanText = String(text ?? "");
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

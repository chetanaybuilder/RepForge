/**
 * RepForge - conversational strength coach
 *
 * Responsibilities:
 * - Conversational strength coaching powered by the secured Groq backend.
 * - Live Server-Sent Events (SSE) streaming token accumulation.
 * - Conversation history stored locally per athlete.
 */

import { useState, useEffect, useRef, Component } from "react";
import { API_URL, getCsrfToken, notifyUnauthorized } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import { PrimaryButton } from "../components/PrimaryButton";
import { CoachReply } from "../components/CoachReply";

const QUICK_PROMPTS = [
  "Analyze my last workout and tell me what to do next",
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
          <div className="rf-coach-kicker rf-coach-kicker--error">CHAT DISPLAY ERROR</div>
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
  const [copyErrorIdx, setCopyErrorIdx] = useState(null);
  const copyTimerRef = useRef(null);
  const scrollRef = useRef(null);
  const terminalRef = useRef(null);
  const requestControllerRef = useRef(null);
  const nearBottomRef = useRef(true);

  useEffect(
    () => () => {
      requestControllerRef.current?.abort();
      window.clearTimeout(copyTimerRef.current);
    },
    []
  );

  useEffect(
    () => () => {
      window.clearTimeout(copyTimerRef.current);
    },
    []
  );

  const handleCopy = async (text, idx) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(typeof text === "string" ? text : JSON.stringify(text));
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = typeof text === "string" ? text : JSON.stringify(text);
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        if (!copied) throw new Error("Clipboard access is unavailable.");
      }
      setCopyErrorIdx(null);
      setCopiedIdx(idx);
      window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopiedIdx(null), 2000);
    } catch (error) {
      console.warn("RepForge could not copy the Coach reply.", error);
      setCopiedIdx(null);
      setCopyErrorIdx(idx);
      window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopyErrorIdx(null), 2000);
    }
  };

  // Restore saved conversation when the athlete opens Coach.
  useEffect(() => {
    if (isStreaming) return;
    if (!user?.id) return;
    try {
      const saved = localStorage.getItem(`rf_coach_${user.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChatHistory(parsed);
        }
      }
    } catch (error) {
      console.warn("RepForge could not restore the saved Coach conversation.", error);
    }
  }, [user?.id]);

  // Save to local storage whenever history changes (bounded to last 20 messages)
  useEffect(() => {
    if (isStreaming) return;
    if (!user?.id) return;
    try {
      const key = `rf_coach_${user.id}`;
      if (chatHistory.length === 0) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(chatHistory.slice(-20)));
      }
    } catch (error) {
      console.warn("RepForge could not save the Coach conversation in this browser.", error);
    }
  }, [chatHistory, user?.id, isStreaming]);

  // Scroll to bottom when history updates
  useEffect(() => {
    if (scrollRef.current && nearBottomRef.current) {
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
    const hasPendingMessage =
      chatHistory.at(-1)?.role === "user" && chatHistory.at(-1)?.text === textToSend;
    const historyForRequest = hasPendingMessage ? chatHistory.slice(0, -1) : [...chatHistory];
    const updatedHistory = hasPendingMessage ? chatHistory : [...chatHistory, userMessage];
    setChatHistory(updatedHistory.slice(-20));
    const requestController = new AbortController();
    requestControllerRef.current = requestController;
    const requestTimeout = setTimeout(() => requestController.abort(), 45000);

    try {
      const csrf = getCsrfToken();
      const headers = {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      };
      if (csrf) headers["X-CSRF-Token"] = csrf;
      const requestBody = JSON.stringify({
        message: textToSend,
        history: historyForRequest,
      });

      const response = await fetch(`${API_URL}/api/coach/chat`, {
        method: "POST",
        headers,
        credentials: "include",
        signal: requestController.signal,
        body: requestBody,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (response.status === 429) {
          throw new Error(
            errorData?.error?.message ||
              "Coach is rate limited right now. Wait briefly, then retry."
          );
        }
        if (response.status === 401 || response.status === 403) {
          if (response.status === 401) notifyUnauthorized();
          throw new Error(
            errorData?.error?.message ||
              "Your session has expired. Sign in again to continue with Coach."
          );
        }
        throw new Error(
          errorData?.error?.message ||
            `Coach request failed (${response.status}). Retry when your connection is ready.`
        );
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
            streamBuffer += `${decoder.decode()}\n`;
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
          const recoveryResponse = await fetch(`${API_URL}/api/coach/chat`, {
            method: "POST",
            headers: { ...headers, Accept: "application/json" },
            credentials: "include",
            signal: requestController.signal,
            body: requestBody,
          });
          const recoveryData = await recoveryResponse.json().catch(() => null);
          if (!recoveryResponse.ok) {
            throw new Error(
              recoveryData?.error?.message || "Coach could not complete this request. Please retry."
            );
          }
          const recoveryText = extractReplyText(recoveryData);
          if (!recoveryText.trim()) {
            throw new Error("Coach is temporarily unavailable. Please retry in a moment.");
          }
          setChatHistory([...updatedHistory, { role: "assistant", text: recoveryText }].slice(-20));
        }
      } else {
        const data = await response.json();
        const replyText = extractReplyText(data);
        if (!replyText.trim()) {
          throw new Error("Coach returned an empty response. Please retry.");
        }
        setChatHistory([...updatedHistory, { role: "assistant", text: replyText }].slice(-20));
      }
      setRetryMessage(null);
    } catch (error) {
      setChatHistory(updatedHistory.slice(-20));
      setRetryMessage(textToSend);
      setChatError(
        error?.name === "AbortError"
          ? "Coach took too long to respond. Your message is saved; please retry."
          : error?.message ||
              "Coach could not complete this request. Check your connection and retry."
      );
    } finally {
      clearTimeout(requestTimeout);
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
          <div className="rf-coach-kicker">STRENGTH COACH</div>
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
        <div ref={terminalRef} className="rf-coach-terminal-box rf-coach-terminal-box--visible">
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
              <div className="rf-coach-mark" aria-hidden="true">
                RF
              </div>
              <div>
                <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--rf-text-pure)" }}>
                  RepForge Coach
                </div>
                <div className="rf-coach-provider">STRENGTH TRAINING · GROQ</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {chatHistory.length > 0 && !chatLoading && !isStreaming && (
                <button
                  type="button"
                  className="rf-btn rf-btn--ghost rf-btn--sm"
                  onClick={() => {
                    requestControllerRef.current?.abort();
                    setChatHistory([]);
                    setChatError(null);
                    setRetryMessage(null);
                    nearBottomRef.current = true;
                  }}
                >
                  Clear chat
                </button>
              )}
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
            onScroll={() => {
              const element = scrollRef.current;
              if (element) {
                nearBottomRef.current =
                  element.scrollHeight - element.scrollTop - element.clientHeight < 120;
              }
            }}
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
                  <div className="rf-coach-mark rf-coach-mark--large" aria-hidden="true">
                    RF
                  </div>
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
                            {copiedIdx === idx
                              ? "✓ Copied"
                              : copyErrorIdx === idx
                                ? "Copy failed"
                                : "📋 Copy"}
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
                        <CoachReply text={msg.text} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {chatLoading && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "var(--rf-text-sub)",
                  }}
                >
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
          {chatHistory.length === 0 && (
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
          )}

          {/* Sticky Mobile Input Pinned to Viewport Bottom */}
          <form
            className="rf-coach-input-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{
              padding: "10px 14px",
              paddingBottom: "max(12px, env(safe-area-inset-bottom))",
              borderTop: "1px solid rgba(0, 242, 254, 0.2)",
              background: "rgba(8, 8, 18, 0.98)",
            }}
          >
            <div className="rf-coach-chat-input-shell">
              <input
                type="text"
                className="rf-input rf-coach-chat-input"
                placeholder="Message your strength coach..."
                aria-label="Message your strength coach"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  borderColor: "rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                }}
              />
            </div>
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

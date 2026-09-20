import { useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

import { AnimatePresence, motion } from "framer-motion";
import { CoachAvatar3D } from "../components/3d/CoachAvatar3D";
import { TypingIndicator3D } from "../components/3d/TypingIndicator3D";
import { PrimaryButton } from "../components/PrimaryButton";

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
          return; // Skip initial check-in if we loaded history
        }
      } catch (e) {
        // ignore JSON parse error
      }
    }
    
    // If no history, trigger initial check-in immediately
    triggerInitialCheckin();
  }, [user?.id]);

  // Save to local storage whenever history changes
  useEffect(() => {
    if (!user?.id || chatHistory.length === 0) return;
    localStorage.setItem(`rf_chat_${user.id}`, JSON.stringify(chatHistory));
  }, [chatHistory, user?.id]);

  // Scroll to bottom when history or loading state changes
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
        history: []
      });
      const replyText = typeof data?.reply === "string" ? data.reply : (data?.message || "Ready to train.");
      setChatHistory([{ role: "model", text: replyText }]);
    } catch (err) {
      setChatError("Failed to initialize chat. Please try again.");
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const newMessage = chatInput.trim();
    setChatInput("");
    setChatError(null);
    setChatLoading(true);

    const updatedHistory = [...chatHistory, { role: "user", text: newMessage }];
    setChatHistory(updatedHistory);

    try {
      const data = await api.post("/api/ai/chat", {
        message: newMessage,
        history: chatHistory // Send previous history (excluding new message)
      });
      const replyText = typeof data?.reply === "string" ? data.reply : (data?.message || "Received response.");
      setChatHistory([...updatedHistory, { role: "model", text: replyText }]);
    } catch (err) {
      setChatError(err.message || "Failed to send message");
      // Remove optimistic message on fail so user can re-try
      setChatHistory(chatHistory);
      setChatInput(newMessage);
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px', maxHeight: 'calc(100vh - 132px)' }}>
      <div className="rf-page-header" style={{ marginBottom: 16 }}>
        <div>

          <h1 className="rf-page-title">AI Trainer</h1>
          <p className="rf-page-subtitle">Your personal strength coach, ready to analyze your progress.</p>
        </div>
        <button className="rf-btn rf-btn--ghost rf-btn--sm" onClick={startNewCheckin} disabled={chatLoading}>
          Start New Check-in
        </button>
      </div>

      <div 
        className="rf-panel" 
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          padding: 0
        }}
      >
        <div 
          ref={scrollRef}
          className="rf-scrollbar"
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          {chatHistory.length === 0 && !chatLoading && !chatError && (
            <div style={{ textAlign: 'center', color: 'var(--rf-text-faint)', marginTop: '2rem' }}>
              Initializing chat...
            </div>
          )}

          <AnimatePresence initial={false}>
            {chatHistory.map((msg, i) => (
              <motion.div 
                key={i} 
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  maxWidth: '85%'
                }}
              >
                {msg.role === 'model' && <CoachAvatar3D size={40} />}
                
                <div style={{
                  background: msg.role === 'user' ? 'linear-gradient(135deg, rgba(138,92,246,0.3), rgba(34,211,238,0.2))' : 'var(--rf-surface-2)',
                  border: msg.role === 'user' ? '1px solid rgba(138,92,246,0.5)' : '1px solid var(--rf-border-strong)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
                  color: 'var(--rf-text)',
                  padding: '14px 18px',
                  borderRadius: '16px',
                  borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                  borderBottomLeftRadius: msg.role === 'model' ? '4px' : '16px',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap'
                }}>
                  {typeof msg.text === "string" ? msg.text : (msg.text?.reply || msg.reply || JSON.stringify(msg.text || ""))}
                </div>
              </motion.div>
            ))}

            {chatLoading && (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                style={{ 
                  alignSelf: 'flex-start', 
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                }}
              >
                <CoachAvatar3D size={40} />
                <div style={{ 
                  background: 'var(--rf-surface-2)', 
                  border: '1px solid var(--rf-border-strong)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  padding: '8px 12px', 
                  borderRadius: '16px',
                  borderBottomLeftRadius: '4px',
                }}>
                  <TypingIndicator3D />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {chatError && (
            <div style={{ alignSelf: 'center', color: 'var(--rf-danger)', fontSize: '0.9rem', background: 'rgba(249,87,93,0.1)', padding: '8px 16px', borderRadius: '999px', border: '1px solid rgba(249,87,93,0.2)' }}>
              {chatError}
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--rf-border-strong)', background: 'rgba(0,0,0,0.2)' }}>
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 12 }}>
            <input
              type="text"
              className="rf-input"
              style={{ flex: 1, background: 'var(--rf-surface-2)', borderRadius: '999px', padding: '14px 20px' }}
              placeholder="Ask your coach anything..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              disabled={chatLoading}
            />
            <PrimaryButton 
              type="submit" 
              disabled={!chatInput.trim() || chatLoading}
            >
              Send
            </PrimaryButton>
          </form>
        </div>
      </div>
    </div>
  );
}

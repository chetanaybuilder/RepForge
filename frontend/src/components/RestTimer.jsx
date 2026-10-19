import { useState, useEffect, useRef } from "react";

/**
 * Web Audio API synthesizer for crisp gym rest notification
 * Zero external mp3 dependencies, works offline
 */
function playRestBeep() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.25);

    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1320, ctx.currentTime); // E6 note
      gain2.gain.setValueAtTime(0.2, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start();
      osc2.stop(ctx.currentTime + 0.4);
    }, 180);
  } catch {
    // AudioContext blocked or unavailable
  }
}

/**
 * Haptic mobile pulse on rest completion
 */
function triggerHapticPulse() {
  try {
    if ("vibrate" in navigator) {
      navigator.vibrate([150, 80, 200]);
    }
  } catch {
    // ignore
  }
}

export function RestTimer({ initialSeconds = 90, onComplete, onClose }) {
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!isActive) {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setIsActive(false);
          playRestBeep();
          triggerHapticPulse();
          if (onComplete) onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isActive, onComplete]);

  const addTime = (secs) => {
    setSecondsLeft((prev) => {
      const next = Math.max(0, prev + secs);
      if (next > totalSeconds) setTotalSeconds(next);
      return next;
    });
    if (!isActive) setIsActive(true);
  };

  const setPreset = (secs) => {
    setTotalSeconds(secs);
    setSecondsLeft(secs);
    setIsActive(true);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  const progressPct = totalSeconds > 0 ? (secondsLeft / totalSeconds) * 100 : 0;
  const isFinished = secondsLeft === 0;

  if (minimized) {
    return (
      <div
        onClick={() => setMinimized(false)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          background: isFinished
            ? "rgba(0, 245, 160, 0.95)"
            : "rgba(12, 12, 24, 0.92)",
          backdropFilter: "blur(16px)",
          border: isFinished
            ? "1px solid var(--rf-emerald)"
            : "1px solid rgba(0, 242, 254, 0.4)",
          borderRadius: "999px",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          color: isFinished ? "#000" : "#fff",
          fontWeight: 700,
          fontFamily: "var(--rf-font-mono)",
          fontSize: "0.85rem",
          animation: isFinished ? "rf-pulse 1s infinite alternate" : "none",
        }}
      >
        <span>{isFinished ? "🦾 READY" : "⏱️"}</span>
        <span>{isFinished ? "NEXT SET" : timeFormatted}</span>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        width: "min(340px, calc(100vw - 32px))",
        background: "rgba(10, 10, 22, 0.95)",
        backdropFilter: "blur(24px) saturate(180%)",
        border: isFinished
          ? "1px solid var(--rf-emerald)"
          : "1px solid rgba(0, 242, 254, 0.35)",
        borderRadius: "var(--rf-radius-lg)",
        padding: "16px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.7), 0 0 24px -6px rgba(0,242,254,0.2)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Rest Timer Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: "1rem" }}>⏱️</span>
          <span
            className="rf-telemetry-tag"
            style={{
              color: isFinished ? "var(--rf-emerald)" : "var(--rf-cyan)",
              fontSize: "0.72rem",
            }}
          >
            {isFinished ? "REST COMPLETE" : "INTER-SET REST TIMER"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            style={{
              background: "transparent",
              color: "var(--rf-text-sub)",
              cursor: "pointer",
              fontSize: "0.8rem",
              padding: "2px 6px",
            }}
            title="Minimize"
          >
            —
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                color: "var(--rf-text-sub)",
                cursor: "pointer",
                fontSize: "0.85rem",
                padding: "2px 6px",
              }}
              title="Close"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Countdown Visual Display */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px 0",
        }}
      >
        <div
          style={{
            fontFamily: "var(--rf-font-mono)",
            fontSize: "2.6rem",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            color: isFinished ? "var(--rf-emerald)" : "var(--rf-text-pure)",
            textShadow: isFinished
              ? "0 0 20px rgba(0, 245, 160, 0.6)"
              : "0 0 20px rgba(0, 242, 254, 0.3)",
          }}
        >
          {isFinished ? "0:00" : timeFormatted}
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: "100%",
          height: 4,
          background: "rgba(255, 255, 255, 0.08)",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progressPct}%`,
            background: isFinished
              ? "var(--rf-emerald)"
              : "linear-gradient(90deg, var(--rf-cyan), var(--rf-violet))",
            transition: "width 1s linear",
          }}
        />
      </div>

      {/* Preset Quick Chips */}
      <div
        style={{
          display: "flex",
          gap: 6,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {[
          { label: "30s", val: 30 },
          { label: "60s", val: 60 },
          { label: "90s", val: 90 },
          { label: "120s", val: 120 },
          { label: "180s", val: 180 },
        ].map((p) => (
          <button
            key={p.val}
            type="button"
            onClick={() => setPreset(p.val)}
            style={{
              padding: "3px 8px",
              fontSize: "0.68rem",
              fontFamily: "var(--rf-font-mono)",
              fontWeight: totalSeconds === p.val ? 800 : 600,
              borderRadius: "var(--rf-radius-sm)",
              background:
                totalSeconds === p.val
                  ? "rgba(0, 242, 254, 0.2)"
                  : "rgba(255, 255, 255, 0.05)",
              border:
                totalSeconds === p.val
                  ? "1px solid var(--rf-cyan)"
                  : "1px solid rgba(255, 255, 255, 0.1)",
              color: totalSeconds === p.val ? "var(--rf-cyan)" : "var(--rf-text-sub)",
              cursor: "pointer",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Controls Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          paddingTop: 10,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={() => addTime(-15)}
            disabled={secondsLeft <= 0}
            className="rf-btn rf-btn--ghost rf-btn--sm"
            style={{ padding: "4px 8px", fontSize: "0.72rem" }}
          >
            -15s
          </button>
          <button
            type="button"
            onClick={() => addTime(30)}
            className="rf-btn rf-btn--ghost rf-btn--sm"
            style={{ padding: "4px 8px", fontSize: "0.72rem" }}
          >
            +30s
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsActive((prev) => !prev)}
          className={`rf-btn rf-btn--sm ${
            isActive ? "rf-btn--secondary" : "rf-btn--primary"
          }`}
          style={{ padding: "4px 12px", fontSize: "0.75rem" }}
        >
          {isActive ? "Pause" : "Resume"}
        </button>
      </div>
    </div>
  );
}

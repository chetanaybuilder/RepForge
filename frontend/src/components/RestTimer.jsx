/**
 * frontend\src\components\RestTimer.jsx
 * Implements this RepForge module's single responsibility while preserving its existing public behavior.
 */

import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRestTimer } from "../context/RestTimerContext";

let sharedAudioCtx = null;

export async function unlockAudio() {
  try {
    if (!sharedAudioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      sharedAudioCtx = new AudioContext();
    }
    if (sharedAudioCtx.state === "suspended") await sharedAudioCtx.resume();
  } catch {
    // Audio playback is optional; continue without surfacing an error.
  }
}

function playRestBeep() {
  try {
    const ctx = sharedAudioCtx;
    if (!ctx || ctx.state !== "running") return;
    const beep = (frequency, delay, duration, volume) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
      gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration);
    };
    beep(880, 0, 0.25, 0.15);
    beep(1320, 0.18, 0.4, 0.2);
  } catch {
    // AudioContext blocked or unavailable.
  }
}

export function RestTimer({
  initialSeconds = 90,
  onComplete,
  onClose,
  bottomOffset = 24,
  defaultMinimized = false,
}) {
  const key = useId();
  const { activeKey, acquire, release } = useRestTimer();
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(true);
  const [minimized, setMinimized] = useState(defaultMinimized);
  const intervalRef = useRef(null);
  const endTimeRef = useRef(Date.now() + initialSeconds * 1000);

  useEffect(() => {
    acquire(key);
    return () => release(key);
  }, [acquire, release, key]);

  useEffect(() => {
    if (activeKey !== key || !isActive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return undefined;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setIsActive(false);
        playRestBeep();
        if ("vibrate" in navigator) navigator.vibrate([150, 80, 200]);
        onComplete?.();
      }
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [activeKey, isActive, key, onComplete]);

  const addTime = useCallback(
    (secs) => {
      const next = Math.max(0, secondsLeft + secs);
      setSecondsLeft(next);
      setTotalSeconds((current) => Math.max(current, next));
      endTimeRef.current = Date.now() + next * 1000;
      setIsActive(next > 0);
      unlockAudio();
    },
    [secondsLeft]
  );

  const setPreset = useCallback((secs) => {
    setTotalSeconds(secs);
    setSecondsLeft(secs);
    endTimeRef.current = Date.now() + secs * 1000;
    setIsActive(true);
    unlockAudio();
  }, []);

  const togglePause = useCallback(() => {
    unlockAudio();
    if (isActive) {
      setIsActive(false);
      return;
    }
    const resumeSeconds = secondsLeft === 0 ? totalSeconds : secondsLeft;
    endTimeRef.current = Date.now() + resumeSeconds * 1000;
    setSecondsLeft(resumeSeconds);
    setIsActive(true);
  }, [isActive, secondsLeft, totalSeconds]);

  if (activeKey !== key) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  const progressPct = totalSeconds > 0 ? (secondsLeft / totalSeconds) * 100 : 0;
  const safeBottom = `calc(${bottomOffset}px + env(safe-area-inset-bottom, 0px))`;
  const safeRight = `max(16px, env(safe-area-inset-right))`;
  const isFinished = secondsLeft === 0;

  if (minimized) {
    return createPortal(
      <button
        type="button"
        onClick={() => setMinimized(false)}
        role="timer"
        aria-live="polite"
        aria-label={`Rest timer, ${timeFormatted}, minimized`}
        style={{
          position: "fixed",
          bottom: safeBottom,
          right: safeRight,
          zIndex: 9999,
          background: isFinished ? "rgba(0, 245, 160, 0.95)" : "rgba(12, 12, 24, 0.92)",
          border: isFinished ? "1px solid var(--rf-emerald)" : "1px solid rgba(0,242,254,0.4)",
          borderRadius: 999,
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          color: isFinished ? "#000" : "#fff",
          fontWeight: 700,
          fontFamily: "var(--rf-font-mono)",
          fontSize: "0.85rem",
        }}
      >
        <span>{isFinished ? "READY" : "\u23F1"}</span>
        <span>{isFinished ? "NEXT SET" : timeFormatted}</span>
      </button>,
      document.body
    );
  }

  return createPortal(
    <div
      role="timer"
      aria-live="polite"
      aria-label={`Rest timer, ${timeFormatted}`}
      style={{
        position: "fixed",
        bottom: safeBottom,
        right: safeRight,
        zIndex: 9999,
        width: "min(340px, calc(100vw - 32px))",
        background: "rgba(10,10,22,0.95)",
        border: isFinished ? "1px solid var(--rf-emerald)" : "1px solid rgba(0,242,254,0.35)",
        borderRadius: "var(--rf-radius-lg)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          className="rf-telemetry-tag"
          style={{
            color: isFinished ? "var(--rf-emerald)" : "var(--rf-cyan)",
            fontSize: "0.72rem",
          }}
        >
          {isFinished ? "REST COMPLETE" : "INTER-SET REST TIMER"}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={() => setMinimized(true)} aria-label="Minimize rest timer">
            -
          </button>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Close rest timer">
              X
            </button>
          )}
        </div>
      </div>
      <div
        style={{
          textAlign: "center",
          fontFamily: "var(--rf-font-mono)",
          fontSize: "2.6rem",
          fontWeight: 800,
        }}
      >
        {timeFormatted}
      </div>
      <div
        style={{
          width: "100%",
          height: 4,
          background: "rgba(255,255,255,0.08)",
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
              : "linear-gradient(90deg,var(--rf-cyan),var(--rf-violet))",
            transition: "width 1s linear",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
        {[30, 60, 90, 120, 180].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setPreset(preset)}
            className="rf-btn rf-btn--ghost rf-btn--sm"
          >
            {preset}s
          </button>
        ))}
      </div>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={() => addTime(-15)}
            disabled={secondsLeft <= 0}
            className="rf-btn rf-btn--ghost rf-btn--sm"
          >
            -15s
          </button>
          <button
            type="button"
            onClick={() => addTime(30)}
            className="rf-btn rf-btn--ghost rf-btn--sm"
          >
            +30s
          </button>
        </div>
        <button
          type="button"
          onClick={togglePause}
          className={`rf-btn rf-btn--sm ${isActive ? "rf-btn--secondary" : "rf-btn--primary"}`}
          aria-label={isActive ? "Pause rest timer" : "Resume rest timer"}
        >
          {isActive ? "Pause" : "Resume"}
        </button>
      </div>
    </div>,
    document.body
  );
}

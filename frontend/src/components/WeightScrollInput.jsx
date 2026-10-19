import { useState } from "react";

/**
 * WeightScrollInput - Precision total-load or per-side weight stepper
 * Features:
 * - Mousewheel scroll-to-adjust (smooth delta with 2.5kg or 1kg increments)
 * - Neutral quick-tap weight presets
 * - Micro-steppers (+ / -) for rapid mobile thumb logging without opening keyboard
 */
export function WeightScrollInput({
  value,
  onChange,
  ariaLabel = "Weight in kg",
  caption,
  disabled = false,
}) {
  const [showQuickPill, setShowQuickPill] = useState(false);
  const numVal = Number(value) || 0;

  // Handle mousewheel / trackpad scrolling over input
  const handleWheel = (e) => {
    if (disabled) return;
    e.preventDefault();
    const step = e.shiftKey ? 1 : 2.5;
    const delta = e.deltaY < 0 ? step : -step;
    const next = Math.max(0, Math.round((numVal + delta) * 10) / 10);
    onChange(next);
  };

  const handleStep = (step) => {
    if (disabled) return;
    const next = Math.max(0, Math.round((numVal + step) * 10) / 10);
    onChange(next);
  };

  // Neutral presets change only the entered value; they do not imply equipment.
  const PRESET_CHIPS = [
    2.5, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 100,
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        width: "100%",
        position: "relative",
      }}
    >
      {/* Primary Input Container with Steppers & Wheel Scrolling */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "rgba(10, 10, 20, 0.7)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "var(--rf-radius-sm)",
          padding: "1px 2px",
          transition: "border-color 0.15s ease",
          position: "relative",
        }}
        onMouseEnter={() => setShowQuickPill(true)}
        onMouseLeave={() => setShowQuickPill(false)}
      >
        {/* Quick Stepper Minus */}
        <button
          type="button"
          onClick={() => handleStep(-2.5)}
          disabled={disabled || numVal <= 0}
          title="Decrease weight (-2.5 kg)"
          style={{
            width: 32,
            minWidth: 32,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            color: numVal <= 0 ? "rgba(255,255,255,0.15)" : "var(--rf-text-sub)",
            fontSize: "0.85rem",
            fontWeight: 800,
            cursor: numVal <= 0 ? "not-allowed" : "pointer",
            padding: 0,
            userSelect: "none",
          }}
        >
          −
        </button>

        {/* Numeric Input with Mousewheel Listener */}
        <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
          <input
            type="number"
            step="0.5"
            min="0"
            className="rf-set-input"
            value={value === 0 || value === "" ? "" : value}
            placeholder="0"
            onWheel={handleWheel}
            onFocus={() => setShowQuickPill(true)}
            onChange={(e) => {
              const val = e.target.value === "" ? 0 : Number(e.target.value);
              onChange(val);
            }}
            aria-label={ariaLabel}
            disabled={disabled}
            style={{
              padding: "4px 22px 4px 4px",
              textAlign: "center",
              width: "100%",
              fontWeight: 700,
              fontFamily: "var(--rf-font-mono)",
            }}
            title="Scroll mouse wheel over input to adjust weight (Shift for 1kg)"
          />
          <span
            style={{
              position: "absolute",
              right: 2,
              fontSize: "0.6rem",
              color: "var(--rf-cyan)",
              pointerEvents: "none",
              fontWeight: 700,
              fontFamily: "var(--rf-font-mono)",
            }}
          >
            kg
          </span>
        </div>

        {/* Quick Stepper Plus */}
        <button
          type="button"
          onClick={() => handleStep(2.5)}
          disabled={disabled}
          title="Increase weight (+2.5 kg)"
          style={{
            width: 32,
            minWidth: 32,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            color: "var(--rf-cyan)",
            fontSize: "0.85rem",
            fontWeight: 800,
            cursor: "pointer",
            padding: 0,
            userSelect: "none",
          }}
        >
          +
        </button>
      </div>

      {/* Value caption and optional quick selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 4,
          padding: "0 2px",
        }}
      >
        <span className="rf-weight-input-caption">
          {caption || (numVal > 0 ? `${numVal} kg` : "Enter weight")}
        </span>

        <button
          type="button"
          onClick={() => setShowQuickPill((prev) => !prev)}
          style={{
            fontSize: "0.56rem",
            fontFamily: "var(--rf-font-mono)",
            color: showQuickPill ? "var(--rf-cyan)" : "var(--rf-text-faint)",
            background: "transparent",
            cursor: "pointer",
            padding: "0 2px",
            lineHeight: 1.2,
            textDecoration: "underline",
          }}
        >
          {showQuickPill ? "hide" : "presets"}
        </button>
      </div>

      {/* Quick weight presets */}
      {showQuickPill && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 30,
            marginTop: 2,
            display: "flex",
            gap: 4,
            overflowX: "auto",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
            background: "rgba(12, 12, 24, 0.96)",
            border: "1px solid rgba(0, 242, 254, 0.3)",
            borderRadius: "var(--rf-radius-sm)",
            padding: "4px 6px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            maxWidth: "260px",
          }}
        >
          {PRESET_CHIPS.map((presetWeight) => {
            const isSelected = numVal === presetWeight;
            return (
              <button
                key={presetWeight}
                type="button"
                onClick={() => {
                  onChange(presetWeight);
                  setShowQuickPill(false);
                }}
                style={{
                  whiteSpace: "nowrap",
                  fontSize: "0.6rem",
                  fontFamily: "var(--rf-font-mono)",
                  fontWeight: isSelected ? 800 : 600,
                  padding: "2px 6px",
                  borderRadius: 3,
                  background: isSelected
                    ? "var(--rf-cyan)"
                    : "rgba(255, 255, 255, 0.06)",
                  color: isSelected ? "#000" : "var(--rf-text-bright)",
                  border: isSelected
                    ? "1px solid var(--rf-cyan)"
                    : "1px solid rgba(255, 255, 255, 0.1)",
                  cursor: "pointer",
                  transition: "all 0.1s ease",
                  flexShrink: 0,
                }}
              >
                  {presetWeight} kg
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

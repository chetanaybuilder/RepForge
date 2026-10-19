import { useState, useEffect } from "react";
import {
  PLATE_THEMES,
  calculateBarbellPlates,
  formatPlatesSummary,
} from "../utils/plates";
import { PrimaryButton } from "./PrimaryButton";

export function PlateCalculatorModal({
  open,
  initialWeight = 0,
  onApply,
  onClose,
}) {
  const [barWeight, setBarWeight] = useState("");
  const [plateInventoryText, setPlateInventoryText] = useState("");
  const [weight, setWeight] = useState(initialWeight ?? 0);
  const availablePlates = [...new Set(plateInventoryText
    .split(",")
    .map((plate) => Number(plate.trim()))
    .filter((plate) => Number.isFinite(plate) && plate > 0))];

  useEffect(() => {
    if (open) {
      setWeight(initialWeight ?? 0);
    }
  }, [open, initialWeight]);

  if (!open) return null;

  const result = barWeight === "" ? null : calculateBarbellPlates(weight, Number(barWeight), availablePlates);

  // Quick-add plate to both sides
  const handleAddPlatePair = (plateKg) => {
    if (barWeight !== "") setWeight((prev) => Math.max(Number(barWeight), Math.round((prev + plateKg * 2) * 100) / 100));
  };

  // Quick-subtract plate from both sides
  const handleRemovePlatePair = (plateKg) => {
    if (barWeight !== "") setWeight((prev) => Math.max(Number(barWeight), Math.round((prev - plateKg * 2) * 100) / 100));
  };

  const handleResetToBar = () => {
    if (barWeight !== "") setWeight(Number(barWeight));
  };

  const handleApply = () => {
    if (barWeight === "" || !result?.isExact) return;
    const summary = formatPlatesSummary(weight, Number(barWeight), availablePlates);
    if (onApply) {
      onApply(weight, summary);
    }
    onClose();
  };

  return (
    <div className="rf-modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="rf-modal rf-modal--md"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: 520 }}
      >
        <div className="rf-modal-handle" />
        <div className="rf-modal-header">
          <div>
            <div className="rf-telemetry-tag" style={{ marginBottom: 2 }}>
              BIOMECHANICAL LOAD CALCULATOR
            </div>
            <h3 className="rf-modal-title">Plate Breakdown & Calculator</h3>
          </div>
          <button type="button" className="rf-icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="rf-modal-body" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Target Weight Display & Direct Stepper */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(10, 10, 20, 0.7)",
              border: "1px solid var(--rf-border-laser)",
              borderRadius: "var(--rf-radius-md)",
              padding: "16px 20px",
            }}
          >
            <div>
              <div className="rf-telemetry-tag" style={{ color: "var(--rf-cyan)", marginBottom: 4 }}>
                TOTAL SET WEIGHT
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: "2.4rem", fontWeight: 800, color: "var(--rf-text-pure)", fontFamily: "var(--rf-font-mono)" }}>
                  {weight}
                </span>
                <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--rf-cyan)" }}>
                  KG
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                className="rf-icon-btn"
                style={{ width: 40, height: 40, fontSize: "1.2rem" }}
                onClick={() => setWeight((w) => Math.max(barWeight, Math.round((w - 2.5) * 10) / 10))}
                title="Subtract 2.5 kg"
              >
                −
              </button>
              <input
                type="number"
                step="0.5"
                min={barWeight}
                value={weight}
                onChange={(e) => setWeight(Math.max(0, Number(e.target.value) || 0))}
                className="rf-input"
                style={{ width: 80, textAlign: "center", padding: "8px 4px", fontSize: "1rem" }}
              />
              <button
                type="button"
                className="rf-icon-btn"
                style={{ width: 40, height: 40, fontSize: "1.2rem" }}
                onClick={() => setWeight((w) => Math.round((w + 2.5) * 10) / 10)}
                title="Add 2.5 kg"
              >
                +
              </button>
            </div>
          </div>

          {/* Bar Type Selector */}
          <div>
            <label className="rf-label" style={{ fontSize: "0.74rem", marginBottom: 6 }}>
              Barbell weight (kg)
            </label>
            <input
              className="rf-input"
              type="number"
              min="0"
              step="0.5"
              value={barWeight}
              placeholder="Enter actual bar weight"
              onChange={(event) => setBarWeight(event.target.value === "" ? "" : Math.max(0, Number(event.target.value)))}
            />
          </div>

          <div>
            <label className="rf-label" htmlFor="plate-inventory">
              Plate denominations at your gym (kg)
            </label>
            <input
              id="plate-inventory"
              className="rf-input"
              type="text"
              inputMode="decimal"
              value={plateInventoryText}
              onChange={(event) => setPlateInventoryText(event.target.value)}
              placeholder="Enter actual sizes, e.g. 25, 20, 15, 10, 5, 2.5"
              aria-describedby="plate-inventory-help"
            />
            <span id="plate-inventory-help" className="rf-weight-mode-help">
              Enter the available plate weights separated by commas. No inventory is assumed.
            </span>
          </div>

          {/* Visual Barbell Loading Sleeve */}
          <div
            style={{
              background: "rgba(6, 6, 12, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "var(--rf-radius-md)",
              padding: "16px 14px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: "0.78rem" }}>
              <span style={{ color: "var(--rf-text-sub)" }}>
                Plates per side: <strong style={{ color: "var(--rf-cyan)" }}>{result?.perSideWeight ?? "--"} kg</strong>
              </span>
              <span style={{ color: "var(--rf-text-faint)" }}>
                {result?.platesPerSide.length ?? 0} plates / side
              </span>
            </div>

            {/* Graphic Barbell Sleeve */}
            <div
              style={{
                width: "100%",
                height: 90,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                background: "radial-gradient(ellipse at center, rgba(30, 30, 50, 0.5) 0%, rgba(10, 10, 20, 0.9) 100%)",
                borderRadius: "var(--rf-radius-sm)",
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.04)",
              }}
            >
              {/* Central Barbell Shaft */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  height: 12,
                  background: "linear-gradient(180deg, #94a3b8 0%, #475569 50%, #1e293b 100%)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
                }}
              />

              {/* Barbell Collar Stop */}
              <div
                style={{
                  width: 14,
                  height: 48,
                  background: "linear-gradient(90deg, #64748b 0%, #334155 100%)",
                  borderRadius: 2,
                  marginRight: 6,
                  zIndex: 2,
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              />

              {/* Plates On Sleeve */}
              <div style={{ display: "flex", alignItems: "center", gap: 3, zIndex: 3, minWidth: 20 }}>
                {!result || result.platesPerSide.length === 0 ? (
                  <span style={{ color: "var(--rf-text-faint)", fontSize: "0.78rem", fontStyle: "italic" }}>
                    {result ? "No plates loaded (bar only)" : "Enter bar weight and select available plates"}
                  </span>
                ) : (
                  result.platesPerSide.map((p, idx) => {
                    const theme = PLATE_THEMES[p] || {
                      bg: "#475569",
                      border: "#94a3b8",
                      text: "#ffffff",
                      width: 10,
                      height: 40,
                    };
                    return (
                      <div
                        key={idx}
                        title={`${p} kg plate`}
                        style={{
                          width: theme.width + 4,
                          height: theme.height,
                          background: theme.bg,
                          border: `1px solid ${theme.border}`,
                          borderRadius: 3,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: theme.text,
                          fontSize: "0.6rem",
                          fontWeight: 800,
                          writingMode: "vertical-rl",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
                          userSelect: "none",
                        }}
                      >
                        {p}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Text Breakdown of Plates */}
            <div style={{ width: "100%", display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
              {!result || Object.keys(result.plateCounts).length === 0 ? (
                <span style={{ fontSize: "0.75rem", color: "var(--rf-text-faint)" }}>
                  {result ? `Total weight equals bar weight (${barWeight} kg).` : "Plate breakdown appears after selecting equipment."}
                </span>
              ) : (
                Object.entries(result.plateCounts)
                  .sort((a, b) => Number(b[0]) - Number(a[0]))
                  .map(([plate, count]) => (
                    <span
                      key={plate}
                      className="rf-badge rf-badge--cyan"
                      style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                    >
                      {count} × {plate} kg plate per side
                    </span>
                  ))
              )}
            </div>
            {result?.isExact && (
              <p className="rf-plate-calculator-total">
                {weight} kg total = {barWeight} kg bar + {result.perSideWeight} kg of plates per side × 2
              </p>
            )}
            {result && !result.isExact && (
              <p className="rf-plate-calculator-warning" role="status">
                {weight < Number(barWeight)
                  ? `The ${weight} kg target is below the selected ${barWeight} kg bar weight.`
                  : `This target cannot be loaded exactly with the selected plates. The requested load needs ${result.perSideWeight} kg per side, with ${result.remainder} kg per side not represented.`}
              </p>
            )}
          </div>

          {/* Quick-Tap Plate Buttons */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label className="rf-label" style={{ fontSize: "0.74rem", margin: 0 }}>
                Optional plate pairs (+2 plates per selected plate weight)
              </label>
              <button
                type="button"
                onClick={handleResetToBar}
                className="rf-telemetry-tag"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--rf-ember)",
                  cursor: "pointer",
                }}
              >
                Reset to Bar
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(65px, 1fr))", gap: 8 }}>
                {availablePlates.map((p) => {
                const count = result?.plateCounts[p] || 0;
                const theme = PLATE_THEMES[p] || {
                  bg: "#475569",
                  border: "#94a3b8",
                  text: "#ffffff",
                };
                return (
                  <div
                    key={p}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      background: "rgba(255, 255, 255, 0.03)",
                      borderRadius: "var(--rf-radius-sm)",
                      padding: "6px 4px",
                      border: count > 0 ? `1px solid ${theme.border}` : "1px solid var(--rf-border-subtle)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleAddPlatePair(p)}
                      style={{
                        width: "100%",
                        padding: "5px 0",
                        background: theme.bg,
                        color: theme.text,
                        border: "none",
                        borderRadius: 3,
                        fontWeight: 700,
                        fontSize: "0.78rem",
                        cursor: "pointer",
                        transition: "transform 0.1s ease",
                      }}
                      title={`Add pair of ${p}kg plates (+${p * 2}kg total)`}
                    >
                      +{p}k
                    </button>
                    {count > 0 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePlatePair(p)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--rf-ember)",
                          fontSize: "0.68rem",
                          cursor: "pointer",
                          padding: "0 2px",
                        }}
                      >
                        − {count} on bar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="rf-modal-footer">
          <button type="button" className="rf-btn rf-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <PrimaryButton onClick={handleApply} disabled={!result?.isExact}>
            Apply {weight} KG to Set
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

/**
 * frontend\src\components\WeightScrollInput.jsx
 * Implements this RepForge module's single responsibility while preserving its existing public behavior.
 */

import { useEffect, useState } from "react";

/** Compact direct-entry field for total weight in kilograms. */
export function WeightScrollInput({
  value,
  onChange,
  ariaLabel = "Weight in kg",
  disabled = false,
}) {
  const [rawValue, setRawValue] = useState(value === 0 ? "" : String(value ?? ""));

  useEffect(() => {
    const rawNumber = Number(rawValue || 0);
    if (Number(rawNumber) !== Number(value || 0)) {
      setRawValue(value === 0 ? "" : String(value ?? ""));
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const clamp = (number) => (Number.isFinite(number) ? Math.min(1000, Math.max(0, number)) : 0);

  const commitRawValue = () => {
    if (rawValue === "" || rawValue.endsWith(".")) {
      const safeValue = rawValue.endsWith(".") ? clamp(Number(rawValue.slice(0, -1))) : 0;
      setRawValue(safeValue === 0 ? "" : String(safeValue));
      onChange(safeValue);
      return;
    }
    const safeValue = clamp(Number(rawValue));
    setRawValue(safeValue === 0 ? "" : String(safeValue));
    onChange(safeValue);
  };

  return (
    <input
      type="number"
      inputMode="decimal"
      step="0.5"
      min="0"
      max="1000"
      className="rf-set-input"
      value={rawValue}
      placeholder="0"
      onChange={(event) => {
        const raw = event.target.value;
        setRawValue(raw);
        if (raw === "" || raw.endsWith(".")) return;
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) onChange(clamp(parsed));
      }}
      onBlur={() => {
        const parsed = rawValue === "" ? 0 : Number(rawValue);
        const safeValue = clamp(parsed);
        setRawValue(safeValue === 0 ? "" : String(safeValue));
        onChange(safeValue);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commitRawValue();
        }
      }}
      aria-label={ariaLabel}
      disabled={disabled}
    />
  );
}

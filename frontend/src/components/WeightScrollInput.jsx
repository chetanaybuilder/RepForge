/** Compact direct-entry field for total weight in kilograms. */
export function WeightScrollInput({
  value,
  onChange,
  ariaLabel = "Weight in kg",
  disabled = false,
}) {
  return (
    <input
      type="number"
      step="0.5"
      min="0"
      className="rf-set-input"
      value={value === 0 || value === "" ? "" : value}
      placeholder="0"
      onChange={(event) => onChange(event.target.value === "" ? 0 : Number(event.target.value))}
      aria-label={ariaLabel}
      disabled={disabled}
    />
  );
}

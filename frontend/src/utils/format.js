/**
 * format.js
 * Provides shared presentation formatting without changing application data.
 * Used by dashboard, workout, and progress presentation components.
 */

import { safeFormatDate } from "./date";

/**
 * Formats a number for compact UI display.
 * @param {unknown} value Numeric value or numeric string supplied by the UI.
 * @returns {string} Rounded localized number, or zero for invalid input.
 */
export function formatNumber(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "0";
  return new Intl.NumberFormat().format(Math.round(numericValue));
}

/**
 * Formats a stored calendar date for UI presentation.
 * @param {unknown} iso API date or datetime value.
 * @returns {string} Localized calendar date, or an empty string for invalid input.
 */
export function formatDate(iso) {
  const date = safeFormatDate(iso);
  if (!date) return "";
  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(iso);
  }
}

/**
 * RepForge date utilities.
 *
 * All dates stored on the wire are local calendar dates in "YYYY-MM-DD" form.
 * new Date().toISOString() yields a UTC date, which is the wrong day for timezones
 * ahead of UTC (e.g. IST) between 00:00 and 05:30 local time. These helpers avoid
 * that by working purely with the local date components.
 */

/**
 * Return the local calendar date as "YYYY-MM-DD" without UTC conversion.
 * Defaults to now; pass a Date to format an arbitrary moment's local date.
 */
export function toLocalISODate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Safely turn an API date/datetime into "YYYY-MM-DD" (local, no timezone shift).
 * Returns "" for null/undefined/invalid values.
 */
export function safeFormatDate(iso) {
  if (!iso) return "";
  const s = String(iso);
  const datePart = s.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return "";
  return isValidLocalDate(datePart) ? datePart : "";
}

export function isValidLocalDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || "")) return false;
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/**
 * Build a full local ISO datetime "YYYY-MM-DDTHH:mm:ss.sssZ" from a local date
 * string, safe for inputs that expect a datetime but only have a calendar date.
 */
export function localDateToISO(dateStr) {
  if (!dateStr) return "";
  return `${dateStr}T00:00:00`;
}

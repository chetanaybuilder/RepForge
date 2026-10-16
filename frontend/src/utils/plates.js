/**
 * RepForge - Barbell Plate Calculator & Visual Loading Engine
 *
 * Provides Olympic barbell plate math, standard color classifications,
 * and quick-add plate builder utilities.
 */

export const BAR_TYPES = [
  { value: 20, label: "Olympic Bar (20 kg)" },
  { value: 15, label: "Technique / Women's Bar (15 kg)" },
  { value: 10, label: "Junior / EZ-Curl Bar (10 kg)" },
  { value: 0, label: "Dumbbell / Machine (0 kg Base)" },
];

export const STANDARD_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

export const PLATE_THEMES = {
  25: { bg: "#dc2626", border: "#ef4444", text: "#ffffff", label: "25kg", width: 14, height: 72 }, // Red
  20: { bg: "#2563eb", border: "#3b82f6", text: "#ffffff", label: "20kg", width: 13, height: 68 }, // Blue
  15: { bg: "#eab308", border: "#fde047", text: "#000000", label: "15kg", width: 12, height: 60 }, // Yellow
  10: { bg: "#16a34a", border: "#22c55e", text: "#ffffff", label: "10kg", width: 11, height: 52 }, // Green
  5: { bg: "#ffffff", border: "#cbd5e1", text: "#0f172a", label: "5kg", width: 10, height: 44 },   // White
  2.5: { bg: "#334155", border: "#64748b", text: "#ffffff", label: "2.5kg", width: 9, height: 36 },// Dark grey / black
  1.25: { bg: "#94a3b8", border: "#cbd5e1", text: "#0f172a", label: "1.25", width: 8, height: 30 }, // Silver / chrome
};

/**
 * Calculates optimal plate breakdown per side for a given total weight.
 *
 * @param {number} totalWeightKg Total weight in kg
 * @param {number} [barWeightKg=20] Bar weight in kg
 * @returns {{
 *   barWeight: number,
 *   perSideWeight: number,
 *   platesPerSide: number[],
 *   plateCounts: Record<number, number>,
 *   remainder: number,
 *   isExact: boolean
 * }}
 */
export function calculateBarbellPlates(totalWeightKg, barWeightKg = 20) {
  const target = Math.max(0, Number(totalWeightKg) || 0);
  const bar = Math.max(0, Number(barWeightKg) || 0);

  if (target <= bar) {
    return {
      barWeight: bar,
      perSideWeight: 0,
      platesPerSide: [],
      plateCounts: {},
      remainder: target < bar ? bar - target : 0,
      isExact: target === bar,
    };
  }

  const weightNeeded = target - bar;
  let perSideNeeded = Math.round((weightNeeded / 2) * 100) / 100;
  const platesPerSide = [];
  const plateCounts = {};

  for (const plate of STANDARD_PLATES_KG) {
    while (perSideNeeded >= plate - 0.001) {
      platesPerSide.push(plate);
      plateCounts[plate] = (plateCounts[plate] || 0) + 1;
      perSideNeeded = Math.round((perSideNeeded - plate) * 100) / 100;
    }
  }

  return {
    barWeight: bar,
    perSideWeight: Math.round(((target - bar) / 2) * 100) / 100,
    platesPerSide,
    plateCounts,
    remainder: perSideNeeded,
    isExact: perSideNeeded < 0.01,
  };
}

/**
 * Generates a concise summary text of the plate breakdown.
 * e.g. "20kg/side [20]" or "40kg/side [20, 20]"
 *
 * @param {number} totalWeightKg
 * @param {number} [barWeightKg=20]
 * @returns {string}
 */
export function formatPlatesSummary(totalWeightKg, barWeightKg = 20) {
  const target = Number(totalWeightKg) || 0;
  const bar = Number(barWeightKg) || 0;

  if (target <= 0) return "0 kg";
  if (bar === 0) return `${target} kg plate load`;
  if (target <= bar) return `Bar only (${bar} kg)`;

  const { perSideWeight, platesPerSide, isExact } = calculateBarbellPlates(target, bar);
  if (platesPerSide.length === 0) return `${bar} kg bar`;

  const counts = {};
  platesPerSide.forEach((p) => {
    counts[p] = (counts[p] || 0) + 1;
  });

  const parts = Object.entries(counts)
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([p, count]) => (count > 1 ? `${count}×${p}` : `${p}`));

  const text = `${perSideWeight}kg/side (${parts.join(" + ")})`;
  return isExact ? text : `${text} ~approx`;
}

/**
 * RepForge - Barbell Plate Calculator & Visual Loading Engine
 *
 * Provides Olympic barbell plate math, standard color classifications,
 * and quick-add plate builder utilities.
 */

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
export function calculateBarbellPlates(totalWeightKg, barWeightKg, availablePlatesKg = []) {
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

  const inventory = [...new Set(availablePlatesKg.map(Number))]
    .filter((plate) => Number.isFinite(plate) && plate > 0)
    .sort((left, right) => right - left);
  const weightNeeded = target - bar;
  const perSideNeeded = Math.round((weightNeeded / 2) * 100) / 100;
  const targetCents = Math.round(perSideNeeded * 100);
  const plateCents = inventory.map((plate) => Math.round(plate * 100));
  const best = Array(targetCents + 1).fill(null);
  best[0] = [];

  for (let amount = 1; amount <= targetCents; amount += 1) {
    for (let index = 0; index < plateCents.length; index += 1) {
      const plate = plateCents[index];
      if (plate <= amount && best[amount - plate] !== null) {
        const candidate = [...best[amount - plate], index];
        if (best[amount] === null || candidate.length < best[amount].length) {
          best[amount] = candidate;
        }
      }
    }
  }

  let representedCents = targetCents;
  while (representedCents > 0 && best[representedCents] === null) {
    representedCents -= 1;
  }
  const platesPerSide = (best[representedCents] || []).map((index) => inventory[index]);
  const plateCounts = {};
  platesPerSide.forEach((plate) => {
    plateCounts[plate] = (plateCounts[plate] || 0) + 1;
  });
  const remainder = (targetCents - representedCents) / 100;

  return {
    barWeight: bar,
    perSideWeight: Math.round(((target - bar) / 2) * 100) / 100,
    platesPerSide,
    plateCounts,
    remainder: Math.round(remainder * 100) / 100,
    isExact: representedCents === targetCents,
  };
}

/**
 * Generates a concise summary text of the plate breakdown.
 * e.g. "20 kg per side (20)"
 *
 * @param {number} totalWeightKg
 * @param {number} [barWeightKg=20]
 * @returns {string}
 */
export function formatPlatesSummary(totalWeightKg, barWeightKg, availablePlatesKg = []) {
  const target = Number(totalWeightKg) || 0;
  const bar = Number(barWeightKg) || 0;

  if (target <= 0) return "0 kg";
  if (bar === 0) return `${target} kg plate load`;
  if (target < bar) return `Cannot load ${target} kg: bar weighs ${bar} kg`;
  if (target === bar) return `Bar only (${bar} kg)`;

  const { perSideWeight, platesPerSide, isExact } = calculateBarbellPlates(
    target,
    bar,
    availablePlatesKg
  );
  if (platesPerSide.length === 0) return `${bar} kg bar`;

  const counts = {};
  platesPerSide.forEach((p) => {
    counts[p] = (counts[p] || 0) + 1;
  });

  const parts = Object.entries(counts)
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([p, count]) => (count > 1 ? `${count}×${p}` : `${p}`));

  if (!isExact) return `Cannot load exactly: ${perSideWeight} kg per side needed`;
  return `${perSideWeight} kg per side (${parts.join(" + ")})`;
}

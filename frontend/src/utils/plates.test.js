import { describe, expect, it } from "vitest";
import { calculateBarbellPlates, formatPlatesSummary } from "./plates";

describe("calculateBarbellPlates", () => {
  it("calculates a symmetric exact load from the selected inventory", () => {
    const result = calculateBarbellPlates(60, 20, [20]);

    expect(result.isExact).toBe(true);
    expect(result.perSideWeight).toBe(20);
    expect(result.platesPerSide).toEqual([20]);
  });

  it("does not invent a plate size that is absent from inventory", () => {
    const result = calculateBarbellPlates(60, 20, [10]);

    expect(result.isExact).toBe(true);
    expect(result.platesPerSide).toEqual([10, 10]);
    expect(result.plateCounts[20]).toBeUndefined();
  });

  it("marks impossible loads as inexact instead of changing the target", () => {
    const result = calculateBarbellPlates(61, 20, [20, 10, 5, 2.5]);

    expect(result.isExact).toBe(false);
    expect(result.remainder).toBe(0.5);
    expect(formatPlatesSummary(61, 20, [20, 10, 5, 2.5])).toContain("Cannot load exactly");
  });

  it("supports a custom bar weight without a default assumption", () => {
    const result = calculateBarbellPlates(50, 15, [10, 5, 2.5]);

    expect(result.barWeight).toBe(15);
    expect(result.perSideWeight).toBe(17.5);
    expect(result.isExact).toBe(true);
  });

  it("finds a valid non-greedy combination in a custom inventory", () => {
    const result = calculateBarbellPlates(32, 20, [4, 3]);

    expect(result.isExact).toBe(true);
    expect(result.platesPerSide).toEqual([3, 3]);
  });

  it("rejects a total target below the selected bar weight", () => {
    const result = calculateBarbellPlates(15, 20, [5, 2.5]);

    expect(result.isExact).toBe(false);
    expect(formatPlatesSummary(15, 20, [5, 2.5])).toContain("bar weighs 20 kg");
  });
});
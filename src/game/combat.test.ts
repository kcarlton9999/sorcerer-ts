import { describe, expect, it } from "vitest";
import {
  COMBAT_COLORS,
  getBestDefenderColor,
  getCombatLineFromValue,
  getCombatLineForColors,
  getCombatResultForDifferential,
  getCombatResults,
} from "./combat";

describe("combat results table", () => {
  it("maps the available numeric combat-line values", () => {
    expect([1, 2, 3, 4, 5, 6].map(getCombatLineFromValue)).toEqual([
      "best",
      "good",
      "inferior",
      "poor",
      "worst",
      "neutral",
    ]);
  });

  it("chooses the combat line from the attacker's and defender's colors", () => {
    expect(getCombatLineForColors("blue", "green")).toBe("best");
    expect(getCombatLineForColors("blue", "red")).toBe("poor");
    expect(getCombatLineForColors("red", "blue")).toBe("good");
    expect(getCombatLineForColors("purple", "purple")).toBe("neutral");
    expect(COMBAT_COLORS).toEqual([
      "blue",
      "green",
      "yellow",
      "orange",
      "red",
      "purple",
    ]);
  });

  it("finds the defender color that gives each attacker the best line", () => {
    for (const attackerColor of COMBAT_COLORS) {
      const defenderColor = getBestDefenderColor(attackerColor);
      expect(defenderColor).not.toBe(attackerColor);
      expect(getCombatLineForColors(attackerColor, defenderColor)).toBe("best");
    }

    expect(getBestDefenderColor("blue")).toBe("green");
  });

  it("looks up results using the strength differential and die roll", () => {
    expect(getCombatResults("best", 0, 0, 1)).toBe(2);
    expect(getCombatResults("good", 8, 5, 4)).toBe(3);
    expect(getCombatResults("neutral", 6, 6, 2)).toBe(0);
  });

  it("clamps strength differentials to the selected line's endpoints", () => {
    expect(getCombatResults("best", -100, 0, 1)).toBe(-1);
    expect(getCombatResults("worst", 100, 0, 1)).toBe(6);
  });

  it("accepts a direct combat differential for the test page", () => {
    expect(getCombatResultForDifferential("neutral", -5, 1)).toBe(-1);
    expect(getCombatResultForDifferential("neutral", 13, 1)).toBe(6);
  });

  it("rejects invalid numeric line values and die rolls", () => {
    expect(() => getCombatLineFromValue(0)).toThrow(
      "Unknown combat line value: 0",
    );
    expect(() => getCombatResults("best", 1, 1, 0)).toThrow(
      "Die roll must be an integer from 1 to 6: 0",
    );
  });
});

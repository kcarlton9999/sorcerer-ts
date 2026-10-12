import combatTable from "../data/combat_results.json";

export type CombatLine = keyof typeof combatTable.combatLines;
export type CombatColor = keyof typeof combatTable.colorValueChart;
export type CombatOutcome = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const COMBAT_COLORS = Object.keys(
  combatTable.colorValueChart,
) as CombatColor[];

export function getCombatLineFromValue(value: number): CombatLine {
  if (!Number.isInteger(value)) {
    throw new Error(`Combat line value must be an integer: ${value}`);
  }

  const line = Object.entries(combatTable.combatLineByValue).find(
    ([lineValue]) => lineValue === String(value),
  )?.[1];
  if (!line || !isCombatLine(line)) {
    throw new Error(`Unknown combat line value: ${value}`);
  }

  return line;
}

export function getCombatLineForColors(
  attackerColor: CombatColor,
  defenderColor: CombatColor,
): CombatLine {
  if (!isCombatColor(attackerColor) || !isCombatColor(defenderColor)) {
    throw new Error(
      `Unsupported combat color pairing: ${attackerColor} vs ${defenderColor}`,
    );
  }

  const colorValue = combatTable.colorValueChart[attackerColor][defenderColor];
  return getCombatLineFromValue(colorValue);
}

export function getBestDefenderColor(attackerColor: CombatColor): CombatColor {
  if (!isCombatColor(attackerColor)) {
    throw new Error(`Unsupported attacker color: ${attackerColor}`);
  }

  const bestDefender = COMBAT_COLORS.find(
    (defenderColor) =>
      getCombatLineForColors(attackerColor, defenderColor) === "best",
  );
  if (!bestDefender) {
    throw new Error(`No best defender color found for ${attackerColor}`);
  }

  return bestDefender;
}

export function getCombatResults(
  combatLine: CombatLine,
  attackStrength: number,
  defendStrength: number,
  dieRoll: number,
): CombatOutcome {
  if (
    !Number.isSafeInteger(attackStrength) ||
    !Number.isSafeInteger(defendStrength)
  ) {
    throw new Error("Attack and defense strengths must be safe integers");
  }
  return getCombatResultForDifferential(
    combatLine,
    attackStrength - defendStrength,
    dieRoll,
  );
}

export function getCombatResultForDifferential(
  combatLine: CombatLine,
  strengthDifferential: number,
  dieRoll: number,
): CombatOutcome {
  if (!isCombatLine(combatLine)) {
    throw new Error(`Unknown combat line: ${combatLine}`);
  }
  if (!Number.isSafeInteger(strengthDifferential)) {
    throw new Error("Combat differential must be a safe integer");
  }
  if (!Number.isInteger(dieRoll) || dieRoll < 1 || dieRoll > 6) {
    throw new Error(`Die roll must be an integer from 1 to 6: ${dieRoll}`);
  }

  const { minDifferential, maxDifferential } =
    combatTable.combatLines[combatLine];
  const differential = Math.min(
    maxDifferential,
    Math.max(minDifferential, strengthDifferential),
  );
  const tableColumn = differential - minDifferential;
  const row = Object.entries(combatTable.resultsByDie).find(
    ([roll]) => roll === String(dieRoll),
  )?.[1];
  const result = row?.[tableColumn];

  if (result === undefined || !isCombatOutcome(result)) {
    throw new Error(
      `Missing CRT result for die roll ${dieRoll} and column ${tableColumn}`,
    );
  }

  return result;
}

function isCombatLine(value: string): value is CombatLine {
  return Object.hasOwn(combatTable.combatLines, value);
}

function isCombatColor(value: string): value is CombatColor {
  return Object.hasOwn(combatTable.colorValueChart, value);
}

function isCombatOutcome(value: number): value is CombatOutcome {
  return Number.isInteger(value) && value >= -1 && value <= 6;
}

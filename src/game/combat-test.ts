import { MAGIC_COLOR_HEX } from "./map";
import combatTable from "../data/combat_results.json";
import {
  COMBAT_COLORS,
  getBestDefenderColor,
  getCombatLineForColors,
  getCombatResultForDifferential,
  type CombatColor,
  type CombatOutcome,
} from "./combat";
import "./combat-test.css";

let attackerColor: CombatColor = "blue";
let defenderColor: CombatColor = "red";
let adjustDefenderToBest = true;
let differential = 0;
let lastRoll: number | null = null;
let lastOutcome: CombatOutcome | null = null;

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("Combat test page root is missing");
}

function colorOptions(
  group: "attacker" | "defender",
  selected: CombatColor,
  disabledColor?: CombatColor,
) {
  return COMBAT_COLORS.map(
    (color) => `
      <button
        class="color-choice${color === selected ? " is-selected" : ""}${color === disabledColor ? " is-unavailable" : ""}"
        type="button"
        data-color-group="${group}"
        data-color="${color}"
        aria-pressed="${color === selected}"
        aria-label="${color} ${group} color"
        title="${color === disabledColor ? "Cannot match the attacker's color" : color}"
        ${color === disabledColor ? "disabled" : ""}
      ><span class="color-chip" style="--chip-color: ${MAGIC_COLOR_HEX[color]}"></span><span>${color}</span></button>`,
  ).join("");
}

function formatDifferential(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function outcomeLabel(outcome: CombatOutcome | null): string {
  if (outcome === null) return "Ready to roll";
  if (outcome === -1) return "No effect";
  if (outcome === 0) return "Pinned";
  return `${outcome} ${outcome === 1 ? "step" : "steps"} lost`;
}

function drawResult(): string {
  if (lastRoll === null || lastOutcome === null) {
    return `<div class="result-placeholder"><span class="die-face">?</span><span>Roll to reveal the combat result</span></div>`;
  }
  return `<div class="result-summary">
    <div class="die-readout"><span class="result-caption">DIE ROLL</span><strong class="die-face">${lastRoll}</strong></div>
    <div class="result-divider" aria-hidden="true"></div>
    <div class="outcome-readout"><span class="result-caption">CRT RESULT</span><strong class="outcome outcome--${lastOutcome < 0 ? "none" : lastOutcome === 0 ? "pin" : "loss"}">${outcomeLabel(lastOutcome)}</strong></div>
  </div>`;
}

function clearResult(): void {
  lastRoll = null;
  lastOutcome = null;
}

function render(): void {
  const combatLine = getCombatLineForColors(attackerColor, defenderColor);
  const { minDifferential, maxDifferential } =
    combatTable.combatLines[combatLine];
  differential = Math.max(
    minDifferential,
    Math.min(maxDifferential, differential),
  );

  app!.innerHTML = `
    <main class="combat-page">
      <header class="combat-header">
        <a class="combat-back" href="/">Back to the Game Board</a>
        <p class="combat-kicker">SORCERER · TEST BENCH 01</p>
        <h1>Combat <span>Results</span></h1>
        <p class="combat-intro">Set up a matchup, choose a CRT line and differential, then roll the die.</p>
      </header>

      <section class="combat-arena" aria-label="Combat matchup">
        <div class="unit-card">
          <span class="unit-role">ATTACKER</span>
          <span class="unit-emblem" style="--unit-color: ${MAGIC_COLOR_HEX[attackerColor]}">${attackerColor.slice(0, 1).toUpperCase()}</span>
          <strong class="unit-name">${attackerColor}</strong>
          <span class="unit-color-caption">magic color</span>
        </div>
        <div class="versus" aria-hidden="true"><span>VS</span></div>
        <div class="unit-card">
          <span class="unit-role">DEFENDER</span>
          <span class="unit-emblem" style="--unit-color: ${MAGIC_COLOR_HEX[defenderColor]}">${defenderColor.slice(0, 1).toUpperCase()}</span>
          <strong class="unit-name">${defenderColor}</strong>
          <span class="unit-color-caption">magic color</span>
        </div>
      </section>

      <section class="combat-controls" aria-label="Combat setup">
        <div class="control-section">
          <div class="section-heading"><span class="step-number">01</span><div><h2>Choose unit colors</h2><p>Colors are for matchup identification.</p></div></div>
          <fieldset class="color-picker">
            <legend>Attacking unit</legend>
            <div class="color-options">${colorOptions("attacker", attackerColor)}</div>
            <label class="best-match-toggle" for="adjust-defender-to-best">
              <input id="adjust-defender-to-best" type="checkbox"${adjustDefenderToBest ? " checked" : ""} />
              <span class="toggle-copy"><strong>Auto-select Best defender</strong><span>Choose the defender color that gives this attacker the Best line.</span></span>
            </label>
          </fieldset>
          <fieldset class="color-picker">
            <legend>Defending unit</legend>
            <div class="color-options">${colorOptions("defender", defenderColor, attackerColor)}</div>
          </fieldset>
        </div>

        <div class="control-section line-section">
          <div class="section-heading"><span class="step-number">02</span><div><h2>Set the CRT</h2><p>The combat line follows the attacker and defender colors.</p></div></div>
          <div class="automatic-line"><span class="field-label">Automatic combat line</span><output id="combat-line" aria-live="polite">${combatLine}</output></div>
          <div class="differential-heading"><label class="field-label" for="differential">Combat differential</label><output id="differential-value" for="differential">${formatDifferential(differential)}</output></div>
          <input id="differential" type="range" min="${minDifferential}" max="${maxDifferential}" step="1" value="${differential}" />
          <div class="range-labels"><span>${formatDifferential(minDifferential)}</span><span>${formatDifferential(maxDifferential)}</span></div>
          <p class="range-help">Attack strength minus defense strength. Zero is equal strength; positive values favor the attacker.</p>
        </div>

        <div class="roll-section">
          <div class="section-heading"><span class="step-number">03</span><div><h2>Roll for result</h2><p>Random die roll from 1 to 6.</p></div></div>
          <button id="roll-die" class="roll-button" type="button"><span aria-hidden="true">✦</span> Roll the die</button>
          <div id="combat-result" class="combat-result" aria-live="polite" aria-atomic="true">${drawResult()}</div>
        </div>
      </section>
      <footer class="combat-footer">Table result codes: <strong>−1</strong> no effect <span>·</span> <strong>0</strong> PIN <span>·</span> <strong>1–6</strong> steps lost</footer>
    </main>
  `;

  app!
    .querySelectorAll<HTMLButtonElement>("[data-color-group]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const color = button.dataset.color as CombatColor;
        if (button.dataset.colorGroup === "attacker") {
          attackerColor = color;
          if (adjustDefenderToBest) {
            defenderColor = getBestDefenderColor(color);
          } else if (defenderColor === color) {
            defenderColor =
              COMBAT_COLORS.find((candidate) => candidate !== color) ?? color;
          }
        } else {
          defenderColor = color;
        }
        clearResult();
        render();
      });
    });

  app!
    .querySelector<HTMLInputElement>("#adjust-defender-to-best")!
    .addEventListener("change", (event) => {
      adjustDefenderToBest = (event.currentTarget as HTMLInputElement).checked;
    });

  const differentialSlider =
    app!.querySelector<HTMLInputElement>("#differential")!;
  differentialSlider.addEventListener("input", () => {
    differential = Number(differentialSlider.value);
    clearResult();
    app!.querySelector<HTMLOutputElement>("#differential-value")!.value =
      formatDifferential(differential);
    app!.querySelector<HTMLDivElement>("#combat-result")!.innerHTML =
      drawResult();
  });

  app!
    .querySelector<HTMLButtonElement>("#roll-die")!
    .addEventListener("click", () => {
      lastRoll = Math.floor(Math.random() * 6) + 1;
      lastOutcome = getCombatResultForDifferential(
        combatLine,
        differential,
        lastRoll,
      );
      app!.querySelector<HTMLDivElement>("#combat-result")!.innerHTML =
        drawResult();
    });
}

render();

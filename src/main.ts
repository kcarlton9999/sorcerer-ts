import { parse } from "yaml";
import boardYaml from "./data/hex_data.yml?raw";
import "./style.css";
import {
  auditTerrainEdges,
  BOARD_COLUMNS,
  BOARD_ROWS,
  DIRECTIONS,
  edgeVertexIndexes,
  getNeighborId,
  hexCenter,
  hexPoints,
  MAGIC_COLOR_HEX,
  OPPOSITE_DIRECTIONS,
  parseMapData,
  type MapCell,
  type TerrainType,
} from "./game/map";
import {
  advanceSequence,
  getInitialSequenceState,
  getSequenceStepStatus,
  SEQUENCE_STEPS,
  type SequenceState,
} from "./game/sequence";

const boardData = parseMapData(parse(boardYaml));
const terrainDiagnostics = auditTerrainEdges(boardData);
const hexSize = 22;
const boardPadding = 24;
const boardWidth =
  boardPadding * 2 + 2 * hexSize + 1.5 * hexSize * (BOARD_COLUMNS - 1);
const boardHeight =
  boardPadding * 2 + 2 * hexSize + Math.sqrt(3) * hexSize * (BOARD_ROWS - 1);
const cellsById = new Map(boardData.cells.map((cell) => [cell.id, cell]));

function svgPoints(points: [number, number][]): string {
  return points.map((point) => point.join(",")).join(" ");
}

function renderRiver(start: [number, number], end: [number, number]): string {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy);
  const offsetX = (-dy / length) * 2.5;
  const offsetY = (dx / length) * 2.5;
  const firstControlX = start[0] + dx / 3 + offsetX;
  const firstControlY = start[1] + dy / 3 + offsetY;
  const secondControlX = start[0] + (2 * dx) / 3 - offsetX;
  const secondControlY = start[1] + (2 * dy) / 3 - offsetY;
  return `<path class="terrain-mark terrain-mark--river" d="M ${start[0]} ${start[1]} C ${firstControlX} ${firstControlY} ${secondControlX} ${secondControlY} ${end[0]} ${end[1]}" />`;
}

function renderMountain(
  start: [number, number],
  end: [number, number],
  center: { x: number; y: number },
): string {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy);
  const tangentX = dx / length;
  const tangentY = dy / length;
  const middleX = (start[0] + end[0]) / 2;
  const middleY = (start[1] + end[1]) / 2;
  const normalX = (middleX - center.x) / hexSize;
  const normalY = (middleY - center.y) / hexSize;

  return [-1, 1]
    .map((side) =>
      [0.25, 0.75]
        .map((position) => {
          const baseX = start[0] + dx * position + normalX * side * 2;
          const baseY = start[1] + dy * position + normalY * side * 2;
          const pointAt = (alongEdge: number, acrossEdge: number) => [
            baseX + tangentX * alongEdge + normalX * side * acrossEdge,
            baseY + tangentY * alongEdge + normalY * side * acrossEdge,
          ];
          const points = [
            pointAt(-3, 0),
            pointAt(-1, 2),
            pointAt(0, 0),
            pointAt(1, 2),
            pointAt(3, 0),
          ] as [number, number][];
          return `<polyline class="terrain-mark terrain-mark--mountain" points="${svgPoints(points)}" />`;
        })
        .join(""),
    )
    .join("");
}

function renderTerrainEdges(): string {
  const marks: string[] = [];

  for (const cell of boardData.cells) {
    const center = hexCenter(cell, hexSize, boardPadding);
    const vertices = hexPoints(center.x, center.y, hexSize);

    for (const direction of DIRECTIONS) {
      const neighborId = getNeighborId(cell, direction);
      if (neighborId && cell.id > neighborId) {
        continue;
      }

      const [firstIndex, secondIndex] = edgeVertexIndexes[direction];
      const start = vertices[firstIndex];
      const end = vertices[secondIndex];
      if (!start || !end) {
        throw new Error(`Missing polygon vertices for hex ${cell.id}`);
      }

      const neighbor = neighborId ? cellsById.get(neighborId) : undefined;
      const terrainTypes = new Set<TerrainType>([cell.terrain[direction]]);
      if (neighbor) {
        terrainTypes.add(neighbor.terrain[OPPOSITE_DIRECTIONS[direction]]);
      }

      terrainTypes.delete("none");
      for (const terrain of terrainTypes) {
        if (terrain === "river") {
          marks.push(renderRiver(start, end));
        } else if (terrain === "mountain") {
          marks.push(renderMountain(start, end, center));
        }
      }
    }
  }

  return marks.join("");
}

function renderCell(cell: MapCell): string {
  const center = hexCenter(cell, hexSize, boardPadding);
  const vertices = hexPoints(center.x, center.y, hexSize);
  const terrainDescription = DIRECTIONS.filter(
    (direction) => cell.terrain[direction] !== "none",
  )
    .map((direction) => `${direction} ${cell.terrain[direction]}`)
    .join(", ");
  const label = [
    `Hex ${cell.id}`,
    cell.color,
    cell.name?.trim(),
    cell.isCity ? "city" : undefined,
    terrainDescription || "no terrain markings",
  ]
    .filter(Boolean)
    .join(", ");

  return `<g class="hex hex--${cell.color}" data-id="${cell.id}" tabindex="0" role="button" aria-label="${escapeHtml(label)}">
    <polygon points="${svgPoints(vertices)}" />
    <text x="${center.x}" y="${center.y + 3}">${cell.id}</text>
    ${cell.isCity || cell.name?.trim() ? `<circle class="hex-name-marker${cell.isCity ? " city-marker" : ""}" cx="${center.x}" cy="${center.y + 11}" r="${cell.isCity ? 3.5 : 2.5}"><title>${escapeHtml(cell.name?.trim() ?? "")}</title></circle>` : ""}
  </g>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const riverAnnotations = boardData.cells.reduce(
  (total, cell) =>
    total +
    DIRECTIONS.filter((direction) => cell.terrain[direction] === "river")
      .length,
  0,
);
const mountainAnnotations = boardData.cells.reduce(
  (total, cell) =>
    total +
    DIRECTIONS.filter((direction) => cell.terrain[direction] === "mountain")
      .length,
  0,
);
const mismatches = terrainDiagnostics.mismatches;
const oneSidedEdges = mismatches.filter(
  (mismatch) => mismatch.kind === "one-sided",
);
const conflictingEdges = mismatches.filter(
  (mismatch) => mismatch.kind === "conflict",
);
const edgeWarningMarkup =
  mismatches.length || terrainDiagnostics.boundaryTerrain.length
    ? `<details class="terrain-notes">
        <summary>${conflictingEdges.length} shared-edge conflicts · ${oneSidedEdges.length} one-sided annotations${terrainDiagnostics.boundaryTerrain.length ? ` · ${terrainDiagnostics.boundaryTerrain.length} boundary markings` : ""}</summary>
        <p>All shared-edge conflicts have been resolved. One-sided annotations are displayed on the edge recorded in the source data.</p>
        <ul>
          ${mismatches
            .map(
              (mismatch) =>
                `<li><strong>${mismatch.kind === "conflict" ? "Conflict" : "One-sided"}</strong> · <code>${mismatch.id} ${mismatch.direction}</code> ${mismatch.terrain} · <code>${mismatch.neighborId}</code> ${OPPOSITE_DIRECTIONS[mismatch.direction]} ${mismatch.oppositeTerrain}</li>`,
            )
            .join("")}
          ${terrainDiagnostics.boundaryTerrain
            .map(
              (edge) =>
                `<li><code>${edge.id} ${edge.direction}</code> ${edge.terrain} points beyond the board edge</li>`,
            )
            .join("")}
        </ul>
      </details>`
    : "";

let sequenceState = getInitialSequenceState();

function getSequenceStep(state: SequenceState) {
  const step = SEQUENCE_STEPS[state.stepIndex];
  if (!step) {
    throw new Error(`Unknown sequence step index: ${state.stepIndex}`);
  }
  return step;
}

function getSequencePhaseName(phase: string): string {
  switch (phase) {
    case "A":
      return "First Player";
    case "B":
    case "E":
      return "Joint Attrition";
    case "C":
    case "F":
      return "Joint Combat";
    case "D":
      return "Second Player";
    case "G":
      return "Game-Turn Interphase";
    default:
      throw new Error(`Unknown sequence phase: ${phase}`);
  }
}

function renderSequenceSteps(state: SequenceState): string {
  return SEQUENCE_STEPS.map((step, index) => {
    const status = getSequenceStepStatus(index, state.stepIndex);
    const gridRow =
      step.lane === "joint" ? "1 / 3" : step.lane === "player1" ? "1" : "2";
    const currentAttribute = status === "current" ? 'aria-current="step"' : "";
    const vortexRoller = step.vortexRoller
      ? `<span class="sequence-roller">Current Player rolls · ${step.vortexRoller === "player1" ? "Player 1" : "Player 2"}</span>`
      : "";
    return `<article class="sequence-step sequence-step--${status} sequence-step--${step.lane}" data-sequence-step="${index}" data-lane="${step.lane}" data-status="${status}" style="grid-column: ${index + 2}; grid-row: ${gridRow}" ${currentAttribute}>
      <span class="sequence-phase">Phase ${step.phase} · ${getSequencePhaseName(step.phase)}</span>
      <strong>${step.name}</strong>
      ${vortexRoller}
      <span class="sequence-step-status">${status === "current" ? "In progress" : status === "complete" ? "Complete" : "Upcoming"}</span>
    </article>`;
  }).join("");
}

function renderSequenceTracker(state: SequenceState): string {
  const currentStep = getSequenceStep(state);
  return `<section class="sequence-card" aria-labelledby="sequence-title">
    <header class="sequence-header">
      <div>
        <p class="eyebrow">Game-turn sequence</p>
        <h2 id="sequence-title">Two-player phase tracker</h2>
        <p class="sequence-current" aria-live="polite">
          <strong>Game-Turn <span data-sequence-turn>${state.gameTurn}</span></strong>
          <span data-sequence-current>Phase ${currentStep.phase} · ${getSequencePhaseName(currentStep.phase)} — ${currentStep.name} · In progress</span>
        </p>
      </div>
      <button class="sequence-advance" type="button" data-sequence-advance>Advance phase</button>
    </header>
    <div class="sequence-scroll">
      <div class="sequence-track" role="group" aria-label="Two-player game-turn ${state.gameTurn} sequence">
        <span class="sequence-lane sequence-lane--player1" style="grid-column: 1; grid-row: 1">Player 1</span>
        <span class="sequence-lane sequence-lane--player2" style="grid-column: 1; grid-row: 2">Player 2</span>
        ${renderSequenceSteps(state)}
      </div>
    </div>
    <p class="sequence-note">Tracker only: advancing marks the sequence and does not perform game actions.</p>
  </section>`;
}

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <main class="game-shell">
    <header class="game-header">
      <div>
        <p class="eyebrow">Sorcerer · Board data</p>
        <h1>The Sorcerer Board</h1>
        <p class="subtitle">The complete 23-column map, rendered from its canonical hex data.</p>
        <a class="chart-link" href="/color-value-chart.html">Open the Color Value Chart</a>
        <span class="chart-link-separator" aria-hidden="true">|</span>
        <a class="chart-link" href="/combat-test.html">Open the Combat Test Bench</a>
      </div>
      <div class="phase-card">
        <span>Board source</span>
        <strong>src/data/hex_data.yml</strong>
      </div>
    </header>
    <section class="game-layout">
      <div class="board-card">
        <div class="board-toolbar">
          <span class="status-dot"></span>
          <span>${boardData.cells.length} hexes · flat-top · staggered columns</span>
          <span class="board-hint">Select a hex to inspect it</span>
        </div>
        ${edgeWarningMarkup}
        <div class="board-wrap" tabindex="0" role="region" aria-label="Scrollable Sorcerer board">
          <svg class="board" viewBox="0 0 ${boardWidth} ${boardHeight}" role="group" aria-label="Sorcerer 23-column hex board">
            ${boardData.cells.map(renderCell).join("")}
            <g aria-hidden="true">${renderTerrainEdges()}</g>
          </svg>
        </div>
        <div class="board-pan-controls" role="group" aria-label="Pan board">
          <span>Pan board</span>
          <button type="button" data-pan="left" aria-label="Scroll board left">←</button>
          <button type="button" data-pan="up" aria-label="Scroll board up">↑</button>
          <button type="button" data-pan="down" aria-label="Scroll board down">↓</button>
          <button type="button" data-pan="right" aria-label="Scroll board right">→</button>
          <span class="control-divider" aria-hidden="true"></span>
          <span>Map scale</span>
          <button type="button" data-zoom="out" aria-label="Zoom map out">−</button>
          <output class="map-scale" aria-live="polite">100%</output>
          <button type="button" data-zoom="in" aria-label="Zoom map in">+</button>
          <button type="button" data-zoom="reset">Reset</button>
        </div>
        ${renderSequenceTracker(sequenceState)}
      </div>
      <aside class="legend-card">
        <p class="eyebrow">Board key</p>
        <h2>Hexes of Color</h2>
        <p class="legend-copy">Hex fill shows its magic color. Terrain marks follow the directional edge attributes in the source data.</p>
        <div class="legend">
          ${Object.keys(MAGIC_COLOR_HEX)
            .map(
              (color) =>
                `<div class="legend-item"><span class="swatch swatch--${color}"></span><span>${color}</span></div>`,
            )
            .join("")}
        </div>
        <div class="terrain-legend">
          <div class="terrain-legend-item"><span class="terrain-swatch terrain-swatch--river"></span><span>River edge</span></div>
          <div class="terrain-legend-item"><span class="terrain-swatch terrain-swatch--mountain"></span><span>Mountain range</span></div>
        </div>
        <div class="selection" aria-live="polite">
          <span class="eyebrow">Selected hex</span>
          <strong id="selection-title">None</strong>
          <dl id="selection-detail">
            <dt>Hex</dt><dd>Select a hex on the board.</dd>
          </dl>
        </div>
        <div class="board-summary">
          <span class="eyebrow">Source attributes</span>
          <strong>${riverAnnotations} river · ${mountainAnnotations} mountain annotations</strong>
          <span>${boardData.cells.filter((cell) => cell.isCity).length} city hexes · ${boardData.cells.filter((cell) => cell.name !== null).length} named hexes</span>
        </div>
      </aside>
    </section>
  </main>
  <div id="city-tooltip" class="city-tooltip" role="tooltip" hidden></div>
`;

const sequenceCard = document.querySelector<HTMLElement>(".sequence-card");
const sequenceTurn = document.querySelector<HTMLElement>(
  "[data-sequence-turn]",
);
const sequenceCurrent = document.querySelector<HTMLElement>(
  "[data-sequence-current]",
);
const sequenceTrack = document.querySelector<HTMLElement>(".sequence-track");
const sequenceAdvanceButton = document.querySelector<HTMLButtonElement>(
  "[data-sequence-advance]",
);
if (
  !sequenceCard ||
  !sequenceTurn ||
  !sequenceCurrent ||
  !sequenceTrack ||
  !sequenceAdvanceButton
) {
  throw new Error("Game-turn sequence UI is missing from the page");
}

sequenceAdvanceButton.addEventListener("click", () => {
  sequenceState = advanceSequence(sequenceState);
  const currentStep = getSequenceStep(sequenceState);
  sequenceTurn.textContent = String(sequenceState.gameTurn);
  sequenceCurrent.textContent = `Phase ${currentStep.phase} · ${getSequencePhaseName(currentStep.phase)} — ${currentStep.name} · In progress`;
  sequenceTrack.setAttribute(
    "aria-label",
    `Two-player game-turn ${sequenceState.gameTurn} sequence`,
  );
  sequenceTrack.innerHTML = renderSequenceSteps(sequenceState);
});

const boardWrap = document.querySelector<HTMLElement>(".board-wrap");
const cityTooltip = document.querySelector<HTMLDivElement>("#city-tooltip");
const selectionTitle = document.querySelector<HTMLElement>("#selection-title");
const selectionDetail =
  document.querySelector<HTMLElement>("#selection-detail");
if (!boardWrap || !cityTooltip || !selectionTitle || !selectionDetail) {
  throw new Error("Board selection UI is missing from the page");
}
const boardViewport = boardWrap;
const cityTooltipElement = cityTooltip;
const boardSvg = boardViewport.querySelector<SVGSVGElement>(".board");
const mapScaleOutput = document.querySelector<HTMLOutputElement>(".map-scale");
if (!boardSvg || !mapScaleOutput) {
  throw new Error("Board scale controls are missing from the page");
}
const boardSvgElement = boardSvg;
const mapScaleLabel = mapScaleOutput;
let mapScale = 100;
const baseBoardWidth = 1000;

function updateMapScale(): void {
  boardSvgElement.style.width = `${baseBoardWidth * (mapScale / 100)}px`;
  mapScaleLabel.value = `${mapScale}%`;
  mapScaleLabel.textContent = `${mapScale}%`;
}

document
  .querySelectorAll<HTMLButtonElement>("[data-zoom]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.zoom === "reset") {
        mapScale = 100;
      } else {
        mapScale = Math.max(
          50,
          Math.min(200, mapScale + (button.dataset.zoom === "in" ? 25 : -25)),
        );
      }
      updateMapScale();
    });
  });
updateMapScale();

const boardPanControls = document.querySelector<HTMLDivElement>(
  ".board-pan-controls",
);
if (!boardPanControls) {
  throw new Error("Board pan controls are missing from the page");
}

boardPanControls
  .querySelectorAll<HTMLButtonElement>("[data-pan]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      const distance = 0.75;
      const delta = {
        left:
          button.dataset.pan === "left"
            ? -boardViewport.clientWidth * distance
            : 0,
        top:
          button.dataset.pan === "up"
            ? -boardViewport.clientHeight * distance
            : button.dataset.pan === "down"
              ? boardViewport.clientHeight * distance
              : 0,
      };
      if (button.dataset.pan === "right") {
        delta.left = boardViewport.clientWidth * distance;
      }
      boardViewport.scrollBy({ ...delta, behavior: "smooth" });
    });
  });

let activeNameMarker: SVGCircleElement | null = null;

function positionNameTooltip(): void {
  if (!activeNameMarker) {
    return;
  }

  const boardBounds = boardViewport.getBoundingClientRect();
  const markerBounds = activeNameMarker.getBoundingClientRect();
  const visibleLeft = Math.max(boardBounds.left, 8);
  const visibleRight = Math.min(boardBounds.right, window.innerWidth - 8);
  const visibleTop = Math.max(boardBounds.top, 8);
  const visibleBottom = Math.min(boardBounds.bottom, window.innerHeight - 8);
  cityTooltipElement.style.maxWidth = `${Math.max(0, visibleRight - visibleLeft - 16)}px`;

  if (
    markerBounds.right < visibleLeft ||
    markerBounds.left > visibleRight ||
    markerBounds.bottom < visibleTop ||
    markerBounds.top > visibleBottom
  ) {
    cityTooltipElement.hidden = true;
    return;
  }

  cityTooltipElement.hidden = false;
  const tooltipBounds = cityTooltipElement.getBoundingClientRect();
  const gap = 8;
  const rightPosition = markerBounds.right + gap;
  const leftPosition = markerBounds.left - tooltipBounds.width - gap;
  const left =
    rightPosition + tooltipBounds.width <= visibleRight
      ? rightPosition
      : leftPosition >= visibleLeft
        ? leftPosition
        : Math.max(
            visibleLeft,
            Math.min(
              markerBounds.left +
                markerBounds.width / 2 -
                tooltipBounds.width / 2,
              visibleRight - tooltipBounds.width,
            ),
          );
  const abovePosition = markerBounds.top - tooltipBounds.height - gap;
  const belowPosition = markerBounds.bottom + gap;
  const top =
    abovePosition >= visibleTop
      ? abovePosition
      : belowPosition + tooltipBounds.height <= visibleBottom
        ? belowPosition
        : Math.max(
            visibleTop,
            Math.min(
              markerBounds.top +
                markerBounds.height / 2 -
                tooltipBounds.height / 2,
              visibleBottom - tooltipBounds.height,
            ),
          );

  cityTooltipElement.style.left = `${left}px`;
  cityTooltipElement.style.top = `${top}px`;
}

function showNameTooltip(marker: SVGCircleElement): void {
  const name = marker.dataset.hexName;
  if (!name) {
    return;
  }

  activeNameMarker = marker;
  cityTooltipElement.textContent = name;
  positionNameTooltip();
}

function hideNameTooltip(marker?: SVGCircleElement): void {
  if (marker && activeNameMarker !== marker) {
    return;
  }
  activeNameMarker = null;
  cityTooltipElement.hidden = true;
}

boardViewport.addEventListener("scroll", positionNameTooltip);
window.addEventListener("resize", positionNameTooltip);

document.querySelectorAll<SVGGElement>(".hex").forEach((hex) => {
  const selectHex = () => {
    const cell = cellsById.get(hex.dataset.id ?? "");
    if (!cell) {
      throw new Error(`Selected board hex is missing: ${hex.dataset.id}`);
    }

    selectionTitle.textContent = `${cell.id} · ${cell.color}`;
    selectionDetail.replaceChildren();

    const details: [string, string][] = [
      ["Hex ID", cell.id],
      ["Color", cell.color],
    ];
    if (cell.name?.trim()) {
      details.push(["Name", cell.name.trim()]);
    }
    if (cell.isCity) {
      details.push(["Settlement", "City"]);
    }

    const terrain = DIRECTIONS.filter(
      (direction) => cell.terrain[direction] !== "none",
    ).map((direction) => `${direction}: ${cell.terrain[direction]}`);
    details.push([
      "Terrain edges",
      terrain.length ? terrain.join(" · ") : "None",
    ]);

    for (const [label, value] of details) {
      const term = document.createElement("dt");
      term.textContent = label;
      const description = document.createElement("dd");
      description.textContent = value;
      selectionDetail.append(term, description);
    }

    document
      .querySelectorAll(".hex.is-selected")
      .forEach((selected) => selected.classList.remove("is-selected"));
    hex.classList.add("is-selected");
  };

  hex.addEventListener("click", selectHex);
  hex.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectHex();
    }
  });

  const nameMarker = hex.querySelector<SVGCircleElement>(".hex-name-marker");
  if (nameMarker) {
    const namedCell = cellsById.get(hex.dataset.id ?? "");
    const hexName = namedCell?.name?.trim();
    if (!hexName) {
      throw new Error(`Named hex ${hex.dataset.id} has no name`);
    }

    nameMarker.dataset.hexName = hexName;
    nameMarker.addEventListener("pointerenter", () =>
      showNameTooltip(nameMarker),
    );
    nameMarker.addEventListener("pointerleave", () =>
      hideNameTooltip(nameMarker),
    );
    hex.addEventListener("focus", () => showNameTooltip(nameMarker));
    hex.addEventListener("blur", () => hideNameTooltip(nameMarker));
  }
});

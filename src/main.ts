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
    ${cell.isCity ? `<circle class="city-marker" cx="${center.x}" cy="${center.y + 11}" r="2.5"><title>${escapeHtml(cell.name?.trim() ?? "")}</title></circle>` : ""}
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

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <main class="game-shell">
    <header class="game-header">
      <div>
        <p class="eyebrow">Sorcerer · Board data</p>
        <h1>The Sorcerer Board</h1>
        <p class="subtitle">The complete 23-column map, rendered from its canonical hex data.</p>
        <a class="chart-link" href="/color-value-chart.html">Open the Color Value Chart</a>
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
        </div>
      </div>
      <aside class="legend-card">
        <p class="eyebrow">Board key</p>
        <h2>Magic colors</h2>
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

let activeCityMarker: SVGCircleElement | null = null;

function positionCityTooltip(): void {
  if (!activeCityMarker) {
    return;
  }

  const boardBounds = boardViewport.getBoundingClientRect();
  const markerBounds = activeCityMarker.getBoundingClientRect();
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

function showCityTooltip(marker: SVGCircleElement): void {
  const name = marker.dataset.cityName;
  if (!name) {
    return;
  }

  activeCityMarker = marker;
  cityTooltipElement.textContent = name;
  positionCityTooltip();
}

function hideCityTooltip(marker?: SVGCircleElement): void {
  if (marker && activeCityMarker !== marker) {
    return;
  }
  activeCityMarker = null;
  cityTooltipElement.hidden = true;
}

boardViewport.addEventListener("scroll", positionCityTooltip);
window.addEventListener("resize", positionCityTooltip);

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

  const cityMarker = hex.querySelector<SVGCircleElement>(".city-marker");
  if (cityMarker) {
    const city = cellsById.get(hex.dataset.id ?? "");
    const cityName = city?.name?.trim();
    if (!cityName) {
      throw new Error(`City hex ${hex.dataset.id} has no city name`);
    }

    cityMarker.dataset.cityName = cityName;
    cityMarker.addEventListener("pointerenter", () =>
      showCityTooltip(cityMarker),
    );
    cityMarker.addEventListener("pointerleave", () =>
      hideCityTooltip(cityMarker),
    );
    hex.addEventListener("focus", () => showCityTooltip(cityMarker));
    hex.addEventListener("blur", () => hideCityTooltip(cityMarker));
  }
});

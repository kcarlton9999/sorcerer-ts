export const BOARD_COLUMNS = 23;
export const BOARD_ROWS = 23;
export const BOARD_HEX_COUNT = 518;

export const MAGIC_COLORS = [
  "blue",
  "green",
  "yellow",
  "orange",
  "red",
  "purple",
  "white",
  "grey",
] as const;

export const MAGIC_COLOR_HEX: Record<MagicColor, string> = {
  blue: "#8ab3e6",
  green: "#9ecf8d",
  yellow: "#e7d76a",
  orange: "#e9b56e",
  red: "#dc7d7d",
  purple: "#b98fe0",
  white: "#e9e9ec",
  grey: "#858890",
};

export const DIRECTIONS = ["N", "NE", "SE", "S", "SW", "NW"] as const;

export type MagicColor = (typeof MAGIC_COLORS)[number];
export type Direction = (typeof DIRECTIONS)[number];
export type TerrainType = "none" | "river" | "mountain";
export type TerrainByDirection = Record<Direction, TerrainType>;

export interface MapCell {
  id: string;
  column: number;
  row: number;
  color: MagicColor;
  terrain: TerrainByDirection;
  name: string | null;
  isCity: boolean;
}

export interface MapData {
  columns: number;
  rows: number;
  cells: MapCell[];
}

export interface TerrainEdgeMismatch {
  id: string;
  direction: Direction;
  terrain: TerrainType;
  neighborId: string;
  oppositeTerrain: TerrainType;
  kind: "one-sided" | "conflict";
}

export interface TerrainEdgeDiagnostics {
  mismatches: TerrainEdgeMismatch[];
  boundaryTerrain: { id: string; direction: Direction; terrain: TerrainType }[];
}

export const OPPOSITE_DIRECTIONS: Record<Direction, Direction> = {
  N: "S",
  NE: "SW",
  SE: "NW",
  S: "N",
  SW: "NE",
  NW: "SE",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isMagicColor = (value: unknown): value is MagicColor =>
  typeof value === "string" && MAGIC_COLORS.includes(value as MagicColor);

const isTerrainType = (value: unknown): value is TerrainType =>
  value === "none" || value === "river" || value === "mountain";

function parseCell(value: unknown): MapCell {
  if (!isRecord(value)) {
    throw new Error("Board hex must be an object");
  }

  const { id, color, terrain, name, isCity } = value;
  if (typeof id !== "string" || !/^\d{4}$/.test(id)) {
    throw new Error("Board hex id must be a four-character string");
  }

  const column = Number(id.slice(0, 2));
  const row = Number(id.slice(2));
  if (
    column < 1 ||
    column > BOARD_COLUMNS ||
    row < 1 ||
    row > BOARD_ROWS ||
    (column % 2 === 0 && row === BOARD_ROWS)
  ) {
    throw new Error(`Board hex id is outside the board outline: ${id}`);
  }

  if (!isMagicColor(color)) {
    throw new Error(`Board hex ${id} has an unknown color`);
  }

  if (!isRecord(terrain)) {
    throw new Error(`Board hex ${id} has invalid terrain data`);
  }

  const parsedTerrain = {} as TerrainByDirection;
  for (const direction of DIRECTIONS) {
    const terrainType = terrain[direction];
    if (!isTerrainType(terrainType)) {
      throw new Error(`Board hex ${id} has invalid ${direction} terrain data`);
    }
    parsedTerrain[direction] = terrainType;
  }

  if (name !== null && typeof name !== "string") {
    throw new Error(`Board hex ${id} name must be a string or null`);
  }
  if (typeof isCity !== "boolean") {
    throw new Error(`Board hex ${id} city flag must be a boolean`);
  }

  return { id, column, row, color, terrain: parsedTerrain, name, isCity };
}

export function parseMapData(value: unknown): MapData {
  if (!Array.isArray(value)) {
    throw new Error("Board data must be a list of hexes");
  }

  const cells = value.map(parseCell);
  const cellsById = new Map<string, MapCell>();
  for (const cell of cells) {
    if (cellsById.has(cell.id)) {
      throw new Error(`Duplicate board hex id: ${cell.id}`);
    }
    cellsById.set(cell.id, cell);
  }

  for (let column = 1; column <= BOARD_COLUMNS; column++) {
    const expectedRows = column % 2 === 0 ? BOARD_ROWS - 1 : BOARD_ROWS;
    for (let row = 1; row <= expectedRows; row++) {
      const id = `${String(column).padStart(2, "0")}${String(row).padStart(2, "0")}`;
      if (!cellsById.has(id)) {
        throw new Error(`Missing board hex id: ${id}`);
      }
    }
  }

  if (cells.length !== BOARD_HEX_COUNT) {
    throw new Error(
      `Board must contain ${BOARD_HEX_COUNT} hexes; found ${cells.length}`,
    );
  }

  return { columns: BOARD_COLUMNS, rows: BOARD_ROWS, cells };
}

export function getNeighborId(
  cell: Pick<MapCell, "column" | "row">,
  direction: Direction,
): string | null {
  const oddColumn = cell.column % 2 === 1;
  const offsets: Record<Direction, [number, number]> = {
    N: [0, -1],
    NE: [1, oddColumn ? -1 : 0],
    SE: [1, oddColumn ? 0 : 1],
    S: [0, 1],
    SW: [-1, oddColumn ? 0 : 1],
    NW: [-1, oddColumn ? -1 : 0],
  };
  const [columnOffset, rowOffset] = offsets[direction];
  const column = cell.column + columnOffset;
  const row = cell.row + rowOffset;

  if (
    column < 1 ||
    column > BOARD_COLUMNS ||
    row < 1 ||
    row > BOARD_ROWS ||
    (column % 2 === 0 && row === BOARD_ROWS)
  ) {
    return null;
  }

  return `${String(column).padStart(2, "0")}${String(row).padStart(2, "0")}`;
}

export function auditTerrainEdges(mapData: MapData): TerrainEdgeDiagnostics {
  const cellsById = new Map(mapData.cells.map((cell) => [cell.id, cell]));
  const mismatches: TerrainEdgeMismatch[] = [];
  const boundaryTerrain: TerrainEdgeDiagnostics["boundaryTerrain"] = [];

  for (const cell of mapData.cells) {
    for (const direction of DIRECTIONS) {
      const terrain = cell.terrain[direction];
      const neighborId = getNeighborId(cell, direction);
      if (!neighborId) {
        if (terrain !== "none") {
          boundaryTerrain.push({ id: cell.id, direction, terrain });
        }
        continue;
      }

      if (cell.id > neighborId) {
        continue;
      }

      const neighbor = cellsById.get(neighborId);
      if (!neighbor) {
        throw new Error(
          `Board neighbor ${neighborId} referenced by ${cell.id} is missing`,
        );
      }

      const oppositeTerrain = neighbor.terrain[OPPOSITE_DIRECTIONS[direction]];
      if (terrain !== oppositeTerrain) {
        mismatches.push({
          id: cell.id,
          direction,
          terrain,
          neighborId,
          oppositeTerrain,
          kind:
            terrain === "none" || oppositeTerrain === "none"
              ? "one-sided"
              : "conflict",
        });
      }
    }
  }

  return { mismatches, boundaryTerrain };
}

export function hexCenter(
  cell: Pick<MapCell, "column" | "row">,
  size: number,
  padding: number,
) {
  const columnIndex = cell.column - 1;
  const rowIndex = cell.row - 1;
  const columnStagger = columnIndex % 2 === 1 ? 0.5 : 0;

  return {
    x: padding + size + 1.5 * size * columnIndex,
    y: padding + size + Math.sqrt(3) * size * (rowIndex + columnStagger),
  };
}

export function hexPoints(
  x: number,
  y: number,
  size: number,
): [number, number][] {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 3) * index;
    return [x + size * Math.cos(angle), y + size * Math.sin(angle)];
  });
}

export const edgeVertexIndexes: Record<Direction, [number, number]> = {
  N: [4, 5],
  NE: [5, 0],
  SE: [0, 1],
  S: [1, 2],
  SW: [2, 3],
  NW: [3, 4],
};

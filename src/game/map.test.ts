import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import boardYaml from "../data/hex_data.yml?raw";
import {
  auditTerrainEdges,
  DIRECTIONS,
  getNeighborId,
  hexCenter,
  hexPoints,
  MAGIC_COLOR_HEX,
  parseMapData,
} from "./map";

const boardData = parseMapData(parse(boardYaml));

describe("canonical Sorcerer board data and geometry", () => {
  it("loads all 518 flat-top hexes with textual IDs and the staggered outline", () => {
    expect(boardData.cells).toHaveLength(518);
    expect(boardData.cells[0]?.id).toBe("0101");
    expect(boardData.cells.at(-1)?.id).toBe("2323");
    expect(boardData.cells.find((cell) => cell.id === "0222")).toBeDefined();
    expect(boardData.cells.find((cell) => cell.id === "0223")).toBeUndefined();
    expect(new Set(boardData.cells.map((cell) => cell.id)).size).toBe(518);
    expect(new Set(boardData.cells.map((cell) => cell.color))).toEqual(
      new Set([
        "blue",
        "green",
        "yellow",
        "orange",
        "red",
        "purple",
        "white",
        "grey",
      ]),
    );
  });

  it("preserves per-hex terrain, name, and city attributes", () => {
    const city = boardData.cells.find((cell) => cell.isCity);
    expect(city).toBeDefined();
    expect(city?.name).toBeTruthy();
    expect(DIRECTIONS).toHaveLength(6);
    expect(Object.keys(city?.terrain ?? {})).toHaveLength(6);
    expect(
      boardData.cells.some((cell) =>
        DIRECTIONS.some((direction) => cell.terrain[direction] === "river"),
      ),
    ).toBe(true);
    expect(
      boardData.cells.some((cell) =>
        DIRECTIONS.some((direction) => cell.terrain[direction] === "mountain"),
      ),
    ).toBe(true);
  });

  it("uses the Color Value Chart pastel palette for the six magic colors", () => {
    expect(MAGIC_COLOR_HEX).toMatchObject({
      blue: "#8ab3e6",
      green: "#9ecf8d",
      yellow: "#e7d76a",
      orange: "#e9b56e",
      red: "#dc7d7d",
      purple: "#b98fe0",
      grey: "#858890",
    });
  });

  it("maps flat-top directional edges to adjacent staggered columns", () => {
    const firstColumnHex = boardData.cells.find((cell) => cell.id === "0101");
    const nextEvenColumnHex = boardData.cells.find(
      (cell) => cell.id === "0201",
    );
    const nextOddColumnHex = boardData.cells.find((cell) => cell.id === "0301");
    expect(firstColumnHex).toBeDefined();
    expect(nextEvenColumnHex).toBeDefined();
    expect(nextOddColumnHex).toBeDefined();

    expect(getNeighborId(firstColumnHex!, "SE")).toBe("0201");
    expect(getNeighborId(nextEvenColumnHex!, "NE")).toBe("0301");

    const firstCenter = hexCenter(firstColumnHex!, 20, 0);
    const nextCenter = hexCenter(nextEvenColumnHex!, 20, 0);
    expect(nextCenter.x - firstCenter.x).toBeCloseTo(30);
    expect(nextCenter.y - firstCenter.y).toBeCloseTo(Math.sqrt(3) * 10);
  });

  it("creates six flat-top polygon vertices with a horizontal top edge", () => {
    const points = hexPoints(0, 0, 20);
    expect(points).toHaveLength(6);
    expect(points[4]?.[1]).toBeCloseTo(points[5]?.[1] ?? 0);
    expect(points[4]?.[1]).toBeLessThan(0);
  });

  it("records terrain symmetrically across every shared edge", () => {
    const diagnostics = auditTerrainEdges(boardData);
    expect(diagnostics.mismatches).toHaveLength(0);
    expect(diagnostics.boundaryTerrain).toHaveLength(0);
  });

  it("records the confirmed shared mountain ranges on both hexes", () => {
    const terrainFor = (id: string) =>
      boardData.cells.find((cell) => cell.id === id)?.terrain;

    expect(terrainFor("0304")?.NE).toBe("mountain");
    expect(terrainFor("0403")?.SW).toBe("mountain");
    expect(terrainFor("0403")?.SE).toBe("mountain");
    expect(terrainFor("0403")?.S).toBe("mountain");
    expect(terrainFor("0404")?.N).toBe("mountain");
    expect(terrainFor("0504")?.NW).toBe("mountain");
    expect(terrainFor("0704")?.S).toBe("mountain");
    expect(terrainFor("0705")?.N).toBe("mountain");
    expect(terrainFor("1018")?.SE).toBe("river");
    expect(terrainFor("1119")?.NW).toBe("river");
    expect(terrainFor("1212")?.SE).toBe("mountain");
    expect(terrainFor("1313")?.NW).toBe("mountain");
    expect(terrainFor("1315")?.SE).toBe("mountain");
    expect(terrainFor("1415")?.NW).toBe("mountain");
    expect(terrainFor("1609")?.NE).toBe("mountain");
    expect(terrainFor("1709")?.SW).toBe("mountain");
  });

  it("rejects duplicate IDs, malformed IDs, and missing outline hexes", () => {
    const entries = parse(boardYaml) as Record<string, unknown>[];
    expect(() => parseMapData([...entries, entries[0]])).toThrow(
      "Duplicate board hex id: 0101",
    );

    const malformedId = entries.map((entry) => ({ ...entry }));
    malformedId[0]!.id = 101;
    expect(() => parseMapData(malformedId)).toThrow(
      "Board hex id must be a four-character string",
    );

    expect(() => parseMapData(entries.slice(1))).toThrow(
      "Missing board hex id: 0101",
    );
  });
});

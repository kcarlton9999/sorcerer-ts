import { describe, expect, it } from "vitest";
import { computePositions } from "./layout";
import { colors, createChartCells } from "./model";

describe("Color Value Chart data and layout", () => {
  it("creates a center cell and six six-cell color arms", () => {
    const cells = createChartCells();

    expect(cells).toHaveLength(37);
    expect(cells[0]).toMatchObject({
      id: "center",
      index: 0,
      value: 0,
    });

    for (const [arm, color] of colors.entries()) {
      expect(
        cells
          .filter((cell) => cell.arm === arm)
          .map(({ color: cellColor, value }) => [cellColor, value]),
      ).toEqual([6, 1, 2, 3, 4, 5].map((value) => [color, value]));
    }
  });

  it("keeps every chart hex within the SVG viewBox", () => {
    const chartSize = 1000;
    const hexRadius = 30;
    const positions = computePositions(
      createChartCells(),
      chartSize,
      chartSize,
    );

    for (const { cx, cy } of positions) {
      expect(cx - hexRadius).toBeGreaterThanOrEqual(0);
      expect(cy - hexRadius).toBeGreaterThanOrEqual(0);
      expect(cx + hexRadius).toBeLessThanOrEqual(chartSize);
      expect(cy + hexRadius).toBeLessThanOrEqual(chartSize);
    }
  });
});

import type { HexCell } from "./model";

export interface HexPosition {
  cell: HexCell;
  cx: number;
  cy: number;
}

export function colorToHex(color: string): string {
  const colorHexValues: Record<string, string> = {
    blue: "#4A90E2",
    green: "#7ED321",
    yellow: "#F8E71C",
    orange: "#F5A623",
    red: "#D0021B",
    purple: "#9013FE",
  };
  return colorHexValues[color] ?? color;
}

export function hexPoints(
  cx: number,
  cy: number,
  radius: number,
): [number, number][] {
  const points: [number, number][] = [];
  const rotation = -Math.PI / 6;

  for (let index = 0; index < 6; index++) {
    const angle = (Math.PI / 3) * index - Math.PI / 2 + rotation;
    points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
  }

  return points;
}

export function computePositions(
  cells: HexCell[],
  width: number,
  height: number,
  radiusStep = 60,
): HexPosition[] {
  const centerX = width / 2;
  const centerY = height / 2;
  const centerRadius = 60;
  const gap = 25;
  const centerVertices = hexPoints(centerX, centerY, centerRadius);

  return cells.map((cell) => {
    if (cell.index === 0) {
      return { cell, cx: centerX, cy: centerY };
    }

    const firstVertex = centerVertices[cell.arm];
    const nextVertex = centerVertices[(cell.arm + 1) % 6];
    if (!firstVertex || !nextVertex) {
      throw new Error(`Invalid chart arm index: ${cell.arm}`);
    }

    const edgeMidX = (firstVertex[0] + nextVertex[0]) / 2;
    const edgeMidY = (firstVertex[1] + nextVertex[1]) / 2;
    const armAngle = Math.atan2(edgeMidY - centerY, edgeMidX - centerX);
    const distance = centerRadius + gap + (cell.index - 1) * radiusStep;

    return {
      cell,
      cx: centerX + distance * Math.cos(armAngle),
      cy: centerY + distance * Math.sin(armAngle),
    };
  });
}

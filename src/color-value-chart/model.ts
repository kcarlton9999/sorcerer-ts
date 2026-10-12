export type ColorName =
  "blue" | "green" | "yellow" | "orange" | "red" | "purple";

export const colors: ColorName[] = [
  "blue",
  "green",
  "yellow",
  "orange",
  "red",
  "purple",
];

export interface HexCell {
  id: string;
  arm: number;
  index: number;
  value: number;
  color: ColorName;
}

export function createChartCells(): HexCell[] {
  const cells: HexCell[] = [
    {
      id: "center",
      arm: -1,
      index: 0,
      value: 0,
      color: "blue",
    },
  ];

  for (const [arm, color] of colors.entries()) {
    for (let index = 1; index <= 6; index++) {
      const value = index === 1 ? 6 : index - 1;
      cells.push({
        id: `${color}-${value}`,
        arm,
        index,
        value,
        color,
      });
    }
  }

  return cells;
}

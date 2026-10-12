import * as d3 from "d3";
import type { HexPosition } from "./layout";
import { colors } from "./model";
import { colorToHex, hexPoints } from "./layout";

const pastelPalette: Record<string, string> = {
  blue: "#8ab3e6",
  green: "#9ecf8d",
  yellow: "#e7d76a",
  orange: "#e9b56e",
  red: "#dc7d7d",
  purple: "#b98fe0",
};

const valueBoxPalette: Record<string, Record<number, string>> = {
  blue: {
    1: pastelPalette.green,
    2: pastelPalette.yellow,
    3: pastelPalette.orange,
    4: pastelPalette.red,
    5: pastelPalette.purple,
    6: "#7da8de",
  },
  green: {
    1: pastelPalette.yellow,
    2: pastelPalette.orange,
    3: pastelPalette.red,
    4: pastelPalette.purple,
    5: pastelPalette.blue,
    6: "#8ec07b",
  },
  yellow: {
    1: pastelPalette.orange,
    2: pastelPalette.red,
    3: pastelPalette.purple,
    4: pastelPalette.blue,
    5: pastelPalette.green,
    6: "#d7bd49",
  },
  orange: {
    1: pastelPalette.red,
    2: pastelPalette.purple,
    3: pastelPalette.blue,
    4: pastelPalette.green,
    5: pastelPalette.yellow,
    6: "#d08a40",
  },
  red: {
    1: pastelPalette.purple,
    2: pastelPalette.blue,
    3: pastelPalette.green,
    4: pastelPalette.yellow,
    5: pastelPalette.orange,
    6: "#c86e6e",
  },
  purple: {
    1: pastelPalette.blue,
    2: pastelPalette.green,
    3: pastelPalette.yellow,
    4: pastelPalette.orange,
    5: pastelPalette.red,
    6: "#a485d8",
  },
};

function getValueBoxColor(color: string, value: number): string {
  return valueBoxPalette[color]?.[value] ?? colorToHex(color);
}

export function renderChart(
  containerSelector: string,
  positions: HexPosition[],
  width = 1000,
  height = 1000,
): void {
  const centerRadius = 60;
  const hexRadius = 30;
  const container = d3.select(containerSelector);
  if (container.empty()) {
    throw new Error(`Chart container not found: ${containerSelector}`);
  }

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "presentation")
    .style("background", "#000");

  const group = svg.append("g");
  const centerX = width / 2;
  const centerY = height / 2;
  const centerVertices = hexPoints(centerX, centerY, centerRadius);

  colors.forEach((color, index) => {
    const firstVertex = centerVertices[index];
    const nextVertex = centerVertices[(index + 1) % 6];
    if (!firstVertex || !nextVertex) {
      throw new Error(`Missing center vertices for chart color: ${color}`);
    }

    group
      .append("path")
      .attr(
        "d",
        `M ${centerX},${centerY} L ${firstVertex[0]},${firstVertex[1]} L ${nextVertex[0]},${nextVertex[1]} Z`,
      )
      .attr("fill", colorToHex(color))
      .attr("stroke", "#222")
      .attr("stroke-width", 1.5);

    group
      .append("text")
      .attr("x", (centerX + firstVertex[0] + nextVertex[0]) / 3)
      .attr("y", (centerY + firstVertex[1] + nextVertex[1]) / 3 + 4)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("fill", "#000")
      .text(index + 1);
  });

  group
    .append("polygon")
    .attr("points", centerVertices.map((point) => point.join(",")).join(" "))
    .attr("fill", "none")
    .attr("stroke", "#eee")
    .attr("stroke-width", 2);

  const armGroups = group
    .selectAll("g.hex")
    .data(positions.filter((position) => position.cell.index !== 0))
    .enter()
    .append("g")
    .attr("class", "hex");

  armGroups
    .append("polygon")
    .attr("points", (position) =>
      hexPoints(position.cx, position.cy, hexRadius)
        .map((point) => point.join(","))
        .join(" "),
    )
    .attr("fill", (position) => pastelPalette[position.cell.color])
    .attr("stroke", "#333")
    .attr("stroke-width", 1.2);

  armGroups
    .append("rect")
    .attr("x", (position) => position.cx - 16)
    .attr("y", (position) => position.cy - 16)
    .attr("width", 32)
    .attr("height", 32)
    .attr("fill", (position) =>
      getValueBoxColor(position.cell.color, position.cell.value),
    )
    .attr("stroke", "rgba(255,255,255,0.4)")
    .attr("stroke-width", 1)
    .attr("rx", 4)
    .attr("opacity", 0.92);

  armGroups
    .append("text")
    .attr("x", (position) => position.cx)
    .attr("y", (position) => position.cy + 5)
    .attr("text-anchor", "middle")
    .attr("font-size", 18)
    .attr("font-weight", 700)
    .attr("fill", "#111")
    .text((position) => String(position.cell.value));
}

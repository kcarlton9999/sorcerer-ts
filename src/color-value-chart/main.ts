import "./style.css";
import { computePositions } from "./layout";
import { createChartCells } from "./model";
import { renderChart } from "./render";

const chartSize = 1000;
const positions = computePositions(createChartCells(), chartSize, chartSize);

renderChart("#chart", positions, chartSize, chartSize);

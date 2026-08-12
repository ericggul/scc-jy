import {
  cycleNodeLabels,
  type CycleNodeId,
  type CycleSnapshot,
} from "@/components/network-system/cycle/model";

export type CycleGraphTrend = "rising" | "falling" | "steady";

export type CycleGraphReading = {
  id: CycleNodeId;
  label: string;
  value: number;
  display: string;
  trend: CycleGraphTrend;
  path: string;
  zeroY: number;
};

const GRAPH_WIDTH = 100;
const GRAPH_HEIGHT = 60;
const HISTORY_POINTS = 96;

// Preserve the controller's spatial 3×3 node arrangement.
export const cycleGraphNodeIds = [
  "household-demand",
  "production",
  "inventories",
  "wage-share",
  "employment",
  "investment",
  "inflation",
  "policy-rate",
  "credit",
] as const satisfies readonly CycleNodeId[];

function finite(value: number | undefined) {
  return Number.isFinite(value) ? (value as number) : 0;
}

function formatValue(value: number) {
  const normalized = Math.abs(value) < 0.005 ? 0 : value;
  return `${normalized >= 0 ? "+" : ""}${normalized.toFixed(2)}`;
}

function trendFor(values: readonly number[], range: number): CycleGraphTrend {
  const current = values.at(-1) ?? 0;
  const comparison = values.at(-6) ?? values[0] ?? current;
  const threshold = Math.max(0.0005, range * 0.005);
  if (current - comparison > threshold) return "rising";
  if (current - comparison < -threshold) return "falling";
  return "steady";
}

export function cycleGraphPath(
  values: readonly number[],
  range: number,
  width = GRAPH_WIDTH,
  height = GRAPH_HEIGHT,
) {
  if (values.length < 2) return "";
  const safeRange = Math.max(range, 0.08);

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height / 2 - (finite(value) / safeRange) * (height / 2);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function presentReading(
  snapshot: CycleSnapshot,
  nodeId: CycleNodeId,
): CycleGraphReading {
  const value = finite(snapshot.values[nodeId]);
  const history = snapshot.history[nodeId]
    .slice(-(HISTORY_POINTS - 1))
    .map(finite);
  const values = [...history, value];
  const range = Math.max(0.08, ...values.map((point) => Math.abs(point))) * 1.08;

  return {
    id: nodeId,
    label: cycleNodeLabels[nodeId],
    value,
    display: formatValue(value),
    trend: trendFor(values, range),
    path: cycleGraphPath(values, range),
    zeroY: GRAPH_HEIGHT / 2,
  };
}

export function presentCycleGraphs(snapshot: CycleSnapshot) {
  return cycleGraphNodeIds.map((nodeId) => presentReading(snapshot, nodeId));
}

import type {
  CycleNodeId,
  CycleSnapshot,
} from "@/components/network-system/cycle/model";
import { cycleGraphNodeIds } from "../presenter";

type TerminalMetricDefinition = {
  code: string;
  label: string;
  base: number;
  scale: number;
  decimals: number;
  unit: string;
};

export type CycleTerminalMetric = {
  id: CycleNodeId;
  code: string;
  label: string;
  display: string;
  unit: string;
  changeDisplay: string;
  highDisplay: string;
  lowDisplay: string;
  trend: "positive" | "negative" | "steady";
  path: string;
  lastY: number;
  ticks: Array<{ id: string; y: number; display: string }>;
};

const metricDefinitions: Record<CycleNodeId, TerminalMetricDefinition> = {
  "household-demand": {
    code: "PCE YOY",
    label: "HOUSEHOLD CONSUMPTION",
    base: 2.5,
    scale: 6,
    decimals: 2,
    unit: "%",
  },
  production: {
    code: "IP YOY",
    label: "INDUSTRIAL PRODUCTION",
    base: 1.8,
    scale: 8,
    decimals: 2,
    unit: "%",
  },
  inventories: {
    code: "INV YOY",
    label: "BUSINESS INVENTORIES",
    base: 3,
    scale: 5,
    decimals: 2,
    unit: "%",
  },
  "wage-share": {
    code: "AHE YOY",
    label: "AVERAGE HOURLY EARNINGS",
    base: 3.5,
    scale: 4,
    decimals: 2,
    unit: "%",
  },
  employment: {
    code: "NFP YOY",
    label: "PAYROLL EMPLOYMENT",
    base: 1.8,
    scale: 5,
    decimals: 2,
    unit: "%",
  },
  investment: {
    code: "BFI YOY",
    label: "BUSINESS FIXED INVESTMENT",
    base: 3,
    scale: 10,
    decimals: 2,
    unit: "%",
  },
  inflation: {
    code: "CPI YOY",
    label: "CONSUMER PRICE INFLATION",
    base: 2,
    scale: 5,
    decimals: 2,
    unit: "%",
  },
  "policy-rate": {
    code: "POL RATE",
    label: "POLICY INTEREST RATE",
    base: 3.5,
    scale: 3,
    decimals: 2,
    unit: "%",
  },
  credit: {
    code: "CRDT YOY",
    label: "PRIVATE CREDIT GROWTH",
    base: 4,
    scale: 8,
    decimals: 2,
    unit: "%",
  },
};

const WIDTH = 100;
const TOP = 4;
const BOTTOM = 44;

function finite(value: number | undefined) {
  return Number.isFinite(value) ? (value as number) : 0;
}

function observableValue(
  definition: TerminalMetricDefinition,
  stateValue: number,
) {
  return definition.base + definition.scale * finite(stateValue);
}

function formatValue(definition: TerminalMetricDefinition, value: number) {
  return value.toFixed(definition.decimals);
}

function signedValue(definition: TerminalMetricDefinition, value: number) {
  const normalized = Math.abs(value) < 0.005 ? 0 : value;
  return `${normalized >= 0 ? "+" : ""}${normalized.toFixed(definition.decimals)}`;
}

function presentMetric(
  snapshot: CycleSnapshot,
  nodeId: CycleNodeId,
): CycleTerminalMetric {
  const definition = metricDefinitions[nodeId];
  const stateHistory = snapshot.history[nodeId].slice(-95).map(finite);
  const stateValues = [...stateHistory, finite(snapshot.values[nodeId])];
  const values = stateValues.map((state) => observableValue(definition, state));
  const current = values.at(-1) ?? definition.base;
  const comparison = values.at(-6) ?? values[0] ?? current;
  const change = current - comparison;
  const rawLow = Math.min(...values);
  const rawHigh = Math.max(...values);
  const minimumSpread = Math.max(0.1, Math.abs(definition.scale) * 0.04);
  const spread = Math.max(rawHigh - rawLow, minimumSpread);
  const low = rawLow - spread * 0.08;
  const high = rawHigh + spread * 0.08;
  const domain = high - low || 1;
  const y = (value: number) =>
    TOP + (1 - (value - low) / domain) * (BOTTOM - TOP);
  const path = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * WIDTH;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y(value).toFixed(2)}`;
    })
    .join(" ");
  const tickValues = [high, (high + low) / 2, low];

  return {
    id: nodeId,
    code: definition.code,
    label: definition.label,
    display: formatValue(definition, current),
    unit: definition.unit,
    changeDisplay: `${signedValue(definition, change)} pp`,
    highDisplay: formatValue(definition, rawHigh),
    lowDisplay: formatValue(definition, rawLow),
    trend:
      change > 0.005 ? "positive" : change < -0.005 ? "negative" : "steady",
    path,
    lastY: y(current),
    ticks: tickValues.map((value, index) => ({
      id: `tick-${index}`,
      y: y(value),
      display: formatValue(definition, value),
    })),
  };
}

export function presentCycleTerminalMetrics(snapshot: CycleSnapshot) {
  return cycleGraphNodeIds.map((nodeId) => presentMetric(snapshot, nodeId));
}

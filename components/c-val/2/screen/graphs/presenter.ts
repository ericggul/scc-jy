import type { CValSnapshot } from "@/components/c-val/2/model";

export const C_VAL_GRAPH_ROWS = 10;
export const C_VAL_GRAPH_COLUMNS = 10;
export const C_VAL_GRAPH_OBSERVATIONS = 12;
export const C_VAL_GRAPH_HISTORY_LENGTH = C_VAL_GRAPH_ROWS * C_VAL_GRAPH_OBSERVATIONS;

export type CValGraphTone = "positive" | "negative" | "amber" | "cyan" | "neutral";

export type CValGraphCell = {
  id: string;
  channel: string;
  window: number;
  values: number[];
  last: number;
  change: number;
  tone: CValGraphTone;
  unit: "PX" | "%" | "BPS" | "SH" | "LEVEL";
};

type GraphChannel = {
  id: string;
  unit: CValGraphCell["unit"];
  series: readonly number[];
  tone: "direction" | "amber" | "cyan";
};

function finite(value: number | undefined, fallback = 0) {
  return Number.isFinite(value) ? (value as number) : fallback;
}

function completeSeries(values: readonly number[], fallback: number) {
  const source = values.length > 0 ? values.slice(-C_VAL_GRAPH_HISTORY_LENGTH) : [fallback];
  const first = finite(source[0], fallback);
  const padded = Array.from(
    { length: Math.max(0, C_VAL_GRAPH_HISTORY_LENGTH - source.length) },
    () => first,
  );
  return [...padded, ...source].map((value, index, series) => finite(value, series[index - 1] ?? first));
}

function percentSteps(values: readonly number[]) {
  return values.map((value, index) => {
    if (index === 0) return 0;
    const previous = values[index - 1] ?? value;
    return ((value / Math.max(Math.abs(previous), Number.EPSILON)) - 1) * 100;
  });
}

function acceleration(values: readonly number[]) {
  return values.map((value, index) => index === 0 ? 0 : value - (values[index - 1] ?? value));
}

function directionTone(change: number): CValGraphTone {
  if (change > 0.0005) return "positive";
  if (change < -0.0005) return "negative";
  return "neutral";
}

/**
 * One hundred small multiples, all from C-VAL's actual synchronized histories:
 * ten semantically distinct market channels partitioned into ten adjacent
 * chronological windows. No synthetic security, random data, or timer enters
 * the matrix.
 */
export function presentCValGraphMatrix(snapshot: CValSnapshot) {
  const openingPrice = finite(snapshot.market.openingPrice, 100);
  const index = completeSeries(snapshot.history.index, openingPrice);
  index[index.length - 1] = finite(snapshot.market.index, index.at(-1) ?? openingPrice);
  const fromOpen = index.map((price) => ((price / Math.max(openingPrice, Number.EPSILON)) - 1) * 100);
  const momentum = percentSteps(index);
  const channels: GraphChannel[] = [
    { id: "PX", unit: "PX", series: index, tone: "direction" },
    { id: "OP%", unit: "%", series: fromOpen, tone: "direction" },
    { id: "RET", unit: "%", series: completeSeries(snapshot.history.returnPercent, 0), tone: "direction" },
    { id: "MOM", unit: "%", series: momentum, tone: "direction" },
    { id: "ACC", unit: "%", series: acceleration(momentum), tone: "direction" },
    { id: "V", unit: "LEVEL", series: completeSeries(snapshot.history.volatility, finite(snapshot.parameters.volatility, 0.5)), tone: "amber" },
    { id: "A", unit: "LEVEL", series: completeSeries(snapshot.history.activity, finite(snapshot.parameters.activity, 0.5)), tone: "amber" },
    { id: "L", unit: "LEVEL", series: completeSeries(snapshot.history.liquidity, finite(snapshot.parameters.liquidity, 0.5)), tone: "cyan" },
    { id: "RVOL", unit: "BPS", series: completeSeries(snapshot.history.realizedVolatilityBps, 0), tone: "amber" },
    { id: "DEPTH", unit: "SH", series: completeSeries(snapshot.history.depth, 0), tone: "cyan" },
  ];

  return Array.from({ length: C_VAL_GRAPH_ROWS }, (_, row) => channels.map((channel) => {
    const values = channel.series.slice(
      row * C_VAL_GRAPH_OBSERVATIONS,
      (row + 1) * C_VAL_GRAPH_OBSERVATIONS,
    );
    const last = values.at(-1) ?? 0;
    const first = values[0] ?? last;
    const change = last - first;
    return {
      id: `graph-${channel.id.toLowerCase()}-window-${String(row + 1).padStart(2, "0")}`,
      channel: channel.id,
      window: row + 1,
      values,
      last,
      change,
      tone: channel.tone === "direction" ? directionTone(change) : channel.tone,
      unit: channel.unit,
    } satisfies CValGraphCell;
  })).flat();
}

export function formatCValGraphValue(cell: Pick<CValGraphCell, "last" | "unit">) {
  if (cell.unit === "PX") return cell.last.toFixed(2);
  if (cell.unit === "SH") return Math.round(cell.last).toLocaleString();
  if (cell.unit === "LEVEL") return `${Math.round(cell.last * 100)}`;
  return cell.last.toFixed(1);
}

export function formatCValGraphChange(cell: Pick<CValGraphCell, "change" | "unit">) {
  const sign = cell.change >= 0 ? "+" : "";
  if (cell.unit === "PX") return `${sign}${cell.change.toFixed(2)}`;
  if (cell.unit === "SH") return `${sign}${Math.round(cell.change)}`;
  if (cell.unit === "LEVEL") return `${sign}${Math.round(cell.change * 100)}`;
  return `${sign}${cell.change.toFixed(1)}`;
}

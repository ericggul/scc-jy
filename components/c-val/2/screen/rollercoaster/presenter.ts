import type { CValSnapshot, CValTrade } from "@/components/c-val/2/model";

export const C_VAL_ROLLERCOASTER_WINDOW = 28;
export const C_VAL_ROLLERCOASTER_MIN_PRICE = 1;
export const C_VAL_ROLLERCOASTER_MAX_PRICE = 100_000;

export type CValTrajectoryTone = "positive" | "negative" | "neutral";
export type CValRideTerrain = "CLIMB" | "DROP" | "LEVEL";

export type CValTrajectoryPoint = {
  id: string;
  position: number;
  price: number;
  stepPercent: number;
  terrain: CValRideTerrain;
  tone: CValTrajectoryTone;
};

export type CValRideFact = {
  id: string;
  label: string;
  value: string;
  unit: string;
  tone?: CValTrajectoryTone;
};

export type CValTrajectoryPresentation = {
  phase: CValSnapshot["phase"];
  points: CValTrajectoryPoint[];
  price: number;
  windowHigh: number;
  windowLow: number;
  windowRange: number;
  windowMove: number;
  reversals: number;
  cadenceMs: number | null;
  transitionMs: number;
  tone: CValTrajectoryTone;
  facts: CValRideFact[];
};

function finiteOr(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? (value as number) : fallback;
}

function clampPrice(value: number | undefined, fallback: number) {
  return Math.min(C_VAL_ROLLERCOASTER_MAX_PRICE, Math.max(C_VAL_ROLLERCOASTER_MIN_PRICE, finiteOr(value, fallback)));
}

function tone(value: number): CValTrajectoryTone {
  if (value > 0.0005) return "positive";
  if (value < -0.0005) return "negative";
  return "neutral";
}

function signed(value: number, digits = 2) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function terrain(stepPercent: number): CValRideTerrain {
  if (stepPercent > 0.012) return "CLIMB";
  if (stepPercent < -0.012) return "DROP";
  return "LEVEL";
}

function cadenceFrom(trades: readonly CValTrade[]) {
  const timestamps = trades
    .map((trade) => finiteOr(trade.executedAt, Number.NaN))
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  const gaps = timestamps.slice(1)
    .map((timestamp, index) => timestamp - (timestamps[index] ?? timestamp))
    .filter((gap) => gap > 0 && gap < 60_000);
  if (gaps.length === 0) return null;
  return gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
}

export function cValRollercoasterPrices(snapshot: CValSnapshot, windowSize = C_VAL_ROLLERCOASTER_WINDOW) {
  const opening = clampPrice(snapshot.market.openingPrice, 100);
  const source = snapshot.history.index.length >= 2
    ? snapshot.history.index
    : [opening, snapshot.market.index];
  const prices = source.map((value, index) => clampPrice(value, source[index - 1] ?? opening));
  prices[prices.length - 1] = clampPrice(snapshot.market.index, prices.at(-1) ?? opening);
  return prices.slice(-Math.max(2, Math.floor(windowSize)));
}

/**
 * A literal two-rail reading of the same executed-price path. Each landmark is
 * one actual history point; the last point is the carried price, not a
 * decorative train position or autonomous animation.
 */
export function presentCValTrajectory(snapshot: CValSnapshot): CValTrajectoryPresentation {
  const prices = cValRollercoasterPrices(snapshot);
  const points = prices.map((price, index) => {
    const previous = prices[index - 1] ?? price;
    const stepPercent = index === 0 ? 0 : ((price / Math.max(Math.abs(previous), Number.EPSILON)) - 1) * 100;
    return {
      id: `ride-waypoint-slot-${String(index + 1).padStart(2, "0")}`,
      position: index + 1,
      price,
      stepPercent,
      terrain: terrain(stepPercent),
      tone: tone(stepPercent),
    };
  });
  const first = points[0]?.price ?? clampPrice(snapshot.market.openingPrice, 100);
  const price = points.at(-1)?.price ?? first;
  const windowHigh = Math.max(...points.map((point) => point.price));
  const windowLow = Math.min(...points.map((point) => point.price));
  const windowRange = windowHigh - windowLow;
  const windowMove = ((price / Math.max(Math.abs(first), Number.EPSILON)) - 1) * 100;
  const directions = points.map((point) => Math.sign(point.stepPercent)).filter((direction) => direction !== 0);
  const reversals = directions.slice(1).reduce((total, direction, index) => total + (direction !== directions[index] ? 1 : 0), 0);
  const cadenceMs = cadenceFrom(snapshot.recentTrades);
  const oneDayMove = finiteOr(snapshot.market.oneSecondMovePercent, 0);

  return {
    phase: snapshot.phase,
    points,
    price,
    windowHigh,
    windowLow,
    windowRange,
    windowMove,
    reversals,
    cadenceMs,
    transitionMs: Math.round(Math.max(70, Math.min(640, cadenceMs ?? 260))),
    tone: tone(oneDayMove),
    facts: [
      { id: "run-start", label: "START", value: first.toFixed(2), unit: "PX" },
      { id: "run-last", label: "CARRIED", value: price.toFixed(2), unit: "PX", tone: tone(windowMove) },
      { id: "rise", label: "HIGH", value: windowHigh.toFixed(2), unit: "PX" },
      { id: "drop", label: "LOW", value: windowLow.toFixed(2), unit: "PX" },
      { id: "amplitude", label: "AMPLITUDE", value: windowRange.toFixed(2), unit: "PX" },
      { id: "run-move", label: "RUN MOVE", value: signed(windowMove), unit: "%", tone: tone(windowMove) },
      { id: "reversals", label: "REVERSALS", value: reversals.toLocaleString(), unit: "COUNT" },
      { id: "gap", label: "LAST GAP", value: cadenceMs === null ? "—" : Math.round(cadenceMs).toLocaleString(), unit: "MS" },
    ],
  };
}

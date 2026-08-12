import type { CValSnapshot, CValTrade } from "@/components/1/model";

export const C_VAL_CASINO_REGISTER_DIGITS = 5;
export const C_VAL_CASINO_HISTORY_COUNT = 24;

export type CValCasinoTone = "positive" | "negative" | "neutral";

export type CValCasinoDrum = {
  id: string;
  position: number;
  reel: readonly [string, string, string, string, string];
  changed: boolean;
};

export type CValCasinoOutcome = {
  id: string;
  sequence: number;
  price: number;
  stepPercent: number;
  tone: CValCasinoTone;
};

export type CValCasinoFact = {
  id: string;
  label: string;
  value: string;
  unit: string;
  tone?: CValCasinoTone;
};

export type CValCasinoPresentation = {
  phase: CValSnapshot["phase"];
  price: number;
  priceText: string;
  drums: CValCasinoDrum[];
  outcomes: CValCasinoOutcome[];
  facts: CValCasinoFact[];
  changedDrums: number;
  cadenceMs: number | null;
  transitionMs: number;
  tone: CValCasinoTone;
};

function finite(value: number | undefined, fallback = 0) {
  return Number.isFinite(value) ? (value as number) : fallback;
}

function tone(value: number): CValCasinoTone {
  if (value > 0.0005) return "positive";
  if (value < -0.0005) return "negative";
  return "neutral";
}

function signed(value: number, digits = 2) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function priceDigits(price: number) {
  return Math.max(0, Math.round(price * 100))
    .toString()
    .padStart(C_VAL_CASINO_REGISTER_DIGITS, "0")
    .slice(-C_VAL_CASINO_REGISTER_DIGITS)
    .split("");
}

function neighbor(digit: string, direction: number) {
  const value = Number.parseInt(digit, 10);
  return String((value + direction + 10) % 10);
}

function outcomesFor(snapshot: CValSnapshot, price: number) {
  const history = snapshot.history.index.length > 0
    ? snapshot.history.index.slice(-C_VAL_CASINO_HISTORY_COUNT)
    : [price];
  const source = history.map((value, index) => finite(value, history[index - 1] ?? price));
  source[source.length - 1] = price;
  const firstSequence = Math.max(1, finite(snapshot.market.executions) - source.length + 1);

  return source.map((outcomePrice, index) => {
    const previous = source[index - 1] ?? outcomePrice;
    const stepPercent = index === 0
      ? 0
      : ((outcomePrice / Math.max(Math.abs(previous), Number.EPSILON)) - 1) * 100;
    return {
      id: `settled-outcome-slot-${String(index + 1).padStart(2, "0")}`,
      sequence: firstSequence + index,
      price: outcomePrice,
      stepPercent,
      tone: tone(stepPercent),
    };
  });
}

function cadenceFrom(trades: readonly CValTrade[]) {
  const timeline = trades
    .map((trade) => finite(trade.executedAt, Number.NaN))
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  if (timeline.length < 2) return null;
  const gaps = timeline.slice(1)
    .map((time, index) => time - (timeline[index] ?? time))
    .filter((gap) => gap > 0 && gap < 60_000);
  if (gaps.length === 0) return null;
  return {
    mean: gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length,
    shortest: Math.min(...gaps),
  };
}

/**
 * Price as a settled five-drum register. The adjacent digits are the literal
 * mechanical neighbours of each actual price digit; outcomes stay an ordered
 * C-VAL history, never a generated game sequence or payout table.
 */
export function presentCValCasino(snapshot: CValSnapshot): CValCasinoPresentation {
  const openingPrice = finite(snapshot.market.openingPrice, 100);
  const price = finite(snapshot.market.index, openingPrice);
  const latestHistory = snapshot.history.index.at(-2) ?? openingPrice;
  const currentDigits = priceDigits(price);
  const precedingDigits = priceDigits(finite(latestHistory, price));
  const drums = currentDigits.map((value, index) => ({
    id: `price-register-drum-${index + 1}`,
    position: index + 1,
    reel: [
      neighbor(value, -2),
      neighbor(value, -1),
      value,
      neighbor(value, 1),
      neighbor(value, 2),
    ] as const,
    changed: value !== precedingDigits[index],
  }));
  const outcomes = outcomesFor(snapshot, price);
  const cadence = cadenceFrom(snapshot.recentTrades);
  const cadenceMs = cadence?.mean ?? null;
  const averageAbsStepBps = outcomes.length > 1
    ? outcomes.slice(1).reduce((sum, outcome) => sum + Math.abs(outcome.stepPercent), 0) / (outcomes.length - 1) * 100
    : 0;
  const dayMove = finite(snapshot.market.oneSecondMovePercent);
  const fromOpen = Number.isFinite(snapshot.market.changeFromOpenPercent)
    ? snapshot.market.changeFromOpenPercent
    : ((price / Math.max(openingPrice, Number.EPSILON)) - 1) * 100;
  const priorOutcome = outcomes.at(-2);
  const lastOutcome = outcomes.at(-1);
  const outcomePrices = outcomes.map((outcome) => outcome.price);
  const runSpan = outcomePrices.length > 0
    ? Math.max(...outcomePrices) - Math.min(...outcomePrices)
    : 0;

  return {
    phase: snapshot.phase,
    price,
    priceText: `${currentDigits.slice(0, 3).join("")}.${currentDigits.slice(3).join("")}`,
    drums,
    outcomes,
    facts: [
      { id: "last-move", label: "1D MOVE", value: signed(dayMove), unit: "%", tone: tone(dayMove) },
      { id: "from-open", label: "FROM OPEN", value: signed(fromOpen), unit: "%", tone: tone(fromOpen) },
      { id: "result-range", label: "1D RANGE", value: finite(snapshot.market.oneSecondRange).toFixed(2), unit: "PX" },
      { id: "session-low", label: "1D LOW", value: finite(snapshot.market.oneSecondLow, price).toFixed(2), unit: "PX" },
      { id: "session-high", label: "1D HIGH", value: finite(snapshot.market.oneSecondHigh, price).toFixed(2), unit: "PX" },
      { id: "prior", label: "PRIOR RESULT", value: finite(priorOutcome?.price, price).toFixed(2), unit: "PX" },
      { id: "last-step", label: "LAST STEP", value: signed(finite(lastOutcome?.stepPercent)), unit: "%", tone: tone(finite(lastOutcome?.stepPercent)) },
      { id: "mean-step", label: "MEAN STEP", value: averageAbsStepBps.toFixed(1), unit: "BPS" },
      { id: "run-span", label: "24-RESULT SPAN", value: runSpan.toFixed(2), unit: "PX" },
      { id: "fast-gap", label: "FAST GAP", value: cadence === null ? "—" : Math.round(cadence.shortest).toLocaleString(), unit: "MS" },
      { id: "trade-count", label: "RECENT TRADES", value: snapshot.recentTrades.length.toLocaleString(), unit: "RUN" },
      { id: "settlements", label: "SETTLED", value: finite(snapshot.market.executions).toLocaleString(), unit: "RUN" },
    ],
    changedDrums: drums.filter((drum) => drum.changed).length,
    cadenceMs,
    transitionMs: Math.round(Math.max(70, Math.min(640, cadenceMs ?? 260))),
    tone: tone(dayMove),
  };
}

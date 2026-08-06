import type { CValSnapshot } from "@/components/c-val/2/model";

function finite(value: number | undefined, fallback = 0) {
  return Number.isFinite(value) ? (value as number) : fallback;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export type CValCasinoDirection = "rise" | "fall" | "flat";
export type CValCasinoMode = "change" | "price";

export type CValCasinoPresentation = {
  mode: CValCasinoMode;
  direction: CValCasinoDirection;
  sign: "+" | "−" | "—" | null;
  value: number;
  integerDigits: number[];
  fractionalDigits: [number, number];
  text: string;
  spinStrength: number;
};

function percentageParts(value: number, minimumIntegerDigits = 1) {
  const text = new Intl.NumberFormat("en-US", {
    useGrouping: false,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  const [rawIntegerPart = "0", fractionalPart = "00"] = text.split(".");
  const integerPart = rawIntegerPart.padStart(minimumIntegerDigits, "0");
  const integerDigits = Array.from(integerPart, (character) =>
    Number.parseInt(character, 10),
  ).filter(Number.isFinite);
  const decimals = `${fractionalPart}00`;

  return {
    integerDigits: integerDigits.length > 0 ? integerDigits : [0],
    fractionalDigits: [
      Number.parseInt(decimals[0], 10) || 0,
      Number.parseInt(decimals[1], 10) || 0,
    ] as [number, number],
  };
}

/**
 * The casino screen is intentionally tied to executed price, not a simulated
 * slot outcome. The value is the server's rolling one-second return, anchored
 * by the execution at or immediately before the current one-second window.
 */
export function presentCValCasino(
  snapshot: CValSnapshot,
  mode: CValCasinoMode = "change",
): CValCasinoPresentation {
  const rawReturn = snapshot.phase === "active"
    ? finite(snapshot.market.oneSecondMovePercent)
    : 0;
  const roundedReturn = Math.round(rawReturn * 100) / 100;
  const roundedPrice = Math.round(finite(snapshot.market.index) * 100) / 100;
  const direction: CValCasinoDirection = roundedReturn > 0
    ? "rise"
    : roundedReturn < 0
      ? "fall"
      : "flat";
  const value = mode === "change" ? roundedReturn : roundedPrice;
  const sign = mode === "change"
    ? direction === "rise" ? "+" : direction === "fall" ? "−" : "—"
    : null;
  const { integerDigits, fractionalDigits } = percentageParts(
    value,
    mode === "price" ? 3 : 1,
  );
  const price = Math.max(Math.abs(finite(snapshot.market.index)), Number.EPSILON);
  const rangePercent = Math.abs(finite(snapshot.market.oneSecondRange)) / price * 100;
  const spinStrength = clamp(
    Math.max(
      Math.abs(roundedReturn) / 3,
      rangePercent / 3,
      finite(snapshot.market.realizedVolatilityBps) / 250,
    ),
    0,
    1,
  );

  return {
    mode,
    direction,
    sign,
    value,
    integerDigits,
    fractionalDigits,
    text: mode === "change"
      ? `${sign}${integerDigits.join("")}.${fractionalDigits.join("")}%`
      : `${integerDigits.join("")}.${fractionalDigits.join("")}`,
    spinStrength,
  };
}

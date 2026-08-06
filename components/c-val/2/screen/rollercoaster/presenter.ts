import type { CValSnapshot } from "@/components/c-val/2/model";

export const C_VAL_ROLLERCOASTER_WINDOW = 28;
export const C_VAL_ROLLERCOASTER_MIN_PRICE = 1;
export const C_VAL_ROLLERCOASTER_MAX_PRICE = 100_000;

const SOFT_RETURN_WINDOW = 0.105;
const VERTICAL_AMPLITUDE = 4.4;

export type RollercoasterWorldPoint = {
  x: number;
  y: number;
  z: number;
  price: number;
};

function finiteOr(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function clampPrice(value: number, fallback: number) {
  return Math.min(
    C_VAL_ROLLERCOASTER_MAX_PRICE,
    Math.max(C_VAL_ROLLERCOASTER_MIN_PRICE, finiteOr(value, fallback)),
  );
}

export function cValRollercoasterPrices(
  snapshot: CValSnapshot,
  windowSize = C_VAL_ROLLERCOASTER_WINDOW,
) {
  const opening = clampPrice(snapshot.market.openingPrice, 100);
  const history = snapshot.history.index.length >= 2
    ? snapshot.history.index
    : [opening, snapshot.market.index];
  const prices: number[] = [];
  history.forEach((value) => {
    prices.push(clampPrice(value, prices.at(-1) ?? opening));
  });
  prices[prices.length - 1] = clampPrice(
    snapshot.market.index,
    prices.at(-1) ?? opening,
  );
  return prices.slice(-Math.max(2, Math.floor(windowSize)));
}

export function projectRollercoasterWorld(
  prices: readonly number[],
  openingPrice: number,
): RollercoasterWorldPoint[] {
  const opening = clampPrice(openingPrice, 100);
  const source = prices.length >= 2 ? prices : [opening, opening];
  const safePrices: number[] = [];
  source.forEach((price) => {
    safePrices.push(clampPrice(price, safePrices.at(-1) ?? opening));
  });

  return safePrices.map((price, index) => {
    const logReturn = Math.log(price / opening);
    return {
      x: -1 + (index / (safePrices.length - 1)) * 2,
      y: Math.tanh(logReturn / SOFT_RETURN_WINDOW) * VERTICAL_AMPLITUDE,
      z: 0,
      price,
    };
  });
}

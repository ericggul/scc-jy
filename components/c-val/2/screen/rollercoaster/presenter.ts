import type { CValSnapshot } from "@/components/c-val/2/model";

export const C_VAL_ROLLERCOASTER_WINDOW = 28;
export const C_VAL_ROLLERCOASTER_MIN_PRICE = 1;
export const C_VAL_ROLLERCOASTER_MAX_PRICE = 100_000;

export type RollercoasterPriceDomain = {
  low: number;
  high: number;
};

export type RollercoasterWorldPoint = {
  x: number;
  y: number;
  z: number;
  price: number;
};

function finiteOr(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function clampPrice(value: number) {
  return Math.min(
    C_VAL_ROLLERCOASTER_MAX_PRICE,
    Math.max(C_VAL_ROLLERCOASTER_MIN_PRICE, finiteOr(value, 100)),
  );
}

export function cValRollercoasterPrices(
  snapshot: CValSnapshot,
  windowSize = C_VAL_ROLLERCOASTER_WINDOW,
) {
  const opening = finiteOr(snapshot.market.openingPrice, 100);
  const history = snapshot.history.index.length >= 2
    ? snapshot.history.index
    : [opening, snapshot.market.index];
  const prices: number[] = [];

  history.forEach((value) => {
    prices.push(finiteOr(value, prices.at(-1) ?? opening));
  });
  prices[prices.length - 1] = finiteOr(
    snapshot.market.index,
    prices.at(-1) ?? opening,
  );
  return prices.slice(-Math.max(2, Math.floor(windowSize)));
}

export function cValRollercoasterPriceDomain(
  prices: readonly number[],
): RollercoasterPriceDomain {
  const logs = (prices.length > 0 ? prices : [100]).map((price) =>
    Math.log10(clampPrice(price)));
  const minimum = Math.min(...logs);
  const maximum = Math.max(...logs);
  const minimumSpan = Math.log10(1.12);
  const span = Math.max(maximum - minimum, minimumSpan);
  const center = (minimum + maximum) / 2;
  const paddedSpan = span * 1.24;
  let low = Math.max(0, center - paddedSpan / 2);
  let high = Math.min(5, center + paddedSpan / 2);
  if (high - low < paddedSpan) {
    if (low === 0) high = Math.min(5, paddedSpan);
    if (high === 5) low = Math.max(0, 5 - paddedSpan);
  }
  return { low, high: Math.max(high, low + 0.0001) };
}

export function projectRollercoasterWorld(
  prices: readonly number[],
  openingPrice: number,
  domain = cValRollercoasterPriceDomain(prices),
): RollercoasterWorldPoint[] {
  const opening = clampPrice(openingPrice);
  const source = prices.length >= 2 ? prices : [opening, opening];
  const safePrices: number[] = [];
  source.forEach((price) => {
    safePrices.push(clampPrice(finiteOr(price, safePrices.at(-1) ?? opening)));
  });

  return safePrices.map((price, index) => {
    const normalized = Math.min(
      1,
      Math.max(0, (Math.log10(price) - domain.low) / (domain.high - domain.low)),
    );
    return {
      x: -12.7 + (index / (safePrices.length - 1)) * 25.4,
      y: -3.25 + normalized * 8.35,
      z: 0,
      price,
    };
  });
}

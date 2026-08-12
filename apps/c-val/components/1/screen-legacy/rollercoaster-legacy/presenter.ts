import type { CValSnapshot } from "@/components/1/model";

export type RollercoasterPoint = {
  x: number;
  y: number;
  price: number;
};

export type RollercoasterGeometry = {
  points: RollercoasterPoint[];
  groundY: number;
  carAngle: number;
};

function finiteOr(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

export function legacyRollercoasterPrices(snapshot: CValSnapshot) {
  const opening = finiteOr(snapshot.market.openingPrice, 100);
  const history = snapshot.history.index.length >= 2
    ? snapshot.history.index
    : [opening, snapshot.market.index];
  const prices: number[] = [];
  history.forEach((value) => {
    prices.push(finiteOr(value, prices.at(-1) ?? opening));
  });
  prices[prices.length - 1] = finiteOr(snapshot.market.index, prices.at(-1) ?? opening);
  return prices;
}

export function projectLegacyRollercoaster(
  prices: readonly number[],
  width: number,
  height: number,
): RollercoasterGeometry {
  const safeWidth = Math.max(1, finiteOr(width, 1));
  const safeHeight = Math.max(1, finiteOr(height, 1));
  const source = prices.length >= 2 ? prices : [100, 100];
  const safePrices: number[] = [];
  source.forEach((price) => {
    safePrices.push(finiteOr(price, safePrices.at(-1) ?? 100));
  });
  const minimum = Math.min(...safePrices);
  const maximum = Math.max(...safePrices);
  const center = (minimum + maximum) / 2;
  const reference = Math.max(Math.abs(center), 1);
  const span = Math.max(maximum - minimum, reference * 0.002, 0.2);
  const low = center - span * 0.62;
  const high = center + span * 0.62;
  const left = safeWidth * 0.045;
  const right = safeWidth * 0.925;
  const top = safeHeight * 0.105;
  const bottom = safeHeight * 0.68;
  const points = safePrices.map((price, index) => ({
    x: left + (index / (safePrices.length - 1)) * (right - left),
    y: bottom - ((price - low) / (high - low)) * (bottom - top),
    price,
  }));
  const last = points.at(-1) ?? { x: right, y: bottom, price: center };
  const previous = points.at(-2) ?? last;
  return {
    points,
    groundY: safeHeight * 0.87,
    carAngle: Math.atan2(last.y - previous.y, last.x - previous.x),
  };
}

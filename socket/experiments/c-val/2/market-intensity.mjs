function finite(value, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

/**
 * Measures only already-realized execution movement in C-VAL's compressed
 * one-market-day window. External transports share this input but own neither
 * its calculation nor any market mutation.
 */
export function cValExecutionIntensity(snapshot) {
  const market = snapshot.market ?? {};
  const price = Math.max(finite(market.index, 100), Number.EPSILON);
  const dayMove = Math.abs(finite(market.oneSecondMovePercent));
  const dayRange =
    (Math.abs(finite(market.oneSecondHigh) - finite(market.oneSecondLow)) / price) *
    100;
  const realizedVolatility = Math.abs(finite(market.realizedVolatilityBps)) / 100;
  return Math.max(dayMove, dayRange, realizedVolatility);
}

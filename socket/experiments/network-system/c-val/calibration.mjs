/**
 * Reference class: a liquid, small-tick electronic equity.
 *
 * The behavioral parameters below are the AZN values reported in Table 2 of
 * Mike & Farmer (2008), "An empirical behavioral model of liquidity and
 * volatility": Hs=.77, Student-t df=1.31, placement scale=.0024, cancellation
 * A=1.12 and B=.20. They describe order flow, not a universal equity market.
 *
 * Parameters marked `scenario` translate the interactive V/A/L controls into
 * bounded regimes around that empirical reference. `timing` values compress
 * market time into an observable installation cadence and are not empirical
 * exchange-rate estimates. `safety` values bound memory and pathological tails.
 */
export const cValCalibration = Object.freeze({
  id: "liquid-small-tick-equity-v1",
  referenceClass: "liquid small-tick electronic equity",
  empirical: Object.freeze({
    orderSignHurst: 0.77,
    placementDegreesOfFreedom: 1.31,
    placementScaleLogPrice: 0.0024,
    cancellationA: 1.12,
    cancellationB: 0.2,
    typicalOrderQuantity: 100,
  }),
  structural: Object.freeze({
    initialPriceTicks: 10_000,
    tickSize: 0.01,
    participantCounts: Object.freeze({
      liquidityProvider: 12,
      fundamental: 12,
      trend: 8,
      noise: 24,
    }),
  }),
  scenario: Object.freeze({
    placementScaleRange: Object.freeze([0.0012, 0.0048]),
    informationShockBpsRange: Object.freeze([0.08, 1.8]),
    orderArrivalRateRange: Object.freeze([6, 140]),
    liquidityProviderShareRange: Object.freeze([0.12, 0.72]),
    providerOrderQuantityRange: Object.freeze([100, 400]),
    providerReplenishmentRange: Object.freeze([0.15, 0.92]),
  }),
  timing: Object.freeze({
    broadcastIntervalMs: 50,
    historySampleEvery: 4,
  }),
  safety: Object.freeze({
    historyLength: 120,
    recentOrderLimit: 16,
    recentTradeLimit: 12,
    maximumBookOrders: 420,
    maximumPlacementTicks: 140,
    minimumOrdersPerSide: 8,
  }),
});

export function interpolateRange(range, value) {
  return range[0] + (range[1] - range[0]) * value;
}

export function interpolateAround(range, center, value) {
  if (value <= 0.5) {
    return range[0] + (center - range[0]) * value * 2;
  }
  return center + (range[1] - center) * (value - 0.5) * 2;
}

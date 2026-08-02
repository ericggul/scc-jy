/**
 * Reference mechanics: a continuous double-auction equity market.
 *
 * The behavioral parameters below are the AZN values reported in Table 2 of
 * Mike & Farmer (2008), "An empirical behavioral model of liquidity and
 * volatility": Hs=.77, Student-t df=1.31, placement scale=.0024, cancellation
 * A=1.12 and B=.20. They describe order flow, not a universal equity market.
 *
 * Parameters marked `scenario` translate the interactive V/A/L controls into
 * bounded market regimes around that empirical reference. The installation
 * deliberately compresses one trading day into one real second. Its extreme
 * regime therefore represents successive crisis/bubble days, not wall-clock
 * high-frequency trading. `safety` values bound memory and pathological tails.
 */
export const cValCalibration = Object.freeze({
  id: "c-val-2-compressed-market-day-double-auction",
  referenceClass: "compressed market-day continuous double auction",
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
    minimumPriceTicks: 1_000,
    maximumPriceTicks: 100_000,
    participantCounts: Object.freeze({
      liquidityProvider: 12,
      fundamental: 12,
      trend: 8,
      noise: 24,
    }),
  }),
  scenario: Object.freeze({
    placementScaleRange: Object.freeze([0.0012, 0.0048]),
    dailyInformationVolatilityRange: Object.freeze([0.001, 0.65]),
    dailyInformationVolatilityAtNeutral: 0.003,
    informationStressExponent: 3,
    informationTailDegreesOfFreedom: 5,
    valueMeanReversionHalfLifeDays: 24,
    privateValuationNoiseRange: Object.freeze([0.0005, 0.08]),
    privateValuationNoiseAtNeutral: 0.002,
    providerHalfSpreadRateRange: Object.freeze([0.00012, 0.012]),
    providerHalfSpreadRateAtNeutral: 0.0002,
    orderArrivalRateRange: Object.freeze([6, 140]),
    liquidityProviderShareRange: Object.freeze([0.12, 0.72]),
    providerOrderQuantityRange: Object.freeze([100, 800]),
    providerReplenishmentRange: Object.freeze([0.15, 0.92]),
  }),
  timing: Object.freeze({
    broadcastIntervalMs: 50,
    historySampleEvery: 4,
    marketDaysPerRealSecond: 1,
    volatilityRiseHalfLifeRealSeconds: 0.12,
    volatilityFallHalfLifeRealSeconds: 2.4,
  }),
  safety: Object.freeze({
    historyLength: 120,
    recentOrderLimit: 16,
    recentTradeLimit: 12,
    maximumBookOrders: 420,
    maximumSnapshotBytes: 32_000,
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


function gate(id, pass, observed, requirement) {
  return { id, pass: Boolean(pass), observed, requirement };
}

export function evaluateCValShakeAcceptance(metrics) {
  return [
    gate(
      "sensor-density",
      metrics.trace.effectiveSampleRateHz >= 40 &&
        metrics.trace.effectiveSampleRateHz <= 70,
      metrics.trace.effectiveSampleRateHz,
      "40–70 Hz",
    ),
    gate(
      "sensor-irregularity",
      metrics.trace.intervalJitterMs >= 1 &&
        metrics.trace.maximumGapMs >= 35,
      {
        jitterMs: metrics.trace.intervalJitterMs,
        maximumGapMs: metrics.trace.maximumGapMs,
      },
      "jitter ≥ 1 ms and at least one gap ≥ 35 ms",
    ),
    gate(
      "val-input-span",
      metrics.input.transmittedVolatilitySpan >
        metrics.input.volatilitySpan &&
        metrics.input.transmittedActivitySpan >
          metrics.input.activitySpan &&
        metrics.input.transmittedLiquiditySpan >
          metrics.input.liquiditySpan &&
        metrics.input.volatilitySpan > 0 &&
        metrics.input.activitySpan > 0 &&
        metrics.input.liquiditySpan > 0,
      metrics.input,
      "all VAL axes move and production smoothing reduces raw input span",
    ),
    gate(
      "persistent-risk",
      metrics.input.effectiveVolatilityPeak >
        metrics.input.neutralVolatilityPeak,
      {
        treatment: metrics.input.effectiveVolatilityPeak,
        matchedNeutral: metrics.input.neutralVolatilityPeak,
      },
      "effective V exceeds the same-seed untouched market",
    ),
    gate(
      "value-response",
      metrics.market.fundamentalRangeRatio > 1,
      {
        treatment: metrics.market.fundamentalRange,
        matchedNeutral: metrics.market.neutralFundamentalRange,
        ratio: metrics.market.fundamentalRangeRatio,
      },
      "reference value varies more than the same-seed untouched market",
    ),
    gate(
      "executed-price-response",
      metrics.market.priceRangeRatio > 1 &&
        metrics.market.priceMultiple >
          metrics.market.neutralPriceMultiple,
      {
        treatmentRange: metrics.market.priceRange,
        matchedNeutralRange: metrics.market.neutralPriceRange,
        rangeRatio: metrics.market.priceRangeRatio,
        treatmentMultiple: metrics.market.priceMultiple,
        matchedNeutralMultiple: metrics.market.neutralPriceMultiple,
      },
      "actual executions vary more than the same-seed untouched market",
    ),
    gate(
      "response-latency",
      metrics.market.priceResponseLatencyMs !== null &&
        metrics.market.priceResponseLatencyMs <=
          metrics.market.marketDayMs,
      metrics.market.priceResponseLatencyMs,
      "actual price leaves its matched-neutral path within one market day of the data-derived VAL change point",
    ),
    gate(
      "market-participation",
      metrics.market.submittedOrders > 0 &&
        metrics.market.executions > 0,
      {
        submitted: metrics.market.submittedOrders,
        executions: metrics.market.executions,
      },
      "the production participant and matching path remains active",
    ),
    gate(
      "liquidity-dynamics",
      metrics.market.depthPathDivergence > 0,
      {
        meanAbsoluteDifference:
          metrics.market.depthPathDivergence,
      },
      "resting depth leaves the same-seed untouched path; isolated paired tests own L directionality",
    ),
    gate(
      "conservation",
      Math.abs(metrics.invariants.cashDrift) <=
        metrics.invariants.cashTolerance &&
        metrics.invariants.inventoryDrift === 0 &&
        metrics.invariants.controlIntegrity,
      {
        cashDrift: metrics.invariants.cashDrift,
        inventoryDrift: metrics.invariants.inventoryDrift,
      },
      "treatment and matched-neutral paths conserve cash and inventory",
    ),
    gate(
      "market-integrity",
      metrics.invariants.crossedBookSamples === 0 &&
        metrics.invariants.nonFiniteSamples === 0 &&
        metrics.invariants.priceComesFromLastExecution,
      {
        crossedBookSamples: metrics.invariants.crossedBookSamples,
        nonFiniteSamples: metrics.invariants.nonFiniteSamples,
        priceComesFromLastExecution:
          metrics.invariants.priceComesFromLastExecution,
      },
      "uncrossed, finite, execution-derived market",
    ),
    gate(
      "bounded-runtime",
      metrics.invariants.restingOrders <=
        metrics.invariants.maximumRestingOrders &&
        metrics.invariants.snapshotBytes <=
          metrics.invariants.maximumSnapshotBytes,
      {
        restingOrders: metrics.invariants.restingOrders,
        snapshotBytes: metrics.invariants.snapshotBytes,
      },
      "runtime stays inside limits exported by the production calibration",
    ),
  ];
}

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
      metrics.input.transmittedVolatilitySpan >= 80 &&
        metrics.input.transmittedActivitySpan >= 80 &&
        metrics.input.transmittedLiquiditySpan >= 80 &&
        metrics.input.volatilitySpan >= 30 &&
        metrics.input.activitySpan >= 30 &&
        metrics.input.liquiditySpan >= 30,
      metrics.input,
      "each transmitted condition spans ≥ 80 and runtime condition spans ≥ 30",
    ),
    gate(
      "persistent-risk",
      metrics.input.effectiveVolatilityPeak >= 70,
      metrics.input.effectiveVolatilityPeak,
      "effective V reaches at least 70",
    ),
    gate(
      "value-response",
      metrics.market.fundamentalRange >= 0.5,
      metrics.market.fundamentalRange,
      "reference value range ≥ 0.50",
    ),
    gate(
      "executed-price-response",
      metrics.market.priceRange >= 0.5,
      metrics.market.priceRange,
      "last-executed-price range ≥ 0.50",
    ),
    gate(
      "response-latency",
      metrics.market.priceResponseLatencyMs !== null &&
        metrics.market.priceResponseLatencyMs <= 3_000,
      metrics.market.priceResponseLatencyMs,
      "a 5-cent execution response within 3,000 ms of input onset",
    ),
    gate(
      "market-participation",
      metrics.market.submittedOrders >= 250 &&
        metrics.market.executions >= 60,
      {
        submitted: metrics.market.submittedOrders,
        executions: metrics.market.executions,
      },
      "at least 250 orders and 60 executions",
    ),
    gate(
      "liquidity-dynamics",
      metrics.market.depthRatio >= 2,
      metrics.market.depthRatio,
      "maximum/minimum five-level depth ratio ≥ 2",
    ),
    gate(
      "conservation",
      Math.abs(metrics.invariants.cashDrift) <= 0.001 &&
        metrics.invariants.inventoryDrift === 0,
      {
        cashDrift: metrics.invariants.cashDrift,
        inventoryDrift: metrics.invariants.inventoryDrift,
      },
      "cash drift ≤ 0.001 and inventory drift = 0",
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
      metrics.invariants.restingOrders <= 420 &&
        metrics.invariants.snapshotBytes <= 32_000,
      {
        restingOrders: metrics.invariants.restingOrders,
        snapshotBytes: metrics.invariants.snapshotBytes,
      },
      "≤ 420 resting orders and ≤ 32 KB snapshot",
    ),
  ];
}

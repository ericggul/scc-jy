import {
  calibrateRawOrientation,
} from "./orientation.mjs";
import { evaluateCValShakeAcceptance } from "./shake-acceptance.mjs";
import { cValShakeSystemAdapter } from "./shake-system-adapter.mjs";
import { validateCValOrientationTrace } from "./shake-trace.mjs";

const MOBILE_TRANSMIT_INTERVAL_MS = 16;

function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function standardDeviation(values) {
  if (values.length < 2) return 0;
  const average = mean(values);
  return Math.sqrt(
    values.reduce(
      (total, value) => total + (value - average) ** 2,
      0,
    ) /
      (values.length - 1),
  );
}

function range(values) {
  return Math.max(...values) - Math.min(...values);
}

function relativeRange(values) {
  return Math.max(...values) / Math.max(Math.min(...values), Number.EPSILON);
}

function distanceBetweenRecords(left, right) {
  return Math.sqrt(
    Object.keys(left).reduce(
      (total, key) => total + (left[key] - right[key]) ** 2,
      0,
    ),
  );
}

function greatestRiseIndex(values) {
  let index = 0;
  let greatestRise = -Infinity;
  for (let current = 1; current < values.length; current += 1) {
    const rise = values[current] - values[current - 1];
    if (rise > greatestRise) {
      greatestRise = rise;
      index = current;
    }
  }
  return index;
}

function matchedPathResponseLatency(
  elapsedTimes,
  treatmentPrices,
  controlPrices,
  onsetIndex,
) {
  const initialRelativePrice =
    treatmentPrices[onsetIndex] / controlPrices[onsetIndex];
  for (let index = onsetIndex + 1; index < treatmentPrices.length; index += 1) {
    const treatmentDivergence = Math.abs(
      Math.log(
        treatmentPrices[index] /
          controlPrices[index] /
          initialRelativePrice,
      ),
    );
    const controlMove = Math.abs(
      Math.log(controlPrices[index] / controlPrices[onsetIndex]),
    );
    if (treatmentDivergence > controlMove) {
      return elapsedTimes[index] - elapsedTimes[onsetIndex];
    }
  }
  return null;
}

function round(value, digits = 3) {
  return Number(value.toFixed(digits));
}

function mobileTransmissions(trace) {
  const baseline = trace.events[0];
  const transmissions = [];
  let lastSentAt = -Infinity;
  for (const event of trace.events) {
    if (event.tMs - lastSentAt < MOBILE_TRANSMIT_INTERVAL_MS) continue;
    lastSentAt = event.tMs;
    transmissions.push({
      id: event.id,
      tMs: event.tMs,
      phase: event.phase ?? "recorded",
      orientation: calibrateRawOrientation(event, baseline),
    });
  }
  return transmissions;
}

export function runCValShakeHarness(
  inputTrace,
  {
    marketSeed = 0x51a7e,
    startTime = 1_000_000,
    systemAdapter = cValShakeSystemAdapter,
    acceptancePolicy = evaluateCValShakeAcceptance,
  } = {},
) {
  const trace = validateCValOrientationTrace(inputTrace);
  const transmissions = mobileTransmissions(trace);
  const { runtime, initialTotals } = systemAdapter.create({
    startTime,
    marketSeed,
  });
  const {
    runtime: controlRuntime,
    initialTotals: controlInitialTotals,
  } = systemAdapter.create({
    startTime,
    marketSeed,
  });
  const prices = [];
  const fundamentals = [];
  const depths = [];
  const effectiveVolatility = [];
  const controlPrices = [];
  const controlFundamentals = [];
  const controlDepths = [];
  const controlEffectiveVolatility = [];
  const parameterDistances = [];
  const elapsedTimes = [];
  const parameterSeries = {
    volatility: [],
    activity: [],
    liquidity: [],
  };
  const transmittedParameterSeries = {
    volatility: [],
    activity: [],
    liquidity: [],
  };
  for (const transmission of transmissions) {
    const mapped = systemAdapter.mapOrientation(
      transmission.orientation,
    );
    for (const parameterId of Object.keys(transmittedParameterSeries)) {
      transmittedParameterSeries[parameterId].push(mapped[parameterId]);
    }
  }
  let submittedOrders = 0;
  let cancelledOrders = 0;
  let executions = 0;
  let crossedBookSamples = 0;
  let nonFiniteSamples = 0;
  let transmissionIndex = 0;
  const durationMs = trace.durationMs ?? trace.events.at(-1).tMs;
  const replayEndMs = durationMs + systemAdapter.releaseTailMs;

  for (
    let elapsedMs = 0;
    elapsedMs <= replayEndMs;
    elapsedMs += systemAdapter.tickIntervalMs
  ) {
    while (
      transmissionIndex < transmissions.length &&
      transmissions[transmissionIndex].tMs <= elapsedMs
    ) {
      const transmission = transmissions[transmissionIndex];
      systemAdapter.applyOrientation(
        runtime,
        transmission.orientation,
        startTime + transmission.tMs,
      );
      transmissionIndex += 1;
    }

    systemAdapter.step(runtime, startTime + elapsedMs);
    systemAdapter.step(controlRuntime, startTime + elapsedMs);
    const observation = systemAdapter.observe(runtime);
    const controlObservation = systemAdapter.observe(controlRuntime);
    elapsedTimes.push(elapsedMs);
    prices.push(observation.price);
    fundamentals.push(observation.fundamental);
    depths.push(observation.depth);
    effectiveVolatility.push(observation.effectiveVolatility);
    controlPrices.push(controlObservation.price);
    controlFundamentals.push(controlObservation.fundamental);
    controlDepths.push(controlObservation.depth);
    controlEffectiveVolatility.push(
      controlObservation.effectiveVolatility,
    );
    parameterDistances.push(
      distanceBetweenRecords(
        observation.parameters,
        controlObservation.parameters,
      ),
    );
    for (const parameterId of Object.keys(parameterSeries)) {
      parameterSeries[parameterId].push(
        observation.parameters[parameterId],
      );
    }
    submittedOrders += observation.submittedOrders;
    cancelledOrders += observation.cancelledOrders;
    executions += observation.executions;
    if (!(observation.bestBid < observation.bestAsk)) {
      crossedBookSamples += 1;
    }
    if (
      !observation.marketValues.every(
        (value) => typeof value !== "number" || Number.isFinite(value),
      )
    ) {
      nonFiniteSamples += 1;
    }

  }

  const finalState = systemAdapter.finish(runtime, initialTotals);
  const controlFinalState = systemAdapter.finish(
    controlRuntime,
    controlInitialTotals,
  );
  const inputOnsetIndex = greatestRiseIndex(parameterDistances);
  const priceResponseMs = matchedPathResponseLatency(
    elapsedTimes,
    prices,
    controlPrices,
    inputOnsetIndex,
  );
  const depthPathDivergence = mean(
    depths.map((depth, index) => Math.abs(depth - controlDepths[index])),
  );
  const eventIntervals = trace.events
    .slice(1)
    .map((event, index) => event.tMs - trace.events[index].tMs);
  const activeDurationSeconds =
    (trace.events.at(-1).tMs - trace.events[0].tMs) / 1_000;
  const metrics = {
    trace: {
      profile: trace.profile ?? "recorded",
      provenance: trace.provenance?.type ?? "unknown",
      rawEvents: trace.events.length,
      mobileTransmissions: transmissions.length,
      effectiveSampleRateHz: round(
        (trace.events.length - 1) / activeDurationSeconds,
        1,
      ),
      intervalJitterMs: round(standardDeviation(eventIntervals), 2),
      maximumGapMs: round(Math.max(...eventIntervals), 2),
    },
    input: {
      transmittedVolatilitySpan: round(
        range(transmittedParameterSeries.volatility) * 100,
        1,
      ),
      transmittedActivitySpan: round(
        range(transmittedParameterSeries.activity) * 100,
        1,
      ),
      transmittedLiquiditySpan: round(
        range(transmittedParameterSeries.liquidity) * 100,
        1,
      ),
      volatilitySpan: round(range(parameterSeries.volatility) * 100, 1),
      activitySpan: round(range(parameterSeries.activity) * 100, 1),
      liquiditySpan: round(range(parameterSeries.liquidity) * 100, 1),
      effectiveVolatilityPeak: round(
        Math.max(...effectiveVolatility) * 100,
        1,
      ),
      neutralVolatilityPeak: round(
        Math.max(...controlEffectiveVolatility) * 100,
        1,
      ),
      changePointMs: elapsedTimes[inputOnsetIndex],
    },
    market: {
      priceStart: round(prices[0], 2),
      priceEnd: round(prices.at(-1), 2),
      priceRange: round(range(prices), 2),
      priceMinimum: round(Math.min(...prices), 2),
      priceMaximum: round(Math.max(...prices), 2),
      priceMultiple: round(
        relativeRange(prices),
        2,
      ),
      fundamentalRange: round(range(fundamentals), 2),
      neutralPriceRange: round(range(controlPrices), 2),
      neutralPriceMultiple: round(relativeRange(controlPrices), 2),
      neutralFundamentalRange: round(range(controlFundamentals), 2),
      priceRangeRatio: round(
        range(prices) / Math.max(range(controlPrices), Number.EPSILON),
        2,
      ),
      fundamentalRangeRatio: round(
        range(fundamentals) /
          Math.max(range(controlFundamentals), Number.EPSILON),
        2,
      ),
      priceResponseLatencyMs: priceResponseMs,
      marketDayMs: systemAdapter.marketDayMs,
      depthMinimum: Math.min(...depths),
      depthMaximum: Math.max(...depths),
      depthRatio: round(
        Math.max(...depths) / Math.max(Math.min(...depths), 1),
        2,
      ),
      neutralDepthRatio: round(
        Math.max(...controlDepths) /
          Math.max(Math.min(...controlDepths), 1),
        2,
      ),
      depthPathDivergence: round(depthPathDivergence, 1),
      submittedOrders,
      cancelledOrders,
      executions,
    },
    invariants: {
      cashDrift: round(finalState.cashDrift, 6),
      inventoryDrift: finalState.inventoryDrift,
      crossedBookSamples,
      nonFiniteSamples,
      restingOrders: finalState.restingOrders,
      snapshotBytes: finalState.snapshotBytes,
      maximumRestingOrders: finalState.maximumRestingOrders,
      maximumSnapshotBytes: finalState.maximumSnapshotBytes,
      cashTolerance: finalState.cashTolerance,
      controlIntegrity:
        Math.abs(controlFinalState.cashDrift) <=
          controlFinalState.cashTolerance &&
        controlFinalState.inventoryDrift === 0 &&
        controlFinalState.priceComesFromLastExecution,
      priceComesFromLastExecution:
        finalState.priceComesFromLastExecution,
    },
  };

  const gates = acceptancePolicy(metrics);

  return {
    ok: gates.every(({ pass }) => pass),
    schemaVersion: 1,
    trace: {
      profile: trace.profile ?? "recorded",
      seed: trace.provenance?.seed ?? null,
      marketSeed,
      systemAdapter: systemAdapter.id,
    },
    metrics,
    gates,
  };
}

export function formatCValShakeHarnessReport(report) {
  const lines = [
    `C-VAL SHAKE HARNESS ${report.ok ? "PASS" : "FAIL"}`,
    `trace ${report.trace.profile} · trace seed ${report.trace.seed ?? "recorded"} · market seed ${report.trace.marketSeed}`,
    `sensor ${report.metrics.trace.rawEvents} raw / ${report.metrics.trace.mobileTransmissions} sent · ${report.metrics.trace.effectiveSampleRateHz} Hz · jitter ${report.metrics.trace.intervalJitterMs} ms · max gap ${report.metrics.trace.maximumGapMs} ms`,
    `input span V ${report.metrics.input.volatilitySpan} · A ${report.metrics.input.activitySpan} · L ${report.metrics.input.liquiditySpan} · effective V peak ${report.metrics.input.effectiveVolatilityPeak}`,
    `market price ${report.metrics.market.priceStart} → ${report.metrics.market.priceEnd} · range ${report.metrics.market.priceRange} · value range ${report.metrics.market.fundamentalRange} · latency ${report.metrics.market.priceResponseLatencyMs ?? "none"} ms`,
    `flow ${report.metrics.market.submittedOrders} orders / ${report.metrics.market.executions} executions · depth ${report.metrics.market.depthMinimum}–${report.metrics.market.depthMaximum}`,
    ...report.gates.map(
      ({ id, pass, observed, requirement }) =>
        `${pass ? "✓" : "✗"} ${id}: ${JSON.stringify(observed)} (${requirement})`,
    ),
  ];
  return lines.join("\n");
}

const DEFAULT_ROBUSTNESS_MARKET_SEEDS = [101, 202, 303, 404, 505];
const STOCHASTIC_GATE_IDS = new Set([
  "value-response",
  "executed-price-response",
  "response-latency",
  "market-participation",
  "liquidity-dynamics",
]);

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function runCValShakeRobustnessSuite(
  trace,
  {
    marketSeeds = DEFAULT_ROBUSTNESS_MARKET_SEEDS,
    systemAdapter = cValShakeSystemAdapter,
    acceptancePolicy = evaluateCValShakeAcceptance,
  } = {},
) {
  if (!Array.isArray(marketSeeds) || marketSeeds.length < 3) {
    throw new Error("A robustness suite requires at least three market seeds");
  }
  const runs = marketSeeds.map((marketSeed) =>
    runCValShakeHarness(trace, {
      marketSeed,
      systemAdapter,
      acceptancePolicy,
    }),
  );
  const gates = runs[0].gates.map((referenceGate, gateIndex) => {
    const runGates = runs.map((run) => run.gates[gateIndex]);
    const passCount = runGates.filter(({ pass }) => pass).length;
    const requiredPassRate = STOCHASTIC_GATE_IDS.has(referenceGate.id)
      ? 0.8
      : 1;
    const passRate = passCount / runs.length;
    return {
      id: referenceGate.id,
      pass: passRate >= requiredPassRate,
      passCount,
      total: runs.length,
      passRate: round(passRate, 2),
      requiredPassRate,
      requirement: referenceGate.requirement,
      observed: runGates.map(({ observed }) => observed),
    };
  });
  const priceRanges = runs.map(
    ({ metrics }) => metrics.market.priceRange,
  );
  const valueRanges = runs.map(
    ({ metrics }) => metrics.market.fundamentalRange,
  );

  return {
    ok: gates.every(({ pass }) => pass),
    schemaVersion: 1,
    kind: "c-val-shake-robustness-suite",
    trace: {
      profile: trace.profile ?? "recorded",
      seed: trace.provenance?.seed ?? null,
      systemAdapter: systemAdapter.id,
    },
    marketSeeds: [...marketSeeds],
    summary: {
      runCount: runs.length,
      priceRange: {
        minimum: Math.min(...priceRanges),
        median: round(median(priceRanges), 2),
        maximum: Math.max(...priceRanges),
      },
      valueRange: {
        minimum: Math.min(...valueRanges),
        median: round(median(valueRanges), 2),
        maximum: Math.max(...valueRanges),
      },
    },
    gates,
    runs,
  };
}

export function formatCValShakeRobustnessSuiteReport(suite) {
  return [
    `C-VAL SHAKE ROBUSTNESS SUITE ${suite.ok ? "PASS" : "FAIL"}`,
    `trace ${suite.trace.profile} · trace seed ${suite.trace.seed ?? "recorded"} · adapter ${suite.trace.systemAdapter}`,
    `market seeds ${suite.marketSeeds.join(", ")} · ${suite.summary.runCount} independent paths`,
    `executed-price range min/median/max ${suite.summary.priceRange.minimum} / ${suite.summary.priceRange.median} / ${suite.summary.priceRange.maximum}`,
    `reference-value range min/median/max ${suite.summary.valueRange.minimum} / ${suite.summary.valueRange.median} / ${suite.summary.valueRange.maximum}`,
    ...suite.gates.map(
      ({ id, pass, passCount, total, requiredPassRate, requirement }) =>
        `${pass ? "✓" : "✗"} ${id}: ${passCount}/${total} paths (required ${Math.round(requiredPassRate * 100)}% · ${requirement})`,
    ),
  ].join("\n");
}

export const cValShakeRobustnessDefaults = {
  marketSeeds: DEFAULT_ROBUSTNESS_MARKET_SEEDS,
};


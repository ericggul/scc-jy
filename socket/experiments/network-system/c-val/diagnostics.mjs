const DIAGNOSTIC_INTERVAL_MS = 1_000;

function emptyRange() {
  return { first: null, minimum: Infinity, maximum: -Infinity, latest: 0 };
}

function observeRange(range, value) {
  if (!Number.isFinite(value)) return;
  range.first ??= value;
  range.minimum = Math.min(range.minimum, value);
  range.maximum = Math.max(range.maximum, value);
  range.latest = value;
}

function rounded(value, digits = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Number(value.toFixed(digits));
}

function resetWindow(diagnostics, now) {
  diagnostics.windowStartedAt = now;
  diagnostics.observations = 0;
  diagnostics.volatility = emptyRange();
  diagnostics.activity = emptyRange();
  diagnostics.liquidity = emptyRange();
  diagnostics.price = emptyRange();
  diagnostics.latestState = null;
  diagnostics.submittedOrders = 0;
  diagnostics.cancelledOrders = 0;
  diagnostics.executions = 0;
}

export function createCValDiagnostics(now = Date.now()) {
  const diagnostics = {};
  resetWindow(diagnostics, now);
  return diagnostics;
}

export function clearCValDiagnostics(diagnostics, now = Date.now()) {
  resetWindow(diagnostics, now);
}

export function observeCValDiagnostics(diagnostics, state) {
  diagnostics.observations += 1;
  observeRange(diagnostics.volatility, state.parameters.volatility);
  observeRange(diagnostics.activity, state.parameters.activity);
  observeRange(diagnostics.liquidity, state.parameters.liquidity);
  observeRange(diagnostics.price, state.market.index);
  diagnostics.latestState = state;
  diagnostics.submittedOrders += state.market.submittedOrders ?? 0;
  diagnostics.cancelledOrders += state.market.cancelledOrders ?? 0;
  diagnostics.executions += state.market.executions ?? 0;
}

function parameterSummary(range) {
  return {
    min: rounded(range.minimum * 100, 0),
    max: rounded(range.maximum * 100, 0),
    end: rounded(range.latest * 100, 0),
  };
}

export function flushCValDiagnostics(
  diagnostics,
  now = Date.now(),
  logger = console.info,
) {
  const elapsed = now - diagnostics.windowStartedAt;
  if (
    elapsed < DIAGNOSTIC_INTERVAL_MS ||
    diagnostics.observations === 0 ||
    !diagnostics.latestState
  ) {
    return null;
  }

  const state = diagnostics.latestState;
  const openingPrice = state.market.openingPrice ?? 100;
  const changeFromOpenPercent =
    state.market.changeFromOpenPercent ??
    (state.market.index / openingPrice - 1) * 100;
  const message = {
    windowMs: elapsed,
    samples: diagnostics.observations,
    signalAgeMs:
      state.orientation.receivedAt > 0
        ? Math.max(0, now - state.orientation.receivedAt)
        : null,
    val: {
      v: parameterSummary(diagnostics.volatility),
      a: parameterSummary(diagnostics.activity),
      l: parameterSummary(diagnostics.liquidity),
      effectiveV: rounded(
        (state.market.volatilityRegime ?? state.parameters.volatility) * 100,
        0,
      ),
    },
    price: {
      start: rounded(diagnostics.price.first),
      end: rounded(state.market.index),
      low: rounded(diagnostics.price.minimum),
      high: rounded(diagnostics.price.maximum),
      range: rounded(
        diagnostics.price.maximum - diagnostics.price.minimum,
      ),
      marketDayMovePercent: rounded(
        state.market.oneSecondMovePercent,
        1,
      ),
      marketDayRange: rounded(state.market.oneSecondRange),
      fromOpenPercent: rounded(changeFromOpenPercent),
      value: rounded(state.market.fundamental ?? state.market.index),
    },
    flow: {
      submitted: diagnostics.submittedOrders,
      cancelled: diagnostics.cancelledOrders,
      executions: diagnostics.executions,
      imbalance: rounded(state.market.orderImbalance),
    },
    book: {
      depth: rounded(state.market.depth, 0),
      spreadBps: rounded(state.market.spreadBps, 1),
      impactBpsPer100: rounded(state.market.priceImpactBps),
    },
  };

  logger(`[c-val:1s] ${JSON.stringify(message)}`);
  resetWindow(diagnostics, now);
  return message;
}

export const cValDiagnosticTiming = {
  intervalMs: DIAGNOSTIC_INTERVAL_MS,
};

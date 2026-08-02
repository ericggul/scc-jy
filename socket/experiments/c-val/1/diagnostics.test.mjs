import assert from "node:assert/strict";
import test from "node:test";
import {
  clearCValDiagnostics,
  createCValDiagnostics,
  flushCValDiagnostics,
  observeCValDiagnostics,
} from "./diagnostics.mjs";

function state({
  price = 100,
  volatility = 0.5,
  activity = 0.5,
  liquidity = 0.5,
  receivedAt = 900,
} = {}) {
  return {
    parameters: { volatility, activity, liquidity },
    orientation: { receivedAt },
    market: {
      index: price,
      openingPrice: 100,
      changeFromOpenPercent: price - 100,
      fundamental: price + 0.2,
      oneSecondMovePercent: price - 100,
      oneSecondRange: Math.abs(price - 100),
      submittedOrders: 2,
      cancelledOrders: 1,
      executions: 1,
      orderImbalance: 0.25,
      depth: 4_000,
      spreadBps: 3.2,
      priceImpactBps: 0.8,
      volatilityRegime: 0.72,
    },
  };
}

test("diagnostics aggregate one bounded line per second", () => {
  const diagnostics = createCValDiagnostics(0);
  const lines = [];
  observeCValDiagnostics(
    diagnostics,
    state({ price: 99.9, volatility: 0.2 }),
  );
  observeCValDiagnostics(
    diagnostics,
    state({ price: 100.3, volatility: 0.9 }),
  );

  assert.equal(
    flushCValDiagnostics(diagnostics, 999, (line) => lines.push(line)),
    null,
  );
  const message = flushCValDiagnostics(
    diagnostics,
    1_000,
    (line) => lines.push(line),
  );
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^\[c-val:v1:1s\] /);
  assert.deepEqual(message.val, {
    v: { min: 20, max: 90, end: 90 },
    a: { min: 50, max: 50, end: 50 },
    l: { min: 50, max: 50, end: 50 },
    effectiveV: 72,
  });
  assert.equal(message.price.start, 99.9);
  assert.equal(message.price.end, 100.3);
  assert.equal(message.price.range, 0.4);
  assert.equal(message.price.marketDayMovePercent, 0.3);
  assert.equal(message.price.marketDayRange, 0.3);
  assert.deepEqual(message.flow, {
    submitted: 4,
    cancelled: 2,
    executions: 2,
    imbalance: 0.25,
  });
  assert.equal(flushCValDiagnostics(diagnostics, 2_000, () => {}), null);
});

test("clearing an inactive room discards stale observations", () => {
  const diagnostics = createCValDiagnostics(0);
  observeCValDiagnostics(diagnostics, state());
  clearCValDiagnostics(diagnostics, 800);
  assert.equal(flushCValDiagnostics(diagnostics, 2_000, () => {}), null);
});


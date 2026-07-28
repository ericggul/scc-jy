import assert from "node:assert/strict";
import test from "node:test";
import {
  cValModelTiming,
  createCValRuntime,
  orientationToCValParameters,
  setCValOrientation,
  snapshotCValRuntime,
  stepCValRuntime,
} from "./model.mjs";

function advance(runtime, ticks, startAt = 1_000) {
  for (let tick = 0; tick < ticks; tick += 1) {
    stepCValRuntime(runtime, startAt + tick * 50, 0.05);
  }
}

function advanceWithFreshSignal(runtime, orientation, ticks, startAt = 1_000) {
  for (let tick = 0; tick < ticks; tick += 1) {
    const now = startAt + tick * 50;
    setCValOrientation(runtime, orientation, now);
    stepCValRuntime(runtime, now, 0.05);
  }
}

function totalWealth(runtime) {
  return runtime.participants.reduce(
    (totals, participant) => ({
      cash: totals.cash + participant.cash,
      inventory: totals.inventory + participant.inventory,
    }),
    { cash: 0, inventory: 0 },
  );
}

test("alpha, beta, and gamma map independently to volatility, activity, and liquidity", () => {
  assert.deepEqual(
    orientationToCValParameters({ alpha: 0, beta: 0, gamma: 0 }),
    { volatility: 0.5, activity: 0.5, liquidity: 0.5 },
  );
  assert.deepEqual(
    orientationToCValParameters({ alpha: 90, beta: -90, gamma: 45 }),
    { volatility: 1, activity: 0, liquidity: 1 },
  );
});

test("fresh orientation drives shared VAL state and stale input returns to neutral", () => {
  const runtime = createCValRuntime(0, "signal-test", 1);
  setCValOrientation(
    runtime,
    { absolute: false, alpha: 90, beta: -90, gamma: 45 },
    1_000,
  );
  advance(runtime, 8, 1_000);
  assert.ok(runtime.parameters.volatility > 0.8);
  assert.ok(runtime.parameters.activity < 0.2);
  assert.ok(runtime.parameters.liquidity > 0.8);

  const releaseStart =
    1_000 +
    cValModelTiming.signalHoldMs +
    cValModelTiming.signalReleaseMs +
    50;
  advance(runtime, 30, releaseStart);
  assert.ok(Math.abs(runtime.parameters.volatility - 0.5) < 0.001);
  assert.ok(Math.abs(runtime.parameters.activity - 0.5) < 0.001);
  assert.ok(Math.abs(runtime.parameters.liquidity - 0.5) < 0.001);
});

test("all price changes come from executions in an uncrossed FIFO book", () => {
  const runtime = createCValRuntime(0, "book-test", 31);
  advanceWithFreshSignal(
    runtime,
    { absolute: false, alpha: 40, beta: 90, gamma: -20 },
    600,
  );
  const snapshot = snapshotCValRuntime(runtime);
  assert.ok(snapshot.recentOrders.length > 0);
  assert.ok(snapshot.recentTrades.length > 0);
  assert.ok(snapshot.market.bestBid < snapshot.market.bestAsk);
  assert.equal(
    snapshot.market.index,
    snapshot.recentTrades.at(-1).price,
  );
  assert.ok(
    [...runtime.book.orders.values()].every(
      (order) => order.kind === "limit" && order.remaining > 0,
    ),
  );
});

test("trades conserve participant cash and inventory", () => {
  const runtime = createCValRuntime(0, "conservation-test", 61);
  const before = totalWealth(runtime);
  advanceWithFreshSignal(
    runtime,
    { absolute: false, alpha: 50, beta: 90, gamma: -20 },
    1_000,
  );
  const after = totalWealth(runtime);
  assert.ok(Math.abs(after.cash - before.cash) < 0.001);
  assert.equal(after.inventory, before.inventory);
  assert.ok(runtime.participants.every(({ inventory }) => inventory >= 0));
});

test("activity changes event volume without directly assigning price movement", () => {
  const quiet = createCValRuntime(0, "quiet", 17);
  const busy = createCValRuntime(0, "busy", 17);
  advanceWithFreshSignal(
    quiet,
    { absolute: false, alpha: 0, beta: -90, gamma: 0 },
    1_000,
  );
  advanceWithFreshSignal(
    busy,
    { absolute: false, alpha: 0, beta: 90, gamma: 0 },
    1_000,
  );
  assert.ok(busy.market.turnover > quiet.market.turnover * 4);
});

test("liquidity is resting supply that lowers observed impact", () => {
  const low = createCValRuntime(0, "low-liquidity", 42);
  const high = createCValRuntime(0, "high-liquidity", 42);
  advanceWithFreshSignal(
    low,
    { absolute: false, alpha: 0, beta: 0, gamma: -45 },
    1_000,
  );
  advanceWithFreshSignal(
    high,
    { absolute: false, alpha: 0, beta: 0, gamma: 45 },
    1_000,
  );
  assert.ok(high.market.depth > low.market.depth * 4);
  assert.ok(high.market.priceImpactBps < low.market.priceImpactBps);
});

test("volatility changes the distribution of realized execution returns", () => {
  const low = createCValRuntime(0, "low-volatility", 99);
  const high = createCValRuntime(0, "high-volatility", 99);
  advanceWithFreshSignal(
    low,
    { absolute: false, alpha: -90, beta: 0, gamma: 0 },
    1_000,
  );
  advanceWithFreshSignal(
    high,
    { absolute: false, alpha: 90, beta: 0, gamma: 0 },
    1_000,
  );
  assert.ok(
    high.market.realizedVolatilityBps >
      low.market.realizedVolatilityBps * 2,
  );
});

test("long runs remain finite with bounded books, histories, and payloads", () => {
  const runtime = createCValRuntime(0, "long-run", 7);
  advanceWithFreshSignal(
    runtime,
    { absolute: false, alpha: 180, beta: 180, gamma: -90 },
    20_000,
  );
  const snapshot = snapshotCValRuntime(runtime);
  assert.ok(Object.values(snapshot.parameters).every(Number.isFinite));
  assert.ok(Object.values(snapshot.market).every(Number.isFinite));
  assert.ok(runtime.book.orders.size <= 420);
  assert.ok(
    runtime.participants.every(
      ({ cash, inventory }) => cash >= -0.001 && inventory >= 0,
    ),
  );
  assert.ok(
    Object.values(snapshot.history).every(
      (values) => values.length === cValModelTiming.historyLength,
    ),
  );
  assert.ok(snapshot.recentOrders.length <= 16);
  assert.ok(snapshot.recentTrades.length <= 12);
  assert.doesNotThrow(() => JSON.stringify(snapshot));
});

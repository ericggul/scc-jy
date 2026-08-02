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
  const prices = [];
  for (let tick = 0; tick < ticks; tick += 1) {
    const now = startAt + tick * 50;
    setCValOrientation(runtime, orientation, now);
    stepCValRuntime(runtime, now, 0.05);
    prices.push(runtime.market.index);
  }
  return prices;
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

function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function scenarioMeans(orientation) {
  const observations = [11, 23, 37, 53, 71].map((seed) => {
    const runtime = createCValRuntime(0, `scenario-${seed}`, seed);
    const prices = advanceWithFreshSignal(runtime, orientation, 800);
    return {
      realizedVolatilityBps: runtime.market.realizedVolatilityBps,
      turnover: runtime.market.turnover,
      depth: runtime.market.depth,
      priceImpactBps: runtime.market.priceImpactBps,
      priceRange: Math.max(...prices) - Math.min(...prices),
    };
  });
  return Object.fromEntries(
    Object.keys(observations[0]).map((key) => [
      key,
      mean(observations.map((observation) => observation[key])),
    ]),
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
  assert.ok(
    Math.abs(
      snapshot.market.index - snapshot.recentTrades.at(-1).price,
    ) < 0.000001,
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
  assert.ok(high.market.spreadBps > low.market.spreadBps);
  assert.ok(
    high.recentOrders.some(
      (order) =>
        order.participantType === "fundamental" &&
        order.kind === "market" &&
        order.filled > 0,
    ),
  );
});

test("sustained high V and A with low L creates visible executed-price movement", () => {
  const runtime = createCValRuntime(0, "visible-price", 101);
  const prices = advanceWithFreshSignal(
    runtime,
    { absolute: false, alpha: 90, beta: 90, gamma: -45 },
    200,
  );
  const range = Math.max(...prices) - Math.min(...prices);
  assert.ok(range > 50);
  assert.ok(Math.abs(runtime.market.changeFromOpenPercent) > 10);
  assert.ok(runtime.market.index === runtime.lastTradeTicks * 0.01);
});

test("an untouched neutral market stays near 100 across compressed market days", () => {
  for (const seed of [11, 23, 37, 53, 71]) {
    const runtime = createCValRuntime(0, `neutral-${seed}`, seed);
    const prices = [];
    const spreads = [];
    for (let tick = 0; tick < 400; tick += 1) {
      stepCValRuntime(runtime, 1_000 + tick * 50, 0.05);
      prices.push(runtime.market.index);
      spreads.push(runtime.market.spreadBps);
    }
    assert.ok(Math.min(...prices) >= 95);
    assert.ok(Math.max(...prices) <= 105);
    spreads.sort((left, right) => left - right);
    assert.ok(spreads[Math.floor(spreads.length / 2)] < 10);
  }
});

test("moderate V does not inherit the crisis-scale price process", () => {
  for (const seed of [11, 23, 37, 53, 71]) {
    const runtime = createCValRuntime(0, `moderate-${seed}`, seed);
    const prices = advanceWithFreshSignal(
      runtime,
      {
        absolute: false,
        alpha: 32.4,
        beta: -32.4,
        gamma: -22.5,
      },
      200,
    );
    assert.ok(Math.max(...prices) / Math.min(...prices) < 1.75);
  }
});

test("one market-day measures are derived from the actual one-second execution window", () => {
  const runtime = createCValRuntime(0, "day-window", 121);
  advanceWithFreshSignal(
    runtime,
    { absolute: false, alpha: 90, beta: 90, gamma: -45 },
    80,
  );
  const cutoff = runtime.serverTime - 1_000;
  const firstRecentIndex = runtime.tradeWindow.findIndex(
    (trade) => trade.executedAt >= cutoff,
  );
  assert.ok(firstRecentIndex >= 0);
  const trades = runtime.tradeWindow.slice(
    Math.max(firstRecentIndex - 1, firstRecentIndex),
  );
  const prices = trades.map(({ priceTicks }) => priceTicks * 0.01);
  const expectedMove =
    (trades.at(-1).priceTicks / trades[0].priceTicks - 1) * 100;
  const expectedRange = Math.max(...prices) - Math.min(...prices);
  assert.ok(
    Math.abs(runtime.market.oneSecondMovePercent - expectedMove) < 1e-9,
  );
  assert.ok(
    Math.abs(runtime.market.oneSecondRange - expectedRange) < 1e-9,
  );
});

test("compressed crisis and bubble days can produce execution-derived order-of-magnitude moves", () => {
  const runtime = createCValRuntime(0, "compressed-days", 202);
  const prices = advanceWithFreshSignal(
    runtime,
    { absolute: false, alpha: 90, beta: 90, gamma: -45 },
    600,
  );
  assert.ok(Math.max(...prices) / Math.min(...prices) >= 10);
  assert.ok(prices.every((price) => price >= 10 && price <= 1_000));
  assert.equal(runtime.market.index, runtime.recentTrades.at(-1).price);
});

test("VAL effects remain distinct across multiple random market paths", () => {
  const lowV = scenarioMeans({
    absolute: false,
    alpha: -90,
    beta: 0,
    gamma: 0,
  });
  const highV = scenarioMeans({
    absolute: false,
    alpha: 90,
    beta: 0,
    gamma: 0,
  });
  const lowA = scenarioMeans({
    absolute: false,
    alpha: 0,
    beta: -90,
    gamma: 0,
  });
  const highA = scenarioMeans({
    absolute: false,
    alpha: 0,
    beta: 90,
    gamma: 0,
  });
  const lowL = scenarioMeans({
    absolute: false,
    alpha: 0,
    beta: 0,
    gamma: -45,
  });
  const highL = scenarioMeans({
    absolute: false,
    alpha: 0,
    beta: 0,
    gamma: 45,
  });

  assert.ok(highV.realizedVolatilityBps > lowV.realizedVolatilityBps * 4);
  assert.ok(highV.priceRange > lowV.priceRange * 4);
  assert.ok(highA.turnover > lowA.turnover * 4);
  assert.ok(highL.depth > lowL.depth * 4);
  assert.ok(highL.priceImpactBps < lowL.priceImpactBps);
});

test("rapid shake-like VAL reversals persist long enough to move executions", () => {
  const runtime = createCValRuntime(0, "shake-pattern", 202);
  const prices = [];
  const values = [];
  const riskRegimes = [];
  for (let tick = 0; tick < 300; tick += 1) {
    const now = 1_000 + tick * 50;
    setCValOrientation(
      runtime,
      {
        absolute: false,
        alpha: 90 * Math.sin(tick * 0.43),
        beta: 90 * Math.sin(tick * 0.29 + 1.1),
        gamma: 45 * Math.sin(tick * 0.37 + 2.2),
      },
      now,
    );
    stepCValRuntime(runtime, now, 0.05);
    prices.push(runtime.market.index);
    values.push(runtime.market.fundamental);
    riskRegimes.push(runtime.volatilityRegime);
  }

  assert.ok(Math.max(...riskRegimes) > 0.7);
  assert.ok(Math.max(...values) - Math.min(...values) > 0.5);
  assert.ok(Math.max(...prices) - Math.min(...prices) > 0.5);
});

test("provider depth accumulated at high L withdraws when L falls and V rises", () => {
  const runtime = createCValRuntime(0, "liquidity-withdrawal", 303);
  advanceWithFreshSignal(
    runtime,
    { absolute: false, alpha: -45, beta: 0, gamma: 45 },
    200,
  );
  const highLiquidityDepth = runtime.market.depth;
  const highLiquidityProviderOrders = [...runtime.book.orders.values()].filter(
    (order) => order.participantType === "liquidity-provider",
  ).length;

  advanceWithFreshSignal(
    runtime,
    { absolute: false, alpha: 90, beta: 0, gamma: -45 },
    60,
    11_000,
  );
  const withdrawnProviderOrders = [...runtime.book.orders.values()].filter(
    (order) => order.participantType === "liquidity-provider",
  ).length;

  assert.ok(runtime.market.depth < highLiquidityDepth / 3);
  assert.ok(
    withdrawnProviderOrders < highLiquidityProviderOrders / 2,
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

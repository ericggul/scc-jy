import assert from "node:assert/strict";
import test from "node:test";
import {
  activateCValRuntime,
  beginCValRuntimeSettlement,
  cValConditionDirection,
  cValModelTiming,
  createCValRuntime,
  rotationRateToCValControl,
  setCValHumanControl,
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

function advanceWithControl(runtime, control, ticks, startAt = 1_000) {
  const prices = [];
  for (let tick = 0; tick < ticks; tick += 1) {
    const now = startAt + tick * 50;
    setCValHumanControl(runtime, { ...control, engaged: true }, now);
    stepCValRuntime(runtime, now, 0.05);
    prices.push(runtime.market.index);
  }
  return prices;
}

function submittedAcrossControl(runtime, control, ticks, startAt = 1_000) {
  let submitted = 0;
  for (let tick = 0; tick < ticks; tick += 1) {
    const now = startAt + tick * 50;
    setCValHumanControl(runtime, { ...control, engaged: true }, now);
    stepCValRuntime(runtime, now, 0.05);
    submitted += runtime.counters.submitted;
  }
  return submitted;
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

function scenarioMeans(control) {
  const observations = [11, 23, 37, 53, 71].map((seed) => {
    const runtime = createCValRuntime(0, `scenario-${seed}`, seed);
    const prices = advanceWithControl(runtime, control, 800);
    return {
      realizedVolatilityBps: runtime.market.realizedVolatilityBps,
      submittedOrders: runtime.market.submittedOrders,
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

test("live rotation-rate mapping is neutral at rest and strong before a large turn", () => {
  assert.deepEqual(
    rotationRateToCValControl({ alpha: 0, beta: 0, gamma: 0 }).parameters,
    { volatility: 0.5, activity: 0.5, liquidity: 0.5 },
  );
  const ordinary = rotationRateToCValControl({ alpha: 0, beta: 20, gamma: 0 });
  assert.ok(ordinary.parameters.volatility > 0.79);
  assert.ok(ordinary.parameters.activity > 0.79);
  assert.ok(ordinary.parameters.liquidity < 0.21);
  assert.equal(ordinary.engaged, true);
});

test("signed A maps to symmetric direction while V and L scale it", () => {
  const up = cValConditionDirection({ volatility: 1, activity: 1, liquidity: 0 });
  const down = cValConditionDirection({ volatility: 1, activity: 0, liquidity: 0 });
  const damped = cValConditionDirection({ volatility: 1, activity: 1, liquidity: 1 });
  const balanced = cValConditionDirection({ volatility: 0.8, activity: 0.5, liquidity: 0.5 });

  assert.equal(up, 1);
  assert.equal(down, -1);
  assert.ok(damped > 0 && damped < up);
  assert.ok(Math.abs(balanced) < 1e-12);
});

test("opposite ordinary wrist rotations produce opposite executed-price direction", () => {
  const upwardControl = rotationRateToCValControl({
    alpha: 0,
    beta: 20,
    gamma: 0,
  }).parameters;
  const downwardControl = rotationRateToCValControl({
    alpha: 0,
    beta: -20,
    gamma: 0,
  }).parameters;

  for (const seed of [3, 7, 11, 19, 29, 41]) {
    const upward = createCValRuntime(0, `up-${seed}`, seed);
    const downward = createCValRuntime(0, `down-${seed}`, seed);
    advanceWithControl(upward, upwardControl, 100);
    advanceWithControl(downward, downwardControl, 100);

    assert.ok(upward.market.index > 100);
    assert.ok(downward.market.index < 100);
    assert.equal(upward.market.index, upward.recentTrades.at(-1).price);
    assert.equal(downward.market.index, downward.recentTrades.at(-1).price);
  }
});

test("an untouched runtime remains a participant-free market at exactly 100", () => {
  const runtime = createCValRuntime(0, "waiting-market", 41);
  const initialSeed = runtime.randomSeed;

  advance(runtime, 1_200);
  const snapshot = snapshotCValRuntime(runtime);

  assert.equal(snapshot.phase, "waiting");
  assert.equal(snapshot.activatedAt, null);
  assert.equal(snapshot.revision, 0);
  assert.equal(runtime.randomSeed, initialSeed);
  assert.equal(snapshot.market.index, 100);
  assert.equal(snapshot.market.fundamental, 100);
  assert.equal(snapshot.market.turnover, 0);
  assert.equal(snapshot.market.executions, 0);
  assert.equal(runtime.participants.length, 0);
  assert.equal(runtime.book.orders.size, 0);
  assert.deepEqual(snapshot.orderBook, { bids: [], asks: [] });
  assert.deepEqual(snapshot.recentOrders, []);
  assert.deepEqual(snapshot.recentTrades, []);
  assert.ok(snapshot.participants.every(({ count }) => count === 0));
  assert.ok(snapshot.history.index.every((price) => price === 100));
});

test("an unattended active market settles continuously before returning to the exact dormant baseline", () => {
  const runtime = createCValRuntime(0, "settlement", 19);
  advanceWithControl(runtime, { volatility: 1, activity: 1, liquidity: 0 }, 100);
  const startAt = 6_000;
  const startingIndex = runtime.market.index;
  assert.notEqual(startingIndex, 100);
  assert.equal(beginCValRuntimeSettlement(runtime, startAt), true);
  assert.equal(runtime.phase, "settling");
  assert.equal(runtime.settlement.durationMs, 3_000);
  assert.ok(runtime.visibleBook.bids.length > 0);

  const midpoint = startAt + Math.floor(runtime.settlement.durationMs / 2);
  stepCValRuntime(runtime, midpoint, 0.05);
  assert.ok(Math.abs(runtime.market.index - 100) < Math.abs(startingIndex - 100));
  assert.notEqual(runtime.market.index, 100);
  assert.ok(runtime.market.submittedOrders >= 0);
  assert.ok(runtime.market.executions >= 0);
  assert.ok(runtime.market.depth >= 0);

  stepCValRuntime(runtime, startAt + runtime.settlement.durationMs, 0.05);
  const snapshot = snapshotCValRuntime(runtime);
  assert.equal(snapshot.phase, "waiting");
  assert.deepEqual(snapshot.parameters, { volatility: 0.5, activity: 0.5, liquidity: 0.5 });
  assert.equal(snapshot.market.index, 100);
});

test("a fresh phone signal cancels settlement instead of being confused with the idle state", () => {
  const runtime = createCValRuntime(0, "settlement-resume", 31);
  advanceWithControl(runtime, { volatility: 1, activity: 1, liquidity: 0 }, 20);
  beginCValRuntimeSettlement(runtime, 2_000);
  setCValHumanControl(runtime, { volatility: 0.9, activity: 0.8, liquidity: 0.2, engaged: true }, 2_050);
  assert.equal(runtime.phase, "active");
  assert.equal(runtime.settlement, null);
});

test("a newly joined mobile can wake the waiting runtime and interrupt a return immediately", () => {
  const runtime = createCValRuntime(0, "mobile-join", 37);
  assert.equal(activateCValRuntime(runtime, 100), true);
  assert.equal(runtime.phase, "active");

  beginCValRuntimeSettlement(runtime, 200);
  assert.equal(runtime.phase, "settling");
  assert.equal(activateCValRuntime(runtime, 250), true);
  assert.equal(runtime.phase, "active");
  assert.equal(runtime.settlement, null);
});

test("a baseline packet stays dormant and intentional input activates once", () => {
  const runtime = createCValRuntime(0, "activation-gate", 43);

  setCValOrientation(
    runtime,
    { absolute: false, alpha: 0, beta: 0, gamma: 0 },
    1_000,
  );
  stepCValRuntime(runtime, 1_000, 0.05);
  assert.equal(runtime.phase, "waiting");
  assert.equal(runtime.participants.length, 0);
  assert.equal(runtime.book.orders.size, 0);

  setCValOrientation(
    runtime,
    { absolute: false, alpha: 2, beta: 0, gamma: 0 },
    1_050,
  );
  assert.equal(runtime.phase, "active");
  assert.equal(runtime.activatedAt, 1_050);
  assert.equal(runtime.participants.length, 56);
  assert.ok(runtime.book.orders.size > 0);
  assert.equal(activateCValRuntime(runtime, 2_000), false);
  assert.equal(runtime.activatedAt, 1_050);
});

test("legacy orientation bridge still releases stale input to neutral", () => {
  const runtime = createCValRuntime(0, "signal-test", 1);
  setCValOrientation(
    runtime,
    { absolute: false, alpha: 0, beta: -90, gamma: 0 },
    1_000,
  );
  advance(runtime, 8, 1_000);
  assert.ok(runtime.parameters.volatility > 0.7);
  assert.ok(runtime.parameters.activity < 0.4);
  assert.ok(runtime.parameters.liquidity < 0.3);

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
  setCValOrientation(
    runtime,
    { absolute: false, alpha: 50, beta: 90, gamma: -20 },
    1_000,
  );
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

test("directional activity raises event volume at either extreme", () => {
  const quiet = createCValRuntime(0, "quiet", 17);
  const busy = createCValRuntime(0, "busy", 17);
  const quietSubmitted = submittedAcrossControl(
    quiet,
    { volatility: 0.5, activity: 0.5, liquidity: 0.5 },
    1_000,
  );
  const busySubmitted = submittedAcrossControl(
    busy,
    { volatility: 1, activity: 1, liquidity: 0 },
    1_000,
  );
  assert.ok(busySubmitted > quietSubmitted * 1.4);
});

test("liquidity is resting supply that lowers observed impact", () => {
  const low = createCValRuntime(0, "low-liquidity", 42);
  const high = createCValRuntime(0, "high-liquidity", 42);
  advanceWithControl(low, { volatility: 0.5, activity: 0.5, liquidity: 0 }, 1_000);
  advanceWithControl(high, { volatility: 0.5, activity: 0.5, liquidity: 1 }, 1_000);
  assert.ok(high.market.depth > low.market.depth * 4);
  assert.ok(high.market.priceImpactBps < low.market.priceImpactBps);
});

test("volatility changes the distribution of realized execution returns", () => {
  const low = createCValRuntime(0, "low-volatility", 99);
  const high = createCValRuntime(0, "high-volatility", 99);
  advanceWithControl(low, { volatility: 0, activity: 0.5, liquidity: 0.5 }, 1_000);
  advanceWithControl(high, { volatility: 1, activity: 0.5, liquidity: 0.5 }, 1_000);
  assert.ok(
    high.market.realizedVolatilityBps >
      low.market.realizedVolatilityBps * 2,
  );
  assert.ok(high.market.spreadBps > low.market.spreadBps);
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

test("an untouched neutral market stays exactly at 100 across compressed market days", () => {
  for (const seed of [11, 23, 37, 53, 71]) {
    const runtime = createCValRuntime(0, `neutral-${seed}`, seed);
    const prices = [];
    for (let tick = 0; tick < 400; tick += 1) {
      stepCValRuntime(runtime, 1_000 + tick * 50, 0.05);
      prices.push(runtime.market.index);
    }
    assert.ok(prices.every((price) => price === 100));
    assert.equal(runtime.phase, "waiting");
    assert.equal(runtime.participants.length, 0);
    assert.equal(runtime.book.orders.size, 0);
  }
});

test("moderate V does not inherit the crisis-scale price process", () => {
  for (const seed of [11, 23, 37, 53, 71]) {
    const runtime = createCValRuntime(0, `moderate-${seed}`, seed);
    const prices = advanceWithFreshSignal(
      runtime,
      {
        absolute: false,
        alpha: 0,
        beta: 8,
        gamma: 0,
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

test("V/A/L market effects remain distinct beneath the coupled phone mapping", () => {
  const lowV = scenarioMeans({ volatility: 0, activity: 0.5, liquidity: 0.5 });
  const highV = scenarioMeans({ volatility: 1, activity: 0.5, liquidity: 0.5 });
  const lowA = scenarioMeans({ volatility: 0.5, activity: 0.5, liquidity: 0.5 });
  const highA = scenarioMeans({ volatility: 0.5, activity: 1, liquidity: 0.5 });
  const lowL = scenarioMeans({ volatility: 0.5, activity: 0.5, liquidity: 0 });
  const highL = scenarioMeans({ volatility: 0.5, activity: 0.5, liquidity: 1 });

  assert.ok(highV.realizedVolatilityBps > lowV.realizedVolatilityBps * 4);
  assert.ok(highV.priceRange > lowV.priceRange * 4);
  assert.ok(highA.submittedOrders > lowA.submittedOrders * 1.4);
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
  advanceWithControl(runtime, { volatility: 0.25, activity: 0.5, liquidity: 1 }, 200);
  const highLiquidityDepth = runtime.market.depth;
  const highLiquidityProviderOrders = [...runtime.book.orders.values()].filter(
    (order) => order.participantType === "liquidity-provider",
  ).length;

  advanceWithControl(runtime, { volatility: 1, activity: 0.5, liquidity: 0 }, 60, 11_000);
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

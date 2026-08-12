import {
  cValCalibration,
  interpolateAround,
  interpolateRange,
} from "./calibration.mjs";
import { orientationToCValParameters } from "./orientation.mjs";
import {
  bookOrders,
  bookSideOrderCount,
  cancelOrder,
  createOrderBook,
  getBestQuotes,
  snapshotOrderBook,
  submitOrder,
} from "./order-book.mjs";

export const cValParameterIds = ["volatility", "activity", "liquidity"];

export const cValVersion = "2";

export const cValNeutralParameters = {
  volatility: 0.5,
  activity: 0.5,
  liquidity: 0.5,
};

const SIGNAL_HOLD_MS = 180;
const SIGNAL_RELEASE_MS = 620;
const PARAMETER_RESPONSE_PER_SECOND = 8;
const INTERNAL_TRADE_LIMIT = 240;
const INTERNAL_FLOW_LIMIT = 480;
const BOOK_LEVELS_IN_SNAPSHOT = 9;
const ORIENTATION_ACTIVATION_THRESHOLD_DEGREES = 2;

function clamp(value, minimum, maximum) {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(Math.max(value, minimum), maximum);
}

function copyRecord(record) {
  return Object.fromEntries(Object.entries(record));
}

function compactNumber(value) {
  return Number.isInteger(value) ? value : Number(value.toFixed(6));
}

function compactRecord(record) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      typeof value === "number" ? compactNumber(value) : value,
    ]),
  );
}

function pushBounded(list, value, limit) {
  list.push(value);
  if (list.length > limit) list.splice(0, list.length - limit);
}

export {
  orientationToCValParameters,
  rotationRateToCValControl,
} from "./orientation.mjs";

/**
 * One fixed bridge from the three intermediate phone conditions to market
 * direction. A carries the fixed forward/back sign around 0.5. V carries
 * gesture intensity and L carries its inverse depth/damping condition.
 */
export function cValConditionDirection(parameters = {}) {
  const signedActivity = (clamp(parameters.activity, 0, 1) - 0.5) * 2;
  const volatilityGain = 0.25 + 0.75 * clamp(parameters.volatility, 0, 1);
  const liquidityGain = 1 - 0.75 * clamp(parameters.liquidity, 0, 1);
  return clamp(signedActivity * volatilityGain * liquidityGain, -1, 1);
}

function effectiveActivity(parameters) {
  const directionalIntensity = Math.abs(
    (clamp(parameters.activity, 0, 1) - 0.5) * 2,
  );
  return 0.5 + 0.5 * directionalIntensity;
}

function nextRandom(runtime) {
  let state = runtime.randomSeed || 0x6d2b79f5;
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  runtime.randomSeed = state >>> 0;
  return runtime.randomSeed / 0x1_0000_0000;
}

function sampleNormal(runtime) {
  const left = Math.max(nextRandom(runtime), Number.EPSILON);
  const right = nextRandom(runtime);
  return Math.sqrt(-2 * Math.log(left)) * Math.cos(2 * Math.PI * right);
}

function sampleGamma(runtime, shape) {
  if (shape < 1) {
    return (
      sampleGamma(runtime, shape + 1) *
      nextRandom(runtime) ** (1 / shape)
    );
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    const normal = sampleNormal(runtime);
    const factor = 1 + c * normal;
    if (factor <= 0) continue;
    const cubed = factor ** 3;
    const uniform = nextRandom(runtime);
    if (
      uniform < 1 - 0.0331 * normal ** 4 ||
      Math.log(uniform) <
        0.5 * normal ** 2 + d * (1 - cubed + Math.log(cubed))
    ) {
      return d * cubed;
    }
  }
}

function sampleStudentT(runtime, degreesOfFreedom) {
  const chiSquared = 2 * sampleGamma(runtime, degreesOfFreedom / 2);
  return sampleNormal(runtime) / Math.sqrt(chiSquared / degreesOfFreedom);
}

function samplePoisson(runtime, expectedEvents) {
  const threshold = Math.exp(-expectedEvents);
  let product = 1;
  let count = 0;
  do {
    count += 1;
    product *= nextRandom(runtime);
  } while (product > threshold);
  return count - 1;
}

function createParticipants() {
  const participants = [];
  const roles = [
    ["liquidity-provider", cValCalibration.structural.participantCounts.liquidityProvider],
    ["fundamental", cValCalibration.structural.participantCounts.fundamental],
    ["trend", cValCalibration.structural.participantCounts.trend],
    ["noise", cValCalibration.structural.participantCounts.noise],
  ];
  for (const [type, count] of roles) {
    for (let index = 0; index < count; index += 1) {
      participants.push({
        id: `${type}-${index + 1}`,
        type,
        cash: 5_000_000,
        inventory: 50_000,
        privateValueTicks: cValCalibration.structural.initialPriceTicks,
      });
    }
  }
  return participants;
}

function participantPool(runtime, type) {
  return runtime.participants.filter((participant) => participant.type === type);
}

function randomParticipant(runtime, type) {
  const pool = participantPool(runtime, type);
  return pool[Math.floor(nextRandom(runtime) * pool.length)];
}

function initialHistory() {
  const length = cValCalibration.safety.historyLength;
  return {
    index: Array.from({ length }, () => 100),
    volatility: Array.from(
      { length },
      () => cValNeutralParameters.volatility,
    ),
    activity: Array.from({ length }, () => cValNeutralParameters.activity),
    liquidity: Array.from({ length }, () => cValNeutralParameters.liquidity),
    returnPercent: Array.from({ length }, () => 0),
    realizedVolatilityBps: Array.from({ length }, () => 0),
    depth: Array.from({ length }, () => 0),
  };
}

let runSequence = 0;

function createRunId(now) {
  runSequence += 1;
  return `${now.toString(36)}-${runSequence.toString(36)}`;
}

function priceFromTicks(ticks) {
  return ticks * cValCalibration.structural.tickSize;
}

function boundedPriceTicks(ticks) {
  return Math.max(1, Math.round(ticks));
}

function seedBook(runtime, now) {
  const center = cValCalibration.structural.initialPriceTicks;
  const providers = participantPool(runtime, "liquidity-provider");
  for (let distance = 1; distance <= 14; distance += 1) {
    for (let queue = 0; queue < 3; queue += 1) {
      for (const side of ["buy", "sell"]) {
        const participant =
          providers[(distance * 3 + queue + (side === "sell" ? 5 : 0)) % providers.length];
        const quantity =
          cValCalibration.empirical.typicalOrderQuantity *
          (1 + ((distance + queue) % 3));
        submitOrder(runtime.book, {
          id: `seed-${side}-${distance}-${queue}`,
          traderId: participant.id,
          participantType: participant.type,
          side,
          kind: "limit",
          priceTicks: center + (side === "buy" ? -distance : distance),
          quantity,
          submittedAt: now,
          initialDistanceTicks: distance * 2,
        });
      }
    }
  }
}

function deriveBookState(runtime) {
  const { bestBidTicks, bestAskTicks } = getBestQuotes(runtime.book);
  const fallback = cValCalibration.structural.initialPriceTicks;
  const reference = runtime.lastTradeTicks ?? fallback;
  const bid =
    bestBidTicks ?? Math.min(reference - 1, (bestAskTicks ?? reference) - 1);
  const ask =
    bestAskTicks ?? Math.max(reference + 1, (bestBidTicks ?? reference) + 1);
  const midTicks = (bid + ask) / 2;
  const book = snapshotOrderBook(runtime.book, BOOK_LEVELS_IN_SNAPSHOT);
  const depth = [...book.bids.slice(0, 5), ...book.asks.slice(0, 5)].reduce(
    (total, level) => total + level.quantity,
    0,
  );
  const spreadBps = ((ask - bid) / midTicks) * 10_000;
  return { bestBidTicks: bid, bestAskTicks: ask, midTicks, depth, spreadBps, book };
}

function flowImbalance(runtime, now) {
  const cutoff = now - 5_000;
  const recent = runtime.flowWindow.filter((event) => event.at >= cutoff);
  runtime.flowWindow = recent;
  let signed = 0;
  let total = 0;
  for (const event of recent) {
    signed += (event.side === "buy" ? 1 : -1) * event.quantity;
    total += event.quantity;
  }
  return total > 0 ? signed / total : 0;
}

function turnover(runtime, now) {
  const cutoff = now - 10_000;
  return runtime.tradeWindow
    .filter((trade) => trade.executedAt >= cutoff)
    .reduce((total, trade) => total + trade.quantity, 0);
}

function oneSecondExecutionMetrics(runtime, now) {
  const cutoff = now - 1_000;
  const trades = runtime.tradeWindow;
  const firstRecentIndex = trades.findIndex(
    (trade) => trade.executedAt >= cutoff,
  );
  if (firstRecentIndex < 0) {
    const price = priceFromTicks(runtime.lastTradeTicks);
    return {
      oneSecondMovePercent: 0,
      oneSecondLow: price,
      oneSecondHigh: price,
      oneSecondRange: 0,
    };
  }
  const anchorIndex = Math.max(firstRecentIndex - 1, firstRecentIndex);
  const window = trades.slice(anchorIndex);
  const firstTicks = window[0].priceTicks;
  const lastTicks = window.at(-1).priceTicks;
  const prices = window.map(({ priceTicks }) => priceTicks);
  const low = priceFromTicks(Math.min(...prices));
  const high = priceFromTicks(Math.max(...prices));
  return {
    oneSecondMovePercent: (lastTicks / firstTicks - 1) * 100,
    oneSecondLow: low,
    oneSecondHigh: high,
    oneSecondRange: high - low,
  };
}

function realizedVolatilityBps(runtime) {
  const returns = [];
  for (let index = 1; index < runtime.tradeWindow.length; index += 1) {
    const previous = runtime.tradeWindow[index - 1].priceTicks;
    const current = runtime.tradeWindow[index].priceTicks;
    if (previous > 0) returns.push(Math.log(current / previous) * 10_000);
  }
  if (returns.length < 2) return 0;
  const mean =
    returns.reduce((total, value) => total + value, 0) / returns.length;
  const variance =
    returns.reduce((total, value) => total + (value - mean) ** 2, 0) /
    (returns.length - 1);
  return Math.sqrt(variance);
}

function observedImpactBps(runtime) {
  const trades = runtime.tradeWindow.slice(-40);
  if (trades.length < 2) return 0;
  let totalMove = 0;
  let quantity = 0;
  for (let index = 1; index < trades.length; index += 1) {
    const previous = trades[index - 1];
    const current = trades[index];
    totalMove += Math.abs(
      Math.log(current.priceTicks / previous.priceTicks) * 10_000,
    );
    quantity += current.quantity;
  }
  return quantity > 0 ? (totalMove / quantity) * 100 : 0;
}

function updateMarket(runtime, now) {
  const bookState = deriveBookState(runtime);
  const priceTicks = runtime.lastTradeTicks ?? bookState.midTicks;
  const index = priceFromTicks(priceTicks);
  const openingPrice = priceFromTicks(runtime.openingPriceTicks);
  const oneSecond = oneSecondExecutionMetrics(runtime, now);
  runtime.market = {
    index,
    openingPrice,
    changeFromOpenPercent: (index / openingPrice - 1) * 100,
    ...oneSecond,
    fundamental: priceFromTicks(runtime.fundamentalTicks),
    bestBid: priceFromTicks(bookState.bestBidTicks),
    bestAsk: priceFromTicks(bookState.bestAskTicks),
    orderImbalance: flowImbalance(runtime, now),
    returnPercent: runtime.market?.returnPercent ?? 0,
    turnover: turnover(runtime, now),
    spreadBps: bookState.spreadBps,
    depth: bookState.depth,
    priceImpactBps: observedImpactBps(runtime),
    realizedVolatilityBps: realizedVolatilityBps(runtime),
    volatilityRegime: runtime.volatilityRegime,
    submittedOrders: runtime.counters.submitted,
    cancelledOrders: runtime.counters.cancelled,
    executions: runtime.counters.executions,
  };
  runtime.visibleBook = bookState.book;
}

function createDormantMarket() {
  return {
    index: 100,
    openingPrice: 100,
    changeFromOpenPercent: 0,
    oneSecondMovePercent: 0,
    oneSecondLow: 100,
    oneSecondHigh: 100,
    oneSecondRange: 0,
    fundamental: 100,
    bestBid: 100,
    bestAsk: 100,
    orderImbalance: 0,
    returnPercent: 0,
    turnover: 0,
    spreadBps: 0,
    depth: 0,
    priceImpactBps: 0,
    realizedVolatilityBps: 0,
    volatilityRegime: cValNeutralParameters.volatility,
    submittedOrders: 0,
    cancelledOrders: 0,
    executions: 0,
  };
}

export function createCValRuntime(
  now = Date.now(),
  runId = createRunId(now),
  randomSeed = 0x6d2b79f5,
) {
  const runtime = {
    runId,
    phase: "waiting",
    activatedAt: null,
    revision: 0,
    serverTime: now,
    randomSeed: randomSeed >>> 0,
    parameters: copyRecord(cValNeutralParameters),
    volatilityRegime: cValNeutralParameters.volatility,
    orientationTarget: copyRecord(cValNeutralParameters),
    humanControl: {
      ...copyRecord(cValNeutralParameters),
      engaged: false,
      contributors: 0,
      receivedAt: 0,
    },
    orientation: {
      absolute: false,
      alpha: 0,
      beta: 0,
      gamma: 0,
      receivedAt: 0,
    },
    participants: [],
    book: createOrderBook(),
    visibleBook: { bids: [], asks: [] },
    fundamentalTicks: cValCalibration.structural.initialPriceTicks,
    lastTradeTicks: cValCalibration.structural.initialPriceTicks,
    openingPriceTicks: cValCalibration.structural.initialPriceTicks,
    lastHistoryIndex: 100,
    orderSequence: 0,
    metaOrder: { sign: 1, remaining: 0 },
    momentumBps: 0,
    flowWindow: [],
    tradeWindow: [],
    recentOrders: [],
    recentTrades: [],
    counters: { submitted: 0, cancelled: 0, executions: 0 },
    market: createDormantMarket(),
    history: initialHistory(),
  };
  return runtime;
}

export function activateCValRuntime(runtime, now = Date.now()) {
  if (runtime.phase === "active") return false;
  runtime.phase = "active";
  runtime.activatedAt = now;
  runtime.participants = createParticipants();
  runtime.book = createOrderBook();
  seedBook(runtime, now);
  updateMarket(runtime, now);
  runtime.history.depth.fill(runtime.market.depth);
  return true;
}

export function resetCValRuntime(runtime, now = Date.now()) {
  Object.assign(runtime, createCValRuntime(now));
  return runtime;
}

// Legacy offline shake-harness bridge only; not reachable from the V2 socket.
export function setCValOrientation(runtime, orientation, now = Date.now()) {
  runtime.orientation = {
    absolute: Boolean(orientation.absolute),
    alpha: clamp(orientation.alpha, -180, 180),
    beta: clamp(orientation.beta, -180, 180),
    gamma: clamp(orientation.gamma, -90, 90),
    receivedAt: now,
  };
  runtime.orientationTarget = orientationToCValParameters(runtime.orientation);
  if (
    Math.max(
      Math.abs(runtime.orientation.alpha),
      Math.abs(runtime.orientation.beta),
      Math.abs(runtime.orientation.gamma),
    ) >= ORIENTATION_ACTIVATION_THRESHOLD_DEGREES
  ) {
    activateCValRuntime(runtime, now);
  }
  return runtime.orientation;
}

export function setCValHumanControl(runtime, input = {}, now = Date.now()) {
  runtime.humanControl = {
    volatility: clamp(input.volatility, 0, 1),
    activity: clamp(input.activity, 0, 1),
    liquidity: clamp(input.liquidity, 0, 1),
    engaged: Boolean(input.engaged),
    contributors: Math.max(
      0,
      Math.floor(input.contributors ?? (input.engaged ? 1 : 0)),
    ),
    receivedAt: Number.isFinite(input.receivedAt) ? input.receivedAt : now,
  };
  if (runtime.humanControl.engaged) activateCValRuntime(runtime, now);
  return runtime.humanControl;
}

function signalStrength(runtime, now) {
  if (runtime.orientation.receivedAt <= 0) return 0;
  return (
    1 -
    clamp(
      (now - runtime.orientation.receivedAt - SIGNAL_HOLD_MS) /
        SIGNAL_RELEASE_MS,
      0,
      1,
    )
  );
}

function updateParameters(runtime, now, dt) {
  const usesHumanControl = runtime.humanControl.engaged;
  const strength = usesHumanControl ? 1 : signalStrength(runtime, now);
  const parameterTarget = usesHumanControl
    ? runtime.humanControl
    : runtime.orientationTarget;
  const response = 1 - Math.exp(-PARAMETER_RESPONSE_PER_SECOND * dt);
  for (const parameterId of cValParameterIds) {
    const target =
      cValNeutralParameters[parameterId] +
      (parameterTarget[parameterId] -
        cValNeutralParameters[parameterId]) *
        strength;
    runtime.parameters[parameterId] = clamp(
      runtime.parameters[parameterId] +
        (target - runtime.parameters[parameterId]) * response,
      0,
      1,
    );
  }
}

function updateVolatilityRegime(runtime, dt) {
  const target = runtime.parameters.volatility;
  const halfLife =
    target > runtime.volatilityRegime
      ? cValCalibration.timing.volatilityRiseHalfLifeRealSeconds
      : cValCalibration.timing.volatilityFallHalfLifeRealSeconds;
  const response = 1 - Math.exp((-Math.log(2) * dt) / halfLife);
  runtime.volatilityRegime = clamp(
    runtime.volatilityRegime +
      (target - runtime.volatilityRegime) * response,
    0,
    1,
  );
}

function upperRegimeStress(regime) {
  return (
    clamp((regime - 0.5) * 2, 0, 1) **
    cValCalibration.scenario.informationStressExponent
  );
}

function regimeValue(range, neutral, regime) {
  if (regime <= 0.5) {
    return range[0] + (neutral - range[0]) * regime * 2;
  }
  return neutral + (range[1] - neutral) * upperRegimeStress(regime);
}

function updateFundamental(runtime, dt) {
  const marketDays =
    dt * cValCalibration.timing.marketDaysPerRealSecond;
  const regime = runtime.volatilityRegime;
  const dailyVolatility = regimeValue(
    cValCalibration.scenario.dailyInformationVolatilityRange,
    cValCalibration.scenario.dailyInformationVolatilityAtNeutral,
    regime,
  );
  const initial = cValCalibration.structural.initialPriceTicks;
  const currentLogDistance = Math.log(runtime.fundamentalTicks / initial);
  const meanReversion =
    (-Math.log(2) * currentLogDistance * marketDays) /
    cValCalibration.scenario.valueMeanReversionHalfLifeDays;
  const direction = cValConditionDirection(runtime.parameters);
  const randomShare = (1 - Math.abs(direction)) ** 2;
  const randomInnovation =
    sampleStudentT(
      runtime,
      cValCalibration.scenario.informationTailDegreesOfFreedom,
    ) *
    dailyVolatility *
    Math.sqrt(marketDays) *
    randomShare;
  const directionalScale = 0.035;
  const directionalInnovation =
    direction * directionalScale * Math.sqrt(marketDays);
  const innovation = randomInnovation + directionalInnovation;
  runtime.fundamentalTicks = boundedPriceTicks(
    runtime.fundamentalTicks * Math.exp(meanReversion + innovation),
  );
}

function nextMetaOrderSide(runtime) {
  if (runtime.metaOrder.remaining <= 0) {
    const beta = 1 + 2 * (1 - cValCalibration.empirical.orderSignHurst);
    runtime.metaOrder = {
      sign: nextRandom(runtime) < 0.5 ? -1 : 1,
      remaining: clamp(
        Math.ceil((1 - nextRandom(runtime)) ** (-1 / beta)),
        1,
        300,
      ),
    };
  }
  runtime.metaOrder.remaining -= 1;
  return runtime.metaOrder.sign > 0 ? "buy" : "sell";
}

function chooseParticipantType(runtime) {
  const providerShare = interpolateRange(
    cValCalibration.scenario.liquidityProviderShareRange,
    runtime.parameters.liquidity,
  );
  const draw = nextRandom(runtime);
  if (draw < providerShare) return "liquidity-provider";
  const residual = (draw - providerShare) / (1 - providerShare);
  if (residual < 0.34) return "fundamental";
  if (residual < 0.56) return "trend";
  return "noise";
}

function sideForParticipant(runtime, participant, bookState) {
  const conditionDirection = cValConditionDirection(runtime.parameters);
  if (participant.type === "liquidity-provider") {
    const bidDepth = bookState.book.bids
      .slice(0, 5)
      .reduce((sum, level) => sum + level.quantity, 0);
    const askDepth = bookState.book.asks
      .slice(0, 5)
      .reduce((sum, level) => sum + level.quantity, 0);
    const inventorySkew = clamp(
      (participant.inventory - 50_000) / 20_000,
      -0.35,
      0.35,
    );
    const buyProbability = clamp(
      askDepth / Math.max(bidDepth + askDepth, 1) - inventorySkew,
      0.12,
      0.88,
    );
    return nextRandom(runtime) < buyProbability ? "buy" : "sell";
  }
  if (participant.type === "fundamental") {
    const privateNoise = regimeValue(
      cValCalibration.scenario.privateValuationNoiseRange,
      cValCalibration.scenario.privateValuationNoiseAtNeutral,
      runtime.volatilityRegime,
    );
    participant.privateValueTicks = boundedPriceTicks(
      runtime.fundamentalTicks *
        Math.exp(sampleNormal(runtime) * privateNoise),
    );
    return participant.privateValueTicks >= bookState.midTicks
      ? "buy"
      : "sell";
  }
  if (participant.type === "trend") {
    const trendProbability = clamp(
      0.5 +
        0.28 * Math.tanh(runtime.momentumBps / 2.5) +
        0.42 * conditionDirection,
      0.04,
      0.96,
    );
    return nextRandom(runtime) < trendProbability ? "buy" : "sell";
  }
  if (Math.abs(conditionDirection) >= 0.025) {
    const buyProbability = clamp(
      0.5 + 0.46 * conditionDirection,
      0.04,
      0.96,
    );
    return nextRandom(runtime) < buyProbability ? "buy" : "sell";
  }
  return nextMetaOrderSide(runtime);
}

function executableQuantity(runtime, participant, side, desired, bookState) {
  const resting = bookOrders(runtime.book).filter(
    (order) => order.traderId === participant.id,
  );
  if (side === "sell") {
    const reservedInventory = resting
      .filter((order) => order.side === "sell")
      .reduce((total, order) => total + order.remaining, 0);
    return Math.max(
      0,
      Math.min(desired, participant.inventory - reservedInventory),
    );
  }
  const reservedCash = resting
    .filter((order) => order.side === "buy")
    .reduce(
      (total, order) =>
        total + priceFromTicks(order.priceTicks) * order.remaining,
      0,
    );
  const conservativeMarketPrice = priceFromTicks(
    bookState.bestAskTicks * 1.02,
  );
  return Math.max(
    0,
    Math.min(
      desired,
      Math.floor((participant.cash - reservedCash) / conservativeMarketPrice),
    ),
  );
}

function orderForParticipant(runtime, participant, now) {
  const bookState = deriveBookState(runtime);
  const side = sideForParticipant(runtime, participant, bookState);
  const typical = cValCalibration.empirical.typicalOrderQuantity;
  let quantity =
    participant.type === "liquidity-provider"
      ? Math.round(
          (interpolateRange(
            cValCalibration.scenario.providerOrderQuantityRange,
            runtime.parameters.liquidity,
          ) *
            (1 - 0.45 * runtime.volatilityRegime)) /
            typical,
        ) * typical
      : typical * (nextRandom(runtime) < 0.16 ? 2 : 1);
  quantity = executableQuantity(
    runtime,
    participant,
    side,
    quantity,
    bookState,
  );
  if (quantity < 1) return null;

  let kind = "limit";
  let priceTicks;
  if (participant.type === "liquidity-provider") {
    const informationWeight = clamp(
      0.12 +
        0.5 * effectiveActivity(runtime.parameters) +
        0.22 * (1 - runtime.parameters.liquidity),
      0.12,
      0.84,
    );
    const quoteCenter = Math.round(
      runtime.lastTradeTicks +
        (runtime.fundamentalTicks - runtime.lastTradeTicks) *
          informationWeight,
    );
    const halfSpreadRate =
      regimeValue(
        cValCalibration.scenario.providerHalfSpreadRateRange,
        cValCalibration.scenario.providerHalfSpreadRateAtNeutral,
        runtime.volatilityRegime,
      ) *
      (1.35 - runtime.parameters.liquidity);
    const offset = Math.max(
      1,
      Math.round(
        quoteCenter *
          halfSpreadRate *
          (0.75 + nextRandom(runtime) * 0.5),
      ),
    );
    priceTicks = boundedPriceTicks(
      quoteCenter + (side === "buy" ? -offset : offset),
    );
  } else if (participant.type === "fundamental") {
    priceTicks = Math.round(participant.privateValueTicks);
    const crosses =
      side === "buy"
        ? priceTicks >= bookState.bestAskTicks
        : priceTicks <= bookState.bestBidTicks;
    if (crosses) kind = "market";
  } else {
    const scale = interpolateAround(
      cValCalibration.scenario.placementScaleRange,
      cValCalibration.empirical.placementScaleLogPrice,
      runtime.volatilityRegime,
    );
    const trendAggression =
      participant.type === "trend"
        ? Math.min(Math.abs(runtime.momentumBps) / 10_000, 0.0025)
        : 0;
    const relativePrice = clamp(
      sampleStudentT(
        runtime,
        cValCalibration.empirical.placementDegreesOfFreedom,
      ) *
        scale +
        trendAggression,
      -0.014,
      0.014,
    );
    priceTicks =
      side === "buy"
        ? Math.round(bookState.bestBidTicks * Math.exp(relativePrice))
        : Math.round(bookState.bestAskTicks * Math.exp(-relativePrice));
    const crosses =
      side === "buy"
        ? priceTicks >= bookState.bestAskTicks
        : priceTicks <= bookState.bestBidTicks;
    if (crosses) kind = "market";
    const maximumDistance = Math.max(
      cValCalibration.safety.maximumPlacementTicks,
      Math.round(bookState.midTicks * 0.018),
    );
    priceTicks = boundedPriceTicks(
      clamp(
        priceTicks,
        Math.floor(bookState.midTicks - maximumDistance),
        Math.ceil(bookState.midTicks + maximumDistance),
      ),
    );
  }

  const oppositeTicks =
    side === "buy" ? bookState.bestAskTicks : bookState.bestBidTicks;
  return {
    id: `order-${++runtime.orderSequence}`,
    traderId: participant.id,
    participantType: participant.type,
    side,
    kind,
    priceTicks,
    quantity,
    submittedAt: now,
    initialDistanceTicks: Math.max(Math.abs(oppositeTicks - priceTicks), 1),
  };
}

function applyExecutions(runtime, executions) {
  for (const execution of executions) {
    const buyer = runtime.participants.find(
      ({ id }) => id === execution.buyerId,
    );
    const seller = runtime.participants.find(
      ({ id }) => id === execution.sellerId,
    );
    const value = priceFromTicks(execution.priceTicks) * execution.quantity;
    buyer.cash -= value;
    buyer.inventory += execution.quantity;
    seller.cash += value;
    seller.inventory -= execution.quantity;

    const priorTrade = runtime.lastTradeTicks;
    runtime.lastTradeTicks = execution.priceTicks;
    const tradeReturnBps =
      Math.log(runtime.lastTradeTicks / priorTrade) * 10_000;
    runtime.momentumBps =
      runtime.momentumBps * 0.82 + tradeReturnBps * 0.18;
    pushBounded(runtime.tradeWindow, execution, INTERNAL_TRADE_LIMIT);
    pushBounded(
      runtime.recentTrades,
      {
        id: execution.id,
        side: execution.takerSide,
        price: priceFromTicks(execution.priceTicks),
        quantity: execution.quantity,
        buyerId: execution.buyerId,
        sellerId: execution.sellerId,
        executedAt: execution.executedAt,
      },
      cValCalibration.safety.recentTradeLimit,
    );
    runtime.counters.executions += 1;
  }
}

function placeParticipantOrder(runtime, now, forcedType) {
  const type = forcedType ?? chooseParticipantType(runtime);
  const participant = randomParticipant(runtime, type);
  const input = orderForParticipant(runtime, participant, now);
  if (!input) return null;
  if (participant.type === "liquidity-provider") {
    const desiredQuoteCount = desiredProviderQuotesPerSide(runtime);
    const existingQuotes = bookOrders(runtime.book)
      .filter(
        (order) =>
          order.traderId === participant.id && order.side === input.side,
      )
      .sort((left, right) => left.sequence - right.sequence);
    for (const staleQuote of existingQuotes.slice(
      0,
      Math.max(existingQuotes.length - desiredQuoteCount + 1, 0),
    )) {
      if (cancelOrder(runtime.book, staleQuote.id)) {
        runtime.counters.cancelled += 1;
      }
    }
  }
  const result = submitOrder(runtime.book, input);
  applyExecutions(runtime, result.executions);
  runtime.counters.submitted += 1;
  pushBounded(
    runtime.flowWindow,
    { at: now, side: input.side, quantity: input.quantity },
    INTERNAL_FLOW_LIMIT,
  );
  pushBounded(
    runtime.recentOrders,
    {
      id: input.id,
      traderId: input.traderId,
      participantType: input.participantType,
      side: input.side,
      kind: input.kind,
      price: input.kind === "limit" ? priceFromTicks(input.priceTicks) : null,
      quantity: input.quantity,
      filled: input.quantity - result.order.remaining,
      status: result.status,
      submittedAt: now,
    },
    cValCalibration.safety.recentOrderLimit,
  );
  return result;
}

function desiredProviderQuotesPerSide(runtime) {
  return (
    1 +
    Math.floor(
      6 *
        runtime.parameters.liquidity *
        (1 - 0.65 * runtime.volatilityRegime),
    )
  );
}

function rebalanceProviderQuotes(runtime) {
  const desiredCount = desiredProviderQuotesPerSide(runtime);
  const center = deriveBookState(runtime).midTicks;
  const providerOrders = bookOrders(runtime.book).filter(
    (order) => order.participantType === "liquidity-provider",
  );
  const groups = new Map();
  for (const order of providerOrders) {
    const key = `${order.traderId}:${order.side}`;
    const group = groups.get(key) ?? [];
    group.push(order);
    groups.set(key, group);
  }

  for (const group of groups.values()) {
    group.sort(
      (left, right) =>
        Math.abs(right.priceTicks - center) -
          Math.abs(left.priceTicks - center) ||
        left.sequence - right.sequence,
    );
    for (const staleQuote of group.slice(
      0,
      Math.max(group.length - desiredCount, 0),
    )) {
      if (
        bookSideOrderCount(runtime.book, staleQuote.side) <=
        cValCalibration.safety.minimumOrdersPerSide
      ) {
        break;
      }
      if (cancelOrder(runtime.book, staleQuote.id)) {
        runtime.counters.cancelled += 1;
      }
    }
  }
}

function cancelOneOrder(runtime) {
  const orders = bookOrders(runtime.book);
  if (orders.length === 0) return;
  const order = orders[Math.floor(nextRandom(runtime) * orders.length)];
  const { bestBidTicks, bestAskTicks } = getBestQuotes(runtime.book);
  if (bestBidTicks === null || bestAskTicks === null) return;
  const sameSideCount = bookSideOrderCount(runtime.book, order.side);
  if (sameSideCount <= cValCalibration.safety.minimumOrdersPerSide) return;
  const total = orders.length;
  const imbalance = sameSideCount / total;
  const opposite = order.side === "buy" ? bestAskTicks : bestBidTicks;
  const currentDistance = Math.max(Math.abs(opposite - order.priceTicks), 1);
  const y = currentDistance / Math.max(order.initialDistanceTicks ?? currentDistance, 1);
  const empiricalProbability = clamp(
    cValCalibration.empirical.cancellationA *
      (1 - Math.exp(-y)) *
      (imbalance + cValCalibration.empirical.cancellationB),
    0,
    0.95,
  );
  const liquidityAdjustment = 1.3 - 0.65 * runtime.parameters.liquidity;
  const volatilityAdjustment = 0.8 + 0.65 * runtime.volatilityRegime;
  if (
    nextRandom(runtime) <
    empiricalProbability * liquidityAdjustment * volatilityAdjustment
  ) {
    const cancelled = cancelOrder(runtime.book, order.id);
    if (cancelled) runtime.counters.cancelled += 1;
  }
}

function enforceBookBounds(runtime) {
  const orders = bookOrders(runtime.book);
  const overflow =
    orders.length - cValCalibration.safety.maximumBookOrders;
  if (overflow <= 0) return;
  const center = deriveBookState(runtime).midTicks;
  orders
    .sort(
      (left, right) =>
        Math.abs(right.priceTicks - center) -
          Math.abs(left.priceTicks - center) ||
        left.sequence - right.sequence,
    )
    .slice(0, overflow)
    .forEach((order) => {
      if (cancelOrder(runtime.book, order.id)) {
        runtime.counters.cancelled += 1;
      }
    });
}

function runMarketEvents(runtime, now, dt) {
  const rate = interpolateRange(
    cValCalibration.scenario.orderArrivalRateRange,
    effectiveActivity(runtime.parameters),
  );
  const eventCount = Math.min(samplePoisson(runtime, rate * dt), 12);

  for (let index = 0; index < eventCount; index += 1) {
    placeParticipantOrder(runtime, now + index / Math.max(eventCount, 1));
    cancelOneOrder(runtime);
    const replenishment = interpolateRange(
      cValCalibration.scenario.providerReplenishmentRange,
      runtime.parameters.liquidity,
    );
    const providerRiskResponse =
      1 - 0.48 * runtime.volatilityRegime;
    if (
      nextRandom(runtime) <
      replenishment * providerRiskResponse * 0.34
    ) {
      placeParticipantOrder(runtime, now + index / Math.max(eventCount, 1), "liquidity-provider");
    }
  }
  enforceBookBounds(runtime);
}

function sampleHistory(runtime) {
  const currentIndex = runtime.market.index;
  runtime.market.returnPercent =
    runtime.lastHistoryIndex > 0
      ? ((currentIndex / runtime.lastHistoryIndex) - 1) * 100
      : 0;
  runtime.lastHistoryIndex = currentIndex;
  const limit = cValCalibration.safety.historyLength;
  pushBounded(runtime.history.index, currentIndex, limit);
  pushBounded(runtime.history.volatility, runtime.parameters.volatility, limit);
  pushBounded(runtime.history.activity, runtime.parameters.activity, limit);
  pushBounded(runtime.history.liquidity, runtime.parameters.liquidity, limit);
  pushBounded(runtime.history.returnPercent, runtime.market.returnPercent, limit);
  pushBounded(
    runtime.history.realizedVolatilityBps,
    runtime.market.realizedVolatilityBps,
    limit,
  );
  pushBounded(runtime.history.depth, runtime.market.depth, limit);
}

export function stepCValRuntime(runtime, now = Date.now(), dt = 0.05) {
  if (runtime.phase !== "active") {
    runtime.serverTime = now;
    return runtime;
  }
  const safeDt = clamp(dt, 0.001, 0.2);
  runtime.counters = { submitted: 0, cancelled: 0, executions: 0 };
  updateParameters(runtime, now, safeDt);
  updateVolatilityRegime(runtime, safeDt);
  rebalanceProviderQuotes(runtime);
  updateFundamental(runtime, safeDt);
  runMarketEvents(runtime, now, safeDt);
  updateMarket(runtime, now);
  runtime.revision += 1;
  runtime.serverTime = now;

  if (runtime.revision % cValCalibration.timing.historySampleEvery === 0) {
    sampleHistory(runtime);
  }
  return runtime;
}

function participantSummary(runtime) {
  return ["liquidity-provider", "fundamental", "trend", "noise"].map((type) => {
    const members = participantPool(runtime, type);
    const restingOrders = bookOrders(runtime.book).filter(
      (order) => order.participantType === type,
    ).length;
    return { type, count: members.length, restingOrders };
  });
}

export function snapshotCValRuntime(runtime) {
  return {
    version: cValVersion,
    runId: runtime.runId,
    phase: runtime.phase,
    activatedAt: runtime.activatedAt,
    revision: runtime.revision,
    serverTime: runtime.serverTime,
    calibration: {
      id: cValCalibration.id,
      referenceClass: cValCalibration.referenceClass,
    },
    parameters: compactRecord(runtime.parameters),
    orientation: { ...runtime.orientation },
    humanControl: compactRecord(runtime.humanControl),
    market: compactRecord(runtime.market),
    orderBook: {
      bids: runtime.visibleBook.bids.map((level) => ({
        price: priceFromTicks(level.priceTicks),
        quantity: level.quantity,
        orderCount: level.orderCount,
      })),
      asks: runtime.visibleBook.asks.map((level) => ({
        price: priceFromTicks(level.priceTicks),
        quantity: level.quantity,
        orderCount: level.orderCount,
      })),
    },
    participants: participantSummary(runtime),
    recentOrders: runtime.recentOrders.map((order) => ({ ...order })),
    recentTrades: runtime.recentTrades.map((trade) => ({ ...trade })),
    history: Object.fromEntries(
      Object.entries(runtime.history).map(([key, values]) => [
        key,
        values.map(compactNumber),
      ]),
    ),
  };
}

export const cValModelTiming = {
  broadcastIntervalMs: cValCalibration.timing.broadcastIntervalMs,
  historyLength: cValCalibration.safety.historyLength,
  historySampleEvery: cValCalibration.timing.historySampleEvery,
  signalHoldMs: SIGNAL_HOLD_MS,
  signalReleaseMs: SIGNAL_RELEASE_MS,
  orientationActivationThresholdDegrees:
    ORIENTATION_ACTIVATION_THRESHOLD_DEGREES,
};

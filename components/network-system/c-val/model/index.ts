export const cValParameterIds = [
  "volatility",
  "activity",
  "liquidity",
] as const;

export type CValParameterId = (typeof cValParameterIds)[number];
export type CValParameters = Record<CValParameterId, number>;

export type CValOrientation = {
  absolute: boolean;
  alpha: number;
  beta: number;
  gamma: number;
};

export type CValOrientationSignal = CValOrientation & {
  receivedAt: number;
};

export type CValMarketState = {
  index: number;
  openingPrice: number;
  changeFromOpenPercent: number;
  oneSecondMovePercent: number;
  oneSecondLow: number;
  oneSecondHigh: number;
  oneSecondRange: number;
  fundamental: number;
  bestBid: number;
  bestAsk: number;
  orderImbalance: number;
  returnPercent: number;
  turnover: number;
  spreadBps: number;
  depth: number;
  priceImpactBps: number;
  realizedVolatilityBps: number;
  volatilityRegime: number;
  submittedOrders: number;
  cancelledOrders: number;
  executions: number;
};

export type CValBookLevel = {
  price: number;
  quantity: number;
  orderCount: number;
};

export type CValOrder = {
  id: string;
  traderId: string;
  participantType: string;
  side: "buy" | "sell";
  kind: "limit" | "market";
  price: number | null;
  quantity: number;
  filled: number;
  status: "filled" | "partially-filled" | "unfilled" | "resting";
  submittedAt: number;
};

export type CValTrade = {
  id: string;
  side: "buy" | "sell";
  price: number;
  quantity: number;
  buyerId: string;
  sellerId: string;
  executedAt: number;
};

export type CValParticipantSummary = {
  type: string;
  count: number;
  restingOrders: number;
};

export type CValHistory = {
  index: number[];
  volatility: number[];
  activity: number[];
  liquidity: number[];
  returnPercent: number[];
  realizedVolatilityBps: number[];
  depth: number[];
};

export type CValSnapshot = {
  runId: string;
  revision: number;
  serverTime: number;
  calibration: {
    id: string;
    referenceClass: string;
  };
  parameters: CValParameters;
  orientation: CValOrientationSignal;
  market: CValMarketState;
  orderBook: {
    bids: CValBookLevel[];
    asks: CValBookLevel[];
  };
  participants: CValParticipantSummary[];
  recentOrders: CValOrder[];
  recentTrades: CValTrade[];
  history: CValHistory;
};

export const cValNeutralParameters: CValParameters = {
  volatility: 0.5,
  activity: 0.5,
  liquidity: 0.5,
};

export const cValInitialMarket: CValMarketState = {
  index: 100,
  openingPrice: 100,
  changeFromOpenPercent: 0,
  oneSecondMovePercent: 0,
  oneSecondLow: 100,
  oneSecondHigh: 100,
  oneSecondRange: 0,
  fundamental: 100,
  bestBid: 99.99,
  bestAsk: 100.01,
  orderImbalance: 0,
  returnPercent: 0,
  turnover: 0,
  spreadBps: 2,
  depth: 12_000,
  priceImpactBps: 0,
  realizedVolatilityBps: 0,
  volatilityRegime: 0.5,
  submittedOrders: 0,
  cancelledOrders: 0,
  executions: 0,
};

export const cValParameterLabels: Record<CValParameterId, string> = {
  volatility: "VOLATILITY",
  activity: "ACTIVITY",
  liquidity: "LIQUIDITY",
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function orientationToCValParameters(
  orientation: Pick<CValOrientation, "alpha" | "beta" | "gamma">,
): CValParameters {
  return {
    volatility: clamp(0.5 + 0.5 * (orientation.alpha / 90), 0, 1),
    activity: clamp(0.5 + 0.5 * (orientation.beta / 90), 0, 1),
    liquidity: clamp(0.5 + 0.5 * (orientation.gamma / 45), 0, 1),
  };
}

export function createInitialCValSnapshot(): CValSnapshot {
  const historyLength = 120;
  const emptyBook = Array.from({ length: 9 }, (_, index) => ({
    price: 100,
    quantity: Math.max(100, 900 - index * 80),
    orderCount: 1,
  }));
  return {
    runId: "local-initial",
    revision: 0,
    serverTime: 0,
    calibration: {
      id: "liquid-small-tick-equity-v1",
      referenceClass: "liquid small-tick electronic equity",
    },
    parameters: { ...cValNeutralParameters },
    orientation: {
      absolute: false,
      alpha: 0,
      beta: 0,
      gamma: 0,
      receivedAt: 0,
    },
    market: { ...cValInitialMarket },
    orderBook: {
      bids: emptyBook.map((level, index) => ({
        ...level,
        price: 99.99 - index * 0.01,
      })),
      asks: emptyBook.map((level, index) => ({
        ...level,
        price: 100.01 + index * 0.01,
      })),
    },
    participants: [
      { type: "liquidity-provider", count: 12, restingOrders: 0 },
      { type: "fundamental", count: 12, restingOrders: 0 },
      { type: "trend", count: 8, restingOrders: 0 },
      { type: "noise", count: 24, restingOrders: 0 },
    ],
    recentOrders: [],
    recentTrades: [],
    history: {
      index: Array.from({ length: historyLength }, () => 100),
      volatility: Array.from(
        { length: historyLength },
        () => cValNeutralParameters.volatility,
      ),
      activity: Array.from(
        { length: historyLength },
        () => cValNeutralParameters.activity,
      ),
      liquidity: Array.from(
        { length: historyLength },
        () => cValNeutralParameters.liquidity,
      ),
      returnPercent: Array.from({ length: historyLength }, () => 0),
      realizedVolatilityBps: Array.from(
        { length: historyLength },
        () => 0,
      ),
      depth: Array.from({ length: historyLength }, () => 12_000),
    },
  };
}

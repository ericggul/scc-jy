import {
  checkpointOrientationToParameters as mapCheckpointOrientationToParameters,
  cValOneOrientationToParameters as mapCValOneOrientationToParameters,
  orientationToCValParameters as mapOrientationToCValParameters,
  rotationRateToCValControl as mapRotationRateToCValControl,
} from "@/socket/experiments/c-val/2/orientation.mjs";

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

export type CValSensorVector = {
  x: number | null;
  y: number | null;
  z: number | null;
};

export type CValRotationRate = {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
};

export type CValRecordedOrientationEvent = CValOrientation & {
  id: string;
  tMs: number;
};

export type CValRecordedMotionEvent = {
  id: string;
  tMs: number;
  intervalMs: number | null;
  acceleration: CValSensorVector;
  accelerationIncludingGravity: CValSensorVector;
  rotationRate: CValRotationRate;
};

export type CValSensorTrace = {
  schemaVersion: 2;
  kind: "browser-device-motion-orientation";
  profile: string;
  provenance: {
    type: "recorded";
    recordedAt: string;
  };
  durationMs: number;
  orientationEvents: CValRecordedOrientationEvent[];
  motionEvents: CValRecordedMotionEvent[];
};

export type CValRecordingCommand =
  | { action: "start"; durationMs: number }
  | { action: "stop" };

export type CValRecordingStatus = {
  status: "started" | "saving" | "saved" | "error";
  message: string;
  mobileId?: string;
};

export type CValHumanControlInput = CValParameters & {
  engaged: boolean;
  sampledAt: number;
};

export type CValRotationControl = {
  parameters: CValParameters;
  engaged: boolean;
  energyDegreesPerSecond: number;
  signedRotationDegreesPerSecond: number;
};

export type CValInputMappingId = "c-val-1" | "07a5aaf" | "current";

export type CValHumanControlState = CValParameters & {
  engaged: boolean;
  contributors: number;
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
  version: "2";
  runId: string;
  phase: "waiting" | "active";
  activatedAt: number | null;
  revision: number;
  serverTime: number;
  calibration: {
    id: string;
    referenceClass: string;
  };
  parameters: CValParameters;
  orientation: CValOrientationSignal;
  humanControl: CValHumanControlState;
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
  bestBid: 100,
  bestAsk: 100,
  orderImbalance: 0,
  returnPercent: 0,
  turnover: 0,
  spreadBps: 0,
  depth: 0,
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

export function orientationToCValParameters(
  orientation: Pick<CValOrientation, "alpha" | "beta" | "gamma">,
): CValParameters {
  return mapOrientationToCValParameters(orientation);
}

export function cValOneOrientationToParameters(
  orientation: Pick<CValOrientation, "alpha" | "beta" | "gamma">,
): CValParameters {
  return mapCValOneOrientationToParameters(orientation);
}

export function checkpointOrientationToParameters(
  orientation: Pick<CValOrientation, "alpha" | "beta" | "gamma">,
): CValParameters {
  return mapCheckpointOrientationToParameters(orientation);
}

export function rotationRateToCValControl(
  rotationRate: CValRotationRate,
): CValRotationControl {
  return mapRotationRateToCValControl(rotationRate);
}

export function createInitialCValSnapshot(): CValSnapshot {
  const historyLength = 120;
  return {
    version: "2",
    runId: "local-initial",
    phase: "waiting",
    activatedAt: null,
    revision: 0,
    serverTime: 0,
    calibration: {
      id: "c-val-2-compressed-market-day-double-auction",
      referenceClass: "compressed market-day continuous double auction",
    },
    parameters: { ...cValNeutralParameters },
    orientation: {
      absolute: false,
      alpha: 0,
      beta: 0,
      gamma: 0,
      receivedAt: 0,
    },
    humanControl: {
      ...cValNeutralParameters,
      engaged: false,
      contributors: 0,
      receivedAt: 0,
    },
    market: { ...cValInitialMarket },
    orderBook: { bids: [], asks: [] },
    participants: [
      { type: "liquidity-provider", count: 0, restingOrders: 0 },
      { type: "fundamental", count: 0, restingOrders: 0 },
      { type: "trend", count: 0, restingOrders: 0 },
      { type: "noise", count: 0, restingOrders: 0 },
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
      depth: Array.from({ length: historyLength }, () => 0),
    },
  };
}

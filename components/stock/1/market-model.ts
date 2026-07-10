import type {
  LiveStockStreams,
  PricePoint,
  StockRow,
  TimeRange,
} from "../default/dashboard";
import type { OrientationFactors, StockOrientationSignal } from "./types";

export type StockCalibration = {
  alpha: number;
  beta: number;
  gamma: number;
  inertia: number;
  meanReversion: number;
  signalGain: number;
  volatility: number;
};

export const stockResponseSettings = {
  domainContractionResponse: 0.055,
  domainExpansionResponse: 0.38,
  domainPadding: 0.16,
  factorResponse: 0.5,
  maximumStepVolatility: 10,
  riskShockMultiplier: 0.55,
  signalMultiplier: 4.2,
  stochasticBase: 0.25,
} as const;

export const stockCalibrations: Record<string, StockCalibration> = {
  aapl: { alpha: 0.2, beta: 0.9, gamma: 0.1, inertia: 0.2, meanReversion: 0.04, signalGain: 0.0042, volatility: 0.002 },
  nvda: { alpha: 0.9, beta: 1.25, gamma: 0.7, inertia: 0.28, meanReversion: 0.025, signalGain: 0.0055, volatility: 0.0038 },
  msft: { alpha: 0.1, beta: 0.8, gamma: -0.2, inertia: 0.22, meanReversion: 0.05, signalGain: 0.0038, volatility: 0.0018 },
  tsla: { alpha: 0.7, beta: 1.4, gamma: 1, inertia: 0.32, meanReversion: 0.02, signalGain: 0.0062, volatility: 0.0046 },
  jpm: { alpha: -0.9, beta: 0.65, gamma: -1, inertia: 0.18, meanReversion: 0.06, signalGain: 0.0048, volatility: 0.0022 },
  amzn: { alpha: 0.3, beta: 1, gamma: 0.4, inertia: 0.24, meanReversion: 0.04, signalGain: 0.0047, volatility: 0.0026 },
  googl: { alpha: 0.2, beta: 0.9, gamma: 0.2, inertia: 0.22, meanReversion: 0.045, signalGain: 0.0044, volatility: 0.0023 },
  meta: { alpha: 0.5, beta: 1.15, gamma: 0.6, inertia: 0.27, meanReversion: 0.03, signalGain: 0.0052, volatility: 0.0034 },
  avgo: { alpha: 0.8, beta: 1.25, gamma: 0.5, inertia: 0.26, meanReversion: 0.03, signalGain: 0.0053, volatility: 0.0032 },
  amd: { alpha: 1, beta: 1.35, gamma: 0.8, inertia: 0.3, meanReversion: 0.022, signalGain: 0.0059, volatility: 0.0042 },
};

const neutralFactors: OrientationFactors = {
  alpha: 0,
  beta: 0,
  energy: 0,
  gamma: 0,
  momentum: 0,
  risk: 0,
  rotation: 0,
};

type InternalStockStream = {
  anchor: number;
  calibration: StockCalibration;
  domainMaximum: number;
  domainMinimum: number;
  lastReturn: number;
  offset: number;
  points: PricePoint[];
  randomState: number;
  visibleLength: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(value, maximum));
}

function withDeadZone(value: number, threshold = 0.01) {
  const magnitude = Math.abs(value);
  if (magnitude <= threshold) return 0;
  return Math.sign(value) * ((magnitude - threshold) / (1 - threshold));
}

function hash(value: string) {
  let seed = 2166136261;
  for (const character of value) {
    seed ^= character.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

function nextRandom(stream: InternalStockStream) {
  stream.randomState =
    (Math.imul(stream.randomState || 1, 1664525) + 1013904223) >>> 0;
  return stream.randomState / 4294967296;
}

function gaussianShock(stream: InternalStockStream) {
  return (
    nextRandom(stream) +
    nextRandom(stream) +
    nextRandom(stream) +
    nextRandom(stream) +
    nextRandom(stream) +
    nextRandom(stream) -
    3
  ) * Math.SQRT2;
}

export function orientationToFactors(
  signal: StockOrientationSignal | null,
): OrientationFactors {
  if (!signal) return neutralFactors;

  const alpha = withDeadZone(clamp(signal.alpha / 24, -1, 1));
  const beta = withDeadZone(clamp(signal.beta / 12, -1, 1));
  const gamma = withDeadZone(clamp(signal.gamma / 12, -1, 1));
  const energy = clamp(Math.hypot(beta, gamma) / Math.SQRT2, 0, 1);

  return {
    alpha,
    beta,
    energy,
    gamma,
    momentum: beta,
    risk: clamp(Math.abs(gamma) * 0.72 + energy * 0.28, 0, 1),
    rotation: alpha,
  };
}

export function interpolateFactors(
  current: OrientationFactors,
  target: OrientationFactors,
  response = stockResponseSettings.factorResponse,
): OrientationFactors {
  return {
    alpha: current.alpha + (target.alpha - current.alpha) * response,
    beta: current.beta + (target.beta - current.beta) * response,
    energy: current.energy + (target.energy - current.energy) * response,
    gamma: current.gamma + (target.gamma - current.gamma) * response,
    momentum: current.momentum + (target.momentum - current.momentum) * response,
    risk: current.risk + (target.risk - current.risk) * response,
    rotation: current.rotation + (target.rotation - current.rotation) * response,
  };
}

export function createInitialStockStreams(
  rows: StockRow[],
  range: TimeRange,
  getSeries: (stock: StockRow, range: TimeRange) => PricePoint[],
) {
  return Object.fromEntries(
    rows.map((stock) => {
      const baseSeries = getSeries(stock, range);
      const endpointOffset =
        range === "1D" ? Number(stock.price) - baseSeries.at(-1)!.value : 0;
      const points = baseSeries.map((point) => ({
        ...point,
        value: point.value + endpointOffset,
      }));
      const values = points.map((point) => point.value);
      const calibration = stockCalibrations[stock.id];
      const anchor = points.at(-1)!.value;
      const observedMinimum = Math.min(...values);
      const observedMaximum = Math.max(...values);
      const observedSpread = observedMaximum - observedMinimum || anchor * 0.02;
      const domainPadding = Math.max(
        observedSpread * stockResponseSettings.domainPadding,
        anchor * 0.006,
      );
      return [
        stock.id,
        {
          anchor,
          calibration,
          domainMaximum: observedMaximum + domainPadding,
          domainMinimum: Math.max(0.01, observedMinimum - domainPadding),
          lastReturn: 0,
          offset: 0,
          points,
          randomState: hash(`${stock.id}-${range}-live`),
          visibleLength: points.length,
        } satisfies InternalStockStream,
      ];
    }),
  ) as Record<string, InternalStockStream>;
}

function appendPoint(
  stockId: string,
  stream: InternalStockStream,
  factors: OrientationFactors,
  sequence: number,
) {
  const previousValue = stream.points.at(-1)!.value;
  const calibration = stream.calibration;
  const orientationSignal =
    factors.beta * calibration.beta +
    factors.alpha * calibration.alpha * 0.72 +
    factors.gamma * calibration.gamma * 0.82;
  const systematicMove =
    orientationSignal * calibration.signalGain * stockResponseSettings.signalMultiplier;
  const stochasticMove =
    gaussianShock(stream) *
    calibration.volatility *
    (stockResponseSettings.stochasticBase +
      factors.risk * stockResponseSettings.riskShockMultiplier);
  const reversion =
    ((stream.anchor - previousValue) / stream.anchor) * calibration.meanReversion;
  const nextReturn = clamp(
    stream.lastReturn * calibration.inertia + systematicMove + stochasticMove + reversion,
    -calibration.volatility * stockResponseSettings.maximumStepVolatility,
    calibration.volatility * stockResponseSettings.maximumStepVolatility,
  );
  const proposedValue = previousValue * Math.exp(nextReturn);
  const nextValue = clamp(
    proposedValue,
    stream.anchor * 0.05,
    stream.anchor * 20,
  );

  stream.lastReturn = Math.log(nextValue / previousValue);
  stream.points = [
    ...stream.points,
    {
      id: `${stockId}-live-${sequence}`,
      time: `Live ${sequence}`,
      value: nextValue,
    },
  ];
}

function updateDisplayDomain(
  stream: InternalStockStream,
  elapsedMilliseconds: number,
) {
  const startIndex = Math.floor(stream.offset);
  const endIndex = Math.min(
    Math.ceil(stream.offset) + stream.visibleLength,
    stream.points.length,
  );
  const visibleValues = stream.points
    .slice(startIndex, endIndex)
    .map((point) => point.value);
  const visibleMinimum = Math.min(...visibleValues);
  const visibleMaximum = Math.max(...visibleValues);
  const visibleSpread = visibleMaximum - visibleMinimum || stream.anchor * 0.01;
  const padding = Math.max(
    visibleSpread * stockResponseSettings.domainPadding,
    stream.anchor * 0.006,
  );
  const targetMinimum = visibleMinimum - padding;
  const targetMaximum = visibleMaximum + padding;
  const minimumBaseResponse =
    targetMinimum < stream.domainMinimum
      ? stockResponseSettings.domainExpansionResponse
      : stockResponseSettings.domainContractionResponse;
  const maximumBaseResponse =
    targetMaximum > stream.domainMaximum
      ? stockResponseSettings.domainExpansionResponse
      : stockResponseSettings.domainContractionResponse;
  const frameScale = Math.max(elapsedMilliseconds / (1000 / 60), 0.1);
  const minimumResponse = 1 - (1 - minimumBaseResponse) ** frameScale;
  const maximumResponse = 1 - (1 - maximumBaseResponse) ** frameScale;

  stream.domainMinimum +=
    (targetMinimum - stream.domainMinimum) * minimumResponse;
  stream.domainMaximum +=
    (targetMaximum - stream.domainMaximum) * maximumResponse;
  stream.domainMinimum = Math.min(
    stream.domainMinimum,
    visibleMinimum - padding * 0.08,
  );
  stream.domainMaximum = Math.max(
    stream.domainMaximum,
    visibleMaximum + padding * 0.08,
  );
}

export function advanceStockStreams(
  streams: Record<string, InternalStockStream>,
  factors: OrientationFactors,
  elapsedMilliseconds: number,
  sequence: number,
): LiveStockStreams {
  for (const [stockId, stream] of Object.entries(streams)) {
    stream.offset += (elapsedMilliseconds * stream.visibleLength * 4) / 6500;

    while (
      stream.points.length - stream.visibleLength <
      Math.ceil(stream.offset) + 3
    ) {
      appendPoint(stockId, stream, factors, sequence + stream.points.length);
    }

    updateDisplayDomain(stream, elapsedMilliseconds);
  }

  return Object.fromEntries(
    Object.entries(streams).map(([stockId, stream]) => [
      stockId,
      {
        domainMaximum: stream.domainMaximum,
        domainMinimum: stream.domainMinimum,
        offset: stream.offset,
        series: stream.points,
      },
    ]),
  );
}

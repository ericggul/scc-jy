import {
  cycleNewsHeadlineFor,
  type CycleNewsRegime,
} from "@/components/network-system/cycle/news/headlines";
import {
  cycleNodeIds,
  type CycleNodeId,
  type CycleSnapshot,
} from "@/components/network-system/cycle/model";

export type CycleNewsSignal = {
  id: CycleNodeId;
  headline: string;
  signature: string;
  intensity: number;
  percent: number;
  regime: CycleNewsRegime;
};

export type CycleNewsDigest = {
  activity: number;
  signals: CycleNewsSignal[];
};

const MOMENTUM_WINDOW = 6;
const QUIET_PERCENT = 0.35;
const SURGE_PERCENT = 8;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function finite(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function percentageChange(
  snapshot: CycleSnapshot,
  nodeId: CycleNodeId,
) {
  if (nodeId === "production") return finite(snapshot.gdpGrowth);

  const history = snapshot.history[nodeId];
  const earlier = finite(
    history.at(-MOMENTUM_WINDOW) ?? history[0] ?? snapshot.values[nodeId],
  );
  const current = finite(snapshot.values[nodeId]);
  const change = clamp(current - earlier, -1.6, 1.6);
  return clamp(100 * (Math.exp(change * 0.75) - 1), -99.9, 99.9);
}

function regimeForPercent(percent: number): CycleNewsRegime {
  if (percent >= SURGE_PERCENT) return "surging";
  if (percent >= QUIET_PERCENT) return "rising";
  if (percent <= -SURGE_PERCENT) return "plunging";
  if (percent <= -QUIET_PERCENT) return "falling";
  return "steady";
}

function formatPercent(percent: number) {
  const magnitude = Math.abs(percent);
  return magnitude.toFixed(magnitude < 1 ? 2 : 1);
}

function hash(value: string) {
  let output = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    output ^= value.charCodeAt(index);
    output = Math.imul(output, 16777619);
  }
  return output >>> 0;
}

function presentSignal(
  snapshot: CycleSnapshot,
  nodeId: CycleNodeId,
): CycleNewsSignal {
  const percent = percentageChange(snapshot, nodeId);
  const regime = regimeForPercent(percent);
  const selection = hash(
    `${snapshot.runId}:${snapshot.revision}:${nodeId}:${regime}:${Math.round(percent * 10)}`,
  );

  return {
    id: nodeId,
    headline: cycleNewsHeadlineFor(
      nodeId,
      regime,
      selection,
      formatPercent(percent),
    ),
    signature: `${nodeId}:${regime}`,
    intensity: clamp(Math.abs(percent) / 12, 0, 1),
    percent,
    regime,
  };
}

export function presentCycleNewsDigest(snapshot: CycleSnapshot): CycleNewsDigest {
  const signals = cycleNodeIds.map((nodeId) => presentSignal(snapshot, nodeId));
  const activity =
    signals.reduce((total, current) => total + current.intensity, 0) /
    signals.length;

  return { activity, signals };
}

export function changedCycleNewsSignals(
  previous: CycleNewsDigest,
  next: CycleNewsDigest,
) {
  const previousSignatures = new Map(
    previous.signals.map((current) => [current.id, current.signature]),
  );

  return next.signals
    .filter(
      (current) => previousSignatures.get(current.id) !== current.signature,
    )
    .sort((left, right) => right.intensity - left.intensity);
}

export function cycleNewsCadence(activity: number) {
  return Math.round(3000 - clamp(finite(activity), 0, 1) * 2520);
}

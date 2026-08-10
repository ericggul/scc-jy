import type { CValSnapshot } from "@/components/c-val/2/model";
import {
  selectCValNewsHeadline,
  type CValNewsHeadlineFamily,
} from "./headlines";

export type CValNewsEvent = {
  id: string;
  templateId: string;
  headline: string;
  code: "MKT" | "BIZ" | "MACRO" | "HH" | "LAB" | "POL";
  change: number;
  oneDayMove: number;
  priority: number;
  occurredAt: number;
};

type MarketDirection = "up" | "down" | "flat";

const NEWS_CADENCE_ANCHORS = [
  { movePercent: 0, intervalMs: 1_000 },
  { movePercent: 1, intervalMs: 600 },
  { movePercent: 10, intervalMs: 150 },
  { movePercent: 20, intervalMs: 50 },
  { movePercent: 30, intervalMs: 20 },
] as const;

/**
 * One second is one C-VAL market day. News stays deliberately slower than the
 * matching engine: quiet markets wait, a ±1% move admits at most one story
 * every 600 ms. A large 10% move is still readable at 150 ms; only a 30%
 * market-day extreme reaches the 20 ms floor. The anchor intervals are
 * interpolated in log space, never with piecewise-linear speed steps.
 */
export function cValNewsAdmissionIntervalMs(oneSecondMovePercent: number) {
  const highestAnchor = NEWS_CADENCE_ANCHORS.at(-1)!;
  const magnitude = Math.min(
    Math.abs(Number.isFinite(oneSecondMovePercent) ? oneSecondMovePercent : 0),
    highestAnchor.movePercent,
  );
  const upperIndex = Math.max(
    1,
    NEWS_CADENCE_ANCHORS.findIndex((anchor) => magnitude <= anchor.movePercent),
  );
  const lower = NEWS_CADENCE_ANCHORS[upperIndex - 1];
  const upper = NEWS_CADENCE_ANCHORS[upperIndex];
  const progress =
    (Math.log1p(magnitude) - Math.log1p(lower.movePercent))
    / (Math.log1p(upper.movePercent) - Math.log1p(lower.movePercent));

  return Math.round(
    Math.exp(
      Math.log(lower.intervalMs)
      + (Math.log(upper.intervalMs) - Math.log(lower.intervalMs)) * progress,
    ),
  );
}

function directionFor(change: number): MarketDirection {
  if (change > 0.005) return "up";
  if (change < -0.005) return "down";
  return "flat";
}

function changeBucket(value: number, size: number) {
  return Math.trunc(value / size);
}

function flowBand(value: number) {
  if (value <= -0.3) return -2;
  if (value < -0.08) return -1;
  if (value >= 0.3) return 2;
  if (value > 0.08) return 1;
  return 0;
}

function headlineContext(snapshot: CValSnapshot) {
  return {
    price: snapshot.market.index,
    dayMove: snapshot.market.oneSecondMovePercent,
    openMove: snapshot.market.changeFromOpenPercent,
    dayHigh: snapshot.market.oneSecondHigh,
    dayLow: snapshot.market.oneSecondLow,
  };
}

function headlineEvent({
  id,
  key,
  families,
  code,
  change,
  priority,
  snapshot,
  excludedTemplateIds,
}: {
  id: string;
  key: string;
  families: readonly CValNewsHeadlineFamily[];
  code: CValNewsEvent["code"];
  change: number;
  priority: number;
  snapshot: CValSnapshot;
  excludedTemplateIds: Set<string>;
}): CValNewsEvent {
  const selected = selectCValNewsHeadline({
    families,
    key,
    excludedTemplateIds,
    context: headlineContext(snapshot),
  });
  excludedTemplateIds.add(selected.templateId);

  return {
    id,
    templateId: selected.templateId,
    headline: selected.headline,
    code,
    change,
    oneDayMove: snapshot.market.oneSecondMovePercent,
    priority,
    occurredAt: snapshot.serverTime,
  };
}

function marketStory(
  previous: CValSnapshot | null,
  snapshot: CValSnapshot,
  excludedTemplateIds: Set<string>,
): CValNewsEvent | null {
  const change = snapshot.market.changeFromOpenPercent;
  const bucket = changeBucket(change, 0.15);
  const priorBucket = previous == null
    ? null
    : changeBucket(previous.market.changeFromOpenPercent, 0.15);
  if (previous && bucket === priorBucket) return null;
  if (previous == null && Math.abs(change) < 0.15) return null;

  const direction = directionFor(change);
  const families: CValNewsHeadlineFamily[] = direction === "up"
    ? ["market-up", "market-up-momentum", "stock-up"]
    : direction === "down"
      ? ["market-down", "market-down-momentum", "stock-down"]
      : ["reversal"];

  return headlineEvent({
    id: `market:${snapshot.revision}:${bucket}`,
    key: `market:${direction}:${bucket}:${snapshot.revision}`,
    families,
    code: "MKT",
    change,
    priority: Math.abs(change) * 100 + Math.abs(bucket - (priorBucket ?? 0)) * 4,
    snapshot,
    excludedTemplateIds,
  });
}

function flowStory(
  previous: CValSnapshot | null,
  snapshot: CValSnapshot,
  excludedTemplateIds: Set<string>,
): CValNewsEvent | null {
  const band = flowBand(snapshot.market.orderImbalance);
  const priorBand = previous == null ? null : flowBand(previous.market.orderImbalance);
  if (previous && band === priorBand) return null;
  if (previous == null && band === 0) return null;

  const change = snapshot.market.changeFromOpenPercent;
  return headlineEvent({
    id: `flow:${snapshot.revision}:${band}`,
    key: `flow:${band}:${snapshot.revision}`,
    families: band >= 0 ? ["retail-buy"] : ["retail-sell"],
    code: "MKT",
    change,
    priority: Math.abs(snapshot.market.orderImbalance) * 130
      + Math.abs(band - (priorBand ?? 0)) * 8,
    snapshot,
    excludedTemplateIds,
  });
}

function liquidityStory(
  previous: CValSnapshot | null,
  snapshot: CValSnapshot,
  excludedTemplateIds: Set<string>,
): CValNewsEvent | null {
  const bucket = changeBucket(snapshot.market.spreadBps, 2);
  const priorBucket = previous == null ? null : changeBucket(previous.market.spreadBps, 2);
  if (previous && bucket === priorBucket) return null;
  if (previous == null && bucket === 0) return null;

  return headlineEvent({
    id: `liquidity:${snapshot.revision}:${bucket}`,
    key: `liquidity:${bucket}:${snapshot.revision}`,
    families: ["policy"],
    code: "POL",
    change: snapshot.market.changeFromOpenPercent,
    priority: Math.abs(snapshot.market.spreadBps - (previous?.market.spreadBps ?? 0)) * 4
      + Math.abs(bucket - (priorBucket ?? 0)) * 6,
    snapshot,
    excludedTemplateIds,
  });
}

function reversalStory(
  previous: CValSnapshot | null,
  snapshot: CValSnapshot,
  excludedTemplateIds: Set<string>,
): CValNewsEvent | null {
  if (previous == null) return null;
  const currentMove = snapshot.market.oneSecondMovePercent;
  const previousMove = previous.market.oneSecondMovePercent;
  if (
    Math.abs(currentMove) < 0.2
    || Math.abs(previousMove) < 0.2
    || Math.sign(currentMove) === Math.sign(previousMove)
  ) return null;

  return headlineEvent({
    id: `reversal:${snapshot.revision}`,
    key: `reversal:${snapshot.revision}:${currentMove.toFixed(2)}`,
    families: ["reversal"],
    code: "MKT",
    change: snapshot.market.changeFromOpenPercent,
    priority: Math.abs(currentMove - previousMove) * 150,
    snapshot,
    excludedTemplateIds,
  });
}

function transmissionStory(
  market: CValNewsEvent | null,
  snapshot: CValSnapshot,
  excludedTemplateIds: Set<string>,
): CValNewsEvent | null {
  if (!market || Math.abs(market.change) < 0.6) return null;

  const direction = directionFor(market.change);
  const liquidityStress = snapshot.market.spreadBps >= 4 || snapshot.parameters.liquidity < 0.4;
  const activeMarket = snapshot.parameters.activity >= 0.62;
  const frame = liquidityStress
    ? { code: "POL" as const, families: ["policy"] as const }
    : activeMarket && direction === "up"
      ? { code: "BIZ" as const, families: ["corporate"] as const }
      : direction === "up"
        ? { code: "HH" as const, families: ["household"] as const }
        : { code: "MACRO" as const, families: ["macro"] as const };

  return headlineEvent({
    id: `transmission:${market.id}`,
    key: `transmission:${frame.code}:${snapshot.revision}`,
    families: frame.families,
    code: frame.code,
    change: market.change,
    priority: market.priority * 0.72,
    snapshot,
    excludedTemplateIds,
  });
}

/**
 * Every candidate begins with a real C-VAL state transition. The 130-template
 * catalog supplies distinct editorial grammar; priority only orders events
 * observed in the same snapshot and never establishes a fixed topic ranking.
 */
export function presentCValNewsEvents(
  previous: CValSnapshot | null,
  snapshot: CValSnapshot,
  visibleTemplateIds: ReadonlySet<string> = new Set(),
) {
  const reservedTemplateIds = new Set(visibleTemplateIds);
  const market = marketStory(previous, snapshot, reservedTemplateIds);
  const flow = flowStory(previous, snapshot, reservedTemplateIds);
  const liquidity = liquidityStory(previous, snapshot, reservedTemplateIds);
  const reversal = reversalStory(previous, snapshot, reservedTemplateIds);
  const transmission = transmissionStory(market, snapshot, reservedTemplateIds);

  return [market, flow, liquidity, reversal, transmission]
    .filter((event): event is CValNewsEvent => event != null)
    .sort((left, right) => right.priority - left.priority || right.occurredAt - left.occurredAt);
}

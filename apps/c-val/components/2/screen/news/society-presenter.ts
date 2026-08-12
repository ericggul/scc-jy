import type { CValSnapshot } from "@/components/2/model";
import type { CValNewsEvent } from "./presenter";
import {
  selectCValSocietyHeadline,
  type CValSocietyHeadlineContext,
  type CValSocietyRegime,
} from "./society-headlines";

const REGIME_TOPICS = [
  "party-politics",
  "approval-politics",
  "labor",
  "dividend-welfare",
  "housing",
  "education",
  "mental-health",
  "consumption",
  "food-table",
  "small-business",
  "employment",
  "generation",
  "regional",
  "media-nationalism",
  "ceo-culture",
  "household-debt",
  "social-safety",
  "culture-leisure",
] as const;

const PRICE_TOPICS = [
  "party-politics",
  "approval-politics",
  "dividend-welfare",
  "housing",
  "consumption",
  "generation",
  "household-debt",
] as const;

const FLOW_TOPICS = [
  "labor",
  "employment",
  "media-nationalism",
  "ceo-culture",
  "food-table",
] as const;

const LIQUIDITY_TOPICS = [
  "housing",
  "small-business",
  "mental-health",
  "social-safety",
  "regional",
] as const;

function finite(value: number | undefined, fallback = 0) {
  return Number.isFinite(value) ? (value as number) : fallback;
}

function bucket(value: number, size: number) {
  return Math.trunc(finite(value) / size);
}

function flowBand(value: number) {
  if (value <= -0.3) return -2;
  if (value < -0.08) return -1;
  if (value >= 0.3) return 2;
  if (value > 0.08) return 1;
  return 0;
}

function headlineContext(snapshot: CValSnapshot): CValSocietyHeadlineContext {
  return {
    price: finite(snapshot.market.index, 100),
    dayMove: finite(snapshot.market.oneSecondMovePercent),
    openMove: finite(snapshot.market.changeFromOpenPercent),
    spreadBps: finite(snapshot.market.spreadBps),
  };
}

export function cValSocietyRegimeFor(
  previous: CValSnapshot | null,
  snapshot: CValSnapshot,
): CValSocietyRegime {
  const move = finite(snapshot.market.oneSecondMovePercent);
  const previousMove = finite(previous?.market.oneSecondMovePercent);
  if (previous && move >= 0.15 && previousMove <= -0.15) return "rebound";
  if (previous && move <= -0.15 && previousMove >= 0.15) return "pullback";
  if (move >= 8) return "surge";
  if (move >= 2.5) return "rise";
  if (move > 0.15) return "uptick";
  if (move <= -8) return "crash";
  if (move <= -2.5) return "slide";
  if (move < -0.15) return "downtick";
  if (
    Math.abs(finite(snapshot.market.orderImbalance)) >= 0.3
    || finite(snapshot.market.realizedVolatilityBps) >= 35
    || finite(snapshot.market.spreadBps) >= 4
  ) return "contest";
  return "flat";
}

function societyEvent({
  kind,
  discriminator,
  regime,
  priority,
  snapshot,
  preferredTopicIds,
  reservedTemplateIds,
}: {
  kind: "regime" | "price" | "flow" | "liquidity";
  discriminator: string | number;
  regime: CValSocietyRegime;
  priority: number;
  snapshot: CValSnapshot;
  preferredTopicIds: readonly string[];
  reservedTemplateIds: Set<string>;
}): CValNewsEvent {
  const selected = selectCValSocietyHeadline({
    regime,
    key: `${kind}:${discriminator}:${snapshot.revision}`,
    context: headlineContext(snapshot),
    excludedTemplateIds: reservedTemplateIds,
    preferredTopicIds,
  });
  reservedTemplateIds.add(selected.templateId);

  return {
    id: `society:${kind}:${snapshot.revision}:${discriminator}`,
    templateId: selected.templateId,
    headline: selected.headline,
    code: selected.code,
    change: finite(snapshot.market.changeFromOpenPercent),
    oneDayMove: finite(snapshot.market.oneSecondMovePercent),
    priority,
    occurredAt: snapshot.serverTime,
  };
}

/**
 * Society stories remain browser-side interpretations of actual C-VAL state
 * transitions. They do not claim an external event, poll result, source, or
 * measured social statistic; the market regime only selects a plausible field
 * of public consequence and debate.
 */
export function presentCValSocietyEvents(
  previous: CValSnapshot | null,
  snapshot: CValSnapshot,
  visibleTemplateIds: ReadonlySet<string> = new Set(),
) {
  if (snapshot.phase === "waiting") return [];

  const reservedTemplateIds = new Set(visibleTemplateIds);
  const regime = cValSocietyRegimeFor(previous, snapshot);
  const priorRegime = previous == null ? null : cValSocietyRegimeFor(null, previous);
  const currentPriceBucket = bucket(snapshot.market.changeFromOpenPercent, 0.3);
  const priorPriceBucket = previous == null
    ? null
    : bucket(previous.market.changeFromOpenPercent, 0.3);
  const currentFlowBand = flowBand(finite(snapshot.market.orderImbalance));
  const priorFlowBand = previous == null
    ? null
    : flowBand(finite(previous.market.orderImbalance));
  const currentLiquidityBucket = bucket(snapshot.market.spreadBps, 3);
  const priorLiquidityBucket = previous == null
    ? null
    : bucket(previous.market.spreadBps, 3);
  const candidates: CValNewsEvent[] = [];

  if (
    (previous == null && regime !== "flat")
    || (previous != null && regime !== priorRegime)
  ) {
    candidates.push(societyEvent({
      kind: "regime",
      discriminator: regime,
      regime,
      priority: 150 + Math.abs(finite(snapshot.market.oneSecondMovePercent)) * 40,
      snapshot,
      preferredTopicIds: REGIME_TOPICS,
      reservedTemplateIds,
    }));
  }

  if (
    (previous == null && currentPriceBucket !== 0)
    || (previous != null && currentPriceBucket !== priorPriceBucket)
  ) {
    candidates.push(societyEvent({
      kind: "price",
      discriminator: currentPriceBucket,
      regime,
      priority: 110 + Math.abs(currentPriceBucket - (priorPriceBucket ?? 0)) * 12,
      snapshot,
      preferredTopicIds: PRICE_TOPICS,
      reservedTemplateIds,
    }));
  }

  if (
    (previous == null && currentFlowBand !== 0)
    || (previous != null && currentFlowBand !== priorFlowBand)
  ) {
    candidates.push(societyEvent({
      kind: "flow",
      discriminator: currentFlowBand,
      regime,
      priority: 90 + Math.abs(currentFlowBand - (priorFlowBand ?? 0)) * 14,
      snapshot,
      preferredTopicIds: FLOW_TOPICS,
      reservedTemplateIds,
    }));
  }

  if (
    (previous == null && currentLiquidityBucket !== 0)
    || (previous != null && currentLiquidityBucket !== priorLiquidityBucket)
  ) {
    candidates.push(societyEvent({
      kind: "liquidity",
      discriminator: currentLiquidityBucket,
      regime,
      priority: 80 + Math.abs(currentLiquidityBucket - (priorLiquidityBucket ?? 0)) * 10,
      snapshot,
      preferredTopicIds: LIQUIDITY_TOPICS,
      reservedTemplateIds,
    }));
  }

  return candidates.sort(
    (left, right) => right.priority - left.priority || right.occurredAt - left.occurredAt,
  );
}

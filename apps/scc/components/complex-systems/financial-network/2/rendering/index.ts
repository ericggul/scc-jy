import type { FinancialActor, FinancialNetworkState, FinancialRelation, RelationKind } from "../model";

// The world deliberately occupies the usable browser frame rather than an
// oversized abstract plane. This keeps each ledger cell readable at a laptop
// viewport without scaling the financial map down into a decorative diagram.
export const WORLD = { width: 1440, height: 820 } as const;

export type Point = { x: number; y: number };
export type CubicCurve = { start: Point; controlA: Point; controlB: Point; end: Point };
export type EdgeGeometry = CubicCurve & { path: string; label: Point };

export function relationShortLabel(relation: FinancialRelation) {
  const labels: Record<RelationKind, string> = {
    wage: "wage",
    consumption: "consumption",
    "supplier-payment": "supplier settlement",
    tax: "tax",
    procurement: "procurement",
    "debt-service": "debt service",
    refinancing: "refinancing",
    "bank-income": "bank income",
    "interbank-funding": "interbank funding",
    repo: "repo rollover",
    "public-bill": "public bill",
    "loan-stock": "loan stock",
    "deposit-stock": "deposit stock",
    "interbank-credit": "interbank credit",
    "central-bank-facility": "central bank facility",
  };
  return labels[relation.kind];
}

export function layoutActors(actors: readonly FinancialActor[]) {
  if (actors.some((actor) => actor.id === "firm-20")) return expandedLayout(actors);
  const positions: Record<string, Point> = {
    "central-bank": { x: 720, y: 64 },
    "fund-1": { x: 170, y: 182 },
    "fund-2": { x: 530, y: 182 },
    "fund-3": { x: 910, y: 182 },
    "fund-4": { x: 1_270, y: 182 },
    "bank-1": { x: 170, y: 340 },
    "bank-2": { x: 530, y: 340 },
    "bank-3": { x: 910, y: 340 },
    "bank-4": { x: 1_270, y: 340 },
    "firm-1": { x: 85, y: 500 },
    "firm-2": { x: 270, y: 500 },
    "firm-3": { x: 455, y: 500 },
    "firm-4": { x: 640, y: 500 },
    "firm-5": { x: 800, y: 500 },
    "firm-6": { x: 985, y: 500 },
    "firm-7": { x: 1_170, y: 500 },
    "firm-8": { x: 1_355, y: 500 },
    "household-1": { x: 85, y: 622 },
    "household-2": { x: 270, y: 622 },
    "household-3": { x: 455, y: 622 },
    "household-4": { x: 640, y: 622 },
    "household-5": { x: 800, y: 622 },
    "household-6": { x: 985, y: 622 },
    "household-7": { x: 1_170, y: 622 },
    "household-8": { x: 1_355, y: 622 },
    treasury: { x: 720, y: 752 },
  };
  return new Map(actors.flatMap((actor) => {
    const point = positions[actor.id];
    return point ? [[actor.id, point] as const] : [];
  }));
}

function ringPoint(index: number, count: number, radius: number, phase = -Math.PI / 2): Point {
  const angle = phase + index / count * Math.PI * 2;
  return {
    x: WORLD.width / 2 + Math.cos(angle) * radius,
    y: WORLD.height / 2 + Math.sin(angle) * radius,
  };
}

function numericId(id: string) {
  return Math.max(0, Number(id.match(/(\d+)$/)?.[1] ?? 0) - 1);
}

/**
 * The dense preset remains a fixed institution map. Households occupy the
 * outer payment surface, firms make the production ring, and funding shares an
 * inner ring around the public/monetary core. The central bank is the exact
 * centre; all other positions are fixed radii, not an elliptical approximation.
 * No balance-sheet state participates, so a shock cannot be mistaken for
 * layout motion.
 */
function expandedLayout(actors: readonly FinancialActor[]) {
  const positions = new Map<string, Point>();
  const firms = actors.filter((actor) => actor.kind === "firm");
  const fundingOrder = [
    "bank-1", "fund-1", "bank-2", "fund-2", "bank-3",
    "fund-3", "bank-4", "fund-4", "bank-5", "bank-6",
  ].filter((id) => actors.some((actor) => actor.id === id));

  for (const actor of actors) {
    if (actor.kind === "household") {
      const householdIndex = numericId(actor.id);
      const firstHouseholdRing = householdIndex < firms.length;
      // Household placement is civic, not a visual copy of firm placement.
      // Both rings occupy their own uniform circumference slots, shifted to
      // opposite half-sectors from the production ring and from one another.
      positions.set(
        actor.id,
        ringPoint(
          householdIndex % firms.length,
          firms.length,
          firstHouseholdRing ? 350 : 300,
          -Math.PI / 2 + (firstHouseholdRing ? 1 : -1) * Math.PI / firms.length,
        ),
      );
      continue;
    }
    if (actor.kind === "firm") {
      positions.set(actor.id, ringPoint(numericId(actor.id), firms.length, 235));
      continue;
    }
    if (actor.kind === "fund" || actor.kind === "bank") {
      const index = Math.max(0, fundingOrder.indexOf(actor.id));
      positions.set(actor.id, ringPoint(index, fundingOrder.length, 155));
      continue;
    }
    if (actor.kind === "central-bank") {
      positions.set(actor.id, { x: WORLD.width / 2, y: WORLD.height / 2 });
      continue;
    }
    positions.set(actor.id, ringPoint(0, 1, 90));
  }
  return positions;
}

function nodeHalfBounds(id: string, expanded = false) {
  if (expanded) {
    if (id.startsWith("household-")) return { x: 32, y: 17 };
    if (id.startsWith("firm-")) return { x: 40, y: 20 };
    if (id.startsWith("bank-")) return { x: 48, y: 24 };
    if (id.startsWith("fund-")) return { x: 42, y: 20 };
    if (id === "treasury") return { x: 69, y: 22 };
    return { x: 76, y: 24 };
  }
  if (id.startsWith("household-")) return { x: 42, y: 21 };
  if (id.startsWith("firm-")) return { x: 54, y: 26 };
  if (id.startsWith("bank-")) return { x: 71, y: 32 };
  if (id.startsWith("fund-")) return { x: 60, y: 26 };
  if (id === "treasury") return { x: 100, y: 26 };
  return { x: 115, y: 28 };
}

function rectanglePort(from: Point, to: Point, bounds: { x: number; y: number }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const denominator = Math.max(Math.abs(dx) / bounds.x, Math.abs(dy) / bounds.y, 0.0001);
  return { x: from.x + dx / denominator, y: from.y + dy / denominator };
}

function relationLane(relation: FinancialRelation) {
  const magnitude: Record<RelationKind, number> = {
    wage: 1.1,
    consumption: 1.1,
    "supplier-payment": 1.4,
    tax: 1.7,
    procurement: 1.7,
    "debt-service": 1.1,
    refinancing: 1.1,
    "bank-income": 2.1,
    "interbank-funding": 1.65,
    repo: 1.25,
    "public-bill": 1.55,
    "loan-stock": 2.2,
    "deposit-stock": 2.2,
    "interbank-credit": 1.65,
    "central-bank-facility": 1.25,
  };
  // A pair gets one stable visual orientation. The reverse arrow travels with
  // the reversed tangent but keeps this sign, so it necessarily occupies the
  // opposite side of the pair's cubic corridor instead of being painted over
  // its counterparty. Different ledgers in the same direction use magnitudes
  // to retain their own nearby lanes.
  const pair = [relation.from, relation.to].sort().join(":");
  const parity = [...pair].reduce((total, character) => total + character.charCodeAt(0), 0) % 2;
  return (parity === 0 ? 1 : -1) * magnitude[relation.kind];
}

export function edgeGeometry(
  relation: FinancialRelation,
  points: ReadonlyMap<string, Point>,
  expanded = false,
): EdgeGeometry {
  const from = points.get(relation.from);
  const to = points.get(relation.to);
  if (!from || !to) {
    const origin = { x: 0, y: 0 };
    return { start: origin, controlA: origin, controlB: origin, end: origin, path: "", label: origin };
  }
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const start = rectanglePort(from, to, nodeHalfBounds(relation.from, expanded));
  const end = rectanglePort(to, from, nodeHalfBounds(relation.to, expanded));
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const length = Math.max(1, Math.hypot(segmentX, segmentY));
  // Every relation uses the same cubic family. Counter-directed obligations
  // occupy opposite sides of a stable pair corridor without introducing a
  // second visual material or category-specific edge style.
  const bend = Math.min(26, Math.max(8, length * 0.065)) * relationLane(relation);
  const controlA = {
    x: start.x + segmentX * 0.31 - (segmentY / length) * bend,
    y: start.y + segmentY * 0.31 + (segmentX / length) * bend,
  };
  const controlB = {
    x: start.x + segmentX * 0.69 - (segmentY / length) * bend,
    y: start.y + segmentY * 0.69 + (segmentX / length) * bend,
  };
  return {
    start,
    controlA,
    controlB,
    end,
    path: `M ${start.x} ${start.y} C ${controlA.x} ${controlA.y} ${controlB.x} ${controlB.y} ${end.x} ${end.y}`,
    label: {
      x: (start.x + 3 * controlA.x + 3 * controlB.x + end.x) / 8,
      y: (start.y + 3 * controlA.y + 3 * controlB.y + end.y) / 8,
    },
  };
}

export function pointOnCurve(curve: CubicCurve, time: number): Point {
  const t = clamp(time, 0, 1);
  const inverse = 1 - t;
  return {
    x: inverse ** 3 * curve.start.x + 3 * inverse * inverse * t * curve.controlA.x + 3 * inverse * t * t * curve.controlB.x + t ** 3 * curve.end.x,
    y: inverse ** 3 * curve.start.y + 3 * inverse * inverse * t * curve.controlA.y + 3 * inverse * t * t * curve.controlB.y + t ** 3 * curve.end.y,
  };
}

export function strokeWidth(relation: FinancialRelation, claims: boolean) {
  const stockRelation = claims || relation.layer !== "payment";
  if (stockRelation) {
    return clamp(0.8 + Math.sqrt(Math.max(0, relation.outstanding)) * 0.3, 0.8, 5.6);
  }

  // The living payment band is a direct mapping of the actual settlement
  // against this relation's normal capacity. Unlike the former sqrt-only
  // stroke, a 50% settlement loss is visibly a contraction of the edge itself.
  const capacity = 0.9 + Math.sqrt(Math.max(0, relation.baseline)) * 1.6;
  const ratio = paymentFlowRatio(relation);
  return clamp(0.45 + (capacity - 0.45) * ratio ** 0.85, 0.45, 5.8);
}

export function paymentFlowRatio(relation: FinancialRelation) {
  return clamp(relation.actual / Math.max(0.08, relation.baseline), 0, 1.22);
}

export function relationRailWidth(relation: FinancialRelation, claims: boolean) {
  if (claims || relation.layer !== "payment") return strokeWidth(relation, true);
  return clamp(0.6 + Math.sqrt(Math.max(0, relation.baseline)) * 0.34, 0.6, 1.35);
}

export function primaryRelations(
  state: FinancialNetworkState,
  claims: boolean,
  focusId: string | null,
) {
  const relationSet = state.relations.filter((relation) => {
    if (claims) return relation.layer === "claim" || relation.layer === "facility";
    return relation.layer === "payment" || relation.layer === "facility";
  });
  if (focusId) return relationSet.filter((relation) => relation.from === focusId || relation.to === focusId);
  return relationSet;
}

export function prominentRelation(relation: FinancialRelation) {
  return [
    "debt-service",
    "refinancing",
    "repo",
    "public-bill",
    "interbank-funding",
    "procurement",
    "central-bank-facility",
  ].includes(relation.kind);
}

const clamp = (value: number, lower: number, upper: number) =>
  Math.min(upper, Math.max(lower, value));

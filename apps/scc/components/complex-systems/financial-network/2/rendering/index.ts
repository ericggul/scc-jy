import type {
  ActorKind,
  FinancialActor,
  FinancialNetworkState,
  FinancialRelation,
  RelationKind,
} from "../model";

// The world deliberately occupies the usable browser frame rather than an
// oversized abstract plane. This keeps each ledger cell readable at a laptop
// viewport without scaling the financial map down into a decorative diagram.
export const WORLD = { width: 1440, height: 820 } as const;

export type Point = { x: number; y: number };
export type CubicCurve = { start: Point; controlA: Point; controlB: Point; end: Point };
export type EdgeGeometry = CubicCurve & { path: string; label: Point };

const actorFill: Record<ActorKind, string> = {
  household: "#f4eddc",
  firm: "#dce6df",
  bank: "#e7d9bd",
  fund: "#dce1ed",
  treasury: "#e9ddd2",
  "central-bank": "#d4d2c8",
};

const actorStroke: Record<ActorKind, string> = {
  household: "#716a5d",
  firm: "#485e52",
  bank: "#78623f",
  fund: "#4d617e",
  treasury: "#765a4c",
  "central-bank": "#3f403d",
};

const flowColor: Record<RelationKind, string> = {
  wage: "#a55e27",
  consumption: "#376d70",
  tax: "#8d4c3f",
  procurement: "#8d4c3f",
  "debt-service": "#775c9b",
  refinancing: "#775c9b",
  "bank-income": "#a87822",
  repo: "#4e6288",
  "public-bill": "#4e6288",
  "loan-stock": "#775c9b",
  "deposit-stock": "#8b7651",
  "central-bank-facility": "#3f403d",
};

export function fillFor(actor: FinancialActor) {
  return actorFill[actor.kind];
}

export function strokeFor(actor: FinancialActor) {
  return actorStroke[actor.kind];
}

export function colorFor(relation: FinancialRelation) {
  return flowColor[relation.kind];
}

export function relationShortLabel(relation: FinancialRelation) {
  const labels: Record<RelationKind, string> = {
    wage: "wage",
    consumption: "consumption",
    tax: "tax",
    procurement: "procurement",
    "debt-service": "debt service",
    refinancing: "refinancing",
    "bank-income": "bank income",
    repo: "repo rollover",
    "public-bill": "public bill",
    "loan-stock": "loan stock",
    "deposit-stock": "deposit stock",
    "central-bank-facility": "central bank facility",
  };
  return labels[relation.kind];
}

export function layoutActors(actors: readonly FinancialActor[]) {
  const points = new Map<string, Point>();
  const banks = [
    { x: 170, y: 338 },
    { x: 475, y: 338 },
    { x: 965, y: 338 },
    { x: 1270, y: 338 },
  ];
  const firmSlots = [
    [-92, 144],
    [0, 144],
    [92, 144],
  ];

  for (const actor of actors) {
    if (actor.kind === "bank") {
      points.set(actor.id, banks[actor.community] ?? banks[0]!);
      continue;
    }
    if (actor.kind === "firm") {
      const bank = banks[actor.community] ?? banks[0]!;
      const localFirms = actors.filter(
        (candidate) => candidate.kind === "firm" && candidate.community === actor.community,
      );
      const order = localFirms.findIndex((candidate) => candidate.id === actor.id);
      const slot = firmSlots[order % firmSlots.length] ?? firmSlots[0]!;
      points.set(actor.id, { x: bank.x + slot[0]!, y: bank.y + slot[1]! });
      continue;
    }
    if (actor.kind === "household") {
      const employer = Math.ceil(Number(actor.id.match(/(\d+)$/)?.[1] ?? 1) / 2);
      const firm = points.get(`firm-${employer}`);
      const community = banks[actor.community] ?? banks[0]!;
      const worker = (Number(actor.id.match(/(\d+)$/)?.[1] ?? 1) - 1) % 2;
      const fallback = {
        x: community.x + (worker === 0 ? -40 : 40),
        y: community.y + 226,
      };
      points.set(actor.id, {
        x: (firm ?? fallback).x + (worker === 0 ? -40 : 40),
        y: (firm ?? fallback).y + 82,
      });
      continue;
    }
    if (actor.kind === "fund") {
      const positions = [
        { x: 270, y: 168 },
        { x: 500, y: 168 },
        { x: 940, y: 168 },
        { x: 1170, y: 168 },
      ];
      points.set(actor.id, positions[actor.community] ?? positions[0]!);
      continue;
    }
    if (actor.kind === "treasury") points.set(actor.id, { x: 720, y: 760 });
    if (actor.kind === "central-bank") points.set(actor.id, { x: 720, y: 58 });
  }
  return points;
}

function nodeHalfBounds(id: string) {
  if (id.startsWith("household-")) return { x: 35, y: 16 };
  if (id.startsWith("firm-")) return { x: 46, y: 23 };
  if (id.startsWith("bank-")) return { x: 64, y: 28 };
  if (id.startsWith("fund-")) return { x: 52, y: 22 };
  if (id === "treasury") return { x: 96, y: 23 };
  return { x: 112, y: 26 };
}

function rectanglePort(from: Point, to: Point, bounds: { x: number; y: number }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const denominator = Math.max(Math.abs(dx) / bounds.x, Math.abs(dy) / bounds.y, 0.0001);
  return { x: from.x + dx / denominator, y: from.y + dy / denominator };
}

export function edgeGeometry(
  relation: FinancialRelation,
  points: ReadonlyMap<string, Point>,
): EdgeGeometry {
  const from = points.get(relation.from);
  const to = points.get(relation.to);
  if (!from || !to) {
    const origin = { x: 0, y: 0 };
    return { start: origin, controlA: origin, controlB: origin, end: origin, path: "", label: origin };
  }
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const start = rectanglePort(from, to, nodeHalfBounds(relation.from));
  const end = rectanglePort(to, from, nodeHalfBounds(relation.to));
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const length = Math.max(1, Math.hypot(segmentX, segmentY));
  // Every relation uses the same cubic family. Counter-directed obligations
  // receive mirrored lanes so that direction remains legible without changing
  // material, colour family, or visual grammar by relation type.
  const lane = relation.from < relation.to ? 1 : -1;
  const bend = Math.min(30, Math.max(9, length * 0.08)) * lane;
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
  const amount = claims || relation.layer !== "payment" ? relation.outstanding : relation.actual;
  return clamp(0.8 + Math.sqrt(Math.max(0, amount)) * (claims ? 0.33 : 1.28), 0.8, claims ? 8 : 12);
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
  return relationSet.filter((relation) => {
    if (relation.kind === "wage" || relation.kind === "consumption") return relation.actual > 0.2;
    return true;
  });
}

export function prominentRelation(relation: FinancialRelation) {
  return [
    "debt-service",
    "refinancing",
    "repo",
    "public-bill",
    "procurement",
    "central-bank-facility",
  ].includes(relation.kind);
}

const clamp = (value: number, lower: number, upper: number) =>
  Math.min(upper, Math.max(lower, value));

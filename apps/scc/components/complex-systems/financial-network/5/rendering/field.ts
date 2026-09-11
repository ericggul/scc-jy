import type { Economy, EconomyEdge, EconomyNode, Sector } from "../model/index";

export type GraphMode = "payments" | "debt";
export type GraphPoint = { x: number; y: number };
export type GraphRelation = EconomyEdge & { label: string; inferred?: boolean; facility?: boolean };

/** A fixed market map. The institutions do not drift, so state changes remain attributable to the ledger. */
export const GRAPH_SIZE = { width: 1600, height: 860 } as const;

const sectorRadius: Record<Sector, number> = {
  household: 14,
  firm: 24,
  bank: 40,
  fund: 26,
  treasury: 37,
  centralBank: 45,
};

const minimumRadius: Record<Sector, number> = {
  household: 7,
  firm: 12,
  bank: 20,
  fund: 13,
  treasury: 18.5,
  centralBank: 22.5,
};

const numericId = (id: string) => Math.max(0, Number(id.match(/(\d+)$/)?.[1] ?? 1) - 1);

function ringPoint(index: number, count: number, radius: number, centre: GraphPoint, phase = -Math.PI / 2): GraphPoint {
  const angle = phase + index / Math.max(1, count) * Math.PI * 2;
  return { x: centre.x + Math.cos(angle) * radius, y: centre.y + Math.sin(angle) * radius };
}

function peripheralHouseholdPoint(index: number, total: number): GraphPoint {
  const sideIndex = Math.floor(index / 2);
  const perSide = Math.ceil(total / 2);
  const columns = 5;
  const rows = Math.ceil(perSide / columns);
  const column = sideIndex % columns;
  const row = Math.floor(sideIndex / columns);
  const left = index % 2 === 0;
  const xStart = left ? 28 : 1_320;
  const xEnd = left ? 292 : 1_572;
  return {
    x: xStart + column / (columns - 1) * (xEnd - xStart),
    y: 30 + (rows === 1 ? 0 : row / (rows - 1)) * 800,
  };
}

const spendableCash = (node: EconomyNode) => node.frozen ? node.liquidCash : node.cash;

/**
 * Circle area, rather than radius, represents spendable money. The reference
 * economy gives each actor its own normal operating scale; a lock therefore
 * contracts the circle immediately without making banks and households
 * incomparable through their very different baseline balances.
 */
export function nodeRadius(node: EconomyNode, referenceNode: EconomyNode = node, denseHouseholds = false) {
  const normal = Math.max(0.001, spendableCash(referenceNode));
  const ratio = Math.max(0, Math.min(1.35, spendableCash(node) / normal));
  const baseRadius = denseHouseholds && node.sector === "household" ? 5.8 : sectorRadius[node.sector];
  const minimum = denseHouseholds && node.sector === "household" ? 2.9 : minimumRadius[node.sector];
  return Math.max(minimum * 0.28, baseRadius * Math.sqrt(ratio));
}

function radiusForId(id: string, radii?: ReadonlyMap<string, number>) {
  const radius = radii?.get(id);
  if (radius !== undefined) return radius;
  if (id === "central-bank") return sectorRadius.centralBank;
  if (id === "treasury") return sectorRadius.treasury;
  if (id.startsWith("bank-")) return sectorRadius.bank;
  if (id.startsWith("fund-")) return sectorRadius.fund;
  if (id.startsWith("firm-")) return sectorRadius.firm;
  return sectorRadius.household;
}

export function nodeLabel(node: EconomyNode) {
  if (node.id === "treasury") return "정부";
  if (node.id === "central-bank") return "중앙은행";
  const n = (node.id.match(/(\d+)$/)?.[1] ?? "").padStart(node.sector === "household" ? 2 : 1, "0");
  return node.sector === "household" ? `가계${n}` : node.sector === "firm" ? `기업${n}` : node.sector === "bank" ? `은행${n}` : `투자${n}`;
}

const fixedPositions: Record<string, GraphPoint> = {
  "central-bank": { x: 810, y: 326 },
  treasury: { x: 790, y: 586 },
  "bank-1": { x: 510, y: 324 },
  "bank-2": { x: 1090, y: 290 },
  "bank-3": { x: 1140, y: 662 },
  "bank-4": { x: 478, y: 680 },
  "fund-1": { x: 310, y: 148 },
  "fund-2": { x: 1262, y: 122 },
  "fund-3": { x: 1370, y: 762 },
  "fund-4": { x: 236, y: 752 },
  "firm-1": { x: 372, y: 304 },
  "firm-2": { x: 936, y: 154 },
  "firm-3": { x: 1292, y: 570 },
  "firm-4": { x: 642, y: 744 },
  "firm-5": { x: 602, y: 172 },
  "firm-6": { x: 1220, y: 324 },
  "firm-7": { x: 982, y: 746 },
  "firm-8": { x: 326, y: 542 },
  "firm-9": { x: 706, y: 246 },
  "firm-10": { x: 1332, y: 444 },
  "household-1": { x: 218, y: 252 },
  "household-2": { x: 214, y: 366 },
  "household-3": { x: 846, y: 72 },
  "household-4": { x: 990, y: 74 },
  "household-5": { x: 1480, y: 506 },
  "household-6": { x: 1490, y: 616 },
  "household-7": { x: 786, y: 830 },
  "household-8": { x: 662, y: 828 },
  "household-9": { x: 514, y: 74 },
  "household-10": { x: 660, y: 82 },
  "household-11": { x: 1410, y: 234 },
  "household-12": { x: 1460, y: 338 },
  "household-13": { x: 1012, y: 836 },
  "household-14": { x: 1122, y: 826 },
  "household-15": { x: 154, y: 478 },
  "household-16": { x: 154, y: 594 },
  "household-17": { x: 666, y: 382 },
  "household-18": { x: 750, y: 430 },
  "household-19": { x: 1450, y: 400 },
  "household-20": { x: 1458, y: 476 },
};

/**
 * The exterior is the household edge of the economy; banks, the public sector,
 * and firms overlap through the middle. This makes cross-bank consumption and
 * public settlement read as a market web rather than four isolated diagrams.
 */
export function graphLayout(nodes: readonly EconomyNode[]) {
  const points = new Map<string, GraphPoint>();
  const households = nodes.filter((node) => node.sector === "household");
  const expanded = households.length >= 100;
  if (expanded) {
    const firms = nodes.filter((node) => node.sector === "firm");
    const financial = nodes.filter((node) => node.sector === "bank" || node.sector === "fund");
    const centre = { x: 800, y: 450 };
    for (const node of nodes) {
      if (node.sector === "household") {
        points.set(node.id, peripheralHouseholdPoint(numericId(node.id), households.length));
        continue;
      }
      if (node.sector === "firm") {
        points.set(node.id, ringPoint(numericId(node.id), firms.length, 252, centre));
        continue;
      }
      if (node.sector === "bank" || node.sector === "fund") {
        points.set(node.id, ringPoint(financial.findIndex((item) => item.id === node.id), financial.length, 150, centre));
        continue;
      }
      if (node.sector === "centralBank") points.set(node.id, { x: 800, y: 450 });
      else points.set(node.id, { x: 800, y: 700 });
    }
    return points;
  }
  for (const node of nodes) {
    const point = fixedPositions[node.id];
    if (point) points.set(node.id, point);
  }
  return points;
}

export function edgeLabel(edge: EconomyEdge) {
  return ({ wage: "임금", consumption: "소비", loan: "대출채무", tax: "세금", procurement: "정부조달", dividend: "이자·배당", bond: "국채 롤오버", backstop: "중앙은행 대출", backstopDisbursement: "유동성 공급" } as const)[edge.kind];
}

function deposits(economy: Economy): GraphRelation[] {
  return economy.nodes.filter((node) => node.sector !== "bank" && node.bankId).map((node) => ({
    id: `deposit:${node.bankId}:${node.id}`,
    from: node.bankId!,
    to: node.id,
    kind: "loan" as const,
    principal: node.cash,
    flow: 0,
    arrears: 0,
    label: "예금채무",
    inferred: true,
  }));
}

function facilities(economy: Economy): GraphRelation[] {
  const centralBank = economy.nodes.find((node) => node.id === "central-bank");
  return economy.nodes.filter((node) => node.sector === "bank").map((bank) => {
    const eligible = economy.edges.filter((edge) => edge.kind === "loan" && edge.to === bank.id).reduce((sum, edge) => sum + edge.principal * 0.8, 0);
    const owed = economy.edges.filter((edge) => edge.kind === "backstop" && edge.from === bank.id).reduce((sum, edge) => sum + edge.principal, 0);
    return {
      id: `facility:${bank.id}`,
      from: "central-bank",
      to: bank.id,
      kind: "backstopDisbursement" as const,
      principal: Math.max(0, Math.min(centralBank?.liquidCash ?? 0, eligible - owed)),
      flow: 0,
      arrears: 0,
      label: "담보창구",
      facility: true,
    };
  });
}

export function visibleRelations(economy: Economy, mode: GraphMode): GraphRelation[] {
  if (mode === "payments") {
    return [
      ...economy.edges.filter((edge) => edge.kind !== "backstop").map((edge) => ({ ...edge, label: edgeLabel(edge) })),
      ...facilities(economy),
    ];
  }
  const claims = economy.edges
    .filter((edge) => edge.kind === "loan" || edge.kind === "backstop")
    .map((edge) => ({ ...edge, label: edge.kind === "loan" ? "대출채무" : edgeLabel(edge) }));
  return [...claims, ...deposits(economy), ...facilities(economy)];
}

function relationSide(relation: GraphRelation) {
  const pair = [relation.from, relation.to].sort().join(":");
  let hash = 0;
  for (const character of pair) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  // The pair owns one stable orientation. Reversing the relationship also
  // reverses its path normal, so preserving this sign puts each direction on
  // the opposite side of the cubic corridor rather than overprinting it.
  return hash % 2 === 0 ? 1 : -1;
}

function routeGeometry(relation: GraphRelation, points: ReadonlyMap<string, GraphPoint>, radii?: ReadonlyMap<string, number>) {
  const from = points.get(relation.from);
  const to = points.get(relation.to);
  if (!from || !to) return null;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy) || 1;
  const unit = { x: dx / distance, y: dy / distance };
  const normal = { x: -unit.y, y: unit.x };
  const start = {
    x: from.x + unit.x * (radiusForId(relation.from, radii) + 5),
    y: from.y + unit.y * (radiusForId(relation.from, radii) + 5),
  };
  const end = {
    x: to.x - unit.x * (radiusForId(relation.to, radii) + 9),
    y: to.y - unit.y * (radiusForId(relation.to, radii) + 9),
  };
  const bend = relationSide(relation) * Math.min(108, Math.max(26, distance * 0.14));
  const first = { x: start.x + (end.x - start.x) * 0.31 + normal.x * bend, y: start.y + (end.y - start.y) * 0.31 + normal.y * bend };
  const second = { x: start.x + (end.x - start.x) * 0.69 + normal.x * bend, y: start.y + (end.y - start.y) * 0.69 + normal.y * bend };
  return { start, end, first, second, normal, bend };
}

/** Every directed payment has its own cubic lane; opposing directions split around their shared pair corridor. */
export function relationPath(relation: GraphRelation, points: ReadonlyMap<string, GraphPoint>, radii?: ReadonlyMap<string, number>) {
  const route = routeGeometry(relation, points, radii);
  if (!route) return "";
  return `M ${route.start.x} ${route.start.y} C ${route.first.x} ${route.first.y} ${route.second.x} ${route.second.y} ${route.end.x} ${route.end.y}`;
}

/** A terminal arrow calculated from the final cubic tangent, not an SVG marker. */
export function relationArrowPath(relation: GraphRelation, points: ReadonlyMap<string, GraphPoint>, size: number, radii?: ReadonlyMap<string, number>) {
  const route = routeGeometry(relation, points, radii);
  if (!route) return "";
  const dx = route.end.x - route.second.x;
  const dy = route.end.y - route.second.y;
  const length = Math.hypot(dx, dy) || 1;
  const tangent = { x: dx / length, y: dy / length };
  const normal = { x: -tangent.y, y: tangent.x };
  const base = { x: route.end.x - tangent.x * size, y: route.end.y - tangent.y * size };
  const halfWidth = size * 0.52;
  return `M ${route.end.x} ${route.end.y} L ${base.x + normal.x * halfWidth} ${base.y + normal.y * halfWidth} L ${base.x - normal.x * halfWidth} ${base.y - normal.y * halfWidth} Z`;
}

export function relationLabelPoint(relation: GraphRelation, points: ReadonlyMap<string, GraphPoint>, radii?: ReadonlyMap<string, number>) {
  const route = routeGeometry(relation, points, radii);
  if (!route) return { x: 0, y: 0 };
  return {
    x: (route.start.x + 3 * route.first.x + 3 * route.second.x + route.end.x) / 8 + route.normal.x * (route.bend > 0 ? 5 : -5),
    y: (route.start.y + 3 * route.first.y + 3 * route.second.y + route.end.y) / 8 + route.normal.y * (route.bend > 0 ? 5 : -5),
  };
}

export function relationAmount(relation: GraphRelation, mode: GraphMode) {
  if (relation.facility) return `한도 ${relation.principal.toFixed(1)}`;
  if (relation.arrears > 0.005) return `${relation.principal.toFixed(1)} · 연체 ${relation.arrears.toFixed(2)}`;
  if (relation.id.startsWith("impact:")) return relation.flow.toFixed(2);
  return mode === "payments" ? relation.flow.toFixed(2) : relation.principal.toFixed(1);
}

export type RelationTone = "wage" | "consumption" | "public" | "financial" | "claim" | "deposit" | "facility";

export function relationTone(relation: GraphRelation, mode: GraphMode): RelationTone {
  if (relation.facility || relation.kind === "backstop" || relation.kind === "backstopDisbursement") return "facility";
  const activeMode = relation.id.startsWith("impact:") ? "payments" : mode;
  if (activeMode === "debt") return relation.inferred ? "deposit" : "claim";
  if (relation.kind === "wage" || relation.kind === "dividend") return "wage";
  if (relation.kind === "consumption") return "consumption";
  if (relation.kind === "tax" || relation.kind === "procurement") return "public";
  return "financial";
}

export function relationColor(tone: RelationTone) {
  return ({
    wage: "#e6e5dd",
    consumption: "#e6e5dd",
    public: "#f0a000",
    financial: "#90948b",
    claim: "#90948b",
    deposit: "#45acc7",
    facility: "#45acc7",
  } as const)[tone];
}

import type { EconomyEdge, EconomyNode } from "../model/index";

/** The coordinate system is deliberately independent of the SVG viewport. */
export const WORLD = { width: 1800, height: 1200 } as const;

export type GraphPoint = { x: number; y: number };
export type EdgeGeometry = { path: string; label: GraphPoint };
export type LabelPlacement = GraphPoint & { anchorX: number; anchorY: number };

const NODE_HALF_WIDTH = 50;
const NODE_HALF_HEIGHT = 25;
const NODE_CLEARANCE = { x: 56, y: 38 };

function numericId(id: string) {
  return Number(id.match(/(\d+)$/)?.[1] ?? 0);
}

function communityCentre(community: number) {
  return [
    { x: 350, y: 310 },
    { x: 1450, y: 310 },
    { x: 350, y: 890 },
    { x: 1450, y: 890 },
  ][community] ?? { x: 350, y: 310 };
}

/**
 * Fixed, semantic positions: a household is placed beside its actual wage
 * employer (`household n` belongs to `firm ceil(n / 2)`).  No simulation state
 * participates, so stress never makes the graph appear to change topology.
 */
export function layout(nodes: readonly EconomyNode[]) {
  const points = new Map<string, GraphPoint>();
  const firms = nodes.filter((node) => node.sector === "firm");

  for (const node of nodes) {
    const centre = communityCentre(node.community);
    if (node.sector === "bank") {
      points.set(node.id, centre);
      continue;
    }
    if (node.sector === "firm") {
      const local = firms.filter((firm) => firm.community === node.community);
      const slot = local.findIndex((firm) => firm.id === node.id);
      points.set(node.id, {
        x: centre.x + (node.community % 2 === 0 ? 185 : -185),
        y: centre.y + (slot - (local.length - 1) / 2) * 135,
      });
      continue;
    }
    if (node.sector === "household") {
      const employer = Math.ceil(numericId(node.id) / 2);
      const employerPoint = points.get(`firm-${employer}`);
      // The model lists households before firms, so this derives the employer
      // position directly rather than depending on iteration order.
      const firm = firms.find((item) => item.id === `firm-${employer}`);
      const firmCentre = firm ? communityCentre(firm.community) : centre;
      const local = firm ? firms.filter((item) => item.community === firm.community) : [];
      const slot = firm ? local.findIndex((item) => item.id === firm.id) : 0;
      const firmPoint = employerPoint ?? {
        x: firmCentre.x + (firmCentre.x < WORLD.width / 2 ? 185 : -185),
        y: firmCentre.y + (slot - (local.length - 1) / 2) * 135,
      };
      const worker = (numericId(node.id) - 1) % 2;
      points.set(node.id, {
        x: firmPoint.x + (firmPoint.x < WORLD.width / 2 ? 145 : -145),
        y: firmPoint.y + (worker === 0 ? -44 : 44),
      });
      continue;
    }
    if (node.sector === "fund") {
      const fund = numericId(node.id) - 1;
      points.set(node.id, {
        x: fund % 2 === 0 ? 690 : 1110,
        y: fund < 2 ? 170 : 1030,
      });
      continue;
    }
    if (node.sector === "treasury") points.set(node.id, { x: 900, y: 475 });
    else if (node.sector === "centralBank") points.set(node.id, { x: 900, y: 725 });
  }
  return points;
}

function clippedPoint(from: GraphPoint, to: GraphPoint, direction: 1 | -1) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const scale = 1 / Math.max(Math.abs(dx) / NODE_HALF_WIDTH, Math.abs(dy) / NODE_HALF_HEIGHT, 1);
  return { x: from.x + dx * scale * direction, y: from.y + dy * scale * direction };
}

function relationLane(relation: EconomyEdge) {
  // A reverse relation reverses its tangent but keeps this positive base bend,
  // placing the two arrows on opposite physical sides of the same connection.
  let hash = 0;
  for (const character of relation.id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return 28 + (hash % 3) * 8;
}

export function edgeGeometry(relation: EconomyEdge, points: ReadonlyMap<string, GraphPoint>): EdgeGeometry {
  const from = points.get(relation.from);
  const to = points.get(relation.to);
  if (!from || !to) return { path: "", label: { x: 0, y: 0 } };
  const start = clippedPoint(from, to, 1);
  const end = clippedPoint(to, from, 1);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const bend = relationLane(relation);
  const control = { x: (start.x + end.x) / 2 - (dy / length) * bend, y: (start.y + end.y) / 2 + (dx / length) * bend };
  return {
    path: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
    label: { x: (start.x + 2 * control.x + end.x) / 4, y: (start.y + 2 * control.y + end.y) / 4 },
  };
}

type LabelRelation = EconomyEdge & { label?: string };
type LabelBox = { x: number; y: number; width: number; height: number };

function overlaps(a: LabelBox, b: LabelBox) {
  return Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.y - b.y) < (a.height + b.height) / 2;
}

function withinWorld(box: LabelBox) {
  return box.x - box.width / 2 >= 12 && box.x + box.width / 2 <= WORLD.width - 12 && box.y - box.height / 2 >= 12 && box.y + box.height / 2 <= WORLD.height - 12;
}

/** Places labels once per relation set and retains a leader anchor when moved. */
export function labelLayout(relations: readonly LabelRelation[], points: ReadonlyMap<string, GraphPoint>) {
  const placed: LabelBox[] = [];
  const nodeBoxes = [...points.values()].map((point) => ({ x: point.x, y: point.y, width: NODE_HALF_WIDTH * 2 + NODE_CLEARANCE.x, height: NODE_HALF_HEIGHT * 2 + NODE_CLEARANCE.y }));
  const result = new Map<string, LabelPlacement>();
  const ordered = [...relations].sort((a, b) => a.id.localeCompare(b.id));

  for (const relation of ordered) {
    const geometry = edgeGeometry(relation, points);
    const from = points.get(relation.from);
    const to = points.get(relation.to);
    if (!from || !to) continue;
    const width = Math.max(96, Math.min(170, 48 + (relation.label?.length ?? 8) * 11));
    const height = 20;
    const tangent = { x: to.x - from.x, y: to.y - from.y };
    const length = Math.max(1, Math.hypot(tangent.x, tangent.y));
    const normal = { x: -tangent.y / length, y: tangent.x / length };
    let chosen: LabelBox | undefined;
    for (let ring = 0; ring < 12 && !chosen; ring += 1) {
      for (const side of [1, -1]) {
        const along = (ring % 3 - 1) * 28;
        const distance = ring * 26 * side;
        const candidate = { x: geometry.label.x + normal.x * distance + tangent.x / length * along, y: geometry.label.y + normal.y * distance + tangent.y / length * along, width, height };
        if (withinWorld(candidate) && !nodeBoxes.some((box) => overlaps(candidate, box)) && !placed.some((box) => overlaps(candidate, box))) { chosen = candidate; break; }
      }
    }
    const box = chosen ?? { x: Math.min(WORLD.width - width / 2 - 12, Math.max(width / 2 + 12, geometry.label.x)), y: Math.min(WORLD.height - height / 2 - 12, Math.max(height / 2 + 12, geometry.label.y)), width, height };
    placed.push(box);
    result.set(relation.id, { x: box.x, y: box.y, anchorX: geometry.label.x, anchorY: geometry.label.y });
  }
  return result;
}

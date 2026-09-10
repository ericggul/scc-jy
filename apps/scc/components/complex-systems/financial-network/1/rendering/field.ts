import type { Economy, EconomyEdge, EconomyNode } from "../model/index";

export type GraphMode = "payments" | "debt";
export type GraphPoint = { x: number; y: number };
export type GraphRelation = EconomyEdge & { label: string; inferred?: boolean; facility?: boolean };
export const GRAPH_SIZE = { width: 1400, height: 820 };

export function nodeLabel(node: EconomyNode) {
  if (node.id === "treasury") return "정부";
  if (node.id === "central-bank") return "중앙은행";
  const n = (node.id.match(/(\d+)$/)?.[1] ?? "").padStart(node.sector === "household" ? 2 : 1, "0");
  return node.sector === "household" ? `가계${n}` : node.sector === "firm" ? `기업${n}` : node.sector === "bank" ? `은행${n}` : `투자${n}`;
}

export function graphLayout(nodes: EconomyNode[]) {
  const points = new Map<string, GraphPoint>();
  for (const node of nodes) {
    const index = Number(node.id.match(/(\d+)$/)?.[1] ?? 1) - 1;
    const community = node.community;
    const hubs = [{ x: 380, y: 205 }, { x: 1020, y: 205 }, { x: 380, y: 615 }, { x: 1020, y: 615 }];
    const hub = hubs[community] ?? hubs[0]!;
    if (node.sector === "bank") points.set(node.id, hub);
    else if (node.sector === "firm") {
      const local = nodes.filter((item) => item.sector === "firm" && item.community === community).indexOf(node);
      points.set(node.id, { x: hub.x + (community % 2 ? -108 : 108), y: hub.y + (local - .5) * 86 });
    } else if (node.sector === "household") {
      const row = Math.floor(index / 2); const local = Math.floor(row / 4); const count = community < 2 ? 3 : 2;
      const firm = { x: hub.x + (community % 2 ? -108 : 108), y: hub.y + (local - (count - 1) / 2) * 86 };
      points.set(node.id, { x: firm.x + (community % 2 ? -122 : 122), y: firm.y + (index % 2 ? 22 : -22) });
    } else if (node.sector === "fund") { const positions = [{ x: 610, y: 205 }, { x: 790, y: 205 }, { x: 610, y: 615 }, { x: 790, y: 615 }]; points.set(node.id, positions[index] ?? positions[0]!); }
    else points.set(node.id, { x: 700, y: node.sector === "treasury" ? 355 : 465 });
  }
  return points;
}

export function edgeLabel(edge: EconomyEdge) {
  return ({ wage: "임금", consumption: "소비", loan: "대출 원리금", tax: "세금", procurement: "정부 조달", dividend: "이자 배당", bond: "국채 롤오버", backstop: "중앙은행 대출", backstopDisbursement: "유동성 공급" } as const)[edge.kind];
}

function deposits(economy: Economy): GraphRelation[] {
  return economy.nodes.filter((node) => node.sector !== "bank" && node.bankId).map((node) => ({ id: `deposit:${node.bankId}:${node.id}`, from: node.bankId!, to: node.id, kind: "loan" as const, principal: node.cash, flow: 0, arrears: 0, label: "예금채무", inferred: true }));
}
function facilities(economy: Economy): GraphRelation[] {
  const centralBank = economy.nodes.find((node) => node.id === "central-bank");
  return economy.nodes.filter((node) => node.sector === "bank").map((bank) => {
    const eligible = economy.edges.filter((edge) => edge.kind === "loan" && edge.to === bank.id).reduce((sum, edge) => sum + edge.principal * .8, 0);
    const owed = economy.edges.filter((edge) => edge.kind === "backstop" && edge.from === bank.id).reduce((sum, edge) => sum + edge.principal, 0);
    return { id: `facility:${bank.id}`, from: "central-bank", to: bank.id, kind: "backstopDisbursement" as const, principal: Math.max(0, Math.min(centralBank?.liquidCash ?? 0, eligible - owed)), flow: 0, arrears: 0, label: "담보창구", facility: true };
  });
}
export function visibleRelations(economy: Economy, mode: GraphMode): GraphRelation[] {
  if (mode === "payments") return [...economy.edges.filter((edge) => edge.kind !== "backstop").map((edge) => ({ ...edge, label: edgeLabel(edge) })), ...facilities(economy)];
  const claims = economy.edges.filter((edge) => edge.kind === "loan" || edge.kind === "backstop").map((edge) => ({ ...edge, label: edge.kind === "loan" ? "대출채무" : edgeLabel(edge) }));
  return [...claims, ...deposits(economy), ...facilities(economy)];
}
export function relationPath(relation: GraphRelation, points: Map<string, GraphPoint>) {
  const from = points.get(relation.from); const to = points.get(relation.to); if (!from || !to) return "";
  const dx = to.x - from.x; const dy = to.y - from.y; const length = Math.hypot(dx, dy) || 1;
  const radius = (id: string) => id.startsWith("household-") ? 38 : 48;
  const start = { x: from.x + dx / length * radius(relation.from), y: from.y + dy / length * radius(relation.from) };
  const end = { x: to.x - dx / length * radius(relation.to), y: to.y - dy / length * radius(relation.to) };
  const hash = [...relation.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const bend = relation.kind === "wage" ? -15 : relation.kind === "consumption" && !relation.id.endsWith(":other") ? 15 : ((hash % 7) - 3) * 7;
  return `M ${start.x} ${start.y} Q ${(start.x + end.x) / 2 - (dy / length) * bend} ${(start.y + end.y) / 2 + (dx / length) * bend} ${end.x} ${end.y}`;
}
export function relationLabelPoint(relation: GraphRelation, points: Map<string, GraphPoint>) {
  const from = points.get(relation.from); const to = points.get(relation.to); if (!from || !to) return { x: 0, y: 0 };
  const dx = to.x - from.x; const dy = to.y - from.y; const length = Math.hypot(dx, dy) || 1;
  const bend = relation.kind === "wage" ? -15 : relation.kind === "consumption" && !relation.id.endsWith(":other") ? 15 : 0;
  return { x: (from.x + to.x) / 2 - (dy / length) * bend, y: (from.y + to.y) / 2 + (dx / length) * bend - 5 };
}
export function relationAmount(relation: GraphRelation, mode: GraphMode) {
  if (relation.facility) return `한도 ${relation.principal.toFixed(1)}`;
  if (relation.arrears > 0.005) return `연체 ${relation.arrears.toFixed(2)}`;
  return mode === "payments" ? `지급 ${relation.flow.toFixed(2)}` : relation.principal.toFixed(1);
}

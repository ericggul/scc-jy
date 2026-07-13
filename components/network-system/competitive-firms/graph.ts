import type {
  CompetitionEdgeId,
  FirmId,
  FirmVariableId,
  InternalEdgeId,
} from "@/components/network-system/competitive-firms/model";

export type GraphPoint = { x: number; y: number };

export const graphPoints: Record<"1" | "2" | "3" | "4", GraphPoint> = {
  "1": { x: 0.28, y: 0.28 },
  "2": { x: 0.72, y: 0.28 },
  "3": { x: 0.28, y: 0.72 },
  "4": { x: 0.72, y: 0.72 },
};

export const firmNodes: Array<{
  id: FirmId;
  label: string;
  point: GraphPoint;
}> = [
  { id: "1", label: "COMPANY 1", point: graphPoints["1"] },
  { id: "2", label: "COMPANY 2", point: graphPoints["2"] },
  { id: "3", label: "COMPANY 3", point: graphPoints["3"] },
  { id: "4", label: "COMPANY 4", point: graphPoints["4"] },
];

export const variableNodes: Array<{
  id: FirmVariableId;
  label: string;
  point: GraphPoint;
}> = [
  { id: "product", label: "PRODUCT", point: graphPoints["1"] },
  { id: "price", label: "PRICE", point: graphPoints["2"] },
  { id: "capacity", label: "CAPACITY", point: graphPoints["3"] },
  { id: "capital", label: "CAPITAL", point: graphPoints["4"] },
];

export const pairedFirmConnections: Array<{
  id: string;
  edgeIds: [CompetitionEdgeId, CompetitionEdgeId];
}> = [
  { id: "1-2", edgeIds: ["1-to-2", "2-to-1"] },
  { id: "1-3", edgeIds: ["1-to-3", "3-to-1"] },
  { id: "1-4", edgeIds: ["1-to-4", "4-to-1"] },
  { id: "2-3", edgeIds: ["2-to-3", "3-to-2"] },
  { id: "2-4", edgeIds: ["2-to-4", "4-to-2"] },
  { id: "3-4", edgeIds: ["3-to-4", "4-to-3"] },
];

export const internalConnections: Array<{ id: InternalEdgeId; reverse?: boolean }> = [
  { id: "capital-to-product" }, { id: "product-to-capital", reverse: true },
  { id: "product-to-price" }, { id: "capital-to-capacity" },
  { id: "capacity-to-price" }, { id: "capacity-to-capital" },
  { id: "price-to-capital" },
];

export function splitCompetitionEdge(edgeId: CompetitionEdgeId) {
  return edgeId.split("-to-") as [FirmId, FirmId];
}

export function splitInternalEdge(edgeId: InternalEdgeId) {
  return edgeId.split("-to-") as [FirmVariableId, FirmVariableId];
}

export function directedLine(
  from: GraphPoint,
  to: GraphPoint,
  reverse: boolean,
  trim = 0.17,
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const offset = reverse ? 0.007 : -0.007;
  const offsetX = (-dy / length) * offset;
  const offsetY = (dx / length) * offset;
  return {
    x1: from.x + dx * trim + offsetX,
    y1: from.y + dy * trim + offsetY,
    x2: from.x + dx * (1 - trim) + offsetX,
    y2: from.y + dy * (1 - trim) + offsetY,
  };
}

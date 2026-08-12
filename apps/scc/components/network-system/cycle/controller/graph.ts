import type {
  CycleEdgeId,
  CycleNodeId,
} from "@/components/network-system/cycle/model";

export const cycleNodes: Array<{
  id: CycleNodeId;
  x: number;
  y: number;
}> = [
  { id: "household-demand", x: 0.12, y: 0.15 },
  { id: "production", x: 0.5, y: 0.12 },
  { id: "inventories", x: 0.88, y: 0.15 },
  { id: "wage-share", x: 0.12, y: 0.5 },
  { id: "employment", x: 0.5, y: 0.48 },
  { id: "investment", x: 0.88, y: 0.5 },
  { id: "inflation", x: 0.12, y: 0.85 },
  { id: "policy-rate", x: 0.5, y: 0.88 },
  { id: "credit", x: 0.88, y: 0.85 },
];

const controlSlots = [
  { x: 0.25, y: 0.24 }, { x: 0.375, y: 0.24 }, { x: 0.5, y: 0.24 }, { x: 0.625, y: 0.24 }, { x: 0.75, y: 0.24 },
  { x: 0.25, y: 0.405 }, { x: 0.375, y: 0.405 }, { x: 0.5, y: 0.405 }, { x: 0.625, y: 0.405 }, { x: 0.75, y: 0.405 },
  { x: 0.25, y: 0.57 }, { x: 0.375, y: 0.57 }, { x: 0.5, y: 0.57 }, { x: 0.625, y: 0.57 }, { x: 0.75, y: 0.57 },
  { x: 0.25, y: 0.735 }, { x: 0.375, y: 0.735 }, { x: 0.5, y: 0.735 }, { x: 0.625, y: 0.735 }, { x: 0.75, y: 0.735 },
  { x: 0.375, y: 0.84 }, { x: 0.625, y: 0.84 },
] as const;

const edgeDefinitions: Array<{
  id: CycleEdgeId;
  from: CycleNodeId;
  to: CycleNodeId;
  sign: 1 | -1;
}> = [
  { id: "demand-to-production", from: "household-demand", to: "production", sign: 1 },
  { id: "production-to-inventories", from: "production", to: "inventories", sign: 1 },
  { id: "demand-to-inventories", from: "household-demand", to: "inventories", sign: -1 },
  { id: "inventories-to-production", from: "inventories", to: "production", sign: -1 },
  { id: "production-to-employment", from: "production", to: "employment", sign: 1 },
  { id: "employment-to-wage-share", from: "employment", to: "wage-share", sign: 1 },
  { id: "employment-to-demand", from: "employment", to: "household-demand", sign: 1 },
  { id: "wage-share-to-demand", from: "wage-share", to: "household-demand", sign: 1 },
  { id: "wage-share-to-investment", from: "wage-share", to: "investment", sign: -1 },
  { id: "production-to-investment", from: "production", to: "investment", sign: 1 },
  { id: "credit-to-investment", from: "credit", to: "investment", sign: 1 },
  { id: "production-to-credit", from: "production", to: "credit", sign: 1 },
  { id: "credit-to-demand", from: "credit", to: "household-demand", sign: 1 },
  { id: "investment-to-production", from: "investment", to: "production", sign: 1 },
  { id: "investment-to-employment", from: "investment", to: "employment", sign: 1 },
  { id: "demand-to-inflation", from: "household-demand", to: "inflation", sign: 1 },
  { id: "wage-share-to-inflation", from: "wage-share", to: "inflation", sign: 1 },
  { id: "inflation-to-demand", from: "inflation", to: "household-demand", sign: -1 },
  { id: "inflation-to-policy-rate", from: "inflation", to: "policy-rate", sign: 1 },
  { id: "production-to-policy-rate", from: "production", to: "policy-rate", sign: 1 },
  { id: "policy-rate-to-credit", from: "policy-rate", to: "credit", sign: -1 },
  { id: "policy-rate-to-investment", from: "policy-rate", to: "investment", sign: -1 },
];

export const cycleEdges = edgeDefinitions.map((edge, index) => ({
  ...edge,
  controlAt: controlSlots[index],
}));

export function getCycleNode(nodeId: CycleNodeId) {
  return cycleNodes.find(({ id }) => id === nodeId)!;
}

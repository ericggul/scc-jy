import type { NetworkSystemScreenId } from "@/components/network-system/experiments";

export const cycleNodeIds = [
  "household-demand",
  "production",
  "inventories",
  "employment",
  "wage-share",
  "investment",
  "credit",
  "inflation",
  "policy-rate",
] as const;

export type CycleNodeId = (typeof cycleNodeIds)[number];

export const cycleEdgeIds = [
  "demand-to-production",
  "production-to-inventories",
  "demand-to-inventories",
  "inventories-to-production",
  "production-to-employment",
  "employment-to-wage-share",
  "employment-to-demand",
  "wage-share-to-demand",
  "wage-share-to-investment",
  "production-to-investment",
  "credit-to-investment",
  "production-to-credit",
  "credit-to-demand",
  "investment-to-production",
  "investment-to-employment",
  "demand-to-inflation",
  "wage-share-to-inflation",
  "inflation-to-demand",
  "inflation-to-policy-rate",
  "production-to-policy-rate",
  "policy-rate-to-credit",
  "policy-rate-to-investment",
] as const;

export type CycleEdgeId = (typeof cycleEdgeIds)[number];

export type CycleIntervention =
  | {
      kind: "node-shock";
      nodeId: CycleNodeId;
      amount: number;
      appliedAt: number;
    }
  | {
      kind: "edge-weight";
      edgeId: CycleEdgeId;
      amount: number;
      appliedAt: number;
    };

export type CycleSnapshot = {
  runId: string;
  revision: number;
  serverTime: number;
  values: Record<CycleNodeId, number>;
  history: Record<CycleNodeId, number[]>;
  edgeWeights: Record<CycleEdgeId, number>;
  edgeFlows: Record<CycleEdgeId, number>;
  outputLevel: number;
  gdpGrowth: number;
  lastIntervention: CycleIntervention | null;
};

export const cycleNodeLabels: Record<CycleNodeId, string> = {
  "household-demand": "HOUSEHOLD DEMAND",
  production: "PRODUCTION",
  inventories: "INVENTORIES",
  employment: "EMPLOYMENT",
  "wage-share": "WAGE SHARE",
  investment: "INVESTMENT",
  credit: "CREDIT",
  inflation: "INFLATION",
  "policy-rate": "POLICY RATE",
};

export const cycleScreenNodeMap: Record<NetworkSystemScreenId, CycleNodeId> = {
  "1": "household-demand",
  "2": "production",
  "3": "credit",
  "4": "inflation",
};

const initialValues: Record<CycleNodeId, number> = {
  "household-demand": 0.12,
  production: 0.08,
  inventories: -0.04,
  employment: 0.03,
  "wage-share": 0.01,
  investment: 0.04,
  credit: 0.08,
  inflation: 0.01,
  "policy-rate": 0,
};

const initialEdgeWeights = {
  ...Object.fromEntries(cycleEdgeIds.map((edgeId) => [edgeId, 1])),
  "demand-to-production": 1.15,
  "production-to-inventories": 0.95,
  "demand-to-inventories": 1.67,
  "inventories-to-production": 1.05,
  "employment-to-wage-share": 2.48,
  "wage-share-to-investment": 1.36,
  "wage-share-to-inflation": 2.47,
  "inflation-to-demand": 1.67,
  "inflation-to-policy-rate": 1.23,
  "policy-rate-to-investment": 1.93,
} as Record<CycleEdgeId, number>;

export function createInitialCycleSnapshot(): CycleSnapshot {
  return {
    runId: "local-initial",
    revision: 0,
    serverTime: 0,
    values: { ...initialValues },
    history: Object.fromEntries(
      cycleNodeIds.map((nodeId) => [
        nodeId,
        Array.from({ length: 96 }, () => initialValues[nodeId]),
      ]),
    ) as Record<CycleNodeId, number[]>,
    edgeWeights: { ...initialEdgeWeights },
    edgeFlows: Object.fromEntries(
      cycleEdgeIds.map((edgeId) => [edgeId, 0]),
    ) as Record<CycleEdgeId, number>,
    outputLevel: 100 * Math.exp(0.08 * initialValues.production),
    gdpGrowth: 0,
    lastIntervention: null,
  };
}

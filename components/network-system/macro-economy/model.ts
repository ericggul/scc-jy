import type { NetworkSystemScreenId } from "@/components/network-system/experiments";

export const institutionIds = [
  "central-bank",
  "treasury",
  "banks",
  "private-economy",
] as const;

export type InstitutionId = (typeof institutionIds)[number];

export const edgeIds = [
  "central-bank-to-treasury",
  "treasury-to-central-bank",
  "central-bank-to-banks",
  "banks-to-central-bank",
  "central-bank-to-private-economy",
  "private-economy-to-central-bank",
  "treasury-to-banks",
  "banks-to-treasury",
  "treasury-to-private-economy",
  "private-economy-to-treasury",
  "banks-to-private-economy",
  "private-economy-to-banks",
] as const;

export type SystemEdgeId = (typeof edgeIds)[number];
export type SystemValues = Record<InstitutionId, number>;
export type SystemHistory = Record<InstitutionId, number[]>;

export type NodeShockIntervention = {
  kind: "node-shock";
  institutionId: InstitutionId;
  amount: number;
  appliedAt: number;
};

export type EdgeWeightIntervention = {
  kind: "edge-weight";
  edgeId: SystemEdgeId;
  amount: number;
  appliedAt: number;
};

export type SystemIntervention =
  | NodeShockIntervention
  | EdgeWeightIntervention;

export type NetworkSystemSnapshot = {
  runId: string;
  revision: number;
  serverTime: number;
  values: SystemValues;
  history: SystemHistory;
  edgeWeights: Record<SystemEdgeId, number>;
  edgeFlows: Record<SystemEdgeId, number>;
  lastIntervention: SystemIntervention | null;
};

export const screenInstitutionMap: Record<
  NetworkSystemScreenId,
  InstitutionId
> = {
  "1": "central-bank",
  "2": "treasury",
  "3": "banks",
  "4": "private-economy",
};

export const institutionScreenMap: Record<
  InstitutionId,
  NetworkSystemScreenId
> = {
  "central-bank": "1",
  treasury: "2",
  banks: "3",
  "private-economy": "4",
};

export const initialSystemValues: SystemValues = {
  "central-bank": 0.15,
  treasury: 0.12,
  banks: 0.18,
  "private-economy": 0.16,
};

export function createInitialSystemSnapshot(): NetworkSystemSnapshot {
  return {
    runId: "local-initial",
    revision: 0,
    serverTime: 0,
    values: { ...initialSystemValues },
    history: Object.fromEntries(
      institutionIds.map((institutionId) => [
        institutionId,
        Array.from({ length: 48 }, () => initialSystemValues[institutionId]),
      ]),
    ) as SystemHistory,
    edgeWeights: Object.fromEntries(
      edgeIds.map((edgeId) => [edgeId, 1]),
    ) as Record<SystemEdgeId, number>,
    edgeFlows: Object.fromEntries(
      edgeIds.map((edgeId) => [edgeId, 0]),
    ) as Record<SystemEdgeId, number>,
    lastIntervention: null,
  };
}

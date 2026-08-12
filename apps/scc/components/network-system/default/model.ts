import type { NetworkSystemScreenId } from "@/components/network-system/experiments";

export const markovNodeIds = ["1", "2", "3", "4"] as const;
export type MarkovNodeId = (typeof markovNodeIds)[number];
export type MarkovEdgeId = `${MarkovNodeId}-${MarkovNodeId}`;

export type MarkovValues = Record<MarkovNodeId, number>;
export type MarkovWeights = Record<MarkovEdgeId, number>;

export type MarkovSnapshot = {
  revision: number;
  serverTime: number;
  values: MarkovValues;
  weights: MarkovWeights;
};

export type MarkovIntervention =
  | { kind: "seed"; nodeId: MarkovNodeId }
  | { kind: "weight"; edgeId: MarkovEdgeId; amount: number };

export const markovEdgeIds = markovNodeIds.flatMap((from) =>
  markovNodeIds.map((to) => `${from}-${to}` as MarkovEdgeId),
);

export const screenNodeMap: Record<NetworkSystemScreenId, MarkovNodeId> = {
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
};

const initialWeightRows = [
  [0.58, 0.24, 0.12, 0.06],
  [0.08, 0.58, 0.24, 0.1],
  [0.1, 0.08, 0.58, 0.24],
  [0.24, 0.12, 0.06, 0.58],
] as const;

export function createInitialMarkovSnapshot(): MarkovSnapshot {
  return {
    revision: 0,
    serverTime: 0,
    values: { "1": 1, "2": 0, "3": 0, "4": 0 },
    weights: Object.fromEntries(markovEdgeIds.map((edgeId) => {
      const [from, to] = edgeId.split("-") as [MarkovNodeId, MarkovNodeId];
      return [edgeId, initialWeightRows[Number(from) - 1][Number(to) - 1]];
    })) as MarkovWeights,
  };
}

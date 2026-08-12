import type { NetworkSystemScreenId } from "@/components/network-system/experiments";

export const populationStateIds = ["juvenile", "single", "partnered", "deceased"] as const;
export type PopulationStateId = (typeof populationStateIds)[number];

export const populationEdgeIds = [
  "juvenile-to-single",
  "juvenile-to-deceased",
  "single-to-partnered",
  "single-to-deceased",
  "partnered-to-single",
  "partnered-to-deceased",
  "partnered-to-juvenile",
] as const;
export type PopulationEdgeId = (typeof populationEdgeIds)[number];

export const populationParameterIds = [
  "adulthoodAge",
  "juvenileMortalityMultiplier",
  "singleMortalityMultiplier",
  "partneredMortalityMultiplier",
  "unionMultiplier",
  "separationMultiplier",
  "birthsPerHundredCoupleYears",
] as const;
export type PopulationParameterId = (typeof populationParameterIds)[number];

export type PopulationParameters = Record<PopulationParameterId, number>;
export type PopulationCounts = Record<PopulationStateId, number>;
export type PopulationCohorts = Record<"juvenile" | "single" | "partnered", number[]>;

export type PopulationSnapshot = {
  runId: string;
  revision: number;
  serverTime: number;
  year: number;
  parameters: PopulationParameters;
  counts: PopulationCounts;
  livingPopulation: number;
  cohorts: PopulationCohorts;
  edgeFlows: Record<PopulationEdgeId, number>;
  lastIntervention: (PopulationIntervention & { appliedAt: number }) | null;
};

export type PopulationIntervention =
  | { kind: "population"; state: PopulationStateId; amount: number }
  | { kind: "parameter"; parameter: PopulationParameterId; amount: number };

export const defaultPopulationParameters: PopulationParameters = {
  adulthoodAge: 18,
  juvenileMortalityMultiplier: 1,
  singleMortalityMultiplier: 1,
  partneredMortalityMultiplier: 1,
  unionMultiplier: 1,
  separationMultiplier: 1,
  birthsPerHundredCoupleYears: 8,
};

export const screenPopulationStateMap: Record<NetworkSystemScreenId, PopulationStateId> = {
  "1": "juvenile",
  "2": "single",
  "3": "deceased",
  "4": "partnered",
};

export function createInitialPopulationSnapshot(): PopulationSnapshot {
  const zeroCohorts = () => Array.from({ length: 111 }, () => 0);
  const juvenile = zeroCohorts();
  const single = zeroCohorts();
  const partnered = zeroCohorts();
  for (let index = 0; index < 36; index += 1) juvenile[index % 18] += 1;
  for (let index = 0; index < 68; index += 1) single[18 + (index % 47)] += 1;
  for (let index = 0; index < 96; index += 1) partnered[22 + (index % 59)] += 1;
  return {
    runId: "local-initial",
    revision: 0,
    serverTime: 0,
    year: 0,
    parameters: { ...defaultPopulationParameters },
    counts: { juvenile: 36, single: 68, partnered: 96, deceased: 0 },
    livingPopulation: 200,
    cohorts: { juvenile, single, partnered },
    edgeFlows: Object.fromEntries(populationEdgeIds.map((edgeId) => [edgeId, 0])) as Record<PopulationEdgeId, number>,
    lastIntervention: null,
  };
}

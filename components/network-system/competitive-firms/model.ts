import type { NetworkSystemScreenId } from "@/components/network-system/experiments";

export const firmIds = ["1", "2", "3", "4"] as const;
export type FirmId = (typeof firmIds)[number];
export const variableIds = ["product", "price", "capacity", "capital"] as const;
export type FirmVariableId = (typeof variableIds)[number];
export type CompetitionEdgeId = `${FirmId}-to-${FirmId}`;
export const internalEdgeIds = [
  "capital-to-product", "product-to-capital", "product-to-price",
  "capital-to-capacity", "capacity-to-price", "capacity-to-capital", "price-to-capital",
] as const;
export type InternalEdgeId = (typeof internalEdgeIds)[number];
export type MarketSharePoint = { id: string; time: number; value: number };
export type FirmState = Record<FirmVariableId, number>;
export type CompetitiveFirmsIntervention = {
  kind: "management";
  firmId: FirmId;
  variableId: FirmVariableId;
  amount: number;
  appliedAt: number;
};
export type CompetitiveFirmsSnapshot = {
  runId: string; revision: number; serverTime: number;
  marketShares: Record<FirmId, number>;
  firms: Record<FirmId, FirmState>;
  managementPolicies: Record<FirmId, FirmState>;
  debts: Record<FirmId, number>;
  utilities: Record<FirmId, number>;
  demand: Record<FirmId, number>;
  availability: Record<FirmId, number>;
  sales: Record<FirmId, number>;
  competitionFlows: Record<CompetitionEdgeId, number>;
  internalFlows: Record<FirmId, Record<InternalEdgeId, number>>;
  marketShareHistory: Record<FirmId, MarketSharePoint[]>;
  lastIntervention: CompetitiveFirmsIntervention | null;
};
export const competitionEdgeIds = firmIds.flatMap((from) =>
  firmIds.filter((to) => to !== from).map((to) => `${from}-to-${to}` as CompetitionEdgeId),
);
export const screenFirmMap: Record<NetworkSystemScreenId, FirmId> = { "1": "1", "2": "2", "3": "3", "4": "4" };
const initialFirms: Record<FirmId, FirmState> = {
  "1": { product: 0.58, price: 1.02, capacity: 1, capital: 0.62 },
  "2": { product: 0.54, price: 0.94, capacity: 1.08, capital: 0.56 },
  "3": { product: 0.62, price: 1.1, capacity: 0.92, capital: 0.7 },
  "4": { product: 0.5, price: 0.88, capacity: 1.16, capital: 0.5 },
};
const initialPolicies: Record<FirmId, FirmState> = {
  "1": { product: 0.13, price: 1.02, capacity: 1, capital: 0.45 },
  "2": { product: 0.11, price: 0.94, capacity: 1.08, capital: 0.35 },
  "3": { product: 0.15, price: 1.1, capacity: 0.92, capital: 0.55 },
  "4": { product: 0.09, price: 0.88, capacity: 1.16, capital: 0.25 },
};
export function createInitialCompetitiveFirmsSnapshot(): CompetitiveFirmsSnapshot {
  const flows = Object.fromEntries(competitionEdgeIds.map((id) => [id, 0])) as Record<CompetitionEdgeId, number>;
  const inner = Object.fromEntries(firmIds.map((id) => [id, Object.fromEntries(internalEdgeIds.map((edge) => [edge, 0]))])) as Record<FirmId, Record<InternalEdgeId, number>>;
  return {
    runId: "local-initial", revision: 0, serverTime: 0,
    marketShares: { "1": .25, "2": .25, "3": .25, "4": .25 },
    firms: structuredClone(initialFirms), managementPolicies: structuredClone(initialPolicies),
    debts: { "1": .24, "2": .24, "3": .24, "4": .24 }, utilities: { "1": 0, "2": 0, "3": 0, "4": 0 },
    demand: { "1": 1, "2": 1, "3": 1, "4": 1 }, availability: { "1": 1, "2": 1, "3": 1, "4": 1 },
    sales: { "1": 0, "2": 0, "3": 0, "4": 0 }, competitionFlows: flows, internalFlows: inner,
    marketShareHistory: Object.fromEntries(firmIds.map((id) => [id, Array.from({ length: 48 }, (_, index) => ({ id: `local-${id}-${index}`, time: index - 47, value: .25 }))])) as Record<FirmId, MarketSharePoint[]>,
    lastIntervention: null,
  };
}

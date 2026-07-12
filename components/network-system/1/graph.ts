import type {
  InstitutionId,
  SystemEdgeId,
} from "@/components/network-system/1/model";
import type { NetworkSystemScreenId } from "@/components/network-system/experiments";

export type InstitutionalNode = {
  id: InstitutionId;
  screenId: NetworkSystemScreenId;
  shortLabel: string;
  label: string;
  x: number;
  y: number;
};

export type InstitutionalEdge = {
  id: SystemEdgeId;
  connectionId: string;
  from: InstitutionId;
  to: InstitutionId;
  coefficient: number;
};

export type InstitutionalConnection = {
  id: string;
  label: string;
  controlsAt: { x: number; y: number };
  edgeIds: readonly [SystemEdgeId, SystemEdgeId];
};

export const institutionalNodes: InstitutionalNode[] = [
  {
    id: "central-bank",
    screenId: "1",
    shortLabel: "CB",
    label: "CENTRAL BANK",
    x: 0.3,
    y: 0.3,
  },
  {
    id: "treasury",
    screenId: "2",
    shortLabel: "TR",
    label: "TREASURY",
    x: 0.7,
    y: 0.3,
  },
  {
    id: "banks",
    screenId: "3",
    shortLabel: "BK",
    label: "BANKS",
    x: 0.3,
    y: 0.7,
  },
  {
    id: "private-economy",
    screenId: "4",
    shortLabel: "PE",
    label: "PRIVATE ECONOMY",
    x: 0.7,
    y: 0.7,
  },
];

export const institutionalEdges: InstitutionalEdge[] = [
  { id: "central-bank-to-treasury", connectionId: "central-bank-treasury", from: "central-bank", to: "treasury", coefficient: -0.38 },
  { id: "treasury-to-central-bank", connectionId: "central-bank-treasury", from: "treasury", to: "central-bank", coefficient: 0.3 },
  { id: "central-bank-to-banks", connectionId: "central-bank-banks", from: "central-bank", to: "banks", coefficient: -0.62 },
  { id: "banks-to-central-bank", connectionId: "central-bank-banks", from: "banks", to: "central-bank", coefficient: 0.18 },
  { id: "central-bank-to-private-economy", connectionId: "central-bank-private-economy", from: "central-bank", to: "private-economy", coefficient: -0.42 },
  { id: "private-economy-to-central-bank", connectionId: "central-bank-private-economy", from: "private-economy", to: "central-bank", coefficient: 0.48 },
  { id: "treasury-to-banks", connectionId: "treasury-banks", from: "treasury", to: "banks", coefficient: 0.22 },
  { id: "banks-to-treasury", connectionId: "treasury-banks", from: "banks", to: "treasury", coefficient: 0.12 },
  { id: "treasury-to-private-economy", connectionId: "treasury-private-economy", from: "treasury", to: "private-economy", coefficient: 0.58 },
  { id: "private-economy-to-treasury", connectionId: "treasury-private-economy", from: "private-economy", to: "treasury", coefficient: -0.3 },
  { id: "banks-to-private-economy", connectionId: "banks-private-economy", from: "banks", to: "private-economy", coefficient: 0.65 },
  { id: "private-economy-to-banks", connectionId: "banks-private-economy", from: "private-economy", to: "banks", coefficient: 0.34 },
];

export const institutionalConnections: InstitutionalConnection[] = [
  {
    id: "central-bank-treasury",
    label: "STANCE / FISCAL",
    controlsAt: { x: 0.5, y: 0.18 },
    edgeIds: ["central-bank-to-treasury", "treasury-to-central-bank"],
  },
  {
    id: "central-bank-banks",
    label: "TRANSMISSION",
    controlsAt: { x: 0.15, y: 0.5 },
    edgeIds: ["central-bank-to-banks", "banks-to-central-bank"],
  },
  {
    id: "central-bank-private-economy",
    label: "PRICE SIGNAL",
    controlsAt: { x: 0.61, y: 0.47 },
    edgeIds: [
      "central-bank-to-private-economy",
      "private-economy-to-central-bank",
    ],
  },
  {
    id: "treasury-banks",
    label: "FUNDING",
    controlsAt: { x: 0.39, y: 0.53 },
    edgeIds: ["treasury-to-banks", "banks-to-treasury"],
  },
  {
    id: "treasury-private-economy",
    label: "FISCAL FLOW",
    controlsAt: { x: 0.85, y: 0.5 },
    edgeIds: [
      "treasury-to-private-economy",
      "private-economy-to-treasury",
    ],
  },
  {
    id: "banks-private-economy",
    label: "CREDIT",
    controlsAt: { x: 0.5, y: 0.82 },
    edgeIds: ["banks-to-private-economy", "private-economy-to-banks"],
  },
];

export function getInstitutionalNode(id: InstitutionId) {
  return institutionalNodes.find((node) => node.id === id);
}

export function getInstitutionalEdge(id: SystemEdgeId) {
  return institutionalEdges.find((edge) => edge.id === id);
}

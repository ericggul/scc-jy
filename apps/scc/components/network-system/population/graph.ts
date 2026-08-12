import type { PopulationEdgeId, PopulationParameterId, PopulationStateId } from "./model";

export type PopulationNode = {
  id: PopulationStateId;
  label: string;
  shortLabel: string;
  x: number;
  y: number;
};

export type PopulationEdge = {
  id: PopulationEdgeId;
  from: PopulationStateId;
  to: PopulationStateId;
  parameter: PopulationParameterId;
  label: string;
  path: string;
  control: { x: number; y: number };
  step: number;
  generative?: boolean;
};

export const populationNodes: PopulationNode[] = [
  { id: "juvenile", label: "미성년", shortLabel: "J", x: 0.26, y: 0.25 },
  { id: "single", label: "비혼", shortLabel: "S", x: 0.74, y: 0.25 },
  { id: "deceased", label: "사망", shortLabel: "D", x: 0.26, y: 0.75 },
  { id: "partnered", label: "결합", shortLabel: "P", x: 0.74, y: 0.75 },
];

export const populationEdges: PopulationEdge[] = [
  {
    id: "juvenile-to-single",
    from: "juvenile",
    to: "single",
    parameter: "adulthoodAge",
    label: "성년",
    path: "M .34 .25 L .66 .25",
    control: { x: 0.5, y: 0.16 },
    step: 1,
  },
  {
    id: "juvenile-to-deceased",
    from: "juvenile",
    to: "deceased",
    parameter: "juvenileMortalityMultiplier",
    label: "미성년 사망",
    path: "M .26 .34 L .26 .66",
    control: { x: 0.12, y: 0.5 },
    step: 0.25,
  },
  {
    id: "single-to-partnered",
    from: "single",
    to: "partnered",
    parameter: "unionMultiplier",
    label: "결합",
    path: "M .77 .34 C .84 .44 .84 .56 .77 .66",
    control: { x: 0.89, y: 0.43 },
    step: 0.1,
  },
  {
    id: "single-to-deceased",
    from: "single",
    to: "deceased",
    parameter: "singleMortalityMultiplier",
    label: "비혼 사망",
    path: "M .67 .31 Q .48 .49 .33 .68",
    control: { x: 0.39, y: 0.43 },
    step: 0.25,
  },
  {
    id: "partnered-to-single",
    from: "partnered",
    to: "single",
    parameter: "separationMultiplier",
    label: "이별",
    path: "M .71 .66 C .64 .56 .64 .44 .71 .34",
    control: { x: 0.62, y: 0.56 },
    step: 0.1,
  },
  {
    id: "partnered-to-deceased",
    from: "partnered",
    to: "deceased",
    parameter: "partneredMortalityMultiplier",
    label: "결합 사망",
    path: "M .66 .75 L .34 .75",
    control: { x: 0.5, y: 0.84 },
    step: 0.25,
  },
  {
    id: "partnered-to-juvenile",
    from: "partnered",
    to: "juvenile",
    parameter: "birthsPerHundredCoupleYears",
    label: "출산",
    path: "M .68 .68 Q .57 .47 .32 .32",
    control: { x: 0.58, y: 0.65 },
    step: 1,
    generative: true,
  },
];

export function formatPopulationParameter(parameter: PopulationParameterId, value: number) {
  if (parameter === "adulthoodAge") return `${Math.round(value)}년`;
  if (parameter === "birthsPerHundredCoupleYears") return value.toFixed(0);
  return `${value.toFixed(2)}×`;
}


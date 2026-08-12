import type { MarkovEdgeId, MarkovNodeId } from "./model";
import { markovEdgeIds } from "./model";

export type MarkovNode = { id: MarkovNodeId; x: number; y: number };
export type MarkovEdge = {
  id: MarkovEdgeId;
  from: MarkovNodeId;
  to: MarkovNodeId;
};

export const markovNodes: MarkovNode[] = [
  { id: "1", x: 0.27, y: 0.27 },
  { id: "2", x: 0.73, y: 0.27 },
  { id: "3", x: 0.27, y: 0.73 },
  { id: "4", x: 0.73, y: 0.73 },
];

export const markovEdges: MarkovEdge[] = markovEdgeIds.map((id) => {
  const [from, to] = id.split("-") as [MarkovNodeId, MarkovNodeId];
  return { id, from, to };
});

export function getMarkovNode(id: MarkovNodeId) {
  return markovNodes.find((node) => node.id === id)!;
}

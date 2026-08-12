import type { DjScreenId } from "@/components/dj/experiments";

export type DjNode = {
  id: DjScreenId;
  x: number;
  y: number;
};

export type DjEdge = {
  id: `${DjScreenId}-${DjScreenId}`;
  from: DjScreenId;
  to: DjScreenId;
};

export type DjHitTarget =
  | {
      source: "node";
      nodeId: DjScreenId;
    }
  | {
      source: "edge";
      edgeId: DjEdge["id"];
    };

export const djNodes: DjNode[] = [
  { id: "1", x: 0.3, y: 0.3 },
  { id: "2", x: 0.7, y: 0.3 },
  { id: "3", x: 0.3, y: 0.7 },
  { id: "4", x: 0.7, y: 0.7 },
];

export const djEdges: DjEdge[] = [
  { id: "1-2", from: "1", to: "2" },
  { id: "1-3", from: "1", to: "3" },
  { id: "1-4", from: "1", to: "4" },
  { id: "2-3", from: "2", to: "3" },
  { id: "2-4", from: "2", to: "4" },
  { id: "3-4", from: "3", to: "4" },
];

const nodeHitRadius = 0.105;
export function getDjNode(id: DjScreenId) {
  return djNodes.find((node) => node.id === id);
}

export function resolveDjHitTarget(x: number, y: number): DjHitTarget | null {
  const node = djNodes.find(
    (candidate) => Math.hypot(x - candidate.x, y - candidate.y) <= nodeHitRadius,
  );

  if (node) {
    return {
      source: "node",
      nodeId: node.id,
    };
  }

  return null;
}

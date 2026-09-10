export type ErdosRenyiNode = {
  readonly id: number;
};

export type ErdosRenyiEdge = {
  readonly id: string;
  readonly source: number;
  readonly target: number;
};

export type ErdosRenyiGraph = {
  readonly nodes: readonly ErdosRenyiNode[];
  readonly edges: readonly ErdosRenyiEdge[];
  readonly probability: number;
  readonly randomState: number;
};

export type ErdosRenyiOptions = {
  readonly nodeCount?: number;
  readonly probability?: number;
  readonly seed?: number;
};

export type ErdosRenyiMetrics = {
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly meanDegree: number;
  readonly isolatedCount: number;
  readonly largestComponentSize: number;
  readonly componentByNode: readonly number[];
  readonly componentSizes: readonly number[];
};

export const DEFAULT_NODE_COUNT = 192;
export const DEFAULT_PROBABILITY = 0.012;

function nextUnit(state: number) {
  const nextState = (state + 0x6d2b79f5) >>> 0;
  let mixed = nextState;
  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
  return {
    state: nextState,
    value: ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296,
  };
}

function assertOptions(nodeCount: number, probability: number) {
  if (!Number.isInteger(nodeCount) || nodeCount < 1) {
    throw new Error("An Erdős–Rényi graph needs at least one vertex.");
  }
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    throw new Error("The edge probability must be between zero and one.");
  }
}

/**
 * G(n,p): every unordered pair is independently retained with probability p.
 * The model deliberately has no age, degree preference, or spatial state.
 */
export function createErdosRenyiGraph(
  options: ErdosRenyiOptions = {},
): ErdosRenyiGraph {
  const nodeCount = options.nodeCount ?? DEFAULT_NODE_COUNT;
  const probability = options.probability ?? DEFAULT_PROBABILITY;
  assertOptions(nodeCount, probability);

  const nodes = Array.from({ length: nodeCount }, (_, id) => ({ id }));
  const edges: ErdosRenyiEdge[] = [];
  let randomState = options.seed ?? 0x2a3e9b17;

  for (let source = 0; source < nodeCount; source += 1) {
    for (let target = source + 1; target < nodeCount; target += 1) {
      const draw = nextUnit(randomState);
      randomState = draw.state;
      if (draw.value >= probability) continue;
      edges.push({ source, target, id: `${source}:${target}` });
    }
  }

  return { nodes, edges, probability, randomState };
}

export function erdosRenyiMetrics(graph: ErdosRenyiGraph): ErdosRenyiMetrics {
  const adjacency = Array.from({ length: graph.nodes.length }, () => [] as number[]);
  for (const edge of graph.edges) {
    adjacency[edge.source]!.push(edge.target);
    adjacency[edge.target]!.push(edge.source);
  }

  const componentByNode = Array(graph.nodes.length).fill(-1);
  const componentSizes: number[] = [];

  for (const node of graph.nodes) {
    if (componentByNode[node.id] !== -1) continue;
    const componentId = componentSizes.length;
    const queue = [node.id];
    componentByNode[node.id] = componentId;
    let size = 0;

    while (queue.length > 0) {
      const current = queue.pop()!;
      size += 1;
      for (const neighbour of adjacency[current]!) {
        if (componentByNode[neighbour] !== -1) continue;
        componentByNode[neighbour] = componentId;
        queue.push(neighbour);
      }
    }
    componentSizes.push(size);
  }

  const degreeSum = adjacency.reduce((total, neighbours) => total + neighbours.length, 0);
  return {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    meanDegree: degreeSum / graph.nodes.length,
    isolatedCount: adjacency.filter((neighbours) => neighbours.length === 0).length,
    largestComponentSize: Math.max(...componentSizes),
    componentByNode,
    componentSizes,
  };
}

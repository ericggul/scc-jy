export type BarabasiAlbertNode = {
  readonly id: number;
  readonly bornAt: number;
};

export type BarabasiAlbertEdge = {
  /** Older endpoint. Edges are undirected when rendered. */
  readonly source: number;
  /** The newcomer that created this edge. */
  readonly target: number;
  readonly id: string;
};

export type BarabasiAlbertGraph = {
  readonly nodes: readonly BarabasiAlbertNode[];
  readonly edges: readonly BarabasiAlbertEdge[];
  /** Degree by stable node id. */
  readonly degrees: readonly number[];
  readonly attachments: number;
  readonly initialNodeCount: number;
  readonly generation: number;
  readonly randomState: number;
};

export type BarabasiAlbertOptions = {
  /** m₀: a positive-degree seed graph size. The default seed is complete. */
  readonly initialNodeCount?: number;
  /** m: distinct existing vertices selected by every newcomer. */
  readonly attachments?: number;
  readonly seed?: number;
};

export type BarabasiAlbertMetrics = {
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly meanDegree: number;
  readonly maximumDegree: number;
  readonly hubShare: number;
};

export const DEFAULT_INITIAL_NODE_COUNT = 5;
export const DEFAULT_ATTACHMENTS = 2;

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

function edgeId(source: number, target: number) {
  return `${source}:${target}`;
}

function assertValidOptions(initialNodeCount: number, attachments: number) {
  if (!Number.isInteger(initialNodeCount) || initialNodeCount < 2) {
    throw new Error("The initial graph needs at least two vertices.");
  }
  if (!Number.isInteger(attachments) || attachments < 1) {
    throw new Error("Each newcomer needs at least one attachment.");
  }
  if (attachments > initialNodeCount) {
    throw new Error("Attachments per newcomer cannot exceed the initial vertex count.");
  }
}

/**
 * Creates a complete, positive-degree m₀ seed. A complete seed is only a
 * convenient permitted initial topology; later growth follows BA exactly.
 */
export function createBarabasiAlbertGraph(
  options: BarabasiAlbertOptions = {},
): BarabasiAlbertGraph {
  const initialNodeCount =
    options.initialNodeCount ?? DEFAULT_INITIAL_NODE_COUNT;
  const attachments = options.attachments ?? DEFAULT_ATTACHMENTS;
  assertValidOptions(initialNodeCount, attachments);

  const nodes = Array.from({ length: initialNodeCount }, (_, id) => ({
    id,
    bornAt: 0,
  }));
  const edges: BarabasiAlbertEdge[] = [];

  for (let source = 0; source < initialNodeCount; source += 1) {
    for (let target = source + 1; target < initialNodeCount; target += 1) {
      edges.push({ source, target, id: edgeId(source, target) });
    }
  }

  return {
    nodes,
    edges,
    degrees: Array(initialNodeCount).fill(initialNodeCount - 1),
    attachments,
    initialNodeCount,
    generation: 0,
    randomState: options.seed ?? 0x4d595df4,
  };
}

/**
 * Draw one destination from the current candidate set. Removing the chosen
 * vertex before the next draw implements the original model's “m different
 * vertices” constraint without introducing duplicate edges.
 */
function chooseWeightedDestination(
  candidates: readonly number[],
  degrees: readonly number[],
  randomState: number,
) {
  const totalDegree = candidates.reduce(
    (total, id) => total + (degrees[id] ?? 0),
    0,
  );
  if (totalDegree <= 0) {
    throw new Error("A Barabási–Albert seed cannot contain a zero-degree candidate set.");
  }

  const random = nextUnit(randomState);
  const threshold = random.value * totalDegree;
  let cumulative = 0;

  for (const id of candidates) {
    cumulative += degrees[id] ?? 0;
    if (threshold < cumulative) {
      return { id, randomState: random.state };
    }
  }

  return {
    id: candidates[candidates.length - 1]!,
    randomState: random.state,
  };
}

/** Adds one newcomer using degree-proportional sampling without replacement. */
export function growBarabasiAlbertGraph(
  graph: BarabasiAlbertGraph,
): BarabasiAlbertGraph {
  const candidates = graph.nodes.map((node) => node.id);
  const destinations: number[] = [];
  let randomState = graph.randomState;

  for (let attachment = 0; attachment < graph.attachments; attachment += 1) {
    const selection = chooseWeightedDestination(
      candidates,
      graph.degrees,
      randomState,
    );
    randomState = selection.randomState;
    destinations.push(selection.id);
    candidates.splice(candidates.indexOf(selection.id), 1);
  }

  const newcomerId = graph.nodes.length;
  const degrees = [...graph.degrees, graph.attachments];
  const edges = [...graph.edges];

  for (const destination of destinations) {
    degrees[destination] = (degrees[destination] ?? 0) + 1;
    edges.push({
      source: destination,
      target: newcomerId,
      id: edgeId(destination, newcomerId),
    });
  }

  return {
    ...graph,
    nodes: [
      ...graph.nodes,
      { id: newcomerId, bornAt: graph.generation + 1 },
    ],
    edges,
    degrees,
    generation: graph.generation + 1,
    randomState,
  };
}

export function growBarabasiAlbertGraphTo(
  graph: BarabasiAlbertGraph,
  targetNodeCount: number,
) {
  if (!Number.isInteger(targetNodeCount) || targetNodeCount < graph.nodes.length) {
    throw new Error("The target size must be an integer at least as large as the seed.");
  }

  let grown = graph;
  while (grown.nodes.length < targetNodeCount) {
    grown = growBarabasiAlbertGraph(grown);
  }
  return grown;
}

export function barabasiAlbertMetrics(
  graph: BarabasiAlbertGraph,
): BarabasiAlbertMetrics {
  const totalDegree = graph.degrees.reduce((total, degree) => total + degree, 0);
  const maximumDegree = Math.max(...graph.degrees);

  return {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    meanDegree: totalDegree / graph.nodes.length,
    maximumDegree,
    hubShare: maximumDegree / totalDegree,
  };
}

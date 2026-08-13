export type MapPoint = { x: number; y: number };

export type TokyoNetworkNode = {
  id: number;
  point: MapPoint;
  bornAt: number;
  expiresAt: number;
  introduced: boolean;
};

export type TokyoNetworkEdge = {
  id: number;
  source: number;
  target: number;
  bornAt: number;
  expiresAt: number;
  strength: number;
};

export type TokyoNetwork = {
  nodes: TokyoNetworkNode[];
  edges: TokyoNetworkEdge[];
  time: number;
  randomState: number;
  nextNodeId: number;
  nextEdgeId: number;
};

export type TokyoNetworkParameters = {
  nodePersistence: number;
  edgePersistence: number;
  edgeDensity: number;
  minimumDistance: number;
  arrivalRate: number;
};

export const DEFAULT_TOKYO_NETWORK_PARAMETERS: TokyoNetworkParameters = {
  nodePersistence: 1.3,
  edgePersistence: 1,
  edgeDensity: 1.8,
  minimumDistance: 0.18,
  arrivalRate: 2.3,
};

const MINIMUM_NODES = 20;
const TARGET_NODES = 31;
const MAXIMUM_NODES = 42;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function edgeKey(source: number, target: number) {
  return source < target ? `${source}:${target}` : `${target}:${source}`;
}

function nextRandom(randomState: number): [number, number] {
  let next = randomState | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return [unsigned || 0x9e3779b9, unsigned / 0x1_0000_0000];
}

function distance(first: MapPoint, second: MapPoint) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function createNode(
  id: number,
  point: MapPoint,
  time: number,
  randomState: number,
  introduced: boolean,
  parameters: TokyoNetworkParameters,
): [number, TokyoNetworkNode] {
  const [nextRandomState, duration] = nextRandom(randomState);
  return [
    nextRandomState,
    {
      id,
      point,
      bornAt: time,
      expiresAt: time + (3.25 + duration * 6.5) * parameters.nodePersistence,
      introduced,
    },
  ];
}

function createEdge(
  id: number,
  source: number,
  target: number,
  time: number,
  randomState: number,
  parameters: TokyoNetworkParameters,
): [number, TokyoNetworkEdge] {
  const [nextRandomState, duration] = nextRandom(randomState);
  const [strengthState, strength] = nextRandom(nextRandomState);
  return [
    strengthState,
    {
      id,
      source,
      target,
      bornAt: time,
      expiresAt: time + (2.3 + duration * 6) * parameters.edgePersistence,
      strength: 0.24 + strength * 0.52,
    },
  ];
}

function chooseRoadPoint(
  anchors: readonly MapPoint[],
  randomState: number,
): [number, MapPoint] {
  const [nextRandomState, selection] = nextRandom(randomState);
  const point = anchors[Math.floor(selection * anchors.length)] ?? { x: 0.5, y: 0.5 };
  return [nextRandomState, point];
}

function chooseLongRangePair(
  nodes: readonly TokyoNetworkNode[],
  existing: ReadonlySet<string>,
  randomState: number,
  minimumDistance: number,
): [number, [TokyoNetworkNode, TokyoNetworkNode] | null] {
  let state = randomState;

  for (let attempt = 0; attempt < 32; attempt += 1) {
    let sourceValue: number;
    let targetValue: number;
    [state, sourceValue] = nextRandom(state);
    [state, targetValue] = nextRandom(state);
    const source = nodes[Math.floor(sourceValue * nodes.length)];
    const target = nodes[Math.floor(targetValue * nodes.length)];
    if (!source || !target || source.id === target.id) continue;
    if (distance(source.point, target.point) < minimumDistance) continue;
    if (existing.has(edgeKey(source.id, target.id))) continue;
    return [state, [source, target]];
  }

  return [state, null];
}

function addConnections(
  network: TokyoNetwork,
  desiredEdgeCount: number,
  parameters: TokyoNetworkParameters,
): TokyoNetwork {
  let randomState = network.randomState;
  let nextEdgeId = network.nextEdgeId;
  const edges = [...network.edges];
  const existing = new Set(edges.map((edge) => edgeKey(edge.source, edge.target)));

  while (edges.length < desiredEdgeCount) {
    let pair: [TokyoNetworkNode, TokyoNetworkNode] | null;
    [randomState, pair] = chooseLongRangePair(
      network.nodes,
      existing,
      randomState,
      parameters.minimumDistance,
    );
    if (!pair) break;

    const [source, target] = pair;
    let edge: TokyoNetworkEdge;
    [randomState, edge] = createEdge(
      nextEdgeId,
      source.id,
      target.id,
      network.time,
      randomState,
      parameters,
    );
    nextEdgeId += 1;
    existing.add(edgeKey(source.id, target.id));
    edges.push(edge);
  }

  return { ...network, edges, nextEdgeId, randomState };
}

function addRandomNodes(
  network: TokyoNetwork,
  anchors: readonly MapPoint[],
  count: number,
  parameters: TokyoNetworkParameters,
) {
  let randomState = network.randomState;
  let nextNodeId = network.nextNodeId;
  const nodes = [...network.nodes];

  for (let index = 0; index < count; index += 1) {
    let point: MapPoint;
    let node: TokyoNetworkNode;
    [randomState, point] = chooseRoadPoint(anchors, randomState);
    [randomState, node] = createNode(
      nextNodeId,
      point,
      network.time,
      randomState,
      false,
      parameters,
    );
    nextNodeId += 1;
    nodes.push(node);
  }

  return { ...network, nodes, nextNodeId, randomState };
}

function updateStrengths(network: TokyoNetwork) {
  const degree = new Map<number, number>();
  for (const edge of network.edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }

  return {
    ...network,
    edges: network.edges.map((edge) => {
      const sharedDegree =
        (degree.get(edge.source) ?? 0) + (degree.get(edge.target) ?? 0);
      const targetStrength = clamp(0.16 + sharedDegree * 0.09, 0.2, 0.78);
      return {
        ...edge,
        strength: edge.strength + (targetStrength - edge.strength) * 0.17,
      };
    }),
  };
}

export function createTokyoNetwork(
  anchors: readonly MapPoint[],
  seed = 0x72_6f_61_64,
  parameters = DEFAULT_TOKYO_NETWORK_PARAMETERS,
): TokyoNetwork {
  const network = addRandomNodes(
    {
      nodes: [],
      edges: [],
      time: 0,
      randomState: seed,
      nextNodeId: 1,
      nextEdgeId: 1,
    },
    anchors,
    28,
    parameters,
  );
  const settled = {
    ...network,
    nodes: network.nodes.map((node) => ({ ...node, bornAt: -0.5 })),
  };

  return addConnections(settled, 36, parameters);
}

export function stepTokyoNetwork(
  network: TokyoNetwork,
  anchors: readonly MapPoint[],
  deltaSeconds: number,
  parameters = DEFAULT_TOKYO_NETWORK_PARAMETERS,
): TokyoNetwork {
  const time = network.time + deltaSeconds;
  const remainingNodes = network.nodes.filter((node) => node.expiresAt > time);
  const nodeIds = new Set(remainingNodes.map((node) => node.id));
  const remainingEdges = network.edges.filter(
    (edge) =>
      edge.expiresAt > time &&
      nodeIds.has(edge.source) &&
      nodeIds.has(edge.target),
  );
  let next: TokyoNetwork = {
    ...network,
    nodes: remainingNodes,
    edges: remainingEdges,
    time,
  };
  let randomValue: number;
  [next.randomState, randomValue] = nextRandom(next.randomState);

  if (next.nodes.length < MINIMUM_NODES) {
    next = addRandomNodes(next, anchors, 3, parameters);
  } else if (
    next.nodes.length < TARGET_NODES ||
    randomValue < 0.09 + parameters.arrivalRate * 0.12
  ) {
    next = addRandomNodes(
      next,
      anchors,
      parameters.arrivalRate > 2.7 ? 2 : 1,
      parameters,
    );
  }

  if (next.nodes.length > MAXIMUM_NODES) {
    let removalValue: number;
    [next.randomState, removalValue] = nextRandom(next.randomState);
    const removalIndex = Math.floor(removalValue * next.nodes.length);
    const removed = next.nodes[removalIndex];
    if (removed) {
      next = {
        ...next,
        nodes: next.nodes.filter((node) => node.id !== removed.id),
        edges: next.edges.filter(
          (edge) => edge.source !== removed.id && edge.target !== removed.id,
        ),
      };
    }
  }

  const desiredEdgeCount = Math.round(next.nodes.length * parameters.edgeDensity);
  next = addConnections(next, desiredEdgeCount, parameters);
  return updateStrengths(next);
}

export function introduceTokyoNode(
  network: TokyoNetwork,
  point: MapPoint,
  parameters = DEFAULT_TOKYO_NETWORK_PARAMETERS,
) {
  const [randomState, node] = createNode(
    network.nextNodeId,
    point,
    network.time,
    network.randomState,
    true,
    parameters,
  );
  const next: TokyoNetwork = {
    ...network,
    randomState,
    nextNodeId: network.nextNodeId + 1,
    nodes: [...network.nodes, node],
  };

  return addConnections(
    next,
    Math.round(next.nodes.length * parameters.edgeDensity),
    parameters,
  );
}

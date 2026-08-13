export type Point = { x: number; y: number };

export type AdaptiveNode = Point & {
  id: number;
  vx: number;
  vy: number;
  opinion: number;
  susceptibility: number;
};

export type AdaptiveEdge = {
  id: number;
  source: number;
  target: number;
  weight: number;
  age: number;
  discord: number;
};

export type AdaptiveNetwork = {
  nodes: AdaptiveNode[];
  edges: AdaptiveEdge[];
  nextEdgeId: number;
  randomState: number;
  time: number;
  revision: number;
};

export type AdaptiveParameters = {
  confidence: number;
  adaptation: number;
  noise: number;
};

export type AdaptiveMetrics = {
  mean: number;
  polarization: number;
  discordantShare: number;
  components: number;
  assimilations: number;
  rewires: number;
};

export type AdaptiveStep = {
  network: AdaptiveNetwork;
  metrics: AdaptiveMetrics;
};

export const DEFAULT_PARAMETERS: AdaptiveParameters = {
  confidence: 0.42,
  adaptation: 0.68,
  noise: 0.012,
};

const NODE_COUNT = 84;
const MEAN_DEGREE = 5;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function edgeKey(source: number, target: number) {
  return source < target ? `${source}:${target}` : `${target}:${source}`;
}

function nextRandom(state: number): [number, number] {
  let next = state | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return [unsigned || 0x9e3779b9, unsigned / 0x100000000];
}

function randomIndex(value: number, length: number) {
  return Math.min(length - 1, Math.floor(value * length));
}

function calculateComponents(nodes: readonly AdaptiveNode[], edges: readonly AdaptiveEdge[]) {
  const adjacency = new Map(nodes.map((node) => [node.id, [] as number[]]));
  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
    adjacency.get(edge.target)?.push(edge.source);
  }

  const visited = new Set<number>();
  let components = 0;
  for (const node of nodes) {
    if (visited.has(node.id)) continue;
    components += 1;
    const pending = [node.id];
    visited.add(node.id);
    while (pending.length > 0) {
      const current = pending.pop();
      if (current === undefined) continue;
      for (const neighbor of adjacency.get(current) ?? []) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        pending.push(neighbor);
      }
    }
  }
  return components;
}

export function measureNetwork(
  network: AdaptiveNetwork,
  parameters: AdaptiveParameters,
  events = { assimilations: 0, rewires: 0 },
): AdaptiveMetrics {
  const mean = network.nodes.reduce((sum, node) => sum + node.opinion, 0) /
    Math.max(1, network.nodes.length);
  const polarization = Math.sqrt(
    network.nodes.reduce(
      (sum, node) => sum + (node.opinion - mean) ** 2,
      0,
    ) / Math.max(1, network.nodes.length),
  );
  const discordant = network.edges.filter(
    (edge) => edge.discord > parameters.confidence,
  ).length;
  return {
    mean,
    polarization,
    discordantShare: discordant / Math.max(1, network.edges.length),
    components: calculateComponents(network.nodes, network.edges),
    ...events,
  };
}

export function createAdaptiveNetwork(
  width: number,
  height: number,
  seed = 0x6d2b79f5,
): AdaptiveNetwork {
  let randomState = seed >>> 0 || 1;
  const margin = Math.max(34, Math.min(width, height) * 0.07);
  const nodes: AdaptiveNode[] = [];

  for (let index = 0; index < NODE_COUNT; index += 1) {
    let rx: number;
    let ry: number;
    let opinionNoise: number;
    [randomState, rx] = nextRandom(randomState);
    [randomState, ry] = nextRandom(randomState);
    [randomState, opinionNoise] = nextRandom(randomState);
    const broadOpinion = Math.sin(index * 2.399963 + opinionNoise * 1.8) * 0.72;
    nodes.push({
      id: index + 1,
      x: margin + rx * Math.max(1, width - margin * 2),
      y: margin + ry * Math.max(1, height - margin * 2),
      vx: 0,
      vy: 0,
      opinion: clamp(broadOpinion + (opinionNoise - 0.5) * 0.36, -1, 1),
      susceptibility: 0.32 + opinionNoise * 0.52,
    });
  }

  const edges: AdaptiveEdge[] = [];
  const existing = new Set<string>();
  const addEdge = (source: number, target: number) => {
    const key = edgeKey(source, target);
    if (source === target || existing.has(key)) return false;
    existing.add(key);
    const discord = Math.abs(
      nodes[source - 1].opinion - nodes[target - 1].opinion,
    );
    edges.push({
      id: edges.length + 1,
      source,
      target,
      weight: clamp(0.82 - discord * 0.22, 0.24, 0.9),
      age: 0,
      discord,
    });
    return true;
  };

  for (let index = 0; index < NODE_COUNT; index += 1) {
    addEdge(index + 1, ((index + 1) % NODE_COUNT) + 1);
  }
  const targetEdges = Math.round((NODE_COUNT * MEAN_DEGREE) / 2);
  while (edges.length < targetEdges) {
    let sourceValue: number;
    let targetValue: number;
    [randomState, sourceValue] = nextRandom(randomState);
    [randomState, targetValue] = nextRandom(randomState);
    addEdge(
      randomIndex(sourceValue, NODE_COUNT) + 1,
      randomIndex(targetValue, NODE_COUNT) + 1,
    );
  }

  return {
    nodes,
    edges,
    nextEdgeId: edges.length + 1,
    randomState,
    time: 0,
    revision: 0,
  };
}

export function resizeAdaptiveNetwork(
  network: AdaptiveNetwork,
  previous: { width: number; height: number },
  next: { width: number; height: number },
): AdaptiveNetwork {
  if (previous.width === 0 || previous.height === 0) return network;
  return {
    ...network,
    nodes: network.nodes.map((node) => ({
      ...node,
      x: node.x * (next.width / previous.width),
      y: node.y * (next.height / previous.height),
    })),
  };
}

function chooseReplacement(
  node: AdaptiveNode,
  nodes: readonly AdaptiveNode[],
  excluded: ReadonlySet<number>,
  randomState: number,
): { candidate: AdaptiveNode | null; randomState: number } {
  let state = randomState;
  let candidate: AdaptiveNode | null = null;
  let bestScore = Infinity;
  for (let attempt = 0; attempt < 18; attempt += 1) {
    let value: number;
    let tieBreak: number;
    [state, value] = nextRandom(state);
    [state, tieBreak] = nextRandom(state);
    const sampled = nodes[randomIndex(value, nodes.length)];
    if (!sampled || sampled.id === node.id || excluded.has(sampled.id)) continue;
    const score = Math.abs(node.opinion - sampled.opinion) + tieBreak * 0.16;
    if (score < bestScore) {
      bestScore = score;
      candidate = sampled;
    }
  }
  return { candidate, randomState: state };
}

function advanceLayout(
  nodes: readonly AdaptiveNode[],
  edges: readonly AdaptiveEdge[],
  width: number,
  height: number,
  deltaSeconds: number,
) {
  const forces = new Map(nodes.map((node) => [node.id, { x: 0, y: 0 }]));
  const margin = clamp(Math.min(width, height) * 0.075, 28, 74);
  const span = Math.max(1, width - margin * 2);
  const preferredLength = clamp(Math.min(width, height) * 0.085, 46, 92);

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const force = forces.get(node.id)!;
    const opinionX = margin + ((node.opinion + 1) / 2) * span;
    force.x += (opinionX - node.x) * 0.48;
    force.y += (height / 2 - node.y) * 0.018;

    for (let otherIndex = index + 1; otherIndex < nodes.length; otherIndex += 1) {
      const other = nodes[otherIndex];
      const dx = other.x - node.x;
      const dy = other.y - node.y;
      const distanceSquared = Math.max(64, dx * dx + dy * dy);
      if (distanceSquared > 17500) continue;
      const distance = Math.sqrt(distanceSquared);
      const repulsion = 7400 / distanceSquared;
      const fx = (dx / distance) * repulsion;
      const fy = (dy / distance) * repulsion;
      force.x -= fx;
      force.y -= fy;
      const otherForce = forces.get(other.id)!;
      otherForce.x += fx;
      otherForce.y += fy;
    }
  }

  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const edge of edges) {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) continue;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const spring = (distance - preferredLength) * (0.016 + edge.weight * 0.02);
    const fx = (dx / distance) * spring;
    const fy = (dy / distance) * spring;
    forces.get(source.id)!.x += fx;
    forces.get(source.id)!.y += fy;
    forces.get(target.id)!.x -= fx;
    forces.get(target.id)!.y -= fy;
  }

  const damping = Math.pow(0.075, deltaSeconds);
  return nodes.map((node) => {
    const force = forces.get(node.id)!;
    const vx = (node.vx + force.x * deltaSeconds) * damping;
    const vy = (node.vy + force.y * deltaSeconds) * damping;
    return {
      ...node,
      x: clamp(node.x + vx * deltaSeconds, margin, width - margin),
      y: clamp(node.y + vy * deltaSeconds, margin, height - margin),
      vx,
      vy,
    };
  });
}

export function stepAdaptiveNetwork(
  network: AdaptiveNetwork,
  width: number,
  height: number,
  deltaSeconds: number,
  parameters: AdaptiveParameters,
): AdaptiveStep {
  let randomState = network.randomState;
  let nodes = network.nodes.map((node) => ({ ...node }));
  let edges = network.edges.map((edge) => ({ ...edge, age: edge.age + deltaSeconds }));
  const nodeIndex = new Map(nodes.map((node, index) => [node.id, index]));
  const interactions = clamp(
    Math.round(deltaSeconds * nodes.length * 5.4),
    1,
    28,
  );
  let assimilations = 0;
  let rewires = 0;

  for (let interaction = 0; interaction < interactions; interaction += 1) {
    let edgeValue: number;
    [randomState, edgeValue] = nextRandom(randomState);
    const edgeIndex = randomIndex(edgeValue, edges.length);
    const edge = edges[edgeIndex];
    if (!edge) continue;
    const sourceIndex = nodeIndex.get(edge.source);
    const targetIndex = nodeIndex.get(edge.target);
    if (sourceIndex === undefined || targetIndex === undefined) continue;
    const source = nodes[sourceIndex];
    const target = nodes[targetIndex];
    const difference = target.opinion - source.opinion;
    const discord = Math.abs(difference);

    if (discord <= parameters.confidence) {
      const coupling = (0.055 + edge.weight * 0.075);
      const sourceShift = difference * coupling * source.susceptibility;
      const targetShift = -difference * coupling * target.susceptibility;
      nodes[sourceIndex] = {
        ...source,
        opinion: clamp(source.opinion + sourceShift, -1, 1),
      };
      nodes[targetIndex] = {
        ...target,
        opinion: clamp(target.opinion + targetShift, -1, 1),
      };
      edges[edgeIndex] = {
        ...edge,
        weight: clamp(edge.weight + (1 - discord / Math.max(0.01, parameters.confidence)) * 0.018, 0.12, 1),
        discord,
      };
      assimilations += 1;
      continue;
    }

    let decision: number;
    let endpointChoice: number;
    [randomState, decision] = nextRandom(randomState);
    [randomState, endpointChoice] = nextRandom(randomState);
    const pressure = clamp(
      (discord - parameters.confidence) / Math.max(0.01, 2 - parameters.confidence),
      0,
      1,
    );
    if (decision < parameters.adaptation * (0.34 + pressure * 1.8)) {
      const fixed = endpointChoice < 0.5 ? source : target;
      const excluded = new Set<number>([fixed.id]);
      for (const relation of edges) {
        if (relation.source === fixed.id) excluded.add(relation.target);
        if (relation.target === fixed.id) excluded.add(relation.source);
      }
      const replacement = chooseReplacement(
        fixed,
        nodes,
        excluded,
        randomState,
      );
      randomState = replacement.randomState;
      if (replacement.candidate) {
        const replacementDiscord = Math.abs(
          fixed.opinion - replacement.candidate.opinion,
        );
        edges[edgeIndex] = {
          id: network.nextEdgeId + rewires,
          source: fixed.id,
          target: replacement.candidate.id,
          weight: clamp(0.72 - replacementDiscord * 0.18, 0.28, 0.78),
          age: 0,
          discord: replacementDiscord,
        };
        rewires += 1;
        continue;
      }
    }
    edges[edgeIndex] = {
      ...edge,
      weight: clamp(edge.weight - 0.024, 0.12, 1),
      discord,
    };
  }

  const noiseApplications = Math.max(1, Math.round(interactions * 0.22));
  for (let index = 0; index < noiseApplications; index += 1) {
    let nodeValue: number;
    let noiseValue: number;
    [randomState, nodeValue] = nextRandom(randomState);
    [randomState, noiseValue] = nextRandom(randomState);
    const selected = randomIndex(nodeValue, nodes.length);
    const node = nodes[selected];
    nodes[selected] = {
      ...node,
      opinion: clamp(
        node.opinion + (noiseValue - 0.5) * parameters.noise * 2,
        -1,
        1,
      ),
    };
  }

  const opinions = new Map(nodes.map((node) => [node.id, node.opinion]));
  edges = edges.map((edge) => ({
    ...edge,
    discord: Math.abs(
      (opinions.get(edge.source) ?? 0) - (opinions.get(edge.target) ?? 0),
    ),
  }));
  nodes = advanceLayout(nodes, edges, width, height, deltaSeconds);

  const nextNetwork: AdaptiveNetwork = {
    ...network,
    nodes,
    edges,
    nextEdgeId: network.nextEdgeId + rewires,
    randomState,
    time: network.time + deltaSeconds,
    revision: network.revision + 1,
  };
  return {
    network: nextNetwork,
    metrics: measureNetwork(nextNetwork, parameters, { assimilations, rewires }),
  };
}

export function applyOpinionField(
  network: AdaptiveNetwork,
  point: Point,
  targetOpinion: number,
  radius: number,
): AdaptiveNetwork {
  return {
    ...network,
    nodes: network.nodes.map((node) => {
      const distance = Math.hypot(node.x - point.x, node.y - point.y);
      if (distance >= radius) return node;
      const influence = (1 - distance / radius) * 0.34;
      return {
        ...node,
        opinion: clamp(
          node.opinion + (targetOpinion - node.opinion) * influence,
          -1,
          1,
        ),
      };
    }),
  };
}

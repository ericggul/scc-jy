export type Point = { readonly x: number; readonly y: number };

export type LocalNode = Point & {
  id: number;
  vx: number;
  vy: number;
  energy: number;
  age: number;
  metabolism: number;
  birthThreshold: number;
  deathThreshold: number;
  decisionPeriod: number;
  nextDecision: number;
};

export type LocalEdge = {
  id: number;
  source: number;
  target: number;
  affinity: number;
  signal: number;
  age: number;
  lifetime: number;
  decisionPeriod: number;
  nextDecision: number;
};

export type LocalNetwork = {
  nodes: LocalNode[];
  edges: LocalEdge[];
  nextNodeId: number;
  nextEdgeId: number;
  tick: number;
  time: number;
};

export type LocalEventCounts = {
  born: number;
  died: number;
  connected: number;
  severed: number;
};

export type LocalStep = {
  network: LocalNetwork;
  events: LocalEventCounts;
};

export type NetworkParameters = {
  reproduction: number;
  mortality: number;
  connection: number;
  severance: number;
  distantShare: number;
  motion: number;
};

export const DEFAULT_NETWORK_PARAMETERS: NetworkParameters = {
  reproduction: 1.35,
  mortality: 0.42,
  connection: 1.15,
  severance: 0.72,
  distantShare: 0.48,
  motion: 1,
};

const INITIAL_NODES = 260;
const LOCAL_RADIUS = 118;
const CELL_SIZE = LOCAL_RADIUS;

function unit(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function vanDerCorput(index: number, base: number) {
  let value = 0;
  let denominator = 1;
  let remaining = index;
  while (remaining > 0) {
    denominator *= base;
    value += (remaining % base) / denominator;
    remaining = Math.floor(remaining / base);
  }
  return value;
}

function edgeKey(source: number, target: number) {
  return source < target ? `${source}:${target}` : `${target}:${source}`;
}

function makeNode(id: number, x: number, y: number, age = 0): LocalNode {
  return {
    id,
    x,
    y,
    vx: (unit(id * 17.9) - 0.5) * 28,
    vy: (unit(id * 19.3) - 0.5) * 28,
    energy: 0.52 + unit(id * 3.1) * 0.44,
    age,
    metabolism: 0.035 + unit(id * 5.7) * 0.055,
    birthThreshold: 0.7 + unit(id * 7.3) * 0.22,
    deathThreshold: 0.06 + unit(id * 8.9) * 0.16,
    decisionPeriod: 0.07 + unit(id * 11.1) * 0.22,
    nextDecision: unit(id * 13.7) * 0.2,
  };
}

function makeEdge(id: number, source: number, target: number): LocalEdge {
  return {
    id,
    source,
    target,
    affinity: 0.24 + unit(id * 2.9) * 0.7,
    signal: unit(id * 4.3),
    age: 0,
    lifetime: 1.2 + unit(id * 6.1) * 4.8,
    decisionPeriod: 0.05 + unit(id * 9.7) * 0.2,
    nextDecision: unit(id * 12.7) * 0.2,
  };
}

function buildSpatialGrid(nodes: LocalNode[]) {
  const grid = new Map<string, LocalNode[]>();
  for (const node of nodes) {
    const column = Math.floor(node.x / CELL_SIZE);
    const row = Math.floor(node.y / CELL_SIZE);
    const key = `${column}:${row}`;
    const bucket = grid.get(key);
    if (bucket) bucket.push(node);
    else grid.set(key, [node]);
  }
  return grid;
}

function localNodes(node: Point, grid: Map<string, LocalNode[]>) {
  const column = Math.floor(node.x / CELL_SIZE);
  const row = Math.floor(node.y / CELL_SIZE);
  const nearby: LocalNode[] = [];
  for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
    for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
      const bucket = grid.get(`${column + xOffset}:${row + yOffset}`);
      if (bucket) nearby.push(...bucket);
    }
  }
  return nearby;
}

export function createLocalNetwork(width: number, height: number): LocalNetwork {
  const margin = Math.min(width, height) * 0.055;
  const nodes = Array.from({ length: INITIAL_NODES }, (_, index) => {
    const id = index + 1;
    const x = margin + vanDerCorput(id, 2) * Math.max(1, width - margin * 2);
    const y = margin + vanDerCorput(id, 3) * Math.max(1, height - margin * 2);
    return makeNode(id, x, y, unit(id * 17.3) * 4);
  });
  const grid = buildSpatialGrid(nodes);
  const keys = new Set<string>();
  const pairs: Array<[number, number]> = [];

  for (const node of nodes) {
    const nearby = localNodes(node, grid)
      .filter((other) => other.id !== node.id)
      .sort(
        (a, b) =>
          Math.hypot(a.x - node.x, a.y - node.y) -
          Math.hypot(b.x - node.x, b.y - node.y),
      )
      .slice(0, 4);
    for (const other of nearby) {
      const key = edgeKey(node.id, other.id);
      if (keys.has(key)) continue;
      keys.add(key);
      pairs.push([node.id, other.id]);
    }

    const longRangeCandidates = nodes.filter(
      (other) =>
        other.id !== node.id &&
        Math.hypot(other.x - node.x, other.y - node.y) >
          Math.min(width, height) * 0.38,
    );
    const remote = longRangeCandidates[
      Math.floor(unit(node.id * 23.9) * longRangeCandidates.length)
    ];
    if (remote) {
      const key = edgeKey(node.id, remote.id);
      if (!keys.has(key)) {
        keys.add(key);
        pairs.push([node.id, remote.id]);
      }
    }
  }

  return {
    nodes,
    edges: pairs.map(([source, target], index) =>
      makeEdge(index + 1, source, target),
    ),
    nextNodeId: nodes.length + 1,
    nextEdgeId: pairs.length + 1,
    tick: 0,
    time: 0,
  };
}

export function stepLocalNetwork(
  network: LocalNetwork,
  width: number,
  height: number,
  deltaSeconds: number,
  stimuli: readonly Point[],
  parameters: NetworkParameters,
): LocalStep {
  const tick = network.tick + 1;
  const nodeById = new Map(network.nodes.map((node) => [node.id, node]));
  const degree = new Map<number, number>();
  const receivedSignal = new Map<number, number>();
  const connectedNodes = new Map<number, number[]>();
  const survivingEdges: LocalEdge[] = [];
  let severed = 0;

  // Every edge evaluates only its endpoints and its own state.
  for (const edge of network.edges) {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target) continue;
    const signal = clamp(
      (source.energy + target.energy) * 0.5 +
        Math.sin(network.time * 7 + edge.id) * 0.18,
      0,
      1,
    );
    const affinity = clamp(
      edge.affinity + (signal - edge.affinity) * deltaSeconds * 2.8,
      0,
      1,
    );
    const age = edge.age + deltaSeconds;
    const nextDecision = edge.nextDecision - deltaSeconds;
    const decidesNow = nextDecision <= 0;
    const expires =
      age > edge.lifetime / Math.max(0.12, parameters.severance);
    const rejectsRelation =
      decidesNow &&
      affinity < 0.27 &&
      unit(edge.id * 101 + tick * 17) <
        clamp(0.4 * parameters.severance, 0, 0.96);
    if (expires || rejectsRelation) {
      severed += 1;
      continue;
    }
    const nextEdge = {
      ...edge,
      signal,
      affinity,
      age,
      nextDecision: decidesNow ? edge.decisionPeriod : nextDecision,
    };
    survivingEdges.push(nextEdge);
    for (const nodeId of [edge.source, edge.target]) {
      degree.set(nodeId, (degree.get(nodeId) ?? 0) + 1);
      receivedSignal.set(nodeId, (receivedSignal.get(nodeId) ?? 0) + signal);
    }
    connectedNodes.set(edge.source, [
      ...(connectedNodes.get(edge.source) ?? []),
      edge.target,
    ]);
    connectedNodes.set(edge.target, [
      ...(connectedNodes.get(edge.target) ?? []),
      edge.source,
    ]);
  }

  const grid = buildSpatialGrid(network.nodes);
  const dead = new Set<number>();
  const decisionMade = new Set<number>();
  const births: LocalNode[] = [];
  let nextNodeId = network.nextNodeId;

  // Every node evaluates its own metabolism, immediate relations, and local field.
  const updatedNodes = network.nodes.map((node) => {
    const localDegree = degree.get(node.id) ?? 0;
    const relationalInput = localDegree > 0
      ? (receivedSignal.get(node.id) ?? 0) / localDegree
      : 0;
    const stimulus = stimuli.some(
      (point) => Math.hypot(point.x - node.x, point.y - node.y) < LOCAL_RADIUS,
    ) ? 0.44 : 0;
    const neighborhood = localNodes(node, grid).filter(
      (other) => Math.hypot(other.x - node.x, other.y - node.y) < LOCAL_RADIUS,
    );
    const relations = (connectedNodes.get(node.id) ?? []).flatMap(
      (nodeId) => {
        const related = nodeById.get(nodeId);
        return related ? [related] : [];
      },
    );
    let accelerationX =
      (unit(node.id * 83 + tick * 0.71) - 0.5) * 20 * parameters.motion;
    let accelerationY =
      (unit(node.id * 89 + tick * 0.67) - 0.5) * 20 * parameters.motion;
    if (relations.length > 0) {
      const center = relations.reduce(
        (sum, related) => ({ x: sum.x + related.x, y: sum.y + related.y }),
        { x: 0, y: 0 },
      );
      accelerationX +=
        (center.x / relations.length - node.x) * 0.18 * parameters.motion;
      accelerationY +=
        (center.y / relations.length - node.y) * 0.18 * parameters.motion;
    }
    for (const other of neighborhood) {
      if (other.id === node.id) continue;
      const dx = node.x - other.x;
      const dy = node.y - other.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared >= 900 || distanceSquared < 0.01) continue;
      accelerationX += (dx / distanceSquared) * 650 * parameters.motion;
      accelerationY += (dy / distanceSquared) * 650 * parameters.motion;
    }
    let vx = (node.vx + accelerationX * deltaSeconds) *
      Math.pow(0.34, deltaSeconds);
    let vy = (node.vy + accelerationY * deltaSeconds) *
      Math.pow(0.34, deltaSeconds);
    if (parameters.motion === 0) {
      vx = 0;
      vy = 0;
    }
    const speed = Math.hypot(vx, vy);
    const maximumSpeed = 55 * parameters.motion;
    if (speed > maximumSpeed && maximumSpeed > 0) {
      vx = (vx / speed) * maximumSpeed;
      vy = (vy / speed) * maximumSpeed;
    }
    let x = node.x + vx * deltaSeconds;
    let y = node.y + vy * deltaSeconds;
    if (x < 7 || x > width - 7) {
      x = clamp(x, 7, width - 7);
      vx *= -0.82;
    }
    if (y < 7 || y > height - 7) {
      y = clamp(y, 7, height - 7);
      vy *= -0.82;
    }
    const crowding = Math.max(0, neighborhood.length - 7) * 0.012;
    const energy = clamp(
      node.energy +
        (relationalInput * 0.17 + stimulus - node.metabolism - crowding) *
          deltaSeconds,
      0,
      1,
    );
    const age = node.age + deltaSeconds;
    const nextDecision = node.nextDecision - deltaSeconds;
    if (nextDecision > 0) {
      return { ...node, x, y, vx, vy, energy, age, nextDecision };
    }
    decisionMade.add(node.id);

    const decisionNoise = unit(node.id * 131 + tick * 29);
    const mortalityChance = clamp(0.72 * parameters.mortality, 0, 0.98);
    const maximumAge =
      (7 + unit(node.id * 31) * 15) / Math.max(0.12, parameters.mortality);
    if (
      (energy < node.deathThreshold &&
        age > 0.7 &&
        decisionNoise < mortalityChance) ||
      age > maximumAge
    ) {
      dead.add(node.id);
      return {
        ...node,
        x,
        y,
        vx,
        vy,
        energy,
        age,
        nextDecision: node.decisionPeriod,
      };
    }

    if (
      energy > node.birthThreshold &&
      neighborhood.length < 16 &&
      decisionNoise < clamp(0.49 * parameters.reproduction, 0, 0.96)
    ) {
      const childId = nextNodeId;
      nextNodeId += 1;
      const angle = unit(node.id * 47 + tick * 19) * Math.PI * 2;
      const distance = 12 + unit(node.id * 53 + tick * 23) * 46;
      births.push(
        makeNode(
          childId,
          clamp(node.x + Math.cos(angle) * distance, 8, width - 8),
          clamp(node.y + Math.sin(angle) * distance, 8, height - 8),
        ),
      );
      return {
        ...node,
        x,
        y,
        vx,
        vy,
        energy: energy * 0.46,
        age,
        nextDecision: node.decisionPeriod,
      };
    }

    return {
      ...node,
      x,
      y,
      vx,
      vy,
      energy,
      age,
      nextDecision: node.decisionPeriod,
    };
  });

  const aliveNodes = [...updatedNodes.filter((node) => !dead.has(node.id)), ...births];
  const aliveIds = new Set(aliveNodes.map((node) => node.id));
  const edgesAfterDeath = survivingEdges.filter(
    (edge) => aliveIds.has(edge.source) && aliveIds.has(edge.target),
  );
  severed += survivingEdges.length - edgesAfterDeath.length;
  const currentKeys = new Set(
    edgesAfterDeath.map((edge) => edgeKey(edge.source, edge.target)),
  );
  const nextEdges = [...edgesAfterDeath];
  const nextGrid = buildSpatialGrid(aliveNodes);
  let nextEdgeId = network.nextEdgeId;
  let connected = 0;

  for (const node of aliveNodes) {
    if (!decisionMade.has(node.id)) continue;
    const seeksLongRange =
      unit(node.id * 97 + tick * 41) < parameters.distantShare;
    const candidatePool = seeksLongRange
      ? aliveNodes
      : localNodes(node, nextGrid);
    const candidates = candidatePool
      .filter((other) => {
        if (other.id === node.id) return false;
        if (currentKeys.has(edgeKey(node.id, other.id))) return false;
        const distance = Math.hypot(other.x - node.x, other.y - node.y);
        return seeksLongRange
          ? distance > Math.min(width, height) * 0.3
          : distance < LOCAL_RADIUS;
      })
      .sort((a, b) => {
        const aFit = Math.abs(a.energy - node.energy) + unit(a.id * 5 + tick) * 0.2;
        const bFit = Math.abs(b.energy - node.energy) + unit(b.id * 5 + tick) * 0.2;
        return aFit - bFit;
      });
    const target = candidates[0];
    const connectionChance = clamp(0.7 * parameters.connection, 0, 0.98);
    if (!target || unit(node.id * 71 + tick * 37) > connectionChance) continue;
    const key = edgeKey(node.id, target.id);
    currentKeys.add(key);
    nextEdges.push(makeEdge(nextEdgeId, node.id, target.id));
    nextEdgeId += 1;
    connected += 1;
  }

  // A newborn's first relation is chosen by the newborn from its local parent field.
  for (const child of births) {
    const candidates = localNodes(child, nextGrid)
      .filter((other) => other.id !== child.id && !dead.has(other.id))
      .sort(
        (a, b) =>
          Math.hypot(a.x - child.x, a.y - child.y) -
          Math.hypot(b.x - child.x, b.y - child.y),
      );
    const target = candidates[0];
    if (!target) continue;
    const key = edgeKey(child.id, target.id);
    if (currentKeys.has(key)) continue;
    currentKeys.add(key);
    nextEdges.push(makeEdge(nextEdgeId, child.id, target.id));
    nextEdgeId += 1;
    connected += 1;
  }

  return {
    network: {
      nodes: aliveNodes,
      edges: nextEdges,
      nextNodeId,
      nextEdgeId,
      tick,
      time: network.time + deltaSeconds,
    },
    events: {
      born: births.length,
      died: dead.size,
      connected,
      severed,
    },
  };
}

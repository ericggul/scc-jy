export type Point = { readonly x: number; readonly y: number };

export type AgentRole = "scout" | "courier" | "mason";
export type AgentMode = "resting" | "travelling";

export type Outpost = Point & {
  id: number;
  store: number;
  age: number;
  lastVisit: number;
};

export type Trail = {
  id: number;
  source: number;
  target: number;
  reinforcement: number;
  traffic: number;
  age: number;
  lastUse: number;
};

export type Wayfinder = {
  id: number;
  role: AgentRole;
  mode: AgentMode;
  nodeId: number;
  targetId: number | null;
  progress: number;
  energy: number;
  age: number;
  lifespan: number;
  nextActionAt: number;
};

export type Nutrient = Point & {
  id: number;
  strength: number;
  expiresAt: number;
};

export type AgentTrailTopology = {
  nodes: Outpost[];
  trails: Trail[];
  agents: Wayfinder[];
  nutrients: Nutrient[];
  nextNodeId: number;
  nextTrailId: number;
  nextAgentId: number;
  nextNutrientId: number;
  randomState: number;
  time: number;
};

export type TopologyEvents = {
  outposts: number;
  retiredOutposts: number;
  trails: number;
  unravelledTrails: number;
  bornAgents: number;
  lostAgents: number;
};

export type TrailTopologyStep = {
  topology: AgentTrailTopology;
  events: TopologyEvents;
};

const INITIAL_OUTPOSTS = 10;
const INITIAL_AGENTS = 36;
const MIN_OUTPOSTS = 6;
const MAX_OUTPOSTS = 30;
const MAX_AGENTS = 78;
const ROLES: readonly AgentRole[] = ["scout", "courier", "mason"];

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function pairKey(source: number, target: number) {
  return source < target ? `${source}:${target}` : `${target}:${source}`;
}

function seededUnit(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43_758.5453;
  return value - Math.floor(value);
}

function nextRandom(randomState: number): readonly [number, number] {
  const next = (randomState * 1_664_525 + 1_013_904_223) >>> 0;
  return [next / 4_294_967_296, next];
}

function createOutpost(id: number, x: number, y: number, time: number): Outpost {
  return {
    id,
    x,
    y,
    store: 0.35 + seededUnit(id * 7.3) * 0.45,
    age: 0,
    lastVisit: time - seededUnit(id * 11.7) * 3,
  };
}

function createWayfinder(id: number, nodeId: number, time: number): Wayfinder {
  return {
    id,
    role: ROLES[id % ROLES.length],
    mode: "resting",
    nodeId,
    targetId: null,
    progress: 0,
    energy: 0.42 + seededUnit(id * 5.1) * 0.42,
    age: seededUnit(id * 3.9) * 3,
    lifespan: 32 + seededUnit(id * 9.4) * 32,
    nextActionAt: time + seededUnit(id * 13.1) * 0.6,
  };
}

function closestNodes(node: Outpost, nodes: readonly Outpost[], count: number) {
  return nodes
    .filter((other) => other.id !== node.id)
    .sort(
      (left, right) =>
        Math.hypot(left.x - node.x, left.y - node.y) -
        Math.hypot(right.x - node.x, right.y - node.y),
    )
    .slice(0, count);
}

export function createAgentTrailTopology(
  width: number,
  height: number,
): AgentTrailTopology {
  const margin = Math.min(width, height) * 0.1;
  const nodes = Array.from({ length: INITIAL_OUTPOSTS }, (_, index) => {
    const id = index + 1;
    const angle = seededUnit(id * 2.3) * Math.PI * 2;
    const radial = 0.18 + seededUnit(id * 5.8) * 0.72;
    return createOutpost(
      id,
      width / 2 + Math.cos(angle) * radial * (width / 2 - margin),
      height / 2 + Math.sin(angle) * radial * (height / 2 - margin),
      0,
    );
  });

  const trailKeys = new Set<string>();
  const trails: Trail[] = [];
  for (const node of nodes) {
    for (const neighbor of closestNodes(node, nodes, 2)) {
      const key = pairKey(node.id, neighbor.id);
      if (trailKeys.has(key)) continue;
      trailKeys.add(key);
      trails.push({
        id: trails.length + 1,
        source: node.id,
        target: neighbor.id,
        reinforcement: 0.28 + seededUnit(trails.length * 4.1) * 0.25,
        traffic: seededUnit(trails.length * 8.9) * 0.2,
        age: seededUnit(trails.length * 6.7) * 4,
        lastUse: 0,
      });
    }
  }

  const agents = Array.from({ length: INITIAL_AGENTS }, (_, index) =>
    createWayfinder(index + 1, nodes[index % nodes.length].id, 0),
  );

  return {
    nodes,
    trails,
    agents,
    nutrients: [],
    nextNodeId: nodes.length + 1,
    nextTrailId: trails.length + 1,
    nextAgentId: agents.length + 1,
    nextNutrientId: 1,
    randomState: 0x4f1bbcdc,
    time: 0,
  };
}

export function resizeAgentTrailTopology(
  topology: AgentTrailTopology,
  previous: { width: number; height: number },
  next: { width: number; height: number },
) {
  if (previous.width === 0 || previous.height === 0) return topology;
  const horizontalScale = next.width / previous.width;
  const verticalScale = next.height / previous.height;
  return {
    ...topology,
    nodes: topology.nodes.map((node) => ({
      ...node,
      x: node.x * horizontalScale,
      y: node.y * verticalScale,
    })),
    nutrients: topology.nutrients.map((nutrient) => ({
      ...nutrient,
      x: nutrient.x * horizontalScale,
      y: nutrient.y * verticalScale,
    })),
  };
}

export function nourishTopology(
  topology: AgentTrailTopology,
  point: Point,
) {
  return {
    ...topology,
    nutrients: [
      ...topology.nutrients.slice(-5),
      {
        id: topology.nextNutrientId,
        x: point.x,
        y: point.y,
        strength: 1,
        expiresAt: topology.time + 10.5,
      },
    ],
    nextNutrientId: topology.nextNutrientId + 1,
  };
}

function nutrientPull(point: Point, nutrients: readonly Nutrient[]) {
  return nutrients.reduce((pull, nutrient) => {
    const distance = Math.max(18, Math.hypot(nutrient.x - point.x, nutrient.y - point.y));
    return pull + nutrient.strength * 120 / distance;
  }, 0);
}

function chooseWeighted<T>(
  choices: readonly T[],
  weights: readonly number[],
  random: () => number,
) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return choices[0];
  let threshold = random() * total;
  for (let index = 0; index < choices.length; index += 1) {
    threshold -= weights[index];
    if (threshold <= 0) return choices[index];
  }
  return choices[choices.length - 1];
}

function potentialOutpostPosition(
  source: Outpost,
  nutrients: readonly Nutrient[],
  width: number,
  height: number,
  random: () => number,
) {
  const strongest = nutrients.reduce<Nutrient | null>((best, nutrient) => {
    if (!best || nutrient.strength > best.strength) return nutrient;
    return best;
  }, null);
  let direction = random() * Math.PI * 2;
  if (strongest) {
    direction = Math.atan2(strongest.y - source.y, strongest.x - source.x) +
      (random() - 0.5) * 1.25;
  }
  const distance = 54 + random() * 105;
  const margin = Math.min(width, height) * 0.065;
  return {
    x: clamp(source.x + Math.cos(direction) * distance, margin, width - margin),
    y: clamp(source.y + Math.sin(direction) * distance, margin, height - margin),
  };
}

export function stepAgentTrailTopology(
  topology: AgentTrailTopology,
  width: number,
  height: number,
  deltaSeconds: number,
): TrailTopologyStep {
  const time = topology.time + deltaSeconds;
  let randomState = topology.randomState;
  const random = () => {
    const [value, next] = nextRandom(randomState);
    randomState = next;
    return value;
  };
  const events: TopologyEvents = {
    outposts: 0,
    retiredOutposts: 0,
    trails: 0,
    unravelledTrails: 0,
    bornAgents: 0,
    lostAgents: 0,
  };
  const nutrients = topology.nutrients
    .filter((nutrient) => nutrient.expiresAt > time)
    .map((nutrient) => ({
      ...nutrient,
      strength: clamp(nutrient.strength - deltaSeconds * 0.043, 0, 1),
    }));
  const nodes = topology.nodes.map((node) => {
    const unattended = time - node.lastVisit > 3.8 ? 0.055 : 0;
    return {
      ...node,
      store: clamp(node.store + deltaSeconds * (0.028 - unattended), 0, 1),
      age: node.age + deltaSeconds,
    };
  });
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const trails = topology.trails.map((trail) => ({
    ...trail,
    traffic: Math.max(0, trail.traffic - deltaSeconds * 0.12),
    reinforcement: Math.max(0, trail.reinforcement - deltaSeconds * 0.017),
    age: trail.age + deltaSeconds,
  }));
  const trailForPair = new Map(
    trails.map((trail) => [pairKey(trail.source, trail.target), trail]),
  );
  let nextNodeId = topology.nextNodeId;
  let nextTrailId = topology.nextTrailId;
  let nextAgentId = topology.nextAgentId;
  const agents: Wayfinder[] = [];

  const createOutpostFrom = (source: Outpost) => {
    if (nodes.length >= MAX_OUTPOSTS) return null;
    const position = potentialOutpostPosition(source, nutrients, width, height, random);
    const nearest = nodes.reduce(
      (minimum, node) => Math.min(minimum, Math.hypot(node.x - position.x, node.y - position.y)),
      Number.POSITIVE_INFINITY,
    );
    if (nearest < Math.min(width, height) * 0.085) return null;
    const node = createOutpost(nextNodeId, position.x, position.y, time);
    nextNodeId += 1;
    nodes.push(node);
    nodeById.set(node.id, node);
    const trail: Trail = {
      id: nextTrailId,
      source: source.id,
      target: node.id,
      reinforcement: 0.42,
      traffic: 0.3,
      age: 0,
      lastUse: time,
    };
    nextTrailId += 1;
    trails.push(trail);
    trailForPair.set(pairKey(trail.source, trail.target), trail);
    events.outposts += 1;
    events.trails += 1;
    return node;
  };

  for (const originalAgent of topology.agents) {
    let agent: Wayfinder = {
      ...originalAgent,
      energy: Math.max(0, originalAgent.energy - deltaSeconds * 0.011),
      age: originalAgent.age + deltaSeconds,
    };
    const currentNode = nodeById.get(agent.nodeId);
    if (!currentNode || agent.age > agent.lifespan || agent.energy <= 0.025) {
      events.lostAgents += 1;
      continue;
    }

    if (agent.mode === "travelling" && agent.targetId !== null) {
      const target = nodeById.get(agent.targetId);
      if (!target) {
        agent = { ...agent, mode: "resting", targetId: null, progress: 0 };
      } else {
        const distance = Math.max(1, Math.hypot(target.x - currentNode.x, target.y - currentNode.y));
        const progress = agent.progress +
          (deltaSeconds * (34 + agent.energy * 42)) / distance;
        if (progress < 1) {
          agents.push({ ...agent, progress });
          continue;
        }
        const trail = trailForPair.get(pairKey(currentNode.id, target.id));
        if (trail) {
          trail.traffic = clamp(trail.traffic + 0.24, 0, 1);
          trail.reinforcement = clamp(
            trail.reinforcement + (agent.role === "mason" ? 0.09 : 0.035),
            0,
            1,
          );
          trail.lastUse = time;
        }
        const intake = Math.min(target.store, 0.024 + deltaSeconds * 0.06);
        target.store -= intake;
        target.lastVisit = time;
        agent = {
          ...agent,
          mode: "resting",
          nodeId: target.id,
          targetId: null,
          progress: 0,
          energy: clamp(agent.energy + intake * 1.5, 0, 1),
          nextActionAt: time + 0.04 + random() * 0.32,
        };
      }
    }

    const node = nodeById.get(agent.nodeId);
    if (!node) {
      events.lostAgents += 1;
      continue;
    }
    node.lastVisit = time;
    const intake = Math.min(node.store, deltaSeconds * 0.024);
    node.store -= intake;
    agent.energy = clamp(agent.energy + intake * 1.15, 0, 1);

    if (time < agent.nextActionAt) {
      agents.push(agent);
      continue;
    }

    const incident = trails.filter(
      (trail) => trail.source === node.id || trail.target === node.id,
    );
    const scoutChance = 0.1 + nutrientPull(node, nutrients) * 0.025;
    const shouldExplore =
      (agent.role === "scout" && agent.energy > 0.39 && random() < scoutChance) ||
      (incident.length === 0 && agent.energy > 0.31);
    const discovered = shouldExplore ? createOutpostFrom(node) : null;
    if (discovered) {
      agents.push({
        ...agent,
        mode: "travelling",
        targetId: discovered.id,
        progress: 0,
        energy: Math.max(0.05, agent.energy - 0.16),
        nextActionAt: time + 0.1,
      });
      continue;
    }

    if (incident.length === 0) {
      agents.push({ ...agent, nextActionAt: time + 0.35 + random() * 0.5 });
      continue;
    }

    const chosen = chooseWeighted(
      incident,
      incident.map((trail) => {
        const destinationId = trail.source === node.id ? trail.target : trail.source;
        const destination = nodeById.get(destinationId);
        const nourishment = destination ? nutrientPull(destination, nutrients) : 0;
        const roleWeight = agent.role === "scout"
          ? 1.1 - trail.reinforcement * 0.65
          : agent.role === "courier"
            ? 0.45 + trail.traffic * 1.35
            : 1.35 - trail.reinforcement;
        return Math.max(
          0.04,
          roleWeight + trail.reinforcement * 0.62 + nourishment * 0.2,
        );
      }),
      random,
    );
    const destinationId = chosen.source === node.id ? chosen.target : chosen.source;
    if (agent.role === "mason") {
      chosen.reinforcement = clamp(chosen.reinforcement + 0.045, 0, 1);
    }
    agents.push({
      ...agent,
      mode: "travelling",
      targetId: destinationId,
      progress: 0,
      nextActionAt: time + 0.08,
    });

    if (
      node.store > 0.56 &&
      agent.energy > 0.54 &&
      agents.length < MAX_AGENTS &&
      random() < 0.07
    ) {
      node.store -= 0.22;
      agents.push(createWayfinder(nextAgentId, node.id, time));
      nextAgentId += 1;
      events.bornAgents += 1;
    }
  }

  const occupiedNodes = new Set<number>();
  for (const agent of agents) {
    occupiedNodes.add(agent.nodeId);
    if (agent.targetId !== null) occupiedNodes.add(agent.targetId);
  }
  const retired = new Set<number>();
  for (const node of nodes) {
    if (nodes.length - retired.size <= MIN_OUTPOSTS) break;
    if (
      !occupiedNodes.has(node.id) &&
      node.age > 8 &&
      node.store < 0.16 &&
      time - node.lastVisit > 4.5 &&
      random() < deltaSeconds * 0.22
    ) {
      retired.add(node.id);
      events.retiredOutposts += 1;
    }
  }
  const liveNodes = nodes.filter((node) => !retired.has(node.id));
  const liveNodeIds = new Set(liveNodes.map((node) => node.id));
  const activePairs = new Set(
    agents
      .filter((agent) => agent.targetId !== null)
      .map((agent) => pairKey(agent.nodeId, agent.targetId!)),
  );
  const liveTrails = trails.filter((trail) => {
    if (!liveNodeIds.has(trail.source) || !liveNodeIds.has(trail.target)) {
      events.unravelledTrails += 1;
      return false;
    }
    const unused = time - trail.lastUse > 6.2;
    if (
      trail.reinforcement < 0.065 &&
      unused &&
      !activePairs.has(pairKey(trail.source, trail.target)) &&
      random() < deltaSeconds * 0.28
    ) {
      events.unravelledTrails += 1;
      return false;
    }
    return true;
  });

  return {
    topology: {
      nodes: liveNodes,
      trails: liveTrails,
      agents: agents.filter((agent) => liveNodeIds.has(agent.nodeId)),
      nutrients,
      nextNodeId,
      nextTrailId,
      nextAgentId,
      nextNutrientId: topology.nextNutrientId,
      randomState,
      time,
    },
    events,
  };
}

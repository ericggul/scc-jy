export type Point = { readonly x: number; readonly y: number };

export type NodeRole = "root" | "junction" | "tip" | "terminal";

export type FilamentNode = Point & {
  readonly id: number;
  role: NodeRole;
  bornAt: number;
};

export type Filament = {
  readonly id: number;
  source: number;
  target: number;
  bornAt: number;
  changedAt: number;
};

export type GrowthTip = {
  readonly id: number;
  nodeId: number;
  previousNodeId: number | null;
  heading: number;
  energy: number;
  age: number;
  nextExtensionAt: number;
};

export type Nutrient = Point & {
  readonly id: number;
  strength: number;
  expiresAt: number;
};

export type FilamentTopology = {
  nodes: readonly FilamentNode[];
  filaments: readonly Filament[];
  tips: readonly GrowthTip[];
  nutrients: readonly Nutrient[];
  width: number;
  height: number;
  time: number;
  nextNodeId: number;
  nextFilamentId: number;
  nextTipId: number;
  nextNutrientId: number;
  nextPruneAt: number;
  randomState: number;
};

export type FilamentParameters = {
  branching: number;
  fusion: number;
  pruning: number;
};

export type FilamentEvents = {
  extensions: number;
  branches: number;
  fusions: number;
  lostTips: number;
  pruned: number;
};

export type FilamentStep = {
  topology: FilamentTopology;
  events: FilamentEvents;
};

export type FilamentMeasure = {
  tips: number;
  vertices: number;
  filaments: number;
  loops: number;
  reach: number;
};

export const DEFAULT_FILAMENT_PARAMETERS: FilamentParameters = {
  branching: 0.82,
  fusion: 0.26,
  pruning: 0.38,
};

const INITIAL_TIPS = 8;
const MAX_TIPS = 26;
const MAX_NODES = 7_000;
const EXTENSION_INTERVAL = 0.22;
const EXTENSION_LENGTH = 11;
const MIN_TIPS = 3;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function distance(first: Point, second: Point) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function relationKey(source: number, target: number) {
  return source < target ? `${source}:${target}` : `${target}:${source}`;
}

function nextRandom(state: number): readonly [number, number] {
  let next = state | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return [unsigned / 4_294_967_296, unsigned || 0x9e3779b9];
}

function eventOccurs(rate: number, delta: number, random: () => number) {
  return random() < 1 - Math.exp(-Math.max(0, rate) * delta);
}

function degreeMap(filaments: readonly Filament[]) {
  const degrees = new Map<number, number>();
  for (const filament of filaments) {
    degrees.set(filament.source, (degrees.get(filament.source) ?? 0) + 1);
    degrees.set(filament.target, (degrees.get(filament.target) ?? 0) + 1);
  }
  return degrees;
}

function componentCount(nodes: readonly FilamentNode[], filaments: readonly Filament[]) {
  const neighbours = new Map<number, number[]>();
  for (const filament of filaments) {
    neighbours.set(filament.source, [...(neighbours.get(filament.source) ?? []), filament.target]);
    neighbours.set(filament.target, [...(neighbours.get(filament.target) ?? []), filament.source]);
  }
  const seen = new Set<number>();
  let components = 0;
  for (const node of nodes) {
    if (seen.has(node.id)) continue;
    components += 1;
    const pending = [node.id];
    seen.add(node.id);
    while (pending.length > 0) {
      const current = pending.pop();
      if (current === undefined) continue;
      for (const neighbour of neighbours.get(current) ?? []) {
        if (seen.has(neighbour)) continue;
        seen.add(neighbour);
        pending.push(neighbour);
      }
    }
  }
  return components;
}

function assignRoles(
  nodes: readonly FilamentNode[],
  filaments: readonly Filament[],
  tips: readonly GrowthTip[],
) {
  const activeTips = new Set(tips.map((tip) => tip.nodeId));
  const degrees = degreeMap(filaments);
  return nodes.map((node) => {
    if (node.role === "root") return node;
    if (activeTips.has(node.id)) return { ...node, role: "tip" as const };
    return {
      ...node,
      role: (degrees.get(node.id) ?? 0) > 1 ? "junction" as const : "terminal" as const,
    };
  });
}

export function measureFilamentTopology(topology: FilamentTopology): FilamentMeasure {
  const root = topology.nodes.find((node) => node.role === "root") ?? topology.nodes[0];
  const reach = root
    ? topology.nodes.reduce((maximum, node) => Math.max(maximum, distance(root, node)), 0)
    : 0;
  const components = componentCount(topology.nodes, topology.filaments);
  return {
    tips: topology.tips.length,
    vertices: topology.nodes.length,
    filaments: topology.filaments.length,
    loops: Math.max(0, topology.filaments.length - topology.nodes.length + components),
    reach,
  };
}

export function createFilamentTopology(
  width: number,
  height: number,
  seed = 0x5b9d731f,
): FilamentTopology {
  let randomState = seed >>> 0 || 1;
  const random = () => {
    const [value, next] = nextRandom(randomState);
    randomState = next;
    return value;
  };
  const root: FilamentNode = {
    id: 1,
    x: width / 2,
    y: height / 2,
    role: "root",
    bornAt: 0,
  };
  const tips: GrowthTip[] = Array.from({ length: INITIAL_TIPS }, (_, index) => ({
    id: index + 1,
    nodeId: root.id,
    previousNodeId: null,
    heading: (Math.PI * 2 * index) / INITIAL_TIPS + (random() - 0.5) * 0.24,
    energy: 0.72 + random() * 0.1,
    age: 0,
    nextExtensionAt: 0.04 + random() * EXTENSION_INTERVAL,
  }));
  return {
    nodes: [root],
    filaments: [],
    tips,
    nutrients: [],
    width,
    height,
    time: 0,
    nextNodeId: 2,
    nextFilamentId: 1,
    nextTipId: tips.length + 1,
    nextNutrientId: 1,
    nextPruneAt: 1.2,
    randomState,
  };
}

export function resizeFilamentTopology(
  topology: FilamentTopology,
  previous: { width: number; height: number },
  next: { width: number; height: number },
): FilamentTopology {
  if (previous.width <= 0 || previous.height <= 0) return topology;
  const scaleX = next.width / previous.width;
  const scaleY = next.height / previous.height;
  return {
    ...topology,
    width: next.width,
    height: next.height,
    nodes: topology.nodes.map((node) => ({ ...node, x: node.x * scaleX, y: node.y * scaleY })),
    nutrients: topology.nutrients.map((nutrient) => ({
      ...nutrient,
      x: nutrient.x * scaleX,
      y: nutrient.y * scaleY,
    })),
  };
}

function steeringAngle(
  tip: GrowthTip,
  current: FilamentNode,
  nodes: readonly FilamentNode[],
  nutrients: readonly Nutrient[],
  random: () => number,
) {
  let x = Math.cos(tip.heading) * 0.78;
  let y = Math.sin(tip.heading) * 0.78;
  const resource = nutrients.reduce<Nutrient | null>((nearest, nutrient) => {
    if (nutrient.strength <= 0.02) return nearest;
    if (!nearest || distance(current, nutrient) < distance(current, nearest)) return nutrient;
    return nearest;
  }, null);
  if (resource) {
    const resourceDistance = Math.max(1, distance(current, resource));
    const attraction = 0.25 + clamp((480 - resourceDistance) / 480, 0, 1) * 0.85;
    x += ((resource.x - current.x) / resourceDistance) * attraction;
    y += ((resource.y - current.y) / resourceDistance) * attraction;
  }
  for (const node of nodes) {
    if (node.id === current.id || node.id === tip.previousNodeId) continue;
    const nodeDistance = distance(current, node);
    if (nodeDistance <= 0 || nodeDistance > 40) continue;
    const repulsion = ((40 - nodeDistance) / 40) ** 2 * 0.68;
    x -= ((node.x - current.x) / nodeDistance) * repulsion;
    y -= ((node.y - current.y) / nodeDistance) * repulsion;
  }
  const jitter = (random() - 0.5) * 0.22;
  return Math.atan2(y, x) + jitter;
}

function pruneTerminals(
  nodes: readonly FilamentNode[],
  filaments: readonly Filament[],
  tips: readonly GrowthTip[],
  time: number,
  pruning: number,
  random: () => number,
) {
  const active = new Set(tips.map((tip) => tip.nodeId));
  let nextNodes = [...nodes];
  let nextFilaments = [...filaments];
  let pruned = 0;
  for (let pass = 0; pass < 4; pass += 1) {
    const degrees = degreeMap(nextFilaments);
    const removable = nextNodes.filter((node) =>
      node.role !== "root" &&
      !active.has(node.id) &&
      (degrees.get(node.id) ?? 0) <= 1 &&
      time - node.bornAt > 4.5 &&
      random() < pruning * 0.28,
    );
    if (removable.length === 0) break;
    const removeIds = new Set(removable.map((node) => node.id));
    pruned += removable.length;
    nextNodes = nextNodes.filter((node) => !removeIds.has(node.id));
    nextFilaments = nextFilaments.filter((filament) =>
      !removeIds.has(filament.source) && !removeIds.has(filament.target),
    );
  }
  return { nodes: nextNodes, filaments: nextFilaments, pruned };
}

export function stepFilamentTopology(
  topology: FilamentTopology,
  deltaSeconds: number,
  parameters: FilamentParameters,
): FilamentStep {
  const delta = clamp(deltaSeconds, 0, 0.05);
  const time = topology.time + delta;
  let randomState = topology.randomState;
  const random = () => {
    const [value, next] = nextRandom(randomState);
    randomState = next;
    return value;
  };
  const events: FilamentEvents = {
    extensions: 0,
    branches: 0,
    fusions: 0,
    lostTips: 0,
    pruned: 0,
  };
  let nodes = topology.nodes.map((node) => ({ ...node }));
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  let filaments = topology.filaments.map((filament) => ({ ...filament }));
  let nutrients = topology.nutrients
    .map((nutrient) => ({ ...nutrient, strength: Math.max(0, nutrient.strength - delta * 0.024) }))
    .filter((nutrient) => nutrient.expiresAt > time && nutrient.strength > 0.012);
  const filamentsByKey = new Set(filaments.map((filament) => relationKey(filament.source, filament.target)));
  let nextNodeId = topology.nextNodeId;
  let nextFilamentId = topology.nextFilamentId;
  let nextTipId = topology.nextTipId;
  const advancedTips: GrowthTip[] = [];

  for (const [tipIndex, originalTip] of topology.tips.entries()) {
    const tip = { ...originalTip, age: originalTip.age + delta, energy: originalTip.energy + delta * 0.2 };
    const current = nodesById.get(tip.nodeId);
    if (!current) continue;
    let nutrientGain = 0;
    nutrients = nutrients.map((nutrient) => {
      const resourceDistance = distance(current, nutrient);
      if (resourceDistance >= 105) return nutrient;
      const uptake = delta * (1 - resourceDistance / 105) * 0.2;
      nutrientGain += uptake;
      return { ...nutrient, strength: Math.max(0, nutrient.strength - uptake * 0.42) };
    });
    tip.energy = clamp(tip.energy + nutrientGain, 0, 1.15);
    const survivingIfThisTipStops =
      advancedTips.length + topology.tips.length - tipIndex - 1;
    const shouldDie =
      survivingIfThisTipStops >= MIN_TIPS &&
      (tip.energy < 0.075 || eventOccurs(0.008 + parameters.pruning * 0.024, delta, random));
    if (shouldDie) {
      events.lostTips += 1;
      continue;
    }
    if (time < tip.nextExtensionAt || nodes.length >= MAX_NODES) {
      advancedTips.push(tip);
      continue;
    }

    const heading = steeringAngle(tip, current, nodes, nutrients, random);
    const margin = 18;
    const nextPoint = {
      x: current.x + Math.cos(heading) * EXTENSION_LENGTH,
      y: current.y + Math.sin(heading) * EXTENSION_LENGTH,
    };
    if (
      nextPoint.x < margin ||
      nextPoint.x > topology.width - margin ||
      nextPoint.y < margin ||
      nextPoint.y > topology.height - margin
    ) {
      advancedTips.push({
        ...tip,
        heading: Math.atan2(topology.height / 2 - current.y, topology.width / 2 - current.x),
        energy: Math.max(0, tip.energy - 0.035),
        nextExtensionAt: time + EXTENSION_INTERVAL,
      });
      continue;
    }

    const fusionRadius = 5 + parameters.fusion * 11;
    const fusionTarget = nodes.reduce<FilamentNode | null>((nearest, node) => {
      if (node.id === current.id || node.id === tip.previousNodeId) return nearest;
      if (!nearest || distance(nextPoint, node) < distance(nextPoint, nearest)) return node;
      return nearest;
    }, null);
    const canFuse =
      fusionTarget &&
      distance(nextPoint, fusionTarget) <= fusionRadius &&
      !filamentsByKey.has(relationKey(current.id, fusionTarget.id)) &&
      survivingIfThisTipStops >= MIN_TIPS &&
      random() < parameters.fusion;
    if (canFuse && fusionTarget) {
      filaments.push({
        id: nextFilamentId,
        source: current.id,
        target: fusionTarget.id,
        bornAt: time,
        changedAt: time,
      });
      nextFilamentId += 1;
      filamentsByKey.add(relationKey(current.id, fusionTarget.id));
      events.fusions += 1;
      continue;
    }

    const nextNode: FilamentNode = {
      id: nextNodeId,
      x: nextPoint.x,
      y: nextPoint.y,
      role: "tip",
      bornAt: time,
    };
    nextNodeId += 1;
    nodes.push(nextNode);
    nodesById.set(nextNode.id, nextNode);
    filaments.push({
      id: nextFilamentId,
      source: current.id,
      target: nextNode.id,
      bornAt: time,
      changedAt: time,
    });
    nextFilamentId += 1;
    filamentsByKey.add(relationKey(current.id, nextNode.id));
    events.extensions += 1;
    const advanced = {
      ...tip,
      nodeId: nextNode.id,
      previousNodeId: current.id,
      heading,
      energy: Math.max(0, tip.energy - 0.03),
      nextExtensionAt: time + EXTENSION_INTERVAL,
    };
    const branchProbability =
      parameters.branching * clamp((advanced.energy - 0.38) / 0.58, 0, 1) * 0.19;
    if (
      advancedTips.length + topology.tips.length - tipIndex - 1 < MAX_TIPS - 1 &&
      random() < branchProbability
    ) {
      const siblingEnergy = advanced.energy * 0.44;
      advanced.energy *= 0.54;
      advancedTips.push({
        id: nextTipId,
        nodeId: nextNode.id,
        previousNodeId: current.id,
        heading: heading + (random() < 0.5 ? -1 : 1) * (0.82 + random() * 0.56),
        energy: siblingEnergy,
        age: 0,
        nextExtensionAt: time + EXTENSION_INTERVAL * (0.65 + random() * 0.6),
      });
      nextTipId += 1;
      events.branches += 1;
    }
    advancedTips.push(advanced);
  }

  let nextPruneAt = topology.nextPruneAt;
  if (time >= topology.nextPruneAt) {
    const pruned = pruneTerminals(nodes, filaments, advancedTips, time, parameters.pruning, random);
    nodes = pruned.nodes;
    filaments = pruned.filaments;
    events.pruned += pruned.pruned;
    nextPruneAt = time + 1.1;
  }
  const survivingTips = advancedTips.filter((tip) => nodes.some((node) => node.id === tip.nodeId));
  nodes = assignRoles(nodes, filaments, survivingTips);

  return {
    topology: {
      nodes,
      filaments,
      tips: survivingTips,
      nutrients,
      width: topology.width,
      height: topology.height,
      time,
      nextNodeId,
      nextFilamentId,
      nextTipId,
      nextNutrientId: topology.nextNutrientId,
      nextPruneAt,
      randomState,
    },
    events,
  };
}

export function introduceNutrient(
  topology: FilamentTopology,
  point: Point,
): FilamentTopology {
  const existing = topology.nutrients.find((nutrient) => distance(nutrient, point) < 34);
  if (existing) {
    return {
      ...topology,
      nutrients: topology.nutrients.map((nutrient) => nutrient.id === existing.id
        ? { ...nutrient, strength: Math.min(1.3, nutrient.strength + 0.72), expiresAt: topology.time + 30 }
        : nutrient),
    };
  }
  return {
    ...topology,
    nutrients: [
      ...topology.nutrients,
      {
        id: topology.nextNutrientId,
        x: point.x,
        y: point.y,
        strength: 1,
        expiresAt: topology.time + 30,
      },
    ],
    nextNutrientId: topology.nextNutrientId + 1,
  };
}

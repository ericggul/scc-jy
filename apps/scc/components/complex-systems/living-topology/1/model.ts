export type Point = { x: number; y: number };

export type LivingNode = Point & {
  id: number;
  vx: number;
  vy: number;
  energy: number;
  age: number;
};

export type LivingEdge = {
  id: number;
  source: number;
  target: number;
  strength: number;
  activity: number;
  age: number;
};

export type LivingGraph = {
  nodes: LivingNode[];
  edges: LivingEdge[];
  nextNodeId: number;
  nextEdgeId: number;
  time: number;
};

export type Primitive = "birth" | "death" | "connect" | "sever";

export type GraphEvent = {
  id: string;
  primitive: Primitive;
  message: string;
  points: Point[];
};

type OperationResult = {
  graph: LivingGraph;
  event: GraphEvent | null;
};

const MIN_NODES = 5;
const MAX_NODES = 18;

function seededUnit(index: number, salt: number) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function edgeKey(source: number, target: number) {
  return source < target ? `${source}:${target}` : `${target}:${source}`;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function createLivingGraph(width: number, height: number): LivingGraph {
  const count = 9;
  const radius = Math.min(width, height) * 0.23;
  const centerX = width / 2;
  const centerY = height / 2;
  const nodes = Array.from({ length: count }, (_, index): LivingNode => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    const irregularity = 0.78 + seededUnit(index, 2) * 0.35;
    return {
      id: index + 1,
      x: centerX + Math.cos(angle) * radius * irregularity,
      y: centerY + Math.sin(angle) * radius * irregularity,
      vx: 0,
      vy: 0,
      energy: 0.38 + seededUnit(index, 4) * 0.5,
      age: 2 + seededUnit(index, 8) * 8,
    };
  });

  const pairs = [
    [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8],
    [8, 9], [9, 1], [1, 5], [3, 7], [5, 9],
  ];
  const edges = pairs.map(([source, target], index): LivingEdge => ({
    id: index + 1,
    source,
    target,
    strength: 0.38 + seededUnit(index, 5) * 0.52,
    activity: seededUnit(index, 7),
    age: 2 + seededUnit(index, 9) * 7,
  }));

  return {
    nodes,
    edges,
    nextNodeId: count + 1,
    nextEdgeId: edges.length + 1,
    time: 0,
  };
}

export function resizeGraph(
  graph: LivingGraph,
  oldSize: { width: number; height: number },
  newSize: { width: number; height: number },
) {
  if (oldSize.width === 0 || oldSize.height === 0) return graph;
  return {
    ...graph,
    nodes: graph.nodes.map((node) => ({
      ...node,
      x: node.x * (newSize.width / oldSize.width),
      y: node.y * (newSize.height / oldSize.height),
    })),
  };
}

export function advanceLivingGraph(
  graph: LivingGraph,
  width: number,
  height: number,
  deltaSeconds: number,
): LivingGraph {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const forces = new Map(graph.nodes.map((node) => [node.id, { x: 0, y: 0 }]));
  const margin = Math.min(width, height) * 0.1;
  const preferredLength = clamp(Math.min(width, height) * 0.15, 72, 155);

  for (let index = 0; index < graph.nodes.length; index += 1) {
    const node = graph.nodes[index];
    const force = forces.get(node.id)!;
    force.x += (width / 2 - node.x) * 0.018;
    force.y += (height / 2 - node.y) * 0.018;

    for (let otherIndex = index + 1; otherIndex < graph.nodes.length; otherIndex += 1) {
      const other = graph.nodes[otherIndex];
      const dx = other.x - node.x;
      const dy = other.y - node.y;
      const distanceSquared = Math.max(120, dx * dx + dy * dy);
      const distance = Math.sqrt(distanceSquared);
      const repulsion = 18500 / distanceSquared;
      const rx = (dx / distance) * repulsion;
      const ry = (dy / distance) * repulsion;
      force.x -= rx;
      force.y -= ry;
      const otherForce = forces.get(other.id)!;
      otherForce.x += rx;
      otherForce.y += ry;
    }
  }

  const nextEdges = graph.edges.flatMap((edge) => {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target) return [];
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const spring = (distance - preferredLength) * 0.032;
    const fx = (dx / distance) * spring;
    const fy = (dy / distance) * spring;
    forces.get(source.id)!.x += fx;
    forces.get(source.id)!.y += fy;
    forces.get(target.id)!.x -= fx;
    forces.get(target.id)!.y -= fy;

    const activity = 0.5 + Math.sin(graph.time * 1.1 + edge.id * 1.73) * 0.5;
    const desiredStrength = 0.2 + activity * 0.78;
    return [{
      ...edge,
      activity,
      strength: clamp(
        edge.strength + (desiredStrength - edge.strength) * deltaSeconds * 0.28,
        0.08,
        1,
      ),
      age: edge.age + deltaSeconds,
    }];
  });

  const activityByNode = new Map<number, number>();
  const degreeByNode = new Map<number, number>();
  for (const edge of nextEdges) {
    for (const nodeId of [edge.source, edge.target]) {
      activityByNode.set(nodeId, (activityByNode.get(nodeId) ?? 0) + edge.activity);
      degreeByNode.set(nodeId, (degreeByNode.get(nodeId) ?? 0) + 1);
    }
  }

  const nodes = graph.nodes.map((node) => {
    const force = forces.get(node.id)!;
    const degree = degreeByNode.get(node.id) ?? 0;
    const received = degree > 0 ? (activityByNode.get(node.id) ?? 0) / degree : 0;
    const energy = clamp(
      node.energy + (received - 0.48) * deltaSeconds * 0.08 - deltaSeconds * 0.004,
      0.08,
      1,
    );
    const vx = (node.vx + force.x * deltaSeconds) * Math.pow(0.22, deltaSeconds);
    const vy = (node.vy + force.y * deltaSeconds) * Math.pow(0.22, deltaSeconds);
    return {
      ...node,
      x: clamp(node.x + vx * deltaSeconds, margin, width - margin),
      y: clamp(node.y + vy * deltaSeconds, margin, height - margin),
      vx,
      vy,
      energy,
      age: node.age + deltaSeconds,
    };
  });

  return { ...graph, nodes, edges: nextEdges, time: graph.time + deltaSeconds };
}

function birth(graph: LivingGraph, position?: Point): OperationResult {
  if (graph.nodes.length >= MAX_NODES) return death(graph);
  const parent = position
    ? [...graph.nodes].sort(
        (a, b) =>
          Math.hypot(a.x - position.x, a.y - position.y) -
          Math.hypot(b.x - position.x, b.y - position.y),
      )[0]
    : [...graph.nodes].sort((a, b) => b.energy - a.energy)[0];
  if (!parent) return { graph, event: null };
  const id = graph.nextNodeId;
  const angle = seededUnit(id, 11) * Math.PI * 2;
  const distance = 42 + seededUnit(id, 12) * 30;
  const node: LivingNode = {
    id,
    x: position?.x ?? parent.x + Math.cos(angle) * distance,
    y: position?.y ?? parent.y + Math.sin(angle) * distance,
    vx: Math.cos(angle) * 8,
    vy: Math.sin(angle) * 8,
    energy: 0.66,
    age: 0,
  };
  const edge: LivingEdge = {
    id: graph.nextEdgeId,
    source: parent.id,
    target: id,
    strength: 0.52,
    activity: 0.75,
    age: 0,
  };
  return {
    graph: {
      ...graph,
      nodes: [
        ...graph.nodes.map((item) =>
          item.id === parent.id ? { ...item, energy: item.energy * 0.72 } : item,
        ),
        node,
      ],
      edges: [...graph.edges, edge],
      nextNodeId: id + 1,
      nextEdgeId: graph.nextEdgeId + 1,
    },
    event: {
      id: `birth-${id}-${graph.time}`,
      primitive: "birth" as const,
      message: `node ${id} budded from ${parent.id}`,
      points: [parent, node],
    },
  };
}

function death(graph: LivingGraph): OperationResult {
  if (graph.nodes.length <= MIN_NODES) return birth(graph);
  const degree = new Map<number, number>();
  for (const edge of graph.edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }
  const candidates = graph.nodes.filter((node) => node.id !== 1);
  const node = [...candidates].sort((a, b) => {
    const aCost = a.energy + (degree.get(a.id) ?? 0) * 0.12;
    const bCost = b.energy + (degree.get(b.id) ?? 0) * 0.12;
    return aCost - bCost;
  })[0];
  if (!node) return { graph, event: null };
  const incident = graph.edges.filter(
    (edge) => edge.source === node.id || edge.target === node.id,
  );
  return {
    graph: {
      ...graph,
      nodes: graph.nodes.filter((item) => item.id !== node.id),
      edges: graph.edges.filter(
        (edge) => edge.source !== node.id && edge.target !== node.id,
      ),
    },
    event: {
      id: `death-${node.id}-${graph.time}`,
      primitive: "death" as const,
      message: `node ${node.id} shed with ${incident.length} relation${incident.length === 1 ? "" : "s"}`,
      points: [node],
    },
  };
}

function connect(graph: LivingGraph): OperationResult {
  const existing = new Set(
    graph.edges.map((edge) => edgeKey(edge.source, edge.target)),
  );
  let selected: [LivingNode, LivingNode] | null = null;
  let selectedDistance = Infinity;
  for (let index = 0; index < graph.nodes.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < graph.nodes.length; otherIndex += 1) {
      const source = graph.nodes[index];
      const target = graph.nodes[otherIndex];
      if (existing.has(edgeKey(source.id, target.id))) continue;
      const distance = Math.hypot(source.x - target.x, source.y - target.y);
      if (distance < selectedDistance) {
        selected = [source, target];
        selectedDistance = distance;
      }
    }
  }
  if (!selected) return sever(graph);
  const [source, target] = selected;
  const id = graph.nextEdgeId;
  return {
    graph: {
      ...graph,
      edges: [...graph.edges, {
        id,
        source: source.id,
        target: target.id,
        strength: 0.44,
        activity: 0.9,
        age: 0,
      }],
      nextEdgeId: id + 1,
    },
    event: {
      id: `connect-${id}-${graph.time}`,
      primitive: "connect" as const,
      message: `relation ${source.id}—${target.id} formed`,
      points: [source, target],
    },
  };
}

function sever(graph: LivingGraph): OperationResult {
  if (graph.edges.length === 0) return connect(graph);
  const edge = [...graph.edges].sort(
    (a, b) => a.strength * (0.6 + a.activity) - b.strength * (0.6 + b.activity),
  )[0];
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const source = nodeById.get(edge.source);
  const target = nodeById.get(edge.target);
  if (!source || !target) return { graph, event: null };
  return {
    graph: {
      ...graph,
      edges: graph.edges.filter((item) => item.id !== edge.id),
    },
    event: {
      id: `sever-${edge.id}-${graph.time}`,
      primitive: "sever" as const,
      message: `relation ${source.id}—${target.id} severed`,
      points: [source, target],
    },
  };
}

export function applyPrimitive(
  graph: LivingGraph,
  primitive: Primitive,
  position?: Point,
): OperationResult {
  if (primitive === "birth") return birth(graph, position);
  if (primitive === "death") return death(graph);
  if (primitive === "connect") return connect(graph);
  return sever(graph);
}

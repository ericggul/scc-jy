export type Point = { readonly x: number; readonly y: number };
export type Segment = readonly [x1: number, y1: number, x2: number, y2: number];

export type WaveSnapshot = {
  readonly hour: number;
  readonly segments: readonly Segment[];
  readonly tips: readonly Point[];
  readonly branches: readonly Point[];
  readonly fusions: readonly Point[];
  readonly totalLength: number;
  readonly frontDistance: number;
};

export type WaveReplicate = {
  readonly seed: number;
  readonly snapshots: readonly WaveSnapshot[];
};

export const FIELD_WIDTH_MM = 36;
export const FIELD_HEIGHT_MM = 14.1;
export const MAX_HOUR = 90;

const DT = 0.5;
const WARMUP_HOURS = 12;
const RUNNER_SPEED = 0.28;
const ABSORBING_SPEED = 0.16;
const BRANCH_RATE = 0.039;
const BRANCH_ATTENUATION = 0.007;
const FUSION_RATE = 0.022;
const STOPPING_RATE = 0.009;
const DENSITY_RADIUS = 1.15;
const FUSION_RADIUS = 0.22;
const CELL_SIZE = 0.65;

type MutableNode = Point & { id: number; seed: boolean };
type MutableEdge = {
  id: number;
  source: number;
  target: number;
  length: number;
  alive: boolean;
};
type Tip = {
  id: number;
  nodeId: number;
  angle: number;
  kind: "runner" | "absorbing";
  age: number;
  lifespan: number;
  lastEdgeId: number | null;
};

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function gaussian(random: () => number) {
  const first = Math.max(Number.EPSILON, random());
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * random());
}

function closestPoint(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const denominator = dx * dx + dy * dy;
  const amount = denominator === 0
    ? 0
    : Math.min(1, Math.max(0, ((point.x - start.x) * dx + (point.y - start.y) * dy) / denominator));
  const closest = { x: start.x + dx * amount, y: start.y + dy * amount };
  return { closest, distance: Math.hypot(point.x - closest.x, point.y - closest.y) };
}

function angleDelta(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export function simulateWaveReplicate(seed: number): WaveReplicate {
  const random = mulberry32(seed);
  const nodes: MutableNode[] = [];
  const edges: MutableEdge[] = [];
  const branches = new Set<number>();
  const fusions = new Set<number>();
  const edgeCells = new Map<string, Set<number>>();
  let tips: Tip[] = [];
  let nextNodeId = 1;
  let nextEdgeId = 1;
  let nextTipId = 1;

  const addNode = (point: Point, isSeed = false) => {
    const node = { id: nextNodeId, x: point.x, y: point.y, seed: isSeed };
    nextNodeId += 1;
    nodes.push(node);
    return node;
  };

  const indexEdge = (edge: MutableEdge) => {
    const source = nodes[edge.source - 1];
    const target = nodes[edge.target - 1];
    const minX = Math.floor(Math.min(source.x, target.x) / CELL_SIZE);
    const maxX = Math.floor(Math.max(source.x, target.x) / CELL_SIZE);
    const minY = Math.floor(Math.min(source.y, target.y) / CELL_SIZE);
    const maxY = Math.floor(Math.max(source.y, target.y) / CELL_SIZE);
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const key = `${x}:${y}`;
        const bucket = edgeCells.get(key) ?? new Set<number>();
        bucket.add(edge.id);
        edgeCells.set(key, bucket);
      }
    }
  };

  const addEdge = (source: number, target: number) => {
    const first = nodes[source - 1];
    const second = nodes[target - 1];
    const edge = {
      id: nextEdgeId,
      source,
      target,
      length: Math.hypot(second.x - first.x, second.y - first.y),
      alive: true,
    };
    nextEdgeId += 1;
    edges.push(edge);
    indexEdge(edge);
    return edge;
  };

  const nearbyEdgeIds = (point: Point, radius: number) => {
    const ids = new Set<number>();
    const cells = Math.ceil(radius / CELL_SIZE);
    const baseX = Math.floor(point.x / CELL_SIZE);
    const baseY = Math.floor(point.y / CELL_SIZE);
    for (let y = baseY - cells; y <= baseY + cells; y += 1) {
      for (let x = baseX - cells; x <= baseX + cells; x += 1) {
        for (const id of edgeCells.get(`${x}:${y}`) ?? []) ids.add(id);
      }
    }
    return ids;
  };

  const localDensity = (point: Point) => {
    let length = 0;
    for (const id of nearbyEdgeIds(point, DENSITY_RADIUS)) {
      const edge = edges[id - 1];
      if (!edge?.alive) continue;
      const first = nodes[edge.source - 1];
      const second = nodes[edge.target - 1];
      const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
      if (Math.hypot(point.x - midpoint.x, point.y - midpoint.y) <= DENSITY_RADIUS) {
        length += edge.length;
      }
    }
    return length / (Math.PI * DENSITY_RADIUS * DENSITY_RADIUS);
  };

  const splitAndFuse = (tip: Tip, point: Point, density: number) => {
    let candidate: { edge: MutableEdge; point: Point; distance: number } | null = null;
    for (const id of nearbyEdgeIds(point, FUSION_RADIUS * 2)) {
      const edge = edges[id - 1];
      if (!edge?.alive || edge.id === tip.lastEdgeId) continue;
      if (edge.source === tip.nodeId || edge.target === tip.nodeId) continue;
      const result = closestPoint(point, nodes[edge.source - 1], nodes[edge.target - 1]);
      if (result.distance > FUSION_RADIUS) continue;
      if (!candidate || result.distance < candidate.distance) {
        candidate = { edge, point: result.closest, distance: result.distance };
      }
    }
    if (!candidate) return false;
    const acceptance = 1 - Math.exp(-FUSION_RATE * (1 + density) * DT * 6);
    if (random() >= acceptance) return false;
    candidate.edge.alive = false;
    const fusion = addNode(candidate.point);
    fusions.add(fusion.id);
    addEdge(candidate.edge.source, fusion.id);
    addEdge(fusion.id, candidate.edge.target);
    addEdge(tip.nodeId, fusion.id);
    return true;
  };

  const seedCount = 24;
  for (let remaining = seedCount; remaining > 0; remaining -= 1) {
    const x = FIELD_WIDTH_MM * (0.04 + random() * 0.92);
    const root = addNode({ x, y: FIELD_HEIGHT_MM - 0.12 }, true);
    tips.push({
      id: nextTipId++,
      nodeId: root.id,
      angle: -Math.PI / 2 + gaussian(random) * 0.32,
      kind: "runner",
      age: 0,
      lifespan: Number.POSITIVE_INFINITY,
      lastEdgeId: null,
    });
  }

  const makeSnapshot = (hour: number): WaveSnapshot => {
    const visibleEdges = edges.filter((edge) => edge.alive);
    const degrees = new Map<number, number>();
    for (const edge of visibleEdges) {
      degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1);
      degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1);
    }
    const terminalNodes = nodes.filter((node) => !node.seed && degrees.get(node.id) === 1);
    const totalLength = visibleEdges.reduce((sum, edge) => sum + edge.length, 0);
    const minY = visibleEdges.reduce((minimum, edge) => {
      return Math.min(minimum, nodes[edge.source - 1].y, nodes[edge.target - 1].y);
    }, FIELD_HEIGHT_MM);
    return {
      hour,
      segments: visibleEdges.map((edge) => {
        const first = nodes[edge.source - 1];
        const second = nodes[edge.target - 1];
        return [first.x, first.y, second.x, second.y] as const;
      }),
      tips: terminalNodes.map(({ x, y }) => ({ x, y })),
      branches: [...branches].map((id) => nodes[id - 1]).filter(Boolean).map(({ x, y }) => ({ x, y })),
      fusions: [...fusions].map((id) => nodes[id - 1]).filter(Boolean).map(({ x, y }) => ({ x, y })),
      totalLength,
      frontDistance: FIELD_HEIGHT_MM - minY,
    };
  };

  const snapshots: WaveSnapshot[] = [];
  const totalSteps = Math.round((WARMUP_HOURS + MAX_HOUR) / DT);
  for (let step = 0; step <= totalSteps; step += 1) {
    const absoluteHour = step * DT;
    const observedHour = absoluteHour - WARMUP_HOURS;
    if (observedHour >= 0 && Math.abs(observedHour - Math.round(observedHour)) < DT / 2) {
      snapshots.push(makeSnapshot(Math.round(observedHour)));
    }
    if (step === totalSteps) break;

    const nextTips: Tip[] = [];
    for (const tip of tips) {
      const current = nodes[tip.nodeId - 1];
      const density = localDensity(current);
      if (tip.kind === "absorbing" && tip.age >= tip.lifespan) continue;
      const stopHazard = tip.kind === "runner" ? STOPPING_RATE * density : 0.018 + STOPPING_RATE * density;
      if (tip.age > 2 && random() < stopHazard * DT) continue;

      const outward = Math.atan2(current.y - FIELD_HEIGHT_MM, current.x - FIELD_WIDTH_MM / 2);
      const persistence = tip.kind === "runner" ? 0.085 : 0.17;
      const bias = tip.kind === "runner" ? 0.035 : 0.012;
      const angle = tip.angle
        + gaussian(random) * persistence * Math.sqrt(DT)
        + angleDelta(tip.angle, outward) * bias;
      const speed = tip.kind === "runner" ? RUNNER_SPEED : ABSORBING_SPEED;
      const distance = speed * DT * (0.88 + random() * 0.24);
      const point = {
        x: current.x + Math.cos(angle) * distance,
        y: current.y + Math.sin(angle) * distance,
      };
      if (point.x <= 0 || point.x >= FIELD_WIDTH_MM || point.y <= 0 || point.y >= FIELD_HEIGHT_MM) continue;

      if (tip.age > 3 && splitAndFuse(tip, point, density)) continue;

      const node = addNode(point);
      const edge = addEdge(tip.nodeId, node.id);
      const continuing: Tip = {
        ...tip,
        nodeId: node.id,
        angle,
        age: tip.age + DT,
        lastEdgeId: edge.id,
      };
      nextTips.push(continuing);

      if (tips.length + nextTips.length > 900) continue;
      const branchHazard = tip.kind === "absorbing"
        ? Math.max(0.06, 0.18 - BRANCH_ATTENUATION * density)
        : Math.max(0.006, BRANCH_RATE - BRANCH_ATTENUATION * density);
      if (tip.age > 1.5 && random() < branchHazard * DT) {
        branches.add(node.id);
        const absorbing = tip.kind === "absorbing" || random() < 0.68;
        const branchAngle = (absorbing ? 80 : 73) * Math.PI / 180;
        nextTips.push({
          id: nextTipId++,
          nodeId: node.id,
          angle: angle + (random() < 0.5 ? -1 : 1) * (branchAngle + gaussian(random) * 0.13),
          kind: absorbing ? "absorbing" : "runner",
          age: 0,
          lifespan: absorbing ? 6 + random() * 10 : Number.POSITIVE_INFINITY,
          lastEdgeId: edge.id,
        });
      }
    }
    tips = nextTips;
  }

  return { seed, snapshots };
}

export function snapshotAt(replicate: WaveReplicate, hour: number) {
  const bounded = Math.min(MAX_HOUR, Math.max(0, Math.round(hour)));
  return replicate.snapshots[bounded] ?? replicate.snapshots.at(-1)!;
}

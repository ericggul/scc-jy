import type { BarabasiAlbertGraph } from "../model";

export type LayoutPoint = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export type GraphLayout = Map<number, LayoutPoint>;

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const MAX_REPULSION_SAMPLES_PER_CELL = 18;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function seedPosition(id: number, aspectRatio: number) {
  const angle = id * GOLDEN_ANGLE;
  const radius = 0.012;
  return {
    x: clamp(
      0.5 + (Math.cos(angle) * radius) / Math.max(0.7, aspectRatio),
      0.08,
      0.92,
    ),
    y: clamp(0.5 + Math.sin(angle) * radius, 0.08, 0.92),
    vx: 0,
    vy: 0,
  } satisfies LayoutPoint;
}

function arrivalPosition(): LayoutPoint {
  // The PyCX reference inserts every newcomer at (0, 0). In the normalised
  // viewport this is its exact centre; relaxation happens only afterwards.
  return { x: 0.5, y: 0.5, vx: 0, vy: 0 };
}

/** Layout is a renderer concern: the BA model only owns vertices and edges. */
export function synchronizeGraphLayout(
  graph: BarabasiAlbertGraph,
  layout: GraphLayout,
  aspectRatio: number,
) {
  for (const node of graph.nodes) {
    if (!layout.has(node.id)) {
      layout.set(
        node.id,
        node.bornAt === 0
          ? seedPosition(node.id, aspectRatio)
          : arrivalPosition(),
      );
    }
  }
}

export function relaxGraphLayout(
  graph: BarabasiAlbertGraph,
  layout: GraphLayout,
  aspectRatio: number,
  iterations = 1,
) {
  const nodes = graph.nodes;
  const safeAspect = Math.max(0.55, aspectRatio);

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const forces = new Map<number, { x: number; y: number }>();
    for (const node of nodes) forces.set(node.id, { x: 0, y: 0 });

    // Only neighbouring cells repel one another. This is both a natural local
    // force field and keeps a growing graph from becoming an all-pairs loop.
    const cellSize = 0.16;
    const spatialGrid = new Map<string, number[]>();
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index]!;
      const point = layout.get(node.id);
      if (!point) continue;
      const column = Math.floor(point.x / cellSize);
      const row = Math.floor(point.y / cellSize);
      const key = `${column}:${row}`;
      const bucket = spatialGrid.get(key);
      if (bucket) bucket.push(index);
      else spatialGrid.set(key, [index]);
    }

    for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
      const left = nodes[leftIndex]!;
      const leftPoint = layout.get(left.id);
      const leftForce = forces.get(left.id);
      if (!leftPoint || !leftForce) continue;

      const column = Math.floor(leftPoint.x / cellSize);
      const row = Math.floor(leftPoint.y / cellSize);
      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
          const candidates = spatialGrid.get(
            `${column + columnOffset}:${row + rowOffset}`,
          );
          if (!candidates) continue;
          // A dense mature graph may place many vertices in one visual cell.
          // Sampling the local field keeps visual relaxation linear instead of
          // turning it into an all-pairs loop as the network keeps growing.
          const sampleStride = Math.max(
            1,
            Math.ceil(candidates.length / MAX_REPULSION_SAMPLES_PER_CELL),
          );
          const sampleOffset =
            (left.id * 11 + (rowOffset + 1) * 3 + columnOffset + 1) %
            sampleStride;
          for (
            let candidateIndex = sampleOffset;
            candidateIndex < candidates.length;
            candidateIndex += sampleStride
          ) {
            const rightIndex = candidates[candidateIndex]!;
            if (rightIndex <= leftIndex) continue;
            const right = nodes[rightIndex]!;
            const rightPoint = layout.get(right.id);
            const rightForce = forces.get(right.id);
            if (!rightPoint || !rightForce) continue;

            let dx = (rightPoint.x - leftPoint.x) * safeAspect;
            let dy = rightPoint.y - leftPoint.y;
            if (dx * dx + dy * dy < 0.000001) {
              const angle = (left.id * 17 + right.id * 29) * GOLDEN_ANGLE;
              dx = Math.cos(angle) * 0.001;
              dy = Math.sin(angle) * 0.001;
            }
            const distanceSquared = Math.max(0.0016, dx * dx + dy * dy);
            const distance = Math.sqrt(distanceSquared);
            const strength = 0.0000075 / distanceSquared;
            const xForce = (strength * dx) / distance / safeAspect;
            const yForce = (strength * dy) / distance;

            leftForce.x -= xForce;
            leftForce.y -= yForce;
            rightForce.x += xForce;
            rightForce.y += yForce;
          }
        }
      }
    }

    for (const edge of graph.edges) {
      const source = layout.get(edge.source);
      const target = layout.get(edge.target);
      const sourceForce = forces.get(edge.source);
      const targetForce = forces.get(edge.target);
      if (!source || !target || !sourceForce || !targetForce) continue;

      let dx = (target.x - source.x) * safeAspect;
      let dy = target.y - source.y;
      if (dx * dx + dy * dy < 0.000001) {
        const angle = (edge.source * 17 + edge.target * 29) * GOLDEN_ANGLE;
        dx = Math.cos(angle) * 0.001;
        dy = Math.sin(angle) * 0.001;
      }
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const strength = (distance - 0.042) * 0.028;
      const xForce = (strength * dx) / distance / safeAspect;
      const yForce = (strength * dy) / distance;

      sourceForce.x += xForce;
      sourceForce.y += yForce;
      targetForce.x -= xForce;
      targetForce.y -= yForce;
    }

    const maximumDegree = Math.max(...graph.degrees, 1);
    for (const node of nodes) {
      const point = layout.get(node.id);
      const force = forces.get(node.id);
      if (!point || !force) continue;
      let radialX = (point.x - 0.5) * safeAspect;
      let radialY = point.y - 0.5;
      if (radialX * radialX + radialY * radialY < 0.000001) {
        const angle = node.id * GOLDEN_ANGLE;
        radialX = Math.cos(angle) * 0.001;
        radialY = Math.sin(angle) * 0.001;
      }
      const radius = Math.hypot(radialX, radialY);
      const birthShare = graph.generation > 0 ? node.bornAt / graph.generation : 0;
      const degreeShare = (graph.degrees[node.id] ?? 0) / maximumDegree;
      // Older or highly connected vertices settle nearer the centre; newer,
      // lightly connected vertices make the sparse perimeter. This is a soft
      // target, not an outward force, so the graph cannot collect at its frame.
      const outerness =
        0.55 * Math.pow(birthShare, 0.7) +
        0.45 * (1 - Math.sqrt(degreeShare));
      const targetRadius = 0.035 + 0.27 * outerness;
      const radialStrength = (targetRadius - radius) * 0.06;
      const xRadialForce = (radialStrength * radialX) / radius / safeAspect;
      const yRadialForce = (radialStrength * radialY) / radius;
      point.vx = clamp(
        (point.vx + force.x + xRadialForce) * 0.8,
        -0.005,
        0.005,
      );
      point.vy = clamp(
        (point.vy + force.y + yRadialForce) * 0.8,
        -0.005,
        0.005,
      );
      point.x = clamp(point.x + point.vx, 0.08, 0.92);
      point.y = clamp(point.y + point.vy, 0.08, 0.92);
    }
  }
}

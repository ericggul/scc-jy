export type Point = {
  x: number;
  y: number;
};

type SeedPhase = "settled" | "dividing" | "retracting";

type SeedMotion = {
  from: Point;
  to: Point;
  startedAt: number;
  endsAt: number;
};

export type VoronoiSeed = Point & {
  id: number;
  bornAt: number;
  divideReadyAt: number;
  growth: number;
  crowding: number;
  phase: SeedPhase;
  motion: SeedMotion | null;
  dyingAt?: number;
};

export type VoronoiCell = {
  seedId: number;
  polygon: Point[];
  centroid: Point;
  area: number;
};

export type VoronoiDiagram = {
  cells: VoronoiCell[];
};

export type LivingVoronoiState = {
  seeds: VoronoiSeed[];
  width: number;
  height: number;
  time: number;
  nextSeedId: number;
  randomState: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function easeInOutCubic(value: number) {
  const progress = clamp(value, 0, 1);
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function nextRandom(randomState: number) {
  let next = randomState | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return {
    value: unsigned / 4_294_967_296,
    state: unsigned || 0x9e3779b9,
  };
}

function clipPolygonAgainstBisector(
  polygon: Point[],
  site: Point,
  other: Point,
) {
  if (polygon.length === 0) return polygon;

  const axisX = other.x - site.x;
  const axisY = other.y - site.y;
  const midpointX = (site.x + other.x) / 2;
  const midpointY = (site.y + other.y) / 2;
  const nextPolygon: Point[] = [];
  let previous = polygon[polygon.length - 1]!;
  let previousDistance =
    (previous.x - midpointX) * axisX + (previous.y - midpointY) * axisY;
  let previousInside = previousDistance <= 0;

  for (const current of polygon) {
    const currentDistance =
      (current.x - midpointX) * axisX + (current.y - midpointY) * axisY;
    const currentInside = currentDistance <= 0;

    if (currentInside !== previousInside) {
      const ratio = previousDistance / (previousDistance - currentDistance);
      nextPolygon.push({
        x: previous.x + (current.x - previous.x) * ratio,
        y: previous.y + (current.y - previous.y) * ratio,
      });
    }

    if (currentInside) nextPolygon.push(current);
    previous = current;
    previousDistance = currentDistance;
    previousInside = currentInside;
  }

  return nextPolygon;
}

function getPolygonMeasure(polygon: Point[], fallback: Point) {
  if (polygon.length < 3) {
    return { centroid: { ...fallback }, area: 0 };
  }

  let twiceArea = 0;
  let centroidX = 0;
  let centroidY = 0;

  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index]!;
    const next = polygon[(index + 1) % polygon.length]!;
    const cross = current.x * next.y - next.x * current.y;
    twiceArea += cross;
    centroidX += (current.x + next.x) * cross;
    centroidY += (current.y + next.y) * cross;
  }

  if (Math.abs(twiceArea) < 0.0001) {
    return { centroid: { ...fallback }, area: 0 };
  }

  return {
    centroid: {
      x: centroidX / (3 * twiceArea),
      y: centroidY / (3 * twiceArea),
    },
    area: Math.abs(twiceArea) / 2,
  };
}

function getTargetSeedCount(width: number, height: number) {
  return clamp(Math.round((width * height) / 22_000), 38, 88);
}

function getDivisionAxis(cell: VoronoiCell, random: () => number): Point {
  let longestDistance = 0;
  let axis = { x: 1, y: 0 };

  for (let first = 0; first < cell.polygon.length; first += 1) {
    for (let second = first + 1; second < cell.polygon.length; second += 1) {
      const from = cell.polygon[first]!;
      const to = cell.polygon[second]!;
      const x = to.x - from.x;
      const y = to.y - from.y;
      const distance = x * x + y * y;
      if (distance > longestDistance) {
        longestDistance = distance;
        axis = { x, y };
      }
    }
  }

  const length = Math.hypot(axis.x, axis.y) || 1;
  const direction = random() < 0.5 ? -1 : 1;
  return {
    x: (axis.x / length) * direction,
    y: (axis.y / length) * direction,
  };
}

function advanceSeed(seed: VoronoiSeed, time: number): VoronoiSeed | null {
  if (!seed.motion) return seed;

  const duration = Math.max(0.001, seed.motion.endsAt - seed.motion.startedAt);
  const progress = (time - seed.motion.startedAt) / duration;

  if (progress >= 1) {
    if (seed.phase === "retracting") return null;
    return {
      ...seed,
      x: seed.motion.to.x,
      y: seed.motion.to.y,
      phase: "settled",
      motion: null,
    };
  }

  const eased = easeInOutCubic(progress);
  return {
    ...seed,
    x: seed.motion.from.x + (seed.motion.to.x - seed.motion.from.x) * eased,
    y: seed.motion.from.y + (seed.motion.to.y - seed.motion.from.y) * eased,
  };
}

function findNearestNeighbour(seed: VoronoiSeed, seeds: VoronoiSeed[]) {
  let nearest: VoronoiSeed | null = null;
  let shortestDistance = Infinity;

  for (const candidate of seeds) {
    if (candidate.id === seed.id || candidate.phase !== "settled") continue;
    const x = candidate.x - seed.x;
    const y = candidate.y - seed.y;
    const distance = x * x + y * y;
    if (distance < shortestDistance) {
      nearest = candidate;
      shortestDistance = distance;
    }
  }

  return nearest;
}

type CellCandidate = {
  cell: VoronoiCell;
  seed: VoronoiSeed;
  territory: number;
};

function getSettledCells(
  diagram: VoronoiDiagram,
  seeds: VoronoiSeed[],
  targetArea: number,
) {
  const seedsById = new Map(seeds.map((seed) => [seed.id, seed]));
  const candidates: CellCandidate[] = [];

  for (const cell of diagram.cells) {
    const seed = seedsById.get(cell.seedId);
    if (!seed || seed.phase !== "settled" || cell.area <= 0) continue;
    candidates.push({ cell, seed, territory: cell.area / targetArea });
  }

  return candidates;
}

function createSettledSeed(
  id: number,
  point: Point,
  bornAt: number,
  divideReadyAt: number,
  growth: number,
  crowding: number,
): VoronoiSeed {
  return {
    id,
    x: point.x,
    y: point.y,
    bornAt,
    divideReadyAt,
    growth,
    crowding,
    phase: "settled",
    motion: null,
  };
}

function developSettledSeeds(
  seeds: VoronoiSeed[],
  diagram: VoronoiDiagram,
  time: number,
  delta: number,
  width: number,
  height: number,
) {
  const target = getTargetSeedCount(width, height);
  const targetArea = (width * height) / target;
  const cellsBySeed = new Map(
    diagram.cells.map((cell) => [cell.seedId, cell]),
  );
  const populationPressure = Math.max(0, (seeds.length - target) / target);

  return seeds.map((seed) => {
    if (seed.phase !== "settled") return seed;
    const cell = cellsBySeed.get(seed.id);
    if (!cell || cell.area <= 0) return seed;

    const territory = cell.area / targetArea;
    const maturity = clamp((time - seed.bornAt) / 0.5, 0, 1);
    const abundance = clamp((territory - 0.7) / 0.72, 0, 1);
    const stress = clamp((0.98 - territory) / 0.48, 0, 1);
    const relief = clamp((territory - 1) / 0.55, 0, 1);
    const growthRate = 0.1 + abundance * 0.9 - seed.crowding * 0.3;
    const crowdingRate = stress * 1.28 + populationPressure * 0.56 - relief * 0.48;

    return {
      ...seed,
      growth: clamp(seed.growth + delta * maturity * growthRate, 0, 1.25),
      crowding: clamp(
        seed.crowding + delta * maturity * crowdingRate,
        0,
        1.25,
      ),
    };
  });
}

function divideSeed(
  seeds: VoronoiSeed[],
  candidate: CellCandidate,
  time: number,
  nextSeedId: number,
  width: number,
  height: number,
  random: () => number,
) {
  const axis = getDivisionAxis(candidate.cell, random);
  const localScale = Math.sqrt(candidate.cell.area);
  const initialGap = Math.min(0.9, localScale * 0.009);
  const spread = clamp(localScale * (0.17 + random() * 0.06), 11, 42);
  const endsAt = time + 0.42 + random() * 0.42;
  const divideReadyAt = endsAt + 0.7 + random() * 0.65;
  const origin = { x: candidate.seed.x, y: candidate.seed.y };
  const parentStart = {
    x: origin.x - axis.x * initialGap,
    y: origin.y - axis.y * initialGap,
  };
  const childStart = {
    x: origin.x + axis.x * initialGap,
    y: origin.y + axis.y * initialGap,
  };
  const parentTarget = {
    x: clamp(origin.x - axis.x * spread, 3, width - 3),
    y: clamp(origin.y - axis.y * spread, 3, height - 3),
  };
  const childTarget = {
    x: clamp(origin.x + axis.x * spread, 3, width - 3),
    y: clamp(origin.y + axis.y * spread, 3, height - 3),
  };
  const growth = 0.12 + random() * 0.14;
  const parent: VoronoiSeed = {
    ...candidate.seed,
    ...parentStart,
    divideReadyAt,
    growth,
    crowding: 0.1,
    phase: "dividing",
    motion: { from: parentStart, to: parentTarget, startedAt: time, endsAt },
  };
  const child: VoronoiSeed = {
    ...createSettledSeed(
      nextSeedId,
      childStart,
      time,
      divideReadyAt,
      growth,
      0.1,
    ),
    phase: "dividing",
    motion: { from: childStart, to: childTarget, startedAt: time, endsAt },
  };

  return {
    seeds: seeds.map((seed) => (seed.id === parent.id ? parent : seed)).concat(child),
    nextSeedId: nextSeedId + 1,
  };
}

function retractSeed(
  seeds: VoronoiSeed[],
  candidate: CellCandidate,
  time: number,
  random: () => number,
) {
  const neighbour = findNearestNeighbour(candidate.seed, seeds);
  if (!neighbour) return seeds;

  const endsAt = time + 0.46 + random() * 0.4;
  const retracting: VoronoiSeed = {
    ...candidate.seed,
    phase: "retracting",
    dyingAt: endsAt,
    motion: {
      from: { x: candidate.seed.x, y: candidate.seed.y },
      to: { x: neighbour.x, y: neighbour.y },
      startedAt: time,
      endsAt,
    },
  };

  return seeds.map((seed) =>
    seed.id === retracting.id ? retracting : seed,
  );
}

export function getSeedPresence(seed: VoronoiSeed, time: number) {
  const emerging = clamp((time - seed.bornAt) / 0.2, 0, 1);
  const withdrawing = seed.dyingAt
    ? clamp((seed.dyingAt - time) / 0.22, 0, 1)
    : 1;
  return Math.min(emerging, withdrawing);
}

export function createVoronoiDiagram(
  seeds: readonly VoronoiSeed[],
  width: number,
  height: number,
): VoronoiDiagram {
  const cells = seeds.map((seed) => {
    let polygon: Point[] = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
    ];

    for (const other of seeds) {
      if (other.id === seed.id) continue;
      polygon = clipPolygonAgainstBisector(polygon, seed, other);
      if (polygon.length === 0) break;
    }

    const measure = getPolygonMeasure(polygon, seed);
    return {
      seedId: seed.id,
      polygon,
      centroid: measure.centroid,
      area: measure.area,
    };
  });

  return { cells };
}

export function createLivingVoronoiState(
  width: number,
  height: number,
  seed = 0x7f2b39d1,
): LivingVoronoiState {
  const count = getTargetSeedCount(width, height);
  const seeds: VoronoiSeed[] = [];
  let randomState = seed >>> 0 || 1;
  const random = () => {
    const next = nextRandom(randomState);
    randomState = next.state;
    return next.value;
  };
  const inset = clamp(Math.min(width, height) * 0.012, 8, 18);

  for (let index = 0; index < count; index += 1) {
    seeds.push(
      createSettledSeed(
        index + 1,
        {
          x: inset + random() * Math.max(1, width - inset * 2),
          y: inset + random() * Math.max(1, height - inset * 2),
        },
        -1,
        random() * 0.6,
        0.48 + random() * 0.44,
        random() * 0.18,
      ),
    );
  }

  return {
    seeds,
    width,
    height,
    time: 0,
    nextSeedId: count + 1,
    randomState,
  };
}

export function resizeLivingVoronoiState(
  state: LivingVoronoiState,
  width: number,
  height: number,
): LivingVoronoiState {
  if (state.width <= 0 || state.height <= 0) {
    return createLivingVoronoiState(width, height);
  }

  const scaleX = width / state.width;
  const scaleY = height / state.height;
  const scalePoint = (point: Point) => ({
    x: point.x * scaleX,
    y: point.y * scaleY,
  });

  return {
    ...state,
    width,
    height,
    seeds: state.seeds.map((seed) => ({
      ...seed,
      ...scalePoint(seed),
      motion: seed.motion
        ? {
            ...seed.motion,
            from: scalePoint(seed.motion.from),
            to: scalePoint(seed.motion.to),
          }
        : null,
    })),
  };
}

export function stepLivingVoronoi(
  state: LivingVoronoiState,
  deltaSeconds: number,
): LivingVoronoiState {
  const delta = clamp(deltaSeconds, 0, 0.05);
  if (delta === 0) return state;

  const time = state.time + delta;
  const advancedSeeds: VoronoiSeed[] = [];
  for (const seed of state.seeds) {
    const advanced = advanceSeed(seed, time);
    if (advanced) advancedSeeds.push(advanced);
  }

  const diagram = createVoronoiDiagram(
    advancedSeeds,
    state.width,
    state.height,
  );
  const developedSeeds = developSettledSeeds(
    advancedSeeds,
    diagram,
    time,
    delta,
    state.width,
    state.height,
  );
  const target = getTargetSeedCount(state.width, state.height);
  const targetArea = (state.width * state.height) / target;
  const settledCells = getSettledCells(diagram, developedSeeds, targetArea);
  let randomState = state.randomState;
  const random = () => {
    const next = nextRandom(randomState);
    randomState = next.state;
    return next.value;
  };
  let nextSeeds = developedSeeds;
  let nextSeedId = state.nextSeedId;
  const maxPopulation = target + Math.max(8, Math.round(target * 0.16));
  const minimumPopulation = target - Math.max(4, Math.round(target * 0.08));
  const activeDivisions = nextSeeds.filter(
    (seed) => seed.phase === "dividing",
  ).length;
  const activeRetractions = nextSeeds.filter(
    (seed) => seed.phase === "retracting",
  ).length;
  const divisionCapacity = Math.max(4, Math.round(target * 0.18));
  const retractionCapacity = Math.max(3, Math.round(target * 0.1));
  const divisionCandidates = settledCells
    .filter(
      ({ seed }) =>
        seed.growth >= 1 &&
        seed.crowding < 0.76 &&
        seed.divideReadyAt <= time,
    )
    .sort(
      (first, second) =>
        second.seed.growth + second.territory * 0.34 -
        (first.seed.growth + first.territory * 0.34),
    );
  const dividingIds = new Set<number>();

  for (const candidate of divisionCandidates) {
    if (
      nextSeeds.length >= maxPopulation ||
      activeDivisions + dividingIds.size >= divisionCapacity
    ) {
      break;
    }
    const division = divideSeed(
      nextSeeds,
      candidate,
      time,
      nextSeedId,
      state.width,
      state.height,
      random,
    );
    nextSeeds = division.seeds;
    nextSeedId = division.nextSeedId;
    dividingIds.add(candidate.seed.id);
  }

  const retractionCandidates = settledCells
    .filter(
      ({ seed }) =>
        !dividingIds.has(seed.id) &&
        seed.crowding >= 0.9 &&
        time - seed.bornAt >= 0.7,
    )
    .sort(
      (first, second) =>
        second.seed.crowding -
        first.seed.crowding +
        (first.territory - second.territory) * 0.34,
    );
  let startedRetractions = 0;

  for (const candidate of retractionCandidates) {
    if (
      nextSeeds.length <= minimumPopulation ||
      activeRetractions + startedRetractions >= retractionCapacity
    ) {
      break;
    }
    nextSeeds = retractSeed(nextSeeds, candidate, time, random);
    startedRetractions += 1;
  }

  return {
    ...state,
    seeds: nextSeeds,
    time,
    nextSeedId,
    randomState,
  };
}

export type Point = {
  x: number;
  y: number;
};

type SeedPhase = "settled" | "budding" | "dividing" | "retracting";

type SeedMotion = {
  from: Point;
  to: Point;
  startedAt: number;
  endsAt: number;
};

export type LivingVoronoiParameters = {
  minimumPopulation: number;
  maximumPopulation: number;
  tempo: number;
  separation: number;
};

export type VoronoiSeed = Point & {
  id: number;
  bornAt: number;
  divideReadyAt: number;
  growth: number;
  crowding: number;
  phase: SeedPhase;
  motion: SeedMotion | null;
  budAxis?: Point;
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

export const defaultLivingVoronoiParameters: LivingVoronoiParameters = {
  minimumPopulation: 20,
  maximumPopulation: 100,
  tempo: 1.3,
  separation: 1,
};

const TAU = Math.PI * 2;

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

function normalizeParameters(
  parameters: LivingVoronoiParameters,
): LivingVoronoiParameters {
  const minimumPopulation = Math.round(
    clamp(parameters.minimumPopulation, 6, 30),
  );
  const maximumPopulation = Math.round(
    clamp(parameters.maximumPopulation, minimumPopulation + 8, 300),
  );
  return {
    minimumPopulation,
    maximumPopulation,
    tempo: clamp(parameters.tempo, 0.5, 2.5),
    separation: clamp(parameters.separation, 0.65, 1.7),
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
    if (seed.phase === "budding") {
      return {
        ...seed,
        x: seed.motion.to.x,
        y: seed.motion.to.y,
        motion: null,
      };
    }
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

function driftSettledSeeds(
  seeds: VoronoiSeed[],
  diagram: VoronoiDiagram,
  delta: number,
  width: number,
  height: number,
) {
  const cellsBySeed = new Map(
    diagram.cells.map((cell) => [cell.seedId, cell]),
  );
  const drift = clamp(delta * 0.09, 0, 0.005);

  return seeds.map((seed) => {
    if (seed.phase !== "settled") return seed;
    const cell = cellsBySeed.get(seed.id);
    if (!cell) return seed;
    return {
      ...seed,
      x: clamp(seed.x + (cell.centroid.x - seed.x) * drift, 3, width - 3),
      y: clamp(seed.y + (cell.centroid.y - seed.y) * drift, 3, height - 3),
    };
  });
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

function getTargetPopulation(
  parameters: LivingVoronoiParameters,
  time: number,
) {
  const additionalRange = Math.max(
    0,
    parameters.maximumPopulation - parameters.minimumPopulation - 80,
  );
  const cycleSeconds = (8 + additionalRange * 0.008) / parameters.tempo;
  const pulse = 0.5 - 0.5 * Math.cos((TAU * time) / cycleSeconds);
  return Math.round(
    parameters.minimumPopulation +
      (parameters.maximumPopulation - parameters.minimumPopulation) * pulse,
  );
}

function developSettledSeeds(
  seeds: VoronoiSeed[],
  diagram: VoronoiDiagram,
  time: number,
  delta: number,
  width: number,
  height: number,
  parameters: LivingVoronoiParameters,
  targetPopulation: number,
) {
  const cellsBySeed = new Map(
    diagram.cells.map((cell) => [cell.seedId, cell]),
  );
  const populationRange =
    parameters.maximumPopulation - parameters.minimumPopulation;
  const populationSlope = clamp(
    (targetPopulation - seeds.length) / Math.max(1, populationRange),
    -1,
    1,
  );

  return seeds.map((seed) => {
    if (seed.phase !== "settled") return seed;
    const cell = cellsBySeed.get(seed.id);
    if (!cell || cell.area <= 0) return seed;

    const expectedArea = (width * height) / Math.max(1, targetPopulation);
    const territory = cell.area / Math.max(1, expectedArea);
    const maturity = clamp((time - seed.bornAt) / 0.08, 0, 1);
    const abundance = clamp((territory - 0.7) / 0.65, 0, 1);
    const scarcity = clamp((0.98 - territory) / 0.5, 0, 1);
    const fertility = Math.max(0, populationSlope);
    const collapse = Math.max(0, -populationSlope);
    const growthRate =
      0.18 + abundance * 0.72 + fertility * 3.2 - seed.crowding * 0.72;
    const crowdingRate = scarcity * 0.48 + collapse * 4.6 - abundance * 0.18;

    return {
      ...seed,
      growth: clamp(
        seed.growth + delta * maturity * parameters.tempo * growthRate,
        0,
        1.2,
      ),
      crowding: clamp(
        seed.crowding + delta * maturity * parameters.tempo * crowdingRate,
        0,
        1.2,
      ),
    };
  });
}

function beginBudding(
  seeds: VoronoiSeed[],
  candidate: CellCandidate,
  time: number,
  width: number,
  height: number,
  parameters: LivingVoronoiParameters,
  random: () => number,
) {
  const axis = getDivisionAxis(candidate.cell, random);
  const localScale = Math.sqrt(candidate.cell.area);
  const preparationDistance = clamp(
    localScale * 0.035 * parameters.separation,
    4,
    16,
  );
  const origin = { x: candidate.seed.x, y: candidate.seed.y };
  const target = {
    x: clamp(origin.x + axis.x * preparationDistance, 3, width - 3),
    y: clamp(origin.y + axis.y * preparationDistance, 3, height - 3),
  };
  const endsAt = time + (0.22 + random() * 0.2) / parameters.tempo;
  const budding: VoronoiSeed = {
    ...candidate.seed,
    phase: "budding",
    budAxis: axis,
    motion: { from: origin, to: target, startedAt: time, endsAt },
  };

  return seeds.map((seed) => (seed.id === budding.id ? budding : seed));
}

function divideSeed(
  seeds: VoronoiSeed[],
  candidate: CellCandidate,
  time: number,
  nextSeedId: number,
  width: number,
  height: number,
  parameters: LivingVoronoiParameters,
  random: () => number,
) {
  const axis = candidate.seed.budAxis ?? getDivisionAxis(candidate.cell, random);
  const localScale = Math.sqrt(candidate.cell.area);
  const initialGap = Math.min(1, localScale * 0.012);
  const spread = clamp(
    localScale * (0.14 + random() * 0.1) * parameters.separation,
    14,
    82,
  );
  const endsAt = time + (0.32 + random() * 0.28) / parameters.tempo;
  const divideReadyAt = endsAt + (0.16 + random() * 0.16) / parameters.tempo;
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
  const growth = 0.08 + random() * 0.12;
  const parent: VoronoiSeed = {
    ...candidate.seed,
    ...parentStart,
    divideReadyAt,
    growth,
    crowding: 0.06,
    phase: "dividing",
    budAxis: undefined,
    motion: { from: parentStart, to: parentTarget, startedAt: time, endsAt },
  };
  const child: VoronoiSeed = {
    ...createSettledSeed(
      nextSeedId,
      childStart,
      time,
      divideReadyAt,
      growth,
      0.06,
    ),
    phase: "dividing",
    budAxis: undefined,
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
  tempo: number,
  random: () => number,
) {
  const neighbour = findNearestNeighbour(candidate.seed, seeds);
  if (!neighbour) return seeds;

  const endsAt = time + (0.22 + random() * 0.2) / tempo;
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
  const emerging = clamp((time - seed.bornAt) / 0.14, 0, 1);
  const retreatStartedAt = seed.motion?.startedAt ?? time;
  const withdrawing = seed.dyingAt
    ? clamp(
        (seed.dyingAt - time) /
          Math.max(0.001, seed.dyingAt - retreatStartedAt),
        0,
        1,
      )
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
  seed = 0x6a3d91e7,
  parameters = defaultLivingVoronoiParameters,
): LivingVoronoiState {
  const normalized = normalizeParameters(parameters);
  const count = normalized.minimumPopulation;
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
        random() * 0.12,
        0.72 + random() * 0.24,
        random() * 0.08,
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
  parameters = defaultLivingVoronoiParameters,
): LivingVoronoiState {
  if (state.width <= 0 || state.height <= 0) {
    return createLivingVoronoiState(width, height, undefined, parameters);
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
  parameters = defaultLivingVoronoiParameters,
): LivingVoronoiState {
  const delta = clamp(deltaSeconds, 0, 0.05);
  if (delta === 0) return state;

  const normalized = normalizeParameters(parameters);
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
  const driftingSeeds = driftSettledSeeds(
    advancedSeeds,
    diagram,
    delta,
    state.width,
    state.height,
  );
  const targetPopulation = getTargetPopulation(normalized, time);
  const developedSeeds = developSettledSeeds(
    driftingSeeds,
    diagram,
    time,
    delta,
    state.width,
    state.height,
    normalized,
    targetPopulation,
  );
  const targetArea =
    (state.width * state.height) / Math.max(1, targetPopulation);
  let randomState = state.randomState;
  const random = () => {
    const next = nextRandom(randomState);
    randomState = next.state;
    return next.value;
  };
  let nextSeeds = developedSeeds;
  let nextSeedId = state.nextSeedId;
  const range = normalized.maximumPopulation - normalized.minimumPopulation;
  const divisionCapacity = Math.max(3, Math.round(range * 0.22));
  const retractionCapacity = Math.max(3, Math.round(range * 0.25));
  const seedsById = new Map(nextSeeds.map((seed) => [seed.id, seed]));
  const readyBuds: CellCandidate[] = [];

  for (const cell of diagram.cells) {
    const seed = seedsById.get(cell.seedId);
    if (
      seed?.phase === "budding" &&
      !seed.motion &&
      seed.budAxis &&
      cell.area > 0
    ) {
      readyBuds.push({
        cell,
        seed,
        territory: cell.area / targetArea,
      });
    }
  }

  for (const bud of readyBuds) {
    if (nextSeeds.length >= normalized.maximumPopulation) break;
    const division = divideSeed(
      nextSeeds,
      bud,
      time,
      nextSeedId,
      state.width,
      state.height,
      normalized,
      random,
    );
    nextSeeds = division.seeds;
    nextSeedId = division.nextSeedId;
  }

  const settledCells = getSettledCells(diagram, nextSeeds, targetArea);
  const activeDivisions = nextSeeds.filter(
    (seed) => seed.phase === "dividing",
  ).length;
  const activeBuds = nextSeeds.filter((seed) => seed.phase === "budding").length;
  const activeRetractions = nextSeeds.filter(
    (seed) => seed.phase === "retracting",
  ).length;
  const divisionCandidates = settledCells
    .filter(
      ({ seed }) =>
        seed.growth >= 1 &&
        seed.crowding < 0.72 &&
        seed.divideReadyAt <= time,
    )
    .sort(
      (first, second) =>
        second.seed.growth + second.territory * 0.28 -
        (first.seed.growth + first.territory * 0.28),
    );
  const buddingIds = new Set<number>();
  const simultaneousBudStarts =
    1 + Math.floor(Math.max(0, range - 80) / 65);

  for (const candidate of divisionCandidates) {
    if (
      nextSeeds.length >= normalized.maximumPopulation ||
      activeBuds + activeDivisions / 2 + buddingIds.size >= divisionCapacity ||
      buddingIds.size >= simultaneousBudStarts
    ) {
      break;
    }
    nextSeeds = beginBudding(
      nextSeeds,
      candidate,
      time,
      state.width,
      state.height,
      normalized,
      random,
    );
    buddingIds.add(candidate.seed.id);
  }

  const retractionCandidates = settledCells
    .filter(
      ({ seed }) =>
        !buddingIds.has(seed.id) &&
        seed.crowding >= 0.84 &&
        time - seed.bornAt >= 0.2,
    )
    .sort(
      (first, second) =>
        second.seed.crowding -
        first.seed.crowding +
        (first.territory - second.territory) * 0.24,
    );
  let startedRetractions = 0;

  for (const candidate of retractionCandidates) {
    if (
      nextSeeds.length - activeRetractions - startedRetractions <=
        normalized.minimumPopulation ||
      activeRetractions + startedRetractions >= retractionCapacity ||
      startedRetractions >= 1
    ) {
      break;
    }
    nextSeeds = retractSeed(
      nextSeeds,
      candidate,
      time,
      normalized.tempo,
      random,
    );
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

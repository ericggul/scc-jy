export type Star = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  energy: number;
  activity: number;
  trait: number;
  age: number;
  lifespan: number;
  generation: number;
};

export type Relation = {
  id: number;
  source: number;
  target: number;
  strength: number;
  flow: number;
  age: number;
};

export type ConstellationEvents = {
  births: number;
  deaths: number;
  formed: number;
  severed: number;
};

export type ConstellationState = {
  stars: Star[];
  relations: Relation[];
  resource: Float64Array;
  columns: number;
  rows: number;
  nextStarId: number;
  nextRelationId: number;
  randomState: number;
  time: number;
};

export type ConstellationStep = {
  state: ConstellationState;
  events: ConstellationEvents;
};

export type ConstellationMetrics = {
  stars: number;
  relations: number;
  components: number;
  meanEnergy: number;
  meanStrength: number;
  resource: number;
  flow: number;
};

export type ConstellationParameters = {
  resourceRegeneration: number;
  metabolism: number;
  birthEnergy: number;
  relationFormation: number;
  relationDecay: number;
};

export const DEFAULT_CONSTELLATION_PARAMETERS: ConstellationParameters = {
  resourceRegeneration: 0.018,
  metabolism: 0.028,
  birthEnergy: 0.79,
  relationFormation: 0.31,
  relationDecay: 0.032,
};

const COLUMNS = 34;
const ROWS = 22;
const INITIAL_STARS = 44;
const MAX_STARS = 132;
const RESOURCE_CAPACITY = 1.15;
const RESOURCE_DIFFUSION = 0.13;
const UPTAKE_RATE = 0.105;
const RELATION_COST = 0.0065;
const FLOW_REINFORCEMENT = 0.19;
const FORMATION_RADIUS = 0.235;
const BIRTH_COST = 0.34;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

function nextRandom(randomState: number): readonly [number, number] {
  const next = (randomState * 1_664_525 + 1_013_904_223) >>> 0;
  return [next / 4_294_967_296, next];
}

function cellIndex(
  x: number,
  y: number,
  columns: number,
  rows: number,
) {
  const column = clamp(Math.floor(x * columns), 0, columns - 1);
  const row = clamp(Math.floor(y * rows), 0, rows - 1);
  return row * columns + column;
}

function sampleResource(
  resource: Float64Array,
  columns: number,
  rows: number,
  x: number,
  y: number,
) {
  return resource[cellIndex(x, y, columns, rows)] ?? 0;
}

function addResourceAt(
  resource: Float64Array,
  columns: number,
  rows: number,
  x: number,
  y: number,
  amount: number,
) {
  const centerColumn = clamp(Math.floor(x * columns), 0, columns - 1);
  const centerRow = clamp(Math.floor(y * rows), 0, rows - 1);
  const radius = 3;
  const deposits: Array<{ index: number; weight: number }> = [];
  let totalWeight = 0;

  for (let rowOffset = -radius; rowOffset <= radius; rowOffset += 1) {
    for (let columnOffset = -radius; columnOffset <= radius; columnOffset += 1) {
      const column = centerColumn + columnOffset;
      const row = centerRow + rowOffset;
      if (column < 0 || column >= columns || row < 0 || row >= rows) continue;
      const distanceSquared = columnOffset ** 2 + rowOffset ** 2;
      const weight = Math.exp(-distanceSquared / 4.2);
      deposits.push({ index: row * columns + column, weight });
      totalWeight += weight;
    }
  }

  for (const deposit of deposits) {
    resource[deposit.index] = clamp(
      (resource[deposit.index] ?? 0) + amount * deposit.weight / totalWeight,
      0,
      RESOURCE_CAPACITY,
    );
  }
}

function relationKey(source: number, target: number) {
  return source < target ? `${source}:${target}` : `${target}:${source}`;
}

function createStar(
  id: number,
  x: number,
  y: number,
  energy: number,
  trait: number,
  lifespan: number,
  generation = 0,
): Star {
  return {
    id,
    x,
    y,
    vx: 0,
    vy: 0,
    energy,
    activity: sigmoid((energy - 0.4) * 8),
    trait,
    age: 0,
    lifespan,
    generation,
  };
}

export function createConstellationState(
  seed = 0x7a31e9b5,
): ConstellationState {
  let randomState = seed >>> 0;
  const random = () => {
    const [value, next] = nextRandom(randomState);
    randomState = next;
    return value;
  };
  const resource = new Float64Array(COLUMNS * ROWS);

  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const wave = Math.sin(column * 0.47 + row * 0.21) * 0.09;
      resource[row * COLUMNS + column] = clamp(
        0.43 + wave + random() * 0.31,
        0,
        RESOURCE_CAPACITY,
      );
    }
  }

  addResourceAt(resource, COLUMNS, ROWS, 0.28, 0.33, 5.4);
  addResourceAt(resource, COLUMNS, ROWS, 0.72, 0.67, 5.1);

  const stars = Array.from({ length: INITIAL_STARS }, (_, index) =>
    createStar(
      index + 1,
      0.055 + random() * 0.89,
      0.07 + random() * 0.86,
      0.39 + random() * 0.31,
      random(),
      42 + random() * 54,
    ),
  );

  const candidatePairs: Array<{
    source: Star;
    target: Star;
    distance: number;
  }> = [];
  for (let sourceIndex = 0; sourceIndex < stars.length; sourceIndex += 1) {
    const source = stars[sourceIndex];
    if (!source) continue;
    for (let targetIndex = sourceIndex + 1; targetIndex < stars.length; targetIndex += 1) {
      const target = stars[targetIndex];
      if (!target) continue;
      candidatePairs.push({
        source,
        target,
        distance: Math.hypot(target.x - source.x, target.y - source.y),
      });
    }
  }
  candidatePairs.sort((left, right) => left.distance - right.distance);

  const degrees = new Map<number, number>();
  const relations: Relation[] = [];
  for (const candidate of candidatePairs) {
    if (candidate.distance > 0.19) break;
    const sourceDegree = degrees.get(candidate.source.id) ?? 0;
    const targetDegree = degrees.get(candidate.target.id) ?? 0;
    if (sourceDegree >= 2 || targetDegree >= 2) continue;
    relations.push({
      id: relations.length + 1,
      source: candidate.source.id,
      target: candidate.target.id,
      strength: 0.36 + random() * 0.24,
      flow: 0,
      age: random() * 5,
    });
    degrees.set(candidate.source.id, sourceDegree + 1);
    degrees.set(candidate.target.id, targetDegree + 1);
  }

  return {
    stars,
    relations,
    resource,
    columns: COLUMNS,
    rows: ROWS,
    nextStarId: stars.length + 1,
    nextRelationId: relations.length + 1,
    randomState,
    time: 0,
  };
}

export function supplyResource(
  state: ConstellationState,
  point: { x: number; y: number },
  amount = 4.8,
): ConstellationState {
  const resource = state.resource.slice();
  addResourceAt(
    resource,
    state.columns,
    state.rows,
    clamp(point.x, 0, 1),
    clamp(point.y, 0, 1),
    Math.max(0, amount),
  );
  return { ...state, resource };
}

function diffuseAndRegenerate(
  resource: Float64Array,
  columns: number,
  rows: number,
  delta: number,
  regeneration: number,
) {
  const next = resource.slice();
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const value = resource[index] ?? 0;
      let neighborTotal = 0;
      let neighborCount = 0;
      const neighbors = [
        [column - 1, row],
        [column + 1, row],
        [column, row - 1],
        [column, row + 1],
      ] as const;
      for (const [neighborColumn, neighborRow] of neighbors) {
        if (
          neighborColumn < 0 || neighborColumn >= columns ||
          neighborRow < 0 || neighborRow >= rows
        ) continue;
        neighborTotal += resource[neighborRow * columns + neighborColumn] ?? 0;
        neighborCount += 1;
      }
      const laplacian = neighborCount > 0
        ? neighborTotal / neighborCount - value
        : 0;
      next[index] = clamp(
        value + delta * (
          RESOURCE_DIFFUSION * laplacian +
          regeneration * (RESOURCE_CAPACITY - value)
        ),
        0,
        RESOURCE_CAPACITY,
      );
    }
  }
  return next;
}

function resourceGradient(
  resource: Float64Array,
  columns: number,
  rows: number,
  x: number,
  y: number,
) {
  const stepX = 1 / columns;
  const stepY = 1 / rows;
  return {
    x: sampleResource(resource, columns, rows, x + stepX, y) -
      sampleResource(resource, columns, rows, x - stepX, y),
    y: sampleResource(resource, columns, rows, x, y + stepY) -
      sampleResource(resource, columns, rows, x, y - stepY),
  };
}

function returnEnergy(
  resource: Float64Array,
  columns: number,
  rows: number,
  x: number,
  y: number,
  energy: number,
) {
  const index = cellIndex(x, y, columns, rows);
  resource[index] = clamp(
    (resource[index] ?? 0) + Math.max(0, energy),
    0,
    RESOURCE_CAPACITY,
  );
}

export function stepConstellation(
  current: ConstellationState,
  requestedDelta: number,
  requestedParameters: ConstellationParameters = DEFAULT_CONSTELLATION_PARAMETERS,
): ConstellationStep {
  const delta = clamp(requestedDelta, 0, 0.05);
  if (delta === 0) {
    return {
      state: current,
      events: { births: 0, deaths: 0, formed: 0, severed: 0 },
    };
  }
  const parameters: ConstellationParameters = {
    resourceRegeneration: clamp(requestedParameters.resourceRegeneration, 0, 0.08),
    metabolism: clamp(requestedParameters.metabolism, 0.008, 0.09),
    birthEnergy: clamp(requestedParameters.birthEnergy, 0.5, 1.15),
    relationFormation: clamp(requestedParameters.relationFormation, 0, 0.9),
    relationDecay: clamp(requestedParameters.relationDecay, 0, 0.14),
  };

  let randomState = current.randomState;
  const random = () => {
    const [value, next] = nextRandom(randomState);
    randomState = next;
    return value;
  };
  const shuffled = <T>(values: readonly T[]) => {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      const temporary = result[index] as T;
      result[index] = result[swapIndex] as T;
      result[swapIndex] = temporary;
    }
    return result;
  };
  const resource = diffuseAndRegenerate(
    current.resource,
    current.columns,
    current.rows,
    delta,
    parameters.resourceRegeneration,
  );
  const stars = current.stars.map((star) => ({ ...star }));
  const starById = new Map(stars.map((star) => [star.id, star]));
  const acceleration = new Map(
    stars.map((star) => [star.id, { x: 0, y: 0 }]),
  );
  const degrees = new Map<number, number>();
  const relations: Relation[] = [];
  let severed = 0;

  for (const previous of shuffled(current.relations)) {
    const source = starById.get(previous.source);
    const target = starById.get(previous.target);
    if (!source || !target) continue;

    degrees.set(source.id, (degrees.get(source.id) ?? 0) + 1);
    degrees.set(target.id, (degrees.get(target.id) ?? 0) + 1);
    const difference = source.energy - target.energy;
    const proposedFlow = difference * previous.strength * 0.42;
    const donor = proposedFlow >= 0 ? source : target;
    const receiver = proposedFlow >= 0 ? target : source;
    const transferred = Math.min(
      Math.abs(proposedFlow) * delta,
      Math.max(0, donor.energy - 0.018),
    );
    donor.energy -= transferred;
    receiver.energy += transferred * 0.91;
    returnEnergy(
      resource,
      current.columns,
      current.rows,
      (source.x + target.x) / 2,
      (source.y + target.y) / 2,
      transferred * 0.09,
    );

    const maintenance = RELATION_COST * previous.strength * delta;
    const sourceCost = Math.min(source.energy, maintenance);
    const targetCost = Math.min(target.energy, maintenance);
    source.energy -= sourceCost;
    target.energy -= targetCost;
    returnEnergy(
      resource,
      current.columns,
      current.rows,
      (source.x + target.x) / 2,
      (source.y + target.y) / 2,
      (sourceCost + targetCost) * 0.72,
    );

    const flowRate = delta > 0 ? transferred / delta : 0;
    const signedFlow = proposedFlow >= 0 ? flowRate : -flowRate;
    const flowMemory = previous.flow + (signedFlow - previous.flow) *
      Math.min(1, delta * 4.5);
    const reinforcement = FLOW_REINFORCEMENT * Math.min(1, flowRate / 0.08);
    const strength = clamp(
      previous.strength + delta * (reinforcement - parameters.relationDecay),
      0,
      1,
    );

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.max(0.001, Math.hypot(dx, dy));
    const preferredDistance = 0.075 + (1 - strength) * 0.055;
    const pull = (distance - preferredDistance) * strength * 0.16;
    const sourceAcceleration = acceleration.get(source.id);
    const targetAcceleration = acceleration.get(target.id);
    if (sourceAcceleration && targetAcceleration) {
      sourceAcceleration.x += dx / distance * pull;
      sourceAcceleration.y += dy / distance * pull;
      targetAcceleration.x -= dx / distance * pull;
      targetAcceleration.y -= dy / distance * pull;
    }

    if (strength < 0.055 || source.energy <= 0 || target.energy <= 0) {
      severed += 1;
      degrees.set(source.id, Math.max(0, (degrees.get(source.id) ?? 1) - 1));
      degrees.set(target.id, Math.max(0, (degrees.get(target.id) ?? 1) - 1));
      continue;
    }
    relations.push({
      ...previous,
      strength,
      flow: flowMemory,
      age: previous.age + delta,
    });
  }

  for (let sourceIndex = 0; sourceIndex < stars.length; sourceIndex += 1) {
    const source = stars[sourceIndex];
    if (!source) continue;
    for (let targetIndex = sourceIndex + 1; targetIndex < stars.length; targetIndex += 1) {
      const target = stars[targetIndex];
      if (!target) continue;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.max(0.004, Math.hypot(dx, dy));
      if (distance >= 0.095) continue;
      const repulsion = (0.095 - distance) * 0.21;
      const sourceAcceleration = acceleration.get(source.id);
      const targetAcceleration = acceleration.get(target.id);
      if (sourceAcceleration && targetAcceleration) {
        sourceAcceleration.x -= dx / distance * repulsion;
        sourceAcceleration.y -= dy / distance * repulsion;
        targetAcceleration.x += dx / distance * repulsion;
        targetAcceleration.y += dy / distance * repulsion;
      }
    }
  }

  for (const star of shuffled(stars)) {
    const resourceIndex = cellIndex(
      star.x,
      star.y,
      current.columns,
      current.rows,
    );
    const demand = UPTAKE_RATE * (0.45 + star.activity * 0.55) * delta;
    const uptake = Math.min(resource[resourceIndex] ?? 0, demand);
    resource[resourceIndex] = Math.max(0, (resource[resourceIndex] ?? 0) - uptake);
    const degree = degrees.get(star.id) ?? 0;
    const crowdingCost = Math.max(0, degree - 4) * 0.0035;
    star.energy = Math.max(
      0,
      star.energy + uptake * 0.86 - delta * (parameters.metabolism + crowdingCost),
    );
    star.age += delta;
    const targetActivity = sigmoid((star.energy - 0.39) * 9 - degree * 0.08);
    star.activity += (targetActivity - star.activity) * Math.min(1, delta * 2.8);

    const gradient = resourceGradient(
      resource,
      current.columns,
      current.rows,
      star.x,
      star.y,
    );
    const starAcceleration = acceleration.get(star.id);
    if (starAcceleration) {
      starAcceleration.x += gradient.x * (0.12 + star.trait * 0.1);
      starAcceleration.y += gradient.y * (0.12 + star.trait * 0.1);
      starAcceleration.x += (random() - 0.5) * 0.0028;
      starAcceleration.y += (random() - 0.5) * 0.0028;
      star.vx = (star.vx + starAcceleration.x * delta) * Math.exp(-1.8 * delta);
      star.vy = (star.vy + starAcceleration.y * delta) * Math.exp(-1.8 * delta);
    }
    star.x += star.vx * delta;
    star.y += star.vy * delta;
    if (star.x < 0.025 || star.x > 0.975) {
      star.x = clamp(star.x, 0.025, 0.975);
      star.vx *= -0.62;
    }
    if (star.y < 0.035 || star.y > 0.965) {
      star.y = clamp(star.y, 0.035, 0.965);
      star.vy *= -0.62;
    }
  }

  const relationKeys = new Set(
    relations.map((relation) => relationKey(relation.source, relation.target)),
  );
  let nextRelationId = current.nextRelationId;
  let formed = 0;
  const formationCandidates: Array<readonly [Star, Star]> = [];
  for (let sourceIndex = 0; sourceIndex < stars.length; sourceIndex += 1) {
    const source = stars[sourceIndex];
    if (!source) continue;
    for (let targetIndex = sourceIndex + 1; targetIndex < stars.length; targetIndex += 1) {
      const target = stars[targetIndex];
      if (target) formationCandidates.push([source, target]);
    }
  }
  for (const [source, target] of shuffled(formationCandidates)) {
    if (source.energy < 0.12 || target.energy < 0.12) continue;
    const key = relationKey(source.id, target.id);
    if (relationKeys.has(key)) continue;
    const distance = Math.hypot(target.x - source.x, target.y - source.y);
    if (distance >= FORMATION_RADIUS) continue;
    const sourceDegree = degrees.get(source.id) ?? 0;
    const targetDegree = degrees.get(target.id) ?? 0;
    const degreeCapacity = Math.max(0, 1 - (sourceDegree + targetDegree) / 13);
    const proximity = 1 - distance / FORMATION_RADIUS;
    const compatibility = 0.28 + 0.72 * (1 - Math.abs(source.trait - target.trait));
    const energyDifference = Math.abs(source.energy - target.energy);
    const hazard = parameters.relationFormation * proximity * compatibility *
      degreeCapacity *
      (0.36 + Math.min(1, energyDifference * 1.8));
    if (random() >= 1 - Math.exp(-hazard * delta)) continue;
    relations.push({
      id: nextRelationId,
      source: source.id,
      target: target.id,
      strength: 0.14,
      flow: 0,
      age: 0,
    });
    nextRelationId += 1;
    formed += 1;
    relationKeys.add(key);
    degrees.set(source.id, sourceDegree + 1);
    degrees.set(target.id, targetDegree + 1);
  }

  let nextStarId = current.nextStarId;
  let births = 0;
  const newborns: Star[] = [];
  for (const parent of shuffled(stars)) {
    if (stars.length + newborns.length >= MAX_STARS) break;
    if (parent.energy <= parameters.birthEnergy || parent.age < 2.5) continue;
    const localResource = sampleResource(
      resource,
      current.columns,
      current.rows,
      parent.x,
      parent.y,
    );
    if (localResource <= 0.54) continue;
    const hazard = 0.23 * (parent.energy - parameters.birthEnergy) *
      (localResource - 0.54);
    if (random() >= 1 - Math.exp(-hazard * delta)) continue;
    const angle = random() * Math.PI * 2;
    const distance = 0.018 + random() * 0.027;
    parent.energy -= BIRTH_COST;
    newborns.push(createStar(
      nextStarId,
      clamp(parent.x + Math.cos(angle) * distance, 0.025, 0.975),
      clamp(parent.y + Math.sin(angle) * distance, 0.035, 0.965),
      BIRTH_COST * 0.57,
      clamp(parent.trait + (random() - 0.5) * 0.13, 0, 1),
      42 + random() * 54,
      parent.generation + 1,
    ));
    nextStarId += 1;
    births += 1;
  }
  stars.push(...newborns);

  const deadIds = new Set<number>();
  let deaths = 0;
  for (const star of shuffled(stars)) {
    const starvationHazard = star.energy < 0.085
      ? 0.18 + (0.085 - star.energy) * 7
      : 0;
    const ageHazard = star.age > star.lifespan
      ? 0.06 + (star.age - star.lifespan) * 0.012
      : 0;
    const dies = star.energy <= 0.008 ||
      random() < 1 - Math.exp(-(starvationHazard + ageHazard) * delta);
    if (!dies) continue;
    deadIds.add(star.id);
    deaths += 1;
    returnEnergy(
      resource,
      current.columns,
      current.rows,
      star.x,
      star.y,
      star.energy * 0.72,
    );
  }

  const livingStars = stars.filter((star) => !deadIds.has(star.id));
  const livingRelations = relations.filter((relation) => {
    const survives = !deadIds.has(relation.source) && !deadIds.has(relation.target);
    if (!survives) severed += 1;
    return survives;
  });

  return {
    state: {
      ...current,
      stars: livingStars,
      relations: livingRelations,
      resource,
      nextStarId,
      nextRelationId,
      randomState,
      time: current.time + delta,
    },
    events: { births, deaths, formed, severed },
  };
}

export function getConstellationMetrics(
  state: ConstellationState,
): ConstellationMetrics {
  const adjacency = new Map<number, number[]>();
  for (const star of state.stars) adjacency.set(star.id, []);
  for (const relation of state.relations) {
    adjacency.get(relation.source)?.push(relation.target);
    adjacency.get(relation.target)?.push(relation.source);
  }
  let components = 0;
  const visited = new Set<number>();
  for (const star of state.stars) {
    if (visited.has(star.id)) continue;
    components += 1;
    const stack = [star.id];
    while (stack.length > 0) {
      const id = stack.pop();
      if (id === undefined || visited.has(id)) continue;
      visited.add(id);
      stack.push(...(adjacency.get(id) ?? []));
    }
  }
  const sum = (values: readonly number[]) =>
    values.reduce((total, value) => total + value, 0);
  return {
    stars: state.stars.length,
    relations: state.relations.length,
    components,
    meanEnergy: state.stars.length > 0
      ? sum(state.stars.map((star) => star.energy)) / state.stars.length
      : 0,
    meanStrength: state.relations.length > 0
      ? sum(state.relations.map((relation) => relation.strength)) /
        state.relations.length
      : 0,
    resource: sum(Array.from(state.resource)) /
      (state.resource.length * RESOURCE_CAPACITY),
    flow: sum(state.relations.map((relation) => Math.abs(relation.flow))),
  };
}

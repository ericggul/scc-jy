export type Point = { readonly x: number; readonly y: number };

export type ColonyAgent = Point & {
  id: number;
  vx: number;
  vy: number;
  energy: number;
  age: number;
  metabolism: number;
  appetite: number;
  foodSense: number;
  trailSense: number;
  turnRate: number;
  divisionEnergy: number;
  lifespan: number;
};

export type NutrientSource = Point & {
  id: number;
  strength: number;
};

export type AntColony = {
  agents: ColonyAgent[];
  food: Float32Array;
  pheromone: Float32Array;
  columns: number;
  rows: number;
  sources: NutrientSource[];
  nextAgentId: number;
  nextSourceId: number;
  time: number;
  tick: number;
};

export type ColonyEvents = {
  divided: number;
  died: number;
};

export type ColonyStep = {
  colony: AntColony;
  events: ColonyEvents;
};

export type ColonyMeasure = {
  population: number;
  diversity: number;
};

const CELL_SIZE = 13;
const INITIAL_AGENTS = 62;
const MAX_AGENTS = 380;
const EDGE_MARGIN = 14;
const SENSOR_DISTANCE = 20;
const SENSOR_ANGLE = Math.PI * 0.52;
const MIN_SPEED = 21;
const MAX_SPEED = 57;
const MAX_SOURCES = 8;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function unit(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function columnsFor(width: number) {
  return Math.max(1, Math.ceil(width / CELL_SIZE));
}

function rowsFor(height: number) {
  return Math.max(1, Math.ceil(height / CELL_SIZE));
}

function fieldIndex(
  columns: number,
  rows: number,
  x: number,
  y: number,
) {
  const column = clamp(Math.floor(x / CELL_SIZE), 0, columns - 1);
  const row = clamp(Math.floor(y / CELL_SIZE), 0, rows - 1);
  return row * columns + column;
}

function readField(
  field: Float32Array,
  columns: number,
  rows: number,
  x: number,
  y: number,
) {
  return field[fieldIndex(columns, rows, x, y)] ?? 0;
}

function makeAgent(id: number, x: number, y: number, age = 0): ColonyAgent {
  const heading = unit(id * 5.3) * Math.PI * 2;
  const speed = MIN_SPEED + unit(id * 7.1) * (MAX_SPEED - MIN_SPEED);

  return {
    id,
    x,
    y,
    vx: Math.cos(heading) * speed,
    vy: Math.sin(heading) * speed,
    energy: 0.58 + unit(id * 11.9) * 0.28,
    age,
    metabolism: 0.010 + unit(id * 13.7) * 0.011,
    appetite: 0.46 + unit(id * 17.3) * 0.54,
    foodSense: 0.72 + unit(id * 19.1) * 0.7,
    trailSense: 0.22 + unit(id * 23.9) * 0.84,
    turnRate: 0.66 + unit(id * 29.3) * 0.84,
    divisionEnergy: 1.16 + unit(id * 31.7) * 0.22,
    lifespan: 28 + unit(id * 37.1) * 26,
  };
}

function initialSources(width: number, height: number): NutrientSource[] {
  return [
    { id: 1, x: width * 0.5, y: height * 0.5, strength: 0.92 },
    { id: 2, x: width * 0.22, y: height * 0.34, strength: 0.64 },
    { id: 3, x: width * 0.75, y: height * 0.68, strength: 0.72 },
  ];
}

function releaseNutrients(
  food: Float32Array,
  columns: number,
  rows: number,
  source: NutrientSource,
  amount: number,
) {
  const sourceColumn = Math.floor(source.x / CELL_SIZE);
  const sourceRow = Math.floor(source.y / CELL_SIZE);
  for (let rowOffset = -3; rowOffset <= 3; rowOffset += 1) {
    for (let columnOffset = -3; columnOffset <= 3; columnOffset += 1) {
      const column = sourceColumn + columnOffset;
      const row = sourceRow + rowOffset;
      if (column < 0 || column >= columns || row < 0 || row >= rows) continue;
      const distanceSquared = columnOffset * columnOffset + rowOffset * rowOffset;
      const release = Math.exp(-distanceSquared * 0.48) * source.strength;
      const index = row * columns + column;
      food[index] = clamp(food[index] + release * amount, 0, 1);
    }
  }
}

function replenishFood(
  colony: AntColony,
  deltaSeconds: number,
): Float32Array {
  const next = new Float32Array(colony.food.length);

  for (let index = 0; index < colony.food.length; index += 1) {
    next[index] = colony.food[index] * Math.max(0, 1 - deltaSeconds * 0.008);
  }

  for (const source of colony.sources) {
    releaseNutrients(
      next,
      colony.columns,
      colony.rows,
      source,
      deltaSeconds * 0.34,
    );
  }

  return next;
}

function diffusePheromone(colony: AntColony, deltaSeconds: number) {
  const next = new Float32Array(colony.pheromone.length);
  const retention = Math.max(0, 1 - deltaSeconds * 0.33);
  const diffusion = Math.min(0.2, deltaSeconds * 0.56);

  for (let row = 0; row < colony.rows; row += 1) {
    for (let column = 0; column < colony.columns; column += 1) {
      const index = row * colony.columns + column;
      const current = colony.pheromone[index];
      const left = colony.pheromone[row * colony.columns + Math.max(0, column - 1)];
      const right = colony.pheromone[
        row * colony.columns + Math.min(colony.columns - 1, column + 1)
      ];
      const up = colony.pheromone[Math.max(0, row - 1) * colony.columns + column];
      const down = colony.pheromone[
        Math.min(colony.rows - 1, row + 1) * colony.columns + column
      ];
      const localAverage = (left + right + up + down) * 0.25;
      next[index] = clamp(
        (current + (localAverage - current) * diffusion) * retention,
        0,
        1,
      );
    }
  }

  return next;
}

function mutate(
  value: number,
  childId: number,
  tick: number,
  salt: number,
  minimum: number,
  maximum: number,
) {
  const change = (unit(childId * 17.7 + tick * 7.3 + salt) - 0.5) * 0.16;
  return clamp(value + change, minimum, maximum);
}

function divide(parent: ColonyAgent, childId: number, tick: number): ColonyAgent {
  const heading = Math.atan2(parent.vy, parent.vx);
  const split = heading + (unit(childId * 3.1 + tick) - 0.5) * 1.7;
  const speed = clamp(
    Math.hypot(parent.vx, parent.vy) * (0.82 + unit(childId * 5.9) * 0.32),
    MIN_SPEED,
    MAX_SPEED,
  );

  return {
    id: childId,
    x: parent.x + Math.cos(split) * 5,
    y: parent.y + Math.sin(split) * 5,
    vx: Math.cos(split) * speed,
    vy: Math.sin(split) * speed,
    energy: parent.energy * 0.48,
    age: 0,
    metabolism: mutate(parent.metabolism, childId, tick, 1, 0.008, 0.026),
    appetite: mutate(parent.appetite, childId, tick, 2, 0.28, 1.16),
    foodSense: mutate(parent.foodSense, childId, tick, 3, 0.42, 1.58),
    trailSense: mutate(parent.trailSense, childId, tick, 4, 0.08, 1.2),
    turnRate: mutate(parent.turnRate, childId, tick, 5, 0.38, 1.6),
    divisionEnergy: mutate(parent.divisionEnergy, childId, tick, 6, 1.04, 1.46),
    lifespan: mutate(parent.lifespan, childId, tick, 7, 21, 61),
  };
}

export function createAntColony(width: number, height: number): AntColony {
  const columns = columnsFor(width);
  const rows = rowsFor(height);
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const agents = Array.from({ length: INITIAL_AGENTS }, (_, index) => {
    const id = index + 1;
    const angle = unit(id * 2.7) * Math.PI * 2;
    const distance = Math.sqrt(unit(id * 3.9)) * Math.min(width, height) * 0.115;
    return makeAgent(
      id,
      centerX + Math.cos(angle) * distance,
      centerY + Math.sin(angle) * distance,
      unit(id * 41.3) * 8,
    );
  });

  return {
    agents,
    food: new Float32Array(columns * rows),
    pheromone: new Float32Array(columns * rows),
    columns,
    rows,
    sources: initialSources(width, height),
    nextAgentId: INITIAL_AGENTS + 1,
    nextSourceId: 4,
    time: 0,
    tick: 0,
  };
}

export function resizeAntColony(
  colony: AntColony,
  oldSize: { width: number; height: number },
  newSize: { width: number; height: number },
): AntColony {
  if (oldSize.width <= 0 || oldSize.height <= 0) return colony;
  const columns = columnsFor(newSize.width);
  const rows = rowsFor(newSize.height);
  const scaleX = newSize.width / oldSize.width;
  const scaleY = newSize.height / oldSize.height;

  const resample = (field: Float32Array) => {
    const next = new Float32Array(columns * rows);
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const oldColumn = clamp(
          Math.floor((column / columns) * colony.columns),
          0,
          colony.columns - 1,
        );
        const oldRow = clamp(
          Math.floor((row / rows) * colony.rows),
          0,
          colony.rows - 1,
        );
        next[row * columns + column] = field[oldRow * colony.columns + oldColumn];
      }
    }
    return next;
  };

  return {
    ...colony,
    agents: colony.agents.map((agent) => ({
      ...agent,
      x: agent.x * scaleX,
      y: agent.y * scaleY,
      vx: agent.vx * scaleX,
      vy: agent.vy * scaleY,
    })),
    food: resample(colony.food),
    pheromone: resample(colony.pheromone),
    columns,
    rows,
    sources: colony.sources.map((source) => ({
      ...source,
      x: source.x * scaleX,
      y: source.y * scaleY,
    })),
  };
}

export function nourishColony(
  colony: AntColony,
  point: Point,
): AntColony {
  const nearby = colony.sources.find(
    (source) => Math.hypot(source.x - point.x, source.y - point.y) < 46,
  );
  if (nearby) {
    const strengthened = {
      ...nearby,
      strength: clamp(nearby.strength + 0.38, 0, 1.34),
    };
    const food = new Float32Array(colony.food);
    releaseNutrients(food, colony.columns, colony.rows, strengthened, 0.46);
    return {
      ...colony,
      food,
      sources: colony.sources.map((source) =>
        source.id === nearby.id
          ? strengthened
          : source,
      ),
    };
  }

  const source: NutrientSource = {
    id: colony.nextSourceId,
    x: point.x,
    y: point.y,
    strength: 1.05,
  };
  const food = new Float32Array(colony.food);
  releaseNutrients(food, colony.columns, colony.rows, source, 0.46);
  return {
    ...colony,
    food,
    sources: [...colony.sources.slice(-(MAX_SOURCES - 1)), source],
    nextSourceId: source.id + 1,
  };
}

export function stepAntColony(
  colony: AntColony,
  width: number,
  height: number,
  deltaSeconds: number,
): ColonyStep {
  const delta = Math.min(0.05, Math.max(0, deltaSeconds));
  const tick = colony.tick + 1;
  const food = replenishFood(colony, delta);
  const pheromone = diffusePheromone(colony, delta);
  const agents: ColonyAgent[] = [];
  const births: ColonyAgent[] = [];
  let nextAgentId = colony.nextAgentId;
  let died = 0;

  for (const agent of colony.agents) {
    const speed = Math.max(1, Math.hypot(agent.vx, agent.vy));
    const heading = Math.atan2(agent.vy, agent.vx);
    const sensingScore = (angle: number) => {
      const x = agent.x + Math.cos(angle) * SENSOR_DISTANCE;
      const y = agent.y + Math.sin(angle) * SENSOR_DISTANCE;
      return (
        readField(food, colony.columns, colony.rows, x, y) * agent.foodSense * 2.1 +
        readField(pheromone, colony.columns, colony.rows, x, y) * agent.trailSense * 0.58
      );
    };
    const left = sensingScore(heading - SENSOR_ANGLE);
    const right = sensingScore(heading + SENSOR_ANGLE);
    const wander = Math.sin(tick * 0.11 + agent.id * 1.71) * 0.36;
    const turn = clamp(
      (right - left) * agent.turnRate * 3.4 + wander,
      -2.8,
      2.8,
    );
    let nextHeading = heading + turn * delta;
    let vx = Math.cos(nextHeading) * speed;
    let vy = Math.sin(nextHeading) * speed;
    let x = agent.x + vx * delta;
    let y = agent.y + vy * delta;

    if (x < EDGE_MARGIN || x > width - EDGE_MARGIN) {
      vx *= -1;
      x = clamp(x, EDGE_MARGIN, width - EDGE_MARGIN);
      nextHeading = Math.atan2(vy, vx);
    }
    if (y < EDGE_MARGIN || y > height - EDGE_MARGIN) {
      vy *= -1;
      y = clamp(y, EDGE_MARGIN, height - EDGE_MARGIN);
      nextHeading = Math.atan2(vy, vx);
    }

    const adjustedSpeed = clamp(
      speed + Math.sin(tick * 0.03 + agent.id) * delta * 2.2,
      MIN_SPEED,
      MAX_SPEED,
    );
    vx = Math.cos(nextHeading) * adjustedSpeed;
    vy = Math.sin(nextHeading) * adjustedSpeed;

    const index = fieldIndex(colony.columns, colony.rows, x, y);
    const intake = Math.min(food[index], (0.018 + agent.appetite * 0.024) * delta);
    food[index] -= intake;
    pheromone[index] = clamp(
      pheromone[index] + (0.042 + agent.trailSense * 0.045) * delta,
      0,
      1,
    );

    const energy = clamp(
      agent.energy - agent.metabolism * delta + intake * 4.4,
      0,
      1.7,
    );
    const age = agent.age + delta;
    const current: ColonyAgent = { ...agent, x, y, vx, vy, energy, age };
    const starved = energy < 0.075;
    const old = age > agent.lifespan;

    if (starved || old) {
      died += 1;
      continue;
    }

    const divisionChance = (0.055 + agent.appetite * 0.05) * delta;
    const canDivide =
      energy > agent.divisionEnergy &&
      age > 1.8 &&
      agents.length + births.length < MAX_AGENTS &&
      unit(agent.id * 7.7 + tick * 13.1) < divisionChance;

    if (canDivide) {
      const child = divide(current, nextAgentId, tick);
      nextAgentId += 1;
      births.push(child);
      agents.push({ ...current, energy: current.energy * 0.52 });
      continue;
    }

    agents.push(current);
  }

  return {
    colony: {
      ...colony,
      agents: [...agents, ...births],
      food,
      pheromone,
      nextAgentId,
      time: colony.time + delta,
      tick,
    },
    events: { divided: births.length, died },
  };
}

export function measureColony(colony: AntColony): ColonyMeasure {
  if (colony.agents.length === 0) return { population: 0, diversity: 0 };
  const traits = colony.agents.map(
    (agent) => (agent.appetite + agent.foodSense + agent.trailSense) / 3,
  );
  const mean = traits.reduce((total, trait) => total + trait, 0) / traits.length;
  const variance =
    traits.reduce((total, trait) => total + (trait - mean) ** 2, 0) / traits.length;
  return { population: colony.agents.length, diversity: Math.sqrt(variance) };
}

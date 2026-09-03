export type Vec3 = Readonly<{ x: number; y: number; z: number }>;

export type TerrainFieldTerm = Readonly<{
  direction: Vec3;
  weight: number;
  power: number;
}>;

export type PortraitBody = Readonly<{
  id: string;
  portraitIndex: number;
  position: Vec3;
  velocity: Vec3;
}>;

export const PORTRAIT_BODY_COUNT = 72;
export const PORTRAIT_ATLAS_COLUMNS = 6;
export const PORTRAIT_ATLAS_ROWS = 4;
export const PORTRAIT_BODY_RADIUS = 0.165;
export const PHYSICS_TIME_STEP = 1 / 120;
export const PHYSICS_RESTITUTION = 0.96;
export const PHYSICS_COLLISION_PASSES = 4;
export const TERRAIN_BASE_RADIUS = 2.88;
export const TERRAIN_RADIUS_RELIEF = 0.43;
export const TERRAIN_NORMAL_EPSILON = 0.0025;
export const FIELD_MAGNETIC_GAIN = 1.35;

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function multiply(vector: Vec3, scalar: number): Vec3 {
  return { x: vector.x * scalar, y: vector.y * scalar, z: vector.z * scalar };
}

function dot(a: Vec3, b: Vec3) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function length(vector: Vec3) {
  return Math.sqrt(dot(vector, vector));
}

function normalize(vector: Vec3, fallback: Vec3 = { x: 0, y: 1, z: 0 }): Vec3 {
  const magnitude = length(vector);
  return magnitude > 0.0000001 ? multiply(vector, 1 / magnitude) : fallback;
}

function hash(index: number, salt: number) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43_758.5453;
  return value - Math.floor(value);
}

function normalizedDirection(x: number, y: number, z: number): Vec3 {
  return normalize({ x, y, z });
}

/**
 * A directional scalar field deforms a closed container and supplies its
 * non-gravitational force direction.
 */
export const TERRAIN_FIELD_TERMS: readonly TerrainFieldTerm[] = [
  { direction: normalizedDirection(-0.62, 0.58, 0.53), weight: 0.72, power: 1 },
  { direction: normalizedDirection(0.72, -0.28, 0.64), weight: -0.49, power: 2 },
  { direction: normalizedDirection(0.14, 0.91, -0.39), weight: 0.31, power: 3 },
  { direction: normalizedDirection(-0.78, -0.42, -0.47), weight: -0.19, power: 4 },
] as const;

export function terrainDirectionAt(position: Vec3) {
  return normalize(position, { x: 0, y: 1, z: 0 });
}

export function terrainPotentialAt(direction: Vec3) {
  const unitDirection = terrainDirectionAt(direction);
  return TERRAIN_FIELD_TERMS.reduce(
    (value, term) => value + term.weight * dot(unitDirection, term.direction) ** term.power,
    0,
  );
}

export function terrainRadiusAt(direction: Vec3) {
  return TERRAIN_BASE_RADIUS + TERRAIN_RADIUS_RELIEF * terrainPotentialAt(direction);
}

/**
 * F(p) = |p| - r(p/|p|). F=0 is a closed, deformed spherical terrain.
 * Its sign is not an approximate vertical height: it is defined around every
 * direction from the terrain's centre.
 */
export function terrainLevelAt(position: Vec3) {
  return length(position) - terrainRadiusAt(position);
}

export function terrainNormalAt(position: Vec3): Vec3 {
  const epsilon = TERRAIN_NORMAL_EPSILON;
  const gradient = {
    x: (terrainLevelAt({ ...position, x: position.x + epsilon }) - terrainLevelAt({ ...position, x: position.x - epsilon })) / (epsilon * 2),
    y: (terrainLevelAt({ ...position, y: position.y + epsilon }) - terrainLevelAt({ ...position, y: position.y - epsilon })) / (epsilon * 2),
    z: (terrainLevelAt({ ...position, z: position.z + epsilon }) - terrainLevelAt({ ...position, z: position.z - epsilon })) / (epsilon * 2),
  };
  return normalize(gradient, terrainDirectionAt(position));
}

export function terrainSurfacePointAt(direction: Vec3) {
  const unitDirection = terrainDirectionAt(direction);
  return multiply(unitDirection, terrainRadiusAt(unitDirection));
}

/**
 * A spatially varying magnetic-like field. The force is v × B(p), therefore
 * perpendicular to velocity: it curves paths but supplies neither gravity nor
 * drag, so elastic wall and pair impacts remain dynamically alive.
 */
export function trajectoryFieldAt(position: Vec3): Vec3 {
  return {
    x: 0.46 + 0.34 * Math.sin(position.y * 0.84 + position.z * 0.23),
    y: -0.58 + 0.29 * Math.sin(position.z * 0.73 - position.x * 0.31),
    z: 0.72 + 0.33 * Math.sin(position.x * 0.91 + position.y * 0.39),
  };
}

export function fieldAccelerationAt(position: Vec3, velocity: Vec3): Vec3 {
  return multiply(cross(velocity, trajectoryFieldAt(position)), FIELD_MAGNETIC_GAIN);
}

function resolveContainer(position: Vec3, velocity: Vec3) {
  const normal = terrainNormalAt(position);
  const level = terrainLevelAt(position);
  if (level <= -PORTRAIT_BODY_RADIUS) return { position, velocity };

  const nextPosition = subtract(position, multiply(normal, level + PORTRAIT_BODY_RADIUS));
  const normalSpeed = dot(velocity, normal);
  const nextVelocity = normalSpeed > 0
    ? subtract(velocity, multiply(normal, (1 + PHYSICS_RESTITUTION) * normalSpeed))
    : velocity;

  return { position: nextPosition, velocity: nextVelocity };
}

function resolvePair(first: PortraitBody, second: PortraitBody) {
  const difference = subtract(first.position, second.position);
  const distance = Math.max(0.00001, length(difference));
  const normal = multiply(difference, 1 / distance);
  const overlap = PORTRAIT_BODY_RADIUS * 2 - distance;
  if (overlap <= 0) return [first, second] as const;

  const correction = multiply(normal, overlap * 0.505);
  let firstPosition = add(first.position, correction);
  let secondPosition = subtract(second.position, correction);
  const relativeVelocity = subtract(first.velocity, second.velocity);
  const normalSpeed = dot(relativeVelocity, normal);
  let firstVelocity = first.velocity;
  let secondVelocity = second.velocity;

  if (normalSpeed < 0) {
    const impulse = multiply(normal, -(1 + PHYSICS_RESTITUTION) * normalSpeed / 2);
    firstVelocity = add(firstVelocity, impulse);
    secondVelocity = subtract(secondVelocity, impulse);
  }

  ({ position: firstPosition, velocity: firstVelocity } = resolveContainer(firstPosition, firstVelocity));
  ({ position: secondPosition, velocity: secondVelocity } = resolveContainer(secondPosition, secondVelocity));

  return [
    { ...first, position: firstPosition, velocity: firstVelocity },
    { ...second, position: secondPosition, velocity: secondVelocity },
  ] as const;
}

function randomUnitDirection(index: number, attempt: number): Vec3 {
  const elevation = hash(index * 101 + attempt, 1) * 2 - 1;
  const azimuth = hash(index * 101 + attempt, 2) * Math.PI * 2;
  const radius = Math.sqrt(Math.max(0, 1 - elevation ** 2));
  return {
    x: Math.cos(azimuth) * radius,
    y: elevation,
    z: Math.sin(azimuth) * radius,
  };
}

export function createInitialPortraitBodies(
  count = PORTRAIT_BODY_COUNT,
): readonly PortraitBody[] {
  const bodies: PortraitBody[] = [];

  for (let index = 0; index < count; index += 1) {
    let chosenPosition: Vec3 | null = null;
    for (let attempt = 0; attempt < 192; attempt += 1) {
      const direction = randomUnitDirection(index, attempt);
      const maximumDistance = terrainRadiusAt(direction) - PORTRAIT_BODY_RADIUS - 0.14;
      const candidate = multiply(
        direction,
        maximumDistance * Math.cbrt(hash(index * 101 + attempt, 3)),
      );
      const isSeparated = bodies.every((body) =>
        length(subtract(candidate, body.position)) > PORTRAIT_BODY_RADIUS * 2.2
      );
      if (isSeparated) {
        chosenPosition = candidate;
        break;
      }
    }

    const position = chosenPosition ?? multiply(
      randomUnitDirection(index, 401),
      0.78 + (index % 3) * 0.24,
    );
    const movementDirection = randomUnitDirection(index, 409);
    const speed = 1.08 + hash(index, 4) * 0.62;

    bodies.push({
      id: `potential-portrait-${String(index + 1).padStart(2, "0")}`,
      // The 24 local atlas tiles repeat across the 72 physical bodies.
      portraitIndex: index % (PORTRAIT_ATLAS_COLUMNS * PORTRAIT_ATLAS_ROWS),
      position,
      velocity: multiply(movementDirection, speed),
    });
  }

  return bodies;
}

export function advancePortraitBodies(
  current: readonly PortraitBody[],
  timeStep = PHYSICS_TIME_STEP,
) {
  let bodies = current.map((body) => {
    const velocity = add(
      body.velocity,
      multiply(fieldAccelerationAt(body.position, body.velocity), timeStep),
    );
    const position = add(body.position, multiply(velocity, timeStep));
    const bounded = resolveContainer(position, velocity);
    return { ...body, ...bounded };
  });

  for (let pass = 0; pass < PHYSICS_COLLISION_PASSES; pass += 1) {
    for (let firstIndex = 0; firstIndex < bodies.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < bodies.length; secondIndex += 1) {
        const first = bodies[firstIndex];
        const second = bodies[secondIndex];
        if (!first || !second) continue;
        const [nextFirst, nextSecond] = resolvePair(first, second);
        bodies[firstIndex] = nextFirst;
        bodies[secondIndex] = nextSecond;
      }
    }
  }

  return bodies;
}

export function bodyStateIsFinite(bodies: readonly PortraitBody[]) {
  return bodies.every((body) =>
    [
      body.position.x,
      body.position.y,
      body.position.z,
      body.velocity.x,
      body.velocity.y,
      body.velocity.z,
    ].every(Number.isFinite)
  );
}

export function bodyMinimumSeparation(bodies: readonly PortraitBody[]) {
  let minimum = Number.POSITIVE_INFINITY;
  for (let firstIndex = 0; firstIndex < bodies.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < bodies.length; secondIndex += 1) {
      const first = bodies[firstIndex];
      const second = bodies[secondIndex];
      if (!first || !second) continue;
      minimum = Math.min(minimum, length(subtract(first.position, second.position)));
    }
  }
  return minimum;
}

export function isInsideTerrain(position: Vec3) {
  return terrainLevelAt(position) <= -PORTRAIT_BODY_RADIUS + 1e-8;
}

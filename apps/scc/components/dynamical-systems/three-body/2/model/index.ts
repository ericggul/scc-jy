export type Vector = Readonly<{
  x: number;
  y: number;
}>;

export type ThreeBodyId = string;

export type ThreeBodyBody = Readonly<{
  id: ThreeBodyId;
  mass: number;
  position: Vector;
  velocity: Vector;
}>;

export type ThreeBodyState = Readonly<{
  bodies: readonly ThreeBodyBody[];
}>;

type StateDerivative = Readonly<{
  position: readonly Vector[];
  velocity: readonly Vector[];
}>;

export type AdaptiveIntegrationStep = Readonly<{
  state: ThreeBodyState;
  timeStep: number;
  nextTimeStep: number;
  errorRatio: number;
}>;

export type PairwiseRelation = Readonly<{
  first: ThreeBodyBody;
  second: ThreeBodyBody;
  distance: number;
  forceMagnitude: number;
}>;

export const GRAVITATIONAL_CONSTANT = 1;
export const SOFTENING_LENGTH = 0.3;
export const MIN_BODY_COUNT = 3;
export const MAX_BODY_COUNT = 32;
export const DEFAULT_BODY_COUNT = 20;
export const INITIAL_INTEGRATOR_TIME_STEP = 0.002;

const TOTAL_MASS = 12;
const ABSOLUTE_TOLERANCE = 1e-8;
const RELATIVE_TOLERANCE = 1e-7;
const MINIMUM_TIME_STEP = 1e-9;
const MAXIMUM_TIME_STEP = 0.02;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const INITIAL_MOTION_SCALE = 2.2;

function squaredLength(vector: Vector) {
  return vector.x ** 2 + vector.y ** 2;
}

function subtract(first: Vector, second: Vector): Vector {
  return { x: first.x - second.x, y: first.y - second.y };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizedBodyCount(count: number) {
  if (!Number.isFinite(count)) return DEFAULT_BODY_COUNT;
  return clamp(Math.round(count), MIN_BODY_COUNT, MAX_BODY_COUNT);
}

/**
 * A repeatable, uneven cloud. The golden-angle positions fill a broad disc
 * rather than a perimeter; radial and shearing velocities break a shared
 * circular orbit. Momentum correction keeps the centre of mass stationary.
 */
export function createInitialState(count = DEFAULT_BODY_COUNT): ThreeBodyState {
  const bodyCount = normalizedBodyCount(count);
  const uncorrected = Array.from({ length: bodyCount }, (_, index) => {
    const radialRank = (index + 0.55) / bodyCount;
    const angle = index * GOLDEN_ANGLE + 0.22 * Math.sin(index * 1.731);
    const radius = 0.82 + 4.05 * Math.sqrt(radialRank) + 0.26 * Math.sin(index * 2.113);
    const rawMass = 0.8 + 0.35 * (0.5 + 0.5 * Math.sin(index * 1.61803398875 + 0.4));
    const tangentSpeed = 0.16 + 0.36 * Math.sin(index * 1.271 + 0.9);
    const radialSpeed = 0.16 * Math.cos(index * 2.171 + 0.2);
    const shearSpeed = 0.11 * Math.sin(index * 0.837 + 1.3);

    const radial = { x: Math.cos(angle), y: Math.sin(angle) };
    const tangent = { x: -radial.y, y: radial.x };
    return {
      id: `body-${index + 1}`,
      rawMass,
      position: { x: radius * radial.x, y: radius * radial.y },
      velocity: {
        x: (tangentSpeed * tangent.x + radialSpeed * radial.x + shearSpeed) * INITIAL_MOTION_SCALE,
        y: (tangentSpeed * tangent.y + radialSpeed * radial.y - shearSpeed * 0.65) * INITIAL_MOTION_SCALE,
      },
    };
  });
  const rawTotalMass = uncorrected.reduce((sum, body) => sum + body.rawMass, 0);
  const bodies = uncorrected.map((body) => ({ ...body, mass: TOTAL_MASS * body.rawMass / rawTotalMass }));
  const momentum = bodies.reduce(
    (sum, body) => ({ x: sum.x + body.mass * body.velocity.x, y: sum.y + body.mass * body.velocity.y }),
    { x: 0, y: 0 },
  );
  const center = bodies.reduce(
    (sum, body) => ({ x: sum.x + body.mass * body.position.x / TOTAL_MASS, y: sum.y + body.mass * body.position.y / TOTAL_MASS }),
    { x: 0, y: 0 },
  );

  return {
    bodies: bodies.map((body) => ({
      id: body.id,
      mass: body.mass,
      position: { x: body.position.x - center.x, y: body.position.y - center.y },
      velocity: { x: body.velocity.x - momentum.x / TOTAL_MASS, y: body.velocity.y - momentum.y / TOTAL_MASS },
    })),
  };
}

export function minimumSeparation(state: ThreeBodyState) {
  let minimum = Infinity;
  for (let index = 0; index < state.bodies.length; index += 1) {
    const first = state.bodies[index];
    if (!first) continue;
    for (let otherIndex = index + 1; otherIndex < state.bodies.length; otherIndex += 1) {
      const second = state.bodies[otherIndex];
      if (second) minimum = Math.min(minimum, Math.sqrt(squaredLength(subtract(second.position, first.position))));
    }
  }
  return minimum;
}

/** Pairwise accumulation preserves equal and opposite softened forces. */
export function accelerationsFor(state: ThreeBodyState): readonly Vector[] {
  const accelerations = state.bodies.map(() => ({ x: 0, y: 0 }));
  const epsilonSquared = SOFTENING_LENGTH ** 2;
  for (let index = 0; index < state.bodies.length; index += 1) {
    const first = state.bodies[index];
    const firstAcceleration = accelerations[index];
    if (!first || !firstAcceleration) continue;
    for (let otherIndex = index + 1; otherIndex < state.bodies.length; otherIndex += 1) {
      const second = state.bodies[otherIndex];
      const secondAcceleration = accelerations[otherIndex];
      if (!second || !secondAcceleration) continue;
      const separation = subtract(second.position, first.position);
      const softenedDistanceSquared = squaredLength(separation) + epsilonSquared;
      const inverseDistanceCubed = 1 / (softenedDistanceSquared * Math.sqrt(softenedDistanceSquared));
      const factor = GRAVITATIONAL_CONSTANT * inverseDistanceCubed;
      firstAcceleration.x += factor * second.mass * separation.x;
      firstAcceleration.y += factor * second.mass * separation.y;
      secondAcceleration.x -= factor * first.mass * separation.x;
      secondAcceleration.y -= factor * first.mass * separation.y;
    }
  }
  return accelerations;
}

export function pairwiseRelations(state: ThreeBodyState): readonly PairwiseRelation[] {
  const relations: PairwiseRelation[] = [];
  for (let index = 0; index < state.bodies.length; index += 1) {
    const first = state.bodies[index];
    if (!first) continue;
    for (let otherIndex = index + 1; otherIndex < state.bodies.length; otherIndex += 1) {
      const second = state.bodies[otherIndex];
      if (!second) continue;
      const distance = Math.sqrt(squaredLength(subtract(second.position, first.position)));
      const softenedDistanceSquared = distance ** 2 + SOFTENING_LENGTH ** 2;
      relations.push({
        first,
        second,
        distance,
        forceMagnitude: GRAVITATIONAL_CONSTANT * first.mass * second.mass * distance /
          (softenedDistanceSquared * Math.sqrt(softenedDistanceSquared)),
      });
    }
  }
  return relations;
}

function derivativeFor(state: ThreeBodyState): StateDerivative {
  return { position: state.bodies.map((body) => body.velocity), velocity: accelerationsFor(state) };
}

function addDerivatives(state: ThreeBodyState, timeStep: number, terms: readonly Readonly<{ derivative: StateDerivative; weight: number }>[]): ThreeBodyState {
  return { bodies: state.bodies.map((body, index) => {
    let positionX = body.position.x; let positionY = body.position.y;
    let velocityX = body.velocity.x; let velocityY = body.velocity.y;
    for (const { derivative, weight } of terms) {
      const positionDerivative = derivative.position[index]; const velocityDerivative = derivative.velocity[index];
      if (!positionDerivative || !velocityDerivative) throw new Error(`Missing derivative for ${body.id}.`);
      positionX += timeStep * weight * positionDerivative.x; positionY += timeStep * weight * positionDerivative.y;
      velocityX += timeStep * weight * velocityDerivative.x; velocityY += timeStep * weight * velocityDerivative.y;
    }
    return { ...body, position: { x: positionX, y: positionY }, velocity: { x: velocityX, y: velocityY } };
  }) };
}

function errorRatio(start: ThreeBodyState, fifthOrder: ThreeBodyState, fourthOrder: ThreeBodyState) {
  let sum = 0; let count = 0;
  for (let index = 0; index < start.bodies.length; index += 1) {
    const initial = start.bodies[index]; const fifth = fifthOrder.bodies[index]; const fourth = fourthOrder.bodies[index];
    if (!initial || !fifth || !fourth) continue;
    for (const [initialValue, fifthValue, fourthValue] of [[initial.position.x, fifth.position.x, fourth.position.x], [initial.position.y, fifth.position.y, fourth.position.y], [initial.velocity.x, fifth.velocity.x, fourth.velocity.x], [initial.velocity.y, fifth.velocity.y, fourth.velocity.y]] as const) {
      const scale = ABSOLUTE_TOLERANCE + RELATIVE_TOLERANCE * Math.max(Math.abs(initialValue), Math.abs(fifthValue));
      sum += ((fifthValue - fourthValue) / scale) ** 2; count += 1;
    }
  }
  return Math.sqrt(sum / Math.max(1, count));
}

function dormandPrinceAttempt(state: ThreeBodyState, timeStep: number) {
  const first = derivativeFor(state);
  const second = derivativeFor(addDerivatives(state, timeStep, [{ derivative: first, weight: 1 / 5 }]));
  const third = derivativeFor(addDerivatives(state, timeStep, [{ derivative: first, weight: 3 / 40 }, { derivative: second, weight: 9 / 40 }]));
  const fourth = derivativeFor(addDerivatives(state, timeStep, [{ derivative: first, weight: 44 / 45 }, { derivative: second, weight: -56 / 15 }, { derivative: third, weight: 32 / 9 }]));
  const fifth = derivativeFor(addDerivatives(state, timeStep, [{ derivative: first, weight: 19372 / 6561 }, { derivative: second, weight: -25360 / 2187 }, { derivative: third, weight: 64448 / 6561 }, { derivative: fourth, weight: -212 / 729 }]));
  const sixth = derivativeFor(addDerivatives(state, timeStep, [{ derivative: first, weight: 9017 / 3168 }, { derivative: second, weight: -355 / 33 }, { derivative: third, weight: 46732 / 5247 }, { derivative: fourth, weight: 49 / 176 }, { derivative: fifth, weight: -5103 / 18656 }]));
  const fifthOrder = addDerivatives(state, timeStep, [{ derivative: first, weight: 35 / 384 }, { derivative: third, weight: 500 / 1113 }, { derivative: fourth, weight: 125 / 192 }, { derivative: fifth, weight: -2187 / 6784 }, { derivative: sixth, weight: 11 / 84 }]);
  const seventh = derivativeFor(fifthOrder);
  const fourthOrder = addDerivatives(state, timeStep, [{ derivative: first, weight: 5179 / 57600 }, { derivative: third, weight: 7571 / 16695 }, { derivative: fourth, weight: 393 / 640 }, { derivative: fifth, weight: -92097 / 339200 }, { derivative: sixth, weight: 187 / 2100 }, { derivative: seventh, weight: 1 / 40 }]);
  return { state: fifthOrder, errorRatio: errorRatio(state, fifthOrder, fourthOrder) };
}

function nextTimeStep(timeStep: number, error: number, accepted: boolean) {
  if (error === 0) return clamp(timeStep * 4, MINIMUM_TIME_STEP, MAXIMUM_TIME_STEP);
  const rawFactor = 0.9 * error ** (accepted ? -1 / 5 : -1 / 4);
  return clamp(timeStep * clamp(rawFactor, accepted ? 0.2 : 0.1, accepted ? 4 : 0.5), MINIMUM_TIME_STEP, MAXIMUM_TIME_STEP);
}

export function advanceDormandPrince(state: ThreeBodyState, requestedTimeStep: number): AdaptiveIntegrationStep {
  let timeStep = clamp(requestedTimeStep, MINIMUM_TIME_STEP, MAXIMUM_TIME_STEP);
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const candidate = dormandPrinceAttempt(state, timeStep);
    if (isFiniteState(candidate.state) && candidate.errorRatio <= 1) return { state: candidate.state, timeStep, nextTimeStep: nextTimeStep(timeStep, candidate.errorRatio, true), errorRatio: candidate.errorRatio };
    timeStep = nextTimeStep(timeStep, candidate.errorRatio, false);
  }
  throw new Error("The adaptive integrator could not satisfy its local error bound.");
}

export function totalMomentum(state: ThreeBodyState): Vector {
  return state.bodies.reduce((sum, body) => ({ x: sum.x + body.mass * body.velocity.x, y: sum.y + body.mass * body.velocity.y }), { x: 0, y: 0 });
}

export function centerOfMass(state: ThreeBodyState): Vector {
  const mass = state.bodies.reduce((sum, body) => sum + body.mass, 0);
  return state.bodies.reduce((sum, body) => ({ x: sum.x + body.mass * body.position.x / mass, y: sum.y + body.mass * body.position.y / mass }), { x: 0, y: 0 });
}

export function kineticEnergy(state: ThreeBodyState) { return state.bodies.reduce((sum, body) => sum + body.mass * squaredLength(body.velocity) / 2, 0); }

export function potentialEnergy(state: ThreeBodyState) {
  return state.bodies.reduce((sum, first, index) => sum + state.bodies.slice(index + 1).reduce((pairSum, second) => pairSum - GRAVITATIONAL_CONSTANT * first.mass * second.mass / Math.sqrt(squaredLength(subtract(second.position, first.position)) + SOFTENING_LENGTH ** 2), 0), 0);
}

export function systemEnergy(state: ThreeBodyState) { return kineticEnergy(state) + potentialEnergy(state); }

export function isFiniteState(state: ThreeBodyState) {
  return state.bodies.every((body) => Number.isFinite(body.mass) && Number.isFinite(body.position.x) && Number.isFinite(body.position.y) && Number.isFinite(body.velocity.x) && Number.isFinite(body.velocity.y));
}

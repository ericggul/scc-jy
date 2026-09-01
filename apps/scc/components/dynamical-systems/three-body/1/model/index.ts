export type Vector = Readonly<{
  x: number;
  y: number;
}>;

export type ThreeBodyId = "mass-3" | "mass-4" | "mass-5";

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
export const INITIAL_INTEGRATOR_TIME_STEP = 0.002;

const ABSOLUTE_TOLERANCE = 1e-11;
const RELATIVE_TOLERANCE = 1e-10;
const MINIMUM_TIME_STEP = 1e-10;
const MAXIMUM_TIME_STEP = 0.02;

// Burrau's Pythagorean initial-value problem: the masses are 3, 4, and 5;
// they begin at rest opposite the sides of the corresponding 3–4–5 triangle.
export const PYTHAGOREAN_INITIAL_STATE: ThreeBodyState = {
  bodies: [
    {
      id: "mass-3",
      mass: 3,
      position: { x: 1, y: 3 },
      velocity: { x: 0, y: 0 },
    },
    {
      id: "mass-4",
      mass: 4,
      position: { x: -2, y: -1 },
      velocity: { x: 0, y: 0 },
    },
    {
      id: "mass-5",
      mass: 5,
      position: { x: 1, y: -1 },
      velocity: { x: 0, y: 0 },
    },
  ],
};

function squaredLength(vector: Vector) {
  return vector.x ** 2 + vector.y ** 2;
}

function subtract(first: Vector, second: Vector): Vector {
  return { x: first.x - second.x, y: first.y - second.y };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function minimumSeparation(state: ThreeBodyState) {
  let minimum = Infinity;
  for (let index = 0; index < state.bodies.length; index += 1) {
    const body = state.bodies[index];
    if (!body) continue;
    for (let otherIndex = index + 1; otherIndex < state.bodies.length; otherIndex += 1) {
      const other = state.bodies[otherIndex];
      if (!other) continue;
      minimum = Math.min(
        minimum,
        Math.sqrt(squaredLength(subtract(other.position, body.position))),
      );
    }
  }
  return minimum;
}

function accelerationAt(state: ThreeBodyState, bodyIndex: number): Vector {
  const body = state.bodies[bodyIndex];
  if (!body) throw new Error(`Unknown body index ${bodyIndex}.`);

  let x = 0;
  let y = 0;
  for (let index = 0; index < state.bodies.length; index += 1) {
    if (index === bodyIndex) continue;
    const other = state.bodies[index];
    if (!other) continue;
    const separation = subtract(other.position, body.position);
    const distanceSquared = squaredLength(separation);
    if (distanceSquared === 0) throw new Error("The simulation reached a collision.");
    const inverseDistanceCubed = 1 / (distanceSquared * Math.sqrt(distanceSquared));
    x += GRAVITATIONAL_CONSTANT * other.mass * separation.x * inverseDistanceCubed;
    y += GRAVITATIONAL_CONSTANT * other.mass * separation.y * inverseDistanceCubed;
  }

  return { x, y };
}

export function accelerationsFor(state: ThreeBodyState): readonly Vector[] {
  return state.bodies.map((_, index) => accelerationAt(state, index));
}

export function pairwiseRelations(state: ThreeBodyState): readonly PairwiseRelation[] {
  const relations: PairwiseRelation[] = [];

  for (let index = 0; index < state.bodies.length; index += 1) {
    const first = state.bodies[index];
    if (!first) continue;
    for (let otherIndex = index + 1; otherIndex < state.bodies.length; otherIndex += 1) {
      const second = state.bodies[otherIndex];
      if (!second) continue;
      const distanceSquared = squaredLength(subtract(second.position, first.position));
      if (distanceSquared === 0) throw new Error("The simulation reached a collision.");
      relations.push({
        first,
        second,
        distance: Math.sqrt(distanceSquared),
        forceMagnitude: GRAVITATIONAL_CONSTANT * first.mass * second.mass / distanceSquared,
      });
    }
  }

  return relations;
}

function derivativeFor(state: ThreeBodyState): StateDerivative {
  return {
    position: state.bodies.map((body) => body.velocity),
    velocity: accelerationsFor(state),
  };
}

function addDerivatives(
  state: ThreeBodyState,
  timeStep: number,
  terms: readonly Readonly<{ derivative: StateDerivative; weight: number }>[],
): ThreeBodyState {
  return {
    bodies: state.bodies.map((body, index) => {
      let positionX = body.position.x;
      let positionY = body.position.y;
      let velocityX = body.velocity.x;
      let velocityY = body.velocity.y;

      for (const { derivative, weight } of terms) {
        const positionDerivative = derivative.position[index];
        const velocityDerivative = derivative.velocity[index];
        if (!positionDerivative || !velocityDerivative) {
          throw new Error(`Missing derivative for ${body.id}.`);
        }
        positionX += timeStep * weight * positionDerivative.x;
        positionY += timeStep * weight * positionDerivative.y;
        velocityX += timeStep * weight * velocityDerivative.x;
        velocityY += timeStep * weight * velocityDerivative.y;
      }

      return {
        ...body,
        position: { x: positionX, y: positionY },
        velocity: { x: velocityX, y: velocityY },
      };
    }),
  };
}

function errorRatio(
  start: ThreeBodyState,
  fifthOrder: ThreeBodyState,
  fourthOrder: ThreeBodyState,
) {
  let sum = 0;
  let count = 0;

  for (let index = 0; index < start.bodies.length; index += 1) {
    const initial = start.bodies[index];
    const fifth = fifthOrder.bodies[index];
    const fourth = fourthOrder.bodies[index];
    if (!initial || !fifth || !fourth) continue;
    const values = [
      [initial.position.x, fifth.position.x, fourth.position.x],
      [initial.position.y, fifth.position.y, fourth.position.y],
      [initial.velocity.x, fifth.velocity.x, fourth.velocity.x],
      [initial.velocity.y, fifth.velocity.y, fourth.velocity.y],
    ] as const;

    for (const [initialValue, fifthValue, fourthValue] of values) {
      const scale = ABSOLUTE_TOLERANCE + RELATIVE_TOLERANCE *
        Math.max(Math.abs(initialValue), Math.abs(fifthValue));
      sum += ((fifthValue - fourthValue) / scale) ** 2;
      count += 1;
    }
  }

  return Math.sqrt(sum / Math.max(1, count));
}

function dormandPrinceAttempt(state: ThreeBodyState, timeStep: number) {
  const first = derivativeFor(state);
  const second = derivativeFor(addDerivatives(state, timeStep, [
    { derivative: first, weight: 1 / 5 },
  ]));
  const third = derivativeFor(addDerivatives(state, timeStep, [
    { derivative: first, weight: 3 / 40 },
    { derivative: second, weight: 9 / 40 },
  ]));
  const fourth = derivativeFor(addDerivatives(state, timeStep, [
    { derivative: first, weight: 44 / 45 },
    { derivative: second, weight: -56 / 15 },
    { derivative: third, weight: 32 / 9 },
  ]));
  const fifth = derivativeFor(addDerivatives(state, timeStep, [
    { derivative: first, weight: 19372 / 6561 },
    { derivative: second, weight: -25360 / 2187 },
    { derivative: third, weight: 64448 / 6561 },
    { derivative: fourth, weight: -212 / 729 },
  ]));
  const sixth = derivativeFor(addDerivatives(state, timeStep, [
    { derivative: first, weight: 9017 / 3168 },
    { derivative: second, weight: -355 / 33 },
    { derivative: third, weight: 46732 / 5247 },
    { derivative: fourth, weight: 49 / 176 },
    { derivative: fifth, weight: -5103 / 18656 },
  ]));
  const fifthOrder = addDerivatives(state, timeStep, [
    { derivative: first, weight: 35 / 384 },
    { derivative: third, weight: 500 / 1113 },
    { derivative: fourth, weight: 125 / 192 },
    { derivative: fifth, weight: -2187 / 6784 },
    { derivative: sixth, weight: 11 / 84 },
  ]);
  const seventh = derivativeFor(fifthOrder);
  const fourthOrder = addDerivatives(state, timeStep, [
    { derivative: first, weight: 5179 / 57600 },
    { derivative: third, weight: 7571 / 16695 },
    { derivative: fourth, weight: 393 / 640 },
    { derivative: fifth, weight: -92097 / 339200 },
    { derivative: sixth, weight: 187 / 2100 },
    { derivative: seventh, weight: 1 / 40 },
  ]);

  return {
    state: fifthOrder,
    errorRatio: errorRatio(state, fifthOrder, fourthOrder),
  };
}

function nextTimeStep(timeStep: number, error: number, accepted: boolean) {
  if (error === 0) return clamp(timeStep * 4, MINIMUM_TIME_STEP, MAXIMUM_TIME_STEP);
  const exponent = accepted ? -1 / 5 : -1 / 4;
  const rawFactor = 0.9 * error ** exponent;
  const factor = accepted
    ? clamp(rawFactor, 0.2, 4)
    : clamp(rawFactor, 0.1, 0.5);
  return clamp(timeStep * factor, MINIMUM_TIME_STEP, MAXIMUM_TIME_STEP);
}

// An embedded Dormand–Prince 5(4) step. The fifth- and fourth-order results
// estimate local error; rejected attempts reduce h before changing model time.
export function advanceDormandPrince(
  state: ThreeBodyState,
  requestedTimeStep: number,
): AdaptiveIntegrationStep {
  let timeStep = clamp(requestedTimeStep, MINIMUM_TIME_STEP, MAXIMUM_TIME_STEP);

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const candidate = dormandPrinceAttempt(state, timeStep);
    if (isFiniteState(candidate.state) && candidate.errorRatio <= 1) {
      return {
        state: candidate.state,
        timeStep,
        nextTimeStep: nextTimeStep(timeStep, candidate.errorRatio, true),
        errorRatio: candidate.errorRatio,
      };
    }
    timeStep = nextTimeStep(timeStep, candidate.errorRatio, false);
  }

  throw new Error("The adaptive integrator could not satisfy its local error bound.");
}

export function totalMomentum(state: ThreeBodyState): Vector {
  return state.bodies.reduce(
    (momentum, body) => ({
      x: momentum.x + body.mass * body.velocity.x,
      y: momentum.y + body.mass * body.velocity.y,
    }),
    { x: 0, y: 0 },
  );
}

export function centerOfMass(state: ThreeBodyState): Vector {
  const totalMass = state.bodies.reduce((sum, body) => sum + body.mass, 0);
  return state.bodies.reduce(
    (center, body) => ({
      x: center.x + body.mass * body.position.x / totalMass,
      y: center.y + body.mass * body.position.y / totalMass,
    }),
    { x: 0, y: 0 },
  );
}

export function kineticEnergy(state: ThreeBodyState) {
  return state.bodies.reduce(
    (sum, body) => sum + body.mass * squaredLength(body.velocity) / 2,
    0,
  );
}

export function potentialEnergy(state: ThreeBodyState) {
  return pairwiseRelations(state).reduce(
    (sum, relation) => sum - GRAVITATIONAL_CONSTANT * relation.first.mass * relation.second.mass /
      relation.distance,
    0,
  );
}

export function systemEnergy(state: ThreeBodyState) {
  return kineticEnergy(state) + potentialEnergy(state);
}

export function isFiniteState(state: ThreeBodyState) {
  return state.bodies.every((body) =>
    Number.isFinite(body.position.x) &&
    Number.isFinite(body.position.y) &&
    Number.isFinite(body.velocity.x) &&
    Number.isFinite(body.velocity.y),
  );
}

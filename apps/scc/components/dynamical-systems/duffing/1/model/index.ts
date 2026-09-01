export type DuffingParameters = Readonly<{
  damping: number;
  linearStiffness: number;
  cubicStiffness: number;
  forcingAmplitude: number;
  forcingFrequency: number;
  forcingPhase: number;
  initialDisplacement: number;
  initialVelocity: number;
}>;

export type DuffingState = Readonly<{
  time: number;
  displacement: number;
  velocity: number;
}>;

type DuffingDerivative = Readonly<{
  displacement: number;
  velocity: number;
}>;

export const MAXIMUM_INTEGRATION_STEP = 0.0025;
// A population field is visually sampled rather than used for long-horizon
// measurement. This coarser RK4 cap keeps tens of thousands of independent
// states responsive while retaining the same fourth-order vector field.
export const MAXIMUM_ENSEMBLE_INTEGRATION_STEP = 0.005;

// The forced double-well regime is deliberately the baseline: changing gamma
// or omega in the editor makes period-doubling and inter-well switching legible.
export const CHAOTIC_DOUBLE_WELL: DuffingParameters = {
  damping: 0.2,
  linearStiffness: -1,
  cubicStiffness: 1,
  forcingAmplitude: 0.3,
  forcingFrequency: 1,
  forcingPhase: 0,
  initialDisplacement: 0,
  initialVelocity: 0,
};

// Parameters and drive phase used by the moving coloured strange-attractor
// reference. cos(t - π/2) is sin(t), preserving the published equation.
export const COLOUR_ATTRACTOR_REFERENCE: DuffingParameters = {
  damping: 0.02,
  linearStiffness: -1,
  cubicStiffness: 1,
  forcingAmplitude: 3,
  forcingFrequency: 1,
  forcingPhase: -Math.PI / 2,
  initialDisplacement: 0,
  initialVelocity: 0,
};

export const DUFFING_PRESETS = [
  {
    id: "colour-attractor",
    label: "colour attractor",
    parameters: COLOUR_ATTRACTOR_REFERENCE,
  },
  {
    id: "period-one",
    label: "period 1",
    parameters: {
      ...CHAOTIC_DOUBLE_WELL,
      damping: 0.1,
      forcingAmplitude: 0.1,
      forcingFrequency: 1.4,
    },
  },
  {
    id: "period-four",
    label: "period 4",
    parameters: {
      ...CHAOTIC_DOUBLE_WELL,
      damping: 0.1,
      forcingAmplitude: 0.338,
      forcingFrequency: 1.4,
    },
  },
  {
    id: "chaotic-double-well",
    label: "chaotic double well",
    parameters: CHAOTIC_DOUBLE_WELL,
  },
] as const;

function assertParameters(parameters: DuffingParameters) {
  const values = Object.values(parameters);
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error("Duffing parameters must be finite.");
  }
  if (parameters.damping < 0) throw new Error("Damping must be non-negative.");
  if (parameters.cubicStiffness <= 0) {
    throw new Error("Cubic stiffness must be positive so the potential remains confining.");
  }
  if (parameters.forcingFrequency <= 0) {
    throw new Error("Forcing frequency must be positive.");
  }
}

export function initialDuffingState(parameters: DuffingParameters): DuffingState {
  assertParameters(parameters);
  return {
    time: 0,
    displacement: parameters.initialDisplacement,
    velocity: parameters.initialVelocity,
  };
}

export function forcingAt(time: number, parameters: DuffingParameters) {
  return parameters.forcingAmplitude * Math.cos(
    parameters.forcingFrequency * time + parameters.forcingPhase,
  );
}

export function accelerationAt(state: DuffingState, parameters: DuffingParameters) {
  return forcingAt(state.time, parameters) - parameters.damping * state.velocity -
    parameters.linearStiffness * state.displacement -
    parameters.cubicStiffness * state.displacement ** 3;
}

export function potentialAt(displacement: number, parameters: DuffingParameters) {
  return parameters.linearStiffness * displacement ** 2 / 2 +
    parameters.cubicStiffness * displacement ** 4 / 4;
}

export function effectivePotentialAt(
  displacement: number,
  time: number,
  parameters: DuffingParameters,
) {
  return potentialAt(displacement, parameters) - forcingAt(time, parameters) * displacement;
}

export function mechanicalEnergy(state: DuffingState, parameters: DuffingParameters) {
  return state.velocity ** 2 / 2 + potentialAt(state.displacement, parameters);
}

export function drivingPower(state: DuffingState, parameters: DuffingParameters) {
  return forcingAt(state.time, parameters) * state.velocity;
}

export function dampingPower(state: DuffingState, parameters: DuffingParameters) {
  return parameters.damping * state.velocity ** 2;
}

export function forcingPeriod(parameters: DuffingParameters) {
  return 2 * Math.PI / parameters.forcingFrequency;
}

export function wellPositions(parameters: DuffingParameters): readonly number[] {
  if (parameters.linearStiffness >= 0) return [0];
  const position = Math.sqrt(-parameters.linearStiffness / parameters.cubicStiffness);
  return [-position, position];
}

function derivativeAt(state: DuffingState, parameters: DuffingParameters): DuffingDerivative {
  return {
    displacement: state.velocity,
    velocity: accelerationAt(state, parameters),
  };
}

function addDerivative(
  state: DuffingState,
  derivative: DuffingDerivative,
  timeStep: number,
): DuffingState {
  return {
    time: state.time + timeStep,
    displacement: state.displacement + derivative.displacement * timeStep,
    velocity: state.velocity + derivative.velocity * timeStep,
  };
}

// Classical fourth-order Runge–Kutta. advanceDuffing splits longer requests so
// that a stroboscopic sample can land at the exact forcing-period boundary.
export function rungeKuttaStep(
  state: DuffingState,
  parameters: DuffingParameters,
  timeStep: number,
): DuffingState {
  const first = derivativeAt(state, parameters);
  const second = derivativeAt(addDerivative(state, first, timeStep / 2), parameters);
  const third = derivativeAt(addDerivative(state, second, timeStep / 2), parameters);
  const fourth = derivativeAt(addDerivative(state, third, timeStep), parameters);

  return {
    time: state.time + timeStep,
    displacement: state.displacement + timeStep *
      (first.displacement + 2 * second.displacement + 2 * third.displacement + fourth.displacement) / 6,
    velocity: state.velocity + timeStep *
      (first.velocity + 2 * second.velocity + 2 * third.velocity + fourth.velocity) / 6,
  };
}

export function advanceDuffing(
  state: DuffingState,
  parameters: DuffingParameters,
  duration: number,
): DuffingState {
  assertParameters(parameters);
  if (!Number.isFinite(duration) || duration < 0) {
    throw new Error("Integration duration must be finite and non-negative.");
  }

  const targetTime = state.time + duration;
  let current = state;
  while (targetTime - current.time > 1e-12) {
    const timeStep = Math.min(MAXIMUM_INTEGRATION_STEP, targetTime - current.time);
    current = rungeKuttaStep(current, parameters, timeStep);
  }

  return { ...current, time: targetTime };
}

// Same RK4 system as advanceDuffing, evaluated over a collection of initial
// conditions. The phase-space field uses this instead of visual interpolation:
// every visible point follows the differential equation on every frame.
export function advanceDuffingEnsemble(
  displacements: Float64Array,
  velocities: Float64Array,
  startTime: number,
  parameters: DuffingParameters,
  duration: number,
  maximumStep = MAXIMUM_ENSEMBLE_INTEGRATION_STEP,
) {
  assertParameters(parameters);
  if (displacements.length !== velocities.length) {
    throw new Error("Duffing ensemble coordinates must have matching lengths.");
  }
  if (!Number.isFinite(startTime) || !Number.isFinite(duration) || duration < 0 ||
    !Number.isFinite(maximumStep) || maximumStep <= 0) {
    throw new Error("Ensemble time, duration, and step cap must be finite and positive.");
  }

  const targetTime = startTime + duration;
  let currentTime = startTime;
  const damping = parameters.damping;
  const linearStiffness = parameters.linearStiffness;
  const cubicStiffness = parameters.cubicStiffness;

  while (targetTime - currentTime > 1e-12) {
    const step = Math.min(maximumStep, targetTime - currentTime);
    const halfStep = step / 2;
    const firstForce = forcingAt(currentTime, parameters);
    const middleForce = forcingAt(currentTime + halfStep, parameters);
    const finalForce = forcingAt(currentTime + step, parameters);

    for (let index = 0; index < displacements.length; index += 1) {
      const displacement = displacements[index];
      const velocity = velocities[index];
      const firstAcceleration = firstForce - damping * velocity -
        linearStiffness * displacement - cubicStiffness * displacement * displacement * displacement;

      const secondDisplacement = displacement + velocity * halfStep;
      const secondVelocity = velocity + firstAcceleration * halfStep;
      const secondAcceleration = middleForce - damping * secondVelocity -
        linearStiffness * secondDisplacement -
        cubicStiffness * secondDisplacement * secondDisplacement * secondDisplacement;

      const thirdDisplacement = displacement + secondVelocity * halfStep;
      const thirdVelocity = velocity + secondAcceleration * halfStep;
      const thirdAcceleration = middleForce - damping * thirdVelocity -
        linearStiffness * thirdDisplacement -
        cubicStiffness * thirdDisplacement * thirdDisplacement * thirdDisplacement;

      const fourthDisplacement = displacement + thirdVelocity * step;
      const fourthVelocity = velocity + thirdAcceleration * step;
      const fourthAcceleration = finalForce - damping * fourthVelocity -
        linearStiffness * fourthDisplacement -
        cubicStiffness * fourthDisplacement * fourthDisplacement * fourthDisplacement;

      displacements[index] = displacement + step *
        (velocity + 2 * secondVelocity + 2 * thirdVelocity + fourthVelocity) / 6;
      velocities[index] = velocity + step *
        (firstAcceleration + 2 * secondAcceleration + 2 * thirdAcceleration + fourthAcceleration) / 6;
    }

    currentTime += step;
  }

  return targetTime;
}

export function isFiniteDuffingState(state: DuffingState) {
  return Number.isFinite(state.time) && Number.isFinite(state.displacement) &&
    Number.isFinite(state.velocity);
}

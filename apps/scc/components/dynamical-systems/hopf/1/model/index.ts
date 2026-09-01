export type HopfParameters = Readonly<{
  bifurcation: number;
}>;

export type HopfState = Readonly<{
  x: number;
  y: number;
}>;

export type HopfDerivative = Readonly<{
  x: number;
  y: number;
}>;

export const MAXIMUM_INTEGRATION_STEP = 0.0025;
export const HOMOCLINIC_BIFURCATION = 0.06605695;

// This quadratic example has a Hopf bifurcation at the origin when μ = 0.
// Its expanding stable cycle approaches a homoclinic bifurcation near the
// documented parameter value above.
export const DEFAULT_HOPF_PARAMETERS: HopfParameters = {
  bifurcation: 0.045,
};

function assertFiniteState(state: HopfState) {
  if (!Number.isFinite(state.x) || !Number.isFinite(state.y)) {
    throw new Error("Hopf state coordinates must be finite.");
  }
}

function assertParameters(parameters: HopfParameters) {
  if (!Number.isFinite(parameters.bifurcation)) {
    throw new Error("Hopf parameters must be finite.");
  }
}

export function derivativeAt(
  state: HopfState,
  parameters: HopfParameters,
): HopfDerivative {
  assertFiniteState(state);
  assertParameters(parameters);
  return {
    x: parameters.bifurcation * state.x + state.y - state.x ** 2,
    y: -state.x + parameters.bifurcation * state.y + 2 * state.x ** 2,
  };
}

export function saddleEquilibriumAt(parameters: HopfParameters): HopfState {
  assertParameters(parameters);
  const x = (1 + parameters.bifurcation ** 2) / (2 + parameters.bifurcation);
  return {
    x,
    y: x ** 2 - parameters.bifurcation * x,
  };
}

export function jacobianAt(
  state: HopfState,
  parameters: HopfParameters,
) {
  assertFiniteState(state);
  assertParameters(parameters);
  return {
    xx: parameters.bifurcation - 2 * state.x,
    xy: 1,
    yx: -1 + 4 * state.x,
    yy: parameters.bifurcation,
  };
}

function add(
  state: HopfState,
  derivative: HopfDerivative,
  factor: number,
): HopfState {
  return {
    x: state.x + derivative.x * factor,
    y: state.y + derivative.y * factor,
  };
}

function rk4Step(
  state: HopfState,
  parameters: HopfParameters,
  timeStep: number,
): HopfState {
  const first = derivativeAt(state, parameters);
  const second = derivativeAt(add(state, first, timeStep / 2), parameters);
  const third = derivativeAt(add(state, second, timeStep / 2), parameters);
  const fourth = derivativeAt(add(state, third, timeStep), parameters);

  return {
    x: state.x + timeStep * (first.x + 2 * second.x + 2 * third.x + fourth.x) / 6,
    y: state.y + timeStep * (first.y + 2 * second.y + 2 * third.y + fourth.y) / 6,
  };
}

export function advanceHopf(
  initialState: HopfState,
  parameters: HopfParameters,
  duration: number,
  maximumTimeStep = MAXIMUM_INTEGRATION_STEP,
) {
  assertFiniteState(initialState);
  assertParameters(parameters);
  if (!Number.isFinite(duration) || duration < 0) {
    throw new Error("Hopf integration duration must be finite and non-negative.");
  }
  if (!Number.isFinite(maximumTimeStep) || maximumTimeStep <= 0) {
    throw new Error("Hopf integration step must be finite and positive.");
  }

  let state = initialState;
  let remaining = duration;
  while (remaining > 0) {
    const timeStep = Math.min(remaining, maximumTimeStep);
    state = rk4Step(state, parameters, timeStep);
    remaining -= timeStep;
  }
  return state;
}

export function isFiniteHopfState(state: HopfState) {
  return Number.isFinite(state.x) && Number.isFinite(state.y);
}

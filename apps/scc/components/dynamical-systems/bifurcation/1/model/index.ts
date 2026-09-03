export const LOGISTIC_PARTICLE_COUNT = 30_000;
export const LOGISTIC_PARAMETER_LANES = 600;
export const LOGISTIC_PARTICLES_PER_LANE =
  LOGISTIC_PARTICLE_COUNT / LOGISTIC_PARAMETER_LANES;

export const LOGISTIC_PARAMETER_MIN = 0;
export const LOGISTIC_PARAMETER_MAX = 4;
export const LOGISTIC_DEFAULT_SLICE = 2.8;
export const LOGISTIC_RESEED_ITERATIONS = 360;
export const LOGISTIC_MAP_INTERVAL_SECONDS = 0.11;
export const LOGISTIC_SUSPENSION_CYCLE_TICKS = 64;
export const LOGISTIC_STAGE_DURATION_MS = 8_400;

// Every stage fixes r long enough for the particle ensemble to show the
// corresponding invariant set: one point, two points, four points, then a
// chaotic occupied set. The values are not visual thresholds; they are actual
// logistic-map control parameters.
export const LOGISTIC_BIFURCATION_STAGES = [
  { id: "one", parameter: 2.8 },
  { id: "two", parameter: 3.2 },
  { id: "four", parameter: 3.5 },
  { id: "eight", parameter: 3.55 },
  { id: "chaos", parameter: 3.9 },
] as const;

function assertFinite(value: number, label: string) {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite.`);
  }
}

function assertParameter(parameter: number) {
  assertFinite(parameter, "The logistic-map parameter");
  if (parameter < LOGISTIC_PARAMETER_MIN || parameter > LOGISTIC_PARAMETER_MAX) {
    throw new Error(
      `The logistic-map parameter must be between ${LOGISTIC_PARAMETER_MIN} and ${LOGISTIC_PARAMETER_MAX}.`,
    );
  }
}

function assertSeed(seed: number) {
  assertFinite(seed, "The logistic-map state");
  if (seed < 0 || seed > 1) {
    throw new Error("The logistic-map state must be between 0 and 1.");
  }
}

export function logisticNext(value: number, parameter: number) {
  assertSeed(value);
  assertParameter(parameter);
  return parameter * value * (1 - value);
}

export function iterateLogistic(seed: number, parameter: number, iterations: number) {
  assertSeed(seed);
  assertParameter(parameter);
  if (!Number.isInteger(iterations) || iterations < 0) {
    throw new Error("The iteration count must be a non-negative integer.");
  }

  let value = seed;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    value = logisticNext(value, parameter);
  }
  return value;
}

export function lateLogisticOrbit(
  seed: number,
  parameter: number,
  burnIn: number,
  sampleCount: number,
) {
  if (!Number.isInteger(burnIn) || burnIn < 0) {
    throw new Error("The burn-in count must be a non-negative integer.");
  }
  if (!Number.isInteger(sampleCount) || sampleCount < 1) {
    throw new Error("The sample count must be a positive integer.");
  }

  const orbit: number[] = [];
  let value = iterateLogistic(seed, parameter, burnIn);
  for (let sample = 0; sample < sampleCount; sample += 1) {
    orbit.push(value);
    value = logisticNext(value, parameter);
  }
  return orbit;
}

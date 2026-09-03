export type RandomWalkParameters = Readonly<{
  mean: number;
  deviation: number;
  correlation: number;
}>;

export type RandomWalkField = Readonly<{
  trajectories: Float32Array;
  delays: Float32Array;
  traceIndices: Uint32Array;
}>;

export const RANDOM_WALKER_COUNT = 16_000;
export const RANDOM_WALK_STEPS = 24;
export const RANDOM_WALK_TRACE_COUNT = 320;

export const DEFAULT_RANDOM_WALK_PARAMETERS: RandomWalkParameters = {
  mean: 0,
  deviation: 1,
  correlation: 0,
};

const TRAJECTORY_POINT_COUNT = RANDOM_WALK_STEPS + 1;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function nextRandom(state: { value: number }) {
  let value = state.value >>> 0;
  if (value === 0) value = 0x6d2b79f5;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.value = value >>> 0;
  return state.value / 4_294_967_296;
}

export function randomWalkTrajectoryOffset(walker: number, step: number) {
  return (walker * TRAJECTORY_POINT_COUNT + step) * 3;
}

export function createRandomWalkField(
  parameters: RandomWalkParameters,
  seed = 0x8cf2d7b1,
): RandomWalkField {
  const trajectories = new Float32Array(
    RANDOM_WALKER_COUNT * TRAJECTORY_POINT_COUNT * 3,
  );
  const delays = new Float32Array(RANDOM_WALKER_COUNT);
  const traceIndices = new Uint32Array(RANDOM_WALK_TRACE_COUNT);
  const random = { value: seed };
  const deviation = clamp(parameters.deviation, 0.5, 2.2);
  const correlation = clamp(parameters.correlation, -0.8, 0.8);
  const residual = Math.sqrt(1 - correlation ** 2);
  // Each U is Uniform[-1, 1], so Var(U) = 1/3. This scale makes the
  // N-step sum of each independent component have variance one.
  const incrementScale = Math.sqrt(3 / RANDOM_WALK_STEPS);

  for (let walker = 0; walker < RANDOM_WALKER_COUNT; walker += 1) {
    let x = parameters.mean;
    let y = parameters.mean;
    let z = parameters.mean;
    const originOffset = randomWalkTrajectoryOffset(walker, 0);
    trajectories[originOffset] = x;
    trajectories[originOffset + 1] = y;
    trajectories[originOffset + 2] = z;

    for (let step = 1; step <= RANDOM_WALK_STEPS; step += 1) {
      const independentX = (nextRandom(random) * 2 - 1) * incrementScale;
      const independentY = (nextRandom(random) * 2 - 1) * incrementScale;
      const independentZ = (nextRandom(random) * 2 - 1) * incrementScale;

      x += deviation * independentX;
      y += deviation * (correlation * independentX + residual * independentY);
      z += deviation * independentZ;

      const offset = randomWalkTrajectoryOffset(walker, step);
      trajectories[offset] = x;
      trajectories[offset + 1] = y;
      trajectories[offset + 2] = z;
    }

    delays[walker] = nextRandom(random) * 1.1;
  }

  const traceStride = Math.floor(RANDOM_WALKER_COUNT / RANDOM_WALK_TRACE_COUNT);
  const traceOffset = seed % traceStride;
  for (let trace = 0; trace < RANDOM_WALK_TRACE_COUNT; trace += 1) {
    traceIndices[trace] = (trace * traceStride + traceOffset) % RANDOM_WALKER_COUNT;
  }

  return { trajectories, delays, traceIndices };
}

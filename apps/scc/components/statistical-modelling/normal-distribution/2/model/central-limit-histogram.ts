export type CentralLimitParameters = Readonly<{
  mean: number;
  deviation: number;
  correlation: number;
}>;

export type CentralLimitField = Readonly<{
  trajectories: Float32Array;
  finalPositions: Float32Array;
  colors: Float32Array;
  delays: Float32Array;
  localDensities: Float32Array;
}>;

export const CENTRAL_LIMIT_PARTICLE_COUNT = 26_000;
export const CENTRAL_LIMIT_STEPS = 12;

export const DEFAULT_CENTRAL_LIMIT_PARAMETERS: CentralLimitParameters = {
  mean: 0,
  deviation: 1,
  correlation: 0,
};

export const CENTRAL_LIMIT_BASE_HEIGHT = -1.6;

const GRID_EXTENT = 4.45;
const DENSITY_RESOLUTION = 92;
const KERNEL_RADIUS = 5;
const TAIL_COLOR = [0.12, 0.34, 0.78] as const;
const PEAK_COLOR = [1, 0.66, 0.34] as const;

const DENSITY_KERNEL = (() => {
  const values: Array<{ column: number; row: number; weight: number }> = [];
  let total = 0;

  for (let row = -KERNEL_RADIUS; row <= KERNEL_RADIUS; row += 1) {
    for (let column = -KERNEL_RADIUS; column <= KERNEL_RADIUS; column += 1) {
      const weight = Math.exp(-(column ** 2 + row ** 2) / 10.5);
      values.push({ column, row, weight });
      total += weight;
    }
  }

  return values.map((value) => ({ ...value, weight: value.weight / total }));
})();

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function nextRandom(state: { value: number }) {
  let value = state.value >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.value = value >>> 0;
  return state.value / 4_294_967_296;
}

function indexFor(column: number, row: number) {
  return row * DENSITY_RESOLUTION + column;
}

function depositDensity(
  density: Float32Array,
  x: number,
  z: number,
  spacing: number,
) {
  const centreColumn = Math.floor((x + GRID_EXTENT) / spacing);
  const centreRow = Math.floor((z + GRID_EXTENT) / spacing);

  for (const kernel of DENSITY_KERNEL) {
    const column = centreColumn + kernel.column;
    const row = centreRow + kernel.row;
    if (column < 0 || column >= DENSITY_RESOLUTION || row < 0 || row >= DENSITY_RESOLUTION) {
      continue;
    }
    const index = indexFor(column, row);
    density[index] = (density[index] ?? 0) + kernel.weight;
  }
}

function sampleDensity(
  density: Float32Array,
  x: number,
  z: number,
  spacing: number,
) {
  const gridX = (x + GRID_EXTENT) / spacing - 0.5;
  const gridZ = (z + GRID_EXTENT) / spacing - 0.5;
  const left = clamp(Math.floor(gridX), 0, DENSITY_RESOLUTION - 1);
  const top = clamp(Math.floor(gridZ), 0, DENSITY_RESOLUTION - 1);
  const right = Math.min(left + 1, DENSITY_RESOLUTION - 1);
  const bottom = Math.min(top + 1, DENSITY_RESOLUTION - 1);
  const across = clamp(gridX - Math.floor(gridX), 0, 1);
  const down = clamp(gridZ - Math.floor(gridZ), 0, 1);
  const upper = (density[indexFor(left, top)] ?? 0) * (1 - across)
    + (density[indexFor(right, top)] ?? 0) * across;
  const lower = (density[indexFor(left, bottom)] ?? 0) * (1 - across)
    + (density[indexFor(right, bottom)] ?? 0) * across;

  return upper * (1 - down) + lower * down;
}

export function createCentralLimitField(
  parameters: CentralLimitParameters,
  seed = 0x42b6d0f1,
): CentralLimitField {
  const trajectories = new Float32Array(CENTRAL_LIMIT_PARTICLE_COUNT * CENTRAL_LIMIT_STEPS * 2);
  const finalPositions = new Float32Array(CENTRAL_LIMIT_PARTICLE_COUNT * 3);
  const colors = new Float32Array(CENTRAL_LIMIT_PARTICLE_COUNT * 3);
  const delays = new Float32Array(CENTRAL_LIMIT_PARTICLE_COUNT);
  const localDensities = new Float32Array(CENTRAL_LIMIT_PARTICLE_COUNT);
  const endpoints = new Float32Array(CENTRAL_LIMIT_PARTICLE_COUNT * 2);
  const density = new Float32Array(DENSITY_RESOLUTION ** 2);
  const random = { value: seed };
  const spacing = (GRID_EXTENT * 2) / DENSITY_RESOLUTION;
  const deviation = clamp(parameters.deviation, 0.5, 2.2);
  const correlation = clamp(parameters.correlation, -0.8, 0.8);
  const residual = Math.sqrt(1 - correlation ** 2);

  for (let particle = 0; particle < CENTRAL_LIMIT_PARTICLE_COUNT; particle += 1) {
    let xSum = 0;
    let zSum = 0;
    const trajectoryOffset = particle * CENTRAL_LIMIT_STEPS * 2;

    for (let step = 0; step < CENTRAL_LIMIT_STEPS; step += 1) {
      // Twelve bounded, independent increments have unit variance after the / 2 scale.
      xSum += (nextRandom(random) * 2 - 1) / 2;
      zSum += (nextRandom(random) * 2 - 1) / 2;
      const offset = trajectoryOffset + step * 2;
      trajectories[offset] = parameters.mean + deviation * xSum;
      trajectories[offset + 1] = parameters.mean + deviation * (correlation * xSum + residual * zSum);
    }

    const lastOffset = trajectoryOffset + (CENTRAL_LIMIT_STEPS - 1) * 2;
    const endpointOffset = particle * 2;
    const x = trajectories[lastOffset] ?? 0;
    const z = trajectories[lastOffset + 1] ?? 0;
    endpoints[endpointOffset] = x;
    endpoints[endpointOffset + 1] = z;
    depositDensity(density, x, z, spacing);
    delays[particle] = nextRandom(random) * 2.65;
  }

  let maximumDensity = 0.0001;
  for (const value of density) maximumDensity = Math.max(maximumDensity, value);

  for (let particle = 0; particle < CENTRAL_LIMIT_PARTICLE_COUNT; particle += 1) {
    const endpointOffset = particle * 2;
    const offset = particle * 3;
    const x = endpoints[endpointOffset] ?? 0;
    const z = endpoints[endpointOffset + 1] ?? 0;
    const intensity = Math.pow(
      clamp(sampleDensity(density, x, z, spacing) / maximumDensity, 0, 1),
      0.72,
    );
    const verticalNoise = (nextRandom(random) - 0.5) * (0.038 + (1 - intensity) * 0.082);

    localDensities[particle] = intensity;
    finalPositions[offset] = x;
    finalPositions[offset + 1] = CENTRAL_LIMIT_BASE_HEIGHT + intensity * 3.8 + verticalNoise;
    finalPositions[offset + 2] = z;
    colors[offset] = TAIL_COLOR[0] + (PEAK_COLOR[0] - TAIL_COLOR[0]) * intensity;
    colors[offset + 1] = TAIL_COLOR[1] + (PEAK_COLOR[1] - TAIL_COLOR[1]) * intensity;
    colors[offset + 2] = TAIL_COLOR[2] + (PEAK_COLOR[2] - TAIL_COLOR[2]) * intensity;
  }

  return { trajectories, finalPositions, colors, delays, localDensities };
}

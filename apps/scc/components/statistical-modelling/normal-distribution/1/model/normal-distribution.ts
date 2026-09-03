export type NormalDistributionParameters = Readonly<{
  mean: number;
  deviation: number;
  correlation: number;
}>;

export type NormalSurface = Readonly<{
  positions: Float32Array;
  colors: Float32Array;
}>;

export const NORMAL_SURFACE_RESOLUTION = 164;
export const NORMAL_SURFACE_COUNT = NORMAL_SURFACE_RESOLUTION ** 2;

export const DEFAULT_NORMAL_DISTRIBUTION: NormalDistributionParameters = {
  mean: 0,
  deviation: 1,
  correlation: 0,
};

const GRID_EXTENT = 4.45;
const TAIL_COLOR = [0.12, 0.34, 0.78] as const;
const PEAK_COLOR = [1, 0.66, 0.34] as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function hash(value: number) {
  const sine = Math.sin(value * 12.9898) * 43_758.5453;
  return sine - Math.floor(sine);
}

export function normalHeightAt(
  x: number,
  z: number,
  parameters: NormalDistributionParameters,
) {
  const deviation = clamp(parameters.deviation, 0.45, 2.4);
  const correlation = clamp(parameters.correlation, -0.86, 0.86);
  const denominator = Math.max(1 - correlation ** 2, 0.08);
  const centeredX = x - parameters.mean;
  const centeredZ = z - parameters.mean;
  const exponent = -(
    centeredX ** 2 - 2 * correlation * centeredX * centeredZ + centeredZ ** 2
  ) / (2 * deviation ** 2 * denominator);
  const bell = Math.exp(exponent);
  const peak = 3.75 / (0.6 + deviation * 0.4);

  return 0.035 + bell * peak * (1 + Math.abs(correlation) * 0.12);
}

export function createNormalSurface(parameters: NormalDistributionParameters): NormalSurface {
  const positions = new Float32Array(NORMAL_SURFACE_COUNT * 3);
  const colors = new Float32Array(NORMAL_SURFACE_COUNT * 3);
  const spacing = (GRID_EXTENT * 2) / (NORMAL_SURFACE_RESOLUTION - 1);

  for (let row = 0; row < NORMAL_SURFACE_RESOLUTION; row += 1) {
    for (let column = 0; column < NORMAL_SURFACE_RESOLUTION; column += 1) {
      const index = row * NORMAL_SURFACE_RESOLUTION + column;
      const offset = index * 3;
      const jitterX = (hash(index * 2 + 1) - 0.5) * spacing * 0.48;
      const jitterZ = (hash(index * 2 + 2) - 0.5) * spacing * 0.48;
      const x = -GRID_EXTENT + column * spacing + jitterX;
      const z = -GRID_EXTENT + row * spacing + jitterZ;
      const height = normalHeightAt(x, z, parameters);
      const concentration = clamp((height - 0.035) / 3.4, 0, 1) ** 0.42;

      positions[offset] = x;
      positions[offset + 1] = height - 1.6;
      positions[offset + 2] = z;
      colors[offset] = TAIL_COLOR[0] + (PEAK_COLOR[0] - TAIL_COLOR[0]) * concentration;
      colors[offset + 1] = TAIL_COLOR[1] + (PEAK_COLOR[1] - TAIL_COLOR[1]) * concentration;
      colors[offset + 2] = TAIL_COLOR[2] + (PEAK_COLOR[2] - TAIL_COLOR[2]) * concentration;
    }
  }

  return { positions, colors };
}

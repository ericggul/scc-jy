export type ThomasPoint = Readonly<{
  x: number;
  y: number;
  z: number;
}>;

export const THOMAS_PARTICLE_COUNT = 30_000;
export const THOMAS_DAMPING = 0.19;
export const THOMAS_STEP = 0.015;
export const THOMAS_SEED_RADIUS = 2;

function fraction(value: number) {
  return value - Math.floor(value);
}

export function thomasHash(index: number) {
  return fraction(Math.sin(index * 12.9898) * 43_758.5453);
}

export function thomasDerivative({ x, y, z }: ThomasPoint): ThomasPoint {
  return {
    x: -THOMAS_DAMPING * x + Math.sin(y),
    y: -THOMAS_DAMPING * y + Math.sin(z),
    z: -THOMAS_DAMPING * z + Math.sin(x),
  };
}

export function stepThomasEuler(state: ThomasPoint): ThomasPoint {
  const derivative = thomasDerivative(state);
  return {
    x: state.x + derivative.x * THOMAS_STEP,
    y: state.y + derivative.y * THOMAS_STEP,
    z: state.z + derivative.z * THOMAS_STEP,
  };
}

export function createThomasSeedPositions(
  count = THOMAS_PARTICLE_COUNT,
) {
  const positions = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const distance = Math.sqrt(thomasHash(index) * THOMAS_SEED_RADIUS ** 2);
    const theta = thomasHash(index + 1) * Math.PI * 2;
    const phi = thomasHash(index + 2) * Math.PI;
    const offset = index * 3;
    positions[offset] = distance * Math.sin(phi) * Math.cos(theta);
    positions[offset + 1] = distance * Math.sin(phi) * Math.sin(theta);
    positions[offset + 2] = distance * Math.cos(phi);
  }

  return positions;
}

export function advanceThomasPositions(positions: Float32Array) {
  for (let offset = 0; offset < positions.length; offset += 3) {
    const x = positions[offset] ?? 0;
    const y = positions[offset + 1] ?? 0;
    const z = positions[offset + 2] ?? 0;
    positions[offset] = x + (-THOMAS_DAMPING * x + Math.sin(y)) * THOMAS_STEP;
    positions[offset + 1] = y +
      (-THOMAS_DAMPING * y + Math.sin(z)) * THOMAS_STEP;
    positions[offset + 2] = z +
      (-THOMAS_DAMPING * z + Math.sin(x)) * THOMAS_STEP;
  }
}

export function thomasPointIsFinite({ x, y, z }: ThomasPoint) {
  return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z);
}

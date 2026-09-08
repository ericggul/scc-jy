export const ARROW_COUNT = 4_096;
export const DOMAIN_HALF_WIDTH = Math.PI;
const DOMAIN_WIDTH = 2 * Math.PI;

export type AbcCoefficients = Readonly<{
  a: number;
  b: number;
  c: number;
}>;

export const ABC_REGIMES = [
  { id: "balanced", label: "1.00 · 1.00 · 1.00", a: 1, b: 1, c: 1 },
  { id: "braided", label: "1.00 · 0.72 · 1.24", a: 1, b: 0.72, c: 1.24 },
  { id: "sheared", label: "1.18 · 1.00 · 0.64", a: 1.18, b: 1, c: 0.64 },
] as const satisfies readonly (AbcCoefficients & { id: string; label: string })[];

export type AbcRegime = (typeof ABC_REGIMES)[number];

export function wrapPeriodic(value: number) {
  return ((value + DOMAIN_HALF_WIDTH) % DOMAIN_WIDTH + DOMAIN_WIDTH) % DOMAIN_WIDTH - DOMAIN_HALF_WIDTH;
}

export function velocityAt(
  x: number,
  y: number,
  z: number,
  { a, b, c }: AbcCoefficients,
): [number, number, number] {
  return [
    a * Math.sin(z) + c * Math.cos(y),
    b * Math.sin(x) + a * Math.cos(z),
    c * Math.sin(y) + b * Math.cos(x),
  ];
}

// RK4 integration of the analytic velocity field. It advances particles in the
// periodic fundamental cell without allocating during animation.
export function advanceParticle(
  positions: Float32Array,
  offset: number,
  dt: number,
  { a, b, c }: AbcCoefficients,
) {
  const x = positions[offset];
  const y = positions[offset + 1];
  const z = positions[offset + 2];
  const k1x = a * Math.sin(z) + c * Math.cos(y);
  const k1y = b * Math.sin(x) + a * Math.cos(z);
  const k1z = c * Math.sin(y) + b * Math.cos(x);
  const x2 = x + k1x * dt * 0.5, y2 = y + k1y * dt * 0.5, z2 = z + k1z * dt * 0.5;
  const k2x = a * Math.sin(z2) + c * Math.cos(y2);
  const k2y = b * Math.sin(x2) + a * Math.cos(z2);
  const k2z = c * Math.sin(y2) + b * Math.cos(x2);
  const x3 = x + k2x * dt * 0.5, y3 = y + k2y * dt * 0.5, z3 = z + k2z * dt * 0.5;
  const k3x = a * Math.sin(z3) + c * Math.cos(y3);
  const k3y = b * Math.sin(x3) + a * Math.cos(z3);
  const k3z = c * Math.sin(y3) + b * Math.cos(x3);
  const x4 = x + k3x * dt, y4 = y + k3y * dt, z4 = z + k3z * dt;
  const k4x = a * Math.sin(z4) + c * Math.cos(y4);
  const k4y = b * Math.sin(x4) + a * Math.cos(z4);
  const k4z = c * Math.sin(y4) + b * Math.cos(x4);
  positions[offset] = wrapPeriodic(x + dt * (k1x + 2 * (k2x + k3x) + k4x) / 6);
  positions[offset + 1] = wrapPeriodic(y + dt * (k1y + 2 * (k2y + k3y) + k4y) / 6);
  positions[offset + 2] = wrapPeriodic(z + dt * (k1z + 2 * (k2z + k3z) + k4z) / 6);
}

export function createParticlePositions(count: number) {
  const positions = new Float32Array(count * 3);
  // Three irrational increments avoid visible planes or repeated tracks.
  for (let i = 0; i < count; i++) {
    positions[i * 3] = -DOMAIN_HALF_WIDTH + DOMAIN_WIDTH * ((i * 0.754877666) % 1);
    positions[i * 3 + 1] = -DOMAIN_HALF_WIDTH + DOMAIN_WIDTH * ((i * 0.569840291) % 1);
    positions[i * 3 + 2] = -DOMAIN_HALF_WIDTH + DOMAIN_WIDTH * ((i * 0.438579164) % 1);
  }
  return positions;
}

export function traceStreamline(
  seed: readonly [number, number, number],
  coefficients: AbcCoefficients,
  steps = 210,
  dt = 0.035,
) {
  const positions = new Float32Array([seed[0], seed[1], seed[2]]);
  const points: Array<[number, number, number]> = [[seed[0], seed[1], seed[2]]];
  for (let step = 0; step < steps; step++) {
    const previous = [positions[0], positions[1], positions[2]] as const;
    advanceParticle(positions, 0, dt, coefficients);
    const next: [number, number, number] = [positions[0], positions[1], positions[2]];
    if (Math.abs(next[0] - previous[0]) > Math.PI || Math.abs(next[1] - previous[1]) > Math.PI || Math.abs(next[2] - previous[2]) > Math.PI) {
      points.push([Number.NaN, Number.NaN, Number.NaN]);
    }
    points.push(next);
  }
  return points;
}

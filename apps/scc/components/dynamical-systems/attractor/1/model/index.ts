export type AttractorId =
  | "finance"
  | "dadras"
  | "bouali"
  | "aizawa"
  | "nose-hoover"
  | "thomas";

export type PhasePoint = Readonly<{
  x: number;
  y: number;
  z: number;
}>;

export type AttractorDefinition = Readonly<{
  id: AttractorId;
  label: string;
  initial: PhasePoint;
  step: number;
  warmupSteps: number;
  sampleCount: number;
  stepsPerSample: number;
  derivative: (state: PhasePoint) => PhasePoint;
}>;

export type AttractorTrace = Readonly<{
  definition: AttractorDefinition;
  points: readonly PhasePoint[];
  center: PhasePoint;
  radius: number;
}>;

export type AttractorParticleState = Readonly<{
  id: number;
  state: PhasePoint;
}>;

export const MAX_PARTICLE_COUNT = 20;

function point(x: number, y: number, z: number): PhasePoint {
  return { x, y, z };
}

function addScaled(
  first: PhasePoint,
  second: PhasePoint,
  scale: number,
): PhasePoint {
  return point(
    first.x + second.x * scale,
    first.y + second.y * scale,
    first.z + second.z * scale,
  );
}

function isFinitePoint(value: PhasePoint) {
  return Number.isFinite(value.x) &&
    Number.isFinite(value.y) &&
    Number.isFinite(value.z);
}

const attractorDefinitions = [
  {
    id: "finance",
    label: "finance",
    initial: point(1, 3, 2),
    step: 0.006,
    warmupSteps: 12_000,
    sampleCount: 12_000,
    stepsPerSample: 2,
    derivative: ({ x, y, z }) => point(
      z + (y - 0.9) * x,
      1 - 0.2 * y - x ** 2,
      -x - 1.2 * z,
    ),
  },
  {
    id: "dadras",
    label: "dadras",
    initial: point(1, 1, 1),
    step: 0.003,
    warmupSteps: 18_000,
    sampleCount: 12_000,
    stepsPerSample: 2,
    derivative: ({ x, y, z }) => point(
      y - 3 * x + 2.7 * y * z,
      1.7 * y - x * z + z,
      2 * x * y - 9 * z,
    ),
  },
  {
    id: "bouali",
    label: "bouali",
    initial: point(1, 0.1, 0.1),
    step: 0.004,
    warmupSteps: 16_000,
    sampleCount: 12_000,
    stepsPerSample: 2,
    derivative: ({ x, y, z }) => point(
      x * (4 - y) + 0.3 * z,
      -y * (1 - x ** 2),
      -x * (1.5 - z) - 0.05 * z,
    ),
  },
  {
    id: "aizawa",
    label: "aizawa",
    initial: point(0.1, 0, 0),
    step: 0.005,
    warmupSteps: 12_000,
    sampleCount: 12_000,
    stepsPerSample: 2,
    derivative: ({ x, y, z }) => point(
      (z - 0.7) * x - 3.5 * y,
      3.5 * x + (z - 0.7) * y,
      0.6 + 0.95 * z - z ** 3 / 3 -
        (x ** 2 + y ** 2) * (1 + 0.25 * z) + 0.1 * z * x ** 3,
    ),
  },
  {
    id: "nose-hoover",
    label: "nosé–hoover",
    initial: point(0.2, 0, 0),
    step: 0.006,
    warmupSteps: 16_000,
    sampleCount: 12_000,
    stepsPerSample: 2,
    derivative: ({ x, y, z }) => point(
      y,
      -x + y * z,
      1 - y ** 2,
    ),
  },
  {
    id: "thomas",
    label: "thomas",
    initial: point(1.1, 1.1, -0.01),
    step: 0.01,
    warmupSteps: 12_000,
    sampleCount: 12_000,
    stepsPerSample: 2,
    derivative: ({ x, y, z }) => point(
      Math.sin(y) - 0.208186 * x,
      Math.sin(z) - 0.208186 * y,
      Math.sin(x) - 0.208186 * z,
    ),
  },
] as const satisfies readonly AttractorDefinition[];

export const ATTRACTOR_DEFINITIONS = attractorDefinitions;

export function isAttractorId(value: string): value is AttractorId {
  return ATTRACTOR_DEFINITIONS.some((definition) => definition.id === value);
}

export function getAttractorDefinition(id: AttractorId) {
  const definition = ATTRACTOR_DEFINITIONS.find((candidate) => candidate.id === id);
  if (!definition) throw new Error(`Unknown attractor: ${id}`);
  return definition;
}

export function stepRungeKutta(
  definition: AttractorDefinition,
  state: PhasePoint,
): PhasePoint {
  const { derivative, step } = definition;
  const first = derivative(state);
  const second = derivative(addScaled(state, first, step / 2));
  const third = derivative(addScaled(state, second, step / 2));
  const fourth = derivative(addScaled(state, third, step));

  return point(
    state.x + step * (first.x + 2 * second.x + 2 * third.x + fourth.x) / 6,
    state.y + step * (first.y + 2 * second.y + 2 * third.y + fourth.y) / 6,
    state.z + step * (first.z + 2 * second.z + 2 * third.z + fourth.z) / 6,
  );
}

function traceEnvelope(points: readonly PhasePoint[]) {
  let minimumX = Infinity;
  let minimumY = Infinity;
  let minimumZ = Infinity;
  let maximumX = -Infinity;
  let maximumY = -Infinity;
  let maximumZ = -Infinity;

  for (const current of points) {
    minimumX = Math.min(minimumX, current.x);
    minimumY = Math.min(minimumY, current.y);
    minimumZ = Math.min(minimumZ, current.z);
    maximumX = Math.max(maximumX, current.x);
    maximumY = Math.max(maximumY, current.y);
    maximumZ = Math.max(maximumZ, current.z);
  }

  const center = point(
    (minimumX + maximumX) / 2,
    (minimumY + maximumY) / 2,
    (minimumZ + maximumZ) / 2,
  );
  return {
    center,
    radius: Math.max(
      0.0001,
      (maximumX - minimumX) / 2,
      (maximumY - minimumY) / 2,
      (maximumZ - minimumZ) / 2,
    ),
  };
}

export function createAttractorTrace(
  definition: AttractorDefinition,
  initial = definition.initial,
): AttractorTrace {
  let state = initial;

  for (let index = 0; index < definition.warmupSteps; index += 1) {
    state = stepRungeKutta(definition, state);
    if (!isFinitePoint(state)) {
      throw new Error(`${definition.id} diverged while warming up.`);
    }
  }

  const points: PhasePoint[] = [];
  for (let index = 0; index < definition.sampleCount; index += 1) {
    for (let substep = 0; substep < definition.stepsPerSample; substep += 1) {
      state = stepRungeKutta(definition, state);
    }
    if (!isFinitePoint(state)) {
      throw new Error(`${definition.id} diverged while sampling.`);
    }
    points.push(state);
  }

  const envelope = traceEnvelope(points);
  return { definition, points, ...envelope };
}

export function createAttractorTraces() {
  return ATTRACTOR_DEFINITIONS.map((definition) =>
    createAttractorTrace(definition),
  );
}

export function normalizeParticleCount(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_PARTICLE_COUNT, Math.max(1, Math.floor(value)));
}

export function createAttractorParticleStates(
  trace: AttractorTrace,
  requestedCount = MAX_PARTICLE_COUNT,
): readonly AttractorParticleState[] {
  const count = normalizeParticleCount(requestedCount);
  const stride = 1_979;
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    state: trace.points[(index * stride) % trace.points.length] ?? trace.definition.initial,
  }));
}

export function stepAttractorParticleStates(
  definition: AttractorDefinition,
  particles: readonly AttractorParticleState[],
): readonly AttractorParticleState[] {
  return particles.map((particle) => ({
    ...particle,
    state: stepRungeKutta(definition, particle.state),
  }));
}

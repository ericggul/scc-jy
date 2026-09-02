export type AttractorId =
  | "finance"
  | "dadras"
  | "bouali"
  | "aizawa"
  | "nose-hoover"
  | "thomas"
  | "qi-four-wing";

export type PhasePoint = Readonly<{
  x: number;
  y: number;
  z: number;
}>;

export type PhaseJacobian = Readonly<{
  xx: number;
  xy: number;
  xz: number;
  yx: number;
  yy: number;
  yz: number;
  zx: number;
  zy: number;
  zz: number;
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
  jacobian: (state: PhasePoint) => PhaseJacobian;
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

export type AttractorTangentParticleState = Readonly<{
  id: number;
  state: PhasePoint;
  companion: PhasePoint;
  tangent: PhasePoint;
  accumulatedLogGrowth: number;
  companionElapsed: number;
  elapsed: number;
}>;

export const MAX_PARTICLE_COUNT = 40;
export const TANGENT_EPSILON_FRACTION = 0.002;

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
    jacobian: ({ x, y }) => ({
      xx: y - 0.9,
      xy: x,
      xz: 1,
      yx: -2 * x,
      yy: -0.2,
      yz: 0,
      zx: -1,
      zy: 0,
      zz: -1.2,
    }),
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
    jacobian: ({ x, y, z }) => ({
      xx: -3,
      xy: 1 + 2.7 * z,
      xz: 2.7 * y,
      yx: -z,
      yy: 1.7,
      yz: 1 - x,
      zx: 2 * y,
      zy: 2 * x,
      zz: -9,
    }),
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
    jacobian: ({ x, y, z }) => ({
      xx: 4 - y,
      xy: -x,
      xz: 0.3,
      yx: 2 * x * y,
      yy: x ** 2 - 1,
      yz: 0,
      zx: z - 1.5,
      zy: 0,
      zz: x - 0.05,
    }),
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
    jacobian: ({ x, y, z }) => ({
      xx: z - 0.7,
      xy: -3.5,
      xz: x,
      yx: 3.5,
      yy: z - 0.7,
      yz: y,
      zx: -2 * x * (1 + 0.25 * z) + 0.3 * z * x ** 2,
      zy: -2 * y * (1 + 0.25 * z),
      zz: 0.95 - z ** 2 - 0.25 * (x ** 2 + y ** 2) + 0.1 * x ** 3,
    }),
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
    jacobian: ({ y, z }) => ({
      xx: 0,
      xy: 1,
      xz: 0,
      yx: -1,
      yy: z,
      yz: y,
      zx: 0,
      zy: -2 * y,
      zz: 0,
    }),
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
    jacobian: ({ x, y, z }) => ({
      xx: -0.208186,
      xy: Math.cos(y),
      xz: 0,
      yx: 0,
      yy: -0.208186,
      yz: Math.cos(z),
      zx: Math.cos(x),
      zy: 0,
      zz: -0.208186,
    }),
  },
  {
    id: "qi-four-wing",
    label: "qi four-wing",
    initial: point(0.001, 0.001, 0.001),
    step: 0.0012,
    warmupSteps: 36_000,
    sampleCount: 12_000,
    stepsPerSample: 2,
    derivative: ({ x, y, z }) => point(
      14 * (y - x) + 4 * y * z,
      -x + 16 * y - x * z,
      -43 * z + x * y,
    ),
    jacobian: ({ x, y, z }) => ({
      xx: -14,
      xy: 14 + 4 * z,
      xz: 4 * y,
      yx: -1 - z,
      yy: 16,
      yz: -x,
      zx: y,
      zy: x,
      zz: -43,
    }),
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

function multiplyJacobian(
  jacobian: PhaseJacobian,
  tangent: PhasePoint,
): PhasePoint {
  return point(
    jacobian.xx * tangent.x + jacobian.xy * tangent.y + jacobian.xz * tangent.z,
    jacobian.yx * tangent.x + jacobian.yy * tangent.y + jacobian.yz * tangent.z,
    jacobian.zx * tangent.x + jacobian.zy * tangent.y + jacobian.zz * tangent.z,
  );
}

function tangentDerivative(
  definition: AttractorDefinition,
  state: PhasePoint,
  tangent: PhasePoint,
) {
  return multiplyJacobian(definition.jacobian(state), tangent);
}

function pointLength(value: PhasePoint) {
  return Math.hypot(value.x, value.y, value.z);
}

function scalePoint(value: PhasePoint, scale: number): PhasePoint {
  return point(value.x * scale, value.y * scale, value.z * scale);
}

function tangentDirection(index: number): PhasePoint {
  const z = 1 - 2 * ((index + 0.5) / MAX_PARTICLE_COUNT);
  const radius = Math.sqrt(Math.max(0, 1 - z ** 2));
  const angle = (index + 1) * 2.399963229728653;
  return point(radius * Math.cos(angle), radius * Math.sin(angle), z);
}

export function stepTangentRungeKutta(
  definition: AttractorDefinition,
  state: PhasePoint,
  tangent: PhasePoint,
) {
  const { derivative, step } = definition;
  const firstState = derivative(state);
  const firstTangent = tangentDerivative(definition, state, tangent);
  const secondState = derivative(addScaled(state, firstState, step / 2));
  const secondTangent = tangentDerivative(
    definition,
    addScaled(state, firstState, step / 2),
    addScaled(tangent, firstTangent, step / 2),
  );
  const thirdState = derivative(addScaled(state, secondState, step / 2));
  const thirdTangent = tangentDerivative(
    definition,
    addScaled(state, secondState, step / 2),
    addScaled(tangent, secondTangent, step / 2),
  );
  const fourthState = derivative(addScaled(state, thirdState, step));
  const fourthTangent = tangentDerivative(
    definition,
    addScaled(state, thirdState, step),
    addScaled(tangent, thirdTangent, step),
  );

  return {
    state: point(
      state.x + step * (firstState.x + 2 * secondState.x + 2 * thirdState.x + fourthState.x) / 6,
      state.y + step * (firstState.y + 2 * secondState.y + 2 * thirdState.y + fourthState.y) / 6,
      state.z + step * (firstState.z + 2 * secondState.z + 2 * thirdState.z + fourthState.z) / 6,
    ),
    tangent: point(
      tangent.x + step * (firstTangent.x + 2 * secondTangent.x + 2 * thirdTangent.x + fourthTangent.x) / 6,
      tangent.y + step * (firstTangent.y + 2 * secondTangent.y + 2 * thirdTangent.y + fourthTangent.y) / 6,
      tangent.z + step * (firstTangent.z + 2 * secondTangent.z + 2 * thirdTangent.z + fourthTangent.z) / 6,
    ),
  };
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

export function tangentEpsilonFor(trace: AttractorTrace) {
  return Math.max(trace.radius * TANGENT_EPSILON_FRACTION, 1e-9);
}

export function createAttractorTangentParticleStates(
  trace: AttractorTrace,
  requestedCount = MAX_PARTICLE_COUNT,
): readonly AttractorTangentParticleState[] {
  const count = normalizeParticleCount(requestedCount);
  const stride = 1_979;
  const epsilon = tangentEpsilonFor(trace);
  return Array.from({ length: count }, (_, index) => {
    const state = trace.points[(index * stride) % trace.points.length] ??
      trace.definition.initial;
    const tangent = scalePoint(tangentDirection(index), epsilon);
    return {
      id: index + 1,
      state,
      companion: addScaled(state, tangent, 1),
      tangent,
      accumulatedLogGrowth: 0,
      companionElapsed: 0,
      elapsed: 0,
    };
  });
}

export function stepAttractorTangentParticleStates(
  definition: AttractorDefinition,
  particles: readonly AttractorTangentParticleState[],
): readonly AttractorTangentParticleState[] {
  return particles.map((particle) => {
    const next = stepTangentRungeKutta(
      definition,
      particle.state,
      particle.tangent,
    );
    return {
      ...particle,
      state: next.state,
      companion: stepRungeKutta(definition, particle.companion),
      tangent: next.tangent,
      companionElapsed: particle.companionElapsed + definition.step,
      elapsed: particle.elapsed + definition.step,
    };
  });
}

export function renormalizeAttractorTangentParticleStates(
  particles: readonly AttractorTangentParticleState[],
  epsilon: number,
): readonly AttractorTangentParticleState[] {
  return particles.map((particle) => {
    const magnitude = pointLength(particle.tangent);
    const hasUsableMagnitude = Number.isFinite(magnitude) && magnitude > 1e-14;
    const direction = hasUsableMagnitude
      ? scalePoint(particle.tangent, 1 / magnitude)
      : tangentDirection(particle.id - 1);
    const tangent = scalePoint(direction, epsilon);
    return {
      ...particle,
      tangent,
      accumulatedLogGrowth: particle.accumulatedLogGrowth +
        Math.log((hasUsableMagnitude ? magnitude : epsilon) / epsilon),
    };
  });
}

export function reReleaseAttractorTangentCompanions(
  particles: readonly AttractorTangentParticleState[],
  maximumElapsed: number,
  maximumSeparation: number,
): readonly AttractorTangentParticleState[] {
  return particles.map((particle) => {
    const separation = pointLength(addScaled(particle.companion, particle.state, -1));
    if (particle.companionElapsed < maximumElapsed && separation < maximumSeparation) {
      return particle;
    }
    return {
      ...particle,
      companion: addScaled(particle.state, particle.tangent, 1),
      companionElapsed: 0,
    };
  });
}

export function finiteTimeTangentDivergence(
  particle: AttractorTangentParticleState,
  epsilon: number,
) {
  if (particle.elapsed <= 0) return 0;
  const currentMagnitude = pointLength(particle.tangent);
  return (particle.accumulatedLogGrowth +
    Math.log(Math.max(currentMagnitude, 1e-14) / epsilon)) / particle.elapsed;
}

export function tangentParticleIsFinite(
  particle: AttractorTangentParticleState,
) {
  return isFinitePoint(particle.state) &&
    isFinitePoint(particle.companion) &&
    isFinitePoint(particle.tangent) &&
    Number.isFinite(particle.accumulatedLogGrowth) &&
    Number.isFinite(particle.companionElapsed) &&
    Number.isFinite(particle.elapsed);
}

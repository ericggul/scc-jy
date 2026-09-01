export type FieldPoint = {
  x: number;
  y: number;
};

export type FieldVector = FieldPoint;

export const fieldControls = [
  { charge: 1.4, id: "like" },
  { charge: 1.05, id: "comment" },
  { charge: 0.68, id: "repost" },
  { charge: -1.05, id: "send" },
  { charge: -1.4, id: "save" },
] as const;

export type FieldControlId = (typeof fieldControls)[number]["id"];

export type FieldSource = {
  charge: number;
  controlId: FieldControlId;
  createdAt: number;
  id: string;
  position: FieldPoint;
};

export type GestureSample = {
  controlId: FieldControlId;
  id: string;
  phase: "start" | "move" | "end";
  position: FieldPoint;
  receivedAt: number;
};

type StaticFieldSource = Pick<FieldSource, "charge" | "position">;

const baseSources: readonly StaticFieldSource[] = [
  { charge: 0.22, position: { x: 0.24, y: 0.31 } },
  { charge: -0.22, position: { x: 0.74, y: 0.48 } },
  { charge: 0.16, position: { x: 0.39, y: 0.75 } },
  { charge: -0.16, position: { x: 0.73, y: 0.8 } },
];

export const fieldTuning = {
  maximumSourceAgeMs: 2_400,
  minimumDepositDistance: 0.0025,
  sourceDecayMs: 1_250,
  sourceRadius: 0.055,
} as const;

function clamp(value: number, lower: number, upper: number) {
  return Math.min(Math.max(value, lower), upper);
}

function distance(first: FieldPoint, second: FieldPoint) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

export function isFieldControlId(value: string): value is FieldControlId {
  return fieldControls.some((control) => control.id === value);
}

function chargeForControl(controlId: FieldControlId) {
  return fieldControls.find((control) => control.id === controlId)?.charge ?? 0;
}

export function createFieldSource(
  previous: GestureSample | undefined,
  next: GestureSample,
): FieldSource | null {
  const travelled = previous
    ? distance(previous.position, next.position)
    : fieldTuning.minimumDepositDistance;

  if (
    previous &&
    travelled < fieldTuning.minimumDepositDistance &&
    next.phase !== "end"
  ) {
    return null;
  }

  const deposit = previous
    ? clamp(0.95 + travelled * 12, 0.95, 1.8)
    : 1.15;

  return {
    charge: chargeForControl(next.controlId) * deposit,
    controlId: next.controlId,
    createdAt: next.receivedAt,
    id: next.id,
    position: next.position,
  };
}

export function retainLiveSources(sources: FieldSource[], now: number) {
  return sources.filter(
    (source) => now - source.createdAt < fieldTuning.maximumSourceAgeMs,
  );
}

function addFieldContribution({
  aspectRatio,
  charge,
  point,
  position,
  temporalWeight = 1,
  vector,
}: {
  aspectRatio: number;
  charge: number;
  point: FieldPoint;
  position: FieldPoint;
  temporalWeight?: number;
  vector: FieldVector;
}) {
  const dx = (point.x - position.x) * aspectRatio;
  const dy = point.y - position.y;
  const softenedDistanceSquared =
    dx * dx + dy * dy + fieldTuning.sourceRadius ** 2;
  const inverseDistanceCubed = 1 / Math.pow(softenedDistanceSquared, 1.5);
  const influence = charge * temporalWeight * inverseDistanceCubed;

  vector.x += dx * influence;
  vector.y += dy * influence;
}

export function electricPotentialAt({
  aspectRatio,
  now,
  point,
  sources,
}: {
  aspectRatio: number;
  now: number;
  point: FieldPoint;
  sources: FieldSource[];
}) {
  const safeAspectRatio = Math.max(aspectRatio, 0.01);
  let potential = 0;

  for (const source of baseSources) {
    const dx = (point.x - source.position.x) * safeAspectRatio;
    const dy = point.y - source.position.y;
    potential += source.charge / Math.sqrt(dx * dx + dy * dy + fieldTuning.sourceRadius ** 2);
  }

  for (const source of sources) {
    const age = now - source.createdAt;
    if (age < 0 || age >= fieldTuning.maximumSourceAgeMs) continue;

    const dx = (point.x - source.position.x) * safeAspectRatio;
    const dy = point.y - source.position.y;
    const temporalWeight = Math.exp(-age / fieldTuning.sourceDecayMs);
    potential +=
      (source.charge * temporalWeight) /
      Math.sqrt(dx * dx + dy * dy + fieldTuning.sourceRadius ** 2);
  }

  return potential;
}

export function fieldVectorAt({
  point,
  sources,
  now,
  aspectRatio,
}: {
  aspectRatio: number;
  now: number;
  point: FieldPoint;
  sources: FieldSource[];
}): FieldVector {
  const safeAspectRatio = Math.max(aspectRatio, 0.01);
  const vector = { x: 0, y: 0 };

  for (const source of baseSources) {
    addFieldContribution({
      aspectRatio: safeAspectRatio,
      charge: source.charge,
      point,
      position: source.position,
      vector,
    });
  }

  for (const source of sources) {
    const age = now - source.createdAt;
    if (age < 0 || age >= fieldTuning.maximumSourceAgeMs) continue;

    addFieldContribution({
      aspectRatio: safeAspectRatio,
      charge: source.charge,
      point,
      position: source.position,
      temporalWeight: Math.exp(-age / fieldTuning.sourceDecayMs),
      vector,
    });
  }

  return vector;
}

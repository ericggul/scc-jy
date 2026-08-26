/**
 * A deliberately explicit trial curve. The requested points remain exact, but
 * their log intervals are joined with a shape-preserving monotone cubic rather
 * than straight segments, so the admission clock accelerates continuously.
 */
const C_VAL_SOCIAL_CADENCE_ANCHORS = [
  { movePercent: 0, intervalMs: 400 },
  { movePercent: 4, intervalMs: 300 },
  { movePercent: 8, intervalMs: 200 },
  { movePercent: 15, intervalMs: 100 },
  { movePercent: 30, intervalMs: 30 },
] as const;

export const C_VAL_SOCIETY_CADENCE_JITTER = 0.22;

const C_VAL_SOCIAL_LOG_INTERVALS = C_VAL_SOCIAL_CADENCE_ANCHORS.map(
  ({ intervalMs }) => Math.log(intervalMs),
);

function cValLogCadenceSlope(index: number) {
  const lastIndex = C_VAL_SOCIAL_CADENCE_ANCHORS.length - 1;
  const anchor = C_VAL_SOCIAL_CADENCE_ANCHORS[index]!;
  const logInterval = C_VAL_SOCIAL_LOG_INTERVALS[index]!;

  if (index === 0) {
    const next = C_VAL_SOCIAL_CADENCE_ANCHORS[1]!;
    const nextSlope = (C_VAL_SOCIAL_LOG_INTERVALS[1]! - logInterval)
      / (next.movePercent - anchor.movePercent);
    const afterNext = C_VAL_SOCIAL_CADENCE_ANCHORS[2]!;
    const afterNextSlope = (C_VAL_SOCIAL_LOG_INTERVALS[2]! - C_VAL_SOCIAL_LOG_INTERVALS[1]!)
      / (afterNext.movePercent - next.movePercent);
    const endpointSlope = (3 * nextSlope - afterNextSlope) / 2;
    return Math.sign(endpointSlope) !== Math.sign(nextSlope)
      ? 0
      : Math.sign(nextSlope) !== Math.sign(afterNextSlope)
        ? Math.sign(nextSlope) * Math.min(Math.abs(endpointSlope), 3 * Math.abs(nextSlope))
        : endpointSlope;
  }

  if (index === lastIndex) {
    const previous = C_VAL_SOCIAL_CADENCE_ANCHORS[index - 1]!;
    const previousSlope = (logInterval - C_VAL_SOCIAL_LOG_INTERVALS[index - 1]!)
      / (anchor.movePercent - previous.movePercent);
    const beforePrevious = C_VAL_SOCIAL_CADENCE_ANCHORS[index - 2]!;
    const beforePreviousSlope = (C_VAL_SOCIAL_LOG_INTERVALS[index - 1]!
      - C_VAL_SOCIAL_LOG_INTERVALS[index - 2]!)
      / (previous.movePercent - beforePrevious.movePercent);
    const endpointSlope = (3 * previousSlope - beforePreviousSlope) / 2;
    return Math.sign(endpointSlope) !== Math.sign(previousSlope)
      ? 0
      : Math.sign(previousSlope) !== Math.sign(beforePreviousSlope)
        ? Math.sign(previousSlope) * Math.min(Math.abs(endpointSlope), 3 * Math.abs(previousSlope))
        : endpointSlope;
  }

  const previous = C_VAL_SOCIAL_CADENCE_ANCHORS[index - 1]!;
  const next = C_VAL_SOCIAL_CADENCE_ANCHORS[index + 1]!;
  const previousSlope = (logInterval - C_VAL_SOCIAL_LOG_INTERVALS[index - 1]!)
    / (anchor.movePercent - previous.movePercent);
  const nextSlope = (C_VAL_SOCIAL_LOG_INTERVALS[index + 1]! - logInterval)
    / (next.movePercent - anchor.movePercent);
  if (previousSlope * nextSlope <= 0) return 0;

  const previousSpan = anchor.movePercent - previous.movePercent;
  const nextSpan = next.movePercent - anchor.movePercent;
  const previousWeight = 2 * nextSpan + previousSpan;
  const nextWeight = nextSpan + 2 * previousSpan;
  return (previousWeight + nextWeight)
    / (previousWeight / previousSlope + nextWeight / nextSlope);
}

const C_VAL_SOCIAL_LOG_CADENCE_SLOPES = C_VAL_SOCIAL_CADENCE_ANCHORS.map(
  (_, index) => cValLogCadenceSlope(index),
);

/** Shared continuous C-VAL clock for observer-facing social streams. */
export function cValSocialAdmissionIntervalMs(oneSecondMovePercent: number) {
  const magnitude = Math.max(
    0,
    Math.abs(Number.isFinite(oneSecondMovePercent) ? oneSecondMovePercent : 0),
  );
  const firstAnchor = C_VAL_SOCIAL_CADENCE_ANCHORS[0]!;
  const finalAnchor = C_VAL_SOCIAL_CADENCE_ANCHORS.at(-1)!;
  if (magnitude <= firstAnchor.movePercent) return firstAnchor.intervalMs;
  if (magnitude >= finalAnchor.movePercent) return finalAnchor.intervalMs;
  const upperIndex = C_VAL_SOCIAL_CADENCE_ANCHORS.findIndex(
    ({ movePercent }) => magnitude <= movePercent,
  );
  const lowerIndex = upperIndex - 1;
  const lower = C_VAL_SOCIAL_CADENCE_ANCHORS[lowerIndex]!;
  const upper = C_VAL_SOCIAL_CADENCE_ANCHORS[upperIndex]!;
  const span = upper.movePercent - lower.movePercent;
  const progress = (magnitude - lower.movePercent) / span;
  const progressSquared = progress * progress;
  const progressCubed = progressSquared * progress;
  const lowerLogInterval = C_VAL_SOCIAL_LOG_INTERVALS[lowerIndex]!;
  const upperLogInterval = C_VAL_SOCIAL_LOG_INTERVALS[upperIndex]!;
  const interpolatedLogInterval = (2 * progressCubed - 3 * progressSquared + 1)
    * lowerLogInterval
    + (progressCubed - 2 * progressSquared + progress)
      * span * C_VAL_SOCIAL_LOG_CADENCE_SLOPES[lowerIndex]!
    + (-2 * progressCubed + 3 * progressSquared) * upperLogInterval
    + (progressCubed - progressSquared)
      * span * C_VAL_SOCIAL_LOG_CADENCE_SLOPES[upperIndex]!;
  return Math.round(Math.exp(interpolatedLogInterval));
}

/**
 * Preserves the social cadence curve in expectation while decorrelating one
 * independent thread. Production samples once per admission; tests may inject
 * noiseUnit to verify the exact bounds without controlling global randomness.
 */
export function cValSocietyAdmissionIntervalMs(
  oneSecondMovePercent: number,
  noiseUnit = Math.random(),
) {
  const finiteNoise = Number.isFinite(noiseUnit) ? noiseUnit : 0.5;
  const boundedNoise = Math.min(1, Math.max(0, finiteNoise));
  const multiplier = 1 - C_VAL_SOCIETY_CADENCE_JITTER
    + boundedNoise * C_VAL_SOCIETY_CADENCE_JITTER * 2;
  return Math.round(cValSocialAdmissionIntervalMs(oneSecondMovePercent) * multiplier);
}

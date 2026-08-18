/**
 * @typedef {object} ThreeAxisRotationRate
 * @property {number | null} alpha
 * @property {number | null} beta
 * @property {number | null} gamma
 */

const ROTATION_SENSITIVITY_DEGREES_PER_SECOND = 12;
const ROTATION_NOISE_FLOOR_DEGREES_PER_SECOND = 1;
const PARAMETER_EXCURSION = 0.48;

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function finiteOrientationValue(value) {
  return Number.isFinite(value) ? Number(value) : 0;
}

export function signedAngleDelta(value, baseline) {
  return ((value - baseline + 540) % 360) - 180;
}

function softMagnitude(value) {
  return value / (ROTATION_SENSITIVITY_DEGREES_PER_SECOND + value);
}

function softSigned(value) {
  return value /
    (ROTATION_SENSITIVITY_DEGREES_PER_SECOND + Math.abs(value));
}

/**
 * The complete live interaction mapping.
 *
 * Every physical rotation axis uses the same fixed equation. Rotation energy
 * raises V and lowers L; the signed sum sets A. There is no pose, learned axis,
 * mode, temporal window, quaternion, or angle-specific branch.
 *
 * @param {ThreeAxisRotationRate} rotationRate
 */
export function rotationRateToCValControl(rotationRate = {}) {
  const alpha = finiteOrientationValue(rotationRate.alpha);
  const beta = finiteOrientationValue(rotationRate.beta);
  const gamma = finiteOrientationValue(rotationRate.gamma);
  const energy = Math.abs(alpha) + Math.abs(beta) + Math.abs(gamma);
  const signedRotation = alpha + beta + gamma;
  const intensity = softMagnitude(energy);
  const direction = softSigned(signedRotation);

  return {
    parameters: {
      volatility: 0.5 + PARAMETER_EXCURSION * intensity,
      activity: 0.5 + PARAMETER_EXCURSION * direction,
      liquidity: 0.5 - PARAMETER_EXCURSION * intensity,
    },
    engaged: energy >= ROTATION_NOISE_FLOOR_DEGREES_PER_SECOND,
    energyDegreesPerSecond: energy,
    signedRotationDegreesPerSecond: signedRotation,
  };
}

/** Exact C-VAL 1 phone-orientation mapping, copied for comparison only. */
export function cValOneOrientationToParameters(orientation = {}) {
  return {
    volatility: clamp(
      0.5 + 0.5 * (finiteOrientationValue(orientation.alpha) / 90),
      0,
      1,
    ),
    activity: clamp(
      0.5 + 0.5 * (finiteOrientationValue(orientation.beta) / 90),
      0,
      1,
    ),
    liquidity: clamp(
      0.5 + 0.5 * (finiteOrientationValue(orientation.gamma) / 45),
      0,
      1,
    ),
  };
}

/** Exact beta-only mapping preserved at checkpoint 07a5aaf. */
export function checkpointOrientationToParameters(orientation = {}) {
  const direction = clamp(
    finiteOrientationValue(orientation.beta) / 35,
    -1,
    1,
  );
  const intensity = Math.abs(direction);
  return {
    volatility: 0.5 + 0.5 * intensity,
    activity: 0.5 + 0.5 * direction,
    liquidity: 0.5 - 0.5 * intensity,
  };
}

/**
 * Compatibility name for the legacy offline market bridge. Its input is now
 * interpreted as a three-axis rotation rate, exactly like the mobile client.
 */
export function orientationToCValParameters(rotationRate = {}) {
  return rotationRateToCValControl(rotationRate).parameters;
}

/**
 * Applies the calibration retained by the archived orientation replay tools.
 * The live V2 mobile does not use pose calibration.
 */
export function calibrateRawOrientation(raw, baseline) {
  const normalizedRaw = {
    alpha: finiteOrientationValue(raw.alpha),
    beta: finiteOrientationValue(raw.beta),
    gamma: finiteOrientationValue(raw.gamma),
  };
  const normalizedBaseline = {
    alpha: finiteOrientationValue(baseline.alpha),
    beta: finiteOrientationValue(baseline.beta),
    gamma: finiteOrientationValue(baseline.gamma),
  };
  return {
    absolute: Boolean(raw.absolute),
    alpha: signedAngleDelta(
      normalizedRaw.alpha,
      normalizedBaseline.alpha,
    ),
    beta: normalizedRaw.beta - normalizedBaseline.beta,
    gamma: normalizedRaw.gamma - normalizedBaseline.gamma,
  };
}

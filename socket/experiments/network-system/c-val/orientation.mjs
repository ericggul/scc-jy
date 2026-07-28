/**
 * @typedef {object} RawOrientation
 * @property {boolean} [absolute]
 * @property {number | null} alpha
 * @property {number | null} beta
 * @property {number | null} gamma
 */

export function finiteOrientationValue(value) {
  return Number.isFinite(value) ? Number(value) : 0;
}

export function signedAngleDelta(value, baseline) {
  return ((value - baseline + 540) % 360) - 180;
}

/**
 * Applies the exact calibration used by the mobile DeviceOrientation client.
 * Alpha wraps at 360 degrees; beta and gamma remain signed differences.
 *
 * @param {RawOrientation} raw
 * @param {RawOrientation} baseline
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

const FIXED_STAR_RADIUS = 4.4;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function starRadiusFromEnergy(
  energy: number,
  energySizeEnabled: boolean,
) {
  if (!energySizeEnabled) return FIXED_STAR_RADIUS;
  const normalizedEnergy = clamp(energy / 1.05, 0, 1);
  return 1.25 + Math.pow(normalizedEnergy, 0.72) * 8.8;
}

export function approachStarRadius(
  previous: number,
  target: number,
  delta: number,
) {
  const safeDelta = clamp(delta, 0, 0.1);
  const interpolation = 1 - Math.exp(-safeDelta * 5.5);
  return previous + (target - previous) * interpolation;
}

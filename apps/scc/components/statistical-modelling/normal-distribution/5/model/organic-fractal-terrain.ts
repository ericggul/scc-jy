export type OrganicFractalTerrain = Readonly<{
  positions: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
}>;

export type OrganicFractalPeak = Readonly<{
  index: number;
  x: number;
  z: number;
  standardDeviation: number;
}>;

export const ORGANIC_FRACTAL_RADIAL_SEGMENTS = 256;
export const ORGANIC_FRACTAL_ANGULAR_SEGMENTS = 768;
export const ORGANIC_FRACTAL_VERTEX_COUNT =
  1 + ORGANIC_FRACTAL_RADIAL_SEGMENTS * ORGANIC_FRACTAL_ANGULAR_SEGMENTS;

const TAU = Math.PI * 2;
const FIELD_RADIUS = 32;
const GLOBAL_ENVELOPE_DEVIATION = 8.5;
const ROOT_STANDARD_DEVIATION = 8.5;
const MIN_STANDARD_DEVIATION = 0.45;
const MAX_SURFACE_HEIGHT = 3.75 * GLOBAL_ENVELOPE_DEVIATION;
const PACKING_FACTOR = 3.05;
const PACKING_ATTEMPTS = 6_000;
const CELL_SIZE = 1.6;
const GRID_CELLS_PER_AXIS = Math.ceil((FIELD_RADIUS * 2) / CELL_SIZE) + 1;
const SURFACE_BASE_HEIGHT = 0.035;
const BACKGROUND_COLOR = [0.027, 0.039, 0.063] as const;
const TAIL_COLOR = [0.12, 0.34, 0.78] as const;
const PEAK_COLOR = [1, 0.66, 0.34] as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function gaussianEnvelopeAtRadius(radius: number) {
  return Math.exp(-(radius ** 2) / (2 * GLOBAL_ENVELOPE_DEVIATION ** 2));
}

function standardDeviationAtRadius(radius: number) {
  return MIN_STANDARD_DEVIATION
    + (ROOT_STANDARD_DEVIATION - MIN_STANDARD_DEVIATION)
      * gaussianEnvelopeAtRadius(radius) ** 0.78;
}

function cellCoordinate(value: number) {
  return clamp(
    Math.floor((value + FIELD_RADIUS) / CELL_SIZE),
    0,
    GRID_CELLS_PER_AXIS - 1,
  );
}

function cellIndex(x: number, z: number) {
  return z * GRID_CELLS_PER_AXIS + x;
}

function seededRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function canPlacePeak(candidate: OrganicFractalPeak, peaks: readonly OrganicFractalPeak[]) {
  return peaks.every((peak) => {
    const minimumDistance = PACKING_FACTOR * (candidate.standardDeviation + peak.standardDeviation) / 2;
    return (candidate.x - peak.x) ** 2 + (candidate.z - peak.z) ** 2
      >= minimumDistance ** 2;
  });
}

function createOrganicFractalPeaks(): readonly OrganicFractalPeak[] {
  const nextRandom = seededRandom(0x5CA1E);
  const peaks: OrganicFractalPeak[] = [{
    index: 0,
    x: 0,
    z: 0,
    standardDeviation: ROOT_STANDARD_DEVIATION,
  }];

  for (let attempt = 0; attempt < PACKING_ATTEMPTS; attempt += 1) {
    const radius = FIELD_RADIUS * Math.sqrt(nextRandom());
    const angle = TAU * nextRandom();
    const candidate: OrganicFractalPeak = {
      index: peaks.length,
      x: radius * Math.cos(angle),
      z: radius * Math.sin(angle),
      standardDeviation: standardDeviationAtRadius(radius),
    };

    if (canPlacePeak(candidate, peaks)) peaks.push(candidate);
  }

  return peaks;
}

const ORGANIC_FRACTAL_PEAKS = createOrganicFractalPeaks();

export const ORGANIC_FRACTAL_MOUNTAIN_COUNT = ORGANIC_FRACTAL_PEAKS.length;

const PEAK_CELLS = (() => {
  const cells = Array.from(
    { length: GRID_CELLS_PER_AXIS * GRID_CELLS_PER_AXIS },
    () => [] as number[],
  );

  for (const peak of ORGANIC_FRACTAL_PEAKS) {
    const influence = peak.standardDeviation * 3.4;
    const firstX = cellCoordinate(peak.x - influence);
    const lastX = cellCoordinate(peak.x + influence);
    const firstZ = cellCoordinate(peak.z - influence);
    const lastZ = cellCoordinate(peak.z + influence);

    for (let z = firstZ; z <= lastZ; z += 1) {
      for (let x = firstX; x <= lastX; x += 1) {
        cells[cellIndex(x, z)].push(peak.index);
      }
    }
  }

  return cells;
})();

export function organicFractalPeakAddress(index: number): OrganicFractalPeak {
  const peak = ORGANIC_FRACTAL_PEAKS[index];
  if (!peak) throw new RangeError(`Unknown organic fractal peak: ${index}`);
  return peak;
}

export function organicFractalPeakHeightAt(x: number, z: number) {
  return MAX_SURFACE_HEIGHT * Math.exp(
    -(x ** 2 + z ** 2) / (2 * ROOT_STANDARD_DEVIATION ** 2),
  );
}

function detailFieldAt(x: number, z: number) {
  const candidates = PEAK_CELLS[cellIndex(cellCoordinate(x), cellCoordinate(z))];
  let pNormSum = 0;

  for (const peakIndex of candidates) {
    const peak = ORGANIC_FRACTAL_PEAKS[peakIndex];
    const squaredDistance = (x - peak.x) ** 2 + (z - peak.z) ** 2;
    const influence = peak.standardDeviation * 3.4;
    if (squaredDistance > influence ** 2) continue;

    const density = Math.exp(-squaredDistance / (2 * peak.standardDeviation ** 2));
    pNormSum += density ** 2.35;
  }

  return 1 - Math.exp(-2.6 * Math.pow(pNormSum, 1 / 2.35));
}

function organicFractalHeightAt(x: number, z: number) {
  const globalHeight = MAX_SURFACE_HEIGHT * gaussianEnvelopeAtRadius(Math.hypot(x, z));
  return globalHeight * (0.1 + detailFieldAt(x, z) * 0.9);
}

export function createOrganicFractalTerrain(): OrganicFractalTerrain {
  const positions = new Float32Array(ORGANIC_FRACTAL_VERTEX_COUNT * 3);
  const colors = new Float32Array(ORGANIC_FRACTAL_VERTEX_COUNT * 3);
  const triangleCount = ORGANIC_FRACTAL_ANGULAR_SEGMENTS
    + (ORGANIC_FRACTAL_RADIAL_SEGMENTS - 1) * ORGANIC_FRACTAL_ANGULAR_SEGMENTS * 2;
  const indices = new Uint32Array(triangleCount * 3);

  for (let radialIndex = 0; radialIndex <= ORGANIC_FRACTAL_RADIAL_SEGMENTS; radialIndex += 1) {
    const radius = (radialIndex / ORGANIC_FRACTAL_RADIAL_SEGMENTS) * FIELD_RADIUS;

    for (let angularIndex = 0; angularIndex < ORGANIC_FRACTAL_ANGULAR_SEGMENTS; angularIndex += 1) {
      if (radialIndex === 0 && angularIndex > 0) continue;

      const index = radialIndex === 0
        ? 0
        : 1 + (radialIndex - 1) * ORGANIC_FRACTAL_ANGULAR_SEGMENTS + angularIndex;
      const offset = index * 3;
      const angle = (TAU * angularIndex) / ORGANIC_FRACTAL_ANGULAR_SEGMENTS;
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      const height = organicFractalHeightAt(x, z);
      const concentration = clamp(height / MAX_SURFACE_HEIGHT, 0, 1) ** 0.42;
      const tailPresence = clamp(height / 0.32, 0, 1);
      const lowRed = BACKGROUND_COLOR[0] + (TAIL_COLOR[0] - BACKGROUND_COLOR[0]) * tailPresence;
      const lowGreen = BACKGROUND_COLOR[1] + (TAIL_COLOR[1] - BACKGROUND_COLOR[1]) * tailPresence;
      const lowBlue = BACKGROUND_COLOR[2] + (TAIL_COLOR[2] - BACKGROUND_COLOR[2]) * tailPresence;

      positions[offset] = x;
      positions[offset + 1] = SURFACE_BASE_HEIGHT + height - 1.6;
      positions[offset + 2] = z;
      colors[offset] = lowRed + (PEAK_COLOR[0] - lowRed) * concentration;
      colors[offset + 1] = lowGreen + (PEAK_COLOR[1] - lowGreen) * concentration;
      colors[offset + 2] = lowBlue + (PEAK_COLOR[2] - lowBlue) * concentration;
    }
  }

  let indexOffset = 0;
  for (let angularIndex = 0; angularIndex < ORGANIC_FRACTAL_ANGULAR_SEGMENTS; angularIndex += 1) {
    const nextAngularIndex = (angularIndex + 1) % ORGANIC_FRACTAL_ANGULAR_SEGMENTS;
    indices[indexOffset] = 0;
    indices[indexOffset + 1] = 1 + nextAngularIndex;
    indices[indexOffset + 2] = 1 + angularIndex;
    indexOffset += 3;
  }

  for (let radialIndex = 1; radialIndex < ORGANIC_FRACTAL_RADIAL_SEGMENTS; radialIndex += 1) {
    const innerStart = 1 + (radialIndex - 1) * ORGANIC_FRACTAL_ANGULAR_SEGMENTS;
    const outerStart = innerStart + ORGANIC_FRACTAL_ANGULAR_SEGMENTS;

    for (let angularIndex = 0; angularIndex < ORGANIC_FRACTAL_ANGULAR_SEGMENTS; angularIndex += 1) {
      const nextAngularIndex = (angularIndex + 1) % ORGANIC_FRACTAL_ANGULAR_SEGMENTS;
      const innerCurrent = innerStart + angularIndex;
      const innerNext = innerStart + nextAngularIndex;
      const outerCurrent = outerStart + angularIndex;
      const outerNext = outerStart + nextAngularIndex;

      indices[indexOffset] = innerCurrent;
      indices[indexOffset + 1] = innerNext;
      indices[indexOffset + 2] = outerCurrent;
      indices[indexOffset + 3] = innerNext;
      indices[indexOffset + 4] = outerNext;
      indices[indexOffset + 5] = outerCurrent;
      indexOffset += 6;
    }
  }

  return { positions, colors, indices };
}

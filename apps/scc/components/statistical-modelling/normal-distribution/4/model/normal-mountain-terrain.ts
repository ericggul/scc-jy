export type NormalMountainTerrain = Readonly<{
  positions: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
}>;

export const NORMAL_MOUNTAIN_GRID_SIDE = 20;
export const NORMAL_MOUNTAIN_COUNT = NORMAL_MOUNTAIN_GRID_SIDE ** 2;
export const NORMAL_MOUNTAIN_SURFACE_RESOLUTION = 361;
export const NORMAL_MOUNTAIN_VERTEX_COUNT = NORMAL_MOUNTAIN_SURFACE_RESOLUTION ** 2;

const MOUNTAIN_SPACING = 2.9;
const FIELD_MARGIN = 2.35;
const SURFACE_BASE_HEIGHT = 0.035;
const PEAK_HEIGHT = 3.75;
const NORMAL_DEVIATION = 1.15;
const TAIL_COLOR = [0.12, 0.34, 0.78] as const;
const PEAK_COLOR = [1, 0.66, 0.34] as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalMountainAddress(index: number) {
  const column = index % NORMAL_MOUNTAIN_GRID_SIDE;
  const row = Math.floor(index / NORMAL_MOUNTAIN_GRID_SIDE);
  const offset = ((NORMAL_MOUNTAIN_GRID_SIDE - 1) * MOUNTAIN_SPACING) / 2;

  return {
    index,
    column,
    row,
    x: column * MOUNTAIN_SPACING - offset,
    z: row * MOUNTAIN_SPACING - offset,
  };
}

export function normalMountainHeightAt(x: number, z: number) {
  return SURFACE_BASE_HEIGHT + PEAK_HEIGHT * Math.exp(
    -(x ** 2 + z ** 2) / (2 * NORMAL_DEVIATION ** 2),
  );
}

function joinedNormalDensity(x: number, z: number) {
  let fourthPowerSum = 0;
  const centreOffset = ((NORMAL_MOUNTAIN_GRID_SIDE - 1) * MOUNTAIN_SPACING) / 2;
  const nearestColumn = clamp(
    Math.round((x + centreOffset) / MOUNTAIN_SPACING),
    0,
    NORMAL_MOUNTAIN_GRID_SIDE - 1,
  );
  const nearestRow = clamp(
    Math.round((z + centreOffset) / MOUNTAIN_SPACING),
    0,
    NORMAL_MOUNTAIN_GRID_SIDE - 1,
  );
  const firstColumn = Math.max(0, nearestColumn - 1);
  const lastColumn = Math.min(NORMAL_MOUNTAIN_GRID_SIDE - 1, nearestColumn + 1);
  const firstRow = Math.max(0, nearestRow - 1);
  const lastRow = Math.min(NORMAL_MOUNTAIN_GRID_SIDE - 1, nearestRow + 1);

  for (let row = firstRow; row <= lastRow; row += 1) {
    const mountZ = row * MOUNTAIN_SPACING - centreOffset;

    for (let column = firstColumn; column <= lastColumn; column += 1) {
      const mountX = column * MOUNTAIN_SPACING - centreOffset;
      const squaredDistance = (x - mountX) ** 2 + (z - mountZ) ** 2;
      const density = Math.exp(-squaredDistance / (2 * NORMAL_DEVIATION ** 2));
      fourthPowerSum += density ** 4;
    }
  }

  return Math.pow(fourthPowerSum, 0.25);
}

export function createNormalMountainTerrain(): NormalMountainTerrain {
  const positions = new Float32Array(NORMAL_MOUNTAIN_VERTEX_COUNT * 3);
  const colors = new Float32Array(NORMAL_MOUNTAIN_VERTEX_COUNT * 3);
  const cellCount = NORMAL_MOUNTAIN_SURFACE_RESOLUTION - 1;
  const indices = new Uint32Array(cellCount * cellCount * 6);
  const centreOffset = ((NORMAL_MOUNTAIN_GRID_SIDE - 1) * MOUNTAIN_SPACING) / 2;
  const halfExtent = centreOffset + FIELD_MARGIN;
  const spacing = (halfExtent * 2) / cellCount;

  for (let row = 0; row < NORMAL_MOUNTAIN_SURFACE_RESOLUTION; row += 1) {
    for (let column = 0; column < NORMAL_MOUNTAIN_SURFACE_RESOLUTION; column += 1) {
      const index = row * NORMAL_MOUNTAIN_SURFACE_RESOLUTION + column;
      const offset = index * 3;
      const x = -halfExtent + column * spacing;
      const z = -halfExtent + row * spacing;
      const density = clamp(joinedNormalDensity(x, z), 0, 1);
      const concentration = density ** 0.42;

      positions[offset] = x;
      positions[offset + 1] = SURFACE_BASE_HEIGHT + density * PEAK_HEIGHT - 1.6;
      positions[offset + 2] = z;
      colors[offset] = TAIL_COLOR[0] + (PEAK_COLOR[0] - TAIL_COLOR[0]) * concentration;
      colors[offset + 1] = TAIL_COLOR[1] + (PEAK_COLOR[1] - TAIL_COLOR[1]) * concentration;
      colors[offset + 2] = TAIL_COLOR[2] + (PEAK_COLOR[2] - TAIL_COLOR[2]) * concentration;
    }
  }

  let indexOffset = 0;
  for (let row = 0; row < cellCount; row += 1) {
    for (let column = 0; column < cellCount; column += 1) {
      const topLeft = row * NORMAL_MOUNTAIN_SURFACE_RESOLUTION + column;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + NORMAL_MOUNTAIN_SURFACE_RESOLUTION;
      const bottomRight = bottomLeft + 1;

      indices[indexOffset] = topLeft;
      indices[indexOffset + 1] = bottomLeft;
      indices[indexOffset + 2] = topRight;
      indices[indexOffset + 3] = topRight;
      indices[indexOffset + 4] = bottomLeft;
      indices[indexOffset + 5] = bottomRight;
      indexOffset += 6;
    }
  }

  return { positions, colors, indices };
}

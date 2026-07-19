export type CursorAgent = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export type CursorMotionProfile = "cursor" | "sideFish";

export type Grid = {
  cellSize: number;
  originX: number;
  originY: number;
  columns: number;
  rows: number;
};

export type SelectedCell = {
  column: number;
  row: number;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

export type CellAnchor = {
  xRatio: number;
  yRatio: number;
};

export type CursorFieldSettings = {
  cellMin: number;
  cellMax: number;
  cellDivisor: number;
  clearance: number;
  minDistance: number;
  collisionBuffer: number;
  collisionPasses: number;
};

export const SWARM_FOUR_SETTINGS: CursorFieldSettings = {
  cellMin: 20,
  cellMax: 30,
  cellDivisor: 30,
  clearance: 6,
  minDistance: 16,
  collisionBuffer: 2,
  collisionPasses: 8,
};

export const SWARM_FIVE_SETTINGS: CursorFieldSettings = {
  cellMin: 20,
  cellMax: 30,
  cellDivisor: 30,
  clearance: 3,
  minDistance: 8,
  collisionBuffer: 1,
  collisionPasses: 8,
};

export function scaleCursorFieldSettings(
  settings: CursorFieldSettings,
  agentScale: number,
): CursorFieldSettings {
  return {
    ...settings,
    clearance: settings.clearance * agentScale,
    minDistance: settings.minDistance * agentScale,
    collisionBuffer: settings.collisionBuffer * agentScale,
  };
}

const PERCEPTION_RADIUS = 72;
const SEPARATION_RADIUS = 24;
const MAX_SPEED = 86;
const MIN_SPEED = 30;
const EDGE_MARGIN = 56;
const SIDE_FISH_CRUISE_SPEED = 40;
const SIDE_FISH_MIN_SPEED = 26;
const SIDE_FISH_MAX_SPEED = 54;
const SIDE_FISH_MAX_TURN_RATE = 1.4;
const SIDE_FISH_EDGE_LOOKAHEAD = 112;
const SIDE_FISH_CELL_LOOKAHEAD = 68;

function seededUnit(index: number, salt: number) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function limitVector(x: number, y: number, maximum: number) {
  const magnitude = Math.hypot(x, y);

  if (magnitude <= maximum || magnitude === 0) {
    return { x, y };
  }

  const scale = maximum / magnitude;
  return { x: x * scale, y: y * scale };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function angleDifference(target: number, current: number) {
  return Math.atan2(
    Math.sin(target - current),
    Math.cos(target - current),
  );
}

export function createGrid(
  width: number,
  height: number,
  settings: CursorFieldSettings,
): Grid {
  const cellSize = Math.max(
    settings.cellMin,
    Math.min(
      settings.cellMax,
      Math.round(Math.min(width, height) / settings.cellDivisor),
    ),
  );
  const columns = Math.ceil(width / cellSize) + 1;
  const rows = Math.ceil(height / cellSize) + 1;

  return {
    cellSize,
    originX: (width - columns * cellSize) / 2,
    originY: (height - rows * cellSize) / 2,
    columns,
    rows,
  };
}

export function getCellAtPoint(x: number, y: number, grid: Grid): SelectedCell {
  const column = Math.min(
    grid.columns - 1,
    Math.max(0, Math.floor((x - grid.originX) / grid.cellSize)),
  );
  const row = Math.min(
    grid.rows - 1,
    Math.max(0, Math.floor((y - grid.originY) / grid.cellSize)),
  );
  const cellX = grid.originX + column * grid.cellSize;
  const cellY = grid.originY + row * grid.cellSize;

  return {
    column,
    row,
    x: cellX,
    y: cellY,
    width: grid.cellSize,
    height: grid.cellSize,
    centerX: cellX + grid.cellSize / 2,
    centerY: cellY + grid.cellSize / 2,
  };
}

export function getAnchoredCells(
  anchors: readonly CellAnchor[],
  grid: Grid,
  width: number,
  height: number,
) {
  return anchors.map((anchor) =>
    getCellAtPoint(anchor.xRatio * width, anchor.yRatio * height, grid),
  );
}

export function createCursorField(
  count: number,
  width: number,
  height: number,
  settings: CursorFieldSettings,
  motionProfile: CursorMotionProfile = "cursor",
): CursorAgent[] {
  const centerX = width / 2;
  const centerY = height / 2;
  const availableWidth = Math.max(settings.minDistance, width - EDGE_MARGIN * 2);
  const availableHeight = Math.max(settings.minDistance, height - EDGE_MARGIN * 2);
  const maximumColumns = Math.max(
    1,
    Math.floor(availableWidth / settings.minDistance) - 1,
  );
  const maximumRows = Math.max(
    1,
    Math.floor(availableHeight / settings.minDistance) - 1,
  );
  const preferredWidth = Math.min(600, availableWidth);
  const preferredHeight = Math.min(420, availableHeight);
  let columns = Math.min(
    maximumColumns,
    Math.max(1, Math.ceil(Math.sqrt((count * preferredWidth) / preferredHeight))),
  );
  let rows = Math.ceil(count / columns);

  if (rows > maximumRows) {
    columns = Math.min(maximumColumns, Math.ceil(count / maximumRows));
    rows = Math.ceil(count / columns);
  }

  const spreadX = Math.min(
    availableWidth,
    Math.max(preferredWidth, (columns + 1) * settings.minDistance),
  );
  const spreadY = Math.min(
    availableHeight,
    Math.max(preferredHeight, (rows + 1) * settings.minDistance),
  );
  const gapX = spreadX / (columns + 1);
  const gapY = spreadY / (rows + 1);

  return Array.from({ length: count }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const angle = seededUnit(index, 3) * Math.PI * 2;
    const speed = 34 + seededUnit(index, 4) * 26;
    const fishSpeed = 30 + seededUnit(index, 4) * 12;

    return {
      id: index,
      x: centerX - spreadX / 2 + gapX * (column + 1),
      y: centerY - spreadY / 2 + gapY * (row + 1),
      vx:
        motionProfile === "sideFish"
          ? fishSpeed
          : Math.cos(angle) * speed,
      vy:
        motionProfile === "sideFish"
          ? (seededUnit(index, 9) - 0.5) * 5
          : Math.sin(angle) * speed,
    };
  });
}

function perimeterPoint(cell: SelectedCell, angle: number, padding: number) {
  const directionX = Math.cos(angle);
  const directionY = Math.sin(angle);
  const halfWidth = cell.width / 2 + padding;
  const halfHeight = cell.height / 2 + padding;
  const distance =
    1 /
    Math.max(
      Math.abs(directionX) / halfWidth,
      Math.abs(directionY) / halfHeight,
    );

  return {
    x: cell.centerX + directionX * distance,
    y: cell.centerY + directionY * distance,
  };
}

function getPerimeterTarget(
  cell: SelectedCell,
  targetRank: number,
  targetIndex: number,
  elapsedSeconds: number,
  settings: CursorFieldSettings,
) {
  let remainingRank = targetRank;
  let band = 0;
  const collisionDistance = settings.minDistance + settings.collisionBuffer;
  let padding = settings.clearance + collisionDistance;

  while (true) {
    const perimeter = 2 * (cell.width + cell.height + padding * 4);
    const capacity = Math.max(8, Math.floor(perimeter / collisionDistance));

    if (remainingRank < capacity) {
      const direction = targetIndex % 2 === 0 ? 1 : -1;
      const phase =
        (remainingRank / capacity) * Math.PI * 2 +
        elapsedSeconds * 0.22 * direction;
      return perimeterPoint(cell, phase, padding);
    }

    remainingRank -= capacity;
    band += 1;
    padding += collisionDistance * (0.82 + (band % 2) * 0.08);
  }
}

function isInsideProtectedCell(
  x: number,
  y: number,
  cell: SelectedCell,
  settings: CursorFieldSettings,
) {
  return (
    x > cell.x - settings.clearance &&
    x < cell.x + cell.width + settings.clearance &&
    y > cell.y - settings.clearance &&
    y < cell.y + cell.height + settings.clearance
  );
}

type ConstraintCandidate = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

function keepOutsideCells(
  x: number,
  y: number,
  vx: number,
  vy: number,
  cells: readonly SelectedCell[],
  settings: CursorFieldSettings,
) {
  if (
    !cells.some((cell) => isInsideProtectedCell(x, y, cell, settings))
  ) {
    return { x, y, vx, vy };
  }

  const candidates: ConstraintCandidate[] = [];

  for (const cell of cells) {
    const left = cell.x - settings.clearance;
    const right = cell.x + cell.width + settings.clearance;
    const top = cell.y - settings.clearance;
    const bottom = cell.y + cell.height + settings.clearance;
    const clampedX = Math.min(right, Math.max(left, x));
    const clampedY = Math.min(bottom, Math.max(top, y));

    candidates.push(
      { x: left, y: clampedY, vx: -Math.abs(vx) * 0.62, vy },
      { x: right, y: clampedY, vx: Math.abs(vx) * 0.62, vy },
      { x: clampedX, y: top, vx, vy: -Math.abs(vy) * 0.62 },
      { x: clampedX, y: bottom, vx, vy: Math.abs(vy) * 0.62 },
    );
  }

  const validCandidates = candidates.filter(
    (candidate) =>
      !cells.some((cell) =>
        isInsideProtectedCell(candidate.x, candidate.y, cell, settings),
      ),
  );

  const nearest = validCandidates.reduce((current, candidate) => {
    const currentDistance = (current.x - x) ** 2 + (current.y - y) ** 2;
    const candidateDistance =
      (candidate.x - x) ** 2 + (candidate.y - y) ** 2;
    return candidateDistance < currentDistance ? candidate : current;
  });

  return nearest;
}

export function evacuateSelectedCells(
  cursors: CursorAgent[],
  cells: readonly SelectedCell[],
  settings: CursorFieldSettings,
) {
  return cursors.map((cursor) => {
    const constrained = keepOutsideCells(
      cursor.x,
      cursor.y,
      cursor.vx,
      cursor.vy,
      cells,
      settings,
    );

    return { ...cursor, ...constrained };
  });
}

function resolveCursorCollisions(
  cursors: CursorAgent[],
  width: number,
  height: number,
  selectedCells: readonly SelectedCell[],
  settings: CursorFieldSettings,
  motionProfile: CursorMotionProfile,
) {
  let resolved = cursors.map((cursor) => ({ ...cursor }));
  const collisionDistance = settings.minDistance + settings.collisionBuffer;
  const bucketSize = collisionDistance;
  const minDistanceSquared = collisionDistance * collisionDistance;

  for (let pass = 0; pass < settings.collisionPasses; pass += 1) {
    const columnCount = Math.ceil(width / bucketSize) + 1;
    const spatialGrid = new Map<number, number[]>();

    for (let index = 0; index < resolved.length; index += 1) {
      const cursor = resolved[index];
      const column = Math.floor(cursor.x / bucketSize);
      const row = Math.floor(cursor.y / bucketSize);
      const key = row * columnCount + column;
      const bucket = spatialGrid.get(key);

      if (bucket) {
        bucket.push(index);
      } else {
        spatialGrid.set(key, [index]);
      }
    }

    for (let index = 0; index < resolved.length; index += 1) {
      const cursor = resolved[index];
      const column = Math.floor(cursor.x / bucketSize);
      const row = Math.floor(cursor.y / bucketSize);

      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
          const key =
            (row + rowOffset) * columnCount + column + columnOffset;
          const nearbyIndices = spatialGrid.get(key);
          if (!nearbyIndices) continue;

          for (const otherIndex of nearbyIndices) {
            if (otherIndex <= index) continue;
            const other = resolved[otherIndex];
            let dx = other.x - cursor.x;
            let dy = other.y - cursor.y;
            let distanceSquared = dx * dx + dy * dy;

            if (distanceSquared >= minDistanceSquared) continue;

            if (distanceSquared < 0.0001) {
              const angle =
                seededUnit(cursor.id + other.id, pass + 9) * Math.PI * 2;
              dx = Math.cos(angle);
              dy = Math.sin(angle);
              distanceSquared = 1;
            }

            const distance = Math.sqrt(distanceSquared);
            const directionX = dx / distance;
            const directionY = dy / distance;
            const overlap = (collisionDistance - distance) / 2 + 0.01;

            cursor.x -= directionX * overlap;
            cursor.y -= directionY * overlap;
            other.x += directionX * overlap;
            other.y += directionY * overlap;

            if (motionProfile === "cursor") {
              const impulse = overlap * 9;
              cursor.vx -= directionX * impulse;
              cursor.vy -= directionY * impulse;
              other.vx += directionX * impulse;
              other.vy += directionY * impulse;
            }
          }
        }
      }
    }

    resolved = resolved.map((cursor) => {
      const constrained = keepOutsideCells(
        Math.min(width, Math.max(0, cursor.x)),
        Math.min(height, Math.max(0, cursor.y)),
        cursor.vx,
        cursor.vy,
        selectedCells,
        settings,
      );

      return { ...cursor, ...constrained };
    });
  }

  return resolved;
}

export function settleCursorField(
  cursors: CursorAgent[],
  width: number,
  height: number,
  selectedCells: readonly SelectedCell[],
  settings: CursorFieldSettings,
  preventCursorCollisions = true,
  motionProfile: CursorMotionProfile = "cursor",
) {
  const evacuatedCursors = evacuateSelectedCells(
    cursors,
    selectedCells,
    settings,
  );

  if (!preventCursorCollisions) {
    return evacuatedCursors;
  }

  return resolveCursorCollisions(
    evacuatedCursors,
    width,
    height,
    selectedCells,
    settings,
    motionProfile,
  );
}

function getSideFishBoundaryAvoidance(
  cursor: CursorAgent,
  width: number,
  height: number,
) {
  let x = 0;
  let y = 0;
  const rightDistance = width - cursor.x;
  const bottomDistance = height - cursor.y;

  if (cursor.x < SIDE_FISH_EDGE_LOOKAHEAD) {
    x +=
      ((SIDE_FISH_EDGE_LOOKAHEAD - cursor.x) / SIDE_FISH_EDGE_LOOKAHEAD) *
      112;
  }
  if (rightDistance < SIDE_FISH_EDGE_LOOKAHEAD) {
    x -=
      ((SIDE_FISH_EDGE_LOOKAHEAD - rightDistance) / SIDE_FISH_EDGE_LOOKAHEAD) *
      112;
  }
  if (cursor.y < SIDE_FISH_EDGE_LOOKAHEAD) {
    y +=
      ((SIDE_FISH_EDGE_LOOKAHEAD - cursor.y) / SIDE_FISH_EDGE_LOOKAHEAD) *
      96;
  }
  if (bottomDistance < SIDE_FISH_EDGE_LOOKAHEAD) {
    y -=
      ((SIDE_FISH_EDGE_LOOKAHEAD - bottomDistance) / SIDE_FISH_EDGE_LOOKAHEAD) *
      96;
  }

  return { x, y };
}

function getSideFishCellAvoidance(
  cursor: CursorAgent,
  cells: readonly SelectedCell[],
  settings: CursorFieldSettings,
) {
  let x = 0;
  let y = 0;
  const lookahead = SIDE_FISH_CELL_LOOKAHEAD + settings.clearance;

  for (const cell of cells) {
    const nearestX = clamp(cursor.x, cell.x, cell.x + cell.width);
    const nearestY = clamp(cursor.y, cell.y, cell.y + cell.height);
    let offsetX = cursor.x - nearestX;
    let offsetY = cursor.y - nearestY;
    let distance = Math.hypot(offsetX, offsetY);

    if (distance >= lookahead) continue;

    if (distance < 0.001) {
      const centerX = cursor.x - cell.centerX;
      const centerY = cursor.y - cell.centerY;
      const centerDistance = Math.hypot(centerX, centerY) || 1;
      offsetX = centerX / centerDistance;
      offsetY = centerY / centerDistance;
      distance = 0;
    } else {
      offsetX /= distance;
      offsetY /= distance;
    }

    const strength = ((lookahead - distance) / lookahead) * 340;
    x += offsetX * strength;
    y += offsetY * strength;
  }

  return { x, y };
}

function getSideFishSteering(
  cursor: CursorAgent,
  width: number,
  height: number,
  selectedCells: readonly SelectedCell[],
  settings: CursorFieldSettings,
  elapsedSeconds: number,
) {
  const currentHeading = Math.atan2(cursor.vy, cursor.vx);
  let steeringX = Math.cos(currentHeading);
  let steeringY = Math.sin(currentHeading);
  let desiredSpeed = SIDE_FISH_CRUISE_SPEED;
  const attentionCell =
    selectedCells.length > 0
      ? selectedCells[cursor.id % selectedCells.length]
      : null;

  if (attentionCell) {
    const targetRank = Math.floor(cursor.id / selectedCells.length);
    const targetIndex = cursor.id % selectedCells.length;
    const orbitPoint = getPerimeterTarget(
      attentionCell,
      targetRank,
      targetIndex,
      elapsedSeconds,
      settings,
    );
    const toOrbitX = orbitPoint.x - cursor.x;
    const toOrbitY = orbitPoint.y - cursor.y;
    const orbitDistance = Math.hypot(toOrbitX, toOrbitY) || 1;
    const orbitUnitX = toOrbitX / orbitDistance;
    const orbitUnitY = toOrbitY / orbitDistance;
    const targetRadiusX = orbitPoint.x - attentionCell.centerX;
    const targetRadiusY = orbitPoint.y - attentionCell.centerY;
    const targetRadius = Math.hypot(targetRadiusX, targetRadiusY) || 1;
    const tangentDirection = targetIndex % 2 === 0 ? 1 : -1;
    const tangentX = (-targetRadiusY / targetRadius) * tangentDirection;
    const tangentY = (targetRadiusX / targetRadius) * tangentDirection;
    const approach = clamp(orbitDistance / 112, 0.12, 1);

    steeringX = orbitUnitX * approach + tangentX * (1 - approach);
    steeringY = orbitUnitY * approach + tangentY * (1 - approach);
    desiredSpeed = orbitDistance < 76 ? 34 : SIDE_FISH_CRUISE_SPEED;
  }

  const boundaryAvoidance = getSideFishBoundaryAvoidance(
    cursor,
    width,
    height,
  );
  steeringX += (boundaryAvoidance.x / 112) * 1.6;
  steeringY += (boundaryAvoidance.y / 112) * 1.6;

  const cellAvoidance = getSideFishCellAvoidance(
    cursor,
    selectedCells,
    settings,
  );
  const cellAvoidanceMagnitude = Math.hypot(
    cellAvoidance.x,
    cellAvoidance.y,
  );
  if (cellAvoidanceMagnitude > 0) {
    steeringX =
      steeringX * 0.18 + (cellAvoidance.x / cellAvoidanceMagnitude) * 2.6;
    steeringY =
      steeringY * 0.18 + (cellAvoidance.y / cellAvoidanceMagnitude) * 2.6;
  }

  return {
    heading: Math.atan2(steeringY, steeringX),
    speed: desiredSpeed,
  };
}

function integrateSideFishVelocity(
  cursor: CursorAgent,
  desiredHeading: number,
  desiredSpeed: number,
  deltaSeconds: number,
) {
  const currentSpeed = Math.max(
    SIDE_FISH_MIN_SPEED,
    Math.hypot(cursor.vx, cursor.vy),
  );
  const currentHeading = Math.atan2(cursor.vy, cursor.vx);
  const heading =
    currentHeading +
    clamp(
      angleDifference(desiredHeading, currentHeading),
      -SIDE_FISH_MAX_TURN_RATE * deltaSeconds,
      SIDE_FISH_MAX_TURN_RATE * deltaSeconds,
    );
  const speed = clamp(
    currentSpeed +
      (desiredSpeed - currentSpeed) * Math.min(1, deltaSeconds * 0.8),
    SIDE_FISH_MIN_SPEED,
    SIDE_FISH_MAX_SPEED,
  );

  return {
    vx: Math.cos(heading) * speed,
    vy: Math.sin(heading) * speed,
  };
}

function stepSideFishField(
  cursors: CursorAgent[],
  width: number,
  height: number,
  deltaSeconds: number,
  elapsedSeconds: number,
  selectedCells: readonly SelectedCell[],
  settings: CursorFieldSettings,
  preventCursorCollisions: boolean,
) {
  const movedFish = cursors.map((cursor) => {
    const steering = getSideFishSteering(
      cursor,
      width,
      height,
      selectedCells,
      settings,
      elapsedSeconds,
    );
    const { vx, vy } = integrateSideFishVelocity(
      cursor,
      steering.heading,
      steering.speed,
      deltaSeconds,
    );
    const constrained = keepOutsideCells(
      Math.min(width, Math.max(0, cursor.x + vx * deltaSeconds)),
      Math.min(height, Math.max(0, cursor.y + vy * deltaSeconds)),
      vx,
      vy,
      selectedCells,
      settings,
    );

    return { ...cursor, x: constrained.x, y: constrained.y, vx, vy };
  });

  if (!preventCursorCollisions) {
    return movedFish;
  }

  return resolveCursorCollisions(
    movedFish,
    width,
    height,
    selectedCells,
    settings,
    "sideFish",
  );
}

export function stepCursorField(
  cursors: CursorAgent[],
  width: number,
  height: number,
  deltaSeconds: number,
  elapsedSeconds: number,
  selectedCells: readonly SelectedCell[],
  settings: CursorFieldSettings,
  preventCursorCollisions = true,
  agentScale = 1,
  motionProfile: CursorMotionProfile = "cursor",
) {
  if (motionProfile === "sideFish") {
    return stepSideFishField(
      cursors,
      width,
      height,
      deltaSeconds,
      elapsedSeconds,
      selectedCells,
      settings,
      preventCursorCollisions,
    );
  }

  const perceptionSquared = PERCEPTION_RADIUS * PERCEPTION_RADIUS;
  const separationRadius = SEPARATION_RADIUS * agentScale;
  const separationSquared = separationRadius * separationRadius;
  const columnCount = Math.ceil(width / PERCEPTION_RADIUS) + 1;
  const spatialGrid = new Map<number, CursorAgent[]>();

  for (const cursor of cursors) {
    const column = Math.floor(cursor.x / PERCEPTION_RADIUS);
    const row = Math.floor(cursor.y / PERCEPTION_RADIUS);
    const key = row * columnCount + column;
    const bucket = spatialGrid.get(key);

    if (bucket) {
      bucket.push(cursor);
    } else {
      spatialGrid.set(key, [cursor]);
    }
  }

  const movedCursors = cursors.map((cursor) => {
    let neighborCount = 0;
    let alignmentX = 0;
    let alignmentY = 0;
    let centerX = 0;
    let centerY = 0;
    let separationX = 0;
    let separationY = 0;
    const cursorColumn = Math.floor(cursor.x / PERCEPTION_RADIUS);
    const cursorRow = Math.floor(cursor.y / PERCEPTION_RADIUS);

    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
        const key =
          (cursorRow + rowOffset) * columnCount +
          cursorColumn +
          columnOffset;
        const nearbyCursors = spatialGrid.get(key);
        if (!nearbyCursors) continue;

        for (const other of nearbyCursors) {
          if (other.id === cursor.id) continue;

          const dx = other.x - cursor.x;
          const dy = other.y - cursor.y;
          const distanceSquared = dx * dx + dy * dy;
          if (distanceSquared >= perceptionSquared) continue;

          neighborCount += 1;
          alignmentX += other.vx;
          alignmentY += other.vy;
          centerX += other.x;
          centerY += other.y;

          if (distanceSquared < separationSquared && distanceSquared > 0.01) {
            separationX -= dx / distanceSquared;
            separationY -= dy / distanceSquared;
          }
        }
      }
    }

    let accelerationX = separationX * 1.15 * 560;
    let accelerationY = separationY * 1.15 * 560;

    if (neighborCount > 0) {
      const inverseCount = 1 / neighborCount;
      accelerationX +=
        (alignmentX * inverseCount - cursor.vx) * 0.82 * 0.72;
      accelerationY +=
        (alignmentY * inverseCount - cursor.vy) * 0.82 * 0.72;
      accelerationX +=
        (centerX * inverseCount - cursor.x) * 0.72 * 0.44;
      accelerationY +=
        (centerY * inverseCount - cursor.y) * 0.72 * 0.44;
    }

    const attentionCell =
      selectedCells.length > 0
        ? selectedCells[cursor.id % selectedCells.length]
        : null;

    if (attentionCell) {
      const targetRank = Math.floor(cursor.id / selectedCells.length);
      const targetIndex = cursor.id % selectedCells.length;
      const orbitPoint = getPerimeterTarget(
        attentionCell,
        targetRank,
        targetIndex,
        elapsedSeconds,
        settings,
      );
      const dx = orbitPoint.x - cursor.x;
      const dy = orbitPoint.y - cursor.y;
      const distance = Math.hypot(dx, dy);

      if (distance > 22) {
        const arrival = Math.min(1, distance / 150);
        const desiredVx = (dx / distance) * MAX_SPEED * arrival;
        const desiredVy = (dy / distance) * MAX_SPEED * arrival;
        accelerationX += (desiredVx - cursor.vx) * 0.72;
        accelerationY += (desiredVy - cursor.vy) * 0.72;
      }
    }

    if (cursor.x < EDGE_MARGIN) accelerationX += (EDGE_MARGIN - cursor.x) * 1.8;
    if (cursor.x > width - EDGE_MARGIN) {
      accelerationX -= (cursor.x - (width - EDGE_MARGIN)) * 1.8;
    }
    if (cursor.y < EDGE_MARGIN) accelerationY += (EDGE_MARGIN - cursor.y) * 1.8;
    if (cursor.y > height - EDGE_MARGIN) {
      accelerationY -= (cursor.y - (height - EDGE_MARGIN)) * 1.8;
    }

    const acceleration = limitVector(accelerationX, accelerationY, 72);
    let vx = cursor.vx + acceleration.x * deltaSeconds;
    let vy = cursor.vy + acceleration.y * deltaSeconds;
    const speed = Math.hypot(vx, vy);

    if (speed > MAX_SPEED) {
      const scale = MAX_SPEED / speed;
      vx *= scale;
      vy *= scale;
    } else if (speed < MIN_SPEED && speed > 0) {
      const scale = MIN_SPEED / speed;
      vx *= scale;
      vy *= scale;
    }

    const constrained = keepOutsideCells(
      Math.min(width, Math.max(0, cursor.x + vx * deltaSeconds)),
      Math.min(height, Math.max(0, cursor.y + vy * deltaSeconds)),
      vx,
      vy,
      selectedCells,
      settings,
    );

    return { ...cursor, ...constrained };
  });

  if (!preventCursorCollisions) {
    return movedCursors;
  }

  return resolveCursorCollisions(
    movedCursors,
    width,
    height,
    selectedCells,
    settings,
    motionProfile,
  );
}

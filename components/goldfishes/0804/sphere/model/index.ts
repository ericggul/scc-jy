export type CursorAgent = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export type AttentionPoint = {
  id: number;
  x: number;
  y: number;
  height: number;
  radius: number;
};

export type SpatialAnchor = {
  id: number;
  xRatio: number;
  yRatio: number;
  zRatio: number;
};

export type AttentionZoneBehavior =
  | "protected-perimeter"
  | "open-perimeter";

export type CursorFieldSettings = {
  clearance: number;
  minDistance: number;
  collisionBuffer: number;
  collisionPasses: number;
};

export const GOLDFISHES_SPHERE_FIELD_SETTINGS: CursorFieldSettings = {
  clearance: 6,
  minDistance: 16,
  collisionBuffer: 2,
  collisionPasses: 8,
};

const MIN_ATTENTION_SPHERE_DIAMETER = 40;
const MAX_ATTENTION_SPHERE_DIAMETER = 60;
const ATTENTION_SPHERE_DIAMETER_DIVISOR = 30;
const MIN_ATTENTION_SPHERE_VOLUME_MULTIPLIER = 0.5 ** 3;
const MAX_ATTENTION_SPHERE_VOLUME_MULTIPLIER = 2 ** 3;
export const ATTENTION_VOLUME_FLOOR_Y = -0.6;
export const ATTENTION_VOLUME_HEIGHT = 1_080;
export const MAX_ATTENTION_POINT_COUNT = 4_096;

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

function getAttentionPointUnit(id: number, salt: number) {
  let state = (Math.imul(id + 1, 0x45d9f3b) ^ salt) >>> 0;
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return state / 0xffffffff;
}

export function getAttentionPointPlacementUnit(id: number) {
  return getAttentionPointUnit(id, 0x73a4f2d1);
}

export function getAttentionPointSpacing(width: number, height: number) {
  return Math.max(
    MIN_ATTENTION_SPHERE_DIAMETER,
    Math.min(
      MAX_ATTENTION_SPHERE_DIAMETER,
      Math.round(Math.min(width, height) / ATTENTION_SPHERE_DIAMETER_DIVISOR) * 2,
    ),
  );
}

export function getAttentionPointRadius(
  id: number,
  width: number,
  height: number,
) {
  const baseDiameter = getAttentionPointSpacing(width, height);
  const volumeMultiplier =
    MIN_ATTENTION_SPHERE_VOLUME_MULTIPLIER +
    getAttentionPointUnit(id, 0x5f356495) *
      (MAX_ATTENTION_SPHERE_VOLUME_MULTIPLIER -
        MIN_ATTENTION_SPHERE_VOLUME_MULTIPLIER);
  return (baseDiameter * Math.cbrt(volumeMultiplier)) / 2;
}

export function getAnchoredAttentionPoints(
  anchors: readonly SpatialAnchor[],
  width: number,
  height: number,
) {
  return anchors.map((anchor): AttentionPoint => {
    const radius = getAttentionPointRadius(anchor.id, width, height);
    const availableHeight = Math.max(0, ATTENTION_VOLUME_HEIGHT - radius * 2);
    return {
      id: anchor.id,
      x: anchor.xRatio * width,
      y: anchor.zRatio * height,
      height: ATTENTION_VOLUME_FLOOR_Y + radius + anchor.yRatio * availableHeight,
      radius,
    };
  });
}

export function createCursorField(
  count: number,
  width: number,
  height: number,
  settings: CursorFieldSettings,
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

    return {
      id: index,
      x: centerX - spreadX / 2 + gapX * (column + 1),
      y: centerY - spreadY / 2 + gapY * (row + 1),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    };
  });
}

function perimeterPoint(point: AttentionPoint, angle: number, padding: number) {
  const distance = point.radius + padding;
  return {
    x: point.x + Math.cos(angle) * distance,
    y: point.y + Math.sin(angle) * distance,
  };
}

function getPerimeterTarget(
  point: AttentionPoint,
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
    const perimeter = Math.PI * 2 * (point.radius + padding);
    const capacity = Math.max(8, Math.floor(perimeter / collisionDistance));

    if (remainingRank < capacity) {
      const direction = targetIndex % 2 === 0 ? 1 : -1;
      const phase =
        (remainingRank / capacity) * Math.PI * 2 +
        elapsedSeconds * 0.22 * direction;
      return perimeterPoint(point, phase, padding);
    }

    remainingRank -= capacity;
    band += 1;
    padding += collisionDistance * (0.82 + (band % 2) * 0.08);
  }
}

function isInsideProtectedPoint(
  x: number,
  y: number,
  point: AttentionPoint,
  settings: CursorFieldSettings,
) {
  return Math.hypot(x - point.x, y - point.y) < point.radius + settings.clearance;
}

function keepOutsideAttentionPoints(
  x: number,
  y: number,
  vx: number,
  vy: number,
  points: readonly AttentionPoint[],
  settings: CursorFieldSettings,
) {
  let nextX = x;
  let nextY = y;
  let nextVx = vx;
  let nextVy = vy;

  for (const point of points) {
    if (!isInsideProtectedPoint(nextX, nextY, point, settings)) continue;
    let dx = nextX - point.x;
    let dy = nextY - point.y;
    let distance = Math.hypot(dx, dy);
    if (distance < 0.0001) {
      dx = 1;
      dy = 0;
      distance = 1;
    }
    const directionX = dx / distance;
    const directionY = dy / distance;
    const boundaryDistance = point.radius + settings.clearance;
    nextX = point.x + directionX * boundaryDistance;
    nextY = point.y + directionY * boundaryDistance;
    const inwardVelocity = nextVx * directionX + nextVy * directionY;
    if (inwardVelocity < 0) {
      nextVx -= directionX * inwardVelocity * 1.62;
      nextVy -= directionY * inwardVelocity * 1.62;
    }
  }

  return { x: nextX, y: nextY, vx: nextVx, vy: nextVy };
}

export function evacuateAttentionPoints(
  cursors: CursorAgent[],
  points: readonly AttentionPoint[],
  settings: CursorFieldSettings,
) {
  return cursors.map((cursor) => {
    const constrained = keepOutsideAttentionPoints(
      cursor.x,
      cursor.y,
      cursor.vx,
      cursor.vy,
      points,
      settings,
    );

    return { ...cursor, ...constrained };
  });
}

function resolveCursorCollisions(
  cursors: CursorAgent[],
  width: number,
  height: number,
  attentionPoints: readonly AttentionPoint[],
  settings: CursorFieldSettings,
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

            const impulse = overlap * 9;
            cursor.vx -= directionX * impulse;
            cursor.vy -= directionY * impulse;
            other.vx += directionX * impulse;
            other.vy += directionY * impulse;
          }
        }
      }
    }

    resolved = resolved.map((cursor) => {
      const constrained = keepOutsideAttentionPoints(
        Math.min(width, Math.max(0, cursor.x)),
        Math.min(height, Math.max(0, cursor.y)),
        cursor.vx,
        cursor.vy,
        attentionPoints,
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
  attentionPoints: readonly AttentionPoint[],
  settings: CursorFieldSettings,
  preventCursorCollisions = true,
  attentionZoneBehavior: AttentionZoneBehavior = "protected-perimeter",
) {
  const constrainedCursors =
    attentionZoneBehavior === "protected-perimeter"
      ? evacuateAttentionPoints(cursors, attentionPoints, settings)
      : cursors;

  if (!preventCursorCollisions) {
    return constrainedCursors;
  }

  return resolveCursorCollisions(
    constrainedCursors,
    width,
    height,
    attentionZoneBehavior === "protected-perimeter"
      ? attentionPoints
      : [],
    settings,
  );
}

export function stepCursorField(
  cursors: CursorAgent[],
  width: number,
  height: number,
  deltaSeconds: number,
  elapsedSeconds: number,
  attentionPoints: readonly AttentionPoint[],
  settings: CursorFieldSettings,
  preventCursorCollisions = true,
  agentScale = 1,
  attentionZoneBehavior: AttentionZoneBehavior = "protected-perimeter",
) {
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

    const attentionPoint =
      attentionPoints.length > 0
        ? attentionPoints[cursor.id % attentionPoints.length]
        : null;

    if (attentionPoint) {
      const targetRank = Math.floor(cursor.id / attentionPoints.length);
      const targetIndex = cursor.id % attentionPoints.length;
      const orbitPoint = getPerimeterTarget(
        attentionPoint,
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

    const nextX = Math.min(
      width,
      Math.max(0, cursor.x + vx * deltaSeconds),
    );
    const nextY = Math.min(
      height,
      Math.max(0, cursor.y + vy * deltaSeconds),
    );

    if (attentionZoneBehavior === "open-perimeter") {
      return { ...cursor, x: nextX, y: nextY, vx, vy };
    }

    const constrained = keepOutsideAttentionPoints(
      nextX,
      nextY,
      vx,
      vy,
      attentionPoints,
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
    attentionZoneBehavior === "protected-perimeter"
      ? attentionPoints
      : [],
    settings,
  );
}

export type Point = {
  x: number;
  y: number;
};

export type Boid = Point & {
  id: number;
  vx: number;
  vy: number;
};

export type RuleWeights = {
  separation: number;
  alignment: number;
  cohesion: number;
};

export type BoundaryCorrection = {
  point: Point;
  inwardNormal: Point;
};

export type PositionConstraint = (
  point: Point,
) => BoundaryCorrection | null;

const PERCEPTION_RADIUS = 72;
const SEPARATION_RADIUS = 24;
const MAX_SPEED = 86;
const MIN_SPEED = 30;
const EDGE_MARGIN = 56;

function seededUnit(index: number, salt: number) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function limitVector(x: number, y: number, maximum: number): Point {
  const magnitude = Math.hypot(x, y);

  if (magnitude <= maximum || magnitude === 0) {
    return { x, y };
  }

  const scale = maximum / magnitude;
  return { x: x * scale, y: y * scale };
}

export function createFlock(count: number, width: number, height: number): Boid[] {
  const centerX = width / 2;
  const centerY = height / 2;
  const spreadX = Math.min(width * 0.32, 300);
  const spreadY = Math.min(height * 0.3, 210);

  return Array.from({ length: count }, (_, index) => {
    const angle = seededUnit(index, 3) * Math.PI * 2;
    const speed = 34 + seededUnit(index, 4) * 26;

    return {
      id: index,
      x: centerX + (seededUnit(index, 1) - 0.5) * spreadX,
      y: centerY + (seededUnit(index, 2) - 0.5) * spreadY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    };
  });
}

export function stepFlock(
  flock: Boid[],
  width: number,
  height: number,
  deltaSeconds: number,
  weights: RuleWeights,
  attentionTargets: Point[],
  constrainPosition?: PositionConstraint,
): Boid[] {
  const perceptionSquared = PERCEPTION_RADIUS * PERCEPTION_RADIUS;
  const separationSquared = SEPARATION_RADIUS * SEPARATION_RADIUS;
  const columnCount = Math.ceil(width / PERCEPTION_RADIUS) + 1;
  const spatialGrid = new Map<number, Boid[]>();

  for (const boid of flock) {
    const column = Math.floor(boid.x / PERCEPTION_RADIUS);
    const row = Math.floor(boid.y / PERCEPTION_RADIUS);
    const key = row * columnCount + column;
    const cell = spatialGrid.get(key);

    if (cell) {
      cell.push(boid);
    } else {
      spatialGrid.set(key, [boid]);
    }
  }

  return flock.map((boid) => {
    let neighborCount = 0;
    let alignmentX = 0;
    let alignmentY = 0;
    let centerX = 0;
    let centerY = 0;
    let separationX = 0;
    let separationY = 0;

    const boidColumn = Math.floor(boid.x / PERCEPTION_RADIUS);
    const boidRow = Math.floor(boid.y / PERCEPTION_RADIUS);

    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
        const key =
          (boidRow + rowOffset) * columnCount + boidColumn + columnOffset;
        const nearbyBoids = spatialGrid.get(key);
        if (!nearbyBoids) continue;

        for (const other of nearbyBoids) {
          if (other.id === boid.id) continue;

          const dx = other.x - boid.x;
          const dy = other.y - boid.y;
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

    let accelerationX = separationX * weights.separation * 560;
    let accelerationY = separationY * weights.separation * 560;

    if (neighborCount > 0) {
      const inverseCount = 1 / neighborCount;
      accelerationX +=
        (alignmentX * inverseCount - boid.vx) * weights.alignment * 0.72;
      accelerationY +=
        (alignmentY * inverseCount - boid.vy) * weights.alignment * 0.72;
      accelerationX +=
        (centerX * inverseCount - boid.x) * weights.cohesion * 0.44;
      accelerationY +=
        (centerY * inverseCount - boid.y) * weights.cohesion * 0.44;
    }

    const attentionTarget =
      attentionTargets.length > 0
        ? attentionTargets[boid.id % attentionTargets.length]
        : null;

    if (attentionTarget) {
      const dx = attentionTarget.x - boid.x;
      const dy = attentionTarget.y - boid.y;
      const distance = Math.hypot(dx, dy);

      if (distance > 22) {
        const arrival = Math.min(1, distance / 150);
        const desiredVx = (dx / distance) * MAX_SPEED * arrival;
        const desiredVy = (dy / distance) * MAX_SPEED * arrival;
        accelerationX += (desiredVx - boid.vx) * 0.72;
        accelerationY += (desiredVy - boid.vy) * 0.72;
      }
    }

    if (boid.x < EDGE_MARGIN) accelerationX += (EDGE_MARGIN - boid.x) * 1.8;
    if (boid.x > width - EDGE_MARGIN) {
      accelerationX -= (boid.x - (width - EDGE_MARGIN)) * 1.8;
    }
    if (boid.y < EDGE_MARGIN) accelerationY += (EDGE_MARGIN - boid.y) * 1.8;
    if (boid.y > height - EDGE_MARGIN) {
      accelerationY -= (boid.y - (height - EDGE_MARGIN)) * 1.8;
    }

    const acceleration = limitVector(accelerationX, accelerationY, 72);
    let vx = boid.vx + acceleration.x * deltaSeconds;
    let vy = boid.vy + acceleration.y * deltaSeconds;
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

    let x = Math.min(width, Math.max(0, boid.x + vx * deltaSeconds));
    let y = Math.min(height, Math.max(0, boid.y + vy * deltaSeconds));
    const correction = constrainPosition?.({ x, y });

    if (correction) {
      x = correction.point.x;
      y = correction.point.y;
      const outwardVelocity =
        vx * correction.inwardNormal.x + vy * correction.inwardNormal.y;

      if (outwardVelocity < 0) {
        vx -= outwardVelocity * correction.inwardNormal.x * 1.7;
        vy -= outwardVelocity * correction.inwardNormal.y * 1.7;
      }
    }

    return {
      ...boid,
      x,
      y,
      vx,
      vy,
    };
  });
}

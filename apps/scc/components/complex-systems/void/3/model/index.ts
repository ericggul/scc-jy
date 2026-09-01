export type CouzinParameters = Readonly<{
  attractionRadius: number;
  noise: number;
  orientationRadius: number;
  perceptionAngle: number;
  repulsionRadius: number;
  speed: number;
  turnRate: number;
}>;

export type CouzinParameterInput = Partial<CouzinParameters>;

export type CouzinSnapshot = Readonly<{
  directionsX: Float32Array;
  directionsY: Float32Array;
  headings: Float32Array;
  randomState: number;
  tick: number;
  x: Float32Array;
  y: Float32Array;
}>;

export type TorusMetrics = Readonly<{
  coreFraction: number;
  meanAngularMomentum: number;
  meanRadius: number;
}>;

export const REPULSION = 1;
export const ORIENTATION = 2;
export const ATTRACTION = 3;

export const DEFAULT_AGENT_COUNT = 480;
export const MAX_AGENT_COUNT = 720;

// This calibrated 2D regime keeps the orientation zone deliberately narrow
// between a larger exclusion core and long attraction zone: the same ordering
// Couzin et al. identify with their toroidal regime.
export const DEFAULT_REPULSION_RADIUS = 0.04;
export const DEFAULT_ORIENTATION_RADIUS = 0.045;
export const DEFAULT_ATTRACTION_RADIUS = 0.3;
export const DEFAULT_PERCEPTION_ANGLE = Math.PI * 1.8;
export const DEFAULT_TURN_RATE = 14;
export const DEFAULT_SPEED = 0.02;
export const DEFAULT_NOISE = 0.005;

const TAU = Math.PI * 2;
const EPSILON = 1e-9;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizedHeading(value: number) {
  const heading = value % TAU;
  return heading < 0 ? heading + TAU : heading;
}

function normalizedSeed(seed: number) {
  const normalized = Math.floor(seed) >>> 0;
  return normalized === 0 ? 0x9e3779b9 : normalized;
}

function nextRandom(randomState: number) {
  const state = (randomState + 0x6d2b79f5) >>> 0;
  let mixed = state;
  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);

  return {
    state,
    value: ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296,
  };
}

/**
 * Couzin et al. use radii as cumulative zone limits. The 2D adaptation keeps
 * that convention: r_r < r_o < r_a. All public construction passes here so
 * a browser-side parameter change cannot create an invalid zone ordering.
 */
export function createCouzinParameters(
  input: CouzinParameterInput = {},
): CouzinParameters {
  const repulsionRadius = clamp(
    Number.isFinite(input.repulsionRadius)
      ? input.repulsionRadius!
      : DEFAULT_REPULSION_RADIUS,
    0.006,
    0.04,
  );
  const orientationRadius = clamp(
    Number.isFinite(input.orientationRadius)
      ? input.orientationRadius!
      : DEFAULT_ORIENTATION_RADIUS,
    repulsionRadius + 0.002,
    0.12,
  );
  const attractionRadius = clamp(
    Number.isFinite(input.attractionRadius)
      ? input.attractionRadius!
      : DEFAULT_ATTRACTION_RADIUS,
    orientationRadius + 0.002,
    0.3,
  );

  return {
    attractionRadius,
    noise: clamp(
      Number.isFinite(input.noise) ? input.noise! : DEFAULT_NOISE,
      0,
      0.3,
    ),
    orientationRadius,
    perceptionAngle: clamp(
      Number.isFinite(input.perceptionAngle)
        ? input.perceptionAngle!
        : DEFAULT_PERCEPTION_ANGLE,
      Math.PI,
      TAU,
    ),
    repulsionRadius,
    speed: clamp(
      Number.isFinite(input.speed) ? input.speed! : DEFAULT_SPEED,
      0.01,
      0.24,
    ),
    turnRate: clamp(
      Number.isFinite(input.turnRate) ? input.turnRate! : DEFAULT_TURN_RATE,
      0.2,
      14,
    ),
  };
}

type AgentInspection = {
  count: number;
  kinds: Uint8Array;
  sourceIndex: number;
  targetIndices: Uint16Array;
};

/**
 * A bounded 2D adaptation of Couzin's zonal interaction model.
 *
 * Positions are re-centred after each synchronous update. That is a common
 * translation applied to every agent, so it preserves all relative positions,
 * directions, and forces; it is a numerical coordinate choice, not a central
 * force or an invisible boundary. The field is otherwise unbounded.
 */
export class CouzinTorusSimulation {
  readonly count: number;
  readonly directionX: Float32Array;
  readonly directionY: Float32Array;
  readonly headings: Float32Array;
  readonly x: Float32Array;
  readonly y: Float32Array;

  private readonly nextDirectionX: Float32Array;
  private readonly nextDirectionY: Float32Array;
  private readonly nextHeadings: Float32Array;
  private readonly nextInCell: Int32Array;
  private readonly nextX: Float32Array;
  private readonly nextY: Float32Array;
  private readonly inspection: AgentInspection;
  private cellColumns = 0;
  private cellHeads = new Int32Array(0);
  private cellRows = 0;
  private cellSize = 1;
  private gridCurrent = false;
  private gridOriginX = 0;
  private gridOriginY = 0;
  private parameters: CouzinParameters;
  private randomState: number;
  private tick = 0;

  constructor({
    count = DEFAULT_AGENT_COUNT,
    parameters = createCouzinParameters(),
    seed = 0x30a64ec9,
  }: {
    count?: number;
    parameters?: CouzinParameters;
    seed?: number;
  } = {}) {
    this.count = clamp(Math.floor(count), 1, MAX_AGENT_COUNT);
    this.parameters = parameters;
    this.directionX = new Float32Array(this.count);
    this.directionY = new Float32Array(this.count);
    this.headings = new Float32Array(this.count);
    this.x = new Float32Array(this.count);
    this.y = new Float32Array(this.count);
    this.nextDirectionX = new Float32Array(this.count);
    this.nextDirectionY = new Float32Array(this.count);
    this.nextHeadings = new Float32Array(this.count);
    this.nextInCell = new Int32Array(this.count);
    this.nextX = new Float32Array(this.count);
    this.nextY = new Float32Array(this.count);
    this.inspection = {
      count: 0,
      kinds: new Uint8Array(this.count),
      sourceIndex: -1,
      targetIndices: new Uint16Array(this.count),
    };
    this.randomState = normalizedSeed(seed);

    // The first frame is a compact, unstructured aggregate, not a pre-drawn
    // ring. Any empty core and circulation must arise under the local rules.
    const initialRadius = 0.16;
    for (let index = 0; index < this.count; index += 1) {
      const radialSample = nextRandom(this.randomState);
      const angleSample = nextRandom(radialSample.state);
      const headingSample = nextRandom(angleSample.state);
      this.randomState = headingSample.state;
      const radius = initialRadius * Math.sqrt(radialSample.value);
      const angle = angleSample.value * TAU;
      const heading = headingSample.value * TAU;
      this.x[index] = Math.cos(angle) * radius;
      this.y[index] = Math.sin(angle) * radius;
      this.headings[index] = heading;
      this.directionX[index] = Math.cos(heading);
      this.directionY[index] = Math.sin(heading);
    }
  }

  step(deltaSeconds: number, parameters = this.parameters) {
    const delta = clamp(deltaSeconds, 0, 0.066);
    if (delta === 0) return;

    this.parameters = parameters;
    this.prepareSpatialHash(parameters.attractionRadius);
    const repulsionSquared = parameters.repulsionRadius ** 2;
    const orientationSquared = parameters.orientationRadius ** 2;
    const attractionSquared = parameters.attractionRadius ** 2;
    const perceptionThreshold = Math.cos(parameters.perceptionAngle / 2);
    const maxTurn = parameters.turnRate * delta;
    let centroidX = 0;
    let centroidY = 0;

    for (let index = 0; index < this.count; index += 1) {
      const x = this.x[index]!;
      const y = this.y[index]!;
      const headingX = this.directionX[index]!;
      const headingY = this.directionY[index]!;
      const column = this.cellColumn(x);
      const row = this.cellRow(y);
      let repulsionX = 0;
      let repulsionY = 0;
      let orientationX = 0;
      let orientationY = 0;
      let attractionX = 0;
      let attractionY = 0;
      let hasRepulsion = false;
      let hasOrientation = false;
      let hasAttraction = false;

      for (
        let neighbourColumn = Math.max(0, column - 1);
        neighbourColumn <= Math.min(this.cellColumns - 1, column + 1);
        neighbourColumn += 1
      ) {
        for (
          let neighbourRow = Math.max(0, row - 1);
          neighbourRow <= Math.min(this.cellRows - 1, row + 1);
          neighbourRow += 1
        ) {
          let other = this.cellHeads[
            neighbourRow * this.cellColumns + neighbourColumn
          ]!;

          while (other !== -1) {
            if (other !== index) {
              const deltaX = this.x[other]! - x;
              const deltaY = this.y[other]! - y;
              const distanceSquared = deltaX * deltaX + deltaY * deltaY;

              if (
                distanceSquared > EPSILON &&
                distanceSquared <= attractionSquared
              ) {
                const distance = Math.sqrt(distanceSquared);
                const unitX = deltaX / distance;
                const unitY = deltaY / distance;

                if (headingX * unitX + headingY * unitY >= perceptionThreshold) {
                  if (distanceSquared <= repulsionSquared) {
                    repulsionX -= unitX;
                    repulsionY -= unitY;
                    hasRepulsion = true;
                  } else if (distanceSquared <= orientationSquared) {
                    orientationX += this.directionX[other]!;
                    orientationY += this.directionY[other]!;
                    hasOrientation = true;
                  } else {
                    attractionX += unitX;
                    attractionY += unitY;
                    hasAttraction = true;
                  }
                }
              }
            }
            other = this.nextInCell[other]!;
          }
        }
      }

      let desiredX = headingX;
      let desiredY = headingY;
      if (hasRepulsion) {
        const length = Math.hypot(repulsionX, repulsionY);
        if (length > EPSILON) {
          desiredX = repulsionX / length;
          desiredY = repulsionY / length;
        }
      } else if (hasOrientation || hasAttraction) {
        if (hasOrientation) {
          const length = Math.hypot(orientationX, orientationY);
          if (length > EPSILON) {
            orientationX /= length;
            orientationY /= length;
          } else {
            orientationX = 0;
            orientationY = 0;
          }
        }
        if (hasAttraction) {
          const length = Math.hypot(attractionX, attractionY);
          if (length > EPSILON) {
            attractionX /= length;
            attractionY /= length;
          } else {
            attractionX = 0;
            attractionY = 0;
          }
        }
        const combinedX = orientationX + attractionX;
        const combinedY = orientationY + attractionY;
        const length = Math.hypot(combinedX, combinedY);
        if (length > EPSILON) {
          desiredX = combinedX / length;
          desiredY = combinedY / length;
        }
      }

      const random = nextRandom(this.randomState);
      this.randomState = random.state;
      const desiredHeading = Math.atan2(desiredY, desiredX) +
        (random.value - 0.5) * parameters.noise;
      const currentHeading = this.headings[index]!;
      const deltaHeading = Math.atan2(
        Math.sin(desiredHeading - currentHeading),
        Math.cos(desiredHeading - currentHeading),
      );
      const nextHeading = normalizedHeading(
        currentHeading + clamp(deltaHeading, -maxTurn, maxTurn),
      );
      const nextDirectionX = Math.cos(nextHeading);
      const nextDirectionY = Math.sin(nextHeading);
      const nextX = x + nextDirectionX * parameters.speed * delta;
      const nextY = y + nextDirectionY * parameters.speed * delta;

      this.nextHeadings[index] = nextHeading;
      this.nextDirectionX[index] = nextDirectionX;
      this.nextDirectionY[index] = nextDirectionY;
      this.nextX[index] = nextX;
      this.nextY[index] = nextY;
      centroidX += nextX;
      centroidY += nextY;
    }

    centroidX /= this.count;
    centroidY /= this.count;
    for (let index = 0; index < this.count; index += 1) {
      this.x[index] = this.nextX[index]! - centroidX;
      this.y[index] = this.nextY[index]! - centroidY;
      this.headings[index] = this.nextHeadings[index]!;
      this.directionX[index] = this.nextDirectionX[index]!;
      this.directionY[index] = this.nextDirectionY[index]!;
    }

    this.tick += 1;
    this.gridCurrent = false;
  }

  /**
   * Returns only the relations that determined the selected agent's next
   * desired direction: repulsion replaces orientation and attraction whenever
   * it is present, exactly as it does in the step function.
   */
  inspectAgent(index: number) {
    this.inspection.count = 0;
    this.inspection.sourceIndex = -1;
    if (!Number.isInteger(index) || index < 0 || index >= this.count) {
      return this.inspection;
    }

    if (!this.gridCurrent) this.prepareSpatialHash(this.parameters.attractionRadius);
    const { attractionRadius, orientationRadius, perceptionAngle, repulsionRadius } =
      this.parameters;
    const repulsionSquared = repulsionRadius ** 2;
    const orientationSquared = orientationRadius ** 2;
    const attractionSquared = attractionRadius ** 2;
    const perceptionThreshold = Math.cos(perceptionAngle / 2);
    const x = this.x[index]!;
    const y = this.y[index]!;
    const headingX = this.directionX[index]!;
    const headingY = this.directionY[index]!;
    const column = this.cellColumn(x);
    const row = this.cellRow(y);
    let hasRepulsion = false;
    let count = 0;

    for (
      let neighbourColumn = Math.max(0, column - 1);
      neighbourColumn <= Math.min(this.cellColumns - 1, column + 1);
      neighbourColumn += 1
    ) {
      for (
        let neighbourRow = Math.max(0, row - 1);
        neighbourRow <= Math.min(this.cellRows - 1, row + 1);
        neighbourRow += 1
      ) {
        let other = this.cellHeads[
          neighbourRow * this.cellColumns + neighbourColumn
        ]!;

        while (other !== -1) {
          if (other !== index) {
            const deltaX = this.x[other]! - x;
            const deltaY = this.y[other]! - y;
            const distanceSquared = deltaX * deltaX + deltaY * deltaY;
            if (
              distanceSquared > EPSILON &&
              distanceSquared <= attractionSquared
            ) {
              const distance = Math.sqrt(distanceSquared);
              const unitX = deltaX / distance;
              const unitY = deltaY / distance;
              if (headingX * unitX + headingY * unitY >= perceptionThreshold) {
                let kind = 0;
                if (distanceSquared <= repulsionSquared) kind = REPULSION;
                else if (distanceSquared <= orientationSquared) kind = ORIENTATION;
                else kind = ATTRACTION;

                if (kind === REPULSION && !hasRepulsion) {
                  hasRepulsion = true;
                  count = 0;
                }
                if (!hasRepulsion || kind === REPULSION) {
                  this.inspection.targetIndices[count] = other;
                  this.inspection.kinds[count] = kind;
                  count += 1;
                }
              }
            }
          }
          other = this.nextInCell[other]!;
        }
      }
    }

    this.inspection.count = count;
    this.inspection.sourceIndex = index;
    return this.inspection;
  }

  torusMetrics(coreRadius = this.parameters.orientationRadius) {
    let coreCount = 0;
    let angularMomentum = 0;
    let radiusTotal = 0;
    for (let index = 0; index < this.count; index += 1) {
      const x = this.x[index]!;
      const y = this.y[index]!;
      const radius = Math.hypot(x, y);
      radiusTotal += radius;
      if (radius < coreRadius) coreCount += 1;
      if (radius > EPSILON) {
        angularMomentum +=
          (x * this.directionY[index]! - y * this.directionX[index]!) / radius;
      }
    }
    return {
      coreFraction: coreCount / this.count,
      meanAngularMomentum: angularMomentum / this.count,
      meanRadius: radiusTotal / this.count,
    } satisfies TorusMetrics;
  }

  snapshot(): CouzinSnapshot {
    return {
      directionsX: this.directionX.slice(),
      directionsY: this.directionY.slice(),
      headings: this.headings.slice(),
      randomState: this.randomState,
      tick: this.tick,
      x: this.x.slice(),
      y: this.y.slice(),
    };
  }

  private cellColumn(x: number) {
    return clamp(
      Math.floor((x - this.gridOriginX) / this.cellSize),
      0,
      this.cellColumns - 1,
    );
  }

  private cellRow(y: number) {
    return clamp(
      Math.floor((y - this.gridOriginY) / this.cellSize),
      0,
      this.cellRows - 1,
    );
  }

  private prepareSpatialHash(radius: number) {
    let minimumX = Number.POSITIVE_INFINITY;
    let maximumX = Number.NEGATIVE_INFINITY;
    let minimumY = Number.POSITIVE_INFINITY;
    let maximumY = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < this.count; index += 1) {
      const x = this.x[index]!;
      const y = this.y[index]!;
      if (x < minimumX) minimumX = x;
      if (x > maximumX) maximumX = x;
      if (y < minimumY) minimumY = y;
      if (y > maximumY) maximumY = y;
    }

    this.cellSize = radius;
    this.gridOriginX = minimumX - radius;
    this.gridOriginY = minimumY - radius;
    this.cellColumns = Math.max(
      1,
      Math.ceil((maximumX - minimumX) / radius) + 2,
    );
    this.cellRows = Math.max(
      1,
      Math.ceil((maximumY - minimumY) / radius) + 2,
    );
    const cellCount = this.cellColumns * this.cellRows;
    if (this.cellHeads.length < cellCount) {
      this.cellHeads = new Int32Array(cellCount);
    }
    this.cellHeads.fill(-1, 0, cellCount);

    for (let index = 0; index < this.count; index += 1) {
      const cell =
        this.cellRow(this.y[index]!) * this.cellColumns +
        this.cellColumn(this.x[index]!);
      this.nextInCell[index] = this.cellHeads[cell]!;
      this.cellHeads[cell] = index;
    }
    this.gridCurrent = true;
  }
}

export function createCouzinTorusSimulation(options?: {
  count?: number;
  parameters?: CouzinParameters;
  seed?: number;
}) {
  return new CouzinTorusSimulation(options);
}

export type Point = Readonly<{
  x: number;
  y: number;
}>;

export type VicsekDomain = Readonly<{
  width: number;
  height: number;
}>;

export type VicsekParameters = Readonly<{
  interactionRadius: number;
  noise: number;
  attractionGain: number;
  speed: number;
}>;

export type InfluenceGraph = {
  sources: Uint16Array;
  targets: Uint16Array;
  weights: Float32Array;
  count: number;
  meanWeight: number;
};

export type VicsekSnapshot = Readonly<{
  attractivity: Float32Array;
  headings: Float32Array;
  randomState: number;
  tick: number;
  x: Float32Array;
  y: Float32Array;
}>;

export const MIN_AGENT_COUNT = 720;
export const MAX_AGENT_COUNT = 2_400;
export const DEFAULT_INTERACTION_RADIUS = 0.037;
export const DEFAULT_NOISE = 0.42;
export const DEFAULT_ATTRACTION_GAIN = 1;
export const MIN_INTERACTION_RADIUS = 0.024;
export const MAX_INTERACTION_RADIUS = 0.06;
export const MIN_NOISE = 0;
export const MAX_NOISE = Math.PI;
export const MIN_ATTRACTION_GAIN = 0.25;
export const MAX_ATTRACTION_GAIN = 2.4;

const TAU = Math.PI * 2;
const SELF_WEIGHT = 1;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function wrap(value: number, span: number) {
  const remainder = value % span;
  return remainder < 0 ? remainder + span : remainder;
}

function wrappedDelta(delta: number, span: number) {
  if (delta > span / 2) return delta - span;
  if (delta < -span / 2) return delta + span;
  return delta;
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

function positiveModulo(value: number, divisor: number) {
  const remainder = value % divisor;
  return remainder < 0 ? remainder + divisor : remainder;
}

export function createVicsekDomain(
  viewportWidth: number,
  viewportHeight: number,
): VicsekDomain {
  const minimumSide = Math.max(1, Math.min(viewportWidth, viewportHeight));

  return {
    width: Math.max(1, viewportWidth / minimumSide),
    height: Math.max(1, viewportHeight / minimumSide),
  };
}

export function agentCountForViewport(
  viewportWidth: number,
  viewportHeight: number,
) {
  return clamp(
    Math.round(((viewportWidth * viewportHeight) / 1_000 + 240) * 1.5),
    MIN_AGENT_COUNT,
    MAX_AGENT_COUNT,
  );
}

export function normalizeInteractionRadius(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_INTERACTION_RADIUS;
  return clamp(value, MIN_INTERACTION_RADIUS, MAX_INTERACTION_RADIUS);
}

export function normalizeNoise(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_NOISE;
  return clamp(value, MIN_NOISE, MAX_NOISE);
}

export function normalizeAttractionGain(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_ATTRACTION_GAIN;
  return clamp(value, MIN_ATTRACTION_GAIN, MAX_ATTRACTION_GAIN);
}

export function createVicsekParameters(
  interactionRadius = DEFAULT_INTERACTION_RADIUS,
  noise = DEFAULT_NOISE,
  attractionGain = DEFAULT_ATTRACTION_GAIN,
): VicsekParameters {
  const radius = normalizeInteractionRadius(interactionRadius);

  return {
    interactionRadius: radius,
    noise: normalizeNoise(noise),
    attractionGain: normalizeAttractionGain(attractionGain),
    // Vicsek et al. use v = 0.03 for an interaction radius of one.
    speed: radius * 0.03,
  };
}

export function minimumImageDisplacement(
  source: Point,
  target: Point,
  domain: VicsekDomain,
): Point {
  return {
    x: wrappedDelta(target.x - source.x, domain.width),
    y: wrappedDelta(target.y - source.y, domain.height),
  };
}

/**
 * The extension to metric Vicsek alignment. Proximity and each participant's
 * current local coherence jointly determine the reciprocal pair's influence.
 * It is deliberately returned to the model, rather than invented by canvas.
 */
export function calculateAttractivityWeight(
  distance: number,
  radius: number,
  firstAttractivity: number,
  secondAttractivity: number,
  attractionGain: number,
) {
  return calculateWeight(
    distance,
    radius,
    clamp(firstAttractivity, 0, 1),
    clamp(secondAttractivity, 0, 1),
    normalizeAttractionGain(attractionGain),
  );
}

function calculateWeight(
  distance: number,
  radius: number,
  firstAttractivity: number,
  secondAttractivity: number,
  normalizedAttractionGain: number,
) {
  const normalizedDistance = clamp(distance / radius, 0, 1);
  const proximity = 1 - normalizedDistance;
  const reciprocalAttractivity = Math.sqrt(firstAttractivity * secondAttractivity);

  return (
    (0.14 + 0.86 * proximity * proximity) *
    (0.12 + 0.88 * reciprocalAttractivity) *
    normalizedAttractionGain
  );
}

function createInfluenceGraph(capacity: number): InfluenceGraph {
  return {
    sources: new Uint16Array(Math.max(64, capacity)),
    targets: new Uint16Array(Math.max(64, capacity)),
    weights: new Float32Array(Math.max(64, capacity)),
    count: 0,
    meanWeight: 0,
  };
}

/**
 * A high-density, periodic, weighted Vicsek field. Arrays and the spatial
 * grid are retained between ticks so a step has no per-agent object churn.
 */
export class AttractiveVicsekSimulation {
  readonly count: number;
  readonly domain: VicsekDomain;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly headings: Float32Array;
  readonly directionX: Float32Array;
  readonly directionY: Float32Array;
  readonly attractivity: Float32Array;
  readonly graph: InfluenceGraph;

  private readonly nextX: Float32Array;
  private readonly nextY: Float32Array;
  private readonly nextHeadings: Float32Array;
  private readonly nextAttractivity: Float32Array;
  private readonly headingX: Float32Array;
  private readonly headingY: Float32Array;
  private readonly headingWeight: Float32Array;
  private readonly nextInCell: Int32Array;
  private cellHeads = new Int32Array(0);
  private cellColumns = 0;
  private cellRows = 0;
  private cellWidth = 1;
  private cellHeight = 1;
  private graphRadius = Number.NaN;
  private graphAttractionGain = Number.NaN;
  private randomState: number;
  private tick = 0;

  constructor({
    count = MIN_AGENT_COUNT,
    domain,
    seed = 0x6a09e667,
  }: {
    count?: number;
    domain: VicsekDomain;
    seed?: number;
  }) {
    this.count = clamp(Math.floor(count), 1, MAX_AGENT_COUNT);
    this.domain = domain;
    this.x = new Float32Array(this.count);
    this.y = new Float32Array(this.count);
    this.headings = new Float32Array(this.count);
    this.directionX = new Float32Array(this.count);
    this.directionY = new Float32Array(this.count);
    this.attractivity = new Float32Array(this.count);
    this.nextX = new Float32Array(this.count);
    this.nextY = new Float32Array(this.count);
    this.nextHeadings = new Float32Array(this.count);
    this.nextAttractivity = new Float32Array(this.count);
    this.headingX = new Float32Array(this.count);
    this.headingY = new Float32Array(this.count);
    this.headingWeight = new Float32Array(this.count);
    this.nextInCell = new Int32Array(this.count);
    this.graph = createInfluenceGraph(this.count * 5);
    this.randomState = normalizedSeed(seed);

    for (let index = 0; index < this.count; index += 1) {
      const xSample = nextRandom(this.randomState);
      const ySample = nextRandom(xSample.state);
      const headingSample = nextRandom(ySample.state);
      const attractivitySample = nextRandom(headingSample.state);
      this.randomState = attractivitySample.state;
      this.x[index] = xSample.value * domain.width;
      this.y[index] = ySample.value * domain.height;
      this.headings[index] = headingSample.value * TAU;
      this.directionX[index] = Math.cos(this.headings[index]!);
      this.directionY[index] = Math.sin(this.headings[index]!);
      // It settles into observed local coherence after the first few steps.
      this.attractivity[index] = 0.18 + attractivitySample.value * 0.64;
    }
  }

  rebuildGraph(parameters: VicsekParameters) {
    const normalized = createVicsekParameters(
      parameters.interactionRadius,
      parameters.noise,
      parameters.attractionGain,
    );
    const radius = normalized.interactionRadius;
    this.prepareSpatialHash(radius);

    this.graph.count = 0;
    let weightTotal = 0;
    const radiusSquared = radius * radius;

    for (let source = 0; source < this.count; source += 1) {
      const sourceColumn = Math.min(
        this.cellColumns - 1,
        Math.floor(this.x[source]! / this.cellWidth),
      );
      const sourceRow = Math.min(
        this.cellRows - 1,
        Math.floor(this.y[source]! / this.cellHeight),
      );

      for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
        const column = positiveModulo(
          sourceColumn + columnOffset,
          this.cellColumns,
        );

        for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
          const row = positiveModulo(sourceRow + rowOffset, this.cellRows);
          let target = this.cellHeads[row * this.cellColumns + column]!;

          while (target !== -1) {
            if (target > source) {
              const deltaX = wrappedDelta(
                this.x[target]! - this.x[source]!,
                this.domain.width,
              );
              const deltaY = wrappedDelta(
                this.y[target]! - this.y[source]!,
                this.domain.height,
              );
              const distanceSquared = deltaX * deltaX + deltaY * deltaY;

              if (distanceSquared <= radiusSquared) {
                const graphIndex = this.graph.count;
                this.ensureGraphCapacity(graphIndex + 1);
                const weight = calculateWeight(
                  Math.sqrt(distanceSquared),
                  radius,
                  this.attractivity[source]!,
                  this.attractivity[target]!,
                  normalized.attractionGain,
                );
                this.graph.sources[graphIndex] = source;
                this.graph.targets[graphIndex] = target;
                this.graph.weights[graphIndex] = weight;
                this.graph.count = graphIndex + 1;
                weightTotal += weight;
              }
            }

            target = this.nextInCell[target]!;
          }
        }
      }
    }

    this.graph.meanWeight = this.graph.count > 0
      ? weightTotal / this.graph.count
      : 0;
    this.graphRadius = radius;
    this.graphAttractionGain = normalized.attractionGain;
    return this.graph;
  }

  step(parameters: VicsekParameters) {
    const normalized = createVicsekParameters(
      parameters.interactionRadius,
      parameters.noise,
      parameters.attractionGain,
    );

    if (
      this.graphRadius !== normalized.interactionRadius ||
      this.graphAttractionGain !== normalized.attractionGain
    ) {
      this.rebuildGraph(normalized);
    }

    for (let index = 0; index < this.count; index += 1) {
      this.headingX[index] = this.directionX[index]!;
      this.headingY[index] = this.directionY[index]!;
      this.headingWeight[index] = SELF_WEIGHT;
    }

    for (let edgeIndex = 0; edgeIndex < this.graph.count; edgeIndex += 1) {
      const source = this.graph.sources[edgeIndex]!;
      const target = this.graph.targets[edgeIndex]!;
      const weight = this.graph.weights[edgeIndex]!;
      this.headingX[source] += this.directionX[target]! * weight;
      this.headingY[source] += this.directionY[target]! * weight;
      this.headingWeight[source] += weight;
      this.headingX[target] += this.directionX[source]! * weight;
      this.headingY[target] += this.directionY[source]! * weight;
      this.headingWeight[target] += weight;
    }

    for (let index = 0; index < this.count; index += 1) {
      const random = nextRandom(this.randomState);
      this.randomState = random.state;
      const vectorX = this.headingX[index]!;
      const vectorY = this.headingY[index]!;
      const coherence = Math.min(
        1,
        Math.hypot(vectorX, vectorY) / this.headingWeight[index]!,
      );
      const heading = normalizedHeading(
        Math.atan2(vectorY, vectorX) + (random.value - 0.5) * normalized.noise,
      );
      const directionX = Math.cos(heading);
      const directionY = Math.sin(heading);
      this.nextHeadings[index] = heading;
      this.directionX[index] = directionX;
      this.directionY[index] = directionY;
      this.nextAttractivity[index] = clamp(
        this.attractivity[index]! * 0.78 + coherence * 0.22,
        0.03,
        1,
      );
      this.nextX[index] = wrap(
        this.x[index]! + directionX * normalized.speed,
        this.domain.width,
      );
      this.nextY[index] = wrap(
        this.y[index]! + directionY * normalized.speed,
        this.domain.height,
      );
    }

    this.x.set(this.nextX);
    this.y.set(this.nextY);
    this.headings.set(this.nextHeadings);
    this.attractivity.set(this.nextAttractivity);
    this.tick += 1;
    // The visible graph always belongs to the positions now on screen.
    this.rebuildGraph(normalized);
    return this.graph;
  }

  polarization() {
    let totalX = 0;
    let totalY = 0;

    for (let index = 0; index < this.count; index += 1) {
      totalX += this.directionX[index]!;
      totalY += this.directionY[index]!;
    }

    return Math.hypot(totalX, totalY) / this.count;
  }

  snapshot(): VicsekSnapshot {
    return {
      attractivity: this.attractivity.slice(),
      headings: this.headings.slice(),
      randomState: this.randomState,
      tick: this.tick,
      x: this.x.slice(),
      y: this.y.slice(),
    };
  }

  private prepareSpatialHash(radius: number) {
    const columns = Math.max(1, Math.floor(this.domain.width / radius));
    const rows = Math.max(1, Math.floor(this.domain.height / radius));

    if (columns !== this.cellColumns || rows !== this.cellRows) {
      this.cellColumns = columns;
      this.cellRows = rows;
      this.cellWidth = this.domain.width / columns;
      this.cellHeight = this.domain.height / rows;
      this.cellHeads = new Int32Array(columns * rows);
    }

    this.cellHeads.fill(-1);

    for (let index = 0; index < this.count; index += 1) {
      const column = Math.min(
        this.cellColumns - 1,
        Math.floor(this.x[index]! / this.cellWidth),
      );
      const row = Math.min(
        this.cellRows - 1,
        Math.floor(this.y[index]! / this.cellHeight),
      );
      const cell = row * this.cellColumns + column;
      this.nextInCell[index] = this.cellHeads[cell]!;
      this.cellHeads[cell] = index;
    }
  }

  private ensureGraphCapacity(required: number) {
    if (required <= this.graph.sources.length) return;

    const capacity = Math.max(required, Math.ceil(this.graph.sources.length * 1.6));
    const sources = new Uint16Array(capacity);
    const targets = new Uint16Array(capacity);
    const weights = new Float32Array(capacity);
    sources.set(this.graph.sources);
    targets.set(this.graph.targets);
    weights.set(this.graph.weights);
    this.graph.sources = sources;
    this.graph.targets = targets;
    this.graph.weights = weights;
  }
}

export function createAttractiveVicsekSimulation(options: {
  count?: number;
  domain: VicsekDomain;
  seed?: number;
}) {
  return new AttractiveVicsekSimulation(options);
}

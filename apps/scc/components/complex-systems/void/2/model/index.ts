export type InfluenceDomain = Readonly<{
  width: number;
  height: number;
}>;

export type InfluenceSnapshot = Readonly<{
  connectionCount: Uint16Array;
  influence: Float32Array;
  ringCount: Uint8Array;
  tick: number;
  travelDistance: Float32Array;
  x: Float32Array;
  y: Float32Array;
}>;

export type RelationshipGraph = {
  sources: Uint16Array;
  targets: Uint16Array;
  strengths: Float32Array;
  count: number;
};

export const DEFAULT_AGENT_COUNT = 300;
export const MAX_AGENT_COUNT = 480;
export const MAX_INFLUENCE = 18;
export const MAX_RING_COUNT = MAX_INFLUENCE;
export const RELATIONSHIP_LIMIT = 4;

const TAU = Math.PI * 2;
const MOTION_SPEED_MULTIPLIER = 2;

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

function influenceForRank(rank: number, count: number) {
  const share = 1 - rank / count;
  return clamp(
    Math.floor(1 + (MAX_INFLUENCE - 1) * share ** 8.6),
    1,
    MAX_INFLUENCE,
  );
}

function createRelationshipGraph(capacity: number): RelationshipGraph {
  return {
    sources: new Uint16Array(capacity),
    targets: new Uint16Array(capacity),
    strengths: new Float32Array(capacity),
    count: 0,
  };
}

export function createInfluenceDomain(
  viewportWidth: number,
  viewportHeight: number,
): InfluenceDomain {
  const minimumSide = Math.max(1, Math.min(viewportWidth, viewportHeight));

  return {
    width: Math.max(1, viewportWidth / minimumSide),
    height: Math.max(1, viewportHeight / minimumSide),
  };
}

/**
 * A sparse, unequal field. A site's influence directly determines its number
 * of rings and its pull on nearby sites; it is not a canvas-only styling value.
 */
export class InfluenceSimulation {
  readonly count: number;
  readonly domain: InfluenceDomain;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly phase: Float32Array;
  readonly influence: Float32Array;
  readonly ringCount: Uint8Array;
  readonly connectionCount: Uint16Array;
  readonly travelDistance: Float32Array;
  readonly relationships: RelationshipGraph;

  private readonly baselineInfluence: Float32Array;
  private readonly velocityX: Float32Array;
  private readonly velocityY: Float32Array;
  private readonly motionX: Float32Array;
  private readonly motionY: Float32Array;
  private readonly localExposure: Float32Array;
  private readonly alignmentX: Float32Array;
  private readonly alignmentY: Float32Array;
  private readonly alignmentWeight: Float32Array;
  private readonly relationshipTargets: Int16Array;
  private readonly relationshipStrengths: Float32Array;
  private readonly relationshipLookup: Uint16Array;
  private readonly nextInfluence: Float32Array;
  private readonly nextVelocityX: Float32Array;
  private readonly nextVelocityY: Float32Array;
  private readonly nextX: Float32Array;
  private readonly nextY: Float32Array;
  private elapsed = 0;
  private tick = 0;

  constructor({
    count = DEFAULT_AGENT_COUNT,
    domain,
    seed = 0x1f2e3d4c,
  }: {
    count?: number;
    domain: InfluenceDomain;
    seed?: number;
  }) {
    this.count = clamp(Math.floor(count), 1, MAX_AGENT_COUNT);
    this.domain = domain;
    this.x = new Float32Array(this.count);
    this.y = new Float32Array(this.count);
    this.phase = new Float32Array(this.count);
    this.influence = new Float32Array(this.count);
    this.ringCount = new Uint8Array(this.count);
    this.connectionCount = new Uint16Array(this.count);
    this.travelDistance = new Float32Array(this.count);
    this.relationships = createRelationshipGraph(
      this.count * RELATIONSHIP_LIMIT,
    );
    this.baselineInfluence = new Float32Array(this.count);
    this.velocityX = new Float32Array(this.count);
    this.velocityY = new Float32Array(this.count);
    this.motionX = new Float32Array(this.count);
    this.motionY = new Float32Array(this.count);
    this.localExposure = new Float32Array(this.count);
    this.alignmentX = new Float32Array(this.count);
    this.alignmentY = new Float32Array(this.count);
    this.alignmentWeight = new Float32Array(this.count);
    this.relationshipTargets = new Int16Array(this.count * RELATIONSHIP_LIMIT);
    this.relationshipStrengths = new Float32Array(
      this.count * RELATIONSHIP_LIMIT,
    );
    this.relationshipLookup = new Uint16Array(this.count * this.count);
    this.nextInfluence = new Float32Array(this.count);
    this.nextVelocityX = new Float32Array(this.count);
    this.nextVelocityY = new Float32Array(this.count);
    this.nextX = new Float32Array(this.count);
    this.nextY = new Float32Array(this.count);

    let randomState = normalizedSeed(seed);
    const minimumSide = Math.min(domain.width, domain.height);
    const inset = minimumSide * 0.026;

    for (let index = 0; index < this.count; index += 1) {
      let chosenX = domain.width / 2;
      let chosenY = domain.height / 2;
      let bestDistance = -1;

      for (let candidate = 0; candidate < 18; candidate += 1) {
        const xSample = nextRandom(randomState);
        const ySample = nextRandom(xSample.state);
        randomState = ySample.state;
        const candidateX = inset + xSample.value * (domain.width - inset * 2);
        const candidateY = inset + ySample.value * (domain.height - inset * 2);
        let nearestSquared = Number.POSITIVE_INFINITY;

        for (let previous = 0; previous < index; previous += 1) {
          const deltaX = candidateX - this.x[previous]!;
          const deltaY = candidateY - this.y[previous]!;
          nearestSquared = Math.min(
            nearestSquared,
            deltaX * deltaX + deltaY * deltaY,
          );
        }

        if (nearestSquared > bestDistance) {
          bestDistance = nearestSquared;
          chosenX = candidateX;
          chosenY = candidateY;
        }
      }

      const phaseSample = nextRandom(randomState);
      randomState = phaseSample.state;
      this.x[index] = chosenX;
      this.y[index] = chosenY;
      this.phase[index] = phaseSample.value * TAU;
    }

    const rankOrder = new Uint16Array(this.count);
    for (let index = 0; index < this.count; index += 1) rankOrder[index] = index;
    for (let index = this.count - 1; index > 0; index -= 1) {
      const sample = nextRandom(randomState);
      randomState = sample.state;
      const replacement = Math.floor(sample.value * (index + 1));
      const current = rankOrder[index]!;
      rankOrder[index] = rankOrder[replacement]!;
      rankOrder[replacement] = current;
    }

    for (let rank = 0; rank < this.count; rank += 1) {
      const agent = rankOrder[rank]!;
      const baselineInfluence = influenceForRank(rank, this.count);
      this.baselineInfluence[agent] = baselineInfluence;
      this.influence[agent] = baselineInfluence;
      this.ringCount[agent] = baselineInfluence;
    }

    this.createInitialRelationships();
  }

  step(deltaSeconds: number) {
    const delta = clamp(deltaSeconds, 0, 0.05);
    if (delta === 0) return;

    const minimumSide = Math.min(this.domain.width, this.domain.height);
    const connectionRange = minimumSide * 0.92;
    const damping = Math.exp(-1.8 * delta);
    const velocityMix = 1 - damping;
    const nextTime = this.elapsed + delta;

    this.motionX.fill(0);
    this.motionY.fill(0);
    this.localExposure.fill(0);
    this.alignmentX.fill(0);
    this.alignmentY.fill(0);
    this.alignmentWeight.fill(0);
    this.connectionCount.fill(0);
    this.relationshipTargets.fill(-1);
    this.relationshipStrengths.fill(0);

    for (let index = 0; index < this.count; index += 1) {
      const x = this.x[index]!;
      const y = this.y[index]!;

      for (let other = index + 1; other < this.count; other += 1) {
        const deltaX = wrappedDelta(this.x[other]! - x, this.domain.width);
        const deltaY = wrappedDelta(this.y[other]! - y, this.domain.height);
        const distanceSquared = deltaX * deltaX + deltaY * deltaY;
        if (distanceSquared <= 1e-10) continue;
        const distance = Math.sqrt(distanceSquared);
        const directionX = deltaX / distance;
        const directionY = deltaY / distance;
        const otherInfluence = this.influence[other]!;
        if (distance >= connectionRange) continue;
        const proximity = 1 - distance / connectionRange;
        const authority = otherInfluence / MAX_INFLUENCE;
        const indexAuthority = this.influence[index]! / MAX_INFLUENCE;
        const indexCoupling = proximity * (0.2 + authority);
        const otherCoupling = proximity * (0.2 + indexAuthority);
        this.connectionCount[index] += 1;
        this.connectionCount[other] += 1;
        this.alignmentX[index] += this.velocityX[other]! * indexCoupling;
        this.alignmentY[index] += this.velocityY[other]! * indexCoupling;
        this.alignmentWeight[index] += indexCoupling;
        this.alignmentX[other] += this.velocityX[index]! * otherCoupling;
        this.alignmentY[other] += this.velocityY[index]! * otherCoupling;
        this.alignmentWeight[other] += otherCoupling;
        const relationshipStrength =
          proximity *
          proximity *
          (0.28 + (authority + indexAuthority) * 0.36);
        this.recordRelationship(index, other, relationshipStrength);
        this.recordRelationship(other, index, relationshipStrength);
        const personalSpace =
          minimumSide *
          (0.006 +
            (this.ringCount[index]! + this.ringCount[other]!) * 0.0018);

        if (distance < personalSpace) {
          const resistance =
            ((personalSpace - distance) / personalSpace) * minimumSide * 0.09;
          this.motionX[index] -= directionX * resistance;
          this.motionY[index] -= directionY * resistance;
          this.motionX[other] += directionX * resistance;
          this.motionY[other] += directionY * resistance;
          continue;
        }

        const indexCirculation =
          minimumSide * (0.0015 + authority * 0.012) * proximity * proximity;
        const otherCirculation =
          minimumSide *
          (0.0015 + indexAuthority * 0.012) *
          proximity *
          proximity;
        this.motionX[index] -= directionY * indexCirculation;
        this.motionY[index] += directionX * indexCirculation;
        this.motionX[other] += directionY * otherCirculation;
        this.motionY[other] -= directionX * otherCirculation;
        this.localExposure[index] += proximity * (0.16 + authority);
        this.localExposure[other] += proximity * (0.16 + indexAuthority);
      }
    }

    this.rebuildRelationships();

    for (let index = 0; index < this.count; index += 1) {
      const x = this.x[index]!;
      const y = this.y[index]!;
      const phase = this.phase[index]!;
      const influence = this.influence[index]!;
      const mobility = 0.95 + influence / MAX_INFLUENCE * 0.72;
      const streamSpeed = minimumSide * 0.108 * mobility;
      const carrierAngle =
        phase +
        Math.sin(phase * 0.63 + nextTime * 0.17) * 1.1 +
        Math.sin(nextTime * 0.043 + phase) * 0.42;
      const streamX =
        (Math.cos(carrierAngle) * 0.82 +
          Math.sin(y * 4.8 + nextTime * 0.39) * 0.18) *
        streamSpeed;
      const streamY =
        (Math.sin(carrierAngle) * 0.82 +
          Math.cos(x * 4.3 - nextTime * 0.31) * 0.18) *
        streamSpeed;
      const connectedVelocityX =
        this.alignmentWeight[index]! > 0
          ? this.alignmentX[index]! / this.alignmentWeight[index]!
          : 0;
      const connectedVelocityY =
        this.alignmentWeight[index]! > 0
          ? this.alignmentY[index]! / this.alignmentWeight[index]!
          : 0;
      const targetVelocityX =
        (streamX + this.motionX[index]! + connectedVelocityX * 0.44) *
        MOTION_SPEED_MULTIPLIER;
      const targetVelocityY =
        (streamY + this.motionY[index]! + connectedVelocityY * 0.44) *
        MOTION_SPEED_MULTIPLIER;
      let velocityX =
        this.velocityX[index]! * damping + targetVelocityX * velocityMix;
      let velocityY =
        this.velocityY[index]! * damping + targetVelocityY * velocityMix;
      const velocity = Math.hypot(velocityX, velocityY);
      const maximumVelocity =
        minimumSide * 0.28 * MOTION_SPEED_MULTIPLIER;

      if (velocity > maximumVelocity) {
        velocityX = (velocityX / velocity) * maximumVelocity;
        velocityY = (velocityY / velocity) * maximumVelocity;
      }

      const nextX = wrap(x + velocityX * delta, this.domain.width);
      const nextY = wrap(y + velocityY * delta, this.domain.height);

      const yieldFluctuation =
        Math.sin(phase + nextTime * 0.62) *
        (0.14 + this.baselineInfluence[index]! * 0.022);
      const desiredInfluence = clamp(
        this.baselineInfluence[index]! +
          this.localExposure[index]! *
            (this.baselineInfluence[index]! / MAX_INFLUENCE) *
            0.42 +
          yieldFluctuation,
        1,
        MAX_INFLUENCE,
      );

      this.nextX[index] = nextX;
      this.nextY[index] = nextY;
      this.nextVelocityX[index] = velocityX;
      this.nextVelocityY[index] = velocityY;
      this.travelDistance[index] += velocity * delta;
      this.nextInfluence[index] =
        influence + (desiredInfluence - influence) * Math.min(1, delta * 1.25);
    }

    this.x.set(this.nextX);
    this.y.set(this.nextY);
    this.velocityX.set(this.nextVelocityX);
    this.velocityY.set(this.nextVelocityY);
    this.influence.set(this.nextInfluence);
    for (let index = 0; index < this.count; index += 1) {
      this.ringCount[index] = clamp(
        Math.round(this.influence[index]!),
        1,
        MAX_RING_COUNT,
      );
    }
    this.elapsed = nextTime;
    this.tick += 1;
  }

  snapshot(): InfluenceSnapshot {
    return {
      connectionCount: this.connectionCount.slice(),
      influence: this.influence.slice(),
      ringCount: this.ringCount.slice(),
      tick: this.tick,
      travelDistance: this.travelDistance.slice(),
      x: this.x.slice(),
      y: this.y.slice(),
    };
  }

  get time() {
    return this.elapsed;
  }

  private recordRelationship(
    source: number,
    target: number,
    strength: number,
  ) {
    const offset = source * RELATIONSHIP_LIMIT;
    let weakestSlot = offset;
    let weakestStrength = Number.POSITIVE_INFINITY;

    for (let slot = 0; slot < RELATIONSHIP_LIMIT; slot += 1) {
      const candidateIndex = offset + slot;
      const candidateTarget = this.relationshipTargets[candidateIndex]!;
      if (candidateTarget === -1) {
        this.relationshipTargets[candidateIndex] = target;
        this.relationshipStrengths[candidateIndex] = strength;
        return;
      }
      const candidateStrength = this.relationshipStrengths[candidateIndex]!;
      if (candidateStrength < weakestStrength) {
        weakestStrength = candidateStrength;
        weakestSlot = candidateIndex;
      }
    }

    if (strength > weakestStrength) {
      this.relationshipTargets[weakestSlot] = target;
      this.relationshipStrengths[weakestSlot] = strength;
    }
  }

  private rebuildRelationships() {
    for (let index = 0; index < this.relationships.count; index += 1) {
      const source = this.relationships.sources[index]!;
      const target = this.relationships.targets[index]!;
      this.relationshipLookup[source * this.count + target] = 0;
    }
    this.relationships.count = 0;

    for (let source = 0; source < this.count; source += 1) {
      const offset = source * RELATIONSHIP_LIMIT;
      for (let slot = 0; slot < RELATIONSHIP_LIMIT; slot += 1) {
        const candidateIndex = offset + slot;
        const target = this.relationshipTargets[candidateIndex]!;
        if (target < 0) continue;
        const first = Math.min(source, target);
        const second = Math.max(source, target);
        const lookupIndex = first * this.count + second;
        const existing = this.relationshipLookup[lookupIndex]!;
        const strength = this.relationshipStrengths[candidateIndex]!;

        if (existing > 0) {
          const edgeIndex = existing - 1;
          if (strength > this.relationships.strengths[edgeIndex]!) {
            this.relationships.strengths[edgeIndex] = strength;
          }
          continue;
        }

        const edgeIndex = this.relationships.count;
        this.relationships.sources[edgeIndex] = first;
        this.relationships.targets[edgeIndex] = second;
        this.relationships.strengths[edgeIndex] = strength;
        this.relationshipLookup[lookupIndex] = edgeIndex + 1;
        this.relationships.count = edgeIndex + 1;
      }
    }
  }

  private createInitialRelationships() {
    const minimumSide = Math.min(this.domain.width, this.domain.height);
    const connectionRange = minimumSide * 0.92;
    this.relationshipTargets.fill(-1);
    this.relationshipStrengths.fill(0);

    for (let source = 0; source < this.count; source += 1) {
      for (let target = source + 1; target < this.count; target += 1) {
        const deltaX = wrappedDelta(
          this.x[target]! - this.x[source]!,
          this.domain.width,
        );
        const deltaY = wrappedDelta(
          this.y[target]! - this.y[source]!,
          this.domain.height,
        );
        const distance = Math.hypot(deltaX, deltaY);
        if (distance <= 1e-8 || distance >= connectionRange) continue;
        const proximity = 1 - distance / connectionRange;
        const sourceAuthority = this.influence[source]! / MAX_INFLUENCE;
        const targetAuthority = this.influence[target]! / MAX_INFLUENCE;
        const strength =
          proximity *
          proximity *
          (0.28 + (sourceAuthority + targetAuthority) * 0.36);
        this.recordRelationship(source, target, strength);
        this.recordRelationship(target, source, strength);
      }
    }

    this.rebuildRelationships();
  }
}

export function createInfluenceSimulation(options: {
  count?: number;
  domain: InfluenceDomain;
  seed?: number;
}) {
  return new InfluenceSimulation(options);
}

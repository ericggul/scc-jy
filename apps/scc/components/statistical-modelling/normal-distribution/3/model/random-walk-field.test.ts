import assert from "node:assert/strict";
import test from "node:test";
import {
  createRandomWalkField,
  DEFAULT_RANDOM_WALK_PARAMETERS,
  RANDOM_WALKER_COUNT,
  RANDOM_WALK_STEPS,
  randomWalkTrajectoryOffset,
} from "./random-walk-field";

function endpointCoordinate(
  trajectories: Float32Array,
  walker: number,
  coordinate: 0 | 1 | 2,
) {
  return trajectories[randomWalkTrajectoryOffset(walker, RANDOM_WALK_STEPS) + coordinate] ?? 0;
}

function sampleCorrelation(
  trajectories: Float32Array,
  first: 0 | 1 | 2,
  second: 0 | 1 | 2,
) {
  let firstMean = 0;
  let secondMean = 0;
  for (let walker = 0; walker < RANDOM_WALKER_COUNT; walker += 1) {
    firstMean += endpointCoordinate(trajectories, walker, first);
    secondMean += endpointCoordinate(trajectories, walker, second);
  }
  firstMean /= RANDOM_WALKER_COUNT;
  secondMean /= RANDOM_WALKER_COUNT;

  let covariance = 0;
  let firstVariance = 0;
  let secondVariance = 0;
  for (let walker = 0; walker < RANDOM_WALKER_COUNT; walker += 1) {
    const firstDistance = endpointCoordinate(trajectories, walker, first) - firstMean;
    const secondDistance = endpointCoordinate(trajectories, walker, second) - secondMean;
    covariance += firstDistance * secondDistance;
    firstVariance += firstDistance ** 2;
    secondVariance += secondDistance ** 2;
  }

  return covariance / Math.sqrt(firstVariance * secondVariance);
}

function sampleVariance(trajectories: Float32Array, coordinate: 0 | 1 | 2) {
  let mean = 0;
  for (let walker = 0; walker < RANDOM_WALKER_COUNT; walker += 1) {
    mean += endpointCoordinate(trajectories, walker, coordinate);
  }
  mean /= RANDOM_WALKER_COUNT;

  let variance = 0;
  for (let walker = 0; walker < RANDOM_WALKER_COUNT; walker += 1) {
    variance += (endpointCoordinate(trajectories, walker, coordinate) - mean) ** 2;
  }

  return variance / RANDOM_WALKER_COUNT;
}

test("a fixed seed makes the full three-dimensional walk reproducible", () => {
  const first = createRandomWalkField(DEFAULT_RANDOM_WALK_PARAMETERS, 17);
  const second = createRandomWalkField(DEFAULT_RANDOM_WALK_PARAMETERS, 17);

  assert.deepEqual(first.trajectories, second.trajectories);
  assert.deepEqual(first.delays, second.delays);
  assert.deepEqual(first.traceIndices, second.traceIndices);
});

test("every walker retains a common translated three-dimensional origin", () => {
  const field = createRandomWalkField(
    { ...DEFAULT_RANDOM_WALK_PARAMETERS, mean: 0.6 },
    23,
  );
  const firstOrigin = randomWalkTrajectoryOffset(0, 0);
  const middleOrigin = randomWalkTrajectoryOffset(Math.floor(RANDOM_WALKER_COUNT / 2), 0);

  assert.equal(field.trajectories.length, RANDOM_WALKER_COUNT * (RANDOM_WALK_STEPS + 1) * 3);
  for (const offset of [firstOrigin, middleOrigin]) {
    assert.ok(Math.abs((field.trajectories[offset] ?? 0) - 0.6) < 0.000_001);
    assert.ok(Math.abs((field.trajectories[offset + 1] ?? 0) - 0.6) < 0.000_001);
    assert.ok(Math.abs((field.trajectories[offset + 2] ?? 0) - 0.6) < 0.000_001);
  }
  assert.ok([...field.trajectories].every(Number.isFinite));
});

test("the selected correlation belongs to the actual x-y endpoint distribution", () => {
  const independent = createRandomWalkField(DEFAULT_RANDOM_WALK_PARAMETERS, 31);
  const correlated = createRandomWalkField(
    { ...DEFAULT_RANDOM_WALK_PARAMETERS, correlation: 0.7 },
    31,
  );

  assert.ok(Math.abs(sampleVariance(independent.trajectories, 0) - 1) < 0.08);
  assert.ok(Math.abs(sampleVariance(independent.trajectories, 1) - 1) < 0.08);
  assert.ok(Math.abs(sampleVariance(independent.trajectories, 2) - 1) < 0.08);
  assert.ok(Math.abs(sampleCorrelation(independent.trajectories, 0, 1)) < 0.05);
  assert.ok(Math.abs(sampleCorrelation(independent.trajectories, 0, 2)) < 0.05);
  assert.ok(sampleCorrelation(correlated.trajectories, 0, 1) > 0.64);
  assert.ok(Math.abs(sampleCorrelation(correlated.trajectories, 0, 2)) < 0.05);
});

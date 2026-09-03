import assert from "node:assert/strict";
import test from "node:test";
import {
  CENTRAL_LIMIT_PARTICLE_COUNT,
  CENTRAL_LIMIT_STEPS,
  createCentralLimitField,
  DEFAULT_CENTRAL_LIMIT_PARAMETERS,
} from "./central-limit-histogram";

test("a fixed seed makes a reproducible empirical field", () => {
  const first = createCentralLimitField(DEFAULT_CENTRAL_LIMIT_PARAMETERS, 17);
  const second = createCentralLimitField(DEFAULT_CENTRAL_LIMIT_PARAMETERS, 17);

  assert.deepEqual(first.finalPositions, second.finalPositions);
  assert.deepEqual(first.localDensities, second.localDensities);
});

test("each particle has a finite stochastic endpoint and local empirical density", () => {
  const field = createCentralLimitField(DEFAULT_CENTRAL_LIMIT_PARAMETERS, 23);

  assert.equal(field.trajectories.length, CENTRAL_LIMIT_PARTICLE_COUNT * CENTRAL_LIMIT_STEPS * 2);
  assert.equal(field.finalPositions.length, CENTRAL_LIMIT_PARTICLE_COUNT * 3);
  assert.ok([...field.localDensities].some((density) => density > 0));
  assert.ok([...field.finalPositions].every(Number.isFinite));
});

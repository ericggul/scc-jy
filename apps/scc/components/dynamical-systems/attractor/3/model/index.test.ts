import assert from "node:assert/strict";
import test from "node:test";
import {
  THOMAS_DAMPING,
  THOMAS_PARTICLE_COUNT,
  THOMAS_SEED_RADIUS,
  advanceThomasPositions,
  createThomasSeedPositions,
  stepThomasEuler,
  thomasDerivative,
  thomasPointIsFinite,
} from "./index.ts";

test("the particle field uses the documented Thomas regime", () => {
  assert.equal(THOMAS_DAMPING, 0.19);
  const derivative = thomasDerivative({ x: 1, y: 0, z: -1 });
  assert.equal(derivative.x, -THOMAS_DAMPING);
  assert.equal(derivative.y, -Math.sin(1));
  assert.equal(derivative.z, Math.sin(1) + THOMAS_DAMPING);
});

test("the Euler step and particle buffer remain finite", () => {
  let state = { x: 0.5, y: -0.25, z: 1.25 };
  for (let index = 0; index < 500; index += 1) {
    state = stepThomasEuler(state);
  }
  assert.ok(thomasPointIsFinite(state));

  const positions = createThomasSeedPositions(360);
  advanceThomasPositions(positions);
  assert.equal(positions.length, 1_080);
  assert.ok([...positions].every(Number.isFinite));
});

test("particle seeds are deterministic and remain inside the documented sphere", () => {
  const positions = createThomasSeedPositions();
  assert.equal(positions.length, THOMAS_PARTICLE_COUNT * 3);
  assert.deepEqual(
    [...createThomasSeedPositions(9)],
    [...createThomasSeedPositions(9)],
  );

  for (let offset = 0; offset < positions.length; offset += 3) {
    const x = positions[offset] ?? 0;
    const y = positions[offset + 1] ?? 0;
    const z = positions[offset + 2] ?? 0;
    assert.ok(Math.hypot(x, y, z) <= THOMAS_SEED_RADIUS + 1e-6);
  }
});

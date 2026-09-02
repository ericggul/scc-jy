import assert from "node:assert/strict";
import test from "node:test";
import {
  PARTICLE_SYSTEMS,
  isParticleSystemId,
} from "./particle-systems.ts";

test("the GPU particle field selects five explicitly configured systems", () => {
  assert.deepEqual(
    PARTICLE_SYSTEMS.map((system) => system.id),
    ["thomas", "lorenz", "aizawa", "dadras", "halvorsen"],
  );

  for (const system of PARTICLE_SYSTEMS) {
    assert.ok(system.seedRadius > 0);
    assert.ok(system.viewScale > 0);
    assert.ok(system.step > 0);
    assert.ok(Number.isInteger(system.substeps) && system.substeps > 0);
    assert.match(system.derivativeWgsl, /fn attractorDerivative/);
  }

  assert.ok(isParticleSystemId("lorenz"));
  assert.ok(!isParticleSystemId("finance"));
});

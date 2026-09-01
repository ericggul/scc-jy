import assert from "node:assert/strict";
import test from "node:test";
import {
  ATTRACTOR_DEFINITIONS,
  MAX_PARTICLE_COUNT,
  createAttractorParticleStates,
  createAttractorTrace,
  getAttractorDefinition,
  isAttractorId,
  normalizeParticleCount,
  stepAttractorParticleStates,
  stepRungeKutta,
} from "./index.ts";

test("the sequence has six independently named attractor systems", () => {
  assert.deepEqual(
    ATTRACTOR_DEFINITIONS.map((definition) => definition.id),
    ["finance", "dadras", "bouali", "aizawa", "nose-hoover", "thomas"],
  );
  assert.ok(isAttractorId("dadras"));
  assert.ok(!isAttractorId("lorenz"));
});

test("the finance step uses the documented three-variable finance system", () => {
  const finance = getAttractorDefinition("finance");
  const state = { x: 1, y: 3, z: 2 };
  const derivative = finance.derivative(state);

  assert.equal(derivative.x, 4.1);
  assert.ok(Math.abs(derivative.y + 0.6) < 1e-12);
  assert.equal(derivative.z, -3.4);
  assert.notDeepEqual(stepRungeKutta(finance, state), state);
});

test("every configured system produces a finite, normalized trajectory", () => {
  for (const definition of ATTRACTOR_DEFINITIONS) {
    const trace = createAttractorTrace({
      ...definition,
      warmupSteps: 300,
      sampleCount: 360,
      stepsPerSample: 1,
    });
    assert.equal(trace.points.length, 360);
    assert.ok(trace.radius > 0);
    assert.ok(trace.points.every((point) =>
      Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z),
    ));
    const particles = createAttractorParticleStates(trace);
    assert.equal(particles.length, MAX_PARTICLE_COUNT);
    assert.equal(new Set(particles.map((particle) => particle.id)).size, MAX_PARTICLE_COUNT);
    const advanced = stepAttractorParticleStates(definition, particles);
    assert.equal(advanced.length, MAX_PARTICLE_COUNT);
    assert.ok(advanced.every((particle) =>
      Number.isFinite(particle.state.x) &&
      Number.isFinite(particle.state.y) && Number.isFinite(particle.state.z),
    ));
  }
});

test("particle count stays within the safe one through twenty range", () => {
  assert.equal(normalizeParticleCount(-5), 1);
  assert.equal(normalizeParticleCount(3.9), 3);
  assert.equal(normalizeParticleCount(99), MAX_PARTICLE_COUNT);
});

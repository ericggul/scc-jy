import assert from "node:assert/strict";
import test from "node:test";
import {
  ATTRACTOR_DEFINITIONS,
  MAX_PARTICLE_COUNT,
  createAttractorParticleStates,
  createAttractorTangentParticleStates,
  createAttractorTrace,
  finiteTimeTangentDivergence,
  getAttractorDefinition,
  isAttractorId,
  normalizeParticleCount,
  reReleaseAttractorTangentCompanions,
  renormalizeAttractorTangentParticleStates,
  stepAttractorParticleStates,
  stepAttractorTangentParticleStates,
  stepRungeKutta,
  tangentEpsilonFor,
  tangentParticleIsFinite,
} from "./index.ts";

test("the sequence has seven independently named attractor systems", () => {
  assert.deepEqual(
    ATTRACTOR_DEFINITIONS.map((definition) => definition.id),
    [
      "finance",
      "dadras",
      "bouali",
      "aizawa",
      "nose-hoover",
      "thomas",
      "qi-four-wing",
    ],
  );
  assert.ok(isAttractorId("dadras"));
  assert.ok(isAttractorId("qi-four-wing"));
  assert.ok(!isAttractorId("lorenz"));
});

test("the finance step uses the documented three-variable finance system", () => {
  const finance = getAttractorDefinition("finance");
  const state = { x: 1, y: 3, z: 2 };
  const derivative = finance.derivative(state);

  assert.equal(derivative.x, 4.1);
  assert.ok(Math.abs(derivative.y + 0.6) < 1e-12);
  assert.equal(derivative.z, -3.4);
  assert.deepEqual(finance.jacobian(state), {
    xx: 2.1,
    xy: 1,
    xz: 1,
    yx: -2,
    yy: -0.2,
    yz: 0,
    zx: -1,
    zy: 0,
    zz: -1.2,
  });
  assert.notDeepEqual(stepRungeKutta(finance, state), state);
});

test("the Qi definition supplies the documented four-wing field and Jacobian", () => {
  const qi = getAttractorDefinition("qi-four-wing");
  const state = { x: 1, y: 2, z: 3 };

  assert.deepEqual(qi.derivative(state), { x: 38, y: 28, z: -127 });
  assert.deepEqual(qi.jacobian(state), {
    xx: -14,
    xy: 26,
    xz: 8,
    yx: -4,
    yy: 16,
    yz: -1,
    zx: 2,
    zy: 1,
    zz: -43,
  });
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

test("particle count stays within the safe one through forty range", () => {
  assert.equal(normalizeParticleCount(-5), 1);
  assert.equal(normalizeParticleCount(3.9), 3);
  assert.equal(normalizeParticleCount(99), MAX_PARTICLE_COUNT);
});

test("nearby nonlinear companions and tangent states remain finite across every system", () => {
  for (const definition of ATTRACTOR_DEFINITIONS) {
    const trace = createAttractorTrace({
      ...definition,
      warmupSteps: 300,
      sampleCount: 360,
      stepsPerSample: 1,
    });
    const epsilon = tangentEpsilonFor(trace);
    let particles = createAttractorTangentParticleStates(trace, 4);
    for (let index = 0; index < 120; index += 1) {
      particles = stepAttractorTangentParticleStates(definition, particles);
    }
    particles = renormalizeAttractorTangentParticleStates(particles, epsilon);
    particles = reReleaseAttractorTangentCompanions(particles, 0, Infinity);
    assert.ok(particles.every(tangentParticleIsFinite));
    assert.ok(particles.every((particle) => particle.companionElapsed === 0));
    assert.ok(particles.every((particle) =>
      Math.abs(Math.hypot(
        particle.companion.x - particle.state.x,
        particle.companion.y - particle.state.y,
        particle.companion.z - particle.state.z,
      ) - epsilon) < epsilon * 1e-10,
    ));
    assert.ok(particles.every((particle) =>
      Math.abs(Math.hypot(particle.tangent.x, particle.tangent.y, particle.tangent.z) - epsilon) <
      epsilon * 1e-10,
    ));
    assert.ok(particles.every((particle) =>
      Number.isFinite(finiteTimeTangentDivergence(particle, epsilon)),
    ));
  }
});

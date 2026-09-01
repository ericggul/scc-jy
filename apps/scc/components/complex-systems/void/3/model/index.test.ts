import assert from "node:assert/strict";
import test from "node:test";
import {
  ATTRACTION,
  ORIENTATION,
  REPULSION,
  createCouzinParameters,
  createCouzinTorusSimulation,
} from "./index.ts";

test("a seeded Couzin field replays exactly through synchronous turns", () => {
  const parameters = createCouzinParameters();
  const first = createCouzinTorusSimulation({
    count: 480,
    parameters,
    seed: 0x7f4a7c15,
  });
  const second = createCouzinTorusSimulation({
    count: 480,
    parameters,
    seed: 0x7f4a7c15,
  });

  for (let step = 0; step < 240; step += 1) {
    first.step(1 / 30);
    second.step(1 / 30);
  }

  assert.deepEqual(first.snapshot(), second.snapshot());
});

test("repulsion has priority over the orientation and attraction zones", () => {
  const parameters = createCouzinParameters({
    attractionRadius: 0.16,
    noise: 0,
    orientationRadius: 0.08,
    perceptionAngle: Math.PI * 2,
    repulsionRadius: 0.04,
    speed: 0.01,
    turnRate: 14,
  });
  const simulation = createCouzinTorusSimulation({
    count: 4,
    parameters,
    seed: 7,
  });
  simulation.x.set([0, 0.02, 0.06, 0.12]);
  simulation.y.set([0, 0, 0, 0]);
  simulation.headings.set([0, Math.PI / 2, Math.PI / 2, Math.PI]);
  simulation.directionX.set([1, 0, 0, -1]);
  simulation.directionY.set([0, 1, 1, 0]);

  const inspection = simulation.inspectAgent(0);
  assert.equal(inspection.count, 1);
  assert.equal(inspection.targetIndices[0], 1);
  assert.equal(inspection.kinds[0], REPULSION);

  simulation.step(1 / 30);
  assert.ok(Math.abs(simulation.directionY[0]!) > 0.4);
});

test("zone inspection reports orientation and attraction when no repulsion exists", () => {
  const parameters = createCouzinParameters({
    attractionRadius: 0.16,
    noise: 0,
    orientationRadius: 0.08,
    perceptionAngle: Math.PI * 2,
    repulsionRadius: 0.02,
  });
  const simulation = createCouzinTorusSimulation({
    count: 3,
    parameters,
    seed: 17,
  });
  simulation.x.set([0, 0.05, 0.12]);
  simulation.y.set([0, 0, 0]);
  simulation.headings.fill(0);
  simulation.directionX.fill(1);
  simulation.directionY.fill(0);

  const inspection = simulation.inspectAgent(0);
  assert.equal(inspection.count, 2);
  assert.deepEqual(
    Array.from(inspection.kinds).slice(0, inspection.count).sort(),
    [ORIENTATION, ATTRACTION],
  );
});

test("the calibrated local rules open a low-density core from a compact aggregate", () => {
  const simulation = createCouzinTorusSimulation({
    count: 480,
    parameters: createCouzinParameters(),
    seed: 0x7f4a7c15,
  });

  for (let step = 0; step < 600; step += 1) simulation.step(1 / 30);

  const metrics = simulation.torusMetrics(0.04);
  assert.ok(metrics.coreFraction <= 0.03);
  assert.ok(metrics.meanRadius >= 0.19);
  assert.equal(
    Array.from(simulation.x).every(Number.isFinite) &&
      Array.from(simulation.y).every(Number.isFinite) &&
      Array.from(simulation.headings).every(Number.isFinite),
    true,
  );
});

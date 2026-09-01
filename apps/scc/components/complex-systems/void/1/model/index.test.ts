import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_AGENT_COUNT,
  agentCountForViewport,
  calculateAttractivityWeight,
  createAttractiveVicsekSimulation,
  createVicsekDomain,
  createVicsekParameters,
  minimumImageDisplacement,
} from "./index.ts";

test("the seeded high-density field replays exactly with stable index IDs", () => {
  const domain = createVicsekDomain(1440, 900);
  const parameters = createVicsekParameters();
  const first = createAttractiveVicsekSimulation({ count: 768, domain, seed: 73 });
  const second = createAttractiveVicsekSimulation({ count: 768, domain, seed: 73 });

  first.rebuildGraph(parameters);
  second.rebuildGraph(parameters);
  for (let step = 0; step < 40; step += 1) {
    first.step(parameters);
    second.step(parameters);
  }

  assert.equal(first.count, 768);
  assert.deepEqual(first.snapshot(), second.snapshot());
});

test("the responsive density is bounded at one-and-a-half times the prior field", () => {
  assert.equal(agentCountForViewport(390, 844), 854);
  assert.equal(agentCountForViewport(2560, 1440), MAX_AGENT_COUNT);
});

test("the spatial graph contains each metric pair once, including periodic neighbours", () => {
  const domain = createVicsekDomain(1000, 1000);
  const simulation = createAttractiveVicsekSimulation({ count: 4, domain, seed: 17 });
  simulation.x.set([0.02, 0.98, 0.065, 0.7]);
  simulation.y.set([0.5, 0.5, 0.5, 0.5]);
  simulation.headings.set([0, 0, Math.PI / 2, Math.PI]);
  simulation.attractivity.fill(1);
  const parameters = createVicsekParameters(0.06, 0, 1);
  const graph = simulation.rebuildGraph(parameters);

  assert.deepEqual(
    Array.from({ length: graph.count }, (_, index) => [
      graph.sources[index],
      graph.targets[index],
    ]),
    [[0, 1], [0, 2]],
  );

  const seen = new Set<string>();
  for (let index = 0; index < graph.count; index += 1) {
    const source = graph.sources[index]!;
    const target = graph.targets[index]!;
    const delta = minimumImageDisplacement(
      { x: simulation.x[source]!, y: simulation.y[source]! },
      { x: simulation.x[target]!, y: simulation.y[target]! },
      domain,
    );
    assert.ok(Math.hypot(delta.x, delta.y) <= parameters.interactionRadius);
    assert.equal(seen.has(`${source}:${target}`), false);
    seen.add(`${source}:${target}`);
  }
});

test("attractivity is a causal pair weight and changes the Vicsek heading", () => {
  const weakWeight = calculateAttractivityWeight(0.025, 0.05, 0.05, 0.05, 1);
  const strongWeight = calculateAttractivityWeight(0.025, 0.05, 1, 1, 1);
  assert.ok(strongWeight > weakWeight * 4);

  const domain = createVicsekDomain(1000, 1000);
  const parameters = createVicsekParameters(0.05, 0, 1);
  const weak = createAttractiveVicsekSimulation({ count: 2, domain, seed: 11 });
  const strong = createAttractiveVicsekSimulation({ count: 2, domain, seed: 11 });

  for (const simulation of [weak, strong]) {
    simulation.x.set([0.2, 0.225]);
    simulation.y.set([0.2, 0.2]);
    simulation.headings.set([0, Math.PI / 2]);
    simulation.directionX.set([1, 0]);
    simulation.directionY.set([0, 1]);
  }
  weak.attractivity.fill(0.05);
  strong.attractivity.fill(1);
  weak.rebuildGraph(parameters);
  strong.rebuildGraph(parameters);
  const weakInitialWeight = weak.graph.weights[0]!;
  const strongInitialWeight = strong.graph.weights[0]!;
  weak.step(parameters);
  strong.step(parameters);

  assert.ok(strongInitialWeight > weakInitialWeight * 4);
  assert.ok(strong.headings[0]! > weak.headings[0]!);
});

test("one synchronous step retains the fixed Vicsek travel distance across a seam", () => {
  const domain = createVicsekDomain(1000, 1000);
  const parameters = createVicsekParameters(0.04, 0, 1);
  const simulation = createAttractiveVicsekSimulation({ count: 1, domain, seed: 301 });
  simulation.x[0] = 0.9995;
  simulation.y[0] = 0.5;
  simulation.headings[0] = 0;
  simulation.directionX[0] = 1;
  simulation.directionY[0] = 0;
  simulation.rebuildGraph(parameters);
  const before = { x: simulation.x[0]!, y: simulation.y[0]! };
  simulation.step(parameters);
  const moved = minimumImageDisplacement(
    before,
    { x: simulation.x[0]!, y: simulation.y[0]! },
    domain,
  );

  assert.equal(simulation.snapshot().tick, 1);
  assert.ok(Math.abs(Math.hypot(moved.x, moved.y) - parameters.speed) < 1e-7);
});

test("a maximum-density field stays finite through repeated spatial-hash steps", () => {
  const domain = createVicsekDomain(1600, 900);
  const simulation = createAttractiveVicsekSimulation({
    count: MAX_AGENT_COUNT,
    domain,
    seed: 809,
  });
  const parameters = createVicsekParameters();
  simulation.rebuildGraph(parameters);

  for (let step = 0; step < 24; step += 1) simulation.step(parameters);

  assert.equal(simulation.snapshot().tick, 24);
  assert.equal(
    Array.from(simulation.x).every(Number.isFinite) &&
      Array.from(simulation.y).every(Number.isFinite) &&
      Array.from(simulation.headings).every(Number.isFinite),
    true,
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_AGENT_COUNT,
  MAX_RING_COUNT,
  RELATIONSHIP_LIMIT,
  createInfluenceDomain,
  createInfluenceSimulation,
} from "./index.ts";

test("the unequal field replays exactly with stable site identities", () => {
  const domain = createInfluenceDomain(1440, 900);
  const first = createInfluenceSimulation({ domain, seed: 71 });
  const second = createInfluenceSimulation({ domain, seed: 71 });

  for (let step = 0; step < 90; step += 1) {
    first.step(1 / 30);
    second.step(1 / 30);
  }

  assert.equal(first.count, DEFAULT_AGENT_COUNT);
  assert.deepEqual(first.snapshot(), second.snapshot());
});

test("ring count carries a deliberately steep influence distribution", () => {
  const simulation = createInfluenceSimulation({
    domain: createInfluenceDomain(1440, 900),
    seed: 17,
  });
  const counts = Array.from(simulation.ringCount);
  const minimumRingSites = counts.filter((count) => count === 1).length;
  const wealthySites = counts.filter((count) => count >= 8).length;

  assert.equal(Math.max(...counts), MAX_RING_COUNT);
  assert.ok(minimumRingSites >= 180);
  assert.ok(wealthySites <= 36);
  assert.ok(wealthySites >= 1);
});

test("sites maintain broad live connections and traverse the field", () => {
  const simulation = createInfluenceSimulation({
    domain: createInfluenceDomain(2560, 1440),
    seed: 809,
  });
  for (let step = 0; step < 240; step += 1) simulation.step(1 / 30);

  const averageConnections =
    Array.from(simulation.connectionCount).reduce((total, count) => total + count, 0) /
    simulation.count;
  const traversingSites = Array.from(simulation.travelDistance).filter(
    (distance) => distance > 0.6,
  ).length;
  const occupiedCells = new Set(
    Array.from(simulation.x, (x, index) => {
      const column = Math.min(4, Math.floor((x / simulation.domain.width) * 5));
      const row = Math.min(
        3,
        Math.floor((simulation.y[index]! / simulation.domain.height) * 4),
      );
      return `${column}:${row}`;
    }),
  );

  assert.ok(averageConnections >= 150);
  assert.ok(traversingSites >= 240);
  assert.ok(occupiedCells.size >= 14);
  assert.equal(simulation.snapshot().tick, 240);
  assert.equal(
    [
      ...simulation.x,
      ...simulation.y,
      ...simulation.influence,
      ...simulation.ringCount,
      ...simulation.connectionCount,
      ...simulation.travelDistance,
    ].every(Number.isFinite),
    true,
  );
});

test("the visible graph stays sparse and contains only canonical live relationships", () => {
  const simulation = createInfluenceSimulation({
    domain: createInfluenceDomain(1440, 900),
    seed: 42,
  });
  simulation.step(1 / 30);

  assert.ok(simulation.relationships.count > 0);
  assert.ok(
    simulation.relationships.count <= simulation.count * RELATIONSHIP_LIMIT,
  );

  for (let edge = 0; edge < simulation.relationships.count; edge += 1) {
    const source = simulation.relationships.sources[edge]!;
    const target = simulation.relationships.targets[edge]!;
    assert.ok(source < target);
    assert.ok(simulation.relationships.strengths[edge]! > 0);
  }
});

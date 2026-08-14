import assert from "node:assert/strict";
import test from "node:test";
import {
  createFilamentTopology,
  DEFAULT_FILAMENT_PARAMETERS,
  introduceNutrient,
  stepFilamentTopology,
} from "./model.ts";

function assertTopologyIsConsistent(topology: ReturnType<typeof createFilamentTopology>) {
  const ids = new Set(topology.nodes.map((node) => node.id));
  const keys = new Set<string>();
  for (const filament of topology.filaments) {
    assert.ok(ids.has(filament.source) && ids.has(filament.target));
    assert.notEqual(filament.source, filament.target);
    const key = [filament.source, filament.target].sort((left, right) => left - right).join(":");
    assert.ok(!keys.has(key));
    keys.add(key);
  }
  assert.ok(topology.tips.every((tip) => ids.has(tip.nodeId)));
}

test("filament agents deterministically grow a valid changing graph", () => {
  let first = createFilamentTopology(1_200, 760, 81);
  let second = createFilamentTopology(1_200, 760, 81);
  let extensions = 0;
  let branches = 0;
  let fusions = 0;
  let lostTips = 0;
  let pruned = 0;
  for (let step = 0; step < 1_800; step += 1) {
    const firstResult = stepFilamentTopology(first, 0.04, DEFAULT_FILAMENT_PARAMETERS);
    const secondResult = stepFilamentTopology(second, 0.04, DEFAULT_FILAMENT_PARAMETERS);
    first = firstResult.topology;
    second = secondResult.topology;
    extensions += firstResult.events.extensions;
    branches += firstResult.events.branches;
    fusions += firstResult.events.fusions;
    lostTips += firstResult.events.lostTips;
    pruned += firstResult.events.pruned;
    assertTopologyIsConsistent(first);
  }
  assert.deepEqual(first, second);
  assert.ok(extensions > 0);
  assert.ok(branches > 0);
  assert.ok(fusions > 0);
  assert.ok(lostTips > 0);
  assert.ok(pruned > 0);
  assert.ok(first.nodes.length > 1 && first.filaments.length > 0);
});

test("an introduced nutrient is material state that expires", () => {
  let topology = introduceNutrient(createFilamentTopology(1_200, 760, 44), { x: 920, y: 470 });
  assert.equal(topology.nutrients.length, 1);
  for (let step = 0; step < 1_000; step += 1) {
    topology = stepFilamentTopology(topology, 0.04, DEFAULT_FILAMENT_PARAMETERS).topology;
    assertTopologyIsConsistent(topology);
  }
  assert.equal(topology.nutrients.length, 0);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  createAgentTrailTopology,
  nourishTopology,
  stepAgentTrailTopology,
} from "./model.ts";

function assertTopologyIsConsistent(topology: ReturnType<typeof createAgentTrailTopology>) {
  const nodeIds = new Set(topology.nodes.map((node) => node.id));
  assert.equal(nodeIds.size, topology.nodes.length);
  assert.ok(topology.nodes.every((node) => Number.isFinite(node.store)));
  assert.ok(topology.trails.every(
    (trail) => nodeIds.has(trail.source) && nodeIds.has(trail.target),
  ));
  assert.ok(topology.agents.every(
    (agent) => nodeIds.has(agent.nodeId) &&
      (agent.targetId === null || nodeIds.has(agent.targetId)),
  ));
}

test("the seeded ecology has stable identifiers and connected initial trails", () => {
  const topology = createAgentTrailTopology(1_200, 760);
  assert.equal(topology.nodes.length, 10);
  assert.equal(topology.agents.length, 36);
  assert.ok(topology.trails.length >= topology.nodes.length);
  assertTopologyIsConsistent(topology);
});

test("agent decisions preserve valid topology while nourishment decays", () => {
  let topology = nourishTopology(
    createAgentTrailTopology(1_200, 760),
    { x: 980, y: 540 },
  );
  let totalOutposts = 0;
  for (let step = 0; step < 1_200; step += 1) {
    const result = stepAgentTrailTopology(topology, 1_200, 760, 0.04);
    topology = result.topology;
    totalOutposts += result.events.outposts;
    assertTopologyIsConsistent(topology);
  }
  assert.ok(topology.nodes.length >= 6 && topology.nodes.length <= 30);
  assert.ok(topology.agents.length > 0 && topology.agents.length <= 78);
  assert.ok(totalOutposts > 0);
  assert.equal(topology.nutrients.length, 0);
});

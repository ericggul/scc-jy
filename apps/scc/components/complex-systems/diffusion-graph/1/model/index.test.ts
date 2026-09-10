import assert from "node:assert/strict";
import test from "node:test";
import {
  createDiffusionSimulation,
  diffusionMetrics,
  rewireOneLink,
  stepDiffusion,
  type DiffusionGraph,
  type DiffusionState,
} from "./index.ts";

function twoNodeGraph(active = 1): DiffusionGraph {
  return {
    gridSize: 3,
    nodes: [
      { id: 0, x: -1, y: 0 },
      { id: 1, x: 1, y: 0 },
    ],
    links: [{ id: "0-1", source: 0, target: 1 }],
    outgoingLinkIndices: [[0], []],
    activeLinks: Uint8Array.of(active),
  };
}

function state(values: readonly number[]): DiffusionState {
  return {
    values: Float64Array.from(values),
    nextValues: new Float64Array(values.length),
    flows: new Float64Array(1),
    tick: 0,
    randomState: 0x12345678,
  };
}

test("setup builds NetLogo's directed von Neumann lattice", () => {
  const { graph } = createDiffusionSimulation({ gridSize: 3, linkChance: 100, seed: 4 });
  assert.equal(graph.nodes.length, 9);
  assert.equal(graph.links.length, 24);
  assert.equal(diffusionMetrics(graph, createDiffusionSimulation({ gridSize: 3, linkChance: 100, seed: 4 }).state).activeLinkCount, 24);
});

test("a changed grid size rebuilds the lattice at that size", () => {
  const { graph } = createDiffusionSimulation({ gridSize: 7, linkChance: 100, seed: 4 });
  assert.equal(graph.gridSize, 7);
  assert.equal(graph.nodes.length, 49);
  assert.equal(graph.links.length, 168);
});

test("a node retains its share and divides the rest equally over active out-links", () => {
  const graph = twoNodeGraph();
  const diffusionState = state([10, 0]);
  stepDiffusion(graph, diffusionState, 10);

  assert.deepEqual([...diffusionState.values], [9, 1]);
  assert.deepEqual([...diffusionState.flows], [1]);
  assert.equal(diffusionState.tick, 1);
});

test("a node without active recipients retains all incoming value", () => {
  const graph = twoNodeGraph(0);
  const diffusionState = state([3, 7]);
  stepDiffusion(graph, diffusionState, 100);

  assert.deepEqual([...diffusionState.values], [3, 7]);
  assert.deepEqual([...diffusionState.flows], [0]);
});

test("diffusion conserves total value under repeated persistent rewiring", () => {
  const { graph, state: diffusionState } = createDiffusionSimulation({
    gridSize: 9,
    linkChance: 50,
    seed: 0x5a17c0de,
  });
  const initial = diffusionMetrics(graph, diffusionState);

  for (let tick = 0; tick < 120; tick += 1) {
    rewireOneLink(graph, diffusionState);
    stepDiffusion(graph, diffusionState, 10);
    const metrics = diffusionMetrics(graph, diffusionState);
    assert.ok(Math.abs(metrics.totalValue - initial.totalValue) < 1e-10);
    assert.equal(metrics.activeLinkCount, initial.activeLinkCount);
  }
});

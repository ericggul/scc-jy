import assert from "node:assert/strict";
import test from "node:test";
import {
  createErdosRenyiGraph,
  erdosRenyiMetrics,
} from "./index.ts";

test("a seeded G(n,p) realization replays exactly", () => {
  const first = createErdosRenyiGraph({ nodeCount: 96, probability: 0.014, seed: 731 });
  const second = createErdosRenyiGraph({ nodeCount: 96, probability: 0.014, seed: 731 });
  assert.deepEqual(first, second);
});

test("every sampled edge is one undirected, non-self pair", () => {
  const graph = createErdosRenyiGraph({ nodeCount: 128, probability: 0.03, seed: 44 });
  assert.ok(graph.edges.every((edge) => edge.source < edge.target));
  assert.equal(new Set(graph.edges.map((edge) => edge.id)).size, graph.edges.length);
});

test("p equals zero and one produce their exact limiting graphs", () => {
  const empty = createErdosRenyiGraph({ nodeCount: 12, probability: 0, seed: 4 });
  const complete = createErdosRenyiGraph({ nodeCount: 12, probability: 1, seed: 4 });
  assert.equal(empty.edges.length, 0);
  assert.equal(erdosRenyiMetrics(empty).isolatedCount, 12);
  assert.equal(complete.edges.length, 66);
  assert.equal(erdosRenyiMetrics(complete).largestComponentSize, 12);
});

test("a higher p changes the actual edge budget and component structure", () => {
  const sparse = createErdosRenyiGraph({ nodeCount: 192, probability: 0.002, seed: 83 });
  const dense = createErdosRenyiGraph({ nodeCount: 192, probability: 0.024, seed: 83 });
  const sparseMetrics = erdosRenyiMetrics(sparse);
  const denseMetrics = erdosRenyiMetrics(dense);
  assert.ok(dense.edges.length > sparse.edges.length);
  assert.ok(denseMetrics.largestComponentSize > sparseMetrics.largestComponentSize);
});

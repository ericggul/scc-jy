import assert from "node:assert/strict";
import test from "node:test";
import {
  barabasiAlbertMetrics,
  createBarabasiAlbertGraph,
  growBarabasiAlbertGraph,
  growBarabasiAlbertGraphTo,
} from "./index.ts";

test("the default is the five-node complete, positive-degree seed", () => {
  const graph = createBarabasiAlbertGraph({ seed: 11 });
  assert.equal(graph.nodes.length, 5);
  assert.equal(graph.edges.length, 10);
  assert.deepEqual(graph.degrees, [4, 4, 4, 4, 4]);
  assert.ok(graph.nodes.every((node) => node.bornAt === 0));
});

test("each arrival joins two distinct older vertices with no duplicate edge", () => {
  const seed = createBarabasiAlbertGraph({ seed: 9821 });
  const grown = growBarabasiAlbertGraph(seed);
  const newcomer = grown.nodes.at(-1)!;
  const newcomerEdges = grown.edges.filter((edge) => edge.target === newcomer.id);

  assert.equal(newcomerEdges.length, 2);
  assert.equal(new Set(newcomerEdges.map((edge) => edge.source)).size, 2);
  assert.ok(newcomerEdges.every((edge) => edge.source < newcomer.id));
  assert.equal(new Set(grown.edges.map((edge) => edge.id)).size, grown.edges.length);
});

test("seeded degree-proportional growth replays exactly and produces older hubs", () => {
  const first = growBarabasiAlbertGraphTo(
    createBarabasiAlbertGraph({ seed: 77 }),
    180,
  );
  const second = growBarabasiAlbertGraphTo(
    createBarabasiAlbertGraph({ seed: 77 }),
    180,
  );
  assert.deepEqual(first, second);

  const earlyMean = first.degrees.slice(0, 5).reduce((sum, value) => sum + value, 0) / 5;
  const lateMean = first.degrees.slice(-30).reduce((sum, value) => sum + value, 0) / 30;
  assert.ok(earlyMean > lateMean);
  assert.ok(barabasiAlbertMetrics(first).maximumDegree > 12);
});

test("changing m changes the actual graph density while retaining its simple edges", () => {
  const sparse = growBarabasiAlbertGraphTo(
    createBarabasiAlbertGraph({ attachments: 1, seed: 431 }),
    100,
  );
  const dense = growBarabasiAlbertGraphTo(
    createBarabasiAlbertGraph({ attachments: 4, seed: 431 }),
    100,
  );

  assert.ok(barabasiAlbertMetrics(dense).meanDegree > barabasiAlbertMetrics(sparse).meanDegree);
  assert.ok(dense.edges.length > sparse.edges.length);
  assert.ok(dense.edges.every((edge) => edge.source !== edge.target));
});

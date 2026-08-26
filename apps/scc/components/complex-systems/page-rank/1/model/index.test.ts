import assert from "node:assert/strict";
import test from "node:test";
import {
  createNetwork,
  createExpandedNetwork,
  createPageRankState,
  createPreferentialNetwork,
  pageRankMetrics,
  settleNetwork,
  stepDiffusion,
  stepRandomSurfer,
} from "./index.ts";

test("diffusion keeps rank normalized, including dangling pages", () => {
  const network = {
    nodes: [
      { id: 0, position: { x: 0.2, y: 0.5 } },
      { id: 1, position: { x: 0.5, y: 0.5 } },
      { id: 2, position: { x: 0.8, y: 0.5 } },
    ],
    links: [{ id: "0-1", source: 0, target: 1 }],
  };
  let state = createPageRankState(network, 12, 21);
  for (let iteration = 0; iteration < 80; iteration += 1) {
    state = stepDiffusion(network, state, 0.85);
  }
  const metrics = pageRankMetrics(network, state);
  assert.ok(Math.abs(metrics.totalRank - 1) < 1e-12);
  assert.equal(metrics.danglingPages, 2);
  assert.ok(state.ranks[1]! > state.ranks[0]!);
});

test("the seeded random-surfer ensemble is deterministic and its visit rank is normalized", () => {
  const network = createNetwork({ nodeCount: 64, linksPerNewPage: 3, seed: 441 });
  let first = createPageRankState(network, 320, 837);
  let second = createPageRankState(network, 320, 837);
  for (let iteration = 0; iteration < 90; iteration += 1) {
    first = stepRandomSurfer(network, first, 0.85);
    second = stepRandomSurfer(network, second, 0.85);
  }
  assert.deepEqual(first, second);
  assert.equal(first.visits.reduce((total, visits) => total + visits, 0), 28_800);
  assert.equal(first.surfers.length, 320);
  assert.ok(first.surfers.every((surfer, index) => surfer.id === index));
  assert.ok(Math.abs(pageRankMetrics(network, first).totalRank - 1) < 1e-12);
});

test("watched surfers retain colour and mark only the directed links they traverse", () => {
  const network = createNetwork({ nodeCount: 64, linksPerNewPage: 3, seed: 441 });
  const next = stepRandomSurfer(network, createPageRankState(network, 96, 912), 0.85);
  assert.ok(Object.keys(next.linkColours).length > 0);
  assert.ok(Object.values(next.linkColours).every((colour) => colour >= 0 && colour < 12));
  assert.ok(next.surfers.every((surfer, index) => (
    surfer.id === index && network.nodes.some((page) => page.id === surfer.currentPage)
  )));
});

test("preferential construction is seeded, directed, and does not make self-links", () => {
  const first = createPreferentialNetwork(28, 3, 1234);
  const second = createPreferentialNetwork(28, 3, 1234);
  assert.deepEqual(first, second);
  assert.equal(first.nodes.length, 28);
  assert.ok(first.links.length >= 60);
  assert.ok(first.links.every((current) => current.source !== current.target));
  assert.equal(new Set(first.links.map((current) => current.id)).size, first.links.length);
});

test("the expanded graph distributes its spring layout beyond the central hub", () => {
  const graph = createExpandedNetwork(160, 3, 0x1d872b41);
  const centralPages = graph.nodes.filter((page) => (
    Math.hypot(page.position.x - 0.5, page.position.y - 0.5) < 0.16
  ));
  const outerPages = graph.nodes.filter((page) => (
    Math.hypot(page.position.x - 0.5, page.position.y - 0.5) > 0.32
  ));
  assert.ok(centralPages.length < 60);
  assert.ok(outerPages.length > 25);
});

test("the spring layout is seeded, bounded, and does not pin a dense graph to its edges", () => {
  const graph = createNetwork({ nodeCount: 100, linksPerNewPage: 2 });
  const first = settleNetwork(graph, 553, 40);
  const second = settleNetwork(graph, 553, 40);
  assert.deepEqual(first, second);
  assert.ok(first.nodes.every((page) => (
    Number.isFinite(page.position.x) && Number.isFinite(page.position.y) &&
    page.position.x >= 0.05 && page.position.x <= 0.95 &&
    page.position.y >= 0.05 && page.position.y <= 0.95
  )));
  assert.ok(first.nodes.filter((page) => page.position.x < 0.065 || page.position.x > 0.935).length < 8);
  assert.ok(first.nodes.filter((page) => page.position.y < 0.065 || page.position.y > 0.935).length < 8);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  createGridAdaptiveNetwork,
  DEFAULT_GRID_DIMENSION,
  DEFAULT_GRID_PARAMETERS,
  introduceGridSusceptibility,
  stepGridAdaptiveNetwork,
} from "./model.ts";

function assertNetworkIsConsistent(network: ReturnType<typeof createGridAdaptiveNetwork>) {
  assert.equal(network.sites.length, network.dimension ** 2);
  const sites = new Map(network.sites.map((site) => [site.id, site]));
  const keys = new Set<string>();
  for (const relation of network.relations) {
    const source = sites.get(relation.source);
    const target = sites.get(relation.target);
    assert.ok(source && target);
    assert.notEqual(source.state, "inactive");
    assert.notEqual(target.state, "inactive");
    const key = [relation.source, relation.target].sort((left, right) => left - right).join(":");
    assert.ok(!keys.has(key));
    keys.add(key);
  }
  for (const site of network.sites) {
    assert.ok(site.row >= 0 && site.row < network.dimension);
    assert.ok(site.column >= 0 && site.column < network.dimension);
    assert.equal(site.id, site.row * network.dimension + site.column + 1);
  }
}

test("the default lattice seeds 648 active vertices and a denser local graph", () => {
  const network = createGridAdaptiveNetwork();
  assert.equal(network.dimension, DEFAULT_GRID_DIMENSION);
  const active = network.sites.filter((site) => site.state !== "inactive").length;
  assert.equal(active, 648);
  assert.ok(network.relations.length > active * 2);
});

test("all possible vertices stay on a deterministic N by N grid", () => {
  let first = createGridAdaptiveNetwork(30, 41);
  let second = createGridAdaptiveNetwork(30, 41);
  for (let step = 0; step < 1_200; step += 1) {
    first = stepGridAdaptiveNetwork(first, 0.04, DEFAULT_GRID_PARAMETERS).network;
    second = stepGridAdaptiveNetwork(second, 0.04, DEFAULT_GRID_PARAMETERS).network;
    assertNetworkIsConsistent(first);
  }
  assert.deepEqual(first, second);
  assert.ok(first.sites.some((site) => site.state === "inactive"));
  assert.ok(first.sites.some((site) => site.state !== "inactive"));
});

test("entry and departure change which fixed grid sites are active", () => {
  let network = createGridAdaptiveNetwork(32, 93);
  const initialActive = new Set(network.sites.filter((site) => site.state !== "inactive").map((site) => site.id));
  let activated = 0;
  let deactivated = 0;
  for (let step = 0; step < 1_800; step += 1) {
    const result = stepGridAdaptiveNetwork(network, 0.04, DEFAULT_GRID_PARAMETERS);
    network = result.network;
    activated += result.events.activated;
    deactivated += result.events.deactivated;
    assertNetworkIsConsistent(network);
  }
  assert.ok(activated > 0);
  assert.ok(deactivated > 0);
  assert.ok(network.sites.some((site) => site.state !== "inactive" && !initialActive.has(site.id)));
});

test("state-dependent rewiring changes grid-edge endpoints", () => {
  let fixed = createGridAdaptiveNetwork(30, 311);
  let adaptive = fixed;
  let rewired = 0;
  for (let step = 0; step < 900; step += 1) {
    fixed = stepGridAdaptiveNetwork(fixed, 0.04, {
      ...DEFAULT_GRID_PARAMETERS,
      rewiring: 0,
      activation: 0,
      turnover: 0,
    }).network;
    const result = stepGridAdaptiveNetwork(adaptive, 0.04, {
      ...DEFAULT_GRID_PARAMETERS,
      activation: 0,
      turnover: 0,
    });
    adaptive = result.network;
    rewired += result.events.rewired;
  }
  assert.ok(rewired > 0);
  assert.notDeepEqual(
    adaptive.relations.map((relation) => [relation.source, relation.target]),
    fixed.relations.map((relation) => [relation.source, relation.target]),
  );
});

test("a direct grid intervention activates or sensitizes one candidate site", () => {
  const network = createGridAdaptiveNetwork(30, 7);
  const next = introduceGridSusceptibility(network, 15, 15);
  const target = next.sites.find((site) => site.row === 15 && site.column === 15);
  assert.equal(target?.state, "S");
});

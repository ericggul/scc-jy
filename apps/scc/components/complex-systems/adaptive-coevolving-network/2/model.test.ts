import assert from "node:assert/strict";
import test from "node:test";
import {
  createCoevolvingExchangeNetwork,
  DEFAULT_COEVOLUTION_PARAMETERS,
  introduceSusceptibility,
  stepCoevolvingExchangeNetwork,
} from "./model.ts";

function assertNetworkIsConsistent(
  network: ReturnType<typeof createCoevolvingExchangeNetwork>,
) {
  const ids = new Set(network.agents.map((agent) => agent.id));
  const relationKeys = new Set<string>();
  for (const relation of network.relations) {
    assert.ok(ids.has(relation.source));
    assert.ok(ids.has(relation.target));
    assert.notEqual(relation.source, relation.target);
    const key = [relation.source, relation.target].sort((left, right) => left - right).join(":");
    assert.ok(!relationKeys.has(key));
    relationKeys.add(key);
  }
}

test("open adaptive network is seeded, bounded, and deterministic", () => {
  let first = createCoevolvingExchangeNetwork(1_200, 760, 177);
  let second = createCoevolvingExchangeNetwork(1_200, 760, 177);
  for (let step = 0; step < 600; step += 1) {
    first = stepCoevolvingExchangeNetwork(first, 0.04, DEFAULT_COEVOLUTION_PARAMETERS).network;
    second = stepCoevolvingExchangeNetwork(second, 0.04, DEFAULT_COEVOLUTION_PARAMETERS).network;
    assertNetworkIsConsistent(first);
  }
  assert.deepEqual(first, second);
  assert.ok(first.agents.length >= 28 && first.agents.length <= 136);
});

test("birth and death change the vertex set, carrying incident edges with them", () => {
  let network = createCoevolvingExchangeNetwork(1_200, 760, 91);
  const initialIds = new Set(network.agents.map((agent) => agent.id));
  let entries = 0;
  let exits = 0;
  for (let step = 0; step < 1_800; step += 1) {
    const result = stepCoevolvingExchangeNetwork(network, 0.04, DEFAULT_COEVOLUTION_PARAMETERS);
    network = result.network;
    entries += result.events.entries;
    exits += result.events.exits;
    assertNetworkIsConsistent(network);
  }
  assert.ok(entries > 0);
  assert.ok(exits > 0);
  assert.ok(network.agents.some((agent) => !initialIds.has(agent.id)));
});

test("state-dependent rewiring changes relation endpoints", () => {
  const initial = createCoevolvingExchangeNetwork(1_200, 760, 311);
  let fixed = initial;
  let adaptive = initial;
  let rewires = 0;
  for (let step = 0; step < 600; step += 1) {
    fixed = stepCoevolvingExchangeNetwork(fixed, 0.04, {
      ...DEFAULT_COEVOLUTION_PARAMETERS,
      rewiring: 0,
      entry: 0,
      turnover: 0,
    }).network;
    const result = stepCoevolvingExchangeNetwork(adaptive, 0.04, {
      ...DEFAULT_COEVOLUTION_PARAMETERS,
      entry: 0,
      turnover: 0,
    });
    adaptive = result.network;
    rewires += result.events.rewires;
  }
  assert.ok(rewires > 0);
  assert.notDeepEqual(
    adaptive.relations.map((relation) => [relation.source, relation.target]),
    fixed.relations.map((relation) => [relation.source, relation.target]),
  );
});

test("participant susceptibility intervention changes only nearby non-susceptible nodes", () => {
  const network = createCoevolvingExchangeNetwork(1_200, 760, 17);
  const next = introduceSusceptibility(network, { x: 600, y: 380 }, 90);
  const changed = next.agents.filter((agent, index) => agent.state !== network.agents[index]?.state);
  assert.ok(changed.length > 0);
  assert.ok(changed.every((agent) => Math.hypot(agent.x - 600, agent.y - 380) <= 90));
});

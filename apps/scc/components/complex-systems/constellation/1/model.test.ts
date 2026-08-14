import assert from "node:assert/strict";
import test from "node:test";
import {
  createConstellationState,
  DEFAULT_CONSTELLATION_PARAMETERS,
  getConstellationMetrics,
  stepConstellation,
  supplyResource,
  type ConstellationState,
} from "./model.ts";
import { approachStarRadius, starRadiusFromEnergy } from "./visual.ts";

function assertConsistent(state: ConstellationState) {
  const starIds = new Set(state.stars.map((star) => star.id));
  const relationIds = new Set(state.relations.map((relation) => relation.id));
  const relationPairs = new Set<string>();
  assert.equal(starIds.size, state.stars.length);
  assert.equal(relationIds.size, state.relations.length);
  assert.ok(state.resource.every((value) => Number.isFinite(value) && value >= 0));
  for (const star of state.stars) {
    assert.ok(Number.isFinite(star.energy) && star.energy >= 0);
    assert.ok(star.x >= 0 && star.x <= 1 && star.y >= 0 && star.y <= 1);
  }
  for (const relation of state.relations) {
    assert.ok(starIds.has(relation.source) && starIds.has(relation.target));
    assert.notEqual(relation.source, relation.target);
    assert.ok(relation.strength > 0 && relation.strength <= 1);
    const pair = relation.source < relation.target
      ? `${relation.source}:${relation.target}`
      : `${relation.target}:${relation.source}`;
    assert.ok(!relationPairs.has(pair));
    relationPairs.add(pair);
  }
}

test("the seeded field is deterministic and structurally valid", () => {
  const first = createConstellationState(1729);
  const second = createConstellationState(1729);
  assert.deepEqual(first, second);
  assert.equal(first.stars.length, 44);
  assert.ok(first.relations.length > 0);
  assertConsistent(first);
  assert.deepEqual(
    stepConstellation(first, 0.04),
    stepConstellation(second, 0.04),
  );
});

test("resource intervention changes only the finite local resource field", () => {
  const initial = createConstellationState(91);
  const before = getConstellationMetrics(initial).resource;
  const supplied = supplyResource(initial, { x: 0.82, y: 0.18 });
  assert.equal(supplied.stars, initial.stars);
  assert.equal(supplied.relations, initial.relations);
  assert.ok(getConstellationMetrics(supplied).resource > before);
  assert.deepEqual(initial, createConstellationState(91));
});

test("energy sizing differentiates stars and converges smoothly", () => {
  const depleted = starRadiusFromEnergy(0.08, true);
  const abundant = starRadiusFromEnergy(0.96, true);
  assert.ok(abundant > depleted * 2);
  assert.equal(
    starRadiusFromEnergy(0.08, false),
    starRadiusFromEnergy(0.96, false),
  );
  const firstExpansion = approachStarRadius(depleted, abundant, 0.04);
  assert.ok(firstExpansion > depleted && firstExpansion < abundant);
});

test("measured energy flow narrows endpoint inequality and reinforces its relation", () => {
  const state = createConstellationState(7331);
  const relation = state.relations[0];
  assert.ok(relation);
  const source = state.stars.find((star) => star.id === relation.source);
  const target = state.stars.find((star) => star.id === relation.target);
  assert.ok(source && target);
  source.energy = 0.96;
  target.energy = 0.16;
  relation.strength = 0.48;
  const initialDifference = source.energy - target.energy;
  const initialStrength = relation.strength;

  const next = stepConstellation(state, 0.05).state;
  const nextSource = next.stars.find((star) => star.id === relation.source);
  const nextTarget = next.stars.find((star) => star.id === relation.target);
  const nextRelation = next.relations.find((edge) => edge.id === relation.id);
  assert.ok(nextSource && nextTarget && nextRelation);
  assert.ok(nextSource.energy - nextTarget.energy < initialDifference);
  assert.ok(nextRelation.strength > initialStrength);
  assert.ok(nextRelation.flow > 0);
});

test("resource regeneration control changes the same seeded trajectory", () => {
  let slow = createConstellationState(4401);
  let fast = createConstellationState(4401);
  for (let index = 0; index < 500; index += 1) {
    slow = stepConstellation(slow, 0.04, {
      ...DEFAULT_CONSTELLATION_PARAMETERS,
      resourceRegeneration: 0,
    }).state;
    fast = stepConstellation(fast, 0.04, {
      ...DEFAULT_CONSTELLATION_PARAMETERS,
      resourceRegeneration: 0.06,
    }).state;
  }
  assert.ok(
    getConstellationMetrics(fast).resource >
      getConstellationMetrics(slow).resource,
  );
});

test("co-evolution turns over nodes and relations without invalid references", () => {
  let state = supplyResource(
    createConstellationState(0xabc123),
    { x: 0.74, y: 0.64 },
    7,
  );
  const totals = { births: 0, deaths: 0, formed: 0, severed: 0 };
  for (let index = 0; index < 6_000; index += 1) {
    const result = stepConstellation(state, 0.04);
    state = result.state;
    totals.births += result.events.births;
    totals.deaths += result.events.deaths;
    totals.formed += result.events.formed;
    totals.severed += result.events.severed;
    assertConsistent(state);
  }
  assert.ok(totals.births > 0, "expected energy-funded birth");
  assert.ok(totals.deaths > 0, "expected starvation or age death");
  assert.ok(totals.formed > 0, "expected local relation formation");
  assert.ok(totals.severed > 0, "expected unused relation decay");
  assert.ok(state.stars.length <= 132);
});

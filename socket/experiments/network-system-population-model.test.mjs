import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_POPULATION_AGE,
  annualTransitionProbabilities,
  applyPopulationIntervention,
  createPopulationRuntime,
  populationCounts,
  snapshotPopulationRuntime,
  stepPopulationRuntime,
} from "./network-system-population-model.mjs";

function clearLivingStocks(runtime) {
  runtime.stocks.juvenile.fill(0);
  runtime.stocks.single.fill(0);
  runtime.stocks.partnered.fill(0);
}

test("initial population is 200 living people represented by fixed cohorts", () => {
  const runtime = createPopulationRuntime(0, "test");
  const counts = populationCounts(runtime.stocks);
  assert.equal(counts.juvenile, 36);
  assert.equal(counts.single, 68);
  assert.equal(counts.partnered, 96);
  assert.equal(counts.deceased, 0);
  assert.equal(runtime.stocks.juvenile.length, MAX_POPULATION_AGE + 1);
});

test("juvenile cohorts mature after the configured holding time", () => {
  const runtime = createPopulationRuntime(0, "test");
  clearLivingStocks(runtime);
  runtime.stocks.juvenile[17] = 10;
  runtime.parameters.unionMultiplier = 0;
  runtime.parameters.birthsPerHundredCoupleYears = 0;
  stepPopulationRuntime(runtime, 1_000);
  const snapshot = snapshotPopulationRuntime(runtime);
  assert.equal(snapshot.counts.juvenile, 0);
  assert.ok(snapshot.edgeFlows["juvenile-to-single"] > 9.9);
  assert.ok(snapshot.counts.single > 9.9);
});

test("birth is the partnered-to-juvenile flow and does not consume partnered stock", () => {
  const runtime = createPopulationRuntime(0, "test");
  clearLivingStocks(runtime);
  runtime.stocks.partnered[29] = 100;
  runtime.parameters.separationMultiplier = 0;
  runtime.parameters.partneredMortalityMultiplier = 0.25;
  stepPopulationRuntime(runtime, 1_000);
  const snapshot = snapshotPopulationRuntime(runtime);
  assert.ok(snapshot.edgeFlows["partnered-to-juvenile"] > 0);
  assert.equal(snapshot.cohorts.juvenile[0], snapshot.edgeFlows["partnered-to-juvenile"]);
  assert.ok(snapshot.counts.partnered > 99);
});

test("stay plus visible transitions always conserves annual probability", () => {
  const runtime = createPopulationRuntime(0, "test");
  runtime.parameters.juvenileMortalityMultiplier = 4;
  runtime.parameters.singleMortalityMultiplier = 4;
  runtime.parameters.partneredMortalityMultiplier = 4;
  runtime.parameters.unionMultiplier = 3;
  runtime.parameters.separationMultiplier = 3;
  for (const state of ["juvenile", "single", "partnered", "deceased"]) {
    for (let age = 0; age <= MAX_POPULATION_AGE; age += 1) {
      const probabilities = annualTransitionProbabilities(state, age, runtime.parameters);
      assert.ok(probabilities.stay >= 0);
      assert.ok(probabilities.death >= 0);
      assert.ok(probabilities.stateChange >= 0);
      assert.ok(Math.abs(probabilities.stay + probabilities.death + probabilities.stateChange - 1) < 1e-10);
    }
  }
});

test("stock and rate interventions remain bounded and never create negative population", () => {
  const runtime = createPopulationRuntime(0, "test");
  applyPopulationIntervention(runtime, { kind: "population", state: "single", amount: 5 }, 1);
  assert.equal(Math.round(populationCounts(runtime.stocks).single), 73);
  for (let index = 0; index < 20; index += 1) {
    applyPopulationIntervention(runtime, { kind: "population", state: "juvenile", amount: -5 }, index + 2);
  }
  assert.ok(populationCounts(runtime.stocks).juvenile >= 0);
  applyPopulationIntervention(runtime, { kind: "parameter", parameter: "unionMultiplier", amount: 100 }, 30);
  assert.equal(runtime.parameters.unionMultiplier, 3);
});

test("population scale does not change model dimensions", () => {
  const small = createPopulationRuntime(0, "small");
  const large = createPopulationRuntime(0, "large");
  for (const state of ["juvenile", "single", "partnered"]) {
    large.stocks[state] = large.stocks[state].map((value) => value * 50);
  }
  stepPopulationRuntime(small, 1_000);
  stepPopulationRuntime(large, 1_000);
  assert.equal(Math.round(snapshotPopulationRuntime(large).livingPopulation / snapshotPopulationRuntime(small).livingPopulation), 50);
  assert.deepEqual(
    Object.values(snapshotPopulationRuntime(large).cohorts).map((cohorts) => cohorts.length),
    Object.values(snapshotPopulationRuntime(small).cohorts).map((cohorts) => cohorts.length),
  );
});

test("500 annual steps stay finite and serializable", () => {
  const runtime = createPopulationRuntime(0, "test");
  for (let year = 1; year <= 500; year += 1) stepPopulationRuntime(runtime, year * 1_000);
  const snapshot = snapshotPopulationRuntime(runtime);
  assert.equal(snapshot.year, 500);
  assert.ok(Object.values(snapshot.counts).every(Number.isFinite));
  assert.doesNotThrow(() => JSON.stringify(snapshot));
});

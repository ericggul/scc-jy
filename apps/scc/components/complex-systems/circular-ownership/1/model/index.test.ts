import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTIVE_THRESHOLD,
  advanceSimulation,
  analyseSimulation,
  companies,
  createSimulationState,
  relations,
  simulationMetrics,
} from "./index.ts";

function evolve(pressure: number, steps = 600) {
  let state = createSimulationState();
  const activeCounts: number[] = [];
  for (let index = 0; index < steps; index += 1) {
    state = advanceSimulation(state, pressure, 0.035);
    if (index % 20 === 0) activeCounts.push(simulationMetrics(state).activeRelations);
  }
  return { state, activeCounts };
}

test("the simulacrum has a 63-company roster and a matrix denser than a chain", () => {
  assert.ok(companies.length >= 50, "the simulacrum must use at least fifty actual affiliate names");
  assert.equal(companies.length, 63, "the selected roster mirrors the 63-company disclosure roster");
  assert.ok(relations.length > companies.length, "the direct-holding matrix must be denser than a simple chain");
});

test("fixed conditions replay exactly while holdings and potentials remain bounded", () => {
  const first = evolve(0.62);
  const replay = evolve(0.62);
  assert.deepEqual(first.state, replay.state, "fixed initial conditions must replay deterministically");
  assert.ok(new Set(first.activeCounts).size > 3, "links must cross the active threshold during the run");
  for (const value of Object.values(first.state.capacities)) {
    assert.ok(value >= 0.2 && value <= 1, "circulation potential must stay bounded");
  }
  for (const value of Object.values(first.state.stakes)) {
    assert.ok(value >= 0 && value <= 0.16, "virtual holdings must stay bounded");
  }
});

test("loop pressure changes the live topology rather than choosing a dated snapshot", () => {
  const lowPressure = evolve(0.1);
  const highPressure = evolve(0.9);
  const low = simulationMetrics(lowPressure.state, analyseSimulation(lowPressure.state));
  const high = simulationMetrics(highPressure.state, analyseSimulation(highPressure.state));
  assert.ok(high.activeRelations > low.activeRelations, "higher loop pressure must activate more direct relations");
  assert.ok(high.recurrentRelations > low.recurrentRelations, "higher loop pressure must intensify return paths");
  assert.ok(
    Object.values(highPressure.state.stakes).some((value) => value >= ACTIVE_THRESHOLD),
    "the high-pressure system must retain visible simulated holdings",
  );
});

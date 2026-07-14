import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCycleIntervention,
  createCycleRuntime,
  cycleModelIds,
  resetCycle,
  snapshotCycle,
  stepCycle,
} from "./network-system-cycle-model.mjs";

function run(runtime, ticks) {
  const production = [];
  const growth = [];
  for (let tick = 0; tick < ticks; tick += 1) {
    stepCycle(runtime, tick * 100);
    production.push(runtime.values.production);
    growth.push(runtime.gdpGrowth);
  }
  return { production, growth };
}

function range(values) {
  return Math.max(...values) - Math.min(...values);
}

test("cycle owns a nine-node, twenty-two-edge directed economy", () => {
  assert.equal(cycleModelIds.nodeIds.length, 9);
  assert.equal(cycleModelIds.edgeIds.length, 22);
  assert.ok(cycleModelIds.nodeIds.includes("production"));
  assert.ok(cycleModelIds.edgeIds.includes("inventories-to-production"));
});

test("default calibration produces a bounded persistent business cycle", () => {
  const runtime = createCycleRuntime(0, "cycle-test");
  const { production, growth } = run(runtime, 5000);
  const lateProduction = production.slice(3000);
  const lateGrowth = growth.slice(3000);

  assert.ok(range(lateProduction) > 1);
  assert.ok(Math.min(...lateGrowth) < -2);
  assert.ok(Math.max(...lateGrowth) > 2);
  assert.ok(Object.values(runtime.values).every(Number.isFinite));
  assert.ok(Object.values(runtime.values).every((value) => Math.abs(value) <= 100));
});

test("removing directed propagation lets the economy decay toward equilibrium", () => {
  const runtime = createCycleRuntime(0, "equilibrium-test");
  for (const edgeId of cycleModelIds.edgeIds) runtime.edgeWeights[edgeId] = 0;
  run(runtime, 1200);

  assert.ok(Object.values(runtime.values).every((value) => Math.abs(value) < 0.001));
  assert.ok(Math.abs(runtime.gdpGrowth) < 0.001);
});

test("large edge weights permit abnormal plus and minus sixty-percent GDP", () => {
  const runtime = createCycleRuntime(0, "abnormal-test");
  Object.assign(runtime.edgeWeights, {
    "demand-to-production": 10,
    "production-to-inventories": 20,
    "demand-to-inventories": 20,
    "inventories-to-production": 20,
  });
  const { growth } = run(runtime, 1600);

  assert.ok(Math.min(...growth) < -60);
  assert.ok(Math.max(...growth) > 60);
});

test("GDP growth is derived from production history rather than a display regime", () => {
  const runtime = createCycleRuntime(0, "gdp-test");
  for (const edgeId of cycleModelIds.edgeIds) runtime.edgeWeights[edgeId] = 0;
  applyCycleIntervention(runtime, {
    kind: "node-shock",
    nodeId: "production",
    amount: 1,
  });
  run(runtime, 40);

  assert.ok(runtime.gdpGrowth < 0);
  assert.equal(typeof snapshotCycle(runtime).gdpGrowth, "number");
});

test("node shocks and individual edge weights are independent and resettable", () => {
  const runtime = createCycleRuntime(0, "intervention-test");
  const otherWeight = runtime.edgeWeights["credit-to-demand"];

  assert.equal(applyCycleIntervention(runtime, {
    kind: "edge-weight",
    edgeId: "demand-to-production",
    amount: 1,
  }), true);
  assert.equal(runtime.edgeWeights["demand-to-production"], 1.65);
  assert.equal(runtime.edgeWeights["credit-to-demand"], otherWeight);
  assert.equal(applyCycleIntervention(runtime, {
    kind: "node-shock",
    nodeId: "credit",
    amount: -1,
  }), true);
  assert.equal(runtime.lastIntervention.nodeId, "credit");

  resetCycle(runtime, 200);
  assert.equal(runtime.edgeWeights["demand-to-production"], 1.15);
  assert.equal(runtime.lastIntervention, null);
});

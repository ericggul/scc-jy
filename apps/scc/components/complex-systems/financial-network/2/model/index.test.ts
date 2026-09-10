import assert from "node:assert/strict";
import test from "node:test";
import {
  applyLiquidityShock,
  createFinancialNetwork,
  stepFinancialNetwork,
  summarizeNetwork,
} from "./index.ts";

function advance(state: ReturnType<typeof createFinancialNetwork>, seconds: number) {
  for (let elapsed = 0; elapsed < seconds; elapsed += 0.25) {
    stepFinancialNetwork(state, Math.min(0.25, seconds - elapsed));
  }
}

test("builds the agreed six-kind economy and its live payment circuit", () => {
  const state = createFinancialNetwork();
  const total = (kind: string) => state.actors.filter((actor) => actor.kind === kind).length;
  assert.equal(total("household"), 20);
  assert.equal(total("firm"), 10);
  assert.equal(total("bank"), 4);
  assert.equal(total("fund"), 4);
  assert.equal(total("treasury"), 1);
  assert.equal(total("central-bank"), 1);
  advance(state, 2);
  assert.ok(state.relations.some((relation) => relation.kind === "wage" && relation.actual > 2.2));
  assert.ok(state.relations.some((relation) => relation.kind === "refinancing" && relation.actual > 0.1));
});

test("normal circulation fluctuates without an autonomous fracture", () => {
  const state = createFinancialNetwork();
  const observed: number[] = [];
  for (let elapsed = 0; elapsed < 18; elapsed += 0.5) {
    stepFinancialNetwork(state, 0.5);
    observed.push(state.paymentIndex);
  }
  assert.equal(state.actors.some((actor) => actor.fractured), false);
  assert.ok(Math.max(...observed) - Math.min(...observed) > 0.015);
  assert.ok(state.paymentIndex > 0.93 && state.paymentIndex < 1.07);
  assert.ok(state.assetPrice > 0.98);
});

test("a brief local liquidity seizure is absorbed by the normal circuit", () => {
  const state = createFinancialNetwork();
  applyLiquidityShock(state, "firm-1", 0.35, "brief");
  advance(state, 15);
  const summary = summarizeNetwork(state);
  assert.equal(summary.fractured, 0);
  assert.ok(summary.paymentIndex > 0.86);
  assert.ok(summary.refinancingIndex > 0.7);
});

test("persistent overlapping shocks alter remote wages through the payment network", () => {
  const state = createFinancialNetwork();
  applyLiquidityShock(state, "firm-1", 0.78, "persistent");
  applyLiquidityShock(state, "bank-1", 0.68, "persistent");
  applyLiquidityShock(state, "fund-1", 0.72, "persistent");
  advance(state, 28);
  const remoteWage = state.relations.find(
    (relation) => relation.id === "wage:firm-5:household-9",
  );
  assert.ok(remoteWage);
  assert.ok(remoteWage.actual < remoteWage.baseline * 0.85);
  assert.ok(state.assetPrice < 0.96);
  assert.ok(summarizeNetwork(state).refinancingIndex < 0.8);
});

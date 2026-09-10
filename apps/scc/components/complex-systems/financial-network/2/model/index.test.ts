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

test("builds a compact macro-financial economy with every ledger channel live", () => {
  const state = createFinancialNetwork();
  const total = (kind: string) => state.actors.filter((actor) => actor.kind === kind).length;
  assert.equal(total("household"), 8);
  assert.equal(total("firm"), 8);
  assert.equal(total("bank"), 4);
  assert.equal(total("fund"), 4);
  assert.equal(total("treasury"), 1);
  assert.equal(total("central-bank"), 1);
  assert.equal(state.actors.length, 26);
  advance(state, 2);
  assert.ok(state.relations.some((relation) => relation.kind === "wage" && relation.actual > 2.2));
  assert.ok(state.relations.some((relation) => relation.kind === "refinancing" && relation.actual > 0.1));
  assert.ok(state.relations.some((relation) => relation.kind === "supplier-payment" && relation.actual > 0.1));
  assert.ok(state.relations.some((relation) => relation.kind === "interbank-funding" && relation.actual > 0.1));
  assert.ok(state.relations.some((relation) => relation.kind === "interbank-credit" && relation.outstanding > 0));
  assert.ok(state.relations.some((relation) => relation.kind === "central-bank-facility"));
});

test("builds the 20-sector circular preset without collapsing its ledger channels", () => {
  const state = createFinancialNetwork("expanded");
  const total = (kind: string) => state.actors.filter((actor) => actor.kind === kind).length;
  assert.equal(state.preset, "expanded");
  assert.equal(total("household"), 40);
  assert.equal(total("firm"), 20);
  assert.equal(total("bank"), 6);
  assert.equal(total("fund"), 4);
  assert.equal(state.actors.length, 72);
  assert.equal(state.relations.filter((relation) => relation.layer === "payment").length, 262);
  assert.equal(state.relations.filter((relation) => relation.layer === "claim").length, 87);
  assert.equal(state.relations.filter((relation) => relation.layer === "facility").length, 4);
  assert.equal(
    state.relations
      .filter((relation) => relation.kind === "wage" && relation.from === "firm-1")
      .reduce((total, relation) => total + relation.baseline, 0),
    3.28,
  );
  assert.equal(
    state.relations
      .filter((relation) => relation.kind === "deposit-stock" && relation.to === "household-1")
      .reduce((total, relation) => total + relation.outstanding, 0),
    38,
  );
  advance(state, 2);
  assert.ok(state.relations.some((relation) => relation.id === "wage:firm-20:household-40" && relation.actual > 1));
  assert.ok(state.relations.some((relation) => relation.id === "interbank-funding:bank-3:bank-4" && relation.actual > 0.1));
  assert.equal(state.actors.some((actor) => actor.fractured), false);
});

test("the 20-sector preset sustains a normal circulating economy", () => {
  const state = createFinancialNetwork("expanded");
  advance(state, 30);
  const summary = summarizeNetwork(state);
  assert.equal(summary.fractured, 0);
  assert.ok(summary.paymentIndex > 0.9 && summary.paymentIndex < 1.07);
  assert.ok(summary.refinancingIndex > 0.85);
  assert.ok(summary.assetPrice > 0.98);
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
  assert.ok(state.paymentIndex > 0.84 && state.paymentIndex < 1.07);
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

test("a local persistent seizure propagates through receipts, bank credit and supplier wages", () => {
  const state = createFinancialNetwork();
  applyLiquidityShock(state, "firm-1", 0.78, "persistent");
  advance(state, 12);
  const remoteWage = state.relations.find(
    (relation) => relation.id === "wage:firm-3:household-3",
  );
  assert.ok(remoteWage);
  assert.ok(remoteWage.actual < remoteWage.baseline * 0.85);
  assert.ok(state.assetPrice < 0.96);
  assert.ok(summarizeNetwork(state).refinancingIndex < 0.8);
  assert.ok((state.actors.find((actor) => actor.id === "bank-1")?.stress ?? 0) > 0.2);
});

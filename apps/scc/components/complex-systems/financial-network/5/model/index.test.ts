import assert from "node:assert/strict";
import test from "node:test";
import { bankBalanceError, createEconomy, setFrozen, stepEconomy, type Economy } from "./index.ts";
import { graphLayout } from "../rendering/field.ts";

const stepFor = (state: Economy, seconds: number, dt = 1) => {
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += dt) stepEconomy(state, Math.min(dt, seconds - elapsed));
};

const loanArrears = (state: Economy) => state.edges
  .filter((item) => item.kind === "loan")
  .reduce((sum, item) => sum + item.arrears, 0);

test("constructs the agreed six-sector economy with payer-to-payee debt edges", () => {
  const state = createEconomy();
  const count = (sector: string) => state.nodes.filter((node) => node.sector === sector).length;
  assert.equal(count("household"), 20);
  assert.equal(count("firm"), 10);
  assert.equal(count("bank"), 4);
  assert.equal(count("fund"), 4);
  assert.equal(count("treasury"), 1);
  assert.equal(count("centralBank"), 1);
  assert.ok(state.nodes.every((node) => node.community >= 0 && node.community <= 3));
  assert.ok(state.edges.filter((item) => item.kind === "loan").every((item) => item.from.startsWith("firm-") && item.to.startsWith("bank-")));
});

test("resolves the 200-person economy into diversified, individually settling households", () => {
  const state = createEconomy("expanded");
  const count = (sector: string) => state.nodes.filter((node) => node.sector === sector).length;
  assert.equal(count("household"), 200);
  assert.equal(count("firm"), 20);
  assert.equal(count("bank"), 6);
  assert.equal(count("fund"), 4);
  assert.equal(state.nodes.length, 232);
  assert.equal(state.edges.length, 1_068);
  assert.equal(state.edges.filter((edge) => edge.kind === "wage" && edge.from === "firm-1").reduce((sum, edge) => sum + edge.principal, 0), 6);
  const firmOneDemand = state.edges.filter((edge) => edge.kind === "consumption" && edge.to === "firm-1").reduce((sum, edge) => sum + edge.principal, 0);
  const householdOneDemand = state.edges.filter((edge) => edge.kind === "consumption" && edge.from === "household-1" && edge.to === "firm-1").reduce((sum, edge) => sum + edge.principal, 0);
  assert.ok(Math.abs(householdOneDemand / firmOneDemand - 0.05) < 1e-10, "one household should supply only 5% of either firm's consumer demand");
  const points = graphLayout(state.nodes);
  const householdPoints = state.nodes.filter((node) => node.sector === "household").map((node) => points.get(node.id)!);
  assert.equal(new Set(householdPoints.map((point) => `${point.x}:${point.y}`)).size, 200);
  assert.equal(householdPoints.filter((point) => point.x < 400).length, 100);
  assert.equal(householdPoints.filter((point) => point.x > 1_200).length, 100);
});

test("one household bankruptcy remains a local loss in the 200-person economy", () => {
  const healthy = createEconomy("expanded");
  const failed = createEconomy("expanded");
  const household = failed.nodes.find((node) => node.id === "household-1");
  assert.ok(household);
  household.defaulted = true;
  stepFor(healthy, 120, 1 / 24);
  stepFor(failed, 120, 1 / 24);
  assert.deepEqual(failed.nodes.filter((node) => node.defaulted).map((node) => node.id), ["household-1"]);
  assert.equal(failed.price, 1);
  const healthyDemand = healthy.edges.filter((edge) => edge.kind === "consumption" && edge.to === "firm-1").reduce((sum, edge) => sum + edge.flow, 0);
  const failedDemand = failed.edges.filter((edge) => edge.kind === "consumption" && edge.to === "firm-1").reduce((sum, edge) => sum + edge.flow, 0);
  assert.ok(failedDemand / healthyDemand > 0.94 && failedDemand / healthyDemand < 0.96, "one failed household should remove about 5% of its receiving firm's demand");
  for (const bank of failed.nodes.filter((node) => node.sector === "bank")) assert.ok(Math.abs(bankBalanceError(failed, bank.id)) < 1e-7);
});

test("baseline remains viable for 10,000 periods without autonomous distress", () => {
  const state = createEconomy();
  const initialCash = new Map(state.nodes.map((node) => [node.id, node.cash]));
  const initialLoans = new Map(state.edges.filter((item) => item.kind === "loan").map((item) => [item.id, item.principal]));
  const initialBanks = new Map(state.nodes.filter((node) => node.sector === "firm").map((node) => [node.id, node.bankId]));
  const initialPaymentEndpoints = new Map(state.edges.filter((edge) => edge.kind === "wage" || edge.kind === "consumption").map((edge) => [edge.id, `${edge.from}:${edge.to}`]));
  const initialCentralBankCash = state.nodes.find((node) => node.id === "central-bank")?.cash;
  stepFor(state, 10_000);
  assert.equal(state.nodes.some((node) => node.defaulted), false);
  assert.equal(loanArrears(state), 0);
  assert.equal(state.price, 1);
  for (const bank of state.nodes.filter((node) => node.sector === "bank")) {
    assert.equal(bank.lossMemory, 0);
    assert.equal(bank.lendingStandard, 1);
  }
  for (const household of state.nodes.filter((node) => node.sector === "household")) assert.equal(household.savingPropensity, 0);
  for (const firm of state.nodes.filter((node) => node.sector === "firm")) assert.equal(firm.bankId, initialBanks.get(firm.id));
  for (const edge of state.edges.filter((item) => item.kind === "wage" || item.kind === "consumption")) assert.equal(`${edge.from}:${edge.to}`, initialPaymentEndpoints.get(edge.id));
  for (const node of state.nodes.filter((item) => item.sector === "household" || item.sector === "firm")) {
    const initial = initialCash.get(node.id);
    if (initial === undefined) throw new Error(`missing initial cash for ${node.id}`);
    assert.ok(Math.abs(node.cash - initial) / initial < 0.01, `${node.id} cash drifted too far from baseline`);
  }
  for (const loan of state.edges.filter((item) => item.kind === "loan")) assert.equal(loan.principal, initialLoans.get(loan.id));
  assert.equal(state.nodes.find((node) => node.id === "central-bank")?.cash, initialCentralBankCash);
  for (const bank of state.nodes.filter((node) => node.sector === "bank")) assert.ok(Math.abs(bankBalanceError(state, bank.id)) < 1e-7);
});

test("loss memory, lending standards, and precautionary saving adapt from an experienced liquidity shock", () => {
  const state = createEconomy();
  setFrozen(state, "firm-1", true);
  stepFor(state, 12, 1 / 24);
  const bank = state.nodes.find((node) => node.id === "bank-1");
  const household = state.nodes.find((node) => node.id === "household-1");
  assert.ok(bank && household);
  assert.ok(bank.lossMemory > 0, "the creditor should remember realised missed repayment");
  assert.ok(bank.lendingStandard < 1, "remembered losses should tighten its future lending standard");
  assert.ok(household.savingPropensity > 0, "missed wage income should reduce later consumption requests");
  const memoryDuringShock = bank.lossMemory;
  setFrozen(state, "firm-1", false);
  stepFor(state, 10, 1 / 24);
  assert.ok(bank.lossMemory > 0 && bank.lossMemory < memoryDuringShock, "memory should persist but decay after payments recover");
  assert.ok(household.savingPropensity < 0.01, "precautionary saving should relax after recovery");
  for (const item of state.nodes.filter((node) => node.sector === "bank")) assert.ok(Math.abs(bankBalanceError(state, item.id)) < 1e-7);
});

test("firms switch deposit banks and payment links rewire without changing the population or ledger identities", () => {
  const bankingState = createEconomy();
  setFrozen(bankingState, "bank-1", true);
  stepFor(bankingState, 2, 1 / 24);
  assert.notEqual(bankingState.nodes.find((node) => node.id === "firm-1")?.bankId, "bank-1");
  for (const bank of bankingState.nodes.filter((node) => node.sector === "bank")) assert.ok(Math.abs(bankBalanceError(bankingState, bank.id)) < 1e-7);

  const topologyState = createEconomy();
  const edgeCount = topologyState.edges.length;
  const nodeCount = topologyState.nodes.length;
  topologyState.nodes.find((node) => node.id === "firm-1")!.defaulted = true;
  stepFor(topologyState, 2, 1 / 24);
  const wage = topologyState.edges.find((edge) => edge.id === "wage:firm-1:household-1");
  const consumption = topologyState.edges.find((edge) => edge.id === "consumption:household-1:firm-1");
  assert.ok(wage && consumption);
  assert.notEqual(wage.from, "firm-1", "a worker should move from an unavailable employer");
  assert.notEqual(consumption.to, "firm-1", "a buyer should change an unavailable supplier");
  assert.equal(topologyState.nodes.length, nodeCount);
  assert.equal(topologyState.edges.length, edgeCount);
  for (const bank of topologyState.nodes.filter((node) => node.sector === "bank")) assert.ok(Math.abs(bankBalanceError(topologyState, bank.id)) < 1e-7);
});

test("healthy baseline has bounded, relation-specific payment variation", () => {
  const state = createEconomy();
  const observed: number[] = [];
  for (let second = 0; second < 90; second += 1) {
    stepFor(state, 1, 1 / 24);
    const wage = state.edges.find((edge) => edge.id === "wage:firm-1:household-1");
    assert.ok(wage);
    observed.push(wage.flow);
  }
  assert.ok(Math.max(...observed) - Math.min(...observed) > 0.18, "healthy flow should visibly breathe");
  assert.equal(state.nodes.some((node) => node.defaulted), false);
  assert.equal(loanArrears(state), 0);
});

test("a freeze locks a fixed balance fraction and a short isolated shock is absorbed", () => {
  const state = createEconomy();
  const firm = state.nodes.find((node) => node.id === "firm-1");
  assert.ok(firm);
  setFrozen(state, firm.id, true);
  assert.equal(firm.liquidCash, firm.cash * 0.15);
  stepFor(state, 8, 1 / 24);
  setFrozen(state, firm.id, false);
  stepFor(state, 80, 1 / 24);
  assert.equal(state.nodes.some((node) => node.defaulted), false);
  assert.ok(state.price > 0.95);
  assert.ok(loanArrears(state) < 5);
});

test("UI-sized and whole-second settlement produce the same absorbed-shock outcome", () => {
  const run = (dt: number) => {
    const state = createEconomy();
    setFrozen(state, "firm-1", true);
    stepFor(state, 8, dt);
    setFrozen(state, "firm-1", false);
    stepFor(state, 80, dt);
    return { price: state.price, arrears: loanArrears(state), defaults: state.nodes.filter((node) => node.defaulted).length };
  };
  const whole = run(1);
  const ui = run(1 / 24);
  assert.equal(whole.defaults, 0);
  assert.equal(ui.defaults, 0);
  assert.equal(whole.price, ui.price);
  assert.ok(Math.abs(whole.arrears - ui.arrears) < 0.8);
});

test("sustained, selected freezes contract wages paid by an unselected firm", () => {
  const state = createEconomy();
  const selected = [
    "firm-1", "firm-2", "firm-3", "firm-4", "household-1", "household-2", "household-3", "household-4",
    "household-5", "household-6", "household-7", "household-8", "bank-1", "bank-2",
  ];
  for (const id of selected) setFrozen(state, id, true);
  stepFor(state, 200, 1 / 24);
  const wage = state.edges.find((item) => item.id === "wage:firm-5:household-9");
  assert.ok(wage);
  assert.equal(selected.includes(wage.from), false);
  assert.equal(selected.includes(wage.to), false);
  assert.ok(wage.flow < 0.2, "the unselected firm's wage payment should contract under the connected shock");
  assert.ok(loanArrears(state) > 1);
  assert.ok(state.price < 0.9);
  for (const bank of state.nodes.filter((node) => node.sector === "bank")) assert.ok(Math.abs(bankBalanceError(state, bank.id)) < 1e-7);
});

import assert from "node:assert/strict";
import test from "node:test";
import { MARKOV_CHAIN } from "./model.ts";

test("the joint-state kernel is stochastic and aperiodic", () => {
  for (let index = 0; index < MARKOV_CHAIN.transitions.length; index += 1) {
    const row = MARKOV_CHAIN.transitions[index];
    const sum = row.reduce((total, transition) => total + transition.probability, 0);
    assert.ok(Math.abs(sum - 1) < 1e-12);
    assert.ok(row.some((transition) => transition.to === index));
  }
});

test("all 108 joint states communicate and the stationary vector is fixed", () => {
  const reached = new Set([0]);
  for (let round = 0; round < MARKOV_CHAIN.states.length; round += 1) {
    for (const source of reached) {
      for (const transition of MARKOV_CHAIN.transitions[source]) {
        reached.add(transition.to);
      }
    }
  }
  assert.equal(reached.size, MARKOV_CHAIN.states.length);

  const pushedForward = new Float64Array(MARKOV_CHAIN.states.length);
  for (let source = 0; source < MARKOV_CHAIN.states.length; source += 1) {
    for (const transition of MARKOV_CHAIN.transitions[source]) {
      pushedForward[transition.to] +=
        MARKOV_CHAIN.stationary[source] * transition.probability;
    }
  }
  const residual = Math.max(
    ...pushedForward.map((value, index) =>
      Math.abs(value - MARKOV_CHAIN.stationary[index]),
    ),
  );
  assert.ok(residual < 1e-10);
});

test("the chain violates detailed balance", () => {
  const probability = (from: number, to: number) =>
    MARKOV_CHAIN.transitions[from].find((transition) => transition.to === to)
      ?.probability ?? 0;
  let greatestImbalance = 0;

  for (let from = 0; from < MARKOV_CHAIN.states.length; from += 1) {
    for (const transition of MARKOV_CHAIN.transitions[from]) {
      greatestImbalance = Math.max(
        greatestImbalance,
        Math.abs(
          MARKOV_CHAIN.stationary[from] * transition.probability -
            MARKOV_CHAIN.stationary[transition.to] *
              probability(transition.to, from),
        ),
      );
    }
  }

  assert.ok(greatestImbalance > 1e-4);
});

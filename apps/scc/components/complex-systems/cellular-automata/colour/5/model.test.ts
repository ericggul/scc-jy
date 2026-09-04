import assert from "node:assert/strict";
import test from "node:test";
import { createNestedAutomaton, stepNestedAutomaton } from "./model.ts";

test("all nine nested layers independently use B3/S23", () => {
  const automaton = createNestedAutomaton(3, 3);
  for (const layer of automaton.layers) {
    layer.fill(0);
    for (const index of [1, 3, 5]) layer[index] = 1;
  }
  const next = stepNestedAutomaton(automaton);
  assert.equal(next.layers.length, 9);
  assert.ok(next.layers.every((layer) => layer[4] === 1));
});

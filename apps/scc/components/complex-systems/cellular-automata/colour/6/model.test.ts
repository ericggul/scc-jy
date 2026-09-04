import assert from "node:assert/strict";
import test from "node:test";
import { createHexAutomaton, stepHexAutomaton } from "./model.ts";

test("all nested hex layers independently apply B3/S23 over six neighbours", () => {
  const automaton = createHexAutomaton(4, 4);
  for (const layer of automaton.layers) {
    layer.fill(0);
    layer[1] = 1;
    layer[4] = 1;
    layer[6] = 1;
  }
  const next = stepHexAutomaton(automaton);
  assert.equal(next.layers.length, 9);
  assert.ok(next.layers.every((layer) => layer[5] === 1));
});

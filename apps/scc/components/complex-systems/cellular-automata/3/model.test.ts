import assert from "node:assert/strict";
import test from "node:test";
import {
  countRainbowStates,
  createRainbowAutomaton,
  selectTransmittedState,
  stepRainbowAutomaton,
} from "./model.ts";

test("transmission can move from either foreign colour instead of a fixed successor", () => {
  assert.equal(selectTransmittedState(0, [2, 0, 6], 0.75), 2);
  assert.equal(selectTransmittedState(2, [2, 6, 0], 0.75), 1);
});

test("the stochastic field retains a valid seven-colour lattice across generations", () => {
  let automaton = createRainbowAutomaton(24, 16);
  for (let step = 0; step < 32; step += 1) automaton = stepRainbowAutomaton(automaton);
  const counts = countRainbowStates(automaton);
  assert.equal(
    counts.red + counts.orange + counts.yellow + counts.green + counts.blue + counts.indigo + counts.violet,
    384,
  );
  assert.ok(automaton.cells.every((state) => state >= 0 && state < 7));
});

test("cycle mode permits only the next rainbow state to take a cell", () => {
  const automaton = createRainbowAutomaton(3, 3);
  automaton.cells.fill(0);
  automaton.cells[1] = 1;
  automaton.cells[3] = 1;
  automaton.cells[5] = 1;
  assert.equal(stepRainbowAutomaton(automaton, "cycle").cells[4], 1);
  automaton.cells.fill(0);
  automaton.cells[1] = 2;
  automaton.cells[3] = 2;
  automaton.cells[5] = 2;
  assert.equal(stepRainbowAutomaton(automaton, "cycle").cells[4], 0);
});

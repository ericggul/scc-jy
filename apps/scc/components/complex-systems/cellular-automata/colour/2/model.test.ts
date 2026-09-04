import assert from "node:assert/strict";
import test from "node:test";
import {
  countCyclicStates,
  createCyclicAutomaton,
  stepCyclicAutomaton,
} from "./model.ts";

test("the seed fills the lattice with only the three cyclic states", () => {
  const automaton = createCyclicAutomaton(12, 8);
  const counts = countCyclicStates(automaton);
  assert.equal(counts.red + counts.green + counts.blue, 96);
  assert.ok(counts.red > 0 && counts.green > 0 && counts.blue > 0);
});

test("a cell advances only when three successor neighbours surround it", () => {
  const automaton = createCyclicAutomaton(3, 3);
  automaton.cells.fill(0);
  automaton.cells[1] = 1;
  automaton.cells[3] = 1;
  automaton.cells[5] = 1;
  assert.equal(stepCyclicAutomaton(automaton).cells[4], 1);
  automaton.cells[5] = 0;
  assert.equal(stepCyclicAutomaton(automaton).cells[4], 0);
});

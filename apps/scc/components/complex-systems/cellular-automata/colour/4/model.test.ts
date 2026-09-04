import assert from "node:assert/strict";
import test from "node:test";
import { countMismatch, createDoubleAutomaton, paintDoubleAutomaton, stepDoubleAutomaton } from "./model.ts";

test("field and word states are independently paintable", () => {
  let automaton = createDoubleAutomaton(6, 4);
  automaton = paintDoubleAutomaton(automaton, 2, 2, "field", 0);
  const wordBefore = automaton.words[14];
  automaton = paintDoubleAutomaton(automaton, 2, 2, "word", 2);
  assert.equal(automaton.field[14], 0);
  assert.equal(automaton.words[14], 2);
  assert.notEqual(wordBefore, undefined);
});

test("independent layers retain their shape and can disagree", () => {
  const automaton = stepDoubleAutomaton(createDoubleAutomaton(12, 8));
  assert.equal(automaton.field.length, 96);
  assert.equal(automaton.words.length, 96);
  assert.ok(countMismatch(automaton) > 0);
});

test("field and word layers cycle in reverse RGB directions", () => {
  const automaton = createDoubleAutomaton(3, 3);
  automaton.field.fill(0);
  automaton.words.fill(0);
  for (const index of [1, 3, 5]) {
    automaton.field[index] = 1;
    automaton.words[index] = 2;
  }
  const next = stepDoubleAutomaton(automaton);
  assert.equal(next.field[4], 1);
  assert.equal(next.words[4], 2);
});

test("r/b mode applies B3/S23 independently to field and word layers", () => {
  const automaton = createDoubleAutomaton(3, 3, 2);
  automaton.field.fill(0);
  automaton.words.fill(0);
  for (const index of [1, 3, 5]) {
    automaton.field[index] = 1;
    automaton.words[index] = 1;
  }
  const next = stepDoubleAutomaton(automaton);
  assert.equal(next.field[4], 1);
  assert.equal(next.words[4], 1);
  automaton.field[5] = 0;
  assert.equal(stepDoubleAutomaton(automaton).field[4], 0);
});

test("rainbow mode expands both reverse cycles to seven states", () => {
  const automaton = createDoubleAutomaton(3, 3, 7);
  automaton.field.fill(0);
  automaton.words.fill(0);
  for (const index of [1, 3]) {
    automaton.field[index] = 1;
    automaton.words[index] = 6;
  }
  const next = stepDoubleAutomaton(automaton);
  assert.equal(next.field[4], 1);
  assert.equal(next.words[4], 6);
});

test("a stalled layer receives a small deterministic spark", () => {
  const automaton = createDoubleAutomaton(6, 6, 7);
  automaton.field.fill(0);
  automaton.words.fill(0);
  automaton.fieldStalledSteps = 79;
  automaton.wordStalledSteps = 79;
  const next = stepDoubleAutomaton(automaton);
  assert.equal(next.fieldStalledSteps, 0);
  assert.equal(next.wordStalledSteps, 0);
  assert.ok(next.field.some((state) => state !== 0));
  assert.ok(next.words.some((state) => state !== 0));
});

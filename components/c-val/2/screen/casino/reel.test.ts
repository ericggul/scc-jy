import assert from "node:assert/strict";
import test from "node:test";
import { buildCasinoSpinSequence, type CasinoReelDefinition } from "./reel-motion.ts";

function reel(
  kind: CasinoReelDefinition["kind"],
  symbol: string,
): CasinoReelDefinition {
  return { id: `test-${kind}`, kind, symbol };
}

test("a digit reel passes a complete numeric turn before centering the target", () => {
  const sequence = buildCasinoSpinSequence(reel("digit", "2"), "7", 1, 0.2);

  assert.equal(sequence.steps, 15);
  assert.deepEqual(sequence.symbols.slice(0, 3), ["6", "7", "8"]);
  assert.deepEqual(sequence.symbols.slice(-3), ["1", "2", "3"]);
});

test("high live movement adds a second rapid turn without changing the result", () => {
  const sequence = buildCasinoSpinSequence(reel("digit", "2"), "7", 2, 0.8);

  assert.equal(sequence.steps, 25);
  assert.deepEqual(sequence.symbols.slice(-3), ["1", "2", "3"]);
});

test("the multi-digit change lane moves through real adjacent integers", () => {
  const sequence = buildCasinoSpinSequence(reel("integer", "12"), "3", 3, 1);

  assert.equal(sequence.steps, 9);
  assert.deepEqual(sequence.symbols.slice(0, 3), ["2", "3", "4"]);
  assert.deepEqual(sequence.symbols.slice(-3), ["11", "12", "13"]);
});

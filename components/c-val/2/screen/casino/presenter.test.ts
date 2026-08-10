import assert from "node:assert/strict";
import test from "node:test";
import type { CValSnapshot } from "../../model";
import { presentCValThreeDigitPrice } from "./presenter.ts";

function snapshot(index: number): CValSnapshot {
  return { market: { index } } as CValSnapshot;
}

test("the casino shows only the rounded three-digit current price", () => {
  assert.deepEqual(presentCValThreeDigitPrice(snapshot(153.49)), {
    value: 153,
    digits: ["1", "5", "3"],
    text: "153",
  });
  assert.equal(presentCValThreeDigitPrice(snapshot(242.6)).text, "243");
});

test("prices below 100 keep all three physical drums", () => {
  assert.equal(presentCValThreeDigitPrice(snapshot(32)).text, "032");
  assert.equal(presentCValThreeDigitPrice(snapshot(3)).text, "003");
});

test("the fixed three-drum display never emits a fourth character", () => {
  assert.equal(presentCValThreeDigitPrice(snapshot(-12)).text, "000");
  assert.equal(presentCValThreeDigitPrice(snapshot(1_204)).text, "999");
  assert.equal(presentCValThreeDigitPrice(snapshot(Number.NaN)).text, "100");
});

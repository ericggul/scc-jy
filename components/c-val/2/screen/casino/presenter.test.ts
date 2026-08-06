import assert from "node:assert/strict";
import test from "node:test";
import type { CValSnapshot } from "../../model";
import { presentCValCasino } from "./presenter.ts";

function casinoSnapshot(): CValSnapshot {
  return {
    phase: "waiting",
    market: {
      index: 100,
      changeFromOpenPercent: 0,
      oneSecondMovePercent: 0,
      oneSecondRange: 0,
      realizedVolatilityBps: 0,
    },
  } as CValSnapshot;
}

test("the casino waits silently until the market has real executions", () => {
  const snapshot = casinoSnapshot();
  snapshot.market.changeFromOpenPercent = 42;
  snapshot.market.oneSecondMovePercent = 5.2;

  assert.deepEqual(presentCValCasino(snapshot), {
    direction: "flat",
    sign: "—",
    mode: "change",
    value: 0,
    integerDigits: [0],
    fractionalDigits: [0, 0],
    text: "—0.00%",
    spinStrength: 0,
  });
});

test("the casino represents the actual rolling one-second execution return", () => {
  const snapshot = casinoSnapshot();
  snapshot.phase = "active";
  snapshot.market.index = 103.55;
  snapshot.market.changeFromOpenPercent = 37.2;
  snapshot.market.oneSecondMovePercent = 3.55;
  snapshot.market.oneSecondRange = 3.55;

  const presentation = presentCValCasino(snapshot);
  assert.equal(presentation.direction, "rise");
  assert.equal(presentation.sign, "+");
  assert.equal(presentation.value, 3.55);
  assert.deepEqual(presentation.integerDigits, [3]);
  assert.deepEqual(presentation.fractionalDigits, [5, 5]);
  assert.equal(presentation.text, "+3.55%");
});

test("negative execution return gets a mechanical minus while preserving every digit", () => {
  const snapshot = casinoSnapshot();
  snapshot.phase = "active";
  snapshot.market.oneSecondMovePercent = -12.34;

  const presentation = presentCValCasino(snapshot);
  assert.equal(presentation.direction, "fall");
  assert.equal(presentation.sign, "−");
  assert.deepEqual(presentation.integerDigits, [1, 2]);
  assert.deepEqual(presentation.fractionalDigits, [3, 4]);
  assert.equal(presentation.text, "−12.34%");
});

test("movement smaller than the displayed hundredth stays visually neutral", () => {
  const snapshot = casinoSnapshot();
  snapshot.phase = "active";
  snapshot.market.oneSecondMovePercent = -0.004;

  assert.equal(presentCValCasino(snapshot).text, "—0.00%");
});

test("the price mode uses the current market index without adding a fictional sign", () => {
  const snapshot = casinoSnapshot();
  snapshot.phase = "active";
  snapshot.market.index = 103.55;
  snapshot.market.oneSecondMovePercent = -0.82;

  const presentation = presentCValCasino(snapshot, "price");
  assert.equal(presentation.mode, "price");
  assert.equal(presentation.sign, null);
  assert.equal(presentation.direction, "fall");
  assert.deepEqual(presentation.integerDigits, [1, 0, 3]);
  assert.deepEqual(presentation.fractionalDigits, [5, 5]);
  assert.equal(presentation.text, "103.55");
});

test("the price mode preserves the machine's three integer drums below 100", () => {
  const snapshot = casinoSnapshot();
  snapshot.phase = "active";
  snapshot.market.index = 97.89;

  const presentation = presentCValCasino(snapshot, "price");
  assert.deepEqual(presentation.integerDigits, [0, 9, 7]);
  assert.equal(presentation.text, "097.89");
});

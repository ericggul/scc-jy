import assert from "node:assert/strict";
import test from "node:test";
import type { CValSnapshot } from "../../model";
import { presentCValCasino } from "./presenter.ts";

function snapshot(index: number): CValSnapshot {
  return {
    phase: "active",
    market: {
      index,
      openingPrice: 100,
      oneSecondMovePercent: 2.5,
      oneSecondRange: 6,
      executions: 32,
      changeFromOpenPercent: 1.5,
    },
    history: { index: [99.98, 100.02, 100.45] },
    recentTrades: [
      { id: "trade-1", side: "buy", price: 100.1, quantity: 10, buyerId: "b", sellerId: "s", executedAt: 1_000 },
      { id: "trade-2", side: "buy", price: 100.45, quantity: 10, buyerId: "b", sellerId: "s", executedAt: 1_180 },
    ],
  } as CValSnapshot;
}

test("the price register exposes five actual price digits and their changed positions", () => {
  const presentation = presentCValCasino(snapshot(100.85));
  assert.equal(presentation.priceText, "100.85");
  assert.equal(presentation.drums.length, 5);
  assert.deepEqual(presentation.drums.map((drum) => drum.reel[2]), ["1", "0", "0", "8", "5"]);
  assert.equal(presentation.changedDrums, 2);
  assert.deepEqual(
    presentation.drums.filter((drum) => drum.changed).map((drum) => drum.position),
    [4, 5],
  );
});

test("the casino ledger keeps an actual contiguous price sequence and a trade-derived cadence", () => {
  const presentation = presentCValCasino(snapshot(100.85));
  assert.equal(presentation.outcomes.length, 3);
  assert.equal(presentation.outcomes.at(-1)?.price, 100.85);
  assert.equal(presentation.outcomes.at(-1)?.sequence, 32);
  assert.equal(presentation.cadenceMs, 180);
  assert.equal(presentation.transitionMs, 180);
});

test("waiting state keeps the register but never invents results beyond actual history", () => {
  const waiting = snapshot(100);
  waiting.phase = "waiting";
  waiting.history.index = [];
  waiting.recentTrades = [];
  const presentation = presentCValCasino(waiting);
  assert.equal(presentation.phase, "waiting");
  assert.equal(presentation.outcomes.length, 1);
  assert.equal(presentation.outcomes[0]?.price, 100);
  assert.equal(presentation.cadenceMs, null);
});

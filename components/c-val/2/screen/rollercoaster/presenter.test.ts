import assert from "node:assert/strict";
import test from "node:test";
import type { CValSnapshot } from "../../model";
import { C_VAL_ROLLERCOASTER_WINDOW, cValRollercoasterPrices, presentCValTrajectory } from "./presenter.ts";

test("the ride keeps an actual short path ending at the current execution", () => {
  const history = Array.from({ length: 120 }, (_, index) => 100 + index);
  const snapshot = { market: { openingPrice: 100, index: 250.5 }, history: { index: history } } as CValSnapshot;
  const prices = cValRollercoasterPrices(snapshot);
  assert.equal(prices.length, C_VAL_ROLLERCOASTER_WINDOW);
  assert.equal(prices.at(-1), 250.5);
  assert.equal(prices[0], history[history.length - C_VAL_ROLLERCOASTER_WINDOW]);
});

test("the ride ledger derives climb, drop, reversals, and cadence only from actual records", () => {
  const snapshot = {
    phase: "active",
    market: { openingPrice: 100, index: 101, oneSecondMovePercent: -0.5 },
    history: { index: [100, 102, 99, 101] },
    recentTrades: [
      { id: "first", executedAt: 2_000 },
      { id: "second", executedAt: 2_140 },
    ],
  } as CValSnapshot;
  const presentation = presentCValTrajectory(snapshot);
  assert.deepEqual(presentation.points.map((point) => point.terrain), ["LEVEL", "CLIMB", "DROP", "CLIMB"]);
  assert.equal(presentation.reversals, 2);
  assert.equal(presentation.cadenceMs, 140);
  assert.equal(presentation.facts.find((fact) => fact.id === "run-last")?.value, "101.00");
});

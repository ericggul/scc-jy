import assert from "node:assert/strict";
import test from "node:test";
import {
  C_VAL_MEDIA_MAX_CELLS,
  cValMediaCellOrder,
  cValMediaLayoutFromChange,
} from "./presenter.ts";

test("executed-price direction selects exactly one social video state", () => {
  assert.deepEqual(cValMediaLayoutFromChange(0), {
    direction: "quiet",
    activeCount: 0,
    dimension: 1,
  });
  assert.equal(cValMediaLayoutFromChange(0.01).direction, "gain");
  assert.equal(cValMediaLayoutFromChange(-0.01).direction, "loss");
});

test("media multiplicity is bounded for extreme market paths", () => {
  const layout = cValMediaLayoutFromChange(10_000);
  assert.equal(layout.activeCount, C_VAL_MEDIA_MAX_CELLS);
  assert.equal(layout.dimension, 10);
});

test("media cells use stable row-major positions", () => {
  assert.deepEqual(cValMediaCellOrder(2), [
    { column: 0, row: 0 },
    { column: 1, row: 0 },
    { column: 0, row: 1 },
    { column: 1, row: 1 },
  ]);
});

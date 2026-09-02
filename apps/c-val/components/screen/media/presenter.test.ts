import assert from "node:assert/strict";
import test from "node:test";
import type { CValSnapshot } from "@/components/model";
import {
  C_VAL_MEDIA_ENTRY_AFTER_INACTIVE_MS,
  C_VAL_MEDIA_CELLS_PER_PERCENT,
  C_VAL_MEDIA_MAX_CELLS,
  cValMediaCellOrder,
  cValMediaLayoutFromChange,
  cValMediaShouldShowEntry,
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
  assert.equal(C_VAL_MEDIA_MAX_CELLS, 400);
  assert.equal(layout.activeCount, C_VAL_MEDIA_MAX_CELLS);
  assert.equal(layout.dimension, 20);
});

test("each percentage-point move contributes one media tile", () => {
  assert.equal(C_VAL_MEDIA_CELLS_PER_PERCENT, 1);
  assert.equal(cValMediaLayoutFromChange(1).activeCount, 1);
  assert.equal(cValMediaLayoutFromChange(-12).activeCount, 12);
  assert.equal(cValMediaLayoutFromChange(50).activeCount, 50);
});

test("media cells use stable row-major positions", () => {
  assert.deepEqual(cValMediaCellOrder(2), [
    { column: 0, row: 0 },
    { column: 1, row: 0 },
    { column: 0, row: 1 },
    { column: 1, row: 1 },
  ]);
});

test("only a two-minute inactive closing auction replaces media with its QR entry", () => {
  const snapshot = {
    phase: "closing-auction",
    idle: { inactiveAt: 1_000, closingAt: 11_000 },
  } as CValSnapshot;

  assert.equal(
    cValMediaShouldShowEntry(
      snapshot,
      1_000 + C_VAL_MEDIA_ENTRY_AFTER_INACTIVE_MS - 1,
    ),
    false,
  );
  assert.equal(
    cValMediaShouldShowEntry(
      snapshot,
      1_000 + C_VAL_MEDIA_ENTRY_AFTER_INACTIVE_MS,
    ),
    true,
  );

  snapshot.phase = "active";
  assert.equal(
    cValMediaShouldShowEntry(
      snapshot,
      1_000 + C_VAL_MEDIA_ENTRY_AFTER_INACTIVE_MS,
    ),
    false,
  );
});

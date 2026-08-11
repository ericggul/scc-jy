import assert from "node:assert/strict";
import test from "node:test";
import type { CValSnapshot } from "@/components/c-val/2/model";
import {
  C_VAL_GRAPH_COLUMNS,
  C_VAL_GRAPH_HISTORY_LENGTH,
  C_VAL_GRAPH_OBSERVATIONS,
  C_VAL_GRAPH_ROWS,
  presentCValGraphMatrix,
} from "./presenter.ts";

function snapshot(): CValSnapshot {
  const history = Array.from({ length: C_VAL_GRAPH_HISTORY_LENGTH }, (_, index) => 100 + index * 0.25);
  return {
    market: { index: 140, openingPrice: 100 },
    parameters: { volatility: 0.4, activity: 0.5, liquidity: 0.6 },
    history: {
      index: history,
      returnPercent: history.map((_, index) => index / 10),
      volatility: history.map((_, index) => index / 120),
      activity: history.map((_, index) => index / 160),
      liquidity: history.map((_, index) => 1 - index / 200),
      realizedVolatilityBps: history.map((_, index) => index),
      depth: history.map((_, index) => index * 10),
    },
  } as CValSnapshot;
}

test("the graph monitor has one hundred real 12-observation cells", () => {
  const cells = presentCValGraphMatrix(snapshot());
  assert.equal(cells.length, C_VAL_GRAPH_ROWS * C_VAL_GRAPH_COLUMNS);
  assert.ok(cells.every((cell) => cell.values.length === C_VAL_GRAPH_OBSERVATIONS));
  assert.equal(cells[0]?.channel, "PX");
  assert.equal(cells.at(-1)?.channel, "DEPTH");
  assert.equal(cells.find((cell) => cell.channel === "PX" && cell.window === 10)?.last, 140);
});

test("the matrix derives momentum from executed prices instead of inventing a series", () => {
  const cells = presentCValGraphMatrix(snapshot());
  const momentum = cells.find((cell) => cell.channel === "MOM" && cell.window === 1);
  assert.ok(momentum);
  assert.equal(momentum.values[0], 0);
  assert.ok(momentum.values.at(-1)! > 0);
});

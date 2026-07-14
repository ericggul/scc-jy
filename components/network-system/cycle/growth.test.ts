import assert from "node:assert/strict";
import test from "node:test";
import {
  cycleDimensionFromCount,
  cycleVideoCountsFromGrowth,
  presentCycleVideoLayout,
} from "./growth.ts";
import { createInitialCycleSnapshot } from "./model.ts";
import { cycleVideoSegments } from "./video-config.ts";
import { cycleRowMajorOrder } from "./grid-order.ts";

test("absolute GDP growth determines the exact video count", () => {
  assert.deepEqual(cycleVideoCountsFromGrowth(0), {
    growth: 0,
    leftCount: 0,
    rightCount: 0,
  });
  assert.deepEqual(cycleVideoCountsFromGrowth(0.01), {
    growth: 0.01,
    leftCount: 1,
    rightCount: 0,
  });
  assert.deepEqual(cycleVideoCountsFromGrowth(1.234), {
    growth: 1.234,
    leftCount: 2,
    rightCount: 0,
  });
  assert.deepEqual(cycleVideoCountsFromGrowth(-0.601), {
    growth: -0.601,
    leftCount: 0,
    rightCount: 1,
  });
  assert.equal(cycleVideoCountsFromGrowth(50).leftCount, 50);
  assert.equal(cycleVideoCountsFromGrowth(-60).rightCount, 60);
});

test("each side derives N from its current video count", () => {
  const snapshot = createInitialCycleSnapshot();
  snapshot.gdpGrowth = 17;
  const expansion = presentCycleVideoLayout(snapshot);
  assert.equal(expansion.leftCount, 17);
  assert.equal(expansion.leftDimension, 5);
  assert.equal(expansion.rightDimension, 1);

  snapshot.gdpGrowth = 2;
  const smallerExpansion = presentCycleVideoLayout(snapshot);
  assert.equal(smallerExpansion.leftCount, 2);
  assert.equal(smallerExpansion.leftDimension, 2);

  snapshot.gdpGrowth = -10;
  const contraction = presentCycleVideoLayout(snapshot);
  assert.equal(contraction.rightCount, 10);
  assert.equal(contraction.rightDimension, 4);
  assert.equal(contraction.leftDimension, 1);

  snapshot.gdpGrowth = 0;
  const zero = presentCycleVideoLayout(snapshot);
  assert.equal(zero.leftDimension, 1);
  assert.equal(zero.rightDimension, 1);
});

test("dimension is ceil square root of the current count", () => {
  assert.equal(cycleDimensionFromCount(0), 1);
  assert.equal(cycleDimensionFromCount(1), 1);
  assert.equal(cycleDimensionFromCount(2), 2);
  assert.equal(cycleDimensionFromCount(100), 10);
  assert.equal(cycleDimensionFromCount(101), 11);
  assert.equal(cycleDimensionFromCount(60), 8);
});

test("videos fill from the top-left in row-major order", () => {
  const order = cycleRowMajorOrder(3);
  assert.deepEqual(order.slice(0, 5), [
    { column: 0, row: 0 },
    { column: 1, row: 0 },
    { column: 2, row: 0 },
    { column: 0, row: 1 },
    { column: 1, row: 1 },
  ]);
  assert.equal(new Set(order.map(({ column, row }) => `${column}:${row}`)).size, 9);
});

test("video loop segments remain isolated in configuration", () => {
  assert.deepEqual(cycleVideoSegments.left, {
    src: "/video/left.mp4",
    start: 5,
    end: 15,
  });
  assert.deepEqual(cycleVideoSegments.right, {
    src: "/video/right.mp4",
    start: 65,
    end: 74,
  });
});

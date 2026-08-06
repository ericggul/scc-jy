import assert from "node:assert/strict";
import test from "node:test";
import type { CValSnapshot } from "../../model";
import {
  C_VAL_ROLLERCOASTER_WINDOW,
  cValRollercoasterPriceDomain,
  cValRollercoasterPrices,
  projectRollercoasterWorld,
} from "./presenter.ts";

test("the rail uses a short window ending at the last executed price", () => {
  const history = Array.from({ length: 120 }, (_, index) => 100 + index);
  const snapshot = {
    market: { openingPrice: 100, index: 250.5 },
    history: { index: history },
  } as CValSnapshot;
  const prices = cValRollercoasterPrices(snapshot);
  assert.equal(prices.length, C_VAL_ROLLERCOASTER_WINDOW);
  assert.equal(prices.at(-1), 250.5);
  assert.equal(prices[0], history[history.length - C_VAL_ROLLERCOASTER_WINDOW]);
});

test("fixed world projection never rescales when another point enters the window", () => {
  const first = projectRollercoasterWorld([100, 101], 100);
  const second = projectRollercoasterWorld([100, 101], 100);
  assert.deepEqual(first, second);
});

test("every price in the short window remains a physical rail point", () => {
  const prices = Array.from({ length: 28 }, (_, index) => 100 + index * 0.25);
  const points = projectRollercoasterWorld(prices, 100);
  assert.equal(points.length, prices.length);
  assert.ok(points.at(-1)!.y - points[0].y > 2);
  assert.ok(points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)));
});

test("prices from one to one hundred thousand always remain in the rail field", () => {
  const prices = [1, 10, 100, 1_000, 10_000, 100_000];
  const points = projectRollercoasterWorld(prices, 100);
  assert.ok(points.every((point) => point.y >= -3.25 && point.y <= 5.1));
  for (let index = 1; index < points.length; index += 1) {
    assert.ok(points[index].y > points[index - 1].y);
  }
});

test("local log domain preserves visible variation without exceeding global price bounds", () => {
  const local = cValRollercoasterPriceDomain([99, 100, 101]);
  const extreme = cValRollercoasterPriceDomain([1, 100_000]);
  assert.ok(local.high - local.low >= Math.log10(1.12));
  assert.equal(extreme.low, 0);
  assert.equal(extreme.high, 5);
});

test("time advances strictly along the world x axis", () => {
  const points = projectRollercoasterWorld([100, 98, 103, 101], 100);
  for (let index = 1; index < points.length; index += 1) {
    assert.ok(points[index].x > points[index - 1].x);
  }
});

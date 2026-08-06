import assert from "node:assert/strict";
import test from "node:test";
import type { CValSnapshot } from "../../model";
import {
  C_VAL_ROLLERCOASTER_MAX_PRICE,
  C_VAL_ROLLERCOASTER_MIN_PRICE,
  C_VAL_ROLLERCOASTER_WINDOW,
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

test("the price universe from one to one hundred thousand remains in the rail field", () => {
  const points = projectRollercoasterWorld([1, 10, 100, 1_000, 10_000, 100_000], 100);
  assert.ok(points.every((point) => point.y >= -4.4 && point.y <= 4.4));
  assert.ok(points[0].y < 0);
  assert.ok(points.at(-1)!.y > 0);
});

test("the stable soft projection preserves the direction and relative order of price moves", () => {
  const points = projectRollercoasterWorld([90, 100, 110, 120], 100);
  const firstInterval = points[1].y - points[0].y;
  const secondInterval = points[2].y - points[1].y;
  assert.ok(firstInterval > 0);
  assert.ok(secondInterval > 0);
  assert.ok(points[3].y > points[2].y);
});

test("invalid and out-of-range input cannot push the rail outside the installation price universe", () => {
  const points = projectRollercoasterWorld([Number.NaN, -10, 0, 2_000_000], 100);
  assert.equal(points[0].price, 100);
  assert.equal(points[1].price, C_VAL_ROLLERCOASTER_MIN_PRICE);
  assert.equal(points[2].price, C_VAL_ROLLERCOASTER_MIN_PRICE);
  assert.equal(points[3].price, C_VAL_ROLLERCOASTER_MAX_PRICE);
});

test("time advances strictly along the world x axis", () => {
  const points = projectRollercoasterWorld([100, 98, 103, 101], 100);
  for (let index = 1; index < points.length; index += 1) {
    assert.ok(points[index].x > points[index - 1].x);
  }
});

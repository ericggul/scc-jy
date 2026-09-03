import assert from "node:assert/strict";
import test from "node:test";
import { iterateLogistic, lateLogisticOrbit, logisticNext } from "./index.ts";

function assertClose(actual: number, expected: number, tolerance = 0.000001) {
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${actual} is not within ${tolerance} of ${expected}`,
  );
}

test("the logistic map applies x[n + 1] = r x[n] (1 - x[n])", () => {
  assertClose(logisticNext(0.25, 3.2), 0.6, 1e-12);
});

test("below r = 1, nonzero seeds settle at the zero fixed point", () => {
  assert.ok(iterateLogistic(0.37, 0.8, 100) < 0.000001);
});

test("between r = 1 and r = 3, the nonzero fixed point is retained", () => {
  const parameter = 2.5;
  const expectedFixedPoint = (parameter - 1) / parameter;

  assertClose(iterateLogistic(0.217, parameter, 120), expectedFixedPoint, 1e-10);
});

test("after r = 3, a stable period-two orbit replaces the fixed point", () => {
  const orbit = lateLogisticOrbit(0.217, 3.2, 240, 6);

  assertClose(orbit[0], orbit[2], 1e-10);
  assertClose(orbit[1], orbit[3], 1e-10);
  assert.ok(Math.abs(orbit[0] - orbit[1]) > 0.1);
});

test("the period-doubling cascade has a stable period-four window at r = 3.5", () => {
  const orbit = lateLogisticOrbit(0.217, 3.5, 600, 8);

  for (let index = 0; index < 4; index += 1) {
    assertClose(orbit[index], orbit[index + 4], 1e-8);
  }
  assert.equal(new Set(orbit.slice(0, 4).map((value) => value.toFixed(5))).size, 4);
});

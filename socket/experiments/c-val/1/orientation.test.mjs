import assert from "node:assert/strict";
import test from "node:test";
import {
  calibrateRawOrientation,
  finiteOrientationValue,
  signedAngleDelta,
} from "./orientation.mjs";

test("mobile calibration handles alpha wraparound and signed beta/gamma", () => {
  assert.equal(signedAngleDelta(1, 359), 2);
  assert.deepEqual(
    calibrateRawOrientation(
      { absolute: false, alpha: 1, beta: -20, gamma: 15 },
      { alpha: 359, beta: 10, gamma: -5 },
    ),
    {
      absolute: false,
      alpha: 2,
      beta: -30,
      gamma: 20,
    },
  );
});

test("non-finite browser orientation values degrade to zero", () => {
  assert.equal(finiteOrientationValue(null), 0);
  assert.equal(finiteOrientationValue(Number.NaN), 0);
});


import assert from "node:assert/strict";
import test from "node:test";
import {
  calibrateRawOrientation,
  checkpointOrientationToParameters,
  cValOneOrientationToParameters,
  finiteOrientationValue,
  orientationToCValParameters,
  rotationRateToCValControl,
  signedAngleDelta,
} from "./orientation.mjs";

test("comparison copies preserve the exact C-VAL 1 and 07a5aaf equations", () => {
  assert.deepEqual(
    cValOneOrientationToParameters({ alpha: 90, beta: -90, gamma: 45 }),
    { volatility: 1, activity: 0, liquidity: 1 },
  );
  assert.deepEqual(
    checkpointOrientationToParameters({ alpha: 90, beta: -35, gamma: 45 }),
    { volatility: 1, activity: 0, liquidity: 0 },
  );
  assert.deepEqual(
    checkpointOrientationToParameters({ alpha: -90, beta: 35, gamma: -45 }),
    { volatility: 1, activity: 1, liquidity: 0 },
  );
});

test("archived calibration retains alpha wraparound", () => {
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

test("non-finite browser rotation values degrade to zero", () => {
  assert.equal(finiteOrientationValue(null), 0);
  assert.equal(finiteOrientationValue(Number.NaN), 0);
});

test("stillness is neutral and disengaged", () => {
  assert.deepEqual(rotationRateToCValControl({
    alpha: 0,
    beta: 0,
    gamma: 0,
  }), {
    parameters: {
      volatility: 0.5,
      activity: 0.5,
      liquidity: 0.5,
    },
    engaged: false,
    energyDegreesPerSecond: 0,
    signedRotationDegreesPerSecond: 0,
  });
});

test("ordinary small rotation is already a strong market condition", () => {
  const ten = rotationRateToCValControl({ alpha: 10, beta: 0, gamma: 0 });
  const twenty = rotationRateToCValControl({ alpha: 20, beta: 0, gamma: 0 });

  assert.ok(ten.parameters.volatility > 0.71);
  assert.ok(ten.parameters.activity > 0.71);
  assert.ok(ten.parameters.liquidity < 0.29);
  assert.ok(twenty.parameters.volatility > 0.79);
  assert.ok(twenty.parameters.activity > 0.79);
  assert.ok(twenty.parameters.liquidity < 0.21);
});

test("all three axes use the exact same response", () => {
  const responses = ["alpha", "beta", "gamma"].map((axis) =>
    rotationRateToCValControl({ alpha: 0, beta: 0, gamma: 0, [axis]: 10 }),
  );
  assert.deepEqual(responses[0], responses[1]);
  assert.deepEqual(responses[1], responses[2]);
});

test("reversing any axis immediately reverses A without weakening V or L", () => {
  for (const axis of ["alpha", "beta", "gamma"]) {
    const positive = rotationRateToCValControl({
      alpha: 0,
      beta: 0,
      gamma: 0,
      [axis]: 20,
    });
    const negative = rotationRateToCValControl({
      alpha: 0,
      beta: 0,
      gamma: 0,
      [axis]: -20,
    });
    assert.ok(positive.parameters.activity > 0.79);
    assert.ok(negative.parameters.activity < 0.21);
    assert.equal(positive.parameters.volatility, negative.parameters.volatility);
    assert.equal(positive.parameters.liquidity, negative.parameters.liquidity);
  }
});

test("mixed-axis cancellation remains energetic instead of disappearing", () => {
  const mixed = rotationRateToCValControl({ alpha: 20, beta: -20, gamma: 0 });
  assert.ok(mixed.parameters.volatility > 0.86);
  assert.equal(mixed.parameters.activity, 0.5);
  assert.ok(mixed.parameters.liquidity < 0.14);
});

test("large and continuous turns approach but never reach 0 or 1", () => {
  for (const rate of [20, 90, 360, 1_000]) {
    const { parameters, engaged } = rotationRateToCValControl({
      alpha: rate,
      beta: rate,
      gamma: rate,
    });
    assert.equal(engaged, true);
    assert.ok(Object.values(parameters).every((value) => value > 0 && value < 1));
  }
});

test("the legacy export delegates to the live production equation", () => {
  const rate = { alpha: 12, beta: -4, gamma: 3 };
  assert.deepEqual(
    orientationToCValParameters(rate),
    rotationRateToCValControl(rate).parameters,
  );
});

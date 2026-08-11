import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateCValHumanControls,
  normalizeCValHumanControl,
} from "./multi-user-control.mjs";

function control(overrides = {}, receivedAt = 1_000) {
  return normalizeCValHumanControl(
    {
      volatility: 0.4,
      activity: 0.5,
      liquidity: 0.6,
      engaged: true,
      ...overrides,
    },
    receivedAt,
  );
}

test("no current phone contribution stays disengaged at neutral V/A/L", () => {
  assert.deepEqual(aggregateCValHumanControls(new Map(), 1_000), {
    volatility: 0.5,
    activity: 0.5,
    liquidity: 0.5,
    engaged: false,
    contributors: 0,
    receivedAt: 1_000,
  });
});

test("multiple phones use one equal-weight arithmetic mean for V/A/L", () => {
  const result = aggregateCValHumanControls(
    new Map([
      ["left", control({ volatility: 0.2, activity: 0.4, liquidity: 0.2 })],
      ["right", control({ volatility: 0.8, activity: 0.6, liquidity: 0.8 })],
    ]),
    1_100,
  );

  assert.deepEqual(result, {
    volatility: 0.5,
    activity: 0.5,
    liquidity: 0.5,
    engaged: true,
    contributors: 2,
    receivedAt: 1_000,
  });
});

test("stale, resting, and malformed phone signals stay inactive", () => {
  assert.equal(normalizeCValHumanControl({ volatility: "high" }, 1_000), null);
  const result = aggregateCValHumanControls(
    new Map([
      ["stale", control({}, 100)],
      [
        "resting",
        control(
          {
            engaged: false,
          },
          1_000,
        ),
      ],
    ]),
    1_000,
  );
  assert.equal(result.engaged, false);
  assert.equal(result.contributors, 0);
});

import assert from "node:assert/strict";
import test from "node:test";
import { deriveCValMobileV2Readout } from "./presenter.ts";

const neutralControl = {
  volatility: 0.5,
  activity: 0.5,
  liquidity: 0.5,
  engaged: false,
  sampledAt: 0,
};

test("the v2 readout uses the exact current three-axis energy and signed sum", () => {
  const result = deriveCValMobileV2Readout(
    "current",
    { alpha: 10, beta: -4, gamma: 2 },
    neutralControl,
  );

  assert.equal(result.energy, 16);
  assert.equal(result.signedRotation, 8);
  assert.equal(result.inputUnit, "°/s");
});

test("the v2 readout describes the checkpoint as beta-only orientation", () => {
  const result = deriveCValMobileV2Readout(
    "07a5aaf",
    { alpha: 80, beta: -17.5, gamma: 30 },
    { ...neutralControl, volatility: 0.75, activity: 0.25, liquidity: 0.25 },
  );

  assert.equal(result.energy, 17.5);
  assert.equal(result.signedRotation, -17.5);
  assert.match(result.formulaLines[1], /A = 50 \+ 50d = 25/);
});

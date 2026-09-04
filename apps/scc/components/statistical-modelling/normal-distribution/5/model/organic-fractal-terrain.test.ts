import assert from "node:assert/strict";
import test from "node:test";
import {
  createOrganicFractalTerrain,
  ORGANIC_FRACTAL_MOUNTAIN_COUNT,
  ORGANIC_FRACTAL_VERTEX_COUNT,
  organicFractalPeakAddress,
  organicFractalPeakHeightAt,
} from "./organic-fractal-terrain";

test("the variable-radius packing grows denser as normal mountains get smaller", () => {
  const peaks = Array.from({ length: ORGANIC_FRACTAL_MOUNTAIN_COUNT }, (_, index) => (
    organicFractalPeakAddress(index)
  ));
  const outermost = peaks.reduce((current, peak) => (
    Math.hypot(peak.x, peak.z) > Math.hypot(current.x, current.z) ? peak : current
  ));

  assert.ok(ORGANIC_FRACTAL_MOUNTAIN_COUNT > 100);
  assert.equal(organicFractalPeakAddress(0).standardDeviation, 8.5);
  assert.ok(organicFractalPeakAddress(0).standardDeviation > outermost.standardDeviation);
});

test("the largest local component remains a centre-high normal peak", () => {
  assert.ok(organicFractalPeakHeightAt(0, 0) > organicFractalPeakHeightAt(3, 3));
  assert.ok(organicFractalPeakHeightAt(3, 3) > organicFractalPeakHeightAt(6, 6));
});

test("the organic field is one finite indexed surface", () => {
  const terrain = createOrganicFractalTerrain();

  assert.equal(terrain.positions.length, ORGANIC_FRACTAL_VERTEX_COUNT * 3);
  assert.equal(terrain.colors.length, ORGANIC_FRACTAL_VERTEX_COUNT * 3);
  assert.ok(terrain.positions.every(Number.isFinite));
  assert.ok(terrain.indices.every((index) => index < ORGANIC_FRACTAL_VERTEX_COUNT));
});

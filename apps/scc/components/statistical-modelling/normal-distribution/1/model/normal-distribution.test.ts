import assert from "node:assert/strict";
import test from "node:test";
import {
  createNormalSurface,
  DEFAULT_NORMAL_DISTRIBUTION,
  NORMAL_SURFACE_COUNT,
  normalHeightAt,
} from "./normal-distribution";

test("the centre of a normal surface rises above its tails", () => {
  const centre = normalHeightAt(0, 0, DEFAULT_NORMAL_DISTRIBUTION);
  const tail = normalHeightAt(4, 4, DEFAULT_NORMAL_DISTRIBUTION);

  assert.ok(centre > tail);
  assert.ok(centre > 3);
});

test("a narrower distribution has a higher peak", () => {
  const narrow = normalHeightAt(0, 0, { ...DEFAULT_NORMAL_DISTRIBUTION, deviation: 0.7 });
  const broad = normalHeightAt(0, 0, { ...DEFAULT_NORMAL_DISTRIBUTION, deviation: 1.8 });

  assert.ok(narrow > broad);
});

test("the surface provides a position and colour for every particle", () => {
  const surface = createNormalSurface(DEFAULT_NORMAL_DISTRIBUTION);

  assert.equal(surface.positions.length, NORMAL_SURFACE_COUNT * 3);
  assert.equal(surface.colors.length, NORMAL_SURFACE_COUNT * 3);
});

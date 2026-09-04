import assert from "node:assert/strict";
import test from "node:test";
import {
  createNormalMountainTerrain,
  NORMAL_MOUNTAIN_COUNT,
  NORMAL_MOUNTAIN_GRID_SIDE,
  NORMAL_MOUNTAIN_SURFACE_RESOLUTION,
  NORMAL_MOUNTAIN_VERTEX_COUNT,
  normalMountainAddress,
  normalMountainHeightAt,
} from "./normal-mountain-terrain";

test("the terrain holds four hundred addressed normal summits", () => {
  const addresses = Array.from({ length: NORMAL_MOUNTAIN_COUNT }, (_, index) => (
    normalMountainAddress(index)
  ));
  const locations = new Set(addresses.map(({ x, z }) => `${x}:${z}`));

  assert.equal(NORMAL_MOUNTAIN_COUNT, NORMAL_MOUNTAIN_GRID_SIDE ** 2);
  assert.equal(locations.size, NORMAL_MOUNTAIN_COUNT);
  assert.deepEqual(normalMountainAddress(0), { index: 0, column: 0, row: 0, x: -27.55, z: -27.55 });
  assert.deepEqual(normalMountainAddress(399), {
    index: 399,
    column: 19,
    row: 19,
    x: 27.55,
    z: 27.55,
  });
});

test("each normal summit is smooth and centre-high", () => {
  const summit = normalMountainHeightAt(0, 0);
  const slope = normalMountainHeightAt(0.54, 0.54);
  const foot = normalMountainHeightAt(1.08, 1.08);

  assert.ok(summit > slope);
  assert.ok(slope > foot);
});

test("the terrain is a finite high-resolution indexed surface", () => {
  const terrain = createNormalMountainTerrain();
  const cells = NORMAL_MOUNTAIN_SURFACE_RESOLUTION - 1;

  assert.equal(terrain.positions.length, NORMAL_MOUNTAIN_VERTEX_COUNT * 3);
  assert.equal(terrain.colors.length, NORMAL_MOUNTAIN_VERTEX_COUNT * 3);
  assert.equal(terrain.indices.length, cells * cells * 6);
  assert.ok(terrain.positions.every(Number.isFinite));
  assert.ok(terrain.indices.every((index) => index < NORMAL_MOUNTAIN_VERTEX_COUNT));
});

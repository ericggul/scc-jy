import assert from "node:assert/strict";
import test from "node:test";
import { simulateWaveReplicate, snapshotAt } from "./index.ts";

test("a seed produces a deterministic graph history", () => {
  const first = simulateWaveReplicate(8_222_023);
  const second = simulateWaveReplicate(8_222_023);

  assert.deepEqual(snapshotAt(first, 60), snapshotAt(second, 60));
});

test("growth changes both graph topology and colony-scale position", () => {
  const replicate = simulateWaveReplicate(9_182_023);
  const beginning = snapshotAt(replicate, 0);
  const middle = snapshotAt(replicate, 30);
  const late = snapshotAt(replicate, 60);

  assert.ok(middle.segments.length > beginning.segments.length);
  assert.ok(late.segments.length > middle.segments.length);
  assert.ok(late.totalLength > beginning.totalLength);
  assert.ok(late.frontDistance > beginning.frontDistance);
  assert.ok(late.branches.length > beginning.branches.length);
  assert.ok(late.fusions.length > 0);
});

test("replicates share rules but not a pre-recorded geometry", () => {
  const first = snapshotAt(simulateWaveReplicate(8_222_023), 60);
  const second = snapshotAt(simulateWaveReplicate(8_662_023), 60);

  assert.notDeepEqual(first.segments, second.segments);
  assert.notEqual(first.totalLength, second.totalLength);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  anastomosesAtHour,
  clampObservedHour,
  hourToVideoTime,
  nodesAtHour,
  videoTimeToHour,
  type Plate94Timeline,
} from "./index.ts";

const timeline: Plate94Timeline = {
  frames: [
    [[10, 20, 0]],
    [[10, 20, 1], [30, 40, 0]],
  ],
  anastomoses: [[1, 10, 20]],
};

test("laboratory hour and source-video time remain reciprocal", () => {
  assert.equal(hourToVideoTime(72), 14.4);
  assert.equal(videoTimeToHour(14.4), 72);
  assert.equal(clampObservedHour(-2), 0);
  assert.equal(clampObservedHour(200), 138);
});

test("a frame exposes measured nodes and accumulated fusion events", () => {
  assert.deepEqual(nodesAtHour(timeline, 0), [[10, 20, 0]]);
  assert.deepEqual(nodesAtHour(timeline, 1), [[10, 20, 1], [30, 40, 0]]);
  assert.deepEqual(anastomosesAtHour(timeline, 0), []);
  assert.deepEqual(anastomosesAtHour(timeline, 1), [[1, 10, 20]]);
});

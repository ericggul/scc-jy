import assert from "node:assert/strict";
import test from "node:test";
import {
  generateCValShakeTrace,
  validateCValOrientationTrace,
} from "./shake-trace.mjs";

test("synthetic human shake traces are deterministic, bounded, and irregular", () => {
  const first = generateCValShakeTrace({ seed: 77 });
  const repeat = generateCValShakeTrace({ seed: 77 });
  const different = generateCValShakeTrace({ seed: 78 });
  assert.deepEqual(first, repeat);
  assert.notDeepEqual(first.events.slice(0, 20), different.events.slice(0, 20));
  assert.equal(validateCValOrientationTrace(first), first);
  assert.ok(first.events.length > 450);
  assert.ok(first.events.some(({ phase }) => phase === "shake-1"));
  assert.ok(first.events.some(({ phase }) => phase === "recovery"));
  assert.ok(
    first.events.every(
      ({ alpha, beta, gamma }) =>
        alpha >= 0 &&
        alpha < 360 &&
        beta >= -180 &&
        beta <= 180 &&
        gamma >= -90 &&
        gamma <= 90,
    ),
  );
  const gaps = first.events
    .slice(1)
    .map((event, index) => event.tMs - first.events[index].tMs);
  assert.ok(Math.max(...gaps) > 35);
  assert.ok(Math.min(...gaps) < 16);
});

test("recorded trace validation rejects malformed or unordered samples", () => {
  assert.throws(
    () =>
      validateCValOrientationTrace({
        schemaVersion: 1,
        kind: "browser-device-orientation",
        events: [
          { id: "same", tMs: 10, alpha: 0, beta: 0, gamma: 0 },
          { id: "same", tMs: 5, alpha: 400, beta: 0, gamma: 0 },
        ],
      }),
    /unique string|monotonically|alpha/,
  );
});


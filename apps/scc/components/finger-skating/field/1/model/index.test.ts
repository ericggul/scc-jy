import assert from "node:assert/strict";
import test from "node:test";
import {
  createFieldSource,
  electricPotentialAt,
  fieldVectorAt,
  type FieldSource,
} from "./index.ts";

const source: FieldSource = {
  charge: 0.72,
  controlId: "like",
  createdAt: 0,
  id: "source",
  position: { x: 0.5, y: 0.5 },
};

test("field/1 deposits signed sources from current finger-skating controls", () => {
  const first = createFieldSource(undefined, {
    controlId: "send",
    id: "start",
    phase: "start",
    position: { x: 0.2, y: 0.4 },
    receivedAt: 0,
  });
  const second = createFieldSource(
    {
      controlId: "send",
      id: "start",
      phase: "start",
      position: { x: 0.2, y: 0.4 },
      receivedAt: 0,
    },
    {
      controlId: "like",
      id: "move",
      phase: "move",
      position: { x: 0.5, y: 0.4 },
      receivedAt: 100,
    },
  );

  assert.ok(first);
  assert.ok(second);
  assert.ok(first.charge < 0);
  assert.ok(second.charge > 0);
});

test("field/1 evaluates a persistent non-zero vector field before input", () => {
  const field = fieldVectorAt({
    aspectRatio: 1.5,
    now: 0,
    point: { x: 0.5, y: 0.2 },
    sources: [],
  });

  assert.ok(Math.hypot(field.x, field.y) > 0.01);
});

test("field/1 is the negative gradient of its defined potential", () => {
  const aspectRatio = 1.5;
  const point = { x: 0.52, y: 0.21 };
  const physicalStep = 0.0005;
  const potential = (x: number, y: number) =>
    electricPotentialAt({
      aspectRatio,
      now: 0,
      point: { x, y },
      sources: [],
    });
  const vector = fieldVectorAt({ aspectRatio, now: 0, point, sources: [] });
  const gradientX =
    (potential(point.x + physicalStep / aspectRatio, point.y) -
      potential(point.x - physicalStep / aspectRatio, point.y)) /
    (2 * physicalStep);
  const gradientY =
    (potential(point.x, point.y + physicalStep) -
      potential(point.x, point.y - physicalStep)) /
    (2 * physicalStep);

  assert.ok(Math.abs(vector.x + gradientX) < 0.05);
  assert.ok(Math.abs(vector.y + gradientY) < 0.05);
});

test("field/1 changes the field locally while a deposited source remains live", () => {
  const point = { x: 0.5, y: 0.58 };
  const baseline = fieldVectorAt({
    aspectRatio: 1,
    now: 250,
    point,
    sources: [],
  });
  const live = fieldVectorAt({
    aspectRatio: 1,
    now: 250,
    point,
    sources: [source],
  });
  const expired = fieldVectorAt({
    aspectRatio: 1,
    now: 15_000,
    point,
    sources: [source],
  });
  const futureBaseline = fieldVectorAt({
    aspectRatio: 1,
    now: 15_000,
    point,
    sources: [],
  });

  assert.ok(Math.hypot(live.x - baseline.x, live.y - baseline.y) > 0.1);
  assert.deepEqual(expired, futureBaseline);
});

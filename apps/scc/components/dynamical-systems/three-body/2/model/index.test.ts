import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_BODY_COUNT,
  INITIAL_INTEGRATOR_TIME_STEP,
  MAX_BODY_COUNT,
  MIN_BODY_COUNT,
  SOFTENING_LENGTH,
  accelerationsFor,
  advanceDormandPrince,
  createInitialState,
  isFiniteState,
  minimumSeparation,
  systemEnergy,
  totalMomentum,
} from "./index.ts";

function magnitude(vector: { x: number; y: number }) { return Math.hypot(vector.x, vector.y); }

test("the adjustable deterministic swarm clamps its count, mass, and momentum", () => {
  assert.deepEqual(createInitialState(), createInitialState(DEFAULT_BODY_COUNT));
  assert.equal(createInitialState(-10).bodies.length, MIN_BODY_COUNT);
  assert.equal(createInitialState(99).bodies.length, MAX_BODY_COUNT);
  assert.equal(createInitialState(Number.NaN).bodies.length, DEFAULT_BODY_COUNT);
  const state = createInitialState();
  assert.equal(state.bodies.length, DEFAULT_BODY_COUNT);
  assert.ok(Math.abs(state.bodies.reduce((sum, body) => sum + body.mass, 0) - 12) < 1e-12);
  assert.ok(magnitude(totalMomentum(state)) < 1e-14);
  const radii = state.bodies.map((body) => Math.hypot(body.position.x, body.position.y));
  assert.ok(Math.min(...radii) < 1.8);
  assert.ok(Math.max(...radii) > 4.2 && Math.max(...radii) < 5.8);
  assert.ok(Math.max(...radii) - Math.min(...radii) > 2.8);
  assert.ok(state.bodies.some((body) => magnitude(body.velocity) > 0.35));
});

test("Plummer softening keeps an exact close encounter finite and force-consistent", () => {
  const state = { bodies: [
    { id: "a", mass: 6, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } },
    { id: "b", mass: 6, position: { x: SOFTENING_LENGTH / 10, y: 0 }, velocity: { x: 0, y: 0 } },
  ] } as const;
  const [first, second] = accelerationsFor(state);
  assert.ok(first && second && Number.isFinite(first.x) && Number.isFinite(second.x));
  assert.ok(Math.abs(6 * first.x + 6 * second.x) < 1e-12);
  assert.ok(Number.isFinite(systemEnergy(state)));
  assert.ok(minimumSeparation(state) < SOFTENING_LENGTH);
});

test("twenty softened bodies retain bounded momentum and energy over ten model seconds", () => {
  let state = createInitialState(20);
  const initialEnergy = systemEnergy(state);
  let nextTimeStep = INITIAL_INTEGRATOR_TIME_STEP;
  let elapsed = 0;
  let maximumRadius = 0;
  while (elapsed < 10) {
    const step = advanceDormandPrince(state, nextTimeStep);
    state = step.state;
    nextTimeStep = step.nextTimeStep;
    elapsed += step.timeStep;
    maximumRadius = Math.max(
      maximumRadius,
      ...state.bodies.map((body) => Math.hypot(body.position.x, body.position.y)),
    );
  }
  assert.ok(isFiniteState(state));
  assert.ok(magnitude(totalMomentum(state)) < 1e-10);
  assert.ok(Math.abs(systemEnergy(state) - initialEnergy) < 2e-4);
  assert.ok(maximumRadius < 7, `a body reached radius ${maximumRadius}`);
});

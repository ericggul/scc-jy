import assert from "node:assert/strict";
import test from "node:test";
import {
  CHAOTIC_DOUBLE_WELL,
  COLOUR_ATTRACTOR_REFERENCE,
  MAXIMUM_INTEGRATION_STEP,
  advanceDuffing,
  advanceDuffingEnsemble,
  accelerationAt,
  dampingPower,
  effectivePotentialAt,
  forcingAt,
  forcingPeriod,
  initialDuffingState,
  isFiniteDuffingState,
  mechanicalEnergy,
  potentialAt,
  wellPositions,
  type DuffingParameters,
} from "./index.ts";

function assertClose(actual: number, expected: number, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} is not ${expected}`);
}

test("the driven Duffing acceleration is evaluated from the displayed equation", () => {
  const state = initialDuffingState(CHAOTIC_DOUBLE_WELL);
  assertClose(forcingAt(0, CHAOTIC_DOUBLE_WELL), 0.3);
  assertClose(accelerationAt(state, CHAOTIC_DOUBLE_WELL), 0.3);
  assertClose(
    accelerationAt({ time: Math.PI, displacement: 1, velocity: 0.5 }, CHAOTIC_DOUBLE_WELL),
    -0.3 - 0.1 + 1 - 1,
  );
});

test("the coloured-attractor reference is the published sine-driven system", () => {
  const state = initialDuffingState(COLOUR_ATTRACTOR_REFERENCE);
  assertClose(forcingAt(0, COLOUR_ATTRACTOR_REFERENCE), 0, 1e-10);
  assertClose(forcingAt(Math.PI / 2, COLOUR_ATTRACTOR_REFERENCE), 3, 1e-10);
  assertClose(accelerationAt(state, COLOUR_ATTRACTOR_REFERENCE), 0, 1e-10);
});

test("negative linear stiffness and positive cubic stiffness produce the double well", () => {
  assert.deepEqual(wellPositions(CHAOTIC_DOUBLE_WELL), [-1, 1]);
  assertClose(potentialAt(0, CHAOTIC_DOUBLE_WELL), 0);
  assertClose(potentialAt(-1, CHAOTIC_DOUBLE_WELL), -0.25);
  assertClose(potentialAt(1, CHAOTIC_DOUBLE_WELL), -0.25);
  assertClose(effectivePotentialAt(1, 0, CHAOTIC_DOUBLE_WELL), -0.55);
  assertClose(dampingPower({ time: 0, displacement: 0, velocity: -2 }, CHAOTIC_DOUBLE_WELL), 0.8);
});

test("the unforced and undamped RK4 trajectory preserves mechanical energy over a bounded run", () => {
  const conservative: DuffingParameters = {
    ...CHAOTIC_DOUBLE_WELL,
    damping: 0,
    forcingAmplitude: 0,
    linearStiffness: 1,
    initialDisplacement: 0.7,
    initialVelocity: 0.3,
  };
  const initial = initialDuffingState(conservative);
  const result = advanceDuffing(initial, conservative, 100);

  assert.ok(isFiniteDuffingState(result));
  assert.ok(Math.abs(mechanicalEnergy(result, conservative) - mechanicalEnergy(initial, conservative)) < 1e-9);
});

test("integration can arrive at an exact stroboscopic forcing period", () => {
  const initial = initialDuffingState(CHAOTIC_DOUBLE_WELL);
  const period = forcingPeriod(CHAOTIC_DOUBLE_WELL);
  const sample = advanceDuffing(initial, CHAOTIC_DOUBLE_WELL, period);

  assert.ok(isFiniteDuffingState(sample));
  assert.equal(sample.time, period);
});

test("ensemble RK4 uses the same state update as the single-orbit integrator", () => {
  const initial = initialDuffingState(COLOUR_ATTRACTOR_REFERENCE);
  const positions = new Float64Array([initial.displacement]);
  const velocities = new Float64Array([initial.velocity]);
  const duration = 0.25;

  const resultingTime = advanceDuffingEnsemble(
    positions,
    velocities,
    initial.time,
    COLOUR_ATTRACTOR_REFERENCE,
    duration,
    MAXIMUM_INTEGRATION_STEP,
  );
  const singleOrbit = advanceDuffing(initial, COLOUR_ATTRACTOR_REFERENCE, duration);

  assert.equal(resultingTime, singleOrbit.time);
  assertClose(positions[0]!, singleOrbit.displacement, 1e-12);
  assertClose(velocities[0]!, singleOrbit.velocity, 1e-12);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  INITIAL_INTEGRATOR_TIME_STEP,
  PYTHAGOREAN_INITIAL_STATE,
  accelerationsFor,
  advanceDormandPrince,
  centerOfMass,
  isFiniteState,
  kineticEnergy,
  minimumSeparation,
  pairwiseRelations,
  potentialEnergy,
  systemEnergy,
  totalMomentum,
} from "./index.ts";

function assertClose(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} is not ${expected}`);
}

test("Burrau's initial state is the 3–4–5 Pythagorean free-fall problem", () => {
  assert.deepEqual(
    PYTHAGOREAN_INITIAL_STATE.bodies.map((body) => [body.id, body.mass]),
    [["mass-3", 3], ["mass-4", 4], ["mass-5", 5]],
  );
  assert.equal(minimumSeparation(PYTHAGOREAN_INITIAL_STATE), 3);
  const center = centerOfMass(PYTHAGOREAN_INITIAL_STATE);
  assert.ok(Math.abs(center.x) < 1e-12);
  assert.ok(Math.abs(center.y) < 1e-12);
  assert.deepEqual(totalMomentum(PYTHAGOREAN_INITIAL_STATE), { x: 0, y: 0 });
});

test("pairwise Newtonian forces have no net external force", () => {
  const netForce = accelerationsFor(PYTHAGOREAN_INITIAL_STATE).reduce(
    (sum, acceleration, index) => {
      const body = PYTHAGOREAN_INITIAL_STATE.bodies[index];
      if (!body) return sum;
      return {
        x: sum.x + body.mass * acceleration.x,
        y: sum.y + body.mass * acceleration.y,
      };
    },
    { x: 0, y: 0 },
  );
  assert.ok(Math.abs(netForce.x) < 1e-12);
  assert.ok(Math.abs(netForce.y) < 1e-12);
});

test("the initial accelerations come directly from the inverse-cube Newtonian field", () => {
  const [mass3, mass4, mass5] = accelerationsFor(PYTHAGOREAN_INITIAL_STATE);
  assert.ok(mass3 && mass4 && mass5);

  assertClose(mass3.x, -12 / 125);
  assertClose(mass3.y, -16 / 125 - 20 / 64);
  assertClose(mass4.x, 9 / 125 + 15 / 27);
  assertClose(mass4.y, 12 / 125);
  assertClose(mass5.x, -12 / 27);
  assertClose(mass5.y, 12 / 64);
});

test("pair distances, forces, and the energy budget are derived from the same state", () => {
  const relations = pairwiseRelations(PYTHAGOREAN_INITIAL_STATE);
  assert.deepEqual(
    relations.map(({ first, second, distance, forceMagnitude }) => [
      first.id,
      second.id,
      distance,
      forceMagnitude,
    ]),
    [
      ["mass-3", "mass-4", 5, 12 / 25],
      ["mass-3", "mass-5", 4, 15 / 16],
      ["mass-4", "mass-5", 3, 20 / 9],
    ],
  );
  assert.equal(kineticEnergy(PYTHAGOREAN_INITIAL_STATE), 0);
  assertClose(potentialEnergy(PYTHAGOREAN_INITIAL_STATE), -12 / 5 - 15 / 4 - 20 / 3);
});

test("adaptive Dormand–Prince resolves the close encounter and later scattering without a large energy jump", () => {
  const initialEnergy = systemEnergy(PYTHAGOREAN_INITIAL_STATE);
  let state = PYTHAGOREAN_INITIAL_STATE;
  let nextTimeStep = INITIAL_INTEGRATOR_TIME_STEP;
  let elapsed = 0;
  let closest = Infinity;

  while (elapsed < 100) {
    const result = advanceDormandPrince(state, nextTimeStep);
    state = result.state;
    nextTimeStep = result.nextTimeStep;
    elapsed += result.timeStep;
    closest = Math.min(closest, minimumSeparation(state));
  }

  assert.ok(isFiniteState(state));
  assert.ok(closest < 0.01);
  assert.ok(Math.abs(systemEnergy(state) - initialEnergy) < 0.0001);
});

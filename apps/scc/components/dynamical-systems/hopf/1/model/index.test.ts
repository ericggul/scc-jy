import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_HOPF_PARAMETERS,
  HOMOCLINIC_BIFURCATION,
  advanceHopf,
  derivativeAt,
  isFiniteHopfState,
  jacobianAt,
  saddleEquilibriumAt,
  type HopfParameters,
} from "./index.ts";

function assertClose(actual: number, expected: number, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} is not ${expected}`);
}

test("the origin remains a fixed point of the quadratic Hopf example", () => {
  assert.deepEqual(derivativeAt({ x: 0, y: 0 }, DEFAULT_HOPF_PARAMETERS), { x: 0, y: 0 });
});

test("the quadratic vector field is evaluated from the referenced Hopf example", () => {
  const parameters: HopfParameters = { bifurcation: 0.03 };
  assert.deepEqual(
    derivativeAt({ x: 0.2, y: -0.1 }, parameters),
    { x: -0.134, y: -0.123 },
  );
});

test("the origin has the Hopf linearization at μ = 0", () => {
  assert.deepEqual(
    jacobianAt({ x: 0, y: 0 }, { bifurcation: 0 }),
    { xx: 0, xy: 1, yx: -1, yy: 0 },
  );
});

test("the quadratic system retains its second equilibrium", () => {
  const parameters: HopfParameters = { bifurcation: 0.045 };
  const saddle = saddleEquilibriumAt(parameters);

  assertClose(derivativeAt(saddle, parameters).x, 0);
  assertClose(derivativeAt(saddle, parameters).y, 0);
});

test("the documented homoclinic parameter is available to the interactive range", () => {
  assert.equal(HOMOCLINIC_BIFURCATION, 0.06605695);
  const result = advanceHopf(
    { x: 0.08, y: 0 },
    { bifurcation: HOMOCLINIC_BIFURCATION },
    120,
  );

  assert.ok(isFiniteHopfState(result));
});

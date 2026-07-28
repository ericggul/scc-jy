import assert from "node:assert/strict";
import test from "node:test";
import {
  runCValShakeHarness,
  runCValShakeRobustnessSuite,
} from "./shake-harness.mjs";
import { cValShakeSystemAdapter } from "./shake-system-adapter.mjs";
import { generateCValShakeTrace } from "./shake-trace.mjs";

test("default shake workflow passes across independent market paths", () => {
  const trace = generateCValShakeTrace();
  const suite = runCValShakeRobustnessSuite(trace);
  assert.equal(suite.ok, true);
  assert.equal(suite.runs.length, 5);
  assert.ok(suite.summary.priceRange.median >= 0.5);
  assert.ok(
    suite.gates
      .filter(({ id }) =>
        ["conservation", "market-integrity", "bounded-runtime"].includes(id),
      )
      .every(({ passRate }) => passRate === 1),
  );
});

test("the runner uses an injected production adapter instead of copied logic", () => {
  const trace = generateCValShakeTrace({ seed: 19, durationMs: 2_000 });
  let stepCalls = 0;
  const trackingAdapter = {
    ...cValShakeSystemAdapter,
    id: "tracking-adapter",
    step(runtime, now) {
      stepCalls += 1;
      cValShakeSystemAdapter.step(runtime, now);
    },
  };
  const report = runCValShakeHarness(trace, {
    marketSeed: 19,
    systemAdapter: trackingAdapter,
    acceptancePolicy: () => [],
  });
  assert.equal(report.ok, true);
  assert.equal(report.trace.systemAdapter, "tracking-adapter");
  assert.ok(stepCalls > 0);
});

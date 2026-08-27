import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceCValIdleLifecycle,
  cValIdleLifecycleTiming,
} from "./idle-lifecycle.mjs";

test("idle lifecycle closes after ten seconds and resets after one closed minute", () => {
  assert.deepEqual(cValIdleLifecycleTiming, {
    inactiveToClosingMs: 10_000,
    closingToResetMs: 60_000,
  });

  const justBeforeClosing = advanceCValIdleLifecycle({
    phase: "active",
    engaged: false,
    now: 9_999,
    inactiveAt: 0,
  });
  assert.equal(justBeforeClosing.transition, null);

  const closing = advanceCValIdleLifecycle({
    phase: "active",
    engaged: false,
    now: 10_000,
    inactiveAt: 0,
  });
  assert.deepEqual(closing, {
    inactiveAt: 0,
    closingAt: 10_000,
    transition: "close",
  });

  const justBeforeReset = advanceCValIdleLifecycle({
    phase: "closing-auction",
    engaged: false,
    now: 69_999,
    closingAt: closing.closingAt,
  });
  assert.equal(justBeforeReset.transition, null);

  const reset = advanceCValIdleLifecycle({
    phase: "closing-auction",
    engaged: false,
    now: 70_000,
    closingAt: closing.closingAt,
  });
  assert.deepEqual(reset, {
    inactiveAt: null,
    closingAt: null,
    transition: "reset",
  });
});

test("a fresh engaged phone cancels either pending idle deadline", () => {
  assert.deepEqual(
    advanceCValIdleLifecycle({
      phase: "closing-auction",
      engaged: true,
      now: 20_000,
      inactiveAt: 0,
      closingAt: 10_000,
    }),
    { inactiveAt: null, closingAt: null, transition: null },
  );
});

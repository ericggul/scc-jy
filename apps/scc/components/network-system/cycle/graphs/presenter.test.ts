import assert from "node:assert/strict";
import test from "node:test";
import { createInitialCycleSnapshot } from "@/components/network-system/cycle/model";
import { cycleGraphPath, presentCycleGraphs } from "./presenter.ts";

test("graphs expose all nine Cycle nodes in controller spatial order", () => {
  const readings = presentCycleGraphs(createInitialCycleSnapshot());
  assert.equal(readings.length, 9);
  assert.deepEqual(
    readings.map(({ id }) => id),
    [
      "household-demand",
      "production",
      "inventories",
      "wage-share",
      "employment",
      "investment",
      "inflation",
      "policy-rate",
      "credit",
    ],
  );
});

test("each graph includes the current value even between history samples", () => {
  const snapshot = createInitialCycleSnapshot();
  snapshot.values.employment = -0.42;
  const employment = presentCycleGraphs(snapshot).find(
    ({ id }) => id === "employment",
  );
  assert.equal(employment?.value, -0.42);
  assert.equal(employment?.display, "-0.42");
  assert.equal(employment?.trend, "falling");
});

test("graph paths use a centered zero axis and remain finite", () => {
  const path = cycleGraphPath([-100, 0, 100], 108);
  assert.match(path, /^M0\.00 57\.78 L50\.00 30\.00 L100\.00 2\.22$/);
  assert.equal(path.includes("NaN"), false);
});

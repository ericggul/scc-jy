import assert from "node:assert/strict";
import test from "node:test";
import { createInitialCycleSnapshot } from "@/components/network-system/cycle/model";
import { presentCycleTerminalMetrics } from "./presenter.ts";

test("terminal presenter translates all nine model nodes into economic metrics", () => {
  const metrics = presentCycleTerminalMetrics(createInitialCycleSnapshot());
  assert.equal(metrics.length, 9);
  assert.deepEqual(
    metrics.map(({ code }) => code),
    [
      "PCE YOY",
      "IP YOY",
      "INV YOY",
      "AHE YOY",
      "NFP YOY",
      "BFI YOY",
      "CPI YOY",
      "POL RATE",
      "CRDT YOY",
    ],
  );
});

test("terminal metrics include the newest snapshot and finite chart geometry", () => {
  const snapshot = createInitialCycleSnapshot();
  snapshot.values.employment = -0.42;
  const metric = presentCycleTerminalMetrics(snapshot).find(
    ({ id }) => id === "employment",
  );
  assert.equal(metric?.display, "-0.30");
  assert.equal(metric?.trend, "negative");
  assert.equal(metric?.path.includes("NaN"), false);
});

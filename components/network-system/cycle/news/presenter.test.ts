import assert from "node:assert/strict";
import test from "node:test";
import {
  changedCycleNewsSignals,
  cycleNewsCadence,
  cycleNewsMarqueeDuration,
  presentCycleNewsDigest,
} from "./presenter.ts";
import { createInitialCycleSnapshot } from "../model/index.ts";
import {
  countCycleNewsHeadlines,
  cycleNewsHeadlineLibrary,
} from "./headlines.ts";

function withChange(
  nodeId: "production" | "inflation" | "investment",
  value: number,
  growth = 0,
) {
  const snapshot = createInitialCycleSnapshot();
  snapshot.values[nodeId] = value;
  snapshot.gdpGrowth = growth;
  return snapshot;
}

test("news digest draws sector-specific, percent-resolved economic headlines", () => {
  const snapshot = withChange("production", 0.2, 3.2);
  snapshot.values.inflation = 0.14;
  snapshot.values.investment = -0.12;

  const digest = presentCycleNewsDigest(snapshot);
  assert.equal(digest.signals.length, 9);
  assert.equal(digest.signals.find((signal) => signal.id === "production")?.regime, "rising");
  assert.equal(digest.signals.find((signal) => signal.id === "inflation")?.regime, "surging");
  assert.equal(digest.signals.find((signal) => signal.id === "investment")?.regime, "plunging");
  assert.match(
    digest.signals.find((signal) => signal.id === "production")?.headline ?? "",
    /3\.2%/,
  );
  assert.ok(digest.activity > 0);
});

test("news events follow visible headline changes, not hidden snapshot revisions", () => {
  const quiet = presentCycleNewsDigest(createInitialCycleSnapshot());
  const moving = presentCycleNewsDigest(withChange("investment", 0.1));
  const changed = changedCycleNewsSignals(quiet, moving);

  assert.deepEqual(changed.map((signal) => signal.id), ["investment"]);
  assert.deepEqual(changedCycleNewsSignals(moving, moving), []);

  const laterRevision = withChange("investment", 0.1);
  laterRevision.revision = 42;
  assert.deepEqual(
    changedCycleNewsSignals(moving, presentCycleNewsDigest(laterRevision)),
    [],
  );
});

test("each of the nine sectors has fifty fixed English headline templates", () => {
  for (const nodeId of Object.keys(cycleNewsHeadlineLibrary)) {
    assert.equal(
      countCycleNewsHeadlines(nodeId as keyof typeof cycleNewsHeadlineLibrary),
      50,
    );
  }
});

test("headline cadence rises with current economic movement and remains bounded", () => {
  assert.equal(cycleNewsCadence(0), 3000);
  assert.equal(cycleNewsCadence(1), 900);
  assert.equal(cycleNewsCadence(10), 900);
  assert.equal(cycleNewsCadence(-1), 3000);
});

test("headline movement accelerates with each sector's current change intensity", () => {
  assert.equal(cycleNewsMarqueeDuration(0), 24);
  assert.equal(cycleNewsMarqueeDuration(0.5), 15);
  assert.equal(cycleNewsMarqueeDuration(1), 6);
  assert.equal(cycleNewsMarqueeDuration(10), 6);
  assert.equal(cycleNewsMarqueeDuration(-1), 24);
});

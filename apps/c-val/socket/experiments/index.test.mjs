import assert from "node:assert/strict";
import test from "node:test";
import { cValExperiment, cValExperiments, cValRoom } from "./index.mjs";

test("c-val retains its live room and event prefix while exposing one experiment", () => {
  assert.equal(cValRoom, "experiment:c-val:2");
  assert.equal(cValExperiment.id, "c-val:2");
  assert.deepEqual(cValExperiments, [cValExperiment]);
  assert.ok(Object.values(cValExperiment.events).every((event) => event.startsWith("c-val-2:")));
  assert.equal(cValExperiment.events.relayRestartIn, "c-val-2:relay-restart:in");
  assert.equal(cValExperiment.events.relayReloadOut, "c-val-2:relay-reload:out");
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  networkSystemCValExperiment,
  networkSystemCValRoom,
} from "./index.mjs";
import { networkSystemCycleExperiment } from "../cycle/index.mjs";

test("c-val owns an isolated room and event prefix", () => {
  assert.equal(
    networkSystemCValRoom,
    "experiment:network-system:c-val",
  );
  assert.notEqual(
    networkSystemCValExperiment.events.join,
    networkSystemCycleExperiment.events.join,
  );
  assert.ok(
    Object.values(networkSystemCValExperiment.events).every((event) =>
      event.startsWith("network-system-c-val:"),
    ),
  );
});

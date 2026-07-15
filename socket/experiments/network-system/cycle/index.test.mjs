import assert from "node:assert/strict";
import test from "node:test";
import {
  networkSystemCycleExperiment,
  networkSystemCycleRoom,
} from "./index.mjs";
import { networkSystemMacroEconomyExperiment } from "../macro-economy/index.mjs";

test("cycle socket namespace and room are isolated from macro economy", () => {
  assert.equal(networkSystemCycleRoom, "experiment:network-system:cycle");
  assert.notEqual(
    networkSystemCycleExperiment.events.join,
    networkSystemMacroEconomyExperiment.events.join,
  );
  assert.notEqual(
    networkSystemCycleExperiment.events.stateOut,
    networkSystemMacroEconomyExperiment.events.stateOut,
  );
  assert.ok(
    Object.values(networkSystemCycleExperiment.events).every((event) =>
      event.startsWith("network-system-cycle:"),
    ),
  );
});

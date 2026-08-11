import assert from "node:assert/strict";
import test from "node:test";
import {
  cValOneExperiment,
  cValOneRoom,
} from "./index.mjs";
import { cValTwoExperiment } from "../2/index.mjs";

test("c-val 1 owns an isolated versioned room and event prefix", () => {
  assert.equal(cValOneRoom, "experiment:c-val:1");
  assert.equal(cValOneExperiment.id, "c-val:1");
  assert.notEqual(
    cValOneExperiment.events.join,
    cValTwoExperiment.events.join,
  );
  assert.ok(
    Object.values(cValOneExperiment.events).every((event) =>
      event.startsWith("c-val-1:"),
    ),
  );
});

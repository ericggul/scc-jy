import assert from "node:assert/strict";
import test from "node:test";
import {
  cValTwoExperiment,
  cValTwoRoom,
} from "./index.mjs";
import { cValOneExperiment } from "../1/index.mjs";

test("c-val 2 owns an isolated versioned room and event prefix", () => {
  assert.equal(cValTwoRoom, "experiment:c-val:2");
  assert.equal(cValTwoExperiment.id, "c-val:2");
  assert.notEqual(
    cValTwoExperiment.events.join,
    cValOneExperiment.events.join,
  );
  assert.ok(
    Object.values(cValTwoExperiment.events).every((event) =>
      event.startsWith("c-val-2:"),
    ),
  );
});


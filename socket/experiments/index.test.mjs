import assert from "node:assert/strict";
import test from "node:test";
import { experiments } from "./index.mjs";

test("socket experiment registry has unique ids and event names", () => {
  const ids = experiments.map((experiment) => experiment.id);
  const eventNames = experiments.flatMap((experiment) =>
    Object.values(experiment.events),
  );

  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(eventNames).size, eventNames.length);
});

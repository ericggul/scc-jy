import assert from "node:assert/strict";
import test from "node:test";
import {
  createCValRuntime as createOne,
  setCValOrientation as orientOne,
  snapshotCValRuntime as snapshotOne,
  stepCValRuntime as stepOne,
} from "./1/model.mjs";
import {
  createCValRuntime as createTwo,
  snapshotCValRuntime as snapshotTwo,
} from "./2/model.mjs";
import { cValOneExperiment, cValOneRoom } from "./1/index.mjs";
import { cValTwoExperiment, cValTwoRoom } from "./2/index.mjs";

test("c-val versions own disjoint identity, events, rooms, and runtime state", () => {
  assert.notEqual(cValOneExperiment.id, cValTwoExperiment.id);
  assert.notEqual(cValOneRoom, cValTwoRoom);
  assert.deepEqual(
    new Set([
      ...Object.values(cValOneExperiment.events),
      ...Object.values(cValTwoExperiment.events),
    ]).size,
    Object.keys(cValOneExperiment.events).length +
      Object.keys(cValTwoExperiment.events).length,
  );

  const one = createOne(0, "version-one", 101);
  const two = createTwo(0, "version-two", 101);
  orientOne(
    one,
    { absolute: false, alpha: 90, beta: 90, gamma: -45 },
    1_000,
  );
  stepOne(one, 1_000, 0.05);

  const oneSnapshot = snapshotOne(one);
  const twoSnapshot = snapshotTwo(two);
  assert.equal(oneSnapshot.version, "1");
  assert.equal(twoSnapshot.version, "2");
  assert.notDeepEqual(oneSnapshot.parameters, twoSnapshot.parameters);
  assert.deepEqual(twoSnapshot.parameters, {
    volatility: 0.5,
    activity: 0.5,
    liquidity: 0.5,
  });
});

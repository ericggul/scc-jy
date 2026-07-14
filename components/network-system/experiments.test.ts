import assert from "node:assert/strict";
import test from "node:test";
import {
  isNetworkSystemScreenRoute,
  networkSystemExperiments,
} from "./experiments.ts";

test("cycle exposes four institution screens and two video screens", () => {
  const cycle = networkSystemExperiments.find(
    (experiment) => experiment.slug === "cycle",
  );
  assert.deepEqual(cycle?.screenIds, ["1", "2", "3", "4", "left", "right"]);
});

test("cycle route validation accepts only declared screens and whole", () => {
  for (const route of ["1", "2", "3", "4", "left", "right", "whole"]) {
    assert.equal(isNetworkSystemScreenRoute("cycle", route), true);
  }
  for (const route of ["5", "video", "both", ""]) {
    assert.equal(isNetworkSystemScreenRoute("cycle", route), false);
  }
  assert.equal(isNetworkSystemScreenRoute("macro-economy", "left"), false);
});

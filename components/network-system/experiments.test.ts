import assert from "node:assert/strict";
import test from "node:test";
import {
  isNetworkSystemScreenRoute,
  networkSystemExperiments,
} from "./experiments.ts";

test("cycle exposes v1 and v2 employment and graph screens", () => {
  const cycle = networkSystemExperiments.find(
    (experiment) => experiment.slug === "cycle",
  );
  assert.deepEqual(cycle?.screenIds, [
    "news",
    "employment",
    "employment-2",
    "graphs",
    "graphs-2",
    "left",
    "right",
  ]);
});

test("cycle route validation accepts only declared screens and whole", () => {
  for (const route of [
    "news",
    "employment",
    "employment-2",
    "graphs",
    "graphs-2",
    "left",
    "right",
    "whole",
  ]) {
    assert.equal(isNetworkSystemScreenRoute("cycle", route), true);
  }
  for (const route of ["1", "2", "3", "4", "video", "both", ""]) {
    assert.equal(isNetworkSystemScreenRoute("cycle", route), false);
  }
  assert.equal(isNetworkSystemScreenRoute("macro-economy", "left"), false);
});

test("c-val reserves the market and future response wrappers", () => {
  const cVal = networkSystemExperiments.find(
    (experiment) => experiment.slug === "c-val",
  );
  assert.deepEqual(cVal?.screenIds, [
    "market",
    "news",
    "media",
    "employment",
  ]);
  for (const route of [
    "market",
    "news",
    "media",
    "employment",
    "whole",
  ]) {
    assert.equal(isNetworkSystemScreenRoute("c-val", route), true);
  }
  assert.equal(isNetworkSystemScreenRoute("c-val", "graphs"), false);
});

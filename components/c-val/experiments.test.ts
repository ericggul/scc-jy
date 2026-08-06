import assert from "node:assert/strict";
import test from "node:test";
import {
  cValExperiments,
  isCValScreenRoute,
  isCValVersion,
} from "./experiments.ts";

test("c-val registry exposes two complete version boundaries", () => {
  assert.deepEqual(
    cValExperiments.map(({ version, status }) => ({ version, status })),
    [
      { version: "1", status: "stable" },
      { version: "2", status: "experimental" },
    ],
  );
  assert.equal(isCValVersion("1"), true);
  assert.equal(isCValVersion("2"), true);
  assert.equal(isCValVersion("3"), false);
});

test("each c-val version validates only its declared screen routes", () => {
  for (const screen of ["market", "news", "media", "employment", "whole"]) {
    assert.equal(isCValScreenRoute("1", screen), true);
  }
  for (const screen of ["rollercoaster", "news", "media", "whole"]) {
    assert.equal(isCValScreenRoute("2", screen), true);
  }
  assert.equal(isCValScreenRoute("1", "rollercoaster"), false);
  assert.equal(isCValScreenRoute("2", "market"), false);
  assert.equal(isCValScreenRoute("2", "employment"), false);
  assert.equal(isCValScreenRoute("2", "rollercoaster-legacy"), true);
  assert.equal(isCValScreenRoute("1", "graphs"), false);
  assert.equal(isCValScreenRoute("2", "graphs"), false);
});

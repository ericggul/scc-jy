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
  for (const screen of ["rollercoaster", "casino", "comments", "comments-legacy", "news", "media", "whole"]) {
    assert.equal(isCValScreenRoute("1", screen), true);
  }
  for (const screen of ["comments", "comments-legacy", "news", "media", "whole"]) {
    assert.equal(isCValScreenRoute("2", screen), true);
  }
  assert.equal(isCValScreenRoute("2", "rollercoaster"), false);
  assert.equal(isCValScreenRoute("2", "casino"), false);
  assert.equal(isCValScreenRoute("2", "market"), false);
  assert.equal(isCValScreenRoute("2", "employment"), false);
  assert.equal(isCValScreenRoute("2", "rollercoaster-legacy"), false);
  assert.equal(isCValScreenRoute("2", "casino-legacy"), false);
  assert.equal(isCValScreenRoute("1", "graphs"), false);
  assert.equal(isCValScreenRoute("2", "graphs"), false);
  assert.equal(isCValScreenRoute("1", "raw"), false);
  assert.equal(isCValScreenRoute("2", "raw"), false);
});

test("casino and rollercoaster remain in C-VAL 1 but are removed only from C-VAL 2", () => {
  const cValOne = cValExperiments.find(({ version }) => version === "1");
  const cValTwo = cValExperiments.find(({ version }) => version === "2");
  assert.deepEqual(cValOne?.screenIds, ["rollercoaster", "news", "media"]);
  assert.deepEqual(cValOne?.standaloneScreenIds, ["casino", "comments"]);
  assert.deepEqual(cValOne?.archivedScreenIds, ["comments-legacy"]);
  assert.deepEqual(cValTwo?.screenIds, ["news", "media"]);
  assert.deepEqual(cValTwo?.standaloneScreenIds, ["comments"]);
  assert.deepEqual(cValTwo?.archivedScreenIds, ["comments-legacy"]);
});

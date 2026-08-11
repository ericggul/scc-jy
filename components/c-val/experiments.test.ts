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
  for (const screen of ["rollercoaster", "casino", "graphs", "raw", "comments", "comments-legacy", "news", "media", "whole"]) {
    assert.equal(isCValScreenRoute("2", screen), true);
  }
  assert.equal(isCValScreenRoute("1", "rollercoaster"), false);
  assert.equal(isCValScreenRoute("2", "market"), false);
  assert.equal(isCValScreenRoute("2", "employment"), false);
  assert.equal(isCValScreenRoute("2", "rollercoaster-legacy"), false);
  assert.equal(isCValScreenRoute("2", "casino-legacy"), false);
  assert.equal(isCValScreenRoute("1", "graphs"), false);
  assert.equal(isCValScreenRoute("2", "graphs"), true);
  assert.equal(isCValScreenRoute("1", "raw"), false);
  assert.equal(isCValScreenRoute("2", "raw"), true);
});

test("additional screens remain standalone and do not rewrite the existing C-VAL 2 screen set", () => {
  const cValTwo = cValExperiments.find(({ version }) => version === "2");
  assert.deepEqual(cValTwo?.screenIds, ["rollercoaster", "news", "media"]);
  assert.deepEqual(cValTwo?.standaloneScreenIds, ["casino", "graphs", "raw", "comments"]);
  assert.deepEqual(cValTwo?.archivedScreenIds, ["comments-legacy"]);
});

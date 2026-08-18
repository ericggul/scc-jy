import assert from "node:assert/strict";
import test from "node:test";
import { cValScreenIds, isCValScreenRoute } from "./screens.ts";

test("c-val exposes only its default screen routes", () => {
  assert.deepEqual(cValScreenIds, ["news", "media", "comments", "comments-legacy"]);
  for (const screen of [...cValScreenIds, "whole"]) {
    assert.equal(isCValScreenRoute(screen), true);
  }
  assert.equal(isCValScreenRoute("rollercoaster"), false);
  assert.equal(isCValScreenRoute("casino"), false);
});

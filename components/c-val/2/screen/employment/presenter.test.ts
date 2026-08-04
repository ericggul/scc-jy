import assert from "node:assert/strict";
import test from "node:test";
import {
  C_VAL_PEOPLE_COUNT,
  C_VAL_PEOPLE_FULL_CHANGE,
  cValPeopleFromChange,
} from "./presenter.ts";

test("an unchanged market keeps the people field evenly split", () => {
  const state = cValPeopleFromChange(0);
  assert.equal(state.smilingCount, C_VAL_PEOPLE_COUNT / 2);
  assert.equal(state.cryingCount, C_VAL_PEOPLE_COUNT / 2);
});

test("price direction changes the same stable people field", () => {
  assert.equal(cValPeopleFromChange(C_VAL_PEOPLE_FULL_CHANGE).smilingCount, C_VAL_PEOPLE_COUNT);
  assert.equal(cValPeopleFromChange(-C_VAL_PEOPLE_FULL_CHANGE).cryingCount, C_VAL_PEOPLE_COUNT);
});

test("abnormal and non-finite prices cannot exceed the field", () => {
  assert.equal(cValPeopleFromChange(10_000).smilingCount, C_VAL_PEOPLE_COUNT);
  assert.equal(cValPeopleFromChange(Number.NaN).smilingCount, C_VAL_PEOPLE_COUNT / 2);
});

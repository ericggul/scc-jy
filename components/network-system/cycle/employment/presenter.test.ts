import assert from "node:assert/strict";
import test from "node:test";
import { createInitialCycleSnapshot } from "@/components/network-system/cycle/model";
import {
  EMPLOYMENT_FAMILY_COUNT,
  presentCycleEmploymentFamilies,
} from "./presenter.ts";

function snapshotWithEmployment(current: number, history: number[] = []) {
  const snapshot = createInitialCycleSnapshot();
  snapshot.values.employment = current;
  snapshot.history.employment = history;
  return snapshot;
}

test("employment at or above the normal current level keeps every family happy", () => {
  assert.equal(
    presentCycleEmploymentFamilies(snapshotWithEmployment(0.2)).distressedCount,
    0,
  );
  assert.equal(
    presentCycleEmploymentFamilies(snapshotWithEmployment(0.03)).distressedCount,
    0,
  );
});

test("a small current shortfall affects at least one family", () => {
  assert.equal(
    presentCycleEmploymentFamilies(snapshotWithEmployment(0.029)).distressedCount,
    1,
  );
});

test("the current employment midpoint affects half of the family field", () => {
  const state = presentCycleEmploymentFamilies(snapshotWithEmployment(-0.26));
  assert.equal(state.shortfall, 0.29000000000000004);
  assert.equal(state.distressedCount, EMPLOYMENT_FAMILY_COUNT / 2);
});

test("large and abnormal current employment values stay within the family field", () => {
  assert.equal(
    presentCycleEmploymentFamilies(snapshotWithEmployment(-50)).distressedCount,
    EMPLOYMENT_FAMILY_COUNT,
  );
});

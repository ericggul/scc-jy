import assert from "node:assert/strict";
import test from "node:test";
import { createInitialCycleSnapshot } from "@/components/network-system/cycle/model";
import {
  EMPLOYMENT_EMOJI_COUNT,
  presentCycleEmploymentEmojis,
} from "./presenter.ts";

function snapshotWithEmployment(value: number) {
  const snapshot = createInitialCycleSnapshot();
  snapshot.values.employment = value;
  return snapshot;
}

test("emoji field is balanced at zero and responds directly to current employment", () => {
  assert.equal(
    presentCycleEmploymentEmojis(snapshotWithEmployment(0)).distressedCount,
    EMPLOYMENT_EMOJI_COUNT / 2,
  );
  assert.equal(
    presentCycleEmploymentEmojis(snapshotWithEmployment(0.5)).distressedCount,
    600,
  );
  assert.equal(
    presentCycleEmploymentEmojis(snapshotWithEmployment(-0.5)).distressedCount,
    1000,
  );
  assert.equal(
    presentCycleEmploymentEmojis(snapshotWithEmployment(2)).distressedCount,
    0,
  );
  assert.equal(
    presentCycleEmploymentEmojis(snapshotWithEmployment(-2)).distressedCount,
    EMPLOYMENT_EMOJI_COUNT,
  );
});

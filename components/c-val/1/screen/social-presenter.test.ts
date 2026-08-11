import assert from "node:assert/strict";
import test from "node:test";
import { createInitialCValSnapshot } from "@/components/c-val/1/model";
import {
  cValPriceChange,
  cValSocialIntensity,
  cValSocialRegimeFor,
} from "./social-presenter.ts";

test("a waiting market produces no social price movement", () => {
  const snapshot = createInitialCValSnapshot();
  snapshot.market.changeFromOpenPercent = 25;
  assert.equal(cValPriceChange(snapshot), 0);
});

test("social regimes are symmetric around a quiet band", () => {
  assert.equal(cValSocialRegimeFor(-3), "crash");
  assert.equal(cValSocialRegimeFor(-0.26), "down");
  assert.equal(cValSocialRegimeFor(0.25), "flat");
  assert.equal(cValSocialRegimeFor(0.26), "up");
  assert.equal(cValSocialRegimeFor(3), "surge");
});

test("social intensity remains finite and bounded", () => {
  const snapshot = createInitialCValSnapshot();
  snapshot.phase = "active";
  snapshot.market.changeFromOpenPercent = 1_000;
  snapshot.market.oneSecondMovePercent = Number.NaN;
  assert.equal(cValSocialIntensity(snapshot), 1);
});

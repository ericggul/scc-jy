import assert from "node:assert/strict";
import test from "node:test";
import {
  createInitialCValSnapshot,
  type CValSnapshot,
} from "@/components/c-val/2/model";
import {
  cValSocietyHeadlineCombinationCount,
  selectCValSocietyHeadline,
} from "./society-headlines.ts";
import {
  cValSocietyRegimeFor,
  presentCValSocietyEvents,
} from "./society-presenter.ts";
import { cValNewsAdmissionIntervalMs } from "./presenter.ts";
import {
  C_VAL_SOCIETY_CADENCE_JITTER,
  cValSocietyAdmissionIntervalMs,
} from "../cadence.ts";

function activeSnapshot(
  revision: number,
  overrides: Partial<CValSnapshot["market"]> = {},
): CValSnapshot {
  const snapshot = createInitialCValSnapshot();
  return {
    ...snapshot,
    runId: "society-test",
    phase: "active",
    revision,
    serverTime: revision * 50,
    market: {
      ...snapshot.market,
      index: 108,
      changeFromOpenPercent: 8,
      oneSecondMovePercent: 3,
      orderImbalance: 0.35,
      spreadBps: 6,
      realizedVolatilityBps: 45,
      ...overrides,
    },
  };
}

test("the society grammar exposes far more than two thousand combinations", () => {
  assert.ok(cValSocietyHeadlineCombinationCount >= 2_000);
});

test("society cadence preserves the market curve mean with bounded noise", () => {
  for (const move of [0, 1, 8, 30]) {
    const base = cValNewsAdmissionIntervalMs(move);
    assert.equal(cValSocietyAdmissionIntervalMs(move, 0.5), base);
    assert.equal(
      cValSocietyAdmissionIntervalMs(move, 0),
      Math.round(base * (1 - C_VAL_SOCIETY_CADENCE_JITTER)),
    );
    assert.equal(
      cValSocietyAdmissionIntervalMs(move, 1),
      Math.round(base * (1 + C_VAL_SOCIETY_CADENCE_JITTER)),
    );
  }
});

test("society regimes distinguish surge, rebound, contest, and crash", () => {
  assert.equal(cValSocietyRegimeFor(null, activeSnapshot(1, { oneSecondMovePercent: 9 })), "surge");
  assert.equal(
    cValSocietyRegimeFor(
      activeSnapshot(1, { oneSecondMovePercent: -1 }),
      activeSnapshot(2, { oneSecondMovePercent: 0.4 }),
    ),
    "rebound",
  );
  assert.equal(cValSocietyRegimeFor(null, activeSnapshot(1, { oneSecondMovePercent: -9 })), "crash");
  assert.equal(
    cValSocietyRegimeFor(null, activeSnapshot(1, {
      oneSecondMovePercent: 0,
      orderImbalance: 0.4,
    })),
    "contest",
  );
});

test("society events are transition-derived and use non-market topic codes", () => {
  const events = presentCValSocietyEvents(null, activeSnapshot(1));
  assert.ok(events.length >= 2);
  assert.ok(events.every((event) => event.id.startsWith("society:")));
  assert.ok(events.some((event) => event.code !== "MKT"));
});

test("visible template ids force a distinct society form", () => {
  const input = {
    regime: "rise" as const,
    key: "same-market-transition",
    context: { price: 108, dayMove: 3, openMove: 8, spreadBps: 6 },
    preferredTopicIds: ["party-politics"],
  };
  const first = selectCValSocietyHeadline({
    ...input,
    excludedTemplateIds: new Set(),
  });
  const second = selectCValSocietyHeadline({
    ...input,
    excludedTemplateIds: new Set([first.templateId]),
  });
  assert.notEqual(second.templateId, first.templateId);
  assert.notEqual(second.headline, first.headline);
});

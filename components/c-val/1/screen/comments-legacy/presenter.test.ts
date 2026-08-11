import assert from "node:assert/strict";
import test from "node:test";
import type { CValSnapshot } from "../../model/index.ts";
import {
  cValCommentGapMs,
  cValCommentPlaybackRate,
  censorCValCommentText,
  presentCValCommentPulse,
  selectCValCommentPerformance,
  shouldAdmitCValComment,
  type CValCommentCorpusEntry,
} from "./presenter.ts";

function activeSnapshot(movePercent: number) {
  return {
    phase: "active",
    runId: "run-a",
    revision: 1,
    serverTime: 1_000,
    market: { oneSecondMovePercent: movePercent },
  } as CValSnapshot;
}

function waitingSnapshot() {
  return {
    phase: "waiting",
    runId: "waiting",
    revision: 0,
    serverTime: 0,
    market: { oneSecondMovePercent: 10 },
  } as CValSnapshot;
}

const entries: CValCommentCorpusEntry[] = [
  {
    id: "cedar-up",
    voice: "cedar",
    dialectId: "seoul-casual",
    dialectLabel: "서울·경기 생활말",
    presetId: "u007",
    styleId: "delighted-disbelief",
    valence: "positive",
    arousal: 0.86,
    text: "와, 씨발.",
    src: "/cedar.wav",
    profanityStatus: "present",
    profanityStart: 0.4,
    profanityEnd: 0.9,
  },
  {
    id: "marin-up",
    voice: "marin",
    dialectId: "jeju",
    dialectLabel: "제주",
    presetId: "u007",
    styleId: "delighted-disbelief",
    valence: "positive",
    arousal: 0.86,
    text: "와, 씨발.",
    src: "/marin.wav",
    profanityStatus: "present",
    profanityStart: 0.5,
    profanityEnd: 1,
  },
  {
    id: "cedar-down",
    voice: "cedar",
    dialectId: "busan-gyeongnam",
    dialectLabel: "부산·경남",
    presetId: "u023",
    styleId: "panic-impact",
    valence: "negative",
    arousal: 0.96,
    text: "잠깐만 씨발, 안 돼.",
    src: "/down.wav",
    profanityStatus: "present",
    profanityStart: 0.6,
    profanityEnd: 1.1,
  },
];

test("comments remain quiet while waiting or below the rapid-move threshold", () => {
  assert.equal(presentCValCommentPulse(waitingSnapshot()), null);
  assert.equal(presentCValCommentPulse(activeSnapshot(0.74)), null);
});

test("visible comments mask every profanity token without changing source performances", () => {
  assert.equal(censorCValCommentText("씨발, 뭐야. 씨발."), "**, 뭐야. **.");
  assert.equal(entries[0].text, "와, 씨발.");
});

test("rapid moves become direction-specific, quantized pulses", () => {
  const rise = presentCValCommentPulse(activeSnapshot(1.6));
  const fall = presentCValCommentPulse(activeSnapshot(-1.6));
  assert.equal(rise?.direction, "up");
  assert.equal(fall?.direction, "down");
  assert.notEqual(rise?.signature, fall?.signature);
});

test("admission repeats a sustained bucket at an intensity-dependent gap", () => {
  const pulse = presentCValCommentPulse(activeSnapshot(1.6));
  const fasterPulse = presentCValCommentPulse(activeSnapshot(5.8));
  assert.ok(pulse);
  assert.ok(fasterPulse);
  assert.equal(shouldAdmitCValComment(pulse, null, 0, 100), true);
  assert.equal(shouldAdmitCValComment(pulse, pulse.signature, 100, 200), false);
  assert.equal(
    shouldAdmitCValComment(pulse, pulse.signature, 100, 100 + cValCommentGapMs(pulse)),
    true,
  );
  assert.equal(shouldAdmitCValComment(pulse, "other", 100, 199), false);
  assert.equal(shouldAdmitCValComment(pulse, "other", 100, 200), true);
  assert.ok(cValCommentGapMs(fasterPulse) < cValCommentGapMs(pulse));
  assert.ok(cValCommentPlaybackRate(fasterPulse) > cValCommentPlaybackRate(pulse));
});

test("selection alternates voices and never assigns a positive-only delivery to a fall", () => {
  const rise = presentCValCommentPulse(activeSnapshot(2));
  const fall = presentCValCommentPulse(activeSnapshot(-2));
  assert.ok(rise);
  assert.ok(fall);
  assert.equal(selectCValCommentPerformance(entries, rise, 0)?.voice, "cedar");
  assert.equal(selectCValCommentPerformance(entries, rise, 1)?.voice, "marin");
  assert.equal(selectCValCommentPerformance(entries, fall, 0)?.styleId, "panic-impact");
});

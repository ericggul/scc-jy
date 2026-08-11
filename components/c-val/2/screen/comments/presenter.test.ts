import assert from "node:assert/strict";
import test from "node:test";
import type { CValSnapshot } from "../../model/index.ts";
import { C_VAL_CHAT_CORPUS, C_VAL_CHAT_ROOMS } from "./corpus.ts";
import {
  C_VAL_COMMENT_VOICE_TRIGGER_PERCENT,
  cValCommentAdmissionIntervalMs,
  cValCommentRegime,
  cValVisibleChatRoomCount,
  censorCValCommentText,
  presentCValChatMessage,
  presentCValCommentPulse,
  selectCValCommentPerformance,
  shouldAdmitCValCommentVoice,
  type CValCommentCorpusEntry,
} from "./presenter.ts";

function activeSnapshot(movePercent: number) {
  return {
    phase: "active",
    runId: "run-a",
    revision: 1,
    serverTime: 10_000,
    market: {
      oneSecondMovePercent: movePercent,
      changeFromOpenPercent: movePercent / 2,
      index: 101.25,
    },
  } as CValSnapshot;
}

const entries: CValCommentCorpusEntry[] = [
  {
    id: "cedar-up", voice: "cedar", dialectId: "seoul", dialectLabel: "서울",
    presetId: "u1", styleId: "delighted-disbelief", valence: "positive",
    arousal: 0.9, text: "와, 씨발.", src: "/up.wav", profanityStatus: "present",
    profanityStart: 0.3, profanityEnd: 0.8,
  },
  {
    id: "cedar-down", voice: "cedar", dialectId: "seoul", dialectLabel: "서울",
    presetId: "d1", styleId: "panic-impact", valence: "negative",
    arousal: 0.96, text: "잠깐만 씨발.", src: "/down.wav", profanityStatus: "present",
    profanityStart: 0.4, profanityEnd: 0.9,
  },
];

test("the authored archive contains sixteen rooms and more than 4,000 stable entries", () => {
  assert.equal(C_VAL_CHAT_ROOMS.length, 16);
  assert.equal(C_VAL_CHAT_CORPUS.length, 4_608);
  assert.equal(new Set(C_VAL_CHAT_CORPUS.map((entry) => entry.id)).size, 4_608);
  assert.equal(new Set(C_VAL_CHAT_CORPUS.map((entry) => entry.text)).size, 4_608);
  assert.equal(C_VAL_CHAT_CORPUS.some((entry) => entry.text.includes("씨발")), false);
});

test("the responsive contract keeps two rows while admitting only visible rooms", () => {
  assert.equal(cValVisibleChatRoomCount(1_920), 16);
  assert.equal(cValVisibleChatRoomCount(1_600), 14);
  assert.equal(cValVisibleChatRoomCount(1_300), 12);
  assert.equal(cValVisibleChatRoomCount(700), 6);
  assert.equal(cValVisibleChatRoomCount(500), 4);

  const firstVisibleMessages = Array.from({ length: 6 }, (_, sequence) => (
    presentCValChatMessage({
      snapshot: activeSnapshot(0),
      previousMovePercent: 0,
      sequence,
      roomLimit: 6,
      previousRoomMessage: null,
    })
  ));
  assert.deepEqual(
    firstVisibleMessages.map((message) => message?.roomId),
    C_VAL_CHAT_ROOMS.slice(0, 6).map((room) => room.id),
  );
});

test("market movement maps to distinct conversational regimes", () => {
  assert.equal(cValCommentRegime(0.1), "flat");
  assert.equal(cValCommentRegime(0.6), "rise");
  assert.equal(cValCommentRegime(2.1), "rally");
  assert.equal(cValCommentRegime(7), "surge");
  assert.equal(cValCommentRegime(-0.6), "fall");
  assert.equal(cValCommentRegime(-2.1), "selloff");
  assert.equal(cValCommentRegime(-7), "crash");
  assert.equal(cValCommentRegime(-1, 1), "reversal");
});

test("chat cadence continuously accelerates with exact move magnitude", () => {
  const quiet = cValCommentAdmissionIntervalMs(0, 4);
  const moving = cValCommentAdmissionIntervalMs(3, 4);
  const extreme = cValCommentAdmissionIntervalMs(30, 4);
  assert.ok(quiet > moving);
  assert.ok(moving > extreme);
  assert.ok(extreme >= 30);
});

test("every admitted message belongs to one room and uses actual market values", () => {
  const message = presentCValChatMessage({
    snapshot: activeSnapshot(2.4),
    previousMovePercent: 2.2,
    sequence: 3,
    previousRoomMessage: null,
  });
  assert.ok(message);
  assert.ok(C_VAL_CHAT_ROOMS.some((room) => room.id === message.roomId));
  assert.match(message.text, /101\.25|\+2\.40%|\+1\.20%/);
});

test("a room forms a reply chain against its own previous speaker", () => {
  const first = presentCValChatMessage({
    snapshot: activeSnapshot(0.4),
    previousMovePercent: 0.3,
    sequence: 0,
    roomLimit: 1,
    roomMessageCount: 0,
    previousRoomMessage: null,
  });
  assert.ok(first);
  const reply = presentCValChatMessage({
    snapshot: activeSnapshot(0.5),
    previousMovePercent: 0.4,
    sequence: 1,
    roomLimit: 1,
    roomMessageCount: 1,
    previousRoomMessage: first,
  });
  assert.equal(reply?.replyToAuthor, first.author);
  assert.notEqual(reply?.author, first.author);
});

test("profanity and voice remain unavailable below the extreme threshold", () => {
  assert.equal(presentCValCommentPulse(activeSnapshot(C_VAL_COMMENT_VOICE_TRIGGER_PERCENT - 0.01)), null);
  const pulse = presentCValCommentPulse(activeSnapshot(C_VAL_COMMENT_VOICE_TRIGGER_PERCENT));
  assert.ok(pulse);
  assert.equal(shouldAdmitCValCommentVoice(pulse, 9_500, 10_000), false);
  assert.equal(censorCValCommentText("씨발, 뭐야. 씨발."), "**, 뭐야. **.");
});

test("voice performance valence follows rise and fall direction", () => {
  const rise = presentCValCommentPulse(activeSnapshot(8));
  const fall = presentCValCommentPulse(activeSnapshot(-8));
  assert.ok(rise);
  assert.ok(fall);
  assert.equal(selectCValCommentPerformance(entries, rise, 0)?.valence, "positive");
  assert.equal(selectCValCommentPerformance(entries, fall, 0)?.valence, "negative");
});

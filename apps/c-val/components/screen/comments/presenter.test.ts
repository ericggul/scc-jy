import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { CValSnapshot } from "../../model/index.ts";
import { C_VAL_CHAT_CORPUS, C_VAL_CHAT_ROOMS } from "./corpus.ts";
import {
  C_VAL_COMMENT_VOICE_TRIGGER_PERCENT,
  C_VAL_COMMENT_CENSOR_BEEP_DETUNE_RATIO,
  C_VAL_COMMENT_CENSOR_DELAY_SOURCE_SECONDS,
  C_VAL_COMMENT_CENSOR_ENABLED,
  C_VAL_COMMENT_DIALECT_ORDER,
  C_VAL_COMMENT_ORDINARY_PER_VOICE,
  cValCommentAdmissionIntervalMs,
  cValCommentCensorDelayPlaybackSeconds,
  cValCommentCensorBeepFrequencyHz,
  cValCommentDetuneCents,
  cValCommentEffectivePlaybackRate,
  cValCommentPlaybackRate,
  cValCommentVoiceGapMs,
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

test("the authored archive preserves original comments and adds a short layer", () => {
  assert.equal(C_VAL_CHAT_ROOMS.length, 16);
  assert.equal(C_VAL_CHAT_CORPUS.length, 9_216);
  assert.equal(new Set(C_VAL_CHAT_CORPUS.map((entry) => entry.id)).size, 9_216);
  assert.equal(new Set(C_VAL_CHAT_CORPUS.map((entry) => entry.text)).size, 9_216);
  assert.equal(C_VAL_CHAT_CORPUS.filter((entry) => entry.length === "original").length, 4_608);
  assert.equal(C_VAL_CHAT_CORPUS.filter((entry) => entry.length === "short").length, 4_608);
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

test("original and newly added short comments remain mixed in the live stream", () => {
  const lengths = Array.from({ length: 160 }, (_, sequence) => (
    presentCValChatMessage({
      snapshot: activeSnapshot(2.4),
      previousMovePercent: 2.2,
      sequence,
      previousRoomMessage: null,
    })?.text.length ?? 0
  ));
  assert.ok(lengths.some((length) => length <= 30));
  assert.ok(lengths.some((length) => length >= 40));
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
  assert.equal(shouldAdmitCValCommentVoice(pulse, 9_900, 10_000), false);
  assert.equal(C_VAL_COMMENT_CENSOR_ENABLED, true);
  assert.equal(censorCValCommentText("씨발, 뭐야. 씨발."), "C-VAL, 뭐야. C-VAL.");
});

test("the censor beep keeps speech speed but receives half its pitch transform", () => {
  assert.equal(cValCommentEffectivePlaybackRate(1.2, 1_200), 2.4);
  assert.equal(C_VAL_COMMENT_CENSOR_BEEP_DETUNE_RATIO, 0.3);
  assert.equal(C_VAL_COMMENT_CENSOR_DELAY_SOURCE_SECONDS, 0.3);
  assert.ok(Math.abs(cValCommentCensorDelayPlaybackSeconds(1.2) - 0.25) < 0.000_001);
  assert.ok(Math.abs(cValCommentCensorDelayPlaybackSeconds(0.96) - 0.3125) < 0.000_001);
  assert.equal(
    cValCommentCensorBeepFrequencyHz(1_000, 1.2, 1_200),
    1_200 * 2 ** 0.3,
  );
  assert.ok(cValCommentCensorBeepFrequencyHz(1_000, 0.96, -120) < 1_000);
});

test("voice aggregation accelerates sharply with the same continuous market curve", () => {
  assert.equal(C_VAL_COMMENT_ORDINARY_PER_VOICE, 2);
  const threshold = presentCValCommentPulse(activeSnapshot(2));
  const surge = presentCValCommentPulse(activeSnapshot(6));
  const extreme = presentCValCommentPulse(activeSnapshot(15));
  assert.ok(threshold);
  assert.ok(surge);
  assert.ok(extreme);
  assert.ok(cValCommentVoiceGapMs(threshold) <= 150);
  assert.ok(cValCommentVoiceGapMs(surge) <= 80);
  assert.equal(cValCommentVoiceGapMs(extreme), 30);
});

test("voice performance valence follows rise and fall direction", () => {
  const rise = presentCValCommentPulse(activeSnapshot(8));
  const fall = presentCValCommentPulse(activeSnapshot(-8));
  assert.ok(rise);
  assert.ok(fall);
  assert.equal(selectCValCommentPerformance(entries, rise, 0)?.valence, "positive");
  assert.equal(selectCValCommentPerformance(entries, fall, 0)?.valence, "negative");
});

test("rises pitch upward while falls pitch downward with increasing intensity", () => {
  const mildRise = presentCValCommentPulse(activeSnapshot(2));
  const extremeRise = presentCValCommentPulse(activeSnapshot(15));
  const mildFall = presentCValCommentPulse(activeSnapshot(-2));
  const extremeFall = presentCValCommentPulse(activeSnapshot(-15));
  assert.ok(mildRise && extremeRise && mildFall && extremeFall);
  assert.ok(cValCommentDetuneCents(mildRise) > 0);
  assert.ok(cValCommentDetuneCents(extremeRise) > cValCommentDetuneCents(mildRise));
  assert.equal(cValCommentDetuneCents(extremeRise), 1_200);
  assert.equal(cValCommentPlaybackRate(extremeRise), 1.2);
  assert.ok(cValCommentDetuneCents(mildFall) < 0);
  assert.ok(cValCommentDetuneCents(extremeFall) < cValCommentDetuneCents(mildFall));
  assert.ok(cValCommentPlaybackRate(extremeRise) > cValCommentPlaybackRate(extremeFall));
});

test("dialect remains an eight-way performance color instead of the diversity limit", () => {
  const dialectEntries = ["cedar", "marin"].flatMap((voice) => (
    C_VAL_COMMENT_DIALECT_ORDER.flatMap((dialectId) => (
      Array.from({ length: 2 }, (_, variant) => ({
        ...entries[0],
        id: `${voice}:${dialectId}:${variant}`,
        voice,
        dialectId,
        src: `/${voice}/${dialectId}/${variant}.wav`,
      }))
    ))
  ));
  const pulse = presentCValCommentPulse(activeSnapshot(8));
  assert.ok(pulse);
  const selected = Array.from(
    { length: 16 },
    (_, sequence) => selectCValCommentPerformance(dialectEntries, pulse, sequence),
  );
  for (const voice of ["cedar", "marin"]) {
    const dialects = selected
      .filter((entry) => entry?.voice === voice)
      .map((entry) => entry?.dialectId);
    assert.equal(dialects.length, C_VAL_COMMENT_DIALECT_ORDER.length);
    assert.deepEqual(new Set(dialects), new Set(C_VAL_COMMENT_DIALECT_ORDER));
  }
});

test("each market band exhausts its distinct scripts before repeating one", () => {
  const styles = [
    "startle-flash",
    "delighted-disbelief",
    "suspended-attention",
    "relief-rebound",
    "cynical-laughter",
    "compulsive-focus",
    "somatic-overload",
  ];
  const scriptEntries = ["cedar", "marin"].flatMap((voice) => (
    styles.flatMap((styleId, styleIndex) => (
      Array.from({ length: 6 }, (_, scriptIndex) => {
        const presetId = `u${String(styleIndex * 6 + scriptIndex + 1).padStart(3, "0")}`;
        return C_VAL_COMMENT_DIALECT_ORDER.map((dialectId) => ({
          ...entries[0],
          id: `${voice}:${dialectId}:${presetId}`,
          voice,
          dialectId,
          presetId,
          styleId,
          src: `/${voice}/${dialectId}/${presetId}.wav`,
        }));
      })
    )).flat()
  ));
  const pulse = presentCValCommentPulse(activeSnapshot(6));
  assert.ok(pulse);
  const firstCycle = Array.from(
    { length: 84 },
    (_, sequence) => selectCValCommentPerformance(scriptEntries, pulse, sequence),
  );
  for (const voice of ["cedar", "marin"]) {
    const voiceScripts = firstCycle
      .filter((entry) => entry?.voice === voice)
      .map((entry) => entry?.presetId);
    assert.equal(voiceScripts.length, 42);
    assert.equal(new Set(voiceScripts).size, 42);
  }
  assert.equal(
    selectCValCommentPerformance(scriptEntries, pulse, 84)?.presetId,
    firstCycle[0]?.presetId,
  );
});

test("the real corpus exposes all 78 authored scripts across market situations", () => {
  const corpus = JSON.parse(readFileSync(
    new URL("../../../../public/audio/c-val/exclamations/comments-index.json", import.meta.url),
    "utf8",
  )) as { entries: CValCommentCorpusEntry[] };
  const selectedPresetIds = new Set<string>();
  for (const move of [2.2, 6, 15, -2.2, -6, -15]) {
    const pulse = presentCValCommentPulse(activeSnapshot(move));
    assert.ok(pulse);
    const situationalPresetIds = new Set(
      Array.from({ length: 240 }, (_, sequence) => (
        selectCValCommentPerformance(corpus.entries, pulse, sequence)?.presetId
      )).filter((presetId): presetId is string => Boolean(presetId)),
    );
    assert.ok(situationalPresetIds.size >= 30);
    for (const presetId of situationalPresetIds) selectedPresetIds.add(presetId);
  }
  assert.equal(selectedPresetIds.size, 78);
});

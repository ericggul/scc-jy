import type { CValSnapshot } from "@/components/2/model";
import { cValSocialAdmissionIntervalMs } from "../cadence.ts";
import { cValStableHash, finite } from "../social-presenter.ts";
import {
  C_VAL_CHAT_CORPUS,
  C_VAL_CHAT_ROOMS,
  type CValChatCorpusEntry,
  type CValChatRegime,
  type CValChatRoomId,
} from "./corpus.ts";

export const C_VAL_COMMENT_ARCHIVE_PER_ROOM = 28;
export const C_VAL_COMMENT_ORDINARY_PER_VOICE = 2;
export const C_VAL_COMMENT_VOICE_TRIGGER_PERCENT = 2;
export const C_VAL_COMMENT_VOICE_SLOWEST_GAP_MS = 220;
export const C_VAL_COMMENT_VOICE_FASTEST_GAP_MS = 30;
export const C_VAL_COMMENT_UP_MINIMUM_PLAYBACK_RATE = 1;
export const C_VAL_COMMENT_UP_MAXIMUM_PLAYBACK_RATE = 1.2;
export const C_VAL_COMMENT_DOWN_MINIMUM_PLAYBACK_RATE = 0.96;
export const C_VAL_COMMENT_DOWN_MAXIMUM_PLAYBACK_RATE = 1.06;
export const C_VAL_COMMENT_UP_MINIMUM_DETUNE_CENTS = 90;
export const C_VAL_COMMENT_UP_MAXIMUM_DETUNE_CENTS = 1_200;
export const C_VAL_COMMENT_DOWN_MINIMUM_DETUNE_CENTS = -120;
export const C_VAL_COMMENT_DOWN_MAXIMUM_DETUNE_CENTS = -360;
export const C_VAL_COMMENT_DIALECT_ORDER = [
  "seoul-casual",
  "busan-gyeongnam",
  "daegu-gyeongbuk",
  "daejeon-chungnam",
  "gangneung-yeongdong",
  "gwangju-jeonnam",
  "jeonju-jeonbuk",
  "jeju",
] as const;

export type CValCommentDirection = "up" | "down";

export type CValCommentPulse = {
  signature: string;
  runId: string;
  direction: CValCommentDirection;
  intensity: number;
  movePercent: number;
};

export type CValCommentCorpusEntry = {
  id: string;
  voice: string;
  dialectId: string;
  dialectLabel: string;
  presetId: string;
  styleId: string;
  valence: "positive" | "negative" | "ambiguous" | "mixed";
  arousal: number;
  text: string;
  src: string;
  profanityStatus: "present" | "missing-in-source-audio";
  profanityStart: number | null;
  profanityEnd: number | null;
};

export type CValCommentCorpus = {
  schemaVersion: 1;
  beep: {
    frequencyHz: number;
    peakGain: number;
    fadeSeconds: number;
  };
  entries: CValCommentCorpusEntry[];
};

export type CValChatMessage = {
  id: string;
  roomId: CValChatRoomId;
  corpusId: string;
  author: string;
  text: string;
  regime: CValChatRegime;
  direction: "up" | "down" | "neutral" | "mixed";
  occurredAt: number;
  replyToAuthor: string | null;
};

export function cValVisibleChatRoomCount(containerWidth: number) {
  if (containerWidth < 620) return 4;
  if (containerWidth < 820) return 6;
  if (containerWidth < 1_040) return 8;
  if (containerWidth < 1_260) return 10;
  if (containerWidth < 1_470) return 12;
  if (containerWidth < 1_680) return 14;
  return 16;
}

const voiceStyleBands: Record<
  CValCommentDirection,
  readonly { maximumIntensity: number; styles: ReadonlySet<string> }[]
> = {
  up: [
    {
      maximumIntensity: 0.2,
      styles: new Set([
        "suspended-attention", "delighted-disbelief", "relief-rebound",
        "cynical-laughter", "compulsive-focus",
      ]),
    },
    {
      maximumIntensity: 0.55,
      styles: new Set([
        "startle-flash", "delighted-disbelief", "suspended-attention",
        "relief-rebound", "cynical-laughter", "compulsive-focus",
        "somatic-overload",
      ]),
    },
    {
      maximumIntensity: 1,
      styles: new Set([
        "startle-flash", "delighted-disbelief", "relief-rebound",
        "cynical-laughter", "compulsive-focus", "somatic-overload",
      ]),
    },
  ],
  down: [
    {
      maximumIntensity: 0.2,
      styles: new Set([
        "suspended-attention", "helpless-collapse", "bitter-regret",
        "numb-flat", "compulsive-focus", "fragile-plea", "cynical-laughter",
      ]),
    },
    {
      maximumIntensity: 0.55,
      styles: new Set([
        "startle-flash", "panic-impact", "angry-rejection",
        "helpless-collapse", "bitter-regret", "fragile-plea",
        "somatic-overload",
      ]),
    },
    {
      maximumIntensity: 1,
      styles: new Set([
        "startle-flash", "panic-impact", "angry-rejection",
        "helpless-collapse", "somatic-overload",
      ]),
    },
  ],
};

function voiceBandFor(pulse: CValCommentPulse) {
  return voiceStyleBands[pulse.direction].find(
    ({ maximumIntensity }) => pulse.intensity <= maximumIntensity,
  ) ?? voiceStyleBands[pulse.direction].at(-1)!;
}

const corpusByRoomAndRegime = new Map<string, CValChatCorpusEntry[]>();
for (const entry of C_VAL_CHAT_CORPUS) {
  const key = `${entry.roomId}:${entry.regime}`;
  const pool = corpusByRoomAndRegime.get(key) ?? [];
  pool.push(entry);
  corpusByRoomAndRegime.set(key, pool);
}

export function cValCommentRegime(
  movePercent: number,
  previousMovePercent: number | null = null,
): CValChatRegime {
  const move = finite(movePercent);
  const previous = previousMovePercent == null ? 0 : finite(previousMovePercent);
  if (
    Math.abs(move) >= 0.4
    && Math.abs(previous) >= 0.4
    && Math.sign(move) !== Math.sign(previous)
  ) return "reversal";

  const magnitude = Math.abs(move);
  if (magnitude < 0.15) return "flat";
  if (move > 0) {
    if (magnitude < 1) return "rise";
    if (magnitude < 4) return "rally";
    return "surge";
  }
  if (magnitude < 1) return "fall";
  if (magnitude < 4) return "selloff";
  return "crash";
}

export function cValCommentDirectionForRegime(regime: CValChatRegime) {
  if (regime === "rise" || regime === "rally" || regime === "surge") return "up" as const;
  if (regime === "fall" || regime === "selloff" || regime === "crash") return "down" as const;
  return regime === "reversal" ? "mixed" as const : "neutral" as const;
}

/**
 * The news wire and chat field share one continuous C-VAL clock. A small,
 * deterministic conversational jitter prevents a mechanical metronome while
 * preserving the news curve's 400 ms quiet anchor and 30 ms extreme floor.
 */
export function cValCommentAdmissionIntervalMs(movePercent: number, sequence = 0) {
  const base = cValSocialAdmissionIntervalMs(movePercent);
  const hash = cValStableHash(`chat-gap:${sequence}`);
  const ordinaryJitter = 0.82 + (hash % 43) / 100;
  const breath = hash % 19 === 0 ? 1.42 : hash % 23 === 0 ? 0.68 : 1;
  return Math.max(30, Math.round(base * ordinaryJitter * breath));
}

function roomFor(sequence: number, regime: CValChatRegime, roomLimit: number) {
  const direction = cValCommentDirectionForRegime(regime);
  const activeRooms = C_VAL_CHAT_ROOMS.slice(0, roomLimit);
  if (sequence < activeRooms.length) return activeRooms[sequence];
  const weights = activeRooms.map((room) => {
    const fastRoom = room.delay <= 0.9;
    return direction === "neutral"
      ? Math.max(1, Math.round(2 / room.delay))
      : fastRoom ? 3 : room.delay < 1.3 ? 2 : 1;
  });
  const weighted = Array.from({ length: Math.max(...weights) }, (_, pass) => (
    activeRooms.filter((_room, index) => weights[index] > pass)
  )).flat();
  const offset = cValStableHash(`room-cycle:${regime}`) % weighted.length;
  return weighted[(sequence - activeRooms.length + offset) % weighted.length];
}

function corpusEntryFor(roomId: CValChatRoomId, regime: CValChatRegime, sequence: number) {
  const pool = corpusByRoomAndRegime.get(`${roomId}:${regime}`) ?? [];
  if (pool.length === 0) return undefined;
  return pool[cValStableHash(`${roomId}:${regime}:${sequence}`) % pool.length];
}

function marketParameters(snapshot: CValSnapshot) {
  const price = finite(snapshot.market.index, 100);
  const move = finite(snapshot.market.oneSecondMovePercent);
  const openMove = finite(snapshot.market.changeFromOpenPercent);
  return {
    price: price.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    move: `${move >= 0 ? "+" : ""}${move.toFixed(2)}%`,
    openMove: `${openMove >= 0 ? "+" : ""}${openMove.toFixed(2)}%`,
  };
}

function withMarketFact(entry: CValChatCorpusEntry, snapshot: CValSnapshot, sequence: number) {
  if (entry.length === "short") return entry.text;
  const values = marketParameters(snapshot);
  const leads: Record<CValChatRoomId, readonly string[]> = {
    opening: [`${values.price}에 ${values.move}.`, `시가 대비 ${values.openMove}.`, "시초 흐름 다시 보니까"],
    scalpers: [`${values.price} / 1초 ${values.move}.`, `체결 기준 ${values.move}.`, "호가만 놓고 보면"],
    board: [`지금 ${values.move}인데`, `현재가 ${values.price}.`, "종토방 글 올라오는 거 보니"],
    office: [`알림에 ${values.move} 찍혔는데`, `몰래 보니 ${values.price}.`, "회의 중에 다시 열어봤는데"],
    campus: [`지금 ${values.move} 맞음?`, `현재 ${values.price}.`, "강의 중에 잠깐 봤는데"],
    chart: [`1초 ${values.move}, 시가 대비 ${values.openMove}.`, `${values.price} 체결 기준으로`, "봉이랑 거래량 같이 보면"],
    signals: [`방에서는 ${values.price} 얘기하는데`, `실제 움직임은 ${values.move}.`, "추천 올라온 시점 다시 보니까"],
    stream: [`채팅에 ${values.move} 뜨자마자`, `지금 화면 ${values.price}.`, "방송보다 먼저 움직였는데"],
    longterm: [`시가 대비 ${values.openMove}.`, `현재 ${values.price}라도`, "장기라고 말은 했지만"],
    futures: [`1초 ${values.move}.`, `${values.price}에서 방향 바뀌면`, "포지션 기준으로 보면"],
    newbies: [`${values.move}면 큰 건가요?`, `지금 ${values.price}인데`, "처음 겪는 장이라 그런지"],
    holders: [`내 평단 아래 ${values.price}.`, `시가 대비 ${values.openMove}.`, "오래 물려서 그런가"],
    cash: [`안 샀는데도 ${values.move}.`, `현재 ${values.price}.`, "현금으로 보고 있으니까"],
    closing: [`종가 전 ${values.price}.`, `시가 대비 ${values.openMove}.`, "마감까지 남은 흐름 보면"],
    overseas: [`국내 1초 ${values.move}.`, `현재 ${values.price}.`, "선물이랑 같이 보면"],
    silent: [`${values.price}.`, `움직임 ${values.move}.`, "말없이 보고만 있었는데"],
  };
  return `${leads[entry.roomId][sequence % 3]} ${entry.text}`;
}

export function presentCValChatMessage({
  snapshot,
  previousMovePercent,
  sequence,
  roomLimit = C_VAL_CHAT_ROOMS.length,
  roomMessageCount = 0,
  previousRoomMessage,
}: {
  snapshot: CValSnapshot;
  previousMovePercent: number | null;
  sequence: number;
  roomLimit?: number;
  roomMessageCount?: number;
  previousRoomMessage: CValChatMessage | null;
}): CValChatMessage | null {
  if (snapshot.phase !== "active") return null;
  const regime = cValCommentRegime(
    snapshot.market.oneSecondMovePercent,
    previousMovePercent,
  );
  const room = roomFor(
    sequence,
    regime,
    Math.max(1, Math.min(C_VAL_CHAT_ROOMS.length, Math.floor(roomLimit))),
  );
  const entry = corpusEntryFor(room.id, regime, sequence);
  if (!entry) return null;
  const reply = previousRoomMessage && roomMessageCount % 3 === 1;
  return {
    id: `${snapshot.runId}:${sequence}:${entry.id}`,
    roomId: room.id,
    corpusId: entry.id,
    author: reply
      ? room.authors[(sequence + 1) % room.authors.length]
      : entry.author,
    text: reply && entry.length === "original"
      ? `${room.replies[sequence % room.replies.length]}. ${withMarketFact(entry, snapshot, sequence)}`
      : withMarketFact(entry, snapshot, sequence),
    regime,
    direction: cValCommentDirectionForRegime(regime),
    occurredAt: snapshot.serverTime,
    replyToAuthor: reply ? previousRoomMessage.author : null,
  };
}

export function presentCValCommentPulse(snapshot: CValSnapshot): CValCommentPulse | null {
  if (snapshot.phase !== "active") return null;
  const movePercent = finite(snapshot.market.oneSecondMovePercent);
  const magnitude = Math.abs(movePercent);
  if (magnitude < C_VAL_COMMENT_VOICE_TRIGGER_PERCENT) return null;
  const direction = movePercent > 0 ? "up" : "down";
  return {
    signature: `${snapshot.runId}:${direction}:${Math.floor(magnitude)}`,
    runId: snapshot.runId,
    direction,
    intensity: Math.min(1, (magnitude - C_VAL_COMMENT_VOICE_TRIGGER_PERCENT) / 13),
    movePercent,
  };
}

export function cValCommentVoiceGapMs(pulse: CValCommentPulse) {
  return Math.max(
    C_VAL_COMMENT_VOICE_FASTEST_GAP_MS,
    Math.min(
      C_VAL_COMMENT_VOICE_SLOWEST_GAP_MS,
      Math.round(cValSocialAdmissionIntervalMs(pulse.movePercent) * 0.52),
    ),
  );
}

export function shouldAdmitCValCommentVoice(
  pulse: CValCommentPulse | null,
  previousTime: number,
  currentTime: number,
) {
  return Boolean(pulse && currentTime - previousTime >= cValCommentVoiceGapMs(pulse));
}

export function cValCommentPlaybackRate(pulse: CValCommentPulse) {
  const minimum = pulse.direction === "up"
    ? C_VAL_COMMENT_UP_MINIMUM_PLAYBACK_RATE
    : C_VAL_COMMENT_DOWN_MINIMUM_PLAYBACK_RATE;
  const maximum = pulse.direction === "up"
    ? C_VAL_COMMENT_UP_MAXIMUM_PLAYBACK_RATE
    : C_VAL_COMMENT_DOWN_MAXIMUM_PLAYBACK_RATE;
  return minimum + pulse.intensity * (maximum - minimum);
}

export function cValCommentDetuneCents(pulse: CValCommentPulse) {
  const minimum = pulse.direction === "up"
    ? C_VAL_COMMENT_UP_MINIMUM_DETUNE_CENTS
    : C_VAL_COMMENT_DOWN_MINIMUM_DETUNE_CENTS;
  const maximum = pulse.direction === "up"
    ? C_VAL_COMMENT_UP_MAXIMUM_DETUNE_CENTS
    : C_VAL_COMMENT_DOWN_MAXIMUM_DETUNE_CENTS;
  const shapedIntensity = pulse.direction === "up"
    ? pulse.intensity ** 1.7
    : pulse.intensity;
  return minimum + shapedIntensity * (maximum - minimum);
}

export function cValCommentEffectivePlaybackRate(
  playbackRate: number,
  detuneCents: number,
) {
  const safePlaybackRate = Math.max(0.25, playbackRate);
  const safeDetuneCents = Math.max(-1_200, Math.min(1_200, detuneCents));
  return safePlaybackRate * 2 ** (safeDetuneCents / 1_200);
}

export function cValCommentCensorBeepFrequencyHz(
  baseFrequencyHz: number,
  playbackRate: number,
  detuneCents: number,
) {
  return baseFrequencyHz * cValCommentEffectivePlaybackRate(
    playbackRate,
    detuneCents,
  );
}

export function censorCValCommentText(text: string) {
  return text.replaceAll("씨발", "C-VAL");
}

export function selectCValCommentPerformance(
  entries: readonly CValCommentCorpusEntry[],
  pulse: CValCommentPulse,
  sequence: number,
) {
  const voiceOrder = [...new Set(entries.map(({ voice }) => voice))].sort();
  const preferredVoice = voiceOrder[sequence % Math.max(1, voiceOrder.length)];
  const voiceBand = voiceBandFor(pulse);
  const candidates = entries.filter(
    (entry) => entry.voice === preferredVoice
      && voiceBand.styles.has(entry.styleId)
      && entry.profanityStatus === "present",
  );
  if (candidates.length === 0) return null;
  const voiceSequence = Math.floor(sequence / Math.max(1, voiceOrder.length));
  const presetIds = [...new Set(candidates.map(({ presetId }) => presetId))].sort();
  const presetOffset = cValStableHash(
    `${pulse.runId}:${pulse.direction}:${voiceBand.maximumIntensity}`,
  ) % presetIds.length;
  const presetId = presetIds[(presetOffset + voiceSequence) % presetIds.length];
  const scriptCandidates = candidates.filter((entry) => entry.presetId === presetId);
  const dialectOffset = cValStableHash(`${pulse.runId}:${preferredVoice}`)
    % C_VAL_COMMENT_DIALECT_ORDER.length;
  const dialectId = C_VAL_COMMENT_DIALECT_ORDER[
    (dialectOffset + voiceSequence) % C_VAL_COMMENT_DIALECT_ORDER.length
  ];
  return scriptCandidates.find((entry) => entry.dialectId === dialectId)
    ?? scriptCandidates[voiceSequence % scriptCandidates.length];
}

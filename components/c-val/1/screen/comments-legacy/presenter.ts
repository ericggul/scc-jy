import type { CValSnapshot } from "@/components/c-val/1/model";
import { clamp, cValStableHash, finite } from "../social-presenter.ts";

export const C_VAL_COMMENT_TRIGGER_PERCENT = 0.75;
export const C_VAL_COMMENT_SLOWEST_GAP_MS = 720;
export const C_VAL_COMMENT_FASTEST_GAP_MS = 100;
export const C_VAL_COMMENT_MINIMUM_PLAYBACK_RATE = 0.96;
export const C_VAL_COMMENT_MAXIMUM_PLAYBACK_RATE = 1.42;

export type CValCommentDirection = "up" | "down";

export type CValCommentPulse = {
  signature: string;
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

const directionStyles: Record<CValCommentDirection, ReadonlySet<string>> = {
  up: new Set([
    "startle-flash",
    "delighted-disbelief",
    "suspended-attention",
    "relief-rebound",
    "cynical-laughter",
    "compulsive-focus",
    "somatic-overload",
  ]),
  down: new Set([
    "startle-flash",
    "suspended-attention",
    "panic-impact",
    "angry-rejection",
    "helpless-collapse",
    "bitter-regret",
    "cynical-laughter",
    "numb-flat",
    "compulsive-focus",
    "fragile-plea",
    "somatic-overload",
  ]),
};

export function presentCValCommentPulse(snapshot: CValSnapshot): CValCommentPulse | null {
  if (snapshot.phase !== "active") return null;
  const movePercent = finite(snapshot.market.oneSecondMovePercent);
  const magnitude = Math.abs(movePercent);
  if (magnitude < C_VAL_COMMENT_TRIGGER_PERCENT) return null;

  const direction = movePercent > 0 ? "up" : "down";
  const bucket = Math.min(16, Math.floor(magnitude / C_VAL_COMMENT_TRIGGER_PERCENT));
  return {
    signature: `${snapshot.runId}:${direction}:${bucket}`,
    direction,
    intensity: clamp(
      (magnitude - C_VAL_COMMENT_TRIGGER_PERCENT) / (6 - C_VAL_COMMENT_TRIGGER_PERCENT),
      0,
      1,
    ),
    movePercent,
  };
}

export function shouldAdmitCValComment(
  pulse: CValCommentPulse | null,
  previousSignature: string | null,
  previousTime: number,
  currentTime: number,
) {
  if (!pulse) return false;
  if (previousSignature === null) return true;
  if (currentTime - previousTime < C_VAL_COMMENT_FASTEST_GAP_MS) return false;
  if (pulse.signature !== previousSignature) return true;
  return currentTime - previousTime >= cValCommentGapMs(pulse);
}

export function cValCommentGapMs(pulse: CValCommentPulse) {
  return Math.round(
    C_VAL_COMMENT_SLOWEST_GAP_MS
      - pulse.intensity * (C_VAL_COMMENT_SLOWEST_GAP_MS - C_VAL_COMMENT_FASTEST_GAP_MS),
  );
}

export function cValCommentPlaybackRate(pulse: CValCommentPulse) {
  return C_VAL_COMMENT_MINIMUM_PLAYBACK_RATE
    + pulse.intensity
      * (C_VAL_COMMENT_MAXIMUM_PLAYBACK_RATE - C_VAL_COMMENT_MINIMUM_PLAYBACK_RATE);
}

export function censorCValCommentText(text: string) {
  return text.replaceAll("씨발", "**");
}

export function selectCValCommentPerformance(
  entries: readonly CValCommentCorpusEntry[],
  pulse: CValCommentPulse,
  sequence: number,
) {
  const voiceOrder = [...new Set(entries.map(({ voice }) => voice))].sort();
  const preferredVoice = voiceOrder[sequence % Math.max(1, voiceOrder.length)];
  const allowedStyles = directionStyles[pulse.direction];
  const candidates = entries.filter(
    (entry) => entry.voice === preferredVoice && allowedStyles.has(entry.styleId),
  );
  if (candidates.length === 0) return null;

  const highArousalCandidates = pulse.intensity >= 0.55
    ? candidates.filter((entry) => entry.arousal >= 0.66)
    : candidates;
  const pool = highArousalCandidates.length > 0 ? highArousalCandidates : candidates;
  const selection = cValStableHash(
    `${pulse.signature}:${sequence}:${pulse.direction}`,
  );
  return pool[selection % pool.length];
}

export function cValCommentPlacement(id: string, age: number) {
  const hash = cValStableHash(id);
  return {
    x: 4 + (hash % 69),
    y: 8 + ((hash >>> 8) % 73),
    tilt: ((hash >>> 16) % 7) - 3,
    scale: Math.max(0.48, 0.9 - age * 0.055),
  };
}

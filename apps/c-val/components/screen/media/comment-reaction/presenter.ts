import {
  selectCValCommentPerformance,
  type CValCommentCorpusEntry,
  type CValCommentPulse,
} from "../../comments/presenter";

/**
 * The comments screen already makes the primary selection by direction,
 * intensity, voice, preset, and dialect. The media layer adds only a gentle
 * valence preference, so an upward move reads as more affirmative and a
 * downward move as more adverse without losing the source selector's fallback.
 */
export function selectCValMediaCommentReaction(
  entries: readonly CValCommentCorpusEntry[],
  pulse: CValCommentPulse,
  sequence: number,
) {
  const preferredValence = pulse.direction === "up" ? "positive" : "negative";
  const directionalEntries = entries.filter(
    (entry) => entry.valence === preferredValence,
  );
  return selectCValCommentPerformance(directionalEntries, pulse, sequence)
    ?? selectCValCommentPerformance(entries, pulse, sequence);
}

export function censorCValMediaCommentReactionText(text: string) {
  return text.replaceAll("씨발", "**");
}

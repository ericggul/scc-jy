import {
  cValCommentDetuneCents,
  cValCommentPlaybackRate,
  type CValCommentPulse,
} from "../../comments/presenter";
import {
  useCValCommentAudio,
} from "../../comments/audio";
export { useCValCommentAudio as useCValMediaCommentReactionAudio };

/**
 * Keeps the media layer's legacy reaction selection separate from the current
 * comments screen's audio character: directional pitch and speech pace.
 */
export function cValMediaCommentReactionAudioParameters(
  pulse: CValCommentPulse,
) {
  return {
    playbackRate: cValCommentPlaybackRate(pulse),
    detuneCents: cValCommentDetuneCents(pulse),
  };
}

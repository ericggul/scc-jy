import { useLyricCue } from "../../timeline/use-lyric-cue";

export function useFlightLyric() {
  const { activeWordPosition, cueIndex, currentWord, lyric, lyricCues, reducedMotion } = useLyricCue();

  return {
    cueIndex,
    lyric,
    lyricCues,
    activeWord: currentWord,
    activeWordPosition,
    reducedMotion,
  };
}

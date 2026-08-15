import { activeParametricSong } from "./songs";
import type { ParametricSong } from "./song";

export function getLyricCues(song: ParametricSong) {
  return song.lyrics.map((line) =>
    line.words.map((word) => word.text),
  );
}

export function getLyricWordTimings(song: ParametricSong) {
  const flatWords = song.lyrics.flatMap((line, cueIndex) =>
    line.words.map((word, wordIndex) => ({ ...word, cueIndex, wordIndex })),
  );

  return flatWords.map((word, index) => {
    const nextWord = flatWords[index + 1];

    return {
      word: word.text,
      startMs: word.startMs,
      durationMs: (nextWord?.startMs ?? song.durationMs) - word.startMs,
      cueIndex: word.cueIndex,
      wordIndex: word.wordIndex,
    };
  });
}

export const lyricCues = getLyricCues(activeParametricSong);
export const lyricWordTimings = getLyricWordTimings(activeParametricSong);

export const lyricWords = lyricWordTimings.map(({ word }) => word);
export const lyricCycleDurationMs = activeParametricSong.durationMs;

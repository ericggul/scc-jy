export type TimedLyricWord = {
  readonly text: string;
  readonly startMs: number;
};

export type TimedLyricLine = {
  readonly id: string;
  readonly text: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly words: readonly TimedLyricWord[];
};

export type ParametricSong = {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  readonly audioSrc: string;
  readonly durationMs: number;
  readonly lyrics: readonly TimedLyricLine[];
};

export function line(
  startMs: number,
  endMs: number,
  text: string,
  wordStartMs: readonly number[],
): TimedLyricLine {
  const words = text.split(" ");

  if (words.length !== wordStartMs.length) {
    throw new Error(`Timed lyric word count does not match: ${text}`);
  }

  return {
    id: `line-${startMs}`,
    text,
    startMs,
    endMs,
    words: words.map((word, index) => ({ text: word, startMs: wordStartMs[index]! })),
  };
}

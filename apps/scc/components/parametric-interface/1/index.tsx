"use client";

import { SongPlayback } from "../playback";
import type { ParametricSong } from "../model/song";
import { useLyricCue } from "../timeline/use-lyric-cue";
import styles from "./yes-no-grid.module.css";

const COLUMNS = 18;
const ROWS = 26;
export default function ParametricInterfaceOne({ song }: { song?: ParametricSong }) {
  return (
    <SongPlayback song={song}>
      <RadioField />
    </SongPlayback>
  );
}

function RadioField() {
  const { currentWord, lyric } = useLyricCue();
  const activeWord = currentWord.toUpperCase();
  const lyricWords = lyric.map((word) => word.toUpperCase());
  const radios = Array.from({ length: COLUMNS * ROWS }, (_, index) => ({
    id: `lyric-radio-${index + 1}`,
    word: lyricWords[index % lyricWords.length]!,
  }));

  return (
    <main className={styles.page}>
      <div aria-label="Timed lyric radio field" className={styles.grid} role="radiogroup">
        {radios.map(({ id, word }) => (
          <div
            aria-checked={word === activeWord}
            className={styles.choice}
            key={id}
            role="radio"
          >
            <i aria-hidden="true" />
            <span>{word}</span>
          </div>
        ))}
      </div>
    </main>
  );
}

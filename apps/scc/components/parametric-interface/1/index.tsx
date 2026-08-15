"use client";

import { useEffect, useState } from "react";
import { lyricWordTimings } from "../model/lyrics";
import styles from "./yes-no-grid.module.css";

const COLUMNS = 18;
const ROWS = 26;
const fixedLyricTimings = lyricWordTimings.filter(({ cueIndex }) => cueIndex === 0);
const fixedLyricWords = fixedLyricTimings.map(({ word }) => word.toUpperCase());
const fixedLyricDurationMs = fixedLyricTimings.reduce(
  (total, { durationMs }) => total + durationMs,
  0,
);
const radios = Array.from({ length: COLUMNS * ROWS }, (_, index) => ({
  id: `lyric-radio-${index + 1}`,
  word: fixedLyricWords[index % fixedLyricWords.length]!,
}));

function getWordIndex(now = Date.now()) {
  const progress = now % fixedLyricDurationMs;
  let elapsed = 0;

  for (let index = 0; index < fixedLyricTimings.length; index += 1) {
    elapsed += fixedLyricTimings[index]!.durationMs;
    if (progress < elapsed) return index;
  }

  return 0;
}

function getDelayUntilNextWord(now: number, wordIndex: number) {
  const progress = now % fixedLyricDurationMs;
  const wordEnd = fixedLyricTimings
    .slice(0, wordIndex + 1)
    .reduce((total, word) => total + word.durationMs, 0);

  return Math.max(1, wordEnd - progress + 1);
}

function useFixedLyricWord() {
  const [wordIndex, setWordIndex] = useState(getWordIndex);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    let timeout: number;
    const synchronize = () => {
      const now = Date.now();
      const nextWordIndex = getWordIndex(now);
      setWordIndex(nextWordIndex);
      timeout = window.setTimeout(
        synchronize,
        getDelayUntilNextWord(now, nextWordIndex),
      );
    };

    synchronize();
    return () => window.clearTimeout(timeout);
  }, [reducedMotion]);

  return fixedLyricWords[wordIndex]!;
}

export default function ParametricInterfaceOne() {
  const activeWord = useFixedLyricWord();

  return (
    <main className={styles.page}>
      <div aria-label="The signal keeps its own time" className={styles.grid} role="radiogroup">
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

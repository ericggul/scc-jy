"use client";

import { useEffect, useMemo, useState } from "react";
import {
  lyricCues,
  lyricCycleDurationMs,
  lyricWordTimings,
} from "../model/lyrics";

function getWordIndex(now = Date.now()) {
  const progress = now % lyricCycleDurationMs;
  let elapsed = 0;

  for (let index = 0; index < lyricWordTimings.length; index += 1) {
    elapsed += lyricWordTimings[index]!.durationMs;
    if (progress < elapsed) return index;
  }

  return 0;
}

function getCycleIndex(now = Date.now()) {
  return Math.floor(now / lyricCycleDurationMs);
}

function getDelayUntilNextWord(now: number, wordIndex: number) {
  const progress = now % lyricCycleDurationMs;
  const wordEnd = lyricWordTimings
    .slice(0, wordIndex + 1)
    .reduce((total, word) => total + word.durationMs, 0);

  return Math.max(1, wordEnd - progress + 1);
}

export function useLyricCue() {
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

  return useMemo(() => {
    const current = lyricWordTimings[wordIndex]!;
    const previous = lyricWordTimings[
      (wordIndex + lyricWordTimings.length - 1) % lyricWordTimings.length
    ]!;
    const activeWordPosition = lyricWordTimings
      .slice(0, wordIndex)
      .filter((word) => word.cueIndex === current.cueIndex).length;

    return {
      wordIndex,
      cycleIndex: getCycleIndex(),
      reducedMotion,
      currentWord: current.word,
      previousWord: previous.word,
      lyric: lyricCues[current.cueIndex],
      activeWordPosition,
    };
  }, [reducedMotion, wordIndex]);
}

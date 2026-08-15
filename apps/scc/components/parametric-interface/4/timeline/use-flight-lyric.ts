"use client";

import { useEffect, useMemo, useState } from "react";
import { lyricCues, lyricWordTimings } from "../model/lyrics";

function revealedWordCount(wordIndex: number) {
  const cueIndex = lyricWordTimings[wordIndex]!.cueIndex;
  return lyricWordTimings
    .slice(0, wordIndex + 1)
    .filter((word) => word.cueIndex === cueIndex).length;
}

export function useFlightLyric() {
  const [wordIndex, setWordIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener("change", updatePreference);
    return () => preference.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const timeout = window.setTimeout(() => {
      setWordIndex((current) => (current + 1) % lyricWordTimings.length);
    }, lyricWordTimings[wordIndex]!.durationMs);
    return () => window.clearTimeout(timeout);
  }, [reducedMotion, wordIndex]);

  return useMemo(() => {
    const cueIndex = lyricWordTimings[wordIndex]!.cueIndex;
    return {
      lyric: lyricCues[cueIndex],
      revealedWordCount: revealedWordCount(wordIndex),
    };
  }, [wordIndex]);
}

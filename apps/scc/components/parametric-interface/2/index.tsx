"use client";

import { useEffect, useRef, useState } from "react";
import { SongPlayback } from "../playback";
import type { ParametricSong } from "../model/song";
import { useLyricCue } from "../timeline/use-lyric-cue";
import { getOfficeRowsForWord } from "./model/workbook";
import styles from "./lyric-sheet.module.css";

const TYPING_STEPS = 12;

const columns = Array.from({ length: 16 }, (_, position) => ({
  id: `column-${position + 1}`,
  label: String.fromCharCode(65 + position),
  position,
}));
const rows = Array.from({ length: 25 }, (_, position) => ({
  id: `row-${position + 1}`,
  label: position + 1,
  position,
}));
const centreRowPosition = Math.floor(rows.length / 2);

function typingDuration(wordDurationMs: number) {
  return Math.min(180, Math.max(80, wordDurationMs * 0.55));
}

function typingProgressAt(elapsedMs: number, wordDurationMs: number) {
  const rawProgress = Math.min(
    1,
    Math.max(0, elapsedMs / typingDuration(wordDurationMs)),
  );

  return rawProgress === 1 ? 1 : Math.floor(rawProgress * TYPING_STEPS) / TYPING_STEPS;
}

function useSheetTypingProgress(
  currentTimeMs: number,
  isPlaying: boolean,
  reducedMotion: boolean,
  wordDurationMs: number,
  wordIndex: number,
  wordStartMs: number,
) {
  const [typing, setTyping] = useState({ progress: 1, wordIndex: -1 });
  const currentTimeRef = useRef(currentTimeMs);

  useEffect(() => {
    currentTimeRef.current = currentTimeMs;
  }, [currentTimeMs]);

  useEffect(() => {
    if (!isPlaying || reducedMotion) return;

    const elapsedAtStart = Math.max(0, currentTimeRef.current - wordStartMs);
    const startedAt = performance.now() - elapsedAtStart;
    let frameId = 0;

    const update = () => {
      const progress = typingProgressAt(
        performance.now() - startedAt,
        wordDurationMs,
      );

      setTyping((current) => (
        current.wordIndex === wordIndex && current.progress === progress
          ? current
          : { progress, wordIndex }
      ));

      if (progress < 1) frameId = window.requestAnimationFrame(update);
    };

    frameId = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frameId);
  }, [isPlaying, reducedMotion, wordDurationMs, wordIndex, wordStartMs]);

  if (!isPlaying || reducedMotion) return 1;

  return typing.wordIndex === wordIndex
    ? typing.progress
    : typingProgressAt(currentTimeMs - wordStartMs, wordDurationMs);
}

function typedText(value: string, progress: number) {
  return value.slice(0, Math.floor(value.length * progress));
}

export default function ParametricInterfaceTwo({ song }: { song?: ParametricSong }) {
  return (
    <SongPlayback song={song}>
      <LyricSpreadsheet />
    </SongPlayback>
  );
}

function LyricSpreadsheet() {
  const {
    activeWordPosition,
    currentTimeMs,
    isPlaying,
    lyric,
    reducedMotion,
    wordIndex,
    wordTimings,
  } = useLyricCue();
  const lyricTick = wordIndex;
  const officeRows = getOfficeRowsForWord(lyricTick);
  const lyricWords = lyric.join(" ").split(" ").map((word) => word.toUpperCase());
  const lyricStartColumn = Math.floor((columns.length - lyricWords.length) / 2);
  const activeColumnPosition = lyricStartColumn + activeWordPosition;
  const selectedWord = lyricWords[activeWordPosition]!;
  const currentWordTiming = wordTimings[wordIndex]!;
  const typingProgress = useSheetTypingProgress(
    currentTimeMs,
    isPlaying,
    reducedMotion,
    currentWordTiming.durationMs,
    wordIndex,
    currentWordTiming.startMs,
  );
  const isTyping = typingProgress < 1;

  return (
    <main className={styles.page}>
      <section aria-label="Lyric spreadsheet" className={styles.workbook}>
        <div className={styles.sheetViewport}>
          <table aria-label="Lyric cells" className={styles.sheet}>
            <colgroup>
              <col className={styles.rowHeaderColumn} />
              {columns.map((column) => <col key={column.id} />)}
            </colgroup>
            <thead>
              <tr>
                <th aria-label="Row number" className={styles.corner} scope="col" />
                {columns.map((column) => (
                  <th
                    className={column.position === activeColumnPosition ? styles.activeHeader : undefined}
                    key={column.id}
                    scope="col"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <th
                    className={row.position === centreRowPosition ? styles.activeHeader : undefined}
                    scope="row"
                  >
                    {row.label}
                  </th>
                  {columns.map((column) => {
                    const isSelectedColumn = column.position === activeColumnPosition;
                    const lyricWord = row.position === centreRowPosition
                      ? lyricWords[column.position - lyricStartColumn]
                      : undefined;
                    const officeValue = officeRows[row.position]?.[column.position];
                    const isActive = row.position === centreRowPosition && isSelectedColumn;
                    const targetText = String(
                      isSelectedColumn ? selectedWord : lyricWord ?? officeValue ?? "",
                    );
                    const displayText = isSelectedColumn
                      ? typedText(targetText, typingProgress)
                      : targetText;
                    const cellClassName = [
                      row.position === 0 && !isSelectedColumn ? styles.dataHeader : undefined,
                      lyricWord && !isSelectedColumn ? styles.lyricCell : undefined,
                      isSelectedColumn ? styles.selectedColumn : undefined,
                      isActive ? styles.activeCell : undefined,
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <td
                        aria-label={targetText}
                        className={cellClassName || undefined}
                        data-typing={isActive && isTyping ? "true" : undefined}
                        key={column.id}
                      >
                        {displayText}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className={styles.sheetTabs}>
          <span aria-hidden="true" className={styles.addSheet}>+</span>
          <span aria-hidden="true" className={styles.allSheets}>≡</span>
          <span className={styles.activeTab}>Sheet 1</span>
        </footer>
      </section>
    </main>
  );
}
